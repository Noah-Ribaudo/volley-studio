'use client'

import { RosterPlayer, Role, ROLE_INFO } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PlayerGridProps {
  players: RosterPlayer[]
  assignedPlayerIds?: string[]
  onSelect: (player: RosterPlayer) => void
  selectedRole?: Role | 'L' | null
  onClear?: () => void
  showClear?: boolean
}

export function PlayerGrid({
  players,
  assignedPlayerIds = [],
  onSelect,
  selectedRole,
  onClear,
  showClear = false,
}: PlayerGridProps) {
  const roleInfo = selectedRole
    ? selectedRole === 'L'
      ? { name: 'Libero', color: ROLE_INFO.L.color }
      : ROLE_INFO[selectedRole]
    : null

  // Sort players by jersey number (fallback to name when number is missing)
  const sortedPlayers = [...players].sort((a, b) => {
    const aNum = a.number ?? Number.MAX_SAFE_INTEGER
    const bNum = b.number ?? Number.MAX_SAFE_INTEGER
    if (aNum !== bNum) return aNum - bNum
    return (a.name ?? '').localeCompare(b.name ?? '')
  })

  if (sortedPlayers.length === 0) {
    return (
      <div className="text-zinc-500 text-sm text-center py-4">
        No players available. Add players to the roster first.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {selectedRole && roleInfo && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-400">
            Select player for{' '}
            <span style={{ color: roleInfo.color }}>{roleInfo.name}</span>
          </h3>
          {showClear && onClear && (
            <button
              onClick={onClear}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {sortedPlayers.map((player) => {
          const isAssigned = assignedPlayerIds.includes(player.id)
          return (
            <button
              key={player.id}
              onClick={() => onSelect(player)}
              className={cn(
                'border rounded-lg p-3 text-center transition-all touch-manipulation',
                isAssigned
                  ? 'bg-zinc-800/50 border-zinc-700 text-zinc-500'
                  : 'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 border-zinc-600',
                'active:scale-95'
              )}
              style={{ minHeight: 64 }}
            >
              <div className={cn(
                'text-xl font-bold',
                isAssigned && 'text-zinc-500'
              )}>
                {player.number != null ? `#${player.number}` : player.name}
              </div>
              {player.number != null && player.name && (
                <div className={cn(
                  'text-xs truncate',
                  isAssigned ? 'text-zinc-600' : 'text-zinc-400'
                )}>
                  {player.name}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
