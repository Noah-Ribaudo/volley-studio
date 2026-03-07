'use client'

import { DialRoot, useDialKit } from 'dialkit'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_TACTILE_TUNING, sanitizeTactileTuning, type TactileTuning } from '@/lib/rebuild/tactileTuning'

interface RebuildDialKitBridgeProps {
  onTuningChange: (tuning: TactileTuning) => void
}

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
      resetLighting: { type: 'action', label: 'Reset Lighting' },
      resetMotion: { type: 'action', label: 'Reset Motion' },
      resetDock: { type: 'action', label: 'Reset Dock' },
      resetJoystick: { type: 'action', label: 'Reset Joystick' },
      resetPhase: { type: 'action', label: 'Reset Phase' },
      resetConnectors: { type: 'action', label: 'Reset Connectors' },
    },
    {
      onAction: (actionPath) => {
        if (
          actionPath !== 'resetLighting' &&
          actionPath !== 'resetMotion' &&
          actionPath !== 'resetDock' &&
          actionPath !== 'resetJoystick' &&
          actionPath !== 'resetPhase' &&
          actionPath !== 'resetConnectors'
        ) {
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

        const sanitized = sanitizeTactileTuning(next)
        latestTuningRef.current = sanitized
        setSeed(sanitized)
        setPanelVersion((prev) => prev + 1)
        onTuningChange(sanitized)
      },
    }
  )

  const nextTuning = useMemo(
    () => {
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
      })
    },
    [
      params.connectors.activeOpacity,
      params.connectors.activeThickness,
      params.connectors.idleOpacity,
      params.dock.collapsedHeight,
      params.dock.expandedHeight,
      params.dock.gap,
      params.dock.innerPadding,
      params.joystick.deadZone,
      params.joystick.haloIntensity,
      params.joystick.settleSpring,
      params.joystick.travel,
      params.lighting.edgeContrast,
      params.lighting.fillStrength,
      params.lighting.keyStrength,
      params.lighting.lightAngle,
      params.lighting.pressDepth,
      params.lighting.shadowDeep,
      params.lighting.shadowSoft,
      params.lighting.textureStrength,
      params.phaseEmphasis.currentWeight,
      params.phaseEmphasis.foundationalContrast,
      params.phaseEmphasis.nextGlow,
      params.phaseEmphasis.reactiveContrast,
      params.switchMotion.knobGlow,
      params.switchMotion.pressTravel,
      params.switchMotion.spring,
    ]
  )

  useEffect(() => {
    const serialized = JSON.stringify(nextTuning)
    if (serialized === lastSerializedRef.current) return
    lastSerializedRef.current = serialized

    latestTuningRef.current = nextTuning
    onTuningChange(nextTuning)
  }, [nextTuning, onTuningChange])

  return <DialRoot defaultOpen position="top-right" />
}
