'use client'

import { memo } from 'react'
import { CourtGrid } from './CourtGrid'
import { getRoleZone } from '@/lib/rotations'
import type { ArrowPositions, PositionCoordinates, Role, Rotation } from '@/lib/types'

interface CourtBaseLayerProps {
  padding: number
  courtWidth: number
  courtHeight: number
  showZones: boolean
  rotation?: Rotation
  baseOrder: Role[]
  activeRoles: Role[]
  replacedMB: Role | null
  isBezierAnimating: boolean
  arrows: ArrowPositions
  displayPositions: PositionCoordinates
  lineColor: string
}

const zoneLabelPositions = (courtWidth: number, courtHeight: number): Record<number, { x: number; y: number }> => ({
  1: { x: courtWidth * 0.8333, y: courtHeight * 0.8333 },
  2: { x: courtWidth * 0.8333, y: courtHeight * 0.5833 },
  3: { x: courtWidth * 0.5, y: courtHeight * 0.5833 },
  4: { x: courtWidth * 0.1667, y: courtHeight * 0.5833 },
  5: { x: courtWidth * 0.1667, y: courtHeight * 0.8333 },
  6: { x: courtWidth * 0.5, y: courtHeight * 0.8333 },
})

function CourtBaseLayerImpl({
  padding,
  courtWidth,
  courtHeight,
  showZones,
  rotation,
  baseOrder,
  activeRoles,
  replacedMB,
  isBezierAnimating,
  arrows,
  displayPositions,
  lineColor,
}: CourtBaseLayerProps) {
  const showZoneGuides = showZones && rotation && !isBezierAnimating && !Object.values(arrows).some(Boolean)
  const labels = zoneLabelPositions(courtWidth, courtHeight)

  return (
    <g transform={`translate(${padding}, ${padding})`}>
      <rect
        x={-padding}
        y={-padding}
        width={courtWidth + padding * 2}
        height={courtHeight + padding * 2}
        fill="var(--muted)"
        opacity={0.28}
        style={{ pointerEvents: 'none' }}
      />

      <CourtGrid
        width={courtWidth}
        height={courtHeight}
        showZones={showZones}
        rotation={rotation}
        baseOrder={baseOrder}
        fullCourt={true}
      />

      {showZoneGuides && (
        <g>
          {activeRoles.map((role) => {
            const zoneRole = (role === 'L' && replacedMB) ? replacedMB : role
            const zone = getRoleZone(rotation, zoneRole, baseOrder)
            const playerPos = displayPositions[role]
            if (!playerPos) return null

            const zonePos = labels[zone]
            if (!zonePos) return null

            return (
              <line
                key={role}
                x1={playerPos.x * courtWidth}
                y1={playerPos.y * courtHeight}
                x2={zonePos.x}
                y2={zonePos.y}
                stroke={lineColor}
                strokeWidth={1.5}
                strokeDasharray="4,4"
                opacity={0.3}
                style={{ pointerEvents: 'none' }}
              />
            )
          })}
        </g>
      )}
    </g>
  )
}

export const CourtBaseLayer = memo(CourtBaseLayerImpl)

