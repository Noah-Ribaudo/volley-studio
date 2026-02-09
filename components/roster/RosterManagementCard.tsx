'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RosterEditor, PositionAssigner } from '@/components/roster'
import { useAppStore } from '@/store/useAppStore'
import { isSupabaseConfigured, createTeam, updateTeam, getAllTeams, getTeamLayouts, generateSlug } from '@/lib/teams'
import { PositionAssignments, RosterPlayer, Team, CustomLayout } from '@/lib/types'
import { toast } from 'sonner'
import { getRandomTeamName } from '@/lib/teamNames'
import { useTeamSync } from '@/hooks/useTeamSync'
import { TeamConflictResolutionModal } from '@/components/volleyball/ConflictResolutionModal'
import Link from 'next/link'

// Default placeholder used for SSR to avoid hydration mismatch
const DEFAULT_TEAM_NAME = 'New Team'

export function RosterManagementCard() {
  const {
    currentTeam,
    setCurrentTeam,
    setAccessMode,
    setTeamPasswordProvided,
    setCustomLayouts,
    populateFromLayouts,
    showLibero,
  } = useAppStore()

  const [activeTab, setActiveTab] = useState<'roster' | 'positions'>('roster')
  const [isSaving, setIsSaving] = useState(false)
  const [localTeamId, setLocalTeamId] = useState<string | null>(null)
  const [localTeamName, setLocalTeamName] = useState<string>(DEFAULT_TEAM_NAME)
  const [localRoster, setLocalRoster] = useState<RosterPlayer[]>([])
  const [localAssignments, setLocalAssignments] = useState<PositionAssignments>({})

  const [teamError, setTeamError] = useState('')
  const [defaultTeamName, setDefaultTeamName] = useState(DEFAULT_TEAM_NAME)
  const [isHydrated, setIsHydrated] = useState(false)

  // Set random names only after hydration to avoid mismatch
  useEffect(() => {
    if (!isHydrated) {
      const randomName = getRandomTeamName()
      setDefaultTeamName(randomName)
      if (!currentTeam) {
        setLocalTeamName(randomName)
      }
      setIsHydrated(true)
    }
  }, [isHydrated, currentTeam])

  // Auto-save hook for team data (roster, lineups, team name)
  // Only activates when we have a saved team (localTeamId exists)
  useTeamSync(
    localRoster,
    currentTeam?.lineups || [],
    currentTeam?.active_lineup_id || null,
    localAssignments,
    localTeamName,
    localTeamId
  )

  // Initialize from current team or default blank
  useEffect(() => {
    if (currentTeam) {
      setLocalTeamId(currentTeam.id || null)
      const teamName = currentTeam.name || getRandomTeamName()
      setLocalTeamName(teamName)
      setLocalRoster(currentTeam.roster || [])
      setLocalAssignments(currentTeam.position_assignments || {})
    } else {
      // Start with empty roster and default name
      setLocalTeamId(null)
      setLocalRoster([])
      setLocalAssignments({})
    }
  }, [currentTeam])

  const handleRosterChange = (next: RosterPlayer[]) => {
    setLocalRoster(next)
    // Auto-save is handled by useTeamSync hook
  }

  const handleAssignmentsChange = (next: PositionAssignments) => {
    setLocalAssignments(next)
    // Auto-save is handled by useTeamSync hook
  }

  // Create a new team (only used when localTeamId is null)
  const handleCreateTeam = async () => {
    const name = localTeamName.trim() || getRandomTeamName()
    setIsSaving(true)
    setTeamError('')
    try {
      // No Supabase configured: save locally
      if (!isSupabaseConfigured()) {
        const localId = `local-${Date.now()}`
        const now = new Date().toISOString()
        const tempTeam: Team = {
          id: localId,
          name,
          slug: generateSlug(name),
          roster: localRoster,
          lineups: [],
          active_lineup_id: null,
          position_assignments: localAssignments,
          hasPassword: false,
          archived: false,
          created_at: now,
          updated_at: now
        }
        setCurrentTeam(tempTeam)
        setAccessMode('full')
        setTeamPasswordProvided(true)
        setLocalTeamId(localId)
        toast.success('Team created locally')
        return tempTeam
      }

      // Create in Supabase
      const created = await createTeam(name)
      const savedTeam = await updateTeam(created.id, {
        roster: localRoster,
        position_assignments: localAssignments
      })

      setCurrentTeam(savedTeam)
      setAccessMode('full')
      setTeamPasswordProvided(true)
      setLocalTeamId(savedTeam.id)

      // Refresh teams list
      await getAllTeams()

      // Load layouts for court
      const layouts = await getTeamLayouts(savedTeam.id)
      setCustomLayouts(layouts as CustomLayout[])
      // Populate whiteboard state from loaded layouts (positions, arrows, status tags, etc.)
      populateFromLayouts(layouts as CustomLayout[])

      toast.success('Team created')
      return savedTeam
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create team'
      setTeamError(msg)
      toast.error(msg)
      return null
    } finally {
      setIsSaving(false)
    }
  }

  // Determine if we're in "Practice Mode" (no saved team) or "Team Mode"
  const isTeamMode = localTeamId !== null
  const isPracticeMode = !isTeamMode
  const manageHref = currentTeam
    ? `/teams/${encodeURIComponent(currentTeam._id || currentTeam.id)}`
    : '/teams'

  return (
    <>
      {/* Team conflict resolution modal for auto-save conflicts */}
      <TeamConflictResolutionModal />
      <Card className="bg-card/80 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            {/* Mode indicator */}
            {isPracticeMode ? (
              <div>
                <CardTitle className="text-base text-muted-foreground">Practice Session</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Changes won't be saved</p>
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base truncate">{localTeamName}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Auto-saving</p>
              </div>
            )}

            {/* Team actions */}
            {isTeamMode && (
              <Link href={manageHref} className="shrink-0">
                <Button variant="ghost" size="sm" className="text-xs">
                  Manage
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* Practice mode: show team name input and save option */}
          {isPracticeMode && (
            <div className="space-y-2">
              <Label htmlFor="team-name" className="text-xs">Team Name</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="team-name"
                  value={localTeamName}
                  onChange={(e) => setLocalTeamName(e.target.value)}
                  placeholder={defaultTeamName}
                  className="h-9 flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleCreateTeam}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save as Team'}
                </Button>
              </div>
              {teamError && <p className="text-xs text-destructive">{teamError}</p>}
            </div>
          )}

          {/* Tabs - just roster and positions, no settings */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'roster' | 'positions')}>
            <TabsList className="grid w-full h-11 grid-cols-2">
              <TabsTrigger value="roster" className="text-sm">Roster</TabsTrigger>
              <TabsTrigger value="positions" className="text-sm">Positions</TabsTrigger>
            </TabsList>
            <TabsContent value="roster" className="mt-4">
              <RosterEditor
                roster={localRoster}
                onChange={handleRosterChange}
                isLoading={isSaving}
              />
            </TabsContent>
            <TabsContent value="positions" className="mt-4">
              <PositionAssigner
                roster={localRoster}
                assignments={localAssignments}
                onChange={handleAssignmentsChange}
                isLoading={isSaving}
                showLibero={showLibero}
              />
            </TabsContent>
          </Tabs>

          {/* Team mode: link to full roster page for settings and team switching */}
          {isTeamMode && (
            <div className="pt-2 border-t">
              <Link href={manageHref} className="w-full">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Settings & Team Admin
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
