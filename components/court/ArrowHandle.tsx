'use client'

import { Role, ROLE_INFO } from '@/lib/types'
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card'
import { useHintStore } from '@/store/useHintStore'

// Called when an arrow is deleted - marks that user has learned the gesture
export const markArrowDeleted = () => {
  useHintStore.getState().markDeleteLearned()
}

interface ArrowHandleProps {
  role: Role
  x: number
  y: number
  onPointerDown: (event: React.MouseEvent | React.TouchEvent) => void
  isDeleting?: boolean
}

// Simple SVG crosshair icon for movement handles
function CrosshairIcon({ width, height, stroke, strokeWidth }: { width: number; height: number; stroke: string; strokeWidth: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  )
}

// Simple SVG X icon for delete state
function XIcon({ width, height, stroke, strokeWidth }: { width: number; height: number; stroke: string; strokeWidth: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// Small draggable handle shown at arrow endpoint for repositioning
export function ArrowHandle({ role, x, y, onPointerDown, isDeleting = false }: ArrowHandleProps) {
  const roleColor = ROLE_INFO[role].color

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="cursor-grab"
      role="button"
      tabIndex={0}
      aria-label={`Reposition arrow for ${role}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
        }
      }}
      style={{ pointerEvents: 'auto' }}
    >
      {/* Visual circles */}
      <circle
        r={12}
        fill={isDeleting ? "rgba(220,38,38,0.6)" : "rgba(0,0,0,0.45)"}
        stroke={isDeleting ? "#dc2626" : "white"}
        strokeWidth={1.5}
        className="pointer-events-none"
      />
      <circle
        r={7}
        fill={isDeleting ? "#dc2626" : roleColor}
        stroke="white"
        strokeWidth={1.5}
        className="pointer-events-none"
      />
      <g className="pointer-events-none select-none" transform="translate(-7 -7)">
        {isDeleting ? (
          <XIcon width={14} height={14} stroke="white" strokeWidth={2.5} />
        ) : (
          <CrosshairIcon width={14} height={14} stroke="white" strokeWidth={2} />
        )}
      </g>

      {/* Invisible hit target for better touch targeting (44x44px minimum) */}
      <circle
        r={22}
        fill="transparent"
        style={{
          pointerEvents: 'auto',
          cursor: 'grab',
          touchAction: 'none'
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onPointerDown(e)
        }}
        onTouchStart={(e) => {
          e.stopPropagation()
          onPointerDown(e)
        }}
      />

      {/* Tooltip */}
      <foreignObject
        x={-12}
        y={-12}
        width={24}
        height={24}
        style={{ pointerEvents: 'none', overflow: 'visible' }}
      >
        <HoverCard open={isDeleting} openDelay={200} closeDelay={0}>
          <HoverCardTrigger asChild>
            <div
              style={{
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            />
          </HoverCardTrigger>
          <HoverCardContent side="top" className="w-auto">
            <div className="text-sm">
              {isDeleting ? (
                <p>Release to delete arrow</p>
              ) : (
                <p>Drag to reposition or drag off court to delete</p>
              )}
            </div>
          </HoverCardContent>
        </HoverCard>
      </foreignObject>
    </g>
  )
}
