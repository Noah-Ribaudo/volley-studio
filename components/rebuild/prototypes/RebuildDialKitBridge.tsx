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
  'resetArrowTags',
])
const DIALKIT_SCHEMA_VERSION = 2

export function RebuildDialKitBridge({
  activeVariant,
  onTuningChange,
  position = 'top-right',
}: RebuildDialKitBridgeProps) {
  const defaultHardware = DEFAULT_TACTILE_TUNING.phasePadHardware
  const usesPhasePadHardware =
    activeVariant === 'rubber' ||
    activeVariant === 'soft'
  const usesLegacyClusterControls = false
  const [seed, setSeed] = useState<TactileTuning>(DEFAULT_TACTILE_TUNING)
  const [panelVersion, setPanelVersion] = useState(1)
  const latestTuningRef = useRef<TactileTuning>(DEFAULT_TACTILE_TUNING)
  const lastSerializedRef = useRef<string>(JSON.stringify(DEFAULT_TACTILE_TUNING))

  const panelName = useMemo(
    () => `Rebuild Tactile Lab ${DIALKIT_SCHEMA_VERSION}.${panelVersion}`,
    [panelVersion]
  )

  const params = useDialKit(
    panelName,
    {
      globalLight: {
        lightAngle: [seed.lighting.lightAngle, 0, 90],
        keyStrength: [seed.lighting.keyStrength, 0, 1.2],
        fillStrength: [seed.lighting.fillStrength, 0, 1.2],
        shadowSoft: [seed.lighting.shadowSoft, 0, 1],
        shadowDeep: [seed.lighting.shadowDeep, 0, 1],
        pressDepth: [seed.lighting.pressDepth, 0, 12],
        edgeContrast: [seed.lighting.edgeContrast, 0, 1],
        textureStrength: [seed.lighting.textureStrength, 0, 0.12],
      },
      pressFeel: {
        _collapsed: true,
        spring: {
          type: 'spring',
          __mode: 'advanced',
          stiffness: seed.switchMotion.spring.stiffness,
          damping: seed.switchMotion.spring.damping,
          mass: seed.switchMotion.spring.mass,
        },
        pressTravel: [seed.switchMotion.pressTravel, 0, 12],
        knobGlow: [seed.switchMotion.knobGlow, 0, 1.2],
      },
      joystick: {
        _collapsed: true,
        travel: [seed.joystick.travel, 6, 52],
        deadZone: [seed.joystick.deadZone, 0, 42],
        autoNudgeDistance: [seed.joystick.autoNudgeDistance, 0, 24],
        autoNudgeHoldMs: [seed.joystick.autoNudgeHoldMs, 40, 360],
        haloIntensity: [seed.joystick.haloIntensity, 0, 2],
        scale: [seed.joystick.scale, 0.65, 1.5],
        shellCutoutPadding: [seed.joystick.shellCutoutPadding, -8, 24],
        baseScale: [seed.joystick.baseScale, 0.5, 1.8],
        baseLightness: [seed.joystick.baseLightness, 0.1, 1.2],
        highlightIntensity: [seed.joystick.highlightIntensity, 0, 1],
        whiteRingOpacity: [seed.joystick.whiteRingOpacity, 0, 1],
        showKnobBorderRing: seed.joystick.showKnobBorderRing,
        offsetTexture: seed.joystick.offsetTexture,
        ringTextureScale: [seed.joystick.ringTextureScale, 3, 12],
        ringTextureSpacingX: [seed.joystick.ringTextureSpacingX, 3, 16],
        ringTextureSpacingY: [seed.joystick.ringTextureSpacingY, 3, 16],
        ringTextureOpacity: [seed.joystick.ringTextureOpacity, 0, 1],
        ringTextureDepth: [seed.joystick.ringTextureDepth, 0, 1],
        settleSpring: {
          type: 'spring',
          __mode: 'advanced',
          stiffness: seed.joystick.settleSpring.stiffness,
          damping: seed.joystick.settleSpring.damping,
          mass: seed.joystick.settleSpring.mass,
        },
      },
      ...(usesLegacyClusterControls
        ? {
            c4Literal: {
              clusterLayout: {
                dockHeight: [seed.c4Literal.clusterLayout.dockHeight, 176, 320],
                stageWidth: [seed.c4Literal.clusterLayout.stageWidth, 240, 420],
                stageHeight: [seed.c4Literal.clusterLayout.stageHeight, 108, 220],
                stageInset: [seed.c4Literal.clusterLayout.stageInset, 0, 28],
                phaseButtonWidth: [seed.c4Literal.clusterLayout.phaseButtonWidth, 72, 160],
                phaseButtonHeight: [seed.c4Literal.clusterLayout.phaseButtonHeight, 32, 72],
                horizontalSpread: [seed.c4Literal.clusterLayout.horizontalSpread, 0, 104],
                verticalSpread: [seed.c4Literal.clusterLayout.verticalSpread, 0, 68],
                joystickSize: [seed.c4Literal.clusterLayout.joystickSize, 56, 132],
                joystickClearance: [seed.c4Literal.clusterLayout.joystickClearance, 0, 40],
              },
              connectorPath: {
                _collapsed: true,
                horizontalInset: [seed.c4Literal.connectorGeometry.horizontalInset, 0, 72],
                joystickAvoidanceGap: [seed.c4Literal.connectorGeometry.joystickAvoidanceGap, 0, 96],
                liveLoopOffset: [seed.c4Literal.connectorGeometry.liveLoopOffset, 0, 80],
                strokeThickness: [seed.c4Literal.connectorGeometry.strokeThickness, 0.75, 8],
                idleOpacity: [seed.c4Literal.connectorGeometry.idleOpacity, 0, 1],
                activeOpacity: [seed.c4Literal.connectorGeometry.activeOpacity, 0, 1],
              },
              loadingBar: {
                playDurationMs: [seed.c4Literal.connectorMotion.playDurationMs, 180, 2400],
                restProgress: [seed.c4Literal.connectorMotion.restProgress, 0, 0.45],
                headLength: [seed.c4Literal.connectorMotion.headLength, 0.04, 0.4],
                glowStrength: [seed.c4Literal.connectorMotion.glowStrength, 0, 1.6],
                destinationFlash: [seed.c4Literal.connectorMotion.destinationFlash, 0, 1.4],
              },
              phaseSurfaces: {
                _collapsed: true,
                activeLift: [seed.c4Literal.phaseSurface.activeLift, 0, 8],
                nextGlow: [seed.c4Literal.phaseSurface.nextGlow, 0, 1.2],
                foundationalContrast: [seed.c4Literal.phaseSurface.foundationalContrast, 0, 1.2],
                reactiveContrast: [seed.c4Literal.phaseSurface.reactiveContrast, 0, 1.2],
              },
            },
            resetClusterLayout: { type: 'action', label: 'Reset Cluster Layout' },
            resetConnectorPath: { type: 'action', label: 'Reset Connector Path' },
            resetLoadingBar: { type: 'action', label: 'Reset Loading Bar' },
            resetPhaseSurfaces: { type: 'action', label: 'Reset Phase Surfaces' },
          }
        : {}),
      ...(usesPhasePadHardware
        ? {
            phasePadHardware: {
              trackWidth: [seed.phasePadHardware.trackWidth, 44, 116, 0.1],
              trackHeight: [seed.phasePadHardware.trackHeight, 44, 116, 0.1],
              trackCornerRadius: [seed.phasePadHardware.trackCornerRadius, 0, 28, 0.1],
              channelWidth: [seed.phasePadHardware.channelWidth, 0.5, 18, 0.05],
              piecesPerLongSide: [seed.phasePadHardware.piecesPerLongSide, 2, 32, 1],
              piecesPerShortSide: [seed.phasePadHardware.piecesPerShortSide, 2, 32, 1],
              pieceLengthLongSide: [seed.phasePadHardware.pieceLengthLongSide, 1, 200, 0.1],
              pieceLengthShortSide: [seed.phasePadHardware.pieceLengthShortSide, 1, 200, 0.1],
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
      arrowTags: {
        _collapsed: true,
        fontSize: [seed.arrowTags.fontSize, 8, 20],
      },
      resetLighting: { type: 'action', label: 'Reset Global Light' },
      resetPressFeel: { type: 'action', label: 'Reset Press Feel' },
      resetJoystick: { type: 'action', label: 'Reset Joystick' },
      resetArrowTags: { type: 'action', label: 'Reset Arrow Tags' },
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

        if (actionPath === 'resetArrowTags') {
          next = {
            ...latest,
            arrowTags: DEFAULT_TACTILE_TUNING.arrowTags,
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
        autoNudgeDistance: params.joystick.autoNudgeDistance,
        autoNudgeHoldMs: params.joystick.autoNudgeHoldMs,
        haloIntensity: params.joystick.haloIntensity,
        scale: params.joystick.scale,
        shellCutoutPadding: params.joystick.shellCutoutPadding,
        baseScale: params.joystick.baseScale,
        baseLightness: params.joystick.baseLightness,
        highlightIntensity: params.joystick.highlightIntensity,
        whiteRingOpacity: params.joystick.whiteRingOpacity,
        showKnobBorderRing: params.joystick.showKnobBorderRing,
        offsetTexture: params.joystick.offsetTexture,
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
      arrowTags: {
        fontSize: params.arrowTags.fontSize,
      },
      phasePadHardware:
        usesPhasePadHardware
          ? {
              trackWidth: params.phasePadHardware.trackWidth ?? defaultHardware.trackWidth,
              trackHeight: params.phasePadHardware.trackHeight ?? defaultHardware.trackHeight,
              trackCornerRadius: params.phasePadHardware.trackCornerRadius ?? defaultHardware.trackCornerRadius,
              channelWidth: params.phasePadHardware.channelWidth ?? defaultHardware.channelWidth,
              piecesPerLongSide:
                params.phasePadHardware.piecesPerLongSide ??
                params.phasePadHardware.piecesPerQuarter ??
                defaultHardware.piecesPerLongSide,
              piecesPerShortSide:
                params.phasePadHardware.piecesPerShortSide ??
                params.phasePadHardware.piecesPerQuarter ??
                defaultHardware.piecesPerShortSide,
              pieceLengthLongSide:
                params.phasePadHardware.pieceLengthLongSide ??
                params.phasePadHardware.pieceLength ??
                defaultHardware.pieceLengthLongSide,
              pieceLengthShortSide:
                params.phasePadHardware.pieceLengthShortSide ??
                params.phasePadHardware.pieceLength ??
                defaultHardware.pieceLengthShortSide,
              pieceThickness: params.phasePadHardware.pieceThickness ?? defaultHardware.pieceThickness,
              pieceRadius: params.phasePadHardware.pieceRadius ?? defaultHardware.pieceRadius,
              inactiveOpacity: params.phasePadHardware.inactiveOpacity ?? defaultHardware.inactiveOpacity,
              activeOpacity: params.phasePadHardware.activeOpacity ?? defaultHardware.activeOpacity,
              glow: params.phasePadHardware.glow ?? defaultHardware.glow,
              bloom: params.phasePadHardware.bloom ?? defaultHardware.bloom,
              channelShadow: params.phasePadHardware.channelShadow ?? defaultHardware.channelShadow,
              channelHighlight: params.phasePadHardware.channelHighlight ?? defaultHardware.channelHighlight,
            }
          : preserved.phasePadHardware,
      c4Literal:
        usesLegacyClusterControls
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
  }, [defaultHardware, params, usesLegacyClusterControls, usesPhasePadHardware])

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
