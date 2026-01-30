// Lineup helper functions
import { Lineup, PositionAssignments, Team } from './types'
import { generateUUID } from './utils'

/**
 * Create a new lineup with the given name and optional initial assignments
 */
export function createLineup(
  name: string,
  assignments: PositionAssignments = {}
): Lineup {
  return {
    id: generateUUID(),
    name,
    position_assignments: assignments,
    created_at: new Date().toISOString(),
  }
}

/**
 * Get the active lineup from a team, or the first lineup if none is active
 * Returns null if the team has no lineups
 */
export function getActiveLineup(team: Team): Lineup | null {
  if (!team.lineups || team.lineups.length === 0) {
    return null
  }

  // Find the active lineup
  if (team.active_lineup_id) {
    const active = team.lineups.find(l => l.id === team.active_lineup_id)
    if (active) return active
  }

  // Fall back to first lineup
  return team.lineups[0]
}

/**
 * Get the position assignments from the active lineup
 * Returns empty object if no lineup is active
 */
export function getActiveAssignments(team: Team): PositionAssignments {
  const activeLineup = getActiveLineup(team)
  return activeLineup?.position_assignments || {}
}

/**
 * Migrate a team that uses the old single position_assignments field
 * to the new lineups array format.
 *
 * If the team already has lineups, returns the team unchanged.
 * If the team has position_assignments but no lineups, creates a "Lineup 1"
 * from the existing assignments.
 */
export function migrateTeamToLineups(team: Team): Team {
  // Already has lineups - no migration needed
  if (team.lineups && team.lineups.length > 0) {
    return team
  }

  // Check if there are any existing position assignments
  const hasAssignments = team.position_assignments &&
    Object.keys(team.position_assignments).length > 0

  // Create initial lineup from existing assignments (or empty)
  const initialLineup = createLineup(
    'Lineup 1',
    hasAssignments ? team.position_assignments : {}
  )

  return {
    ...team,
    lineups: [initialLineup],
    active_lineup_id: initialLineup.id,
  }
}

/**
 * Find a lineup by ID in a team
 */
export function findLineupById(team: Team, lineupId: string): Lineup | undefined {
  return team.lineups?.find(l => l.id === lineupId)
}

/**
 * Duplicate a lineup with a new name
 */
export function duplicateLineup(lineup: Lineup, newName: string): Lineup {
  return createLineup(newName, { ...lineup.position_assignments })
}

/**
 * Update a lineup's name
 */
export function renameLineup(lineup: Lineup, newName: string): Lineup {
  return { ...lineup, name: newName }
}

/**
 * Update a lineup's position assignments
 */
export function updateLineupAssignments(
  lineup: Lineup,
  assignments: PositionAssignments
): Lineup {
  return { ...lineup, position_assignments: assignments }
}

/**
 * Ensure a team always has at least one lineup.
 * If deleting leaves no lineups, creates a new empty "Lineup 1"
 */
export function ensureAtLeastOneLineup(
  lineups: Lineup[]
): { lineups: Lineup[]; newActiveId: string } {
  if (lineups.length > 0) {
    return { lineups, newActiveId: lineups[0].id }
  }

  const newLineup = createLineup('Lineup 1', {})
  return {
    lineups: [newLineup],
    newActiveId: newLineup.id,
  }
}
