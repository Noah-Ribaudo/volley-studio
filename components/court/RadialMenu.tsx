'use client'

import { useCallback } from 'react'

export type RadialSegment = 'draw-path' | 'clear-path' | 'assign-player' | 'highlight' | 'tags'

interface RadialMenuProps {
  /** Center position in screen coordinates (pixels) */
  center: { x: number; y: number }
  /** Whether an arrow exists for this player (determines draw vs clear) */
  hasArrow: boolean
  /** Callback when a segment is tapped */
  onSegmentTap: (segment: RadialSegment) => void
  /** Callback when menu should close (tap on center or outside) */
  onClose: () => void
}

const SEGMENTS: { id: RadialSegment; angle: number; icon: string; label: string }[] = [
  { id: 'draw-path', angle: Math.PI / 2, icon: '↗', label: 'DRAW' },
  { id: 'assign-player', angle: 0, icon: '👤', label: 'ASSIGN' },
  { id: 'highlight', angle: -Math.PI / 2, icon: '★', label: 'HIGHLIGHT' },
  { id: 'tags', angle: Math.PI, icon: '🏷', label: 'TAGS' },
]

// Donut ring dimensions
const INNER_RADIUS = 50
const OUTER_RADIUS = 85
const ICON_RADIUS = 105
const SEGMENT_GAP = 0.15 // Gap between segments in radians

export function RadialMenu({ center, hasArrow, onSegmentTap, onClose }: RadialMenuProps) {
  // Filter segments based on state
  const visibleSegments = SEGMENTS.map(seg => {
    if (seg.id === 'draw-path' && hasArrow) {
      return { ...seg, id: 'clear-path' as RadialSegment, icon: '✕', label: 'CLEAR' }
    }
    return seg
  })

  const handleSegmentClick = useCallback((segment: RadialSegment, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onSegmentTap(segment)
  }, [onSegmentTap])

  const handleCenterClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onClose()
  }, [onClose])

  const handleBackdropClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onClose()
  }, [onClose])

  // Create SVG arc path for a donut segment
  const createArcPath = (startAngle: number, endAngle: number) => {
    const innerStart = {
      x: Math.cos(startAngle) * INNER_RADIUS,
      y: -Math.sin(startAngle) * INNER_RADIUS,
    }
    const innerEnd = {
      x: Math.cos(endAngle) * INNER_RADIUS,
      y: -Math.sin(endAngle) * INNER_RADIUS,
    }
    const outerStart = {
      x: Math.cos(startAngle) * OUTER_RADIUS,
      y: -Math.sin(startAngle) * OUTER_RADIUS,
    }
    const outerEnd = {
      x: Math.cos(endAngle) * OUTER_RADIUS,
      y: -Math.sin(endAngle) * OUTER_RADIUS,
    }

    const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0

    return `
      M ${outerStart.x} ${outerStart.y}
      A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}
      L ${innerEnd.x} ${innerEnd.y}
      A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArc} 1 ${innerStart.x} ${innerStart.y}
      Z
    `
  }

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ touchAction: 'none' }}
      onClick={handleBackdropClick}
      onTouchEnd={handleBackdropClick}
    >
      {/* Backdrop with radial fade */}
      <div
        className="absolute inset-0 bg-black/50"
        style={{
          maskImage: `radial-gradient(circle 150px at ${center.x}px ${center.y}px, black 60%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(circle 150px at ${center.x}px ${center.y}px, black 60%, transparent 100%)`,
        }}
      />

      {/* SVG Menu */}
      <svg
        className="absolute"
        style={{
          left: center.x - 150,
          top: center.y - 150,
          width: 300,
          height: 300,
          overflow: 'visible',
        }}
        viewBox="-150 -150 300 300"
      >
        {/* Segments */}
        {visibleSegments.map((segment) => {
          const segmentAngle = Math.PI / 2 // 90° per segment
          const startAngle = segment.angle - segmentAngle / 2 + SEGMENT_GAP / 2
          const endAngle = segment.angle + segmentAngle / 2 - SEGMENT_GAP / 2

          const iconX = Math.cos(segment.angle) * ICON_RADIUS
          const iconY = -Math.sin(segment.angle) * ICON_RADIUS

          const labelRadius = (INNER_RADIUS + OUTER_RADIUS) / 2
          const labelX = Math.cos(segment.angle) * labelRadius
          const labelY = -Math.sin(segment.angle) * labelRadius

          return (
            <g
              key={segment.id}
              className="cursor-pointer"
              onClick={(e) => handleSegmentClick(segment.id, e)}
              onTouchEnd={(e) => handleSegmentClick(segment.id, e)}
            >
              {/* Segment wedge */}
              <path
                d={createArcPath(startAngle, endAngle)}
                className="fill-zinc-800/95 stroke-white/30 hover:fill-zinc-700/95 hover:stroke-primary active:fill-primary/30 active:stroke-primary transition-colors"
                strokeWidth="2"
              />

              {/* Icon */}
              <text
                x={iconX}
                y={iconY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white text-2xl select-none pointer-events-none"
                style={{ fontSize: '24px' }}
              >
                {segment.icon}
              </text>

              {/* Label */}
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white/90 font-semibold select-none pointer-events-none"
                style={{ fontSize: '10px' }}
              >
                {segment.label}
              </text>
            </g>
          )
        })}

        {/* Center close button */}
        <circle
          cx="0"
          cy="0"
          r={INNER_RADIUS - 5}
          className="fill-zinc-900/80 stroke-white/20 hover:fill-zinc-800 cursor-pointer transition-colors"
          strokeWidth="2"
          onClick={handleCenterClick}
          onTouchEnd={handleCenterClick}
        />
        <text
          x="0"
          y="0"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-white/60 select-none pointer-events-none"
          style={{ fontSize: '20px' }}
        >
          ✕
        </text>
      </svg>
    </div>
  )
}
