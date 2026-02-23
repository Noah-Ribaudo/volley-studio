'use client'

import { normalizeBaseOrder, DEFAULT_BASE_ORDER } from '@/lib/rotations'
import type { Role, PositionCoordinates, ArrowPositions, PlayerStatus, TokenTag, Position } from '@/lib/types'
import type { ArrowCurveConfig } from '@/lib/types'
import type { Team, CustomLayout } from '@/lib/types'
import type { LearningProgress, LearningPanelPosition } from '@/lib/learning/types'
import type { ShaderId } from '@/lib/shaders'

type PersistEnvelope<T> = {
  state?: T
  version?: number
}

type MigrationStatus = {
  version: number
  completedKeys: string[]
  completedAt: string
}

export const LEGACY_STORE_KEY = 'volleyball-rotation-storage'
export const MIGRATION_STATUS_KEY = 'volley-store-migrated'
export const STORE_MIGRATION_VERSION = 2

export const STORE_KEYS = {
  whiteboard: 'volley-whiteboard-data',
  team: 'volley-team-state',
  navigation: 'volley-navigation',
  displayPrefs: 'volley-display-prefs',
  uiPrefs: 'volley-ui-prefs',
  learning: 'volley-learning',
} as const

const ALL_TARGET_KEYS = [
  STORE_KEYS.whiteboard,
  STORE_KEYS.team,
  STORE_KEYS.navigation,
  STORE_KEYS.displayPrefs,
  STORE_KEYS.uiPrefs,
  STORE_KEYS.learning,
]

type LegacyState = {
  localPositions?: Record<string, PositionCoordinates>
  localArrows?: Record<string, ArrowPositions>
  arrowCurves?: Record<string, Partial<Record<Role, ArrowCurveConfig>>>
  localStatusFlags?: Record<string, Partial<Record<Role, PlayerStatus[]>>>
  localTagFlags?: Record<string, Partial<Record<Role, TokenTag[]>>>
  attackBallPositions?: Record<string, Position>

  currentTeam?: Team | null
  accessMode?: 'none' | 'local' | 'full'
  teamPasswordProvided?: boolean

  baseOrder?: Role[]
  highlightedRole?: Role | null

  isReceivingContext?: boolean
  showLibero?: boolean
  showPosition?: boolean
  showPlayer?: boolean
  showNumber?: boolean
  circleTokens?: boolean
  tokenSize?: 'big' | 'small'
  hideAwayTeam?: boolean
  awayTeamHidePercent?: number
  fullStatusLabels?: boolean

  showLearnTab?: boolean
  debugHitboxes?: boolean
  showMotionDebugPanel?: boolean
  showPrintFeature?: boolean
  sidebarProfileInFooter?: boolean
  courtSetupSurfaceVariant?: 'popover' | 'panel'
  useUnifiedTeamAssignment?: boolean
  navMode?: 'sidebar' | 'header'
  uiMode?: 'normal' | 'minimal'
  minimalContrast?: 'soft' | 'high'
  minimalAllowAccent?: boolean
  minimalDenseLayout?: boolean
  backgroundShader?: ShaderId
  backgroundOpacity?: number

  learningLessonId?: string | null
  learningStepIndex?: number
  learningProgress?: LearningProgress | null
  learningPanelPosition?: LearningPanelPosition
  learningSelectedRole?: Role | null
}

type WhiteboardMigratedState = {
  localPositions: Record<string, PositionCoordinates>
  localArrows: Record<string, ArrowPositions>
  arrowCurves: Record<string, Partial<Record<Role, ArrowCurveConfig>>>
  localStatusFlags: Record<string, Partial<Record<Role, PlayerStatus[]>>>
  localTagFlags: Record<string, Partial<Record<Role, TokenTag[]>>>
  attackBallPositions: Record<string, Position>
}

type TeamMigratedState = {
  currentTeam: Team | null
  customLayouts: CustomLayout[]
  accessMode: 'none' | 'local' | 'full'
  teamPasswordProvided: boolean
}

type NavigationMigratedState = {
  baseOrder: Role[]
  highlightedRole: Role | null
}

