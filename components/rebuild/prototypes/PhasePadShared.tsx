'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { type CorePhase, formatCorePhaseLabel } from '@/lib/rebuild/prototypeFlow'
import type { PhaseEmphasisTuning } from '@/lib/rebuild/tactileTuning'
import { TactilePlayJoystick } from './TactilePlayJoystick'
import type { PrototypeControlProps } from './types'

export type PerimeterEdgeId = 'top' | 'right' | 'bottom' | 'left'

export type PerimeterLight = {
  key: string
  edge: PerimeterEdgeId
  index: number
  globalIndex: number
  style: React.CSSProperties
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

export function createPerimeterLights({
  ledsPerEdge,
  inset,
}: {
  ledsPerEdge: number
  inset: number
}) {
  const step = 84 / (ledsPerEdge - 1)
  const offsetForIndex = (index: number) => `${8 + index * step}%`
  const edgeOrder: PerimeterEdgeId[] = ['top', 'right', 'bottom', 'left']

  return edgeOrder.flatMap((edge, edgeOffset) =>
    Array.from({ length: ledsPerEdge }, (_, index) => {
      const styleByEdge: Record<PerimeterEdgeId, React.CSSProperties> = {
        top: { top: inset, left: offsetForIndex(index) },
        right: { right: inset, top: offsetForIndex(index) },
        bottom: { bottom: inset, right: offsetForIndex(index) },
        left: { left: inset, bottom: offsetForIndex(index) },
      }

      return {
        key: `${edge}-${index}`,
        edge,
        index,
        globalIndex: edgeOffset * ledsPerEdge + index,
        style: styleByEdge[edge],
      }
    })
  )
}

export function getPerimeterSegmentLength(ledsPerEdge: number) {
  return ledsPerEdge * 2
}

export function getPerimeterSegmentStart(phase: CorePhase, ledsPerEdge: number) {
  const totalLights = ledsPerEdge * 4

  switch (phase) {
    case 'SERVE':
      return totalLights - ledsPerEdge
    case 'DEFENSE':
      return 0
    case 'OFFENSE':
      return ledsPerEdge
    case 'RECEIVE':
      return ledsPerEdge * 2
    default:
      return totalLights - ledsPerEdge
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
    <div className="mb-2 rounded-[14px] border border-white/6 bg-black/20 p-1">
      <div className="grid grid-cols-6 gap-1">
        {[1, 2, 3, 4, 5, 6].map((rotation) => (
          <Button
            key={rotation}
            type="button"
            size="sm"
            variant={rotation === props.currentRotation ? 'default' : 'outline'}
            className="h-8 min-w-0 px-0 text-base font-semibold tracking-[-0.03em]"
            onClick={() => props.onRotationSelect(rotation as 1 | 2 | 3 | 4 | 5 | 6)}
          >
            R{rotation}
          </Button>
        ))}
      </div>
    </div>
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
