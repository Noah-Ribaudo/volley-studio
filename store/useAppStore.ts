'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSafeLocalStorage } from '@/store/safeStorage'
import {
  Role,
  Phase,
  Rotation,
  Position,
  PositionCoordinates,
  Team,
  CustomLayout,
  PHASES,
  RALLY_PHASES,
  DEFAULT_VISIBLE_PHASES,
  DEFAULT_PHASE_ORDER,
  ArrowPositions,
  LegacyPhase,
  isRallyPhase,
  PlayerStatus,
  LayoutExtendedData,
  PositionSource,
  Lineup,
  ArrowCurveConfig,
  TokenTag,
} from '@/lib/types'

// Conflict info - captured when a save conflict is detected
export interface LayoutConflictInfo {
  rotation: Rotation
  phase: Phase
  localUpdatedAt: string | null
  serverUpdatedAt: string
  // The pending save data that triggered the conflict
  pendingPositions: PositionCoordinates
  pendingFlags: LayoutExtendedData
}

// Team conflict info - captured when a team save conflict is detected
export type TeamConflictType = 'roster' | 'lineups' | 'teamName' | 'settings'

export interface TeamConflictInfo {
  type: TeamConflictType
  teamId: string
  localUpdatedAt: string | null
  serverUpdatedAt: string
  description: string // Human-readable description of what changed
  // The pending save data that triggered the conflict
  pendingData: Partial<Team>
}
import type { RallyPhase } from '@/lib/types'
import {
  createRotationPhaseKey,
  DEFAULT_BASE_ORDER,
  normalizeBaseOrder,
  getRoleZone
} from '@/lib/rotations'
import { ROLES, COURT_ZONES } from '@/lib/types'
import { getWhiteboardPositions, getAutoArrows } from '@/lib/whiteboard'
import { getNextPhaseInFlow, getPrevPhaseInFlow } from '@/lib/phaseFlow'
import type { LearningProgress, LearningPanelPosition } from '@/lib/learning/types'
import type { ShaderId } from '@/lib/shaders'

// Internal storage uses normalized coordinates (0-1)
// PositionCoordinates is now normalized, so this type alias is for clarity
type NormalizedPositionCoordinates = PositionCoordinates

// Normalize/denormalize functions for backward compatibility
// Handles 0-100 percentage values from older versions
function normalizePositions(pos: PositionCoordinates): PositionCoordinates {
  const normalized: PositionCoordinates = {} as PositionCoordinates
  for (const role of ROLES) {
    if (pos[role]) {
      const x = pos[role].x > 1 ? pos[role].x / 100 : pos[role].x
      let y = pos[role].y > 1 ? pos[role].y / 100 : pos[role].y

      // Fix inverted y-coordinates for home side
      // Home players should have y > 0.5 (bottom half of court in normalized coords)
      // If y < 0.35, it's clearly in the opponent's half - this is likely
      // corrupted/inverted legacy data. Mirror it back to home side.
      // (0.35 is well above the net at 0.5, so this won't affect legitimate attack approaches)
      if (y < 0.35) {
        y = 1 - y // Mirror: 0.25 -> 0.75, 0.30 -> 0.70
      }

      normalized[role] = { x, y }
    }
  }
  return normalized
}

// NOTE: denormalizePositions was removed - positions are now stored in normalized (0-1) format

function normalizeArrows(arrows: ArrowPositions): ArrowPositions {
  const normalized: ArrowPositions = {}
  for (const [role, pos] of Object.entries(arrows)) {
    if (pos) {
      // Only normalize 0-100 values to 0-1; do NOT flip y-coordinates
      // Arrows can point anywhere on the court, including opponent's side
      const x = pos.x > 1 ? pos.x / 100 : pos.x
      const y = pos.y > 1 ? pos.y / 100 : pos.y

      normalized[role as Role] = { x, y }
    }
  }
  return normalized
}

interface AppState {
  // Current view state
  currentRotation: Rotation
  currentPhase: Phase // Can be legacy phase or RallyPhase
  highlightedRole: Role | null
  contextPlayer: Role | null // Player with context UI open
  showRotationRules: boolean
  baseOrder: Role[]

  // Phase visibility
  visiblePhases: Set<RallyPhase>
  phaseOrder: RallyPhase[] // Custom order for whiteboard phases

  // Context (NEW)
  isReceivingContext: boolean // true = we're receiving team
  showLibero: boolean // Show libero in visualizations (default: false)
  showPosition: boolean // Show position labels on tokens (default: true)
  showPlayer: boolean // Show player names on tokens (default: false)
  showNumber: boolean // Show player numbers on tokens (default: true)
  circleTokens: boolean // Use circular tokens instead of rounded rectangles (default: true)
  tokenSize: 'big' | 'small' // Token size (big = current, small = circular)
  hideAwayTeam: boolean // Hide the away team on the whiteboard (default: true)
  fullStatusLabels: boolean // Show full words on status badges instead of first letter (default: true)
  showLearnTab: boolean // Show the Learn tab in mobile navigation (default: false)
  debugHitboxes: boolean // Show touch target hitboxes with green highlight (default: false)
  showMotionDebugPanel: boolean // Show motion tuning/debug panel on whiteboard (default: false)
  showPrintFeature: boolean // Show print feature (dev toggle, default: false)
  sidebarProfileInFooter: boolean // Show account profile in sidebar footer (debug toggle, default: false)
  navMode: 'sidebar' | 'header' // Desktop navigation mode (default: 'header')
  backgroundShader: ShaderId // Background shader choice (default: grain-gradient)
  backgroundOpacity: number // Background content opacity 0-100 (default: 95)
  isPreviewingMovement: boolean // Preview mode: show players at arrow endpoints (default: false, not persisted)
  playAnimationTrigger: number // Counter to trigger play animation (incrementing triggers RAF animation)

