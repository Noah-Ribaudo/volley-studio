'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import { DEFAULT_THEME, THEME_STORAGE_KEY, ThemeId } from '@/lib/themes'

interface ThemeState {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
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
      storage: createJSONStorage(() => getStorage()),
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
