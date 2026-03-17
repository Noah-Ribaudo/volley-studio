'use client'

import dynamic from 'next/dynamic'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type MouseEvent as ReactMouseEvent,
} from 'react'
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
import { TACTILE_ACCENT_HEX, TACTILE_ACCENT_SOFT_HEX } from './tactileAccent'

const C8_PHASE_ORDER: CorePhase[] = ['SERVE', 'DEFENSE', 'OFFENSE', 'RECEIVE']
const PHASE_PAD_JOYSTICK_FRAME_SIZE = 92

type SurfaceShaderId = 'fluted-glass' | 'neuro-noise' | 'dithering' | 'voronoi' | 'waves' | 'warp' | 'none'

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
  rotationRailBg: string
  rotationRailBorder: string
  rotationRailShadow: string
  rotationRailItemBg: string
  rotationRailItemActiveBg: string
  rotationRailItemText: string
  rotationRailItemActiveText: string
  panelTexture?: string
  panelReflection?: string
  tileSpecularHighlight?: string
  tileEdgeLight?: string
  activeGlow?: string
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
const LazyNeuroNoise = lazyShader('NeuroNoise')
const LazyDithering = lazyShader('Dithering')
const LazyVoronoi = lazyShader('Voronoi')
const LazyWaves = lazyShader('Waves')
const LazyWarp = lazyShader('Warp')

/* ═══════════════════════════════════════════════════════════════════
   THEME DEFINITIONS — each theme is a completely different material
   ═══════════════════════════════════════════════════════════════════ */

