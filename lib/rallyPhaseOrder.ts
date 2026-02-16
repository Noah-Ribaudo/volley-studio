import {
  DEFAULT_PHASE_ORDER,
  RALLY_PHASES,
  type RallyPhase,
} from '@/lib/types'

const PHASE_SET = new Set<RallyPhase>(RALLY_PHASES)

/**
 * Returns a stable, de-duplicated rally phase order, appending any missing
 * canonical phases to the end to stay backward-compatible with older state.
 */
export function getNormalizedRallyPhaseOrder(phaseOrder?: RallyPhase[]): RallyPhase[] {
  const source = phaseOrder && phaseOrder.length > 0 ? phaseOrder : DEFAULT_PHASE_ORDER
  const seen = new Set<RallyPhase>()
  const ordered: RallyPhase[] = []

  for (const phase of source) {
    if (!PHASE_SET.has(phase) || seen.has(phase)) continue
    seen.add(phase)
    ordered.push(phase)
  }

  for (const phase of RALLY_PHASES) {
    if (seen.has(phase)) continue
    seen.add(phase)
    ordered.push(phase)
  }

  return ordered
}

/**
 * Applies visibility filtering on top of the normalized phase order.
 */
export function getVisibleOrderedRallyPhases(
  phaseOrder: RallyPhase[] | undefined,
  visiblePhases?: Set<RallyPhase>
): RallyPhase[] {
  const ordered = getNormalizedRallyPhaseOrder(phaseOrder)
  if (!visiblePhases) return ordered
  return ordered.filter((phase) => visiblePhases.has(phase))
}
