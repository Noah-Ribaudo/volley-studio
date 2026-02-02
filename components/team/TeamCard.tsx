'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Team } from '@/lib/types'
import Link from 'next/link'
import { TeamAccessDialog } from './TeamAccessDialog'

interface TeamCardProps {
  team: Team
}

export function TeamCard({ team }: TeamCardProps) {
  const [showAccessDialog, setShowAccessDialog] = useState(false)
  const rosterCount = team.roster?.length || 0
  const updatedDate = team.updated_at ? new Date(team.updated_at).toLocaleDateString() : undefined
  const hasPassword = team.password && team.password.trim() !== ''

  const handleOpenClick = (e: React.MouseEvent) => {
    if (hasPassword) {
      e.preventDefault()
      setShowAccessDialog(true)
    }
    // If no password, let the Link handle navigation normally
  }

  return (
    <>
      <Card className="group hover:shadow-md transition-shadow">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{team.name}</h3>
              <p className="text-sm text-muted-foreground">
                {rosterCount} player{rosterCount !== 1 ? 's' : ''}{updatedDate && <> • Updated {updatedDate}</>}
                {hasPassword && (
                  <span className="ml-2 inline-flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-muted-foreground"
                    >
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                )}
              </p>
            </div>

            <div className="flex gap-2">
              {hasPassword ? (
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleOpenClick}
                >
                  Open
                </Button>
              ) : (
                <Link href={`/teams/${team.slug}`}>
                  <Button size="sm" variant="default">
                    Open
                  </Button>
                </Link>
              )}
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

      {hasPassword && (
        <TeamAccessDialog
          team={team}
          open={showAccessDialog}
          onOpenChange={setShowAccessDialog}
        />
      )}
    </>
  )
}

