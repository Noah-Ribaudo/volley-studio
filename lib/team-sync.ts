/**
 * Team Sync Layer
 *
 * Handles debounced auto-save of team data to Supabase.
 * Different data types have different debounce times:
 * - Roster (player names/numbers): 1500ms (typing text)
 * - Lineups (position assignments): 1000ms (dropdown selections)
 * - Team name: 1500ms (typing text)
 *
 * Includes conflict detection for multi-device sync:
 * - Before saving, checks if server data changed since we loaded it
 * - If conflict detected, calls the conflict callback instead of saving
 * - User can choose to keep their changes or load server version
 */

import { updateTeam, isSupabaseConfigured, getTeam } from './teams'
import { Team, RosterPlayer, PositionAssignments, Lineup } from './types'

// Debounce delays for different data types
const DEBOUNCE_MS = {
  roster: 1500,    // Typing text (player names/numbers)
  lineups: 1000,   // Dropdown selections
  teamName: 1500,  // Typing text
}

// Types of team data that can have conflicts
export type TeamConflictType = 'roster' | 'lineups' | 'teamName' | 'settings'

// Conflict info passed to callback
export interface TeamConflictInfo {
  type: TeamConflictType
  teamId: string
  localUpdatedAt: string | null
  serverUpdatedAt: string
  description: string // Human-readable description of what changed
  // The pending save data that triggered the conflict
  pendingData: Partial<Team>
}

// Callback for when a conflict is detected
type ConflictCallback = (conflict: TeamConflictInfo) => void

// Callback for updating loaded timestamp after successful save
type UpdateTimestampCallback = (newTimestamp: string) => void

// Callback for getting the loaded timestamp for the team
type GetTimestampCallback = () => string | null

// Module-level callbacks (set by useTeamSync hook)
let onConflictDetected: ConflictCallback | null = null
let onTimestampUpdated: UpdateTimestampCallback | null = null
let getLoadedTimestamp: GetTimestampCallback | null = null

/**
 * Configure conflict detection callbacks
 */
export function configureTeamConflictDetection(config: {
  onConflict: ConflictCallback
  onTimestampUpdated: UpdateTimestampCallback
  getLoadedTimestamp: GetTimestampCallback
}) {
  onConflictDetected = config.onConflict
  onTimestampUpdated = config.onTimestampUpdated
  getLoadedTimestamp = config.getLoadedTimestamp
}

/**
 * Clear conflict detection callbacks
 */
export function clearTeamConflictDetection() {
  onConflictDetected = null
  onTimestampUpdated = null
  getLoadedTimestamp = null
}

// Pending save data
interface PendingSave {
  teamId: string
  type: TeamConflictType
  data: Partial<Team>
  timeoutId: ReturnType<typeof setTimeout> | null
}

// Track pending saves by type
const pendingSaves = new Map<TeamConflictType, PendingSave>()

// Track online status for retry logic
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

// Queue for saves that failed while offline
const offlineQueue: Array<{
  teamId: string
  type: TeamConflictType
  data: Partial<Team>
}> = []

// Initialize online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true
    processOfflineQueue()
  })
  window.addEventListener('offline', () => {
    isOnline = false
  })
}

/**
 * Process any saves that were queued while offline
 */
async function processOfflineQueue() {
  if (!isOnline || offlineQueue.length === 0) return

  while (offlineQueue.length > 0) {
    const item = offlineQueue.shift()
    if (!item) continue

    try {
      await updateTeam(item.teamId, item.data)
    } catch {
      // Re-queue if still failing
      offlineQueue.push(item)
      break
    }
  }
}

/**
 * Check if the team has been modified on the server since we last loaded it
 */
async function checkTeamConflict(
  teamId: string,
  localUpdatedAt: string | null
): Promise<{ hasConflict: boolean; serverUpdatedAt: string | null }> {
  try {
    const serverTeam = await getTeam(teamId)
    if (!serverTeam) {
      return { hasConflict: false, serverUpdatedAt: null }
    }

    const serverUpdatedAt = serverTeam.updated_at || null

    // No local timestamp means this is our first edit - no conflict
    if (!localUpdatedAt) {
      return { hasConflict: false, serverUpdatedAt }
    }

    // No server timestamp means something odd happened - no conflict
    if (!serverUpdatedAt) {
      return { hasConflict: false, serverUpdatedAt }
    }

    // Compare timestamps - conflict if server is newer
    const serverTime = new Date(serverUpdatedAt).getTime()
    const localTime = new Date(localUpdatedAt).getTime()

    // Add a small tolerance (1 second) to account for clock drift
    const hasConflict = serverTime > localTime + 1000

    return { hasConflict, serverUpdatedAt }
  } catch (err) {
    // Network errors - assume no conflict to avoid blocking saves
    console.warn('Error checking team conflict:', err)
    return { hasConflict: false, serverUpdatedAt: null }
  }
}

/**
 * Generate a human-readable description of what changed
 */
