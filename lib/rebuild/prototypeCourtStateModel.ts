import {
  formatPrototypePhaseLabel,
  getPrototypeIncomingPhases,
  isSharedArrivalPhase,
  type CorePhase,
  type PrototypePhase,
} from '@/lib/rebuild/prototypeFlow'
import {
  getPrototypeSeed,
  type RoleCurveMap,
  type RolePositionMap,
} from '@/lib/rebuild/prototypeSeeds'
import type { ArrowCurveConfig, ArrowPositions, Position, PositionCoordinates, Role, Rotation } from '@/lib/types'
import { ROLES } from '@/lib/types'

export type PositionOverrideState = Partial<Record<string, RolePositionMap>>
export type CurveState = Partial<Record<string, RoleCurveMap>>
export type ReceiveBranchState = Partial<Record<Rotation, Partial<Record<Role, true>>>>
export type SecondaryCurveState = Partial<Record<Rotation, RoleCurveMap>>

export interface PrototypeCourtStateData {
  positionOverridesByPhase: PositionOverrideState
  primaryArrowCurvesByPhase: CurveState
  receiveBranchRolesByRotation: ReceiveBranchState
  secondaryArrowCurvesByRotation: SecondaryCurveState
}

type RoleNestedMap<T> = Partial<Record<string | number, Partial<Record<Role, T>>>>

export interface PrototypeCourtStateResolver {
  getFallbackPositions: (rotation: Rotation, phase: CorePhase) => PositionCoordinates
}

export const EMPTY_PROTOTYPE_COURT_STATE: PrototypeCourtStateData = {
  positionOverridesByPhase: {},
  primaryArrowCurvesByPhase: {},
  receiveBranchRolesByRotation: {},
  secondaryArrowCurvesByRotation: {},
}

export function getPhaseKey(rotation: Rotation, phase: PrototypePhase) {
  return `${rotation}:${phase}`
}

function clonePosition(position?: Position | null): Position | undefined {
  if (!position) return undefined
  return { ...position }
}

function cloneRolePositionMap(source?: RolePositionMap): RolePositionMap {
  const next: RolePositionMap = {}
  if (!source) {
    return next
  }

  for (const role of ROLES) {
    const position = source[role]
    if (position) {
      next[role] = { ...position }
    }
  }

  return next
}

function clonePositionCoordinates(source: PositionCoordinates): PositionCoordinates {
  const next = {} as PositionCoordinates

  for (const role of ROLES) {
    const position = source[role]
    if (position) {
      next[role] = { ...position }
    }
  }

  return next
}

function mergePositions(base: PositionCoordinates, override?: RolePositionMap): PositionCoordinates {
  const next = clonePositionCoordinates(base)

  for (const role of ROLES) {
    const position = override?.[role]
    if (position) {
      next[role] = { ...position }
    }
  }

  return next
}

function positionsEqual(a?: Position | null, b?: Position | null) {
  if (!a && !b) return true
  if (!a || !b) return false
  return Math.abs(a.x - b.x) < 0.0005 && Math.abs(a.y - b.y) < 0.0005
}

export function hasMeaningfulMovement(start?: Position | null, end?: Position | null) {
  if (!start || !end) return false
  return Math.hypot(end.x - start.x, end.y - start.y) >= 0.001
}

export function getPrototypeBasePositions(
  resolver: PrototypeCourtStateResolver,
  rotation: Rotation,
  phase: PrototypePhase
): PositionCoordinates {
  if (phase === 'FIRST_ATTACK') {
    return clonePositionCoordinates(resolver.getFallbackPositions(rotation, 'OFFENSE'))
  }

  return clonePositionCoordinates(resolver.getFallbackPositions(rotation, phase))
}

export function getPrototypePositions(
  state: PrototypeCourtStateData,
  resolver: PrototypeCourtStateResolver,
  rotation: Rotation,
  phase: PrototypePhase
): PositionCoordinates {
  return mergePositions(
    getPrototypeBasePositions(resolver, rotation, phase),
    state.positionOverridesByPhase[getPhaseKey(rotation, phase)]
  )
}

