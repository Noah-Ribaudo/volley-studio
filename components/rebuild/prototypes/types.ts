import type { Rotation } from '@/lib/types'
import type { Concept4Mode, CorePhase, PointWinner, PrototypeVariantId } from '@/lib/rebuild/prototypeFlow'
import type { SwitchMotionTuning, TactileTuning } from '@/lib/rebuild/tactileTuning'

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
  tactileTuning: TactileTuning
  concept4Mode: Concept4Mode
  onRotationSelect: (rotation: Rotation) => void
  onPhaseSelect: (phase: CorePhase) => void
  onConcept4ModeChange: (mode: Concept4Mode) => void
  onPlay: () => void
  onPoint: (winner: PointWinner) => void
}