type DisplayPrefsMigratedState = {
  isReceivingContext: boolean
  showLibero: boolean
  showPosition: boolean
  showPlayer: boolean
  showNumber: boolean
  circleTokens: boolean
  tokenSize: 'big' | 'small'
  hideAwayTeam: boolean
  awayTeamHidePercent: number
  fullStatusLabels: boolean
}

type UIPrefsMigratedState = {
  showLearnTab: boolean
  debugHitboxes: boolean
  showMotionDebugPanel: boolean
  showPrintFeature: boolean
  sidebarProfileInFooter: boolean
  courtSetupSurfaceVariant: 'popover' | 'panel'
  useUnifiedTeamAssignment: boolean
  navMode: 'sidebar' | 'header'
  uiMode: 'normal' | 'minimal'
  minimalContrast: 'soft' | 'high'
  minimalAllowAccent: boolean
  minimalDenseLayout: boolean
  backgroundShader: ShaderId
  backgroundOpacity: number
}

type LearningMigratedState = {
  learningLessonId: string | null
  learningStepIndex: number
  learningProgress: LearningProgress | null
  learningPanelPosition: LearningPanelPosition
  learningSelectedRole: Role | null
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function readPersistedState<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  const parsed = parseJson<PersistEnvelope<T> | T>(window.localStorage.getItem(key))
  if (!parsed || typeof parsed !== 'object') return null

  if ('state' in parsed && parsed.state && typeof parsed.state === 'object') {
    return parsed.state
  }

  return parsed as T
}

