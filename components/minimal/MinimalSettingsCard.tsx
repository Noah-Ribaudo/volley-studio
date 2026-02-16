import Link from 'next/link'
import { MinimalCard } from '@/components/minimal/MinimalCard'
import { cn } from '@/lib/utils'

interface MinimalSettingsCardProps {
  contrast: 'soft' | 'high'
  allowAccent: boolean
  denseLayout: boolean
  onContrastChange: (contrast: 'soft' | 'high') => void
  onAllowAccentChange: (allow: boolean) => void
  onDenseLayoutChange: (dense: boolean) => void
  onExit: () => void
}

function SettingToggle({
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

export function MinimalSettingsCard({
  contrast,
  allowAccent,
  denseLayout,
  onContrastChange,
  onAllowAccentChange,
  onDenseLayoutChange,
  onExit,
}: MinimalSettingsCardProps) {
  return (
    <MinimalCard title="Minimal Settings" description="Display preferences for this focused view.">
      <div className="space-y-2">
        <div className="rounded-sm border border-border p-1">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Contrast</p>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => onContrastChange('soft')}
              className={cn(
                'h-8 rounded-sm border text-sm',
                contrast === 'soft'
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border bg-background text-foreground'
              )}
            >
              Soft
            </button>
            <button
              type="button"
              onClick={() => onContrastChange('high')}
              className={cn(
                'h-8 rounded-sm border text-sm',
                contrast === 'high'
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border bg-background text-foreground'
              )}
            >
              High
            </button>
          </div>
        </div>

        <SettingToggle
          id="minimal-allow-accent"
          label="Allow Accent Color"
          checked={allowAccent}
          onChange={onAllowAccentChange}
        />
        <SettingToggle
          id="minimal-dense-layout"
          label="Dense Layout"
          checked={denseLayout}
          onChange={onDenseLayoutChange}
        />

        <Link
          href="/"
          onClick={onExit}
          className="mt-1 flex h-9 items-center justify-center rounded-sm border border-border bg-background text-sm font-medium text-foreground"
        >
          Exit Minimal Mode
        </Link>
      </div>
    </MinimalCard>
  )
}
