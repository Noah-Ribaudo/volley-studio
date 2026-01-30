'use client'

import { useEffect, useState, useMemo, useRef, useCallback, useLayoutEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAppStore, getCurrentPositions, getCurrentArrows, getActiveLineupPositionSource } from '@/store/useAppStore'
import { useAdminStore } from '@/store/useAdminStore'
import { useSimulation } from '@/hooks/useSimulation'
import { usePresets } from '@/hooks/usePresets'
import { VolleyballCourt } from '@/components/court'
import { PlaybackBar } from '@/components/controls'
import { RosterManagementCard } from '@/components/roster'
import { AdminUnlockDialog, AdminModeIndicator } from '@/components/admin'
import { Role, ROLES, RALLY_PHASES, Position, PositionCoordinates, ROTATIONS, PositionAssignments, POSITION_SOURCE_INFO } from '@/lib/types'
import { getActiveAssignments } from '@/lib/lineups'
import type { RallyPhase } from '@/lib/sim/types'
import { getWhiteboardPositions } from '@/lib/sim/whiteboard'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { LearningPanel } from '@/components/learning/LearningPanel'
import { allLessons } from '@/lib/learning/allModules'
import { createRotationPhaseKey, getBackRowMiddle } from '@/lib/rotations'
import { getServerRole } from '@/lib/sim/rotation'
import { validateRotationLegality } from '@/lib/model/legality'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation'
import { useWhiteboardSync } from '@/hooks/useWhiteboardSync'
import { useLineupPresets } from '@/hooks/useLineupPresets'
import { SwipeHint } from '@/components/mobile'
import { ConflictResolutionModal } from '@/components/volleyball/ConflictResolutionModal'
import { isAdminModeAvailable } from '@/lib/admin-auth'

// Constants for court display (previously unused state)
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

