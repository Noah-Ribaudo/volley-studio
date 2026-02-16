import { ROTATIONS, type Phase, type Rotation, type RallyPhase } from '@/lib/types'
import { getPhaseInfo } from '@/lib/phaseIcons'
import { MinimalCard } from '@/components/minimal/MinimalCard'

interface MinimalPhaseRotationCardProps {
  currentRotation: Rotation
  currentPhase: Phase
  visiblePhases: RallyPhase[]
  onRotationChange: (rotation: Rotation) => void
  onPhaseChange: (phase: Phase) => void
  onNextPhase: () => void
  onPrevPhase: () => void
  isPreviewingMovement: boolean
  onPlayToggle: () => void
}

export function MinimalPhaseRotationCard({
  currentRotation,
  currentPhase,
  visiblePhases,
  onRotationChange,
  onPhaseChange,
  onNextPhase,
  onPrevPhase,
  isPreviewingMovement,
  onPlayToggle,
}: MinimalPhaseRotationCardProps) {
  return (
    <MinimalCard title="Phase + Rotation" description="Control the current step and rotation.">
      <div className="space-y-3">
        <div className="grid grid-cols-[auto,1fr,auto] items-center gap-2">
          <button
            type="button"
            onClick={onPrevPhase}
            className="h-9 w-9 rounded-sm border border-border bg-background text-sm font-semibold text-foreground"
            aria-label="Previous phase"
          >
            ←
          </button>
          <select
            value={currentPhase}
            onChange={(event) => onPhaseChange(event.target.value as Phase)}
            className="h-9 rounded-sm border border-border bg-background px-2 text-sm text-foreground"
            aria-label="Phase"
          >
            {visiblePhases.map((phase) => (
              <option key={phase} value={phase}>
                {getPhaseInfo(phase).name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onNextPhase}
            className="h-9 w-9 rounded-sm border border-border bg-background text-sm font-semibold text-foreground"
            aria-label="Next phase"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-[5.5rem,1fr] items-center gap-2">
          <label htmlFor="minimal-rotation" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Rotation
          </label>
          <select
            id="minimal-rotation"
            value={String(currentRotation)}
            onChange={(event) => onRotationChange(Number(event.target.value) as Rotation)}
            className="h-9 rounded-sm border border-border bg-background px-2 text-sm text-foreground"
          >
            {ROTATIONS.map((rotation) => (
              <option key={rotation} value={String(rotation)}>
                Rotation {rotation}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onPlayToggle}
          className="h-9 w-full rounded-sm border border-border bg-muted/30 text-sm font-medium text-foreground"
        >
          {isPreviewingMovement ? 'Reset Movement' : 'Play Movement'}
        </button>
      </div>
    </MinimalCard>
  )
}
