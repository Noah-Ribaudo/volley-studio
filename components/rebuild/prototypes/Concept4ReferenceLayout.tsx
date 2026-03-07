'use client'

import { useEffect, useMemo, useState } from 'react'
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
 *    0ms   active connector wakes and starts pointing at the legal next phase
 *  120ms   phase surfaces and connector scaffolds settle into their new weight
 *  620ms   play burst finishes and destination phase glow resolves
 * ───────────────────────────────────────────────────────── */

const TIMING = {
  surfaceSettle: 0.16,
  connectorSettle: 0.18,
  playBurstMs: 620,
}

const C4_LAYOUT = {
  mobileGap: '4px',
  controlPadding: '6px',
}

type ConnectorId = 'serve' | 'receive' | 'live'

type PhaseGeometry = {
  x: number
  y: number
  width: number
  height: number
}

type LiteralStageGeometry = {
  stageWidth: number
  stageHeight: number
  centerX: number
  centerY: number
  joystickSize: number
  phases: Record<'SERVE' | 'RECEIVE' | 'DEFENSE' | 'OFFENSE', PhaseGeometry>
  paths: Record<ConnectorId, string>
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
  const topCurveY = clamp(
    topMidY - Math.max(9, clusterLayout.joystickClearance * 0.85),
    stageInset + 10,
    centerY - clusterLayout.joystickClearance / 3
  )
  const bottomCurveY = clamp(
    bottomMidY + Math.max(8, clusterLayout.joystickClearance * 0.72),
    centerY + clusterLayout.joystickClearance / 4,
    stageHeight - stageInset - 10
  )
  const innerInset = connectorGeometry.horizontalInset
  const topInnerLeft = clamp(serve.x + serve.width + innerInset, serve.x + serve.width, centerX - 6)
  const topInnerRight = clamp(defense.x - innerInset, centerX + 6, defense.x)
  const bottomInnerLeft = clamp(receive.x + receive.width + innerInset, receive.x + receive.width, centerX - 6)
  const bottomInnerRight = clamp(offense.x - innerInset, centerX + 6, offense.x)
  const liveX = clamp(
    defense.x + defense.width / 2 + connectorGeometry.liveLoopOffset,
    defense.x + 16,
    defense.x + defense.width - 16
  )

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
      serve: [
        `M ${serve.x + serve.width} ${topMidY}`,
        `L ${topInnerLeft} ${topMidY}`,
        `Q ${centerX} ${topCurveY} ${topInnerRight} ${topMidY}`,
        `L ${defense.x} ${topMidY}`,
      ].join(' '),
      receive: [
        `M ${receive.x + receive.width} ${bottomMidY}`,
        `L ${bottomInnerLeft} ${bottomMidY}`,
        `Q ${centerX} ${bottomCurveY} ${bottomInnerRight} ${bottomMidY}`,
        `L ${offense.x} ${bottomMidY}`,
      ].join(' '),
      live: `M ${liveX} ${defense.y + defense.height} L ${liveX} ${offense.y}`,
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
  const isActive = props.currentCorePhase === phase
  const isNext = props.nextByPlay === phase
  const contrast = getPhaseContrast(phase, props.currentCorePhase, props)
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
            boxShadow: `0 0 ${12 + surface.nextGlow * 18}px oklch(72% 0.14 55 / ${
              (boosted ? 0.34 : 0.2) + surface.nextGlow * 0.16
            })`,
          }}
        />
      ) : null}
      <span className="relative z-[1] text-[0.98rem] tracking-[0.01em]">{label}</span>
    </motion.button>
  )
}

function ConnectorScaffold({ d, props }: { d: string; props: PrototypeControlProps }) {
  const geometry = props.tactileTuning.c4Literal.connectorGeometry

  return (
    <path
      d={d}
      fill="none"
      stroke="var(--primary)"
      strokeLinecap="round"
      strokeOpacity={geometry.idleOpacity}
      strokeWidth={geometry.strokeThickness}
    />
  )
}

