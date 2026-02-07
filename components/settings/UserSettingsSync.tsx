'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useAppStore } from '@/store/useAppStore'
import {
  DEFAULT_PHASE_ORDER,
  DEFAULT_VISIBLE_PHASES,
  RALLY_PHASES,
  type RallyPhase,
  type Role,
} from '@/lib/types'
import type { LearningPanelPosition } from '@/lib/learning/types'
import { SHADER_OPTIONS, type ShaderId } from '@/lib/shaders'

type NavMode = 'sidebar' | 'header'
type TokenSize = 'big' | 'small'

type UserSettingsPayload = {
  showPosition: boolean
  showPlayer: boolean
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

function normalizePhases(phases: string[] | undefined): RallyPhase[] {
  const seen = new Set<RallyPhase>()
  const next: RallyPhase[] = []
  for (const phase of phases ?? []) {
    if (!RALLY_PHASES.includes(phase as RallyPhase)) continue
    const typedPhase = phase as RallyPhase
    if (seen.has(typedPhase)) continue
    seen.add(typedPhase)
    next.push(typedPhase)
  }
  return next
}

function normalizePhaseOrder(order: string[] | undefined): RallyPhase[] {
  const next = normalizePhases(order)
  for (const phase of DEFAULT_PHASE_ORDER) {
    if (!next.includes(phase)) {
      next.push(phase)
    }
  }
  return next
}

function normalizeVisiblePhases(phases: string[] | undefined): RallyPhase[] {
  const next = normalizePhases(phases)
  if (next.length === 0) {
    return [...DEFAULT_VISIBLE_PHASES]
  }
  return next
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

  return {
    showPosition: raw.showPosition ?? true,
    showPlayer: raw.showPlayer ?? false,
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
  const remoteSettings = useQuery(api.userSettings.getMine, isAuthenticated ? {} : 'skip')
  const upsertSettings = useMutation(api.userSettings.upsertMine)

  const showPosition = useAppStore((state) => state.showPosition)
  const showPlayer = useAppStore((state) => state.showPlayer)
  const showLibero = useAppStore((state) => state.showLibero)
  const circleTokens = useAppStore((state) => state.circleTokens)
  const hideAwayTeam = useAppStore((state) => state.hideAwayTeam)
  const fullStatusLabels = useAppStore((state) => state.fullStatusLabels)
  const showLearnTab = useAppStore((state) => state.showLearnTab)
  const debugHitboxes = useAppStore((state) => state.debugHitboxes)
  const isReceivingContext = useAppStore((state) => state.isReceivingContext)
  const tokenSize = useAppStore((state) => state.tokenSize)
  const navMode = useAppStore((state) => state.navMode)
  const backgroundShader = useAppStore((state) => state.backgroundShader)
  const backgroundOpacity = useAppStore((state) => state.backgroundOpacity)
  const awayTeamHidePercent = useAppStore((state) => state.awayTeamHidePercent)
  const visiblePhases = useAppStore((state) => state.visiblePhases)
  const phaseOrder = useAppStore((state) => state.phaseOrder)
  const highlightedRole = useAppStore((state) => state.highlightedRole)
  const learningPanelPosition = useAppStore((state) => state.learningPanelPosition)

  const [isReadyToPersist, setIsReadyToPersist] = useState(false)
  const lastSyncedSignatureRef = useRef<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didSeedFromLocalRef = useRef(false)

  const localPayload = useMemo<UserSettingsPayload>(() => {
    const normalized = normalizePayload({
      showPosition,
      showPlayer,
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
    })
    return normalized
  }, [
    showPosition,
    showPlayer,
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
  ])

  const localSignature = useMemo(() => payloadSignature(localPayload), [localPayload])

  useEffect(() => {
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
    if (remoteSettings === undefined) {
      return
    }

    if (remoteSettings === null) {
      if (didSeedFromLocalRef.current) {
        setIsReadyToPersist(true)
        return
      }
      didSeedFromLocalRef.current = true
      void upsertSettings(localPayload).catch((error) => {
        console.error('Failed to initialize user settings from local state', error)
      })
      lastSyncedSignatureRef.current = localSignature
      setIsReadyToPersist(true)
      return
    }

    const serverPayload = normalizePayload({
      showPosition: remoteSettings.showPosition,
      showPlayer: remoteSettings.showPlayer,
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
    const serverSignature = payloadSignature(serverPayload)

    if (serverSignature !== localSignature) {
      useAppStore.setState((state) => ({
        ...state,
        showPosition: serverPayload.showPosition,
        showPlayer: serverPayload.showPlayer,
        showLibero: serverPayload.showLibero,
        circleTokens: serverPayload.circleTokens,
        hideAwayTeam: serverPayload.hideAwayTeam,
        fullStatusLabels: serverPayload.fullStatusLabels,
        showLearnTab: serverPayload.showLearnTab,
        debugHitboxes: serverPayload.debugHitboxes,
        isReceivingContext: serverPayload.isReceivingContext,
        tokenSize: serverPayload.tokenSize,
        navMode: serverPayload.navMode,
        backgroundShader: serverPayload.backgroundShader,
        backgroundOpacity: serverPayload.backgroundOpacity,
        awayTeamHidePercent: serverPayload.awayTeamHidePercent,
        visiblePhases: new Set(serverPayload.visiblePhases),
        phaseOrder: serverPayload.phaseOrder,
        highlightedRole: serverPayload.highlightedRole ?? null,
        learningPanelPosition: serverPayload.learningPanelPosition,
      }))
    }

    lastSyncedSignatureRef.current = serverSignature
    didSeedFromLocalRef.current = false
    setIsReadyToPersist(true)
  }, [
    isAuthenticated,
    remoteSettings,
    localPayload,
    localSignature,
    upsertSettings,
  ])

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
