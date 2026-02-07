'use client'

import type { PersistStorage, StorageValue } from 'zustand/middleware'

/**
 * Creates a localStorage-backed persist storage that tolerates malformed JSON.
 * Corrupted values are dropped instead of crashing runtime hydration.
 */
export function createSafeLocalStorage<T>(): PersistStorage<T> {
  return {
    getItem: (name) => {
      if (typeof window === 'undefined') return null
      const raw = window.localStorage.getItem(name)
      if (!raw) return null
      try {
        return JSON.parse(raw) as StorageValue<T>
      } catch {
        window.localStorage.removeItem(name)
        return null
      }
    },
    setItem: (name, value) => {
      if (typeof window === 'undefined') return
      window.localStorage.setItem(name, JSON.stringify(value))
    },
    removeItem: (name) => {
      if (typeof window === 'undefined') return
      window.localStorage.removeItem(name)
    },
  }
}