function updateRoleMap<T>(
  current: RoleNestedMap<T>,
  key: string | number,
  role: Role,
  value: T | null
): RoleNestedMap<T> {
  const currentEntry = current[key] ?? {}

  if (value === null || value === undefined) {
    if (!(role in currentEntry)) {
      return current
    }

    const nextEntry = { ...currentEntry }
    delete nextEntry[role]

    if (Object.keys(nextEntry).length === 0) {
      const nextState = { ...current }
      delete nextState[key]
      return nextState
    }

    return {
      ...current,
      [key]: nextEntry,
    }
  }

  return {
    ...current,
    [key]: {
      ...currentEntry,
      [role]: value,
    },
  }
}

function setResolvedPhasePosition(
  state: PrototypeCourtStateData,
  resolver: PrototypeCourtStateResolver,
  rotation: Rotation,
  phase: PrototypePhase,
  role: Role,
  position: Position
): PrototypeCourtStateData {
  const key = getPhaseKey(rotation, phase)
  const basePosition = getPrototypeBasePositions(resolver, rotation, phase)[role]
  const nextOverrides = updateRoleMap(
    state.positionOverridesByPhase,
    key,
    role,
    positionsEqual(basePosition, position) ? null : clonePosition(position)
  ) as PositionOverrideState

  if (nextOverrides === state.positionOverridesByPhase) {
    return state
  }

  return {
    ...state,
    positionOverridesByPhase: nextOverrides,
  }
}

function clearPhasePositions(
  state: PrototypeCourtStateData,
  rotation: Rotation,
  phase: PrototypePhase
): PrototypeCourtStateData {
  const key = getPhaseKey(rotation, phase)
  if (!(key in state.positionOverridesByPhase)) {
    return state
  }

  const nextOverrides = { ...state.positionOverridesByPhase }
  delete nextOverrides[key]

  return {
    ...state,
    positionOverridesByPhase: nextOverrides,
  }
}

function clearPhaseCurves(
  state: PrototypeCourtStateData,
  rotation: Rotation,
  phase: PrototypePhase
): PrototypeCourtStateData {
  const key = getPhaseKey(rotation, phase)
  if (!(key in state.primaryArrowCurvesByPhase)) {
    return state
  }

  const nextCurves = { ...state.primaryArrowCurvesByPhase }
  delete nextCurves[key]

  return {
    ...state,
    primaryArrowCurvesByPhase: nextCurves,
  }
}

function setReceiveFirstAttackEnabled(
  state: PrototypeCourtStateData,
  rotation: Rotation,
  role: Role,
  enabled: boolean
): PrototypeCourtStateData {
  const nextRoles = updateRoleMap(
    state.receiveBranchRolesByRotation,
    rotation,
    role,
    enabled ? true : null
  ) as ReceiveBranchState

  if (nextRoles === state.receiveBranchRolesByRotation) {
    return state
  }

  return {
    ...state,
    receiveBranchRolesByRotation: nextRoles,
  }
}

export function roleUsesFirstAttack(
  state: PrototypeCourtStateData,
  rotation: Rotation,
  role: Role
) {
  return Boolean(state.receiveBranchRolesByRotation[rotation]?.[role])
}

export function hasFirstAttackTargetsForRotation(
  state: PrototypeCourtStateData,
  rotation: Rotation
) {
  return Object.keys(state.receiveBranchRolesByRotation[rotation] ?? {}).length > 0
}

export function getPrimaryTargetPhaseForRole(
  state: PrototypeCourtStateData,
  rotation: Rotation,
  phase: PrototypePhase,
  role: Role
): PrototypePhase | null {
  switch (phase) {
    case 'SERVE':
      return 'DEFENSE'
    case 'RECEIVE':
      return roleUsesFirstAttack(state, rotation, role) ? 'FIRST_ATTACK' : 'OFFENSE'
    case 'FIRST_ATTACK':
      return 'DEFENSE'
    case 'OFFENSE':
      return 'DEFENSE'
    case 'DEFENSE':
      return 'OFFENSE'
    default:
      return null
  }
}

