'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Rotation, Role, ROLE_INFO } from '@/lib/types'
import { DEFAULT_BASE_ORDER, getRoleZone, isInFrontRow, normalizeBaseOrder } from '@/lib/rotations'

interface RotationInfoCardProps {
  rotation: Rotation
  baseOrder?: Role[]
}

export function RotationInfoCard({ rotation, baseOrder = DEFAULT_BASE_ORDER }: RotationInfoCardProps) {
  const normalizedBaseOrder = normalizeBaseOrder(baseOrder)
  // Get zone info for each role in this rotation
  const roleZones = Object.entries(ROLE_INFO).map(([role, info]) => ({
    role: role as Role,
    zone: getRoleZone(rotation, role as Role, normalizedBaseOrder),
    isFront: isInFrontRow(rotation, role as Role, normalizedBaseOrder),
    ...info
  }))

  const frontRow = roleZones.filter(r => r.isFront)
  const backRow = roleZones.filter(r => !r.isFront)

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardContent className="py-3 px-4">
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Rotation {rotation} Lineup
        </div>

        <div className="space-y-2">
          {/* Front Row */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Front Row (can block)
            </div>
            <div className="flex gap-1.5">
              {frontRow.map(({ role, zone, color }) => (
                <div
                  key={role}
                  className="role-chip flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `${color}20`,
                    color: color
                  }}
                >
                  <span className="font-bold">{role}</span>
                  <span className="opacity-60 text-[10px]">Z{zone}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Back Row */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Back Row
            </div>
            <div className="flex gap-1.5">
              {backRow.map(({ role, zone, color }) => (
                <div
                  key={role}
                  className="role-chip flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `${color}20`,
                    color: color
                  }}
                >
                  <span className="font-bold">{role}</span>
                  <span className="opacity-60 text-[10px]">Z{zone}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

