'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSafeLocalStorage } from '@/store/safeStorage'

export type SpringPreset = 'player' | 'snappy' | 'gentle' | 'bouncy' | 'stiff'

export type WhiteboardDialValues = {
  // Tokens
  tokenBaseSizePositionOnly: number
  tokenBaseSizePlayer: number
  tokenCornerRadius: number
  tokenDragScale: number
  tokenDragShadowBlur: number
  tokenDragShadowOpacity: number
  tokenDimmedOpacity: number
  tokenInnerHighlight: number
  tokenBorderWidth: number
  tokenSelectedBorderWidth: number

  // Arrows
  arrowheadSizeMultiplier: number
  arrowheadAngle: number
  arrowStartDotRadius: number
  arrowStartDotOpacity: number
  arrowheadOpacity: number
  arrowHitAreaWidth: number
  arrowCurveHandleRadius: number
  arrowCurveHandleHitRadius: number

  // Animation Timing
  arrowDrawInDuration: number
  arrowPeekRevealDuration: number
  arrowPeekRetractDuration: number
  tokenTransitionMs: number

  // Springs
  springPreset: SpringPreset
  springStiffness: number
  springDamping: number

  // Primed Glow
  glowColor: string
  glowPulseDuration: number
  glowMinOpacity: number
  glowMaxOpacity: number
  glowMinStrokeWidth: number
  glowMaxStrokeWidth: number
  glowOffset: number
}

export const DIAL_DEFAULTS: WhiteboardDialValues = {
  // Tokens
  tokenBaseSizePositionOnly: 56,
  tokenBaseSizePlayer: 48,
  tokenCornerRadius: 6,
  tokenDragScale: 1.06,
  tokenDragShadowBlur: 16,
  tokenDragShadowOpacity: 0.35,
  tokenDimmedOpacity: 0.4,
  tokenInnerHighlight: 0.2,
  tokenBorderWidth: 2,
  tokenSelectedBorderWidth: 3,

  // Arrows
  arrowheadSizeMultiplier: 2.5,
  arrowheadAngle: 30,
  arrowStartDotRadius: 3.5,
  arrowStartDotOpacity: 0.92,
  arrowheadOpacity: 1.0,
  arrowHitAreaWidth: 30,
  arrowCurveHandleRadius: 6,
  arrowCurveHandleHitRadius: 27,

  // Animation Timing
  arrowDrawInDuration: 300,
  arrowPeekRevealDuration: 200,
  arrowPeekRetractDuration: 140,
  tokenTransitionMs: 120,

  // Springs
  springPreset: 'player',
  springStiffness: 300,
  springDamping: 30,

  // Primed Glow
  glowColor: '#39ff14',
  glowPulseDuration: 1.0,
  glowMinOpacity: 0.6,
  glowMaxOpacity: 1.0,
  glowMinStrokeWidth: 3,
  glowMaxStrokeWidth: 5,
  glowOffset: 6,
}

type DialCategory = 'tokens' | 'arrows' | 'timing' | 'springs' | 'glow'

interface WhiteboardDialState extends WhiteboardDialValues {
  isHydrated: boolean
  set: <K extends keyof WhiteboardDialValues>(key: K, value: WhiteboardDialValues[K]) => void
  resetCategory: (category: DialCategory) => void
  resetAll: () => void
}

const CATEGORY_KEYS: Record<DialCategory, (keyof WhiteboardDialValues)[]> = {
  tokens: [
    'tokenBaseSizePositionOnly', 'tokenBaseSizePlayer', 'tokenCornerRadius',
    'tokenDragScale', 'tokenDragShadowBlur', 'tokenDragShadowOpacity',
    'tokenDimmedOpacity', 'tokenInnerHighlight', 'tokenBorderWidth', 'tokenSelectedBorderWidth',
  ],
  arrows: [
    'arrowheadSizeMultiplier', 'arrowheadAngle', 'arrowStartDotRadius',
    'arrowStartDotOpacity', 'arrowheadOpacity', 'arrowHitAreaWidth',
    'arrowCurveHandleRadius', 'arrowCurveHandleHitRadius',
  ],
  timing: [
    'arrowDrawInDuration', 'arrowPeekRevealDuration', 'arrowPeekRetractDuration',
    'tokenTransitionMs',
  ],
  springs: ['springPreset', 'springStiffness', 'springDamping'],
  glow: [
    'glowColor', 'glowPulseDuration', 'glowMinOpacity', 'glowMaxOpacity',
    'glowMinStrokeWidth', 'glowMaxStrokeWidth', 'glowOffset',
  ],
}

export const useWhiteboardDialStore = create<WhiteboardDialState>()(
  persist(
    (set) => ({
      ...DIAL_DEFAULTS,
      isHydrated: false,

      set: (key, value) => set({ [key]: value }),

      resetCategory: (category) => {
        const keys = CATEGORY_KEYS[category]
        const patch: Partial<WhiteboardDialValues> = {}
        for (const key of keys) {
          ;(patch as Record<string, unknown>)[key] = DIAL_DEFAULTS[key]
        }
        set(patch)
      },

      resetAll: () => set({ ...DIAL_DEFAULTS }),
    }),
    {
      name: 'volley-whiteboard-dials',
      storage: createSafeLocalStorage<WhiteboardDialValues>(),
      skipHydration: true,
      partialize: (state) => {
        const persisted: Record<string, unknown> = {}
        for (const key of Object.keys(DIAL_DEFAULTS) as (keyof WhiteboardDialValues)[]) {
          persisted[key] = state[key]
        }
        return persisted as WhiteboardDialValues
      },
      onRehydrateStorage: () => (state) => {
        if (!state) {
          useWhiteboardDialStore.setState({ isHydrated: true })
          return
        }
        // Fill missing keys with defaults
        for (const [key, defaultVal] of Object.entries(DIAL_DEFAULTS)) {
          if ((state as unknown as Record<string, unknown>)[key] === undefined) {
            ;(state as unknown as Record<string, unknown>)[key] = defaultVal
          }
        }
        state.isHydrated = true
      },
    }
  )
)
