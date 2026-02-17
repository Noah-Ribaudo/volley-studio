import { cn } from '@/lib/utils'

type SaveState = 'local' | 'synced' | 'pending' | 'saving'

interface MinimalHeaderStripProps {
  teamName: string
  lineupName: string
  rotationLabel: string
  phaseLabel: string
  saveState: SaveState
  allowAccent: boolean
}

function HeaderCell({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('rounded-sm border border-border px-2 py-1.5', className)}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function getSaveLabel(saveState: SaveState) {
  switch (saveState) {
    case 'local':
      return 'Local'
    case 'pending':
      return 'Unsaved'
    case 'saving':
      return 'Saving'
    default:
      return 'Synced'
  }
}

export function MinimalHeaderStrip({
  teamName,
  lineupName,
  rotationLabel,
  phaseLabel,
  saveState,
  allowAccent,
}: MinimalHeaderStripProps) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      <HeaderCell label="Team" value={teamName} />
      <HeaderCell label="Lineup" value={lineupName} />
      <HeaderCell label="Rotation" value={rotationLabel} />
      <HeaderCell label="Phase" value={phaseLabel} />
      <div className="rounded-sm border border-border px-2 py-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Save</p>
        <div
          className={cn(
            'mt-0.5 inline-flex h-6 w-[6.25rem] items-center justify-center rounded-sm border text-xs font-semibold transition-colors',
            saveState === 'pending' || saveState === 'saving'
              ? allowAccent
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-foreground/30 bg-foreground/10 text-foreground'
              : 'border-border bg-muted/40 text-foreground'
          )}
        >
          {getSaveLabel(saveState)}
        </div>
      </div>
    </div>
  )
}
