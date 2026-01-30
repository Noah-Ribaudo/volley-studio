// Whiteboard Position Resolver
// This module provides static position calculations for the whiteboard view.
// Refactored to use the unified tick pipeline internally.

import type { RallyPhase, GoalType, SimRole, TeamSide, Vec2, CourtModel, PlayerState } from './types'
import type { Role, Rotation, PositionCoordinates, ArrowPositions } from '@/lib/types'
import { ROLES } from '@/lib/types'
import { resolveGoalToTarget } from './goals'
import { DEFAULT_COURT, DEFAULT_PLAYER_SKILLS } from './types'
import { getRotationPositions } from '@/lib/model/loader'
import { getRoleZone, DEFAULT_BASE_ORDER, getBackRowMiddle, getActiveRoles } from '@/lib/rotations'
import { getHitterMode } from './rotation'
import { COURT_ZONES } from '@/lib/types'
import type { WorldState } from './world'
import { createWorldState } from './world'
import { sense, think } from './tick'
import { isGoalIntent } from './intent'

// ============================================================================
// Helper Functions
// ============================================================================

function isRoleFrontRow(role: Role, rotation: Rotation, baseOrder: Role[] = DEFAULT_BASE_ORDER): boolean {
  const zone = getRoleZone(rotation, role, baseOrder)
  return zone === 2 || zone === 3 || zone === 4
}

function getRoleCategory(role: Role): 'SETTER' | 'OUTSIDE' | 'MIDDLE' | 'OPPOSITE' | 'LIBERO' {
  if (role === 'S') return 'SETTER'
  if (role === 'OH1' || role === 'OH2') return 'OUTSIDE'
  if (role === 'MB1' || role === 'MB2') return 'MIDDLE'
  if (role === 'L') return 'LIBERO'
  return 'OPPOSITE'
}

// ============================================================================
// Goal Mapping (Used for static position calculation)
// ============================================================================

type GoalMapping = {
  goal: GoalType
  condition?: 'front_row' | 'back_row' | 'is_server' | 'is_primary_passer'
}

// OLD GOAL MAPPINGS (backed up to whiteboard.backup.ts)
// These were the original phase-based goal mappings that positioned players
// in tactically optimized locations. The new defaults below place all players
// on their zone centers as a baseline for users to customize from.

