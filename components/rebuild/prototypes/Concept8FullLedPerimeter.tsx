'use client'

import dynamic from 'next/dynamic'
import { useState, type ComponentType } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { CorePhase, PrototypePhase, PrototypeVariantId } from '@/lib/rebuild/prototypeFlow'
import type { PrototypeControlProps } from './types'
import {
  PHASE_PAD_LAYOUT,
  PhasePadHardwareLane,
  PhasePadJoystick,
  PhasePadRotationRail,
  useQuarterTrackTravelState,
} from './PhasePadShared'

const C8_PHASE_ORDER: CorePhase[] = ['DEFENSE', 'OFFENSE', 'RECEIVE', 'SERVE']
const PHASE_PAD_JOYSTICK_FRAME_SIZE = 92

type SurfaceShaderId = 'fluted-glass' | 'paper-texture' | 'none'

type PhasePadVisualTheme = {
  panelBackground: string
  panelBorder: string
  panelShadow: string
  frameBackground: string
  frameBorder: string
  dividerColor: string
  dividerInset?: string
  cutoutBackground: string
  cutoutShadow: string
  tileInactiveBackground: string
  tileActiveBackground: string
  tileInactiveBorder: string
  tileActiveBorder: string
  tileInactiveText: string
  tileActiveText: string
  tileInactiveShadow: string
  tileActiveShadow: string
  labelShadow: string
  backlightInactive: string
  backlightActive: string
  topGloss: string
  panelRadius: string
  frameRadius: string
  tileRadius: string
  tileClipPath?: string
  tileInsetStroke?: string
  shader: SurfaceShaderId
}

function lazyShader(name: string): ComponentType<any> {
  return dynamic(
    () =>
      import('@paper-design/shaders-react').then((m) => ({
        default: (m as unknown as Record<string, ComponentType<any>>)[name],
      })),
    { ssr: false }
  )
}

const LazyFlutedGlass = lazyShader('FlutedGlass')
const LazyPaperTexture = lazyShader('PaperTexture')