  // Practice mode (local storage) - stored in normalized coordinates (0-1)
  localPositions: Record<string, NormalizedPositionCoordinates>
  localArrows: Record<string, ArrowPositions> // Arrows in normalized coordinates (0-1)
  arrowCurves: Record<string, Partial<Record<Role, ArrowCurveConfig>>> // Track arrow curve direction and intensity
  localStatusFlags: Record<string, Partial<Record<Role, PlayerStatus[]>>> // Player status badges per rotation/phase (multiple per player)
  localTagFlags: Record<string, Partial<Record<Role, TokenTag[]>>> // Token tags per rotation/phase (multiple per player)

  // Legality violations (for whiteboard mode)
  legalityViolations: Record<string, Array<{ type: string; zones: [string, string]; roles?: [Role, Role] }>>

  // Attack ball positions (for whiteboard defense phase) - stored in normalized coordinates (0-1)
  attackBallPositions: Record<string, Position>

  // Team mode
  currentTeam: Team | null
  customLayouts: CustomLayout[]
  accessMode: 'none' | 'local' | 'full'
  teamPasswordProvided: boolean

  // Conflict detection - tracks when each layout was last loaded from server
  layoutLoadedTimestamps: Record<string, string | null> // key -> updated_at timestamp
  layoutConflict: LayoutConflictInfo | null // Active conflict awaiting resolution

  // Team conflict detection - tracks when team was last loaded from server
  teamLoadedTimestamp: string | null // When we loaded the current team
  teamConflict: TeamConflictInfo | null // Active team conflict awaiting resolution

  // Learning mode
  learningMode: boolean
  learningLessonId: string | null
  learningStepIndex: number
  learningProgress: LearningProgress | null
  learningPanelPosition: LearningPanelPosition
  learningSelectedRole: Role | null // The role the user is following in lessons

  // Court view settings
  awayTeamHidePercent: number // Percentage of court height to hide (0-50)
  isHydrated: boolean // True once persisted state has rehydrated

  // Actions
  setRotation: (rotation: Rotation) => void
  setPhase: (phase: Phase) => void
  // NOTE: setPaused and togglePaused removed - use setPlaybackMode instead
  nextRotation: () => void
  prevRotation: () => void
  nextPhase: () => void
  prevPhase: () => void
  setBaseOrder: (order: Role[]) => void
  resetBaseOrder: () => void
  setHighlightedRole: (role: Role | null) => void
  setContextPlayer: (role: Role | null) => void
  toggleRotationRules: () => void
  updateLocalPosition: (rotation: Rotation, phase: Phase, role: Role, position: Position) => void
  updateArrow: (rotation: Rotation, phase: Phase, role: Role, position: Position) => void
  clearArrow: (rotation: Rotation, phase: Phase, role: Role) => void
  setArrowCurve: (rotation: Rotation, phase: Phase, role: Role, curve: ArrowCurveConfig | null) => void
  getArrowCurve: (rotation: Rotation, phase: Phase, role: Role) => ArrowCurveConfig | null
  togglePlayerStatus: (rotation: Rotation, phase: Phase, role: Role, status: PlayerStatus) => void
  setTokenTags: (rotation: Rotation, phase: Phase, role: Role, tags: TokenTag[]) => void
  setCurrentTeam: (team: Team | null) => void
  assignPlayerToRole: (role: Role, playerId: string | undefined) => void
  setCustomLayouts: (layouts: CustomLayout[]) => void
  populateFromLayouts: (layouts: CustomLayout[]) => void
  setAccessMode: (mode: 'none' | 'local' | 'full') => void
  setTeamPasswordProvided: (val: boolean) => void
  resetToDefaults: (rotation: Rotation, phase: Phase) => void
  clearLocalChanges: () => void
  setLegalityViolations: (key: string, violations: Array<{ type: string; zones: [string, string]; roles?: [Role, Role] }>) => void
  // NEW actions
  togglePhaseVisibility: (phase: RallyPhase) => void
  setPhaseOrder: (order: RallyPhase[]) => void
  setIsReceivingContext: (isReceiving: boolean) => void
  setShowLibero: (show: boolean) => void
  setShowPosition: (show: boolean) => void
  setShowPlayer: (show: boolean) => void
  setShowNumber: (show: boolean) => void
  setCircleTokens: (circle: boolean) => void
  setTokenSize: (size: 'big' | 'small') => void
  setHideAwayTeam: (hide: boolean) => void
  setFullStatusLabels: (full: boolean) => void
  setShowLearnTab: (show: boolean) => void
  setDebugHitboxes: (show: boolean) => void
  setShowMotionDebugPanel: (show: boolean) => void
  setShowPrintFeature: (show: boolean) => void
  setSidebarProfileInFooter: (show: boolean) => void
  setNavMode: (mode: 'sidebar' | 'header') => void
  setBackgroundShader: (shader: ShaderId) => void
  setBackgroundOpacity: (opacity: number) => void
  setPreviewingMovement: (preview: boolean) => void
  triggerPlayAnimation: () => void
  // Attack ball actions (for whiteboard defense phase)
  setAttackBallPosition: (rotation: Rotation, phase: Phase, position: Position) => void
  clearAttackBallPosition: (rotation: Rotation, phase: Phase) => void

  // Learning mode actions
  setLearningMode: (active: boolean) => void
  startLesson: (lessonId: string) => void
  goToLearningStep: (stepIndex: number) => void
  advanceLearningStep: () => void
  prevLearningStep: () => void
  exitLearning: () => void
  completeLearningLesson: () => void
  setLearningPanelPosition: (position: LearningPanelPosition) => void
  setLearningSelectedRole: (role: Role | null) => void
  // Court view actions
  setAwayTeamHidePercent: (percent: number) => void

