'use client'

import { useStoreBootstrapReady } from '@/store/StoreProvider'
import { useWhiteboardStore } from '@/store/useWhiteboardStore'
import { useTeamStore } from '@/store/useTeamStore'
import { useNavigationStore } from '@/store/useNavigationStore'
import { useDisplayPrefsStore } from '@/store/useDisplayPrefsStore'
import { useUIPrefsStore } from '@/store/useUIPrefsStore'
import { useLearningStore } from '@/store/useLearningStore'
import { useThemeStore } from '@/store/useThemeStore'

export function useStoresHydrated() {
  const isBootstrapped = useStoreBootstrapReady()
  const whiteboardHydrated = useWhiteboardStore((state) => state.isHydrated)
  const teamHydrated = useTeamStore((state) => state.isHydrated)
  const navigationHydrated = useNavigationStore((state) => state.isHydrated)
  const displayPrefsHydrated = useDisplayPrefsStore((state) => state.isHydrated)
  const uiPrefsHydrated = useUIPrefsStore((state) => state.isHydrated)
  const learningHydrated = useLearningStore((state) => state.isHydrated)
  const themeHydrated = useThemeStore((state) => state.isHydrated)

  return (
    isBootstrapped &&
    whiteboardHydrated &&
    teamHydrated &&
    navigationHydrated &&
    displayPrefsHydrated &&
    uiPrefsHydrated &&
    learningHydrated &&
    themeHydrated
  )
}

export function useSettingsStoresHydrated() {
  const isBootstrapped = useStoreBootstrapReady()
  const navigationHydrated = useNavigationStore((state) => state.isHydrated)
  const displayPrefsHydrated = useDisplayPrefsStore((state) => state.isHydrated)
  const uiPrefsHydrated = useUIPrefsStore((state) => state.isHydrated)
  const learningHydrated = useLearningStore((state) => state.isHydrated)
  const themeHydrated = useThemeStore((state) => state.isHydrated)

  return (
    isBootstrapped &&
    navigationHydrated &&
    displayPrefsHydrated &&
    uiPrefsHydrated &&
    learningHydrated &&
    themeHydrated
  )
}
