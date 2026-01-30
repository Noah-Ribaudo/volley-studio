// Whiteboard Position Utilities
// Simplified position calculations for the whiteboard view.

import type { RallyPhase, Role, Rotation, PositionCoordinates, ArrowPositions, Position } from './types'
import { ROLES, COURT_ZONES } from './types'
import { getRoleZone, DEFAULT_BASE_ORDER, getBackRowMiddle, getActiveRoles } from './rotations'

/**
 * Get whiteboard positions for a rotation and phase.
 * Players are positioned on their zone centers as a baseline for customization.
 */
export function getWhiteboardPositions(params: {
  rotation: Rotation
  phase: RallyPhase
  isReceiving: boolean
  showBothSides?: boolean
  baseOrder?: Role[]
  showLibero?: boolean
  attackBallPosition?: Position | null
}): {
  home: PositionCoordinates
  away?: PositionCoordinates
} {
  const {
    rotation,
    showBothSides = false,
    baseOrder = DEFAULT_BASE_ORDER,
    showLibero = false,
  } = params

  const homePositions: PositionCoordinates = {} as PositionCoordinates
  const awayPositions: PositionCoordinates | undefined = showBothSides ? ({} as PositionCoordinates) : undefined

  // Determine which MB is being replaced by the libero (if libero is enabled)
  const replacedMB = showLibero ? getBackRowMiddle(rotation, baseOrder) : null

  // Get active roles using the centralized utility
  const activeRoles = getActiveRoles(showLibero, rotation, baseOrder)

  const netY = 0.5 // Net is at center of court

  for (const role of activeRoles) {
    // All players start on their zone centers
    const zone = getRoleZone(rotation, role, baseOrder)
    const zonePos = COURT_ZONES[zone as 1 | 2 | 3 | 4 | 5 | 6]

    // Libero takes the position of the back-row middle they're replacing
    let homePos: Position
    if (role === 'L' && replacedMB) {
      // Libero takes the replaced MB's zone position
      const replacedZone = getRoleZone(rotation, replacedMB, baseOrder)
      const replacedZonePos = COURT_ZONES[replacedZone as 1 | 2 | 3 | 4 | 5 | 6]
      homePos = { x: replacedZonePos.x, y: replacedZonePos.y }
    } else {
      homePos = { x: zonePos.x, y: zonePos.y }
    }

    homePositions[role] = {
      x: Math.max(0, Math.min(1, homePos.x)),
      y: Math.max(0, Math.min(1, homePos.y))
    }

    if (showBothSides && awayPositions) {
      const dy = homePos.y - netY
      const awayTarget: Position = {
        x: homePos.x,
        y: netY - dy,
      }
      awayPositions[role] = awayTarget
    }
  }

  return {
    home: homePositions,
    away: awayPositions,
  }
}

/**
 * Get the next phase in the rally flow.
 */
export function getNextPhaseInFlow(phase: RallyPhase): RallyPhase {
  const flow: Record<RallyPhase, RallyPhase> = {
    'PRE_SERVE': 'SERVE_IN_AIR',
    'SERVE_IN_AIR': 'SERVE_RECEIVE',
    'SERVE_RECEIVE': 'TRANSITION_TO_OFFENSE',
    'TRANSITION_TO_OFFENSE': 'SET_PHASE',
    'SET_PHASE': 'ATTACK_PHASE',
    'ATTACK_PHASE': 'TRANSITION_TO_DEFENSE',
    'TRANSITION_TO_DEFENSE': 'DEFENSE_PHASE',
    'DEFENSE_PHASE': 'PRE_SERVE',
    'BALL_DEAD': 'PRE_SERVE',
  }
  return flow[phase] || 'PRE_SERVE'
}

/**
 * Get auto-generated arrows for a rotation and phase.
 * Returns empty - users can add their own arrows via the whiteboard.
 */
export function getAutoArrows(
  rotation: Rotation,
  currentPhase: RallyPhase,
  isReceiving: boolean,
  baseOrder?: Role[],
  court?: unknown,
  showLibero?: boolean,
  attackBallPosition?: Position | null
): ArrowPositions {
  // Return empty arrows - users can add their own
  return {}
}