const PHASE_PAD_VARIANT_THEMES: Record<PrototypeVariantId, PhasePadVisualTheme> = {
  clean: {
    panelBackground: 'linear-gradient(180deg,rgba(235,228,214,0.98)_0%,rgba(208,193,168,0.98)_100%)',
    panelBorder: 'rgba(172,149,115,0.42)',
    panelShadow: '0 16px 30px rgba(128,102,72,0.16), inset 0 1px 0 rgba(255,249,240,0.8)',
    frameBackground: 'linear-gradient(180deg,rgba(108,91,67,0.24)_0%,rgba(162,139,106,0.14)_100%)',
    frameBorder: 'rgba(159,132,96,0.28)',
    dividerColor: 'rgba(187,164,131,0.34)',
    cutoutBackground:
      'radial-gradient(circle at 50% 50%, rgba(206,186,153,0.84) 0%, rgba(216,197,166,0.96) 56%, rgba(229,214,188,0.98) 100%)',
    cutoutShadow: 'inset 0 1px 0 rgba(255,248,235,0.64), inset 0 -9px 12px rgba(141,112,76,0.12), 0 1px 0 rgba(255,247,231,0.42)',
    tileInactiveBackground: 'linear-gradient(180deg,rgba(247,242,232,0.98)_0%,rgba(227,216,196,0.98)_100%)',
    tileActiveBackground: 'linear-gradient(180deg,rgba(224,212,191,0.98)_0%,rgba(194,177,149,0.98)_100%)',
    tileInactiveBorder: 'rgba(171,145,108,0.34)',
    tileActiveBorder: 'rgba(153,122,85,0.6)',
    tileInactiveText: 'rgba(53,46,36,0.92)',
    tileActiveText: 'rgba(29,24,18,0.98)',
    tileInactiveShadow: 'inset 0 1px 0 rgba(255,248,236,0.84), inset 0 -1px 0 rgba(122,95,62,0.16), 0 8px 14px rgba(121,94,63,0.16), 0 16px 24px -18px rgba(56,43,28,0.34)',
    tileActiveShadow: 'inset 0 1px 0 rgba(255,247,233,0.6), inset 0 8px 12px rgba(123,95,61,0.18), inset 0 -6px 8px rgba(88,67,43,0.16), 0 3px 6px rgba(73,53,31,0.14)',
    labelShadow: '0 1px 0 rgba(255,248,238,0.62)',
    backlightInactive: 'radial-gradient(circle at 50% 90%, rgba(255,187,88,0.08) 0%, transparent 58%)',
    backlightActive: 'radial-gradient(circle at 50% 90%, rgba(255,170,60,0.34) 0%, rgba(255,149,54,0.16) 38%, transparent 72%)',
    topGloss: 'linear-gradient(180deg,rgba(255,252,246,0.76)_0%,rgba(255,252,246,0.16)_46%,transparent_100%)',
    panelRadius: '22px',
    frameRadius: '16px',
    tileRadius: '16px',
    tileInsetStroke: 'inset 0 0 0 1px rgba(255,249,239,0.24)',
    shader: 'none',
  },
  machined: {
    panelBackground: 'linear-gradient(180deg,rgba(69,74,78,0.98)_0%,rgba(28,32,36,0.98)_100%)',
    panelBorder: 'rgba(126,133,138,0.34)',
    panelShadow: '0 22px 38px rgba(3,5,7,0.36), inset 0 1px 0 rgba(218,223,228,0.28), inset 0 -18px 28px rgba(0,0,0,0.24)',
    frameBackground: 'linear-gradient(180deg,rgba(117,123,128,0.22)_0%,rgba(22,26,29,0.38)_100%)',
    frameBorder: 'rgba(145,151,156,0.28)',
    dividerColor: 'rgba(86,92,97,0.7)',
    dividerInset: '0 0 0 1px rgba(205,212,219,0.08)',
    cutoutBackground:
      'radial-gradient(circle at 50% 50%, rgba(69,76,82,0.96) 0%, rgba(92,98,104,0.98) 52%, rgba(130,137,142,0.96) 100%)',
    cutoutShadow: 'inset 0 1px 0 rgba(214,220,226,0.18), inset 0 -14px 20px rgba(0,0,0,0.32), 0 1px 0 rgba(255,255,255,0.06)',
    tileInactiveBackground: 'linear-gradient(180deg,rgba(201,205,209,0.98)_0%,rgba(106,112,118,0.98)_100%)',
    tileActiveBackground: 'linear-gradient(180deg,rgba(161,168,174,0.98)_0%,rgba(77,84,89,0.98)_100%)',
    tileInactiveBorder: 'rgba(216,223,229,0.22)',
    tileActiveBorder: 'rgba(255,177,84,0.78)',
    tileInactiveText: 'rgba(246,248,250,0.94)',
    tileActiveText: 'rgba(255,247,235,0.98)',
    tileInactiveShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -4px 0 rgba(0,0,0,0.28), 0 12px 18px rgba(0,0,0,0.26), 0 18px 26px -20px rgba(0,0,0,0.6)',
    tileActiveShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 12px 18px rgba(255,255,255,0.06), inset 0 -6px 8px rgba(0,0,0,0.34), 0 5px 8px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,184,92,0.24), 0 0 22px rgba(255,173,75,0.12)',
    labelShadow: '0 1px 0 rgba(0,0,0,0.3)',
    backlightInactive: 'radial-gradient(circle at 50% 100%, rgba(255,184,84,0.06) 0%, transparent 64%)',
    backlightActive: 'radial-gradient(circle at 50% 100%, rgba(255,170,58,0.26) 0%, rgba(255,146,38,0.14) 42%, transparent 76%)',
    topGloss: 'linear-gradient(180deg,rgba(255,255,255,0.26)_0%,rgba(255,255,255,0.04)_32%,transparent_100%)',
    panelRadius: '14px',
    frameRadius: '10px',
    tileRadius: '6px',
    tileClipPath: 'polygon(9% 0%, 91% 0%, 100% 14%, 100% 86%, 91% 100%, 9% 100%, 0% 86%, 0% 14%)',
    tileInsetStroke: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
    shader: 'paper-texture',
  },
  backlit: {
    panelBackground: 'linear-gradient(180deg,rgba(46,26,10,0.98)_0%,rgba(17,9,3,0.98)_100%)',
    panelBorder: 'rgba(255,186,88,0.24)',
    panelShadow: '0 24px 40px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,218,154,0.18), inset 0 -22px 28px rgba(0,0,0,0.28), 0 0 42px rgba(255,154,38,0.06)',
    frameBackground: 'linear-gradient(180deg,rgba(110,60,16,0.2)_0%,rgba(20,11,5,0.42)_100%)',
    frameBorder: 'rgba(255,176,74,0.16)',
    dividerColor: 'rgba(86,46,16,0.72)',
    dividerInset: '0 0 0 1px rgba(255,188,89,0.08)',
    cutoutBackground:
      'radial-gradient(circle at 50% 50%, rgba(95,52,15,0.96) 0%, rgba(132,77,24,0.98) 50%, rgba(179,116,42,0.88) 100%)',
    cutoutShadow: 'inset 0 1px 0 rgba(255,204,126,0.18), inset 0 -16px 20px rgba(0,0,0,0.24), 0 0 28px rgba(255,154,38,0.18)',
    tileInactiveBackground: 'linear-gradient(180deg,rgba(255,206,131,0.2)_0%,rgba(255,159,49,0.08)_100%)',
    tileActiveBackground: 'linear-gradient(180deg,rgba(255,227,177,0.34)_0%,rgba(255,173,65,0.22)_100%)',
    tileInactiveBorder: 'rgba(255,191,96,0.22)',
    tileActiveBorder: 'rgba(255,206,131,0.58)',
    tileInactiveText: 'rgba(255,220,173,0.92)',
    tileActiveText: 'rgba(255,242,222,0.98)',
    tileInactiveShadow: 'inset 0 1px 0 rgba(255,235,204,0.18), inset 0 -1px 0 rgba(0,0,0,0.2), 0 10px 22px rgba(0,0,0,0.18), 0 0 28px rgba(255,157,46,0.08)',
    tileActiveShadow: 'inset 0 1px 0 rgba(255,243,224,0.24), inset 0 0 0 1px rgba(255,213,145,0.18), 0 10px 26px rgba(0,0,0,0.18), 0 0 34px rgba(255,165,48,0.28), 0 0 10px rgba(255,214,141,0.24)',
    labelShadow: '0 0 16px rgba(255,190,92,0.32)',
    backlightInactive: 'radial-gradient(circle at 50% 50%, rgba(255,191,96,0.16) 0%, rgba(255,146,38,0.04) 44%, transparent 76%)',
    backlightActive: 'radial-gradient(circle at 50% 50%, rgba(255,210,138,0.56) 0%, rgba(255,170,54,0.26) 44%, transparent 78%)',
    topGloss: 'linear-gradient(180deg,rgba(255,243,224,0.16)_0%,rgba(255,243,224,0.02)_30%,transparent_100%)',
    panelRadius: '24px',
    frameRadius: '20px',
    tileRadius: '999px',
    tileInsetStroke: 'inset 0 0 0 1px rgba(255,211,140,0.08)',
    shader: 'none',
  },
  glass: {
    panelBackground: 'linear-gradient(180deg,rgba(227,233,238,0.94)_0%,rgba(173,183,193,0.94)_100%)',
    panelBorder: 'rgba(107,125,145,0.38)',
    panelShadow: '0 20px 34px rgba(49,65,85,0.18), inset 0 1px 0 rgba(255,255,255,0.68), inset 0 -18px 24px rgba(87,109,131,0.14)',
    frameBackground: 'linear-gradient(180deg,rgba(96,112,131,0.24)_0%,rgba(216,231,244,0.08)_100%)',
    frameBorder: 'rgba(122,140,160,0.28)',
    dividerColor: 'rgba(144,161,178,0.3)',
    cutoutBackground:
      'radial-gradient(circle at 50% 50%, rgba(178,194,208,0.72) 0%, rgba(197,209,221,0.88) 52%, rgba(229,236,244,0.94) 100%)',
    cutoutShadow: 'inset 0 1px 0 rgba(255,255,255,0.54), inset 0 -12px 18px rgba(79,102,125,0.14), 0 0 20px rgba(181,214,255,0.14)',
    tileInactiveBackground: 'linear-gradient(180deg,rgba(255,255,255,0.34)_0%,rgba(235,243,249,0.22)_100%)',
    tileActiveBackground: 'linear-gradient(180deg,rgba(255,255,255,0.46)_0%,rgba(215,231,245,0.3)_100%)',
    tileInactiveBorder: 'rgba(143,167,191,0.38)',
    tileActiveBorder: 'rgba(170,208,236,0.68)',
    tileInactiveText: 'rgba(31,51,71,0.94)',
    tileActiveText: 'rgba(12,27,43,0.98)',
    tileInactiveShadow: 'inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -2px 0 rgba(84,110,138,0.12), 0 10px 18px rgba(74,95,117,0.14), 0 0 18px rgba(184,226,255,0.08)',
    tileActiveShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 10px 18px rgba(191,226,255,0.12), inset 0 -5px 8px rgba(59,83,107,0.16), 0 4px 10px rgba(41,64,87,0.14), 0 0 28px rgba(172,225,255,0.22)',
    labelShadow: '0 1px 0 rgba(255,255,255,0.42)',
    backlightInactive: 'radial-gradient(circle at 50% 88%, rgba(156,220,255,0.08) 0%, transparent 72%)',
    backlightActive: 'radial-gradient(circle at 50% 88%, rgba(170,232,255,0.22) 0%, rgba(143,210,255,0.1) 42%, transparent 78%)',
    topGloss: 'linear-gradient(180deg,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.06)_38%,transparent_100%)',
    panelRadius: '30px',
    frameRadius: '26px',
    tileRadius: '26px',
    tileInsetStroke: 'inset 0 0 0 1px rgba(255,255,255,0.16)',
    shader: 'fluted-glass',
  },
}

