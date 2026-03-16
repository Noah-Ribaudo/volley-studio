import type { Rotation } from '@/lib/types'
import type { ConnectorStyle, CorePhase, PointWinner, PrototypePhase, PrototypeVariantId } from '@/lib/rebuild/prototypeFlow'
import type { SwitchMotionTuning, TactileTuning } from '@/lib/rebuild/tactileTuning'
import type { ReceiveFirstAttackMap } from '@/lib/rebuild/prototypeSeeds'
import type { Role } from '@/lib/types'

export interface PrototypeControlProps {
  variantId: PrototypeVariantId
  currentRotation: Rotation
  currentCorePhase: PrototypePhase
  targetCorePhase: PrototypePhase
  displayCurrentCorePhase: CorePhase
  displayTargetCorePhase: CorePhase
  nextByPlay: PrototypePhase
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
  receiveFirstAttackMap: ReceiveFirstAttackMap
  hasFirstAttackTargets: boolean
  onRotationSelect: (rotation: Rotation) => void
  onPhaseSelect: (phase: PrototypePhase) => void
  onReceiveFirstAttackToggle: (role: Role) => void
  onReceiveFirstAttackSelect: (enabled: boolean) => void
  onPlay: () => void
  onPoint: (winner: PointWinner) => void
}
