'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import {
  type ConnectorStyle,
  type CorePhase,
  formatCorePhaseLabel,
} from '@/lib/rebuild/prototypeFlow'
import type { PhaseEmphasisTuning } from '@/lib/rebuild/tactileTuning'
import { cn } from '@/lib/utils'
import { TactilePlayJoystick } from './TactilePlayJoystick'
import { TactileRotationSwitch } from './TactileRotationSwitch'
import type { PrototypeControlProps } from './types'

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD
 *
 * Read top-to-bottom. Each state is ms after interaction.
 *
 *    0ms   active connector shows a short resting fill
 *  120ms   phase surfaces settle and the loading bar arms
 *  500ms   bar fills source -> destination in sync with court movement
 * ───────────────────────────────────────────────────────── */

const TIMING = {
  surfaceSettle: 0.16,
  connectorSettle: 0.18,
}

const C4_LAYOUT = {
  mobileGap: '4px',
  controlPadding: '6px',
}

const CONNECTOR_STYLE_VISUALS: Record<
  ConnectorStyle,
  {
    fillWidthBoost: number
    headWidthBoost: number
    showHead: boolean
    showAura: boolean
    showGlowTail: boolean
  }
> = {
  static: {
    fillWidthBoost: 1.35,
    headWidthBoost: 0,
    showHead: false,
    showAura: false,
    showGlowTail: false,
  },
  sweep: {
    fillWidthBoost: 1.55,
    headWidthBoost: 0,
    showHead: false,
    showAura: true,
    showGlowTail: false,
  },
  relay: {
    fillWidthBoost: 1.42,
    headWidthBoost: 1.9,
    showHead: true,
    showAura: true,
    showGlowTail: false,
  },
  pulse: {
    fillWidthBoost: 1.52,
    headWidthBoost: 2.4,
    showHead: true,
    showAura: true,
    showGlowTail: true,
  },
}

type ConnectorId = 'serve' | 'receive' | 'live'

type PhaseGeometry = {
  x: number
  y: number
  width: number
  height: number
}

type ConnectorPathSet = {
  scaffold: string
  forward: string
  reverse: string
}

