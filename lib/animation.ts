// Animation utilities: vector helpers and collision avoidance
// Note: Easing and interpolation now handled by Motion (see motion-utils.ts)
import { Position, Role, ROLE_PRIORITY } from './types'

export const DEFAULT_ANIMATION_CONFIG = {
  COLLISION_RADIUS: 0.07, // Normalized (was 12 in percentage)
  SEPARATION_STRENGTH: 3.45,
  MAX_SEPARATION: 0.4,
} as const

// Basic vector helpers
export const vecSub = (a: Position, b: Position): Position => ({ x: a.x - b.x, y: a.y - b.y })
export const vecAdd = (a: Position, b: Position): Position => ({ x: a.x + b.x, y: a.y + b.y })
export const vecScale = (v: Position, s: number): Position => ({ x: v.x * s, y: v.y * s })
export const vecLengthSq = (v: Position) => v.x * v.x + v.y * v.y
export const vecLength = (v: Position) => Math.sqrt(vecLengthSq(v))
export const vecNormalize = (v: Position): Position => {
  const lenSq = vecLengthSq(v)
  if (lenSq === 0) return { x: 0, y: 0 }
  const inv = 1 / Math.sqrt(lenSq)
  return { x: v.x * inv, y: v.y * inv }
}

/**
 * Calculate where an agent will be in the future based on current trajectory
 * Improvement #1: Look-Ahead Collision Detection
 */
export function getLookAheadPosition(agent: Agent, lookAheadTime: number): Position {
  const direction = vecNormalize(vecSub(agent.target, agent.position))
  const speed = agent.speed ?? 0.8 // default cruising speed
  const lookAheadDist = speed * lookAheadTime
  return vecAdd(agent.position, vecScale(direction, lookAheadDist))
}

export interface CollisionAvoidanceParams {
  collisionRadius: number // normalized units (0-1 space)
  separationStrength: number
  maxSeparation?: number
  lookAheadTime?: number // seconds to look ahead for collisions (default: 0.4)
}

export interface Agent {
  role: Role
  position: Position
  target: Position
  speed?: number // current speed in court units per second
}

// Compute steering force for a single agent using seek + separation with priority
// Improvement #1: Now includes look-ahead collision detection
export function computeSteering(
  agent: Agent,
  others: Agent[],
  params: CollisionAvoidanceParams
): Position {
  const { collisionRadius, separationStrength, maxSeparation = 5, lookAheadTime = 0.4 } = params
  const seekDir = vecSub(agent.target, agent.position)
  const seek = vecNormalize(seekDir)

  let separation: Position = { x: 0, y: 0 }
  const radiusSq = collisionRadius * collisionRadius

  // Get future position for look-ahead collision detection
  const futurePos = getLookAheadPosition(agent, lookAheadTime)

  others.forEach(other => {
    if (other.role === agent.role) return

    // Check both current and future collisions
    const toOther = vecSub(agent.position, other.position)
    const distSq = vecLengthSq(toOther)

    // Look-ahead: also check if future position will collide
    const futureToOther = vecSub(futurePos, other.position)
    const futureDistSq = vecLengthSq(futureToOther)
    const lookAheadRadiusSq = (collisionRadius * 1.5) ** 2

    // React if currently colliding OR will collide soon
    const isCurrentCollision = distSq > 0 && distSq <= radiusSq
    const isFutureCollision = futureDistSq > 0 && futureDistSq <= lookAheadRadiusSq

    if (!isCurrentCollision && !isFutureCollision) return

    const prioritySelf = ROLE_PRIORITY[agent.role] ?? 99
    const priorityOther = ROLE_PRIORITY[other.role] ?? 99

    // Weight based on priority: yield more if lower priority
    let weight = separationStrength
    if (prioritySelf > priorityOther) weight *= 0.35 // yield
    else if (prioritySelf === priorityOther) weight *= 0.65
    else weight *= 1.0 // higher priority pushes stronger

    // If this is a future collision (not current), reduce urgency
    if (!isCurrentCollision && isFutureCollision) {
      const futureDist = Math.sqrt(futureDistSq)
      const urgency = 1 - (futureDist / (collisionRadius * 1.5))
      weight *= urgency * 0.6 // Gentler response for future collisions
    }

    const dist = Math.sqrt(distSq)
    const push = vecScale(vecNormalize(toOther), Math.min(maxSeparation, weight / Math.max(dist, 0.001)))
    separation = vecAdd(separation, push)
  })

  // Blend seek + separation
  const blended = vecAdd(seek, separation)
  return vecNormalize(blended)
}

// Clamp position to court bounds (0-1 normalized coordinates)
export function clampPosition(pos: Position): Position {
  return {
    x: Math.max(0, Math.min(1, pos.x)),
    y: Math.max(0, Math.min(1, pos.y))
  }
}
