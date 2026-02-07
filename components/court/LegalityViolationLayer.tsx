'use client'

import { memo } from 'react'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Badge } from '@/components/ui/badge'
import { getTextColorForOklch } from '@/lib/utils'
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
  resolveZoneRole: (zone: string) => Role | null
  getRoleColor: (role: Role) => string
}

function LegalityViolationLayerImpl({
  mode,
  isBezierAnimating,
  legalityViolations,
  displayPositions,
  toSvgCoords,
  resolveZoneRole,
  getRoleColor,
}: LegalityViolationLayerProps) {
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
        const emojiSize = 20
        const markerPadding = 4

        const [zone1, zone2] = violation.zones
        const zone1Role = resolveZoneRole(zone1)
        const zone2Role = resolveZoneRole(zone2)
        const zone1Color = zone1Role ? getRoleColor(zone1Role) : '#9ca3af'
        const zone2Color = zone2Role ? getRoleColor(zone2Role) : '#9ca3af'
        const zone1Num = zone1.slice(1)
        const zone2Num = zone2.slice(1)

        return (
          <foreignObject
            key={`legality-marker-${idx}`}
            x={midX - emojiSize / 2 - markerPadding}
            y={midY - emojiSize / 2 - markerPadding}
            width={emojiSize + markerPadding * 2}
            height={emojiSize + markerPadding * 2}
            style={{ pointerEvents: 'auto', overflow: 'visible' }}
          >
            <HoverCard openDelay={0} closeDelay={0}>
              <HoverCardTrigger asChild>
                <div
                  className="cursor-pointer flex items-center justify-center"
                  style={{
                    width: emojiSize + markerPadding * 2,
                    height: emojiSize + markerPadding * 2,
                    fontSize: emojiSize,
                    lineHeight: 1,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                  }}
                >
                  ⚠️
                </div>
              </HoverCardTrigger>
              <HoverCardContent side="top" className="w-auto">
                <div className="flex flex-col gap-3">
                  <div className="text-sm font-medium">Formation Violation</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                    {violation.type === 'horizontal_overlap' ? (
                      <>
                        <Badge
                          style={{
                            backgroundColor: zone1Color,
                            color: zone1Role ? getTextColorForOklch(zone1Color) : undefined,
                            border: 'none',
                          }}
                        >
                          Zone {zone1Num}
                        </Badge>
                        <span>must be to the left of</span>
                        <Badge
                          style={{
                            backgroundColor: zone2Color,
                            color: zone2Role ? getTextColorForOklch(zone2Color) : undefined,
                            border: 'none',
                          }}
                        >
                          Zone {zone2Num}
                        </Badge>
                      </>
                    ) : (
                      <>
                        <Badge
                          style={{
                            backgroundColor: zone1Color,
                            color: zone1Role ? getTextColorForOklch(zone1Color) : undefined,
                            border: 'none',
                          }}
                        >
                          Zone {zone1Num}
                        </Badge>
                        <span>must be in front of</span>
                        <Badge
                          style={{
                            backgroundColor: zone2Color,
                            color: zone2Role ? getTextColorForOklch(zone2Color) : undefined,
                            border: 'none',
                          }}
                        >
                          Zone {zone2Num}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          </foreignObject>
        )
      })}
    </>
  )
}

export const LegalityViolationLayer = memo(LegalityViolationLayerImpl)