function HomePageContent() {
  const searchParams = useSearchParams()
  const { requestAdminMode } = useAdminStore()

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
    setRotation,
    setPhase,
    nextPhase,
    prevPhase,
    setHighlightedRole,
    updateLocalPosition,
    updateArrow,
    clearArrow,
    setLegalityViolations,
    legalityViolations,
    isReceivingContext,
    visiblePhases,
    showLibero,
    showPosition,
    showPlayer,
    circleTokens,
    fullStatusLabels,
    debugHitboxes,
    attackBallPositions,
    setAttackBallPosition,
    clearAttackBallPosition,
    // Unified playback controls (Phase 6)
    playbackMode,
    setPlaybackMode,
    game,
    startNewGame,
    rallyEndInfo,
    setRallyEndInfo,
    clearRallyEndInfo,
    // Context UI (Phase 1)
    contextPlayer,
    setContextPlayer,
    // Learning mode
    startLesson,
    // Away team visibility
    hideAwayTeam,
    awayTeamHidePercent,
    // Player status flags
    localStatusFlags,
    togglePlayerStatus,
  } = useAppStore()

  // Mobile detection
  const isMobile = useIsMobile()

  // Admin mode - check for ?admin=true query param
  useEffect(() => {
    const adminParam = searchParams.get('admin')
    if (adminParam === 'true' && isAdminModeAvailable()) {
      requestAdminMode()
    }
  }, [searchParams, requestAdminMode])

  // Preset management for admin mode
  const { isAdminMode, saveCurrentAsPreset } = usePresets()

  // Lineup preset management - loads presets when active lineup uses a preset source
  const { isUsingPreset, presetSystem, getPresetLayouts, isLoading: isLoadingPresets } = useLineupPresets()
  const presetLayouts = presetSystem ? getPresetLayouts(presetSystem) : []

  // Determine if editing is allowed (not when using presets)
  const isEditingAllowed = !isUsingPreset
  const activePositionSource = getActiveLineupPositionSource(currentTeam)

  // Auto-save whiteboard changes to Supabase (team mode) or presets (admin mode)
  useWhiteboardSync()

  // Save to presets when admin makes changes (positions, arrows, status flags)
  const rotationPhaseKeyForPresets = createRotationPhaseKey(currentRotation, currentPhase)
  const currentLayoutJson = JSON.stringify({
    positions: localPositions[rotationPhaseKeyForPresets],
    arrows: localArrows[rotationPhaseKeyForPresets],
    arrowCurves: arrowCurves[rotationPhaseKeyForPresets],
    statusFlags: localStatusFlags[rotationPhaseKeyForPresets],
    attackBall: attackBallPositions[rotationPhaseKeyForPresets],
  })
  const prevLayoutRef = useRef<string | null>(null)

  useEffect(() => {
    // Only save when in admin mode, no team selected, and layout has changed
    if (isAdminMode && !currentTeam && currentLayoutJson !== prevLayoutRef.current) {
      if (prevLayoutRef.current !== null) {
        // Don't save on initial load, only on subsequent changes
        saveCurrentAsPreset()
      }
      prevLayoutRef.current = currentLayoutJson
    }
  }, [isAdminMode, currentTeam, currentLayoutJson, saveCurrentAsPreset])

  // Swipe navigation for mobile - navigate between rotations
  const nextRotation = useCallback(() => {
    const idx = ROTATIONS.indexOf(currentRotation)
    setRotation(ROTATIONS[(idx + 1) % ROTATIONS.length])
  }, [currentRotation, setRotation])

  const prevRotation = useCallback(() => {
    const idx = ROTATIONS.indexOf(currentRotation)
    setRotation(ROTATIONS[(idx - 1 + ROTATIONS.length) % ROTATIONS.length])
  }, [currentRotation, setRotation])

  // Swipe left/right to change rotations on mobile (only in edit mode)
  const { swipeState, handlers: swipeHandlers } = useSwipeNavigation({
    onSwipeLeft: nextPhase,
    onSwipeRight: prevPhase,
    enabled: isMobile && playbackMode === 'paused',
    threshold: 50,
  })

  // Measure court container to calculate offset based on percentage
  const courtContainerRef = useRef<HTMLDivElement>(null)
  const [courtOffset, setCourtOffset] = useState(0)

  // Calculate offset when visibility changes or on resize
  useLayoutEffect(() => {
    const updateOffset = () => {
      if (!hideAwayTeam) {
        setCourtOffset(0)
        return
      }

      const container = courtContainerRef.current
      if (!container) return

      // Find the SVG inside the court container
      const svg = container.querySelector('svg')
      if (!svg) return

      // Get the SVG's actual rendered height
      const svgRect = svg.getBoundingClientRect()

      // Hide configurable percentage of court height (away team is top half)
      const offsetPercent = awayTeamHidePercent / 100
      const offset = svgRect.height * offsetPercent

      setCourtOffset(offset)
    }

    updateOffset()

    // Also update on resize
    window.addEventListener('resize', updateOffset)
    return () => window.removeEventListener('resize', updateOffset)
  }, [hideAwayTeam, awayTeamHidePercent])

  // Simulation engine for Play mode
  const isPlayMode = playbackMode === 'live'
  const [simState, simControls] = useSimulation({
    isRunning: isPlayMode,
    showLibero,
    onError: () => {
      toast.error('Simulation encountered an error. Switching back to Edit mode.')
      setPlaybackMode('paused')
    },
  })

  // Capture rally end state when phase becomes BALL_DEAD (only once per rally)
  const prevPhaseRef = useRef<RallyPhase | null>(null)
  useEffect(() => {
    // Clear rally end state when leaving play mode
    if (!isPlayMode && rallyEndInfo) {
      clearRallyEndInfo()
      prevPhaseRef.current = null
      return
    }

    // Only capture state when transitioning INTO BALL_DEAD phase
    if (isPlayMode &&
        simState.phase === "BALL_DEAD" &&
        prevPhaseRef.current !== "BALL_DEAD" &&
        simState.rallyEndReason &&
        simState.rallyWinner) {
      setRallyEndInfo({
        reason: simState.rallyEndReason,
        winner: simState.rallyWinner,
        lastContact: simState.lastContact,
        possessionChain: simState.possessionChain,
        homeScore: simState.homeScore,
        awayScore: simState.awayScore,
        frozenPositions: simState.playerPositions,
        frozenAwayPositions: simState.awayPlayerPositions,
      })
    }

    prevPhaseRef.current = simState.phase
  }, [isPlayMode, simState.phase, simState.rallyEndReason, simState.rallyWinner, simState.lastContact, simState.possessionChain, simState.homeScore, simState.awayScore, simState.playerPositions, simState.awayPlayerPositions, rallyEndInfo, clearRallyEndInfo, setRallyEndInfo])

  // Handler to dismiss rally end banner and start next rally
  const handleNextRally = useCallback(() => {
    clearRallyEndInfo()
    simControls.serve()
  }, [simControls, clearRallyEndInfo])

  // Handler to dismiss rally end banner and return to edit mode
  const handleBackToEdit = useCallback(() => {
    clearRallyEndInfo()
    simControls.reset()
    setPlaybackMode('paused')
  }, [setPlaybackMode, clearRallyEndInfo, simControls])

  const [rosterSheetOpen, setRosterSheetOpen] = useState(false)

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

  // Positions are already in normalized format (0-1)
  // Use positions directly for legality validation
  const normalizedPositions = positions

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

  // Validate legality - only for PRE_SERVE and SERVE_RECEIVE phases
  // In all other phases, players can be anywhere, so no violations apply
  const violations = useMemo(() => {
    // Only validate for pre-serve phases
    if (currentPhase === 'PRE_SERVE' || currentPhase === 'SERVE_RECEIVE') {
      // Determine which MB is replaced by libero (if enabled)
      const replacedMB = showLibero ? getBackRowMiddle(currentRotation, baseOrder) : null

      // Ensure all required roles have positions (provide defaults for missing)
      const validPositions: Record<Role, Position> = {} as Record<Role, Position>
      for (const role of ROLES) {
        // Skip libero if not shown - provide default position (won't be validated anyway)
        if (role === 'L' && !showLibero) {
          validPositions[role] = { x: 0.5, y: 0.5 }
        }
        // When libero is enabled, use libero's position for the replaced MB
        // This ensures proper zone validation (libero takes MB's zone responsibilities)
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
    // For all other phases, return empty array (no violations)
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

  // Handler to start play mode
  const handleStartPlay = useCallback(() => {
    if (!game) {
      startNewGame()
    }
    setPlaybackMode('live')
  }, [game, startNewGame, setPlaybackMode])

  // Handler to start learning mode
  const handleStartLearning = useCallback(() => {
    startLesson(allLessons[0].id)
  }, [startLesson])

  // Visual feedback during swipe
  const swipeOffset = swipeState.swiping ? swipeState.delta.x * 0.2 : 0

  return (
    <div className="h-full bg-gradient-to-b from-background to-muted/30 flex flex-col overflow-hidden">
      {/* Main Content Area - full screen */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Court Container - scales to fit available space */}
        {/* On mobile: let court be full width and natural height (may overflow) */}
        {/* On desktop: constrain to max-w-3xl and fit in available height */}
        <div className="w-full h-auto sm:h-full sm:max-w-3xl mx-auto px-0 sm:px-2 relative">
          {/* Gradient overlay to fade out content behind the menu when away team is hidden */}
          {hideAwayTeam && (
            <div
              className="absolute left-0 right-0 z-40 pointer-events-none"
              style={{
                top: '56px',
                height: '120px',
                background: 'linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--background) / 0.9) 30%, hsl(var(--background) / 0.5) 60%, transparent 100%)'
              }}
            />
          )}

          {/* Floating Control Panel - desktop only, or mobile in non-edit mode */}
          {(!isMobile || playbackMode !== 'paused') && (
            <PlaybackBar
            playbackMode={playbackMode}
            onPlaybackModeChange={handleStartPlay}
            // Edit mode props
            currentRotation={currentRotation}
            currentPhase={currentPhase}
            onNext={nextPhase}
            onPrev={prevPhase}
            onPhaseChange={setPhase}
            onRotationChange={setRotation}
            visiblePhases={visiblePhases}
            // Live mode props
            homeScore={simState.homeScore}
            awayScore={simState.awayScore}
            simPhase={simState.phase}
            currentSpeed={simControls.currentSpeed}
            onSpeedChange={simControls.setSpeed}
            onServe={simControls.serve}
            // Rally end props
            rallyEndInfo={rallyEndInfo}
            onNextRally={handleNextRally}
            onBackToEdit={handleBackToEdit}
            onRosterOpen={() => setRosterSheetOpen(true)}
            onLearnOpen={handleStartLearning}
          />
          )}

          {/* Preset mode indicator - shown when viewing preset positions */}
          {isUsingPreset && !isPlayMode && (
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
            ref={courtContainerRef}
            className="relative w-full h-auto sm:h-full flex items-center justify-center pt-2 sm:pt-14"
            style={{
              ...(courtOffset > 0 ? { transform: `translateY(-${courtOffset}px)` } : {}),
              ...(swipeOffset !== 0 ? { transform: `translateX(${swipeOffset}px)` } : {}),
              transition: swipeState.swiping ? 'none' : 'transform 0.2s ease-out',
            }}
            {...(isMobile && playbackMode === 'paused' ? swipeHandlers : {})}
          >
              <VolleyballCourt
                mode={isPlayMode ? "simulation" : "whiteboard"}
                positions={isPlayMode
                  ? (rallyEndInfo ? rallyEndInfo.frozenPositions : simState.playerPositions)
                  : positions}
                awayPositions={isPlayMode
                  ? (rallyEndInfo
                    ? rallyEndInfo.frozenAwayPositions
                    : simState.awayPlayerPositions)
                  : awayPositions}
                highlightedRole={highlightedRole}
                rotation={isPlayMode ? simState.rotation : currentRotation}
                baseOrder={baseOrder}
                roster={currentTeam?.roster || []}
                assignments={currentTeam ? getActiveAssignments(currentTeam) : {}}
                onPositionChange={(role, position) => {
                  if (!isPlayMode) {
                    updateLocalPosition(currentRotation, currentPhase, role, position)
                  }
                }}
                onAwayPositionChange={isPlayMode ? undefined : handleAwayPositionChange}
                onRoleClick={setHighlightedRole}
                editable={!isPlayMode && isEditingAllowed}
                animationMode={isPlayMode ? "raf" : ANIMATION_MODE}
                animationConfig={isPlayMode ? { durationMs: 350, easingFn: "cubic" } : ANIMATION_CONFIG}
                arrows={isPlayMode ? {} : currentArrows}
                arrowCurves={isPlayMode ? {} : currentArrowCurves}
                onArrowCurveChange={(isPlayMode || !isEditingAllowed) ? undefined : (role, curve) => {
                  setArrowCurve(currentRotation, currentPhase, role, curve)
                }}
                showLibero={showLibero}
                onArrowChange={(isPlayMode || !isEditingAllowed) ? undefined : (role, position) => {
                  if (!position) {
                    clearArrow(currentRotation, currentPhase, role)
                    return
                  }
                  updateArrow(currentRotation, currentPhase, role, position)
                }}
                showPosition={showPosition}
                showPlayer={showPlayer}
                circleTokens={circleTokens}
                tokenScaleDesktop={TOKEN_SCALES.desktop}
                tokenScaleMobile={TOKEN_SCALES.mobile}
                tokenWidthOffset={TOKEN_DIMENSIONS.widthOffset}
                tokenHeightOffset={TOKEN_DIMENSIONS.heightOffset}
                legalityViolations={isPlayMode ? [] : currentViolations}
                currentPhase={isPlayMode ? simState.phase : currentPhase}
                attackBallPosition={isPlayMode ? null : currentAttackBallPosition}
                onAttackBallChange={(isPlayMode || !isEditingAllowed) ? undefined : (pos) => {
                  if (pos) {
                    setAttackBallPosition(currentRotation, currentPhase, pos)
                  } else {
                    clearAttackBallPosition(currentRotation, currentPhase)
                  }
                }}
                ballPosition={isPlayMode ? simState.ballPosition : (currentPhase === 'PRE_SERVE' ? (() => {
                  // Calculate ball position for whiteboard PRE_SERVE - ball is held by server
                  const serverRole = getServerRole(currentRotation, baseOrder) as Role
                  const serverPos = positions[serverRole]
                  if (!serverPos) return undefined
                  // Position at 2:30 on clock face (right side, slightly down)
                  // cos(300°) ≈ 0.5, sin(300°) ≈ -0.866
                  return {
                    x: serverPos.x + 0.04,  // Right
                    y: serverPos.y - 0.03   // Slightly up (negative y is up on court)
                  }
                })() : undefined)}
                ballHeight={isPlayMode ? simState.ballHeight : (currentPhase === 'PRE_SERVE' ? 0.15 : undefined)}
                ballContactFlash={isPlayMode ? simState.recentContact : undefined}
                fsmPhase={isPlayMode ? simState.phase : undefined}
                contextPlayer={contextPlayer}
                onContextPlayerChange={setContextPlayer}
                statusFlags={isPlayMode ? {} : currentStatusFlags}
                onStatusToggle={(isPlayMode || !isEditingAllowed) ? undefined : (role, status) => {
                  togglePlayerStatus(currentRotation, currentPhase, role, status)
                }}
                fullStatusLabels={fullStatusLabels}
                hasTeam={Boolean(currentTeam)}
                onManageRoster={() => setRosterSheetOpen(true)}
                debugHitboxes={debugHitboxes}
              />

          {/* Swipe hint for mobile users - shows once */}
          {isMobile && playbackMode === 'paused' && (
            <SwipeHint
              storageKey="whiteboard-swipe-hint-seen"
              autoHideMs={4000}
            />
          )}
          </div>
        </div>
      </div>

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


      {/* Learning Panel */}
      <LearningPanel />

      {/* Conflict Resolution Modal - shown when save conflict is detected */}
      <ConflictResolutionModal />

      {/* Admin Mode UI */}
      <AdminUnlockDialog />
      <AdminModeIndicator />
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
