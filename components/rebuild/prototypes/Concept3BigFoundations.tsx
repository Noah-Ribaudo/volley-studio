'use client'

import { Button } from '@/components/ui/button'
import { formatCorePhaseLabel } from '@/lib/rebuild/prototypeFlow'
import { cn } from '@/lib/utils'
import { PlayButton } from './ControlShared'
import { TactileRotationSwitch } from './TactileRotationSwitch'
import type { PrototypeControlProps } from './types'

export function Concept3BigFoundations({
  currentRotation,
  currentCorePhase,
  isFoundationalPhase,
  legalPlayLabel,
  nextByPlay,
  switchMotion,
  onRotationSelect,
  onPhaseSelect,
  onPlay,
}: PrototypeControlProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Concept 3</p>
          <h2 className="text-sm font-semibold">Big Foundations, Small Reactive</h2>
        </div>
        <div className="rounded-full border border-border bg-card px-3 py-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          {isFoundationalPhase ? 'Foundation mode' : 'Reactive mode'}
        </div>
      </div>

      <TactileRotationSwitch
        value={currentRotation}
        onValueChange={onRotationSelect}
        switchMotion={switchMotion}
      />

      <div className="grid min-h-0 flex-1 gap-2">
        <section
          className={cn(
            'rounded-lg border border-border bg-card/70 p-2 transition-all duration-200',
            isFoundationalPhase ? 'opacity-100' : 'opacity-80'
          )}
        >
          <div className="mb-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Foundation deck</div>
          <div className={cn('grid gap-2 transition-all', isFoundationalPhase ? 'grid-cols-1' : 'grid-cols-2')}>
            {(['SERVE', 'RECEIVE'] as const).map((phase) => (
              <Button
                key={phase}
                type="button"
                variant={currentCorePhase === phase ? 'default' : 'outline'}
                className={cn(
                  'justify-start font-semibold transition-all',
                  isFoundationalPhase ? 'h-14 text-base' : 'h-8 text-xs uppercase tracking-[0.08em]'
                )}
                onClick={() => onPhaseSelect(phase)}
              >
                {formatCorePhaseLabel(phase)}
              </Button>
            ))}
          </div>
        </section>

        <section
          className={cn(
            'rounded-lg border border-border bg-card/70 p-2 transition-all duration-200',
            isFoundationalPhase ? 'opacity-75' : 'opacity-100'
          )}
        >
          <div className="mb-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Reactive loop</div>
          <div className={cn('grid gap-2 transition-all', isFoundationalPhase ? 'grid-cols-2' : 'grid-cols-1')}>
            {(['OFFENSE', 'DEFENSE'] as const).map((phase) => (
              <Button
                key={phase}
                type="button"
                variant={currentCorePhase === phase ? 'default' : 'outline'}
                className={cn(
                  'justify-start transition-all',
                  isFoundationalPhase
                    ? 'h-8 text-xs uppercase tracking-[0.09em]'
                    : 'h-12 text-sm font-semibold'
                )}
                onClick={() => onPhaseSelect(phase)}
              >
                {formatCorePhaseLabel(phase)}
              </Button>
            ))}
          </div>
          <div className="mt-2 rounded-md border border-border bg-background/70 px-2 py-2 text-xs text-muted-foreground">
            {isFoundationalPhase
              ? 'Serve/Receive stay visually dominant until rally enters live loop.'
              : 'Controls morph: Offense/Defense grow and become the primary interaction surface.'}
          </div>
        </section>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {isFoundationalPhase ? (
          <PlayButton legalPlayLabel={legalPlayLabel} onPlay={onPlay} className="h-10 w-full sm:col-span-2" />
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10 text-xs uppercase tracking-[0.08em]"
              onClick={() => onPhaseSelect(nextByPlay)}
            >
              Snap to {formatCorePhaseLabel(nextByPlay)}
            </Button>
            <PlayButton legalPlayLabel={legalPlayLabel} onPlay={onPlay} className="h-10 min-w-0" />
          </>
        )}
      </div>
    </div>
  )
}
