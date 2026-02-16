// Core Types for 5-1 Volleyball Rotation App

export type Role = 'S' | 'OH1' | 'OH2' | 'MB1' | 'MB2' | 'OPP' | 'L'

// Rally phases for the whiteboard
export type RallyPhase =
  | 'PRE_SERVE'
  | 'SERVE_IN_AIR'
  | 'SERVE_RECEIVE'
  | 'TRANSITION_TO_OFFENSE'
  | 'SET_PHASE'
  | 'ATTACK_PHASE'
  | 'TRANSITION_TO_DEFENSE'
  | 'DEFENSE_PHASE'
  | 'BALL_DEAD'

/**
 * @deprecated Use RallyPhase instead. Legacy phase strings kept for backward compatibility.
 * The old 4-phase model ('serve', 'defense', 'attack', 'receive') has been replaced
 * by the more granular 9-phase RallyPhase system.
 */
export type LegacyPhase = 'serve' | 'defense' | 'attack' | 'receive'

/**
 * Phase type - can be either RallyPhase or LegacyPhase.
 * Prefer using RallyPhase directly in new code.
 */
export type Phase = RallyPhase | LegacyPhase

/**
 * Type guard to check if a phase is a RallyPhase (not a legacy phase)
 */
export function isRallyPhase(phase: Phase): phase is RallyPhase {
  return [
    'PRE_SERVE',
    'SERVE_IN_AIR',
    'SERVE_RECEIVE',
    'TRANSITION_TO_OFFENSE',
    'SET_PHASE',
    'ATTACK_PHASE',
    'TRANSITION_TO_DEFENSE',
    'DEFENSE_PHASE',
    'BALL_DEAD',
  ].includes(phase)
}

export const ROLES: Role[] = ['S', 'OH1', 'OH2', 'MB1', 'MB2', 'OPP', 'L']

/**
 * @deprecated Use RALLY_PHASES instead. Legacy phases kept for backward compatibility.
 */
export const PHASES: LegacyPhase[] = ['serve', 'defense', 'attack', 'receive']
// All rally phases
export const RALLY_PHASES: RallyPhase[] = [
  'PRE_SERVE',
  'SERVE_IN_AIR',
  'SERVE_RECEIVE',
  'TRANSITION_TO_OFFENSE',
  'SET_PHASE',
  'ATTACK_PHASE',
  'TRANSITION_TO_DEFENSE',
  'DEFENSE_PHASE',
  'BALL_DEAD',
]
// Default visible phases (hide intermediate transitions)
export const DEFAULT_VISIBLE_PHASES: RallyPhase[] = [
  'PRE_SERVE',
  'SERVE_RECEIVE',
  'ATTACK_PHASE',
  'DEFENSE_PHASE',
]
// Default order shown in Settings > Whiteboard Phases
export const DEFAULT_PHASE_ORDER: RallyPhase[] = [
  'PRE_SERVE',
  'SERVE_IN_AIR',
  'TRANSITION_TO_DEFENSE',
  'DEFENSE_PHASE',
  'SERVE_RECEIVE',
  'TRANSITION_TO_OFFENSE',
  'SET_PHASE',
  'ATTACK_PHASE',
  'BALL_DEAD',
]
export const ROTATIONS = [1, 2, 3, 4, 5, 6] as const
export type Rotation = typeof ROTATIONS[number]

export const ROLE_PRIORITY: Record<Role, number> = {
  S: 1,
  OPP: 2,
  OH1: 3,
  OH2: 3,
  MB1: 3,
  MB2: 3,
  L: 2, // Libero has high priority (similar to opposite)
}

// Role display information
// Colorblind-friendly oklch color palette optimized for maximum visual distinction
// Colors chosen to be distinguishable for protanopia, deuteranopia, and tritanopia
export const ROLE_INFO: Record<Role, { name: string; color: string; bgColor: string }> = {
  S: { name: 'Setter', color: 'var(--c-setter)', bgColor: 'bg-[var(--c-setter)]' },
  OH1: { name: 'Outside Hitter 1', color: 'var(--c-oh1)', bgColor: 'bg-[var(--c-oh1)]' },
  OH2: { name: 'Outside Hitter 2', color: 'var(--c-oh2)', bgColor: 'bg-[var(--c-oh2)]' },
  MB1: { name: 'Middle Blocker 1', color: 'var(--c-mb1)', bgColor: 'bg-[var(--c-mb1)]' },
  MB2: { name: 'Middle Blocker 2', color: 'var(--c-mb2)', bgColor: 'bg-[var(--c-mb2)]' },
  OPP: { name: 'Opposite', color: 'var(--c-opp)', bgColor: 'bg-[var(--c-opp)]' },
  L: { name: 'Libero', color: 'var(--c-libero)', bgColor: 'bg-[var(--c-libero)]' },
}

