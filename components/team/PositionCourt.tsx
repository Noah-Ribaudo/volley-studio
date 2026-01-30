'use client'

import { useState } from 'react'
import { Role, RosterPlayer, PositionAssignments, ROLES, Rotation } from '@/lib/types'
import { getRoleZone } from '@/lib/rotations'
import { PositionSlot } from './PositionSlot'
import { PlayerGrid } from './PlayerGrid'

// Roles for lineup (no libero)
const LINEUP_ROLES: Role[] = ['S', 'OH1', 'OH2', 'MB1', 'MB2', 'OPP']

// Zone to grid position mapping for front row (zones 4, 3, 2 left to right)
// and back row (zones 5, 6, 1 left to right)
const FRONT_ROW_ZONES = [4, 3, 2]
const BACK_ROW_ZONES = [5, 6, 1]

interface PositionCourtProps {
  roster: RosterPlayer[]
  assignments: PositionAssignments
  onChange: (assignments: PositionAssignments) => void
  showLibero?: boolean
  rotation?: Rotation
  isLoading?: boolean
}

export function PositionCourt({
  roster,
  assignments,
  onChange,
  showLibero = false,
  rotation = 1,
  isLoading = false,
}: PositionCourtProps) {
  const [selectedRole, setSelectedRole] = useState<Role | 'L' | null>(null)

  // Get player by id from roster
  const getPlayer = (playerId: string | undefined): RosterPlayer | undefined => {
    if (!playerId) return undefined
    return roster.find(p => p.id === playerId)
  }

  // Get all assigned player IDs
  const assignedPlayerIds = Object.values(assignments).filter(Boolean) as string[]

  // Get available players (not yet assigned)
  const availablePlayers = roster.filter(p => !assignedPlayerIds.includes(p.id))

  // Handle position slot tap
  const handleSlotSelect = (role: Role | 'L') => {
    if (isLoading) return
    setSelectedRole(selectedRole === role ? null : role)
  }

  // Handle player selection
  const handlePlayerSelect = (player: RosterPlayer) => {
    if (!selectedRole || isLoading) return

    const newAssignments = { ...assignments }

    // Remove this player from any other role first
    for (const r of ROLES) {
      if (newAssignments[r] === player.id) {
        delete newAssignments[r]
      }
    }

    // Assign to selected role
    newAssignments[selectedRole] = player.id

    onChange(newAssignments)
    setSelectedRole(null)
  }

  // Handle clear for selected position
  const handleClear = () => {
    if (!selectedRole) return
    const newAssignments = { ...assignments }
    delete newAssignments[selectedRole]
    onChange(newAssignments)
    setSelectedRole(null)
  }

  // Count filled positions
  const visibleRoles = showLibero ? [...LINEUP_ROLES, 'L' as const] : LINEUP_ROLES
  const filledCount = visibleRoles.filter(r => assignments[r]).length
  const totalPositions = visibleRoles.length

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>{filledCount}/{totalPositions} positions filled</span>
        {filledCount > 0 && (
          <button
            onClick={() => {
              onChange({})
              setSelectedRole(null)
            }}
            disabled={isLoading}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Court Grid */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
        {/* Net indicator */}
        <div className="h-1 bg-zinc-600 rounded mb-4" />

        {/* Front Row - dynamically sorted by zone (4, 3, 2 left to right) */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {FRONT_ROW_ZONES.map((targetZone) => {
            // Find which role is in this zone for current rotation
            const role = LINEUP_ROLES.find(r => getRoleZone(rotation, r) === targetZone)
            if (!role) return <div key={targetZone} />
            return (
              <PositionSlot
                key={role}
                role={role}
                zone={targetZone}
                player={getPlayer(assignments[role])}
                isSelected={selectedRole === role}
                onSelect={() => handleSlotSelect(role)}
              />
            )
          })}
        </div>

        {/* Back Row - dynamically sorted by zone (5, 6, 1 left to right) */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {BACK_ROW_ZONES.map((targetZone) => {
            // Find which role is in this zone for current rotation
            const role = LINEUP_ROLES.find(r => getRoleZone(rotation, r) === targetZone)
            if (!role) return <div key={targetZone} />
            return (
              <PositionSlot
                key={role}
                role={role}
                zone={targetZone}
                player={getPlayer(assignments[role])}
                isSelected={selectedRole === role}
                onSelect={() => handleSlotSelect(role)}
              />
            )
          })}
        </div>

        {/* Libero */}
        {showLibero && (
          <div className="flex justify-center">
            <div className="w-1/3">
              <PositionSlot
                role="L"
                player={getPlayer(assignments['L'])}
                isSelected={selectedRole === 'L'}
                onSelect={() => handleSlotSelect('L')}
                isLibero
              />
            </div>
          </div>
        )}
      </div>

      {/* Player Selection Grid - appears when a position is selected */}
      {selectedRole && (
        <PlayerGrid
          players={availablePlayers}
          assignedPlayerIds={assignedPlayerIds}
          selectedRole={selectedRole}
          onSelect={handlePlayerSelect}
          onClear={handleClear}
          showClear={!!assignments[selectedRole]}
        />
      )}

      {/* Empty roster message */}
      {roster.length === 0 && (
        <p className="text-sm text-zinc-500 text-center py-4">
          Add players to the roster first to assign positions
        </p>
      )}
    </div>
  )
}
