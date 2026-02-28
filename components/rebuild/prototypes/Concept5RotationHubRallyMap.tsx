'use client'

import { Button } from '@/components/ui/button'
import { formatCorePhaseLabel } from '@/lib/rebuild/prototypeFlow'
import { cn } from '@/lib/utils'
import { PlayButton, PossessionPill, ScoreButtons } from './ControlShared'
import type { PrototypeControlProps } from './types'

export function Concept5RotationHubRallyMap({
  currentRotation,
  currentCorePhase,
  nextByPlay,
  legalPlayLabel,
  isOurServe,
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
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Concept 5</p>
          <h2 className="text-sm font-semibold">Rotation Hub + Rally Map</h2>
        </div>
        <PossessionPill isOurServe={isOurServe} />
      </div>

      <div className="grid min-h-0 flex-1 gap-2 sm:grid-cols-[9rem_1fr]">
        <div className="min-h-0 overflow-y-auto rounded-lg border border-border bg-card/60 p-2">
          <p className="mb-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Rotations</p>
          <div className="space-y-1">
            {[1, 2, 3, 4, 5, 6].map((rotation) => (
              <Button
                key={rotation}
                type="button"
                variant={rotation === currentRotation ? 'default' : 'outline'}
                size="sm"
                className="h-8 w-full justify-start text-xs"
                onClick={() => onRotationSelect(rotation as 1 | 2 | 3 | 4 | 5 | 6)}
              >
                Rotation {rotation}
              </Button>
            ))}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto rounded-lg border border-border bg-card/60 p-2">
          <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Rally map</p>
          <div className="mt-2 grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              {(['SERVE', 'RECEIVE'] as const).map((phase) => (
                <Button
                  key={phase}
                  type="button"
                  variant={phase === currentCorePhase ? 'default' : 'outline'}
                  className="h-11 justify-start text-sm"
                  onClick={() => onPhaseSelect(phase)}
                >
                  {formatCorePhaseLabel(phase)}
                </Button>
              ))}
            </div>
            <div className="rounded-md border border-border bg-background/60 px-2 py-2 text-xs text-muted-foreground">
              Foundational gates route into live play.
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-md border border-border bg-background/60 px-2 py-2 text-xs">
              <Button
                type="button"
                variant={currentCorePhase === 'OFFENSE' ? 'default' : 'outline'}
                size="sm"
                className="h-8 justify-start text-xs"
                onClick={() => onPhaseSelect('OFFENSE')}
              >
                Offense
              </Button>
              <span className="text-muted-foreground">{'<->'}</span>
              <Button
                type="button"
                variant={currentCorePhase === 'DEFENSE' ? 'default' : 'outline'}
                size="sm"
                className="h-8 justify-start text-xs"
                onClick={() => onPhaseSelect('DEFENSE')}
              >
                Defense
              </Button>
            </div>
            <div className="rounded-md border border-border bg-background/60 px-2 py-2 text-xs text-muted-foreground">
              Current legal jump: {formatCorePhaseLabel(currentCorePhase)} {'->'} {formatCorePhaseLabel(nextByPlay)}
            </div>
          </div>
        </div>
      </div>

      <div className={cn('grid gap-2', canScore ? 'sm:grid-cols-[1fr_auto_auto]' : 'sm:grid-cols-[1fr_auto]')}>
        {canScore && <ScoreButtons onPoint={onPoint} />}
        <div className="flex h-9 items-center rounded-md border border-border bg-background/60 px-3 text-xs text-muted-foreground">
          Point scored routes to next serve/receive state.
        </div>
        <PlayButton legalPlayLabel={legalPlayLabel} onPlay={onPlay} className="h-9 min-w-0 text-xs" />
      </div>
    </div>
  )
}
