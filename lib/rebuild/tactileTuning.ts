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

export interface DockTuning {
  collapsedHeight: number
  expandedHeight: number
  innerPadding: number
  gap: number
}

export interface JoystickTuning {
  travel: number
  deadZone: number
  haloIntensity: number
  settleSpring: {
    stiffness: number
    damping: number
    mass: number
  }
}

export interface PhaseEmphasisTuning {
  currentWeight: number
  nextGlow: number
  foundationalContrast: number
  reactiveContrast: number
}

export interface ConnectorTuning {
  idleOpacity: number
  activeOpacity: number
  activeThickness: number
}

export interface TactileTuning {
  lighting: LightingTuning
  switchMotion: SwitchMotionTuning
  dock: DockTuning
  joystick: JoystickTuning
  phaseEmphasis: PhaseEmphasisTuning
  connectors: ConnectorTuning
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
  dock: {
    collapsedHeight: 308,
    expandedHeight: 392,
    innerPadding: 12,
    gap: 10,
  },
  joystick: {
    travel: 18,
    deadZone: 16,
    haloIntensity: 0.58,
    settleSpring: {
      stiffness: 360,
      damping: 28,
      mass: 0.8,
    },
  },
  phaseEmphasis: {
    currentWeight: 1.06,
    nextGlow: 0.52,
    foundationalContrast: 0.48,
    reactiveContrast: 0.42,
  },
  connectors: {
    idleOpacity: 0.22,
    activeOpacity: 0.78,
    activeThickness: 2.25,
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
    dock: {
      collapsedHeight: clamp(input.dock.collapsedHeight, 160, 320),
      expandedHeight: clamp(input.dock.expandedHeight, 240, 420),
      innerPadding: clamp(input.dock.innerPadding, 8, 24),
      gap: clamp(input.dock.gap, 4, 24),
    },
    joystick: {
      travel: clamp(input.joystick.travel, 8, 36),
      deadZone: clamp(input.joystick.deadZone, 4, 36),
      haloIntensity: clamp(input.joystick.haloIntensity, 0, 1),
      settleSpring: {
        stiffness: clamp(input.joystick.settleSpring.stiffness, 120, 900),
        damping: clamp(input.joystick.settleSpring.damping, 8, 80),
        mass: clamp(input.joystick.settleSpring.mass, 0.2, 2),
      },
    },
    phaseEmphasis: {
      currentWeight: clamp(input.phaseEmphasis.currentWeight, 1, 1.18),
      nextGlow: clamp(input.phaseEmphasis.nextGlow, 0, 1),
      foundationalContrast: clamp(input.phaseEmphasis.foundationalContrast, 0, 1),
      reactiveContrast: clamp(input.phaseEmphasis.reactiveContrast, 0, 1),
    },
    connectors: {
      idleOpacity: clamp(input.connectors.idleOpacity, 0, 1),
      activeOpacity: clamp(input.connectors.activeOpacity, 0, 1),
      activeThickness: clamp(input.connectors.activeThickness, 1, 4),
    },
  }
}

export function toTactileCssVariables(tuning: TactileTuning): TactileCssVariables {
  const normalized = sanitizeTactileTuning(tuning)
  const { connectors, dock, joystick, lighting, phaseEmphasis, switchMotion } = normalized

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
    '--lab-dock-collapsed-height': `${dock.collapsedHeight}px`,
    '--lab-dock-expanded-height': `${dock.expandedHeight}px`,
    '--lab-dock-inner-padding': `${dock.innerPadding}px`,
    '--lab-dock-gap': `${dock.gap}px`,
    '--lab-joystick-halo-intensity': joystick.haloIntensity,
    '--lab-phase-current-weight': phaseEmphasis.currentWeight,
    '--lab-phase-next-glow': phaseEmphasis.nextGlow,
    '--lab-phase-foundational-contrast': phaseEmphasis.foundationalContrast,
    '--lab-phase-reactive-contrast': phaseEmphasis.reactiveContrast,
    '--lab-connector-idle-opacity': connectors.idleOpacity,
    '--lab-connector-active-opacity': connectors.activeOpacity,
    '--lab-connector-active-thickness': connectors.activeThickness,
  }
}