export function getPrototypePrimaryArrows(
  state: PrototypeCourtStateData,
  resolver: PrototypeCourtStateResolver,
  rotation: Rotation,
  phase: PrototypePhase
): ArrowPositions {
  const sourcePositions = getPrototypePositions(state, resolver, rotation, phase)
  const arrows: ArrowPositions = {}

  for (const role of ROLES) {
    const targetPhase = getPrimaryTargetPhaseForRole(state, rotation, phase, role)
    if (!targetPhase) continue

    const targetPosition = getPrototypePositions(state, resolver, rotation, targetPhase)[role]
    if (hasMeaningfulMovement(sourcePositions[role], targetPosition)) {
      arrows[role] = clonePosition(targetPosition)
    }
  }

  return arrows
}

export function getPrototypeSecondaryArrows(
  state: PrototypeCourtStateData,
  resolver: PrototypeCourtStateResolver,
  rotation: Rotation,
  phase: PrototypePhase
): ArrowPositions {
  if (phase !== 'RECEIVE') {
    return {}
  }

  const arrows: ArrowPositions = {}

  for (const role of ROLES) {
    if (!roleUsesFirstAttack(state, rotation, role)) continue

    const firstAttackPosition = getPrototypePositions(state, resolver, rotation, 'FIRST_ATTACK')[role]
    const offensePosition = getPrototypePositions(state, resolver, rotation, 'OFFENSE')[role]

    if (hasMeaningfulMovement(firstAttackPosition, offensePosition)) {
      arrows[role] = clonePosition(offensePosition)
    }
  }

  return arrows
}

export function getPrototypeArrowEndpointLabels(
  state: PrototypeCourtStateData,
  resolver: PrototypeCourtStateResolver,
  rotation: Rotation,
  phase: PrototypePhase
): Partial<Record<Role, string>> {
  const labels: Partial<Record<Role, string>> = {}
  const arrows = getPrototypePrimaryArrows(state, resolver, rotation, phase)

  for (const role of Object.keys(arrows) as Role[]) {
    const targetPhase = getPrimaryTargetPhaseForRole(state, rotation, phase, role)
    if (!targetPhase) continue

    labels[role] = targetPhase === 'FIRST_ATTACK'
      ? '1st Attack'
      : formatPrototypePhaseLabel(targetPhase)
  }

  return labels
}

export function getPrototypeSecondaryArrowEndpointLabels(
  state: PrototypeCourtStateData,
  resolver: PrototypeCourtStateResolver,
  rotation: Rotation,
  phase: PrototypePhase
): Partial<Record<Role, string>> {
  if (phase !== 'RECEIVE') {
    return {}
  }

  const labels: Partial<Record<Role, string>> = {}
  const arrows = getPrototypeSecondaryArrows(state, resolver, rotation, phase)

  for (const role of Object.keys(arrows) as Role[]) {
    labels[role] = 'Attack'
  }

  return labels
}

export function getPrototypePrimaryArrowCurves(
  state: PrototypeCourtStateData,
  rotation: Rotation,
  phase: PrototypePhase
): Partial<Record<Role, ArrowCurveConfig>> {
  return state.primaryArrowCurvesByPhase[getPhaseKey(rotation, phase)] ?? {}
}

export function getPrototypeSecondaryArrowCurves(
  state: PrototypeCourtStateData,
  rotation: Rotation,
  phase: PrototypePhase
): Partial<Record<Role, ArrowCurveConfig>> {
  if (phase !== 'RECEIVE') {
    return {}
  }

  return state.secondaryArrowCurvesByRotation[rotation] ?? {}
}

export function updatePrototypePosition(
  state: PrototypeCourtStateData,
  resolver: PrototypeCourtStateResolver,
  rotation: Rotation,
  phase: PrototypePhase,
  role: Role,
  position: Position
): PrototypeCourtStateData {
  return setResolvedPhasePosition(state, resolver, rotation, phase, role, position)
}