  // Conflict detection actions
  getLayoutLoadedTimestamp: (rotation: Rotation, phase: Phase) => string | null
  setLayoutLoadedTimestamp: (rotation: Rotation, phase: Phase, timestamp: string) => void
  setLayoutConflict: (conflict: LayoutConflictInfo | null) => void
  resolveConflictKeepMine: () => void
  resolveConflictLoadTheirs: () => void

  // Team conflict detection actions
  getTeamLoadedTimestamp: () => string | null
  setTeamLoadedTimestamp: (timestamp: string) => void
  setTeamConflict: (conflict: TeamConflictInfo | null) => void
  resolveTeamConflictKeepMine: () => void
  resolveTeamConflictLoadTheirs: () => void
}

// Get active lineup's position source from a team
export function getActiveLineupPositionSource(team: Team | null): PositionSource {
  if (!team) return 'custom'
  const activeLineup = team.lineups?.find(l => l.id === team.active_lineup_id)
  return activeLineup?.position_source || 'custom'
}

// Get active lineup from a team
export function getActiveLineup(team: Team | null): Lineup | null {
  if (!team) return null
  return team.lineups?.find(l => l.id === team.active_lineup_id) || null
}

// Get current positions (custom or default) - returns normalized coordinates (0-1)
// When presetLayouts is provided, it will be used instead of customLayouts
// (for when the active lineup uses a preset source)
export function getCurrentPositions(
  rotation: Rotation,
  phase: Phase,
  localPositions: Record<string, NormalizedPositionCoordinates>,
  customLayouts: CustomLayout[],
  currentTeam: Team | null,
  isReceiving: boolean = true,
  baseOrder: Role[] = DEFAULT_BASE_ORDER,
  showLibero: boolean = false,
  attackBallPosition?: Position | null,
  presetLayouts?: CustomLayout[] // Optional preset layouts to use instead of customLayouts
): PositionCoordinates {
  const key = createRotationPhaseKey(rotation, phase)

  // Determine which layouts to use
  const positionSource = getActiveLineupPositionSource(currentTeam)
  const isUsingPreset = positionSource !== 'custom'

  // If using preset source and preset layouts are provided, use them
  // NOTE: When using presets, we DON'T use local overrides (presets are read-only)
  if (isUsingPreset && presetLayouts && presetLayouts.length > 0) {
    const presetLayout = presetLayouts.find(
      l => l.rotation === rotation && l.phase === phase
    )
    if (presetLayout) {
      return presetLayout.positions
    }
    // Fall through to whiteboard defaults if no preset found
  }

  // If NOT using presets, check for local overrides first
  if (!isUsingPreset && localPositions[key]) {
    return localPositions[key]
  }

  // If in team mode with custom source, check for custom layout (already normalized)
  if (currentTeam && !isUsingPreset) {
    const currentTeamId = currentTeam.id ?? currentTeam._id
    const customLayout = customLayouts.find(
      l => (l.team_id === currentTeamId || l.teamId === currentTeamId) && l.rotation === rotation && l.phase === phase
    )
    if (customLayout) {
      return customLayout.positions
    }
  }

  // Check if phase is a RallyPhase, use whiteboard resolver
  if (isRallyPhase(phase)) {
    const result = getWhiteboardPositions({
      rotation,
      phase,
      isReceiving,
      baseOrder,
      showLibero,
      attackBallPosition: phase === 'DEFENSE_PHASE' ? attackBallPosition : null,
    })
    return result.home
  }

  // Fallback to zone centers for legacy phases (shouldn't happen in normal use)
  const fallback: PositionCoordinates = {} as PositionCoordinates
  for (const role of ROLES) {
    const zone = getRoleZone(rotation, role, baseOrder)
    const zonePos = COURT_ZONES[zone as 1 | 2 | 3 | 4 | 5 | 6]
    fallback[role] = { x: zonePos.x, y: zonePos.y }
  }
  return fallback
}

// Get current positions in normalized coordinates (for simulation/canonical model)
// Note: This is now the same as getCurrentPositions since all coordinates are normalized
export function getCurrentPositionsNormalized(
  rotation: Rotation,
  phase: Phase,
  localPositions: Record<string, NormalizedPositionCoordinates>,
  customLayouts: CustomLayout[],
  currentTeam: Team | null,
  isReceiving: boolean = true,
  baseOrder: Role[] = DEFAULT_BASE_ORDER
): NormalizedPositionCoordinates {
  // All positions are now normalized, so just call getCurrentPositions
  return getCurrentPositions(rotation, phase, localPositions, customLayouts, currentTeam, isReceiving, baseOrder)
}

// Get current arrows (manual overrides auto-generated, otherwise defaults)
// Note: If manualArrows[role] === null, it means the arrow was explicitly deleted
// When presetLayouts is provided and team uses preset source, arrows come from preset
export function getCurrentArrows(
  rotation: Rotation,
  phase: Phase,
  localArrows: Record<string, ArrowPositions>,
  isReceiving: boolean = true,
  baseOrder: Role[] = DEFAULT_BASE_ORDER,
  showLibero: boolean = false,
  attackBallPosition?: Position | null,
  currentTeam?: Team | null,
  presetLayouts?: CustomLayout[]
): ArrowPositions {
  const key = createRotationPhaseKey(rotation, phase)

  // Check if we're using preset source
  const positionSource = currentTeam ? getActiveLineupPositionSource(currentTeam) : 'custom'
  const isUsingPreset = positionSource !== 'custom'

  // If using preset source and preset layouts are provided, use preset arrows
  if (isUsingPreset && presetLayouts && presetLayouts.length > 0) {
    const presetLayout = presetLayouts.find(
      l => l.rotation === rotation && l.phase === phase
    )
    if (presetLayout?.flags?.arrows) {
      return presetLayout.flags.arrows
    }
    // Fall through to auto-generated if no preset arrows found
  }

  // Manual arrows override auto-generated (null means explicitly deleted)
  // Only use manual arrows when NOT using presets
  const manualArrows = isUsingPreset ? {} : (localArrows[key] || {})

  // Check if phase is a RallyPhase, use auto-generated arrows
  if (isRallyPhase(phase)) {
    const autoArrows = getAutoArrows(rotation, phase, isReceiving, baseOrder, undefined, showLibero, attackBallPosition)
    // Merge: manual overrides auto, but filter out null values (deleted arrows)
    const merged = { ...autoArrows, ...manualArrows }

    // Filter out explicitly deleted arrows (null values)
    const result: ArrowPositions = {}
    for (const [role, pos] of Object.entries(merged)) {
      if (pos !== null) {
        result[role as keyof ArrowPositions] = pos
      }
    }
    return result
  }

  // Fallback for legacy phases (shouldn't happen in normal use)
  return manualArrows || {}
}