const PHASE_ROLE_GOALS: Record<RallyPhase, Partial<Record<Role, GoalMapping[]>>> = {
  'PRE_SERVE': {
    'S': [{ goal: 'MaintainBaseResponsibility' }],
    'OH1': [{ goal: 'MaintainBaseResponsibility' }],
    'OH2': [{ goal: 'MaintainBaseResponsibility' }],
    'MB1': [{ goal: 'MaintainBaseResponsibility' }],
    'MB2': [{ goal: 'MaintainBaseResponsibility' }],
    'OPP': [{ goal: 'MaintainBaseResponsibility' }],
    'L': [{ goal: 'MaintainBaseResponsibility' }],
  },
  'SERVE_IN_AIR': {
    'S': [{ goal: 'MaintainBaseResponsibility' }],
    'OH1': [{ goal: 'MaintainBaseResponsibility' }],
    'OH2': [{ goal: 'MaintainBaseResponsibility' }],
    'MB1': [{ goal: 'MaintainBaseResponsibility' }],
    'MB2': [{ goal: 'MaintainBaseResponsibility' }],
    'OPP': [{ goal: 'MaintainBaseResponsibility' }],
    'L': [{ goal: 'MaintainBaseResponsibility' }],
  },
  'SERVE_RECEIVE': {
    'S': [{ goal: 'MaintainBaseResponsibility' }],
    'OH1': [{ goal: 'MaintainBaseResponsibility' }],
    'OH2': [{ goal: 'MaintainBaseResponsibility' }],
    'MB1': [{ goal: 'MaintainBaseResponsibility' }],
    'MB2': [{ goal: 'MaintainBaseResponsibility' }],
    'OPP': [{ goal: 'MaintainBaseResponsibility' }],
    'L': [{ goal: 'MaintainBaseResponsibility' }],
  },
  'TRANSITION_TO_OFFENSE': {
    'S': [{ goal: 'MaintainBaseResponsibility' }],
    'OH1': [{ goal: 'MaintainBaseResponsibility' }],
    'OH2': [{ goal: 'MaintainBaseResponsibility' }],
    'MB1': [{ goal: 'MaintainBaseResponsibility' }],
    'MB2': [{ goal: 'MaintainBaseResponsibility' }],
    'OPP': [{ goal: 'MaintainBaseResponsibility' }],
    'L': [{ goal: 'MaintainBaseResponsibility' }],
  },
  'SET_PHASE': {
    'S': [{ goal: 'MaintainBaseResponsibility' }],
    'OH1': [{ goal: 'MaintainBaseResponsibility' }],
    'OH2': [{ goal: 'MaintainBaseResponsibility' }],
    'MB1': [{ goal: 'MaintainBaseResponsibility' }],
    'MB2': [{ goal: 'MaintainBaseResponsibility' }],
    'OPP': [{ goal: 'MaintainBaseResponsibility' }],
    'L': [{ goal: 'MaintainBaseResponsibility' }],
  },
  'ATTACK_PHASE': {
    'S': [{ goal: 'MaintainBaseResponsibility' }],
    'OH1': [{ goal: 'MaintainBaseResponsibility' }],
    'OH2': [{ goal: 'MaintainBaseResponsibility' }],
    'MB1': [{ goal: 'MaintainBaseResponsibility' }],
    'MB2': [{ goal: 'MaintainBaseResponsibility' }],
    'OPP': [{ goal: 'MaintainBaseResponsibility' }],
    'L': [{ goal: 'MaintainBaseResponsibility' }],
  },
  'TRANSITION_TO_DEFENSE': {
    'S': [{ goal: 'MaintainBaseResponsibility' }],
    'OH1': [{ goal: 'MaintainBaseResponsibility' }],
    'OH2': [{ goal: 'MaintainBaseResponsibility' }],
    'MB1': [{ goal: 'MaintainBaseResponsibility' }],
    'MB2': [{ goal: 'MaintainBaseResponsibility' }],
    'OPP': [{ goal: 'MaintainBaseResponsibility' }],
    'L': [{ goal: 'MaintainBaseResponsibility' }],
  },
  'DEFENSE_PHASE': {
    'S': [{ goal: 'MaintainBaseResponsibility' }],
    'OH1': [{ goal: 'MaintainBaseResponsibility' }],
    'OH2': [{ goal: 'MaintainBaseResponsibility' }],
    'MB1': [{ goal: 'MaintainBaseResponsibility' }],
    'MB2': [{ goal: 'MaintainBaseResponsibility' }],
    'OPP': [{ goal: 'MaintainBaseResponsibility' }],
    'L': [{ goal: 'MaintainBaseResponsibility' }],
  },
  'BALL_DEAD': {
    'S': [{ goal: 'MaintainBaseResponsibility' }],
    'OH1': [{ goal: 'MaintainBaseResponsibility' }],
    'OH2': [{ goal: 'MaintainBaseResponsibility' }],
    'MB1': [{ goal: 'MaintainBaseResponsibility' }],
    'MB2': [{ goal: 'MaintainBaseResponsibility' }],
    'OPP': [{ goal: 'MaintainBaseResponsibility' }],
    'L': [{ goal: 'MaintainBaseResponsibility' }],
  },
}

