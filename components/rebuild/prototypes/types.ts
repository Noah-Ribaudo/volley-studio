import type { Rotation } from '@/lib/types'
import type { CorePhase, PointWinner, PrototypeVariantId } from '@/lib/rebuild/prototypeFlow'
import type { SwitchMotionTuning } from '@/lib/rebuild/tactileTuning'

export interface PrototypeControlProps {
  variantId: PrototypeVariantId
  currentRotation: Rotation
  currentCorePhase: CorePhase
  nextByPlay: CorePhase
  legalPlayLabel: string
  isFoundationalPhase: boolean
  isOurServe: boolean
  canScore: boolean
  switchMotion: SwitchMotionTuning
  onRotationSelect: (rotation: Rotation) => void
  onPhaseSelect: (phase: CorePhase) => void
  onPlay: () => void
  onPoint: (winner: PointWinner) => void
}