type LiteralStageGeometry = {
  stageWidth: number
  stageHeight: number
  centerX: number
  centerY: number
  joystickSize: number
  phases: Record<'SERVE' | 'RECEIVE' | 'DEFENSE' | 'OFFENSE', PhaseGeometry>
  paths: Record<ConnectorId, ConnectorPathSet>
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function getPhaseLabel(phase: CorePhase): string {
  if (phase === 'OFFENSE') return 'Attack'
  return formatCorePhaseLabel(phase)
}

function isFoundational(phase: CorePhase): boolean {
  return phase === 'SERVE' || phase === 'RECEIVE'
}

function getPhaseTone(phase: CorePhase): { base: string; active: string } {
  if (isFoundational(phase)) {
    return {
      base: 'oklch(76% 0.08 72)',
      active: 'oklch(79% 0.1 72)',
    }
  }

  return {
    base: 'oklch(74% 0.03 255)',
    active: 'oklch(77% 0.04 255)',
  }
}

function getPhaseContrast(phase: CorePhase, currentPhase: CorePhase, props: PrototypeControlProps): number {
  const currentIsFoundational = isFoundational(currentPhase)
  const phaseIsFoundational = isFoundational(phase)
  const surface = props.tactileTuning.c4Literal.phaseSurface
  const contrast = currentIsFoundational ? surface.foundationalContrast : surface.reactiveContrast

  return phaseIsFoundational === currentIsFoundational
    ? 1 + contrast * 0.18
    : 1 - contrast * 0.14
}

function getActiveConnector(phase: CorePhase): ConnectorId {
  if (phase === 'SERVE') return 'serve'
  if (phase === 'RECEIVE') return 'receive'
  return 'live'
}

function getConnectorDirection(phase: CorePhase): 1 | -1 {
  if (phase === 'OFFENSE') return -1
  return 1
}

function buildLiteralStage(
  c4Literal: PrototypeControlProps['tactileTuning']['c4Literal']
): LiteralStageGeometry {
  const { clusterLayout, connectorGeometry } = c4Literal
  const stageWidth = clusterLayout.stageWidth
  const stageHeight = clusterLayout.stageHeight
  const centerX = stageWidth / 2
  const centerY = stageHeight / 2
  const buttonWidth = clusterLayout.phaseButtonWidth
  const buttonHeight = clusterLayout.phaseButtonHeight
  const stageInset = clusterLayout.stageInset

  const leftX = clamp(
    centerX - clusterLayout.horizontalSpread / 2 - buttonWidth,
    stageInset,
    centerX - buttonWidth - stageInset
  )
  const rightX = clamp(
    centerX + clusterLayout.horizontalSpread / 2,
    centerX + stageInset,
    stageWidth - stageInset - buttonWidth
  )
  const topY = clamp(
    centerY - clusterLayout.verticalSpread / 2 - buttonHeight,
    stageInset,
    centerY - buttonHeight / 2 - 4
  )
  const bottomY = clamp(
    centerY + clusterLayout.verticalSpread / 2,
    centerY + 4,
    stageHeight - stageInset - buttonHeight
  )

  const serve = { x: leftX, y: topY, width: buttonWidth, height: buttonHeight }
  const receive = { x: leftX, y: bottomY, width: buttonWidth, height: buttonHeight }
  const defense = { x: rightX, y: topY, width: buttonWidth, height: buttonHeight }
  const offense = { x: rightX, y: bottomY, width: buttonWidth, height: buttonHeight }

  const topMidY = topY + buttonHeight / 2
  const bottomMidY = bottomY + buttonHeight / 2
  const innerInset = connectorGeometry.horizontalInset
  const laneStem = Math.max(8, innerInset)
  const topInnerLeft = serve.x + serve.width + laneStem
  const topInnerRight = defense.x - laneStem
  const bottomInnerLeft = receive.x + receive.width + laneStem
  const bottomInnerRight = offense.x - laneStem
  const topLaneY = clamp(serve.y + 7, stageInset + 6, topMidY - 5)
  const bottomLaneY = clamp(
    offense.y + offense.height - 7,
    bottomMidY + 5,
    stageHeight - stageInset - 6
  )
  const liveX = clamp(
    defense.x + defense.width * 0.68 + connectorGeometry.liveLoopOffset,
    defense.x + defense.width / 2 + 10,
    defense.x + defense.width - 10
  )

  const servePath = [
    `M ${serve.x + serve.width} ${topMidY}`,
    `L ${topInnerLeft - 10} ${topMidY}`,
    `Q ${topInnerLeft} ${topMidY} ${topInnerLeft} ${topLaneY}`,
    `L ${topInnerRight} ${topLaneY}`,
    `Q ${topInnerRight} ${topMidY} ${defense.x} ${topMidY}`,
  ].join(' ')

  const receivePath = [
    `M ${receive.x + receive.width} ${bottomMidY}`,
    `L ${bottomInnerLeft - 10} ${bottomMidY}`,
    `Q ${bottomInnerLeft} ${bottomMidY} ${bottomInnerLeft} ${bottomLaneY}`,
    `L ${bottomInnerRight} ${bottomLaneY}`,
    `Q ${bottomInnerRight} ${bottomMidY} ${offense.x} ${bottomMidY}`,
  ].join(' ')

  const liveForward = `M ${liveX} ${defense.y + defense.height} L ${liveX} ${offense.y}`
  const liveReverse = `M ${liveX} ${offense.y} L ${liveX} ${defense.y + defense.height}`

  return {
    stageWidth,
    stageHeight,
    centerX,
    centerY,
    joystickSize: clusterLayout.joystickSize,
    phases: {
      SERVE: serve,
      RECEIVE: receive,
      DEFENSE: defense,
      OFFENSE: offense,
    },
    paths: {
      serve: {
        scaffold: servePath,
        forward: servePath,
        reverse: servePath,
      },
      receive: {
        scaffold: receivePath,
        forward: receivePath,
        reverse: receivePath,
      },
      live: {
        scaffold: liveForward,
        forward: liveForward,
        reverse: liveReverse,
      },
    },
  }
}

function PhaseCard({
  label,
  phase,
  props,
  boosted,
}: {
  label: string
  phase: CorePhase
  props: PrototypeControlProps
  boosted: boolean
}) {
  const prefersReducedMotion = useReducedMotion()
  const isActive = props.displayCurrentCorePhase === phase
  const isNext = props.displayNextByPlay === phase
  const contrast = getPhaseContrast(phase, props.displayCurrentCorePhase, props)
  const tone = getPhaseTone(phase)
  const surface = props.tactileTuning.c4Literal.phaseSurface

  const transition = prefersReducedMotion
    ? { duration: 0.001 }
    : {
        type: 'spring' as const,
        stiffness: props.switchMotion.spring.stiffness,
        damping: props.switchMotion.spring.damping,
        mass: props.switchMotion.spring.mass,
      }

  return (
    <motion.button
      type="button"
      aria-pressed={isActive}
      onClick={() => props.onPhaseSelect(phase)}
      animate={{
        y: isActive ? surface.activeLift : 0,
        scale: isActive ? 1.012 : boosted && isNext ? 1.008 : 1,
      }}
      transition={transition}
      className={cn(
        'lab-raised lab-texture relative flex h-full w-full items-center justify-center overflow-hidden rounded-[18px] border text-center font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        isActive ? 'lab-pressed border-border/85' : 'border-border/60'
      )}
      style={{
        opacity: isActive ? 1 : 0.92 + contrast * 0.03,
        background: isActive
          ? `color-mix(in oklch, var(--card) 54%, ${tone.active} 46%)`
          : `color-mix(in oklch, var(--card) 84%, ${tone.base} 16%)`,
        borderColor: isActive
          ? `color-mix(in oklch, var(--border) 28%, ${tone.active} 72%)`
          : `color-mix(in oklch, var(--border) 80%, ${tone.base} 20%)`,
      }}
    >
      {isNext ? (
        <motion.span
          aria-hidden
          initial={false}
          animate={{
            opacity: boosted ? 1 : 0.72,
            scale: boosted ? 1.025 : 1,
          }}
          transition={prefersReducedMotion ? { duration: 0.001 } : { duration: TIMING.connectorSettle }}
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            boxShadow: `0 0 ${
              12 +
              surface.nextGlow * 18 +
              props.tactileTuning.c4Literal.connectorMotion.destinationFlash * (boosted ? 18 : 6)
            }px oklch(72% 0.14 55 / ${
              (boosted ? 0.34 : 0.2) +
              surface.nextGlow * 0.16 +
              props.tactileTuning.c4Literal.connectorMotion.destinationFlash * (boosted ? 0.18 : 0.06)
            })`,
          }}
        />
      ) : null}
      <span className="relative z-[1] text-[0.98rem] tracking-[0.01em]">{label}</span>
    </motion.button>
  )
}

