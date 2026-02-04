'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TeamCard, CreateTeamDialog, TeamSearchBar } from '@/components/team'
import { SafeAreaHeader } from '@/components/ui/SafeAreaHeader'
import Link from 'next/link'

// Generate a URL-friendly slug from team name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export default function TeamsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  // Convex queries - automatically reactive
  const teams = useQuery(api.teams.search, { query: searchQuery })
  const createTeam = useMutation(api.teams.create)

  const isLoading = teams === undefined

  // Handle team creation
  const handleCreateTeam = async (name: string, password?: string) => {
    const slug = generateSlug(name)
    await createTeam({ name, slug, password })
    router.push(`/volleyball/teams/${slug}`)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <SafeAreaHeader>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/volleyball">
              <Button variant="ghost" size="sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <path d="m15 18-6-6 6-6"/>
                </svg>
                Back
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Teams</h1>
          </div>
        </div>
      </SafeAreaHeader>

      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        {/* Search */}
        <TeamSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Create Team Card - Standalone */}
        {!searchQuery && (
          <Card className="bg-accent/30 border-accent/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">Create New Team</h3>
                  <p className="text-sm text-muted-foreground">
                    Start a new team to manage players and rotations
                  </p>
                </div>
                <CreateTeamDialog onCreateTeam={handleCreateTeam} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading teams...</p>
          </div>
        )}

        {/* Teams List */}
        {!isLoading && teams && teams.length > 0 && (
          <div className="space-y-3">
            {teams.map(team => (
              <TeamCard
                key={team._id}
                team={{
                  id: team._id,
                  name: team.name,
                  slug: team.slug,
                  hasPassword: team.hasPassword,
                  archived: team.archived,
                  roster: team.roster.map(p => ({
                    id: p.id,
                    name: p.name,
                    number: p.number ?? 0,
                  })),
                  lineups: team.lineups.map(l => ({
                    ...l,
                    position_source: l.position_source as 'custom' | 'full-5-1' | '5-1-libero' | '6-2' | undefined,
                  })),
                  active_lineup_id: team.activeLineupId ?? null,
                  position_assignments: team.positionAssignments,
                  created_at: new Date(team._creationTime).toISOString(),
                  updated_at: new Date(team._creationTime).toISOString(),
                }}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && teams && teams.length === 0 && searchQuery && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto mb-4 text-muted-foreground"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <h2 className="text-lg font-semibold mb-2">No teams found</h2>
                <p className="text-muted-foreground mb-4">
                  Try a different search term
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
