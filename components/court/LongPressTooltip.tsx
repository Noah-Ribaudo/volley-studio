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

  // Position tooltip centered above the token
  const tooltipWidth = 220
  const tooltipHeight = 44
  const tooltipX = x - tooltipWidth / 2
  const tooltipY = y - tokenRadius - tooltipHeight - 12 // 12px gap above token

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
        width={tooltipWidth}
        height={tooltipHeight}
        style={{ overflow: 'visible' }}
      >
        <div
          className="flex items-stretch rounded-lg bg-foreground shadow-xl overflow-hidden"
        >
          {/* Orange accent bar */}
          <div className="w-1 shrink-0 bg-orange-500" />

          <div className="px-2.5 py-2">
            <span
              className="text-xs font-medium text-background leading-snug"
              style={{
                whiteSpace: 'normal',
                letterSpacing: '0.2px',
              }}
            >
              Tap anywhere on the court to draw an arrow
            </span>
          </div>
        </div>
      </foreignObject>
    </g>
  )
}
