import type { Id } from '@/convex/_generated/dataModel'
import { ensureAtLeastOneLineup } from '@/lib/lineups'
import { getLocalTeamById, removeLocalTeam, upsertLocalTeam } from '@/lib/localTeams'
import type { PresetSystem } from '@/lib/presetTypes'
import { generateSlug } from '@/lib/teamUtils'
import type { Lineup, PositionAssignments, RosterPlayer, Team } from '@/lib/types'

export type TeamContextLoadRequest =
  | { mode: 'practice' }
  | { mode: 'unsavedLocal'; teamId: string }
  | { mode: 'savedCloud'; identifier: string }

type CloudCreateTeam = (args: {
  name: string
  slug: string
  password?: string
  presetSystem?: PresetSystem
}) => Promise<string>

type CloudUpdateTeam = (args: {
  id: Id<'teams'>
  name?: string
  password?: string | null
  archived?: boolean
}) => Promise<unknown>

type CloudUpdateRoster = (args: {
  id: Id<'teams'>
  roster: Array<{ id: string; name?: string; number?: number }>
}) => Promise<unknown>

type CloudUpdateLineups = (args: {
  id: Id<'teams'>
  lineups: Array<{
    id: string
    name: string
    position_assignments: Record<string, string>
    position_source?: string
    starting_rotation?: number
    created_at: string
  }>
  activeLineupId?: string
  positionAssignments: Record<string, string>
}) => Promise<unknown>

type CloudDeleteTeam = (args: { id: Id<'teams'> }) => Promise<unknown>
type CloudLoadTeam = (identifier: string) => Promise<Team | null> | Team | null

export interface TeamRepositoryDeps {
  createCloudTeam?: CloudCreateTeam
  updateCloudTeam?: CloudUpdateTeam
  updateCloudRoster?: CloudUpdateRoster
  updateCloudLineups?: CloudUpdateLineups
  deleteCloudTeam?: CloudDeleteTeam
  loadCloudTeam?: CloudLoadTeam
}

export interface NormalizedLineupState {
  lineups: Lineup[]
  activeLineupId: string | null
  activeAssignments: Record<string, string>
}

export function isSavedCloudTeam(team: Team): boolean {
  return Boolean(team._id)
}

export function cleanAssignments(assignments: PositionAssignments): Record<string, string> {
  const cleaned: Record<string, string> = {}
  for (const [role, playerId] of Object.entries(assignments)) {
    if (typeof playerId === 'string' && playerId.trim() !== '') {
      cleaned[role] = playerId
    }
  }
  return cleaned
}

export function normalizeLineupState(
  lineups: Lineup[],
  nextActiveLineupId: string | null
): NormalizedLineupState {
  const ensured = ensureAtLeastOneLineup(lineups)
  const normalizedLineups = ensured.lineups.map((lineup) => ({
    ...lineup,
    position_assignments: cleanAssignments(lineup.position_assignments),
    starting_rotation: lineup.starting_rotation ?? 1,
  }))
  const normalizedActiveLineupId = nextActiveLineupId && normalizedLineups.some((lineup) => lineup.id === nextActiveLineupId)
    ? nextActiveLineupId
    : ensured.newActiveId
  const activeLineup = normalizedLineups.find((lineup) => lineup.id === normalizedActiveLineupId)
  return {
    lineups: normalizedLineups,
    activeLineupId: normalizedActiveLineupId,
    activeAssignments: cleanAssignments(activeLineup?.position_assignments || {}),
  }
}

function getCloudTeamId(team: Team): Id<'teams'> | null {
  return team._id ? (team._id as Id<'teams'>) : null
}

function upsertLocalAndReturn(team: Team): Team {
  upsertLocalTeam(team)
  return team
}

