'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSafeLocalStorage } from '@/store/safeStorage'

export type DisplayPrefsPersistedState = {
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

interface DisplayPrefsState {
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
  isHydrated: boolean

  setIsReceivingContext: (isReceiving: boolean) => void
  setShowLibero: (show: boolean) => void
  setShowPosition: (show: boolean) => void
  setShowPlayer: (show: boolean) => void
  setShowNumber: (show: boolean) => void
  setCircleTokens: (circle: boolean) => void
  setTokenSize: (size: 'big' | 'small') => void
  setHideAwayTeam: (hide: boolean) => void
  setAwayTeamHidePercent: (percent: number) => void
  setFullStatusLabels: (full: boolean) => void
}

export const useDisplayPrefsStore = create<DisplayPrefsState>()(
  persist(
    (set) => ({
      isReceivingContext: true,
      showLibero: false,
      showPosition: true,
      showPlayer: false,
      showNumber: true,
      circleTokens: true,
      tokenSize: 'big',
      hideAwayTeam: true,
      awayTeamHidePercent: 40,
      fullStatusLabels: true,
      isHydrated: false,

      setIsReceivingContext: (isReceiving) => set({ isReceivingContext: isReceiving }),
      setShowLibero: (show) => set({ showLibero: show }),
      setShowPosition: (show) => set({ showPosition: show }),
      setShowPlayer: (show) => set({ showPlayer: show }),
      setShowNumber: (show) => set({ showNumber: show }),
      setCircleTokens: (circle) => set({ circleTokens: circle }),
      setTokenSize: (size) => set({ tokenSize: size }),
      setHideAwayTeam: (hide) => set({ hideAwayTeam: hide }),
      setAwayTeamHidePercent: (percent) => set({ awayTeamHidePercent: Math.max(0, Math.min(50, percent)) }),
      setFullStatusLabels: (full) => set({ fullStatusLabels: full }),
    }),
    {
      name: 'volley-display-prefs',
      storage: createSafeLocalStorage<DisplayPrefsPersistedState>(),
      skipHydration: true,
      partialize: (state) => ({
        isReceivingContext: state.isReceivingContext,
        showLibero: state.showLibero,
        showPosition: state.showPosition,
        showPlayer: state.showPlayer,
        showNumber: state.showNumber,
        circleTokens: state.circleTokens,
        tokenSize: state.tokenSize,
        hideAwayTeam: state.hideAwayTeam,
        awayTeamHidePercent: state.awayTeamHidePercent,
        fullStatusLabels: state.fullStatusLabels,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          useDisplayPrefsStore.setState({ isHydrated: true })
          return
        }

        if (state.isReceivingContext === undefined) state.isReceivingContext = true
        if (state.showLibero === undefined) state.showLibero = false
        if (state.showPosition === undefined) state.showPosition = true
        if (state.showPlayer === undefined) state.showPlayer = false
        if (state.showNumber === undefined) state.showNumber = true
        if (state.circleTokens === undefined) state.circleTokens = true
        if (state.tokenSize === undefined) state.tokenSize = 'big'
        if (state.hideAwayTeam === undefined) state.hideAwayTeam = true
        if (state.awayTeamHidePercent === undefined) state.awayTeamHidePercent = 40
        if (state.fullStatusLabels === undefined) state.fullStatusLabels = true

        state.awayTeamHidePercent = Math.max(0, Math.min(50, state.awayTeamHidePercent))
        state.isHydrated = true
      },
    }
  )
)