// Get current tags for a rotation/phase
export function getCurrentTags(
  rotation: Rotation,
  phase: Phase,
  localTagFlags: Record<string, Partial<Record<Role, TokenTag[]>>>
): Partial<Record<Role, TokenTag[]>> {
  const key = createRotationPhaseKey(rotation, phase)
  return localTagFlags[key] || {}
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentRotation: 1,
      currentPhase: 'PRE_SERVE' as Phase, // Start with RallyPhase
      highlightedRole: null,
      contextPlayer: null,
      showRotationRules: false,
      baseOrder: [...DEFAULT_BASE_ORDER],
      visiblePhases: new Set(DEFAULT_VISIBLE_PHASES),
      phaseOrder: [...DEFAULT_PHASE_ORDER],
      isReceivingContext: true, // Default to receiving team perspective
      showLibero: false, // Default to off
      showPosition: true, // Default to showing position labels
      showPlayer: false, // Default to hiding player names
      showNumber: true, // Default to showing player numbers
      circleTokens: true, // Default to circular tokens
      tokenSize: 'big' as const, // Default to big tokens
      hideAwayTeam: true, // Default to hiding away team
      fullStatusLabels: true, // Default to showing full words on status badges
      showLearnTab: false, // Default to hiding Learn tab in mobile nav
      debugHitboxes: false, // Default to hiding hitbox debug overlay
      showMotionDebugPanel: false, // Default to hidden motion debug panel
      showPrintFeature: false, // Default to hidden print feature
      sidebarProfileInFooter: false, // Default to profile in top header
      navMode: 'header' as const, // Default to header nav (no sidebar)
      backgroundShader: 'none' as ShaderId, // Default background shader (off by default)
      backgroundOpacity: 95, // Default background content opacity
      isPreviewingMovement: false, // Default to not previewing (not persisted)
      playAnimationTrigger: 0, // Counter to trigger play animation
      localPositions: {},
      localArrows: {},
      arrowCurves: {},
      localStatusFlags: {},
      localTagFlags: {},
      legalityViolations: {},
      attackBallPositions: {},
      currentTeam: null,
      customLayouts: [],
      accessMode: 'none',
      teamPasswordProvided: false,

      // Conflict detection initial state
      layoutLoadedTimestamps: {},
      layoutConflict: null,

      // Team conflict detection initial state
      teamLoadedTimestamp: null,
      teamConflict: null,

      // Learning mode initial state
      learningMode: false,
      learningLessonId: null,
      learningStepIndex: 0,
      learningProgress: null,
      learningPanelPosition: 'floating' as LearningPanelPosition,
      learningSelectedRole: null,

      // Court view settings
      awayTeamHidePercent: 40, // Default: hide 40% of court height when hiding away team
      isHydrated: false,

      // Actions
      setRotation: (rotation) => set({ currentRotation: rotation }),

      setPhase: (phase) => set({ currentPhase: phase }),

      setBaseOrder: (order) => set(() => ({
        baseOrder: normalizeBaseOrder(order ?? DEFAULT_BASE_ORDER)
      })),

      resetBaseOrder: () => set(() => ({
        baseOrder: [...DEFAULT_BASE_ORDER]
      })),

      nextRotation: () => set((state) => ({
        currentRotation: state.currentRotation === 6 ? 1 : (state.currentRotation + 1) as Rotation
      })),

      prevRotation: () => set((state) => ({
        currentRotation: state.currentRotation === 1 ? 6 : (state.currentRotation - 1) as Rotation
      })),

      nextPhase: () => set((state) => {
        // If current phase is a RallyPhase, use flow
        if (isRallyPhase(state.currentPhase)) {
          let currentPhase = state.currentPhase
          let nextPhase = getNextPhaseInFlow(currentPhase)
          let loopedBack = false
          let iterations = 0
          const maxIterations = RALLY_PHASES.length // Safety limit

          // Skip hidden phases - keep going until we find a visible one
          while (!state.visiblePhases.has(nextPhase) && iterations < maxIterations) {
            iterations++
            // If we loop back to PRE_SERVE, mark it and advance rotation
            if (nextPhase === 'PRE_SERVE' && currentPhase !== 'PRE_SERVE') {
              loopedBack = true
              break
            }
            currentPhase = nextPhase
            nextPhase = getNextPhaseInFlow(currentPhase)

            // Safety check: if we've checked all phases and none are visible, just use the next one
            if (nextPhase === state.currentPhase) {
              break
            }
          }

          // If looping back to PRE_SERVE, advance rotation
          if (loopedBack || (nextPhase === 'PRE_SERVE' && state.currentPhase !== 'PRE_SERVE')) {
            return {
              currentPhase: nextPhase as Phase,
              currentRotation: state.currentRotation === 6 ? 1 : (state.currentRotation + 1) as Rotation
            }
          }
          return { currentPhase: nextPhase as Phase }
        }

        // Legacy phase handling
        const currentPhaseIndex = PHASES.indexOf(state.currentPhase as LegacyPhase)
        if (currentPhaseIndex === PHASES.length - 1) {
          return {
            currentPhase: PHASES[0],
            currentRotation: state.currentRotation === 6 ? 1 : (state.currentRotation + 1) as Rotation
          }
        } else {
          return {
            currentPhase: PHASES[currentPhaseIndex + 1]
          }
        }
      }),

      prevPhase: () => set((state) => {
        // If current phase is a RallyPhase, use flow
        if (isRallyPhase(state.currentPhase)) {
          let currentPhase = state.currentPhase
          let prevPhase = getPrevPhaseInFlow(currentPhase)
          let loopedBack = false
          let iterations = 0
          const maxIterations = RALLY_PHASES.length // Safety limit

          // Skip hidden phases - keep going until we find a visible one
          while (!state.visiblePhases.has(prevPhase) && iterations < maxIterations) {
            iterations++
            // If we loop from PRE_SERVE to DEFENSE_PHASE, mark it and go to previous rotation
            if (prevPhase === 'DEFENSE_PHASE' && currentPhase === 'PRE_SERVE') {
              loopedBack = true
              break
            }
            currentPhase = prevPhase
            prevPhase = getPrevPhaseInFlow(currentPhase)

            // Safety check: if we've checked all phases and none are visible, just use the previous one
            if (prevPhase === state.currentPhase) {
              break
            }
          }

          // If looping from PRE_SERVE, go to previous rotation
          if (loopedBack || (prevPhase === 'DEFENSE_PHASE' && state.currentPhase === 'PRE_SERVE')) {
            return {
              currentPhase: prevPhase as Phase,
              currentRotation: state.currentRotation === 1 ? 6 : (state.currentRotation - 1) as Rotation
            }
          }
          return { currentPhase: prevPhase as Phase }
        }

        // Legacy phase handling
        const currentPhaseIndex = PHASES.indexOf(state.currentPhase as LegacyPhase)
        if (currentPhaseIndex === 0) {
          return {
            currentPhase: PHASES[PHASES.length - 1],
            currentRotation: state.currentRotation === 1 ? 6 : (state.currentRotation - 1) as Rotation
          }
        } else {
          return {
            currentPhase: PHASES[currentPhaseIndex - 1]
          }
        }
      }),

      setHighlightedRole: (role) => set({ highlightedRole: role }),
      setContextPlayer: (role) => set({ contextPlayer: role }),

      toggleRotationRules: () => set((state) => ({
        showRotationRules: !state.showRotationRules
      })),

      updateLocalPosition: (rotation, phase, role, position) => set((state) => {
        const key = createRotationPhaseKey(rotation, phase)
        const currentPositions = getCurrentPositionsNormalized(
          rotation, phase, state.localPositions, state.customLayouts, state.currentTeam
        )

        // Position is already in normalized format (0-1)
        return {
          localPositions: {
            ...state.localPositions,
            [key]: {
              ...currentPositions,
              [role]: position
            }
          }
        }
      }),

      updateArrow: (rotation, phase, role, position) => set((state) => {
        const key = createRotationPhaseKey(rotation, phase)
        const currentArrows = state.localArrows[key] ?? {}
        return {
          localArrows: {
            ...state.localArrows,
            [key]: {
              ...currentArrows,
              [role]: position
            }
          }
        }
      }),

      clearArrow: (rotation, phase, role) => set((state) => {
        const key = createRotationPhaseKey(rotation, phase)
        const currentArrows = state.localArrows[key] ?? {}

        // Store null to explicitly mark arrow as deleted (overrides auto-generated)
        return {
          localArrows: {
            ...state.localArrows,
            [key]: {
              ...currentArrows,
              [role]: null
            }
          }
        }
      }),

      setArrowCurve: (rotation, phase, role, curve) => set((state) => {
        const key = createRotationPhaseKey(rotation, phase)
        const currentCurves = state.arrowCurves[key] ?? {}

        // If curve is null, remove the curve for this role
        if (curve === null) {
          const { [role]: _, ...remainingRoles } = currentCurves
          if (Object.keys(remainingRoles).length === 0) {
            const { [key]: __, ...remainingKeys } = state.arrowCurves
            return { arrowCurves: remainingKeys }
          }
          return {
            arrowCurves: {
              ...state.arrowCurves,
              [key]: remainingRoles
            }
          }
        }

        return {
          arrowCurves: {
            ...state.arrowCurves,
            [key]: {
              ...currentCurves,
              [role]: curve
            }
          }
        }
      }),

      getArrowCurve: (rotation, phase, role) => {
        const state = get()
        const key = createRotationPhaseKey(rotation, phase)
        return state.arrowCurves[key]?.[role] ?? null
      },

      togglePlayerStatus: (rotation, phase, role, status) => set((state) => {
        const key = createRotationPhaseKey(rotation, phase)
        const currentFlags = state.localStatusFlags[key] ?? {}
        const currentStatuses = currentFlags[role] ?? []

        // Toggle: if status exists, remove it; otherwise add it
        const hasStatus = currentStatuses.includes(status)
        const newStatuses = hasStatus
          ? currentStatuses.filter(s => s !== status)
          : [...currentStatuses, status]

        // Clean up if no statuses remain for this role
        if (newStatuses.length === 0) {
          const { [role]: _, ...remainingRoles } = currentFlags
          if (Object.keys(remainingRoles).length === 0) {
            // Remove the key entirely if no flags remain
            const { [key]: __, ...remainingKeys } = state.localStatusFlags
            return { localStatusFlags: remainingKeys }
          }
          return {
            localStatusFlags: {
              ...state.localStatusFlags,
              [key]: remainingRoles
            }
          }
        }

        return {
          localStatusFlags: {
            ...state.localStatusFlags,
            [key]: {
              ...currentFlags,
              [role]: newStatuses
            }
          }
        }
      }),

      setTokenTags: (rotation, phase, role, tags) => set((state) => {
        const key = createRotationPhaseKey(rotation, phase)
        const currentFlags = state.localTagFlags[key] ?? {}

        // Clean up if no tags remain for this role
        if (tags.length === 0) {
          const { [role]: _, ...remainingRoles } = currentFlags
          if (Object.keys(remainingRoles).length === 0) {
            // Remove the key entirely if no flags remain
            const { [key]: __, ...remainingKeys } = state.localTagFlags
            return { localTagFlags: remainingKeys }
          }
          return {
            localTagFlags: {
              ...state.localTagFlags,
              [key]: remainingRoles
            }
          }
        }

        return {
          localTagFlags: {
            ...state.localTagFlags,
            [key]: {
              ...currentFlags,
              [role]: tags
            }
          }
        }
      }),

      setCurrentTeam: (team) => set({
        currentTeam: team,
        // Track when we loaded this team for conflict detection
        teamLoadedTimestamp: team?.updated_at || null,
        // Clear any existing team conflict when switching teams
        teamConflict: null,
      }),

      assignPlayerToRole: (role, playerId) => set((state) => {
        if (!state.currentTeam) {
          return {}
        }

        const activeLineupId = state.currentTeam.active_lineup_id
        const nextLineups = state.currentTeam.lineups.map((lineup) => {
          if (lineup.id !== activeLineupId) {
            return lineup
          }
          const nextAssignments = { ...lineup.position_assignments }
          if (playerId) {
            nextAssignments[role] = playerId
          } else {
            delete nextAssignments[role]
          }
          return {
            ...lineup,
            position_assignments: nextAssignments,
          }
        })

        const nextTeamAssignments = { ...state.currentTeam.position_assignments }
        if (playerId) {
          nextTeamAssignments[role] = playerId
        } else {
          delete nextTeamAssignments[role]
        }

        return {
          currentTeam: {
            ...state.currentTeam,
            position_assignments: nextTeamAssignments,
            lineups: nextLineups,
          },
        }
      }),

      setCustomLayouts: (layouts) => set({ customLayouts: layouts }),

      populateFromLayouts: (layouts) => set(() => {
        // Extract positions, arrows, status flags, etc. from loaded layouts
        const newLocalPositions: Record<string, NormalizedPositionCoordinates> = {}
        const newLocalArrows: Record<string, ArrowPositions> = {}
        const newArrowCurves: Record<string, Partial<Record<Role, ArrowCurveConfig>>> = {}
        const newLocalStatusFlags: Record<string, Partial<Record<Role, PlayerStatus[]>>> = {}
        const newLocalTagFlags: Record<string, Partial<Record<Role, TokenTag[]>>> = {}
        const newAttackBallPositions: Record<string, Position> = {}
        const newLoadedTimestamps: Record<string, string | null> = {}

        for (const layout of layouts) {
          const key = createRotationPhaseKey(layout.rotation, layout.phase)

          // Positions are always set from the layout
          if (layout.positions) {
            newLocalPositions[key] = normalizePositions(layout.positions)
          }

          // Track when this layout was last updated on server (for conflict detection)
          newLoadedTimestamps[key] = layout.updated_at || null

          // Extract extended data from flags if present
          const flags = layout.flags as LayoutExtendedData | null | undefined
          if (flags) {
            if (flags.arrows) {
              newLocalArrows[key] = flags.arrows
            }
            // Load arrowCurves - also handle legacy arrowFlips by migrating to curves
            if (flags.arrowCurves) {
              newArrowCurves[key] = flags.arrowCurves
            }
            // Note: Legacy arrowFlips (boolean) are not migrated to the new control point format
            // since we need arrow positions to calculate meaningful control points
            if (flags.statusFlags) {
              newLocalStatusFlags[key] = flags.statusFlags
            }
            if (flags.tagFlags) {
              newLocalTagFlags[key] = flags.tagFlags
            }
            if (flags.attackBallPosition) {
              newAttackBallPositions[key] = flags.attackBallPosition
            }
          }
        }

        return {
          localPositions: newLocalPositions,
          localArrows: newLocalArrows,
          arrowCurves: newArrowCurves,
          localStatusFlags: newLocalStatusFlags,
          localTagFlags: newLocalTagFlags,
          attackBallPositions: newAttackBallPositions,
          layoutLoadedTimestamps: newLoadedTimestamps,
          layoutConflict: null, // Clear any existing conflict when loading fresh data
        }
      }),

      setAccessMode: (mode) => set({ accessMode: mode }),

      setTeamPasswordProvided: (val) => set({ teamPasswordProvided: val }),

      resetToDefaults: (rotation, phase) => set((state) => {
        const key = createRotationPhaseKey(rotation, phase)
        const { [key]: _, ...remainingPositions } = state.localPositions
        const { [key]: __, ...remainingArrows } = state.localArrows

        return {
          localPositions: remainingPositions,
          localArrows: remainingArrows,
          legalityViolations: {
            ...state.legalityViolations,
            [key]: []
          }
        }
      }),

      clearLocalChanges: () => set({
        localPositions: {},
        localArrows: {},
        legalityViolations: {}
      }),

      setLegalityViolations: (key, violations) => set((state) => ({
        legalityViolations: {
          ...state.legalityViolations,
          [key]: violations
        }
      })),

      // NEW actions
      togglePhaseVisibility: (phase) => set((state) => {
        const newVisible = new Set(state.visiblePhases)
        if (newVisible.has(phase)) {
          newVisible.delete(phase)
        } else {
          newVisible.add(phase)
        }
        return { visiblePhases: newVisible }
      }),

      setPhaseOrder: (order) => set({ phaseOrder: order }),

      setIsReceivingContext: (isReceiving) => set({ isReceivingContext: isReceiving }),

      setShowLibero: (show) => set({ showLibero: show }),

      setShowPosition: (show) => set({ showPosition: show }),

      setShowPlayer: (show) => set({ showPlayer: show }),

      setShowNumber: (show) => set({ showNumber: show }),

      setCircleTokens: (circle) => set({ circleTokens: circle }),

      setTokenSize: (size) => set({ tokenSize: size }),

      setHideAwayTeam: (hide) => set({ hideAwayTeam: hide }),

      setFullStatusLabels: (full) => set({ fullStatusLabels: full }),

      setShowLearnTab: (show) => set({ showLearnTab: show }),

      setDebugHitboxes: (show) => set({ debugHitboxes: show }),
      setShowMotionDebugPanel: (show) => set({ showMotionDebugPanel: show }),
      setShowPrintFeature: (show) => set({ showPrintFeature: show }),
      setSidebarProfileInFooter: (show) => set({ sidebarProfileInFooter: show }),

      setNavMode: (mode) => set({ navMode: mode }),

      setBackgroundShader: (shader) => set({ backgroundShader: shader }),
      setBackgroundOpacity: (opacity) => set({ backgroundOpacity: opacity }),

      setPreviewingMovement: (preview) => set({ isPreviewingMovement: preview }),

      triggerPlayAnimation: () => set((state) => ({ playAnimationTrigger: state.playAnimationTrigger + 1 })),

      // Attack ball actions (for whiteboard defense phase)
      setAttackBallPosition: (rotation, phase, position) => set((state) => {
        const key = createRotationPhaseKey(rotation, phase)
        return {
          attackBallPositions: {
            ...state.attackBallPositions,
            [key]: position
          }
        }
      }),

      clearAttackBallPosition: (rotation, phase) => set((state) => {
        const key = createRotationPhaseKey(rotation, phase)
        const { [key]: _, ...remaining } = state.attackBallPositions
        return {
          attackBallPositions: remaining
        }
      }),

      // Learning mode actions
      setLearningMode: (active) => set({ learningMode: active }),

      startLesson: (lessonId) => set({
        learningMode: true,
        learningLessonId: lessonId,
        learningStepIndex: 0,
      }),

      goToLearningStep: (stepIndex) => set({ learningStepIndex: stepIndex }),

      advanceLearningStep: () => set((state) => ({
        learningStepIndex: state.learningStepIndex + 1,
      })),

      prevLearningStep: () => set((state) => ({
        learningStepIndex: Math.max(0, state.learningStepIndex - 1),
      })),

      exitLearning: () => set({
        learningMode: false,
        // Keep lessonId and stepIndex so they can resume
      }),

      completeLearningLesson: () => set((state) => {
        const completedIds = state.learningProgress?.completedLessonIds || []
        const lessonId = state.learningLessonId
        if (!lessonId) return {}

        return {
          learningMode: false,
          learningProgress: {
            currentLessonId: lessonId,
            currentStepIndex: 0,
            completedLessonIds: completedIds.includes(lessonId)
              ? completedIds
              : [...completedIds, lessonId],
          },
        }
      }),

      setLearningPanelPosition: (position) => set({ learningPanelPosition: position }),

      setLearningSelectedRole: (role) => set({ learningSelectedRole: role }),

      // Court view actions
      setAwayTeamHidePercent: (percent) => set({ awayTeamHidePercent: Math.max(0, Math.min(50, percent)) }),

      // Conflict detection actions
      getLayoutLoadedTimestamp: (rotation, phase) => {
        const state = get()
        const key = createRotationPhaseKey(rotation, phase)
        return state.layoutLoadedTimestamps[key] || null
      },

      setLayoutLoadedTimestamp: (rotation, phase, timestamp) => set((state) => {
        const key = createRotationPhaseKey(rotation, phase)
        return {
          layoutLoadedTimestamps: {
            ...state.layoutLoadedTimestamps,
            [key]: timestamp,
          },
        }
      }),

      setLayoutConflict: (conflict) => set({ layoutConflict: conflict }),

      resolveConflictKeepMine: () => {
        // User chose to keep their local changes
        // The whiteboard-sync module will force-save the pending data
        set({ layoutConflict: null })
      },

      resolveConflictLoadTheirs: () => set((state) => {
        // User chose to discard local changes and load server version
        // Clear the conflict and also clear local changes for that layout
        if (!state.layoutConflict) return { layoutConflict: null }

        const key = createRotationPhaseKey(state.layoutConflict.rotation, state.layoutConflict.phase)

        // Remove local overrides for this layout - will reload from server
        const { [key]: _, ...remainingPositions } = state.localPositions
        const { [key]: __, ...remainingArrows } = state.localArrows
        const { [key]: ___, ...remainingCurves } = state.arrowCurves
        const { [key]: ____, ...remainingStatus } = state.localStatusFlags
        const { [key]: _____, ...remainingTags } = state.localTagFlags
        const { [key]: ______, ...remainingAttackBall } = state.attackBallPositions

        return {
          layoutConflict: null,
          localPositions: remainingPositions,
          localArrows: remainingArrows,
          arrowCurves: remainingCurves,
          localStatusFlags: remainingStatus,
          localTagFlags: remainingTags,
          attackBallPositions: remainingAttackBall,
        }
      }),

      // Team conflict detection actions
      getTeamLoadedTimestamp: () => {
        const state = get()
        return state.teamLoadedTimestamp
      },

      setTeamLoadedTimestamp: (timestamp) => set({ teamLoadedTimestamp: timestamp }),

      setTeamConflict: (conflict) => set({ teamConflict: conflict }),

      resolveTeamConflictKeepMine: () => {
        // User chose to keep their local changes
        // The team-sync module will force-save the pending data
        set({ teamConflict: null })
      },

      resolveTeamConflictLoadTheirs: () => set(() => {
        // User chose to discard local changes and load server version
        // Clear the conflict - the caller will reload team data
        return {
          teamConflict: null,
        }
      }),
    }),
    {
      name: 'volleyball-rotation-storage',
      storage: createSafeLocalStorage<any>(),
      partialize: (state) => {
        // Positions are stored in normalized (0-1) format
        return {
          localPositions: state.localPositions,
          highlightedRole: state.highlightedRole,
          localArrows: state.localArrows,
          arrowCurves: state.arrowCurves,
          localStatusFlags: state.localStatusFlags,
          localTagFlags: state.localTagFlags,
          currentTeam: state.currentTeam,
          accessMode: state.accessMode,
          teamPasswordProvided: state.teamPasswordProvided,
          baseOrder: state.baseOrder,
          visiblePhases: Array.from(state.visiblePhases),
          phaseOrder: state.phaseOrder,
          isReceivingContext: state.isReceivingContext,
          showLibero: state.showLibero,
          showPosition: state.showPosition,
          showPlayer: state.showPlayer,
          showNumber: state.showNumber,
          circleTokens: state.circleTokens,
          fullStatusLabels: state.fullStatusLabels,
          debugHitboxes: state.debugHitboxes,
          tokenSize: state.tokenSize,
          hideAwayTeam: state.hideAwayTeam,
          showLearnTab: state.showLearnTab,
          showMotionDebugPanel: state.showMotionDebugPanel,
          showPrintFeature: state.showPrintFeature,
          sidebarProfileInFooter: state.sidebarProfileInFooter,
          navMode: state.navMode,
          backgroundShader: state.backgroundShader,
          backgroundOpacity: state.backgroundOpacity,
          attackBallPositions: state.attackBallPositions,
          // Learning mode progress
          learningLessonId: state.learningLessonId,
          learningStepIndex: state.learningStepIndex,
          learningProgress: state.learningProgress,
          learningPanelPosition: state.learningPanelPosition,
          learningSelectedRole: state.learningSelectedRole,
          // Court view settings
          awayTeamHidePercent: state.awayTeamHidePercent,
        }
      },
      // On rehydration, normalize any legacy percentage positions (0-100) to normalized (0-1)
      onRehydrateStorage: () => (state) => {
        // Legacy migration: convert any old 0-100 format positions to 0-1
        if (state?.localPositions) {
          const normalized: Record<string, NormalizedPositionCoordinates> = {}
          for (const [key, pos] of Object.entries(state.localPositions)) {
            normalized[key] = normalizePositions(pos as PositionCoordinates)
          }
          state.localPositions = normalized
        }
        // Rehydrate visiblePhases Set
        if (state) {
          if (state.visiblePhases && Array.isArray(state.visiblePhases)) {
            state.visiblePhases = new Set(state.visiblePhases as RallyPhase[])
          } else if (!state.visiblePhases) {
            state.visiblePhases = new Set(DEFAULT_VISIBLE_PHASES)
          }
        }
        // Default phaseOrder if not set
        if (state && !state.phaseOrder) {
          state.phaseOrder = [...DEFAULT_PHASE_ORDER]
        }
        // Normalize legacy arrows
        if (state && state.localArrows) {
          const normalized: Record<string, ArrowPositions> = {}
          for (const [key, arrows] of Object.entries(state.localArrows)) {
            normalized[key] = normalizeArrows(arrows)
          }
          state.localArrows = normalized
        }
        // Set default for arrowCurves if missing
        if (state && state.arrowCurves === undefined) {
          state.arrowCurves = {}
          // Clean up any legacy arrowFlips (can't migrate to control points without positions)
          const stateAny = state as unknown as Record<string, unknown>
          if (stateAny.arrowFlips) {
            delete stateAny.arrowFlips
          }
        }
        // Set defaults for new fields if missing
        if (state && state.isReceivingContext === undefined) {
          state.isReceivingContext = true
        }
        if (state && state.showLibero === undefined) {
          state.showLibero = false
        }
        if (state && state.showPosition === undefined) {
          state.showPosition = true
        }
        if (state && state.showPlayer === undefined) {
          state.showPlayer = false
        }
        if (state && state.showNumber === undefined) {
          state.showNumber = true
        }
        if (state && state.circleTokens === undefined) {
          state.circleTokens = true
        }
        if (state && state.fullStatusLabels === undefined) {
          state.fullStatusLabels = true
        }
        if (state && state.debugHitboxes === undefined) {
          state.debugHitboxes = false
        }
        if (state && state.tokenSize === undefined) {
          state.tokenSize = 'big'
        }
        // Set default for hideAwayTeam if missing
        if (state && state.hideAwayTeam === undefined) {
          state.hideAwayTeam = true
        }
        // Set default for motion debug panel toggle if missing
        if (state && state.showMotionDebugPanel === undefined) {
          state.showMotionDebugPanel = false
        }
        // Set default for print feature toggle if missing
        if (state && state.showPrintFeature === undefined) {
          state.showPrintFeature = false
        }
        // Set default for sidebar profile placement toggle if missing
        if (state && state.sidebarProfileInFooter === undefined) {
          state.sidebarProfileInFooter = false
        }
        // Set default for attackBallPositions if missing
        if (state && state.attackBallPositions === undefined) {
          state.attackBallPositions = {}
        }
        // Set default for localStatusFlags if missing
        if (state && state.localStatusFlags === undefined) {
          state.localStatusFlags = {}
        }
        // Set default for localTagFlags if missing
        if (state && state.localTagFlags === undefined) {
          state.localTagFlags = {}
        }
        // Conflict state is transient - always clear on rehydrate
        if (state) {
          state.layoutLoadedTimestamps = {}
          state.layoutConflict = null
          state.teamLoadedTimestamp = null
          state.teamConflict = null
        }
        // Learning mode - never start in learning mode on load
        if (state) {
          state.learningMode = false
        }
        // Default learning panel position if not set
        if (state && !state.learningPanelPosition) {
          state.learningPanelPosition = 'floating'
        }
        // Default awayTeamHidePercent if not set
        if (state && state.awayTeamHidePercent === undefined) {
          state.awayTeamHidePercent = 40
        }
        if (state) {
          state.isHydrated = true
        }
      },
    }
  )
)
