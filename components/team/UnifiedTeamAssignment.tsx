'use client'

import { useMemo, useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Role, RosterPlayer, PositionAssignments, Rotation, ROLE_INFO } from '@/lib/types'
import { getRoleZone, isInFrontRow } from '@/lib/rotations'
import { cn } from '@/lib/utils'

const LINEUP_ROLES: Role[] = ['S', 'OH1', 'OH2', 'MB1', 'MB2', 'OPP']
const ALL_ASSIGNABLE_ROLES: Array<Role | 'L'> = [...LINEUP_ROLES, 'L']

const ZONE_POSITIONS: Record<number, { x: number; y: number }> = {
  4: { x: 20, y: 25 },
  3: { x: 50, y: 25 },
  2: { x: 80, y: 25 },
  5: { x: 20, y: 62 },
  6: { x: 50, y: 62 },
  1: { x: 80, y: 62 },
}

interface UnifiedTeamAssignmentProps {
  roster: RosterPlayer[]
  assignments: PositionAssignments
  onChange: (assignments: PositionAssignments) => void
  showLibero?: boolean
  rotation?: Rotation
  onRotationChange?: (rotation: Rotation) => void
  isLoading?: boolean
}

export function UnifiedTeamAssignment({
  roster,
  assignments,
  onChange,
  showLibero = false,
  rotation = 1,
  onRotationChange,
  isLoading = false,
}: UnifiedTeamAssignmentProps) {
  const [selectedRole, setSelectedRole] = useState<Role | 'L' | null>(null)
  const [activeDragPlayer, setActiveDragPlayer] = useState<RosterPlayer | null>(null)

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { distance: 8 },
  })
  const sensors = useSensors(pointerSensor, touchSensor)

  const sortedRoster = useMemo(() => {
    return [...roster].sort((a, b) => {
      const aNum = a.number ?? Number.MAX_SAFE_INTEGER
      const bNum = b.number ?? Number.MAX_SAFE_INTEGER
      if (aNum !== bNum) return aNum - bNum
      return (a.name ?? '').localeCompare(b.name ?? '')
    })
  }, [roster])

  const getPlayer = useCallback(
    (playerId: string | undefined): RosterPlayer | undefined => {
      if (!playerId) return undefined
      return roster.find((player) => player.id === playerId)
    },
    [roster]
  )

  const visibleRoles = showLibero ? [...LINEUP_ROLES, 'L' as const] : LINEUP_ROLES
  const filledCount = visibleRoles.filter((role) => assignments[role]).length
  const totalPositions = visibleRoles.length

  const getRolePosition = useCallback(
    (role: Role | 'L') => {
      if (role === 'L') {
        const mb1Zone = getRoleZone(rotation, 'MB1')
        const mb2Zone = getRoleZone(rotation, 'MB2')
        const backRowMBZone = !isInFrontRow(rotation, 'MB1') ? mb1Zone : mb2Zone
        const basePos = ZONE_POSITIONS[backRowMBZone]
        return { x: basePos.x, y: basePos.y + 18 }
      }
      const zone = getRoleZone(rotation, role)
      return ZONE_POSITIONS[zone]
    },
    [rotation]
  )

  const assignPlayer = useCallback(
    (role: Role | 'L', player: RosterPlayer) => {
      if (isLoading) return
      const nextAssignments = { ...assignments }
      const wasAssignedHere = nextAssignments[role] === player.id

      // Unassign this player from other spots first
      for (const r of ALL_ASSIGNABLE_ROLES) {
        if (r !== role && nextAssignments[r] === player.id) {
          delete nextAssignments[r]
        }
      }

      if (wasAssignedHere) {
        delete nextAssignments[role]
      } else {
        nextAssignments[role] = player.id
      }

      onChange(nextAssignments)
    },
    [assignments, onChange, isLoading]
  )

  const handleSlotTap = useCallback(
    (role: Role | 'L') => {
      if (isLoading) return
      // If tapping an assigned slot, unassign
      if (assignments[role] && selectedRole !== role) {
        const nextAssignments = { ...assignments }
        delete nextAssignments[role]
        onChange(nextAssignments)
        setSelectedRole(null)
        return
      }
      setSelectedRole((prev) => (prev === role ? null : role))
    },
    [isLoading, assignments, onChange, selectedRole]
  )

  const handlePlayerTap = useCallback(
    (player: RosterPlayer) => {
      if (!selectedRole || isLoading) return
      assignPlayer(selectedRole, player)
      setSelectedRole(null)
    },
    [selectedRole, isLoading, assignPlayer]
  )

  const handleClearAll = useCallback(() => {
    if (isLoading) return
    onChange({})
    setSelectedRole(null)
  }, [isLoading, onChange])

  const stepRotation = useCallback(
    (direction: 'prev' | 'next') => {
      if (!onRotationChange || isLoading) return
      const nextRotation =
        direction === 'prev'
          ? ((rotation === 1 ? 6 : rotation - 1) as Rotation)
          : ((rotation === 6 ? 1 : rotation + 1) as Rotation)
      onRotationChange(nextRotation)
    },
    [onRotationChange, isLoading, rotation]
  )

  // Drag handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const playerId = event.active.id as string
      const player = roster.find((p) => p.id === playerId)
      if (player) {
        setActiveDragPlayer(player)
        setSelectedRole(null) // Clear tap-selection during drag
      }
    },
    [roster]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragPlayer(null)
      const { active, over } = event
      if (!over) return

      const playerId = active.id as string
      const role = over.id as Role | 'L'
      const player = roster.find((p) => p.id === playerId)

      if (player && visibleRoles.includes(role as Role)) {
        assignPlayer(role, player)
      }
    },
    [roster, visibleRoles, assignPlayer]
  )

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Header: filled counter + clear all */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {filledCount}/{totalPositions} spots filled
          </span>
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

        {/* Rotation cycling */}
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

        {/* Court */}
        <div className="relative w-full aspect-[3/4] max-w-sm mx-auto rounded-xl border border-border bg-card/80 p-3">
          <div className="absolute inset-3 rounded-lg border border-border bg-amber-500/10">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-border rounded-t-lg" />
            <div className="absolute top-[33%] left-0 right-0 h-px bg-border/60" />
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border/50" />
          </div>

          {LINEUP_ROLES.map((role) => (
            <CourtSlot
              key={role}
              role={role}
              position={getRolePosition(role)}
              player={getPlayer(assignments[role])}
              isSelected={selectedRole === role}
              isDragging={!!activeDragPlayer}
              isLoading={isLoading}
              onTap={() => handleSlotTap(role)}
            />
          ))}

          {showLibero && (
            <CourtSlot
              role="L"
              position={getRolePosition('L')}
              player={getPlayer(assignments.L)}
              isSelected={selectedRole === 'L'}
              isDragging={!!activeDragPlayer}
              isLoading={isLoading}
              onTap={() => handleSlotTap('L')}
            />
          )}
        </div>

        {/* Roster grid — always visible */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            {selectedRole ? (
              <>
                Tap a player to assign{' '}
                <span
                  style={{
                    color:
                      selectedRole === 'L'
                        ? ROLE_INFO.L.color
                        : ROLE_INFO[selectedRole].color,
                  }}
                >
                  {selectedRole === 'L' ? 'Libero' : ROLE_INFO[selectedRole].name}
                </span>
              </>
            ) : (
              'Roster'
            )}
          </h3>

          {sortedRoster.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {sortedRoster.map((player) => (
                <RosterCard
                  key={player.id}
                  player={player}
                  assignments={assignments}
                  selectedRole={selectedRole}
                  visibleRoles={visibleRoles}
                  isDragging={activeDragPlayer?.id === player.id}
                  isLoading={isLoading}
                  onTap={() => handlePlayerTap(player)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-3">
              Add players to the roster first to assign positions.
            </p>
          )}
        </div>
      </div>

      {/* Drag overlay — floating card following pointer */}
      <DragOverlay dropAnimation={null}>
        {activeDragPlayer && (
          <div className="rounded-lg border border-primary/40 bg-primary/10 backdrop-blur-sm px-3 py-2 flex items-center gap-2 shadow-lg pointer-events-none">
            {activeDragPlayer.number !== undefined && (
              <span className="text-sm font-bold text-foreground">
                #{activeDragPlayer.number}
              </span>
            )}
            <span className="text-sm text-foreground truncate">
              {activeDragPlayer.name || 'Unnamed Player'}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

// ─── Court Slot (droppable) ────────────────────────────────────────────────────

interface CourtSlotProps {
  role: Role | 'L'
  position: { x: number; y: number }
  player: RosterPlayer | undefined
  isSelected: boolean
  isDragging: boolean
  isLoading: boolean
  onTap: () => void
}

function CourtSlot({
  role,
  position,
  player,
  isSelected,
  isDragging,
  isLoading,
  onTap,
}: CourtSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id: role })
  const roleInfo = role === 'L' ? ROLE_INFO.L : ROLE_INFO[role]

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onTap}
      disabled={isLoading}
      className={cn(
        'absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center justify-center rounded-full transition-all touch-manipulation',
        'w-14 h-14 sm:w-16 sm:h-16',
        player ? 'border-2 border-solid shadow-md' : 'border-2 border-dashed',
        isSelected &&
          'ring-2 ring-primary/70 ring-offset-2 ring-offset-background scale-105',
        isOver && isDragging && 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110',
        'active:scale-95',
        isLoading && 'opacity-60'
      )}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        borderColor: roleInfo.color,
        backgroundColor: isOver && isDragging
          ? `color-mix(in srgb, ${roleInfo.color} 40%, transparent)`
          : player
            ? `color-mix(in srgb, ${roleInfo.color} 22%, transparent)`
            : `color-mix(in srgb, ${roleInfo.color} 10%, transparent)`,
      }}
    >
      {player ? (
        <>
          <span className="text-base sm:text-lg font-bold text-foreground leading-none">
            #{player.number}
          </span>
          <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate max-w-[3rem] leading-tight">
            {player.name}
          </span>
        </>
      ) : (
        <span
          className="text-sm sm:text-base font-bold"
          style={{ color: roleInfo.color }}
        >
          {role}
        </span>
      )}
    </button>
  )
}

