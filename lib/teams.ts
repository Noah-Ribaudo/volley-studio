// Team CRUD operations with Supabase
import { getSupabase, isSupabaseConfigured } from './supabase'
import { Team, CustomLayout, Rotation, Phase, PositionCoordinates, LayoutExtendedData, Lineup } from './types'
import type { Json, PresetSystem } from '@/lib/presetTypes'
import { migrateTeamToLineups } from './lineups'
import { copyPresetsToTeam } from './presets'

// Re-export isSupabaseConfigured for convenience
export { isSupabaseConfigured }

// ============ ERROR CLASSES ============

/**
 * Structured error class for team operations
 * Provides both technical and user-friendly error messages
 */
export class TeamOperationError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly userMessage: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'TeamOperationError';
  }
}

// ============ UTILITY FUNCTIONS ============

// Network timeout configuration
const NETWORK_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Wrap a promise-like object with a timeout
 */
function withTimeout<T>(
  promise: Promise<T> | PromiseLike<T>,
  timeoutMs: number = NETWORK_TIMEOUT_MS,
  operation: string = 'Operation'
): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

// Generate a URL-friendly slug from team name
// Example: "Beach Boys" -> "beach_boys"
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/-+/g, '_') // Replace hyphens with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
}

// Generate a unique slug by appending a number if needed
async function generateUniqueSlug(baseSlug: string): Promise<string> {
  const supabase = getSupabase()
  let slug = baseSlug
  let counter = 1

  while (true) {
    const { data, error } = await supabase
      .from('teams')
      .select('slug')
      .eq('slug', slug)
      .single()

    if (error && error.code === 'PGRST116') {
      // Not found, slug is available
      return slug
    }

    // Slug exists, try with counter
    slug = `${baseSlug}_${counter}`
    counter++

    // Safety check to prevent infinite loops
    if (counter > 1000) {
      throw new Error('Unable to generate unique slug')
    }
  }
}

// ============ TEAMS ============

export async function createTeam(name: string, password?: string, presetSystem?: PresetSystem): Promise<Team> {
  const supabase = getSupabase()

  const baseSlug = generateSlug(name)
  const slug = await generateUniqueSlug(baseSlug)

  const insertData: { name: string; slug: string; password?: string } = {
    name,
    slug
  }

  if (password && password.trim()) {
    insertData.password = password.trim()
  }

  const { data, error } = await supabase
    .from('teams')
    .insert(insertData)
    .select()
    .single()

  if (error) throw new Error(`Failed to create team: ${error.message}`)

  const team = data as unknown as Team

  // If a preset system was selected, copy those presets to the team's layouts
  if (presetSystem) {
    try {
      await copyPresetsToTeam(presetSystem, team.id)
    } catch (err) {
      console.warn('Failed to copy presets to team:', err)
      // Don't fail team creation if preset copy fails
    }
  }

  return team
}

export async function getTeamBySlug(slug: string): Promise<Team | null> {
  const supabase = getSupabase()

  const { data, error } = await withTimeout(
    supabase
      .from('teams')
      .select('*')
      .eq('slug', slug)
      .single(),
    NETWORK_TIMEOUT_MS,
    'Get team by slug'
  )

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw new Error(`Failed to get team: ${error.message}`)
  }

  // Apply lazy migration from old single-assignment format to lineups array
  const team = data as unknown as Team
  return migrateTeamToLineups(team)
}

// Keep getTeam for backward compatibility (by ID)
export async function getTeam(id: string): Promise<Team | null> {
  const supabase = getSupabase()

  const { data, error } = await withTimeout(
    supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single(),
    NETWORK_TIMEOUT_MS,
    'Get team by ID'
  )

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw new Error(`Failed to get team: ${error.message}`)
  }

  // Apply lazy migration from old single-assignment format to lineups array
  const team = data as unknown as Team
  return migrateTeamToLineups(team)
}

