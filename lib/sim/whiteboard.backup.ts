// Whiteboard Position Resolver
// This module provides static position calculations for the whiteboard view.
// Refactored to use the unified tick pipeline internally.

import type { RallyPhase, GoalType, SimRole, TeamSide, Vec2, CourtModel, PlayerState } from './types'
import type { Role, Rotation, PositionCoordinates, ArrowPositions } from '@/lib/types'
import { ROLES } from '@/lib/types'
import { resolveGoalToTarget } from './goals'
import { DEFAULT_COURT, DEFAULT_PLAYER_SKILLS } from './types'
import { getRotationPositions } from '@/lib/model/loader'
import { getRoleZone, DEFAULT_BASE_ORDER } from '@/lib/rotations'
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

const PHASE_ROLE_GOALS: Record<RallyPhase, Partial<Record<Role, GoalMapping[]>>> = {
  'PRE_SERVE': {
    'S': [{ goal: 'ParticipateInLegalStack' }],
    'OH1': [{ goal: 'ParticipateInLegalStack' }],
    'OH2': [{ goal: 'ParticipateInLegalStack' }],
    'MB1': [{ goal: 'ParticipateInLegalStack' }],
    'MB2': [{ goal: 'ParticipateInLegalStack' }],
    'OPP': [{ goal: 'ParticipateInLegalStack' }],
    'L': [{ goal: 'MaintainBaseResponsibility' }],
  },
  'SERVE_IN_AIR': {
    'S': [{ goal: 'TransitionFromServe', condition: 'is_server' }, { goal: 'MaintainBaseResponsibility' }],
    'OH1': [{ goal: 'MaintainBaseResponsibility' }],
    'OH2': [{ goal: 'MaintainBaseResponsibility' }],
    'MB1': [{ goal: 'MaintainBaseResponsibility' }],
    'MB2': [{ goal: 'MaintainBaseResponsibility' }],
    'OPP': [{ goal: 'MaintainBaseResponsibility' }],
    'L': [{ goal: 'MaintainBaseResponsibility' }],
  },
  'SERVE_RECEIVE': {
    'S': [{ goal: 'HideBehindPrimaryPasser' }],
    'OH1': [{ goal: 'ReceiveServe', condition: 'is_primary_passer' }, { goal: 'MaintainBaseResponsibility' }],
    'OH2': [{ goal: 'ReceiveServe', condition: 'is_primary_passer' }, { goal: 'MaintainBaseResponsibility' }],
    'MB1': [{ goal: 'MaintainBaseResponsibility' }],
    'MB2': [{ goal: 'MaintainBaseResponsibility' }],
    'OPP': [{ goal: 'MaintainBaseResponsibility' }],
    'L': [{ goal: 'ReceiveServe', condition: 'is_primary_passer' }, { goal: 'MaintainBaseResponsibility' }],
  },
  'TRANSITION_TO_OFFENSE': {
    'S': [{ goal: 'MoveTowardSettingZone' }],
    'OH1': [{ goal: 'MaintainBaseResponsibility' }],
    'OH2': [{ goal: 'MaintainBaseResponsibility' }],
    'MB1': [{ goal: 'MaintainBaseResponsibility' }],
    'MB2': [{ goal: 'MaintainBaseResponsibility' }],
    'OPP': [{ goal: 'MaintainBaseResponsibility' }],
    'L': [{ goal: 'MaintainBaseResponsibility' }],
  },
  'SET_PHASE': {
    'S': [{ goal: 'SetToOutside' }],
    'OH1': [
      { goal: 'ApproachAttackLeft', condition: 'front_row' },
      { goal: 'MaintainBaseResponsibility', condition: 'back_row' }
    ],
    'OH2': [
      { goal: 'ApproachAttackLeft', condition: 'front_row' },
      { goal: 'MaintainBaseResponsibility', condition: 'back_row' }
    ],
    'MB1': [
      { goal: 'ApproachAttackMiddle', condition: 'front_row' },
      { goal: 'MaintainBaseResponsibility', condition: 'back_row' }
    ],
    'MB2': [
      { goal: 'ApproachAttackMiddle', condition: 'front_row' },
      { goal: 'MaintainBaseResponsibility', condition: 'back_row' }
    ],
    'OPP': [
      { goal: 'ApproachAttackRight', condition: 'front_row' },
      { goal: 'MaintainBaseResponsibility', condition: 'back_row' }
    ],
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
    'S': [
      { goal: 'BlockRightSide', condition: 'front_row' },
      { goal: 'DefendZoneBiasRightBack', condition: 'back_row' }
    ],
    'OH1': [
      { goal: 'BlockLeftSide', condition: 'front_row' },
      { goal: 'DefendZoneBiasLeftBack', condition: 'back_row' }
    ],
    'OH2': [
      { goal: 'BlockLeftSide', condition: 'front_row' },
      { goal: 'DefendZoneBiasLeftBack', condition: 'back_row' }
    ],
    'MB1': [
      { goal: 'BlockMiddle', condition: 'front_row' },
      { goal: 'MaintainBaseResponsibility', condition: 'back_row' }
    ],
    'MB2': [
      { goal: 'BlockMiddle', condition: 'front_row' },
      { goal: 'MaintainBaseResponsibility', condition: 'back_row' }
    ],
    'OPP': [
      { goal: 'BlockOpponentOutside', condition: 'front_row' },
      { goal: 'DefendZoneBiasRightBack', condition: 'back_row' }
    ],
    'L': [{ goal: 'DefendZoneBiasMiddleBack' }],
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

  const rotationPositions = getRotationPositions(rotation)

  const homePositions: PositionCoordinates = {} as PositionCoordinates
  const awayPositions: PositionCoordinates | undefined = showBothSides ? ({} as PositionCoordinates) : undefined

  const blackboard = createBlackboard(phase, rotation, isReceiving, court, baseOrder, attackBallPosition)

  for (const role of ROLES) {
    if (role === 'L' && !showLibero) {
      continue
    }

    const goal = getGoalForRole(role, phase, rotation, !isReceiving, baseOrder)

    let startPosition: Vec2
    if (rotationPositions && role in rotationPositions) {
      const pos = rotationPositions[role]
      startPosition = { x: pos.x, y: pos.y }
    } else {
      if (role === 'L') {
        startPosition = { x: 0.5, y: 0.8333 }
      } else {
        const zone = getRoleZone(rotation, role, baseOrder)
        const zonePos = COURT_ZONES[zone as 1 | 2 | 3 | 4 | 5 | 6]
        startPosition = { x: zonePos.x, y: zonePos.y }
      }
    }

    const playerState = createPlayerState(role, 'HOME', startPosition, rotation)

    const resolution = resolveGoalToTarget({
      goal,
      self: playerState,
      bb: blackboard,
      court,
      rotation,
      baseOrder,
    })

    const target = resolution.target
    if (!target || typeof target.x !== 'number' || typeof target.y !== 'number' ||
        isNaN(target.x) || isNaN(target.y)) {
      console.warn(`Invalid target for role ${role} in phase ${phase}, using zone center`);
      const zone = getRoleZone(rotation, role, baseOrder)
      const zonePos = COURT_ZONES[zone as 1 | 2 | 3 | 4 | 5 | 6]
      homePositions[role] = zonePos || { x: 0.5, y: 0.5 }
    } else {
      homePositions[role] = {
        x: Math.max(0, Math.min(1, target.x)),
        y: Math.max(0, Math.min(1, target.y))
      }
    }

    if (showBothSides && awayPositions) {
      const dy = resolution.target.y - court.netY
      const awayTarget: Vec2 = {
        x: resolution.target.x,
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

/**
 * Get next phase in the rally flow
 */
export function getNextPhaseInFlow(currentPhase: RallyPhase): RallyPhase {
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
  return flow[currentPhase] || 'PRE_SERVE'
}

/**
 * Get previous phase in the rally flow
 */
export function getPrevPhaseInFlow(currentPhase: RallyPhase): RallyPhase {
  const flow: Record<RallyPhase, RallyPhase> = {
    'PRE_SERVE': 'DEFENSE_PHASE',
    'SERVE_IN_AIR': 'PRE_SERVE',
    'SERVE_RECEIVE': 'SERVE_IN_AIR',
    'TRANSITION_TO_OFFENSE': 'SERVE_RECEIVE',
    'SET_PHASE': 'TRANSITION_TO_OFFENSE',
    'ATTACK_PHASE': 'SET_PHASE',
    'TRANSITION_TO_DEFENSE': 'ATTACK_PHASE',
    'DEFENSE_PHASE': 'TRANSITION_TO_DEFENSE',
    'BALL_DEAD': 'DEFENSE_PHASE',
  }
  return flow[currentPhase] || 'PRE_SERVE'
}

/**
 * Get auto-generated arrows pointing to next phase positions
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
  const nextPhase = getNextPhaseInFlow(currentPhase)
  const currentPositions = getWhiteboardPositions({
    rotation,
    phase: currentPhase,
    isReceiving,
    baseOrder,
    court,
    showLibero,
    attackBallPosition: currentPhase === 'DEFENSE_PHASE' ? attackBallPosition : null,
  })
  const nextPositions = getWhiteboardPositions({
    rotation,
    phase: nextPhase,
    isReceiving,
    baseOrder,
    court,
    showLibero,
    attackBallPosition: nextPhase === 'DEFENSE_PHASE' ? attackBallPosition : null,
  })

  const arrows: ArrowPositions = {}
  for (const role of ROLES) {
    if (role === 'L' && !showLibero) {
      continue
    }
    if (nextPositions.home[role]) {
      arrows[role] = nextPositions.home[role]
    }
  }

  return arrows
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
