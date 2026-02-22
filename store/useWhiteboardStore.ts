'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSafeLocalStorage } from '@/store/safeStorage'
import {
  type Role,
  type Phase,
  type Rotation,
  type Position,
  type PositionCoordinates,
  type ArrowPositions,
  type PlayerStatus,
  type LayoutExtendedData,
  type CustomLayout,
  type ArrowCurveConfig,
  type TokenTag,
  ROLES,
} from '@/lib/types'
import { createRotationPhaseKey } from '@/lib/rotations'
import { getCurrentPositionsNormalized } from '@/lib/whiteboardHelpers'
import { useTeamStore } from '@/store/useTeamStore'

function normalizePositions(pos: PositionCoordinates): PositionCoordinates {
  const normalized: PositionCoordinates = {} as PositionCoordinates
  for (const role of ROLES) {
    if (pos[role]) {
      const x = pos[role].x > 1 ? pos[role].x / 100 : pos[role].x
      let y = pos[role].y > 1 ? pos[role].y / 100 : pos[role].y

      if (y < 0.35) {
        y = 1 - y
      }

      normalized[role] = { x, y }
    }
  }
  return normalized
}

function normalizeArrows(arrows: ArrowPositions): ArrowPositions {
  const normalized: ArrowPositions = {}
  for (const [role, pos] of Object.entries(arrows)) {
    if (pos) {
      const x = pos.x > 1 ? pos.x / 100 : pos.x
      const y = pos.y > 1 ? pos.y / 100 : pos.y
      normalized[role as Role] = { x, y }
    }
  }
  return normalized
}

export interface LayoutConflictInfo {
  rotation: Rotation
  phase: Phase
  localUpdatedAt: string | null
  serverUpdatedAt: string
  pendingPositions: PositionCoordinates
  pendingFlags: LayoutExtendedData
}

export type WhiteboardPersistedState = {
  localPositions: Record<string, PositionCoordinates>
  localArrows: Record<string, ArrowPositions>
  arrowCurves: Record<string, Partial<Record<Role, ArrowCurveConfig>>>
  localStatusFlags: Record<string, Partial<Record<Role, PlayerStatus[]>>>
  localTagFlags: Record<string, Partial<Record<Role, TokenTag[]>>>
  attackBallPositions: Record<string, Position>
}

interface WhiteboardState {
  localPositions: Record<string, PositionCoordinates>
  localArrows: Record<string, ArrowPositions>
  arrowCurves: Record<string, Partial<Record<Role, ArrowCurveConfig>>>
  localStatusFlags: Record<string, Partial<Record<Role, PlayerStatus[]>>>
  localTagFlags: Record<string, Partial<Record<Role, TokenTag[]>>>
  legalityViolations: Record<string, Array<{ type: string; zones: [string, string]; roles?: [Role, Role] }>>
  attackBallPositions: Record<string, Position>
  contextPlayer: Role | null

  layoutLoadedTimestamps: Record<string, string | null>
  layoutConflict: LayoutConflictInfo | null
  isHydrated: boolean

  setContextPlayer: (role: Role | null) => void
  updateLocalPosition: (rotation: Rotation, phase: Phase, role: Role, position: Position) => void
  updateArrow: (rotation: Rotation, phase: Phase, role: Role, position: Position) => void
  clearArrow: (rotation: Rotation, phase: Phase, role: Role) => void
  setArrowCurve: (rotation: Rotation, phase: Phase, role: Role, curve: ArrowCurveConfig | null) => void
  getArrowCurve: (rotation: Rotation, phase: Phase, role: Role) => ArrowCurveConfig | null
  togglePlayerStatus: (rotation: Rotation, phase: Phase, role: Role, status: PlayerStatus) => void
  setTokenTags: (rotation: Rotation, phase: Phase, role: Role, tags: TokenTag[]) => void
  populateFromLayouts: (layouts: CustomLayout[]) => void
  resetToDefaults: (rotation: Rotation, phase: Phase) => void
  clearLocalChanges: () => void
  setLegalityViolations: (key: string, violations: Array<{ type: string; zones: [string, string]; roles?: [Role, Role] }>) => void
  setAttackBallPosition: (rotation: Rotation, phase: Phase, position: Position) => void
  clearAttackBallPosition: (rotation: Rotation, phase: Phase) => void

  getLayoutLoadedTimestamp: (rotation: Rotation, phase: Phase) => string | null
  setLayoutLoadedTimestamp: (rotation: Rotation, phase: Phase, timestamp: string) => void
  setLayoutConflict: (conflict: LayoutConflictInfo | null) => void
  resolveConflictKeepMine: () => void
  resolveConflictLoadTheirs: () => void
}

