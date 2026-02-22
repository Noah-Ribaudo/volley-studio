'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { migrateFromLegacyStore } from '@/store/migrateFromLegacyStore'
import { useWhiteboardStore } from '@/store/useWhiteboardStore'
import { useTeamStore } from '@/store/useTeamStore'
import { useNavigationStore } from '@/store/useNavigationStore'
import { useDisplayPrefsStore } from '@/store/useDisplayPrefsStore'
import { useUIPrefsStore } from '@/store/useUIPrefsStore'
import { useLearningStore } from '@/store/useLearningStore'
import { useThemeStore } from '@/store/useThemeStore'

if (typeof window !== 'undefined') {
  migrateFromLegacyStore()
}

const StoreBootstrapContext = createContext(false)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [isBootstrapped, setIsBootstrapped] = useState(false)

  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      try {
        migrateFromLegacyStore()

        await Promise.all([
          useWhiteboardStore.persist.rehydrate(),
          useTeamStore.persist.rehydrate(),
          useNavigationStore.persist.rehydrate(),
          useDisplayPrefsStore.persist.rehydrate(),
          useUIPrefsStore.persist.rehydrate(),
          useLearningStore.persist.rehydrate(),
          useThemeStore.persist.rehydrate(),
        ])
      } finally {
        if (active) {
          setIsBootstrapped(true)
        }
      }
    }

    void bootstrap()

    return () => {
      active = false
    }
  }, [])

  return <StoreBootstrapContext.Provider value={isBootstrapped}>{children}</StoreBootstrapContext.Provider>
}

export function useStoreBootstrapReady() {
  return useContext(StoreBootstrapContext)
}
