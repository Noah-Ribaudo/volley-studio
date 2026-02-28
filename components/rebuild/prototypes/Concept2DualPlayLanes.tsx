'use client'

import { Button } from '@/components/ui/button'
import { formatCorePhaseLabel } from '@/lib/rebuild/prototypeFlow'
import { cn } from '@/lib/utils'
import { PlayButton, RotationStepper } from './ControlShared'
import type { PrototypeControlProps } from './types'

export function Concept2DualPlayLanes({
  currentRotation,
  currentCorePhase,
  nextByPlay,
  legalPlayLabel,
  onRotationStep,
  onPhaseSelect,
  onPlay,
}: PrototypeControlProps) {
  const foundationalLanes = [
    { phase: 'SERVE', target: 'DEFENSE', subtitle: 'Play Path A' },
    { phase: 'RECEIVE', target: 'OFFENSE', subtitle: 'Play Path B' },
  ] as const

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Concept 2</p>
          <h2 className="text-sm font-semibold">Dual Play Lanes by Rotation</h2>
        </div>
        <RotationStepper currentRotation={currentRotation} onRotationStep={onRotationStep} />
      </div>

      <div className="grid gap-2">
        {foundationalLanes.map((lane) => {
          const selected = currentCorePhase === lane.phase
          return (
            <button
              key={lane.phase}
              type="button"
              onClick={() => onPhaseSelect(lane.phase)}
              className={cn(
                'grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 rounded-lg border px-3 py-2 text-left',
                selected ? 'border-primary/60 bg-primary/8' : 'border-border bg-card/60'
              )}
            >
              <span className="text-sm font-semibold">{formatCorePhaseLabel(lane.phase)}</span>
              <span className="text-xs text-muted-foreground">{'->'}</span>
              <span className="text-sm font-semibold">{formatCorePhaseLabel(lane.target)}</span>
              <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{lane.subtitle}</span>
            </button>
          )
        })}
      </div>

      <div className="flex min-h-0 flex-1 gap-2 overflow-hidden rounded-lg border border-border bg-card/60 p-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Live loop</div>
          <div className="grid grid-cols-2 gap-2">
            {(['OFFENSE', 'DEFENSE'] as const).map((phase) => (
              <Button
                key={phase}
                type="button"
                variant={currentCorePhase === phase ? 'default' : 'outline'}
                size="sm"
                className="h-10 text-[11px] uppercase tracking-[0.08em]"
                onClick={() => onPhaseSelect(phase)}
              >
                {formatCorePhaseLabel(phase)}
              </Button>
            ))}
          </div>
          <div className="rounded-md border border-border bg-background/60 px-2 py-2 text-xs text-muted-foreground">
            Current legal jump: {formatCorePhaseLabel(currentCorePhase)} {'->'} {formatCorePhaseLabel(nextByPlay)}
          </div>
        </div>
        <div className="flex w-[9rem] shrink-0 flex-col justify-between rounded-md border border-border bg-background/70 p-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Foundation depth</p>
            <p className="mt-1 text-xs">Serve and Receive carry full player next-steps.</p>
          </div>
          <PlayButton legalPlayLabel={legalPlayLabel} onPlay={onPlay} className="h-8 min-w-0 text-xs" />
        </div>
      </div>
    </div>
  )
}
