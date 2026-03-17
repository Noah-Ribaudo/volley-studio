'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { formatCorePhaseLabel, type CorePhase } from '@/lib/rebuild/prototypeFlow'
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
  const [transitionFrom, setTransitionFrom] = useState<CorePhase>(props.displayCurrentCorePhase)
  const [transitionTo, setTransitionTo] = useState<CorePhase>(props.displayNextByPlay)
  const [transitionProgress, setTransitionProgress] = useState(0)

  const playDurationMs = props.tactileTuning.c4Literal.connectorMotion.playDurationMs

  useEffect(() => {
    if (!props.isPreviewingMovement) {
      setTransitionProgress(0)
      setTransitionFrom(props.displayCurrentCorePhase)
      setTransitionTo(props.displayNextByPlay)
      return
    }

    setTransitionFrom(props.displayCurrentCorePhase)
    setTransitionTo(props.displayNextByPlay)
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
  }, [playDurationMs, props.displayCurrentCorePhase, props.displayNextByPlay, props.isPreviewingMovement, props.playAnimationTrigger])

  const liveStatus = useMemo(() => {
    if (props.isPreviewingMovement) {
      return `${formatCorePhaseLabel(transitionFrom)} -> ${formatCorePhaseLabel(transitionTo)}`
    }

    return formatCorePhaseLabel(props.displayCurrentCorePhase)
  }, [props.displayCurrentCorePhase, props.isPreviewingMovement, transitionFrom, transitionTo])

  return {
    transitionFrom,
    transitionTo,
    transitionProgress,
    liveStatus,
  }
}

