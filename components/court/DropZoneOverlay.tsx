'use client'

interface DropZoneOverlayProps {
  visible: boolean
  isOverDropZone: boolean
  courtWidth: number
  courtHeight: number
  padding: number
}

export function DropZoneOverlay({
  visible,
  isOverDropZone,
  courtWidth,
  courtHeight,
  padding
}: DropZoneOverlayProps) {
  if (!visible) return null

  // Colors based on state
  const borderColor = isOverDropZone ? 'rgba(239, 68, 68, 0.6)' : 'rgba(156, 163, 175, 0.4)'
  const textColor = isOverDropZone ? 'rgba(239, 68, 68, 0.8)' : 'rgba(156, 163, 175, 0.6)'
  const textContent = isOverDropZone ? 'release to delete' : 'drag here to delete'

  // Position text in the middle of each padding edge
  const textOffset = padding / 2
  const fontSize = 10

  return (
    <g
      className="drop-zone-overlay"
      style={{
        opacity: 0,
        animation: 'dropZoneFadeIn 150ms ease forwards',
        pointerEvents: 'none'
      }}
    >
      <style>{`
        @keyframes dropZoneFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Dashed border around the court (in the padding area) */}
      <rect
        x={padding - 2}
        y={padding - 2}
        width={courtWidth + 4}
        height={courtHeight + 4}
        fill="none"
        stroke={borderColor}
        strokeWidth={2}
        strokeDasharray="8,4"
        rx={4}
        ry={4}
        style={{ transition: 'stroke 150ms ease' }}
      />

      {/* Top edge text */}
      <text
        x={padding + courtWidth / 2}
        y={textOffset}
        fill={textColor}
        fontSize={fontSize}
        fontWeight="500"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          transition: 'fill 150ms ease',
          userSelect: 'none',
          textTransform: 'lowercase',
          letterSpacing: '0.5px'
        }}
      >
        {textContent}
      </text>

      {/* Bottom edge text */}
      <text
        x={padding + courtWidth / 2}
        y={padding + courtHeight + textOffset}
        fill={textColor}
        fontSize={fontSize}
        fontWeight="500"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          transition: 'fill 150ms ease',
          userSelect: 'none',
          textTransform: 'lowercase',
          letterSpacing: '0.5px'
        }}
      >
        {textContent}
      </text>

      {/* Left edge text (rotated) */}
      <text
        x={textOffset}
        y={padding + courtHeight / 2}
        fill={textColor}
        fontSize={fontSize}
        fontWeight="500"
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(-90, ${textOffset}, ${padding + courtHeight / 2})`}
        style={{
          transition: 'fill 150ms ease',
          userSelect: 'none',
          textTransform: 'lowercase',
          letterSpacing: '0.5px'
        }}
      >
        {textContent}
      </text>

      {/* Right edge text (rotated) */}
      <text
        x={padding + courtWidth + textOffset}
        y={padding + courtHeight / 2}
        fill={textColor}
        fontSize={fontSize}
        fontWeight="500"
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(90, ${padding + courtWidth + textOffset}, ${padding + courtHeight / 2})`}
        style={{
          transition: 'fill 150ms ease',
          userSelect: 'none',
          textTransform: 'lowercase',
          letterSpacing: '0.5px'
        }}
      >
        {textContent}
      </text>
    </g>
  )
}