function getInnerCornerPosition(row: 'top' | 'bottom', column: 'left' | 'right', cutoutDiameter: number) {
  return {
    top: row === 'top' ? 'auto' : `${cutoutDiameter / -2}px`,
    bottom: row === 'top' ? `${cutoutDiameter / -2}px` : 'auto',
    left: column === 'left' ? 'auto' : `${cutoutDiameter / -2}px`,
    right: column === 'left' ? `${cutoutDiameter / -2}px` : 'auto',
  }
}

function PhaseTileShader({
  shader,
  isActive,
}: {
  shader: SurfaceShaderId
  isActive: boolean
}) {
  if (shader === 'paper-texture') {
    return (
      <div className="pointer-events-none absolute inset-[1px] rounded-[inherit] overflow-hidden opacity-75 mix-blend-multiply">
        <LazyPaperTexture
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
          colorBack={isActive ? '#aeb4bb' : '#dce1e6'}
          colorFront={isActive ? '#5f676f' : '#8b949c'}
          scale={1.3}
          speed={0.15}
          seed={4}
        />
      </div>
    )
  }

  if (shader === 'fluted-glass') {
    return (
      <div className="pointer-events-none absolute inset-[1px] rounded-[inherit] overflow-hidden opacity-90 mix-blend-screen">
        <LazyFlutedGlass
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
          colorHighlight={isActive ? '#dff6ff' : '#f3fbff'}
          colorShadow={isActive ? '#5f7d97' : '#87a8c0'}
          speed={0.12}
          distortion={0.12}
          scale={1.1}
        />
      </div>
    )
  }

  return null
}

