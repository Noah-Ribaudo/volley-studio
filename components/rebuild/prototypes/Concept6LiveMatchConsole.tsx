'use client'

import { Button } from '@/components/ui/button'
import { formatCorePhaseLabel } from '@/lib/rebuild/prototypeFlow'
import { PlayButton, PossessionPill, ScoreButtons } from './ControlShared'
import type { PrototypeControlProps } from './types'

export function Concept6LiveMatchConsole({
  currentRotation,
  currentCorePhase,
  nextByPlay,
  legalPlayLabel,
  isOurServe,
  onRotationStep,
  onPhaseSelect,
  onPlay,
  onPoint,
  canScore,
}: PrototypeControlProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Concept 6</p>
          <h2 className="text-sm font-semibold">Live Match Console</h2>
        </div>
        <PossessionPill isOurServe={isOurServe} />
      </div>

      <div className="grid min-h-0 flex-1 gap-2 sm:grid-cols-[8.5rem_1fr]">
        <div className="rounded-lg border border-border bg-card/60 p-2">
          <div className="mb-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Rotation bank</div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => onRotationStep(-1)}>
              Prev
            </Button>
            <div className="text-center text-xs font-semibold">R{currentRotation}</div>
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => onRotationStep(1)}>
              Next
            </Button>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto rounded-lg border border-border bg-card/60 p-2">
          <div className="mb-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Phase quartet</div>
          <div className="grid grid-cols-4 gap-1">
            {(['SERVE', 'RECEIVE', 'OFFENSE', 'DEFENSE'] as const).map((phase) => (
              <Button
                key={phase}
                type="button"
                variant={phase === currentCorePhase ? 'default' : 'outline'}
                size="sm"
                className="h-9 px-1 text-[10px] uppercase tracking-[0.08em]"
                onClick={() => onPhaseSelect(phase)}
              >
                {formatCorePhaseLabel(phase)}
              </Button>
            ))}
          </div>

          <div className="mt-2 rounded-md border border-border bg-background/65 px-2 py-2 text-xs text-muted-foreground">
            Legal transition: {formatCorePhaseLabel(currentCorePhase)} {'->'} {formatCorePhaseLabel(nextByPlay)}
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
            {canScore && <ScoreButtons onPoint={onPoint} />}
            <PlayButton legalPlayLabel={legalPlayLabel} onPlay={onPlay} className="h-8 min-w-0 px-3 text-xs" />
          </div>
        </div>
      </div>
    </div>
  )
}
