'use client'

import { Role, RosterPlayer, PositionAssignments, ROLE_INFO } from '@/lib/types'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PlayerPickerProps {
  /** The role being assigned */
  role: Role
  /** Available roster players */
  roster: RosterPlayer[]
  /** Current position assignments */
  assignments: PositionAssignments
  /** Callback when a player is selected */
  onSelect: (playerId: string) => void
  /** Callback to close the picker */
  onClose: () => void
}

export function PlayerPicker({ role, roster, assignments, onSelect, onClose }: PlayerPickerProps) {
  const roleInfo = ROLE_INFO[role]
  const currentPlayerId = assignments[role]

  // Get players who are either unassigned or assigned to this role
  const availablePlayers = roster.filter((player) => {
    const assignedRole = Object.entries(assignments).find(([_, id]) => id === player.id)?.[0] as Role | undefined
    return !assignedRole || assignedRole === role
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Assign Player to {roleInfo.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select a player from your roster
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Player list */}
        <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-4 space-y-2">
          {availablePlayers.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No available players
            </div>
          ) : (
            availablePlayers.map((player) => {
              const isSelected = player.id === currentPlayerId
              return (
                <button
                  key={player.id}
                  onClick={() => onSelect(player.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${roleInfo.bgColor}`}>
                      #{player.number}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {player.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        #{player.number}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="text-blue-500 font-medium text-sm">
                      Current
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
