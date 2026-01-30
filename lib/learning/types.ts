import type { Rotation, Phase, Role } from '@/lib/types'

/**
 * Position options for the learning panel
 */
export type LearningPanelPosition = 'bottom' | 'side' | 'floating' | 'inline'

/**
 * A quiz question option
 */
export interface QuizOption {
  /** Display text for this option */
  label: string
  /** Whether this is the correct answer */
  correct: boolean
  /** Optional feedback shown when this option is selected */
  feedback?: string
}

/**
 * A single step in a lesson.
 * Each step can control the court state and display content.
 */
export interface LessonStep {
  /** Unique identifier for this step */
  id: string

  /** The main text content to display */
  content: string

  /** Optional subtitle or additional context */
  subtitle?: string

  /**
   * How the user advances past this step:
   * - 'tap': Wait for user to tap/click to continue (default)
   * - 'auto': Auto-advance after a delay
   * - 'role-select': User must select a role to continue
   * - 'quiz': User must answer a quiz question
   * - 'tap-court': User must tap on a specific player on the court
   */
  advance: 'tap' | 'auto' | 'role-select' | 'quiz' | 'tap-court'

  /** Delay in ms before auto-advancing (only used when advance is 'auto') */
  autoAdvanceDelay?: number

  /** Roles to show for selection (only used when advance is 'role-select') */
  roleOptions?: Role[]

  // === Quiz controls ===

  /** Quiz options (only used when advance is 'quiz') */
  quizOptions?: QuizOption[]

  /** The correct role to tap (only used when advance is 'tap-court') */
  correctRole?: Role

  /** Feedback shown when the correct answer is given */
  successFeedback?: string

  /** Feedback shown when an incorrect answer is given */
  failureFeedback?: string

  // === Court state controls ===

  /** Set the court to this rotation */
  rotation?: Rotation

  /** Set the court to this phase */
  phase?: Phase

  /** Highlight a specific player with a glow effect */
  highlightRole?: Role

  /** Show all players or just a subset */
  showRoles?: Role[]
}

/**
 * A complete lesson (e.g., Module 1: What is 5-1?)
 */
export interface Lesson {
  /** Unique identifier for the lesson */
  id: string

  /** Display title */
  title: string

  /** Short description shown before starting */
  description: string

  /** Estimated time to complete (e.g., "5 min") */
  estimatedTime: string

  /** The steps that make up this lesson */
  steps: LessonStep[]
}

/**
 * Learning progress tracked in the store
 */
export interface LearningProgress {
  /** Which lesson the user is currently on */
  currentLessonId: string

  /** Current step index within the lesson */
  currentStepIndex: number

  /** Lessons that have been completed */
  completedLessonIds: string[]
}
