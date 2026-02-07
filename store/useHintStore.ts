'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSafeLocalStorage } from '@/store/safeStorage'

interface HintState {
  arrowDragCount: number
  hasDeletedArrow: boolean
  hasSeenGameTimeOnboarding: boolean

  // Actions
  incrementDragCount: () => void
  markDeleteLearned: () => void
  markGameTimeOnboardingSeen: () => void

  // Computed helper
  shouldShowDeleteHint: () => boolean
}

export const useHintStore = create<HintState>()(
  persist(
    (set, get) => ({
      arrowDragCount: 0,
      hasDeletedArrow: false,
      hasSeenGameTimeOnboarding: false,

      incrementDragCount: () => set((state) => ({
        arrowDragCount: state.arrowDragCount + 1
      })),

      markDeleteLearned: () => set({ hasDeletedArrow: true }),

      markGameTimeOnboardingSeen: () => set({ hasSeenGameTimeOnboarding: true }),

      shouldShowDeleteHint: () => {
        const { arrowDragCount, hasDeletedArrow } = get()
        return !hasDeletedArrow && arrowDragCount < 3
      }
    }),
    {
      name: 'volleyball-hints',
      storage: createSafeLocalStorage<HintState>(),
    }
  )
)
