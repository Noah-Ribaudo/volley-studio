'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ShaderId } from '@/lib/shaders'
import { createSafeLocalStorage } from '@/store/safeStorage'

interface DevThemeState {
  // Typography
  fontSans: string // font option ID
  fontDisplay: string // font option ID

  // Colors (oklch)
  accentHue: number // 0-360
  accentLightness: number // 40-90
  accentChroma: number // 0-0.4 (stored as 0-400, divide by 1000)

  // Shader param overrides
  shaderParams: Record<string, Record<string, number>>

  // Layout
  borderRadius: number // rem * 100 (e.g. 50 = 0.5rem)
  letterSpacing: number // em * 1000 (e.g. -20 = -0.02em)

  // Actions
  setFontSans: (id: string) => void
  setFontDisplay: (id: string) => void
  setAccentHue: (hue: number) => void
  setAccentLightness: (lightness: number) => void
  setAccentChroma: (chroma: number) => void
  setShaderParam: (shaderId: ShaderId, key: string, value: number) => void
  resetShaderParams: (shaderId: ShaderId) => void
  setBorderRadius: (value: number) => void
  setLetterSpacing: (value: number) => void
  resetAll: () => void
}

const DEFAULTS = {
  fontSans: 'barlow',
  fontDisplay: 'barlow-condensed',
  accentHue: 55,
  accentLightness: 70,
  accentChroma: 180, // 0.18 * 1000
  shaderParams: {} as Record<string, Record<string, number>>,
  borderRadius: 50, // 0.5rem
  letterSpacing: -20, // -0.02em
}

export const useDevThemeStore = create<DevThemeState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setFontSans: (id) => set({ fontSans: id }),
      setFontDisplay: (id) => set({ fontDisplay: id }),
      setAccentHue: (hue) => set({ accentHue: hue }),
      setAccentLightness: (lightness) => set({ accentLightness: lightness }),
      setAccentChroma: (chroma) => set({ accentChroma: chroma }),
      setShaderParam: (shaderId, key, value) =>
        set((state) => ({
          shaderParams: {
            ...state.shaderParams,
            [shaderId]: {
              ...(state.shaderParams[shaderId] ?? {}),
              [key]: value,
            },
          },
        })),
      resetShaderParams: (shaderId) =>
        set((state) => {
          const next = { ...state.shaderParams }
          delete next[shaderId]
          return { shaderParams: next }
        }),
      setBorderRadius: (value) => set({ borderRadius: value }),
      setLetterSpacing: (value) => set({ letterSpacing: value }),
      resetAll: () => set(DEFAULTS),
    }),
    {
      name: 'volley-dev-theme',
      storage: createSafeLocalStorage<DevThemeState>(),
    }
  )
)
