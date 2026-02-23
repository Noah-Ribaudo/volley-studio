'use client'

import { unstable_batchedUpdates } from 'react-dom'
import type { RallyPhase, Role } from '@/lib/types'
import type { LearningPanelPosition } from '@/lib/learning/types'
import type { ShaderId } from '@/lib/shaders'
import type { ThemePreference } from '@/lib/themes'
import { useDisplayPrefsStore } from '@/store/useDisplayPrefsStore'
import { useUIPrefsStore } from '@/store/useUIPrefsStore'
import { useNavigationStore } from '@/store/useNavigationStore'
import { useLearningStore } from '@/store/useLearningStore'
import { useThemeStore } from '@/store/useThemeStore'

export type NavMode = 'sidebar' | 'header'
export type TokenSize = 'big' | 'small'

export type UserSettingsPayload = {
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

export function applyUserSettingsFromServer(payload: UserSettingsPayload) {
  unstable_batchedUpdates(() => {
    useDisplayPrefsStore.setState((state) => ({
      ...state,
      showPosition: payload.showPosition,
      showPlayer: payload.showPlayer,
      showNumber: payload.showNumber,
      showLibero: payload.showLibero,
      circleTokens: payload.circleTokens,
      hideAwayTeam: payload.hideAwayTeam,
      fullStatusLabels: payload.fullStatusLabels,
      isReceivingContext: payload.isReceivingContext,
      tokenSize: payload.tokenSize,
      awayTeamHidePercent: payload.awayTeamHidePercent,
    }))

    useUIPrefsStore.setState((state) => ({
      ...state,
      showLearnTab: payload.showLearnTab,
      debugHitboxes: payload.debugHitboxes,
      navMode: payload.navMode,
      backgroundShader: payload.backgroundShader,
      backgroundOpacity: payload.backgroundOpacity,
    }))

    useNavigationStore.setState((state) => ({
      ...state,
      visiblePhases: new Set(payload.visiblePhases),
      phaseOrder: payload.phaseOrder,
      highlightedRole: payload.highlightedRole ?? null,
    }))

    useLearningStore.setState((state) => ({
      ...state,
      learningPanelPosition: payload.learningPanelPosition,
    }))

    useThemeStore.setState((state) => ({
      ...state,
      themePreference: payload.themePreference,
      theme: payload.themePreference === 'auto' ? state.theme : payload.themePreference,
    }))
  })
}

export function snapshotUserSettingsForSync(): UserSettingsPayload {
  const display = useDisplayPrefsStore.getState()
  const ui = useUIPrefsStore.getState()
  const navigation = useNavigationStore.getState()
  const learning = useLearningStore.getState()
  const theme = useThemeStore.getState()

  return {
    themePreference: theme.themePreference,
    showPosition: display.showPosition,
    showPlayer: display.showPlayer,
    showNumber: display.showNumber,
    showLibero: display.showLibero,
    circleTokens: display.circleTokens,
    hideAwayTeam: display.hideAwayTeam,
    fullStatusLabels: display.fullStatusLabels,
    showLearnTab: ui.showLearnTab,
    debugHitboxes: ui.debugHitboxes,
    isReceivingContext: display.isReceivingContext,
    tokenSize: display.tokenSize,
    navMode: ui.navMode,
    backgroundShader: ui.backgroundShader,
    backgroundOpacity: ui.backgroundOpacity,
    awayTeamHidePercent: display.awayTeamHidePercent,
    visiblePhases: Array.from(navigation.visiblePhases),
    phaseOrder: navigation.phaseOrder,
    highlightedRole: navigation.highlightedRole ?? undefined,
    learningPanelPosition: learning.learningPanelPosition,
  }
}
