'use client'

import { Role, RosterPlayer, ROLE_INFO } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PositionSlotProps {
  role: Role | 'L'
  player?: RosterPlayer | null
  isSelected: boolean
  onSelect: () => void
  zone?: number | null
  isLibero?: boolean
  variant?: 'default' | 'compact'
}

export function PositionSlot({
  role,
  player,
  isSelected,
  onSelect,
  zone,
  isLibero = false,
  variant = 'default',
}: PositionSlotProps) {
  const roleInfo = role === 'L'
    ? { name: 'Libero', color: ROLE_INFO.L.color }
    : ROLE_INFO[role]

  const isCompact = variant === 'compact'

  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative rounded-xl border-2 transition-all flex flex-col items-center justify-center',
        isCompact ? 'aspect-square' : 'aspect-square',
        isSelected
          ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/50'
          : player
            ? 'border-zinc-600 bg-zinc-800 hover:border-zinc-500'
            : 'border-dashed border-zinc-600 bg-zinc-900 hover:border-zinc-500',
        'active:scale-95 touch-manipulation'
      )}
      style={{
        minHeight: isCompact ? undefined : 64,
      }}
    >
      {player ? (
        <>
          <div className={cn(
            'font-bold',
            isCompact ? 'text-xl' : 'text-2xl'
          )}>
            #{player.number}
          </div>
          <div className={cn(
            'text-zinc-400 truncate max-w-full px-1',
            isCompact ? 'text-[10px]' : 'text-xs'
          )}>
            {player.name}
          </div>
        </>
      ) : (
        <>
          <div
            className={cn(
              'font-bold',
              isCompact ? 'text-base' : 'text-lg'
            )}
            style={{ color: roleInfo.color }}
          >
            {role}
          </div>
          <div className={cn(
            'text-zinc-500',
            isCompact ? 'text-[10px]' : 'text-xs'
          )}>
            {isLibero ? 'Libero' : zone ? `Zone ${zone}` : roleInfo.name}
          </div>
        </>
      )}
    </button>
  )
}
