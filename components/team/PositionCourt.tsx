'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Role, RosterPlayer, PositionAssignments, Rotation, ROLE_INFO } from '@/lib/types'
import { getRoleZone, isInFrontRow } from '@/lib/rotations'
import { cn } from '@/lib/utils'

const LINEUP_ROLES: Role[] = ['S', 'OH1', 'OH2', 'MB1', 'MB2', 'OPP']
const ALL_ASSIGNABLE_ROLES: Array<Role | 'L'> = [...LINEUP_ROLES, 'L']

// Back row is lifted to make room for libero circle below.
const ZONE_POSITIONS: Record<number, { x: number; y: number }> = {
  4: { x: 20, y: 25 },
  3: { x: 50, y: 25 },
  2: { x: 80, y: 25 },
  5: { x: 20, y: 62 },
  6: { x: 50, y: 62 },
  1: { x: 80, y: 62 },
}

interface PositionCourtProps {
  roster: RosterPlayer[]
  assignments: PositionAssignments
  onChange: (assignments: PositionAssignments) => void
  showLibero?: boolean
  rotation?: Rotation
  onRotationChange?: (rotation: Rotation) => void
  isLoading?: boolean
}

export function PositionCourt({
  roster,
  assignments,
  onChange,
  showLibero = false,
  rotation = 1,
  onRotationChange,
  isLoading = false,
}: PositionCourtProps) {
  const [selectedRole, setSelectedRole] = useState<Role | 'L' | null>(null)

  const sortedRoster = useMemo(() => {
    return [...roster].sort((a, b) => {
      const aNum = a.number ?? Number.MAX_SAFE_INTEGER
      const bNum = b.number ?? Number.MAX_SAFE_INTEGER
      if (aNum !== bNum) return aNum - bNum
      return (a.name ?? '').localeCompare(b.name ?? '')
    })
  }, [roster])

  const getPlayer = (playerId: string | undefined): RosterPlayer | undefined => {
    if (!playerId) return undefined
    return roster.find((player) => player.id === playerId)
  }

  const visibleRoles = showLibero ? [...LINEUP_ROLES, 'L' as const] : LINEUP_ROLES
  const filledCount = visibleRoles.filter((role) => assignments[role]).length
  const totalPositions = visibleRoles.length

  const getRolePosition = (role: Role | 'L') => {
    if (role === 'L') {
      const mb1Zone = getRoleZone(rotation, 'MB1')
      const mb2Zone = getRoleZone(rotation, 'MB2')
      const backRowMBZone = !isInFrontRow(rotation, 'MB1') ? mb1Zone : mb2Zone
      const basePos = ZONE_POSITIONS[backRowMBZone]
      return { x: basePos.x, y: basePos.y + 18 }
    }

    const zone = getRoleZone(rotation, role)
    return ZONE_POSITIONS[zone]
  }

  const handleSlotSelect = (role: Role | 'L') => {
    if (isLoading) return
    setSelectedRole((prev) => prev === role ? null : role)
  }

  const handlePlayerSelect = (player: RosterPlayer) => {
    if (!selectedRole || isLoading) return

    const nextAssignments = { ...assignments }
    const wasAssignedHere = nextAssignments[selectedRole] === player.id

    // Unassign this player from other spots first.
    for (const role of ALL_ASSIGNABLE_ROLES) {
      if (role !== selectedRole && nextAssignments[role] === player.id) {
        delete nextAssignments[role]
      }
    }

    if (wasAssignedHere) {
      delete nextAssignments[selectedRole]
    } else {
      nextAssignments[selectedRole] = player.id
    }

    onChange(nextAssignments)
    setSelectedRole(null)
  }

  const handleClearRole = () => {
    if (!selectedRole || isLoading) return
    const nextAssignments = { ...assignments }
    delete nextAssignments[selectedRole]
    onChange(nextAssignments)
    setSelectedRole(null)
  }

  const handleClearAll = () => {
    if (isLoading) return
    onChange({})
    setSelectedRole(null)
  }

  const stepRotation = (direction: 'prev' | 'next') => {
    if (!onRotationChange || isLoading) return
    const nextRotation = direction === 'prev'
      ? (rotation === 1 ? 6 : (rotation - 1)) as Rotation
      : (rotation === 6 ? 1 : (rotation + 1)) as Rotation
    onRotationChange(nextRotation)
  }

  const selectedRoleInfo = selectedRole
    ? selectedRole === 'L'
      ? { name: 'Libero', color: ROLE_INFO.L.color }
      : ROLE_INFO[selectedRole]
    : null
  const selectedAssignedPlayerId = selectedRole ? assignments[selectedRole] : undefined

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{filledCount}/{totalPositions} spots filled</span>
        {filledCount > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            disabled={isLoading}
            className="text-xs hover:text-foreground transition-colors disabled:opacity-50"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => stepRotation('prev')}
          disabled={!onRotationChange || isLoading}
          className="h-8 w-8 rounded-md border border-border bg-card hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="Previous rotation"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="w-44 text-center text-sm font-semibold text-foreground">
          Starting Rotation {rotation}
        </span>
        <button
          type="button"
          onClick={() => stepRotation('next')}
          disabled={!onRotationChange || isLoading}
          className="h-8 w-8 rounded-md border border-border bg-card hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="Next rotation"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="relative w-full aspect-[3/4] max-w-sm mx-auto rounded-xl border border-border bg-card/80 p-3">
        <div className="absolute inset-3 rounded-lg border border-border bg-amber-500/10">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-border rounded-t-lg" />
          <div className="absolute top-[33%] left-0 right-0 h-px bg-border/60" />
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border/50" />
        </div>

        {LINEUP_ROLES.map((role) => {
          const pos = getRolePosition(role)
          const player = getPlayer(assignments[role])
          const roleInfo = ROLE_INFO[role]
          const isSelected = selectedRole === role
          const label = player?.name || role

          return (
            <button
              key={role}
              type="button"
              onClick={() => handleSlotSelect(role)}
              disabled={isLoading}
              className={cn(
                'absolute -translate-x-1/2 -translate-y-1/2 z-10 w-16 h-16 rounded-full border-2 transition-all flex flex-col items-center justify-center px-1 text-center touch-manipulation',
                isSelected && 'ring-2 ring-primary/70 ring-offset-2 ring-offset-background scale-105',
                player ? 'shadow-md' : 'border-dashed',
                isLoading && 'opacity-60'
              )}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                borderColor: roleInfo.color,
                backgroundColor: player ? `${roleInfo.color}35` : `${roleInfo.color}18`,
              }}
            >
              <span className="max-w-full truncate text-[11px] font-semibold text-foreground">
                {label}
              </span>
              {player?.number !== undefined ? (
                <span className="text-[10px] text-foreground/90">#{player.number}</span>
              ) : (
                <span className="text-[10px]" style={{ color: roleInfo.color }}>{role}</span>
              )}
            </button>
          )
        })}

        {showLibero && (() => {
          const pos = getRolePosition('L')
          const player = getPlayer(assignments.L)
          const roleInfo = ROLE_INFO.L
          const isSelected = selectedRole === 'L'
          const label = player?.name || 'L'

          return (
            <button
              type="button"
              onClick={() => handleSlotSelect('L')}
              disabled={isLoading}
              className={cn(
                'absolute -translate-x-1/2 -translate-y-1/2 z-10 w-16 h-16 rounded-full border-2 transition-all flex flex-col items-center justify-center px-1 text-center touch-manipulation',
                isSelected && 'ring-2 ring-primary/70 ring-offset-2 ring-offset-background scale-105',
                player ? 'shadow-md' : 'border-dashed',
                isLoading && 'opacity-60'
              )}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                borderColor: roleInfo.color,
                backgroundColor: player ? `${roleInfo.color}35` : `${roleInfo.color}18`,
              }}
            >
              <span className="max-w-full truncate text-[11px] font-semibold text-foreground">
                {label}
              </span>
              {player?.number !== undefined ? (
                <span className="text-[10px] text-foreground/90">#{player.number}</span>
              ) : (
                <span className="text-[10px]" style={{ color: roleInfo.color }}>L</span>
              )}
            </button>
          )
        })()}
      </div>

      {selectedRole && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Assign{' '}
              <span style={{ color: selectedRoleInfo?.color }}>
                {selectedRoleInfo?.name}
              </span>
            </h3>
            {selectedAssignedPlayerId && (
              <button
                type="button"
                onClick={handleClearRole}
                disabled={isLoading}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Clear
              </button>
            )}
          </div>

          {sortedRoster.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {sortedRoster.map((player) => {
                const isAssignedHere = selectedAssignedPlayerId === player.id
                const otherRole = ALL_ASSIGNABLE_ROLES.find((role) =>
                  role !== selectedRole && assignments[role] === player.id
                )
                const isAssignedElsewhere = Boolean(otherRole)

                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => handlePlayerSelect(player)}
                    disabled={isLoading}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-left transition-colors flex items-center gap-2',
                      isAssignedHere
                        ? 'bg-primary/10 border-primary/40'
                        : 'bg-card border-border hover:bg-muted',
                      isLoading && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <span className={cn(
                      'min-w-0 flex-1 truncate text-sm',
                      isAssignedHere ? 'text-foreground font-semibold' : 'text-foreground'
                    )}>
                      {player.name || 'Unnamed Player'}
                    </span>
                    {player.number !== undefined && (
                      <span className="text-xs text-muted-foreground shrink-0">#{player.number}</span>
                    )}
                    {isAssignedElsewhere && (
                      <span className="text-[10px] text-muted-foreground/70 shrink-0">{otherRole}</span>
                    )}
                    {isAssignedHere && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-3">
              Add players to the roster first to assign positions.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
