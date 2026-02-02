'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type InteractionMode = 'radial' | 'classic'

interface InteractionState {
  mode: InteractionMode
  setMode: (mode: InteractionMode) => void
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

// Get default mode based on device type
const getDefaultMode = (): InteractionMode => {
  if (typeof window === 'undefined') return 'classic'

  // Check if mobile/tablet
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  return isMobile ? 'radial' : 'classic'
}

export const useInteractionStore = create<InteractionState>()(
  persist(
    (set) => ({
      mode: getDefaultMode(),
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'volleyball-interaction-mode',
      storage: createJSONStorage(() => getStorage()),
    }
  )
)
