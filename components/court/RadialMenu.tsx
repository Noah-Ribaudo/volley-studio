'use client'

import { useMemo } from 'react'
import { Position } from '@/lib/types'

export type RadialSegment = 'draw-path' | 'clear-path' | 'assign-player' | 'highlight' | 'tags'

interface RadialMenuProps {
  /** Center position in SVG coordinates (pixels) */
  center: { x: number; y: number }
  /** Current drag angle in radians (null if not dragging) */
  dragAngle: number | null
  /** Whether an arrow exists for this player (determines draw vs clear) */
  hasArrow: boolean
  /** Mobile scale factor */
  mobileScale?: number
}

const SEGMENT_ANGLES = {
  'draw-path': Math.PI / 2,      // ↑ (90°)
  'clear-path': Math.PI / 2,     // ↑ (90°) - same as draw-path, contextual
  'assign-player': 0,            // → (0°)
  'highlight': -Math.PI / 2,     // ↓ (270° or -90°)
  'tags': Math.PI,               // ← (180°)
} as const

const SEGMENT_LABELS = {
  'draw-path': 'Draw Path',
  'clear-path': 'Clear Path',
  'assign-player': 'Assign',
  'highlight': 'Highlight',
  'tags': 'Tags',
} as const

const SEGMENT_ICONS = {
  'draw-path': '↑',
  'clear-path': '✕',
  'assign-player': '👤',
  'highlight': '★',
  'tags': '🏷',
} as const

/**
 * Get the active segment based on drag angle
 */
export function getActiveSegment(dragAngle: number | null, hasArrow: boolean): RadialSegment | null {
  if (dragAngle === null) return null

  // Normalize angle to 0-2π range
  const normalizedAngle = ((dragAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)

  // Define segment ranges (each segment is 90° wide, centered on its direction)
  // Right (→): -45° to 45° (or 315° to 45°)
  if (normalizedAngle >= Math.PI * 7/4 || normalizedAngle < Math.PI / 4) {
    return 'assign-player'
  }
  // Up (↑): 45° to 135°
  if (normalizedAngle >= Math.PI / 4 && normalizedAngle < Math.PI * 3/4) {
    return hasArrow ? 'clear-path' : 'draw-path'
  }
  // Left (←): 135° to 225°
  if (normalizedAngle >= Math.PI * 3/4 && normalizedAngle < Math.PI * 5/4) {
    return 'tags'
  }
  // Down (↓): 225° to 315°
  if (normalizedAngle >= Math.PI * 5/4 && normalizedAngle < Math.PI * 7/4) {
    return 'highlight'
  }

  return null
}

export function RadialMenu({ center, dragAngle, hasArrow, mobileScale = 1 }: RadialMenuProps) {
  const activeSegment = useMemo(() => getActiveSegment(dragAngle, hasArrow), [dragAngle, hasArrow])

  const radius = 60 * mobileScale
  const innerRadius = 20 * mobileScale

  // Determine which segments to show
  const segments: RadialSegment[] = useMemo(() => {
    return [
      hasArrow ? 'clear-path' : 'draw-path',
      'assign-player',
      'highlight',
      'tags',
    ]
  }, [hasArrow])

  return (
    <g className="radial-menu" style={{ pointerEvents: 'none' }}>
      {/* Background circle */}
      <circle
        cx={center.x}
        cy={center.y}
        r={radius}
        fill="rgba(0, 0, 0, 0.8)"
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth={2}
      />

      {/* Center circle (cancel zone) */}
      <circle
        cx={center.x}
        cy={center.y}
        r={innerRadius}
        fill="rgba(60, 60, 60, 0.9)"
        stroke="rgba(255, 255, 255, 0.5)"
        strokeWidth={1.5}
      />

      {/* Segment indicators */}
      {segments.map((segment) => {
        const angle = SEGMENT_ANGLES[segment]
        const labelRadius = radius * 0.65
        const iconX = center.x + Math.cos(angle) * labelRadius
        const iconY = center.y - Math.sin(angle) * labelRadius

        const isActive = activeSegment === segment

        return (
          <g key={segment}>
            {/* Active segment highlight */}
            {isActive && (
              <circle
                cx={iconX}
                cy={iconY}
                r={25 * mobileScale}
                fill="rgba(57, 255, 20, 0.3)"
                stroke="rgba(57, 255, 20, 0.8)"
                strokeWidth={2}
              />
            )}

            {/* Segment icon */}
            <text
              x={iconX}
              y={iconY}
              fill={isActive ? '#39ff14' : '#fff'}
              fontSize={20 * mobileScale}
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ userSelect: 'none' }}
            >
              {SEGMENT_ICONS[segment]}
            </text>

            {/* Segment label */}
            <text
              x={iconX}
              y={iconY + 18 * mobileScale}
              fill={isActive ? '#39ff14' : 'rgba(255, 255, 255, 0.8)'}
              fontSize={9 * mobileScale}
              fontWeight={isActive ? 'bold' : 'normal'}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ userSelect: 'none' }}
            >
              {SEGMENT_LABELS[segment]}
            </text>
          </g>
        )
      })}

      {/* Drag indicator line */}
      {dragAngle !== null && (
        <line
          x1={center.x}
          y1={center.y}
          x2={center.x + Math.cos(dragAngle) * radius * 0.8}
          y2={center.y - Math.sin(dragAngle) * radius * 0.8}
          stroke="rgba(57, 255, 20, 0.6)"
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
    </g>
  )
}
