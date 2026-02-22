'use client'

interface LongPressTooltipProps {
  visible: boolean
  x: number // SVG coordinates (token center)
  y: number // SVG coordinates (token center)
  tokenRadius: number
}

// Tooltip shown above a player token after long-press on mobile
// Prompts user to tap where the arrow should end.
export function LongPressTooltip({ visible, x, y, tokenRadius }: LongPressTooltipProps) {
  if (!visible) return null

  // foreignObject is generous; inner div hugs content
  const foWidth = 300
  const foHeight = 50
  const tooltipX = x - foWidth / 2
  const tooltipY = y - tokenRadius - foHeight - 12 // 12px gap above token

  return (
    <g
      className="long-press-tooltip"
      style={{
        opacity: 0,
        animation: 'longPressTooltipIn 250ms ease-out forwards',
        pointerEvents: 'none'
      }}
    >
      <style>{`
        @keyframes longPressTooltipIn {
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

            <div className="px-2.5 py-2">
              <span
                className="text-xs font-medium text-gray-50 leading-snug"
                style={{
                  whiteSpace: 'normal',
                  letterSpacing: '0.2px',
                }}
              >
                Tap anywhere on the court to draw an arrow
              </span>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  )
}
