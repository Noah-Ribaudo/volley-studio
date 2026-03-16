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
    shader: 'none',
  },
  machined: {
    panelBackground: 'linear-gradient(180deg,rgba(224,224,220,0.98)_0%,rgba(169,166,159,0.98)_100%)',
    panelBorder: 'rgba(106,105,101,0.44)',
    panelShadow: '0 18px 32px rgba(43,43,41,0.2), inset 0 1px 0 rgba(255,255,255,0.86), inset 0 -10px 18px rgba(88,86,80,0.12)',
    frameBackground: 'linear-gradient(180deg,rgba(79,82,88,0.32)_0%,rgba(170,171,170,0.12)_100%)',
    frameBorder: 'rgba(92,96,98,0.34)',
    dividerColor: 'rgba(125,126,129,0.44)',
    cutoutBackground:
      'radial-gradient(circle at 50% 50%, rgba(164,166,170,0.92) 0%, rgba(186,187,189,0.98) 55%, rgba(218,220,222,0.98) 100%)',
    cutoutShadow: 'inset 0 1px 0 rgba(255,255,255,0.74), inset 0 -12px 16px rgba(83,84,85,0.18), 0 1px 0 rgba(255,255,255,0.32)',
    tileInactiveBackground: 'linear-gradient(180deg,rgba(246,247,248,0.96)_0%,rgba(196,199,202,0.98)_100%)',
    tileActiveBackground: 'linear-gradient(180deg,rgba(216,219,222,0.98)_0%,rgba(153,156,160,0.98)_100%)',
    tileInactiveBorder: 'rgba(111,115,120,0.42)',
    tileActiveBorder: 'rgba(87,93,97,0.72)',
    tileInactiveText: 'rgba(39,45,50,0.94)',
    tileActiveText: 'rgba(21,26,31,0.98)',
    tileInactiveShadow: 'inset 0 1px 0 rgba(255,255,255,0.86), inset 0 -2px 0 rgba(66,72,77,0.18), 0 10px 16px rgba(44,48,52,0.22), 0 18px 26px -18px rgba(0,0,0,0.42)',
    tileActiveShadow: 'inset 0 1px 0 rgba(255,255,255,0.42), inset 0 9px 16px rgba(89,95,99,0.2), inset 0 -4px 6px rgba(44,48,52,0.24), 0 3px 5px rgba(25,29,32,0.18), 0 0 16px rgba(255,173,75,0.14)',
    labelShadow: '0 1px 0 rgba(255,255,255,0.5)',
    backlightInactive: 'radial-gradient(circle at 50% 100%, rgba(255,184,84,0.06) 0%, transparent 64%)',
    backlightActive: 'radial-gradient(circle at 50% 100%, rgba(255,170,58,0.26) 0%, rgba(255,146,38,0.14) 42%, transparent 76%)',
    topGloss: 'linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(255,255,255,0.22)_42%,transparent_100%)',
    shader: 'paper-texture',
  },
  backlit: {
    panelBackground: 'linear-gradient(180deg,rgba(244,235,216,0.98)_0%,rgba(193,167,124,0.98)_100%)',
    panelBorder: 'rgba(150,110,52,0.46)',
    panelShadow: '0 20px 36px rgba(105,71,24,0.2), inset 0 1px 0 rgba(255,251,241,0.88), inset 0 -12px 22px rgba(131,92,38,0.14)',
    frameBackground: 'linear-gradient(180deg,rgba(119,85,39,0.28)_0%,rgba(255,188,89,0.1)_100%)',
    frameBorder: 'rgba(161,118,52,0.3)',
    dividerColor: 'rgba(177,138,71,0.34)',
    cutoutBackground:
      'radial-gradient(circle at 50% 50%, rgba(215,176,111,0.9) 0%, rgba(225,190,130,0.98) 50%, rgba(243,221,185,0.98) 100%)',
    cutoutShadow: 'inset 0 1px 0 rgba(255,248,232,0.72), inset 0 -12px 18px rgba(132,83,28,0.15), 0 0 18px rgba(255,176,75,0.16)',
    tileInactiveBackground: 'linear-gradient(180deg,rgba(255,251,245,0.72)_0%,rgba(255,239,211,0.66)_100%)',
    tileActiveBackground: 'linear-gradient(180deg,rgba(255,238,204,0.92)_0%,rgba(255,205,132,0.82)_100%)',
    tileInactiveBorder: 'rgba(166,128,68,0.34)',
    tileActiveBorder: 'rgba(169,111,39,0.74)',
    tileInactiveText: 'rgba(81,54,22,0.94)',
    tileActiveText: 'rgba(69,40,9,0.98)',
    tileInactiveShadow: 'inset 0 1px 0 rgba(255,255,255,0.54), inset 0 -2px 0 rgba(149,97,31,0.14), 0 8px 16px rgba(127,85,29,0.18), 0 0 24px rgba(255,190,95,0.08)',
    tileActiveShadow: 'inset 0 1px 0 rgba(255,249,238,0.46), inset 0 10px 16px rgba(255,200,115,0.18), inset 0 -5px 7px rgba(162,101,22,0.18), 0 4px 7px rgba(108,60,12,0.16), 0 0 26px rgba(255,166,44,0.3)',
    labelShadow: '0 1px 0 rgba(255,247,230,0.62)',
    backlightInactive: 'radial-gradient(circle at 50% 88%, rgba(255,198,102,0.16) 0%, rgba(255,172,74,0.06) 42%, transparent 76%)',
    backlightActive: 'radial-gradient(circle at 50% 88%, rgba(255,198,93,0.52) 0%, rgba(255,161,49,0.26) 42%, transparent 76%)',
    topGloss: 'linear-gradient(180deg,rgba(255,252,247,0.44)_0%,rgba(255,252,247,0.08)_44%,transparent_100%)',
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
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            background: isActive ? theme.backlightActive : theme.backlightInactive,
            opacity: isActive ? 1 : 0.9,
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
        className="rounded-[22px] border p-2"
        style={{
          background: theme.panelBackground,
          borderColor: theme.panelBorder,
          boxShadow: theme.panelShadow,
        }}
      >
        <PhasePadRotationRail {...props} />

        <div className="relative overflow-visible rounded-[18px] p-[10px]">
          <div
            className="relative z-[1] rounded-[14px] border"
            style={{
              padding: `${lanePadding}px`,
              background: theme.frameBackground,
              borderColor: theme.frameBorder,
            }}
          >
            <PhasePadHardwareLane
              tuning={hardwareTuning}
              segmentStart={perimeterState.segmentStart}
              segmentLength={perimeterState.segmentLength}
              totalLights={perimeterState.totalLights}
            />

            <div
              className="relative z-[1] grid grid-cols-2 gap-px overflow-hidden rounded-[16px]"
              style={{ background: theme.dividerColor }}
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
