'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Position, PositionCoordinates, Role, RallyPhase, Rotation } from '@/lib/types'
import { ROLE_INFO, ROLE_PRIORITY, ROLES } from '@/lib/types'
import { getWhiteboardPositions } from '@/lib/whiteboard'

const COURT_WIDTH = 400
const COURT_HEIGHT = 800
const COURT_PADDING = 60

const VIEWBOX_WIDTH = COURT_WIDTH + COURT_PADDING * 2
const VIEWBOX_HEIGHT = COURT_HEIGHT + COURT_PADDING * 2

const DEFAULT_ROTATION: Rotation = 1
const DEFAULT_PHASE: RallyPhase = 'ATTACK_PHASE'

const NORMALIZED_MARGIN = 0.2

type FeatureFlags = {
  showCourt: boolean
  showTokens: boolean
  enableDrag: boolean
  showNextSteps: boolean
  enablePlay: boolean
  enableCollision: boolean
  enableDeflection: boolean
}

type AnimState = {
  role: Role
  start: Position
  end: Position
  control: Position | null
  length: number
  distance: number
  currentSpeed: number
  targetSpeed: number
  offset: Position
  offsetVel: Position
  done: boolean
}

type CanvasState = 'base' | 'playing' | 'played'

type LockedPath = {
  start: Position
  end: Position
  control: Position | null
  length: number
  svgLength: number
}

const DEFAULT_FEATURES: FeatureFlags = {
  showCourt: true,
  showTokens: true,
  enableDrag: true,
  showNextSteps: true,
  enablePlay: true,
  enableCollision: true,
  enableDeflection: true,
}

const FEATURE_STAGES: Array<{ id: number; label: string; flags: FeatureFlags }> = [
  {
    id: 1,
    label: 'Court Only',
    flags: {
      showCourt: true,
      showTokens: false,
      enableDrag: false,
      showNextSteps: false,
      enablePlay: false,
      enableCollision: false,
      enableDeflection: false,
    },
  },
  {
    id: 2,
    label: 'Tokens (Static)',
    flags: {
      showCourt: true,
      showTokens: true,
      enableDrag: false,
      showNextSteps: false,
      enablePlay: false,
      enableCollision: false,
      enableDeflection: false,
    },
  },
  {
    id: 3,
    label: 'Drag Tokens',
    flags: {
      showCourt: true,
      showTokens: true,
      enableDrag: true,
      showNextSteps: false,
      enablePlay: false,
      enableCollision: false,
      enableDeflection: false,
    },
  },
  {
    id: 4,
    label: 'Next Steps',
    flags: {
      showCourt: true,
      showTokens: true,
      enableDrag: true,
      showNextSteps: true,
      enablePlay: false,
      enableCollision: false,
      enableDeflection: false,
    },
  },
  {
    id: 5,
    label: 'Play (Speed-Based)',
    flags: {
      showCourt: true,
      showTokens: true,
      enableDrag: false,
      showNextSteps: true,
      enablePlay: true,
      enableCollision: false,
      enableDeflection: false,
    },
  },
  {
    id: 6,
    label: 'Collision + Deflection',
    flags: { ...DEFAULT_FEATURES },
  },
]

