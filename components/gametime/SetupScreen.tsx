'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useGameTimeStore } from '@/store/useGameTimeStore'
import { useAppStore } from '@/store/useAppStore'
import { Team, Role, RosterPlayer, Rotation, ROLE_INFO } from '@/lib/types'
import { getRoleZone, isInFrontRow } from '@/lib/rotations'
import { ChevronLeft, ChevronRight, ChevronDown, Zap, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { listLocalTeams } from '@/lib/localTeams'

// Roles for lineup (no libero)
const LINEUP_ROLES: Role[] = ['S', 'OH1', 'OH2', 'MB1', 'MB2', 'OPP']

// Zone positions on court (percentages)
// Back row moved up to leave room for libero below
const ZONE_POSITIONS: Record<number, { x: number; y: number }> = {
  4: { x: 20, y: 25 },  // front left
  3: { x: 50, y: 25 },  // front center
  2: { x: 80, y: 25 },  // front right
  5: { x: 20, y: 62 },  // back left
  6: { x: 50, y: 62 },  // back center
  1: { x: 80, y: 62 },  // back right
}

type SetupStep = 'team' | 'lineup'

export function SetupScreen() {
  const [step, setStep] = useState<SetupStep>('team')
  const [quickStartName, setQuickStartName] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role | 'L' | null>(null)
  const [localTeams, setLocalTeams] = useState<Team[]>([])
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)
  const isMobile = useIsMobile()
  const currentTeam = useAppStore((state) => state.currentTeam)

  // Fetch teams from Convex
  const convexTeams = useQuery(api.teams.list)
  const loading = convexTeams === undefined

  // Transform Convex teams to the Team format expected by the component
  const cloudTeams: Team[] = (convexTeams ?? []).map(t => ({
    id: t._id,
    name: t.name,
    slug: t.slug,
    hasPassword: t.hasPassword,
    archived: t.archived,
    roster: t.roster.map(p => ({
      id: p.id,
      name: p.name,
      number: p.number ?? 0,
    })),
    lineups: t.lineups.map(l => ({
      ...l,
      position_source: l.position_source as 'custom' | 'full-5-1' | '5-1-libero' | '6-2' | undefined,
      starting_rotation: (l.starting_rotation as 1 | 2 | 3 | 4 | 5 | 6 | undefined) ?? 1,
    })),
    active_lineup_id: t.activeLineupId ?? null,
    position_assignments: t.positionAssignments,
    created_at: new Date(t._creationTime).toISOString(),
    updated_at: new Date(t._creationTime).toISOString(),
  }))

  useEffect(() => {
    const refreshLocalTeams = () => {
      const storedTeams = listLocalTeams()
      if (currentTeam?.id?.startsWith('local-') && !storedTeams.some((team) => team.id === currentTeam.id)) {
        setLocalTeams([currentTeam, ...storedTeams])
        return
      }
      setLocalTeams(storedTeams)
    }

    refreshLocalTeams()
    window.addEventListener('focus', refreshLocalTeams)
    window.addEventListener('storage', refreshLocalTeams)
    return () => {
      window.removeEventListener('focus', refreshLocalTeams)
      window.removeEventListener('storage', refreshLocalTeams)
    }
  }, [currentTeam])

  const {
    team,
    teamName,
    isQuickStart,
    lineup,
    libero,
    bench,
    rotation,
    serving,
    selectTeam,
    quickStart,
    assignPlayer,
    assignLibero,
    setStartingRotation,
    setServingFirst,
    startGame,
    isLineupComplete,
  } = useGameTimeStore()

  // Handle team selection
  const handleSelectTeam = (t: Team, lineupId?: string) => {
    selectTeam(t, lineupId)
    setStep('lineup')
  }

  // Handle team card tap — expand if multiple lineups, otherwise go straight to court
  const handleTeamTap = (t: Team) => {
    if (t.lineups.length >= 2) {
      setExpandedTeamId(expandedTeamId === t.id ? null : t.id)
    } else {
      handleSelectTeam(t)
    }
  }

  const handleQuickStart = () => {
    quickStart(quickStartName || 'My Team')
    setStep('lineup')
  }

  const courtRef = useRef<HTMLDivElement>(null)

  // Handle player assignment from popover
  const handlePlayerTap = (player: RosterPlayer) => {
    if (!selectedRole) return

    if (selectedRole === 'L') {
      assignLibero(player)
    } else {
      assignPlayer(selectedRole, player)
    }
    setSelectedRole(null)
  }

  // All roster players (bench + assigned + libero) for popover
  const allRosterPlayers: RosterPlayer[] = (() => {
    const map = new Map<string, RosterPlayer>()
    for (const p of bench) map.set(p.id, p)
    for (const role of LINEUP_ROLES) {
      const p = lineup[role]
      if (p) map.set(p.id, p)
    }
    if (libero) map.set(libero.id, libero)
    return [...map.values()]
  })()

  // Check if we can proceed
  const canStartGame = isLineupComplete()
  const [servingChosen, setServingChosen] = useState(false)
  const isLocalTeamSelected = !isQuickStart && !!team?.id?.startsWith('local-')

  // Get position for a role on the court
  const getRolePosition = (role: Role | 'L') => {
    if (role === 'L') {
      // Libero directly below the back-row MB
      const mb1Zone = getRoleZone(rotation, 'MB1')
      const mb2Zone = getRoleZone(rotation, 'MB2')
      const backRowMBZone = !isInFrontRow(rotation, 'MB1') ? mb1Zone : mb2Zone
      const basePos = ZONE_POSITIONS[backRowMBZone]
      return { x: basePos.x, y: basePos.y + 18 }
    }
    const zone = getRoleZone(rotation, role)
    return ZONE_POSITIONS[zone]
  }

  // Compute popover placement relative to court
  const getPopoverStyle = (role: Role | 'L'): React.CSSProperties => {
    const container = courtRef.current
    const pos = getRolePosition(role)

    if (!container) {
      return {
        position: 'absolute',
        left: `${Math.min(Math.max(pos.x, 12), 88)}%`,
        top: `${Math.min(Math.max(pos.y + 8, 8), 88)}%`,
      }
    }

    const rect = container.getBoundingClientRect()
    const POPOVER_WIDTH = 220
    const POPOVER_HEIGHT = 300
    const EDGE_PADDING = 8
    const OFFSET = 26

    let left = (pos.x / 100) * rect.width + (pos.x < 50 ? OFFSET : -POPOVER_WIDTH - OFFSET)
    let top = (pos.y / 100) * rect.height + (pos.y > 50 ? -POPOVER_HEIGHT - OFFSET : OFFSET)

    left = Math.max(EDGE_PADDING, Math.min(left, rect.width - POPOVER_WIDTH - EDGE_PADDING))
    top = Math.max(EDGE_PADDING, Math.min(top, rect.height - POPOVER_HEIGHT - EDGE_PADDING))

    return {
      position: 'absolute',
      left,
      top,
    }
  }

  const renderPlayerPicker = (role: Role | 'L') => (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2 py-1">
        <span
          className="text-xs font-semibold"
          style={{ color: ROLE_INFO[role === 'L' ? 'L' : role].color }}
        >
          {role === 'L' ? 'Libero' : ROLE_INFO[role].name}
        </span>
        <button
          onClick={() => setSelectedRole(null)}
          className="p-0.5 text-zinc-500 hover:text-zinc-300 ml-4"
          aria-label="Close player picker"
          type="button"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1">
        {[...allRosterPlayers].sort((a, b) => (a.number ?? 0) - (b.number ?? 0)).map((player) => {
          const isAlreadyHere = role === 'L'
            ? libero?.id === player.id
            : lineup[role]?.id === player.id
          const otherRole = LINEUP_ROLES.find(r => r !== role && lineup[r]?.id === player.id)
          const isOtherLibero = role !== 'L' && libero?.id === player.id
          const isAssignedElsewhere = !!otherRole || isOtherLibero

          return (
            <button
              key={player.id}
              onClick={() => {
                if (isAlreadyHere) {
                  setSelectedRole(null)
                  return
                }
                handlePlayerTap(player)
              }}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors text-left min-w-0',
                isAlreadyHere
                  ? 'bg-zinc-800'
                  : isAssignedElsewhere
                    ? 'opacity-40 hover:opacity-70 hover:bg-zinc-800 active:bg-zinc-700'
                    : 'hover:bg-zinc-800 active:bg-zinc-700'
              )}
            >
              <span className="text-sm text-zinc-300 truncate min-w-0 flex-1">
                {player.name || 'Unnamed Player'}
              </span>
              {player.number !== undefined && (
                <span className={cn(
                  'text-sm font-semibold shrink-0',
                  isAlreadyHere ? 'text-blue-400' : 'text-white'
                )}>
                  #{player.number}
                </span>
              )}
              {isAssignedElsewhere && (
                <span className="text-[10px] text-zinc-500 shrink-0">
                  {otherRole || 'L'}
                </span>
              )}
              {isAlreadyHere && (
                <Check className="w-3 h-3 text-blue-400 shrink-0" />
              )}
            </button>
          )
        })}
      </div>

      {allRosterPlayers.length === 0 && (
        <div className="text-xs text-zinc-500 text-center py-3">
          No players available
        </div>
      )}
    </div>
  )

  // Render team selection step
  if (step === 'team') {
    return (
      <div className="flex flex-col flex-1 p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-center">GameTime</h1>
        </div>

        {/* Quick Start */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Quick Start
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Team name (optional)"
              value={quickStartName}
              onChange={(e) => setQuickStartName(e.target.value)}
              className="flex-1 bg-card border border-border rounded-lg px-4 py-3 text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleQuickStart}
              className="bg-primary hover:bg-primary/90 active:bg-primary/80 text-white font-semibold px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Zap className="w-5 h-5" />
              Go
            </button>
          </div>
        </div>

        {/* Saved Teams */}
        <div className="flex-1">
          <div className="space-y-6">
            {localTeams.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Local Teams
                </h2>
                <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                  <p className="text-xs text-amber-200">
                    Reminder: local teams are device-only and can be lost. Sign in to save teams to your account.
                  </p>
                </div>
                <div className="space-y-2">
                  {localTeams.map((t) => (
                    <TeamCard
                      key={t.id}
                      team={t}
                      isExpanded={expandedTeamId === t.id}
                      onTap={() => handleTeamTap(t)}
                      onSelectLineup={(lineupId) => handleSelectTeam(t, lineupId)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Saved Teams
              </h2>

              {loading ? (
                <div className="text-muted-foreground text-center py-8">Loading teams...</div>
              ) : cloudTeams.length === 0 ? (
                <div className="text-muted-foreground text-center py-8">
                  No saved teams yet
                </div>
              ) : (
                <div className="space-y-2">
                  {cloudTeams.map((t) => (
                    <TeamCard
                      key={t.id}
                      team={t}
                      isExpanded={expandedTeamId === t.id}
                      onTap={() => handleTeamTap(t)}
                      onSelectLineup={(lineupId) => handleSelectTeam(t, lineupId)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render lineup step
  if (step === 'lineup') {
    return (
      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button
            onClick={() => setStep('team')}
            className="flex items-center gap-1 text-muted-foreground hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-lg font-semibold">{teamName}</h1>
          <div className="w-16" /> {/* Spacer */}
        </div>

        {/* Court Lineup View */}
        <div className="flex-1 p-4 flex flex-col">
          {isLocalTeamSelected && (
            <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
              <p className="text-xs text-amber-200">
                Reminder: this local team is not saved to your account. Sign in to keep it across devices.
              </p>
            </div>
          )}
          {/* Rotation selector */}
          <div className="flex items-center justify-center gap-4 mb-3">
            <button
              onClick={() => setStartingRotation(rotation === 1 ? 6 : (rotation - 1) as Rotation)}
              className="p-2 rounded-lg bg-card hover:bg-accent active:bg-accent/80 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-base font-bold w-28 text-center">Rotation {rotation}</span>
            <button
              onClick={() => setStartingRotation(rotation === 6 ? 1 : (rotation + 1) as Rotation)}
              className="p-2 rounded-lg bg-card hover:bg-accent active:bg-accent/80 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Visual Court */}
          <div
            ref={courtRef}
            className="relative w-full aspect-[3/4] max-w-sm mx-auto"
          >
            {/* Court background */}
            <div className="absolute inset-0 bg-amber-900/30 rounded-xl border-2 border-amber-700/50">
              {/* Net */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-300/80 rounded-t-xl" />
              {/* Attack line */}
              <div className="absolute top-[33%] left-0 right-0 h-0.5 bg-white/20" />
              {/* Center vertical */}
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10" />
            </div>

            {/* Zone circles */}
            {LINEUP_ROLES.map((role) => {
              const pos = getRolePosition(role)
              const player = lineup[role]
              const roleInfo = ROLE_INFO[role]
              const isSelected = selectedRole === role

              return (
                <button
                  key={role}
                  onClick={() => setSelectedRole(isSelected ? null : role)}
                  className={cn(
                    'absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center rounded-full transition-all touch-manipulation z-10',
                    'w-14 h-14 sm:w-16 sm:h-16',
                    isSelected && 'ring-2 ring-blue-400 ring-offset-2 ring-offset-transparent scale-110',
                    player
                      ? 'border-2 border-solid shadow-lg'
                      : 'border-2 border-dashed',
                    'active:scale-95'
                  )}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    backgroundColor: player ? `${roleInfo.color}30` : `${roleInfo.color}15`,
                    borderColor: roleInfo.color,
                  }}
                >
                  {player ? (
                    <>
                      <span className="text-base sm:text-lg font-bold text-white leading-none">
                        #{player.number}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-zinc-300 truncate max-w-[3rem] leading-tight">
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
            })}

            {/* Libero circle */}
            {(() => {
              const pos = getRolePosition('L')
              const roleInfo = ROLE_INFO.L
              const isSelected = selectedRole === 'L'

              return (
                <button
                  onClick={() => setSelectedRole(isSelected ? null : 'L')}
                  className={cn(
                    'absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center rounded-full transition-all touch-manipulation z-10',
                    'w-14 h-14 sm:w-16 sm:h-16',
                    isSelected && 'ring-2 ring-blue-400 ring-offset-2 ring-offset-transparent scale-110',
                    libero
                      ? 'border-2 border-solid shadow-lg'
                      : 'border-2 border-dashed',
                    'active:scale-95'
                  )}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    backgroundColor: libero ? `${roleInfo.color}30` : `${roleInfo.color}15`,
                    borderColor: roleInfo.color,
                  }}
                >
                  {libero ? (
                    <>
                      <span className="text-base sm:text-lg font-bold text-white leading-none">
                        #{libero.number}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-zinc-300 truncate max-w-[3rem] leading-tight">
                        {libero.name}
                      </span>
                    </>
                  ) : (
                    <span
                      className="text-sm sm:text-base font-bold"
                      style={{ color: roleInfo.color }}
                    >
                      L
                    </span>
                  )}
                </button>
              )
            })()}

            {/* Popover player picker */}
            {selectedRole && !isQuickStart && !isMobile && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setSelectedRole(null)}
                />

                {/* Popover */}
                <div
                  className="absolute z-30 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-2 max-h-[70vh] overflow-y-auto"
                  style={{ ...getPopoverStyle(selectedRole), width: 'max-content', minWidth: '10rem' }}
                >
                  {renderPlayerPicker(selectedRole)}
                </div>
              </>
            )}
          </div>

          {isMobile && !isQuickStart && (
            <Sheet open={Boolean(selectedRole)} onOpenChange={(open) => !open && setSelectedRole(null)}>
              <SheetContent side="bottom" className="max-h-[72dvh] px-4 pt-4 pb-6">
                <SheetHeader className="p-0 pb-2">
                  <SheetTitle>Assign Player</SheetTitle>
                  <SheetDescription>Select a player for this spot</SheetDescription>
                </SheetHeader>
                {selectedRole && renderPlayerPicker(selectedRole)}
              </SheetContent>
            </Sheet>
          )}

          {/* Quick Start Players (if no roster) */}
          {isQuickStart && (
            <div className="mt-4 max-w-sm mx-auto w-full">
              <QuickStartPlayerEntry
                selectedRole={selectedRole}
                onAddPlayer={handlePlayerTap}
              />
            </div>
          )}
        </div>

        {/* Serving + Start */}
        <div className="p-4 border-t border-border space-y-3">
          {/* Who Serves First */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setServingFirst('us'); setServingChosen(true) }}
              className={cn(
                'py-3 rounded-lg font-semibold text-base transition-colors',
                serving === 'us' && servingChosen
                  ? 'bg-green-600 text-white'
                  : 'bg-card text-foreground hover:bg-accent'
              )}
            >
              We Serve
            </button>
            <button
              onClick={() => { setServingFirst('them'); setServingChosen(true) }}
              className={cn(
                'py-3 rounded-lg font-semibold text-base transition-colors',
                serving === 'them' && servingChosen
                  ? 'bg-red-600 text-white'
                  : 'bg-card text-foreground hover:bg-accent'
              )}
            >
              They Serve
            </button>
          </div>

          {/* Start Game — appears once serving is chosen and lineup is complete */}
          {servingChosen && (canStartGame || isQuickStart) && (
            <button
              onClick={startGame}
              className="w-full bg-green-600 hover:bg-green-500 active:bg-green-700 text-white py-4 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Start Game
            </button>
          )}
        </div>
      </div>
    )
  }

  // Lineup step is the final step — no more settings step
  return null
}

// Team card with optional lineup expansion
function TeamCard({
  team,
  isExpanded,
  onTap,
  onSelectLineup,
}: {
  team: Team
  isExpanded: boolean
  onTap: () => void
  onSelectLineup: (lineupId: string) => void
}) {
  const hasMultipleLineups = team.lineups.length >= 2

  return (
    <div className={cn(
      'bg-card border border-border rounded-lg transition-colors overflow-hidden',
      isExpanded && 'ring-1 ring-primary/30'
    )}>
      <button
        onClick={onTap}
        className="w-full px-4 py-4 text-left transition-colors hover:bg-accent active:bg-accent/80 flex items-center justify-between"
      >
        <div>
          <div className="font-medium">{team.name}</div>
          <div className="text-sm text-muted-foreground">
            {team.roster.length} players{hasMultipleLineups ? ` · ${team.lineups.length} lineups` : ''}
          </div>
        </div>
        {hasMultipleLineups ? (
          <ChevronDown className={cn(
            'w-5 h-5 text-muted-foreground transition-transform',
            isExpanded && 'rotate-180'
          )} />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && hasMultipleLineups && (
        <div className="border-t border-border">
          {team.lineups.map((lineup) => {
            const isActive = lineup.id === team.active_lineup_id

            return (
              <button
                key={lineup.id}
                onClick={() => onSelectLineup(lineup.id)}
                className="w-full px-4 py-3 pl-8 text-left transition-colors hover:bg-accent active:bg-accent/80 flex items-center justify-between border-b border-border last:border-b-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm truncate">{lineup.name}</span>
                  {isActive && (
                    <span className="text-[11px] text-primary font-medium shrink-0">(Active)</span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Quick start player entry
function QuickStartPlayerEntry({
  selectedRole,
  onAddPlayer,
}: {
  selectedRole: Role | 'L' | null
  onAddPlayer: (player: RosterPlayer) => void
}) {
  const [number, setNumber] = useState('')
  const [name, setName] = useState('')

  if (!selectedRole) return null

  const handleAdd = () => {
    if (!number) return
    const player: RosterPlayer = {
      id: `quick-${Date.now()}`,
      number: parseInt(number, 10),
      name: name || `Player ${number}`,
    }
    onAddPlayer(player)
    setNumber('')
    setName('')
  }

  return (
    <div className="bg-card/70 border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Add Player</h3>
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="#"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          className="w-16 bg-card border border-border rounded-lg px-3 py-2 text-white text-center"
        />
        <input
          type="text"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-white"
        />
        <button
          onClick={handleAdd}
          disabled={!number}
          className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-white font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}
