'use client'

interface DragTooltipProps {
  visible: boolean
  x: number // SVG coordinates
  y: number
  message: string
}

export function DragTooltip({ visible, x, y, message }: DragTooltipProps) {
  if (!visible) return null

  // Position tooltip above and to the right of the drag point
  const tooltipX = x + 24
  const tooltipY = y - 36
  const width = 140
  const height = 28

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
