import Link from 'next/link'
import { MinimalCard } from '@/components/minimal/MinimalCard'

type TeamOption = {
  value: string
  label: string
  group: 'actions' | 'cloud' | 'local'
}

type LineupOption = {
  value: string
  label: string
}

interface MinimalTeamCardProps {
  teamValue: string
  teamOptions: TeamOption[]
  lineupValue: string
  lineupOptions: LineupOption[]
  hasTeam: boolean
  isLineupSaving: boolean
  manageHref: string
  onTeamChange: (value: string) => void
  onLineupChange: (value: string) => void
  onManageRoster: () => void
}

export function MinimalTeamCard({
  teamValue,
  teamOptions,
  lineupValue,
  lineupOptions,
  hasTeam,
  isLineupSaving,
  manageHref,
  onTeamChange,
  onLineupChange,
  onManageRoster,
}: MinimalTeamCardProps) {
  const actionOptions = teamOptions.filter((option) => option.group === 'actions')
  const cloudOptions = teamOptions.filter((option) => option.group === 'cloud')
  const localOptions = teamOptions.filter((option) => option.group === 'local')

  return (
    <MinimalCard title="Team + Lineup" description="Switch teams and open editing from here.">
      <div className="space-y-2.5">
        <div className="space-y-1">
          <label htmlFor="minimal-team-select" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Team
          </label>
          <select
            id="minimal-team-select"
            value={teamValue}
            onChange={(event) => onTeamChange(event.target.value)}
            className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm text-foreground"
          >
            {actionOptions.length > 0 && (
              <optgroup label="Actions">
                {actionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            )}
            {cloudOptions.length > 0 && (
              <optgroup label="Cloud Teams">
                {cloudOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            )}
            {localOptions.length > 0 && (
              <optgroup label="Local Teams">
                {localOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="minimal-lineup-select" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Lineup
          </label>
          <select
            id="minimal-lineup-select"
            value={lineupValue}
            onChange={(event) => onLineupChange(event.target.value)}
            disabled={!hasTeam || isLineupSaving}
            className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {!hasTeam && <option value="__none__">Select a team first</option>}
            {hasTeam && lineupOptions.length === 0 && <option value="__none__">No lineups</option>}
            {lineupOptions.map((lineup) => (
              <option key={lineup.value} value={lineup.value}>
                {lineup.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onManageRoster}
            className="h-8 rounded-sm border border-border bg-background text-sm text-foreground"
          >
            Edit Roster
          </button>
          <Link
            href={manageHref}
            className="flex h-8 items-center justify-center rounded-sm border border-border bg-background text-sm text-foreground"
          >
            Edit Team
          </Link>
        </div>
      </div>
    </MinimalCard>
  )
}