function writePersistedState<T>(key: string, state: T) {
  if (typeof window === 'undefined') return
  const payload: PersistEnvelope<T> = {
    state,
    version: 0,
  }
  window.localStorage.setItem(key, JSON.stringify(payload))
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isValidTargetState(key: string): boolean {
  const state = readPersistedState<Record<string, unknown>>(key)
  if (!state || !isObject(state)) return false

  switch (key) {
    case STORE_KEYS.whiteboard:
      return isObject(state.localPositions ?? {}) && isObject(state.localArrows ?? {})
    case STORE_KEYS.team:
      return Array.isArray(state.customLayouts) && 'teamPasswordProvided' in state
    case STORE_KEYS.navigation:
      return Array.isArray(state.baseOrder)
    case STORE_KEYS.displayPrefs:
      return 'showPosition' in state && 'showPlayer' in state && 'showNumber' in state
    case STORE_KEYS.uiPrefs:
      return 'navMode' in state && 'backgroundShader' in state
    case STORE_KEYS.learning:
      return 'learningStepIndex' in state && 'learningPanelPosition' in state
    default:
      return false
  }
}

function getExistingMigrationStatus(): MigrationStatus | null {
  return parseJson<MigrationStatus>(typeof window === 'undefined' ? null : window.localStorage.getItem(MIGRATION_STATUS_KEY))
}

function buildMigratedSlices(legacy: LegacyState): {
  whiteboard: WhiteboardMigratedState
  team: TeamMigratedState
  navigation: NavigationMigratedState
  displayPrefs: DisplayPrefsMigratedState
  uiPrefs: UIPrefsMigratedState
  learning: LearningMigratedState
} {
  return {
    whiteboard: {
      localPositions: legacy.localPositions ?? {},
      localArrows: legacy.localArrows ?? {},
      arrowCurves: legacy.arrowCurves ?? {},
      localStatusFlags: legacy.localStatusFlags ?? {},
      localTagFlags: legacy.localTagFlags ?? {},
      attackBallPositions: legacy.attackBallPositions ?? {},
    },
    team: {
      currentTeam: legacy.currentTeam ?? null,
      customLayouts: [],
      accessMode: legacy.accessMode ?? 'none',
      teamPasswordProvided: legacy.teamPasswordProvided ?? false,
    },
    navigation: {
      baseOrder: normalizeBaseOrder(legacy.baseOrder ?? DEFAULT_BASE_ORDER),
      highlightedRole: legacy.highlightedRole ?? null,
    },
    displayPrefs: {
      isReceivingContext: legacy.isReceivingContext ?? true,
      showLibero: legacy.showLibero ?? false,
      showPosition: legacy.showPosition ?? true,
      showPlayer: legacy.showPlayer ?? false,
      showNumber: legacy.showNumber ?? true,
      circleTokens: legacy.circleTokens ?? true,
      tokenSize: legacy.tokenSize ?? 'big',
      hideAwayTeam: legacy.hideAwayTeam ?? true,
      awayTeamHidePercent: Math.max(0, Math.min(50, legacy.awayTeamHidePercent ?? 40)),
      fullStatusLabels: legacy.fullStatusLabels ?? true,
    },
    uiPrefs: {
      showLearnTab: legacy.showLearnTab ?? false,
      debugHitboxes: legacy.debugHitboxes ?? false,
      showMotionDebugPanel: legacy.showMotionDebugPanel ?? false,
      showPrintFeature: legacy.showPrintFeature ?? false,
      sidebarProfileInFooter: legacy.sidebarProfileInFooter ?? false,
      courtSetupSurfaceVariant: legacy.courtSetupSurfaceVariant ?? 'popover',
      useUnifiedTeamAssignment: legacy.useUnifiedTeamAssignment ?? false,
      navMode: legacy.navMode ?? 'header',
      uiMode: legacy.uiMode ?? 'normal',
      minimalContrast: legacy.minimalContrast ?? 'soft',
      minimalAllowAccent: legacy.minimalAllowAccent ?? true,
      minimalDenseLayout: legacy.minimalDenseLayout ?? false,
      backgroundShader: legacy.backgroundShader ?? 'none',
      backgroundOpacity: legacy.backgroundOpacity ?? 95,
    },
    learning: {
      learningLessonId: legacy.learningLessonId ?? null,
      learningStepIndex: legacy.learningStepIndex ?? 0,
      learningProgress: legacy.learningProgress ?? null,
      learningPanelPosition: legacy.learningPanelPosition ?? 'floating',
      learningSelectedRole: legacy.learningSelectedRole ?? null,
    },
  }
}

export function migrateFromLegacyStore(): { migrated: boolean; reason: string } {
  if (typeof window === 'undefined') {
    return { migrated: false, reason: 'no-window' }
  }

  const legacy = readPersistedState<LegacyState>(LEGACY_STORE_KEY)
  if (!legacy) {
    return { migrated: false, reason: 'no-legacy' }
  }

  const status = getExistingMigrationStatus()
  const alreadyComplete =
    status?.version === STORE_MIGRATION_VERSION &&
    ALL_TARGET_KEYS.every((key) => status.completedKeys.includes(key) && isValidTargetState(key))

  if (alreadyComplete) {
    return { migrated: false, reason: 'already-complete' }
  }

  const slices = buildMigratedSlices(legacy)

  const writes: Array<[string, unknown]> = [
    [STORE_KEYS.whiteboard, slices.whiteboard],
    [STORE_KEYS.team, slices.team],
    [STORE_KEYS.navigation, slices.navigation],
    [STORE_KEYS.displayPrefs, slices.displayPrefs],
    [STORE_KEYS.uiPrefs, slices.uiPrefs],
    [STORE_KEYS.learning, slices.learning],
  ]

  try {
    for (const [key, state] of writes) {
      if (!isValidTargetState(key)) {
        writePersistedState(key, state)
      }
    }

    const completedKeys = ALL_TARGET_KEYS.filter((key) => isValidTargetState(key))

    if (completedKeys.length !== ALL_TARGET_KEYS.length) {
      return { migrated: false, reason: 'validation-failed' }
    }

    const nextStatus: MigrationStatus = {
      version: STORE_MIGRATION_VERSION,
      completedKeys,
      completedAt: new Date().toISOString(),
    }

    window.localStorage.setItem(MIGRATION_STATUS_KEY, JSON.stringify(nextStatus))
    return { migrated: true, reason: 'ok' }
  } catch {
    return { migrated: false, reason: 'write-failed' }
  }
}
