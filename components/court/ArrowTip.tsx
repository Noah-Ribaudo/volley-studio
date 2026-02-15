'use client'

import { useEffect, useRef } from 'react'
import { Role, ROLE_INFO } from '@/lib/types'
import { animate, animateIfAllowed, SPRING, stopAnimation, type AnimationPlaybackControls } from '@/lib/motion-utils'

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
// Uses Motion for spring entrance animation
export function ArrowTip({ role, playerX, playerY, tokenRadius, onDragStart, direction = 'right', onMouseEnter, debugHitboxes = false }: ArrowTipProps) {
  const roleColor = ROLE_INFO[role].color
  const groupRef = useRef<SVGGElement>(null)
  const animationRef = useRef<AnimationPlaybackControls | null>(null)

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

  // Arrowhead points
  const headTipX = isLeft ? arrowEndX - arrowheadSize : arrowEndX + arrowheadSize
  const headBackTop = { x: arrowEndX, y: tipY - arrowheadSize * 0.5 }
  const headBackBottom = { x: arrowEndX, y: tipY + arrowheadSize * 0.5 }

  // Animation transform origin - from the token edge so it slides out horizontally
  const slideStart = isLeft ? 12 : -12

  // Spring entrance animation on mount
  useEffect(() => {
    const group = groupRef.current
    if (!group) return

    // Set initial state
    group.style.opacity = '0'
    group.style.transform = `translateX(${slideStart}px)`

    // Animate with spring
    animationRef.current = animateIfAllowed(() => animate(0, 1, {
      type: 'spring',
      ...SPRING.snappy,
      onUpdate: (progress) => {
        const x = slideStart * (1 - progress)
        group.style.opacity = String(progress)
        group.style.transform = `translateX(${x}px)`
      },
    }))

    if (!animationRef.current) {
      group.style.opacity = '1'
      group.style.transform = 'translateX(0px)'
    }

    return () => {
      stopAnimation(animationRef.current)
    }
  }, [slideStart])

  return (
    <g
      ref={groupRef}
      className="arrow-tip"
      style={{
        opacity: 0,
        pointerEvents: 'auto'
      }}
    >
      <style>{`
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