export function VolleyballCourtRebuild() {
  const [stageId, setStageId] = useState(6)
  const stageFlags = useMemo(() => {
    const stage = FEATURE_STAGES.find((item) => item.id === stageId)
    return stage ? stage.flags : DEFAULT_FEATURES
  }, [stageId])

  const [features, setFeatures] = useState<FeatureFlags>(DEFAULT_FEATURES)

  useEffect(() => {
    setFeatures(stageFlags)
  }, [stageFlags])


  const initialPositions = useMemo(() => {
    const result = getWhiteboardPositions({
      rotation: DEFAULT_ROTATION,
      phase: DEFAULT_PHASE,
      isReceiving: true,
      showBothSides: false,
    })
    return result.home
  }, [])

  const [positions, setPositions] = useState<PositionCoordinates>(initialPositions)
  const positionsRef = useRef(positions)

  const [arrows, setArrows] = useState<Partial<Record<Role, Position>>>(() => {
    const next: Partial<Record<Role, Position>> = {}
    ROLES.forEach((role) => {
      const start = initialPositions[role]
      if (start) {
        next[role] = {
          x: start.x,
          y: Math.max(-NORMALIZED_MARGIN, start.y - 0.18),
        }
      }
    })
    return next
  })

  const [curveStrength, setCurveStrength] = useState(0.35)
  const [baseSpeed, setBaseSpeed] = useState(0.7)
  const [acceleration, setAcceleration] = useState(2.4)
  const [collisionRadius, setCollisionRadius] = useState(0.1)
  const [deflectionStrength, setDeflectionStrength] = useState(0.4)
  const [lookAheadTime, setLookAheadTime] = useState(0.4)
  const [cornerSlowdown, setCornerSlowdown] = useState(0.1)

  const [canvasState, setCanvasState] = useState<CanvasState>('base')
  const [playedPositions, setPlayedPositions] = useState<PositionCoordinates | null>(null)
  const [lockedPaths, setLockedPaths] = useState<Partial<Record<Role, LockedPath>>>({})
  const [curveOverrides, setCurveOverrides] = useState<Partial<Record<Role, Position>>>({})
  const [animatedPositions, setAnimatedPositions] = useState<PositionCoordinates>(initialPositions)
  const [showResetPrompt, setShowResetPrompt] = useState(false)
  const [hoveredPathRole, setHoveredPathRole] = useState<Role | null>(null)
  const [draggingControlRole, setDraggingControlRole] = useState<Role | null>(null)

  const animatedPositionsRef = useRef(animatedPositions)
  const arrowsRef = useRef(arrows)
  const animationRef = useRef<number | null>(null)
  const animStatesRef = useRef<Partial<Record<Role, AnimState>>>({})
  const lastFrameRef = useRef<number | null>(null)

  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragStateRef = useRef<{
    role: Role
    pointerId: number
    offset: Position
    type: 'token' | 'arrow' | 'control'
  } | null>(null)

  useEffect(() => {
    positionsRef.current = positions
  }, [positions])

  useEffect(() => {
    animatedPositionsRef.current = animatedPositions
  }, [animatedPositions])

  useEffect(() => {
    arrowsRef.current = arrows
  }, [arrows])

  useEffect(() => {
    if (canvasState === 'base') {
      setShowResetPrompt(false)
    }
  }, [canvasState])

  const clampExtended = useCallback((pos: Position): Position => {
    return {
      x: Math.max(-NORMALIZED_MARGIN, Math.min(1 + NORMALIZED_MARGIN, pos.x)),
      y: Math.max(-NORMALIZED_MARGIN, Math.min(1 + NORMALIZED_MARGIN, pos.y)),
    }
  }, [])

  const clampControl = useCallback((pos: Position): Position => {
    return {
      x: Math.max(-0.5, Math.min(1.5, pos.x)),
      y: Math.max(-0.2, Math.min(1.2, pos.y)),
    }
  }, [])

  const toSvg = useCallback((pos: Position) => {
    return {
      x: COURT_PADDING + pos.x * COURT_WIDTH,
      y: COURT_PADDING + pos.y * COURT_HEIGHT,
    }
  }, [])

  const toNormalized = useCallback((svgX: number, svgY: number): Position => {
    return {
      x: (svgX - COURT_PADDING) / COURT_WIDTH,
      y: (svgY - COURT_PADDING) / COURT_HEIGHT,
    }
  }, [])

  const getSvgPointFromEvent = useCallback((event: PointerEvent | React.PointerEvent) => {
    const svg = svgRef.current
    if (!svg) return null

    const pt = svg.createSVGPoint()
    pt.x = event.clientX
    pt.y = event.clientY

    const ctm = svg.getScreenCTM()
    if (!ctm) return null

    const transformed = pt.matrixTransform(ctm.inverse())
    return { x: transformed.x, y: transformed.y }
  }, [])

  const computeControlPoint = useCallback((start: Position, end: Position): Position | null => {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 0.0001) return null

    const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
    const perp = { x: -dy / dist, y: dx / dist }

    const center = { x: 0.5, y: 0.5 }
    const toCenter = { x: center.x - start.x, y: center.y - start.y }
    const side = Math.sign(dx * toCenter.y - dy * toCenter.x) || 1

    const bend = curveStrength * dist

    return {
      x: mid.x + perp.x * bend * side,
      y: mid.y + perp.y * bend * side,
    }
  }, [curveStrength])

  const getBezierPoint = useCallback((start: Position, control: Position | null, end: Position, t: number): Position => {
    if (!control) {
      return {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
      }
    }
    const mt = 1 - t
    return {
      x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
      y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
    }
  }, [])

  const getCurvature = useCallback((start: Position, control: Position | null, end: Position, t: number) => {
    if (!control) return 0
    const x0 = start.x
    const y0 = start.y
    const x1 = control.x
    const y1 = control.y
    const x2 = end.x
    const y2 = end.y

    const oneMinus = 1 - t
    const dx = 2 * oneMinus * (x1 - x0) + 2 * t * (x2 - x1)
    const dy = 2 * oneMinus * (y1 - y0) + 2 * t * (y2 - y1)
    const ddx = 2 * (x2 - 2 * x1 + x0)
    const ddy = 2 * (y2 - 2 * y1 + y0)

    const denom = Math.pow(dx * dx + dy * dy, 1.5)
    if (denom < 1e-6) return 0
    return Math.abs(dx * ddy - dy * ddx) / denom
  }, [])

  const getCurveMidpoint = useCallback((start: Position, control: Position | null, end: Position): Position => {
    if (!control) {
      return {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2,
      }
    }
    return {
      x: 0.25 * start.x + 0.5 * control.x + 0.25 * end.x,
      y: 0.25 * start.y + 0.5 * control.y + 0.25 * end.y,
    }
  }, [])

  const controlFromMidpoint = useCallback((start: Position, end: Position, midpoint: Position): Position => {
    return {
      x: 2 * midpoint.x - 0.5 * start.x - 0.5 * end.x,
      y: 2 * midpoint.y - 0.5 * start.y - 0.5 * end.y,
    }
  }, [])

  const getPathLength = useCallback((start: Position, control: Position | null, end: Position) => {
    const steps = 70
    let length = 0
    let prev = start
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps
      const point = getBezierPoint(start, control, end, t)
      length += Math.hypot(point.x - prev.x, point.y - prev.y)
      prev = point
    }
    return length
  }, [getBezierPoint])

  const getPathLengthSvg = useCallback((start: Position, control: Position | null, end: Position) => {
    const steps = 70
    let length = 0
    let prev = toSvg(start)
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps
      const point = getBezierPoint(start, control, end, t)
      const svgPoint = toSvg(point)
      length += Math.hypot(svgPoint.x - prev.x, svgPoint.y - prev.y)
      prev = svgPoint
    }
    return length
  }, [getBezierPoint, toSvg])

  const getPositionAtDistance = useCallback((
    start: Position,
    control: Position | null,
    end: Position,
    distance: number,
    totalLength: number,
  ): Position => {
    if (totalLength <= 0) return start
    const steps = 90
    let accumulated = 0
    let prev = start

    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps
      const point = getBezierPoint(start, control, end, t)
      const segment = Math.hypot(point.x - prev.x, point.y - prev.y)
      if (accumulated + segment >= distance) {
        const segmentT = segment === 0 ? 0 : (distance - accumulated) / segment
        return {
          x: prev.x + (point.x - prev.x) * segmentT,
          y: prev.y + (point.y - prev.y) * segmentT,
        }
      }
      accumulated += segment
      prev = point
    }

    return end
  }, [getBezierPoint])

  const activeRoles = useMemo(() => {
    return ROLES.slice().sort((a, b) => {
      const pa = ROLE_PRIORITY[a] ?? 99
      const pb = ROLE_PRIORITY[b] ?? 99
      return pa - pb
    })
  }, [])

  const startAnimation = useCallback(() => {
    if (!features.enablePlay) return
    if (canvasState !== 'base') return

    const currentPositions = { ...positionsRef.current }
    const states: Partial<Record<Role, AnimState>> = {}
    const locked: Partial<Record<Role, LockedPath>> = {}

    activeRoles.forEach((role) => {
      const end = arrowsRef.current[role]
      const start = currentPositions[role]
      if (!end || !start) return

      const control = curveOverrides[role] ?? computeControlPoint(start, end)
      const length = getPathLength(start, control, end)
      const svgLength = getPathLengthSvg(start, control, end)

      states[role] = {
        role,
        start,
        end,
        control,
        length,
        distance: 0,
        currentSpeed: 0,
        targetSpeed: baseSpeed,
        offset: { x: 0, y: 0 },
        offsetVel: { x: 0, y: 0 },
        done: false,
      }
      locked[role] = {
        start,
        end,
        control,
        length,
        svgLength,
      }
    })

    if (Object.keys(states).length === 0) return

    animStatesRef.current = states
    setLockedPaths(locked)
    setAnimatedPositions(currentPositions)
    setCanvasState('playing')
    lastFrameRef.current = null

    const tick = (now: number) => {
    if (!features.enablePlay) {
      setCanvasState('base')
      animStatesRef.current = {}
      setLockedPaths({})
      return
    }

      if (lastFrameRef.current === null) {
        lastFrameRef.current = now
      }
      const dt = Math.min((now - lastFrameRef.current) / 1000, 0.05)
      lastFrameRef.current = now

      const nextPositions: PositionCoordinates = { ...animatedPositionsRef.current }
      const statesNow = animStatesRef.current

      activeRoles.forEach((role) => {
        const state = statesNow[role]
        if (!state || state.done) return

        let targetSpeed = baseSpeed
        const remainingDistance = state.length - state.distance
        const stoppingDistance = (state.currentSpeed * state.currentSpeed) / Math.max(0.0001, acceleration * 2)
        const lookAheadDistance = Math.min(
          state.currentSpeed * lookAheadTime,
          remainingDistance,
          stoppingDistance + collisionRadius * 2
        )

        const t = state.length > 0 ? Math.min(state.distance / state.length, 1) : 0
        const curvature = getCurvature(state.start, state.control, state.end, t)
        if (curvature > 0 && cornerSlowdown > 0) {
          const curveSlow = 1 / (1 + curvature * cornerSlowdown * 0.4)
          targetSpeed = Math.min(targetSpeed, baseSpeed * curveSlow)
        }
        const endEase = Math.min(1, remainingDistance / Math.max(collisionRadius * 2, 0.001))
        targetSpeed = Math.min(targetSpeed, Math.max(baseSpeed * 0.2, baseSpeed * endEase))

        if (features.enableCollision) {
          for (const otherRole of activeRoles) {
            if (otherRole === role) continue
            const otherPriority = ROLE_PRIORITY[otherRole] ?? 99
            const selfPriority = ROLE_PRIORITY[role] ?? 99
            if (otherPriority > selfPriority) continue

            const otherPos = nextPositions[otherRole]
            if (!otherPos) continue

            const selfPos = nextPositions[role] ?? state.start
            const dx = otherPos.x - selfPos.x
            const dy = otherPos.y - selfPos.y
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist < collisionRadius * 1.2) {
              const urgency = 1 - dist / (collisionRadius * 1.2)
              const reduced = baseSpeed * (1 - urgency * 0.7)
              targetSpeed = Math.min(targetSpeed, Math.max(baseSpeed * 0.2, reduced))
            }

            const futurePos = getPositionAtDistance(
              state.start,
              state.control,
              state.end,
              Math.min(state.distance + lookAheadDistance, state.length),
              state.length
            )
            const futureDx = futurePos.x - otherPos.x
            const futureDy = futurePos.y - otherPos.y
            const futureDist = Math.sqrt(futureDx * futureDx + futureDy * futureDy)
            if (futureDist < collisionRadius * 0.9 && remainingDistance <= lookAheadDistance + collisionRadius) {
              targetSpeed = Math.min(targetSpeed, baseSpeed * 0.35)
            }
          }
        }

        const speedDiff = targetSpeed - state.currentSpeed
        const maxChange = acceleration * dt
        if (Math.abs(speedDiff) <= maxChange) {
          state.currentSpeed = targetSpeed
        } else if (speedDiff > 0) {
          state.currentSpeed += maxChange
        } else {
          state.currentSpeed -= maxChange
        }

        state.distance = Math.min(state.distance + state.currentSpeed * dt, state.length)
        if (state.distance >= state.length) {
          state.done = true
        }

        const basePos = getPositionAtDistance(state.start, state.control, state.end, state.distance, state.length)
        let finalPos = basePos

        if (features.enableCollision && features.enableDeflection) {
          let avoidX = 0
          let avoidY = 0
          const selfPriority = ROLE_PRIORITY[role] ?? 99
          const futurePos = getPositionAtDistance(
            state.start,
            state.control,
            state.end,
            Math.min(state.distance + lookAheadDistance, state.length),
            state.length,
          )

          for (const otherRole of activeRoles) {
            if (otherRole === role) continue
            const otherPriority = ROLE_PRIORITY[otherRole] ?? 99
            if (otherPriority > selfPriority) continue

            const otherPos = nextPositions[otherRole]
            if (!otherPos) continue

            const dx = basePos.x - otherPos.x
            const dy = basePos.y - otherPos.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 0.0001) continue

            if (dist < collisionRadius * 2.2) {
              let push = (collisionRadius * 2.2 - dist) / (collisionRadius * 2.2)
              const futureDx = futurePos.x - otherPos.x
              const futureDy = futurePos.y - otherPos.y
              const futureDist = Math.sqrt(futureDx * futureDx + futureDy * futureDy)
              if (futureDist < collisionRadius * 1.6) {
                push *= 1.3
              }

              const weight = otherPriority < selfPriority ? 1 : 0.7
              avoidX += (dx / dist) * push * weight
              avoidY += (dy / dist) * push * weight
            }
          }

          const desiredOffset = {
            x: avoidX * deflectionStrength * collisionRadius * endEase,
            y: avoidY * deflectionStrength * collisionRadius * endEase,
          }

          const spring = 12
          const damping = 7
          state.offsetVel.x += (desiredOffset.x - state.offset.x) * spring * dt
          state.offsetVel.y += (desiredOffset.y - state.offset.y) * spring * dt
          state.offsetVel.x *= Math.max(0, 1 - damping * dt)
          state.offsetVel.y *= Math.max(0, 1 - damping * dt)

          state.offset.x += state.offsetVel.x * dt
          state.offset.y += state.offsetVel.y * dt

          const maxOffset = collisionRadius * 1.6
          const offsetLen = Math.hypot(state.offset.x, state.offset.y)
          if (offsetLen > maxOffset) {
            state.offset.x = (state.offset.x / offsetLen) * maxOffset
            state.offset.y = (state.offset.y / offsetLen) * maxOffset
          }

          finalPos = clampExtended({
            x: basePos.x + state.offset.x,
            y: basePos.y + state.offset.y,
          })
        }

        nextPositions[role] = finalPos
      })

      setAnimatedPositions(nextPositions)

      const allDone = activeRoles.every((role) => {
        const state = statesNow[role]
        return !state || state.done
      })

      if (allDone) {
        const finalPositions = { ...nextPositions }

        setPlayedPositions(finalPositions)
        setCanvasState('played')
        animStatesRef.current = {}
        lastFrameRef.current = null
        setAnimatedPositions(finalPositions)
        return
      }

      animationRef.current = requestAnimationFrame(tick)
    }

    animationRef.current = requestAnimationFrame(tick)
  }, [
    activeRoles,
    acceleration,
    baseSpeed,
    canvasState,
    clampExtended,
    computeControlPoint,
    curveOverrides,
    features,
    getCurveMidpoint,
    getCurvature,
    getPathLength,
    getPathLengthSvg,
    getPositionAtDistance,
    collisionRadius,
    deflectionStrength,
    lookAheadTime,
  ])

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    lastFrameRef.current = null
    animStatesRef.current = {}
    setCanvasState('base')
    setPlayedPositions(null)
    setLockedPaths({})
    setAnimatedPositions(positionsRef.current)
  }, [])

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const handleTokenPointerDown = useCallback((role: Role, event: React.PointerEvent) => {
    if (!features.enableDrag) return
    if (canvasState === 'playing') return
    if (canvasState === 'played') {
      setShowResetPrompt(true)
      return
    }
    const point = getSvgPointFromEvent(event)
    if (!point) return

    const normalized = toNormalized(point.x, point.y)
    const current = positionsRef.current[role]
    if (!current) return

    dragStateRef.current = {
      role,
      pointerId: event.pointerId,
      offset: {
        x: current.x - normalized.x,
        y: current.y - normalized.y,
      },
      type: 'token',
    }

    event.currentTarget.setPointerCapture(event.pointerId)
  }, [canvasState, features.enableDrag, getSvgPointFromEvent, toNormalized])

  const handleArrowPointerDown = useCallback((role: Role, event: React.PointerEvent) => {
    if (!features.enableDrag) return
    if (canvasState === 'playing') return
    if (canvasState === 'played') {
      setShowResetPrompt(true)
      return
    }
    const point = getSvgPointFromEvent(event)
    if (!point) return

    const normalized = toNormalized(point.x, point.y)
    const current = arrowsRef.current[role] ?? positionsRef.current[role]
    if (!current) return

    dragStateRef.current = {
      role,
      pointerId: event.pointerId,
      offset: {
        x: current.x - normalized.x,
        y: current.y - normalized.y,
      },
      type: 'arrow',
    }

    event.currentTarget.setPointerCapture(event.pointerId)
  }, [canvasState, features.enableDrag, getSvgPointFromEvent, toNormalized])

  const handleControlPointerDown = useCallback((role: Role, event: React.PointerEvent) => {
    if (!features.enableDrag) return
    if (canvasState !== 'base') return
    const point = getSvgPointFromEvent(event)
    if (!point) return

    const normalized = toNormalized(point.x, point.y)
    const start = positionsRef.current[role]
    const end = arrowsRef.current[role]
    if (!start || !end) return

    const control = curveOverrides[role] ?? computeControlPoint(start, end)
    const midpoint = getCurveMidpoint(start, control, end)

    dragStateRef.current = {
      role,
      pointerId: event.pointerId,
      offset: {
        x: midpoint.x - normalized.x,
        y: midpoint.y - normalized.y,
      },
      type: 'control',
    }
    setDraggingControlRole(role)
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [
    canvasState,
    computeControlPoint,
    curveOverrides,
    features.enableDrag,
    getCurveMidpoint,
    getSvgPointFromEvent,
    toNormalized,
  ])

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    const drag = dragStateRef.current
    if (!drag) return
    if (drag.pointerId !== event.pointerId) return

    const point = getSvgPointFromEvent(event)
    if (!point) return

    const normalized = toNormalized(point.x, point.y)
    const next = clampExtended({
      x: normalized.x + drag.offset.x,
      y: normalized.y + drag.offset.y,
    })

    if (drag.type === 'token') {
      setPositions((prev) => ({
        ...prev,
        [drag.role]: next,
      }))
    } else if (drag.type === 'arrow') {
      setArrows((prev) => ({
        ...prev,
        [drag.role]: next,
      }))
    } else if (drag.type === 'control') {
      const start = positionsRef.current[drag.role]
      const end = arrowsRef.current[drag.role]
      if (!start || !end) return
      const desiredMid = clampExtended(next)
      const control = clampControl(controlFromMidpoint(start, end, desiredMid))
      setCurveOverrides((prev) => ({
        ...prev,
        [drag.role]: control,
      }))
    }
  }, [
    clampControl,
    clampExtended,
    controlFromMidpoint,
    getSvgPointFromEvent,
    toNormalized,
  ])

  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    const drag = dragStateRef.current
    if (!drag) return
    if (drag.pointerId !== event.pointerId) return

    dragStateRef.current = null
    setDraggingControlRole(null)
  }, [])

  const displayPositions = canvasState === 'played'
    ? (playedPositions ?? positions)
    : canvasState === 'playing'
      ? animatedPositions
      : positions

  const handleReset = useCallback(() => {
    stopAnimation()
    setPlayedPositions(null)
    setCanvasState('base')
    setLockedPaths({})
  }, [stopAnimation])

  return (
    <div className="flex h-full min-h-0 flex-col">
      {showResetPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-background p-4 shadow-lg">
            <p className="text-sm font-medium">Reset to edit?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You’re in the played state. Reset back to the base layout to edit positions and paths.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="h-8 rounded-md border border-border px-3 text-sm"
                type="button"
                onClick={() => setShowResetPrompt(false)}
              >
                Cancel
              </button>
              <button
                className="h-8 rounded-md bg-foreground px-3 text-sm text-background"
                type="button"
                onClick={() => {
                  setShowResetPrompt(false)
                  handleReset()
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="shrink-0 h-[240px] pb-3">
        <div className="flex h-full flex-col gap-3 overflow-y-auto pr-1">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Canvas Rebuild</p>
            <h1 className="text-2xl font-semibold">Volleyball Court Motion Prototype</h1>
            <p className="text-sm text-muted-foreground">
              Speed-based motion along curved next-step paths with collision avoidance and priority logic.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Stage</label>
            <select
              className="h-8 rounded-md border border-border bg-background px-2 text-sm"
              value={stageId}
              onChange={(event) => setStageId(Number(event.target.value))}
            >
              {FEATURE_STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.id}. {stage.label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <button
                className="h-8 rounded-md border border-border px-3 text-sm"
                onClick={() => setFeatures(DEFAULT_FEATURES)}
                type="button"
              >
                Full Features
              </button>
              <button
                className="h-8 rounded-md border border-border px-3 text-sm"
                onClick={handleReset}
                type="button"
              >
                Reset
              </button>
              <button
                className="h-8 rounded-md border border-border px-3 text-sm"
                onClick={() => {
                  if (canvasState === 'playing') {
                    stopAnimation()
                    return
                  }
                  if (canvasState === 'played') {
                    handleReset()
                    return
                  }
                  startAnimation()
                }}
                type="button"
                disabled={!features.enablePlay && canvasState !== 'played'}
              >
                {canvasState === 'playing' ? 'Stop' : canvasState === 'played' ? 'Reset' : 'Play'}
              </button>
            </div>
          </div>

          <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={features.showCourt}
                  onChange={(event) => setFeatures((prev) => ({ ...prev, showCourt: event.target.checked }))}
                />
                Court
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={features.showTokens}
                  onChange={(event) => setFeatures((prev) => ({ ...prev, showTokens: event.target.checked }))}
                />
                Tokens
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={features.enableDrag}
                  onChange={(event) => setFeatures((prev) => ({ ...prev, enableDrag: event.target.checked }))}
                />
                Drag
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={features.showNextSteps}
                  onChange={(event) => setFeatures((prev) => ({ ...prev, showNextSteps: event.target.checked }))}
                />
                Next Steps
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={features.enablePlay}
                  onChange={(event) => setFeatures((prev) => ({ ...prev, enablePlay: event.target.checked }))}
                />
                Play
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={features.enableCollision}
                  onChange={(event) => setFeatures((prev) => ({ ...prev, enableCollision: event.target.checked }))}
                />
                Collision
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={features.enableDeflection}
                  onChange={(event) => setFeatures((prev) => ({ ...prev, enableDeflection: event.target.checked }))}
                />
                Deflection
              </label>
            </div>
            <div className="grid gap-2">
              <label className="flex items-center gap-2">
                <span className="w-32">Speed</span>
                <input
                  type="range"
                  min={0.2}
                  max={1.8}
                  step={0.05}
                  value={baseSpeed}
                  onChange={(event) => setBaseSpeed(Number(event.target.value))}
                />
                <span className="tabular-nums">{baseSpeed.toFixed(2)}</span>
              </label>
              <label className="flex items-center gap-2">
                <span className="w-32">Corner Slowdown</span>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={0.1}
                  value={cornerSlowdown}
                  onChange={(event) => setCornerSlowdown(Number(event.target.value))}
                />
                <span className="tabular-nums">{cornerSlowdown.toFixed(2)}</span>
              </label>
              <label className="flex items-center gap-2">
                <span className="w-32">Acceleration</span>
                <input
                  type="range"
                  min={0.4}
                  max={5}
                  step={0.1}
                  value={acceleration}
                  onChange={(event) => setAcceleration(Number(event.target.value))}
                />
                <span className="tabular-nums">{acceleration.toFixed(2)}</span>
              </label>
              <label className="flex items-center gap-2">
                <span className="w-32">Curve</span>
                <input
                  type="range"
                  min={0}
                  max={0.8}
                  step={0.05}
                  value={curveStrength}
                  onChange={(event) => setCurveStrength(Number(event.target.value))}
                />
                <span className="tabular-nums">{curveStrength.toFixed(2)}</span>
              </label>
              <label className="flex items-center gap-2">
                <span className="w-32">Collision Radius</span>
                <input
                  type="range"
                  min={0.04}
                  max={0.22}
                  step={0.01}
                  value={collisionRadius}
                  onChange={(event) => setCollisionRadius(Number(event.target.value))}
                />
                <span className="tabular-nums">{collisionRadius.toFixed(2)}</span>
              </label>
              <label className="flex items-center gap-2">
                <span className="w-32">Deflection</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={deflectionStrength}
                  onChange={(event) => setDeflectionStrength(Number(event.target.value))}
                />
                <span className="tabular-nums">{deflectionStrength.toFixed(2)}</span>
              </label>
              <label className="flex items-center gap-2">
                <span className="w-32">Look Ahead</span>
                <input
                  type="range"
                  min={0.1}
                  max={1.2}
                  step={0.05}
                  value={lookAheadTime}
                  onChange={(event) => setLookAheadTime(Number(event.target.value))}
                />
                <span className="tabular-nums">{lookAheadTime.toFixed(2)}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-xl border border-border bg-muted/10 px-3 pt-3 pb-6 flex items-end justify-center">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMax meet"
          className="h-full w-auto max-w-full"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {features.showCourt && (
            <g>
              <rect
                x={0}
                y={0}
                width={VIEWBOX_WIDTH}
                height={VIEWBOX_HEIGHT}
                fill="#0b0f15"
              />
              <rect
                x={COURT_PADDING}
                y={COURT_PADDING}
                width={COURT_WIDTH}
                height={COURT_HEIGHT}
                fill="#111827"
                stroke="#1f2937"
                strokeWidth={3}
                rx={18}
              />
              <line
                x1={COURT_PADDING}
                y1={COURT_PADDING + COURT_HEIGHT / 2}
                x2={COURT_PADDING + COURT_WIDTH}
                y2={COURT_PADDING + COURT_HEIGHT / 2}
                stroke="#334155"
                strokeWidth={3}
              />
              <line
                x1={COURT_PADDING}
                y1={COURT_PADDING + COURT_HEIGHT * 0.25}
                x2={COURT_PADDING + COURT_WIDTH}
                y2={COURT_PADDING + COURT_HEIGHT * 0.25}
                stroke="#1f2937"
                strokeWidth={2}
              />
              <line
                x1={COURT_PADDING}
                y1={COURT_PADDING + COURT_HEIGHT * 0.75}
                x2={COURT_PADDING + COURT_WIDTH}
                y2={COURT_PADDING + COURT_HEIGHT * 0.75}
                stroke="#1f2937"
                strokeWidth={2}
              />
            </g>
          )}

          {features.showNextSteps && (
            <g>
              {activeRoles.map((role) => {
                const useLocked = canvasState !== 'base' && lockedPaths[role]
                const start = useLocked ? lockedPaths[role]!.start : positions[role]
                const end = useLocked ? lockedPaths[role]!.end : arrows[role]
                if (!start || !end) return null

                const control = useLocked
                  ? lockedPaths[role]!.control
                  : curveOverrides[role] ?? computeControlPoint(start, end)
                const startSvg = toSvg(start)
                const endSvg = toSvg(end)
                const controlSvg = control ? toSvg(control) : null
                const midpoint = getCurveMidpoint(start, control, end)
                const midpointSvg = toSvg(midpoint)

                const path = controlSvg
                  ? `M ${startSvg.x} ${startSvg.y} Q ${controlSvg.x} ${controlSvg.y} ${endSvg.x} ${endSvg.y}`
                  : `M ${startSvg.x} ${startSvg.y} L ${endSvg.x} ${endSvg.y}`

                const dx = controlSvg ? endSvg.x - controlSvg.x : endSvg.x - startSvg.x
                const dy = controlSvg ? endSvg.y - controlSvg.y : endSvg.y - startSvg.y
                const len = Math.hypot(dx, dy) || 1
                const ux = dx / len
                const uy = dy / len
                const arrowSize = 10
                const arrowAngle = Math.PI / 7

                const ax1 = endSvg.x - arrowSize * (ux * Math.cos(arrowAngle) - uy * Math.sin(arrowAngle))
                const ay1 = endSvg.y - arrowSize * (uy * Math.cos(arrowAngle) + ux * Math.sin(arrowAngle))
                const ax2 = endSvg.x - arrowSize * (ux * Math.cos(arrowAngle) + uy * Math.sin(arrowAngle))
                const ay2 = endSvg.y - arrowSize * (uy * Math.cos(arrowAngle) - ux * Math.sin(arrowAngle))

                const state = animStatesRef.current[role]
                const progress = canvasState === 'playing' && state && state.length > 0
                  ? Math.min(state.distance / state.length, 1)
                  : canvasState === 'played'
                    ? 1
                    : 0
                const svgLength = useLocked ? lockedPaths[role]!.svgLength : undefined
                const hasSvgLength = typeof svgLength === 'number'
                const remaining = hasSvgLength ? Math.max(0, svgLength * (1 - progress)) : 0
                const traveled = hasSvgLength ? Math.max(0, svgLength - remaining) : 0
                const dashArray = hasSvgLength ? `${remaining} ${traveled}` : undefined
                const dashOffset = hasSvgLength ? `${remaining}` : undefined
                const showPath = hasSvgLength ? remaining > 0.5 : true

                const showHandle = canvasState === 'base'
                  && features.enableDrag
                  && (hoveredPathRole === role || draggingControlRole === role)

                return (
                  <g key={`arrow-${role}`}>
                    <path
                      d={path}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={22}
                      style={{ pointerEvents: canvasState === 'base' ? 'stroke' : 'none' }}
                      onPointerEnter={() => setHoveredPathRole(role)}
                      onPointerLeave={() => {
                        if (draggingControlRole !== role) {
                          setHoveredPathRole(null)
                        }
                      }}
                    />
                    <path
                      d={path}
                      fill="none"
                      stroke={ROLE_INFO[role].color}
                      strokeWidth={3}
                      opacity={showPath ? 0.85 : 0}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={dashArray}
                      strokeDashoffset={dashOffset}
                    />
                    <path
                      d={`M ${endSvg.x} ${endSvg.y} L ${ax1} ${ay1} M ${endSvg.x} ${endSvg.y} L ${ax2} ${ay2}`}
                      stroke={ROLE_INFO[role].color}
                      strokeWidth={3}
                      opacity={canvasState === 'playing' ? 0.85 : canvasState === 'played' ? 0 : 0.85}
                      strokeLinecap="round"
                    />
                    <circle
                      cx={endSvg.x}
                      cy={endSvg.y}
                      r={12}
                      fill="transparent"
                      stroke={ROLE_INFO[role].color}
                      strokeWidth={2}
                      style={{ cursor: features.enableDrag && canvasState === 'base' ? 'grab' : 'default' }}
                      onPointerDown={(event) => handleArrowPointerDown(role, event)}
                    />
                    {showHandle && (
                      <circle
                        cx={midpointSvg.x}
                        cy={midpointSvg.y}
                        r={10}
                        fill="#0f172a"
                        stroke={ROLE_INFO[role].color}
                        strokeWidth={3}
                        style={{ cursor: 'grab' }}
                        onPointerEnter={() => setHoveredPathRole(role)}
                        onPointerLeave={() => {
                          if (draggingControlRole !== role) {
                            setHoveredPathRole(null)
                          }
                        }}
                        onPointerDown={(event) => handleControlPointerDown(role, event)}
                      />
                    )}
                  </g>
                )
              })}
            </g>
          )}

          {features.showTokens && (
            <g>
              {activeRoles.map((role) => {
                const pos = displayPositions[role]
                if (!pos) return null
                const { x, y } = toSvg(pos)

                return (
                  <g key={`token-${role}`} transform={`translate(${x}, ${y})`}>
                    <circle
                      r={24}
                      fill={ROLE_INFO[role].color}
                      stroke="#0f172a"
                      strokeWidth={3}
                      style={{ cursor: features.enableDrag && canvasState === 'base' ? 'grab' : 'default' }}
                      onPointerDown={(event) => handleTokenPointerDown(role, event)}
                    />
                    <text
                      x={0}
                      y={4}
                      textAnchor="middle"
                      fontSize={12}
                      fill="#0f172a"
                      fontWeight={700}
                    >
                      {role}
                    </text>
                  </g>
                )
              })}
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}
