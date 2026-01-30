'use client'

import { create } from 'zustand'
import type { RallyPhase, AttackLane, Blackboard, PlayerState, BallState } from '@/lib/sim/types'
import type { BTNodeTrace } from '@/lib/sim/trace'
import type { PlayerRole } from '@/store/useBTEditorStore'

// ============================================================================
// Game Context Types
// ============================================================================

export type PositionContext = 'front_row' | 'back_row'

export interface GameContext {
  // Rally phase
  phase: RallyPhase | null

  // Ball state
  ballOnOurSide: boolean | null
  touchCount: 0 | 1 | 2 | null

  // Serving context (null = not yet answered)
  isOurServe: boolean | null
  amIServer: boolean | null

  // Player position
  position: PositionContext | null

  // Opponent attack (for defense)
  attackLane: AttackLane | null
}

export const DEFAULT_GAME_CONTEXT: GameContext = {
  phase: null,
  ballOnOurSide: null,
  touchCount: null,
  isOurServe: null,
  amIServer: null,
  position: null,
  attackLane: null,
}

// ============================================================================
// Question Definitions
// ============================================================================

export interface ContextQuestion {
  id: keyof GameContext
  question: string
  category: string
  options: { value: string | boolean | number; label: string; description?: string }[]
  // When should this question be shown?
  isRelevant: (ctx: GameContext) => boolean
}

export const CONTEXT_QUESTIONS: ContextQuestion[] = [
  {
    id: 'phase',
    question: 'What phase of the rally?',
    category: 'Rally Phase',
    options: [
      { value: 'PRE_SERVE', label: 'Before the serve', description: 'Players lining up' },
      { value: 'SERVE_IN_AIR', label: 'Serve just hit', description: 'Ball traveling to receivers' },
      { value: 'SERVE_RECEIVE', label: 'Receiving serve', description: 'First contact pending' },
      { value: 'SET_PHASE', label: 'Setting', description: 'Ball passed, setter taking it' },
      { value: 'ATTACK_PHASE', label: 'Attacking', description: 'Hitter approaching' },
      { value: 'DEFENSE_PHASE', label: 'Opponent attacking', description: 'We need to defend' },
    ],
    isRelevant: () => true,
  },
  {
    id: 'isOurServe',
    question: 'Whose serve?',
    category: 'Serve',
    options: [
      { value: true, label: 'Our team', description: 'We are serving' },
      { value: false, label: 'Their team', description: 'We are receiving' },
    ],
    // Only ask during pre-serve or serve in air (serve_receive auto-sets to false)
    isRelevant: (ctx) => ctx.phase === 'PRE_SERVE' || ctx.phase === 'SERVE_IN_AIR',
  },
  {
    id: 'amIServer',
    question: 'Am I the server?',
    category: 'Serve',
    options: [
      { value: true, label: 'Yes', description: "It's my turn to serve" },
      { value: false, label: 'No', description: 'Someone else is serving' },
    ],
    // Only ask if it's our serve during pre-serve or serve in air
    isRelevant: (ctx) =>
      (ctx.phase === 'PRE_SERVE' || ctx.phase === 'SERVE_IN_AIR') && ctx.isOurServe === true,
  },
  {
    id: 'touchCount',
    question: 'How many touches?',
    category: 'Ball',
    options: [
      { value: 0, label: '0 touches', description: 'Ball just crossed or served' },
      { value: 1, label: '1 touch', description: "We've passed it once" },
      { value: 2, label: '2 touches', description: "Setter has it" },
    ],
    // Only ask during serve receive (0 or 1) or set phase (1 or 2)
    // Attack phase is implicitly 2 touches, defense phase is irrelevant
    isRelevant: (ctx) => ctx.phase === 'SERVE_RECEIVE' || ctx.phase === 'SET_PHASE',
  },
  {
    id: 'position',
    question: 'Where am I positioned?',
    category: 'Player',
    options: [
      { value: 'front_row', label: 'Front row', description: 'Can attack at the net' },
      { value: 'back_row', label: 'Back row', description: 'Behind the 3-meter line' },
    ],
    isRelevant: (ctx) => ctx.phase !== null,
  },
  {
    id: 'attackLane',
    question: 'Where is the attack coming from?',
    category: 'Opponent',
    options: [
      { value: 'left', label: 'Left side', description: 'Their outside hitter' },
      { value: 'middle', label: 'Middle', description: 'Their middle blocker' },
      { value: 'right', label: 'Right side', description: 'Their opposite' },
    ],
    // Only ask during defense phase
    isRelevant: (ctx) => ctx.phase === 'DEFENSE_PHASE',
  },
]

// ============================================================================
// Store
// ============================================================================

