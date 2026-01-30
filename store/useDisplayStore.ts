'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VerbosityPreset } from '@/lib/sim/types'

/**
 * Display settings store - controls visual appearance and display preferences.
 * These are user preferences that persist across sessions.
 */
interface DisplayState {
  // Display toggles
  showLibero: boolean         // Show libero in visualizations
  showPosition: boolean       // Show position labels on tokens
  showPlayer: boolean         // Show player names on tokens

  // Context
  isReceivingContext: boolean // true = viewing as receiving team

  // AI settings
  thoughtVerbosity: VerbosityPreset
  whiteboardInfluence: number // 0 = AI autonomous, 1 = follow whiteboard

  // Actions
  setShowLibero: (show: boolean) => void
  setShowPosition: (show: boolean) => void
  setShowPlayer: (show: boolean) => void
  setIsReceivingContext: (isReceiving: boolean) => void
  setThoughtVerbosity: (preset: VerbosityPreset) => void
  setWhiteboardInfluence: (influence: number) => void
}

export const useDisplayStore = create<DisplayState>()(
  persist(
    (set) => ({
      // Initial values
      showLibero: false,
      showPosition: true,
      showPlayer: false,
      isReceivingContext: true,
      thoughtVerbosity: 'standard' as VerbosityPreset,
      whiteboardInfluence: 0.3,

      // Actions
      setShowLibero: (show) => set({ showLibero: show }),
      setShowPosition: (show) => set({ showPosition: show }),
      setShowPlayer: (show) => set({ showPlayer: show }),
      setIsReceivingContext: (isReceiving) => set({ isReceivingContext: isReceiving }),
      setThoughtVerbosity: (preset) => set({ thoughtVerbosity: preset }),
      setWhiteboardInfluence: (influence) => set({ whiteboardInfluence: influence }),
    }),
    {
      name: 'volleyball-display-settings',
      partialize: (state) => ({
        showLibero: state.showLibero,
        showPosition: state.showPosition,
        showPlayer: state.showPlayer,
        isReceivingContext: state.isReceivingContext,
        thoughtVerbosity: state.thoughtVerbosity,
        whiteboardInfluence: state.whiteboardInfluence,
      }),
      onRehydrateStorage: () => (state) => {
        // Set defaults for new fields if missing
        if (state && state.isReceivingContext === undefined) {
          state.isReceivingContext = true
        }
        if (state && state.showLibero === undefined) {
          state.showLibero = false
        }
        if (state && state.thoughtVerbosity === undefined) {
          state.thoughtVerbosity = 'standard'
        }
        if (state && state.whiteboardInfluence === undefined) {
          state.whiteboardInfluence = 0.3
        }
      },
    }
  )
)