const PHASE_PAD_VARIANT_THEMES: Record<PrototypeVariantId, PhasePadVisualTheme> = {
  /* ── RUBBER: Industrial silicone keypad ───────────────────────── */
  rubber: {
    panelBackground: 'linear-gradient(180deg, #2e2e32 0%, #141416 100%)',
    panelBorder: 'rgba(80,80,86,0.36)',
    panelShadow: '0 26px 46px rgba(0,0,0,0.44), inset 0 1px 0 rgba(140,140,148,0.08), inset 0 -20px 26px rgba(0,0,0,0.32)',
    frameBackground: 'linear-gradient(180deg, rgba(72,72,78,0.14) 0%, rgba(18,18,20,0.48) 100%)',
    frameBorder: 'rgba(96,96,104,0.14)',
    dividerColor: 'rgba(40,40,44,0.86)',
    dividerInset: '0 0 0 1px rgba(180,180,190,0.03)',
    cutoutBackground: 'radial-gradient(circle at 50% 50%, rgba(48,48,52,0.96) 0%, rgba(66,66,72,0.98) 48%, rgba(96,96,104,0.84) 100%)',
    cutoutShadow: 'inset 0 1px 0 rgba(140,140,148,0.08), inset 0 -16px 20px rgba(0,0,0,0.38), 0 0 16px rgba(0,0,0,0.2)',
    tileInactiveBackground: 'linear-gradient(180deg, #48484e 0%, #2a2a2e 100%)',
    tileActiveBackground: 'linear-gradient(180deg, #3a3a3e 0%, #1e1e22 100%)',
    tileInactiveBorder: 'rgba(100,100,108,0.14)',
    tileActiveBorder: 'rgba(200,155,90,0.22)',
    tileInactiveText: 'rgba(220,220,228,0.88)',
    tileActiveText: 'rgba(240,236,228,0.96)',
    tileInactiveShadow: 'inset 0 2px 0 rgba(120,120,128,0.1), inset 0 -8px 0 rgba(0,0,0,0.32), 0 14px 22px rgba(0,0,0,0.28)',
    tileActiveShadow: 'inset 0 2px 0 rgba(120,120,128,0.06), inset 0 14px 22px rgba(0,0,0,0.18), inset 0 -2px 0 rgba(0,0,0,0.48), 0 2px 4px rgba(0,0,0,0.22)',
    labelShadow: '0 1px 0 rgba(0,0,0,0.32)',
    backlightInactive: 'radial-gradient(circle at 50% 85%, rgba(255,155,70,0.06) 0%, transparent 60%)',
    backlightActive: 'radial-gradient(circle at 50% 85%, rgba(255,155,70,0.14) 0%, rgba(255,120,40,0.05) 38%, transparent 72%)',
    topGloss: 'linear-gradient(180deg, rgba(200,200,210,0.06) 0%, rgba(200,200,210,0.01) 24%, transparent 100%)',
    panelRadius: '20px',
    frameRadius: '16px',
    tileRadius: '14px',
    tileInsetStroke: 'inset 0 0 0 1px rgba(160,160,168,0.04)',
    shader: 'dithering',
    rotationRailBg: 'linear-gradient(180deg, rgba(42,42,46,0.98) 0%, rgba(26,26,28,0.98) 100%)',
    rotationRailBorder: 'rgba(80,80,86,0.22)',
    rotationRailShadow: 'inset 0 1px 0 rgba(140,140,148,0.06)',
    rotationRailItemBg: 'linear-gradient(180deg, #515156 0%, #333338 100%)',
    rotationRailItemActiveBg: 'linear-gradient(180deg, #3e3e42 0%, #2a2a2e 100%)',
    rotationRailItemText: 'rgba(180,180,188,0.48)',
    rotationRailItemActiveText: 'rgba(228,228,234,0.92)',
  },

  /* ── SOFT: Light mode rubber ───────────────────────────────────── */
  soft: {
    panelBackground: 'linear-gradient(180deg, #e8e2d8 0%, #cfc5b4 100%)',
    panelBorder: 'rgba(148,132,106,0.4)',
    panelShadow: '0 24px 44px rgba(76,60,38,0.2), inset 0 1px 0 rgba(255,255,255,0.72), inset 0 -18px 24px rgba(110,90,60,0.12)',
    frameBackground: 'linear-gradient(180deg, rgba(180,170,152,0.3) 0%, rgba(236,230,220,0.5) 100%)',
    frameBorder: 'rgba(158,142,114,0.28)',
    dividerColor: 'rgba(168,154,132,0.72)',
    dividerInset: '0 0 0 1px rgba(255,255,255,0.18)',
    cutoutBackground: 'radial-gradient(circle at 50% 50%, rgba(198,190,174,0.94) 0%, rgba(218,210,196,0.98) 48%, rgba(236,230,220,0.98) 100%)',
    cutoutShadow: 'inset 0 1px 0 rgba(255,255,255,0.78), inset 0 -14px 18px rgba(128,108,76,0.14), 0 0 18px rgba(100,78,44,0.1)',
    tileInactiveBackground: 'linear-gradient(180deg, #f2ece2 0%, #d6cabb 100%)',
    tileActiveBackground: 'linear-gradient(180deg, #cdc0ae 0%, #b0a08a 100%)',
    tileInactiveBorder: 'rgba(160,144,118,0.32)',
    tileActiveBorder: 'rgba(168,118,56,0.36)',
    tileInactiveText: 'rgba(52,40,24,0.92)',
    tileActiveText: 'rgba(36,26,12,0.96)',
    tileInactiveShadow: 'inset 0 2px 0 rgba(255,255,255,0.76), inset 0 -6px 0 rgba(136,116,84,0.18), 0 12px 20px rgba(100,80,48,0.2)',
    tileActiveShadow: 'inset 0 2px 0 rgba(255,255,255,0.44), inset 0 12px 18px rgba(255,255,255,0.12), inset 0 -2px 0 rgba(100,80,50,0.3), 0 3px 6px rgba(80,60,32,0.16)',
    labelShadow: '0 1px 0 rgba(255,255,255,0.52)',
    backlightInactive: 'radial-gradient(circle at 50% 85%, rgba(255,155,70,0.06) 0%, transparent 60%)',
    backlightActive: 'radial-gradient(circle at 50% 85%, rgba(255,145,60,0.18) 0%, rgba(255,110,30,0.07) 38%, transparent 72%)',
    topGloss: 'linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.06) 24%, transparent 100%)',
    panelRadius: '20px',
    frameRadius: '16px',
    tileRadius: '14px',
    tileInsetStroke: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
    shader: 'none',
    tileSpecularHighlight: 'linear-gradient(var(--lab-light-angle, 35deg), transparent 28%, rgba(255,255,255,0.14) 44%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0.14) 56%, transparent 72%)',
    tileEdgeLight: 'inset 1px -1px 4px rgba(255,255,255,0.28), inset -1px 1px 4px rgba(100,80,48,0.06)',
    rotationRailBg: 'linear-gradient(180deg, rgba(216,208,194,0.98) 0%, rgba(194,184,168,0.98) 100%)',
    rotationRailBorder: 'rgba(158,142,116,0.28)',
    rotationRailShadow: 'inset 0 1px 0 rgba(255,255,255,0.62)',
    rotationRailItemBg: 'linear-gradient(180deg, #f4efe6 0%, #ddd3c4 100%)',
    rotationRailItemActiveBg: 'linear-gradient(180deg, #e2d8c8 0%, #c8b8a2 100%)',
    rotationRailItemText: 'rgba(72,58,36,0.62)',
    rotationRailItemActiveText: 'rgba(56,42,22,0.94)',
  },

}

