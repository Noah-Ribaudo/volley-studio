// Animation utilities: easing functions, vector helpers, and simple collision avoidance
import { Position, Role, ROLE_PRIORITY } from './types'

export const DEFAULT_ANIMATION_CONFIG = {
  DURATION_MS: 1500,
  EASING_CSS: 'cubic-bezier(0.4, 0, 0.2, 1)',
  COLLISION_RADIUS: 0.12, // Normalized (was 12 in percentage)
  SEPARATION_STRENGTH: 6,
  MAX_SEPARATION: 3,
} as const

// Easing functions (t in [0,1])
export const easeInOutCubic = (t: number) => (t < 0.5
  ? 4 * t * t * t
  : 1 - Math.pow(-2 * t + 2, 3) / 2)

export const easeInOutQuad = (t: number) => (t < 0.5
  ? 2 * t * t
  : 1 - Math.pow(-2 * t + 2, 2) / 2)

// Basic vector helpers
export const vecSub = (a: Position, b: Position): Position => ({ x: a.x - b.x, y: a.y - b.y })
export const vecAdd = (a: Position, b: Position): Position => ({ x: a.x + b.x, y: a.y + b.y })
export const vecScale = (v: Position, s: number): Position => ({ x: v.x * s, y: v.y * s })
export const vecLengthSq = (v: Position) => v.x * v.x + v.y * v.y
export const vecNormalize = (v: Position): Position => {
  const lenSq = vecLengthSq(v)
  if (lenSq === 0) return { x: 0, y: 0 }
  const inv = 1 / Math.sqrt(lenSq)
  return { x: v.x * inv, y: v.y * inv }
}

export interface CollisionAvoidanceParams {
  collisionRadius: number // normalized units (0-1 space)
  separationStrength: number
  maxSeparation?: number
}

interface Agent {
  role: Role
  position: Position
  target: Position
}

// Compute steering force for a single agent using seek + separation with priority
export function computeSteering(
  agent: Agent,
  others: Agent[],
  params: CollisionAvoidanceParams
): Position {
  const { collisionRadius, separationStrength, maxSeparation = 5 } = params
  const seekDir = vecSub(agent.target, agent.position)
  const seek = vecNormalize(seekDir)

  let separation: Position = { x: 0, y: 0 }
  const radiusSq = collisionRadius * collisionRadius

  others.forEach(other => {
    if (other.role === agent.role) return
    const toOther = vecSub(agent.position, other.position)
    const distSq = vecLengthSq(toOther)
    if (distSq === 0 || distSq > radiusSq) return

    const prioritySelf = ROLE_PRIORITY[agent.role] ?? 99
    const priorityOther = ROLE_PRIORITY[other.role] ?? 99

    // Weight based on priority: yield more if lower priority
    let weight = separationStrength
    if (prioritySelf > priorityOther) weight *= 0.35 // yield
    else if (prioritySelf === priorityOther) weight *= 0.65
    else weight *= 1.0 // higher priority pushes stronger

    const dist = Math.sqrt(distSq)
    const push = vecScale(vecNormalize(toOther), Math.min(maxSeparation, weight / Math.max(dist, 0.001)))
    separation = vecAdd(separation, push)
  })

  // Blend seek + separation
  const blended = vecAdd(seek, separation)
  return vecNormalize(blended)
}

// Interpolate between two positions with easing
export function interpolatePosition(
  from: Position,
  to: Position,
  t: number,
  easing: (t: number) => number = easeInOutCubic
): Position {
  const e = easing(Math.max(0, Math.min(1, t)))
  return {
    x: from.x + (to.x - from.x) * e,
    y: from.y + (to.y - from.y) * e
  }
}

// Clamp position to court bounds (0-1 normalized coordinates)
export function clampPosition(pos: Position): Position {
  return {
    x: Math.max(0, Math.min(1, pos.x)),
    y: Math.max(0, Math.min(1, pos.y))
  }
}





