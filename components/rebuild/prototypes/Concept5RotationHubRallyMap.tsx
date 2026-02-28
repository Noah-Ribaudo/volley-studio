'use client'

import { Button } from '@/components/ui/button'
import { formatCorePhaseLabel } from '@/lib/rebuild/prototypeFlow'
import { cn } from '@/lib/utils'
import { PlayButton, PossessionPill, ScoreButtons, SetterZoneRotationGrid } from './ControlShared'
import { TactileRotationSwitch } from './TactileRotationSwitch'
import type { PrototypeControlProps } from './types'

export function Concept5RotationHubRallyMap({
  currentRotation,
  currentCorePhase,
  nextByPlay,
  legalPlayLabel,
  isFoundationalPhase,
  isOurServe,
  switchMotion,
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

      <section className="rounded-lg border border-border bg-card/70 p-2">
        <div className="mb-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Rotation selector morph</div>
        <TactileRotationSwitch value={currentRotation} onValueChange={onRotationSelect} switchMotion={switchMotion} />
        <div className={cn('mt-2 transition-all duration-200', isFoundationalPhase ? 'opacity-80' : 'opacity-100')}>
          <SetterZoneRotationGrid currentRotation={currentRotation} onRotationSelect={onRotationSelect} className="bg-background/55" />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {isFoundationalPhase
            ? 'Primary selector is the tactile 6-segment deck. Setter map remains synced as secondary context.'
            : 'Live loop mode keeps tactile selection and setter-zone map active together.'}
        </div>
      </section>

      <section className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-card/70 p-2">
        <div className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Rally map</div>
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

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-md border border-border bg-background/60 px-2 py-2 text-xs">
            <Button
              type="button"
              variant={currentCorePhase === 'OFFENSE' ? 'default' : 'outline'}
              size="sm"
              className="h-9 justify-start text-xs"
              onClick={() => onPhaseSelect('OFFENSE')}
            >
              Offense
            </Button>
            <span className="text-muted-foreground">{'<->'}</span>
            <Button
              type="button"
              variant={currentCorePhase === 'DEFENSE' ? 'default' : 'outline'}
              size="sm"
              className="h-9 justify-start text-xs"
              onClick={() => onPhaseSelect('DEFENSE')}
            >
              Defense
            </Button>
          </div>

          <div className="rounded-md border border-border bg-background/60 px-2 py-2 text-xs text-muted-foreground">
            Current legal jump: {formatCorePhaseLabel(currentCorePhase)} {'->'} {formatCorePhaseLabel(nextByPlay)}
          </div>
        </div>
      </section>

      <div className="grid gap-2">
        {canScore && <ScoreButtons onPoint={onPoint} />}

        {isFoundationalPhase ? (
          <PlayButton legalPlayLabel={legalPlayLabel} onPlay={onPlay} className="h-10 w-full" />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 text-xs uppercase tracking-[0.08em]"
              onClick={() => onPhaseSelect(nextByPlay)}
            >
              Swap loop to {formatCorePhaseLabel(nextByPlay)}
            </Button>
            <PlayButton legalPlayLabel={legalPlayLabel} onPlay={onPlay} className="h-10 min-w-0" />
          </div>
        )}
      </div>
    </div>
  )
}