function getGoalForRole(
  role: Role,
  phase: RallyPhase,
  rotation: Rotation,
  isServing: boolean,
  baseOrder: Role[] = DEFAULT_BASE_ORDER
): GoalType {
  const mappings = PHASE_ROLE_GOALS[phase]?.[role]
  if (!mappings || mappings.length === 0) {
    return 'MaintainBaseResponsibility'
  }

  for (const mapping of mappings) {
    if (!mapping.condition) {
      if (mapping.goal === 'PrepareToServe' || mapping.goal === 'TransitionFromServe') {
        const serverZone = getRoleZone(rotation, 'S', baseOrder)
        if (mapping.goal === 'PrepareToServe' && isServing && serverZone === 1) {
          return mapping.goal
        }
        if (mapping.goal === 'TransitionFromServe' && isServing && serverZone === 1) {
          return mapping.goal
        }
        continue
      }
      return mapping.goal
    }

    const isFront = isRoleFrontRow(role, rotation, baseOrder)
    const category = getRoleCategory(role)
    const isPrimaryPasser = category === 'OUTSIDE' || category === 'LIBERO'

    if (mapping.condition === 'front_row' && isFront) {
      return mapping.goal
    }
    if (mapping.condition === 'back_row' && !isFront) {
      return mapping.goal
    }
    if (mapping.condition === 'is_primary_passer' && isPrimaryPasser) {
      return mapping.goal
    }
  }

  return mappings[0]?.goal || 'MaintainBaseResponsibility'
}

// ============================================================================
// Player State Creation (for goal resolution)
// ============================================================================

function createPlayerState(
  role: Role,
  team: TeamSide,
  position: Vec2,
  rotation: Rotation
): PlayerState {
  const category = getRoleCategory(role)
  const categoryPriority: Record<typeof category, number> = {
    SETTER: 1,
    OPPOSITE: 2,
    LIBERO: 2,
    OUTSIDE: 3,
    MIDDLE: 3,
  }

  return {
    id: `${team}-${role}`,
    team,
    role: role as SimRole,
    category,
    position,
    velocity: { x: 0, y: 0 },
    maxSpeed: 0.15,
    priority: categoryPriority[category],
    requestedGoal: null,
    baseGoal: { type: 'MaintainBaseResponsibility' },
    override: { active: false },
    active: true,
    skills: DEFAULT_PLAYER_SKILLS,
  }
}

// ============================================================================
// Blackboard Creation
// ============================================================================

