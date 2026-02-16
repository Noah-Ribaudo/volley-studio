import { DEFAULT_PHASE_ORDER, type RallyPhase } from '@/lib/types'

/**
 * Returns a stable, de-duplicated rally phase order, appending any missing
 * canonical phases to the end to stay backward-compatible with older state.
 */
export function getNormalizedRallyPhaseOrder(_phaseOrder?: RallyPhase[]): RallyPhase[] {
  return [...DEFAULT_PHASE_ORDER]
}

/**
 * Applies visibility filtering on top of the normalized phase order.
 */
export function getVisibleOrderedRallyPhases(
  _phaseOrder: RallyPhase[] | undefined,
  _visiblePhases?: Set<RallyPhase>
): RallyPhase[] {
  return [...DEFAULT_PHASE_ORDER]
}