export async function getAllTeams(): Promise<Team[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .or('archived.is.null,archived.eq.false')
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`Failed to get teams: ${error.message}`)

  // Apply lazy migration to each team
  const teams = (data || []) as unknown as Team[]
  return teams.map(migrateTeamToLineups)
}

export interface SearchTeamsOptions {
  query: string;
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
}

export interface SearchTeamsResult {
  teams: Team[];
  total: number;
  hasMore: boolean;
}

export async function searchTeams(
  options: SearchTeamsOptions
): Promise<SearchTeamsResult> {
  const {
    query,
    limit = 20,
    offset = 0,
    includeArchived = false,
  } = options;

  const supabase = getSupabase();

  let queryBuilder = supabase
    .from('teams')
    .select('*', { count: 'exact' })
    .ilike('name', `%${query}%`);

  if (!includeArchived) {
    queryBuilder = queryBuilder.or('archived.is.null,archived.eq.false');
  }

  queryBuilder = queryBuilder
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await withTimeout(
    queryBuilder,
    NETWORK_TIMEOUT_MS,
    'Search teams'
  );

  if (error) throw new Error(`Failed to search teams: ${error.message}`);

  const total = count ?? 0;
  // Apply lazy migration to each team
  const teams = ((data || []) as unknown as Team[]).map(migrateTeamToLineups);

  return {
    teams,
    total,
    hasMore: offset + teams.length < total,
  };
}

// Keep backward-compatible version
export async function searchTeamsLegacy(query: string): Promise<Team[]> {
  const result = await searchTeams({ query, limit: 20 });
  return result.teams;
}

export async function updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
  const supabase = getSupabase()

  // Remove id and timestamps from updates, convert to proper format
  const { id: _, created_at, updated_at, ...rest } = updates

  // If name is being updated, regenerate slug (unless slug is explicitly provided)
  let slug: string | undefined = rest.slug
  if (rest.name && rest.slug === undefined) {
    const baseSlug = generateSlug(rest.name)
    // Get current team to check if name actually changed
    const currentTeam = await getTeam(id)
    if (currentTeam && currentTeam.name !== rest.name) {
      slug = await generateUniqueSlug(baseSlug)
    } else if (!currentTeam) {
      slug = await generateUniqueSlug(baseSlug)
    }
  }

  const updateData: Record<string, unknown> = {}

  if (rest.name !== undefined) {
    updateData.name = rest.name
  }
  if (slug !== undefined) {
    updateData.slug = slug
  }
  if (rest.roster !== undefined) {
    updateData.roster = rest.roster as unknown as Json
  }
  if (rest.position_assignments !== undefined) {
    updateData.position_assignments = rest.position_assignments as unknown as Json
  }
  if (rest.lineups !== undefined) {
    updateData.lineups = rest.lineups as unknown as Json
  }
  if (rest.active_lineup_id !== undefined) {
    updateData.active_lineup_id = rest.active_lineup_id
  }
  if (rest.password !== undefined) {
    updateData.password = rest.password || null
  }
  if (rest.archived !== undefined) {
    updateData.archived = rest.archived
  }

  const { data, error } = await supabase
    .from('teams')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update team: ${error.message}`)

  // Apply migration to ensure consistent structure
  const team = data as unknown as Team
  return migrateTeamToLineups(team)
}

export async function archiveTeam(id: string): Promise<Team> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('teams')
    .update({ archived: true })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to archive team: ${error.message}`)
  return data as unknown as Team
}

// Keep deleteTeam for backward compatibility, but it now archives
export async function deleteTeam(id: string): Promise<void> {
  await archiveTeam(id)
}

// ============ CUSTOM LAYOUTS ============

export async function getTeamLayouts(teamId: string): Promise<CustomLayout[]> {
  const supabase = getSupabase()

  const { data, error } = await withTimeout(
    supabase
      .from('custom_layouts')
      .select('*')
      .eq('team_id', teamId),
    NETWORK_TIMEOUT_MS,
    'Get team layouts'
  )

  if (error) throw new Error(`Failed to get layouts: ${error.message}`)

  // All layouts are now in normalized format (0-1)
  return (data || []) as unknown as CustomLayout[]
}

