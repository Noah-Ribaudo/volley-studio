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
  scale: number
  highlightIntensity: number
  whiteRingOpacity: number
  offsetTexture: boolean
  ringTextureScale: number
  ringTextureSpacingX: number
  ringTextureSpacingY: number
  ringTextureOpacity: number
  ringTextureDepth: number
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

export interface C4LiteralClusterLayoutTuning {
  dockHeight: number
  stageWidth: number
  stageHeight: number
  stageInset: number
  phaseButtonWidth: number
  phaseButtonHeight: number
  horizontalSpread: number
  verticalSpread: number
  joystickSize: number
  joystickClearance: number
}

export interface C4LiteralConnectorGeometryTuning {
  horizontalInset: number
  joystickAvoidanceGap: number
  liveLoopOffset: number
  strokeThickness: number
  idleOpacity: number
  activeOpacity: number
}

export interface C4LiteralConnectorMotionTuning {
  playDurationMs: number
  restProgress: number
  headLength: number
  glowStrength: number
  destinationFlash: number
}

export interface C4LiteralPhaseSurfaceTuning {
  activeLift: number
  nextGlow: number
  foundationalContrast: number
  reactiveContrast: number
}

export interface PhasePadHardwareTuning {
  trackInset: number
  trackRadius: number
  trackWidth: number
  piecesPerQuarter: number
  pieceLength: number
  pieceThickness: number
  pieceRadius: number
  inactiveOpacity: number
  activeOpacity: number
  glow: number
  bloom: number
  channelShadow: number
  channelHighlight: number
}

export interface C4LiteralTuning {
  clusterLayout: C4LiteralClusterLayoutTuning
  connectorGeometry: C4LiteralConnectorGeometryTuning
  connectorMotion: C4LiteralConnectorMotionTuning
  phaseSurface: C4LiteralPhaseSurfaceTuning
}

