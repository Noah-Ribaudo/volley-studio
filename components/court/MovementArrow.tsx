'use client'

import { memo, useCallback, useEffect, useRef } from 'react'
import { animate, stopAnimation, type AnimationPlaybackControls } from '@/lib/motion-utils'

interface MovementArrowProps {
  start: { x: number; y: number }
  end: { x: number; y: number }
  control: { x: number; y: number } | null
  color: string
  strokeWidth: number
  opacity: number
  onDragStart?: (e: React.MouseEvent | React.TouchEvent) => void
  /** Called when user starts dragging the curve handle */
  onCurveDragStart?: (e: React.MouseEvent | React.TouchEvent) => void
  isDraggable?: boolean
  /** Whether to show the curve handle (for hover/selection states) */
  showCurveHandle?: boolean
  /** Called when mouse enters the arrow path */
  onMouseEnter?: () => void
  /** Called when mouse leaves the arrow path */
  onMouseLeave?: () => void
  /** Debug mode: show hit boxes with neon green highlight */
  debugHitboxes?: boolean
  /** Whether to animate the path drawing when arrow first appears */
  animateIn?: boolean
  /** Where dragging can be initiated from */
  dragHitArea?: 'tip' | 'path' | 'both'
  /** Radius for the draggable arrow endpoint hit target */
  dragHandleRadius?: number
  /** Show a subtle dot at the arrow start point */
  showStartDot?: boolean
  /** Radius for the start dot marker */
  startDotRadius?: number
  /** Animate peek/retract by drawing path progress (no React frame updates) */
  peekAnimated?: boolean
  /** Whether the peek path should currently be fully revealed */
  peekActive?: boolean
  /** Dashed path pattern to apply while traversing */
  dashPattern?: string
  /** Dash offset for animating dashed traversal */
  dashOffset?: number
  /** Additional opacity multiplier for the start dot */
  startDotOpacityScale?: number
  /** Additional opacity multiplier for the arrowhead */
  arrowheadOpacityScale?: number
}

