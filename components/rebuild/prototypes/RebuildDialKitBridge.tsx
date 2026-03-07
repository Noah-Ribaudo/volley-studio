'use client'

import { DialRoot, useDialKit } from 'dialkit'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_TACTILE_TUNING, sanitizeTactileTuning, type TactileTuning } from '@/lib/rebuild/tactileTuning'

interface RebuildDialKitBridgeProps {
  onTuningChange: (tuning: TactileTuning) => void
}

const RESET_ACTIONS = new Set([
  'resetLighting',
  'resetMotion',
  'resetDock',
  'resetJoystick',
  'resetPhase',
  'resetConnectors',
  'resetClusterLayout',
  'resetConnectorGeometry',
  'resetConnectorMotion',
  'resetPhaseSurface',
])

export function RebuildDialKitBridge({ onTuningChange }: RebuildDialKitBridgeProps) {
  const [seed, setSeed] = useState<TactileTuning>(DEFAULT_TACTILE_TUNING)
  const [panelVersion, setPanelVersion] = useState(0)
  const latestTuningRef = useRef<TactileTuning>(DEFAULT_TACTILE_TUNING)
  const lastSerializedRef = useRef<string>(JSON.stringify(DEFAULT_TACTILE_TUNING))

  const panelName = useMemo(() => `Rebuild Tactile Lab ${panelVersion}`, [panelVersion])

  const params = useDialKit(
    panelName,
    {
      lighting: {
        lightAngle: [seed.lighting.lightAngle, 0, 90, 1],
        keyStrength: [seed.lighting.keyStrength, 0, 1, 0.01],
        fillStrength: [seed.lighting.fillStrength, 0, 1, 0.01],
        shadowSoft: [seed.lighting.shadowSoft, 0, 1, 0.01],
        shadowDeep: [seed.lighting.shadowDeep, 0, 1, 0.01],
        pressDepth: [seed.lighting.pressDepth, 0, 8, 0.1],
        edgeContrast: [seed.lighting.edgeContrast, 0, 1, 0.01],
        textureStrength: [seed.lighting.textureStrength, 0, 0.1, 0.002],
      },
      switchMotion: {
        spring: {
          type: 'spring',
          stiffness: seed.switchMotion.spring.stiffness,
          damping: seed.switchMotion.spring.damping,
          mass: seed.switchMotion.spring.mass,
        },
        pressTravel: [seed.switchMotion.pressTravel, 0, 8, 0.1],
        knobGlow: [seed.switchMotion.knobGlow, 0, 1, 0.01],
      },
      dock: {
        collapsedHeight: [seed.dock.collapsedHeight, 160, 320, 1],
        expandedHeight: [seed.dock.expandedHeight, 240, 420, 1],
        innerPadding: [seed.dock.innerPadding, 8, 24, 1],
        gap: [seed.dock.gap, 4, 24, 1],
      },
      joystick: {
        travel: [seed.joystick.travel, 8, 36, 1],
        deadZone: [seed.joystick.deadZone, 4, 36, 1],
        haloIntensity: [seed.joystick.haloIntensity, 0, 1, 0.01],
        settleSpring: {
          type: 'spring',
          stiffness: seed.joystick.settleSpring.stiffness,
          damping: seed.joystick.settleSpring.damping,
          mass: seed.joystick.settleSpring.mass,
        },
      },
      phaseEmphasis: {
        currentWeight: [seed.phaseEmphasis.currentWeight, 1, 1.18, 0.01],
        nextGlow: [seed.phaseEmphasis.nextGlow, 0, 1, 0.01],
        foundationalContrast: [seed.phaseEmphasis.foundationalContrast, 0, 1, 0.01],
        reactiveContrast: [seed.phaseEmphasis.reactiveContrast, 0, 1, 0.01],
      },
      connectors: {
        idleOpacity: [seed.connectors.idleOpacity, 0, 1, 0.01],
        activeOpacity: [seed.connectors.activeOpacity, 0, 1, 0.01],
        activeThickness: [seed.connectors.activeThickness, 1, 4, 0.05],
      },
      c4Literal: {
        clusterLayout: {
          dockHeight: [seed.c4Literal.clusterLayout.dockHeight, 188, 280, 1],
          stageWidth: [seed.c4Literal.clusterLayout.stageWidth, 260, 340, 1],
          stageHeight: [seed.c4Literal.clusterLayout.stageHeight, 112, 168, 1],
          stageInset: [seed.c4Literal.clusterLayout.stageInset, 4, 20, 1],
          phaseButtonWidth: [seed.c4Literal.clusterLayout.phaseButtonWidth, 82, 120, 1],
          phaseButtonHeight: [seed.c4Literal.clusterLayout.phaseButtonHeight, 36, 56, 1],
          horizontalSpread: [seed.c4Literal.clusterLayout.horizontalSpread, 8, 56, 1],
          verticalSpread: [seed.c4Literal.clusterLayout.verticalSpread, 8, 40, 1],
          joystickSize: [seed.c4Literal.clusterLayout.joystickSize, 64, 96, 1],
          joystickClearance: [seed.c4Literal.clusterLayout.joystickClearance, 8, 28, 1],
        },
        connectorGeometry: {
          horizontalInset: [seed.c4Literal.connectorGeometry.horizontalInset, 0, 20, 1],
          joystickAvoidanceGap: [seed.c4Literal.connectorGeometry.joystickAvoidanceGap, 8, 28, 1],
          liveLoopOffset: [seed.c4Literal.connectorGeometry.liveLoopOffset, 8, 32, 1],
          strokeThickness: [seed.c4Literal.connectorGeometry.strokeThickness, 1, 4, 0.05],
          idleOpacity: [seed.c4Literal.connectorGeometry.idleOpacity, 0, 1, 0.01],
          activeOpacity: [seed.c4Literal.connectorGeometry.activeOpacity, 0, 1, 0.01],
        },
        connectorMotion: {
          restCycleSpeed: [seed.c4Literal.connectorMotion.restCycleSpeed, 0.4, 3, 0.01],
          playCycleSpeed: [seed.c4Literal.connectorMotion.playCycleSpeed, 0.2, 2, 0.01],
          travelAmount: [seed.c4Literal.connectorMotion.travelAmount, 0.12, 0.7, 0.01],
          pulseGlow: [seed.c4Literal.connectorMotion.pulseGlow, 0, 1, 0.01],
          destinationFlash: [seed.c4Literal.connectorMotion.destinationFlash, 0, 1, 0.01],
          segmentCount: [seed.c4Literal.connectorMotion.segmentCount, 2, 8, 1],
          dashDensity: [seed.c4Literal.connectorMotion.dashDensity, 0.08, 0.4, 0.01],
        },
        phaseSurface: {
          activeLift: [seed.c4Literal.phaseSurface.activeLift, 0, 6, 0.1],
          nextGlow: [seed.c4Literal.phaseSurface.nextGlow, 0, 1, 0.01],
          foundationalContrast: [seed.c4Literal.phaseSurface.foundationalContrast, 0, 1, 0.01],
          reactiveContrast: [seed.c4Literal.phaseSurface.reactiveContrast, 0, 1, 0.01],
        },
      },
      resetLighting: { type: 'action', label: 'Reset Lighting' },
      resetMotion: { type: 'action', label: 'Reset Motion' },
      resetDock: { type: 'action', label: 'Reset Dock' },
      resetJoystick: { type: 'action', label: 'Reset Joystick' },
      resetPhase: { type: 'action', label: 'Reset Phase' },
      resetConnectors: { type: 'action', label: 'Reset Connectors' },
      resetClusterLayout: { type: 'action', label: 'Reset Cluster Layout' },
      resetConnectorGeometry: { type: 'action', label: 'Reset Connector Geometry' },
      resetConnectorMotion: { type: 'action', label: 'Reset Connector Motion' },
      resetPhaseSurface: { type: 'action', label: 'Reset Phase Surface' },
    },
    {
      onAction: (actionPath) => {
        if (!RESET_ACTIONS.has(actionPath)) {
          return
        }

        const latest = latestTuningRef.current
        let next = latest

        if (actionPath === 'resetLighting') {
          next = {
            ...latest,
            lighting: DEFAULT_TACTILE_TUNING.lighting,
          }
        }

        if (actionPath === 'resetMotion') {
          next = {
            ...latest,
            switchMotion: DEFAULT_TACTILE_TUNING.switchMotion,
          }
        }

        if (actionPath === 'resetDock') {
          next = {
            ...latest,
            dock: DEFAULT_TACTILE_TUNING.dock,
          }
        }

        if (actionPath === 'resetJoystick') {
          next = {
            ...latest,
            joystick: DEFAULT_TACTILE_TUNING.joystick,
          }
        }

        if (actionPath === 'resetPhase') {
          next = {
            ...latest,
            phaseEmphasis: DEFAULT_TACTILE_TUNING.phaseEmphasis,
          }
        }

        if (actionPath === 'resetConnectors') {
          next = {
            ...latest,
            connectors: DEFAULT_TACTILE_TUNING.connectors,
          }
        }

        if (actionPath === 'resetClusterLayout') {
          next = {
            ...latest,
            c4Literal: {
              ...latest.c4Literal,
              clusterLayout: DEFAULT_TACTILE_TUNING.c4Literal.clusterLayout,
            },
          }
        }

        if (actionPath === 'resetConnectorGeometry') {
          next = {
            ...latest,
            c4Literal: {
              ...latest.c4Literal,
              connectorGeometry: DEFAULT_TACTILE_TUNING.c4Literal.connectorGeometry,
            },
          }
        }

        if (actionPath === 'resetConnectorMotion') {
          next = {
            ...latest,
            c4Literal: {
              ...latest.c4Literal,
              connectorMotion: DEFAULT_TACTILE_TUNING.c4Literal.connectorMotion,
            },
          }
        }

        if (actionPath === 'resetPhaseSurface') {
          next = {
            ...latest,
            c4Literal: {
              ...latest.c4Literal,
              phaseSurface: DEFAULT_TACTILE_TUNING.c4Literal.phaseSurface,
            },
          }
        }

        const sanitized = sanitizeTactileTuning(next)
        latestTuningRef.current = sanitized
        setSeed(sanitized)
        setPanelVersion((prev) => prev + 1)
        onTuningChange(sanitized)
      },
    }
  )

  const nextTuning = useMemo(() => {
    const springConfig = params.switchMotion.spring as {
      stiffness?: number
      damping?: number
      mass?: number
    }
    const joystickSpringConfig = params.joystick.settleSpring as {
      stiffness?: number
      damping?: number
      mass?: number
    }

    return sanitizeTactileTuning({
      lighting: {
        lightAngle: params.lighting.lightAngle,
        keyStrength: params.lighting.keyStrength,
        fillStrength: params.lighting.fillStrength,
        shadowSoft: params.lighting.shadowSoft,
        shadowDeep: params.lighting.shadowDeep,
        pressDepth: params.lighting.pressDepth,
        edgeContrast: params.lighting.edgeContrast,
        textureStrength: params.lighting.textureStrength,
      },
      switchMotion: {
        spring: {
          stiffness: springConfig.stiffness ?? DEFAULT_TACTILE_TUNING.switchMotion.spring.stiffness,
          damping: springConfig.damping ?? DEFAULT_TACTILE_TUNING.switchMotion.spring.damping,
          mass: springConfig.mass ?? DEFAULT_TACTILE_TUNING.switchMotion.spring.mass,
        },
        pressTravel: params.switchMotion.pressTravel,
        knobGlow: params.switchMotion.knobGlow,
      },
      dock: {
        collapsedHeight: params.dock.collapsedHeight,
        expandedHeight: params.dock.expandedHeight,
        innerPadding: params.dock.innerPadding,
        gap: params.dock.gap,
      },
      joystick: {
        travel: params.joystick.travel,
        deadZone: params.joystick.deadZone,
        haloIntensity: params.joystick.haloIntensity,
        settleSpring: {
          stiffness: joystickSpringConfig.stiffness ?? DEFAULT_TACTILE_TUNING.joystick.settleSpring.stiffness,
          damping: joystickSpringConfig.damping ?? DEFAULT_TACTILE_TUNING.joystick.settleSpring.damping,
          mass: joystickSpringConfig.mass ?? DEFAULT_TACTILE_TUNING.joystick.settleSpring.mass,
        },
      },
      phaseEmphasis: {
        currentWeight: params.phaseEmphasis.currentWeight,
        nextGlow: params.phaseEmphasis.nextGlow,
        foundationalContrast: params.phaseEmphasis.foundationalContrast,
        reactiveContrast: params.phaseEmphasis.reactiveContrast,
      },
      connectors: {
        idleOpacity: params.connectors.idleOpacity,
        activeOpacity: params.connectors.activeOpacity,
        activeThickness: params.connectors.activeThickness,
      },
      c4Literal: {
        clusterLayout: {
          dockHeight: params.c4Literal.clusterLayout.dockHeight,
          stageWidth: params.c4Literal.clusterLayout.stageWidth,
          stageHeight: params.c4Literal.clusterLayout.stageHeight,
          stageInset: params.c4Literal.clusterLayout.stageInset,
          phaseButtonWidth: params.c4Literal.clusterLayout.phaseButtonWidth,
          phaseButtonHeight: params.c4Literal.clusterLayout.phaseButtonHeight,
          horizontalSpread: params.c4Literal.clusterLayout.horizontalSpread,
          verticalSpread: params.c4Literal.clusterLayout.verticalSpread,
          joystickSize: params.c4Literal.clusterLayout.joystickSize,
          joystickClearance: params.c4Literal.clusterLayout.joystickClearance,
        },
        connectorGeometry: {
          horizontalInset: params.c4Literal.connectorGeometry.horizontalInset,
          joystickAvoidanceGap: params.c4Literal.connectorGeometry.joystickAvoidanceGap,
          liveLoopOffset: params.c4Literal.connectorGeometry.liveLoopOffset,
          strokeThickness: params.c4Literal.connectorGeometry.strokeThickness,
          idleOpacity: params.c4Literal.connectorGeometry.idleOpacity,
          activeOpacity: params.c4Literal.connectorGeometry.activeOpacity,
        },
        connectorMotion: {
          restCycleSpeed: params.c4Literal.connectorMotion.restCycleSpeed,
          playCycleSpeed: params.c4Literal.connectorMotion.playCycleSpeed,
          travelAmount: params.c4Literal.connectorMotion.travelAmount,
          pulseGlow: params.c4Literal.connectorMotion.pulseGlow,
          destinationFlash: params.c4Literal.connectorMotion.destinationFlash,
          segmentCount: params.c4Literal.connectorMotion.segmentCount,
          dashDensity: params.c4Literal.connectorMotion.dashDensity,
        },
        phaseSurface: {
          activeLift: params.c4Literal.phaseSurface.activeLift,
          nextGlow: params.c4Literal.phaseSurface.nextGlow,
          foundationalContrast: params.c4Literal.phaseSurface.foundationalContrast,
          reactiveContrast: params.c4Literal.phaseSurface.reactiveContrast,
        },
      },
    })
  }, [params])

  useEffect(() => {
    const serialized = JSON.stringify(nextTuning)
    if (serialized === lastSerializedRef.current) return
    lastSerializedRef.current = serialized

    latestTuningRef.current = nextTuning
    onTuningChange(nextTuning)
  }, [nextTuning, onTuningChange])

  return <DialRoot defaultOpen position="top-right" />
}
