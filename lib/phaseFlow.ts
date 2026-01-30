// Phase Flow Utilities
// Single source of truth for rally phase progression logic

import type { RallyPhase } from '@/lib/sim/types'

/**
 * Phase flow mapping: what comes after each phase in the rally cycle
 */
export const PHASE_FLOW_NEXT: Record<RallyPhase, RallyPhase> = {
  'PRE_SERVE': 'SERVE_IN_AIR',
  'SERVE_IN_AIR': 'SERVE_RECEIVE',
  'SERVE_RECEIVE': 'TRANSITION_TO_OFFENSE',
  'TRANSITION_TO_OFFENSE': 'SET_PHASE',
  'SET_PHASE': 'ATTACK_PHASE',
  'ATTACK_PHASE': 'TRANSITION_TO_DEFENSE',
  'TRANSITION_TO_DEFENSE': 'DEFENSE_PHASE',
  'DEFENSE_PHASE': 'PRE_SERVE', // Loops back (new rally)
  'BALL_DEAD': 'PRE_SERVE',
}

/**
 * Phase flow mapping: what comes before each phase in the rally cycle
 */
export const PHASE_FLOW_PREV: Record<RallyPhase, RallyPhase> = {
  'PRE_SERVE': 'DEFENSE_PHASE', // Goes to end of previous rally
  'SERVE_IN_AIR': 'PRE_SERVE',
  'SERVE_RECEIVE': 'SERVE_IN_AIR',
  'TRANSITION_TO_OFFENSE': 'SERVE_RECEIVE',
  'SET_PHASE': 'TRANSITION_TO_OFFENSE',
  'ATTACK_PHASE': 'SET_PHASE',
  'TRANSITION_TO_DEFENSE': 'ATTACK_PHASE',
  'DEFENSE_PHASE': 'TRANSITION_TO_DEFENSE',
  'BALL_DEAD': 'DEFENSE_PHASE',
}

/**
 * Get the next phase in the rally flow
 */
export const getNextPhaseInFlow = (currentPhase: RallyPhase): RallyPhase => {
  return PHASE_FLOW_NEXT[currentPhase] || 'PRE_SERVE'
}

/**
 * Get the previous phase in the rally flow
 */
export const getPrevPhaseInFlow = (currentPhase: RallyPhase): RallyPhase => {
  return PHASE_FLOW_PREV[currentPhase] || 'PRE_SERVE'
}

/**
 * Check if a phase transition would loop back to PRE_SERVE (indicating rotation should advance)
 */
export const wouldLoopToStart = (currentPhase: RallyPhase, direction: 'next' | 'prev'): boolean => {
  if (direction === 'next') {
    const nextPhase = PHASE_FLOW_NEXT[currentPhase]
    return nextPhase === 'PRE_SERVE' && currentPhase !== 'PRE_SERVE'
  } else {
    return currentPhase === 'PRE_SERVE'
  }
}





