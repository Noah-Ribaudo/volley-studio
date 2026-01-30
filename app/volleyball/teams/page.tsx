'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TeamCard, CreateTeamDialog, TeamSearchBar } from '@/components/team'
import { Team } from '@/lib/types'
import { getAllTeams, searchTeams, createTeam, isSupabaseConfigured } from '@/lib/teams'
import type { PresetSystem } from '@/lib/database.types'
import Link from 'next/link'

export default function TeamsPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSupabaseReady, setIsSupabaseReady] = useState(false)

  // Check Supabase configuration
  useEffect(() => {
    setIsSupabaseReady(isSupabaseConfigured())
  }, [])

  // Load teams
  const loadTeams = useCallback(async () => {
    if (!isSupabaseReady) return

    setIsLoading(true)
    setError(null)

    try {
      if (searchQuery) {
        const result = await searchTeams({ query: searchQuery, limit: 20 })
        setTeams(result.teams)
      } else {
        const data = await getAllTeams()
        setTeams(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, isSupabaseReady])

  useEffect(() => {
    loadTeams()
  }, [loadTeams])

  // Handle team creation
  const handleCreateTeam = async (name: string, password?: string, presetSystem?: PresetSystem) => {
    const newTeam = await createTeam(name, password, presetSystem)
    router.push(`/volleyball/teams/${newTeam.slug}`)
  }

  // Not configured UI
  if (!isSupabaseReady) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
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
        </header>

        <div className="container mx-auto px-4 py-8 max-w-2xl">
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
                  <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>
                </svg>
                <h2 className="text-lg font-semibold mb-2">Supabase Not Configured</h2>
                <p className="text-muted-foreground mb-4">
                  To use team management features, you need to set up Supabase.
                </p>
                <ol className="text-left text-sm text-muted-foreground space-y-2 max-w-md mx-auto">
                  <li>1. Create a free account at supabase.com</li>
                  <li>2. Create a new project</li>
                  <li>3. Run the SQL from <code className="bg-muted px-1 rounded">supabase/schema.sql</code></li>
                  <li>4. Add your credentials to <code className="bg-muted px-1 rounded">.env.local</code></li>
                </ol>
                <div className="mt-6">
                  <Link href="/volleyball">
                    <Button>Back to Practice Mode</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
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
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        {/* Search */}
        <TeamSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Error */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-4">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

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
        {!isLoading && teams.length > 0 && (
          <div className="space-y-3">
            {teams.map(team => (
              <TeamCard
                key={team.id}
                team={team}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && teams.length === 0 && searchQuery && (
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

