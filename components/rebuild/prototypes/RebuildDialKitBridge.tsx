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
      resetLighting: { type: 'action', label: 'Reset Lighting' },
      resetMotion: { type: 'action', label: 'Reset Motion' },
    },
    {
      onAction: (actionPath) => {
        if (actionPath !== 'resetLighting' && actionPath !== 'resetMotion') return

        const latest = latestTuningRef.current
        const next =
          actionPath === 'resetLighting'
            ? {
                ...latest,
                lighting: DEFAULT_TACTILE_TUNING.lighting,
              }
            : {
                ...latest,
                switchMotion: DEFAULT_TACTILE_TUNING.switchMotion,
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
      })
    },
    [
      params.lighting.edgeContrast,
      params.lighting.fillStrength,
      params.lighting.keyStrength,
      params.lighting.lightAngle,
      params.lighting.pressDepth,
      params.lighting.shadowDeep,
      params.lighting.shadowSoft,
      params.lighting.textureStrength,
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