export async function saveLayout(
  teamId: string,
  rotation: Rotation,
  phase: Phase,
  positions: PositionCoordinates,  // Already in normalized format (0-1)
  flags?: LayoutExtendedData | null  // Optional extended data (arrows, status tags, etc.)
): Promise<CustomLayout> {
  const supabase = getSupabase()

  try {
    // Build the upsert data
    const upsertData: {
      team_id: string
      rotation: Rotation
      phase: Phase
      positions: Json
      flags?: Json | null
    } = {
      team_id: teamId,
      rotation,
      phase,
      positions: positions as unknown as Json,
    }

    // Include flags if provided (even if null to clear existing)
    if (flags !== undefined) {
      upsertData.flags = flags as unknown as Json
    }

    // Atomic upsert - eliminates race condition
    // This will insert if not exists, or update if exists based on unique constraint
    const { data, error } = await withTimeout(
      supabase
        .from('custom_layouts')
        .upsert(upsertData, {
          // Conflict resolution: if (team_id, rotation, phase) exists, update
          onConflict: 'team_id,rotation,phase',
        })
        .select()
        .single(),
      NETWORK_TIMEOUT_MS,
      'Save layout'
    )

    if (error) {
      throw new TeamOperationError(
        `Failed to save layout: ${error.message}`,
        'save_layout',
        'Could not save your position layout. Please try again.',
        error
      )
    }

    return data as unknown as CustomLayout
  } catch (error) {
    if (error instanceof TeamOperationError) throw error

    throw new TeamOperationError(
      `Unexpected error saving layout: ${error}`,
      'save_layout',
      'An unexpected error occurred. Please refresh and try again.',
      error
    )
  }
}

