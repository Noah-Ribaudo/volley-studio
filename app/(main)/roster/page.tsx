'use client'

import { SafeAreaHeader } from '@/components/ui/SafeAreaHeader'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PasswordInput } from '@/components/ui/password-input'
import { Combobox, ComboboxTrigger, ComboboxPopup, ComboboxList, ComboboxItem, ComboboxEmpty, ComboboxInput } from '@/components/ui/combobox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RosterEditor, PositionAssigner, LineupSelector } from '@/components/roster'
import { useAppStore } from '@/store/useAppStore'
import { isSupabaseConfigured, createTeam, updateTeam, getAllTeams, getTeamLayouts, generateSlug, getTeamShareUrl, archiveTeam } from '@/lib/teams'
import { PositionAssignments, RosterPlayer, Team, CustomLayout, Lineup, PositionSource } from '@/lib/types'
import { createLineup, duplicateLineup, getActiveLineup, ensureAtLeastOneLineup } from '@/lib/lineups'
import { toast } from 'sonner'
import { getRandomTeamName } from '@/lib/teamNames'
import { ArrowLeft01Icon, Share01Icon, Settings01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from 'next/link'

const DEFAULT_TEAM_NAME = 'New Team'

export default function RosterPage() {
  const router = useRouter()
  const {
    currentTeam,
    setCurrentTeam,
    setAccessMode,
    setTeamPasswordProvided,
    setCustomLayouts,
    populateFromLayouts,
    showLibero,
  } = useAppStore()

  const [activeTab, setActiveTab] = useState<'roster' | 'positions' | 'settings'>('roster')
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [localTeamId, setLocalTeamId] = useState<string | null>(null)
  const [localTeamName, setLocalTeamName] = useState<string>(DEFAULT_TEAM_NAME)
  const [localRoster, setLocalRoster] = useState<RosterPlayer[]>([])
  const [localAssignments, setLocalAssignments] = useState<PositionAssignments>({})

  // Lineup state
  const [localLineups, setLocalLineups] = useState<Lineup[]>([])
  const [selectedLineupId, setSelectedLineupId] = useState<string | null>(null)
  const [activeLineupId, setActiveLineupId] = useState<string | null>(null)

  // Team selector state (only for creating new teams)
  const [teams, setTeams] = useState<Team[]>([])
  const [teamSearch, setTeamSearch] = useState('')
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [teamError, setTeamError] = useState('')
  const [pendingTeam, setPendingTeam] = useState<Team | null>(null)
  const [showWarningDialog, setShowWarningDialog] = useState(false)
  const [defaultTeamName, setDefaultTeamName] = useState(DEFAULT_TEAM_NAME)
  const [initialTeamName, setInitialTeamName] = useState<string>(DEFAULT_TEAM_NAME)
  const [isHydrated, setIsHydrated] = useState(false)

  // Settings password state
  const [settingsPassword, setSettingsPassword] = useState('')
  const [settingsPasswordError, setSettingsPasswordError] = useState('')
  const [settingsUnlocked, setSettingsUnlocked] = useState(false)

  // Password management state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  // Server-side password verification mutation
  const verifyPasswordMutation = useMutation(api.teams.verifyPassword)

  // Set random names only after hydration
  useEffect(() => {
    if (!isHydrated) {
      const randomName = getRandomTeamName()
      setDefaultTeamName(randomName)
      if (!currentTeam) {
        setLocalTeamName(randomName)
        setInitialTeamName(randomName)
      }
      setIsHydrated(true)
    }
  }, [isHydrated, currentTeam])

  // Load teams for selector (only needed for creating new teams)
  useEffect(() => {
    const loadTeams = async () => {
      if (!isSupabaseConfigured()) {
        setTeamError('Supabase not configured')
        return
      }
      try {
        const data = await getAllTeams()
        setTeams(data)
        setTeamError('')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load teams'
        setTeamError(errorMessage)
        toast.error(`Failed to load teams: ${errorMessage}`)
      }
    }
    loadTeams()
  }, [])

  // Initialize from current team
  useEffect(() => {
    if (currentTeam) {
      setLocalTeamId(currentTeam.id || null)
      const teamName = currentTeam.name || getRandomTeamName()
      setLocalTeamName(teamName)
      setInitialTeamName(teamName)
      setLocalRoster(currentTeam.roster || [])

      // Initialize lineups - team now has lineups array via migration
      const teamLineups = currentTeam.lineups || []
      setLocalLineups(teamLineups)
      const teamActiveId = currentTeam.active_lineup_id
      setActiveLineupId(teamActiveId)

      // Select the active lineup, or first lineup if none active
      const activeLineup = getActiveLineup(currentTeam)
      if (activeLineup) {
        setSelectedLineupId(activeLineup.id)
        setLocalAssignments(activeLineup.position_assignments || {})
      } else {
        setSelectedLineupId(null)
        setLocalAssignments({})
      }

      setHasUnsavedChanges(false)
      setSettingsUnlocked(!currentTeam.hasPassword)
    } else {
      setLocalTeamId(null)
      setLocalRoster([])
      setLocalAssignments({})
      setLocalLineups([])
      setSelectedLineupId(null)
      setActiveLineupId(null)
      setHasUnsavedChanges(true)
      setSettingsUnlocked(false)
    }
  }, [currentTeam])

  // Debounced auto-save when team exists and has changes
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isAutoSaving = useRef(false)

  const performAutoSave = useCallback(async () => {
    if (isAutoSaving.current || !currentTeam || !localTeamId) return
    isAutoSaving.current = true
    try {
      await handleSave()
    } finally {
      isAutoSaving.current = false
    }
  }, [currentTeam, localTeamId])

  useEffect(() => {
    // Only auto-save when team exists and there are unsaved changes
    if (!currentTeam || !hasUnsavedChanges || isSaving) return

    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    // Set new timeout for auto-save (1.5 second debounce)
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave()
    }, 1500)

    // Cleanup on unmount or when dependencies change
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [currentTeam, hasUnsavedChanges, isSaving, localTeamName, localRoster, localLineups, localAssignments, performAutoSave])

  const markDirty = () => setHasUnsavedChanges(true)

  const handleRosterChange = (next: RosterPlayer[]) => {
    setLocalRoster(next)
    markDirty()
  }

  const handleAssignmentsChange = (next: PositionAssignments) => {
    setLocalAssignments(next)

    // Update the assignments in the selected lineup
    if (selectedLineupId) {
      setLocalLineups((prev) =>
        prev.map((lineup) =>
          lineup.id === selectedLineupId
            ? { ...lineup, position_assignments: next }
            : lineup
        )
      )
    }
    markDirty()
  }

  // Lineup management handlers
  const handleSelectLineup = (lineupId: string) => {
    const lineup = localLineups.find((l) => l.id === lineupId)
    if (lineup) {
      setSelectedLineupId(lineupId)
      setLocalAssignments(lineup.position_assignments || {})
    }
  }

  const handleCreateLineup = (name: string) => {
    const newLineup = createLineup(name, {})
    setLocalLineups((prev) => [...prev, newLineup])
    setSelectedLineupId(newLineup.id)
    setLocalAssignments({})

    // If this is the first lineup, also make it active
    if (localLineups.length === 0) {
      setActiveLineupId(newLineup.id)
    }
    markDirty()
  }

  const handleRenameLineup = (lineupId: string, newName: string) => {
    setLocalLineups((prev) =>
      prev.map((lineup) =>
        lineup.id === lineupId ? { ...lineup, name: newName } : lineup
      )
    )
    markDirty()
  }

  const handleDuplicateLineup = (lineupId: string, newName: string) => {
    const sourceLineup = localLineups.find((l) => l.id === lineupId)
    if (sourceLineup) {
      const newLineup = duplicateLineup(sourceLineup, newName)
      setLocalLineups((prev) => [...prev, newLineup])
      setSelectedLineupId(newLineup.id)
      setLocalAssignments(newLineup.position_assignments || {})
      markDirty()
    }
  }

  const handleDeleteLineup = (lineupId: string) => {
    const remainingLineups = localLineups.filter((l) => l.id !== lineupId)
    const { lineups: finalLineups, newActiveId } = ensureAtLeastOneLineup(remainingLineups)

    setLocalLineups(finalLineups)

    // If we deleted the active lineup, update active to the new one
    if (activeLineupId === lineupId) {
      setActiveLineupId(newActiveId)
    }

    // If we deleted the selected lineup, switch to the new active or first
    if (selectedLineupId === lineupId) {
      const newSelected = finalLineups.find((l) => l.id === newActiveId) || finalLineups[0]
      if (newSelected) {
        setSelectedLineupId(newSelected.id)
        setLocalAssignments(newSelected.position_assignments || {})
      }
    }
    markDirty()
  }

  const handleSetActiveLineup = (lineupId: string) => {
    setActiveLineupId(lineupId)
    markDirty()
  }

  const handlePositionSourceChange = (lineupId: string, source: PositionSource) => {
    setLocalLineups((prev) =>
      prev.map((lineup) =>
        lineup.id === lineupId
          ? { ...lineup, position_source: source }
          : lineup
      )
    )
    markDirty()
  }

  const handleSave = async () => {
    const name = localTeamName.trim() || getRandomTeamName()
    setIsSaving(true)
    setTeamError('')
    try {
      // Get the active lineup's assignments for backward compatibility
      const activeLineup = localLineups.find((l) => l.id === activeLineupId)
      const activeAssignments = activeLineup?.position_assignments || {}

      if (!isSupabaseConfigured()) {
        const localId = localTeamId ?? `local-${Date.now()}`
        const tempTeam: Team = {
          id: localId,
          name,
          slug: generateSlug(name),
          roster: localRoster,
          lineups: localLineups,
          active_lineup_id: activeLineupId,
          position_assignments: activeAssignments, // For backward compatibility
          hasPassword: false,
          archived: false,
          created_at: '',
          updated_at: ''
        }
        setCurrentTeam(tempTeam)
        setAccessMode('full')
        setTeamPasswordProvided(true)
        setLocalTeamId(localId)
        setHasUnsavedChanges(false)
        toast.success('Team saved locally')
        return tempTeam
      }

      let savedTeam: Team
      if (localTeamId) {
        savedTeam = await updateTeam(localTeamId, {
          name,
          roster: localRoster,
          lineups: localLineups,
          active_lineup_id: activeLineupId,
          position_assignments: activeAssignments // For backward compatibility
        })
      } else {
        const created = await createTeam(name)
        savedTeam = await updateTeam(created.id, {
          roster: localRoster,
          lineups: localLineups,
          active_lineup_id: activeLineupId,
          position_assignments: activeAssignments // For backward compatibility
        })
      }

      setCurrentTeam(savedTeam)
      setAccessMode('full')
      setTeamPasswordProvided(true)
      setLocalTeamId(savedTeam.id)
      setHasUnsavedChanges(false)

      const refreshed = await getAllTeams()
      setTeams(refreshed)

      const layouts = await getTeamLayouts(savedTeam.id)
      setCustomLayouts(layouts as CustomLayout[])
      populateFromLayouts(layouts as CustomLayout[])

      toast.success('Team saved')
      return savedTeam
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save team'
      setTeamError(msg)
      toast.error(msg)
      return null
    } finally {
      setIsSaving(false)
    }
  }

  const loadTeam = async (team: Team) => {
    setLoadingTeam(true)
    setTeamError('')
    try {
      setCurrentTeam(team)
      setAccessMode('full')
      setTeamPasswordProvided(true)
      setLocalTeamId(team.id)
      setLocalTeamName(team.name || getRandomTeamName())
      setLocalRoster(team.roster || [])

      // Load lineups
      const teamLineups = team.lineups || []
      setLocalLineups(teamLineups)
      setActiveLineupId(team.active_lineup_id)

      // Select and load the active lineup
      const activeLineup = getActiveLineup(team)
      if (activeLineup) {
        setSelectedLineupId(activeLineup.id)
        setLocalAssignments(activeLineup.position_assignments || {})
      } else {
        setSelectedLineupId(null)
        setLocalAssignments({})
      }

      setHasUnsavedChanges(false)

      const layouts = await getTeamLayouts(team.id)
      setCustomLayouts(layouts as CustomLayout[])
      populateFromLayouts(layouts as CustomLayout[])

      // Use hasPassword boolean (password is never sent to client)
      setSettingsUnlocked(!team.hasPassword)

      setComboboxOpen(false)
      setPendingTeam(null)
      setTeamSearch('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load team'
      setTeamError(msg)
      toast.error(msg)
    } finally {
      setLoadingTeam(false)
    }
  }

  const hasActualChanges = hasUnsavedChanges && (
    localTeamId !== null ||
    localRoster.length > 0 ||
    Object.keys(localAssignments).length > 0 ||
    (localTeamName.trim() !== '' && localTeamName.trim() !== initialTeamName.trim())
  )

  const handleSelectTeam = async (team: Team) => {
    // If creating a new team (no currentTeam) with actual content, warn before discarding
    if (!currentTeam && hasActualChanges) {
      setPendingTeam(team)
      setShowWarningDialog(true)
      setComboboxOpen(false)
      return
    }
    loadTeam(team)
    setComboboxOpen(false)
    setTeamSearch('')
  }

  const handleConfirmLoad = async () => {
    if (pendingTeam) {
      await loadTeam(pendingTeam)
      setPendingTeam(null)
    }
    setShowWarningDialog(false)
    setTeamSearch('')
  }

  const handleCreateAndLoad = async () => {
    if (pendingTeam) {
      const saved = await handleSave()
      if (saved) {
        await loadTeam(pendingTeam)
        setPendingTeam(null)
      }
    }
    setShowWarningDialog(false)
    setTeamSearch('')
  }

  const filteredTeams: Team[] = useMemo(() => {
    const q = teamSearch.toLowerCase()
    return teams.filter(t =>
      t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
    )
  }, [teams, teamSearch])

  const handleSettingsPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSettingsPasswordError('')
    if (!currentTeam || !currentTeam.hasPassword) return
    if (!settingsPassword.trim()) {
      setSettingsPasswordError('Please enter a password')
      return
    }

    try {
      // Verify password server-side (password is never sent to client)
      const teamId = (currentTeam._id || currentTeam.id) as Id<"teams">
      const isValid = await verifyPasswordMutation({
        id: teamId,
        password: settingsPassword.trim()
      })

      if (isValid) {
        setSettingsUnlocked(true)
        setSettingsPassword('')
        setSettingsPasswordError('')
      } else {
        setSettingsPasswordError('Incorrect password')
      }
    } catch (err) {
      setSettingsPasswordError('Failed to verify password')
    }
  }

  const copyShareLink = () => {
    if (!currentTeam) return
    const url = getTeamShareUrl(currentTeam.slug)
    navigator.clipboard.writeText(url)
    toast.success('Share link copied!')
  }

  const handlePasswordUpdate = async () => {
    if (!currentTeam || !localTeamId) return
    setPasswordError('')
    if (newPassword.trim() && newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    if (!newPassword.trim() && confirmPassword.trim()) {
      setPasswordError('Please clear both fields to remove password')
      return
    }
    setIsUpdatingPassword(true)
    try {
      const updated = await updateTeam(localTeamId, {
        password: newPassword.trim() || null
      })
      setCurrentTeam(updated)
      setNewPassword('')
      setConfirmPassword('')
      if (!newPassword.trim()) {
        setSettingsUnlocked(true)
      }
      toast.success(newPassword.trim() ? 'Password updated' : 'Password removed')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleArchiveTeam = async () => {
    if (!currentTeam || !localTeamId) return
    if (!confirm('Are you sure you want to archive this team?')) return
    setIsArchiving(true)
    try {
      await archiveTeam(localTeamId)
      toast.success('Team archived')
      setCurrentTeam(null)
      setLocalTeamId(null)
      setLocalTeamName(getRandomTeamName())
      setLocalRoster([])
      setLocalAssignments({})
      setLocalLineups([])
      setSelectedLineupId(null)
      setActiveLineupId(null)
      setHasUnsavedChanges(false)
      setSettingsUnlocked(false)
      if (isSupabaseConfigured()) {
        const refreshed = await getAllTeams()
        setTeams(refreshed)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to archive team')
    } finally {
      setIsArchiving(false)
    }
  }

  const isTeamLoaded = currentTeam !== null

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <SafeAreaHeader>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" className="min-w-11 min-h-11" aria-label="Back to whiteboard">
                  <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-primary truncate">
                  {currentTeam ? localTeamName : 'Create Team'}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {currentTeam ? `${localRoster.length} player${localRoster.length !== 1 ? 's' : ''}` : 'Start with a new team'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Auto-save status indicator - only shown when team exists */}
              {isTeamLoaded && (
                <span className="text-xs text-muted-foreground">
                  {isSaving ? 'Saving...' : 'Saved'}
                </span>
              )}

              {/* Switch team link - deliberate action to go to Teams page */}
              {isTeamLoaded && (
                <Link href="/teams">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    Switch Team
                    <HugeiconsIcon icon={ArrowRight01Icon} className="h-3 w-3" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </SafeAreaHeader>

      <div className="container mx-auto px-4 py-4 pb-32 max-w-2xl space-y-4">
        {!isTeamLoaded ? (
          <>
            {/* Load Existing Team - Just a dropdown button */}
            {teams.length > 0 && (
              <div className="flex justify-end">
                <Combobox
                  open={comboboxOpen}
                  onOpenChange={(open) => {
                    setComboboxOpen(open)
                    if (!open) setTeamSearch('')
                  }}
                >
                  <ComboboxTrigger className="justify-between">
                    <span className="truncate">Load Existing Team</span>
                  </ComboboxTrigger>
                  <ComboboxPopup align="end" className="w-[calc(100vw-2rem)] max-w-sm">
                    <div className="p-2">
                      <ComboboxInput
                        placeholder="Search teams..."
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                        className="mb-2"
                      />
                    </div>
                    <ComboboxList>
                      {teamError ? (
                        <ComboboxEmpty>
                          <div className="text-destructive">{teamError}</div>
                        </ComboboxEmpty>
                      ) : filteredTeams.length === 0 ? (
                        <ComboboxEmpty>No teams found</ComboboxEmpty>
                      ) : (
                        filteredTeams.map((team) => (
                          <ComboboxItem
                            key={team.id}
                            value={team.slug}
                            onSelect={() => handleSelectTeam(team)}
                            onClick={() => handleSelectTeam(team)}
                            className="cursor-pointer py-3"
                          >
                            <div className="flex flex-col pointer-events-none">
                              <div className="font-medium">{team.name}</div>
                              <div className="text-xs text-muted-foreground">{team.slug}</div>
                            </div>
                          </ComboboxItem>
                        ))
                      )}
                    </ComboboxList>
                  </ComboboxPopup>
                </Combobox>
              </div>
            )}

            {/* Create New Team - Main content */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Create New Team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="team-name" className="text-xs font-medium">Team Name</Label>
                  <Input
                    id="team-name"
                    value={localTeamName}
                    onChange={(e) => {
                      setLocalTeamName(e.target.value)
                      markDirty()
                    }}
                    placeholder={defaultTeamName}
                    className="h-10"
                  />
                </div>
                <RosterEditor
                  roster={localRoster}
                  onChange={handleRosterChange}
                  isLoading={isSaving || loadingTeam}
                />
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full"
                >
                  {isSaving ? 'Creating...' : 'Create Team'}
                </Button>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Team name editor - simplified, no inline team switching */}
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="team-name" className="text-xs font-medium">Team Name</Label>
                  <Input
                    id="team-name"
                    value={localTeamName}
                    onChange={(e) => {
                      setLocalTeamName(e.target.value)
                      markDirty()
                    }}
                    placeholder={defaultTeamName}
                    className="h-10"
                  />
                </div>
                {teamError && <p className="text-xs text-destructive mt-2">{teamError}</p>}
              </CardContent>
            </Card>

            {/* Tabs - shown when editing */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'roster' | 'positions' | 'settings')}>
              <TabsList className="grid w-full h-11 grid-cols-3">
                <TabsTrigger value="roster" className="text-sm">Players</TabsTrigger>
                <TabsTrigger value="positions" className="text-sm">Positions</TabsTrigger>
                <TabsTrigger value="settings" className="text-sm">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="roster" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Team Roster</CardTitle>
                    <CardDescription>Add players to your team</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RosterEditor
                      roster={localRoster}
                      onChange={handleRosterChange}
                      isLoading={isSaving || loadingTeam}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="positions" className="mt-4 space-y-4">
                {/* Lineup Selector */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Lineups</CardTitle>
                    <CardDescription>
                      Create different configurations for your team
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LineupSelector
                      lineups={localLineups}
                      selectedLineupId={selectedLineupId}
                      activeLineupId={activeLineupId}
                      onSelectLineup={handleSelectLineup}
                      onCreateLineup={handleCreateLineup}
                      onRenameLineup={handleRenameLineup}
                      onDuplicateLineup={handleDuplicateLineup}
                      onDeleteLineup={handleDeleteLineup}
                      onSetActiveLineup={handleSetActiveLineup}
                      onPositionSourceChange={handlePositionSourceChange}
                      disabled={isSaving || loadingTeam}
                    />
                  </CardContent>
                </Card>

                {/* Position Assigner */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Position Assignments</CardTitle>
                    <CardDescription>
                      {selectedLineupId
                        ? `Editing: ${localLineups.find((l) => l.id === selectedLineupId)?.name || 'Lineup'}`
                        : 'Select or create a lineup above'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PositionAssigner
                      roster={localRoster}
                      assignments={localAssignments}
                      onChange={handleAssignmentsChange}
                      isLoading={isSaving || loadingTeam || !selectedLineupId}
                      showLibero={showLibero}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="mt-4">
              {!settingsUnlocked && currentTeam?.hasPassword ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8 space-y-4">
                      <div className="flex justify-center">
                        <HugeiconsIcon icon={Settings01Icon} className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Settings Locked</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          Enter the team password to access settings
                        </p>
                      </div>
                      <form onSubmit={handleSettingsPasswordSubmit} className="max-w-sm mx-auto space-y-4">
                        <PasswordInput
                          value={settingsPassword}
                          onChange={(e) => {
                            setSettingsPassword(e.target.value)
                            setSettingsPasswordError('')
                          }}
                          placeholder="Enter team password"
                          autoFocus
                          className="w-full"
                        />
                        {settingsPasswordError && (
                          <p className="text-sm text-destructive">{settingsPasswordError}</p>
                        )}
                        <Button type="submit" className="w-full">Unlock Settings</Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Team Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Share Link</Label>
                      <div className="flex gap-2">
                        <Input
                          value={currentTeam ? getTeamShareUrl(currentTeam.slug) : ''}
                          readOnly
                          className="text-sm"
                        />
                        <Button variant="outline" size="icon" onClick={copyShareLink}>
                          <HugeiconsIcon icon={Share01Icon} className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-sm">Team Password</Label>
                      <div className="space-y-2">
                        <PasswordInput
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value)
                            setPasswordError('')
                          }}
                          placeholder="New password"
                          className="w-full"
                        />
                        <PasswordInput
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value)
                            setPasswordError('')
                          }}
                          placeholder="Confirm password"
                          className="w-full"
                        />
                        {passwordError && (
                          <p className="text-sm text-destructive">{passwordError}</p>
                        )}
                        <Button
                          onClick={handlePasswordUpdate}
                          disabled={isUpdatingPassword}
                          size="sm"
                          variant="outline"
                        >
                          {isUpdatingPassword ? 'Updating...' : newPassword.trim() ? 'Set Password' : 'Remove Password'}
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-sm text-destructive">Danger Zone</Label>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleArchiveTeam}
                        disabled={isArchiving || !localTeamId}
                      >
                        {isArchiving ? 'Archiving...' : 'Archive Team'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Warning Dialog - shown when creating a new team and trying to load a different one */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard new team?</DialogTitle>
            <DialogDescription>
              You've started creating a new team. Loading a different team will discard your work.
            </DialogDescription>
          </DialogHeader>
          {pendingTeam && (
            <p className="text-sm text-muted-foreground py-2">
              Load: <span className="font-medium">{pendingTeam.name}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={() => { setShowWarningDialog(false); setPendingTeam(null); }}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleConfirmLoad}>
              Discard & Load
            </Button>
            <Button onClick={handleCreateAndLoad} disabled={isSaving}>
              {isSaving ? 'Creating...' : 'Create & Load'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