function SweepConnector({
  d,
  direction,
  activeOpacity,
  glow,
  geometry,
  speed,
  segmentLength,
  boosted,
}: {
  d: string
  direction: 1 | -1
  activeOpacity: number
  glow: number
  geometry: PrototypeControlProps['tactileTuning']['c4Literal']['connectorGeometry']
  speed: number
  segmentLength: number
  boosted: boolean
}) {
  const startOffset = direction === 1 ? 0 : 1 - segmentLength
  const endOffset = direction === 1 ? 1 - segmentLength : 0

  return (
    <>
      <motion.path
        initial={false}
        d={d}
        fill="none"
        stroke="var(--primary)"
        strokeLinecap="round"
        strokeOpacity={activeOpacity * 0.36}
        strokeWidth={geometry.strokeThickness + 0.5}
      />
      <motion.path
        initial={false}
        d={d}
        fill="none"
        stroke="var(--primary)"
        strokeLinecap="round"
        strokeWidth={geometry.strokeThickness + 0.9}
        style={{
          filter: `drop-shadow(0 0 ${2 + glow * 7}px oklch(72% 0.14 55 / ${0.2 + glow * 0.34}))`,
          pathLength: segmentLength,
          pathOffset: startOffset,
          pathSpacing: 1,
        }}
        animate={{
          pathOffset: endOffset,
          opacity: boosted ? 1 : activeOpacity,
        }}
        transition={{
          duration: speed,
          ease: 'linear',
          repeat: boosted ? 0 : Infinity,
          repeatType: 'loop',
        }}
      />
    </>
  )
}

function RelayConnector({
  d,
  direction,
  activeOpacity,
  geometry,
  speed,
  segmentCount,
  dashDensity,
  boosted,
}: {
  d: string
  direction: 1 | -1
  activeOpacity: number
  geometry: PrototypeControlProps['tactileTuning']['c4Literal']['connectorGeometry']
  speed: number
  segmentCount: number
  dashDensity: number
  boosted: boolean
}) {
  const packetLength = clamp(dashDensity / Math.max(segmentCount, 1), 0.028, 0.08)
  const packetGap = clamp(packetLength * 0.95, 0.026, 0.09)

  return (
    <motion.path
      initial={false}
      d={d}
      fill="none"
      pathLength={1}
      stroke="var(--primary)"
      strokeDasharray={`${packetLength} ${packetGap}`}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={geometry.strokeThickness + 0.7}
      animate={{
        opacity: boosted ? 1 : activeOpacity,
        strokeDashoffset: direction === 1 ? -1 : 1,
      }}
      transition={{
        duration: speed,
        ease: 'linear',
        repeat: boosted ? 0 : Infinity,
        repeatType: 'loop',
      }}
      style={{
        filter: `drop-shadow(0 0 ${2.5 + packetLength * 34}px oklch(72% 0.14 55 / 0.26))`,
      }}
    />
  )
}

function PulseConnector({
  d,
  direction,
  activeOpacity,
  glow,
  geometry,
  speed,
  segmentLength,
  boosted,
}: {
  d: string
  direction: 1 | -1
  activeOpacity: number
  glow: number
  geometry: PrototypeControlProps['tactileTuning']['c4Literal']['connectorGeometry']
  speed: number
  segmentLength: number
  boosted: boolean
}) {
  const pulseLength = clamp(segmentLength * 0.78, 0.14, 0.42)
  const startOffset = direction === 1 ? 0 : 1 - pulseLength
  const endOffset = direction === 1 ? 1 - pulseLength : 0

  return (
    <>
      <motion.path
        initial={false}
        d={d}
        fill="none"
        stroke="var(--primary)"
        strokeLinecap="round"
        strokeOpacity={activeOpacity * 0.28}
        strokeWidth={geometry.strokeThickness + 0.6}
      />
      <motion.path
        initial={false}
        d={d}
        fill="none"
        stroke="var(--primary)"
        strokeLinecap="round"
        strokeWidth={geometry.strokeThickness + 2.4}
        style={{
          filter: `blur(${1.8 + glow * 3.4}px)`,
          pathLength: pulseLength,
          pathOffset: startOffset,
          pathSpacing: 1,
        }}
        animate={{
          pathOffset: endOffset,
          opacity: [0.16, 0.42 + glow * 0.22, 0.16],
        }}
        transition={{
          duration: speed,
          ease: 'easeInOut',
          repeat: boosted ? 0 : Infinity,
          repeatType: 'loop',
        }}
      />
      <motion.path
        initial={false}
        d={d}
        fill="none"
        stroke="var(--primary)"
        strokeLinecap="round"
        strokeWidth={geometry.strokeThickness + 0.6}
        style={{
          pathLength: pulseLength * 0.82,
          pathOffset: startOffset,
          pathSpacing: 1,
        }}
        animate={{
          pathOffset: endOffset,
          opacity: boosted ? [0.6, 1, 0.6] : [0.48, activeOpacity, 0.48],
        }}
        transition={{
          duration: speed,
          ease: 'easeInOut',
          repeat: boosted ? 0 : Infinity,
          repeatType: 'loop',
        }}
      />
    </>
  )
}