function ConnectorScaffold({
  path,
  props,
}: {
  path: ConnectorPathSet
  props: PrototypeControlProps
}) {
  const geometry = props.tactileTuning.c4Literal.connectorGeometry

  return (
    <path
      d={path.scaffold}
      fill="none"
      stroke="var(--primary)"
      strokeLinecap="round"
      strokeOpacity={geometry.idleOpacity}
      strokeWidth={geometry.strokeThickness}
    />
  )
}

function getFillStroke(progress: number, totalLength: number) {
  const visibleLength = clamp(progress, 0, 1) * totalLength

  return {
    visibleLength,
    dasharray: `${Math.max(visibleLength, 0.001)} ${Math.max(totalLength, 0.01)}`,
    dashoffset: 0,
  }
}

function getHeadStroke(progress: number, totalLength: number, headRatio: number) {
  const fillLength = clamp(progress, 0, 1) * totalLength
  const visibleLength = Math.min(
    fillLength,
    Math.max(totalLength * clamp(headRatio, 0.05, 0.3), 12)
  )

  return {
    visibleLength,
    dasharray: `${visibleLength} ${Math.max(totalLength, 0.01)}`,
    dashoffset: -Math.max(fillLength - visibleLength, 0),
  }
}

function ActiveConnector({
  path,
  active,
  direction,
  connectorStyle,
  progress,
  boosted,
  props,
}: {
  path: ConnectorPathSet
  active: boolean
  direction: 1 | -1
  connectorStyle: ConnectorStyle
  progress: number
  boosted: boolean
  props: PrototypeControlProps
}) {
  const prefersReducedMotion = useReducedMotion()
  const pathRef = useRef<SVGPathElement | null>(null)
  const [totalLength, setTotalLength] = useState(0)
  const geometry = props.tactileTuning.c4Literal.connectorGeometry
  const motionTuning = props.tactileTuning.c4Literal.connectorMotion
  const visuals = CONNECTOR_STYLE_VISUALS[connectorStyle]

  useEffect(() => {
    if (!pathRef.current) return
    setTotalLength(pathRef.current.getTotalLength())
  }, [direction, path.forward, path.reverse])

  if (!active) return null

  const animatedPath = direction === 1 ? path.forward : path.reverse
  const activeOpacity = geometry.activeOpacity
  const glow = motionTuning.glowStrength

  if (prefersReducedMotion || connectorStyle === 'static' || totalLength === 0) {
    return (
      <>
        <path
          ref={pathRef}
          d={animatedPath}
          fill="none"
          stroke="transparent"
          strokeWidth={geometry.strokeThickness + 6}
        />
        <path
          d={animatedPath}
          fill="none"
          stroke="var(--primary)"
          strokeLinecap="round"
          strokeWidth={geometry.strokeThickness + visuals.fillWidthBoost}
          strokeOpacity={activeOpacity}
          style={{
            filter: `drop-shadow(0 0 ${2 + glow * 6}px oklch(72% 0.14 55 / ${0.16 + glow * 0.2}))`,
          }}
        />
      </>
    )
  }

  const fillStroke = getFillStroke(progress, totalLength)
  const headStroke = getHeadStroke(progress, totalLength, motionTuning.headLength)
  const fillOpacity = boosted ? 1 : activeOpacity

  return (
    <>
      <path
        ref={pathRef}
        d={animatedPath}
        fill="none"
        stroke="transparent"
        strokeWidth={geometry.strokeThickness + 6}
      />
      {visuals.showGlowTail ? (
        <path
          d={animatedPath}
          fill="none"
          stroke="var(--primary)"
          strokeLinecap="round"
          strokeWidth={geometry.strokeThickness + 3.8}
          strokeOpacity={boosted ? 0.2 + glow * 0.2 : 0.1 + glow * 0.1}
          strokeDasharray={fillStroke.dasharray}
          strokeDashoffset={fillStroke.dashoffset}
          style={{
            filter: `blur(${1.2 + glow * 4.2}px)`,
          }}
        />
      ) : null}
      {visuals.showAura ? (
        <path
          d={animatedPath}
          fill="none"
          stroke="var(--primary)"
          strokeLinecap="round"
          strokeWidth={geometry.strokeThickness + 2.8}
          strokeOpacity={boosted ? 0.2 + glow * 0.18 : 0.1 + glow * 0.08}
          strokeDasharray={fillStroke.dasharray}
          strokeDashoffset={fillStroke.dashoffset}
          style={{
            filter: `blur(${1 + glow * 2.8}px)`,
          }}
        />
      ) : null}
      <path
        d={animatedPath}
        fill="none"
        stroke="var(--primary)"
        strokeLinecap="round"
        strokeWidth={geometry.strokeThickness + visuals.fillWidthBoost}
        strokeOpacity={fillOpacity}
        strokeDasharray={fillStroke.dasharray}
        strokeDashoffset={fillStroke.dashoffset}
        style={{
          filter: `drop-shadow(0 0 ${2 + glow * (visuals.showGlowTail ? 8 : 4)}px oklch(72% 0.14 55 / ${
            0.16 + glow * (visuals.showGlowTail ? 0.28 : 0.12)
          }))`,
        }}
      />
      {visuals.showHead && headStroke.visibleLength > 0.5 ? (
        <path
          d={animatedPath}
          fill="none"
          stroke="var(--primary)"
          strokeLinecap="round"
          strokeWidth={geometry.strokeThickness + visuals.headWidthBoost}
          strokeOpacity={boosted ? 1 : 0.88}
          strokeDasharray={headStroke.dasharray}
          strokeDashoffset={headStroke.dashoffset}
          style={{
            filter: `drop-shadow(0 0 ${3 + glow * 8}px oklch(72% 0.14 55 / ${0.24 + glow * 0.3}))`,
          }}
        />
      ) : null}
    </>
  )
}