export function useQuarterTrackTravelState({
  currentCorePhase,
  targetCorePhase,
  isPhaseTraveling,
  piecesPerEdge,
  phaseOrder,
  travelDurationMs,
}: {
  currentCorePhase: CorePhase
  targetCorePhase: CorePhase
  isPhaseTraveling: boolean
  piecesPerEdge: number[]
  phaseOrder: readonly CorePhase[]
  travelDurationMs: number
}) {
  const prefersReducedMotion = useReducedMotion()
  const totalLights = useMemo(() => piecesPerEdge.reduce((a, b) => a + b, 0), [piecesPerEdge])
  const getCornerSegment = useCallback(
    (phase: CorePhase) => {
      const phaseIndex = phaseOrder.indexOf(phase)
      if (phaseIndex < 0) {
        return { start: 0, length: piecesPerEdge[0] ?? 0 }
      }

      let cornerPosition = 0
      for (let i = 0; i < phaseIndex; i++) cornerPosition += piecesPerEdge[i]

      const previousEdgeLength = piecesPerEdge[(phaseIndex - 1 + piecesPerEdge.length) % piecesPerEdge.length] ?? 0
      const nextEdgeLength = piecesPerEdge[phaseIndex] ?? 0

      return {
        start: cornerPosition - previousEdgeLength / 2,
        length: previousEdgeLength / 2 + nextEdgeLength / 2,
      }
    },
    [phaseOrder, piecesPerEdge]
  )

  const restingSegment = useMemo(() => getCornerSegment(currentCorePhase), [currentCorePhase, getCornerSegment])
  const restingStart = restingSegment.start
  const restingLength = restingSegment.length

  const segmentStartRef = useRef(restingStart)
  const segmentLengthRef = useRef(restingLength)
  const [segmentStart, setSegmentStart] = useState(restingStart)
  const [segmentLength, setSegmentLength] = useState(restingLength)

  useEffect(() => {
    segmentStartRef.current = segmentStart
    segmentLengthRef.current = segmentLength
  }, [segmentStart, segmentLength])

  useEffect(() => {
    if (!isPhaseTraveling) {
      segmentStartRef.current = restingStart
      segmentLengthRef.current = restingLength
      setSegmentStart(restingStart)
      setSegmentLength(restingLength)
      return
    }

    const originStart = segmentStartRef.current
    const originLength = segmentLengthRef.current
    const goalSegment = getCornerSegment(targetCorePhase)
    const goalStart = goalSegment.start
    const goalLength = goalSegment.length
    const travelDelta = getShortestPerimeterDelta(originStart, goalStart, totalLights)
    const lengthDelta = goalLength - originLength

    if (Math.abs(travelDelta) < 0.001 && Math.abs(lengthDelta) < 0.001) {
      segmentStartRef.current = goalStart
      segmentLengthRef.current = goalLength
      setSegmentStart(goalStart)
      setSegmentLength(goalLength)
      return
    }

    const durationMs = prefersReducedMotion ? 1 : Math.max(1, travelDurationMs)
    let frameId = 0
    const startedAt = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / durationMs, 1)
      segmentStartRef.current = originStart + travelDelta * progress
      segmentLengthRef.current = originLength + lengthDelta * progress
      setSegmentStart(segmentStartRef.current)
      setSegmentLength(segmentLengthRef.current)

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick)
      }
    }

    frameId = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [
    currentCorePhase,
    getCornerSegment,
    isPhaseTraveling,
    prefersReducedMotion,
    restingLength,
    restingStart,
    targetCorePhase,
    totalLights,
    travelDurationMs,
  ])

  const liveStatus = useMemo(() => {
    if (isPhaseTraveling) {
      return `${formatCorePhaseLabel(currentCorePhase)} -> ${formatCorePhaseLabel(targetCorePhase)}`
    }

    return formatCorePhaseLabel(currentCorePhase)
  }, [currentCorePhase, isPhaseTraveling, targetCorePhase])

  return {
    liveStatus,
    segmentLength,
    segmentStart,
    totalLights,
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

function getEdgeTrackSegmentStart(
  phase: CorePhase,
  piecesPerEdge: number[],
  phaseOrder: readonly CorePhase[]
) {
  const phaseIndex = phaseOrder.indexOf(phase)
  if (phaseIndex <= 0) return 0
  let start = 0
  for (let i = 0; i < phaseIndex; i++) start += piecesPerEdge[i]
  return start
}

function getCornerTrackSegment(
  phase: CorePhase,
  piecesPerEdge: number[],
  phaseOrder: readonly CorePhase[]
) {
  const phaseIndex = phaseOrder.indexOf(phase)
  if (phaseIndex < 0) {
    return {
      start: 0,
      length: piecesPerEdge[0] ?? 0,
    }
  }

  const cornerPosition = getEdgeTrackSegmentStart(phase, piecesPerEdge, phaseOrder)
  const previousEdgeLength = piecesPerEdge[(phaseIndex - 1 + piecesPerEdge.length) % piecesPerEdge.length] ?? 0
  const nextEdgeLength = piecesPerEdge[phaseIndex] ?? 0

  return {
    start: cornerPosition - previousEdgeLength / 2,
    length: previousEdgeLength / 2 + nextEdgeLength / 2,
  }
}

export function getQuarterTrackSegmentState({
  currentCorePhase,
  transitionFrom,
  transitionTo,
  transitionProgress,
  isPreviewingMovement,
  piecesPerEdge,
  phaseOrder,
}: {
  currentCorePhase: CorePhase
  transitionFrom: CorePhase
  transitionTo: CorePhase
  transitionProgress: number
  isPreviewingMovement: boolean
  piecesPerEdge: number[]
  phaseOrder: readonly CorePhase[]
}) {
  const totalLights = piecesPerEdge.reduce((a, b) => a + b, 0)
  const restingSegment = getCornerTrackSegment(currentCorePhase, piecesPerEdge, phaseOrder)
  const restingLength = restingSegment.length
  const restingStart = restingSegment.start

  if (!isPreviewingMovement) {
    return {
      segmentLength: restingLength,
      totalLights,
      segmentStart: restingStart,
    }
  }

  const fromSegment = getCornerTrackSegment(transitionFrom, piecesPerEdge, phaseOrder)
  const toSegment = getCornerTrackSegment(transitionTo, piecesPerEdge, phaseOrder)
  const fromStart = fromSegment.start
  const toStart = toSegment.start
  const fromLength = fromSegment.length
  const toLength = toSegment.length
  const travelDelta = getShortestPerimeterDelta(fromStart, toStart, totalLights)

  return {
    segmentLength: fromLength + (toLength - fromLength) * transitionProgress,
    totalLights,
    segmentStart: fromStart + travelDelta * transitionProgress,
  }
}

function buildHardwareTrackPath(
  insetX: number,
  insetY: number,
  radius: number,
  width: number,
  height: number
) {
  const minX = insetX
  const maxX = width - insetX
  const minY = insetY
  const maxY = height - insetY
  const innerMinX = minX + radius
  const innerMaxX = maxX - radius
  const innerMinY = minY + radius
  const innerMaxY = maxY - radius

  return `M ${width / 2} ${minY} H ${innerMaxX} A ${radius} ${radius} 0 0 1 ${maxX} ${innerMinY} V ${innerMaxY} A ${radius} ${radius} 0 0 1 ${innerMaxX} ${maxY} H ${innerMinX} A ${radius} ${radius} 0 0 1 ${minX} ${innerMaxY} V ${innerMinY} A ${radius} ${radius} 0 0 1 ${innerMinX} ${minY} H ${width / 2}`
}

type HardwareTrackPiece = {
  x: number
  y: number
  angle: number
}

function useEdgeBasedTrackPieces(
  insetX: number,
  insetY: number,
  radius: number,
  width: number,
  height: number,
  piecesPerHorizontalEdge: number,
  piecesPerVerticalEdge: number
) {
  return useMemo(() => {
    const minX = insetX
    const maxX = width - insetX
    const minY = insetY
    const maxY = height - insetY
    const innerMinX = minX + radius
    const innerMaxX = maxX - radius
    const innerMinY = minY + radius
    const innerMaxY = maxY - radius
    const pieces: HardwareTrackPiece[] = []

    for (let i = 0; i < piecesPerHorizontalEdge; i++) {
      const t = (i + 0.5) / piecesPerHorizontalEdge
      pieces.push({ x: innerMinX + t * (innerMaxX - innerMinX), y: minY, angle: 0 })
    }

    for (let i = 0; i < piecesPerVerticalEdge; i++) {
      const t = (i + 0.5) / piecesPerVerticalEdge
      pieces.push({ x: maxX, y: innerMinY + t * (innerMaxY - innerMinY), angle: 90 })
    }

    for (let i = 0; i < piecesPerHorizontalEdge; i++) {
      const t = (i + 0.5) / piecesPerHorizontalEdge
      pieces.push({ x: innerMaxX - t * (innerMaxX - innerMinX), y: maxY, angle: 180 })
    }

    for (let i = 0; i < piecesPerVerticalEdge; i++) {
      const t = (i + 0.5) / piecesPerVerticalEdge
      pieces.push({ x: minX, y: innerMaxY - t * (innerMaxY - innerMinY), angle: 270 })
    }

    return pieces
  }, [height, insetX, insetY, piecesPerHorizontalEdge, piecesPerVerticalEdge, radius, width])
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
  lightAngle,
  segmentStart,
  segmentLength,
  totalLights,
}: {
  tuning: PhasePadHardwareTuning
  lightAngle: number
  segmentStart: number
  segmentLength: number
  totalLights: number
}) {
  const horizontalLong = tuning.trackWidth >= tuning.trackHeight
  const piecesPerHorizontalEdge = horizontalLong ? tuning.piecesPerLongSide : tuning.piecesPerShortSide
  const piecesPerVerticalEdge = horizontalLong ? tuning.piecesPerShortSide : tuning.piecesPerLongSide
  const svgRef = useRef<SVGSVGElement | null>(null)
  const gradientId = useId()
  const [svgSize, setSvgSize] = useState({ width: 100, height: 100 })

  useLayoutEffect(() => {
    const node = svgRef.current
    if (!node) return

    const updateSize = () => {
      const rect = node.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      setSvgSize({ width: rect.width, height: rect.height })
    }

    updateSize()

    const observer = new ResizeObserver(() => {
      updateSize()
    })
    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [])
  const insetX = (svgSize.width * (100 - tuning.trackWidth)) / 200
  const insetY = (svgSize.height * (100 - tuning.trackHeight)) / 200
  const radius = Math.min(
    (Math.min(svgSize.width, svgSize.height) * tuning.trackCornerRadius) / 100,
    (svgSize.width * tuning.trackWidth) / 200,
    (svgSize.height * tuning.trackHeight) / 200
  )
  const pathD = useMemo(
    () => buildHardwareTrackPath(insetX, insetY, radius, svgSize.width, svgSize.height),
    [insetX, insetY, radius, svgSize.height, svgSize.width]
  )
  const { pathRef } = useHardwareTrackPieces(pathD, totalLights)
  const pieces = useEdgeBasedTrackPieces(
    insetX,
    insetY,
    radius,
    svgSize.width,
    svgSize.height,
    piecesPerHorizontalEdge,
    piecesPerVerticalEdge
  )
  const lightRadians = (lightAngle * Math.PI) / 180
  const lightVectorX = Math.sin(lightRadians)
  const lightVectorY = -Math.cos(lightRadians)
  const gradientX1 = 50 + lightVectorX * 50
  const gradientY1 = 50 + lightVectorY * 50
  const gradientX2 = 50 - lightVectorX * 50
  const gradientY2 = 50 - lightVectorY * 50

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      preserveAspectRatio="none"
      viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient
          id={`phase-pad-hardware-rim-${gradientId}`}
          x1={`${gradientX1}%`}
          y1={`${gradientY1}%`}
          x2={`${gradientX2}%`}
          y2={`${gradientY2}%`}
        >
          <stop offset="0%" stopColor={`rgba(18,18,22,${0.4 + tuning.channelShadow * 0.2})`} />
          <stop offset="45%" stopColor={`rgba(76,82,92,${0.14 + tuning.channelHighlight * 0.12})`} />
          <stop offset="100%" stopColor={`rgba(255,255,255,${0.12 + tuning.channelHighlight * 0.18})`} />
        </linearGradient>
        <filter id="phase-pad-hardware-piece-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0.7" stdDeviation="1.2" floodColor="rgba(0,0,0,0.42)" />
        </filter>
        <filter id="phase-pad-hardware-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation={1 + tuning.glow * 2.6}
            floodColor={`rgba(255,142,44,${0.2 + tuning.bloom * 0.18})`}
          />
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation={2 + tuning.bloom * 4.2}
            floodColor={`rgba(210,88,18,${0.1 + tuning.bloom * 0.14})`}
          />
        </filter>
      </defs>

      <path
        ref={pathRef}
        d={pathD}
        fill="none"
        stroke={`url(#phase-pad-hardware-rim-${gradientId})`}
        strokeWidth={tuning.channelWidth + 2.2}
        strokeLinecap="round"
      />
      <path
        d={pathD}
        fill="none"
        stroke={`rgba(10,10,12,${0.3 + tuning.channelShadow * 0.2})`}
        strokeWidth={tuning.channelWidth}
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
              g: Math.round(140 - strength * 18),
              b: Math.round(42 - strength * 16),
            }
          : {
              r: 132,
              g: 132,
              b: 136,
            }
        const isHorizontalPiece = piece.angle % 180 === 0
        const pieceLength = isHorizontalPiece
          ? tuning.pieceLengthLongSide
          : tuning.pieceLengthShortSide
        const localPieceLength = pieceLength
        const localPieceThickness = tuning.pieceThickness
        const highlightInsetX = localPieceLength * 0.05
        const highlightInsetY = localPieceThickness * 0.14
        const highlightWidth = Math.max(0, localPieceLength - highlightInsetX * 2)
        const highlightHeight = Math.max(0, localPieceThickness * 0.44)

        return (
          <g key={`hardware-piece-${index}`} transform={`translate(${piece.x} ${piece.y}) rotate(${piece.angle})`}>
            <rect
              x={-localPieceLength / 2}
              y={-localPieceThickness / 2}
              width={localPieceLength}
              height={localPieceThickness}
              rx={tuning.pieceRadius}
              fill={`rgba(128,128,132,${0.22 + tuning.inactiveOpacity * 0.2})`}
              filter="url(#phase-pad-hardware-piece-shadow)"
            />
            <rect
              x={-localPieceLength / 2}
              y={-localPieceThickness / 2}
              width={localPieceLength}
              height={localPieceThickness}
              rx={tuning.pieceRadius}
              fill={`rgba(${activeColor.r},${activeColor.g},${activeColor.b},${activeOpacity})`}
              filter={strength > 0 ? 'url(#phase-pad-hardware-glow)' : undefined}
            />
            <rect
              x={-localPieceLength / 2 + highlightInsetX}
              y={-localPieceThickness / 2 + highlightInsetY}
              width={highlightWidth}
              height={highlightHeight}
              rx={Math.max(0.5, tuning.pieceRadius * 0.72)}
              fill={strength > 0
                ? `rgba(255,198,122,${0.12 + tuning.channelHighlight * 0.1 + strength * 0.14})`
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

export function PhasePadRotationRail(
  props: PrototypeControlProps & {
    railStyle?: React.CSSProperties
    railItemColors?: {
      bg: string
      activeBg: string
      text: string
      activeText: string
    }
  }
) {
  return (
    <TactileRotationSwitch
      value={props.currentRotation}
      onValueChange={props.onRotationSelect}
      switchMotion={props.switchMotion}
      density="compact"
      className="mb-1.5 rounded-[16px] border p-[5px]"
      style={props.railStyle ?? {
        background: 'linear-gradient(180deg, rgba(238,230,214,0.98) 0%, rgba(220,206,184,0.98) 100%)',
        borderColor: 'rgba(176,151,116,0.28)',
        boxShadow: 'inset 0 1px 0 rgba(255,247,234,0.82)',
      }}
      itemColors={props.railItemColors}
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
          currentPhase={props.displayCurrentCorePhase}
          nextPhase={props.displayNextByPlay}
          nextLabel={props.nextByPlay === 'FIRST_ATTACK' ? '1st Attack' : formatCorePhaseLabel(props.displayNextByPlay)}
          canPlayAdvance={props.canPlayAdvance}
          manualJoystickNudge={props.manualJoystickNudge}
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
