'use client'

import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import BTFlowCanvas from '@/components/bt-editor/BTFlowCanvas'
import type { TraceDisplayMode } from '@/components/bt-editor/BTFlowCanvas'
import SituationBuilder from '@/components/bt-editor/SituationBuilder'
import FSMTimeline from '@/components/under-the-hood/FSMTimeline'
import { useBTEditorStore } from '@/store/useBTEditorStore'
import { useSituationStore } from '@/store/useSituationStore'
import { createTreeFromPreset, getDefaultPresetId } from '@/lib/bt-editor/presets'

// Client-side detection without causing cascading renders
const emptySubscribe = () => () => {}
const getSnapshot = () => true
const getServerSnapshot = () => false

export default function SimulationPage() {
  const { selectedRole, currentTrace } = useBTEditorStore()
  const { isContextComplete, context } = useSituationStore()

  // Use useSyncExternalStore to detect client-side (avoids lint error with useEffect + setState)
  const isClient = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot)

  // Generate a preview trace for showing tree structure before questions are answered
  const previewTrace = useMemo(() => {
    const presetId = getDefaultPresetId(selectedRole)
    const tree = createTreeFromPreset(presetId)
    if (!tree) return null

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

  const traceToShow = isContextComplete && currentTrace ? currentTrace : previewTrace
  const displayMode: TraceDisplayMode = isContextComplete && currentTrace ? 'result' : 'preview'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-900/50">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-slate-100">Simulation</h1>
          <p className="text-sm text-slate-400">
            See how game state drives player decisions
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Situation builder panel */}
        {isClient && (
          <div className="w-80 border-r border-slate-700 overflow-y-auto">
            <SituationBuilder />
          </div>
        )}

        {/* FSM + BT visualization area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* FSM Timeline */}
          {isClient && (
            <div className="border-b border-slate-700 bg-slate-900/30">
              <FSMTimeline currentPhase={context.phase} />
            </div>
          )}

          {/* BT Tree */}
          <div className="flex-1 p-4">
            {isClient ? (
              traceToShow ? (
                <BTFlowCanvas
                  trace={traceToShow}
                  displayMode={displayMode}
                  currentPhase={context.phase}
                />
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
        </div>
      </div>
    </div>
  )
}
