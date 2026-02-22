'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSafeLocalStorage } from '@/store/safeStorage'
import {
  type Role,
  type Rotation,
  type Phase,
  type LegacyPhase,
  type RallyPhase,
  PHASES,
  DEFAULT_VISIBLE_PHASES,
  DEFAULT_PHASE_ORDER,
  isRallyPhase,
} from '@/lib/types'
import { DEFAULT_BASE_ORDER, normalizeBaseOrder } from '@/lib/rotations'
import { getVisibleOrderedRallyPhases } from '@/lib/rallyPhaseOrder'

export type NavigationPersistedState = {
  baseOrder: Role[]
  highlightedRole: Role | null
}

interface NavigationState {
  currentRotation: Rotation
  currentPhase: Phase
  highlightedRole: Role | null
  showRotationRules: boolean
  baseOrder: Role[]
  visiblePhases: Set<RallyPhase>
  phaseOrder: RallyPhase[]
  isPreviewingMovement: boolean
  playAnimationTrigger: number
  isHydrated: boolean

  setRotation: (rotation: Rotation) => void
  setPhase: (phase: Phase) => void
  nextRotation: () => void
  prevRotation: () => void
  nextPhase: () => void
  prevPhase: () => void
  setBaseOrder: (order: Role[]) => void
  resetBaseOrder: () => void
  setHighlightedRole: (role: Role | null) => void
  toggleRotationRules: () => void
  togglePhaseVisibility: (phase: RallyPhase) => void
  setPhaseOrder: (order: RallyPhase[]) => void
  setPreviewingMovement: (preview: boolean) => void
  triggerPlayAnimation: () => void
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      currentRotation: 1,
      currentPhase: 'PRE_SERVE' as Phase,
      highlightedRole: null,
      showRotationRules: false,
      baseOrder: [...DEFAULT_BASE_ORDER],
      visiblePhases: new Set(DEFAULT_VISIBLE_PHASES),
      phaseOrder: [...DEFAULT_PHASE_ORDER],
      isPreviewingMovement: false,
      playAnimationTrigger: 0,
      isHydrated: false,

      setRotation: (rotation) => set({ currentRotation: rotation }),
      setPhase: (phase) => set({ currentPhase: phase }),

      nextRotation: () =>
        set((state) => ({
          currentRotation: state.currentRotation === 6 ? 1 : ((state.currentRotation + 1) as Rotation),
        })),

      prevRotation: () =>
        set((state) => ({
          currentRotation: state.currentRotation === 1 ? 6 : ((state.currentRotation - 1) as Rotation),
        })),

      nextPhase: () =>
        set((state) => {
          if (isRallyPhase(state.currentPhase)) {
            const orderedVisiblePhases = getVisibleOrderedRallyPhases(state.phaseOrder, state.visiblePhases)
            if (orderedVisiblePhases.length === 0) return {}

            const currentIndex = orderedVisiblePhases.indexOf(state.currentPhase)
            if (currentIndex === -1) {
              return { currentPhase: orderedVisiblePhases[0] as Phase }
            }

            const nextIndex = (currentIndex + 1) % orderedVisiblePhases.length
            const didWrap = nextIndex === 0 && orderedVisiblePhases.length > 1
            const nextVisiblePhase = orderedVisiblePhases[nextIndex]

            if (didWrap) {
              return {
                currentPhase: nextVisiblePhase as Phase,
                currentRotation: state.currentRotation === 6 ? 1 : ((state.currentRotation + 1) as Rotation),
              }
            }

            return { currentPhase: nextVisiblePhase as Phase }
          }

          const currentPhaseIndex = PHASES.indexOf(state.currentPhase as LegacyPhase)
          if (currentPhaseIndex === PHASES.length - 1) {
            return {
              currentPhase: PHASES[0],
              currentRotation: state.currentRotation === 6 ? 1 : ((state.currentRotation + 1) as Rotation),
            }
          }

          return {
            currentPhase: PHASES[currentPhaseIndex + 1],
          }
        }),

      prevPhase: () =>
        set((state) => {
          if (isRallyPhase(state.currentPhase)) {
            const orderedVisiblePhases = getVisibleOrderedRallyPhases(state.phaseOrder, state.visiblePhases)
            if (orderedVisiblePhases.length === 0) return {}

            const currentIndex = orderedVisiblePhases.indexOf(state.currentPhase)
            if (currentIndex === -1) {
              return { currentPhase: orderedVisiblePhases[orderedVisiblePhases.length - 1] as Phase }
            }

            const prevIndex = (currentIndex - 1 + orderedVisiblePhases.length) % orderedVisiblePhases.length
            const didWrap = currentIndex === 0 && orderedVisiblePhases.length > 1
            const prevVisiblePhase = orderedVisiblePhases[prevIndex]

            if (didWrap) {
              return {
                currentPhase: prevVisiblePhase as Phase,
                currentRotation: state.currentRotation === 1 ? 6 : ((state.currentRotation - 1) as Rotation),
              }
            }

            return { currentPhase: prevVisiblePhase as Phase }
          }

          const currentPhaseIndex = PHASES.indexOf(state.currentPhase as LegacyPhase)
          if (currentPhaseIndex === 0) {
            return {
              currentPhase: PHASES[PHASES.length - 1],
              currentRotation: state.currentRotation === 1 ? 6 : ((state.currentRotation - 1) as Rotation),
            }
          }

          return {
            currentPhase: PHASES[currentPhaseIndex - 1],
          }
        }),

      setBaseOrder: (order) =>
        set(() => ({
          baseOrder: normalizeBaseOrder(order ?? DEFAULT_BASE_ORDER),
        })),

      resetBaseOrder: () =>
        set(() => ({
          baseOrder: [...DEFAULT_BASE_ORDER],
        })),

      setHighlightedRole: (role) => set({ highlightedRole: role }),

      toggleRotationRules: () =>
        set((state) => ({
          showRotationRules: !state.showRotationRules,
        })),

      // Whiteboard phases are fixed and cannot be customized.
      togglePhaseVisibility: () =>
        set({
          visiblePhases: new Set(DEFAULT_VISIBLE_PHASES),
          phaseOrder: [...DEFAULT_PHASE_ORDER],
        }),

      setPhaseOrder: () =>
        set({
          visiblePhases: new Set(DEFAULT_VISIBLE_PHASES),
          phaseOrder: [...DEFAULT_PHASE_ORDER],
        }),

      setPreviewingMovement: (preview) => set({ isPreviewingMovement: preview }),
      triggerPlayAnimation: () => set((state) => ({ playAnimationTrigger: state.playAnimationTrigger + 1 })),
    }),
    {
      name: 'volley-navigation',
      storage: createSafeLocalStorage<NavigationPersistedState>(),
      skipHydration: true,
      partialize: (state) => ({
        baseOrder: state.baseOrder,
        highlightedRole: state.highlightedRole,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          useNavigationStore.setState({ isHydrated: true })
          return
        }

        state.visiblePhases = new Set(DEFAULT_VISIBLE_PHASES)
        state.phaseOrder = [...DEFAULT_PHASE_ORDER]
        if (isRallyPhase(state.currentPhase) && !DEFAULT_PHASE_ORDER.includes(state.currentPhase)) {
          state.currentPhase = DEFAULT_PHASE_ORDER[0]
        }

        if (!Array.isArray(state.baseOrder)) {
          state.baseOrder = [...DEFAULT_BASE_ORDER]
        } else {
          state.baseOrder = normalizeBaseOrder(state.baseOrder)
        }

        state.isHydrated = true
      },
    }
  )
)
