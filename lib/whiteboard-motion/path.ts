import type { Position } from '@/lib/types'
import type { LockedPathDefinition, MotionPathData, MotionPathSample, MotionPoint } from './types'

const EPSILON = 1e-6

export const vecAdd = (a: Position, b: Position): Position => ({ x: a.x + b.x, y: a.y + b.y })
export const vecSub = (a: Position, b: Position): Position => ({ x: a.x - b.x, y: a.y - b.y })
export const vecScale = (v: Position, s: number): Position => ({ x: v.x * s, y: v.y * s })
export const vecDot = (a: Position, b: Position): number => a.x * b.x + a.y * b.y
export const vecLengthSq = (v: Position): number => v.x * v.x + v.y * v.y
export const vecLength = (v: Position): number => Math.sqrt(vecLengthSq(v))
export const vecNormalize = (v: Position): Position => {
  const len = vecLength(v)
  if (len <= EPSILON) return { x: 0, y: 0 }
  return { x: v.x / len, y: v.y / len }
}
export const vecPerp = (v: Position): Position => ({ x: -v.y, y: v.x })
export const vecCross = (a: Position, b: Position): number => a.x * b.y - a.y * b.x

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
export const clamp01 = (value: number) => clamp(value, 0, 1)

export function evaluateQuadratic(start: Position, control: Position | null, end: Position, t: number): Position {
  if (!control) {
    return {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    }
  }

  const mt = 1 - t
  return {
    x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
    y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
  }
}

export function derivativeQuadratic(start: Position, control: Position | null, end: Position, t: number): Position {
  if (!control) {
    return { x: end.x - start.x, y: end.y - start.y }
  }

  const mt = 1 - t
  return {
    x: 2 * mt * (control.x - start.x) + 2 * t * (end.x - control.x),
    y: 2 * mt * (control.y - start.y) + 2 * t * (end.y - control.y),
  }
}

export function curvatureQuadratic(start: Position, control: Position | null, end: Position, t: number): number {
  if (!control) return 0

  const d1 = derivativeQuadratic(start, control, end, t)
  const d2 = {
    x: 2 * (end.x - 2 * control.x + start.x),
    y: 2 * (end.y - 2 * control.y + start.y),
  }

  const denominator = Math.pow(d1.x * d1.x + d1.y * d1.y, 1.5)
  if (denominator <= EPSILON) return 0
  return Math.abs(d1.x * d2.y - d1.y * d2.x) / denominator
}

function buildSample(start: Position, control: Position | null, end: Position, t: number, s: number): MotionPathSample {
  const position = evaluateQuadratic(start, control, end, t)
  const tangent = vecNormalize(derivativeQuadratic(start, control, end, t))
  const normal = vecPerp(tangent)
  const curvature = curvatureQuadratic(start, control, end, t)

  return {
    t,
    s,
    position,
    tangent,
    normal,
    curvature,
  }
}

export function buildMotionPath(path: LockedPathDefinition, sampleCount = 120): MotionPathData {
  const samples: MotionPathSample[] = []
  let length = 0
  let previous = path.start

  for (let i = 0; i <= sampleCount; i += 1) {
    const t = i / sampleCount
    const position = evaluateQuadratic(path.start, path.control, path.end, t)

    if (i > 0) {
      length += Math.hypot(position.x - previous.x, position.y - previous.y)
    }

    samples.push(buildSample(path.start, path.control, path.end, t, length))
    previous = position
  }

  return {
    ...path,
    length,
    samples,
  }
}

function findBracket(samples: MotionPathSample[], s: number): [MotionPathSample, MotionPathSample] {
  if (samples.length === 1) {
    return [samples[0], samples[0]]
  }

  let low = 0
  let high = samples.length - 1
  while (high - low > 1) {
    const mid = (low + high) >> 1
    if (samples[mid].s < s) low = mid
    else high = mid
  }
  return [samples[low], samples[high]]
}

export function pointAtDistance(path: MotionPathData, distance: number): MotionPoint {
  if (path.samples.length === 0) {
    return {
      t: 0,
      s: 0,
      position: path.start,
      tangent: vecNormalize(vecSub(path.end, path.start)),
      normal: vecPerp(vecNormalize(vecSub(path.end, path.start))),
      curvature: 0,
    }
  }

  if (distance <= 0) {
    const sample = path.samples[0]
    return { ...sample }
  }

  if (distance >= path.length) {
    const sample = path.samples[path.samples.length - 1]
    return { ...sample, s: path.length }
  }

  const [a, b] = findBracket(path.samples, distance)
  const span = Math.max(EPSILON, b.s - a.s)
  const alpha = clamp01((distance - a.s) / span)
  const t = a.t + (b.t - a.t) * alpha

  const position = evaluateQuadratic(path.start, path.control, path.end, t)
  const tangent = vecNormalize(derivativeQuadratic(path.start, path.control, path.end, t))
  const normal = vecPerp(tangent)
  const curvature = curvatureQuadratic(path.start, path.control, path.end, t)

  return {
    t,
    s: distance,
    position,
    tangent,
    normal,
    curvature,
  }
}

export function getPathLength(path: LockedPathDefinition): number {
  return buildMotionPath(path).length
}

export function computeDefaultControlPoint(
  start: Position,
  end: Position,
  curveStrength: number
): Position | null {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const dist = Math.hypot(dx, dy)
  if (dist < EPSILON || curveStrength <= 0) return null

  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
  const direction = { x: dx / dist, y: dy / dist }
  const perpendicular = vecPerp(direction)

  // Bias curves toward court center so paths feel tactical rather than random.
  const center = { x: 0.5, y: 0.75 }
  const towardCenter = vecSub(center, start)
  const side = Math.sign(vecCross(direction, towardCenter)) || 1
  const bend = curveStrength * dist

  return {
    x: midpoint.x + perpendicular.x * bend * side,
    y: midpoint.y + perpendicular.y * bend * side,
  }
}

