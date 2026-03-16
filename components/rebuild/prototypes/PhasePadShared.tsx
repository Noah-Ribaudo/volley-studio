'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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

  const getEdgeStart = useCallback(
    (phase: CorePhase) => {
      const idx = phaseOrder.indexOf(phase)
      if (idx <= 0) return 0
      let start = 0
      for (let i = 0; i < idx; i++) start += piecesPerEdge[i]
      return start
    },
    [phaseOrder, piecesPerEdge]
  )

  const getEdgeLength = useCallback(
    (phase: CorePhase) => {
      const idx = phaseOrder.indexOf(phase)
      return idx >= 0 ? piecesPerEdge[idx] : piecesPerEdge[0]
    },
    [phaseOrder, piecesPerEdge]
  )

  const restingStart = useMemo(() => getEdgeStart(currentCorePhase), [currentCorePhase, getEdgeStart])
  const restingLength = useMemo(() => getEdgeLength(currentCorePhase), [currentCorePhase, getEdgeLength])

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
    const goalStart = getEdgeStart(targetCorePhase)
    const goalLength = getEdgeLength(targetCorePhase)
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
    getEdgeLength,
    getEdgeStart,
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
  const currentIdx = phaseOrder.indexOf(currentCorePhase)
  const restingLength = currentIdx >= 0 ? piecesPerEdge[currentIdx] : piecesPerEdge[0]
  const restingStart = getEdgeTrackSegmentStart(currentCorePhase, piecesPerEdge, phaseOrder)

  if (!isPreviewingMovement) {
    return {
      segmentLength: restingLength,
      totalLights,
      segmentStart: restingStart,
    }
  }

  const fromStart = getEdgeTrackSegmentStart(transitionFrom, piecesPerEdge, phaseOrder)
  const toStart = getEdgeTrackSegmentStart(transitionTo, piecesPerEdge, phaseOrder)
  const fromIdx = phaseOrder.indexOf(transitionFrom)
  const toIdx = phaseOrder.indexOf(transitionTo)
  const fromLength = fromIdx >= 0 ? piecesPerEdge[fromIdx] : piecesPerEdge[0]
  const toLength = toIdx >= 0 ? piecesPerEdge[toIdx] : piecesPerEdge[0]
  const travelDelta = getShortestPerimeterDelta(fromStart, toStart, totalLights)

  return {
    segmentLength: fromLength + (toLength - fromLength) * transitionProgress,
    totalLights,
    segmentStart: fromStart + travelDelta * transitionProgress,
  }
}

function buildHardwareTrackPath(insetX: number, insetY: number, radiusX: number, radiusY: number) {
  const minX = insetX
  const maxX = 100 - insetX
  const minY = insetY
  const maxY = 100 - insetY
  const innerMinX = minX + radiusX
  const innerMaxX = maxX - radiusX
  const innerMinY = minY + radiusY
  const innerMaxY = maxY - radiusY

  return `M 50 ${minY} H ${innerMaxX} A ${radiusX} ${radiusY} 0 0 1 ${maxX} ${innerMinY} V ${innerMaxY} A ${radiusX} ${radiusY} 0 0 1 ${innerMaxX} ${maxY} H ${innerMinX} A ${radiusX} ${radiusY} 0 0 1 ${minX} ${innerMaxY} V ${innerMinY} A ${radiusX} ${radiusY} 0 0 1 ${innerMinX} ${minY} H 50`
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

function useEdgeBasedTrackPieces(
  insetX: number,
  insetY: number,
  radiusX: number,
  radiusY: number,
  piecesPerH: number,
  piecesPerV: number
) {
  return useMemo(() => {
    const minX = insetX, maxX = 100 - insetX
    const minY = insetY, maxY = 100 - insetY
    const innerMinX = minX + radiusX, innerMaxX = maxX - radiusX
    const innerMinY = minY + radiusY, innerMaxY = maxY - radiusY
    const pieces: HardwareTrackPiece[] = []

    // Top edge: left → right
    for (let i = 0; i < piecesPerH; i++) {
      const t = (i + 0.5) / piecesPerH
      pieces.push({ x: innerMinX + t * (innerMaxX - innerMinX), y: minY, angle: 0 })
    }
    // Right edge: top → bottom
    for (let i = 0; i < piecesPerV; i++) {
      const t = (i + 0.5) / piecesPerV
      pieces.push({ x: maxX, y: innerMinY + t * (innerMaxY - innerMinY), angle: 90 })
    }
    // Bottom edge: right → left
    for (let i = 0; i < piecesPerH; i++) {
      const t = (i + 0.5) / piecesPerH
      pieces.push({ x: innerMaxX - t * (innerMaxX - innerMinX), y: maxY, angle: 180 })
    }
    // Left edge: bottom → top
    for (let i = 0; i < piecesPerV; i++) {
      const t = (i + 0.5) / piecesPerV
      pieces.push({ x: minX, y: innerMaxY - t * (innerMaxY - innerMinY), angle: 270 })
    }

    return pieces
  }, [insetX, insetY, radiusX, radiusY, piecesPerH, piecesPerV])
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
  const svgRef = useRef<SVGSVGElement>(null)
  const [aspectRatio, setAspectRatio] = useState(1)

  useLayoutEffect(() => {
    const el = svgRef.current
    if (!el) return
    const measure = () => {
      const { width, height } = el.getBoundingClientRect()
      if (height > 0) setAspectRatio(width / height)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Correct inset/radius for the non-uniform viewBox scaling so the
  // track has equal pixel distance from the button group on all sides
  const sqrtAr = Math.sqrt(aspectRatio)
  const insetX = tuning.trackInset / sqrtAr
  const insetY = tuning.trackInset * sqrtAr
  const radiusX = tuning.trackRadius / sqrtAr
  const radiusY = tuning.trackRadius * sqrtAr

  const pathD = useMemo(
    () => buildHardwareTrackPath(insetX, insetY, radiusX, radiusY),
    [insetX, insetY, radiusX, radiusY]
  )
  const pieces = useEdgeBasedTrackPieces(
    insetX,
    insetY,
    radiusX,
    radiusY,
    tuning.piecesPerHorizontalEdge,
    tuning.piecesPerVerticalEdge
  )

  return (
    <svg
      ref={svgRef}
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
              g: Math.round(140 - strength * 18),
              b: Math.round(42 - strength * 16),
            }
          : {
              r: 132,
              g: 132,
              b: 136,
            }

        // Counteract the non-uniform viewBox scaling so every piece
        // appears the same shape regardless of which edge it sits on
        const θ = piece.angle * Math.PI / 180
        const cosθ = Math.cos(θ)
        const sinθ = Math.sin(θ)
        const rx = Math.sqrt((cosθ * aspectRatio) ** 2 + sinθ ** 2)
        const ry = Math.sqrt((sinθ * aspectRatio) ** 2 + cosθ ** 2)
        const sx = Math.sqrt(ry / rx)
        const sy = Math.sqrt(rx / ry)

        return (
          <g key={`hardware-piece-${index}`} transform={`translate(${piece.x} ${piece.y}) rotate(${piece.angle}) scale(${sx.toFixed(4)},${sy.toFixed(4)})`}>
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
