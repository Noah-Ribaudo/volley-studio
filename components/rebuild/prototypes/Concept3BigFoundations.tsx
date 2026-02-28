'use client'

import { Button } from '@/components/ui/button'
import { formatCorePhaseLabel } from '@/lib/rebuild/prototypeFlow'
import { cn } from '@/lib/utils'
import { PlayButton, RotationRail } from './ControlShared'
import type { PrototypeControlProps } from './types'

export function Concept3BigFoundations({
  currentRotation,
  currentCorePhase,
  isFoundationalPhase,
  legalPlayLabel,
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
        <PlayButton legalPlayLabel={legalPlayLabel} onPlay={onPlay} />
      </div>

      <RotationRail currentRotation={currentRotation} onRotationSelect={onRotationSelect} className="overflow-x-auto pb-1" />

      <div className="grid min-h-0 flex-1 gap-2 sm:grid-cols-[1.2fr_0.8fr]">
        <div className="min-h-0 overflow-y-auto rounded-lg border border-border bg-card/60 p-2">
          <div className="mb-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Foundational phases</div>
          <div className="grid gap-2">
            {(['SERVE', 'RECEIVE'] as const).map((phase) => (
              <Button
                key={phase}
                type="button"
                variant={currentCorePhase === phase ? 'default' : 'outline'}
                className="h-14 justify-start text-base font-semibold"
                onClick={() => onPhaseSelect(phase)}
              >
                {formatCorePhaseLabel(phase)}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card/60 p-2">
          <div className="mb-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Reactive loop</div>
          <div className="grid gap-2">
            {(['OFFENSE', 'DEFENSE'] as const).map((phase) => (
              <Button
                key={phase}
                type="button"
                variant={currentCorePhase === phase ? 'default' : 'outline'}
                size="sm"
                className="h-9 justify-start text-xs uppercase tracking-[0.09em]"
                onClick={() => onPhaseSelect(phase)}
              >
                {formatCorePhaseLabel(phase)}
              </Button>
            ))}
            <div
              className={cn(
                'rounded-md border px-2 py-2 text-xs',
                isFoundationalPhase ? 'border-primary/40 bg-primary/10' : 'border-border bg-background/70'
              )}
            >
              {isFoundationalPhase
                ? 'Foundational mode active: expect full next-step instructions.'
                : 'Reactive mode active: shorter and situational movement guidance.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
