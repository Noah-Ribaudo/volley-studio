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

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createJSONStorage(() => getStorage()),
    }
  )
)











