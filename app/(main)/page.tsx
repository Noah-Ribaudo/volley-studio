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
import { Popover, PopoverContent } from '@/components/ui/popover'
import { createRotationPhaseKey, getBackRowMiddle, getRoleZone } from '@/lib/rotations'
import { validateRotationLegality } from '@/lib/model/legality'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useWhiteboardSync } from '@/hooks/useWhiteboardSync'
import { useLineupPresets } from '@/hooks/useLineupPresets'
import { WhiteboardOnboardingHint } from '@/components/court/WhiteboardOnboardingHint'
import { ConflictResolutionModal } from '@/components/volleyball/ConflictResolutionModal'
import { useThemeStore } from '@/store/useThemeStore'
import { CreateTeamDialog } from '@/components/team'
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
import { generateSlug } from '@/lib/teamUtils'
import type { PresetSystem } from '@/lib/presetTypes'
import { useHintStore } from '@/store/useHintStore'
import { toast } from 'sonner'

// Constants for court display
const OPEN_COURT_SETUP_EVENT = 'open-court-setup'
type OpenCourtSetupEventDetail = { anchorRect?: DOMRect; triggerEl?: HTMLElement | null }
const ANIMATION_MODE = 'raf' as const
const TOKEN_SCALES = { desktop: 1.5, mobile: 1.5 }
const TOKEN_DIMENSIONS = { widthOffset: 0, heightOffset: 0 }
const ANIMATION_CONFIG = {
  durationMs: 500,
  easingCss: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easingFn: 'cubic' as 'cubic' | 'quad',
  collisionRadius: 0.07,
  separationStrength: 3.45,
  maxSeparation: 0.4,
}
const COURT_SETUP_POPOVER_WIDTH = 560
const COURT_SETUP_VIEWPORT_MARGIN = 16

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
    setShowLibero,
    showPosition,
    showPlayer,
    showNumber,
    setShowPosition,
    setShowPlayer,
    setShowNumber,
    circleTokens,
    fullStatusLabels,
    debugHitboxes,
    showMotionDebugPanel,
    courtSetupSurfaceVariant,
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
    isHydrated: isAppHydrated,
  } = useAppStore()
  const isThemeHydrated = useThemeStore((state) => state.isHydrated)
  const isUiHydrated = isAppHydrated && isThemeHydrated
  const searchParams = useSearchParams()
  const teamFromUrl = searchParams.get('team')?.trim() || ''
  const myTeams = useQuery(api.teams.listMyTeams, {})
  const updateLineups = useMutation(api.teams.updateLineups)
  const createTeam = useMutation(api.teams.create)
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
  const previousPhaseRef = useRef(currentPhase)
  const shouldShowFirstDragHint = useHintStore((state) => state.shouldShowFirstDragHint)
  const shouldShowPhaseNavigationHint = useHintStore((state) => state.shouldShowPhaseNavigationHint)
  const hasCompletedFirstDrag = useHintStore((state) => state.hasCompletedFirstDrag)
  const hasNavigatedPhase = useHintStore((state) => state.hasNavigatedPhase)
  const markPhaseNavigated = useHintStore((state) => state.markPhaseNavigated)

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
        starting_rotation: (lineup.starting_rotation as 1 | 2 | 3 | 4 | 5 | 6 | undefined) ?? 1,
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

  const [rosterSheetOpen, setRosterSheetOpen] = useState(false)
  const [courtSetupOpen, setCourtSetupOpen] = useState(false)
  const [courtSetupAnchorRect, setCourtSetupAnchorRect] = useState<DOMRect | null>(null)
  const courtSetupTriggerRef = useRef<HTMLElement | null>(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false)

  useEffect(() => {
    const updateViewportWidth = () => {
      setViewportWidth(window.innerWidth)
    }

    updateViewportWidth()
    window.addEventListener('resize', updateViewportWidth)
    return () => window.removeEventListener('resize', updateViewportWidth)
  }, [])

  useEffect(() => {
    const openCourtSetup = (event: Event) => {
      const maybeCustomEvent = event as CustomEvent<OpenCourtSetupEventDetail>
      setCourtSetupAnchorRect(maybeCustomEvent.detail?.anchorRect ?? null)
      courtSetupTriggerRef.current = maybeCustomEvent.detail?.triggerEl ?? null
      setCourtSetupOpen((prev) => !prev)
    }
    window.addEventListener(OPEN_COURT_SETUP_EVENT, openCourtSetup)
    return () => window.removeEventListener(OPEN_COURT_SETUP_EVENT, openCourtSetup)
  }, [])

  const handleCourtSetupInteractOutside = useCallback((event: { target: EventTarget | null; preventDefault: () => void }) => {
    const trigger = courtSetupTriggerRef.current
    if (!trigger) return
    if (event.target instanceof Node && trigger.contains(event.target)) {
      event.preventDefault()
    }
  }, [])

  const desktopCourtSetupPopoverStyle = useMemo(() => {
    if (!courtSetupAnchorRect) return undefined

    const fallbackLeft = courtSetupAnchorRect.left
    if (viewportWidth <= 0) {
      return {
        position: 'fixed' as const,
        left: `${fallbackLeft}px`,
        top: `${courtSetupAnchorRect.bottom + 8}px`,
      }
    }

    const popoverWidth = Math.min(
      COURT_SETUP_POPOVER_WIDTH,
      Math.max(0, viewportWidth - COURT_SETUP_VIEWPORT_MARGIN * 2)
    )
    const maxLeft = Math.max(
      COURT_SETUP_VIEWPORT_MARGIN,
      viewportWidth - popoverWidth - COURT_SETUP_VIEWPORT_MARGIN
    )
    const clampedLeft = Math.min(
      Math.max(courtSetupAnchorRect.left, COURT_SETUP_VIEWPORT_MARGIN),
      maxLeft
    )

    return {
      position: 'fixed' as const,
      left: `${clampedLeft}px`,
      top: `${courtSetupAnchorRect.bottom + 8}px`,
    }
  }, [courtSetupAnchorRect, viewportWidth])

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
        showLibero,
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
      starting_rotation: lineup.starting_rotation ?? 1,
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
  const handleTeamSelect = useCallback((value: string) => {
    setCourtSetupOpen(false)
    if (value === '__new__') {
      setCreateTeamDialogOpen(true)
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
  const handleCreateCloudTeam = useCallback(async (
    name: string,
    _password?: string,
    presetSystem?: PresetSystem
  ) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      throw new Error('Team name is required')
    }

    const createdTeamId = await createTeam({
      name: trimmedName,
      slug: generateSlug(trimmedName),
      presetSystem,
    })

    setCreateTeamDialogOpen(false)
    setCourtSetupOpen(false)
    router.push(`/?team=${encodeURIComponent(createdTeamId)}`)
  }, [createTeam, router])
  const handleCreateLocalTeam = useCallback((name: string, presetSystem?: PresetSystem) => {
    const trimmedName = name.trim()
    const lineupId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `lineup-${Date.now()}`
    const now = new Date().toISOString()
    const localTeam: Team = {
      id: `local-${Date.now()}`,
      name: trimmedName,
      slug: generateSlug(trimmedName),
      hasPassword: false,
      archived: false,
      roster: [],
      lineups: [{
        id: lineupId,
        name: 'Lineup 1',
        position_assignments: {},
        position_source: presetSystem,
        starting_rotation: 1,
        created_at: now,
      }],
      active_lineup_id: lineupId,
      position_assignments: {},
      created_at: now,
      updated_at: now,
    }

    loadedTeamFromUrlRef.current = null
    const nextLocalTeams = upsertLocalTeam(localTeam)
    setLocalTeams(nextLocalTeams)
    setCurrentTeam(localTeam)
    setCustomLayouts([])
    setAccessMode('local')
    setTeamPasswordProvided(true)
    setCreateTeamDialogOpen(false)
    setCourtSetupOpen(false)
    router.push('/')
    toast.success(`Created local team: ${trimmedName}`)
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
        starting_rotation: baseLineup?.starting_rotation ?? 1,
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

  const showFirstDragHint = shouldShowFirstDragHint()
  const showPhaseNavigationHint = !showFirstDragHint && shouldShowPhaseNavigationHint()
  const enabledDisplayCount = Number(showPosition) + Number(showPlayer) + Number(showNumber)
  const onboardingHintMessage = showFirstDragHint
    ? 'Drag a player to reposition them'
    : showPhaseNavigationHint
      ? 'Tap a phase to change steps'
      : null

  useEffect(() => {
    if (previousPhaseRef.current === currentPhase) return
    previousPhaseRef.current = currentPhase
    if (hasCompletedFirstDrag && !hasNavigatedPhase) {
      markPhaseNavigated()
    }
  }, [currentPhase, hasCompletedFirstDrag, hasNavigatedPhase, markPhaseNavigated])

  const courtSetupContent = (
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

      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
        <div className="space-y-0.5">
          <Label htmlFor="court-setup-show-libero" className="text-sm font-medium">Show Libero</Label>
          <p className="text-xs text-muted-foreground">Display libero substitutions in the lineup.</p>
        </div>
        <Switch
          id="court-setup-show-libero"
          checked={showLibero}
          onCheckedChange={setShowLibero}
        />
      </div>

      <div className="space-y-2 rounded-lg border border-border bg-muted/40 px-3 py-3">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Token Labels</Label>
          <p className="text-xs text-muted-foreground">Pick what appears on player tokens.</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="court-setup-show-positions" className="text-sm">Show Positions</Label>
            <Switch
              id="court-setup-show-positions"
              checked={showPosition}
              onCheckedChange={(checked) => {
                if (!checked && enabledDisplayCount <= 1) return
                setShowPosition(checked)
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="court-setup-show-names" className="text-sm">Show Names</Label>
            <Switch
              id="court-setup-show-names"
              checked={showPlayer}
              onCheckedChange={(checked) => {
                if (!checked && enabledDisplayCount <= 1) return
                setShowPlayer(checked)
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="court-setup-show-numbers" className="text-sm">Show Numbers</Label>
            <Switch
              id="court-setup-show-numbers"
              checked={showNumber}
              onCheckedChange={(checked) => {
                if (!checked && enabledDisplayCount <= 1) return
                setShowNumber(checked)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-gradient-to-b from-background to-muted/30">
      {/* Main Content Area - fills available layout height */}
      <div className="flex-1 min-h-0 h-full overflow-hidden">
        {/* Court Container - scales to fit available space */}
        <div className="w-full h-full sm:max-w-3xl mx-auto px-0 sm:px-2 relative">
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

          {/* Court */}
          <div
            className="relative w-full h-full box-border flex items-center justify-center py-2"
            style={{
              visibility: isUiHydrated ? 'visible' : 'hidden',
              pointerEvents: isUiHydrated ? 'auto' : 'none',
            }}
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
                showNumber={showNumber}
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

          <WhiteboardOnboardingHint
            show={Boolean(onboardingHintMessage)}
            message={onboardingHintMessage || ''}
          />
          </div>
        </div>
      </div>

      {isMobile ? (
        <Dialog open={courtSetupOpen} onOpenChange={setCourtSetupOpen}>
          <DialogContent
            className="sm:max-w-[560px]"
            onInteractOutside={handleCourtSetupInteractOutside}
          >
            <DialogHeader>
              <DialogTitle>Court Setup</DialogTitle>
              <DialogDescription>
                Choose team, lineup, and opponent visibility for the whiteboard.
              </DialogDescription>
            </DialogHeader>
            {courtSetupContent}
          </DialogContent>
        </Dialog>
      ) : courtSetupSurfaceVariant === 'panel' ? (
        <Sheet open={courtSetupOpen} onOpenChange={setCourtSetupOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-[560px] overflow-y-auto"
            onInteractOutside={handleCourtSetupInteractOutside}
          >
            <SheetHeader className="pb-4">
              <SheetTitle>Court Setup</SheetTitle>
              <SheetDescription>
                Choose team, lineup, and opponent visibility for the whiteboard.
              </SheetDescription>
            </SheetHeader>
            {courtSetupContent}
          </SheetContent>
        </Sheet>
      ) : (
        <Popover open={courtSetupOpen} onOpenChange={setCourtSetupOpen}>
          <PopoverContent
            side="bottom"
            align="start"
            sideOffset={8}
            className="w-[560px] max-w-[calc(100vw-2rem)]"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={handleCourtSetupInteractOutside}
            style={desktopCourtSetupPopoverStyle}
          >
            <div className="mb-4 space-y-1.5">
              <h2 className="text-lg font-semibold leading-none tracking-tight">Court Setup</h2>
              <p className="text-sm text-muted-foreground">
                Choose team, lineup, and opponent visibility for the whiteboard.
              </p>
            </div>
            {courtSetupContent}
          </PopoverContent>
        </Popover>
      )}

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

      <CreateTeamDialog
        open={createTeamDialogOpen}
        onOpenChange={setCreateTeamDialogOpen}
        hideTrigger
        onCreateTeam={handleCreateCloudTeam}
        onCreateLocalTeam={handleCreateLocalTeam}
      />
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