function createBlackboard(
  phase: RallyPhase,
  rotation: Rotation,
  isReceiving: boolean,
  court: CourtModel,
  baseOrder: Role[] = DEFAULT_BASE_ORDER,
  attackBallPosition?: Vec2 | null
): import('./types').Blackboard {
  const frontRowZones = [2, 3, 4]
  const frontRowPlayers: string[] = []

  for (const role of ROLES) {
    const zone = getRoleZone(rotation, role, baseOrder)
    if (frontRowZones.includes(zone)) {
      frontRowPlayers.push(`HOME-${role}`)
    }
  }

  const ballY = isReceiving ? court.netY + 0.15 : court.netY - 0.15
  const defaultBallPos: Vec2 = { x: 0.5, y: ballY }

  const predictedLanding: Vec2 = (phase === 'DEFENSE_PHASE' && attackBallPosition)
    ? attackBallPosition
    : defaultBallPos

  return {
    ball: {
      position: attackBallPosition ?? defaultBallPos,
      velocity: { x: 0, y: 0 },
      predicted_landing: predictedLanding,
      touch_count: phase === 'SERVE_RECEIVE' ? 0 : phase === 'TRANSITION_TO_OFFENSE' ? 1 : phase === 'SET_PHASE' ? 2 : 0,
      on_our_side: isReceiving,
    },
    fsm: { phase },
    rotation: {
      index: rotation,
      front_row_players: frontRowPlayers,
      hitterMode: getHitterMode(rotation),
    },
    team: {
      setter_id: 'HOME-S',
    },
    opponent: {
      attack_lane: 'middle',
    },
    override: { active: false },
    serving: {
      isOurServe: !isReceiving,
      serverId: !isReceiving ? 'HOME-S' : null,
    },
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get whiteboard positions for a rotation and phase using simulation logic
 */
export function getWhiteboardPositions(params: {
  rotation: Rotation
  phase: RallyPhase
  isReceiving: boolean
  showBothSides?: boolean
  baseOrder?: Role[]
  court?: CourtModel
  showLibero?: boolean
  attackBallPosition?: Vec2 | null
}): {
  home: PositionCoordinates
  away?: PositionCoordinates
} {
  const {
    rotation,
    phase,
    isReceiving,
    showBothSides = false,
    baseOrder = DEFAULT_BASE_ORDER,
    court = DEFAULT_COURT,
    showLibero = false,
    attackBallPosition = null,
  } = params

  // NEW BEHAVIOR: Players start directly on their zone centers for all phases
  // This gives users a clean slate to customize positions from.
  // Old behavior with tactical positioning is backed up in whiteboard.backup.ts

  const homePositions: PositionCoordinates = {} as PositionCoordinates
  const awayPositions: PositionCoordinates | undefined = showBothSides ? ({} as PositionCoordinates) : undefined

  // Determine which MB is being replaced by the libero (if libero is enabled)
  const replacedMB = showLibero ? getBackRowMiddle(rotation, baseOrder) : null

  // Get active roles using the centralized utility
  const activeRoles = getActiveRoles(showLibero, rotation, baseOrder)

  for (const role of activeRoles) {
    // All players start on their zone centers
    const zone = getRoleZone(rotation, role, baseOrder)
    const zonePos = COURT_ZONES[zone as 1 | 2 | 3 | 4 | 5 | 6]

    // Libero takes the position of the back-row middle they're replacing
    let homePos: Vec2
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
      const dy = homePos.y - court.netY
      const awayTarget: Vec2 = {
        x: homePos.x,
        y: court.netY - dy,
      }
      awayPositions[role] = awayTarget
    }
  }

  return {
    home: homePositions,
    away: awayPositions,
  }
}

// Re-export phase flow utilities from single source of truth
export { getNextPhaseInFlow, getPrevPhaseInFlow } from '@/lib/phaseFlow'

/**
 * Get auto-generated arrows pointing to next phase positions
 *
 * NOTE: With the new default behavior (all players on zone centers),
 * arrows are NOT auto-generated since there's no movement between phases.
 * Users can manually draw arrows using Next Step mode.
 */
export function getAutoArrows(
  rotation: Rotation,
  currentPhase: RallyPhase,
  isReceiving: boolean,
  baseOrder?: Role[],
  court?: CourtModel,
  showLibero?: boolean,
  attackBallPosition?: Vec2 | null
): ArrowPositions {
  // Return empty arrows - users can add their own via Next Step mode
  // Old auto-arrow behavior is backed up in whiteboard.backup.ts
  return {}
}

// ============================================================================
// Unified API using Tick Pipeline (for future use)
// ============================================================================

/**
 * Get positions using the tick pipeline's dry-run capability.
 * This is an alternative to getWhiteboardPositions that uses the full
 * unified simulation architecture.
 */
export function getPositionsFromTickPipeline(params: {
  rotation: Rotation
  phase: RallyPhase
  isReceiving: boolean
  court?: CourtModel
}): PositionCoordinates {
  const { rotation, phase, isReceiving, court = DEFAULT_COURT } = params

  // Create a minimal world state for the sense/think phases
  const world = createWorldState({
    court,
    homeRotation: rotation,
    awayRotation: rotation,
    serving: isReceiving ? 'AWAY' : 'HOME',
  })

  // Run sense to build context
  const senseCtx = sense(world)

  // Run think to get BT decisions
  const thinkResult = think(senseCtx)

  // Extract positions from intents
  const positions: PositionCoordinates = {} as PositionCoordinates

  for (const [playerId, btResult] of thinkResult.btResults) {
    const player = senseCtx.activePlayers.find(p => p.id === playerId)
    if (!player || player.team !== 'HOME') continue

    const role = player.role as Role
    if (!ROLES.includes(role)) continue

    // Get the goal intent and resolve it to a position
    const goalIntent = btResult.intents.find(isGoalIntent)
    if (goalIntent && isGoalIntent(goalIntent)) {
      const bb = senseCtx.blackboardByTeam[player.team]
      const resolution = resolveGoalToTarget({
        goal: goalIntent.action.goal,
        self: player,
        bb,
        court,
        rotation,
      })
      positions[role] = resolution.target
    } else {
      positions[role] = player.position
    }
  }

  return positions
}