/**
 * @deprecated Use RALLY_PHASE_INFO instead.
 * Legacy phase display information kept for backward compatibility.
 */
export const PHASE_INFO: Record<string, { name: string; description: string; isIntermediate?: boolean }> = {
  serve: { name: 'Serve', description: 'Your team is serving' },
  receive: { name: 'Receive', description: 'Receiving opponent\'s serve' },
  attack: { name: 'Attack', description: 'Your team is setting up to score' },
  defense: { name: 'Defense', description: 'Opponent is attacking' },
}

// Rally phase display information
export const RALLY_PHASE_INFO: Record<RallyPhase, { name: string; description: string; isIntermediate: boolean }> = {
  'PRE_SERVE': {
    name: 'Pre-Serve',
    description: 'Players align in legal formation before serve',
    isIntermediate: false,
  },
  'SERVE_IN_AIR': {
    name: 'Serve in Air',
    description: 'Ball is in the air after serve contact',
    isIntermediate: true,
  },
  'SERVE_RECEIVE': {
    name: 'Serve Receive',
    description: 'Receiving team prepares to pass the serve',
    isIntermediate: false,
  },
  'TRANSITION_TO_OFFENSE': {
    name: 'Transition to Offense',
    description: 'Team transitions from pass to set',
    isIntermediate: true,
  },
  'SET_PHASE': {
    name: 'Set Phase',
    description: 'Setter delivers the ball to attackers',
    isIntermediate: false,
  },
  'ATTACK_PHASE': {
    name: 'Attack Phase',
    description: 'Attackers approach and hit the ball',
    isIntermediate: false,
  },
  'TRANSITION_TO_DEFENSE': {
    name: 'Transition to Defense',
    description: 'Team transitions from attack to defensive positions',
    isIntermediate: true,
  },
  'DEFENSE_PHASE': {
    name: 'Defense Phase',
    description: 'Team defends against opponent attack',
    isIntermediate: false,
  },
  'BALL_DEAD': {
    name: 'Ball Dead',
    description: 'Rally has ended',
    isIntermediate: true,
  },
}

// Position on court (x, y as normalized coordinates 0-1)
export interface Position {
  x: number
  y: number
}

// Positions for all roles in a rotation/phase
export interface PositionCoordinates {
  S: Position
  OH1: Position
  OH2: Position
  MB1: Position
  MB2: Position
  OPP: Position
  L?: Position // Optional since libero can be disabled
}

// Arrow destinations for each role (optional per role)
// null means arrow was explicitly deleted (overrides auto-generated)
export type ArrowPositions = Partial<Record<Role, Position | null>>

// Roster player
export interface RosterPlayer {
  id: string
  name?: string
  number?: number
}

// Position assignments (which player plays which role)
export interface PositionAssignments {
  [role: string]: string | undefined // role -> player id
}

// Position source options for a lineup
// 'custom' uses the team's custom_layouts (editable)
// Preset values use the rotation_presets table (read-only)
export type PositionSource = 'custom' | 'full-5-1' | '5-1-libero' | '6-2'

export const POSITION_SOURCES: PositionSource[] = ['custom', 'full-5-1', '5-1-libero', '6-2']

export const POSITION_SOURCE_INFO: Record<PositionSource, { name: string; description: string; isPreset: boolean }> = {
  'custom': {
    name: 'Custom',
    description: 'Your team\'s custom positions (editable)',
    isPreset: false,
  },
  'full-5-1': {
    name: '5-1 Default',
    description: 'Standard 5-1 positions',
    isPreset: true,
  },
  '5-1-libero': {
    name: '5-1 with Libero',
    description: '5-1 positions with libero',
    isPreset: true,
  },
  '6-2': {
    name: '6-2 Default',
    description: 'Standard 6-2 positions',
    isPreset: true,
  },
}

// A named lineup - a saved configuration of position assignments
export interface Lineup {
  id: string
  name: string
  position_assignments: PositionAssignments
  position_source?: PositionSource // Which position source to use (default: 'custom')
  starting_rotation?: Rotation // Setter starting zone for this lineup (defaults to 1)
  created_at: string
}

