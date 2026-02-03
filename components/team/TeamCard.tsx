'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Team } from '@/lib/types'
import { Facehash } from 'facehash'
import Link from 'next/link'

interface TeamCardProps {
  team: Team
}

export function TeamCard({ team }: TeamCardProps) {
  const [copied, setCopied] = useState(false)
  const rosterCount = team.roster?.length || 0
  const updatedDate = team.updated_at ? new Date(team.updated_at).toLocaleDateString() : undefined

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(team.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Facehash name={team.id} size={48} />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{team.name}</h3>
              <p className="text-sm text-muted-foreground">
                {rosterCount} player{rosterCount !== 1 ? 's' : ''}{updatedDate && <> • Updated {updatedDate}</>}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyCode}
              className="text-muted-foreground"
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
