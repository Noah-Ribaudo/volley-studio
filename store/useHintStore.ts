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

  // Actions
  incrementDragCount: () => void
  markDeleteLearned: () => void
  incrementNextStepHintHoverCount: () => void
  markNextStepDragLearned: () => void
  markGameTimeOnboardingSeen: () => void

  // Computed helper
  shouldShowDeleteHint: () => boolean
  shouldShowNextStepHint: () => boolean
}

export const useHintStore = create<HintState>()(
  persist(
    (set, get) => ({
      arrowDragCount: 0,
      hasDeletedArrow: false,
      nextStepHintHoverCount: 0,
      hasLearnedNextStepDrag: false,
      hasSeenGameTimeOnboarding: false,

      incrementDragCount: () => set((state) => ({
        arrowDragCount: state.arrowDragCount + 1
      })),

      markDeleteLearned: () => set({ hasDeletedArrow: true }),

      incrementNextStepHintHoverCount: () => set((state) => ({
        nextStepHintHoverCount: state.nextStepHintHoverCount + 1
      })),

      markNextStepDragLearned: () => set({ hasLearnedNextStepDrag: true }),

      markGameTimeOnboardingSeen: () => set({ hasSeenGameTimeOnboarding: true }),

      shouldShowDeleteHint: () => {
        const { arrowDragCount, hasDeletedArrow } = get()
        return !hasDeletedArrow && arrowDragCount < 3
      },

      shouldShowNextStepHint: () => {
        const { nextStepHintHoverCount, hasLearnedNextStepDrag } = get()
        return !hasLearnedNextStepDrag && nextStepHintHoverCount < 3
      }
    }),
    {
      name: 'volleyball-hints',
      storage: createSafeLocalStorage<HintState>(),
    }
  )
)