// Team data structure
export interface Team {
  id: string
  _id?: string // Convex document ID (optional for backward compatibility)
  name: string
  slug: string
  hasPassword?: boolean // Whether team has a password set (password itself is never sent to client)
  archived?: boolean
  roster: RosterPlayer[]
  lineups: Lineup[]
  active_lineup_id: string | null
  /** @deprecated Use lineups array and active_lineup_id instead */
  position_assignments: PositionAssignments
  created_at?: string
  updated_at?: string
}

// Custom layout for a specific rotation/phase
export interface CustomLayout {
  id: string
  _id?: string // Convex document ID (optional for backward compatibility)
  team_id: string
  teamId?: string // Convex field name
  rotation: Rotation
  phase: Phase // Can be legacy phase or RallyPhase
  positions: PositionCoordinates // Normalized coordinates (0-1)
  flags?: LayoutExtendedData | null // Extended data (arrows, status tags, etc.)
  created_at?: string
  updated_at?: string | null // Used for conflict detection
}

// Court zones (1-6) for volleyball in normalized coordinates (0-1)
export const COURT_ZONES = {
  // Back row (zones 1, 5, 6) - Adjusted for 18m x 9m court (y: 0.5-1.0 is home side)
  // Center of back zone (between 12m and 18m) is 15m -> 15/18 = 0.8333
  1: { x: 0.8333, y: 0.8333 }, // Back right
  6: { x: 0.5000, y: 0.8333 }, // Back center
  5: { x: 0.1667, y: 0.8333 }, // Back left
  // Front row (zones 2, 3, 4)
  // Center of front zone (between 9m and 12m) is 10.5m -> 10.5/18 = 0.5833
  2: { x: 0.8333, y: 0.5833 }, // Front right
  3: { x: 0.5000, y: 0.5833 }, // Front center
  4: { x: 0.1667, y: 0.5833 }, // Front left
} as const

// Player status flags for indicating role/state in a phase
export type PlayerStatus =
  | 'passer'  // Primary passing position
  | 'quick'   // Middle ready for quick/1-ball
  | 'swing'   // Outside/opposite attacking
  | 'pipe'    // Back row attack
  | 'here1'   // Hitting from current (unusual) spot for first ball
  | 'block'   // Blocking assignment
  | 'tips'    // Covering short balls/tips

export type PlayerStatusCategory = 'attack' | 'defense' | 'receive'

export interface PlayerStatusInfo {
  label: string
  color: string  // oklch color
  category: PlayerStatusCategory
}

export const PLAYER_STATUS_INFO: Record<PlayerStatus, PlayerStatusInfo> = {
  passer: { label: 'Passer', color: 'oklch(0.55 0.18 250)', category: 'receive' },  // Blue
  quick: { label: 'Quick', color: 'oklch(0.7 0.18 70)', category: 'attack' },       // Orange
  swing: { label: 'Swing', color: 'oklch(0.6 0.2 25)', category: 'attack' },        // Red
  pipe: { label: 'Pipe', color: 'oklch(0.75 0.15 90)', category: 'attack' },        // Yellow
  here1: { label: 'Here for 1', color: 'oklch(0.65 0.2 320)', category: 'attack' }, // Magenta/Pink
  block: { label: 'Block', color: 'oklch(0.6 0.15 190)', category: 'defense' },     // Teal
  tips: { label: 'Tips', color: 'oklch(0.6 0.18 150)', category: 'defense' },       // Green
}

export const PLAYER_STATUSES: PlayerStatus[] = ['passer', 'quick', 'swing', 'pipe', 'here1', 'block', 'tips']

// Arrow curve configuration - stores the control point for the Bezier curve
export interface ArrowCurveConfig {
  x: number  // Control point X in normalized coordinates (0-1)
  y: number  // Control point Y in normalized coordinates (0-1)
}

// Token tags for radial menu system
export type TokenTag = 'Blocker' | 'Target' | 'Decoy' | 'Server'

export const TOKEN_TAGS: TokenTag[] = ['Blocker', 'Target', 'Decoy', 'Server']

// Extended data stored in the `flags` JSONB column of custom_layouts
// This stores arrows, status tags, arrow curves, and attack ball position per layout
export interface LayoutExtendedData {
  arrows?: ArrowPositions                          // Arrow destinations per role
  arrowFlips?: Partial<Record<Role, boolean>>      // Which arrows have flipped curves
  arrowCurves?: Partial<Record<Role, ArrowCurveConfig>> // Arrow curve direction and intensity
  statusFlags?: Partial<Record<Role, PlayerStatus[]>> // Player status badges (multiple per player)
  attackBallPosition?: Position | null              // Attack ball position for defense phase
  tagFlags?: Partial<Record<Role, TokenTag[]>>     // Token tags (multiple per player)
}
