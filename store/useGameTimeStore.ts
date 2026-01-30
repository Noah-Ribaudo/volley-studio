'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Role, Rotation, RosterPlayer, Team, ROLES } from '@/lib/types'
import { getBackRowMiddle } from '@/lib/rotations'
import {
  GamePhase,
  ServingTeam,
  Lineup,
  RallyEvent,
  Reminder,
  ReminderType,
  Timeouts,
  GameSnapshot,
  QuickStartPlayer,
} from '@/lib/gametime/types'

// Default timeouts per set (standard volleyball rules)
const DEFAULT_TIMEOUTS = 2

// Roles that can be in lineup (excludes libero)
const LINEUP_ROLES: Role[] = ['S', 'OH1', 'OH2', 'MB1', 'MB2', 'OPP']

interface GameTimeState {
  // Game phase
  phase: GamePhase

  // Team info
  team: Team | null
  teamName: string
  isQuickStart: boolean

  // Lineup
  lineup: Lineup
  libero: RosterPlayer | null
  bench: RosterPlayer[]

  // Game state
  rotation: Rotation
  ourScore: number
  theirScore: number
  serving: ServingTeam

  // Tracking
  timeouts: Timeouts
  liberoOnCourt: boolean
  liberoReplacedRole: Role | null

  // History
  rallyHistory: RallyEvent[]
  reminders: Reminder[]

  // Undo stack
  undoStack: GameSnapshot[]

  // Actions - Setup
  selectTeam: (team: Team) => void
  quickStart: (teamName: string) => void
  assignPlayer: (role: Role, player: RosterPlayer) => void
  assignLibero: (player: RosterPlayer | null) => void
  setStartingRotation: (rotation: Rotation) => void
  setServingFirst: (serving: ServingTeam) => void
  startGame: () => void

  // Actions - Game
  weScored: () => void
  theyScored: () => void
  undoLastPoint: () => void
  callTimeout: (team: ServingTeam) => void

  // Actions - Substitutions
  substitutePlayer: (roleOnCourt: Role, playerFromBench: RosterPlayer) => void

  // Actions - Reminders
  dismissReminder: (id: string) => void
  clearReminders: () => void

  // Actions - Navigation
  resetGame: () => void
  endGame: () => void

  // Computed helpers
  getPlayerInRole: (role: Role) => RosterPlayer | null
  isLineupComplete: () => boolean
}

