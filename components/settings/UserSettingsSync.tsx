'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useDisplayPrefsStore } from '@/store/useDisplayPrefsStore'
import { useUIPrefsStore } from '@/store/useUIPrefsStore'
import { useNavigationStore } from '@/store/useNavigationStore'
import { useLearningStore } from '@/store/useLearningStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useSettingsStoresHydrated } from '@/store/hydration'
import { applyUserSettingsFromServer } from '@/store/transactions'
import {
  DEFAULT_PHASE_ORDER,
  DEFAULT_VISIBLE_PHASES,
  type RallyPhase,
  type Role,
} from '@/lib/types'
import type { LearningPanelPosition } from '@/lib/learning/types'
import { SHADER_OPTIONS, type ShaderId } from '@/lib/shaders'
import type { ThemePreference } from '@/lib/themes'

type NavMode = 'sidebar' | 'header'
type TokenSize = 'big' | 'small'

type UserSettingsPayload = {
  themePreference: ThemePreference
  showPosition: boolean
  showPlayer: boolean
  showNumber: boolean
  showLibero: boolean
  circleTokens: boolean
  hideAwayTeam: boolean
  fullStatusLabels: boolean
  showLearnTab: boolean
  debugHitboxes: boolean
  isReceivingContext: boolean
  tokenSize: TokenSize
  navMode: NavMode
  backgroundShader: ShaderId
  backgroundOpacity: number
  awayTeamHidePercent: number
  visiblePhases: RallyPhase[]
  phaseOrder: RallyPhase[]
  highlightedRole?: Role
  learningPanelPosition: LearningPanelPosition
}

type UserSettingsInput = Partial<Omit<UserSettingsPayload, 'visiblePhases' | 'phaseOrder'>> & {
  visiblePhases?: string[]
  phaseOrder?: string[]
}

const VALID_ROLES: Role[] = ['S', 'OH1', 'OH2', 'MB1', 'MB2', 'OPP', 'L']
const VALID_LEARNING_PANEL_POSITIONS: LearningPanelPosition[] = ['floating', 'bottom', 'side', 'inline']
const VALID_SHADER_IDS = new Set(SHADER_OPTIONS.map((option) => option.id))

function normalizePhaseOrder(_order: string[] | undefined): RallyPhase[] {
  return [...DEFAULT_PHASE_ORDER]
}

function normalizeVisiblePhases(_phases: string[] | undefined): RallyPhase[] {
  return [...DEFAULT_VISIBLE_PHASES]
}

function normalizePayload(raw: UserSettingsInput): UserSettingsPayload {
  const phaseOrder = normalizePhaseOrder(raw.phaseOrder)
  const visiblePhases = normalizeVisiblePhases(raw.visiblePhases)
  const highlightedRole = raw.highlightedRole && VALID_ROLES.includes(raw.highlightedRole)
    ? raw.highlightedRole
    : undefined
  const learningPanelPosition = raw.learningPanelPosition && VALID_LEARNING_PANEL_POSITIONS.includes(raw.learningPanelPosition)
    ? raw.learningPanelPosition
    : 'floating'
  const backgroundShader = raw.backgroundShader && VALID_SHADER_IDS.has(raw.backgroundShader)
    ? raw.backgroundShader
    : 'grain-gradient'
  const themePreference: ThemePreference = raw.themePreference === 'light' || raw.themePreference === 'dark' || raw.themePreference === 'auto'
    ? raw.themePreference
    : 'auto'

  return {
    themePreference,
    showPosition: raw.showPosition ?? true,
    showPlayer: raw.showPlayer ?? false,
    showNumber: raw.showNumber ?? true,
    showLibero: raw.showLibero ?? false,
    circleTokens: raw.circleTokens ?? true,
    hideAwayTeam: raw.hideAwayTeam ?? true,
    fullStatusLabels: raw.fullStatusLabels ?? true,
    showLearnTab: raw.showLearnTab ?? false,
    debugHitboxes: raw.debugHitboxes ?? false,
    isReceivingContext: raw.isReceivingContext ?? true,
    tokenSize: raw.tokenSize ?? 'big',
    navMode: raw.navMode ?? 'header',
    backgroundShader,
    backgroundOpacity: Math.max(50, Math.min(100, raw.backgroundOpacity ?? 95)),
    awayTeamHidePercent: Math.max(20, Math.min(50, raw.awayTeamHidePercent ?? 40)),
    visiblePhases,
    phaseOrder,
    highlightedRole,
    learningPanelPosition,
  }
}

