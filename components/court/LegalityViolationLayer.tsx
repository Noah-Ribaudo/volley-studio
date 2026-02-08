'use client'

import { memo, useCallback } from 'react'
import { toast } from 'sonner'
import type { Position, PositionCoordinates, Role } from '@/lib/types'

type LegalityViolation = {
  type: string
  zones: [string, string]
  roles?: [Role, Role]
}

interface LegalityViolationLayerProps {
  mode: 'whiteboard' | 'simulation'
  isBezierAnimating: boolean
  legalityViolations: LegalityViolation[]
  displayPositions: PositionCoordinates
  toSvgCoords: (position: Position) => { x: number; y: number }
}

function LegalityViolationLayerImpl({
  mode,
  isBezierAnimating,
  legalityViolations,
  displayPositions,
  toSvgCoords,
}: LegalityViolationLayerProps) {
  const showViolationDetails = useCallback((violation: LegalityViolation) => {
    const [zone1, zone2] = violation.zones
    const zone1Num = zone1.slice(1)
    const zone2Num = zone2.slice(1)
    const isHorizontal = violation.type === 'horizontal_overlap'

    toast.error(
      isHorizontal ? 'Horizontal Position Mismatch' : 'Vertical Position Mismatch',
      {
        description: isHorizontal
          ? `Zone ${zone1Num} must be to the left of Zone ${zone2Num}.`
          : `Zone ${zone1Num} must be in front of Zone ${zone2Num}.`,
        duration: 3600,
      }
    )
  }, [])

  if (mode !== 'whiteboard' || legalityViolations.length === 0) return null

  return (
    <>
      {!isBezierAnimating && legalityViolations.map((violation, idx) => {
        if (!violation.roles) return null
        const [role1, role2] = violation.roles
        const pos1 = displayPositions[role1]
        const pos2 = displayPositions[role2]
        if (!pos1 || !pos2) return null

        const svgPos1 = toSvgCoords(pos1)
        const svgPos2 = toSvgCoords(pos2)

        return (
          <line
            key={`legality-line-${idx}`}
            x1={svgPos1.x}
            y1={svgPos1.y}
            x2={svgPos2.x}
            y2={svgPos2.y}
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="4,4"
            opacity={0.6}
          />
        )
      })}

      {legalityViolations.map((violation, idx) => {
        if (!violation.roles) return null
        const [role1, role2] = violation.roles
        const pos1 = displayPositions[role1]
        const pos2 = displayPositions[role2]
        if (!pos1 || !pos2) return null

        const svgPos1 = toSvgCoords(pos1)
        const svgPos2 = toSvgCoords(pos2)
        const midX = (svgPos1.x + svgPos2.x) / 2
        const midY = (svgPos1.y + svgPos2.y) / 2

        return (
          <g
            key={`legality-marker-${idx}`}
            transform={`translate(${midX} ${midY})`}
            style={{ cursor: 'pointer', pointerEvents: 'auto', touchAction: 'none' }}
            role="button"
            tabIndex={0}
            aria-label="Show formation violation details"
            onPointerUp={(event) => {
              event.preventDefault()
              event.stopPropagation()
              showViolationDetails(violation)
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              showViolationDetails(violation)
            }}
          >
            <circle cx={0} cy={0} r={14} fill="transparent" />
            <polygon
              points="0,-11 10,9 -10,9"
              fill="#facc15"
              stroke="#b45309"
              strokeWidth={1.5}
            />
            <text
              x={0}
              y={5}
              textAnchor="middle"
              fontSize={11}
              fontWeight={700}
              fill="#7c2d12"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              !
            </text>
          </g>
        )
      })}
    </>
  )
}

export const LegalityViolationLayer = memo(LegalityViolationLayerImpl)
