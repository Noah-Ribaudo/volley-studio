'use client'

import { create } from 'zustand'
import type { BTNodeTrace, DecisionTrace } from '@/lib/sim/trace'
import type { PlayerId } from '@/lib/sim/types'
import type { PresetId } from '@/lib/bt-editor/presets'
import { getDefaultPresetId } from '@/lib/bt-editor/presets'

export type PlayerRole = 'setter' | 'outside' | 'opposite' | 'middle' | 'libero'

interface BTEditorState {
  // Which role's tree to display
  selectedRole: PlayerRole

  // Which preset/style to use for that role
  selectedPresetId: PresetId

  // For live mode: which specific player to track
  selectedPlayerId: PlayerId | null

  // Whether to sync with running simulation
  isLiveMode: boolean

  // The current trace to display
  currentTrace: BTNodeTrace | null

  // Full decision trace (includes metadata)
  currentDecisionTrace: DecisionTrace | null

  // Actions
  setSelectedRole: (role: PlayerRole) => void
  setSelectedPreset: (presetId: PresetId) => void
  setSelectedPlayerId: (id: PlayerId | null) => void
  setLiveMode: (enabled: boolean) => void
  setCurrentTrace: (trace: BTNodeTrace | null) => void
  setCurrentDecisionTrace: (trace: DecisionTrace | null) => void
}

export const useBTEditorStore = create<BTEditorState>((set) => ({
  selectedRole: 'setter',
  selectedPresetId: 'setter-standard',
  selectedPlayerId: null,
  isLiveMode: false,
  currentTrace: null,
  currentDecisionTrace: null,

  setSelectedRole: (role) => set({
    selectedRole: role,
    // Reset to default preset for the new role
    selectedPresetId: getDefaultPresetId(role),
  }),
  setSelectedPreset: (presetId) => set({ selectedPresetId: presetId }),
  setSelectedPlayerId: (id) => set({ selectedPlayerId: id }),
  setLiveMode: (enabled) => set({ isLiveMode: enabled }),
  setCurrentTrace: (trace) => set({ currentTrace: trace }),
  setCurrentDecisionTrace: (trace) => set({
    currentDecisionTrace: trace,
    currentTrace: trace?.rootTrace ?? null
  }),
}))
