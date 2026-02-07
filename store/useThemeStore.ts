'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { DEFAULT_THEME, THEME_STORAGE_KEY, ThemeId } from '@/lib/themes'
import { createSafeLocalStorage } from '@/store/safeStorage'

interface ThemeState {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
}

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

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createSafeLocalStorage<ThemeState>(),
      // Migrate stored state when hydrating
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          const migratedTheme = migrateTheme(state.theme)
          if (migratedTheme !== state.theme) {
            state.setTheme(migratedTheme)
          }
        }
      },
    }
  )
)
