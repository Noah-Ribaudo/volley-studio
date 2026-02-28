import type { CSSProperties } from 'react'

export interface LightingTuning {
  lightAngle: number
  keyStrength: number
  fillStrength: number
  shadowSoft: number
  shadowDeep: number
  pressDepth: number
  edgeContrast: number
  textureStrength: number
}

export interface SwitchMotionTuning {
  spring: {
    stiffness: number
    damping: number
    mass: number
  }
  pressTravel: number
  knobGlow: number
}

export interface TactileTuning {
  lighting: LightingTuning
  switchMotion: SwitchMotionTuning
}

export const DEFAULT_TACTILE_TUNING: TactileTuning = {
  lighting: {
    lightAngle: 35,
    keyStrength: 0.86,
    fillStrength: 0.22,
    shadowSoft: 0.22,
    shadowDeep: 0.38,
    pressDepth: 2.4,
    edgeContrast: 0.58,
    textureStrength: 0.02,
  },
  switchMotion: {
    spring: {
      stiffness: 430,
      damping: 34,
      mass: 0.75,
    },
    pressTravel: 2.6,
    knobGlow: 0.42,
  },
}

export type TactileCssVariables = CSSProperties & Record<string, string | number>

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function sanitizeTactileTuning(input: TactileTuning): TactileTuning {
  return {
    lighting: {
      lightAngle: clamp(input.lighting.lightAngle, 0, 90),
      keyStrength: clamp(input.lighting.keyStrength, 0, 1),
      fillStrength: clamp(input.lighting.fillStrength, 0, 1),
      shadowSoft: clamp(input.lighting.shadowSoft, 0, 1),
      shadowDeep: clamp(input.lighting.shadowDeep, 0, 1),
      pressDepth: clamp(input.lighting.pressDepth, 0, 10),
      edgeContrast: clamp(input.lighting.edgeContrast, 0, 1),
      textureStrength: clamp(input.lighting.textureStrength, 0, 0.1),
    },
    switchMotion: {
      spring: {
        stiffness: clamp(input.switchMotion.spring.stiffness, 120, 900),
        damping: clamp(input.switchMotion.spring.damping, 8, 80),
        mass: clamp(input.switchMotion.spring.mass, 0.2, 2),
      },
      pressTravel: clamp(input.switchMotion.pressTravel, 0, 8),
      knobGlow: clamp(input.switchMotion.knobGlow, 0, 1),
    },
  }
}

export function toTactileCssVariables(tuning: TactileTuning): TactileCssVariables {
  const normalized = sanitizeTactileTuning(tuning)
  const { lighting, switchMotion } = normalized

  return {
    '--lab-light-angle': `${lighting.lightAngle}deg`,
    '--lab-key-strength': lighting.keyStrength,
    '--lab-fill-strength': lighting.fillStrength,
    '--lab-shadow-soft-strength': lighting.shadowSoft,
    '--lab-shadow-deep-strength': lighting.shadowDeep,
    '--lab-press-depth': lighting.pressDepth,
    '--lab-edge-contrast': lighting.edgeContrast,
    '--lab-texture-strength': lighting.textureStrength,
    '--lab-switch-press-travel': switchMotion.pressTravel,
    '--lab-switch-knob-glow': switchMotion.knobGlow,
  }
}
