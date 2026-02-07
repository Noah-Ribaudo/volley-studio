import type { Position, Role } from '@/lib/types'
import { ROLE_PRIORITY } from '@/lib/types'
import { sanitizeMotionTuning } from './config'
import {
  buildMotionPath,
  clamp,
  clamp01,
  pointAtDistance,
  vecAdd,
  vecCross,
  vecDot,
  vecLength,
  vecNormalize,
  vecScale,
  vecSub,
} from './path'
import type {
  AgentSnapshot,
  LockedPathDefinition,
  MotionPathData,
  WhiteboardMotionTuning,
  WhiteboardPlaySnapshot,
} from './types'

interface EngineParams {
  activeRoles: Role[]
  initialPositions: Partial<Record<Role, Position>>
  lockedPaths: LockedPathDefinition[]
  tuning: WhiteboardMotionTuning
}

interface AgentState {
  role: Role
  path: MotionPathData
  distance: number
  speed: number
  targetSpeed: number
  lateralOffset: number
  lateralVelocity: number
  done: boolean
}

export interface WhiteboardPlayEngine {
  step: (dt: number) => WhiteboardPlaySnapshot
  getSnapshot: () => WhiteboardPlaySnapshot
  isDone: () => boolean
}

export function createWhiteboardPlayEngine(params: EngineParams): WhiteboardPlayEngine {
  const tuning = sanitizeMotionTuning(params.tuning)
  const positions: Partial<Record<Role, Position>> = { ...params.initialPositions }
  const anchorPositions: Partial<Record<Role, Position>> = { ...params.initialPositions }

  const roleOrder = [...params.activeRoles].sort((a, b) => {
    const pa = ROLE_PRIORITY[a] ?? 99
    const pb = ROLE_PRIORITY[b] ?? 99
    if (pa !== pb) return pa - pb
    return a.localeCompare(b)
  })
  const roleOrderIndex = new Map<Role, number>(roleOrder.map((role, index) => [role, index]))

  const agentsByRole = new Map<Role, AgentState>()
  params.lockedPaths.forEach((lockedPath) => {
    const path = buildMotionPath(lockedPath)
    if (path.length <= 1e-6) return

    agentsByRole.set(path.role, {
      role: path.role,
      path,
      distance: 0,
      speed: 0,
      targetSpeed: tuning.cruiseSpeed,
      lateralOffset: 0,
      lateralVelocity: 0,
      done: false,
    })
    positions[path.role] = { ...path.start }
  })

  let elapsed = 0

  const shouldYieldTo = (selfRole: Role, otherRole: Role): boolean => {
    if (selfRole === otherRole) return false
    const selfPriority = ROLE_PRIORITY[selfRole] ?? 99
    const otherPriority = ROLE_PRIORITY[otherRole] ?? 99
    if (otherPriority < selfPriority) return true
    if (otherPriority > selfPriority) return false
    return (roleOrderIndex.get(otherRole) ?? 99) < (roleOrderIndex.get(selfRole) ?? 99)
  }

  const clampPositionWithMargin = (pos: Position): Position => ({
    x: clamp(pos.x, -tuning.clampMargin, 1 + tuning.clampMargin),
    y: clamp(pos.y, -tuning.clampMargin, 1 + tuning.clampMargin),
  })

  const maxOffset = tuning.tokenRadius * tuning.maxLateralOffsetRadii
  const hardDistance = tuning.tokenRadius * (2 + tuning.minSpacingRadii)
  const softDistance = Math.max(hardDistance * 1.2, hardDistance * 2.2)

  const predictRolePosition = (
    role: Role,
    lookAheadSeconds: number,
    workingPositions: Partial<Record<Role, Position>>
  ): Position | null => {
    const agent = agentsByRole.get(role)
    if (!agent) return workingPositions[role] ?? null
    if (agent.done) return workingPositions[role] ?? null

    const futureDistance = Math.min(
      agent.path.length,
      agent.distance + Math.max(agent.speed, tuning.cruiseSpeed * 0.25) * lookAheadSeconds
    )
    const futurePoint = pointAtDistance(agent.path, futureDistance)
    const futurePos = vecAdd(futurePoint.position, vecScale(futurePoint.normal, agent.lateralOffset))
    return clampPositionWithMargin(futurePos)
  }

  const buildSnapshot = (): WhiteboardPlaySnapshot => {
    const agents: Partial<Record<Role, AgentSnapshot>> = {}
    agentsByRole.forEach((agent, role) => {
      const progress = agent.path.length > 0 ? agent.distance / agent.path.length : 1
      agents[role] = {
        role,
        distance: agent.distance,
        length: agent.path.length,
        progress: clamp01(progress),
        currentSpeed: agent.speed,
        targetSpeed: agent.targetSpeed,
        done: agent.done,
        lateralOffset: agent.lateralOffset,
      }
    })

    return {
      positions: { ...positions },
      agents,
      done: isDone(),
      elapsed,
    }
  }

  const isDone = () => {
    if (agentsByRole.size === 0) return true
    for (const agent of agentsByRole.values()) {
      if (!agent.done) return false
    }

    const settleEpsilon = 1e-3
    for (const role of roleOrder) {
      const pos = positions[role]
      if (!pos) continue

      const agent = agentsByRole.get(role)
      const anchor = agent ? agent.path.end : anchorPositions[role]
      if (!anchor) continue

      const dx = pos.x - anchor.x
      const dy = pos.y - anchor.y
      if (dx * dx + dy * dy > settleEpsilon * settleEpsilon) {
        return false
      }
    }

    for (let i = 0; i < roleOrder.length; i += 1) {
      const a = positions[roleOrder[i]]
      if (!a) continue
      for (let j = i + 1; j < roleOrder.length; j += 1) {
        const b = positions[roleOrder[j]]
        if (!b) continue
        const dx = a.x - b.x
        const dy = a.y - b.y
        const distSq = dx * dx + dy * dy
        const minSq = (hardDistance - 1e-4) * (hardDistance - 1e-4)
        if (distSq < minSq) return false
      }
    }
    return true
  }

  const step = (dtRaw: number): WhiteboardPlaySnapshot => {
    if (isDone()) return buildSnapshot()

    const dt = clamp(dtRaw, 1 / 1000, 0.2)
    elapsed += dt

    const workingPositions: Partial<Record<Role, Position>> = { ...positions }
    const applyHardSeparation = (iterations: number) => {
      for (let iteration = 0; iteration < iterations; iteration += 1) {
        for (let i = 0; i < roleOrder.length; i += 1) {
          const roleA = roleOrder[i]

          for (let j = i + 1; j < roleOrder.length; j += 1) {
            const roleB = roleOrder[j]
            const posA = workingPositions[roleA]
            const posB = workingPositions[roleB]
            if (!posA || !posB) continue

            const delta = vecSub(posA, posB)
            const dist = vecLength(delta)
            if (dist >= hardDistance) continue

            const overlap = hardDistance - Math.max(dist, 1e-5)
            const direction = dist > 1e-5 ? vecScale(delta, 1 / dist) : { x: 1, y: 0 }

            let moveA = 0.5
            let moveB = 0.5
            const aYieldsToB = shouldYieldTo(roleA, roleB)
            const bYieldsToA = shouldYieldTo(roleB, roleA)
            if (aYieldsToB && !bYieldsToA) {
              moveA = 1
              moveB = 0
            } else if (bYieldsToA && !aYieldsToB) {
              moveA = 0
              moveB = 1
            }

            if (moveA > 0) {
              const nextA = clampPositionWithMargin(
                vecAdd(posA, vecScale(direction, overlap * moveA))
              )
              workingPositions[roleA] = nextA
            }
            if (moveB > 0) {
              const nextB = clampPositionWithMargin(
                vecSub(posB, vecScale(direction, overlap * moveB))
              )
              workingPositions[roleB] = nextB
            }
          }
        }
      }
    }

    roleOrder.forEach((role) => {
      const agent = agentsByRole.get(role)
      if (!agent) return
      if (agent.done) {
        workingPositions[role] = clampPositionWithMargin(workingPositions[role] ?? agent.path.end)
        return
      }

      const currentPoint = pointAtDistance(agent.path, agent.distance)
      const remaining = Math.max(0, agent.path.length - agent.distance)

      let targetSpeed = tuning.cruiseSpeed

      const selfLookAheadDistance = Math.min(
        agent.path.length,
        agent.distance + Math.max(agent.speed, tuning.cruiseSpeed * 0.35) * tuning.lookAheadTime
      )
      const lookAheadPoint = pointAtDistance(agent.path, selfLookAheadDistance)
      const maxCurvature = Math.max(currentPoint.curvature, lookAheadPoint.curvature)
      if (maxCurvature > 1e-6) {
        const cornerSpeedCap = Math.sqrt(Math.max(0.0001, tuning.maxLateralAccel) / maxCurvature)
        targetSpeed = Math.min(targetSpeed, cornerSpeedCap)
      }

      const stopSpeedCap = Math.sqrt(Math.max(0, 2 * tuning.braking * remaining))
      targetSpeed = Math.min(targetSpeed, stopSpeedCap)

      const slowdownWeight = 1 - tuning.avoidanceBlend
      const deflectWeight = tuning.avoidanceBlend
      let desiredLateral = 0

      roleOrder.forEach((otherRole) => {
        if (!shouldYieldTo(role, otherRole)) return
        const otherPos = workingPositions[otherRole]
        if (!otherPos) return

        const selfPos = workingPositions[role] ?? currentPoint.position
        const deltaNow = vecSub(selfPos, otherPos)
        const distNow = vecLength(deltaNow)
        if (distNow < softDistance) {
          const urgencyNow = clamp01((softDistance - Math.max(distNow, 1e-5)) / softDistance)
          const slowdownNow = urgencyNow * slowdownWeight
          const floorSpeed = tuning.cruiseSpeed * 0.1
          targetSpeed = Math.min(
            targetSpeed,
            Math.max(floorSpeed, tuning.cruiseSpeed * (1 - slowdownNow * 0.9))
          )

          const awayUnitNow = distNow > 1e-5 ? vecScale(deltaNow, 1 / distNow) : currentPoint.normal
          let normalProjection = vecDot(awayUnitNow, currentPoint.normal)
          if (Math.abs(normalProjection) < 0.05) {
            const side = Math.sign(vecCross(currentPoint.tangent, vecSub(otherPos, currentPoint.position))) || 1
            normalProjection = -side
          }
          desiredLateral += normalProjection * urgencyNow * deflectWeight
        }

        const selfFuturePoint = pointAtDistance(agent.path, selfLookAheadDistance)
        const otherFuturePos = predictRolePosition(otherRole, tuning.lookAheadTime, workingPositions)
        if (!otherFuturePos) return

        const futureDelta = vecSub(selfFuturePoint.position, otherFuturePos)
        const futureDist = vecLength(futureDelta)
        if (futureDist < softDistance) {
          const urgencyFuture = clamp01((softDistance - Math.max(futureDist, 1e-5)) / softDistance)
          const slowdownFuture = urgencyFuture * slowdownWeight
          const floorSpeed = tuning.cruiseSpeed * 0.08
          targetSpeed = Math.min(
            targetSpeed,
            Math.max(floorSpeed, tuning.cruiseSpeed * (1 - slowdownFuture))
          )

          const awayUnitFuture = futureDist > 1e-5 ? vecScale(futureDelta, 1 / futureDist) : selfFuturePoint.normal
          let normalProjectionFuture = vecDot(awayUnitFuture, selfFuturePoint.normal)
          if (Math.abs(normalProjectionFuture) < 0.05) {
            const side = Math.sign(vecCross(selfFuturePoint.tangent, vecSub(otherFuturePos, selfFuturePoint.position))) || 1
            normalProjectionFuture = -side
          }
          desiredLateral += normalProjectionFuture * urgencyFuture * deflectWeight * 1.15
        }
      })

      agent.targetSpeed = Math.max(0, targetSpeed)
      if (agent.targetSpeed >= agent.speed) {
        agent.speed = Math.min(agent.targetSpeed, agent.speed + tuning.acceleration * dt)
      } else {
        agent.speed = Math.max(agent.targetSpeed, agent.speed - tuning.braking * dt)
      }

      agent.distance = Math.min(agent.path.length, agent.distance + agent.speed * dt)
      if (agent.distance >= agent.path.length) {
        agent.done = true
        agent.speed = 0
        agent.targetSpeed = 0
      }

      const movedPoint = pointAtDistance(agent.path, agent.distance)
      const desiredOffset = clamp(
        desiredLateral * tuning.deflectionStrength * hardDistance,
        -maxOffset,
        maxOffset
      )

      agent.lateralVelocity += (desiredOffset - agent.lateralOffset) * tuning.deflectionSpring * dt
      agent.lateralVelocity *= Math.max(0, 1 - tuning.deflectionDamping * dt)
      agent.lateralOffset = clamp(
        agent.lateralOffset + agent.lateralVelocity * dt,
        -maxOffset,
        maxOffset
      )

      let finalPos = vecAdd(movedPoint.position, vecScale(movedPoint.normal, agent.lateralOffset))

      roleOrder.forEach((otherRole) => {
        if (!shouldYieldTo(role, otherRole)) return
        const otherPos = workingPositions[otherRole]
        if (!otherPos) return

        const separation = vecSub(finalPos, otherPos)
        const dist = vecLength(separation)
        if (dist >= hardDistance) return

        const pushDir = dist > 1e-5 ? vecScale(separation, 1 / dist) : movedPoint.normal
        finalPos = vecAdd(finalPos, vecScale(pushDir, hardDistance - dist))
      })

      finalPos = clampPositionWithMargin(finalPos)
      agent.lateralOffset = clamp(
        vecDot(vecSub(finalPos, movedPoint.position), movedPoint.normal),
        -maxOffset,
        maxOffset
      )
      workingPositions[role] = finalPos
    })

    // Hard-separation projection so tokens never end a frame overlapping.
    applyHardSeparation(2)

    // Restore displaced non-moving tokens and completed movers back toward anchors.
    const restoreGain = 1 - Math.exp(-Math.max(2, tuning.deflectionSpring * 0.6) * dt)
    roleOrder.forEach((role) => {
      const pos = workingPositions[role]
      if (!pos) return

      const agent = agentsByRole.get(role)
      let anchor: Position | null = null
      if (!agent) {
        anchor = anchorPositions[role] ?? null
      } else if (agent.done) {
        anchor = agent.path.end
      }
      if (!anchor) return

      workingPositions[role] = clampPositionWithMargin({
        x: pos.x + (anchor.x - pos.x) * restoreGain,
        y: pos.y + (anchor.y - pos.y) * restoreGain,
      })
    })

    // Re-apply one pass so restoration never reintroduces overlap.
    applyHardSeparation(1)

    // Keep offsets in sync with corrected positions.
    roleOrder.forEach((role) => {
      const agent = agentsByRole.get(role)
      const pos = workingPositions[role]
      if (!agent || !pos) return
      const basePoint = pointAtDistance(agent.path, agent.distance)
      agent.lateralOffset = clamp(
        vecDot(vecSub(pos, basePoint.position), basePoint.normal),
        -maxOffset,
        maxOffset
      )
    })

    Object.assign(positions, workingPositions)
    return buildSnapshot()
  }

  return {
    step,
    getSnapshot: () => buildSnapshot(),
    isDone,
  }
}
