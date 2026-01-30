'use client'

interface LongPressTooltipProps {
  visible: boolean
  x: number // SVG coordinates (token center)
  y: number // SVG coordinates (token center)
  tokenRadius: number
}

// Tooltip shown above a player token after long-press on mobile
// Prompts user to drag to draw movement arrows
export function LongPressTooltip({ visible, x, y, tokenRadius }: LongPressTooltipProps) {
  if (!visible) return null

  // Position tooltip centered above the token
  const tooltipWidth = 160
  const tooltipHeight = 32
  const tooltipX = x - tooltipWidth / 2
  const tooltipY = y - tokenRadius - tooltipHeight - 12 // 12px gap above token

  return (
    <g
      className="long-press-tooltip"
      style={{
        opacity: 0,
        animation: 'longPressTooltipIn 150ms ease forwards',
        pointerEvents: 'none'
      }}
    >
      <style>{`
        @keyframes longPressTooltipIn {
          from { opacity: 0; transform: translateY(6px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
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
          className="rounded-lg border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-lg"
          style={{
            whiteSpace: 'nowrap',
            fontWeight: 500,
            letterSpacing: '0.2px',
            textAlign: 'center'
          }}
        >
          Drag to draw next steps
        </div>
      </foreignObject>
    </g>
  )
}
