'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSafeLocalStorage } from '@/store/safeStorage'
import type { ShaderId } from '@/lib/shaders'

export type UIPrefsPersistedState = {
  showLearnTab: boolean
  debugHitboxes: boolean
  showMotionDebugPanel: boolean
  showPrintFeature: boolean
  sidebarProfileInFooter: boolean
  courtSetupSurfaceVariant: 'popover' | 'panel'
  useUnifiedTeamAssignment: boolean
  navMode: 'sidebar' | 'header'
  uiMode: 'normal' | 'minimal'
  minimalContrast: 'soft' | 'high'
  minimalAllowAccent: boolean
  minimalDenseLayout: boolean
  backgroundShader: ShaderId
  backgroundOpacity: number
}

interface UIPrefsState {
  showLearnTab: boolean
  debugHitboxes: boolean
  showMotionDebugPanel: boolean
  showPrintFeature: boolean
  sidebarProfileInFooter: boolean
  courtSetupSurfaceVariant: 'popover' | 'panel'
  useUnifiedTeamAssignment: boolean
  navMode: 'sidebar' | 'header'
  uiMode: 'normal' | 'minimal'
  minimalContrast: 'soft' | 'high'
  minimalAllowAccent: boolean
  minimalDenseLayout: boolean
  backgroundShader: ShaderId
  backgroundOpacity: number
  isHydrated: boolean

  setShowLearnTab: (show: boolean) => void
  setDebugHitboxes: (show: boolean) => void
  setShowMotionDebugPanel: (show: boolean) => void
  setShowPrintFeature: (show: boolean) => void
  setSidebarProfileInFooter: (show: boolean) => void
  setCourtSetupSurfaceVariant: (variant: 'popover' | 'panel') => void
  setUseUnifiedTeamAssignment: (use: boolean) => void
  setNavMode: (mode: 'sidebar' | 'header') => void
  setUiMode: (mode: 'normal' | 'minimal') => void
  setMinimalContrast: (contrast: 'soft' | 'high') => void
  setMinimalAllowAccent: (allow: boolean) => void
  setMinimalDenseLayout: (dense: boolean) => void
  setBackgroundShader: (shader: ShaderId) => void
  setBackgroundOpacity: (opacity: number) => void
}

export const useUIPrefsStore = create<UIPrefsState>()(
  persist(
    (set) => ({
      showLearnTab: false,
      debugHitboxes: false,
      showMotionDebugPanel: false,
      showPrintFeature: false,
      sidebarProfileInFooter: false,
      courtSetupSurfaceVariant: 'popover',
      useUnifiedTeamAssignment: false,
      navMode: 'header',
      uiMode: 'normal',
      minimalContrast: 'soft',
      minimalAllowAccent: true,
      minimalDenseLayout: false,
      backgroundShader: 'none',
      backgroundOpacity: 95,
      isHydrated: false,

      setShowLearnTab: (show) => set({ showLearnTab: show }),
      setDebugHitboxes: (show) => set({ debugHitboxes: show }),
      setShowMotionDebugPanel: (show) => set({ showMotionDebugPanel: show }),
      setShowPrintFeature: (show) => set({ showPrintFeature: show }),
      setSidebarProfileInFooter: (show) => set({ sidebarProfileInFooter: show }),
      setCourtSetupSurfaceVariant: (variant) => set({ courtSetupSurfaceVariant: variant }),
      setUseUnifiedTeamAssignment: (use) => set({ useUnifiedTeamAssignment: use }),
      setNavMode: (mode) => set({ navMode: mode }),
      setUiMode: (mode) => set({ uiMode: mode }),
      setMinimalContrast: (contrast) => set({ minimalContrast: contrast }),
      setMinimalAllowAccent: (allow) => set({ minimalAllowAccent: allow }),
      setMinimalDenseLayout: (dense) => set({ minimalDenseLayout: dense }),
      setBackgroundShader: (shader) => set({ backgroundShader: shader }),
      setBackgroundOpacity: (opacity) => set({ backgroundOpacity: opacity }),
    }),
    {
      name: 'volley-ui-prefs',
      storage: createSafeLocalStorage<UIPrefsPersistedState>(),
      skipHydration: true,
      partialize: (state) => ({
        showLearnTab: state.showLearnTab,
        debugHitboxes: state.debugHitboxes,
        showMotionDebugPanel: state.showMotionDebugPanel,
        showPrintFeature: state.showPrintFeature,
        sidebarProfileInFooter: state.sidebarProfileInFooter,
        courtSetupSurfaceVariant: state.courtSetupSurfaceVariant,
        useUnifiedTeamAssignment: state.useUnifiedTeamAssignment,
        navMode: state.navMode,
        uiMode: state.uiMode,
        minimalContrast: state.minimalContrast,
        minimalAllowAccent: state.minimalAllowAccent,
        minimalDenseLayout: state.minimalDenseLayout,
        backgroundShader: state.backgroundShader,
        backgroundOpacity: state.backgroundOpacity,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          useUIPrefsStore.setState({ isHydrated: true })
          return
        }

        if (state.showLearnTab === undefined) state.showLearnTab = false
        if (state.debugHitboxes === undefined) state.debugHitboxes = false
        if (state.showMotionDebugPanel === undefined) state.showMotionDebugPanel = false
        if (state.showPrintFeature === undefined) state.showPrintFeature = false
        if (state.sidebarProfileInFooter === undefined) state.sidebarProfileInFooter = false
        if (state.courtSetupSurfaceVariant === undefined) state.courtSetupSurfaceVariant = 'popover'
        if (state.useUnifiedTeamAssignment === undefined) state.useUnifiedTeamAssignment = false
        if (state.navMode === undefined) state.navMode = 'header'
        if (state.uiMode === undefined) state.uiMode = 'normal'
        if (state.minimalContrast === undefined) state.minimalContrast = 'soft'
        if (state.minimalAllowAccent === undefined) state.minimalAllowAccent = true
        if (state.minimalDenseLayout === undefined) state.minimalDenseLayout = false
        if (state.backgroundShader === undefined) state.backgroundShader = 'none'
        if (state.backgroundOpacity === undefined) state.backgroundOpacity = 95

        state.isHydrated = true
      },
    }
  )
)
