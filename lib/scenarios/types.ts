import type { Rotation, Phase, Role, Position } from '@/lib/types'

/**
 * Difficulty level for scenarios
 */
export type ScenarioDifficulty = 'beginner' | 'intermediate' | 'advanced'

/**
 * Categories for organizing scenarios
 */
export type ScenarioCategory =
  | 'serve-receive'
  | 'transition'
  | 'defense'
  | 'blocking'
  | 'setting'
  | 'overlap-rules'
  | 'rotation-specific'
  | 'game-situation'

/**
 * A scenario represents a specific game situation to study
 */
export interface Scenario {
  /** Unique identifier */
  id: string

  /** Display title */
  title: string

  /** Short description of the situation */
  description: string

  /** Category for filtering */
  category: ScenarioCategory

  /** Difficulty level */
  difficulty: ScenarioDifficulty

  /** Tags for search/filtering */
  tags: string[]

  // === Court state ===

  /** Rotation to set */
  rotation: Rotation

  /** Phase to show */
  phase: Phase

  /** Whether we're receiving or serving */
  isReceiving: boolean

  /** Optional: custom player positions (overrides defaults) */
  customPositions?: Partial<Record<Role, Position>>

  /** Optional: custom away team positions */
  customAwayPositions?: Partial<Record<Role, Position>>

  /** Optional: role to highlight */
  highlightRole?: Role

  // === Educational content ===

  /** What to focus on in this scenario */
  focusPoints: string[]

  /** Common mistakes to avoid */
  commonMistakes?: string[]

  /** Tips for coaches */
  coachingTips?: string[]
}

/**
 * A collection of related scenarios
 */
export interface ScenarioCollection {
  /** Unique identifier */
  id: string

  /** Display title */
  title: string

  /** Description of what this collection covers */
  description: string

  /** Scenarios in this collection */
  scenarios: Scenario[]
}