// Advance rotation clockwise (when we win serve back)
function advanceRotation(rotation: Rotation): Rotation {
  return rotation === 6 ? 1 : ((rotation + 1) as Rotation)
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Create a reminder
function createReminder(type: ReminderType, message: string): Reminder {
  return {
    id: generateId(),
    type,
    message,
    timestamp: Date.now(),
    dismissed: false,
  }
}

// Create game snapshot for undo
function createSnapshot(state: GameTimeState): GameSnapshot {
  return {
    rotation: state.rotation,
    ourScore: state.ourScore,
    theirScore: state.theirScore,
    serving: state.serving,
    liberoOnCourt: state.liberoOnCourt,
    liberoReplacedRole: state.liberoReplacedRole,
    timeouts: { ...state.timeouts },
  }
}

export const useGameTimeStore = create<GameTimeState>()(
  persist(
    (set, get) => ({
      // Initial state
      phase: 'setup',
      team: null,
      teamName: '',
      isQuickStart: false,
      lineup: {},
      libero: null,
      bench: [],
      rotation: 1,
      ourScore: 0,
      theirScore: 0,
      serving: 'us',
      timeouts: { us: DEFAULT_TIMEOUTS, them: DEFAULT_TIMEOUTS },
      liberoOnCourt: false,
      liberoReplacedRole: null,
      rallyHistory: [],
      reminders: [],
      undoStack: [],

      // Setup actions
      selectTeam: (team: Team) => {
        // Load roster into bench, clear lineup
        set({
          team,
          teamName: team.name,
          isQuickStart: false,
          lineup: {},
          libero: null,
          bench: [...team.roster],
        })
      },

      quickStart: (teamName: string) => {
        set({
          team: null,
          teamName: teamName || 'My Team',
          isQuickStart: true,
          lineup: {},
          libero: null,
          bench: [],
        })
      },

      assignPlayer: (role: Role, player: RosterPlayer) => {
        const state = get()

        // Remove player from bench
        const newBench = state.bench.filter((p) => p.id !== player.id)

        // If someone was already in this role, put them back on bench
        const previousPlayer = state.lineup[role]
        if (previousPlayer) {
          newBench.push(previousPlayer)
        }

        // If player was libero, clear libero
        const newLibero = state.libero?.id === player.id ? null : state.libero

        set({
          lineup: { ...state.lineup, [role]: player },
          bench: newBench,
          libero: newLibero,
        })
      },

      assignLibero: (player: RosterPlayer | null) => {
        const state = get()

        if (player === null) {
          // Remove libero, put back on bench
          if (state.libero) {
            set({
              libero: null,
              bench: [...state.bench, state.libero],
            })
          }
          return
        }

        // Remove player from bench
        const newBench = state.bench.filter((p) => p.id !== player.id)

        // If there was a previous libero, put them back on bench
        if (state.libero) {
          newBench.push(state.libero)
        }

        // Remove player from lineup if they were assigned
        const newLineup = { ...state.lineup }
        for (const role of LINEUP_ROLES) {
          if (newLineup[role]?.id === player.id) {
            delete newLineup[role]
          }
        }

        set({
          libero: player,
          bench: newBench,
          lineup: newLineup,
        })
      },

      setStartingRotation: (rotation: Rotation) => {
        set({ rotation })
      },

      setServingFirst: (serving: ServingTeam) => {
        set({ serving })
      },

      startGame: () => {
        const state = get()

        // Check if libero should start on court
        const backRowMB = getBackRowMiddle(state.rotation)
        const hasLibero = state.libero !== null

        const reminders: Reminder[] = []

        if (hasLibero && backRowMB) {
          reminders.push(
            createReminder(
              'libero_in',
              `Libero in for #${state.lineup[backRowMB]?.number || backRowMB}`
            )
          )
        }

        set({
          phase: 'playing',
          ourScore: 0,
          theirScore: 0,
          timeouts: { us: DEFAULT_TIMEOUTS, them: DEFAULT_TIMEOUTS },
          liberoOnCourt: hasLibero && backRowMB !== null,
          liberoReplacedRole: hasLibero ? backRowMB : null,
          rallyHistory: [],
          reminders,
          undoStack: [],
        })
      },

      // Game actions
      weScored: () => {
        const state = get()
        if (state.phase !== 'playing') return

        // Save snapshot for undo
        const snapshot = createSnapshot(state)

        const newReminders: Reminder[] = []
        let newRotation = state.rotation
        let newServing = state.serving
        let newLiberoOnCourt = state.liberoOnCourt
        let newLiberoReplacedRole = state.liberoReplacedRole

        if (state.serving === 'us') {
          // We were serving and scored - no rotation change
        } else {
          // We won serve back - ROTATE then score
          newRotation = advanceRotation(state.rotation)
          newServing = 'us'

          // Check libero swap after rotation
          if (state.libero) {
            const prevBackRowMB = getBackRowMiddle(state.rotation)
            const newBackRowMB = getBackRowMiddle(newRotation)

            if (prevBackRowMB !== newBackRowMB) {
              // MB changed - need to swap libero
              if (newBackRowMB) {
                newLiberoOnCourt = true
                newLiberoReplacedRole = newBackRowMB
                const mbPlayer = state.lineup[newBackRowMB]
                newReminders.push(
                  createReminder(
                    'libero_in',
                    `Libero in for #${mbPlayer?.number || newBackRowMB}`
                  )
                )
              } else {
                newLiberoOnCourt = false
                newLiberoReplacedRole = null
                newReminders.push(
                  createReminder('libero_out', 'Libero out')
                )
              }
            }
          }

          // Rotation indicator is now static in the status bar - no toast needed
        }

        const rallyEvent: RallyEvent = {
          id: generateId(),
          pointNumber: state.ourScore + state.theirScore + 1,
          winner: 'us',
          rotation: state.rotation,
          serving: state.serving,
          ourScore: state.ourScore + 1,
          theirScore: state.theirScore,
          timestamp: Date.now(),
        }

        set({
          ourScore: state.ourScore + 1,
          rotation: newRotation,
          serving: newServing,
          liberoOnCourt: newLiberoOnCourt,
          liberoReplacedRole: newLiberoReplacedRole,
          rallyHistory: [...state.rallyHistory, rallyEvent],
          reminders: [...state.reminders.filter(r => !r.dismissed), ...newReminders],
          undoStack: [...state.undoStack, snapshot],
        })
      },

      theyScored: () => {
        const state = get()
        if (state.phase !== 'playing') return

        // Save snapshot for undo
        const snapshot = createSnapshot(state)

        let newServing = state.serving
        const newReminders: Reminder[] = []

        if (state.serving === 'them') {
          // They were serving and scored - no rotation change
        } else {
          // They won serve - side-out (we don't rotate, just lose serve)
          newServing = 'them'
        }

        const rallyEvent: RallyEvent = {
          id: generateId(),
          pointNumber: state.ourScore + state.theirScore + 1,
          winner: 'them',
          rotation: state.rotation,
          serving: state.serving,
          ourScore: state.ourScore,
          theirScore: state.theirScore + 1,
          timestamp: Date.now(),
        }

        set({
          theirScore: state.theirScore + 1,
          serving: newServing,
          rallyHistory: [...state.rallyHistory, rallyEvent],
          reminders: [...state.reminders.filter(r => !r.dismissed), ...newReminders],
          undoStack: [...state.undoStack, snapshot],
        })
      },

      undoLastPoint: () => {
        const state = get()
        if (state.undoStack.length === 0) return

        const snapshot = state.undoStack[state.undoStack.length - 1]

        set({
          rotation: snapshot.rotation,
          ourScore: snapshot.ourScore,
          theirScore: snapshot.theirScore,
          serving: snapshot.serving,
          liberoOnCourt: snapshot.liberoOnCourt,
          liberoReplacedRole: snapshot.liberoReplacedRole,
          timeouts: snapshot.timeouts,
          rallyHistory: state.rallyHistory.slice(0, -1),
          undoStack: state.undoStack.slice(0, -1),
          reminders: [], // Clear reminders on undo
        })
      },

      callTimeout: (team: ServingTeam) => {
        const state = get()
        const currentTimeouts = state.timeouts[team]
        if (currentTimeouts <= 0) return

        const newTimeouts = {
          ...state.timeouts,
          [team]: currentTimeouts - 1,
        }

        const newReminders: Reminder[] = []
        if (newTimeouts[team] === 1) {
          newReminders.push(
            createReminder('timeout_low', `Last timeout for ${team === 'us' ? 'us' : 'them'}!`)
          )
        }

        set({
          timeouts: newTimeouts,
          reminders: [...state.reminders.filter(r => !r.dismissed), ...newReminders],
        })
      },

      // Substitution
      substitutePlayer: (roleOnCourt: Role, playerFromBench: RosterPlayer) => {
        const state = get()

        const playerOnCourt = state.lineup[roleOnCourt]
        if (!playerOnCourt) return

        // Swap players
        const newBench = state.bench.filter((p) => p.id !== playerFromBench.id)
        newBench.push(playerOnCourt)

        set({
          lineup: { ...state.lineup, [roleOnCourt]: playerFromBench },
          bench: newBench,
        })
      },

      // Reminders
      dismissReminder: (id: string) => {
        const state = get()
        set({
          reminders: state.reminders.map((r) =>
            r.id === id ? { ...r, dismissed: true } : r
          ),
        })
      },

      clearReminders: () => {
        set({ reminders: [] })
      },

      // Navigation
      resetGame: () => {
        set({
          phase: 'setup',
          team: null,
          teamName: '',
          isQuickStart: false,
          lineup: {},
          libero: null,
          bench: [],
          rotation: 1,
          ourScore: 0,
          theirScore: 0,
          serving: 'us',
          timeouts: { us: DEFAULT_TIMEOUTS, them: DEFAULT_TIMEOUTS },
          liberoOnCourt: false,
          liberoReplacedRole: null,
          rallyHistory: [],
          reminders: [],
          undoStack: [],
        })
      },

      endGame: () => {
        set({
          phase: 'finished',
        })
      },

      // Helpers
      getPlayerInRole: (role: Role) => {
        const state = get()
        if (role === 'L') return state.libero
        return state.lineup[role] || null
      },

      isLineupComplete: () => {
        const state = get()
        return LINEUP_ROLES.every((role) => state.lineup[role] !== undefined)
      },
    }),
    {
      name: 'gametime-storage',
      partialize: (state) => ({
        // Only persist game state, not team data
        phase: state.phase,
        teamName: state.teamName,
        isQuickStart: state.isQuickStart,
        lineup: state.lineup,
        libero: state.libero,
        bench: state.bench,
        rotation: state.rotation,
        ourScore: state.ourScore,
        theirScore: state.theirScore,
        serving: state.serving,
        timeouts: state.timeouts,
        liberoOnCourt: state.liberoOnCourt,
        liberoReplacedRole: state.liberoReplacedRole,
        rallyHistory: state.rallyHistory,
        // Don't persist reminders or undo stack
      }),
    }
  )
)
