import type { Rotation } from '@/lib/types'
import type { CorePhase, PointWinner, PrototypeVariantId } from '@/lib/rebuild/prototypeFlow'

export interface PrototypeControlProps {
  variantId: PrototypeVariantId
  currentRotation: Rotation
  currentCorePhase: CorePhase
  nextByPlay: CorePhase
  legalPlayLabel: string
  isFoundationalPhase: boolean
  isOurServe: boolean
  canScore: boolean
  onRotationSelect: (rotation: Rotation) => void
  onRotationStep: (delta: -1 | 1) => void
  onPhaseSelect: (phase: CorePhase) => void
  onPlay: () => void
  onPoint: (winner: PointWinner) => void
}
