'use client'

import { useEffect, useState, useMemo, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useAppStore, getCurrentPositions, getCurrentArrows, getCurrentTags, getActiveLineupPositionSource } from '@/store/useAppStore'
import { VolleyballCourt } from '@/components/court'
import { RosterManagementCard } from '@/components/roster'
import { Role, ROLES, RALLY_PHASES, Position, PositionCoordinates, POSITION_SOURCE_INFO, RallyPhase, Team, CustomLayout, Lineup } from '@/lib/types'
import { getActiveAssignments } from '@/lib/lineups'
import { getWhiteboardPositions } from '@/lib/whiteboard'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createRotationPhaseKey, getBackRowMiddle, getRoleZone } from '@/lib/rotations'
import { validateRotationLegality } from '@/lib/model/legality'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation'
import { useWhiteboardSync } from '@/hooks/useWhiteboardSync'
import { useLineupPresets } from '@/hooks/useLineupPresets'
import { SwipeHint } from '@/components/mobile'
import { ConflictResolutionModal } from '@/components/volleyball/ConflictResolutionModal'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { getLocalTeamById, listLocalTeams, upsertLocalTeam } from '@/lib/localTeams'
import { toast } from 'sonner'

// Constants for court display
const OPEN_COURT_SETUP_EVENT = 'open-court-setup'
const ANIMATION_MODE = 'css' as const
const TOKEN_SCALES = { desktop: 1.5, mobile: 1.5 }
const TOKEN_DIMENSIONS = { widthOffset: 0, heightOffset: 0 }
const ANIMATION_CONFIG = {
  durationMs: 500,
  easingCss: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easingFn: 'cubic' as 'cubic' | 'quad',
  collisionRadius: 0.12,
  separationStrength: 6,
  maxSeparation: 3,
}

// Helper to get server role from rotation
function getServerRole(rotation: number, baseOrder: Role[]): Role {
  // Zone 1 (back right) is where the server is
  for (const role of baseOrder) {
    if (getRoleZone(rotation as 1|2|3|4|5|6, role, baseOrder) === 1) {
      return role
    }
  }
  return 'S' // fallback
}

