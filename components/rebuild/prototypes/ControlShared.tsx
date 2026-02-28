'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  CORE_PHASES,
  type CorePhase,
  formatCorePhaseLabel,
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
