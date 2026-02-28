'use client'

import { Button } from '@/components/ui/button'
import { formatCorePhaseLabel } from '@/lib/rebuild/prototypeFlow'
import { cn } from '@/lib/utils'
import { PlayButton, PossessionPill, RotationStepper, ScoreButtons, SetterZoneRotationGrid } from './ControlShared'
import type { PrototypeControlProps } from './types'

export function Concept6LiveMatchConsole({
  currentRotation,
  currentCorePhase,
  nextByPlay,
  legalPlayLabel,
  isFoundationalPhase,
  isOurServe,
  onRotationStep,
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
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Concept 6</p>
          <h2 className="text-sm font-semibold">Live Match Console</h2>
        </div>
        <PossessionPill isOurServe={isOurServe} />
      </div>

      <section className="rounded-lg border border-border bg-card/70 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Rotation command deck</div>
          <RotationStepper currentRotation={currentRotation} onRotationStep={onRotationStep} />
        </div>

        <div className="mt-2 grid grid-cols-6 gap-1">
          {[1, 2, 3, 4, 5, 6].map((rotation) => (
            <Button
              key={rotation}
              type="button"
              variant={rotation === currentRotation ? 'default' : 'outline'}
              size="sm"
              className="h-8 px-1 text-[11px]"
              onClick={() => onRotationSelect(rotation as 1 | 2 | 3 | 4 | 5 | 6)}
            >
              R{rotation}
            </Button>
          ))}
        </div>

        <div
          className={cn(
            'mt-2 overflow-hidden transition-all duration-200',
            isFoundationalPhase ? 'max-h-0 opacity-0' : 'max-h-44 opacity-100'
          )}
        >
          <SetterZoneRotationGrid currentRotation={currentRotation} onRotationSelect={onRotationSelect} className="bg-background/60" />
        </div>
      </section>

      <section className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-card/70 p-2">
        <div className="mb-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Phase cluster morph</div>

        <div className="grid gap-2">
          <div className={cn('grid gap-1 transition-all', isFoundationalPhase ? 'grid-cols-2' : 'grid-cols-4')}>
            {(['SERVE', 'RECEIVE', 'OFFENSE', 'DEFENSE'] as const).map((phase) => {
              const isReactivePhase = phase === 'OFFENSE' || phase === 'DEFENSE'
              const shouldEmphasize = isFoundationalPhase ? !isReactivePhase : isReactivePhase

              return (
                <Button
                  key={phase}
                  type="button"
                  variant={phase === currentCorePhase ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'px-1 transition-all',
                    shouldEmphasize ? 'h-11 text-sm font-semibold' : 'h-8 text-[10px] uppercase tracking-[0.08em]'
                  )}
                  onClick={() => onPhaseSelect(phase)}
                >
                  {formatCorePhaseLabel(phase)}
                </Button>
              )
            })}
          </div>

          <div className="rounded-md border border-border bg-background/65 px-2 py-2 text-xs text-muted-foreground">
            {isFoundationalPhase
              ? 'Console prioritizes Serve/Receive controls while rally is being seeded.'
              : `Live loop active: Offense/Defense controls expanded. Legal next: ${formatCorePhaseLabel(currentCorePhase)} -> ${formatCorePhaseLabel(nextByPlay)}.`}
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
              Counter to {formatCorePhaseLabel(nextByPlay)}
            </Button>
            <PlayButton legalPlayLabel={legalPlayLabel} onPlay={onPlay} className="h-10 min-w-0" />
          </div>
        )}
      </div>
    </div>
  )
}