export const useWhiteboardStore = create<WhiteboardState>()(
  persist(
    (set, get) => ({
      localPositions: {},
      localArrows: {},
      arrowCurves: {},
      localStatusFlags: {},
      localTagFlags: {},
      legalityViolations: {},
      attackBallPositions: {},
      contextPlayer: null,
      layoutLoadedTimestamps: {},
      layoutConflict: null,
      isHydrated: false,

      setContextPlayer: (role) => set({ contextPlayer: role }),

      updateLocalPosition: (rotation, phase, role, position) =>
        set((state) => {
          const key = createRotationPhaseKey(rotation, phase)
          const { currentTeam, customLayouts } = useTeamStore.getState()
          const currentPositions = getCurrentPositionsNormalized(
            rotation,
            phase,
            state.localPositions,
            customLayouts,
            currentTeam
          )

          return {
            localPositions: {
              ...state.localPositions,
              [key]: {
                ...currentPositions,
                [role]: position,
              },
            },
          }
        }),

      updateArrow: (rotation, phase, role, position) =>
        set((state) => {
          const key = createRotationPhaseKey(rotation, phase)
          const currentArrows = state.localArrows[key] ?? {}
          return {
            localArrows: {
              ...state.localArrows,
              [key]: {
                ...currentArrows,
                [role]: position,
              },
            },
          }
        }),

      clearArrow: (rotation, phase, role) =>
        set((state) => {
          const key = createRotationPhaseKey(rotation, phase)
          const currentArrows = state.localArrows[key] ?? {}

          return {
            localArrows: {
              ...state.localArrows,
              [key]: {
                ...currentArrows,
                [role]: null,
              },
            },
          }
        }),

      setArrowCurve: (rotation, phase, role, curve) =>
        set((state) => {
          const key = createRotationPhaseKey(rotation, phase)
          const currentCurves = state.arrowCurves[key] ?? {}

          if (curve === null) {
            const { [role]: _, ...remainingRoles } = currentCurves
            if (Object.keys(remainingRoles).length === 0) {
              const { [key]: __, ...remainingKeys } = state.arrowCurves
              return { arrowCurves: remainingKeys }
            }
            return {
              arrowCurves: {
                ...state.arrowCurves,
                [key]: remainingRoles,
              },
            }
          }

          return {
            arrowCurves: {
              ...state.arrowCurves,
              [key]: {
                ...currentCurves,
                [role]: curve,
              },
            },
          }
        }),

      getArrowCurve: (rotation, phase, role) => {
        const key = createRotationPhaseKey(rotation, phase)
        return get().arrowCurves[key]?.[role] ?? null
      },

      togglePlayerStatus: (rotation, phase, role, status) =>
        set((state) => {
          const key = createRotationPhaseKey(rotation, phase)
          const currentFlags = state.localStatusFlags[key] ?? {}
          const currentStatuses = currentFlags[role] ?? []

          const hasStatus = currentStatuses.includes(status)
          const newStatuses = hasStatus
            ? currentStatuses.filter((existing) => existing !== status)
            : [...currentStatuses, status]

          if (newStatuses.length === 0) {
            const { [role]: _, ...remainingRoles } = currentFlags
            if (Object.keys(remainingRoles).length === 0) {
              const { [key]: __, ...remainingKeys } = state.localStatusFlags
              return { localStatusFlags: remainingKeys }
            }
            return {
              localStatusFlags: {
                ...state.localStatusFlags,
                [key]: remainingRoles,
              },
            }
          }

          return {
            localStatusFlags: {
              ...state.localStatusFlags,
              [key]: {
                ...currentFlags,
                [role]: newStatuses,
              },
            },
          }
        }),

      setTokenTags: (rotation, phase, role, tags) =>
        set((state) => {
          const key = createRotationPhaseKey(rotation, phase)
          const currentFlags = state.localTagFlags[key] ?? {}

          if (tags.length === 0) {
            const { [role]: _, ...remainingRoles } = currentFlags
            if (Object.keys(remainingRoles).length === 0) {
              const { [key]: __, ...remainingKeys } = state.localTagFlags
              return { localTagFlags: remainingKeys }
            }
            return {
              localTagFlags: {
                ...state.localTagFlags,
                [key]: remainingRoles,
              },
            }
          }

          return {
            localTagFlags: {
              ...state.localTagFlags,
              [key]: {
                ...currentFlags,
                [role]: tags,
              },
            },
          }
        }),

      populateFromLayouts: (layouts) =>
        set(() => {
          const newLocalPositions: Record<string, PositionCoordinates> = {}
          const newLocalArrows: Record<string, ArrowPositions> = {}
          const newArrowCurves: Record<string, Partial<Record<Role, ArrowCurveConfig>>> = {}
          const newLocalStatusFlags: Record<string, Partial<Record<Role, PlayerStatus[]>>> = {}
          const newLocalTagFlags: Record<string, Partial<Record<Role, TokenTag[]>>> = {}
          const newAttackBallPositions: Record<string, Position> = {}
          const newLoadedTimestamps: Record<string, string | null> = {}

          for (const layout of layouts) {
            const key = createRotationPhaseKey(layout.rotation, layout.phase)

            if (layout.positions) {
              newLocalPositions[key] = normalizePositions(layout.positions)
            }

            newLoadedTimestamps[key] = layout.updated_at || null

            const flags = layout.flags as LayoutExtendedData | null | undefined
            if (flags) {
              if (flags.arrows) {
                newLocalArrows[key] = flags.arrows
              }
              if (flags.arrowCurves) {
                newArrowCurves[key] = flags.arrowCurves
              }
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
            layoutConflict: null,
          }
        }),

      resetToDefaults: (rotation, phase) =>
        set((state) => {
          const key = createRotationPhaseKey(rotation, phase)
          const { [key]: _, ...remainingPositions } = state.localPositions
          const { [key]: __, ...remainingArrows } = state.localArrows

          return {
            localPositions: remainingPositions,
            localArrows: remainingArrows,
            legalityViolations: {
              ...state.legalityViolations,
              [key]: [],
            },
          }
        }),

      clearLocalChanges: () =>
        set({
          localPositions: {},
          localArrows: {},
          legalityViolations: {},
        }),

      setLegalityViolations: (key, violations) =>
        set((state) => ({
          legalityViolations: {
            ...state.legalityViolations,
            [key]: violations,
          },
        })),

      setAttackBallPosition: (rotation, phase, position) =>
        set((state) => {
          const key = createRotationPhaseKey(rotation, phase)
          return {
            attackBallPositions: {
              ...state.attackBallPositions,
              [key]: position,
            },
          }
        }),

      clearAttackBallPosition: (rotation, phase) =>
        set((state) => {
          const key = createRotationPhaseKey(rotation, phase)
          const { [key]: _, ...remaining } = state.attackBallPositions
          return {
            attackBallPositions: remaining,
          }
        }),

      getLayoutLoadedTimestamp: (rotation, phase) => {
        const key = createRotationPhaseKey(rotation, phase)
        return get().layoutLoadedTimestamps[key] || null
      },

      setLayoutLoadedTimestamp: (rotation, phase, timestamp) =>
        set((state) => {
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
        set({ layoutConflict: null })
      },

      resolveConflictLoadTheirs: () =>
        set((state) => {
          if (!state.layoutConflict) return { layoutConflict: null }

          const key = createRotationPhaseKey(state.layoutConflict.rotation, state.layoutConflict.phase)

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
    }),
    {
      name: 'volley-whiteboard-data',
      storage: createSafeLocalStorage<WhiteboardPersistedState>(),
      skipHydration: true,
      partialize: (state) => ({
        localPositions: state.localPositions,
        localArrows: state.localArrows,
        arrowCurves: state.arrowCurves,
        localStatusFlags: state.localStatusFlags,
        localTagFlags: state.localTagFlags,
        attackBallPositions: state.attackBallPositions,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          useWhiteboardStore.setState({ isHydrated: true })
          return
        }

        if (state.localPositions) {
          const normalized: Record<string, PositionCoordinates> = {}
          for (const [key, positions] of Object.entries(state.localPositions)) {
            normalized[key] = normalizePositions(positions as PositionCoordinates)
          }
          state.localPositions = normalized
        }

        if (state.localArrows) {
          const normalized: Record<string, ArrowPositions> = {}
          for (const [key, arrows] of Object.entries(state.localArrows)) {
            normalized[key] = normalizeArrows(arrows)
          }
          state.localArrows = normalized
        }

        if (state.arrowCurves === undefined) {
          state.arrowCurves = {}
          const stateAny = state as unknown as Record<string, unknown>
          if (stateAny.arrowFlips) {
            delete stateAny.arrowFlips
          }
        }

        if (state.attackBallPositions === undefined) {
          state.attackBallPositions = {}
        }

        if (state.localStatusFlags === undefined) {
          state.localStatusFlags = {}
        }

        if (state.localTagFlags === undefined) {
          state.localTagFlags = {}
        }

        state.layoutLoadedTimestamps = {}
        state.layoutConflict = null
        state.legalityViolations = {}
        state.contextPlayer = null
        state.isHydrated = true
      },
    }
  )
)
