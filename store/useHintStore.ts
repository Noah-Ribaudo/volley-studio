'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface HintState {
  arrowDragCount: number
  hasDeletedArrow: boolean

  // Actions
  incrementDragCount: () => void
  markDeleteLearned: () => void

  // Computed helper
  shouldShowDeleteHint: () => boolean
}

const getStorage = () => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
  }
  return window.localStorage
}

export const useHintStore = create<HintState>()(
  persist(
    (set, get) => ({
      arrowDragCount: 0,
      hasDeletedArrow: false,

      incrementDragCount: () => set((state) => ({
        arrowDragCount: state.arrowDragCount + 1
      })),

      markDeleteLearned: () => set({ hasDeletedArrow: true }),

      shouldShowDeleteHint: () => {
        const { arrowDragCount, hasDeletedArrow } = get()
        return !hasDeletedArrow && arrowDragCount < 3
      }
    }),
    {
      name: 'volleyball-hints',
      storage: createJSONStorage(() => getStorage()),
    }
  )
)
