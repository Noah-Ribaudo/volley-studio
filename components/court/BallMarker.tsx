'use client'

import type { Position } from '@/lib/types'

interface SimulationBallProps {
  /** Ball position in SVG coordinates */
  x: number
  y: number
  /** Ball height (0 = ground, higher = floating) */
  height: number
  /** Whether ball was just contacted (flash effect) */
  contactFlash?: boolean
}

/**
 * Ball marker for simulation mode - shows a 3D volleyball with shadow
 * that floats based on height.
 */
export function SimulationBall({ x, y, height, contactFlash = false }: SimulationBallProps) {
  // Calculate ball float and shadow based on height
  const normalizedHeight = Math.min(1, Math.max(0, height * 5)) // Scale for visibility
  const shadowRadius = 8 + normalizedHeight * 12 // Shadow grows with height
  const shadowOpacity = 0.15 + normalizedHeight * 0.1 // Darker when higher
  const ballFloatOffset = normalizedHeight * 15 // Ball floats UP when high
  const visualBallY = y - ballFloatOffset // Ball position above shadow

  // Ball size pulses on contact
  const contactScale = contactFlash ? 1.3 : 1
  const ballRadius = 10 * contactScale

  return (
    <g className="pointer-events-none">
      {/* Shadow on court (stays at ground, grows when ball is high) */}
      <ellipse
        cx={x}
        cy={y}
        rx={shadowRadius}
        ry={shadowRadius * 0.5}
        fill={`rgba(0, 0, 0, ${shadowOpacity})`}
        style={{
          transition: 'all 50ms ease-out',
        }}
      />

      {/* Contact flash effect */}
      {contactFlash && (
        <circle
          cx={x}
          cy={visualBallY}
          r={25}
          fill="none"
          stroke="rgba(255, 255, 255, 0.8)"
          strokeWidth={3}
          style={{
            animation: 'ping 0.3s ease-out forwards',
          }}
        />
      )}

      {/* Outer glow for visibility */}
      <circle
        cx={x}
        cy={visualBallY}
        r={ballRadius + 4}
        fill={contactFlash ? 'rgba(255, 255, 200, 0.5)' : 'rgba(255, 220, 100, 0.3)'}
        style={{
          transition: 'all 100ms ease-out',
        }}
      />

      {/* Main ball */}
      <circle
        cx={x}
        cy={visualBallY}
        r={ballRadius}
        fill={contactFlash ? '#FFEB3B' : '#FFD700'}
        stroke="#fff"
        strokeWidth={2}
        style={{
          filter: `drop-shadow(0 ${2 + normalizedHeight * 4}px ${4 + normalizedHeight * 6}px rgba(0,0,0,0.4))`,
          transition: 'all 100ms ease-out',
        }}
      />

      {/* Ball highlight */}
      <circle
        cx={x - 2 * contactScale}
        cy={visualBallY - 2 * contactScale}
        r={3 * contactScale}
        fill="rgba(255, 255, 255, 0.6)"
      />

      {/* Secondary highlight for depth */}
      <circle
        cx={x + 1 * contactScale}
        cy={visualBallY + 2 * contactScale}
        r={2 * contactScale}
        fill="rgba(200, 150, 0, 0.4)"
      />
    </g>
  )
}

interface AttackBallProps {
  /** Ball position in SVG coordinates */
  x: number
  y: number
  /** Whether currently being dragged */
  isDragging?: boolean
  /** Whether this ball exists or is a ghost placeholder */
  exists: boolean
  /** Whether position is on enemy side (y < 0.5 in normalized coords) */
  isEnemySide?: boolean
  /** Handler for starting drag */
  onDragStart?: (e: React.MouseEvent | React.TouchEvent) => void
}

/**
 * Attack ball marker for whiteboard defense phase - draggable ball
 * that shows where the opponent's attack is coming from.
 */
export function AttackBall({
  x,
  y,
  isDragging = false,
  exists,
  isEnemySide = true,
  onDragStart
}: AttackBallProps) {
  const ballRadius = 12
  const highlightColor = isEnemySide ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 215, 0, 0.6)'

  if (!exists && !isDragging) {
    // Ghost ball indicator when no ball exists
    return (
      <g>
        <circle
          cx={x}
          cy={y}
          r={ballRadius + 4}
          fill="rgba(255, 215, 0, 0.15)"
          stroke="rgba(255, 215, 0, 0.4)"
          strokeWidth={2}
          strokeDasharray="4,4"
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
        />
        {/* Plus icon */}
        <text
          x={x}
          y={y}
          fill="rgba(255, 215, 0, 0.6)"
          fontSize={16}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ pointerEvents: 'none' }}
        >
          +
        </text>
      </g>
    )
  }

  return (
    <g>
      {/* Invisible hit target for dragging (larger area for easier grabbing) */}
      <circle
        cx={x}
        cy={y}
        r={24}
        fill="transparent"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          pointerEvents: 'auto'
        }}
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
      />

      {/* Colored ring highlight (red for enemy, gold for home) */}
      <circle
        cx={x}
        cy={y}
        r={ballRadius + 6}
        fill="none"
        stroke={highlightColor}
        strokeWidth={3}
        className="pointer-events-none"
        style={{
          filter: `drop-shadow(0 0 8px ${highlightColor})`
        }}
      />

      {/* Outer glow for visibility (gold like simulation ball) */}
      <circle
        cx={x}
        cy={y}
        r={ballRadius + 4}
        fill="rgba(255, 220, 100, 0.3)"
        className="pointer-events-none"
      />

      {/* Main ball (gold like simulation ball) */}
      <circle
        cx={x}
        cy={y}
        r={ballRadius}
        fill="#FFD700"
        stroke="#fff"
        strokeWidth={2}
        className="pointer-events-none"
        style={{
          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))'
        }}
      />

      {/* Ball highlight */}
      <circle
        cx={x - 3}
        cy={y - 3}
        r={4}
        fill="rgba(255, 255, 255, 0.6)"
        className="pointer-events-none"
      />

      {/* Secondary highlight for depth */}
      <circle
        cx={x + 2}
        cy={y + 2}
        r={2}
        fill="rgba(200, 150, 0, 0.4)"
        className="pointer-events-none"
      />

      {/* Longer, more prominent directional arrow */}
      <g className="pointer-events-none">
        {/* Arrow shaft */}
        <line
          x1={x}
          y1={y + ballRadius + 2}
          x2={x}
          y2={y + ballRadius + 26}
          stroke="#fff"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* Arrow head - larger and more prominent */}
        <path
          d={`M ${x - 6} ${y + ballRadius + 20} L ${x} ${y + ballRadius + 28} L ${x + 6} ${y + ballRadius + 20}`}
          stroke="#fff"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </g>
  )
}
