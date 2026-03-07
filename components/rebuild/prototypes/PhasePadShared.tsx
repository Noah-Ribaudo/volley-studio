'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { type CorePhase, formatCorePhaseLabel } from '@/lib/rebuild/prototypeFlow'
import type { PhaseEmphasisTuning } from '@/lib/rebuild/tactileTuning'
import { TactilePlayJoystick } from './TactilePlayJoystick'
import { TactileRotationSwitch } from './TactileRotationSwitch'
import type { PrototypeControlProps } from './types'

function getRoundedInsetPath(inset: number, radius: number) {
  const min = inset
  const max = 100 - inset
  const innerMin = min + radius
  const innerMax = max - radius
  return `M 50 ${min} H ${innerMax} A ${radius} ${radius} 0 0 1 ${max} ${innerMin} V ${innerMax} A ${radius} ${radius} 0 0 1 ${innerMax} ${max} H ${innerMin} A ${radius} ${radius} 0 0 1 ${min} ${innerMax} V ${innerMin} A ${radius} ${radius} 0 0 1 ${innerMin} ${min} H 50`
}

export const PHASE_PAD_LAYOUT: Array<{
  phase: CorePhase
  label: string
  row: 'top' | 'bottom'
  column: 'left' | 'right'
}> = [
  { phase: 'SERVE', label: 'Serve', row: 'top', column: 'left' },
  { phase: 'DEFENSE', label: 'Defense', row: 'top', column: 'right' },
  { phase: 'RECEIVE', label: 'Receive', row: 'bottom', column: 'left' },
  { phase: 'OFFENSE', label: 'Attack', row: 'bottom', column: 'right' },
]

export function usePhasePadTransition(props: PrototypeControlProps) {
  const [transitionFrom, setTransitionFrom] = useState<CorePhase>(props.currentCorePhase)
  const [transitionTo, setTransitionTo] = useState<CorePhase>(props.nextByPlay)
  const [transitionProgress, setTransitionProgress] = useState(0)

  const playDurationMs = props.tactileTuning.c4Literal.connectorMotion.playDurationMs

  useEffect(() => {
    if (!props.isPreviewingMovement) {
      setTransitionProgress(0)
      setTransitionFrom(props.currentCorePhase)
      setTransitionTo(props.nextByPlay)
      return
    }

    setTransitionFrom(props.currentCorePhase)
    setTransitionTo(props.nextByPlay)
    setTransitionProgress(0)

    let frameId = 0
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / playDurationMs, 1)
      setTransitionProgress(progress)
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick)
      }
    }

    frameId = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [playDurationMs, props.currentCorePhase, props.isPreviewingMovement, props.nextByPlay, props.playAnimationTrigger])

  const liveStatus = useMemo(() => {
    if (props.isPreviewingMovement) {
      return `${formatCorePhaseLabel(transitionFrom)} -> ${formatCorePhaseLabel(transitionTo)}`
    }

    return formatCorePhaseLabel(props.currentCorePhase)
  }, [props.currentCorePhase, props.isPreviewingMovement, transitionFrom, transitionTo])

  return {
    transitionFrom,
    transitionTo,
    transitionProgress,
    liveStatus,
  }
}

export function getPerimeterSegmentLength(ledsPerEdge: number) {
  return ledsPerEdge
}

export function getPerimeterSegmentStart(phase: CorePhase, ledsPerEdge: number) {
  const totalLights = ledsPerEdge * 4
  const halfEdge = Math.floor(ledsPerEdge / 2)

  switch (phase) {
    case 'SERVE':
      return totalLights - halfEdge
    case 'DEFENSE':
      return halfEdge
    case 'OFFENSE':
      return ledsPerEdge + halfEdge
    case 'RECEIVE':
      return ledsPerEdge * 2 + halfEdge
    default:
      return totalLights - halfEdge
  }
}

function normalizeIndex(value: number, total: number) {
  return ((value % total) + total) % total
}

function getIntervalOverlap(startA: number, endA: number, startB: number, endB: number) {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB))
}

function getShortestPerimeterDelta(fromStart: number, toStart: number, totalLights: number) {
  const forward = normalizeIndex(toStart - fromStart, totalLights)
  const backward = forward - totalLights
  return Math.abs(forward) <= Math.abs(backward) ? forward : backward
}

export function getPerimeterCoverage({
  globalIndex,
  segmentStart,
  segmentLength,
  totalLights,
}: {
  globalIndex: number
  segmentStart: number
  segmentLength: number
  totalLights: number
}) {
  const normalizedStart = normalizeIndex(segmentStart, totalLights)
  const normalizedEnd = normalizedStart + segmentLength
  const slotIntervals: Array<[number, number]> = [
    [globalIndex, globalIndex + 1],
    [globalIndex + totalLights, globalIndex + totalLights + 1],
  ]

  return slotIntervals.reduce((maxOverlap, [slotStart, slotEnd]) => {
    return Math.max(maxOverlap, getIntervalOverlap(slotStart, slotEnd, normalizedStart, normalizedEnd))
  }, 0)
}

