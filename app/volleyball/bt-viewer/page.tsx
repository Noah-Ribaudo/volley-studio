'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import BTFlowCanvas from '@/components/bt-editor/BTFlowCanvas'
import type { TraceDisplayMode } from '@/components/bt-editor/BTFlowCanvas'
import SituationBuilder from '@/components/bt-editor/SituationBuilder'
import { useBTEditorStore, type PlayerRole } from '@/store/useBTEditorStore'
import { useSituationStore } from '@/store/useSituationStore'
import { roleDisplayNames } from '@/lib/bt-editor/sampleTrace'
import { createTreeFromPreset, getDefaultPresetId } from '@/lib/bt-editor/presets'

const roles: PlayerRole[] = ['setter', 'outside', 'opposite', 'middle', 'libero']

export default function BTViewerPage() {
  const { selectedRole, setSelectedRole, currentTrace } = useBTEditorStore()
  const { isContextComplete } = useSituationStore()

  const [isClient, setIsClient] = useState(false)

  // Ensure client-side only rendering for ReactFlow
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Generate a preview trace for showing tree structure before questions are answered
  const previewTrace = useMemo(() => {
    const presetId = getDefaultPresetId(selectedRole)
    const tree = createTreeFromPreset(presetId)
    if (!tree) return null

    // Create a minimal context just to get the tree structure
    const minimalContext = {
      blackboard: {
        fsm: { phase: 'PRE_SERVE' as const },
        ball: { position: { x: 0.5, y: 0.5 }, velocity: { x: 0, y: 0 }, predicted_landing: { x: 0.5, y: 0.5 }, touch_count: 0 as const, on_our_side: true },
        rotation: { index: 1 as const, front_row_players: [] as string[], hitterMode: '3-hitter' as const },
        team: { setter_id: 'home-setter' },
        opponent: { attack_lane: 'left' as const },
        override: { active: false as const },
        serving: { isOurServe: false, serverId: 'away-server' },
      },
      self: {
        id: `home-${selectedRole}`,
        team: 'HOME' as const,
        role: 'S' as const,
        category: 'SETTER' as const,
        priority: 1,
        position: { x: 0.5, y: 0.5 },
        velocity: { x: 0, y: 0 },
        maxSpeed: 4,
        requestedGoal: null,
        baseGoal: { type: 'MaintainBaseResponsibility' as const },
        override: { active: false as const },
        active: true,
        skills: { passing: { accuracy: 0.7, power: 0.6 }, setting: { accuracy: 0.7, tempo: 0.6 }, attacking: { accuracy: 0.7, power: 0.7 }, blocking: { timing: 0.6, reach: 0.5 }, serving: { accuracy: 0.6, power: 0.6 }, movement: { speed: 0.7, agility: 0.6 } },
      },
      allPlayers: [],
      simTimeMs: 0,
    }

    const result = tree.tick(minimalContext)
    return result.trace
  }, [selectedRole])

  // Decide which trace to show and in which mode
  const traceToShow = isContextComplete && currentTrace ? currentTrace : previewTrace
  const displayMode: TraceDisplayMode = isContextComplete && currentTrace ? 'result' : 'preview'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-900/50">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-slate-100">AI Decision Explorer</h1>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="text-blue-400">?</span> Selector
            </span>
            <span className="flex items-center gap-1">
              <span className="text-slate-400">→</span> Sequence
            </span>
            <span className="flex items-center gap-1">
              <span className="text-amber-400">◆</span> Condition
            </span>
            <span className="flex items-center gap-1">
              <span className="text-emerald-400">●</span> Action
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Role selector */}
          <label className="text-sm text-slate-400">Playing as:</label>
          <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as PlayerRole)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  {roleDisplayNames[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tree visualization */}
        <div className="flex-1 p-4">
          {isClient ? (
            traceToShow ? (
              <BTFlowCanvas trace={traceToShow} displayMode={displayMode} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-900/50 rounded-lg border border-slate-700">
                <p className="text-slate-400">Loading tree...</p>
              </div>
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded-lg border">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          )}
        </div>

        {/* Situation builder panel */}
        {isClient && (
          <div className="w-80 border-l border-slate-700">
            <SituationBuilder />
          </div>
        )}
      </div>
    </div>
  )
}
