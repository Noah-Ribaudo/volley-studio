'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  DEFAULT_AUTO_TIMEZONE,
  DEFAULT_THEME,
  DEFAULT_THEME_PREFERENCE,
  THEME_STORAGE_KEY,
  ThemeId,
  ThemePreference,
  resolveThemeByTimeZone,
} from '@/lib/themes'
import { createSafeLocalStorage } from '@/store/safeStorage'

interface ThemeState {
  theme: ThemeId
  themePreference: ThemePreference
  autoTimeZone: string
  isHydrated: boolean
  setTheme: (theme: ThemeId) => void
  setThemePreference: (themePreference: ThemePreference) => void
  setResolvedTheme: (theme: ThemeId) => void
  setAutoTimeZone: (timeZone: string) => void
}

type PersistedThemeState = Pick<ThemeState, 'theme' | 'themePreference' | 'autoTimeZone'>

// Migrate old theme values to new ones
const migrateTheme = (storedTheme: string): ThemeId => {
  // Map old themes to their closest new equivalent
  const migrations: Record<string, ThemeId> = {
    'white': 'light',
    'pink': 'light',
    'dark': 'dark',
    'blue': 'dark',
    'green': 'dark',
    'light': 'light',
  }
  return migrations[storedTheme] ?? DEFAULT_THEME
}

const migratePreference = (storedTheme: string): ThemePreference => {
  if (storedTheme === 'auto') return 'auto'
  return migrateTheme(storedTheme)
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: resolveThemeByTimeZone(DEFAULT_AUTO_TIMEZONE),
      themePreference: DEFAULT_THEME_PREFERENCE,
      autoTimeZone: DEFAULT_AUTO_TIMEZONE,
      isHydrated: false,
      setTheme: (theme) => set({
        theme,
        themePreference: theme,
      }),
      setThemePreference: (themePreference) => set((state) => {
        if (themePreference === 'auto') {
          return {
            themePreference,
          }
        }
        if (state.theme === themePreference && state.themePreference === themePreference) {
          return state
        }
        return {
          themePreference,
          theme: themePreference,
        }
      }),
      setResolvedTheme: (theme) => set((state) => {
        if (state.theme === theme) return state
        return { theme }
      }),
      setAutoTimeZone: (autoTimeZone) => set((state) => {
        if (!autoTimeZone || state.autoTimeZone === autoTimeZone) return state
        return { autoTimeZone }
      }),
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createSafeLocalStorage<PersistedThemeState>(),
      skipHydration: true,
      partialize: (state) => ({
        theme: state.theme,
        themePreference: state.themePreference,
        autoTimeZone: state.autoTimeZone,
      }),
      // Migrate stored state when hydrating
      onRehydrateStorage: () => (state) => {
        if (!state) {
          useThemeStore.setState({ isHydrated: true })
          return
        }

        if (state.theme) {
          state.theme = migrateTheme(state.theme)
        } else {
          state.theme = resolveThemeByTimeZone(DEFAULT_AUTO_TIMEZONE)
        }

        if (!state.themePreference) {
          state.themePreference = migratePreference(state.theme)
        } else {
          state.themePreference = migratePreference(state.themePreference)
        }

        if (!state.autoTimeZone) {
          state.autoTimeZone = DEFAULT_AUTO_TIMEZONE
        }

        if (state.themePreference === 'auto') {
          state.theme = resolveThemeByTimeZone(state.autoTimeZone)
        }

        state.isHydrated = true
      },
    }
  )
)
