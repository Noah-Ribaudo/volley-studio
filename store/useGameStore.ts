'use client'

import { create } from 'zustand'
import type { PlaybackMode, Game, Rally, TeamSide } from '@/lib/sim/types'
import type { ContactRecord } from '@/lib/sim/fsm'
import type { PositionCoordinates } from '@/lib/types'
import { createGame, createRally } from '@/lib/sim/types'
import { generateUUID } from '@/lib/utils'

/**
 * Rally end info - captured when rally ends, cleared when user dismisses
 */
export interface RallyEndInfo {
  reason: string
  winner: TeamSide
  lastContact: ContactRecord | null
  possessionChain: ContactRecord[]
  homeScore: number
  awayScore: number
  frozenPositions: PositionCoordinates
  frozenAwayPositions: PositionCoordinates
}

/**
 * Game store - manages game/rally state and playback mode.
 * This state is NOT persisted - it's session-only.
 */
interface GameState {
  // Game & Rally History
  game: Game | null              // Current game with all rallies
  playbackMode: PlaybackMode     // Current playback state
  replayRallyIndex: number | null // Index of rally being replayed (null = live)
  rallyEndInfo: RallyEndInfo | null // Captured when rally ends, cleared on dismiss

  // Actions
  setPlaybackMode: (mode: PlaybackMode) => void
  setRallyEndInfo: (info: RallyEndInfo) => void
  clearRallyEndInfo: () => void

  // Game lifecycle
  startNewGame: () => Game
  startNewRally: () => Rally | null
  endCurrentRally: (winner: TeamSide, reason: string) => void

  // Replay controls
  selectReplayRally: (index: number) => void
  returnToLive: () => void
}

export const useGameStore = create<GameState>()((set, get) => ({
  // Initial values
  game: null,
  playbackMode: 'paused' as PlaybackMode,
  replayRallyIndex: null,
  rallyEndInfo: null,

  // Actions
  setPlaybackMode: (mode) => set({ playbackMode: mode }),
  setRallyEndInfo: (info) => set({ rallyEndInfo: info }),
  clearRallyEndInfo: () => set({ rallyEndInfo: null }),

  // Game lifecycle
  startNewGame: () => {
    const newGame = createGame()
    set({
      game: newGame,
      playbackMode: 'live',
      replayRallyIndex: null,
      rallyEndInfo: null,
    })
    return newGame
  },

  startNewRally: () => {
    const { game } = get()
    if (!game) return null

    const newRally = createRally({
      id: generateUUID(),
      index: game.rallies.length + 1,
      startTick: 0,
      homeRotation: game.homeRotation,
      awayRotation: game.awayRotation,
      serving: game.serving,
    })
    set({
      game: {
        ...game,
        rallies: [...game.rallies, newRally],
        currentRallyIndex: game.rallies.length,
      },
      playbackMode: 'live',
      replayRallyIndex: null,
    })
    return newRally
  },

  endCurrentRally: (winner, reason) => {
    const { game } = get()
    if (!game || game.currentRallyIndex === null) return

    const currentRally = game.rallies[game.currentRallyIndex]
    if (!currentRally) return

    // Update scores
    const homeScore = winner === 'HOME' ? game.homeScore + 1 : game.homeScore
    const awayScore = winner === 'AWAY' ? game.awayScore + 1 : game.awayScore

    // Update the rally with result
    const updatedRally: Rally = {
      ...currentRally,
      winner,
      reason: reason as Rally['reason'],
    }

    const updatedRallies = [...game.rallies]
    updatedRallies[game.currentRallyIndex] = updatedRally

    set({
      game: {
        ...game,
        rallies: updatedRallies,
        homeScore,
        awayScore,
      },
    })
  },

  // Replay controls
  selectReplayRally: (index) => {
    const { game } = get()
    if (!game || index < 0 || index >= game.rallies.length) return

    set({
      replayRallyIndex: index,
      playbackMode: 'replay',
    })
  },

  returnToLive: () => {
    set({
      replayRallyIndex: null,
      playbackMode: 'live',
    })
  },
}))