export async function deleteLayout(id: string): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('custom_layouts')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete layout: ${error.message}`)
}

export async function deleteAllTeamLayouts(teamId: string): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('custom_layouts')
    .delete()
    .eq('team_id', teamId)

  if (error) throw new Error(`Failed to delete layouts: ${error.message}`)
}

// ============ CONFLICT DETECTION ============

/**
 * Result of a conflict check
 */
export interface ConflictCheckResult {
  hasConflict: boolean
  serverUpdatedAt: string | null
  localUpdatedAt: string | null
}

/**
 * Check if a layout has been modified on the server since we last loaded it.
 * Returns conflict info if the server version is newer than our local version.
 */
export async function checkLayoutConflict(
  teamId: string,
  rotation: Rotation,
  phase: Phase,
  localUpdatedAt: string | null
): Promise<ConflictCheckResult> {
  const supabase = getSupabase()

  try {
    // Fetch the current server state for this layout
    const { data, error } = await withTimeout(
      supabase
        .from('custom_layouts')
        .select('updated_at')
        .eq('team_id', teamId)
        .eq('rotation', rotation)
        .eq('phase', phase)
        .single(),
      NETWORK_TIMEOUT_MS,
      'Check layout conflict'
    )

    if (error) {
      // Not found means no conflict (this is a new layout)
      if (error.code === 'PGRST116') {
        return { hasConflict: false, serverUpdatedAt: null, localUpdatedAt }
      }
      // Other errors - assume no conflict to avoid blocking saves
      console.warn('Error checking layout conflict:', error)
      return { hasConflict: false, serverUpdatedAt: null, localUpdatedAt }
    }

    const serverUpdatedAt = data?.updated_at || null

    // No local timestamp means this is our first edit - no conflict
    if (!localUpdatedAt) {
      return { hasConflict: false, serverUpdatedAt, localUpdatedAt }
    }

    // No server timestamp means something odd happened - no conflict
    if (!serverUpdatedAt) {
      return { hasConflict: false, serverUpdatedAt, localUpdatedAt }
    }

    // Compare timestamps - conflict if server is newer
    const serverTime = new Date(serverUpdatedAt).getTime()
    const localTime = new Date(localUpdatedAt).getTime()

    // Add a small tolerance (1 second) to account for clock drift
    const hasConflict = serverTime > localTime + 1000

    return { hasConflict, serverUpdatedAt, localUpdatedAt }
  } catch (err) {
    // Network errors - assume no conflict to avoid blocking saves
    console.warn('Error checking layout conflict:', err)
    return { hasConflict: false, serverUpdatedAt: null, localUpdatedAt }
  }
}

/**
 * Force save a layout, overwriting any server changes.
 * Use this after user confirms they want to keep their local changes.
 */
export async function forceSaveLayout(
  teamId: string,
  rotation: Rotation,
  phase: Phase,
  positions: PositionCoordinates,
  flags?: LayoutExtendedData | null
): Promise<CustomLayout> {
  // Regular saveLayout already does an upsert, which overwrites
  return saveLayout(teamId, rotation, phase, positions, flags)
}

/**
 * Fetch the current server version of a layout.
 * Use this when user wants to discard local changes and load server version.
 */
export async function getServerLayout(
  teamId: string,
  rotation: Rotation,
  phase: Phase
): Promise<CustomLayout | null> {
  const supabase = getSupabase()

  const { data, error } = await withTimeout(
    supabase
      .from('custom_layouts')
      .select('*')
      .eq('team_id', teamId)
      .eq('rotation', rotation)
      .eq('phase', phase)
      .single(),
    NETWORK_TIMEOUT_MS,
    'Get server layout'
  )

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw new Error(`Failed to get layout: ${error.message}`)
  }

  return data as unknown as CustomLayout
}

// ============ TEAM CONFLICT DETECTION ============

/**
 * Result of a team conflict check
 */
export interface TeamConflictCheckResult {
  hasConflict: boolean
  serverUpdatedAt: string | null
  localUpdatedAt: string | null
}

/**
 * Check if a team has been modified on the server since we last loaded it.
 * Returns conflict info if the server version is newer than our local version.
 */
export async function checkTeamConflict(
  teamId: string,
  localUpdatedAt: string | null
): Promise<TeamConflictCheckResult> {
  const supabase = getSupabase()

  try {
    // Fetch the current server state for this team
    const { data, error } = await withTimeout(
      supabase
        .from('teams')
        .select('updated_at')
        .eq('id', teamId)
        .single(),
      NETWORK_TIMEOUT_MS,
      'Check team conflict'
    )

    if (error) {
      // Not found means no conflict (team was deleted)
      if (error.code === 'PGRST116') {
        return { hasConflict: false, serverUpdatedAt: null, localUpdatedAt }
      }
      // Other errors - assume no conflict to avoid blocking saves
      console.warn('Error checking team conflict:', error)
      return { hasConflict: false, serverUpdatedAt: null, localUpdatedAt }
    }

    const serverUpdatedAt = data?.updated_at || null

    // No local timestamp means this is our first edit - no conflict
    if (!localUpdatedAt) {
      return { hasConflict: false, serverUpdatedAt, localUpdatedAt }
    }

    // No server timestamp means something odd happened - no conflict
    if (!serverUpdatedAt) {
      return { hasConflict: false, serverUpdatedAt, localUpdatedAt }
    }

    // Compare timestamps - conflict if server is newer
    const serverTime = new Date(serverUpdatedAt).getTime()
    const localTime = new Date(localUpdatedAt).getTime()

    // Add a small tolerance (1 second) to account for clock drift
    const hasConflict = serverTime > localTime + 1000

    return { hasConflict, serverUpdatedAt, localUpdatedAt }
  } catch (err) {
    // Network errors - assume no conflict to avoid blocking saves
    console.warn('Error checking team conflict:', err)
    return { hasConflict: false, serverUpdatedAt: null, localUpdatedAt }
  }
}

/**
 * Describe the differences between local and server team data
 */
export interface TeamDifferences {
  hasRosterChanges: boolean
  rosterAddedCount: number
  rosterRemovedCount: number
  rosterModifiedCount: number
  hasLineupChanges: boolean
  hasNameChange: boolean
  hasPasswordChange: boolean
  summary: string
}

/**
 * Compare local team data with server team data and return a description of differences
 */
export function getTeamDifferences(
  localTeam: Partial<Team>,
  serverTeam: Team
): TeamDifferences {
  const differences: TeamDifferences = {
    hasRosterChanges: false,
    rosterAddedCount: 0,
    rosterRemovedCount: 0,
    rosterModifiedCount: 0,
    hasLineupChanges: false,
    hasNameChange: false,
    hasPasswordChange: false,
    summary: '',
  }

  // Check roster differences
  const localRoster = localTeam.roster || []
  const serverRoster = serverTeam.roster || []

  const localRosterIds = new Set(localRoster.map(p => p.id))
  const serverRosterIds = new Set(serverRoster.map(p => p.id))

  // Count added players (in local but not in server)
  for (const id of localRosterIds) {
    if (!serverRosterIds.has(id)) {
      differences.rosterAddedCount++
    }
  }

  // Count removed players (in server but not in local)
  for (const id of serverRosterIds) {
    if (!localRosterIds.has(id)) {
      differences.rosterRemovedCount++
    }
  }

  // Count modified players (in both but different)
  for (const localPlayer of localRoster) {
    const serverPlayer = serverRoster.find(p => p.id === localPlayer.id)
    if (serverPlayer) {
      if (localPlayer.name !== serverPlayer.name || localPlayer.number !== serverPlayer.number) {
        differences.rosterModifiedCount++
      }
    }
  }

  differences.hasRosterChanges =
    differences.rosterAddedCount > 0 ||
    differences.rosterRemovedCount > 0 ||
    differences.rosterModifiedCount > 0

  // Check lineup differences (simple comparison)
  const localLineups = JSON.stringify(localTeam.lineups || [])
  const serverLineups = JSON.stringify(serverTeam.lineups || [])
  differences.hasLineupChanges = localLineups !== serverLineups

  // Check name change
  if (localTeam.name !== undefined) {
    differences.hasNameChange = localTeam.name !== serverTeam.name
  }

  // Check password change
  if (localTeam.password !== undefined) {
    differences.hasPasswordChange = localTeam.password !== serverTeam.password
  }

  // Build summary
  const parts: string[] = []

  if (differences.hasRosterChanges) {
    const rosterParts: string[] = []
    if (differences.rosterAddedCount > 0) {
      rosterParts.push(`${differences.rosterAddedCount} added`)
    }
    if (differences.rosterRemovedCount > 0) {
      rosterParts.push(`${differences.rosterRemovedCount} removed`)
    }
    if (differences.rosterModifiedCount > 0) {
      rosterParts.push(`${differences.rosterModifiedCount} modified`)
    }
    parts.push(`Players: ${rosterParts.join(', ')}`)
  }

  if (differences.hasLineupChanges) {
    parts.push('Position assignments updated')
  }

  if (differences.hasNameChange) {
    parts.push('Team name changed')
  }

  if (differences.hasPasswordChange) {
    parts.push('Password changed')
  }

  differences.summary = parts.length > 0 ? parts.join(' • ') : 'Settings modified'

  return differences
}

// ============ UTILITY ============

// Generate a shareable URL for a team using slug
export function getTeamShareUrl(teamSlug: string): string {
  if (typeof window === 'undefined') {
    return `/volleyball/teams/${teamSlug}`
  }
  return `${window.location.origin}/volleyball/teams/${teamSlug}`
}

// Check if we're in a browser environment
export function isBrowser(): boolean {
  return typeof window !== 'undefined'
}