export interface DecisionResult {
  thought: string // The player's reasoning (from action note)
  goalType: string // What they decided to do
  nodePath: string[] // Path through tree (node names)
  trace: BTNodeTrace // Full trace for highlighting
}

interface SituationState {
  // Current context being built
  context: GameContext

  // Which role we're exploring
  role: PlayerRole

  // The result of running the tree
  result: DecisionResult | null

  // Is the context complete enough to run?
  isContextComplete: boolean

  // Actions
  setContext: <K extends keyof GameContext>(key: K, value: GameContext[K]) => void
  resetContext: () => void
  setRole: (role: PlayerRole) => void
  setResult: (result: DecisionResult | null) => void

  // Get relevant questions for current context
  getRelevantQuestions: () => ContextQuestion[]

  // Check if a specific question has been answered
  isQuestionAnswered: (questionId: keyof GameContext) => boolean
}

export const useSituationStore = create<SituationState>((set, get) => ({
  context: DEFAULT_GAME_CONTEXT,
  role: 'setter',
  result: null,
  isContextComplete: false,

  setContext: (key, value) => {
    set((state) => {
      const newContext = { ...state.context, [key]: value }

      // ========================================
      // Auto-infer values based on phase
      // ========================================
      if (key === 'phase') {
        const phase = value as RallyPhase

        // SERVE_RECEIVE: We are receiving, so it's their serve, ball is on our side
        if (phase === 'SERVE_RECEIVE') {
          newContext.isOurServe = false
          newContext.amIServer = false
          newContext.ballOnOurSide = true
          // touchCount can be 0 or 1, user must specify
        }

        // SET_PHASE: We have the ball, it's on our side
        if (phase === 'SET_PHASE') {
          newContext.ballOnOurSide = true
          // touchCount can be 1 or 2, user must specify
        }

        // ATTACK_PHASE: We are attacking, ball is on our side, 2 touches
        if (phase === 'ATTACK_PHASE') {
          newContext.ballOnOurSide = true
          newContext.touchCount = 2
        }

        // DEFENSE_PHASE: Opponent attacking, ball is on THEIR side
        if (phase === 'DEFENSE_PHASE') {
          newContext.ballOnOurSide = false
          newContext.touchCount = 0 // Not relevant for us, reset to default
        }

        // PRE_SERVE: Ball not in play, touch count is 0
        if (phase === 'PRE_SERVE') {
          newContext.touchCount = 0
        }

        // SERVE_IN_AIR: Touch count is 0 (no one has touched it yet)
        if (phase === 'SERVE_IN_AIR') {
          newContext.touchCount = 0
        }
      }

      // ========================================
      // Auto-infer based on serve ownership
      // ========================================
      if (key === 'isOurServe') {
        // If it's not our serve, we can't be the server
        if (value === false) {
          newContext.amIServer = false
        }

        // During PRE_SERVE, ball is held by server (on their side)
        if (newContext.phase === 'PRE_SERVE') {
          newContext.ballOnOurSide = value === true // Our serve = ball on our side (server holds it)
        }

        // During SERVE_IN_AIR, ball position depends on who is serving
        if (newContext.phase === 'SERVE_IN_AIR') {
          // If we're serving, ball is traveling TO their side (starts on ours, but going to theirs)
          // If they're serving, ball is traveling TO our side
          // For the tree logic, what matters is where ball will land - if they serve, it's coming to us
          newContext.ballOnOurSide = value === false // Their serve = ball coming to our side
        }
      }

      // ========================================
      // Auto-set position when user is the server
      // ========================================
      if (key === 'amIServer' && value === true) {
        // Server is always in zone 1 (back right)
        newContext.position = 'back_row'
      }

      // Check if context is now complete
      const relevantQuestions = CONTEXT_QUESTIONS.filter((q) => q.isRelevant(newContext))
      const isComplete = relevantQuestions.every((q) => {
        const val = newContext[q.id]
        return val !== null && val !== undefined
      })

      return {
        context: newContext,
        isContextComplete: isComplete,
        // Clear result when context changes - it will be regenerated
        result: null,
      }
    })
  },

  resetContext: () => {
    set({
      context: DEFAULT_GAME_CONTEXT,
      result: null,
      isContextComplete: false,
    })
  },

  setRole: (role) => {
    set({
      role,
      result: null,
    })
  },

  setResult: (result) => set({ result }),

  getRelevantQuestions: () => {
    const { context } = get()
    return CONTEXT_QUESTIONS.filter((q) => q.isRelevant(context))
  },

  isQuestionAnswered: (questionId) => {
    const { context } = get()
    const value = context[questionId]
    return value !== null && value !== undefined
  },
}))

// ============================================================================
// Context to Blackboard Mapper
// ============================================================================

