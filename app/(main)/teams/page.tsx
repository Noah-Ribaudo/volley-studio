'use client'

import { SafeAreaHeader } from '@/components/ui/SafeAreaHeader'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TeamCard, CreateTeamDialog, ImportTeamDialog, TeamSearchBar } from '@/components/team'
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
  const [isImporting, setIsImporting] = useState(false)

  // Convex queries - automatically reactive
  const teams = useQuery(api.teams.search, { query: searchQuery })
  const createTeam = useMutation(api.teams.create)
  const cloneTeam = useMutation(api.teams.clone)

  const isLoading = teams === undefined

  // Handle team creation
  const handleCreateTeam = async (name: string, _password?: string, presetSystem?: string) => {
    const slug = generateSlug(name)
    await createTeam({ name, slug })
    router.push(`/teams/${slug}`)
  }

  // Handle team import via code
  const handleImportTeam = async (teamCode: string) => {
    setIsImporting(true)
    try {
      await cloneTeam({ id: teamCode as Id<"teams"> })
      // The teams list will auto-refresh via Convex reactivity
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <SafeAreaHeader>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/">
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

        {/* Create & Import Cards */}
        {!searchQuery && (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Create Team Card */}
            <Card className="bg-accent/30 border-accent/50">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-lg">Create New Team</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Start fresh with a new team
                </p>
                <CreateTeamDialog onCreateTeam={handleCreateTeam} />
              </CardContent>
            </Card>

            {/* Import Team Card */}
            <Card className="border-dashed">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-lg">Import Team</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Paste a team code to copy it
                </p>
                <ImportTeamDialog onImportTeam={handleImportTeam} isLoading={isImporting} />
              </CardContent>
            </Card>
          </div>
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
