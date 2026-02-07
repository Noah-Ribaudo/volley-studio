'use client'

import { memo } from 'react'
import type { Position } from '@/lib/types'

interface SimulationBallLayerProps {
  mode: 'whiteboard' | 'simulation'
  ballPosition?: { x: number; y: number }
  ballHeight: number
  ballContactFlash: boolean
  padding: number
  courtWidth: number
  courtHeight: number
}

function SimulationBallLayerImpl({
  mode,
  ballPosition,
  ballHeight,
  ballContactFlash,
  padding,
  courtWidth,
  courtHeight,
}: SimulationBallLayerProps) {
  if (mode !== 'simulation' || !ballPosition) return null

  const ballX = padding + ballPosition.x * courtWidth
  const groundY = padding + ballPosition.y * courtHeight
  const normalizedHeight = Math.min(1, Math.max(0, ballHeight * 5))
  const shadowRadius = 8 + normalizedHeight * 12
  const shadowOpacity = 0.15 + normalizedHeight * 0.1
  const ballFloatOffset = normalizedHeight * 15
  const visualBallY = groundY - ballFloatOffset
  const contactScale = ballContactFlash ? 1.3 : 1
  const ballRadius = 10 * contactScale

  return (
    <g className="pointer-events-none">
      <ellipse
        cx={ballX}
        cy={groundY}
        rx={shadowRadius}
        ry={shadowRadius * 0.5}
        fill={`rgba(0, 0, 0, ${shadowOpacity})`}
        style={{ transition: 'all 50ms ease-out' }}
      />

      {ballContactFlash && (
        <circle
          cx={ballX}
          cy={visualBallY}
          r={25}
          fill="none"
          stroke="rgba(255, 255, 255, 0.8)"
          strokeWidth={3}
          style={{ animation: 'ping 0.3s ease-out forwards' }}
        />
      )}

      <circle
        cx={ballX}
        cy={visualBallY}
        r={ballRadius + 4}
        fill={ballContactFlash ? 'rgba(255, 255, 200, 0.5)' : 'rgba(255, 220, 100, 0.3)'}
        style={{ transition: 'all 100ms ease-out' }}
      />

      <circle
        cx={ballX}
        cy={visualBallY}
        r={ballRadius}
        fill={ballContactFlash ? '#FFEB3B' : '#FFD700'}
        stroke="#fff"
        strokeWidth={2}
        style={{
          filter: `drop-shadow(0 ${2 + normalizedHeight * 4}px ${4 + normalizedHeight * 6}px rgba(0,0,0,0.4))`,
          transition: 'all 100ms ease-out',
        }}
      />

      <circle
        cx={ballX - 2 * contactScale}
        cy={visualBallY - 2 * contactScale}
        r={3 * contactScale}
        fill="rgba(255, 255, 255, 0.6)"
      />

      <circle
        cx={ballX + 1 * contactScale}
        cy={visualBallY + 2 * contactScale}
        r={2 * contactScale}
        fill="rgba(200, 150, 0, 0.4)"
      />
    </g>
  )
}

interface AttackBallLayerProps {
  mode: 'whiteboard' | 'simulation'
  currentPhase?: string
  attackBallPosition: Position | null
  attackBallDragPosition: Position | null
  draggingAttackBall: boolean
  defaultPosition: Position
  padding: number
  courtWidth: number
  courtHeight: number
  debugHitboxes: boolean
  onAttackBallDragStart: (e: React.MouseEvent | React.TouchEvent) => void
}

function AttackBallLayerImpl({
  mode,
  currentPhase,
  attackBallPosition,
  attackBallDragPosition,
  draggingAttackBall,
  defaultPosition,
  padding,
  courtWidth,
  courtHeight,
  debugHitboxes,
  onAttackBallDragStart,
}: AttackBallLayerProps) {
  if (mode !== 'whiteboard' || currentPhase !== 'DEFENSE_PHASE') return null

  const displayPos = attackBallDragPosition || attackBallPosition || defaultPosition
  const ballX = padding + displayPos.x * courtWidth
  const ballY = padding + displayPos.y * courtHeight
  const isEnemySide = displayPos.y < 0.5
  const highlightColor = isEnemySide ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 215, 0, 0.6)'
  const ballRadius = 12

  return (
    <g>
      {(attackBallPosition || draggingAttackBall) ? (
        <>
          <circle
            cx={ballX}
            cy={ballY}
            r={24}
            fill={debugHitboxes ? 'rgba(57, 255, 20, 0.3)' : 'transparent'}
            stroke={debugHitboxes ? 'rgba(57, 255, 20, 0.8)' : 'none'}
            strokeWidth={debugHitboxes ? 2 : 0}
            style={{
              cursor: draggingAttackBall ? 'grabbing' : 'grab',
              pointerEvents: 'auto',
            }}
            onMouseDown={onAttackBallDragStart}
            onTouchStart={onAttackBallDragStart}
          />

          <circle
            cx={ballX}
            cy={ballY}
            r={ballRadius + 6}
            fill="none"
            stroke={highlightColor}
            strokeWidth={3}
            className="pointer-events-none"
            style={{ filter: `drop-shadow(0 0 8px ${highlightColor})` }}
          />

          <circle
            cx={ballX}
            cy={ballY}
            r={ballRadius + 4}
            fill="rgba(255, 220, 100, 0.3)"
            className="pointer-events-none"
          />

          <circle
            cx={ballX}
            cy={ballY}
            r={ballRadius}
            fill="#FFD700"
            stroke="#fff"
            strokeWidth={2}
            className="pointer-events-none"
            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}
          />

          <circle
            cx={ballX - 3}
            cy={ballY - 3}
            r={4}
            fill="rgba(255, 255, 255, 0.6)"
            className="pointer-events-none"
          />

          <circle
            cx={ballX + 2}
            cy={ballY + 2}
            r={2}
            fill="rgba(200, 150, 0, 0.4)"
            className="pointer-events-none"
          />

          <g className="pointer-events-none">
            <line
              x1={ballX}
              y1={ballY + ballRadius + 2}
              x2={ballX}
              y2={ballY + ballRadius + 26}
              stroke="#fff"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <path
              d={`M ${ballX - 6} ${ballY + ballRadius + 20} L ${ballX} ${ballY + ballRadius + 28} L ${ballX + 6} ${ballY + ballRadius + 20}`}
              stroke="#fff"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        </>
      ) : (
        <g>
          <circle
            cx={ballX}
            cy={ballY}
            r={ballRadius + 4}
            fill="rgba(255, 215, 0, 0.15)"
            stroke="rgba(255, 215, 0, 0.4)"
            strokeWidth={2}
            strokeDasharray="4,4"
            style={{ cursor: 'pointer', pointerEvents: 'auto' }}
            onMouseDown={onAttackBallDragStart}
            onTouchStart={onAttackBallDragStart}
          />
          <text
            x={ballX}
            y={ballY}
            fill="rgba(255, 215, 0, 0.6)"
            fontSize={16}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ pointerEvents: 'none' }}
          >
            +
          </text>
        </g>
      )}
    </g>
  )
}

export const SimulationBallLayer = memo(SimulationBallLayerImpl)
export const AttackBallLayer = memo(AttackBallLayerImpl)

