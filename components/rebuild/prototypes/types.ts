import type { Rotation } from '@/lib/types'
import type { ConnectorStyle, CorePhase, PointWinner, PrototypePhase, PrototypeVariantId } from '@/lib/rebuild/prototypeFlow'
import type { SwitchMotionTuning, TactileTuning } from '@/lib/rebuild/tactileTuning'

export interface ManualJoystickNudge {
  phase: CorePhase
  trigger: number
  active: boolean
}

export interface PrototypeControlProps {
  variantId: PrototypeVariantId
  currentRotation: Rotation
  currentCorePhase: PrototypePhase
  targetCorePhase: PrototypePhase
  displayCurrentCorePhase: CorePhase
  displayTargetCorePhase: CorePhase
  nextByPlay: PrototypePhase
  canPlayAdvance: boolean
  displayNextByPlay: CorePhase
  legalPlayLabel: string
  isFoundationalPhase: boolean
  isOurServe: boolean
  canScore: boolean
  connectorStyle: ConnectorStyle
  playAnimationTrigger: number
  isPhaseTraveling: boolean
  isPreviewingMovement: boolean
  switchMotion: SwitchMotionTuning
  tactileTuning: TactileTuning
  hasFirstAttackTargets: boolean
  manualJoystickNudge: ManualJoystickNudge | null
  onRotationSelect: (rotation: Rotation) => void
  onPhaseSelect: (phase: PrototypePhase) => void
  onManualPhasePress: (phase: PrototypePhase) => void
  onManualPhaseCancel: () => void
  onManualPhaseSelect: (phase: PrototypePhase) => void
  onPlay: () => void
  onPoint: (winner: PointWinner) => void
}
