'use client'

import { Button } from '@/components/ui/button'
import { formatCorePhaseLabel, getNextByPlay } from '@/lib/rebuild/prototypeFlow'
import { cn } from '@/lib/utils'
import { PlayButton, RotationRail } from './ControlShared'
import type { PrototypeControlProps } from './types'

export function Concept1WorkbookStateGraph({
  currentRotation,
  currentCorePhase,
  legalPlayLabel,
  onRotationSelect,
  onPhaseSelect,
  onPlay,
}: PrototypeControlProps) {
  const rows = [
    { from: 'SERVE', relation: '->', to: 'DEFENSE', note: 'One-way start' },
    { from: 'RECEIVE', relation: '->', to: 'OFFENSE', note: 'One-way start' },
    { from: 'OFFENSE', relation: '<->', to: 'DEFENSE', note: 'Live loop' },
  ] as const

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Concept 1</p>
          <h2 className="text-sm font-semibold">Workbook Rail + State Graph</h2>
        </div>
        <PlayButton legalPlayLabel={legalPlayLabel} onPlay={onPlay} />
      </div>

      <RotationRail currentRotation={currentRotation} onRotationSelect={onRotationSelect} className="overflow-x-auto pb-1" />

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-card/60 p-2">
        <div className="space-y-2">
          {rows.map((row) => {
            const fromActive = currentCorePhase === row.from
            const toPhase = row.to
            const currentNext = getNextByPlay(currentCorePhase)
            const highlightTarget = fromActive && currentNext === toPhase

            return (
              <div
                key={`${row.from}-${row.to}`}
                className={cn(
                  'grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 rounded-md border px-2 py-2 text-xs',
                  fromActive ? 'border-primary/50 bg-primary/5' : 'border-border bg-background/70'
                )}
              >
                <Button
                  type="button"
                  variant={currentCorePhase === row.from ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 justify-start text-[11px]"
                  onClick={() => onPhaseSelect(row.from)}
                >
                  {formatCorePhaseLabel(row.from)}
                </Button>
                <span className="text-muted-foreground">{row.relation}</span>
                <Button
                  type="button"
                  variant={currentCorePhase === row.to ? 'default' : 'outline'}
                  size="sm"
                  className={cn('h-7 justify-start text-[11px]', highlightTarget && 'border-primary text-primary')}
                  onClick={() => onPhaseSelect(row.to)}
                >
                  {formatCorePhaseLabel(row.to)}
                </Button>
                <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{row.note}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
