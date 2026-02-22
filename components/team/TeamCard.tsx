'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Team, Lineup } from '@/lib/types'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface TeamCardProps {
  team: Team
}

export function TeamCard({ team }: TeamCardProps) {
  const [copied, setCopied] = useState(false)
  const rosterCount = team.roster?.length || 0
  const updatedDate = team.updated_at ? new Date(team.updated_at).toLocaleDateString() : undefined

  // Build the list of lineups to display.
  // Teams with no lineups get a synthetic "Default" entry.
  const displayLineups: { id: string | null; name: string; isActive: boolean }[] =
    team.lineups.length > 0
      ? team.lineups.map((l) => ({
          id: l.id,
          name: l.name,
          isActive: l.id === team.active_lineup_id,
        }))
      : rosterCount > 0
        ? [{ id: null, name: 'Default', isActive: true }]
        : []

  const MAX_VISIBLE = 5
  const visibleLineups = displayLineups.slice(0, MAX_VISIBLE)
  const hiddenCount = displayLineups.length - MAX_VISIBLE

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(team.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const whiteboardUrl = (lineupId: string | null) =>
    lineupId
      ? `/?team=${encodeURIComponent(team.id)}&lineup=${encodeURIComponent(lineupId)}`
      : `/?team=${encodeURIComponent(team.id)}`

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        {/* Header: team name + Code / Edit buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg leading-tight break-words">{team.name}</h3>
            <p className="text-sm text-muted-foreground">
              {rosterCount} player{rosterCount !== 1 ? 's' : ''}{updatedDate && <> &bull; Updated {updatedDate}</>}
            </p>
          </div>

          <div className="flex gap-2 sm:flex-wrap sm:justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyCode}
              className="text-muted-foreground min-w-0"
            >
              {copied ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-1"
                  >
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-1"
                  >
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                  </svg>
                  Code
                </>
              )}
            </Button>
            <Link href={`/teams/${team.id}`}>
              <Button size="sm" variant="outline" className="w-full sm:w-auto">
                Edit
              </Button>
            </Link>
          </div>
        </div>

        {/* Lineups — each with its own Whiteboard link */}
        {visibleLineups.length > 0 && (
          <div className="mt-3 space-y-1">
            {visibleLineups.map((lineup) => (
              <Link
                key={lineup.id ?? 'default'}
                href={whiteboardUrl(lineup.id)}
                className="flex items-center justify-between rounded-lg px-3 py-2 -mx-1 hover:bg-accent active:bg-accent/80 transition-colors group/lineup"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{lineup.name}</span>
                  {lineup.isActive && displayLineups.length > 1 && (
                    <span className="text-[11px] text-primary font-medium shrink-0">Active</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover/lineup:text-foreground transition-colors shrink-0">
                  <span>Whiteboard</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
            {hiddenCount > 0 && (
              <Link
                href={`/teams/${team.id}`}
                className="block text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1"
              >
                +{hiddenCount} more lineup{hiddenCount !== 1 ? 's' : ''}
              </Link>
            )}
          </div>
        )}

        {/* Roster preview */}
        {rosterCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {team.roster.slice(0, 6).map((player) => (
              <span
                key={player.id}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary"
              >
                {[player.number != null ? `#${player.number}` : null, player.name].filter(Boolean).join(' ')}
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
