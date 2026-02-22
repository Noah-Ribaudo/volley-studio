'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { useConvexAuth } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TeamCard, ImportTeamDialog, TeamSearchBar } from '@/components/team'
import { useAppStore } from '@/store/useAppStore'
import type { Team } from '@/lib/types'
import { toast } from 'sonner'
import { listLocalTeams, upsertLocalTeam } from '@/lib/localTeams'

const SEARCH_MIN_TEAM_COUNT = 10

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
  const [localTeams, setLocalTeams] = useState<Team[]>([])

  // Convex queries - automatically reactive
  const allCloudTeams = useQuery(api.teams.search, { query: '' })
  const teams = useQuery(api.teams.search, { query: searchQuery })
  const createTeam = useMutation(api.teams.create)
  const cloneTeam = useMutation(api.teams.clone)

  const isLoading = teams === undefined
  const isCloudTeamCountLoading = allCloudTeams === undefined

  const setCurrentTeam = useAppStore((state) => state.setCurrentTeam)
  const currentTeam = useAppStore((state) => state.currentTeam)

  useEffect(() => {
    const storedTeams = listLocalTeams()
    if (currentTeam?.id?.startsWith('local-') && !storedTeams.some((team) => team.id === currentTeam.id)) {
      const next = upsertLocalTeam(currentTeam)
      setLocalTeams(next)
      return
    }
    setLocalTeams(storedTeams)
  }, [currentTeam])

  const cloudTeamCount = allCloudTeams?.length ?? 0
  const totalTeamCount = cloudTeamCount + localTeams.length
  const shouldShowSearch = totalTeamCount >= SEARCH_MIN_TEAM_COUNT
  const hasAnyTeams = totalTeamCount > 0

  useEffect(() => {
    if (!shouldShowSearch && searchQuery) {
      setSearchQuery('')
    }
  }, [searchQuery, shouldShowSearch])

  const { isAuthenticated } = useConvexAuth()

  // Create a team instantly and navigate to the detail page
  const handleNewTeam = async () => {
    const defaultName = 'Untitled Team'
    const now = new Date().toISOString()

    if (isAuthenticated) {
      try {
        const slug = `${generateSlug(defaultName)}_${Date.now()}`
        const teamId = await createTeam({ name: defaultName, slug })
        router.push(`/teams/${teamId}`)
      } catch {
        toast.error('Failed to create team')
      }
    } else {
      const localTeam: Team = {
        id: `local-${Date.now()}`,
        name: defaultName,
        slug: generateSlug(defaultName),
        roster: [],
        lineups: [{
          id: 'default',
          name: 'Lineup 1',
          position_assignments: {},
          starting_rotation: 1,
          created_at: now,
        }],
        active_lineup_id: 'default',
        position_assignments: {},
        created_at: now,
        updated_at: now,
      }
      const nextLocalTeams = upsertLocalTeam(localTeam)
      setLocalTeams(nextLocalTeams)
      setCurrentTeam(localTeam)
      setSearchQuery('')
      router.push(`/teams/${localTeam.id}`)
    }
  }

  const openLocalTeamWhiteboard = (team: Team) => {
    setCurrentTeam(team)
    router.push('/')
  }

  const openLocalTeamEditor = (team: Team) => {
    setCurrentTeam(team)
    router.push(`/teams/${team.id}`)
  }

  // Handle team import via code
  const handleImportTeam = async (teamCode: string, password?: string) => {
    setIsImporting(true)
    try {
      await cloneTeam({
        id: teamCode as Id<"teams">,
        password,
      })
      // The teams list will auto-refresh via Convex reactivity
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        <h1 className="text-xl font-bold">Teams</h1>
        {/* Search (only after team list is large enough) */}
        {shouldShowSearch && (
          <TeamSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
          />
        )}

        {!shouldShowSearch && hasAnyTeams && !searchQuery && (
          <p className="text-sm text-muted-foreground">
            Search will appear automatically once you have more teams.
          </p>
        )}

        {/* Empty first-run state */}
        {!isLoading && !isCloudTeamCountLoading && !searchQuery && !hasAnyTeams && (
          <Card className="border-dashed border-border/70 bg-card/60">
            <CardContent className="pt-8 pb-8">
              <div className="mx-auto max-w-md text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <h2 className="text-lg font-semibold">No teams yet</h2>
                <p className="text-sm text-muted-foreground">
                  Create your first team or import one with a team code.
                </p>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Button onClick={handleNewTeam}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  New Team
                </Button>
                <ImportTeamDialog onImportTeam={handleImportTeam} isLoading={isImporting} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create & Import Cards */}
        {!searchQuery && hasAnyTeams && (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Create Team Card */}
            <Card className="bg-accent/50 border-accent/50">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-lg">Create New Team</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Start fresh with a new team
                </p>
                <Button onClick={handleNewTeam}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  New Team
                </Button>
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

        {/* Local Teams */}
        {!searchQuery && localTeams.length > 0 && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">Local Teams</h3>
                  <p className="text-sm text-muted-foreground">
                    Saved on this device only
                  </p>
                </div>
                {localTeams.map((team) => (
                  <div key={team.id} className="rounded-md border bg-background/60 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h4 className="font-medium leading-tight break-words">{team.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {team.roster.length} player{team.roster.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                        <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => openLocalTeamWhiteboard(team)}>
                          Whiteboard
                        </Button>
                        <Button size="sm" className="w-full sm:w-auto" onClick={() => openLocalTeamEditor(team)}>
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3 py-1">
            {[0, 1, 2].map((index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="pt-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0 space-y-2">
                      <Skeleton className="h-6 w-40 max-w-[70%]" />
                      <Skeleton className="h-4 w-56 max-w-[85%]" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                      <Skeleton className="h-8 w-16 rounded-md" />
                      <Skeleton className="h-8 w-20 rounded-md" />
                      <Skeleton className="h-8 w-14 rounded-md" />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Skeleton className="h-5 w-16 rounded-sm" />
                    <Skeleton className="h-5 w-20 rounded-sm" />
                    <Skeleton className="h-5 w-14 rounded-sm" />
                    <Skeleton className="h-5 w-24 rounded-sm" />
                  </div>
                </CardContent>
              </Card>
            ))}
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
                  lineups: (team.lineups || []).map(l => ({
                    ...l,
                    position_source: l.position_source as 'custom' | 'full-5-1' | '5-1-libero' | '6-2' | undefined,
                    starting_rotation: (l.starting_rotation as 1 | 2 | 3 | 4 | 5 | 6 | undefined) ?? 1,
                  })),
                  active_lineup_id: team.activeLineupId ?? null,
                  position_assignments: team.positionAssignments || {},
                  created_at: new Date(team._creationTime).toISOString(),
                  updated_at: new Date(team._creationTime).toISOString(),
                }}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && teams && teams.length === 0 && searchQuery && shouldShowSearch && (
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
