import { MinimalCard } from '@/components/minimal/MinimalCard'
import { ROLES, type Role, type RosterPlayer } from '@/lib/types'

interface MinimalAssignmentsCardProps {
  lineupName: string
  roster: RosterPlayer[]
  assignments: Partial<Record<Role, string | undefined>>
  onAssignPlayer: (role: Role, playerId: string | undefined) => void
}

export function MinimalAssignmentsCard({
  lineupName,
  roster,
  assignments,
  onAssignPlayer,
}: MinimalAssignmentsCardProps) {
  return (
    <MinimalCard
      title="Role Assignment"
      description={`Quick assignment list for ${lineupName}.`}
    >
      {roster.length === 0 ? (
        <p className="rounded-sm border border-border px-2.5 py-2 text-sm text-muted-foreground">
          Add players to your roster to assign roles.
        </p>
      ) : (
        <div className="space-y-2">
          {ROLES.map((role) => (
            <div key={role} className="grid grid-cols-[3rem,1fr] items-center gap-2">
              <label htmlFor={`minimal-role-${role}`} className="text-sm font-medium text-foreground">
                {role}
              </label>
              <select
                id={`minimal-role-${role}`}
                value={assignments[role] || ''}
                onChange={(event) => {
                  const nextValue = event.target.value
                  onAssignPlayer(role, nextValue ? nextValue : undefined)
                }}
                className="h-8 rounded-sm border border-border bg-background px-2 text-sm text-foreground"
              >
                <option value="">Unassigned</option>
                {roster.map((player) => (
                  <option key={player.id} value={player.id}>
                    #{player.number} {player.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </MinimalCard>
  )
}