function HomePageContent() {
  const router = useRouter()
  const {
    currentRotation,
    currentPhase,
    highlightedRole,
    localPositions,
    localArrows,
    arrowCurves,
    setArrowCurve,
    customLayouts,
    currentTeam,
    baseOrder,
    nextPhase,
    prevPhase,
    setHighlightedRole,
    updateLocalPosition,
    updateArrow,
    clearArrow,
    setLegalityViolations,
    legalityViolations,
    isReceivingContext,
    showLibero,
    showPosition,
    showPlayer,
    circleTokens,
    fullStatusLabels,
    debugHitboxes,
    showMotionDebugPanel,
    attackBallPositions,
    setAttackBallPosition,
    clearAttackBallPosition,
    // Context UI
    contextPlayer,
    setContextPlayer,
    // Away team visibility
    hideAwayTeam,
    setHideAwayTeam,
    awayTeamHidePercent,
    // Player status flags
    localStatusFlags,
    togglePlayerStatus,
    // Token tags
    localTagFlags,
    setTokenTags,
    assignPlayerToRole,
    // Preview mode
    isPreviewingMovement,
    // Animation trigger
    playAnimationTrigger,
    // Team loading
    setCurrentTeam,
    setCustomLayouts,
    populateFromLayouts,
    setAccessMode,
    setTeamPasswordProvided,
  } = useAppStore()
  const searchParams = useSearchParams()
  const teamFromUrl = searchParams.get('team')?.trim() || ''
  const myTeams = useQuery(api.teams.listMyTeams, {})
  const updateLineups = useMutation(api.teams.updateLineups)
  const selectedTeam = useQuery(
    api.teams.getBySlugOrId,
    teamFromUrl ? { identifier: teamFromUrl } : 'skip'
  )
  const selectedLayouts = useQuery(
    api.layouts.getByTeam,
    selectedTeam?._id ? { teamId: selectedTeam._id } : 'skip'
  )
  const [localTeams, setLocalTeams] = useState<Team[]>([])
  const [isSavingLineup, setIsSavingLineup] = useState(false)
  const loadedTeamFromUrlRef = useRef<string | null>(null)

  // Mobile detection
  const isMobile = useIsMobile()

  // Load team and layouts when opened from /?team=<id or slug>
  useEffect(() => {
    if (!teamFromUrl || !selectedTeam || !selectedLayouts) return
    if (loadedTeamFromUrlRef.current === selectedTeam._id) return

    const mappedTeam: Team = {
      id: selectedTeam._id,
      _id: selectedTeam._id,
      name: selectedTeam.name,
      slug: selectedTeam.slug,
      hasPassword: selectedTeam.hasPassword,
      archived: selectedTeam.archived,
      roster: selectedTeam.roster.map((player) => ({
        id: player.id,
        name: player.name,
        number: player.number ?? 0,
      })),
      lineups: (selectedTeam.lineups || []).map((lineup) => ({
        ...lineup,
        position_source: lineup.position_source as 'custom' | 'full-5-1' | '5-1-libero' | '6-2' | undefined,
      })),
      active_lineup_id: selectedTeam.activeLineupId ?? null,
      position_assignments: selectedTeam.positionAssignments || {},
      created_at: new Date(selectedTeam._creationTime).toISOString(),
      updated_at: new Date(selectedTeam._creationTime).toISOString(),
    }

    const mappedLayouts: CustomLayout[] = selectedLayouts.map((layout) => ({
      id: layout._id,
      _id: layout._id,
      team_id: layout.teamId,
      teamId: layout.teamId,
      rotation: layout.rotation as 1 | 2 | 3 | 4 | 5 | 6,
      phase: layout.phase as RallyPhase,
      positions: layout.positions as unknown as PositionCoordinates,
      flags: layout.flags ?? null,
      created_at: new Date(layout._creationTime).toISOString(),
      updated_at: new Date(layout._creationTime).toISOString(),
    }))

    setCurrentTeam(mappedTeam)
    setCustomLayouts(mappedLayouts)
    populateFromLayouts(mappedLayouts)
    setAccessMode('full')
    setTeamPasswordProvided(true)
    loadedTeamFromUrlRef.current = selectedTeam._id
  }, [
    teamFromUrl,
    selectedTeam,
    selectedLayouts,
    setCurrentTeam,
    setCustomLayouts,
    populateFromLayouts,
    setAccessMode,
    setTeamPasswordProvided,
  ])

  useEffect(() => {
    const refreshLocalTeams = () => {
      setLocalTeams(listLocalTeams())
    }

    refreshLocalTeams()
    window.addEventListener('storage', refreshLocalTeams)

    return () => {
      window.removeEventListener('storage', refreshLocalTeams)
    }
  }, [currentTeam?._id, currentTeam?.id])

  // Lineup preset management - loads presets when active lineup uses a preset source
  const { isUsingPreset, presetSystem, getPresetLayouts } = useLineupPresets()
  const presetLayouts = useMemo(
    () => (presetSystem ? getPresetLayouts(presetSystem) : []),
    [presetSystem, getPresetLayouts]
  )

  // Determine if editing is allowed (not when using presets)
  const isEditingAllowed = !isUsingPreset
  const activePositionSource = getActiveLineupPositionSource(currentTeam)

  // Auto-save whiteboard changes to Convex (team mode)
  useWhiteboardSync()

  // Swipe left/right to change phases on mobile
  const { swipeState, handlers: swipeHandlers } = useSwipeNavigation({
    onSwipeLeft: nextPhase,
    onSwipeRight: prevPhase,
    enabled: isMobile,
    threshold: 50,
  })

  const [rosterSheetOpen, setRosterSheetOpen] = useState(false)
  const [courtSetupOpen, setCourtSetupOpen] = useState(false)

  useEffect(() => {
    const openCourtSetup = () => setCourtSetupOpen(true)
    window.addEventListener(OPEN_COURT_SETUP_EVENT, openCourtSetup)
    return () => window.removeEventListener(OPEN_COURT_SETUP_EVENT, openCourtSetup)
  }, [])

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

  // Get current attack ball position for defense phase
  const rotationPhaseKey = createRotationPhaseKey(currentRotation, currentPhase)
  const currentAttackBallPosition = currentPhase === 'DEFENSE_PHASE'
    ? attackBallPositions[rotationPhaseKey] || null
    : null

  // Get default whiteboard positions (for computing away positions)
  const whiteboardResult = RALLY_PHASES.includes(currentPhase as RallyPhase)
    ? getWhiteboardPositions({
        rotation: currentRotation,
        phase: currentPhase as RallyPhase,
        isReceiving: isReceivingContext,
        showBothSides: true,
        baseOrder,
        attackBallPosition: currentAttackBallPosition,
      })
    : null

  // Always use getCurrentPositions for home team - this properly merges local overrides
  // When using presets, pass preset layouts to get read-only preset positions
  const positions = getCurrentPositions(
    currentRotation,
    currentPhase,
    localPositions,
    customLayouts,
    currentTeam,
    isReceivingContext,
    baseOrder,
    showLibero,
    currentAttackBallPosition,
    isUsingPreset ? presetLayouts : undefined
  )

  // Local state for away positions keyed by rotation/phase/context
  // This automatically resets when the context changes
  const awayPositionKey = `${currentRotation}-${currentPhase}-${isReceivingContext}`
  const [awayOverrides, setAwayOverrides] = useState<{ key: string; positions: PositionCoordinates | null }>({ key: awayPositionKey, positions: null })

  // Reset overrides when key changes
  const localAwayPositions = awayOverrides.key === awayPositionKey ? awayOverrides.positions : null

  // Compute effective away positions (local overrides on top of defaults)
  const awayPositions = useMemo(() => {
    const awayDefault = whiteboardResult?.away
    if (!awayDefault) return undefined
    if (localAwayPositions) {
      // Merge local away overrides on top of default away positions
      return { ...awayDefault, ...localAwayPositions }
    }
    return awayDefault
  }, [whiteboardResult, localAwayPositions])

  // Handler for away position changes
  const handleAwayPositionChange = useCallback((role: Role, position: Position) => {
    setAwayOverrides(prev => ({
      key: awayPositionKey,
      positions: {
        ...(prev.key === awayPositionKey ? prev.positions || {} : {}),
        [role]: position
      } as PositionCoordinates
    }))
  }, [awayPositionKey])

  const currentArrows = getCurrentArrows(
    currentRotation,
    currentPhase,
    localArrows,
    isReceivingContext,
    baseOrder,
    showLibero,
    currentAttackBallPosition,
    currentTeam,
    isUsingPreset ? presetLayouts : undefined
  )

  // Positions are already in normalized format (0-1)
  // Preview/playback is handled inside VolleyballCourt
  const normalizedPositions = positions

  // Get arrow curve preferences for current rotation/phase
  const currentArrowCurves = arrowCurves[createRotationPhaseKey(currentRotation, currentPhase)] || {}

  // Get player status flags for current rotation/phase
  // When using presets, get status flags from the preset if available
  const currentStatusFlags = useMemo(() => {
    if (isUsingPreset && presetLayouts.length > 0) {
      const presetLayout = presetLayouts.find(
        l => l.rotation === currentRotation && l.phase === currentPhase
      )
      if (presetLayout?.flags?.statusFlags) {
        return presetLayout.flags.statusFlags
      }
    }
    return localStatusFlags[rotationPhaseKey] || {}
  }, [isUsingPreset, presetLayouts, currentRotation, currentPhase, localStatusFlags, rotationPhaseKey])

  // Get token tags for current rotation/phase
  const currentTagFlags = useMemo(() => {
    return getCurrentTags(currentRotation, currentPhase, localTagFlags)
  }, [currentRotation, currentPhase, localTagFlags])

  // Validate legality - only for PRE_SERVE and SERVE_RECEIVE phases
  const violations = useMemo(() => {
    if (currentPhase === 'PRE_SERVE' || currentPhase === 'SERVE_RECEIVE') {
      const replacedMB = showLibero ? getBackRowMiddle(currentRotation, baseOrder) : null

      const validPositions: Record<Role, Position> = {} as Record<Role, Position>
      for (const role of ROLES) {
        if (role === 'L' && !showLibero) {
          validPositions[role] = { x: 0.5, y: 0.5 }
        }
        else if (showLibero && role === replacedMB) {
          validPositions[role] = normalizedPositions['L'] || normalizedPositions[replacedMB] || { x: 0.5, y: 0.5 }
        }
        else {
          validPositions[role] = normalizedPositions[role] || { x: 0.5, y: 0.5 }
        }
      }

      return validateRotationLegality(
        currentRotation,
        validPositions,
        undefined,
        baseOrder
      )
    }
    return []
  }, [currentRotation, normalizedPositions, baseOrder, currentPhase, showLibero])

  // Track previous violations to avoid unnecessary updates
  const prevViolationsRef = useRef<string>('')
  const violationsKey = JSON.stringify(violations)

  // Update violations in store only when they actually change
  useEffect(() => {
    if (prevViolationsRef.current !== violationsKey) {
      prevViolationsRef.current = violationsKey
      setLegalityViolations(rotationPhaseKey, violations)
    }
  }, [rotationPhaseKey, violationsKey, violations, setLegalityViolations])

  // Only show violations for pre-serve phases
  const currentViolations = (currentPhase === 'PRE_SERVE' || currentPhase === 'SERVE_RECEIVE')
    ? (legalityViolations[rotationPhaseKey] || [])
    : []

  const cleanAssignments = useCallback((assignments: Record<string, string | undefined> | undefined) => {
    const cleaned: Record<string, string> = {}
    if (!assignments) {
      return cleaned
    }
    for (const [role, playerId] of Object.entries(assignments)) {
      if (typeof playerId === 'string' && playerId.trim() !== '') {
        cleaned[role] = playerId
      }
    }
    return cleaned
  }, [])

  const persistLineupsForTeam = useCallback(async (nextTeam: Team) => {
    const normalizedLineups = (nextTeam.lineups || []).map((lineup) => ({
      id: lineup.id,
      name: lineup.name,
      position_assignments: cleanAssignments(lineup.position_assignments),
      position_source: lineup.position_source,
      created_at: lineup.created_at,
    }))
    const normalizedActiveLineupId = nextTeam.active_lineup_id &&
      normalizedLineups.some((lineup) => lineup.id === nextTeam.active_lineup_id)
      ? nextTeam.active_lineup_id
      : normalizedLineups[0]?.id
    const activeLineup = normalizedLineups.find((lineup) => lineup.id === normalizedActiveLineupId)
    const nextAssignments = cleanAssignments(activeLineup?.position_assignments || nextTeam.position_assignments)

    if (nextTeam._id) {
      await updateLineups({
        id: nextTeam._id as Id<'teams'>,
        lineups: normalizedLineups,
        activeLineupId: normalizedActiveLineupId || undefined,
        positionAssignments: nextAssignments,
      })
      return
    }

    upsertLocalTeam({
      ...nextTeam,
      lineups: normalizedLineups,
      active_lineup_id: normalizedActiveLineupId ?? null,
      position_assignments: nextAssignments,
    })
    setLocalTeams(listLocalTeams())
  }, [cleanAssignments, updateLineups])

  const teamSelectValue = !currentTeam
    ? '__none__'
    : currentTeam._id
      ? `cloud:${currentTeam._id}`
      : `local:${currentTeam.id}`
  const currentLineup = useMemo(() => {
    if (!currentTeam || !currentTeam.lineups?.length) {
      return null
    }
    return currentTeam.lineups.find((lineup) => lineup.id === currentTeam.active_lineup_id) || currentTeam.lineups[0]
  }, [currentTeam])
  const lineupSelectValue = currentLineup?.id || '__none__'
  const activeLineupName = currentLineup?.name?.trim() || 'No Lineup'
  const activeTeamName = currentTeam?.name?.trim() || 'No Team Selected'
  const activeTeamScope = !currentTeam
    ? 'None'
    : currentTeam._id
      ? 'Cloud'
      : 'Local'
  const activeTeamScopeClass = activeTeamScope === 'Cloud'
    ? 'text-emerald-600 dark:text-emerald-400'
    : activeTeamScope === 'Local'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-muted-foreground'
  const handleTeamSelect = useCallback((value: string) => {
    setCourtSetupOpen(false)
    if (value === '__new__') {
      router.push('/teams')
      return
    }

    if (value === '__none__') {
      loadedTeamFromUrlRef.current = null
      setCurrentTeam(null)
      setCustomLayouts([])
      setAccessMode('none')
      setTeamPasswordProvided(false)
      router.push('/')
      return
    }

    if (value.startsWith('cloud:')) {
      const teamId = value.slice('cloud:'.length)
      if (!teamId) return
      router.push(`/?team=${encodeURIComponent(teamId)}`)
      return
    }

    if (value.startsWith('local:')) {
      const localTeamId = value.slice('local:'.length)
      const localTeam = getLocalTeamById(localTeamId)
      if (!localTeam) return

      loadedTeamFromUrlRef.current = null
      setCurrentTeam(localTeam)
      setCustomLayouts([])
      setAccessMode('local')
      setTeamPasswordProvided(true)
      router.push('/')
    }
  }, [router, setAccessMode, setCurrentTeam, setCustomLayouts, setTeamPasswordProvided])
  const handleLineupSelect = useCallback(async (value: string) => {
    setCourtSetupOpen(false)
    if (value === '__none__') {
      return
    }

    if (value === '__manage__') {
      if (currentTeam) {
        router.push(`/teams/${encodeURIComponent(currentTeam.id)}`)
      } else {
        router.push('/teams')
      }
      return
    }

    if (value === '__new__') {
      if (!currentTeam) {
        router.push('/teams')
        return
      }

      const existingLineups = currentTeam.lineups || []
      const baseLineup = currentLineup || existingLineups[0]
      const usedNames = new Set(existingLineups.map((lineup) => lineup.name.trim().toLowerCase()))
      let nextIndex = existingLineups.length + 1
      let nextName = `Lineup ${nextIndex}`
      while (usedNames.has(nextName.toLowerCase())) {
        nextIndex += 1
        nextName = `Lineup ${nextIndex}`
      }

      const clonedAssignments = {
        ...(baseLineup?.position_assignments || {}),
      }
      const newLineup: Lineup = {
        id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `lineup-${Date.now()}`,
        name: nextName,
        position_assignments: clonedAssignments,
        position_source: baseLineup?.position_source ?? 'custom',
        created_at: new Date().toISOString(),
      }
      const nextTeam: Team = {
        ...currentTeam,
        lineups: [...existingLineups, newLineup],
        active_lineup_id: newLineup.id,
        position_assignments: clonedAssignments,
      }

      setCurrentTeam(nextTeam)
      setIsSavingLineup(true)
      try {
        await persistLineupsForTeam(nextTeam)
        toast.success(`Created ${newLineup.name}`)
      } catch (error) {
        setCurrentTeam(currentTeam)
        const message = error instanceof Error ? error.message : 'Failed to create lineup'
        toast.error(message)
      } finally {
        setIsSavingLineup(false)
      }
      return
    }

    if (!currentTeam) {
      return
    }

    const selectedLineup = currentTeam.lineups.find((lineup) => lineup.id === value)
    if (!selectedLineup || selectedLineup.id === currentTeam.active_lineup_id) {
      return
    }

    const nextTeam: Team = {
      ...currentTeam,
      active_lineup_id: selectedLineup.id,
      position_assignments: {
        ...selectedLineup.position_assignments,
      },
    }
    setCurrentTeam(nextTeam)
    setIsSavingLineup(true)
    try {
      await persistLineupsForTeam(nextTeam)
    } catch (error) {
      setCurrentTeam(currentTeam)
      const message = error instanceof Error ? error.message : 'Failed to switch lineup'
      toast.error(message)
    } finally {
      setIsSavingLineup(false)
    }
  }, [currentLineup, currentTeam, persistLineupsForTeam, router, setCurrentTeam])

  // Visual feedback during swipe
  const swipeOffset = swipeState.swiping ? swipeState.delta.x * 0.2 : 0

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-gradient-to-b from-background to-muted/30">
      {/* Main Content Area - fills available layout height */}
      <div className="flex-1 min-h-0 h-full overflow-hidden">
        {/* Court Container - scales to fit available space */}
        <div className="w-full h-full sm:max-w-3xl mx-auto px-0 sm:px-2 relative">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 w-[min(92vw,720px)]">
            <div className="flex items-center justify-center px-3 py-2 bg-muted/90 backdrop-blur-sm rounded-xl border border-border shadow-sm">
              <span className="text-xs text-muted-foreground truncate">
                Active: <span className="font-medium text-foreground">{activeTeamName}</span>
                {' · '}
                <span className="font-medium text-foreground">{activeLineupName}</span>
                {' · '}
                <span className={activeTeamScopeClass}>{activeTeamScope}</span>
              </span>
            </div>
          </div>

          {/* Preset mode indicator - shown when viewing preset positions */}
          {isUsingPreset && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/90 backdrop-blur-sm rounded-full border border-border shadow-sm">
                <span className="text-xs text-muted-foreground">
                  Viewing: <span className="font-medium text-foreground">{POSITION_SOURCE_INFO[activePositionSource].name}</span>
                </span>
                <span className="text-xs text-muted-foreground/70">(read-only)</span>
              </div>
            </div>
          )}

          {/* Court with swipe handlers for mobile */}
          <div
            className="relative w-full h-full box-border flex items-center justify-center py-2"
            style={{
              ...(swipeOffset !== 0 ? { transform: `translateX(${swipeOffset}px)` } : {}),
              transition: swipeState.swiping ? 'none' : 'transform 0.2s ease-out',
            }}
            {...(isMobile ? swipeHandlers : {})}
          >
              <VolleyballCourt
                mode="whiteboard"
                positions={positions}
                awayPositions={awayPositions}
                hideAwayTeam={hideAwayTeam}
                awayTeamHidePercent={awayTeamHidePercent}
                highlightedRole={highlightedRole}
                rotation={currentRotation}
                baseOrder={baseOrder}
                roster={currentTeam?.roster || []}
                assignments={currentTeam ? getActiveAssignments(currentTeam) : {}}
                onPositionChange={(role, position) => {
                  updateLocalPosition(currentRotation, currentPhase, role, position)
                }}
                onAwayPositionChange={handleAwayPositionChange}
                onRoleClick={setHighlightedRole}
                editable={isEditingAllowed}
                animationMode={ANIMATION_MODE}
                animationConfig={ANIMATION_CONFIG}
                arrows={currentArrows}
                arrowCurves={currentArrowCurves}
                onArrowCurveChange={isEditingAllowed ? (role, curve) => {
                  setArrowCurve(currentRotation, currentPhase, role, curve)
                } : undefined}
                showLibero={showLibero}
                onArrowChange={isEditingAllowed ? (role, position) => {
                  if (!position) {
                    clearArrow(currentRotation, currentPhase, role)
                    return
                  }
                  updateArrow(currentRotation, currentPhase, role, position)
                } : undefined}
                showPosition={showPosition}
                showPlayer={showPlayer}
                circleTokens={circleTokens}
                tokenScaleDesktop={TOKEN_SCALES.desktop}
                tokenScaleMobile={TOKEN_SCALES.mobile}
                tokenWidthOffset={TOKEN_DIMENSIONS.widthOffset}
                tokenHeightOffset={TOKEN_DIMENSIONS.heightOffset}
                legalityViolations={currentViolations}
                currentPhase={currentPhase}
                attackBallPosition={currentAttackBallPosition}
                onAttackBallChange={isEditingAllowed ? (pos) => {
                  if (pos) {
                    setAttackBallPosition(currentRotation, currentPhase, pos)
                  } else {
                    clearAttackBallPosition(currentRotation, currentPhase)
                  }
                } : undefined}
                ballPosition={currentPhase === 'PRE_SERVE' ? (() => {
                  // Calculate ball position for whiteboard PRE_SERVE - ball is held by server
                  const serverRole = getServerRole(currentRotation, baseOrder) as Role
                  const serverPos = positions[serverRole]
                  if (!serverPos) return undefined
                  return {
                    x: serverPos.x + 0.04,
                    y: serverPos.y - 0.03
                  }
                })() : undefined}
                ballHeight={currentPhase === 'PRE_SERVE' ? 0.15 : undefined}
                contextPlayer={contextPlayer}
                onContextPlayerChange={setContextPlayer}
                statusFlags={currentStatusFlags}
                onStatusToggle={isEditingAllowed ? (role, status) => {
                  togglePlayerStatus(currentRotation, currentPhase, role, status)
                } : undefined}
                fullStatusLabels={fullStatusLabels}
                hasTeam={Boolean(currentTeam)}
                onManageRoster={() => setRosterSheetOpen(true)}
                debugHitboxes={debugHitboxes}
                debugOverlay={showMotionDebugPanel}
                animationTrigger={playAnimationTrigger}
                isPreviewingMovement={isPreviewingMovement}
                tagFlags={currentTagFlags}
                onTagsChange={isEditingAllowed ? (role, tags) => {
                  setTokenTags(currentRotation, currentPhase, role, tags)
                } : undefined}
                onPlayerAssign={isEditingAllowed && currentTeam ? (role, playerId) => {
                  assignPlayerToRole(role, playerId)
                } : undefined}
              />

          {/* Swipe hint for mobile users - shows once */}
          {isMobile && (
            <SwipeHint
              storageKey="whiteboard-swipe-hint-seen"
              autoHideMs={4000}
            />
          )}
          </div>
        </div>
      </div>

      <Dialog open={courtSetupOpen} onOpenChange={setCourtSetupOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Court Setup</DialogTitle>
            <DialogDescription>
              Choose team, lineup, and opponent visibility for the whiteboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Team</Label>
              <Select value={teamSelectValue} onValueChange={handleTeamSelect}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Actions</SelectLabel>
                    <SelectItem value="__new__">+ New Team...</SelectItem>
                    <SelectItem value="__none__">Practice (No Team)</SelectItem>
                  </SelectGroup>
                  <SelectSeparator />
                  {(myTeams || []).length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Cloud Teams</SelectLabel>
                      {(myTeams || []).map((team) => (
                        <SelectItem key={team._id} value={`cloud:${team._id}`}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {localTeams.length > 0 && (
                    <>
                      {(myTeams || []).length > 0 && <SelectSeparator />}
                      <SelectGroup>
                        <SelectLabel>Local Teams</SelectLabel>
                        {localTeams.map((team) => (
                          <SelectItem key={team.id} value={`local:${team.id}`}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Lineup</Label>
              <Select
                value={lineupSelectValue}
                onValueChange={(value) => { void handleLineupSelect(value) }}
                disabled={isSavingLineup}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={currentTeam ? 'Select lineup' : 'Select team first'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Actions</SelectLabel>
                    <SelectItem value="__new__">+ New Lineup...</SelectItem>
                    <SelectItem value="__manage__">Manage Lineups...</SelectItem>
                  </SelectGroup>
                  <SelectSeparator />
                  {!currentTeam && (
                    <SelectGroup>
                      <SelectLabel>Lineups</SelectLabel>
                      <SelectItem value="__none__" disabled>Select a team first</SelectItem>
                    </SelectGroup>
                  )}
                  {currentTeam && (currentTeam.lineups || []).length === 0 && (
                    <SelectGroup>
                      <SelectLabel>Lineups</SelectLabel>
                      <SelectItem value="__none__" disabled>No lineups yet</SelectItem>
                    </SelectGroup>
                  )}
                  {currentTeam && (currentTeam.lineups || []).length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Lineups</SelectLabel>
                      {currentTeam.lineups.map((lineup) => (
                        <SelectItem key={lineup.id} value={lineup.id}>
                          {lineup.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
              <div className="space-y-0.5">
                <Label htmlFor="court-setup-hide-opponent" className="text-sm font-medium">Hide Opponent</Label>
                <p className="text-xs text-muted-foreground">Toggle opponent tokens on the court.</p>
              </div>
              <Switch
                id="court-setup-hide-opponent"
                checked={hideAwayTeam}
                onCheckedChange={setHideAwayTeam}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Roster Sheet */}
      <Sheet open={rosterSheetOpen} onOpenChange={setRosterSheetOpen}>
        <SheetContent side="right" className="w-full max-w-[400px] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>Roster</SheetTitle>
            <SheetDescription>
              Manage your team roster and position assignments
            </SheetDescription>
          </SheetHeader>
          <RosterManagementCard />
        </SheetContent>
      </Sheet>

      {/* Conflict Resolution Modal - shown when save conflict is detected */}
      <ConflictResolutionModal />
    </div>
  )
}

function HomePageWrapper() {
  return <HomePageContent />
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-full bg-gradient-to-b from-background to-muted/30" />}>
      <HomePageWrapper />
    </Suspense>
  )
}