export function updatePrototypeArrowTarget(
  state: PrototypeCourtStateData,
  resolver: PrototypeCourtStateResolver,
  rotation: Rotation,
  phase: PrototypePhase,
  role: Role,
  position: Position | null
): PrototypeCourtStateData {
  const sourcePosition = getPrototypePositions(state, resolver, rotation, phase)[role]
  if (!sourcePosition) {
    return state
  }

  if (phase === 'RECEIVE' && roleUsesFirstAttack(state, rotation, role)) {
    if (!position) {
      let nextState = setResolvedPhasePosition(state, resolver, rotation, 'FIRST_ATTACK', role, sourcePosition)
      nextState = setResolvedPhasePosition(nextState, resolver, rotation, 'OFFENSE', role, sourcePosition)
      nextState = setReceiveFirstAttackEnabled(nextState, rotation, role, false)
      return nextState
    }

    return setResolvedPhasePosition(state, resolver, rotation, 'FIRST_ATTACK', role, position)
  }

  const targetPhase = getPrimaryTargetPhaseForRole(state, rotation, phase, role)
  if (!targetPhase) {
    return state
  }

  return setResolvedPhasePosition(
    state,
    resolver,
    rotation,
    targetPhase,
    role,
    position ?? sourcePosition
  )
}

export function updatePrototypeSecondaryArrowTarget(
  state: PrototypeCourtStateData,
  resolver: PrototypeCourtStateResolver,
  rotation: Rotation,
  role: Role,
  position: Position | null
): PrototypeCourtStateData {
  const currentlySpecial = roleUsesFirstAttack(state, rotation, role)
  const offensePosition = getPrototypePositions(state, resolver, rotation, 'OFFENSE')[role]
  const firstAttackPosition = currentlySpecial
    ? getPrototypePositions(state, resolver, rotation, 'FIRST_ATTACK')[role]
    : offensePosition

  if (!firstAttackPosition) {
    return state
  }

  if (!position || !hasMeaningfulMovement(firstAttackPosition, position)) {
    let nextState = setResolvedPhasePosition(state, resolver, rotation, 'FIRST_ATTACK', role, firstAttackPosition)
    nextState = setResolvedPhasePosition(nextState, resolver, rotation, 'OFFENSE', role, firstAttackPosition)
    nextState = setReceiveFirstAttackEnabled(nextState, rotation, role, false)
    return nextState
  }

  let nextState = setReceiveFirstAttackEnabled(state, rotation, role, true)
  nextState = setResolvedPhasePosition(nextState, resolver, rotation, 'FIRST_ATTACK', role, firstAttackPosition)
  nextState = setResolvedPhasePosition(nextState, resolver, rotation, 'OFFENSE', role, position)
  return nextState
}

export function createPrototypeSecondaryArrowTarget(
  state: PrototypeCourtStateData,
  resolver: PrototypeCourtStateResolver,
  rotation: Rotation,
  role: Role
): PrototypeCourtStateData {
  if (roleUsesFirstAttack(state, rotation, role)) {
    return state
  }

  const existingPrimaryTarget =
    getPrototypePrimaryArrows(state, resolver, rotation, 'RECEIVE')[role] ??
    getPrototypePositions(state, resolver, rotation, 'OFFENSE')[role]

  if (!existingPrimaryTarget) {
    return state
  }

  const nextAttackTarget = {
    x: Math.max(0.08, Math.min(0.92, existingPrimaryTarget.x + (existingPrimaryTarget.x > 0.5 ? -0.08 : 0.08))),
    y: Math.max(0.08, Math.min(0.92, existingPrimaryTarget.y - 0.06)),
  }

  return updatePrototypeSecondaryArrowTarget(
    state,
    resolver,
    rotation,
    role,
    nextAttackTarget
  )
}

export function setPrototypePrimaryArrowCurve(
  state: PrototypeCourtStateData,
  rotation: Rotation,
  phase: PrototypePhase,
  role: Role,
  curve: ArrowCurveConfig | null
): PrototypeCourtStateData {
  const key = getPhaseKey(rotation, phase)
  const nextCurves = updateRoleMap(
    state.primaryArrowCurvesByPhase,
    key,
    role,
    curve ? { ...curve } : null
  ) as CurveState

  if (nextCurves === state.primaryArrowCurvesByPhase) {
    return state
  }

  return {
    ...state,
    primaryArrowCurvesByPhase: nextCurves,
  }
}

