'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSafeLocalStorage } from '@/store/safeStorage'

interface HintState {
  arrowDragCount: number
  hasDeletedArrow: boolean
  nextStepHintHoverCount: number
  hasLearnedNextStepDrag: boolean
  hasSeenGameTimeOnboarding: boolean
  hasCompletedFirstDrag: boolean
  hasLearnedArrowDrag: boolean
  hasNavigatedPhase: boolean

  // Actions
  incrementDragCount: () => void
  markDeleteLearned: () => void
  incrementNextStepHintHoverCount: () => void
  markNextStepDragLearned: () => void
  markGameTimeOnboardingSeen: () => void
  markFirstDragCompleted: () => void
  markArrowDragLearned: () => void
  markPhaseNavigated: () => void

  // Computed helper
  shouldShowDeleteHint: () => boolean
  shouldShowNextStepHint: () => boolean
  shouldShowFirstDragHint: () => boolean
  shouldShowArrowDragHint: () => boolean
  shouldShowPhaseNavigationHint: () => boolean
}

export const useHintStore = create<HintState>()(
  persist(
    (set, get) => ({
      arrowDragCount: 0,
      hasDeletedArrow: false,
      nextStepHintHoverCount: 0,
      hasLearnedNextStepDrag: false,
      hasSeenGameTimeOnboarding: false,
      hasCompletedFirstDrag: false,
      hasLearnedArrowDrag: false,
      hasNavigatedPhase: false,

      incrementDragCount: () => set((state) => ({
        arrowDragCount: state.arrowDragCount + 1
      })),

      markDeleteLearned: () => set({ hasDeletedArrow: true }),

      incrementNextStepHintHoverCount: () => set((state) => ({
        nextStepHintHoverCount: state.nextStepHintHoverCount + 1
      })),

      markNextStepDragLearned: () => set({ hasLearnedNextStepDrag: true }),

      markGameTimeOnboardingSeen: () => set({ hasSeenGameTimeOnboarding: true }),

      markFirstDragCompleted: () => set({ hasCompletedFirstDrag: true }),

      markArrowDragLearned: () => set({ hasLearnedArrowDrag: true }),

      markPhaseNavigated: () => set({ hasNavigatedPhase: true }),

      shouldShowDeleteHint: () => {
        const { arrowDragCount, hasDeletedArrow } = get()
        return !hasDeletedArrow && arrowDragCount < 3
      },

      shouldShowNextStepHint: () => {
        const { nextStepHintHoverCount, hasLearnedNextStepDrag } = get()
        return !hasLearnedNextStepDrag && nextStepHintHoverCount < 3
      },

      shouldShowFirstDragHint: () => {
        const { hasCompletedFirstDrag } = get()
        return !hasCompletedFirstDrag
      },

      shouldShowArrowDragHint: () => {
        const { hasCompletedFirstDrag, hasLearnedArrowDrag } = get()
        return hasCompletedFirstDrag && !hasLearnedArrowDrag
      },

      shouldShowPhaseNavigationHint: () => {
        const { hasCompletedFirstDrag, hasLearnedArrowDrag, hasNavigatedPhase } = get()
        return hasCompletedFirstDrag && hasLearnedArrowDrag && !hasNavigatedPhase
      },
    }),
    {
      name: 'volleyball-hints',
      storage: createSafeLocalStorage<HintState>(),
    }
  )
)