function getConflictDescription(type: TeamConflictType, _data: Partial<Team>): string {
  switch (type) {
    case 'roster':
      return 'Player roster was modified'
    case 'lineups':
      return 'Position assignments were updated'
    case 'teamName':
      return 'Team name was changed'
    case 'settings':
      return 'Team settings were modified'
    default:
      return 'Team data was changed'
  }
}

/**
 * Execute the actual save to Supabase
 * Checks for conflicts before saving
 */
async function executeSave(pending: PendingSave, forceOverwrite = false): Promise<void> {
  if (!isSupabaseConfigured()) {
    return
  }

  try {
    // Check for conflicts unless force overwrite is requested
    if (!forceOverwrite && onConflictDetected && getLoadedTimestamp) {
      const localUpdatedAt = getLoadedTimestamp()
      const conflictResult = await checkTeamConflict(pending.teamId, localUpdatedAt)

      if (conflictResult.hasConflict && conflictResult.serverUpdatedAt) {
        // Conflict detected - notify callback and don't save
        onConflictDetected({
          type: pending.type,
          teamId: pending.teamId,
          localUpdatedAt,
          serverUpdatedAt: conflictResult.serverUpdatedAt,
          description: getConflictDescription(pending.type, pending.data),
          pendingData: pending.data,
        })
        return
      }
    }

    // No conflict (or force overwrite) - proceed with save
    const savedTeam = await updateTeam(pending.teamId, pending.data)

    // Update the loaded timestamp to the new server timestamp
    if (onTimestampUpdated && savedTeam.updated_at) {
      onTimestampUpdated(savedTeam.updated_at)
    }
  } catch {
    // If offline, queue for later
    if (!isOnline) {
      offlineQueue.push({
        teamId: pending.teamId,
        type: pending.type,
        data: pending.data,
      })
    }
  }
}

/**
 * Queue a roster save operation with debouncing
 */
export function queueRosterSave(
  teamId: string,
  roster: RosterPlayer[]
): void {
  queueTeamSave(teamId, 'roster', { roster }, DEBOUNCE_MS.roster)
}

/**
 * Queue a lineups save operation with debouncing
 */
export function queueLineupsSave(
  teamId: string,
  lineups: Lineup[],
  activeLineupId: string | null,
  positionAssignments: PositionAssignments
): void {
  queueTeamSave(
    teamId,
    'lineups',
    { lineups, active_lineup_id: activeLineupId, position_assignments: positionAssignments },
    DEBOUNCE_MS.lineups
  )
}

/**
 * Queue a team name save operation with debouncing
 */
export function queueTeamNameSave(
  teamId: string,
  name: string
): void {
  queueTeamSave(teamId, 'teamName', { name }, DEBOUNCE_MS.teamName)
}

/**
 * Generic queue function for team saves
 */
function queueTeamSave(
  teamId: string,
  type: TeamConflictType,
  data: Partial<Team>,
  debounceMs: number
): void {
  // Cancel any existing pending save for this type
  const existing = pendingSaves.get(type)
  if (existing?.timeoutId) {
    clearTimeout(existing.timeoutId)
  }

  // Create new pending save
  const pending: PendingSave = {
    teamId,
    type,
    data,
    timeoutId: null,
  }

  // Set up debounced execution
  pending.timeoutId = setTimeout(async () => {
    pendingSaves.delete(type)
    await executeSave(pending)
  }, debounceMs)

  pendingSaves.set(type, pending)
}

/**
 * Immediately flush all pending saves (e.g., before unload)
 */
export async function flushPendingTeamSaves(): Promise<void> {
  const saves = Array.from(pendingSaves.values())
  pendingSaves.clear()

  // Clear all timeouts
  for (const save of saves) {
    if (save.timeoutId) {
      clearTimeout(save.timeoutId)
    }
  }

  // Execute all saves (without conflict checking - flush is for emergency saves)
  await Promise.all(saves.map(save => executeSave(save, true)))
}

/**
 * Cancel all pending saves (e.g., when switching teams)
 */
export function cancelPendingTeamSaves(): void {
  for (const save of pendingSaves.values()) {
    if (save.timeoutId) {
      clearTimeout(save.timeoutId)
    }
  }
  pendingSaves.clear()
}

/**
 * Check if there are any pending saves
 */
export function hasPendingTeamSaves(): boolean {
  return pendingSaves.size > 0
}

/**
 * Force save team data after user resolves conflict with "keep mine"
 * This bypasses conflict detection since user explicitly chose to overwrite
 */
export async function forceSaveTeamAfterConflict(
  teamId: string,
  type: TeamConflictType,
  data: Partial<Team>
): Promise<void> {
  if (!isSupabaseConfigured()) {
    return
  }

  try {
    const savedTeam = await updateTeam(teamId, data)

    // Update the loaded timestamp to the new server timestamp
    if (onTimestampUpdated && savedTeam.updated_at) {
      onTimestampUpdated(savedTeam.updated_at)
    }
  } catch (error) {
    console.error('Error force-saving team after conflict:', error)
    // If offline, queue for later (without conflict check)
    if (!isOnline) {
      offlineQueue.push({
        teamId,
        type,
        data,
      })
    }
  }
}