export function getPerimeterSegmentState({
  currentCorePhase,
  transitionFrom,
  transitionTo,
  transitionProgress,
  isPreviewingMovement,
  ledsPerEdge,
}: {
  currentCorePhase: CorePhase
  transitionFrom: CorePhase
  transitionTo: CorePhase
  transitionProgress: number
  isPreviewingMovement: boolean
  ledsPerEdge: number
}) {
  const segmentLength = getPerimeterSegmentLength(ledsPerEdge)
  const totalLights = ledsPerEdge * 4
  const restingStart = getPerimeterSegmentStart(currentCorePhase, ledsPerEdge)

  if (!isPreviewingMovement) {
    return {
      segmentLength,
      totalLights,
      segmentStart: restingStart,
    }
  }

  const fromStart = getPerimeterSegmentStart(transitionFrom, ledsPerEdge)
  const toStart = getPerimeterSegmentStart(transitionTo, ledsPerEdge)
  const travelDelta = getShortestPerimeterDelta(fromStart, toStart, totalLights)

  return {
    segmentLength,
    totalLights,
    segmentStart: fromStart + travelDelta * transitionProgress,
  }
}

export function PhasePadPerimeterRing({
  segmentStart,
  segmentLength,
  totalLights,
  dense = false,
  solid = false,
  className,
  inset = 10,
  radius = 8,
}: {
  segmentStart: number
  segmentLength: number
  totalLights: number
  dense?: boolean
  solid?: boolean
  className?: string
  inset?: number
  radius?: number
}) {
  const maskId = useId().replace(/:/g, '-')
  const path = getRoundedInsetPath(inset, radius)
  const segmentLengthPercent = (segmentLength / totalLights) * 100
  const segmentStartPercent = ((segmentStart / totalLights) * 100 - segmentLengthPercent / 2 + 100) % 100
  const dash = dense ? 1.2 : 2.6
  const gap = dense ? 1.05 : 2
  const baseOpacity = solid ? 0.1 : dense ? 0.22 : 0.26
  const strokeWidth = solid ? (dense ? 4.2 : 4.8) : dense ? 2.6 : 3.6

  return (
    <svg
      aria-hidden="true"
      className={className ?? 'pointer-events-none absolute inset-0 h-full w-full'}
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <defs>
        <mask id={maskId}>
          <rect x="0" y="0" width="100" height="100" fill="black" />
          <path
            d={path}
            pathLength={100}
            fill="none"
            stroke="white"
            strokeWidth={strokeWidth + 2}
            strokeLinecap="round"
            strokeDasharray={`${segmentLengthPercent} ${100 - segmentLengthPercent}`}
            strokeDashoffset={-segmentStartPercent}
          />
        </mask>
      </defs>

      <path
        d={path}
        pathLength={100}
        fill="none"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={solid ? undefined : `${dash} ${gap}`}
        style={{ opacity: baseOpacity }}
      />
      <path
        d={path}
        pathLength={100}
        fill="none"
        stroke="rgba(255,255,255,0.98)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={solid ? undefined : `${dash} ${gap}`}
        mask={`url(#${maskId})`}
        style={{
          filter: dense
            ? 'drop-shadow(0 0 5px rgba(255,255,255,0.34)) drop-shadow(0 0 10px rgba(245,245,245,0.2))'
            : 'drop-shadow(0 0 4px rgba(255,255,255,0.3)) drop-shadow(0 0 8px rgba(245,245,245,0.18))',
        }}
      />
    </svg>
  )
}

export function getPhasePadJoystickEmphasis(props: PrototypeControlProps): PhaseEmphasisTuning {
  return {
    currentWeight: props.tactileTuning.phaseEmphasis.currentWeight,
    nextGlow: props.tactileTuning.c4Literal.phaseSurface.nextGlow,
    foundationalContrast: props.tactileTuning.c4Literal.phaseSurface.foundationalContrast,
    reactiveContrast: props.tactileTuning.c4Literal.phaseSurface.reactiveContrast,
  }
}

export function PhasePadRotationRail(props: PrototypeControlProps) {
  return (
    <TactileRotationSwitch
      value={props.currentRotation}
      onValueChange={props.onRotationSelect}
      switchMotion={props.switchMotion}
      density="compact"
      className="mb-2"
    />
  )
}

export function PhasePadJoystick({
  props,
}: {
  props: PrototypeControlProps
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center">
      <div className="pointer-events-auto">
        <TactilePlayJoystick
          currentPhase={props.currentCorePhase}
          nextPhase={props.nextByPlay}
          nextLabel={formatCorePhaseLabel(props.nextByPlay)}
          mode="literal"
          frameSizeOverride={92}
          switchMotion={props.switchMotion}
          joystickTuning={props.tactileTuning.joystick}
          phaseEmphasis={getPhasePadJoystickEmphasis(props)}
          onPlay={props.onPlay}
          onPhaseSelect={props.onPhaseSelect}
        />
      </div>
    </div>
  )
}
