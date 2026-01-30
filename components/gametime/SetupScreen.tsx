'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGameTimeStore } from '@/store/useGameTimeStore'
import { getAllTeams } from '@/lib/teams'
import { Team, Role, RosterPlayer, Rotation, ROLE_INFO } from '@/lib/types'
import { getRoleZone } from '@/lib/rotations'
import { PositionSlot, PlayerGrid } from '@/components/team'
import { ChevronLeft, ChevronRight, Users, Zap, Check, X } from 'lucide-react'

// Roles for lineup (no libero)
const LINEUP_ROLES: Role[] = ['S', 'OH1', 'OH2', 'MB1', 'MB2', 'OPP']

// Zone to grid position mapping for front row (zones 4, 3, 2 left to right)
// and back row (zones 5, 6, 1 left to right)
const FRONT_ROW_ZONES = [4, 3, 2]
const BACK_ROW_ZONES = [5, 6, 1]

type SetupStep = 'team' | 'lineup' | 'settings'

export function SetupScreen() {
  const router = useRouter()
  const [step, setStep] = useState<SetupStep>('team')
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [quickStartName, setQuickStartName] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role | 'L' | null>(null)

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

  useEffect(() => {
    async function loadTeams() {
      try {
        const loadedTeams = await getAllTeams()
        setTeams(loadedTeams)
      } catch {
        // Ignore errors - teams just won't load
      } finally {
        setLoading(false)
      }
    }
    loadTeams()
  }, [])

  // Handle team selection
  const handleSelectTeam = (t: Team) => {
    selectTeam(t)
    setStep('lineup')
  }

  const handleQuickStart = () => {
    quickStart(quickStartName || 'My Team')
    setStep('lineup')
  }

  // Handle player assignment
  const handlePlayerTap = (player: RosterPlayer) => {
    if (!selectedRole) return

    if (selectedRole === 'L') {
      assignLibero(player)
    } else {
      assignPlayer(selectedRole, player)
    }
    setSelectedRole(null)
  }

  // Get players available on bench (not in lineup or libero)
  const availablePlayers = bench

  // Check if we can proceed
  const canStartGame = isLineupComplete()

  // Render team selection step
  if (step === 'team') {
    return (
      <div className="flex flex-col min-h-[100dvh] p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="w-10" /> {/* Spacer for centering */}
          <h1 className="text-2xl font-bold text-center">GameTime</h1>
          <button
            onClick={() => router.push('/volleyball')}
            className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Quick Start */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">
            Quick Start
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Team name (optional)"
              value={quickStartName}
              onChange={(e) => setQuickStartName(e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleQuickStart}
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Zap className="w-5 h-5" />
              Go
            </button>
          </div>
        </div>

        {/* Saved Teams */}
        <div className="flex-1">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">
            Saved Teams
          </h2>

          {loading ? (
            <div className="text-zinc-500 text-center py-8">Loading teams...</div>
          ) : teams.length === 0 ? (
            <div className="text-zinc-500 text-center py-8">
              No saved teams yet
            </div>
          ) : (
            <div className="space-y-2">
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTeam(t)}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 border border-zinc-700 rounded-lg px-4 py-4 text-left transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-zinc-400" />
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-sm text-zinc-400">
                        {t.roster.length} players
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-500" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render lineup step
  if (step === 'lineup') {
    return (
      <div className="flex flex-col min-h-[100dvh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <button
            onClick={() => setStep('team')}
            className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-lg font-semibold">{teamName}</h1>
          <div className="w-16" /> {/* Spacer */}
        </div>

        {/* Court Lineup View */}
        <div className="flex-1 p-4">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4 text-center">
            Tap a position, then tap a player
          </h2>

          {/* Court Grid */}
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 mb-4">
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
                    player={lineup[role]}
                    isSelected={selectedRole === role}
                    onSelect={() => setSelectedRole(selectedRole === role ? null : role)}
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
                    player={lineup[role]}
                    isSelected={selectedRole === role}
                    onSelect={() => setSelectedRole(selectedRole === role ? null : role)}
                  />
                )
              })}
            </div>

            {/* Libero */}
            <div className="flex justify-center">
              <div className="w-1/3">
                <PositionSlot
                  role="L"
                  player={libero}
                  isSelected={selectedRole === 'L'}
                  onSelect={() => setSelectedRole(selectedRole === 'L' ? null : 'L')}
                  isLibero
                />
              </div>
            </div>
          </div>

          {/* Available Players */}
          {selectedRole && (
            <PlayerGrid
              players={availablePlayers}
              selectedRole={selectedRole}
              onSelect={handlePlayerTap}
            />
          )}

          {/* Quick Start Players (if no roster) */}
          {isQuickStart && (
            <QuickStartPlayerEntry
              selectedRole={selectedRole}
              onAddPlayer={handlePlayerTap}
            />
          )}
        </div>

        {/* Continue Button */}
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={() => setStep('settings')}
            disabled={!canStartGame && !isQuickStart}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors ${
              canStartGame || isQuickStart
                ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {canStartGame || isQuickStart ? 'Continue' : 'Assign All Positions'}
          </button>
        </div>
      </div>
    )
  }

  // Render settings step
  return (
    <div className="flex flex-col min-h-[100dvh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <button
          onClick={() => setStep('lineup')}
          className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <h1 className="text-lg font-semibold">Game Settings</h1>
        <div className="w-16" />
      </div>

      <div className="flex-1 p-4 space-y-6">
        {/* Starting Rotation */}
        <div>
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">
            Starting Rotation
          </h2>
          <div className="grid grid-cols-6 gap-2">
            {([1, 2, 3, 4, 5, 6] as Rotation[]).map((r) => (
              <button
                key={r}
                onClick={() => setStartingRotation(r)}
                className={`py-4 rounded-lg font-bold text-lg transition-colors ${
                  rotation === r
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Who Serves First */}
        <div>
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">
            Who Serves First?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setServingFirst('us')}
              className={`py-4 rounded-lg font-semibold text-lg transition-colors ${
                serving === 'us'
                  ? 'bg-green-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              We Do
            </button>
            <button
              onClick={() => setServingFirst('them')}
              className={`py-4 rounded-lg font-semibold text-lg transition-colors ${
                serving === 'them'
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              They Do
            </button>
          </div>
        </div>
      </div>

      {/* Start Game Button */}
      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={startGame}
          className="w-full bg-green-600 hover:bg-green-500 active:bg-green-700 text-white py-5 rounded-xl font-bold text-xl transition-colors flex items-center justify-center gap-2"
        >
          <Check className="w-6 h-6" />
          Start Game
        </button>
      </div>
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
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
      <h3 className="text-sm font-medium text-zinc-400 mb-3">Add Player</h3>
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="#"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          className="w-16 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-center"
        />
        <input
          type="text"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white"
        />
        <button
          onClick={handleAdd}
          disabled={!number}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}