// ─── Roster Card (draggable) ───────────────────────────────────────────────────

interface RosterCardProps {
  player: RosterPlayer
  assignments: PositionAssignments
  selectedRole: Role | 'L' | null
  visibleRoles: Array<Role | 'L'>
  isDragging: boolean
  isLoading: boolean
  onTap: () => void
}

function RosterCard({
  player,
  assignments,
  selectedRole,
  visibleRoles,
  isDragging,
  isLoading,
  onTap,
}: RosterCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
  } = useDraggable({ id: player.id })

  // Find which role this player is currently assigned to
  const assignedRole = visibleRoles.find((role) => assignments[role] === player.id)
  const isAssignedToSelected = selectedRole
    ? assignments[selectedRole] === player.id
    : false

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onTap}
      disabled={isLoading || !selectedRole}
      className={cn(
        'rounded-lg border px-3 py-2 text-left transition-colors flex items-center gap-2 touch-manipulation',
        isAssignedToSelected
          ? 'bg-primary/10 border-primary/40'
          : 'bg-card border-border',
        selectedRole && !isLoading && 'hover:bg-muted cursor-pointer',
        !selectedRole && !isLoading && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
        isLoading && 'opacity-50 cursor-not-allowed'
      )}
      style={style}
      {...listeners}
      {...attributes}
    >
      {player.number !== undefined && (
        <span
          className={cn(
            'text-sm font-semibold shrink-0',
            isAssignedToSelected ? 'text-primary' : 'text-foreground'
          )}
        >
          #{player.number}
        </span>
      )}
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-sm',
          isAssignedToSelected ? 'text-foreground font-semibold' : 'text-foreground'
        )}
      >
        {player.name || 'Unnamed Player'}
      </span>
      {assignedRole && !isAssignedToSelected && (
        <span
          className="text-[10px] font-medium shrink-0 rounded px-1 py-0.5"
          style={{
            color: assignedRole === 'L' ? ROLE_INFO.L.color : ROLE_INFO[assignedRole as Role].color,
            backgroundColor:
              assignedRole === 'L'
                ? `color-mix(in srgb, ${ROLE_INFO.L.color} 15%, transparent)`
                : `color-mix(in srgb, ${ROLE_INFO[assignedRole as Role].color} 15%, transparent)`,
          }}
        >
          {assignedRole}
        </span>
      )}
      {isAssignedToSelected && (
        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
      )}
    </button>
  )
}