function PhaseAreaTile({
  phase,
  label,
  isActive,
  row,
  column,
  cutoutDiameter,
  variantId,
  switchMotion,
  onManualPhaseSelect,
}: {
  phase: CorePhase
  label: string
  isActive: boolean
  row: 'top' | 'bottom'
  column: 'left' | 'right'
  cutoutDiameter: number
  variantId: PrototypeVariantId
  switchMotion: PrototypeControlProps['switchMotion']
  onManualPhaseSelect: (phase: PrototypePhase) => void
}) {
  const prefersReducedMotion = useReducedMotion()
  const [isPressed, setIsPressed] = useState(false)
  const theme = PHASE_PAD_VARIANT_THEMES[variantId]
  const transition = prefersReducedMotion
    ? { duration: 0.001 }
    : {
        type: 'spring' as const,
        stiffness: switchMotion.spring.stiffness,
        damping: switchMotion.spring.damping,
        mass: switchMotion.spring.mass,
      }

  return (
    <button
      type="button"
      onClick={() => onManualPhaseSelect(phase)}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerCancel={() => setIsPressed(false)}
      onPointerLeave={() => setIsPressed(false)}
      aria-pressed={isActive}
      className="relative rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <motion.div
        animate={{
          scale: isPressed && !isActive ? 0.988 : isActive ? 0.982 : 1,
          y: isPressed || isActive ? switchMotion.pressTravel : 0,
        }}
        transition={transition}
        className="relative flex min-h-[5.2rem] items-center justify-center border px-3 py-3 text-center transition-colors"
        style={{
          ['--lab-switch-knob-glow' as string]: switchMotion.knobGlow,
          background: isActive ? theme.tileActiveBackground : theme.tileInactiveBackground,
          borderColor: isActive ? theme.tileActiveBorder : theme.tileInactiveBorder,
          boxShadow: isActive ? theme.tileActiveShadow : theme.tileInactiveShadow,
          color: isActive ? theme.tileActiveText : theme.tileInactiveText,
          backdropFilter: variantId === 'glass' ? 'blur(10px) saturate(1.08)' : variantId === 'backlit' ? 'blur(8px)' : undefined,
          borderRadius: theme.tileRadius,
          clipPath: theme.tileClipPath,
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            background: isActive ? theme.backlightActive : theme.backlightInactive,
            opacity: isActive ? 1 : 0.9,
            boxShadow: theme.tileInsetStroke,
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-[10px] top-0 h-[38%] rounded-t-[inherit]"
          style={{ background: theme.topGloss }}
        />
        <PhaseTileShader shader={theme.shader} isActive={isActive} />
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            width: `${cutoutDiameter}px`,
            height: `${cutoutDiameter}px`,
            ...getInnerCornerPosition(row, column, cutoutDiameter),
            background: theme.cutoutBackground,
            boxShadow: theme.cutoutShadow,
          }}
        />
        <span
          className="relative z-[1] text-[1.02rem] font-semibold tracking-[-0.02em]"
          style={{
            textShadow: theme.labelShadow,
            opacity: isActive ? 1 : 0.96,
          }}
        >
          {label}
        </span>
      </motion.div>
    </button>
  )
}

