'use client'

import type { DialPosition } from 'dialkit'
import { DialRoot, useDialKit } from 'dialkit'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PrototypeVariantId } from '@/lib/rebuild/prototypeFlow'
import { DEFAULT_TACTILE_TUNING, sanitizeTactileTuning, type TactileTuning } from '@/lib/rebuild/tactileTuning'

interface RebuildDialKitBridgeProps {
  activeVariant: PrototypeVariantId
  onTuningChange: (tuning: TactileTuning) => void
  position?: DialPosition
}

const RESET_ACTIONS = new Set([
  'resetLighting',
  'resetPressFeel',
  'resetJoystick',
  'resetClusterLayout',
  'resetConnectorPath',
  'resetLoadingBar',
  'resetPhaseSurfaces',
  'resetPhasePadHardware',
])

export function RebuildDialKitBridge({
  activeVariant,
  onTuningChange,
  position = 'top-right',
}: RebuildDialKitBridgeProps) {
  const [seed, setSeed] = useState<TactileTuning>(DEFAULT_TACTILE_TUNING)
  const [panelVersion, setPanelVersion] = useState(0)
  const latestTuningRef = useRef<TactileTuning>(DEFAULT_TACTILE_TUNING)
  const lastSerializedRef = useRef<string>(JSON.stringify(DEFAULT_TACTILE_TUNING))

  const panelName = useMemo(() => `Rebuild Tactile Lab ${panelVersion}`, [panelVersion])

  const params = useDialKit(
    panelName,
    {
      globalLight: {
        lightAngle: [seed.lighting.lightAngle, 0, 90, 1],
        keyStrength: [seed.lighting.keyStrength, 0, 1.2, 0.01],
        fillStrength: [seed.lighting.fillStrength, 0, 1.2, 0.01],
        shadowSoft: [seed.lighting.shadowSoft, 0, 1, 0.01],
        shadowDeep: [seed.lighting.shadowDeep, 0, 1, 0.01],
        pressDepth: [seed.lighting.pressDepth, 0, 12, 0.1],
        edgeContrast: [seed.lighting.edgeContrast, 0, 1, 0.01],
        textureStrength: [seed.lighting.textureStrength, 0, 0.12, 0.002],
      },
      pressFeel: {
        _collapsed: true,
        spring: {
          type: 'spring',
          stiffness: seed.switchMotion.spring.stiffness,
          damping: seed.switchMotion.spring.damping,
          mass: seed.switchMotion.spring.mass,
        },
        pressTravel: [seed.switchMotion.pressTravel, 0, 12, 0.1],
        knobGlow: [seed.switchMotion.knobGlow, 0, 1.2, 0.01],
      },
      joystick: {
        _collapsed: true,
        travel: [seed.joystick.travel, 6, 52, 1],
        deadZone: [seed.joystick.deadZone, 0, 42, 1],
        haloIntensity: [seed.joystick.haloIntensity, 0, 1.25, 0.01],
        scale: [seed.joystick.scale, 0.65, 1.5, 0.01],
        highlightIntensity: [seed.joystick.highlightIntensity, 0, 1, 0.01],
        whiteRingOpacity: [seed.joystick.whiteRingOpacity, 0, 1, 0.01],
        ringTextureScale: [seed.joystick.ringTextureScale, 3, 12, 0.1],
        ringTextureSpacingX: [seed.joystick.ringTextureSpacingX, 3, 16, 0.1],
        ringTextureSpacingY: [seed.joystick.ringTextureSpacingY, 3, 16, 0.1],
        ringTextureOpacity: [seed.joystick.ringTextureOpacity, 0, 1, 0.01],
        ringTextureDepth: [seed.joystick.ringTextureDepth, 0, 1, 0.01],
        settleSpring: {
          type: 'spring',
          stiffness: seed.joystick.settleSpring.stiffness,
          damping: seed.joystick.settleSpring.damping,
          mass: seed.joystick.settleSpring.mass,
        },
      },
      ...(activeVariant === 'concept4'
        ? {
            c4Literal: {
              clusterLayout: {
                dockHeight: [seed.c4Literal.clusterLayout.dockHeight, 176, 320, 1],
                stageWidth: [seed.c4Literal.clusterLayout.stageWidth, 240, 420, 1],
                stageHeight: [seed.c4Literal.clusterLayout.stageHeight, 108, 220, 1],
                stageInset: [seed.c4Literal.clusterLayout.stageInset, 0, 28, 1],
                phaseButtonWidth: [seed.c4Literal.clusterLayout.phaseButtonWidth, 72, 160, 1],
                phaseButtonHeight: [seed.c4Literal.clusterLayout.phaseButtonHeight, 32, 72, 1],
                horizontalSpread: [seed.c4Literal.clusterLayout.horizontalSpread, 0, 104, 1],
                verticalSpread: [seed.c4Literal.clusterLayout.verticalSpread, 0, 68, 1],
                joystickSize: [seed.c4Literal.clusterLayout.joystickSize, 56, 132, 1],
                joystickClearance: [seed.c4Literal.clusterLayout.joystickClearance, 0, 40, 1],
              },
              connectorPath: {
                _collapsed: true,
                horizontalInset: [seed.c4Literal.connectorGeometry.horizontalInset, 0, 72, 1],
                joystickAvoidanceGap: [seed.c4Literal.connectorGeometry.joystickAvoidanceGap, 0, 96, 1],
                liveLoopOffset: [seed.c4Literal.connectorGeometry.liveLoopOffset, 0, 80, 1],
                strokeThickness: [seed.c4Literal.connectorGeometry.strokeThickness, 0.75, 8, 0.05],
                idleOpacity: [seed.c4Literal.connectorGeometry.idleOpacity, 0, 1, 0.01],
                activeOpacity: [seed.c4Literal.connectorGeometry.activeOpacity, 0, 1, 0.01],
              },
              loadingBar: {
                playDurationMs: [seed.c4Literal.connectorMotion.playDurationMs, 180, 2400, 10],
                restProgress: [seed.c4Literal.connectorMotion.restProgress, 0, 0.45, 0.01],
                headLength: [seed.c4Literal.connectorMotion.headLength, 0.04, 0.4, 0.01],
                glowStrength: [seed.c4Literal.connectorMotion.glowStrength, 0, 1.6, 0.01],
                destinationFlash: [seed.c4Literal.connectorMotion.destinationFlash, 0, 1.4, 0.01],
              },
              phaseSurfaces: {
                _collapsed: true,
                activeLift: [seed.c4Literal.phaseSurface.activeLift, 0, 8, 0.1],
                nextGlow: [seed.c4Literal.phaseSurface.nextGlow, 0, 1.2, 0.01],
                foundationalContrast: [seed.c4Literal.phaseSurface.foundationalContrast, 0, 1.2, 0.01],
                reactiveContrast: [seed.c4Literal.phaseSurface.reactiveContrast, 0, 1.2, 0.01],
              },
            },
            resetClusterLayout: { type: 'action', label: 'Reset Cluster Layout' },
            resetConnectorPath: { type: 'action', label: 'Reset Connector Path' },
            resetLoadingBar: { type: 'action', label: 'Reset Loading Bar' },
            resetPhaseSurfaces: { type: 'action', label: 'Reset Phase Surfaces' },
          }
        : {}),
      ...(activeVariant === 'concept8'
        ? {
            phasePadHardware: {
              trackInset: [seed.phasePadHardware.trackInset, -8, 28, 0.1],
              trackRadius: [seed.phasePadHardware.trackRadius, 0, 28, 0.1],
              trackWidth: [seed.phasePadHardware.trackWidth, 0.5, 18, 0.1],
              piecesPerQuarter: [seed.phasePadHardware.piecesPerQuarter, 2, 32, 1],
              pieceLength: [seed.phasePadHardware.pieceLength, 1, 28, 0.1],
              pieceThickness: [seed.phasePadHardware.pieceThickness, 0.75, 16, 0.05],
              pieceRadius: [seed.phasePadHardware.pieceRadius, 0, 10, 0.05],
              inactiveOpacity: [seed.phasePadHardware.inactiveOpacity, 0, 0.75, 0.01],
              activeOpacity: [seed.phasePadHardware.activeOpacity, 0.2, 1, 0.01],
              glow: [seed.phasePadHardware.glow, 0, 3, 0.01],
              bloom: [seed.phasePadHardware.bloom, 0, 3, 0.01],
              channelShadow: [seed.phasePadHardware.channelShadow, 0, 1, 0.01],
              channelHighlight: [seed.phasePadHardware.channelHighlight, 0, 1, 0.01],
            },
            resetPhasePadHardware: { type: 'action', label: 'Reset Phase Hardware' },
          }
        : {}),
      resetLighting: { type: 'action', label: 'Reset Global Light' },
      resetPressFeel: { type: 'action', label: 'Reset Press Feel' },
      resetJoystick: { type: 'action', label: 'Reset Joystick' },
    },
    {
      onAction: (actionPath: string) => {
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

        if (actionPath === 'resetPressFeel') {
          next = {
            ...latest,
            switchMotion: DEFAULT_TACTILE_TUNING.switchMotion,
          }
        }

        if (actionPath === 'resetJoystick') {
          next = {
            ...latest,
            joystick: DEFAULT_TACTILE_TUNING.joystick,
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

        if (actionPath === 'resetConnectorPath') {
          next = {
            ...latest,
            c4Literal: {
              ...latest.c4Literal,
              connectorGeometry: DEFAULT_TACTILE_TUNING.c4Literal.connectorGeometry,
            },
          }
        }

        if (actionPath === 'resetLoadingBar') {
          next = {
            ...latest,
            c4Literal: {
              ...latest.c4Literal,
              connectorMotion: DEFAULT_TACTILE_TUNING.c4Literal.connectorMotion,
            },
          }
        }

        if (actionPath === 'resetPhaseSurfaces') {
          next = {
            ...latest,
            c4Literal: {
              ...latest.c4Literal,
              phaseSurface: DEFAULT_TACTILE_TUNING.c4Literal.phaseSurface,
            },
          }
        }

        if (actionPath === 'resetPhasePadHardware') {
          next = {
            ...latest,
            phasePadHardware: DEFAULT_TACTILE_TUNING.phasePadHardware,
          }
        }

        const sanitized = sanitizeTactileTuning(next)
        latestTuningRef.current = sanitized
        setSeed(sanitized)
        setPanelVersion((prev) => prev + 1)
        onTuningChange(sanitized)
      },
    }
  ) as any

  const nextTuning = useMemo(() => {
    const preserved = latestTuningRef.current
    const pressFeelSpring = params.pressFeel.spring as {
      stiffness?: number
      damping?: number
      mass?: number
    }
    const joystickSpring = params.joystick.settleSpring as {
      stiffness?: number
      damping?: number
      mass?: number
    }

    return sanitizeTactileTuning({
      lighting: {
        lightAngle: params.globalLight.lightAngle,
        keyStrength: params.globalLight.keyStrength,
        fillStrength: params.globalLight.fillStrength,
        shadowSoft: params.globalLight.shadowSoft,
        shadowDeep: params.globalLight.shadowDeep,
        pressDepth: params.globalLight.pressDepth,
        edgeContrast: params.globalLight.edgeContrast,
        textureStrength: params.globalLight.textureStrength,
      },
      switchMotion: {
        spring: {
          stiffness: pressFeelSpring.stiffness ?? DEFAULT_TACTILE_TUNING.switchMotion.spring.stiffness,
          damping: pressFeelSpring.damping ?? DEFAULT_TACTILE_TUNING.switchMotion.spring.damping,
          mass: pressFeelSpring.mass ?? DEFAULT_TACTILE_TUNING.switchMotion.spring.mass,
        },
        pressTravel: params.pressFeel.pressTravel,
        knobGlow: params.pressFeel.knobGlow,
      },
      dock: preserved.dock,
      joystick: {
        travel: params.joystick.travel,
        deadZone: params.joystick.deadZone,
        haloIntensity: params.joystick.haloIntensity,
        scale: params.joystick.scale,
        highlightIntensity: params.joystick.highlightIntensity,
        whiteRingOpacity: params.joystick.whiteRingOpacity,
        ringTextureScale: params.joystick.ringTextureScale,
        ringTextureSpacingX: params.joystick.ringTextureSpacingX,
        ringTextureSpacingY: params.joystick.ringTextureSpacingY,
        ringTextureOpacity: params.joystick.ringTextureOpacity,
        ringTextureDepth: params.joystick.ringTextureDepth,
        settleSpring: {
          stiffness: joystickSpring.stiffness ?? DEFAULT_TACTILE_TUNING.joystick.settleSpring.stiffness,
          damping: joystickSpring.damping ?? DEFAULT_TACTILE_TUNING.joystick.settleSpring.damping,
          mass: joystickSpring.mass ?? DEFAULT_TACTILE_TUNING.joystick.settleSpring.mass,
        },
      },
      phaseEmphasis: preserved.phaseEmphasis,
      connectors: preserved.connectors,
      phasePadHardware:
        activeVariant === 'concept8'
          ? {
              trackInset: params.phasePadHardware.trackInset,
              trackRadius: params.phasePadHardware.trackRadius,
              trackWidth: params.phasePadHardware.trackWidth,
              piecesPerQuarter: params.phasePadHardware.piecesPerQuarter,
              pieceLength: params.phasePadHardware.pieceLength,
              pieceThickness: params.phasePadHardware.pieceThickness,
              pieceRadius: params.phasePadHardware.pieceRadius,
              inactiveOpacity: params.phasePadHardware.inactiveOpacity,
              activeOpacity: params.phasePadHardware.activeOpacity,
              glow: params.phasePadHardware.glow,
              bloom: params.phasePadHardware.bloom,
              channelShadow: params.phasePadHardware.channelShadow,
              channelHighlight: params.phasePadHardware.channelHighlight,
            }
          : preserved.phasePadHardware,
      c4Literal:
        activeVariant === 'concept4'
          ? {
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
                horizontalInset: params.c4Literal.connectorPath.horizontalInset,
                joystickAvoidanceGap: params.c4Literal.connectorPath.joystickAvoidanceGap,
                liveLoopOffset: params.c4Literal.connectorPath.liveLoopOffset,
                strokeThickness: params.c4Literal.connectorPath.strokeThickness,
                idleOpacity: params.c4Literal.connectorPath.idleOpacity,
                activeOpacity: params.c4Literal.connectorPath.activeOpacity,
              },
              connectorMotion: {
                playDurationMs: params.c4Literal.loadingBar.playDurationMs,
                restProgress: params.c4Literal.loadingBar.restProgress,
                headLength: params.c4Literal.loadingBar.headLength,
                glowStrength: params.c4Literal.loadingBar.glowStrength,
                destinationFlash: params.c4Literal.loadingBar.destinationFlash,
              },
              phaseSurface: {
                activeLift: params.c4Literal.phaseSurfaces.activeLift,
                nextGlow: params.c4Literal.phaseSurfaces.nextGlow,
                foundationalContrast: params.c4Literal.phaseSurfaces.foundationalContrast,
                reactiveContrast: params.c4Literal.phaseSurfaces.reactiveContrast,
              },
            }
          : preserved.c4Literal,
    })
  }, [activeVariant, params])

  useEffect(() => {
    const serialized = JSON.stringify(nextTuning)
    if (serialized === lastSerializedRef.current) {
      return
    }

    lastSerializedRef.current = serialized
    latestTuningRef.current = nextTuning
    onTuningChange(nextTuning)
  }, [nextTuning, onTuningChange])

  return <DialRoot position={position} />
}
