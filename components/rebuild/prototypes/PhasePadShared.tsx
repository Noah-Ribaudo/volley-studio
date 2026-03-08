'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { type CorePhase, formatCorePhaseLabel } from '@/lib/rebuild/prototypeFlow'
import type { PhaseEmphasisTuning, PhasePadHardwareTuning } from '@/lib/rebuild/tactileTuning'
import { TactilePlayJoystick } from './TactilePlayJoystick'
import { TactileRotationSwitch } from './TactileRotationSwitch'
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
  startPercent = 8,
  endPercent = 92,
}: {
  ledsPerEdge: number
  inset: number
  startPercent?: number
  endPercent?: number
}) {
  const span = endPercent - startPercent
  const step = span / (ledsPerEdge - 1)
  const offsetForIndex = (index: number) => `${startPercent + index * step}%`
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

function getQuarterTrackSegmentStart(
  phase: CorePhase,
  positionsPerQuarter: number,
  phaseOrder: readonly CorePhase[]
) {
  const phaseIndex = phaseOrder.indexOf(phase)
  return (phaseIndex >= 0 ? phaseIndex : 0) * positionsPerQuarter
}

export function getQuarterTrackSegmentState({
  currentCorePhase,
  transitionFrom,
  transitionTo,
  transitionProgress,
  isPreviewingMovement,
  positionsPerQuarter,
  phaseOrder,
}: {
  currentCorePhase: CorePhase
  transitionFrom: CorePhase
  transitionTo: CorePhase
  transitionProgress: number
  isPreviewingMovement: boolean
  positionsPerQuarter: number
  phaseOrder: readonly CorePhase[]
}) {
  const segmentLength = positionsPerQuarter
  const totalLights = positionsPerQuarter * phaseOrder.length
  const restingStart = getQuarterTrackSegmentStart(currentCorePhase, positionsPerQuarter, phaseOrder)

  if (!isPreviewingMovement) {
    return {
      segmentLength,
      totalLights,
      segmentStart: restingStart,
    }
  }

  const fromStart = getQuarterTrackSegmentStart(transitionFrom, positionsPerQuarter, phaseOrder)
  const toStart = getQuarterTrackSegmentStart(transitionTo, positionsPerQuarter, phaseOrder)
  const travelDelta = getShortestPerimeterDelta(fromStart, toStart, totalLights)

  return {
    segmentLength,
    totalLights,
    segmentStart: fromStart + travelDelta * transitionProgress,
  }
}

function buildHardwareTrackPath(inset: number, radius: number) {
  const min = inset
  const max = 100 - inset
  const innerMin = min + radius
  const innerMax = max - radius

  return `M 50 ${min} H ${innerMax} A ${radius} ${radius} 0 0 1 ${max} ${innerMin} V ${innerMax} A ${radius} ${radius} 0 0 1 ${innerMax} ${max} H ${innerMin} A ${radius} ${radius} 0 0 1 ${min} ${innerMax} V ${innerMin} A ${radius} ${radius} 0 0 1 ${innerMin} ${min} H 50`
}

type HardwareTrackPiece = {
  x: number
  y: number
  angle: number
}

function useHardwareTrackPieces(pathD: string, pieceCount: number) {
  const pathRef = useRef<SVGPathElement | null>(null)
  const [pieces, setPieces] = useState<HardwareTrackPiece[]>([])

  useLayoutEffect(() => {
    const path = pathRef.current
    if (!path || pieceCount <= 0) {
      setPieces([])
      return
    }

    const totalLength = path.getTotalLength()
    const nextPieces = Array.from({ length: pieceCount }, (_, index) => {
      const centerDistance = ((index + 0.5) / pieceCount) * totalLength
      const sampleAhead = Math.min(centerDistance + 0.5, totalLength)
      const sampleBehind = Math.max(centerDistance - 0.5, 0)
      const point = path.getPointAtLength(centerDistance)
      const ahead = path.getPointAtLength(sampleAhead)
      const behind = path.getPointAtLength(sampleBehind)
      const angle = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI

      return {
        x: point.x,
        y: point.y,
        angle,
      }
    })

    setPieces(nextPieces)
  }, [pathD, pieceCount])

  return {
    pathRef,
    pieces,
  }
}

export function PhasePadHardwareLane({
  tuning,
  segmentStart,
  segmentLength,
  totalLights,
}: {
  tuning: PhasePadHardwareTuning
  segmentStart: number
  segmentLength: number
  totalLights: number
}) {
  const pathD = useMemo(
    () => buildHardwareTrackPath(tuning.trackInset, tuning.trackRadius),
    [tuning.trackInset, tuning.trackRadius]
  )
  const { pathRef, pieces } = useHardwareTrackPieces(pathD, totalLights)

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <defs>
        <filter id="phase-pad-hardware-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0.7" stdDeviation="1.2" floodColor="rgba(0,0,0,0.42)" />
        </filter>
        <filter id="phase-pad-hardware-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation={1 + tuning.glow * 2.6}
            floodColor={`rgba(255,176,73,${0.2 + tuning.bloom * 0.18})`}
          />
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation={2 + tuning.bloom * 4.2}
            floodColor={`rgba(255,128,32,${0.1 + tuning.bloom * 0.14})`}
          />
        </filter>
      </defs>

      <path
        ref={pathRef}
        d={pathD}
        fill="none"
        stroke={`rgba(0,0,0,${0.22 + tuning.channelShadow * 0.26})`}
        strokeWidth={tuning.trackWidth + 3}
        strokeLinecap="round"
      />
      <path
        d={pathD}
        fill="none"
        stroke={`rgba(255,255,255,${0.04 + tuning.channelHighlight * 0.12})`}
        strokeWidth={tuning.trackWidth + 0.75}
        strokeLinecap="round"
      />
      <path
        d={pathD}
        fill="none"
        stroke={`rgba(10,10,12,${0.38 + tuning.channelShadow * 0.24})`}
        strokeWidth={tuning.trackWidth}
        strokeLinecap="round"
      />

      {pieces.map((piece, index) => {
        const strength = getPerimeterCoverage({
          globalIndex: index,
          segmentStart,
          segmentLength,
          totalLights,
        })
        const activeOpacity = strength > 0 ? tuning.inactiveOpacity + strength * (tuning.activeOpacity - tuning.inactiveOpacity) : tuning.inactiveOpacity
        const activeColor = strength > 0
          ? {
              r: 255,
              g: Math.round(186 - strength * 28),
              b: Math.round(92 - strength * 40),
            }
          : {
              r: 132,
              g: 132,
              b: 136,
            }

        return (
          <g key={`hardware-piece-${index}`} transform={`translate(${piece.x} ${piece.y}) rotate(${piece.angle})`}>
            <rect
              x={-tuning.pieceLength / 2}
              y={-tuning.pieceThickness / 2}
              width={tuning.pieceLength}
              height={tuning.pieceThickness}
              rx={tuning.pieceRadius}
              fill={`rgba(128,128,132,${0.22 + tuning.inactiveOpacity * 0.2})`}
              filter="url(#phase-pad-hardware-shadow)"
            />
            <rect
              x={-tuning.pieceLength / 2}
              y={-tuning.pieceThickness / 2}
              width={tuning.pieceLength}
              height={tuning.pieceThickness}
              rx={tuning.pieceRadius}
              fill={`rgba(${activeColor.r},${activeColor.g},${activeColor.b},${activeOpacity})`}
              filter={strength > 0 ? 'url(#phase-pad-hardware-glow)' : undefined}
            />
            <rect
              x={-tuning.pieceLength / 2 + 0.7}
              y={-tuning.pieceThickness / 2 + 0.55}
              width={Math.max(0, tuning.pieceLength - 1.4)}
              height={Math.max(0, tuning.pieceThickness * 0.44)}
              rx={Math.max(0.5, tuning.pieceRadius * 0.72)}
              fill={strength > 0
                ? `rgba(255,228,184,${0.14 + tuning.channelHighlight * 0.12 + strength * 0.16})`
                : 'rgba(255,255,255,0.03)'}
            />
          </g>
        )
      })}
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
    <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center">
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
