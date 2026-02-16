import { MinimalCard } from '@/components/minimal/MinimalCard'

interface MinimalTokenLabelsCardProps {
  showPosition: boolean
  showPlayer: boolean
  showNumber: boolean
  onShowPositionChange: (value: boolean) => void
  onShowPlayerChange: (value: boolean) => void
  onShowNumberChange: (value: boolean) => void
}

function LabelToggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-3 rounded-sm border border-border px-2.5 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[var(--primary)]"
      />
    </label>
  )
}

export function MinimalTokenLabelsCard({
  showPosition,
  showPlayer,
  showNumber,
  onShowPositionChange,
  onShowPlayerChange,
  onShowNumberChange,
}: MinimalTokenLabelsCardProps) {
  const enabledCount = Number(showPosition) + Number(showPlayer) + Number(showNumber)
  const canDisable = enabledCount > 1

  return (
    <MinimalCard title="Token Labels" description="Choose what appears on each player marker.">
      <div className="space-y-2">
        <LabelToggle
          id="minimal-show-position"
          label="Show Position"
          checked={showPosition}
          onChange={(next) => {
            if (!next && !canDisable) return
            onShowPositionChange(next)
          }}
        />
        <LabelToggle
          id="minimal-show-player"
          label="Show Player Name"
          checked={showPlayer}
          onChange={(next) => {
            if (!next && !canDisable) return
            onShowPlayerChange(next)
          }}
        />
        <LabelToggle
          id="minimal-show-number"
          label="Show Number"
          checked={showNumber}
          onChange={(next) => {
            if (!next && !canDisable) return
            onShowNumberChange(next)
          }}
        />
      </div>
    </MinimalCard>
  )
}