export interface TactileTuning {
  lighting: LightingTuning
  switchMotion: SwitchMotionTuning
  dock: DockTuning
  joystick: JoystickTuning
  phaseEmphasis: PhaseEmphasisTuning
  connectors: ConnectorTuning
  c4Literal: C4LiteralTuning
  phasePadHardware: PhasePadHardwareTuning
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
    pressTravel: 0,
    knobGlow: 0.15,
  },
  dock: {
    collapsedHeight: 308,
    expandedHeight: 392,
    innerPadding: 12,
    gap: 10,
  },
  joystick: {
    travel: 13,
    deadZone: 10,
    haloIntensity: 0.75,
    scale: 1.5,
    highlightIntensity: 0.8,
    whiteRingOpacity: 0.34,
    offsetTexture: true,
    ringTextureScale: 12,
    ringTextureSpacingX: 3.9,
    ringTextureSpacingY: 3,
    ringTextureOpacity: 0,
    ringTextureDepth: 0.16,
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
  c4Literal: {
    clusterLayout: {
      dockHeight: 220,
      stageWidth: 302,
      stageHeight: 136,
      stageInset: 8,
      phaseButtonWidth: 96,
      phaseButtonHeight: 40,
      horizontalSpread: 26,
      verticalSpread: 24,
      joystickSize: 78,
      joystickClearance: 14,
    },
    connectorGeometry: {
      horizontalInset: 18,
      joystickAvoidanceGap: 28,
      liveLoopOffset: 22,
      strokeThickness: 3.1,
      idleOpacity: 0.32,
      activeOpacity: 0.98,
    },
    connectorMotion: {
      playDurationMs: 500,
      restProgress: 0.05,
      headLength: 0.18,
      glowStrength: 0.68,
      destinationFlash: 0.54,
    },
    phaseSurface: {
      activeLift: 2.1,
      nextGlow: 0.52,
      foundationalContrast: 0.46,
      reactiveContrast: 0.36,
    },
  },
  phasePadHardware: {
    trackInset: 1.9,
    trackRadius: 2.9,
    trackWidth: 4.9,
    piecesPerQuarter: 6,
    pieceLength: 14,
    pieceThickness: 4.25,
    pieceRadius: 1.6,
    inactiveOpacity: 0.14,
    activeOpacity: 0.68,
    glow: 0.58,
    bloom: 1.89,
    channelShadow: 0.85,
    channelHighlight: 0.75,
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
      travel: clamp(input.joystick.travel, 6, 52),
      deadZone: clamp(input.joystick.deadZone, 0, 42),
      haloIntensity: clamp(input.joystick.haloIntensity, 0, 1.25),
      scale: clamp(input.joystick.scale, 0.65, 1.5),
      highlightIntensity: clamp(input.joystick.highlightIntensity, 0, 1),
      whiteRingOpacity: clamp(input.joystick.whiteRingOpacity, 0, 1),
      offsetTexture: input.joystick.offsetTexture,
      ringTextureScale: clamp(input.joystick.ringTextureScale, 3, 12),
      ringTextureSpacingX: clamp(input.joystick.ringTextureSpacingX, 3, 16),
      ringTextureSpacingY: clamp(input.joystick.ringTextureSpacingY, 3, 16),
      ringTextureOpacity: clamp(input.joystick.ringTextureOpacity, 0, 1),
      ringTextureDepth: clamp(input.joystick.ringTextureDepth, 0, 1),
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
    c4Literal: {
      clusterLayout: {
        dockHeight: clamp(input.c4Literal.clusterLayout.dockHeight, 176, 320),
        stageWidth: clamp(input.c4Literal.clusterLayout.stageWidth, 240, 420),
        stageHeight: clamp(input.c4Literal.clusterLayout.stageHeight, 108, 220),
        stageInset: clamp(input.c4Literal.clusterLayout.stageInset, 0, 28),
        phaseButtonWidth: clamp(input.c4Literal.clusterLayout.phaseButtonWidth, 72, 160),
        phaseButtonHeight: clamp(input.c4Literal.clusterLayout.phaseButtonHeight, 32, 72),
        horizontalSpread: clamp(input.c4Literal.clusterLayout.horizontalSpread, 0, 104),
        verticalSpread: clamp(input.c4Literal.clusterLayout.verticalSpread, 0, 68),
        joystickSize: clamp(input.c4Literal.clusterLayout.joystickSize, 56, 132),
        joystickClearance: clamp(input.c4Literal.clusterLayout.joystickClearance, 0, 40),
      },
      connectorGeometry: {
        horizontalInset: clamp(input.c4Literal.connectorGeometry.horizontalInset, 0, 72),
        joystickAvoidanceGap: clamp(input.c4Literal.connectorGeometry.joystickAvoidanceGap, 0, 96),
        liveLoopOffset: clamp(input.c4Literal.connectorGeometry.liveLoopOffset, 0, 80),
        strokeThickness: clamp(input.c4Literal.connectorGeometry.strokeThickness, 0.75, 8),
        idleOpacity: clamp(input.c4Literal.connectorGeometry.idleOpacity, 0, 1),
        activeOpacity: clamp(input.c4Literal.connectorGeometry.activeOpacity, 0, 1),
      },
      connectorMotion: {
        playDurationMs: clamp(input.c4Literal.connectorMotion.playDurationMs, 180, 2400),
        restProgress: clamp(input.c4Literal.connectorMotion.restProgress, 0, 0.45),
        headLength: clamp(input.c4Literal.connectorMotion.headLength, 0.04, 0.4),
        glowStrength: clamp(input.c4Literal.connectorMotion.glowStrength, 0, 1.6),
        destinationFlash: clamp(input.c4Literal.connectorMotion.destinationFlash, 0, 1.4),
      },
      phaseSurface: {
        activeLift: clamp(input.c4Literal.phaseSurface.activeLift, 0, 6),
        nextGlow: clamp(input.c4Literal.phaseSurface.nextGlow, 0, 1),
        foundationalContrast: clamp(input.c4Literal.phaseSurface.foundationalContrast, 0, 1),
        reactiveContrast: clamp(input.c4Literal.phaseSurface.reactiveContrast, 0, 1),
      },
    },
    phasePadHardware: {
      trackInset: clamp(input.phasePadHardware.trackInset, -8, 28),
      trackRadius: clamp(input.phasePadHardware.trackRadius, 0, 28),
      trackWidth: clamp(input.phasePadHardware.trackWidth, 0.5, 18),
      piecesPerQuarter: clamp(Math.round(input.phasePadHardware.piecesPerQuarter), 2, 32),
      pieceLength: clamp(input.phasePadHardware.pieceLength, 1, 28),
      pieceThickness: clamp(input.phasePadHardware.pieceThickness, 0.75, 16),
      pieceRadius: clamp(input.phasePadHardware.pieceRadius, 0, 10),
      inactiveOpacity: clamp(input.phasePadHardware.inactiveOpacity, 0, 0.75),
      activeOpacity: clamp(input.phasePadHardware.activeOpacity, 0.2, 1),
      glow: clamp(input.phasePadHardware.glow, 0, 3),
      bloom: clamp(input.phasePadHardware.bloom, 0, 3),
      channelShadow: clamp(input.phasePadHardware.channelShadow, 0, 1),
      channelHighlight: clamp(input.phasePadHardware.channelHighlight, 0, 1),
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