function MovementArrowImpl({
  start,
  end,
  control,
  color,
  strokeWidth,
  opacity,
  onDragStart,
  onCurveDragStart,
  isDraggable = false,
  showCurveHandle = false,
  onMouseEnter,
  onMouseLeave,
  debugHitboxes = false,
  animateIn = false,
  dragHitArea = 'tip',
  dragHandleRadius = 24,
  showStartDot = true,
  startDotRadius,
  peekAnimated = false,
  peekActive = true,
  dashPattern,
  dashOffset = 0,
  startDotOpacityScale = 1,
  arrowheadOpacityScale = 1,
}: MovementArrowProps) {
  const pathRef = useRef<SVGPathElement>(null)
  const arrowheadRef = useRef<SVGPathElement>(null)
  const peekGroupRef = useRef<SVGGElement>(null)
  const hitPathRef = useRef<SVGPathElement>(null)
  const tipHitRef = useRef<SVGCircleElement>(null)
  const animationRef = useRef<AnimationPlaybackControls | null>(null)
  const peekAnimationRef = useRef<AnimationPlaybackControls | null>(null)
  const peekProgressRef = useRef<number>(peekActive ? 1 : 0)

  const canDrag = isDraggable && Boolean(onDragStart)
  const canDragFromPath = canDrag && (dragHitArea === 'path' || dragHitArea === 'both')
  const canDragFromTip = canDrag && (dragHitArea === 'tip' || dragHitArea === 'both')
  const shouldRenderHitPath = Boolean(onMouseEnter || onMouseLeave || canDragFromPath)

  // Calculate arrowhead direction
  const calculateArrowhead = () => {
    // If we have a control point, calculate the tangent at the end of the curve
    // Otherwise, use the direction from start to end
    let dx: number
    let dy: number

    if (control) {
      // For quadratic bezier: derivative at t=1 is 2*(end - control)
      dx = 2 * (end.x - control.x)
      dy = 2 * (end.y - control.y)
    } else {
      dx = end.x - start.x
      dy = end.y - start.y
    }

    const length = Math.sqrt(dx * dx + dy * dy)
    if (length < 0.0001) return { dx: 0, dy: -1 } // Default to up if no direction

    // Normalize
    dx /= length
    dy /= length

    return { dx, dy }
  }

  // Calculate the midpoint of the Bezier curve at t=0.5
  // For quadratic bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
  // At t=0.5: B(0.5) = 0.25*P0 + 0.5*P1 + 0.25*P2
  const calculateCurveMidpoint = () => {
    if (!control) {
      // Straight line - midpoint is simply the average
      return {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2
      }
    }
    // Quadratic Bezier at t=0.5
    return {
      x: 0.25 * start.x + 0.5 * control.x + 0.25 * end.x,
      y: 0.25 * start.y + 0.5 * control.y + 0.25 * end.y
    }
  }

  const { dx, dy } = calculateArrowhead()
  const curveMidpoint = calculateCurveMidpoint()
  const resolvedStartDotRadius = startDotRadius ?? Math.max(2.25, Math.min(5, strokeWidth * 0.85))

  // Arrowhead size
  const arrowheadSize = Math.max(8, strokeWidth * 2.5)
  const arrowheadAngle = Math.PI / 6 // 30 degrees

  // Calculate arrowhead points
  const arrowheadX1 = end.x - arrowheadSize * (dx * Math.cos(arrowheadAngle) - dy * Math.sin(arrowheadAngle))
  const arrowheadY1 = end.y - arrowheadSize * (dy * Math.cos(arrowheadAngle) + dx * Math.sin(arrowheadAngle))
  const arrowheadX2 = end.x - arrowheadSize * (dx * Math.cos(arrowheadAngle) + dy * Math.sin(arrowheadAngle))
  const arrowheadY2 = end.y - arrowheadSize * (dy * Math.cos(arrowheadAngle) - dx * Math.sin(arrowheadAngle))

  // Build path
  let pathData: string
  if (control) {
    // Quadratic bezier curve: M start Q control end
    pathData = `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`
  } else {
    // Straight line
    pathData = `M ${start.x} ${start.y} L ${end.x} ${end.y}`
  }

  // Applies peek transform directly to SVG DOM nodes for smooth hover animation
  // without causing React re-renders of the full court on each frame.
  const applyPeekProgress = useCallback((progress: number) => {
    if (!peekAnimated) return

    const clamped = Math.max(0, Math.min(1, progress))
    const safeScale = Math.max(0.001, clamped)

    const peekGroup = peekGroupRef.current
    if (peekGroup) {
      // Scale around the arrow start point so the peek grows out from the token.
      peekGroup.setAttribute(
        'transform',
        `translate(${start.x} ${start.y}) scale(${safeScale}) translate(${-start.x} ${-start.y})`
      )
      peekGroup.style.opacity = String(clamped)
      peekGroup.style.visibility = clamped <= 0.001 ? 'hidden' : 'visible'
    }

    const hitPath = hitPathRef.current
    if (hitPath) {
      const shouldEnablePath = clamped > 0.2
      hitPath.style.pointerEvents = shouldEnablePath ? 'auto' : 'none'
    }

    const tipHit = tipHitRef.current
    if (tipHit) {
      const shouldEnableTip = clamped > 0.35
      tipHit.style.pointerEvents = shouldEnableTip ? 'auto' : 'none'
    }
  }, [peekAnimated, start.x, start.y])

  // Path draw animation on mount (when animateIn is true)
  useEffect(() => {
    if (!animateIn) return

    const path = pathRef.current
    const arrowhead = arrowheadRef.current
    if (!path) return

    // Get the total length of the path for dash animation
    const pathLength = path.getTotalLength()

    // Set up initial state - path hidden via dash offset
    path.style.strokeDasharray = `${pathLength}`
    path.style.strokeDashoffset = `${pathLength}`

    // Hide arrowhead initially
    if (arrowhead) {
      arrowhead.style.opacity = '0'
    }

    // Animate path draw with spring
    animationRef.current = animate(0, 1, {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
      onUpdate: (progress) => {
        // Draw the path
        path.style.strokeDashoffset = `${pathLength * (1 - progress)}`

        // Fade in arrowhead in the last 30% of animation
        if (arrowhead) {
          const arrowheadProgress = Math.max(0, (progress - 0.7) / 0.3)
          arrowhead.style.opacity = String(arrowheadProgress)
        }
      },
      onComplete: () => {
        // Remove dash properties so path renders normally
        path.style.strokeDasharray = ''
        path.style.strokeDashoffset = ''
        if (arrowhead) {
          arrowhead.style.opacity = ''
        }
      },
    })

    return () => {
      stopAnimation(animationRef.current)
    }
  }, [animateIn])

  // Keep peek animation synced to geometry updates.
  useEffect(() => {
    if (!peekAnimated) return
    applyPeekProgress(peekProgressRef.current)
  }, [peekAnimated, pathData, start.x, start.y, applyPeekProgress])

  // Animate reveal/retract imperatively with Motion.
  useEffect(() => {
    if (!peekAnimated) return

    const target = peekActive ? 1 : 0
    const start = peekProgressRef.current

    stopAnimation(peekAnimationRef.current)

    if (Math.abs(target - start) < 0.001) {
      peekProgressRef.current = target
      applyPeekProgress(target)
      return
    }

    peekAnimationRef.current = animate(start, target, {
      duration: target > start ? 0.2 : 0.14,
      ease: target > start ? [0.0, 0.0, 0.2, 1.0] : [0.4, 0.0, 1.0, 1.0],
      onUpdate: (value) => {
        peekProgressRef.current = value
        applyPeekProgress(value)
      },
      onComplete: () => {
        peekProgressRef.current = target
        applyPeekProgress(target)
      },
    })

    return () => {
      stopAnimation(peekAnimationRef.current)
    }
  }, [peekAnimated, peekActive, applyPeekProgress])

  // Reset direct style mutations when peek animation is disabled.
  useEffect(() => {
    if (peekAnimated) return

    const peekGroup = peekGroupRef.current
    if (peekGroup) {
      peekGroup.removeAttribute('transform')
      peekGroup.style.opacity = ''
      peekGroup.style.visibility = ''
    }

    const hitPath = hitPathRef.current
    if (hitPath) {
      hitPath.style.pointerEvents = ''
    }

    const tipHit = tipHitRef.current
    if (tipHit) {
      tipHit.style.pointerEvents = ''
    }
  }, [peekAnimated])

  return (
    <g>
      <g ref={peekGroupRef}>
        {/* Invisible hit area for hover detection */}
        {shouldRenderHitPath && (
          <path
            ref={hitPathRef}
            d={pathData}
            fill="none"
            stroke={debugHitboxes ? "rgba(57, 255, 20, 0.5)" : "transparent"}
            strokeWidth={Math.max(30, strokeWidth * 6)}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ pointerEvents: peekAnimated ? 'none' : 'auto', cursor: canDragFromPath ? 'grab' : 'pointer' }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onMouseDown={canDragFromPath ? (e) => {
              e.preventDefault()
              e.stopPropagation()
              onDragStart?.(e)
            } : undefined}
            onTouchStart={canDragFromPath ? (e) => {
              e.stopPropagation()
              onDragStart?.(e)
            } : undefined}
          />
        )}
        {/* Visible arrow path */}
        <path
          ref={pathRef}
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={opacity}
          strokeDasharray={dashPattern}
          strokeDashoffset={dashPattern ? dashOffset : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ pointerEvents: 'none' }}
        />
        {showStartDot && (
          <circle
            cx={start.x}
            cy={start.y}
            r={resolvedStartDotRadius}
            fill={color}
            opacity={Math.min(1, opacity * 0.92 * startDotOpacityScale)}
            style={{ pointerEvents: 'none' }}
          />
        )}
        {/* Arrowhead */}
        <path
          ref={arrowheadRef}
          d={`M ${end.x} ${end.y} L ${arrowheadX1} ${arrowheadY1} M ${end.x} ${end.y} L ${arrowheadX2} ${arrowheadY2}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={opacity * arrowheadOpacityScale}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ pointerEvents: 'none' }}
        />
        {/* Invisible hit target at arrowhead tip for dragging */}
        {canDragFromTip && (
          <circle
            ref={tipHitRef}
            cx={end.x}
            cy={end.y}
            r={dragHandleRadius}
            fill={debugHitboxes ? "rgba(57, 255, 20, 0.3)" : "transparent"}
            stroke={debugHitboxes ? "rgba(57, 255, 20, 0.8)" : "none"}
            strokeWidth={debugHitboxes ? 2 : 0}
            style={{
              cursor: 'grab',
              pointerEvents: peekAnimated ? 'none' : 'auto',
              touchAction: 'none'
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDragStart?.(e)
            }}
            onTouchStart={(e) => {
              e.stopPropagation()
              onDragStart?.(e)
            }}
          />
        )}
      </g>
      {/* Curve handle at the midpoint - for adjusting curve direction and intensity */}
      {showCurveHandle && onCurveDragStart && (
        <g>
          {/* Visual handle */}
          <circle
            cx={curveMidpoint.x}
            cy={curveMidpoint.y}
            r={6}
            fill="rgba(0,0,0,0.5)"
            stroke="white"
            strokeWidth={1.5}
            style={{ pointerEvents: 'none' }}
          />
          {/* Inner dot */}
          <circle
            cx={curveMidpoint.x}
            cy={curveMidpoint.y}
            r={2.5}
            fill="white"
            style={{ pointerEvents: 'none' }}
          />
          {/* Invisible hit target for dragging (larger for touch) */}
          <circle
            cx={curveMidpoint.x}
            cy={curveMidpoint.y}
            r={27}
            fill={debugHitboxes ? "rgba(57, 255, 20, 0.3)" : "transparent"}
            stroke={debugHitboxes ? "rgba(57, 255, 20, 0.8)" : "none"}
            strokeWidth={debugHitboxes ? 2 : 0}
            style={{
              cursor: 'grab',
              pointerEvents: 'auto',
              touchAction: 'none'
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onCurveDragStart(e)
            }}
            onTouchStart={(e) => {
              e.stopPropagation()
              onCurveDragStart(e)
            }}
          />
        </g>
      )}
    </g>
  )
}

const arePointsEqual = (a: { x: number; y: number }, b: { x: number; y: number }) => (
  a.x === b.x && a.y === b.y
)

const areControlPointsEqual = (
  a: { x: number; y: number } | null,
  b: { x: number; y: number } | null
) => {
  if (a === b) return true
  if (!a || !b) return false
  return a.x === b.x && a.y === b.y
}

const areMovementArrowPropsEqual = (prev: MovementArrowProps, next: MovementArrowProps) => {
  return (
    arePointsEqual(prev.start, next.start) &&
    arePointsEqual(prev.end, next.end) &&
    areControlPointsEqual(prev.control, next.control) &&
    prev.color === next.color &&
    prev.strokeWidth === next.strokeWidth &&
    prev.opacity === next.opacity &&
    prev.isDraggable === next.isDraggable &&
    prev.showCurveHandle === next.showCurveHandle &&
    prev.debugHitboxes === next.debugHitboxes &&
    prev.animateIn === next.animateIn &&
    prev.dragHitArea === next.dragHitArea &&
    prev.dragHandleRadius === next.dragHandleRadius &&
    prev.showStartDot === next.showStartDot &&
    prev.startDotRadius === next.startDotRadius &&
    prev.peekAnimated === next.peekAnimated &&
    prev.peekActive === next.peekActive &&
    prev.dashPattern === next.dashPattern &&
    prev.dashOffset === next.dashOffset &&
    prev.startDotOpacityScale === next.startDotOpacityScale &&
    prev.arrowheadOpacityScale === next.arrowheadOpacityScale &&
    Boolean(prev.onDragStart) === Boolean(next.onDragStart) &&
    Boolean(prev.onCurveDragStart) === Boolean(next.onCurveDragStart) &&
    Boolean(prev.onMouseEnter) === Boolean(next.onMouseEnter) &&
    Boolean(prev.onMouseLeave) === Boolean(next.onMouseLeave)
  )
}

export const MovementArrow = memo(MovementArrowImpl, areMovementArrowPropsEqual)
MovementArrow.displayName = 'MovementArrow'
