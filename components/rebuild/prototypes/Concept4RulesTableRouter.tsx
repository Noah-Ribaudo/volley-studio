'use client'

import { formatCorePhaseLabel, type CorePhase } from '@/lib/rebuild/prototypeFlow'
import { cn } from '@/lib/utils'
import { PlayButton, PossessionPill, RotationRail, ScoreButtons } from './ControlShared'
import type { PrototypeControlProps } from './types'

const TABLE_ROWS: Array<{ phase: CorePhase; next: string; depth: string }> = [
  { phase: 'SERVE', next: '-> Defense', depth: 'High (foundational)' },
  { phase: 'RECEIVE', next: '-> Offense', depth: 'High (foundational)' },
  { phase: 'OFFENSE', next: '<-> Defense', depth: 'Medium / low' },
  { phase: 'DEFENSE', next: '<-> Offense', depth: 'Medium / low' },
]

export function Concept4RulesTableRouter({
  currentRotation,
  currentCorePhase,
  isOurServe,
  legalPlayLabel,
  onRotationSelect,
  onPhaseSelect,
  onPlay,
  onPoint,
  canScore,
}: PrototypeControlProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Concept 4</p>
          <h2 className="text-sm font-semibold">Rotation Rules Table + Router</h2>
        </div>
        <div className="flex items-center gap-2">
          <PossessionPill isOurServe={isOurServe} />
          <PlayButton legalPlayLabel={legalPlayLabel} onPlay={onPlay} className="min-w-0 px-3 text-xs" />
        </div>
      </div>

      <RotationRail currentRotation={currentRotation} onRotationSelect={onRotationSelect} className="overflow-x-auto pb-1" />

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-card/60 p-2">
        <div className="grid grid-cols-[1fr_1fr_1fr] rounded-md border border-border bg-background/70 px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          <span>Phase</span>
          <span>Next by Play</span>
          <span>Instruction depth</span>
        </div>
        <div className="mt-2 space-y-1">
          {TABLE_ROWS.map((row) => {
            const active = row.phase === currentCorePhase
            return (
              <button
                key={row.phase}
                type="button"
                onClick={() => onPhaseSelect(row.phase)}
                className={cn(
                  'grid w-full grid-cols-[1fr_1fr_1fr] items-center rounded-md border px-2 py-2 text-left text-xs',
                  active ? 'border-primary/50 bg-primary/8' : 'border-border bg-background/55'
                )}
              >
                <span className="font-semibold">{formatCorePhaseLabel(row.phase)}</span>
                <span className="text-muted-foreground">{row.next}</span>
                <span className="text-muted-foreground">{row.depth}</span>
              </button>
            )
          })}
        </div>
      </div>

      {canScore && (
        <div className="rounded-lg border border-border bg-card/60 p-2">
          <div className="mb-2 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Point scored router</div>
          <ScoreButtons onPoint={onPoint} />
          <div className="mt-2 text-xs text-muted-foreground">Scoring applies serve/receive and sideout rotation rules.</div>
        </div>
      )}
    </div>
  )
}
