'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  CORE_PHASES,
  type CorePhase,
  formatCorePhaseLabel,
  getRotationForSetterZone,
  getSetterZoneForRotation,
  type PointWinner,
} from '@/lib/rebuild/prototypeFlow'
import type { Rotation } from '@/lib/types'

export function RotationRail({
  currentRotation,
  onRotationSelect,
  className,
}: {
  currentRotation: Rotation
  onRotationSelect: (rotation: Rotation) => void
  className?: string
}) {
  return (
    <div className={cn('flex gap-1', className)}>
      {[1, 2, 3, 4, 5, 6].map((rotation) => (
        <Button
          key={rotation}
          type="button"
          size="sm"
          variant={rotation === currentRotation ? 'default' : 'outline'}
          className="h-8 min-w-8 px-2 text-xs"
          onClick={() => onRotationSelect(rotation as Rotation)}
        >
          R{rotation}
        </Button>
      ))}
    </div>
  )
}

export function RotationStepper({
  currentRotation,
  onRotationStep,
}: {
  currentRotation: Rotation
  onRotationStep: (delta: -1 | 1) => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-1 py-1">
      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 px-0" onClick={() => onRotationStep(-1)}>
        -
      </Button>
      <div className="w-16 text-center text-xs font-semibold">R{currentRotation}</div>
      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 px-0" onClick={() => onRotationStep(1)}>
        +
      </Button>
    </div>
  )
}

export function PhaseQuartet({
  currentCorePhase,
  onPhaseSelect,
  compact = false,
}: {
  currentCorePhase: CorePhase
  onPhaseSelect: (phase: CorePhase) => void
  compact?: boolean
}) {
  return (
    <div className={cn('grid gap-1', compact ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-4')}>
      {CORE_PHASES.map((phase) => (
        <Button
          key={phase}
          type="button"
          variant={phase === currentCorePhase ? 'default' : 'outline'}
          size="sm"
          onClick={() => onPhaseSelect(phase)}
          className={cn('h-8 text-[11px] uppercase tracking-[0.08em]', compact && 'px-1')}
        >
          {formatCorePhaseLabel(phase)}
        </Button>
      ))}
    </div>
  )
}

export function PlayButton({
  legalPlayLabel,
  onPlay,
  className,
}: {
  legalPlayLabel: string
  onPlay: () => void
  className?: string
}) {
  return (
    <Button type="button" className={cn('h-9 min-w-[7.5rem]', className)} onClick={onPlay}>
      Play ({legalPlayLabel})
    </Button>
  )
}

export function ScoreButtons({
  onPoint,
  className,
}: {
  onPoint: (winner: PointWinner) => void
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-1', className)}>
      <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => onPoint('us')}>
        Point Us
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => onPoint('them')}>
        Point Them
      </Button>
    </div>
  )
}

export function PossessionPill({ isOurServe }: { isOurServe: boolean }) {
  return (
    <div className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3 text-[11px] font-semibold uppercase tracking-[0.09em]">
      {isOurServe ? 'We Serve' : 'We Receive'}
    </div>
  )
}

export function SetterZoneRotationGrid({
  currentRotation,
  onRotationSelect,
  className,
}: {
  currentRotation: Rotation
  onRotationSelect: (rotation: Rotation) => void
  className?: string
}) {
  const setterZone = getSetterZoneForRotation(currentRotation)
  const zoneRows: Array<Array<1 | 2 | 3 | 4 | 5 | 6>> = [
    [4, 3, 2],
    [5, 6, 1],
  ]

  return (
    <div className={cn('rounded-lg border border-border bg-card/80 p-2', className)}>
      <div className="mb-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        Setter zone map (3x2)
      </div>
      <div className="grid gap-1">
        {zoneRows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-3 gap-1">
            {row.map((zone) => {
              const mappedRotation = getRotationForSetterZone(zone)
              const isActiveZone = setterZone === zone
              return (
                <button
                  key={zone}
                  type="button"
                  onClick={() => onRotationSelect(mappedRotation)}
                  className={cn(
                    'rounded-md border px-1 py-1 text-left transition-all',
                    isActiveZone
                      ? 'border-primary bg-primary/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                      : 'border-border bg-background/70 hover:bg-background'
                  )}
                >
                  <div className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Zone {zone}</div>
                  <div className="text-xs font-semibold">R{mappedRotation}</div>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
