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
export type PrimaryStayPutState = Partial<Record<string, Partial<Record<Role, true>>>>
export type SecondaryStayPutState = Partial<Record<Rotation, Partial<Record<Role, true>>>>

export interface PrototypeCourtStateData {
  positionOverridesByPhase: PositionOverrideState
  primaryArrowCurvesByPhase: CurveState
  receiveBranchRolesByRotation: ReceiveBranchState
  secondaryArrowCurvesByRotation: SecondaryCurveState
  primaryStayPutByPhase: PrimaryStayPutState
  secondaryStayPutByRotation: SecondaryStayPutState
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
  primaryStayPutByPhase: {},
  secondaryStayPutByRotation: {},
}

export const PROTOTYPE_ARROW_DEADZONE = 0.12

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
  return !isWithinPrototypeArrowDeadzone(start, end)
}

export function isWithinPrototypeArrowDeadzone(start?: Position | null, end?: Position | null) {
  if (!start || !end) return false
  return Math.hypot(end.x - start.x, end.y - start.y) < PROTOTYPE_ARROW_DEADZONE
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

function clearPhasePrimaryStayPut(
  state: PrototypeCourtStateData,
  rotation: Rotation,
  phase: PrototypePhase
): PrototypeCourtStateData {
  const key = getPhaseKey(rotation, phase)
  if (!(key in state.primaryStayPutByPhase)) {
    return state
  }

  const nextStayPut = { ...state.primaryStayPutByPhase }
  delete nextStayPut[key]

  return {
    ...state,
    primaryStayPutByPhase: nextStayPut,
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

function setPrimaryStayPutEnabled(
  state: PrototypeCourtStateData,
  rotation: Rotation,
  phase: PrototypePhase,
  role: Role,
  enabled: boolean
): PrototypeCourtStateData {
  const key = getPhaseKey(rotation, phase)
  const nextStayPut = updateRoleMap(
    state.primaryStayPutByPhase,
    key,
    role,
    enabled ? true : null
  ) as PrimaryStayPutState

  if (nextStayPut === state.primaryStayPutByPhase) {
    return state
  }

  return {
    ...state,
    primaryStayPutByPhase: nextStayPut,
  }
}

function setSecondaryStayPutEnabled(
  state: PrototypeCourtStateData,
  rotation: Rotation,
  role: Role,
  enabled: boolean
): PrototypeCourtStateData {
  const nextStayPut = updateRoleMap(
    state.secondaryStayPutByRotation,
    rotation,
    role,
    enabled ? true : null
  ) as SecondaryStayPutState

  if (nextStayPut === state.secondaryStayPutByRotation) {
    return state
  }

  return {
    ...state,
    secondaryStayPutByRotation: nextStayPut,
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

function roleUsesPrimaryStayPut(
  state: PrototypeCourtStateData,
  rotation: Rotation,
  phase: PrototypePhase,
  role: Role
) {
  return Boolean(state.primaryStayPutByPhase[getPhaseKey(rotation, phase)]?.[role])
}

function roleUsesSecondaryStayPut(
  state: PrototypeCourtStateData,
  rotation: Rotation,
  role: Role
) {
  return Boolean(state.secondaryStayPutByRotation[rotation]?.[role])
}

type StayPutLink = {
  kind: 'primary' | 'secondary'
  sourcePhase: PrototypePhase
  targetPhase: PrototypePhase
}

function getActiveOutgoingStayPutLinks(
  state: PrototypeCourtStateData,
  rotation: Rotation,
  phase: PrototypePhase,
  role: Role
): StayPutLink[] {
  const links: StayPutLink[] = []

  if (roleUsesPrimaryStayPut(state, rotation, phase, role)) {
    const targetPhase = getPrimaryTargetPhaseForRole(state, rotation, phase, role)
    if (targetPhase) {
      links.push({
        kind: 'primary',
        sourcePhase: phase,
        targetPhase,
      })
    }
  }

  if (phase === 'FIRST_ATTACK' && roleUsesSecondaryStayPut(state, rotation, role)) {
    links.push({
      kind: 'secondary',
      sourcePhase: 'FIRST_ATTACK',
      targetPhase: 'OFFENSE',
    })
  }

  return links
}

function getActiveIncomingStayPutLinks(
  state: PrototypeCourtStateData,
  rotation: Rotation,
  phase: PrototypePhase,
  role: Role
): StayPutLink[] {
  const links: StayPutLink[] = []

  for (const sourcePhase of getPrototypeIncomingPhases(phase)) {
    if (!roleUsesPrimaryStayPut(state, rotation, sourcePhase, role)) {
      continue
    }

    if (getPrimaryTargetPhaseForRole(state, rotation, sourcePhase, role) !== phase) {
      continue
    }

    links.push({
      kind: 'primary',
      sourcePhase,
      targetPhase: phase,
    })
  }

  if (phase === 'OFFENSE' && roleUsesSecondaryStayPut(state, rotation, role)) {
    links.push({
      kind: 'secondary',
      sourcePhase: 'FIRST_ATTACK',
      targetPhase: 'OFFENSE',
    })
  }

  return links
}

function clearStayPutLink(
  state: PrototypeCourtStateData,
  rotation: Rotation,
  link: StayPutLink,
  role: Role
): PrototypeCourtStateData {
  if (link.kind === 'secondary') {
    return setSecondaryStayPutEnabled(state, rotation, role, false)
  }

  return setPrimaryStayPutEnabled(state, rotation, link.sourcePhase, role, false)
}

function pruneIncomingStayPutLinksForRole(
  state: PrototypeCourtStateData,
  resolver: PrototypeCourtStateResolver,
  rotation: Rotation,
  phase: PrototypePhase,
  role: Role
): PrototypeCourtStateData {
  const targetPosition = getPrototypePositions(state, resolver, rotation, phase)[role]
  if (!targetPosition) {
    return state
  }

  let nextState = state

  for (const link of getActiveIncomingStayPutLinks(nextState, rotation, phase, role)) {
    const sourcePosition = getPrototypePositions(nextState, resolver, rotation, link.sourcePhase)[role]
    if (positionsEqual(sourcePosition, targetPosition)) {
      continue
    }

    nextState = clearStayPutLink(nextState, rotation, link, role)
  }

  return nextState
}

function syncStayPutLinksForRole(
  state: PrototypeCourtStateData,
  resolver: PrototypeCourtStateResolver,
  rotation: Rotation,
  phases: PrototypePhase[],
  role: Role
): PrototypeCourtStateData {
  const queue = [...new Set(phases)]
  let nextState = state
  let steps = 0

  while (queue.length > 0 && steps < 24) {
    const phase = queue.shift()
    if (!phase) {
      break
    }

    nextState = pruneIncomingStayPutLinksForRole(nextState, resolver, rotation, phase, role)
    const sourcePosition = getPrototypePositions(nextState, resolver, rotation, phase)[role]
    if (!sourcePosition) {
      steps += 1
      continue
    }

    for (const link of getActiveOutgoingStayPutLinks(nextState, rotation, phase, role)) {
      const targetPosition = getPrototypePositions(nextState, resolver, rotation, link.targetPhase)[role]
      if (positionsEqual(targetPosition, sourcePosition)) {
        continue
      }

      nextState = setResolvedPhasePosition(
        nextState,
        resolver,
        rotation,
        link.targetPhase,
        role,
        sourcePosition
      )
      queue.push(link.targetPhase)
    }

    steps += 1
  }

  return nextState
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
    if (roleUsesPrimaryStayPut(state, rotation, phase, role)) {
      continue
    }

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
    if (roleUsesSecondaryStayPut(state, rotation, role)) continue
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
  const nextState = setResolvedPhasePosition(state, resolver, rotation, phase, role, position)
  return syncStayPutLinksForRole(nextState, resolver, rotation, [phase], role)
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

  const targetPhase = getPrimaryTargetPhaseForRole(state, rotation, phase, role)
  if (!targetPhase) {
    return state
  }

  const shouldStayPut = !position || isWithinPrototypeArrowDeadzone(sourcePosition, position)
  let nextState = setResolvedPhasePosition(
    state,
    resolver,
    rotation,
    targetPhase,
    role,
    shouldStayPut ? sourcePosition : position
  )
  nextState = setPrimaryStayPutEnabled(nextState, rotation, phase, role, shouldStayPut)

  if (shouldStayPut) {
    nextState = setPrototypePrimaryArrowCurve(nextState, rotation, phase, role, null)
  }

  return syncStayPutLinksForRole(nextState, resolver, rotation, [targetPhase], role)
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

  const shouldStayPut = !position || isWithinPrototypeArrowDeadzone(firstAttackPosition, position)

  if (shouldStayPut) {
    let nextState = setResolvedPhasePosition(state, resolver, rotation, 'FIRST_ATTACK', role, firstAttackPosition)
    nextState = setResolvedPhasePosition(nextState, resolver, rotation, 'OFFENSE', role, firstAttackPosition)
    nextState = setReceiveFirstAttackEnabled(nextState, rotation, role, false)
    nextState = setSecondaryStayPutEnabled(nextState, rotation, role, true)
    nextState = setPrototypeSecondaryArrowCurve(nextState, rotation, role, null)
    return syncStayPutLinksForRole(nextState, resolver, rotation, ['FIRST_ATTACK', 'OFFENSE'], role)
  }

  let nextState = setReceiveFirstAttackEnabled(state, rotation, role, true)
  nextState = setResolvedPhasePosition(nextState, resolver, rotation, 'FIRST_ATTACK', role, firstAttackPosition)
  nextState = setResolvedPhasePosition(nextState, resolver, rotation, 'OFFENSE', role, position)
  nextState = setSecondaryStayPutEnabled(nextState, rotation, role, false)
  return syncStayPutLinksForRole(nextState, resolver, rotation, ['FIRST_ATTACK', 'OFFENSE'], role)
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
    x: Math.max(0.08, Math.min(0.92, existingPrimaryTarget.x + (existingPrimaryTarget.x > 0.5 ? -0.1 : 0.1))),
    y: Math.max(0.08, Math.min(0.92, existingPrimaryTarget.y - 0.08)),
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
  nextState = clearPhasePrimaryStayPut(nextState, rotation, phase)

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

    if (rotation in nextState.secondaryStayPutByRotation) {
      const nextSecondaryStayPut = { ...nextState.secondaryStayPutByRotation }
      delete nextSecondaryStayPut[rotation]
      nextState = {
        ...nextState,
        secondaryStayPutByRotation: nextSecondaryStayPut,
      }
    }

    nextState = clearPhasePositions(nextState, rotation, 'FIRST_ATTACK')
    nextState = clearPhaseCurves(nextState, rotation, 'FIRST_ATTACK')
    nextState = clearPhasePrimaryStayPut(nextState, rotation, 'FIRST_ATTACK')
  }

  return nextState
}

export function loadPrototypeSeedState(rotations: Rotation[]): PrototypeCourtStateData {
  const nextState: PrototypeCourtStateData = {
    positionOverridesByPhase: {},
    primaryArrowCurvesByPhase: {},
    receiveBranchRolesByRotation: {},
    secondaryArrowCurvesByRotation: {},
    primaryStayPutByPhase: {},
    secondaryStayPutByRotation: {},
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

    const servePositions = nextState.positionOverridesByPhase[getPhaseKey(rotation, 'SERVE')] ?? {}
    const defensePositions = nextState.positionOverridesByPhase[getPhaseKey(rotation, 'DEFENSE')] ?? {}

    for (const role of ROLES) {
      const hasReceiveMovement = hasMeaningfulMovement(receivePositions[role], firstAttackPositions[role])
      const hasSettledAttackMovement = hasMeaningfulMovement(firstAttackPositions[role], offensePositions[role])

      if (hasReceiveMovement && hasSettledAttackMovement) {
        nextState.receiveBranchRolesByRotation = updateRoleMap(
          nextState.receiveBranchRolesByRotation,
          rotation,
          role,
          true
        ) as ReceiveBranchState
      }

      if (hasReceiveMovement && !hasSettledAttackMovement) {
        nextState.secondaryStayPutByRotation = updateRoleMap(
          nextState.secondaryStayPutByRotation,
          rotation,
          role,
          true
        ) as SecondaryStayPutState
      }
    }

    for (const role of ROLES) {
      const phasePositions: Record<PrototypePhase, Position | undefined> = {
        SERVE: servePositions[role],
        RECEIVE: receivePositions[role],
        FIRST_ATTACK: firstAttackPositions[role],
        OFFENSE: offensePositions[role],
        DEFENSE: defensePositions[role],
      }

      for (const phase of ['SERVE', 'RECEIVE', 'FIRST_ATTACK', 'OFFENSE', 'DEFENSE'] as PrototypePhase[]) {
        const sourcePosition = phasePositions[phase]
        const targetPhase = getPrimaryTargetPhaseForRole(nextState, rotation, phase, role)
        const targetPosition = targetPhase ? phasePositions[targetPhase] : undefined

        if (!sourcePosition || !targetPosition || hasMeaningfulMovement(sourcePosition, targetPosition)) {
          continue
        }

        nextState.primaryStayPutByPhase = updateRoleMap(
          nextState.primaryStayPutByPhase,
          getPhaseKey(rotation, phase),
          role,
          true
        ) as PrimaryStayPutState
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
