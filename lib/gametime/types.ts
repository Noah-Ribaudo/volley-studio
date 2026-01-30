// GameTime Types - Mobile coach assistant for tracking live games

import { Role, Rotation, RosterPlayer, Team } from '../types'

// Game phase
export type GamePhase = 'setup' | 'playing' | 'finished'

// Who's serving
export type ServingTeam = 'us' | 'them'

// Lineup - which player is in each position
export type Lineup = Partial<Record<Role, RosterPlayer>>

// Rally event for history
export interface RallyEvent {
  id: string
  pointNumber: number
  winner: ServingTeam
  rotation: Rotation
  serving: ServingTeam
  ourScore: number
  theirScore: number
  timestamp: number
}

// Reminder types
export type ReminderType =
  | 'libero_in'      // Libero should go in
  | 'libero_out'     // Libero should come out
  | 'position_check' // Check positions before serve
  | 'timeout_low'    // Running low on timeouts
  | 'rotation_change'// Rotation just changed

export interface Reminder {
  id: string
  type: ReminderType
  message: string
  timestamp: number
  dismissed: boolean
}

// Timeout tracking
export interface Timeouts {
  us: number
  them: number
}

// Full game state snapshot (for undo)
export interface GameSnapshot {
  rotation: Rotation
  ourScore: number
  theirScore: number
  serving: ServingTeam
  liberoOnCourt: boolean
  liberoReplacedRole: Role | null
  timeouts: Timeouts
}

// Quick start player (when not using saved team)
export interface QuickStartPlayer {
  id: string
  name: string
  number: number
}