export function createTeamRepository(deps: TeamRepositoryDeps = {}) {
  return {
    async load(request: TeamContextLoadRequest): Promise<Team | null> {
      if (request.mode === 'practice') {
        return null
      }

      if (request.mode === 'unsavedLocal') {
        return getLocalTeamById(request.teamId)
      }

      if (!deps.loadCloudTeam) {
        throw new Error('Cloud team loader is not configured')
      }
      return await deps.loadCloudTeam(request.identifier)
    },

    async createCloudTeam(name: string, presetSystem?: PresetSystem): Promise<string> {
      if (!deps.createCloudTeam) {
        throw new Error('Cloud team creator is not configured')
      }
      const trimmedName = name.trim()
      if (!trimmedName) {
        throw new Error('Team name is required')
      }
      return await deps.createCloudTeam({
        name: trimmedName,
        slug: generateSlug(trimmedName),
        presetSystem,
      })
    },

    createLocalTeam(name: string, presetSystem?: PresetSystem): Team {
      const trimmedName = name.trim()
      if (!trimmedName) {
        throw new Error('Team name is required')
      }

      const now = new Date().toISOString()
      const lineupId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `lineup-${Date.now()}`

      return upsertLocalAndReturn({
        id: `local-${Date.now()}`,
        name: trimmedName,
        slug: generateSlug(trimmedName),
        hasPassword: false,
        archived: false,
        roster: [],
        lineups: [{
          id: lineupId,
          name: 'Lineup 1',
          position_assignments: {},
          position_source: presetSystem,
          starting_rotation: 1,
          created_at: now,
        }],
        active_lineup_id: lineupId,
        position_assignments: {},
        created_at: now,
        updated_at: now,
      })
    },

    async saveTeamName(team: Team, name: string): Promise<Team> {
      const trimmedName = name.trim()
      if (!trimmedName) {
        throw new Error('Team name is required')
      }

      const updatedTeam: Team = {
        ...team,
        name: trimmedName,
        slug: generateSlug(trimmedName),
        updated_at: new Date().toISOString(),
      }

      const cloudTeamId = getCloudTeamId(team)
      if (cloudTeamId) {
        if (!deps.updateCloudTeam) {
          throw new Error('Cloud team updater is not configured')
        }
        await deps.updateCloudTeam({
          id: cloudTeamId,
          name: trimmedName,
        })
        return updatedTeam
      }

      return upsertLocalAndReturn(updatedTeam)
    },

    async saveRoster(team: Team, roster: RosterPlayer[]): Promise<Team> {
      const updatedTeam: Team = {
        ...team,
        roster,
        updated_at: new Date().toISOString(),
      }

      const cloudTeamId = getCloudTeamId(team)
      if (cloudTeamId) {
        if (!deps.updateCloudRoster) {
          throw new Error('Cloud roster updater is not configured')
        }
        await deps.updateCloudRoster({
          id: cloudTeamId,
          roster: roster.map((player) => ({
            id: player.id,
            name: player.name,
            number: player.number,
          })),
        })
        return updatedTeam
      }

      return upsertLocalAndReturn(updatedTeam)
    },

    async saveLineups(
      team: Team,
      nextLineups: Lineup[],
      nextActiveLineupId: string | null
    ): Promise<Team> {
      const normalized = normalizeLineupState(nextLineups, nextActiveLineupId)
      const updatedTeam: Team = {
        ...team,
        lineups: normalized.lineups,
        active_lineup_id: normalized.activeLineupId,
        // Keep legacy field synchronized at the boundary.
        position_assignments: normalized.activeAssignments,
        updated_at: new Date().toISOString(),
      }

      const cloudTeamId = getCloudTeamId(team)
      if (cloudTeamId) {
        if (!deps.updateCloudLineups) {
          throw new Error('Cloud lineup updater is not configured')
        }
        await deps.updateCloudLineups({
          id: cloudTeamId,
          lineups: normalized.lineups.map((lineup) => ({
            id: lineup.id,
            name: lineup.name,
            position_assignments: cleanAssignments(lineup.position_assignments),
            position_source: lineup.position_source,
            starting_rotation: lineup.starting_rotation ?? 1,
            created_at: lineup.created_at,
          })),
          activeLineupId: normalized.activeLineupId ?? undefined,
          positionAssignments: normalized.activeAssignments,
        })
        return updatedTeam
      }

      return upsertLocalAndReturn(updatedTeam)
    },

    async delete(team: Team): Promise<void> {
      const cloudTeamId = getCloudTeamId(team)
      if (cloudTeamId) {
        if (!deps.deleteCloudTeam) {
          throw new Error('Cloud team delete is not configured')
        }
        await deps.deleteCloudTeam({ id: cloudTeamId })
        return
      }

      removeLocalTeam(team.id)
    },
  }
}

export type TeamRepository = ReturnType<typeof createTeamRepository>