function payloadSignature(payload: UserSettingsPayload): string {
  return JSON.stringify({
    ...payload,
    visiblePhases: [...payload.visiblePhases],
    phaseOrder: [...payload.phaseOrder],
  })
}

export function UserSettingsSync() {
  const { isAuthenticated } = useConvexAuth()
  const isHydrated = useSettingsStoresHydrated()
  const remoteSettings = useQuery(api.userSettings.getMine, isAuthenticated ? {} : 'skip')
  const upsertSettings = useMutation(api.userSettings.upsertMine)

  const showPosition = useDisplayPrefsStore((state) => state.showPosition)
  const showPlayer = useDisplayPrefsStore((state) => state.showPlayer)
  const showNumber = useDisplayPrefsStore((state) => state.showNumber)
  const showLibero = useDisplayPrefsStore((state) => state.showLibero)
  const circleTokens = useDisplayPrefsStore((state) => state.circleTokens)
  const hideAwayTeam = useDisplayPrefsStore((state) => state.hideAwayTeam)
  const fullStatusLabels = useDisplayPrefsStore((state) => state.fullStatusLabels)
  const isReceivingContext = useDisplayPrefsStore((state) => state.isReceivingContext)
  const tokenSize = useDisplayPrefsStore((state) => state.tokenSize)
  const awayTeamHidePercent = useDisplayPrefsStore((state) => state.awayTeamHidePercent)

  const showLearnTab = useUIPrefsStore((state) => state.showLearnTab)
  const debugHitboxes = useUIPrefsStore((state) => state.debugHitboxes)
  const navMode = useUIPrefsStore((state) => state.navMode)
  const backgroundShader = useUIPrefsStore((state) => state.backgroundShader)
  const backgroundOpacity = useUIPrefsStore((state) => state.backgroundOpacity)

  const visiblePhases = useNavigationStore((state) => state.visiblePhases)
  const phaseOrder = useNavigationStore((state) => state.phaseOrder)
  const highlightedRole = useNavigationStore((state) => state.highlightedRole)

  const learningPanelPosition = useLearningStore((state) => state.learningPanelPosition)
  const themePreference = useThemeStore((state) => state.themePreference)

  const [isReadyToPersist, setIsReadyToPersist] = useState(false)
  const lastSyncedSignatureRef = useRef<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didSeedFromLocalRef = useRef(false)
  const localPayloadRef = useRef<UserSettingsPayload | null>(null)
  const localSignatureRef = useRef<string | null>(null)

  const localPayload = useMemo<UserSettingsPayload>(() => {
    const normalized = normalizePayload({
      showPosition,
      showPlayer,
      showNumber,
      showLibero,
      circleTokens,
      hideAwayTeam,
      fullStatusLabels,
      showLearnTab,
      debugHitboxes,
      isReceivingContext,
      tokenSize,
      navMode,
      backgroundShader,
      backgroundOpacity,
      awayTeamHidePercent,
      visiblePhases: Array.from(visiblePhases),
      phaseOrder,
      highlightedRole: highlightedRole ?? undefined,
      learningPanelPosition,
      themePreference,
    })
    return normalized
  }, [
    showPosition,
    showPlayer,
    showNumber,
    showLibero,
    circleTokens,
    hideAwayTeam,
    fullStatusLabels,
    showLearnTab,
    debugHitboxes,
    isReceivingContext,
    tokenSize,
    navMode,
    backgroundShader,
    backgroundOpacity,
    awayTeamHidePercent,
    visiblePhases,
    phaseOrder,
    highlightedRole,
    learningPanelPosition,
    themePreference,
  ])

  const localSignature = useMemo(() => payloadSignature(localPayload), [localPayload])

  // Keep refs in sync so the server→local effect can read current local state
  // without depending on it (which would cause it to fire on every local change).
  localPayloadRef.current = localPayload
  localSignatureRef.current = localSignature

  // Compute a stable server payload and signature so the effect below only
  // fires when server data *content* changes, not on every object reference.
  // 'loading' = query still loading, 'empty' = no settings record, or the payload.
  const serverPayload = useMemo<UserSettingsPayload | 'loading' | 'empty'>(() => {
    if (remoteSettings === undefined) return 'loading'
    if (remoteSettings === null) return 'empty'
    return normalizePayload({
      themePreference: remoteSettings.themePreference as ThemePreference | undefined,
      showPosition: remoteSettings.showPosition,
      showPlayer: remoteSettings.showPlayer,
      showNumber: remoteSettings.showNumber,
      showLibero: remoteSettings.showLibero,
      circleTokens: remoteSettings.circleTokens,
      hideAwayTeam: remoteSettings.hideAwayTeam,
      fullStatusLabels: remoteSettings.fullStatusLabels,
      showLearnTab: remoteSettings.showLearnTab,
      debugHitboxes: remoteSettings.debugHitboxes,
      isReceivingContext: remoteSettings.isReceivingContext,
      tokenSize: remoteSettings.tokenSize,
      navMode: remoteSettings.navMode,
      backgroundShader: remoteSettings.backgroundShader as ShaderId,
      backgroundOpacity: remoteSettings.backgroundOpacity,
      awayTeamHidePercent: remoteSettings.awayTeamHidePercent,
      visiblePhases: remoteSettings.visiblePhases,
      phaseOrder: remoteSettings.phaseOrder,
      highlightedRole: remoteSettings.highlightedRole as Role | undefined,
      learningPanelPosition: remoteSettings.learningPanelPosition as LearningPanelPosition,
    })
  }, [remoteSettings])

  // Content-based signature — stable across Convex reference changes.
  const serverSignature = useMemo(
    () => typeof serverPayload === 'string' ? serverPayload : payloadSignature(serverPayload),
    [serverPayload]
  )

  // Effect 1: Server → Local sync
  // Depends on serverSignature (content-based) so it only fires when the
  // server data actually changes, not on every Convex useQuery re-reference.
  useEffect(() => {
    if (!isHydrated) {
      return
    }

    if (!isAuthenticated) {
      setIsReadyToPersist(false)
      lastSyncedSignatureRef.current = null
      didSeedFromLocalRef.current = false
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      return
    }
    if (serverSignature === 'loading') {
      return
    }

    if (serverSignature === 'empty') {
      if (didSeedFromLocalRef.current) {
        setIsReadyToPersist(true)
        return
      }
      didSeedFromLocalRef.current = true
      void upsertSettings(localPayloadRef.current!).catch((error) => {
        console.error('Failed to initialize user settings from local state', error)
      })
      lastSyncedSignatureRef.current = localSignatureRef.current
      setIsReadyToPersist(true)
      return
    }

    // Only apply server values to local when server signature actually changed
    // from what we last synced AND differs from current local state.
    // This prevents the server from overriding local changes before they've
    // been persisted.
    if (serverSignature !== lastSyncedSignatureRef.current && serverSignature !== localSignatureRef.current && typeof serverPayload === 'object') {
      applyUserSettingsFromServer(serverPayload)
    }

    lastSyncedSignatureRef.current = serverSignature
    didSeedFromLocalRef.current = false
    setIsReadyToPersist(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isHydrated, serverSignature, upsertSettings])

  useEffect(() => {
    if (!isAuthenticated || !isReadyToPersist) {
      return
    }
    if (lastSyncedSignatureRef.current === localSignature) {
      return
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      void upsertSettings(localPayload)
        .then(() => {
          lastSyncedSignatureRef.current = localSignature
        })
        .catch((error) => {
          console.error('Failed to persist user settings', error)
        })
    }, 350)

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [isAuthenticated, isReadyToPersist, localPayload, localSignature, upsertSettings])

  return null
}