/**
 * Convert user-friendly GameContext to simulation Blackboard
 */
export function contextToBlackboard(
  context: GameContext,
  role: PlayerRole
): { blackboard: Blackboard; player: PlayerState } {
  // Create a mock player based on role
  const playerId = `home-${role}`

  const player: PlayerState = {
    id: playerId,
    team: 'HOME',
    role: roleToSimRole(role),
    category: roleToCategory(role),
    priority: 1,
    position: context.position === 'front_row' ? { x: 0.5, y: 0.3 } : { x: 0.5, y: 0.7 },
    velocity: { x: 0, y: 0 },
    maxSpeed: 4,
    requestedGoal: null,
    baseGoal: { type: 'MaintainBaseResponsibility' },
    override: { active: false },
    active: true,
    skills: {
      passing: { accuracy: 0.7, power: 0.6 },
      setting: { accuracy: role === 'setter' ? 0.9 : 0.5, tempo: 0.6 },
      attacking: { accuracy: role === 'setter' ? 0.5 : 0.7, power: 0.7 },
      blocking: { timing: role === 'middle' ? 0.8 : 0.6, reach: 0.5 },
      serving: { accuracy: 0.6, power: 0.6 },
      movement: { speed: 0.7, agility: 0.6 },
    },
  }

  // Use defaults for null values (null means unanswered, but we need values for simulation)
  const ballOnOurSide = context.ballOnOurSide ?? true
  const touchCount = context.touchCount ?? 0
  const isOurServe = context.isOurServe ?? false
  const amIServer = context.amIServer ?? false
  const attackLane = context.attackLane ?? 'left'

  const ball: BallState = {
    position: ballOnOurSide ? { x: 0.4, y: 0.6 } : { x: 0.6, y: 0.4 },
    velocity: { x: 0, y: 0 },
    predicted_landing: { x: 0.4, y: 0.6 },
    touch_count: touchCount as 0 | 1 | 2,
    on_our_side: ballOnOurSide,
  }

  // Determine front row players based on player position
  const frontRowPlayers =
    context.position === 'front_row' ? [playerId] : ['home-other1', 'home-other2']

  const blackboard: Blackboard = {
    fsm: { phase: context.phase || 'PRE_SERVE' },
    ball,
    rotation: {
      index: context.position === 'front_row' ? 4 : 1, // Front row = R4-6, Back row = R1-3
      front_row_players: frontRowPlayers,
      hitterMode: context.position === 'front_row' ? '2-hitter' : '3-hitter', // Front row setter = 2-hitter
    },
    team: {
      setter_id: 'home-setter',
    },
    opponent: {
      attack_lane: attackLane,
    },
    override: { active: false },
    serving: {
      isOurServe: isOurServe,
      serverId: amIServer ? playerId : 'home-other',
    },
  }

  return { blackboard, player }
}

function roleToSimRole(role: PlayerRole): 'S' | 'OH1' | 'OH2' | 'OPP' | 'MB1' | 'MB2' | 'L' {
  switch (role) {
    case 'setter':
      return 'S'
    case 'outside':
      return 'OH1'
    case 'opposite':
      return 'OPP'
    case 'middle':
      return 'MB1'
    case 'libero':
      return 'L'
  }
}

function roleToCategory(
  role: PlayerRole
): 'SETTER' | 'OUTSIDE' | 'OPPOSITE' | 'MIDDLE' | 'LIBERO' {
  switch (role) {
    case 'setter':
      return 'SETTER'
    case 'outside':
      return 'OUTSIDE'
    case 'opposite':
      return 'OPPOSITE'
    case 'middle':
      return 'MIDDLE'
    case 'libero':
      return 'LIBERO'
  }
}

// ============================================================================
// Extract Decision from Trace
// ============================================================================

/**
 * Walk the trace to find the final action and build the path
 */
export function extractDecisionFromTrace(trace: BTNodeTrace): DecisionResult {
  const nodePath: string[] = []
  let thought = ''
  let goalType = ''

  function walk(node: BTNodeTrace): boolean {
    // Add this node to path if it succeeded
    if (node.status === 'SUCCESS') {
      nodePath.push(node.nodeName || node.nodeType)
    }

    // If this is an action that succeeded, we found our decision
    if (node.nodeType === 'Action' && node.status === 'SUCCESS') {
      thought = node.note || node.description || node.nodeName || 'Decision made'
      goalType = node.nodeName || 'Unknown'
      return true // Found it
    }

    // Recurse into children
    if (node.children) {
      for (const child of node.children) {
        if (walk(child)) return true
      }
    }

    return false
  }

  walk(trace)

  return {
    thought,
    goalType,
    nodePath,
    trace,
  }
}