export function Concept8FullLedPerimeter(props: PrototypeControlProps) {
  const hardwareTuning = props.tactileTuning.phasePadHardware
  const theme = PHASE_PAD_VARIANT_THEMES[props.variantId]
  const lanePadding = Math.max(8, hardwareTuning.trackWidth + 4.5)
  const perimeterState = useQuarterTrackTravelState({
    currentCorePhase: props.displayCurrentCorePhase,
    targetCorePhase: props.displayTargetCorePhase,
    isPhaseTraveling: props.isPhaseTraveling,
    positionsPerQuarter: hardwareTuning.piecesPerQuarter,
    phaseOrder: C8_PHASE_ORDER,
    travelDurationMs: props.tactileTuning.c4Literal.connectorMotion.playDurationMs,
  })
  const activeDisplayPhase = props.isPhaseTraveling ? props.displayTargetCorePhase : props.displayCurrentCorePhase
  const offenseLabel = props.currentCorePhase === 'FIRST_ATTACK' ? '1st Attack' : 'Attack'
  const shellRadius = (PHASE_PAD_JOYSTICK_FRAME_SIZE * props.tactileTuning.joystick.shellScale) / 2
  const cutoutRadius = Math.max(0, shellRadius + props.tactileTuning.joystick.shellCutoutPadding)
  const cutoutDiameter = cutoutRadius * 2

  return (
    <div className="flex w-full flex-col justify-end">
      <div
        className="border p-2"
        style={{
          background: theme.panelBackground,
          borderColor: theme.panelBorder,
          boxShadow: theme.panelShadow,
          borderRadius: theme.panelRadius,
        }}
      >
        <PhasePadRotationRail {...props} />

        <div className="relative overflow-visible rounded-[18px] p-[10px]">
          <div
            className="relative z-[1] border"
            style={{
              padding: `${lanePadding}px`,
              background: theme.frameBackground,
              borderColor: theme.frameBorder,
              borderRadius: theme.frameRadius,
            }}
          >
            <PhasePadHardwareLane
              tuning={hardwareTuning}
              segmentStart={perimeterState.segmentStart}
              segmentLength={perimeterState.segmentLength}
              totalLights={perimeterState.totalLights}
            />

            <div
              className="relative z-[1] grid grid-cols-2 gap-px overflow-hidden"
              style={{ background: theme.dividerColor, borderRadius: theme.frameRadius, boxShadow: theme.dividerInset }}
            >
              {PHASE_PAD_LAYOUT.map((item) => (
                <PhaseAreaTile
                  key={item.phase}
                  phase={item.phase}
                  label={item.phase === 'OFFENSE' ? offenseLabel : item.label}
                  isActive={item.phase === activeDisplayPhase}
                  row={item.row}
                  column={item.column}
                  cutoutDiameter={cutoutDiameter}
                  variantId={props.variantId}
                  switchMotion={props.switchMotion}
                  onManualPhaseSelect={props.onManualPhaseSelect}
                />
              ))}
            </div>
          </div>

          <PhasePadJoystick props={props} />
        </div>
      </div>
    </div>
  )
}
