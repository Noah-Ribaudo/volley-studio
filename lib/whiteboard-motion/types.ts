import type { Position, Role } from '@/lib/types'

export interface LockedPathDefinition {
  role: Role
  start: Position
  end: Position
  control: Position | null
}

export interface WhiteboardMotionTuning {
  cruiseSpeed: number
  acceleration: number
  braking: number
  lookAheadTime: number
  maxLateralAccel: number
  curveStrength: number
  tokenRadius: number
  minSpacingRadii: number
  avoidanceBlend: number
  deflectionStrength: number
  maxLateralOffsetRadii: number
  deflectionSpring: number
  deflectionDamping: number
  clampMargin: number
}

export interface MotionPathSample {
  t: number
  s: number
  position: Position
  tangent: Position
  normal: Position
  curvature: number
}

export interface MotionPathData extends LockedPathDefinition {
  length: number
  samples: MotionPathSample[]
}

export interface MotionPoint {
  t: number
  s: number
  position: Position
  tangent: Position
  normal: Position
  curvature: number
}

export interface AgentSnapshot {
  role: Role
  distance: number
  length: number
  progress: number
  currentSpeed: number
  targetSpeed: number
  done: boolean
  lateralOffset: number
}

export interface WhiteboardPlaySnapshot {
  positions: Partial<Record<Role, Position>>
  agents: Partial<Record<Role, AgentSnapshot>>
  done: boolean
  elapsed: number
}