/* ═══════════════════════════════════════════════════════════════════
   RENDERING HELPERS
   ═══════════════════════════════════════════════════════════════════ */

function getInnerCornerMask(row: 'top' | 'bottom', column: 'left' | 'right', cutoutRadius: number) {
  const anchorX = column === 'left' ? '100%' : '0%'
  const anchorY = row === 'top' ? '100%' : '0%'
  const featherStart = Math.max(0, cutoutRadius - 0.5)
  const featherEnd = cutoutRadius + 0.5
  return `radial-gradient(circle at ${anchorX} ${anchorY}, transparent 0 ${featherStart}px, #000 ${featherEnd}px)`
}

function PhaseTileShader({
  shader,
  isActive,
  row,
  column,
}: {
  shader: SurfaceShaderId
  isActive: boolean
  row: 'top' | 'bottom'
  column: 'left' | 'right'
}) {
  // Per-tile offset so the 2×2 grid doesn't look like four clones
  const ri = row === 'bottom' ? 1 : 0
  const ci = column === 'right' ? 1 : 0
  const ox = ci * 0.31 + ri * 0.13
  const oy = ri * 0.47 + ci * 0.17

  if (shader === 'dithering') {
    // Machined steel — each button milled at a slightly different angle
    return (
      <div className="pointer-events-none absolute inset-[1px] overflow-hidden rounded-[inherit] opacity-60 mix-blend-multiply">
        <LazyDithering
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
          colorBack={isActive ? '#7a828a' : '#c0c6cc'}
          colorFront={isActive ? '#4a5258' : '#8a929a'}
          shape="warp"
          type="4x4"
          size={1.5}
          scale={2.4}
          speed={0.08}
          offsetX={ox}
          offsetY={oy}
          rotation={ci * 4 + ri * -3}
        />
      </div>
    )
  }

  if (shader === 'neuro-noise') {
    // Nixie tube glow — each tile is a window into the same glowing field
    return (
      <div className="pointer-events-none absolute inset-[1px] overflow-hidden rounded-[inherit] opacity-80 mix-blend-screen">
        <LazyNeuroNoise
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
          colorFront={isActive ? '#ffcc88' : '#ff9e44'}
          colorMid={isActive ? '#cc6600' : '#884400'}
          colorBack="#1a0e04"
          brightness={isActive ? 0.7 : 0.35}
          contrast={0.6}
          scale={1.6}
          speed={0.18}
          offsetX={ox}
          offsetY={oy}
        />
      </div>
    )
  }

  if (shader === 'fluted-glass') {
    // Lab glass — refraction shifted per pane
    return (
      <div className="pointer-events-none absolute inset-[1px] overflow-hidden rounded-[inherit] opacity-90 mix-blend-screen">
        <LazyFlutedGlass
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
          colorHighlight={isActive ? '#dff8ff' : '#f0faff'}
          colorShadow={isActive ? '#4a6e8a' : '#7a9eb8'}
          speed={0.14}
          distortion={0.22}
          scale={1.3}
          offsetX={ox}
          offsetY={oy}
        />
      </div>
    )
  }

  if (shader === 'voronoi') {
    // Silicone — each button is its own piece with different cell pattern
    return (
      <div className="pointer-events-none absolute inset-[1px] overflow-hidden rounded-[inherit] opacity-30 mix-blend-overlay">
        <LazyVoronoi
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
          colors={isActive ? ['#2e2e32', '#3a3a3e', '#444448'] : ['#48484e', '#54545a', '#606066']}
          colorGap={isActive ? '#1a1a1e' : '#2a2a2e'}
          scale={3.2 + (ci + ri * 2) * 0.12}
          gap={0.02}
          glow={0.15}
          speed={0.04}
          distortion={0.08}
          offsetX={ox}
          offsetY={oy}
        />
      </div>
    )
  }

  if (shader === 'waves') {
    // Scan-lines — offset vertically so lines don't align across tiles
    return (
      <div className="pointer-events-none absolute inset-[1px] overflow-hidden rounded-[inherit] opacity-40 mix-blend-multiply">
        <LazyWaves
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
          colorFront={isActive ? '#8a9eb8' : '#a4b8d0'}
          colorBack={isActive ? '#dce6ee' : '#f0f6fa'}
          shape={0}
          frequency={1.8}
          amplitude={0.06}
          spacing={0.15}
          proportion={0.4}
          softness={0.35}
          scale={4.0}
          rotation={0}
          offsetX={ox * 0.5}
          offsetY={oy}
        />
      </div>
    )
  }

  if (shader === 'warp') {
    // Nebula — each tile reveals a different part of the same cosmic field
    return (
      <div className="pointer-events-none absolute inset-[1px] overflow-hidden rounded-[inherit] opacity-65 mix-blend-screen">
        <LazyWarp
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
          colors={
            isActive
              ? ['#1a2050', '#2a3878', '#4060b0', '#2244aa', '#183060']
              : ['#101830', '#1a2448', '#2a3870', '#1a2e60', '#121e40']
          }
          shape="stripes"
          shapeScale={0.3}
          distortion={0.4}
          swirl={0.2}
          swirlIterations={6}
          softness={0.7}
          proportion={0.5}
          speed={0.06}
          scale={1.2}
          offsetX={ox}
          offsetY={oy}
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
  isPressed,
  row,
  column,
  cutoutDiameter,
  variantId,
  switchMotion,
  onPressStart,
  onPressHover,
  onKeyboardSelect,
}: {
  phase: CorePhase
  label: string
  isActive: boolean
  isPressed: boolean
  row: 'top' | 'bottom'
  column: 'left' | 'right'
  cutoutDiameter: number
  variantId: PrototypeVariantId
  switchMotion: PrototypeControlProps['switchMotion']
  onPressStart: (phase: PrototypePhase) => void
  onPressHover: (phase: PrototypePhase) => void
  onKeyboardSelect: (phase: PrototypePhase) => void
}) {
  const prefersReducedMotion = useReducedMotion()
  const theme = PHASE_PAD_VARIANT_THEMES[variantId]
  const transition = prefersReducedMotion
    ? { duration: 0.001 }
    : {
        type: 'spring' as const,
        stiffness: switchMotion.spring.stiffness,
        damping: switchMotion.spring.damping,
        mass: switchMotion.spring.mass,
      }

  const activeShadow = isActive && theme.activeGlow
    ? `${theme.tileActiveShadow}, ${theme.activeGlow}`
    : theme.tileActiveShadow
  const cutoutRadius = cutoutDiameter / 2

  return (
    <button
      type="button"
      data-phase-button={phase}
      onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
        if (event.detail !== 0) return
        onKeyboardSelect(phase)
      }}
      onMouseDown={() => {
        onPressStart(phase)
      }}
      onMouseEnter={(event: ReactMouseEvent<HTMLButtonElement>) => {
        if ((event.buttons & 1) !== 1) return
        onPressHover(phase)
      }}
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
          boxShadow: isActive ? activeShadow : theme.tileInactiveShadow,
          color: isActive ? TACTILE_ACCENT_HEX : theme.tileInactiveText,
          backdropFilter: undefined,
          borderRadius: theme.tileRadius,
          clipPath: theme.tileClipPath,
          WebkitMaskImage: getInnerCornerMask(row, column, cutoutRadius),
          maskImage: getInnerCornerMask(row, column, cutoutRadius),
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
        }}
      >
        {/* Backlight layer */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            background: isActive ? theme.backlightActive : theme.backlightInactive,
            opacity: isActive ? 1 : 0.9,
            boxShadow: theme.tileInsetStroke,
          }}
        />
        {/* Top gloss layer */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-[10px] top-0 h-[38%] rounded-t-[inherit]"
          style={{ background: theme.topGloss }}
        />
        {/* Shader layer */}
        <PhaseTileShader shader={theme.shader} isActive={isActive} row={row} column={column} />
        {/* Specular highlight — one continuous sweep across the 2×2 grid */}
        {theme.tileSpecularHighlight && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{
              background: theme.tileSpecularHighlight,
              backgroundSize: '200% 200%',
              backgroundPosition: `${column === 'left' ? '0%' : '100%'} ${row === 'top' ? '0%' : '100%'}`,
            }}
          />
        )}
        {/* Edge light — rim lighting */}
        {theme.tileEdgeLight && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{ boxShadow: theme.tileEdgeLight }}
          />
        )}
        {/* Label */}
        <span
          className="relative z-[1] tracking-[-0.02em]"
          style={{
            fontSize: variantId === 'soft' ? '1.06rem' : '1.02rem',
            fontWeight: variantId === 'soft' ? 700 : 600,
            textShadow: isActive
              ? `0 0 12px color-mix(in srgb, ${TACTILE_ACCENT_SOFT_HEX} 58%, transparent)`
              : theme.labelShadow,
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
  const lanePadding = Math.max(8, hardwareTuning.channelWidth + 4.5)
  const horizontalLong = hardwareTuning.trackWidth >= hardwareTuning.trackHeight
  const horizontalPieces = horizontalLong ? hardwareTuning.piecesPerLongSide : hardwareTuning.piecesPerShortSide
  const verticalPieces = horizontalLong ? hardwareTuning.piecesPerShortSide : hardwareTuning.piecesPerLongSide
  const piecesPerEdge = useMemo(
    () => [
      horizontalPieces,
      verticalPieces,
      horizontalPieces,
      verticalPieces,
    ],
    [horizontalPieces, verticalPieces]
  )
  const perimeterState = useQuarterTrackTravelState({
    currentCorePhase: props.displayCurrentCorePhase,
    targetCorePhase: props.displayTargetCorePhase,
    isPhaseTraveling: props.isPhaseTraveling,
    piecesPerEdge,
    phaseOrder: C8_PHASE_ORDER,
    travelDurationMs: props.tactileTuning.c4Literal.connectorMotion.playDurationMs,
  })
  const activeDisplayPhase = props.isPhaseTraveling ? props.displayTargetCorePhase : props.displayCurrentCorePhase
  const offenseLabel = props.currentCorePhase === 'FIRST_ATTACK' ? '1st Attack' : 'Attack'
  const baseRadius = (PHASE_PAD_JOYSTICK_FRAME_SIZE / 2) * props.tactileTuning.joystick.baseScale
  const cutoutRadius = Math.max(0, baseRadius + props.tactileTuning.joystick.shellCutoutPadding)
  const cutoutDiameter = cutoutRadius * 2
  const [pressedPhase, setPressedPhase] = useState<PrototypePhase | null>(null)
  const isPhasePressingRef = useRef(false)
  const getPhaseAtPoint = useCallback((clientX: number, clientY: number): PrototypePhase | null => {
    const hovered = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLButtonElement>('[data-phase-button]')

    return (hovered?.dataset.phaseButton as PrototypePhase | undefined) ?? null
  }, [])

  const clearPhasePress = useCallback((cancelNudge: boolean) => {
    if (!isPhasePressingRef.current && !pressedPhase) return
    isPhasePressingRef.current = false
    setPressedPhase(null)
    if (cancelNudge) {
      props.onManualPhaseCancel()
    }
  }, [pressedPhase, props])

  useEffect(() => {
    if (!pressedPhase) return

    const handleWindowMouseUp = () => {
      clearPhasePress(true)
    }

    window.addEventListener('mouseup', handleWindowMouseUp)

    return () => {
      window.removeEventListener('mouseup', handleWindowMouseUp)
    }
  }, [clearPhasePress, pressedPhase])

  return (
    <div className="flex w-full flex-col justify-end">
      <div
        className="relative overflow-hidden border p-2"
        style={{
          background: theme.panelBackground,
          borderColor: theme.panelBorder,
          boxShadow: theme.panelShadow,
          borderRadius: theme.panelRadius,
        }}
      >
        {/* Panel texture overlay */}
        {theme.panelTexture && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[0] rounded-[inherit]"
            style={{ background: theme.panelTexture }}
          />
        )}
        {/* Panel reflection/sheen overlay */}
        {theme.panelReflection && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[0] rounded-[inherit]"
            style={{ background: theme.panelReflection }}
          />
        )}

        <div className="relative z-[1]">
          <PhasePadRotationRail
            {...props}
            railStyle={{
              background: theme.rotationRailBg,
              borderColor: theme.rotationRailBorder,
              boxShadow: theme.rotationRailShadow,
            }}
            railItemColors={{
              bg: theme.rotationRailItemBg,
              activeBg: theme.rotationRailItemActiveBg,
              text: theme.rotationRailItemText,
              activeText: theme.rotationRailItemActiveText,
            }}
          />

          <div className="relative overflow-visible rounded-[18px] p-[10px]">
            <div
              className="relative z-[1]"
              style={{ padding: `${lanePadding}px` }}
            >
              <PhasePadHardwareLane
                tuning={hardwareTuning}
                lightAngle={props.tactileTuning.lighting.lightAngle}
                segmentStart={perimeterState.segmentStart}
                segmentLength={perimeterState.segmentLength}
                totalLights={perimeterState.totalLights}
              />

              <div
                className="relative z-[1] grid grid-cols-2 gap-px overflow-visible"
                style={{ background: theme.dividerColor, borderRadius: theme.frameRadius, boxShadow: theme.dividerInset }}
                onMouseLeave={(event: ReactMouseEvent<HTMLDivElement>) => {
                  if (!isPhasePressingRef.current) return

                  const nextTarget = event.relatedTarget
                  if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
                    return
                  }

                  clearPhasePress(true)
                }}
                onMouseUp={(event: ReactMouseEvent<HTMLDivElement>) => {
                  if (!isPhasePressingRef.current) return

                  const phase = getPhaseAtPoint(event.clientX, event.clientY)

                  if (phase) {
                    props.onManualPhaseSelect(phase)
                  } else {
                    props.onManualPhaseCancel()
                  }

                  isPhasePressingRef.current = false
                  setPressedPhase(null)
                }}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 z-[0] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    width: `${cutoutDiameter}px`,
                    height: `${cutoutDiameter}px`,
                    background: theme.cutoutBackground,
                    boxShadow: theme.cutoutShadow,
                  }}
                />
                {PHASE_PAD_LAYOUT.map((item) => (
                  <PhaseAreaTile
                    key={item.phase}
                    phase={item.phase}
                    label={item.phase === 'OFFENSE' ? offenseLabel : item.label}
                    isActive={item.phase === activeDisplayPhase}
                    isPressed={pressedPhase === item.phase}
                    row={item.row}
                    column={item.column}
                    cutoutDiameter={cutoutDiameter}
                    variantId={props.variantId}
                    switchMotion={props.switchMotion}
                    onPressStart={(phase) => {
                      isPhasePressingRef.current = true
                      setPressedPhase(phase)
                      props.onManualPhasePress(phase)
                    }}
                    onPressHover={(phase) => {
                      if (!isPhasePressingRef.current || pressedPhase === phase) return
                      setPressedPhase(phase)
                      props.onManualPhasePress(phase)
                    }}
                    onKeyboardSelect={props.onManualPhaseSelect}
                  />
                ))}
              </div>
            </div>

            <PhasePadJoystick props={props} />
          </div>
        </div>
      </div>
    </div>
  )
}
