'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSafeLocalStorage } from '@/store/safeStorage'

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

  // Actions
  setShowLibero: (show: boolean) => void
  setShowPosition: (show: boolean) => void
  setShowPlayer: (show: boolean) => void
  setIsReceivingContext: (isReceiving: boolean) => void
}

export const useDisplayStore = create<DisplayState>()(
  persist(
    (set) => ({
      // Initial values
      showLibero: false,
      showPosition: true,
      showPlayer: false,
      isReceivingContext: true,

      // Actions
      setShowLibero: (show) => set({ showLibero: show }),
      setShowPosition: (show) => set({ showPosition: show }),
      setShowPlayer: (show) => set({ showPlayer: show }),
      setIsReceivingContext: (isReceiving) => set({ isReceivingContext: isReceiving }),
    }),
    {
      name: 'volleyball-display-settings',
      storage: createSafeLocalStorage<any>(),
      partialize: (state) => ({
        showLibero: state.showLibero,
        showPosition: state.showPosition,
        showPlayer: state.showPlayer,
        isReceivingContext: state.isReceivingContext,
      }),
      onRehydrateStorage: () => (state) => {
        // Set defaults for new fields if missing
        if (state && state.isReceivingContext === undefined) {
          state.isReceivingContext = true
        }
        if (state && state.showLibero === undefined) {
          state.showLibero = false
        }
      },
    }
  )
)
