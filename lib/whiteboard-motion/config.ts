import type { WhiteboardMotionTuning } from './types'

export const DEFAULT_WHITEBOARD_MOTION_TUNING: WhiteboardMotionTuning = {
  cruiseSpeed: 0.72,
  acceleration: 2.4,
  braking: 3.2,
  lookAheadTime: 0.4,
  maxLateralAccel: 1.15,
  curveStrength: 0.35,
  tokenRadius: 0.06,
  minSpacingRadii: 1,
  avoidanceBlend: 0.5,
  deflectionStrength: 1.0,
  maxLateralOffsetRadii: 2.5,
  deflectionSpring: 13,
  deflectionDamping: 7.5,
  clampMargin: 0.15,
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function sanitizeMotionTuning(tuning: WhiteboardMotionTuning): WhiteboardMotionTuning {
  return {
    cruiseSpeed: clamp(tuning.cruiseSpeed, 0.05, 2),
    acceleration: clamp(tuning.acceleration, 0.1, 8),
    braking: clamp(tuning.braking, 0.1, 10),
    lookAheadTime: clamp(tuning.lookAheadTime, 0.05, 1.5),
    maxLateralAccel: clamp(tuning.maxLateralAccel, 0.05, 6),
    curveStrength: clamp(tuning.curveStrength, 0, 1),
    tokenRadius: clamp(tuning.tokenRadius, 0.02, 0.2),
    minSpacingRadii: clamp(tuning.minSpacingRadii, 0, 3),
    avoidanceBlend: clamp(tuning.avoidanceBlend, 0, 1),
    deflectionStrength: clamp(tuning.deflectionStrength, 0, 3),
    maxLateralOffsetRadii: clamp(tuning.maxLateralOffsetRadii, 0, 6),
    deflectionSpring: clamp(tuning.deflectionSpring, 0, 30),
    deflectionDamping: clamp(tuning.deflectionDamping, 0, 30),
    clampMargin: clamp(tuning.clampMargin, 0, 0.5),
  }
}
