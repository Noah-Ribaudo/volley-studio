'use client'

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
}

export function MovementArrow({
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
  debugHitboxes = false
}: MovementArrowProps) {
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

  return (
    <g>
      {/* Invisible hit area for hover detection */}
      {(onMouseEnter || onMouseLeave) && (
        <path
          d={pathData}
          fill="none"
          stroke={debugHitboxes ? "rgba(57, 255, 20, 0.5)" : "transparent"}
          strokeWidth={Math.max(20, strokeWidth * 4)}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pointerEvents: 'auto', cursor: 'pointer' }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      )}
      {/* Visible arrow path */}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={opacity}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pointerEvents: 'none' }}
      />
      {/* Arrowhead */}
      <path
        d={`M ${end.x} ${end.y} L ${arrowheadX1} ${arrowheadY1} M ${end.x} ${end.y} L ${arrowheadX2} ${arrowheadY2}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={opacity}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pointerEvents: 'none' }}
      />
      {/* Invisible hit target at arrowhead tip for dragging */}
      {isDraggable && onDragStart && (
        <circle
          cx={end.x}
          cy={end.y}
          r={24}
          fill={debugHitboxes ? "rgba(57, 255, 20, 0.3)" : "transparent"}
          stroke={debugHitboxes ? "rgba(57, 255, 20, 0.8)" : "none"}
          strokeWidth={debugHitboxes ? 2 : 0}
          style={{
            cursor: 'grab',
            pointerEvents: 'auto',
            touchAction: 'none'
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDragStart(e)
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            onDragStart(e)
          }}
        />
      )}
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