function ActiveConnector({
  d,
  active,
  direction,
  connectorStyle,
  boosted,
  props,
}: {
  d: string
  active: boolean
  direction: 1 | -1
  connectorStyle: ConnectorStyle
  boosted: boolean
  props: PrototypeControlProps
}) {
  const prefersReducedMotion = useReducedMotion()
  const geometry = props.tactileTuning.c4Literal.connectorGeometry
  const motionTuning = props.tactileTuning.c4Literal.connectorMotion

  if (!active) return null

  const segmentLength = clamp(
    boosted ? motionTuning.travelAmount * 1.45 : motionTuning.travelAmount,
    0.18,
    0.66
  )
  const speed = boosted ? motionTuning.playCycleSpeed : motionTuning.restCycleSpeed
  const activeOpacity = geometry.activeOpacity
  const glow = motionTuning.pulseGlow

  if (prefersReducedMotion || connectorStyle === 'static') {
    return (
      <motion.path
        initial={false}
        d={d}
        fill="none"
        stroke="var(--primary)"
        strokeLinecap="round"
        strokeWidth={geometry.strokeThickness + 0.85}
        animate={{ opacity: activeOpacity }}
        transition={{ duration: 0.001 }}
        style={{
          filter: `drop-shadow(0 0 ${1.5 + glow * 5}px oklch(72% 0.14 55 / ${0.14 + glow * 0.22}))`,
        }}
      />
    )
  }

  if (connectorStyle === 'relay') {
    return (
      <RelayConnector
        d={d}
        direction={direction}
        activeOpacity={activeOpacity}
        geometry={geometry}
        speed={speed}
        segmentCount={motionTuning.segmentCount}
        dashDensity={motionTuning.dashDensity}
        boosted={boosted}
      />
    )
  }

  if (connectorStyle === 'pulse') {
    return (
      <PulseConnector
        d={d}
        direction={direction}
        activeOpacity={activeOpacity}
        glow={glow}
        geometry={geometry}
        speed={speed}
        segmentLength={segmentLength}
        boosted={boosted}
      />
    )
  }

  return (
    <SweepConnector
      d={d}
      direction={direction}
      activeOpacity={activeOpacity}
      glow={glow}
      geometry={geometry}
      speed={speed}
      segmentLength={segmentLength}
      boosted={boosted}
    />
  )
}

function LiteralMode(props: PrototypeControlProps) {
  const geometry = useMemo(() => buildLiteralStage(props.tactileTuning.c4Literal), [props.tactileTuning.c4Literal])
  const [isBursting, setIsBursting] = useState(false)
  const activeConnector = getActiveConnector(props.currentCorePhase)
  const liveDirection = getConnectorDirection(props.currentCorePhase)
  const joystickPhaseEmphasis: PhaseEmphasisTuning = {
    currentWeight: props.tactileTuning.phaseEmphasis.currentWeight,
    nextGlow: props.tactileTuning.c4Literal.phaseSurface.nextGlow,
    foundationalContrast: props.tactileTuning.c4Literal.phaseSurface.foundationalContrast,
    reactiveContrast: props.tactileTuning.c4Literal.phaseSurface.reactiveContrast,
  }

  useEffect(() => {
    if (props.playAnimationTrigger === 0) return
    setIsBursting(true)
    const timeoutId = window.setTimeout(() => setIsBursting(false), TIMING.playBurstMs)
    return () => window.clearTimeout(timeoutId)
  }, [props.playAnimationTrigger])

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
          <ConnectorScaffold d={geometry.paths.serve} props={props} />
          <ConnectorScaffold d={geometry.paths.receive} props={props} />
          <ConnectorScaffold d={geometry.paths.live} props={props} />

          <ActiveConnector
            d={geometry.paths.serve}
            active={activeConnector === 'serve'}
            direction={1}
            connectorStyle={props.connectorStyle}
            boosted={isBursting}
            props={props}
          />
          <ActiveConnector
            d={geometry.paths.receive}
            active={activeConnector === 'receive'}
            direction={1}
            connectorStyle={props.connectorStyle}
            boosted={isBursting}
            props={props}
          />
          <ActiveConnector
            d={geometry.paths.live}
            active={activeConnector === 'live'}
            direction={liveDirection}
            connectorStyle={props.connectorStyle}
            boosted={isBursting}
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
              boosted={isBursting}
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
            currentPhase={props.currentCorePhase}
            nextPhase={props.nextByPlay}
            nextLabel={getPhaseLabel(props.nextByPlay)}
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
