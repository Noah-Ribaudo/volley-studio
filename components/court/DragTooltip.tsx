'use client'

interface DragTooltipProps {
  visible: boolean
  x: number // SVG coordinates
  y: number
  message: string
  anchorRadius?: number
}

export function DragTooltip({ visible, x, y, message, anchorRadius = 0 }: DragTooltipProps) {
  if (!visible) return null

  // Keep the hint above the interaction target (token/arrow), not on top of it.
  const width = 176
  const height = 28
  const gap = 12
  const tooltipX = x - width / 2
  const tooltipY = y - anchorRadius - height - gap

  return (
    <g
      className="drag-tooltip"
      style={{
        opacity: 0,
        animation: 'tooltipFadeIn 200ms ease forwards',
        pointerEvents: 'none'
      }}
    >
      <style>{`
        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <foreignObject
        x={tooltipX}
        y={tooltipY}
        width={width}
        height={height}
        style={{ overflow: 'visible' }}
      >
        <div
          className="rounded-md border bg-popover px-2.5 py-1 text-xs text-popover-foreground shadow-md"
          style={{
            whiteSpace: 'nowrap',
            fontWeight: 500,
            letterSpacing: '0.25px'
          }}
        >
          {message}
        </div>
      </foreignObject>
    </g>
  )
}
