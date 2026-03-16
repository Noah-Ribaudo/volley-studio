import type { RallyPhase, Rotation } from '@/lib/types'

export type CorePhase = 'SERVE' | 'RECEIVE' | 'OFFENSE' | 'DEFENSE'
export type PrototypePhase = CorePhase | 'FIRST_ATTACK'
export type PrototypeVariantId = 'playerToggle' | 'attackLabel' | 'splitAttack' | 'clean'
export type ConnectorStyle = 'static' | 'sweep' | 'relay' | 'pulse'
export type ReceiveLinkTarget = 'OFFENSE' | 'FIRST_ATTACK'

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

export interface PrototypeMovementLink {
  sourcePhase: PrototypePhase
  targetPhase: PrototypePhase | null
}

export const CORE_PHASES: CorePhase[] = ['SERVE', 'RECEIVE', 'OFFENSE', 'DEFENSE']
export const PROTOTYPE_PHASES: PrototypePhase[] = ['SERVE', 'RECEIVE', 'FIRST_ATTACK', 'OFFENSE', 'DEFENSE']

export const PROTOTYPE_VARIANTS: Array<{
  id: PrototypeVariantId
  shortLabel: string
  label: string
}> = [
  { id: 'playerToggle', shortLabel: 'Toggle', label: 'Player toggle variant' },
  { id: 'attackLabel', shortLabel: 'State', label: 'Attack label variant' },
  { id: 'splitAttack', shortLabel: 'Split', label: 'Split attack variant' },
  { id: 'clean', shortLabel: 'Clean', label: 'Stripped control variant' },
]

export const CONNECTOR_STYLE_OPTIONS: Array<{
  id: ConnectorStyle
  label: string
}> = [
  { id: 'static', label: 'Still' },
  { id: 'sweep', label: 'Bar' },
  { id: 'relay', label: 'Head' },
  { id: 'pulse', label: 'Charge' },
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

export function toDisplayCorePhase(phase: PrototypePhase): CorePhase {
  return phase === 'FIRST_ATTACK' ? 'OFFENSE' : phase
}

export function getReceiveLinkTarget(hasFirstAttack: boolean): ReceiveLinkTarget {
  return hasFirstAttack ? 'FIRST_ATTACK' : 'OFFENSE'
}

export function getLinkedTargetPhase(
  phase: PrototypePhase,
  options?: { hasFirstAttack?: boolean }
): PrototypePhase {
  const hasFirstAttack = options?.hasFirstAttack ?? false

  switch (phase) {
    case 'SERVE':
      return 'DEFENSE'
    case 'RECEIVE':
      return getReceiveLinkTarget(hasFirstAttack)
    case 'FIRST_ATTACK':
      return 'OFFENSE'
    case 'OFFENSE':
      return 'DEFENSE'
    case 'DEFENSE':
      return 'SERVE'
    default:
      return 'OFFENSE'
  }
}

export function getAdvanceTargetPhase(
  phase: PrototypePhase,
  options?: { hasFirstAttack?: boolean }
): PrototypePhase | null {
  const hasFirstAttack = options?.hasFirstAttack ?? false

  switch (phase) {
    case 'SERVE':
      return 'DEFENSE'
    case 'RECEIVE':
      return getReceiveLinkTarget(hasFirstAttack)
    case 'FIRST_ATTACK':
      return 'DEFENSE'
    case 'OFFENSE':
      return 'DEFENSE'
    case 'DEFENSE':
      return 'OFFENSE'
    default:
      return 'OFFENSE'
  }
}

export function getMovementLink(
  phase: PrototypePhase,
  options?: { hasFirstAttack?: boolean }
): PrototypeMovementLink {
  return {
    sourcePhase: phase,
    targetPhase: getAdvanceTargetPhase(phase, options),
  }
}

export function getNextByPlay(
  phase: PrototypePhase,
  options?: { hasFirstAttack?: boolean }
): PrototypePhase {
  return getAdvanceTargetPhase(phase, options) ?? 'OFFENSE'
}

export function canAdvanceByPlay(
  phase: PrototypePhase,
  options?: { hasFirstAttack?: boolean }
): boolean {
  return getAdvanceTargetPhase(phase, options) !== null
}

export function getLegalPlayLabel(phase: PrototypePhase, options?: { hasFirstAttack?: boolean }): string {
  const next = getAdvanceTargetPhase(phase, options)
  return `${formatPrototypePhaseLabel(phase)} -> ${formatPrototypePhaseLabel(next ?? 'OFFENSE')}`
}

export function canVariantScore(_variant: PrototypeVariantId): boolean {
  return false
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
      return 'Attack'
    case 'DEFENSE':
      return 'Defense'
    default:
      return 'Serve'
  }
}

export function formatPrototypePhaseLabel(phase: PrototypePhase): string {
  if (phase === 'FIRST_ATTACK') {
    return '1st Attack'
  }

  return formatCorePhaseLabel(phase)
}
