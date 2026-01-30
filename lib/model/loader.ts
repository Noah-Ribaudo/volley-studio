// Load canonical JSON data at build/runtime
// In Next.js, we can import JSON directly or use dynamic imports

import type {
  CourtGeometry,
  LegalityRules,
  RotationState,
  Transition,
  RotationIndex,
  TransitionTrigger,
  PlayerRole,
  MovementIntent,
  MovementTiming,
} from './types'

// Import JSON files directly (Next.js/webpack handles this)
import courtData from '../data/volleyball-midi-5-1/court.json'
import legalityData from '../data/volleyball-midi-5-1/legality.json'
import rotation1Data from '../data/volleyball-midi-5-1/rotation_1.json'
import rotation2Data from '../data/volleyball-midi-5-1/rotation_2.json'
import rotation3Data from '../data/volleyball-midi-5-1/rotation_3.json'
import rotation4Data from '../data/volleyball-midi-5-1/rotation_4.json'
import rotation5Data from '../data/volleyball-midi-5-1/rotation_5.json'
import rotation6Data from '../data/volleyball-midi-5-1/rotation_6.json'
import transition1Data from '../data/volleyball-midi-5-1/transition_1.json'
import transition2Data from '../data/volleyball-midi-5-1/transition_2.json'
import transition3Data from '../data/volleyball-midi-5-1/transition_3.json'
import transition4Data from '../data/volleyball-midi-5-1/transition_4.json'
import transition5Data from '../data/volleyball-midi-5-1/transition_5.json'
import transition6Data from '../data/volleyball-midi-5-1/transition_6.json'

// Type for raw JSON rotation data (from imported JSON files)
interface RawRotationData {
  rotation: number
  description: string
  players: Record<string, { slot: string; pos: number[] }>
}

// Type for raw JSON transition data (from imported JSON files)
interface RawTransitionData {
  rotation: number
  trigger: string
  movements: Array<{
    player: string
    to: { x: number; y: number }
    intent: string
    timing: string
  }>
}

/**
 * Transform JSON data to typed RotationState
 */
const transformRotation = (data: RawRotationData): RotationState => {
  const players = data.players || {}
  
  const transformed: Record<string, { slot: string; pos: { x: number; y: number } }> = {}
  
  for (const [role, slotData] of Object.entries(players)) {
    transformed[role] = {
      slot: slotData.slot,
      pos: {
        x: slotData.pos[0] ?? 0,
        y: slotData.pos[1] ?? 0,
      },
    }
  }
  
  return {
    rotation: data.rotation as RotationIndex,
    description: data.description,
    players: transformed as RotationState['players'],
  }
}

/**
 * Transform JSON data to typed Transition
 */
const transformTransition = (data: RawTransitionData): Transition => {
  const movements = (data.movements || []).map((m) => ({
    player: m.player as PlayerRole,
    to: {
      x: m.to.x,
      y: m.to.y,
    },
    intent: m.intent as MovementIntent,
    timing: m.timing as MovementTiming,
  }))
  
  return {
    rotation: data.rotation as RotationIndex,
    trigger: data.trigger as TransitionTrigger,
    movements,
  }
}

/**
 * Load court geometry from canonical JSON
 */
export const loadCourtGeometry = (): CourtGeometry => {
  return courtData as CourtGeometry
}

/**
 * Load legality rules from canonical JSON
 */
export const loadLegalityRules = (): LegalityRules => {
  return legalityData as LegalityRules
}

/**
 * Load all rotation states from canonical JSON
 */
export const loadRotations = (): Record<number, RotationState> => {
  const rotations: Record<number, RotationState> = {}
  
  rotations[1] = transformRotation(rotation1Data)
  rotations[2] = transformRotation(rotation2Data)
  rotations[3] = transformRotation(rotation3Data)
  rotations[4] = transformRotation(rotation4Data)
  rotations[5] = transformRotation(rotation5Data)
  rotations[6] = transformRotation(rotation6Data)
  
  return rotations
}

/**
 * Load all transitions from canonical JSON
 */
export const loadTransitions = (): Record<number, Transition> => {
  const transitions: Record<number, Transition> = {}
  
  transitions[1] = transformTransition(transition1Data)
  transitions[2] = transformTransition(transition2Data)
  transitions[3] = transformTransition(transition3Data)
  transitions[4] = transformTransition(transition4Data)
  transitions[5] = transformTransition(transition5Data)
  transitions[6] = transformTransition(transition6Data)
  
  return transitions
}

/**
 * Get a specific rotation state
 */
export const getRotation = (rotation: number): RotationState | null => {
  const rotations = loadRotations()
  return rotations[rotation] || null
}

/**
 * Get a specific transition
 */
export const getTransition = (rotation: number): Transition | null => {
  const transitions = loadTransitions()
  return transitions[rotation] || null
}

/**
 * Get player positions for a rotation (normalized coordinates)
 */
export const getRotationPositions = (
  rotation: number
): Record<string, { x: number; y: number }> | null => {
  const rotationState = getRotation(rotation)
  if (!rotationState) return null
  
  const positions: Record<string, { x: number; y: number }> = {}
  for (const [role, slot] of Object.entries(rotationState.players)) {
    positions[role] = slot.pos
  }
  
  return positions
}

