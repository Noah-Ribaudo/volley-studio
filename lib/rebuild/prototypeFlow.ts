import type { RallyPhase, Rotation } from '@/lib/types'

export type CorePhase = 'SERVE' | 'RECEIVE' | 'OFFENSE' | 'DEFENSE'
export type PrototypeVariantId = 'concept3' | 'concept4' | 'concept5' | 'concept6'

export type PointWinner = 'us' | 'them'

export interface RallyContext {
  currentRotation: Rotation
  currentCorePhase: CorePhase
  isOurServe: boolean
}

export interface PointOutcome {
  nextRotation: Rotation
  nextCorePhase: CorePhase
  nextIsOurServe: boolean
  didSideout: boolean
}

export const CORE_PHASES: CorePhase[] = ['SERVE', 'RECEIVE', 'OFFENSE', 'DEFENSE']

export const PROTOTYPE_VARIANTS: Array<{
  id: PrototypeVariantId
  shortLabel: string
  label: string
}> = [
  { id: 'concept3', shortLabel: 'C3', label: 'Foundation Morph Deck' },
  { id: 'concept4', shortLabel: 'C4', label: 'Reference Relay Layout' },
  { id: 'concept5', shortLabel: 'C5', label: 'Rotation Hub + Rally Map' },
  { id: 'concept6', shortLabel: 'C6', label: 'Live Match Console+' },
]

export const CORE_PHASE_TO_RALLY_PHASE: Record<CorePhase, RallyPhase> = {
  SERVE: 'PRE_SERVE',
  RECEIVE: 'SERVE_RECEIVE',
  OFFENSE: 'ATTACK_PHASE',
  DEFENSE: 'DEFENSE_PHASE',
}

export function toRallyPhase(corePhase: CorePhase): RallyPhase {
  return CORE_PHASE_TO_RALLY_PHASE[corePhase]
}

export function fromRallyPhase(phase: RallyPhase): CorePhase {
  switch (phase) {
    case 'PRE_SERVE':
      return 'SERVE'
    case 'SERVE_RECEIVE':
      return 'RECEIVE'
    case 'ATTACK_PHASE':
      return 'OFFENSE'
    case 'DEFENSE_PHASE':
      return 'DEFENSE'
    default:
      return 'SERVE'
  }
}

export function isFoundationalPhase(phase: CorePhase): boolean {
  return phase === 'SERVE' || phase === 'RECEIVE'
}

export function getNextByPlay(phase: CorePhase): CorePhase {
  switch (phase) {
    case 'SERVE':
      return 'DEFENSE'
    case 'RECEIVE':
      return 'OFFENSE'
    case 'OFFENSE':
      return 'DEFENSE'
    case 'DEFENSE':
      return 'OFFENSE'
    default:
      return 'OFFENSE'
  }
}

export function getLegalPlayLabel(phase: CorePhase): string {
  const next = getNextByPlay(phase)
  return `${phase} -> ${next}`
}

export function canVariantScore(variant: PrototypeVariantId): boolean {
  return variant === 'concept5' || variant === 'concept6'
}

const SETTER_ZONE_BY_ROTATION: Record<Rotation, 1 | 2 | 3 | 4 | 5 | 6> = {
  1: 1,
  2: 6,
  3: 5,
  4: 4,
  5: 3,
  6: 2,
}

export function getSetterZoneForRotation(rotation: Rotation): 1 | 2 | 3 | 4 | 5 | 6 {
  return SETTER_ZONE_BY_ROTATION[rotation]
}

export function getRotationForSetterZone(zone: 1 | 2 | 3 | 4 | 5 | 6): Rotation {
  const entry = Object.entries(SETTER_ZONE_BY_ROTATION).find(([, mappedZone]) => mappedZone === zone)
  return entry ? (Number(entry[0]) as Rotation) : 1
}

function wrapRotation(rotation: Rotation, delta: -1 | 1): Rotation {
  if (delta === 1) {
    return rotation === 6 ? 1 : ((rotation + 1) as Rotation)
  }
  return rotation === 1 ? 6 : ((rotation - 1) as Rotation)
}

export function applyPointScored(context: RallyContext, pointWinner: PointWinner): PointOutcome {
  const { currentRotation, isOurServe } = context

  if (pointWinner === 'us' && isOurServe) {
    return {
      nextRotation: currentRotation,
      nextCorePhase: 'SERVE',
      nextIsOurServe: true,
      didSideout: false,
    }
  }

  if (pointWinner === 'us' && !isOurServe) {
    return {
      nextRotation: wrapRotation(currentRotation, 1),
      nextCorePhase: 'SERVE',
      nextIsOurServe: true,
      didSideout: true,
    }
  }

  if (pointWinner === 'them' && isOurServe) {
    return {
      nextRotation: currentRotation,
      nextCorePhase: 'RECEIVE',
      nextIsOurServe: false,
      didSideout: true,
    }
  }

  return {
    nextRotation: currentRotation,
    nextCorePhase: 'RECEIVE',
    nextIsOurServe: false,
    didSideout: false,
  }
}

export function formatCorePhaseLabel(phase: CorePhase): string {
  switch (phase) {
    case 'SERVE':
      return 'Serve'
    case 'RECEIVE':
      return 'Receive'
    case 'OFFENSE':
      return 'Offense'
    case 'DEFENSE':
      return 'Defense'
    default:
      return 'Serve'
  }
}
