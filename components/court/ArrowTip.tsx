'use client'

import { Role, ROLE_INFO } from '@/lib/types'

interface ArrowTipProps {
  role: Role
  playerX: number // Token center X
  playerY: number // Token center Y
  tokenRadius: number // To position at edge
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void
  /** Direction the arrow peeks out: 'left' toward left side, 'right' toward right side */
  direction?: 'left' | 'right'
  /** Called when mouse enters the arrow area - used to maintain hover state */
  onMouseEnter?: () => void
  /** @deprecated No longer used */
  isMobile?: boolean
  /** Debug mode: show hit boxes with neon green highlight */
  debugHitboxes?: boolean
}

// Curved arrow tip that peeks out from behind the player token
// Has a hand-drawn, sketchy feel with a swoopy curve
export function ArrowTip({ role, playerX, playerY, tokenRadius, onDragStart, direction = 'right', onMouseEnter, debugHitboxes = false }: ArrowTipProps) {
  const roleColor = ROLE_INFO[role].color

  // Arrow dimensions - designed to feel hand-drawn
  const peekDistance = 16 // How far the arrow peeks out from the token edge
  const arrowheadSize = 10 // Size of the arrowhead

  // Position - arrow starts from center and peeks out just a bit
  const isLeft = direction === 'left'
  const edgeX = isLeft ? playerX - tokenRadius : playerX + tokenRadius
  const tipY = playerY

  // Arrow peeks out just past the token edge
  const arrowEndX = isLeft ? edgeX - peekDistance : edgeX + peekDistance

  // Touch target dimensions (generous for easy grabbing) - 50% larger for mobile
  const touchWidth = peekDistance + arrowheadSize + 30
  const touchHeight = 54

  // Straight horizontal line from under the token to peek point
  // No curve - straight out like coming out of a tunnel

  // Arrowhead points
  const headTipX = isLeft ? arrowEndX - arrowheadSize : arrowEndX + arrowheadSize
  const headBackTop = { x: arrowEndX, y: tipY - arrowheadSize * 0.5 }
  const headBackBottom = { x: arrowEndX, y: tipY + arrowheadSize * 0.5 }

  // Animation transform origin - from the token edge so it slides out horizontally
  const transformOrigin = isLeft ? `${edgeX}px ${tipY}px` : `${edgeX}px ${tipY}px`
  const slideDirection = isLeft ? 'slideOutLeft' : 'slideOutRight'

  return (
    <g
      className="arrow-tip"
      style={{
        opacity: 0,
        transformOrigin,
        animation: `${slideDirection} 150ms ease forwards`,
        pointerEvents: 'auto'
      }}
    >
      <style>{`
        @keyframes slideOutRight {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideOutLeft {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .arrow-tip:hover .arrow-tip-visual {
          filter: brightness(1.1);
        }
      `}</style>

      {/* Invisible touch target (larger for easier interaction) */}
      <rect
        x={isLeft ? arrowEndX - arrowheadSize - 8 : edgeX - 8}
        y={tipY - touchHeight / 2}
        width={touchWidth}
        height={touchHeight}
        fill={debugHitboxes ? "rgba(57, 255, 20, 0.3)" : "transparent"}
        stroke={debugHitboxes ? "rgba(57, 255, 20, 0.8)" : "none"}
        strokeWidth={debugHitboxes ? 2 : 0}
        style={{
          cursor: 'grab',
          touchAction: 'none',
          pointerEvents: 'auto'
        }}
        onMouseEnter={onMouseEnter}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDragStart(e)
        }}
        onTouchStart={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDragStart(e)
        }}
      />

      {/* Visual arrow - straight horizontal line peeking out */}
      <g className="arrow-tip-visual" style={{ transition: 'filter 150ms ease' }}>
        {/* Straight tail - starts from inside token (hidden) and peeks out */}
        <line
          x1={playerX}
          y1={tipY}
          x2={arrowEndX}
          y2={tipY}
          stroke={roleColor}
          strokeWidth={3}
          strokeLinecap="round"
          strokeOpacity={0.85}
          className="pointer-events-none"
        />

        {/* White outline for visibility */}
        <line
          x1={playerX}
          y1={tipY}
          x2={arrowEndX}
          y2={tipY}
          stroke="white"
          strokeWidth={5}
          strokeLinecap="round"
          strokeOpacity={0.4}
          className="pointer-events-none"
          style={{ mixBlendMode: 'overlay' }}
        />

        {/* Arrowhead - simple triangle */}
        <path
          d={`
            M ${headTipX} ${tipY}
            L ${headBackTop.x} ${headBackTop.y}
            L ${headBackBottom.x} ${headBackBottom.y}
            Z
          `}
          fill={roleColor}
          fillOpacity={0.9}
          stroke="white"
          strokeWidth={1.5}
          strokeOpacity={0.6}
          strokeLinejoin="round"
          className="pointer-events-none"
        />
      </g>
    </g>
  )
}
