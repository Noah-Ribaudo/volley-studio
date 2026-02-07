'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VolleyballCourt } from '@/components/court'
import {
  RotationControlBar,
  PhaseSelector,
  RoleHighlighter,
  RotationInfoCard
} from '@/components/controls'
import { RosterEditor } from '@/components/roster/RosterEditor'
import { PositionAssigner } from '@/components/roster/PositionAssigner'
import { PasswordInput } from '@/components/ui/password-input'
import { Role, Phase, Rotation, Position, RosterPlayer, PositionAssignments, RALLY_PHASES, DEFAULT_VISIBLE_PHASES, CustomLayout, PositionCoordinates, RallyPhase } from '@/lib/types'
import { DEFAULT_BASE_ORDER } from '@/lib/rotations'
import { getWhiteboardPositions, getNextPhaseInFlow } from '@/lib/whiteboard'
import { getCurrentPositions as getStorePositions, useAppStore } from '@/store/useAppStore'
import Link from 'next/link'
import type { Id } from '@/convex/_generated/dataModel'

interface TeamPageProps {
  params: Promise<{ id: string }>
}

export default function TeamPage({ params }: TeamPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const showLibero = useAppStore((state) => state.showLibero)

  // Convex queries and mutations
  const team = useQuery(api.teams.getBySlugOrId, { identifier: id })
  const layouts = useQuery(
    api.layouts.getByTeam,
    team?._id ? { teamId: team._id } : "skip"
  )
  const updateTeam = useMutation(api.teams.update)
  const updateRoster = useMutation(api.teams.updateRoster)
  const updatePositionAssignments = useMutation(api.teams.updatePositionAssignments)
  const saveLayout = useMutation(api.layouts.save)

  // UI state
  const [currentRotation, setCurrentRotation] = useState<Rotation>(1)
  const [currentPhase, setCurrentPhase] = useState<Phase>('PRE_SERVE')
  const [highlightedRole, setHighlightedRole] = useState<Role | null>(null)
  const [visiblePhases, setVisiblePhases] = useState<Set<RallyPhase>>(new Set(DEFAULT_VISIBLE_PHASES))
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Password state
  const [settingsPassword, setSettingsPassword] = useState('')
  const [settingsPasswordError, setSettingsPasswordError] = useState('')
  const [settingsUnlocked, setSettingsUnlocked] = useState(false)

  // Server-side password verification mutation
  const verifyPasswordMutation = useMutation(api.teams.verifyPassword)

  // Update name input when team loads
  useEffect(() => {
    if (team) {
      setNewName(team.name)
      // Check if team has password - if not, unlock settings immediately
      setSettingsUnlocked(!team.hasPassword)
    }
  }, [team])

  // Convert Convex layouts to CustomLayout format
  const customLayouts: CustomLayout[] = (layouts || []).map(l => ({
    id: l._id,
    _id: l._id,
    team_id: l.teamId,
    teamId: l.teamId,
    rotation: l.rotation as Rotation,
    phase: l.phase as Phase,
    positions: l.positions as unknown as PositionCoordinates,
    flags: l.flags || null,
  }))

  // Get current positions (from layout or whiteboard defaults)
  const getCurrentPositions = useCallback(() => {
    const layout = customLayouts.find(
      l => l.rotation === currentRotation && l.phase === currentPhase
    )
    if (layout) {
      return layout.positions
    }
    // Use whiteboard positions for RallyPhase, fallback to store function for legacy
    if (RALLY_PHASES.includes(currentPhase as RallyPhase)) {
      const result = getWhiteboardPositions({
        rotation: currentRotation,
        phase: currentPhase as RallyPhase,
        isReceiving: true,
        showLibero,
      })
      return result.home
    }
    // Fallback for legacy phases (shouldn't happen, but safe)
    return getStorePositions(
      currentRotation,
      currentPhase,
      {},
      customLayouts,
      null,
      true,
      DEFAULT_BASE_ORDER,
      showLibero
    )
  }, [customLayouts, currentRotation, currentPhase, showLibero])

  // Phase navigation functions using RallyPhase flow
  const nextPhase = useCallback(() => {
    if (RALLY_PHASES.includes(currentPhase as RallyPhase)) {
      let next = getNextPhaseInFlow(currentPhase as RallyPhase)
      let loopedBack = false
      let iterations = 0
      const maxIterations = RALLY_PHASES.length

      // Skip hidden phases
      while (!visiblePhases.has(next) && iterations < maxIterations) {
        iterations++
        if (next === 'PRE_SERVE' && currentPhase !== 'PRE_SERVE') {
          loopedBack = true
          break
        }
        const current = next
        next = getNextPhaseInFlow(current)
        if (next === currentPhase as RallyPhase) {
          break
        }
      }

      if (loopedBack || (next === 'PRE_SERVE' && currentPhase !== 'PRE_SERVE')) {
        setCurrentPhase(next as Phase)
        setCurrentRotation(currentRotation === 6 ? 1 : (currentRotation + 1) as Rotation)
      } else {
        setCurrentPhase(next as Phase)
      }
    }
  }, [currentPhase, currentRotation, visiblePhases])

  const prevPhase = useCallback(() => {
    if (RALLY_PHASES.includes(currentPhase as RallyPhase)) {
      const phaseFlow: Record<RallyPhase, RallyPhase> = {
        'PRE_SERVE': 'DEFENSE_PHASE',
        'SERVE_IN_AIR': 'PRE_SERVE',
        'SERVE_RECEIVE': 'SERVE_IN_AIR',
        'TRANSITION_TO_OFFENSE': 'SERVE_RECEIVE',
        'SET_PHASE': 'TRANSITION_TO_OFFENSE',
        'ATTACK_PHASE': 'SET_PHASE',
        'TRANSITION_TO_DEFENSE': 'ATTACK_PHASE',
        'DEFENSE_PHASE': 'TRANSITION_TO_DEFENSE',
        'BALL_DEAD': 'DEFENSE_PHASE',
      }

      let prev = phaseFlow[currentPhase as RallyPhase] || 'PRE_SERVE'
      let loopedBack = false
      let iterations = 0
      const maxIterations = RALLY_PHASES.length

      // Skip hidden phases
      while (!visiblePhases.has(prev) && iterations < maxIterations) {
        iterations++
        if (prev === 'DEFENSE_PHASE' && currentPhase === 'PRE_SERVE') {
          loopedBack = true
          break
        }
        const current = prev
        prev = phaseFlow[current] || 'PRE_SERVE'
        if (prev === currentPhase as RallyPhase) {
          break
        }
      }

      if (loopedBack || (prev === 'DEFENSE_PHASE' && currentPhase === 'PRE_SERVE')) {
        setCurrentPhase(prev as Phase)
        setCurrentRotation(currentRotation === 1 ? 6 : (currentRotation - 1) as Rotation)
      } else {
        setCurrentPhase(prev as Phase)
      }
    }
  }, [currentPhase, currentRotation, visiblePhases])

  // Keyboard navigation for phases
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        nextPhase()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevPhase()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextPhase, prevPhase])

  // Handle position change (save to Convex)
  const handlePositionChange = async (role: Role, position: Position) => {
    if (!team?._id) return

    // Get current positions and update
    const currentPositions = getCurrentPositions()
    const newPositions = { ...currentPositions, [role]: position }

    // Save to Convex
    try {
      await saveLayout({
        teamId: team._id,
        rotation: currentRotation,
        phase: currentPhase,
        positions: newPositions,
      })
    } catch (err) {
      console.error('Failed to save layout:', err)
    }
  }

  // Handle name update
  const handleNameUpdate = async () => {
    if (!team?._id || !newName.trim()) return

    setIsSaving(true)
    try {
      await updateTeam({ id: team._id, name: newName.trim() })
      setEditingName(false)
    } catch (err) {
      console.error('Failed to update name:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle roster update
  const handleRosterUpdate = async (roster: RosterPlayer[]) => {
    if (!team?._id) return

    setIsSaving(true)
    try {
      await updateRoster({
        id: team._id,
        roster: roster.map(p => ({
          id: p.id,
          name: p.name,
          number: p.number,
        })),
      })
    } catch (err) {
      console.error('Failed to update roster:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle position assignments update
  const handleAssignmentsUpdate = async (assignments: PositionAssignments) => {
    if (!team?._id) return

    setIsSaving(true)
    try {
      // Filter out undefined values for Convex compatibility
      const cleanAssignments: Record<string, string> = {}
      for (const [key, value] of Object.entries(assignments)) {
        if (value !== undefined) {
          cleanAssignments[key] = value
        }
      }
      await updatePositionAssignments({
        id: team._id,
        positionAssignments: cleanAssignments,
      })
    } catch (err) {
      console.error('Failed to update assignments:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Copy share link
  const copyShareLink = () => {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/teams/${team?.slug || id}`
      : `/teams/${team?.slug || id}`
    navigator.clipboard.writeText(url)
    alert('Share link copied to clipboard!')
  }

  // Handle settings password verification (server-side)
  const handleSettingsPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSettingsPasswordError('')

    if (!team || !team.hasPassword) return

    if (!settingsPassword.trim()) {
      setSettingsPasswordError('Please enter a password')
      return
    }

    try {
      const isValid = await verifyPasswordMutation({
        id: team._id,
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

  // Loading state
  if (team === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading team...</p>
        </div>
      </main>
    )
  }

  // Error state
  if (team === null) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <h2 className="text-lg font-semibold mb-2">
                  Team not found
                </h2>
                <Link href="/teams">
                  <Button>Back to Teams</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  // Convert team to expected format
  const teamData = {
    id: team._id,
    _id: team._id,
    name: team.name,
    slug: team.slug,
    hasPassword: team.hasPassword,
    archived: team.archived,
    roster: team.roster.map(p => ({
      id: p.id,
      name: p.name,
      number: p.number ?? 0,
    })),
    lineups: team.lineups || [],
    active_lineup_id: team.activeLineupId || null,
    position_assignments: team.positionAssignments || {},
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-between gap-4">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 w-48"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameUpdate()
                  if (e.key === 'Escape') {
                    setNewName(team.name)
                    setEditingName(false)
                  }
                }}
              />
              <Button size="sm" onClick={handleNameUpdate} disabled={isSaving}>
                Save
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-xl font-bold hover:text-primary transition-colors"
            >
              {team.name}
            </button>
          )}

          <Button variant="outline" size="sm" onClick={copyShareLink}>
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
              className="mr-1.5"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" x2="12" y1="2" y2="15"/>
            </svg>
            Share
          </Button>
        </div>

        <Tabs defaultValue="court" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="court">Court</TabsTrigger>
            <TabsTrigger value="roster">Roster</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Court Tab */}
          <TabsContent value="court" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Controls */}
              <div className="lg:col-span-1 space-y-4">
                {/* Rotation Controls */}
                <Card>
                  <CardContent className="pt-4">
                    <RotationControlBar
                      currentRotation={currentRotation}
                      onRotationChange={setCurrentRotation}
                      onNext={() => setCurrentRotation(r => r === 6 ? 1 : (r + 1) as Rotation)}
                      onPrev={() => setCurrentRotation(r => r === 1 ? 6 : (r - 1) as Rotation)}
                    />
                  </CardContent>
                </Card>

                {/* Phase Selector */}
                <Card>
                  <CardContent className="pt-4">
                    <PhaseSelector
                      currentPhase={currentPhase}
                      visiblePhases={visiblePhases}
                      onPhaseChange={setCurrentPhase}
                      onToggleVisibility={(phase) => {
                        const newVisible = new Set(visiblePhases)
                        if (newVisible.has(phase)) {
                          if (newVisible.size > 1) {
                            newVisible.delete(phase)
                            setVisiblePhases(newVisible)
                          }
                        } else {
                          newVisible.add(phase)
                          setVisiblePhases(newVisible)
                        }
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Role Highlighter */}
                <Card>
                  <CardContent className="pt-4">
                    <RoleHighlighter
                      highlightedRole={highlightedRole}
                      onRoleSelect={setHighlightedRole}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Center Column - Court */}
              <div className="lg:col-span-1 space-y-4">
                {/* Volleyball Court */}
                <VolleyballCourt
                  positions={getCurrentPositions()}
                  highlightedRole={highlightedRole}
                  rotation={currentRotation}
                  roster={teamData.roster}
                  assignments={teamData.position_assignments}
                  onPositionChange={handlePositionChange}
                  onRoleClick={setHighlightedRole}
                  editable={true}
                />
              </div>

              {/* Right Column - Info */}
              <div className="lg:col-span-1 space-y-4">
                {/* Rotation Info */}
                <RotationInfoCard rotation={currentRotation} />
              </div>
            </div>
          </TabsContent>

          {/* Roster Tab */}
          <TabsContent value="roster" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Team Roster</CardTitle>
                </CardHeader>
                <CardContent>
                  <RosterEditor
                    roster={teamData.roster}
                    onChange={handleRosterUpdate}
                    isLoading={isSaving}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Position Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <PositionAssigner
                    roster={teamData.roster}
                    assignments={teamData.position_assignments}
                    onChange={handleAssignmentsUpdate}
                    isLoading={isSaving}
                    showLibero={showLibero}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            {!settingsUnlocked && team?.hasPassword ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 space-y-4">
                    <div className="flex justify-center">
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
                        className="text-muted-foreground"
                      >
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Settings Locked</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Enter the team password to access settings
                      </p>
                    </div>
                    <form onSubmit={handleSettingsPasswordSubmit} className="max-w-sm mx-auto space-y-4">
                      <div className="space-y-2">
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
                      </div>
                      <Button type="submit" className="w-full">
                        Unlock Settings
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Team Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Team Name</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                      />
                      <Button
                        onClick={handleNameUpdate}
                        disabled={isSaving || newName === team.name}
                      >
                        Update
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Share Link</Label>
                    <div className="flex gap-2">
                      <Input
                        value={typeof window !== 'undefined' ? `${window.location.origin}/teams/${team.slug}` : ''}
                        readOnly
                      />
                      <Button variant="outline" onClick={copyShareLink}>
                        Copy
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Anyone with this link can view and edit this team
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Custom Layouts</Label>
                    <p className="text-sm text-muted-foreground">
                      {customLayouts.length} custom layout{customLayouts.length !== 1 ? 's' : ''} saved
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