function LiteralMode(props: PrototypeControlProps) {
  const prefersReducedMotion = useReducedMotion()
  const geometry = useMemo(() => buildLiteralStage(props.tactileTuning.c4Literal), [props.tactileTuning.c4Literal])
  const activeConnector = getActiveConnector(props.displayCurrentCorePhase)
  const liveDirection = getConnectorDirection(props.displayCurrentCorePhase)
  const motionTuning = props.tactileTuning.c4Literal.connectorMotion
  const restingProgress = props.connectorStyle === 'static' ? 1 : motionTuning.restProgress
  const [connectorProgress, setConnectorProgress] = useState(restingProgress)
  const [isConnectorPlaying, setIsConnectorPlaying] = useState(false)
  const animationFrameRef = useRef<number | null>(null)
  const joystickPhaseEmphasis: PhaseEmphasisTuning = {
    currentWeight: props.tactileTuning.phaseEmphasis.currentWeight,
    nextGlow: props.tactileTuning.c4Literal.phaseSurface.nextGlow,
    foundationalContrast: props.tactileTuning.c4Literal.phaseSurface.foundationalContrast,
    reactiveContrast: props.tactileTuning.c4Literal.phaseSurface.reactiveContrast,
  }

  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    setConnectorProgress(restingProgress)
    setIsConnectorPlaying(false)
  }, [activeConnector, liveDirection, restingProgress])

  useEffect(() => {
    if (props.isPreviewingMovement) return
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    setConnectorProgress(restingProgress)
    setIsConnectorPlaying(false)
  }, [props.isPreviewingMovement, restingProgress])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (props.playAnimationTrigger === 0) return

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (prefersReducedMotion || props.connectorStyle === 'static') {
      setIsConnectorPlaying(true)
      setConnectorProgress(1)
      return
    }

    const startProgress = restingProgress
    const startTime = performance.now()
    setIsConnectorPlaying(true)

    const tick = (now: number) => {
      const elapsed = now - startTime
      const t = clamp(elapsed / motionTuning.playDurationMs, 0, 1)
      setConnectorProgress(startProgress + (1 - startProgress) * t)

      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(tick)
        return
      }

      animationFrameRef.current = null
    }

    animationFrameRef.current = requestAnimationFrame(tick)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [
    motionTuning.playDurationMs,
    prefersReducedMotion,
    props.connectorStyle,
    props.playAnimationTrigger,
    restingProgress,
  ])

  return (
    <div className="relative flex h-full min-h-0 w-full items-start justify-center overflow-hidden px-1 pt-0.5">
      <div
        className="relative w-full"
        style={{
          maxWidth: `${geometry.stageWidth}px`,
          aspectRatio: `${geometry.stageWidth} / ${geometry.stageHeight}`,
        }}
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${geometry.stageWidth} ${geometry.stageHeight}`}
        >
          <ConnectorScaffold path={geometry.paths.serve} props={props} />
          <ConnectorScaffold path={geometry.paths.receive} props={props} />
          <ConnectorScaffold path={geometry.paths.live} props={props} />

          <ActiveConnector
            path={geometry.paths.serve}
            active={activeConnector === 'serve'}
            direction={1}
            connectorStyle={props.connectorStyle}
            progress={connectorProgress}
            boosted={isConnectorPlaying}
            props={props}
          />
          <ActiveConnector
            path={geometry.paths.receive}
            active={activeConnector === 'receive'}
            direction={1}
            connectorStyle={props.connectorStyle}
            progress={connectorProgress}
            boosted={isConnectorPlaying}
            props={props}
          />
          <ActiveConnector
            path={geometry.paths.live}
            active={activeConnector === 'live'}
            direction={liveDirection}
            connectorStyle={props.connectorStyle}
            progress={connectorProgress}
            boosted={isConnectorPlaying}
            props={props}
          />
        </svg>

        {(Object.entries(geometry.phases) as Array<[CorePhase, PhaseGeometry]>).map(([phase, card]) => (
          <div
            key={phase}
            className="absolute"
            style={{
              left: card.x,
              top: card.y,
              width: card.width,
              height: card.height,
            }}
          >
            <PhaseCard
              label={phase === 'OFFENSE' ? 'Attack' : getPhaseLabel(phase)}
              phase={phase}
              props={props}
              boosted={isConnectorPlaying}
            />
          </div>
        ))}

        <div
          className="absolute z-[2] -translate-x-1/2 -translate-y-1/2"
          style={{
            left: geometry.centerX,
            top: geometry.centerY,
          }}
        >
          <TactilePlayJoystick
            currentPhase={props.displayCurrentCorePhase}
            nextPhase={props.displayNextByPlay}
            nextLabel={getPhaseLabel(props.displayNextByPlay)}
            canPlayAdvance={props.canPlayAdvance}
            mode="literal"
            frameSizeOverride={geometry.joystickSize}
            switchMotion={props.switchMotion}
            joystickTuning={props.tactileTuning.joystick}
            phaseEmphasis={joystickPhaseEmphasis}
            onPlay={props.onPlay}
            onPhaseSelect={props.onPhaseSelect}
          />
        </div>
      </div>
    </div>
  )
}

export function Concept4ReferenceLayout(props: PrototypeControlProps) {
  return (
    <div
      className="flex h-full min-h-0 flex-col"
      style={{
        gap: C4_LAYOUT.mobileGap,
      }}
    >
      <TactileRotationSwitch
        value={props.currentRotation}
        onValueChange={props.onRotationSelect}
        switchMotion={props.switchMotion}
        density="compact"
      />

      <div
        className="lab-inset flex min-h-0 flex-1 items-stretch rounded-[22px]"
        style={{
          padding: C4_LAYOUT.controlPadding,
        }}
      >
        <LiteralMode {...props} />
      </div>
    </div>
  )
}
