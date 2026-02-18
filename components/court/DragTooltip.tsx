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

  // foreignObject needs a generous width/height so the content isn't clipped,
  // but the inner div uses fit-content to hug the text.
  const foWidth = 300
  const foHeight = 40
  const gap = 12
  const tooltipX = x - foWidth / 2
  const tooltipY = y - anchorRadius - foHeight - gap

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
        width={foWidth}
        height={foHeight}
        style={{ overflow: 'visible' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            className="inline-flex items-stretch rounded-lg bg-gray-900 dark:bg-gray-800 shadow-xl overflow-hidden"
          >
            {/* Orange accent bar */}
            <div className="w-1 shrink-0 bg-orange-500" />

            <div className="px-2.5 py-1.5">
              <span
                className="text-xs font-medium text-gray-50"
                style={{
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.2px',
                }}
              >
                {message}
              </span>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  )
}
