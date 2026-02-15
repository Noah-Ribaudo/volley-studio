'use client'

import { useState, useEffect } from 'react'
import { useGameTimeStore } from '@/store/useGameTimeStore'
import { Role, ROLE_INFO, Rotation, RosterPlayer } from '@/lib/types'
import { getRoleZone, isInFrontRow } from '@/lib/rotations'
import {
  Undo2,
  Timer,
  Users,
  X,
  RotateCcw,
  History,
  BarChart3,
  Map,
  Minimize2,
  Maximize2,
} from 'lucide-react'
import { RotationOverlay } from './RotationOverlay'
import { StatsPanel } from './StatsPanel'
import { TimeoutChecklist } from './TimeoutChecklist'

// Roles in lineup (no libero - libero is handled separately)
const LINEUP_ROLES: Role[] = ['S', 'OH1', 'OH2', 'MB1', 'MB2', 'OPP']

export function GameScreen() {
  const [showSubs, setShowSubs] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showRotation, setShowRotation] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showTimeoutChecklist, setShowTimeoutChecklist] = useState(false)

  const {
    teamName,
    lineup,
    libero,
    bench,
    rotation,
    ourScore,
    theirScore,
    serving,
    timeouts,
    liberoOnCourt,
    liberoReplacedRole,
    rallyHistory,
    reminders,
    undoStack,
    isFullscreen,
    weScored,
    theyScored,
    undoLastPoint,
    callTimeout,
    substitutePlayer,
    dismissReminder,
    setFullscreen,
    resetGame,
    phase: _phase,
  } = useGameTimeStore()

  // Prevent zoom on mobile when fullscreen (restore when leaving)
  useEffect(() => {
    if (!isFullscreen) return

    const meta = document.querySelector('meta[name="viewport"]')
    const original = meta?.getAttribute('content') || ''
    meta?.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
    )
    return () => {
      meta?.setAttribute('content', original)
    }
  }, [isFullscreen])

  // Get active reminders (not dismissed)
  const activeReminders = reminders.filter((r) => !r.dismissed)

  // Handle restart
  const handleNewGame = () => {
    if (ourScore === 0 && theirScore === 0) {
      resetGame()
    } else if (window.confirm('Start a new game? Current progress will be lost.')) {
      resetGame()
    }
  }

  return (
    <div className={`flex flex-col overflow-hidden ${isFullscreen ? 'h-[100dvh]' : 'flex-1'}`}>
      {/* Top Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          {/* Fullscreen toggle */}
          <button
            onClick={() => setFullscreen(!isFullscreen)}
            className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-lg transition-colors"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {/* Rotation Badge - clickable to view positions */}
          <button
            onClick={() => setShowRotation(true)}
            className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded-full text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            <Map className="w-3.5 h-3.5" />
            R{rotation}
          </button>
          {/* Serve Indicator */}
          {serving === 'us' && (
            <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              Serving
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Timeouts - opens checklist */}
          <button
            onClick={() => {
              callTimeout('us')
              setShowTimeoutChecklist(true)
            }}
            disabled={timeouts.us === 0}
            className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-3 py-1.5 rounded-lg text-sm transition-colors"
          >
            <Timer className="w-4 h-4" />
            {timeouts.us}
          </button>

          {/* Restart */}
          <button
            onClick={handleNewGame}
            className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-lg transition-colors"
            aria-label="New game"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Score Display - Compact */}
      <div className="bg-zinc-900 px-4 py-3 shrink-0">
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="text-5xl font-black tabular-nums">{ourScore}</div>
            <div className="text-xs text-zinc-400 truncate max-w-[80px]">
              {teamName || 'US'}
            </div>
          </div>
          <div className="text-2xl font-light text-zinc-600">-</div>
          <div className="text-center">
            <div className="text-5xl font-black tabular-nums text-zinc-400">
              {theirScore}
            </div>
            <div className="text-xs text-zinc-500">THEM</div>
          </div>
        </div>
      </div>

      {/* Court Diagram - Compact */}
      <div className="flex-1 px-3 py-2 min-h-0">
        <CourtDiagram
          rotation={rotation}
          lineup={lineup}
          libero={libero}
          liberoOnCourt={liberoOnCourt}
          liberoReplacedRole={liberoReplacedRole}
        />
      </div>

      {/* Smart Reminder Banner */}
      {activeReminders.length > 0 && (
        <div className="px-4 pb-2">
          {activeReminders.slice(0, 1).map((reminder) => (
            <div
              key={reminder.id}
              className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                reminder.type === 'libero_in' || reminder.type === 'libero_out'
                  ? 'bg-green-900/50 border border-green-700'
                  : reminder.type === 'rotation_change'
                  ? 'bg-blue-900/50 border border-blue-700'
                  : 'bg-amber-900/50 border border-amber-700'
              }`}
            >
              <span className="font-medium">{reminder.message}</span>
              <button
                onClick={() => dismissReminder(reminder.id)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Score Buttons */}
      <div className="px-3 pb-2 space-y-2 shrink-0">
        <button
          onClick={weScored}
          aria-label="We scored - add point to our team"
          className="w-full bg-green-600 hover:bg-green-500 active:bg-green-700 text-white py-4 rounded-xl font-bold text-lg transition-colors active:scale-[0.98]"
        >
          WE SCORED
        </button>
        <button
          onClick={theyScored}
          aria-label="They scored - add point to opposing team"
          className="w-full bg-red-600 hover:bg-red-500 active:bg-red-700 text-white py-4 rounded-xl font-bold text-lg transition-colors active:scale-[0.98]"
        >
          THEY SCORED
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-around px-4 pb-4 pt-1 shrink-0">
        <button
          onClick={() => setShowSubs(true)}
          className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors"
        >
          <Users className="w-6 h-6" />
          <span className="text-xs">Subs</span>
        </button>

        <button
          onClick={undoLastPoint}
          disabled={undoStack.length === 0}
          className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
        >
          <Undo2 className="w-6 h-6" />
          <span className="text-xs">Undo</span>
        </button>

        <button
          onClick={() => setShowStats(true)}
          className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors"
        >
          <BarChart3 className="w-6 h-6" />
          <span className="text-xs">Stats</span>
        </button>

        <button
          onClick={() => setShowHistory(true)}
          className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors"
        >
          <History className="w-6 h-6" />
          <span className="text-xs">History</span>
        </button>
      </div>

      {/* Subs Panel */}
      {showSubs && (
        <SubsPanel
          lineup={lineup}
          bench={bench}
          onSub={substitutePlayer}
          onClose={() => setShowSubs(false)}
        />
      )}

      {/* History Panel */}
      {showHistory && (
        <HistoryPanel
          history={rallyHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Rotation Overlay */}
      {showRotation && (
        <RotationOverlay
          rotation={rotation as Rotation}
          isReceiving={serving !== 'us'}
          onClose={() => setShowRotation(false)}
        />
      )}

      {/* Stats Panel */}
      {showStats && (
        <StatsPanel
          history={rallyHistory}
          currentRotation={rotation as Rotation}
          onClose={() => setShowStats(false)}
        />
      )}

      {/* Timeout Checklist */}
      {showTimeoutChecklist && (
        <TimeoutChecklist
          rotation={rotation as Rotation}
          ourScore={ourScore}
          theirScore={theirScore}
          serving={serving}
          onClose={() => setShowTimeoutChecklist(false)}
        />
      )}
    </div>
  )
}

// Court diagram component
function CourtDiagram({
  rotation,
  lineup,
  libero,
  liberoOnCourt,
  liberoReplacedRole,
}: {
  rotation: number
  lineup: Partial<Record<Role, RosterPlayer>>
  libero: RosterPlayer | null
  liberoOnCourt: boolean
  liberoReplacedRole: Role | null
}) {
  // Get roles sorted by zone for display
  const frontRow = LINEUP_ROLES.filter((r) => isInFrontRow(rotation as 1|2|3|4|5|6, r))
  const backRow = LINEUP_ROLES.filter((r) => !isInFrontRow(rotation as 1|2|3|4|5|6, r))

  // Sort by zone (left to right: 4, 3, 2 for front; 5, 6, 1 for back)
  const sortByZone = (roles: Role[], frontRowOrder: number[]) => {
    return roles.sort((a, b) => {
      const zoneA = getRoleZone(rotation as 1|2|3|4|5|6, a)
      const zoneB = getRoleZone(rotation as 1|2|3|4|5|6, b)
      return frontRowOrder.indexOf(zoneA) - frontRowOrder.indexOf(zoneB)
    })
  }

  const sortedFrontRow = sortByZone([...frontRow], [4, 3, 2])
  const sortedBackRow = sortByZone([...backRow], [5, 6, 1])

  const getDisplayPlayer = (role: Role) => {
    // If libero is on court and this is the replaced role, show libero
    if (liberoOnCourt && role === liberoReplacedRole && libero) {
      return { player: libero, isLibero: true }
    }
    return { player: lineup[role], isLibero: false }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 h-full flex flex-col">
      {/* Net */}
      <div className="h-1 bg-zinc-600 rounded mb-2 shrink-0" />

      {/* Front Row */}
      <div className="grid grid-cols-3 gap-2 flex-1 mb-2">
        {sortedFrontRow.map((role) => {
          const { player, isLibero } = getDisplayPlayer(role)
          const zone = getRoleZone(rotation as 1|2|3|4|5|6, role)
          return (
            <PlayerCircle
              key={role}
              role={role}
              zone={zone}
              player={player}
              isLibero={isLibero}
            />
          )
        })}
      </div>

      {/* Back Row */}
      <div className="grid grid-cols-3 gap-2 flex-1">
        {sortedBackRow.map((role) => {
          const { player, isLibero } = getDisplayPlayer(role)
          const zone = getRoleZone(rotation as 1|2|3|4|5|6, role)
          return (
            <PlayerCircle
              key={role}
              role={role}
              zone={zone}
              player={player}
              isLibero={isLibero}
            />
          )
        })}
      </div>
    </div>
  )
}

// Player circle component
function PlayerCircle({
  role,
  zone,
  player,
  isLibero,
}: {
  role: Role
  zone: number
  player?: RosterPlayer | null
  isLibero: boolean
}) {
  const roleInfo = isLibero ? ROLE_INFO.L : ROLE_INFO[role]

  return (
    <div
      className={`rounded-lg flex flex-col items-center justify-center py-2 ${
        isLibero
          ? 'bg-green-900/50 border-2 border-green-600'
          : 'bg-zinc-800 border border-zinc-700'
      }`}
    >
      {player ? (
        <>
          <div className="text-xl font-bold">{player.number != null ? `#${player.number}` : player.name}</div>
          {player.number != null && player.name && (
            <div className="text-[10px] text-zinc-400 truncate max-w-full px-1">
              {player.name}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="text-base font-bold" style={{ color: roleInfo.color }}>
            {role}
          </div>
          <div className="text-[10px] text-zinc-500">Zone {zone}</div>
        </>
      )}
    </div>
  )
}

// Substitution panel
function SubsPanel({
  lineup,
  bench,
  onSub,
  onClose,
}: {
  lineup: Partial<Record<Role, RosterPlayer>>
  bench: RosterPlayer[]
  onSub: (role: Role, player: RosterPlayer) => void
  onClose: () => void
}) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  const handleSub = (player: RosterPlayer) => {
    if (!selectedRole) return
    onSub(selectedRole, player)
    setSelectedRole(null)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
      <div className="w-full bg-zinc-900 rounded-t-2xl max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-zinc-900">
          <h2 className="text-lg font-semibold">Substitutions</h2>
          <button onClick={onClose} className="p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {/* On Court */}
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">
            {selectedRole ? `Replace ${ROLE_INFO[selectedRole]?.name || selectedRole}` : 'On Court'}
          </h3>

          {!selectedRole && (
            <div className="grid grid-cols-3 gap-2 mb-6">
              {LINEUP_ROLES.map((role) => {
                const player = lineup[role]
                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg p-3 text-center transition-colors"
                  >
                    {player ? (
                      <>
                        <div className="text-lg font-bold">{player.number != null ? `#${player.number}` : player.name}</div>
                        {player.number != null && player.name && (
                          <div className="text-xs text-zinc-400 truncate">
                            {player.name}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-zinc-500">{role}</div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Bench */}
          {selectedRole && (
            <>
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">
                Select from Bench
              </h3>
              {bench.length === 0 ? (
                <div className="text-zinc-500 text-center py-4">
                  No players on bench
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {bench.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => handleSub(player)}
                      className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg p-3 text-center transition-colors"
                    >
                      <div className="text-lg font-bold">{player.number != null ? `#${player.number}` : player.name}</div>
                      {player.number != null && player.name && (
                        <div className="text-xs text-zinc-400 truncate">
                          {player.name}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setSelectedRole(null)}
                className="w-full mt-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>

        {!selectedRole && (
          <div className="p-4 pt-0">
            <button
              onClick={onClose}
              className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// History panel
function HistoryPanel({
  history,
  onClose,
}: {
  history: Array<{
    id: string
    pointNumber: number
    winner: 'us' | 'them'
    rotation: number
    serving: 'us' | 'them'
    ourScore: number
    theirScore: number
  }>
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
      <div className="w-full bg-zinc-900 rounded-t-2xl max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-zinc-900">
          <h2 className="text-lg font-semibold">Rally History</h2>
          <button onClick={onClose} className="p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {history.length === 0 ? (
            <div className="text-zinc-500 text-center py-8">
              No rallies yet
            </div>
          ) : (
            <div className="space-y-2">
              {[...history].reverse().map((rally) => (
                <div
                  key={rally.id}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                    rally.winner === 'us'
                      ? 'bg-green-900/30 border border-green-800'
                      : 'bg-red-900/30 border border-red-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500 text-sm">#{rally.pointNumber}</span>
                    <span className="font-medium">
                      {rally.ourScore} - {rally.theirScore}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <span>R{rally.rotation}</span>
                    {rally.serving === 'us' && (
                      <span className="text-green-500">●</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 pt-0">
          <button
            onClick={onClose}
            className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