export function setPrototypeSecondaryArrowCurve(
  state: PrototypeCourtStateData,
  rotation: Rotation,
  role: Role,
  curve: ArrowCurveConfig | null
): PrototypeCourtStateData {
  const nextCurves = updateRoleMap(
    state.secondaryArrowCurvesByRotation,
    rotation,
    role,
    curve ? { ...curve } : null
  ) as SecondaryCurveState

  if (nextCurves === state.secondaryArrowCurvesByRotation) {
    return state
  }

  return {
    ...state,
    secondaryArrowCurvesByRotation: nextCurves,
  }
}

export function resetPrototypePhase(
  state: PrototypeCourtStateData,
  rotation: Rotation,
  phase: PrototypePhase
): PrototypeCourtStateData {
  let nextState = clearPhasePositions(state, rotation, phase)
  nextState = clearPhaseCurves(nextState, rotation, phase)

  if (phase === 'RECEIVE') {
    if (rotation in nextState.receiveBranchRolesByRotation) {
      const nextBranches = { ...nextState.receiveBranchRolesByRotation }
      delete nextBranches[rotation]
      nextState = {
        ...nextState,
        receiveBranchRolesByRotation: nextBranches,
      }
    }

    if (rotation in nextState.secondaryArrowCurvesByRotation) {
      const nextSecondaryCurves = { ...nextState.secondaryArrowCurvesByRotation }
      delete nextSecondaryCurves[rotation]
      nextState = {
        ...nextState,
        secondaryArrowCurvesByRotation: nextSecondaryCurves,
      }
    }

    nextState = clearPhasePositions(nextState, rotation, 'FIRST_ATTACK')
    nextState = clearPhaseCurves(nextState, rotation, 'FIRST_ATTACK')
  }

  return nextState
}

export function loadPrototypeSeedState(rotations: Rotation[]): PrototypeCourtStateData {
  const nextState: PrototypeCourtStateData = {
    positionOverridesByPhase: {},
    primaryArrowCurvesByPhase: {},
    receiveBranchRolesByRotation: {},
    secondaryArrowCurvesByRotation: {},
  }

  for (const rotation of rotations) {
    const seed = getPrototypeSeed(rotation)
    if (!seed) {
      continue
    }

    for (const [phase, phaseSeed] of Object.entries(seed.phases) as Array<
      [PrototypePhase, { positions: RolePositionMap; curves?: RoleCurveMap }]
    >) {
      nextState.positionOverridesByPhase[getPhaseKey(rotation, phase)] = cloneRolePositionMap(phaseSeed.positions)

      if (phaseSeed.curves) {
        nextState.primaryArrowCurvesByPhase[getPhaseKey(rotation, phase)] = { ...phaseSeed.curves }
      }
    }

    const receivePositions = nextState.positionOverridesByPhase[getPhaseKey(rotation, 'RECEIVE')] ?? {}
    const firstAttackPositions = nextState.positionOverridesByPhase[getPhaseKey(rotation, 'FIRST_ATTACK')] ?? {}
    const offensePositions = nextState.positionOverridesByPhase[getPhaseKey(rotation, 'OFFENSE')] ?? {}

    for (const role of ROLES) {
      if (
        hasMeaningfulMovement(receivePositions[role], firstAttackPositions[role]) &&
        hasMeaningfulMovement(firstAttackPositions[role], offensePositions[role])
      ) {
        nextState.receiveBranchRolesByRotation = updateRoleMap(
          nextState.receiveBranchRolesByRotation,
          rotation,
          role,
          true
        ) as ReceiveBranchState
      }
    }
  }

  return nextState
}

export function describeSharedIncomingPhases(phase: PrototypePhase) {
  if (!isSharedArrivalPhase(phase)) {
    return []
  }

  return getPrototypeIncomingPhases(phase)
}
