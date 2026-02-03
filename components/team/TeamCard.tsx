'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Team } from '@/lib/types'
import Link from 'next/link'

interface TeamCardProps {
  team: Team
}

export function TeamCard({ team }: TeamCardProps) {
  const rosterCount = team.roster?.length || 0
  const updatedDate = team.updated_at ? new Date(team.updated_at).toLocaleDateString() : undefined

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{team.name}</h3>
            <p className="text-sm text-muted-foreground">
              {rosterCount} player{rosterCount !== 1 ? 's' : ''}{updatedDate && <> • Updated {updatedDate}</>}
            </p>
          </div>

          <div className="flex gap-2">
            <Link href={`/?team=${team.slug}`}>
              <Button size="sm" variant="default">
                Whiteboard
              </Button>
            </Link>
            <Link href={`/teams/${team.slug}`}>
              <Button size="sm" variant="outline">
                Edit
              </Button>
            </Link>
          </div>
        </div>

        {/* Roster preview */}
        {rosterCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {team.roster.slice(0, 6).map((player) => (
              <span
                key={player.id}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary"
              >
                #{player.number} {player.name}
              </span>
            ))}
            {rosterCount > 6 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-muted-foreground">
                +{rosterCount - 6} more
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
