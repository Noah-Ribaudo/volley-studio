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
  const width = 200
  const height = 32
  const gap = 12
  const tooltipX = x - width / 2
  const tooltipY = y - anchorRadius - height - gap

  return (
    <g
      className="drag-tooltip"
      style={{
        opacity: 0,
        animation: 'dragTooltipIn 250ms ease-out forwards',
        pointerEvents: 'none'
      }}
    >
      <style>{`
        @keyframes dragTooltipIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
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
          className="flex items-stretch rounded-lg bg-foreground shadow-xl overflow-hidden"
        >
          {/* Orange accent bar */}
          <div className="w-1 shrink-0 bg-orange-500" />

          <div className="px-2.5 py-1.5">
            <span
              className="text-xs font-medium text-background"
              style={{
                whiteSpace: 'nowrap',
                letterSpacing: '0.2px',
              }}
            >
              {message}
            </span>
          </div>
        </div>
      </foreignObject>
    </g>
  )
}
