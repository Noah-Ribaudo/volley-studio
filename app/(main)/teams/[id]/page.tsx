'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { LineupSelector } from '@/components/roster/LineupSelector'
import { PositionAssigner } from '@/components/roster/PositionAssigner'
import type { Team, Lineup, PositionAssignments } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { generateSlug } from '@/lib/teamUtils'
import { getLocalTeamById, removeLocalTeam, upsertLocalTeam } from '@/lib/localTeams'
import { createLineup, duplicateLineup, ensureAtLeastOneLineup } from '@/lib/lineups'

interface TeamPageProps {
  params: Promise<{ id: string }>
}

export default function TeamEditPage({ params }: TeamPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const isLocalTeam = id.startsWith('local-')
  const setCurrentTeam = useAppStore((state) => state.setCurrentTeam)
  const currentTeam = useAppStore((state) => state.currentTeam)

  // Fetch team data by ID
  const team = useQuery(api.teams.getBySlugOrId, isLocalTeam ? 'skip' : { identifier: id })
  const updateTeam = useMutation(api.teams.update)
  const updateRoster = useMutation(api.teams.updateRoster)
  const updateLineups = useMutation(api.teams.updateLineups)
  const deleteTeam = useMutation(api.teams.remove)
  const [localTeam, setLocalTeam] = useState<Team | null>(() => (isLocalTeam ? getLocalTeamById(id) : null))

  // Local state for editing
  const [teamName, setTeamName] = useState('')
  const [isNameDirty, setIsNameDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Player editing state
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerNumber, setNewPlayerNumber] = useState('')
  const [playerDrafts, setPlayerDrafts] = useState<Record<string, { name: string; number: string }>>({})
  const [lineups, setLineups] = useState<Lineup[]>([])
  const [selectedLineupId, setSelectedLineupId] = useState<string | null>(null)
  const [activeLineupId, setActiveLineupId] = useState<string | null>(null)
  const [lineupAssignments, setLineupAssignments] = useState<PositionAssignments>({})
  const remoteTeam: Team | null = !isLocalTeam && team
    ? {
      id: team._id,
      _id: team._id,
      name: team.name,
      slug: team.slug,
      hasPassword: team.hasPassword,
      archived: team.archived,
      roster: team.roster.map((player) => ({
        id: player.id,
        name: player.name,
        number: player.number,
      })),
      lineups: (team.lineups || []).map((lineup) => ({
        id: lineup.id,
        name: lineup.name,
        position_assignments: lineup.position_assignments,
        position_source: lineup.position_source as 'custom' | 'full-5-1' | '5-1-libero' | '6-2' | undefined,
        created_at: lineup.created_at,
      })),
      active_lineup_id: team.activeLineupId ?? null,
      position_assignments: team.positionAssignments || {},
      created_at: new Date(team._creationTime).toISOString(),
      updated_at: new Date(team._creationTime).toISOString(),
    }
    : null
  const displayTeam = isLocalTeam ? localTeam : remoteTeam

  useEffect(() => {
    if (!isLocalTeam) return
    const nextLocalTeam = currentTeam?.id === id ? currentTeam : getLocalTeamById(id)
    setLocalTeam(nextLocalTeam)
    if (nextLocalTeam) {
      setCurrentTeam(nextLocalTeam)
    }
  }, [isLocalTeam, id, currentTeam, setCurrentTeam])

  useEffect(() => {
    if (!displayTeam || isNameDirty) return
    setTeamName(displayTeam.name)
  }, [displayTeam, isNameDirty])

  useEffect(() => {
    if (!displayTeam) return
    const nextDrafts: Record<string, { name: string; number: string }> = {}
    for (const player of displayTeam.roster) {
      nextDrafts[player.id] = {
        name: player.name ?? '',
        number: player.number !== undefined ? String(player.number) : '',
      }
    }
    setPlayerDrafts(nextDrafts)
  }, [displayTeam])

  useEffect(() => {
    if (!displayTeam) return
    const nextLineups = displayTeam.lineups.length > 0
      ? displayTeam.lineups
      : [createLineup('Lineup 1', displayTeam.position_assignments || {})]
    const nextActiveLineupId = displayTeam.active_lineup_id ?? nextLineups[0]?.id ?? null
    const nextSelectedLineupId = nextActiveLineupId ?? nextLineups[0]?.id ?? null
    const selectedLineup = nextLineups.find((lineup) => lineup.id === nextSelectedLineupId)

    setLineups(nextLineups)
    setActiveLineupId(nextActiveLineupId)
    setSelectedLineupId(nextSelectedLineupId)
    setLineupAssignments(selectedLineup?.position_assignments || {})
  }, [displayTeam])

  if (!isLocalTeam && team === undefined) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 py-8 text-center space-y-4">
          <h1 className="text-xl font-bold">Loading...</h1>
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        </div>
      </main>
    )
  }

  if ((isLocalTeam && localTeam === null) || (!isLocalTeam && team === null)) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 py-8 text-center space-y-2">
          <h1 className="text-xl font-bold">Team Not Found</h1>
          <p className="text-muted-foreground">This team doesn't exist or has been deleted.</p>
        </div>
      </main>
    )
  }
  const editorTeam = displayTeam as Team

  const persistRoster = async (nextRoster: Team['roster'], successMessage: string) => {
    setIsSaving(true)
    setActionError(null)
    try {
      if (isLocalTeam) {
        if (!localTeam) return false
        const updatedTeam: Team = {
          ...localTeam,
          roster: nextRoster,
        }
        upsertLocalTeam(updatedTeam)
        setLocalTeam(updatedTeam)
        setCurrentTeam(updatedTeam)
      } else {
        if (!team) return false
        await updateRoster({
          id: team._id,
          roster: nextRoster,
        })
      }
      toast.success(successMessage)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update roster'
      setActionError(message)
      toast.error(message)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const persistLineups = async (
    nextLineups: Lineup[],
    nextActiveLineupId: string | null,
    successMessage?: string
  ) => {
    const cleanAssignments = (assignments: PositionAssignments): Record<string, string> => {
      const cleaned: Record<string, string> = {}
      for (const [key, value] of Object.entries(assignments)) {
        if (value !== undefined) {
          cleaned[key] = value
        }
      }
      return cleaned
    }
    const ensured = ensureAtLeastOneLineup(nextLineups)
    const normalizedLineups = ensured.lineups.map((lineup) => ({
      ...lineup,
      position_assignments: cleanAssignments(lineup.position_assignments),
    }))
    const normalizedActiveLineupId = nextActiveLineupId && normalizedLineups.some((lineup) => lineup.id === nextActiveLineupId)
      ? nextActiveLineupId
      : ensured.newActiveId
    const activeLineup = normalizedLineups.find((lineup) => lineup.id === normalizedActiveLineupId)
    const activeAssignments = cleanAssignments(activeLineup?.position_assignments || {})

    setIsSaving(true)
    setActionError(null)
    try {
      if (isLocalTeam) {
        if (!localTeam) return false
        const updatedTeam: Team = {
          ...localTeam,
          lineups: normalizedLineups,
          active_lineup_id: normalizedActiveLineupId,
          position_assignments: activeAssignments,
        }
        upsertLocalTeam(updatedTeam)
        setLocalTeam(updatedTeam)
        setCurrentTeam(updatedTeam)
      } else {
        if (!team) return false
        await updateLineups({
          id: team._id,
          lineups: normalizedLineups.map((lineup) => ({
            id: lineup.id,
            name: lineup.name,
            position_assignments: cleanAssignments(lineup.position_assignments),
            position_source: lineup.position_source,
            created_at: lineup.created_at,
          })),
          activeLineupId: normalizedActiveLineupId || undefined,
          positionAssignments: activeAssignments,
        })
      }

      setLineups(normalizedLineups)
      setActiveLineupId(normalizedActiveLineupId)
      if (!selectedLineupId || !normalizedLineups.some((lineup) => lineup.id === selectedLineupId)) {
        setSelectedLineupId(normalizedActiveLineupId)
        setLineupAssignments(activeAssignments)
      }
      if (successMessage) {
        toast.success(successMessage)
      }
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update lineups'
      setActionError(message)
      toast.error(message)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveName = async () => {
    const sourceTeam = displayTeam
    if (!sourceTeam || !teamName.trim() || teamName === sourceTeam.name) return
    setIsSaving(true)
    setActionError(null)
    try {
      if (isLocalTeam) {
        if (!localTeam) return
        const updatedTeam: Team = {
          ...localTeam,
          name: teamName.trim(),
          slug: generateSlug(teamName.trim()),
        }
        upsertLocalTeam(updatedTeam)
        setLocalTeam(updatedTeam)
        setCurrentTeam(updatedTeam)
      } else {
        if (!team) return
        await updateTeam({ id: team._id, name: teamName.trim() })
      }
      setIsNameDirty(false)
      toast.success('Team name updated')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update team name'
      setActionError(message)
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddPlayer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const sourceTeam = displayTeam
    if (!sourceTeam) return
    const nextName = newPlayerName.trim()
    const normalizedNumber = newPlayerNumber.replace(/\D/g, '').slice(0, 3)
    if (!nextName && !normalizedNumber) {
      setActionError('Enter a player name, number, or both')
      return
    }
    const newPlayer = {
      id: `player-${Date.now()}`,
      name: nextName || undefined,
      number: normalizedNumber ? parseInt(normalizedNumber, 10) : undefined,
    }
    const didSave = await persistRoster([...sourceTeam.roster, newPlayer], 'Player added')
    if (didSave) {
      setNewPlayerName('')
      setNewPlayerNumber('')
    }
  }

  const handleRemovePlayer = async (playerId: string) => {
    const sourceTeam = displayTeam
    if (!sourceTeam) return
    void persistRoster(sourceTeam.roster.filter((player) => player.id !== playerId), 'Player removed')
  }

  const handleSavePlayer = async (playerId: string) => {
    const sourceTeam = displayTeam
    if (!sourceTeam) return

    const draft = playerDrafts[playerId]
    if (!draft) return

    const nextName = draft.name.trim()
    const normalizedNumber = draft.number.replace(/\D/g, '').slice(0, 3)
    if (!nextName && !normalizedNumber) {
      setActionError('Player must have a name, number, or both')
      return
    }

    const nextNumber = normalizedNumber ? parseInt(normalizedNumber, 10) : undefined
    const existingPlayer = sourceTeam.roster.find((player) => player.id === playerId)
    if (!existingPlayer) return

    if ((existingPlayer.name ?? '') === nextName && existingPlayer.number === nextNumber) {
      return
    }

    const nextRoster = sourceTeam.roster.map((player) => {
      if (player.id !== playerId) return player
      return {
        ...player,
        name: nextName || undefined,
        number: nextNumber,
      }
    })

    const didSave = await persistRoster(nextRoster, 'Player updated')
    if (didSave) {
      setPlayerDrafts((prev) => ({
        ...prev,
        [playerId]: {
          name: nextName,
          number: normalizedNumber,
        },
      }))
    }
  }

  const updatePlayerDraft = (playerId: string, field: 'name' | 'number', value: string) => {
    setPlayerDrafts((prev) => ({
      ...prev,
      [playerId]: {
        name: field === 'name' ? value : (prev[playerId]?.name ?? ''),
        number: field === 'number' ? value.replace(/\D/g, '').slice(0, 3) : (prev[playerId]?.number ?? ''),
      },
    }))
  }

  const handleSelectLineup = (lineupId: string) => {
    setSelectedLineupId(lineupId)
    const selected = lineups.find((lineup) => lineup.id === lineupId)
    setLineupAssignments(selected?.position_assignments || {})
  }

  const handleCreateLineup = async (name: string) => {
    const newLineup = createLineup(name, {})
    const nextLineups = [...lineups, newLineup]
    setSelectedLineupId(newLineup.id)
    setLineupAssignments({})
    await persistLineups(nextLineups, activeLineupId ?? newLineup.id, 'Lineup created')
  }

  const handleRenameLineup = async (lineupId: string, newName: string) => {
    const nextLineups = lineups.map((lineup) =>
      lineup.id === lineupId ? { ...lineup, name: newName } : lineup
    )
    await persistLineups(nextLineups, activeLineupId, 'Lineup renamed')
  }

  const handleDuplicateLineup = async (lineupId: string, newName: string) => {
    const sourceLineup = lineups.find((lineup) => lineup.id === lineupId)
    if (!sourceLineup) return
    const nextLineup = duplicateLineup(sourceLineup, newName)
    const nextLineups = [...lineups, nextLineup]
    setSelectedLineupId(nextLineup.id)
    setLineupAssignments(nextLineup.position_assignments || {})
    await persistLineups(nextLineups, activeLineupId ?? nextLineup.id, 'Lineup duplicated')
  }

  const handleDeleteLineup = async (lineupId: string) => {
    const filtered = lineups.filter((lineup) => lineup.id !== lineupId)
    const nextActive = activeLineupId === lineupId ? null : activeLineupId
    await persistLineups(filtered, nextActive, 'Lineup deleted')
  }

  const handleSetActiveLineup = async (lineupId: string) => {
    await persistLineups(lineups, lineupId, 'Active lineup updated')
  }

  const handleAssignmentsChange = async (nextAssignments: PositionAssignments) => {
    if (!selectedLineupId) return
    setLineupAssignments(nextAssignments)
    const nextLineups = lineups.map((lineup) =>
      lineup.id === selectedLineupId
        ? { ...lineup, position_assignments: nextAssignments }
        : lineup
    )
    await persistLineups(nextLineups, activeLineupId)
  }

  const handleDeleteTeam = async () => {
    setIsDeleting(true)
    setActionError(null)
    try {
      if (isLocalTeam) {
        removeLocalTeam(id)
        if (currentTeam?.id === id) {
          setCurrentTeam(null)
        }
      } else {
        if (!team) return
        await deleteTeam({ id: team._id })
      }
      router.push('/teams')
      toast.success(isLocalTeam ? 'Local team deleted' : 'Team deleted')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete team'
      setActionError(message)
      toast.error(message)
      setIsDeleting(false)
    }
  }
  const handleOpenWhiteboard = () => {
    if (!displayTeam) return
    if (isLocalTeam) {
      setCurrentTeam(displayTeam)
      router.push('/')
      return
    }

    if (team?._id) {
      router.push(`/?team=${encodeURIComponent(team._id)}`)
      return
    }

    router.push(`/?team=${encodeURIComponent(id)}`)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold">Edit Team</h1>
          <Button type="button" variant="outline" size="sm" onClick={handleOpenWhiteboard}>
            Open Whiteboard
          </Button>
        </div>
        {actionError && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="pt-4">
              <p className="text-sm text-destructive">{actionError}</p>
            </CardContent>
          </Card>
        )}
        {/* Team Name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team Name</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void handleSaveName()
              }}
            >
              <Input
                value={teamName}
                onChange={(e) => {
                  setTeamName(e.target.value)
                  setIsNameDirty(true)
                }}
                placeholder="Team name"
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={!isNameDirty || isSaving || !teamName.trim() || teamName === editorTeam.name}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Lineups */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lineups</CardTitle>
            <CardDescription>The active lineup is applied on the whiteboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LineupSelector
              lineups={lineups}
              selectedLineupId={selectedLineupId}
              activeLineupId={activeLineupId}
              onSelectLineup={handleSelectLineup}
              onCreateLineup={(name) => { void handleCreateLineup(name) }}
              onRenameLineup={(lineupId, newName) => { void handleRenameLineup(lineupId, newName) }}
              onDuplicateLineup={(lineupId, newName) => { void handleDuplicateLineup(lineupId, newName) }}
              onDeleteLineup={(lineupId) => { void handleDeleteLineup(lineupId) }}
              onSetActiveLineup={(lineupId) => { void handleSetActiveLineup(lineupId) }}
              disabled={isSaving}
            />
            <PositionAssigner
              roster={editorTeam.roster}
              assignments={lineupAssignments}
              onChange={(next) => { void handleAssignmentsChange(next) }}
              isLoading={isSaving}
            />
          </CardContent>
        </Card>

        {/* Roster */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Roster</CardTitle>
            <CardDescription>{editorTeam.roster.length} player{editorTeam.roster.length !== 1 ? 's' : ''}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add player form */}
            <form className="flex gap-2" onSubmit={handleAddPlayer}>
              <Input
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Player name"
                className="flex-1"
              />
              <Input
                value={newPlayerNumber}
                onChange={(e) => setNewPlayerNumber(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="#"
                className="w-20"
                maxLength={3}
                inputMode="numeric"
              />
              <Button
                type="submit"
                disabled={(!newPlayerName.trim() && !newPlayerNumber.trim()) || isSaving}
              >
                Add
              </Button>
            </form>

            {/* Player list */}
            {editorTeam.roster.length > 0 ? (
              <div className="space-y-2">
                {editorTeam.roster.map((player) => (
                  <form
                    key={player.id}
                    onSubmit={(e) => {
                      e.preventDefault()
                      void handleSavePlayer(player.id)
                    }}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        value={playerDrafts[player.id]?.number ?? ''}
                        onChange={(e) => updatePlayerDraft(player.id, 'number', e.target.value)}
                        className="w-20"
                        maxLength={3}
                        inputMode="numeric"
                        placeholder="#"
                      />
                      <Input
                        value={playerDrafts[player.id]?.name ?? ''}
                        onChange={(e) => updatePlayerDraft(player.id, 'name', e.target.value)}
                        className="flex-1"
                        placeholder="Player name"
                      />
                    </div>
                    <div className="ml-2 flex items-center gap-1">
                      <Button type="submit" size="sm" variant="outline" disabled={isSaving}>
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePlayer(player.id)}
                        className="text-destructive hover:text-destructive"
                        disabled={isSaving}
                      >
                        Remove
                      </Button>
                    </div>
                  </form>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No players yet. Add players above.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDangerZoneOpen((open) => {
                    const next = !open
                    if (!next) setShowDeleteConfirm(false)
                    return next
                  })
                }}
              >
                {dangerZoneOpen ? 'Hide' : 'Show'}
              </Button>
            </div>
          </CardHeader>
          {dangerZoneOpen && (
            <CardContent>
              {showDeleteConfirm ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This will permanently delete <strong>{editorTeam.name}</strong> and all its data. This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteTeam}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Team
                </Button>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </main>
  )
}
