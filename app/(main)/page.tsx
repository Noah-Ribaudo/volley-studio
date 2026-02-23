'use client'

import { useEffect, useState, useMemo, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { getCurrentPositions, getCurrentArrows, getCurrentTags } from '@/lib/whiteboardHelpers'
import { VolleyballCourt } from '@/components/court'
import { RosterManagementCard } from '@/components/roster'
import { Role, ROLES, RALLY_PHASES, Position, PositionCoordinates, PositionAssignments, RallyPhase, Team, CustomLayout, Lineup } from '@/lib/types'
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
import { SpotlightOverlay } from '@/components/court/SpotlightOverlay'
import { ConflictResolutionModal } from '@/components/volleyball/ConflictResolutionModal'
import { useConvexAuth } from 'convex/react'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getLocalTeamById, listLocalTeams, upsertLocalTeam } from '@/lib/localTeams'
import { generateSlug } from '@/lib/teamUtils'
import { useHintStore } from '@/store/useHintStore'
import { useStoresHydrated } from '@/store/hydration'
import { useNavigationStore } from '@/store/useNavigationStore'
import { useWhiteboardStore } from '@/store/useWhiteboardStore'
import { useTeamStore } from '@/store/useTeamStore'
import { useDisplayPrefsStore } from '@/store/useDisplayPrefsStore'
import { useUIPrefsStore } from '@/store/useUIPrefsStore'
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
const WHITEBOARD_PREFETCH_SESSION_KEY = 'whiteboard-prefetch-complete-v1'
const WHITEBOARD_PREFETCH_ROUTES = [
  '/teams',
  '/gametime',
  '/settings',
  '/learn',
  '/privacy',
  '/roster',
  '/sign-in',
  '/developer/theme-lab',
  '/developer/logo-lab',
] as const

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
  const currentRotation = useNavigationStore((state) => state.currentRotation)
  const currentPhase = useNavigationStore((state) => state.currentPhase)
  const highlightedRole = useNavigationStore((state) => state.highlightedRole)
  const baseOrder = useNavigationStore((state) => state.baseOrder)
  const nextPhase = useNavigationStore((state) => state.nextPhase)
  const prevPhase = useNavigationStore((state) => state.prevPhase)
  const setHighlightedRole = useNavigationStore((state) => state.setHighlightedRole)
  const isPreviewingMovement = useNavigationStore((state) => state.isPreviewingMovement)
  const playAnimationTrigger = useNavigationStore((state) => state.playAnimationTrigger)

  const localPositions = useWhiteboardStore((state) => state.localPositions)
  const localArrows = useWhiteboardStore((state) => state.localArrows)
  const arrowCurves = useWhiteboardStore((state) => state.arrowCurves)
  const setArrowCurve = useWhiteboardStore((state) => state.setArrowCurve)
  const updateLocalPosition = useWhiteboardStore((state) => state.updateLocalPosition)
  const updateArrow = useWhiteboardStore((state) => state.updateArrow)
  const clearArrow = useWhiteboardStore((state) => state.clearArrow)
  const setLegalityViolations = useWhiteboardStore((state) => state.setLegalityViolations)
  const legalityViolations = useWhiteboardStore((state) => state.legalityViolations)
  const attackBallPositions = useWhiteboardStore((state) => state.attackBallPositions)
  const setAttackBallPosition = useWhiteboardStore((state) => state.setAttackBallPosition)
  const clearAttackBallPosition = useWhiteboardStore((state) => state.clearAttackBallPosition)
  const contextPlayer = useWhiteboardStore((state) => state.contextPlayer)
  const setContextPlayer = useWhiteboardStore((state) => state.setContextPlayer)
  const localStatusFlags = useWhiteboardStore((state) => state.localStatusFlags)
  const togglePlayerStatus = useWhiteboardStore((state) => state.togglePlayerStatus)
  const localTagFlags = useWhiteboardStore((state) => state.localTagFlags)
  const setTokenTags = useWhiteboardStore((state) => state.setTokenTags)
  const populateFromLayouts = useWhiteboardStore((state) => state.populateFromLayouts)

  const currentTeam = useTeamStore((state) => state.currentTeam)
  const customLayouts = useTeamStore((state) => state.customLayouts)
  const assignPlayerToRole = useTeamStore((state) => state.assignPlayerToRole)
  const setCurrentTeam = useTeamStore((state) => state.setCurrentTeam)
  const setCustomLayouts = useTeamStore((state) => state.setCustomLayouts)
  const setAccessMode = useTeamStore((state) => state.setAccessMode)
  const setTeamPasswordProvided = useTeamStore((state) => state.setTeamPasswordProvided)

  const isReceivingContext = useDisplayPrefsStore((state) => state.isReceivingContext)
  const showLibero = useDisplayPrefsStore((state) => state.showLibero)
  const setShowLibero = useDisplayPrefsStore((state) => state.setShowLibero)
  const showPosition = useDisplayPrefsStore((state) => state.showPosition)
  const showPlayer = useDisplayPrefsStore((state) => state.showPlayer)
  const showNumber = useDisplayPrefsStore((state) => state.showNumber)
  const setShowPosition = useDisplayPrefsStore((state) => state.setShowPosition)
  const setShowPlayer = useDisplayPrefsStore((state) => state.setShowPlayer)
  const setShowNumber = useDisplayPrefsStore((state) => state.setShowNumber)
  const circleTokens = useDisplayPrefsStore((state) => state.circleTokens)
  const fullStatusLabels = useDisplayPrefsStore((state) => state.fullStatusLabels)
  const hideAwayTeam = useDisplayPrefsStore((state) => state.hideAwayTeam)
  const setHideAwayTeam = useDisplayPrefsStore((state) => state.setHideAwayTeam)
  const awayTeamHidePercent = useDisplayPrefsStore((state) => state.awayTeamHidePercent)

  const debugHitboxes = useUIPrefsStore((state) => state.debugHitboxes)
  const showMotionDebugPanel = useUIPrefsStore((state) => state.showMotionDebugPanel)
  const courtSetupSurfaceVariant = useUIPrefsStore((state) => state.courtSetupSurfaceVariant)

  const isUiHydrated = useStoresHydrated()
  const searchParams = useSearchParams()
  const teamFromUrl = searchParams.get('team')?.trim() || ''
  const lineupFromUrl = searchParams.get('lineup')?.trim() || ''
  const myTeams = useQuery(api.teams.listMyTeams, {})
  const updateLineups = useMutation(api.teams.updateLineups)
  const updateRoster = useMutation(api.teams.updateRoster)
  const createTeam = useMutation(api.teams.create)
  const teamWithLayouts = useQuery(
    api.teams.getTeamWithLayouts,
    teamFromUrl ? { identifier: teamFromUrl } : 'skip'
  )
  const selectedTeam = teamWithLayouts?.team ?? undefined
  const selectedLayouts = teamWithLayouts?.layouts ?? undefined
  const [localTeams, setLocalTeams] = useState<Team[]>([])
  const [isSavingLineup, setIsSavingLineup] = useState(false)
  const [isSavingLineupEditor, setIsSavingLineupEditor] = useState(false)
  const [lineupDraftAssignments, setLineupDraftAssignments] = useState<PositionAssignments>({})
  const [newLineupNameDraft, setNewLineupNameDraft] = useState('')
  const [newCourtSetupPlayerName, setNewCourtSetupPlayerName] = useState('')
  const [newCourtSetupPlayerNumber, setNewCourtSetupPlayerNumber] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const loadedTeamFromUrlRef = useRef<string | null>(null)
  const previousPhaseRef = useRef(currentPhase)
  const shouldShowFirstDragHint = useHintStore((state) => state.shouldShowFirstDragHint)
  const shouldShowArrowDragHint = useHintStore((state) => state.shouldShowArrowDragHint)
  const shouldShowPhaseNavigationHint = useHintStore((state) => state.shouldShowPhaseNavigationHint)
  const hasCompletedFirstDrag = useHintStore((state) => state.hasCompletedFirstDrag)
  const hasLearnedArrowDrag = useHintStore((state) => state.hasLearnedArrowDrag)
  const hasNavigatedPhase = useHintStore((state) => state.hasNavigatedPhase)
  const markPhaseNavigated = useHintStore((state) => state.markPhaseNavigated)

  // Mobile detection
  const isMobile = useIsMobile()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Prefetch core routes once per session so navigation feels instant
  useEffect(() => {
    if (!isMounted) return

    if (window.sessionStorage.getItem(WHITEBOARD_PREFETCH_SESSION_KEY) === 'true') {
      return
    }

    let cancelled = false
    let timeoutId: number | null = null
    let idleId: number | null = null

    const prefetchRoutes = async () => {
      for (const route of WHITEBOARD_PREFETCH_ROUTES) {
        if (cancelled) return
        try {
          router.prefetch(route)
        } catch {
          // Ignore prefetch errors and continue warming the rest of the routes.
        }
        await new Promise((resolve) => window.setTimeout(resolve, 40))
      }

      if (!cancelled) {
        window.sessionStorage.setItem(WHITEBOARD_PREFETCH_SESSION_KEY, 'true')
      }
    }

    const schedulePrefetch = () => {
      void prefetchRoutes()
    }

    const requestIdle = (
      window as Window & {
        requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
      }
    ).requestIdleCallback
    const cancelIdle = (
      window as Window & {
        cancelIdleCallback?: (handle: number) => void
      }
    ).cancelIdleCallback

    if (typeof requestIdle === 'function') {
      idleId = requestIdle(schedulePrefetch, { timeout: 1500 })
    } else {
      timeoutId = window.setTimeout(schedulePrefetch, 300)
    }

    return () => {
      cancelled = true
      if (idleId !== null && typeof cancelIdle === 'function') {
        cancelIdle(idleId)
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [isMounted, router])

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
      active_lineup_id: (() => {
        // If a specific lineup was requested via URL, use it (if it exists on this team)
        if (lineupFromUrl) {
          const matchingLineup = (selectedTeam.lineups || []).find((l) => l.id === lineupFromUrl)
          if (matchingLineup) return matchingLineup.id
        }
        return selectedTeam.activeLineupId ?? null
      })(),
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
    lineupFromUrl,
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
  const isEditingAllowed = true

  // Auto-save whiteboard changes to Convex (team mode)
  useWhiteboardSync()

  const [rosterSheetOpen, setRosterSheetOpen] = useState(false)
  const [courtSetupOpen, setCourtSetupOpen] = useState(false)
  const [courtSetupAnchorRect, setCourtSetupAnchorRect] = useState<DOMRect | null>(null)
  const courtSetupTriggerRef = useRef<HTMLElement | null>(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const { isAuthenticated } = useConvexAuth()

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
  const lineupRolesForSetup = useMemo(
    () => (showLibero ? ROLES : ROLES.filter((role) => role !== 'L')),
    [showLibero]
  )
  const currentLineupId = currentLineup?.id
  const currentLineupAssignments = currentLineup?.position_assignments

  useEffect(() => {
    if (!currentLineupId) {
      setLineupDraftAssignments({})
      return
    }
    setLineupDraftAssignments(cleanAssignments(currentLineupAssignments || {}))
  }, [cleanAssignments, currentLineupAssignments, currentLineupId])

  const getDefaultLineupName = useCallback((lineups: Lineup[]) => {
    const usedNames = new Set(lineups.map((lineup) => lineup.name.trim().toLowerCase()))
    let nextIndex = lineups.length + 1
    let nextName = `Lineup ${nextIndex}`
    while (usedNames.has(nextName.toLowerCase())) {
      nextIndex += 1
      nextName = `Lineup ${nextIndex}`
    }
    return nextName
  }, [])

  const createLineupId = useCallback(() => {
    return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `lineup-${Date.now()}`
  }, [])

  const assignmentSignature = useCallback((assignments: PositionAssignments) => {
    return JSON.stringify(
      Object.entries(assignments)
        .filter(([, playerId]) => typeof playerId === 'string' && playerId.trim() !== '')
        .sort(([left], [right]) => left.localeCompare(right))
    )
  }, [])

  const cleanedLineupDraftAssignments = useMemo(
    () => cleanAssignments(lineupDraftAssignments),
    [lineupDraftAssignments, cleanAssignments]
  )
  const cleanedCurrentLineupAssignments = useMemo(
    () => cleanAssignments(currentLineup?.position_assignments || {}),
    [currentLineup?.position_assignments, cleanAssignments]
  )
  const lineupDraftHasChanges = useMemo(
    () => assignmentSignature(cleanedLineupDraftAssignments) !== assignmentSignature(cleanedCurrentLineupAssignments),
    [assignmentSignature, cleanedCurrentLineupAssignments, cleanedLineupDraftAssignments]
  )
  const lineupSelectValue = currentLineup?.id || '__none__'
  const handleTeamSelect = useCallback((value: string) => {
    if (value === '__new__') {
      void handleNewTeamFromWhiteboard()
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
  const handleNewTeamFromWhiteboard = useCallback(async () => {
    const defaultName = 'Untitled Team'
    setCourtSetupOpen(false)

    if (isAuthenticated) {
      try {
        const teamId = await createTeam({
          name: defaultName,
          slug: `${generateSlug(defaultName)}_${Date.now()}`,
        })
        router.push(`/teams/${teamId}`)
      } catch {
        toast.error('Failed to create team')
      }
    } else {
      const lineupId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `lineup-${Date.now()}`
      const now = new Date().toISOString()
      const localTeam: Team = {
        id: `local-${Date.now()}`,
        name: defaultName,
        slug: generateSlug(defaultName),
        hasPassword: false,
        archived: false,
        roster: [],
        lineups: [{
          id: lineupId,
          name: 'Lineup 1',
          position_assignments: {},
          starting_rotation: 1,
          created_at: now,
        }],
        active_lineup_id: lineupId,
        position_assignments: {},
        created_at: now,
        updated_at: now,
      }

      const nextLocalTeams = upsertLocalTeam(localTeam)
      setLocalTeams(nextLocalTeams)
      setCurrentTeam(localTeam)
      router.push(`/teams/${localTeam.id}`)
    }
  }, [isAuthenticated, createTeam, router, setCurrentTeam])
  const handleLineupSelect = useCallback(async (value: string) => {
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
      const nextName = getDefaultLineupName(existingLineups)

      const clonedAssignments = {
        ...(baseLineup?.position_assignments || {}),
      }
      const newLineup: Lineup = {
        id: createLineupId(),
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
  }, [createLineupId, currentLineup, currentTeam, getDefaultLineupName, persistLineupsForTeam, router, setCurrentTeam])

  const handleLineupDraftAssignmentChange = useCallback((role: Role, playerId: string | '__none__') => {
    setLineupDraftAssignments((prev) => {
      const next = { ...prev }
      if (playerId === '__none__') {
        delete next[role]
      } else {
        next[role] = playerId
      }
      return next
    })
  }, [])

  const handleSaveSelectedLineupChanges = useCallback(async () => {
    if (!currentTeam || !currentLineup) return

    const updatedAssignments = cleanAssignments(lineupDraftAssignments)
    const nextLineups = currentTeam.lineups.map((lineup) =>
      lineup.id === currentLineup.id
        ? { ...lineup, position_assignments: updatedAssignments }
        : lineup
    )
    const nextTeam: Team = {
      ...currentTeam,
      lineups: nextLineups,
      active_lineup_id: currentLineup.id,
      position_assignments: updatedAssignments,
    }

    setIsSavingLineupEditor(true)
    setCurrentTeam(nextTeam)
    try {
      await persistLineupsForTeam(nextTeam)
      toast.success('Lineup updated')
    } catch (error) {
      setCurrentTeam(currentTeam)
      const message = error instanceof Error ? error.message : 'Failed to update lineup'
      toast.error(message)
    } finally {
      setIsSavingLineupEditor(false)
    }
  }, [cleanAssignments, currentLineup, currentTeam, lineupDraftAssignments, persistLineupsForTeam, setCurrentTeam])

  const handleSaveAsNewLineupFromDraft = useCallback(async () => {
    if (!currentTeam) return

    const updatedAssignments = cleanAssignments(lineupDraftAssignments)
    const existingLineups = currentTeam.lineups || []
    const baseLineup = currentLineup || existingLineups[0]
    const lineupName = newLineupNameDraft.trim() || getDefaultLineupName(existingLineups)
    const newLineup: Lineup = {
      id: createLineupId(),
      name: lineupName,
      position_assignments: updatedAssignments,
      position_source: baseLineup?.position_source ?? 'custom',
      starting_rotation: baseLineup?.starting_rotation ?? 1,
      created_at: new Date().toISOString(),
    }

    const nextTeam: Team = {
      ...currentTeam,
      lineups: [...existingLineups, newLineup],
      active_lineup_id: newLineup.id,
      position_assignments: updatedAssignments,
    }

    setIsSavingLineupEditor(true)
    setCurrentTeam(nextTeam)
    try {
      await persistLineupsForTeam(nextTeam)
      setNewLineupNameDraft('')
      toast.success(`Saved ${lineupName}`)
    } catch (error) {
      setCurrentTeam(currentTeam)
      const message = error instanceof Error ? error.message : 'Failed to save new lineup'
      toast.error(message)
    } finally {
      setIsSavingLineupEditor(false)
    }
  }, [
    cleanAssignments,
    createLineupId,
    currentLineup,
    currentTeam,
    getDefaultLineupName,
    lineupDraftAssignments,
    newLineupNameDraft,
    persistLineupsForTeam,
    setCurrentTeam,
  ])

  const handleAddPlayerFromCourtSetup = useCallback(async () => {
    if (!currentTeam) return

    const name = newCourtSetupPlayerName.trim()
    const number = newCourtSetupPlayerNumber.replace(/\D/g, '').slice(0, 3)
    if (!name && !number) {
      toast.error('Enter a player name, number, or both')
      return
    }

    const nextPlayer = {
      id: `player-${Date.now()}`,
      name: name || undefined,
      number: number ? parseInt(number, 10) : undefined,
    }
    const nextRoster = [...currentTeam.roster, nextPlayer]
    const nextTeam: Team = {
      ...currentTeam,
      roster: nextRoster,
    }

    setIsSavingLineupEditor(true)
    setCurrentTeam(nextTeam)
    try {
      if (nextTeam._id) {
        await updateRoster({
          id: nextTeam._id as Id<'teams'>,
          roster: nextRoster,
        })
      } else {
        upsertLocalTeam(nextTeam)
        setLocalTeams(listLocalTeams())
      }

      setNewCourtSetupPlayerName('')
      setNewCourtSetupPlayerNumber('')
      toast.success('Player added')
    } catch (error) {
      setCurrentTeam(currentTeam)
      const message = error instanceof Error ? error.message : 'Failed to add player'
      toast.error(message)
    } finally {
      setIsSavingLineupEditor(false)
    }
  }, [
    currentTeam,
    newCourtSetupPlayerName,
    newCourtSetupPlayerNumber,
    setCurrentTeam,
    updateRoster,
  ])

  const canShowOnboardingHint = process.env.NODE_ENV === 'development' && isMounted && isUiHydrated
  const showFirstDragHint = canShowOnboardingHint ? shouldShowFirstDragHint() : false
  const showArrowDragHint = canShowOnboardingHint && !showFirstDragHint && shouldShowArrowDragHint()
  const showPhaseNavigationHint = canShowOnboardingHint && !showFirstDragHint && !showArrowDragHint && shouldShowPhaseNavigationHint()
  const enabledDisplayCount = Number(showPosition) + Number(showPlayer) + Number(showNumber)

  // Guided tour: 3 numbered steps
  const GUIDED_TOTAL = 3
  const onboardingHintMessage = showFirstDragHint
    ? 'Drag players to set your formation'
    : showArrowDragHint
      ? 'Hover and drag the arrow to show movement'
      : showPhaseNavigationHint
        ? 'Switch phases to plan each rally step'
        : null
  const onboardingStep = showFirstDragHint
    ? 1
    : showArrowDragHint
      ? 2
      : showPhaseNavigationHint
        ? 3
        : undefined

  const onboardingTargetSelectors = showFirstDragHint
    ? ['[data-onboarding="player-token"]']
    : showArrowDragHint
      ? [
          '[data-onboarding="arrow-end-target"]',
          '[data-onboarding="arrow-preview-target"]',
          '[data-onboarding="player-token"]',
        ]
      : showPhaseNavigationHint
        ? ['[data-onboarding="phase-selector"]']
        : []

  useEffect(() => {
    if (previousPhaseRef.current === currentPhase) return
    previousPhaseRef.current = currentPhase
    if (hasCompletedFirstDrag && hasLearnedArrowDrag && !hasNavigatedPhase) {
      markPhaseNavigated()
    }
  }, [currentPhase, hasCompletedFirstDrag, hasLearnedArrowDrag, hasNavigatedPhase, markPhaseNavigated])

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
          disabled={isSavingLineup || isSavingLineupEditor}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={currentTeam ? 'Select lineup' : 'Select team first'} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Actions</SelectLabel>
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

      <div className="space-y-3 rounded-lg border border-border bg-muted/40 px-3 py-3">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Lineup Positions</Label>
          <p className="text-xs text-muted-foreground">
            Pick players for each role, then save to this lineup or save as a new one.
          </p>
        </div>
        {!currentTeam ? (
          <p className="text-xs text-muted-foreground">Select a team first.</p>
        ) : (
          <>
            <div className="space-y-2">
              {lineupRolesForSetup.map((role) => (
                <div key={role} className="grid grid-cols-[72px_1fr] items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{role}</span>
                  <Select
                    value={lineupDraftAssignments[role] || '__none__'}
                    onValueChange={(value) => handleLineupDraftAssignmentChange(role, value as string | '__none__')}
                    disabled={isSavingLineupEditor}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Unassigned</SelectItem>
                      <SelectSeparator />
                      {currentTeam.roster.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {(player.name && player.name.trim()) ? player.name : `Player ${player.number ?? ''}`.trim()}
                          {player.number !== undefined ? ` #${player.number}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => { void handleSaveSelectedLineupChanges() }}
                disabled={!currentLineup || !lineupDraftHasChanges || isSavingLineupEditor}
              >
                Save Lineup Changes
              </Button>
              <div className="flex flex-1 min-w-[220px] items-center gap-2">
                <Input
                  value={newLineupNameDraft}
                  onChange={(event) => setNewLineupNameDraft(event.target.value)}
                  placeholder="New lineup name (optional)"
                  className="h-8 text-xs"
                  disabled={isSavingLineupEditor}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { void handleSaveAsNewLineupFromDraft() }}
                  disabled={isSavingLineupEditor}
                >
                  Save as New
                </Button>
              </div>
            </div>

            <div className="space-y-2 border-t border-border/60 pt-3">
              <Label className="text-xs text-muted-foreground">Add Player to Roster</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={newCourtSetupPlayerName}
                  onChange={(event) => setNewCourtSetupPlayerName(event.target.value)}
                  placeholder="Player name"
                  className="h-8 text-xs"
                  disabled={isSavingLineupEditor}
                />
                <Input
                  value={newCourtSetupPlayerNumber}
                  onChange={(event) => setNewCourtSetupPlayerNumber(event.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="#"
                  className="h-8 w-20 text-xs"
                  inputMode="numeric"
                  maxLength={3}
                  disabled={isSavingLineupEditor}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { void handleAddPlayerFromCourtSetup() }}
                  disabled={isSavingLineupEditor || (!newCourtSetupPlayerName.trim() && !newCourtSetupPlayerNumber.trim())}
                >
                  Add
                </Button>
              </div>
            </div>
          </>
        )}
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
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Main Content Area - fills available layout height */}
      <div className="flex-1 min-h-0 h-full overflow-hidden">
        {/* Court Container - scales to fit available space */}
        <div className="w-full h-full sm:max-w-3xl mx-auto px-0 sm:px-2 relative">

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
                forceHoveredRole={showArrowDragHint ? 'S' : null}
                tagFlags={currentTagFlags}
                onTagsChange={isEditingAllowed ? (role, tags) => {
                  setTokenTags(currentRotation, currentPhase, role, tags)
                } : undefined}
	                onPlayerAssign={isEditingAllowed && currentTeam ? (role, playerId) => {
	                  assignPlayerToRole(role, playerId)
	                } : undefined}
                  suppressHoverHintTooltip={showFirstDragHint || showArrowDragHint}
                  onboardingSpotlightRole={showArrowDragHint ? 'S' : null}
                  showOnboardingArrowEndSpotlight={showArrowDragHint}
		              />

	          <SpotlightOverlay
	            show={canShowOnboardingHint && Boolean(onboardingHintMessage)}
	            message={onboardingHintMessage || ''}
	            step={onboardingStep}
	            totalSteps={onboardingStep != null ? GUIDED_TOTAL : undefined}
	            targetSelectors={onboardingTargetSelectors}
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
                Choose a team, assign players to lineup positions, and control court display.
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
                Choose a team, assign players to lineup positions, and control court display.
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
                Choose a team, assign players to lineup positions, and control court display.
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

    </div>
  )
}

function HomePageWrapper() {
  return <HomePageContent />
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-full" />}>
      <HomePageWrapper />
    </Suspense>
  )
}
