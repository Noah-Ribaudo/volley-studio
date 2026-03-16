'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { VolleyballCourt } from '@/components/court'
import { PrototypeControlPanel } from '@/components/rebuild/prototypes'
import { RebuildDialKitBridge } from '@/components/rebuild/prototypes/RebuildDialKitBridge'
import { SequenceFlowBoard } from '@/components/rebuild/prototypes/SequenceFlowBoard'
import { usePrototypeCourtState } from '@/components/rebuild/prototypes/usePrototypeCourtState'
import { usePrototypeLabController } from '@/components/rebuild/prototypes/usePrototypeLabController'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import { validateRotationLegality } from '@/lib/model/legality'
import {
  canAdvanceByPlay,
  canVariantScore,
  formatPrototypePhaseLabel,
  getLegalPlayLabel,
  getNextByPlay,
  isFoundationalPhase,
  PROTOTYPE_VARIANTS,
  toDisplayCorePhase,
  toRallyPhase,
  type CorePhase,
} from '@/lib/rebuild/prototypeFlow'
import { DEFAULT_TACTILE_TUNING, toTactileCssVariables, type TactileTuning } from '@/lib/rebuild/tactileTuning'
import { createRotationPhaseKey, getBackRowMiddle } from '@/lib/rotations'
import { getCurrentPositions, getCurrentTags } from '@/lib/whiteboardHelpers'
import { ROLES, type Position, type Role, type Rotation } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useDisplayPrefsStore } from '@/store/useDisplayPrefsStore'
import { useTeamStore } from '@/store/useTeamStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useWhiteboardStore } from '@/store/useWhiteboardStore'

export default function RebuildPrototypeLabPage() {
  const isDev = process.env.NODE_ENV === 'development'
  const isMobile = useIsMobile()
  const didBootstrapSeedsRef = useRef(false)
  const [isTuneOpen, setIsTuneOpen] = useState(false)
  const [tactileTuning, setTactileTuning] = useState<TactileTuning>(DEFAULT_TACTILE_TUNING)
  const tactileCssVariables = useMemo(() => toTactileCssVariables(tactileTuning), [tactileTuning])
  const playDurationMs = tactileTuning.c4Literal.connectorMotion.playDurationMs

  const {
    activeVariant,
    setActiveVariant,
    currentRotation,
    currentCorePhase,
    targetCorePhase,
    isOurServe,
    isPhaseTraveling,
    isPreviewingMovement,
    playAnimationTrigger,
    isLabTrayOpen,
    setIsLabTrayOpen,
    connectorStyle,
    handleRotationSelect,
    handlePhaseSelect,
    handlePlay,
    handlePoint,
    resetPreview,
    resetToBaseline,
  } = usePrototypeLabController(playDurationMs)

  const displayCurrentCorePhase = toDisplayCorePhase(currentCorePhase)
  const displayTargetCorePhase = toDisplayCorePhase(targetCorePhase)
  const rallyPhase = toRallyPhase(displayCurrentCorePhase)
  const rotationPhaseKey = createRotationPhaseKey(currentRotation, rallyPhase)

  const localPositions = useWhiteboardStore((state) => state.localPositions)
  const localStatusFlags = useWhiteboardStore((state) => state.localStatusFlags)
  const localTagFlags = useWhiteboardStore((state) => state.localTagFlags)
  const attackBallPositions = useWhiteboardStore((state) => state.attackBallPositions)
  const togglePlayerStatus = useWhiteboardStore((state) => state.togglePlayerStatus)
  const setTokenTags = useWhiteboardStore((state) => state.setTokenTags)
  const setAttackBallPosition = useWhiteboardStore((state) => state.setAttackBallPosition)
  const clearAttackBallPosition = useWhiteboardStore((state) => state.clearAttackBallPosition)

  const currentTeam = useTeamStore((state) => state.currentTeam)
  const customLayouts = useTeamStore((state) => state.customLayouts)
  const assignPlayerToRole = useTeamStore((state) => state.assignPlayerToRole)

  const showLibero = useDisplayPrefsStore((state) => state.showLibero)
  const showPosition = useDisplayPrefsStore((state) => state.showPosition)
  const showPlayer = useDisplayPrefsStore((state) => state.showPlayer)
  const showNumber = useDisplayPrefsStore((state) => state.showNumber)
  const circleTokens = useDisplayPrefsStore((state) => state.circleTokens)
  const fullStatusLabels = useDisplayPrefsStore((state) => state.fullStatusLabels)
  const hideAwayTeam = useDisplayPrefsStore((state) => state.hideAwayTeam)
  const awayTeamHidePercent = useDisplayPrefsStore((state) => state.awayTeamHidePercent)

  const currentAttackBallPosition = attackBallPositions[rotationPhaseKey] || null

  const getFallbackPrototypePositions = useCallback(
    (rotation: Rotation, phase: CorePhase) =>
      getCurrentPositions(
        rotation,
        toRallyPhase(phase),
        localPositions,
        customLayouts,
        currentTeam,
        phase === 'RECEIVE',
        undefined,
        showLibero,
        attackBallPositions[createRotationPhaseKey(rotation, toRallyPhase(phase))] || null
      ),
    [attackBallPositions, currentTeam, customLayouts, localPositions, showLibero]
  )

  const prototypeCourtState = usePrototypeCourtState({
    getFallbackPositions: getFallbackPrototypePositions,
  })

  const hasFirstAttackTargets = prototypeCourtState.hasFirstAttackTargets(currentRotation)

  const positions = useMemo(
    () => prototypeCourtState.getPositions(currentRotation, currentCorePhase),
    [currentCorePhase, currentRotation, prototypeCourtState]
  )

  const currentArrows = useMemo(
    () => prototypeCourtState.getDerivedArrows(currentRotation, currentCorePhase),
    [currentCorePhase, currentRotation, prototypeCourtState]
  )
  const currentArrowLabels = useMemo(
    () => prototypeCourtState.getArrowEndpointLabels(currentRotation, currentCorePhase),
    [currentCorePhase, currentRotation, prototypeCourtState]
  )
  const currentSecondaryArrows = useMemo(
    () => prototypeCourtState.getSecondaryDerivedArrows(currentRotation, currentCorePhase),
    [currentCorePhase, currentRotation, prototypeCourtState]
  )
  const currentSecondaryArrowLabels = useMemo(
    () => prototypeCourtState.getSecondaryArrowEndpointLabels(currentRotation, currentCorePhase),
    [currentCorePhase, currentRotation, prototypeCourtState]
  )

  const currentArrowCurves = useMemo(
    () => prototypeCourtState.getArrowCurves(currentRotation, currentCorePhase),
    [currentCorePhase, currentRotation, prototypeCourtState]
  )
  const currentStatusFlags = localStatusFlags[rotationPhaseKey] || {}
  const currentTagFlags = currentCorePhase === 'FIRST_ATTACK' ? {} : getCurrentTags(currentRotation, rallyPhase, localTagFlags)

  const violations = useMemo(() => {
    if (rallyPhase !== 'PRE_SERVE' && rallyPhase !== 'SERVE_RECEIVE') {
      return []
    }

    const replacedMB = showLibero ? getBackRowMiddle(currentRotation) : null
    const validPositions: Record<Role, Position> = {} as Record<Role, Position>

    for (const role of ROLES) {
      if (role === 'L' && !showLibero) {
        validPositions[role] = { x: 0.5, y: 0.5 }
      } else if (showLibero && role === replacedMB) {
        validPositions[role] = positions.L || positions[replacedMB] || { x: 0.5, y: 0.5 }
      } else {
        validPositions[role] = positions[role] || { x: 0.5, y: 0.5 }
      }
    }

    return validateRotationLegality(currentRotation, validPositions)
  }, [currentRotation, positions, rallyPhase, showLibero])

  const handleLoadDemoSeeds = useCallback(() => {
    resetPreview()
    prototypeCourtState.loadDemoSeeds([1, 4])
    resetToBaseline()
  }, [prototypeCourtState, resetPreview, resetToBaseline])

  const handleResetCurrentPhase = useCallback(() => {
    resetPreview()
    prototypeCourtState.resetPhase(currentRotation, currentCorePhase)
    if (currentCorePhase !== 'FIRST_ATTACK') {
      clearAttackBallPosition(currentRotation, rallyPhase)
    }
  }, [clearAttackBallPosition, currentCorePhase, currentRotation, prototypeCourtState, rallyPhase, resetPreview])

  useEffect(() => {
    if (didBootstrapSeedsRef.current) return
    didBootstrapSeedsRef.current = true
    handleLoadDemoSeeds()
  }, [handleLoadDemoSeeds])

  const isEditingAllowed = !isPreviewingMovement
  const controlCorePhase = isPhaseTraveling
    ? targetCorePhase
    : currentCorePhase
  const displayNextByPlay = toDisplayCorePhase(getNextByPlay(controlCorePhase, { hasFirstAttack: hasFirstAttackTargets }))
  const nextByPlay = getNextByPlay(controlCorePhase, { hasFirstAttack: hasFirstAttackTargets })
  const canPlayAdvance = canAdvanceByPlay(controlCorePhase, { hasFirstAttack: hasFirstAttackTargets })
  const legalPlayLabel = getLegalPlayLabel(controlCorePhase, { hasFirstAttack: hasFirstAttackTargets })
  const scoringEnabled = canVariantScore(activeVariant)
  const handleTuningChange = useCallback((next: TactileTuning) => {
    setTactileTuning(next)
  }, [])
  const mobileDockStyle = undefined
  const mobileCourtAspectRatio = '393 / 696'

  const labStatusCopy = `Rotation ${currentRotation} • ${formatPrototypePhaseLabel(currentCorePhase)} • ${
    isOurServe ? 'We Serve' : 'We Receive'
  }`

  useEffect(() => {
    const root = document.documentElement
    const previousTheme = root.getAttribute('data-theme')
    const previousThemeState = useThemeStore.getState()
    root.setAttribute('data-theme', 'light')
    useThemeStore.setState({
      theme: 'light',
      themePreference: 'light',
    })

    return () => {
      if (previousTheme) {
        root.setAttribute('data-theme', previousTheme)
      } else {
        root.removeAttribute('data-theme')
      }

      useThemeStore.setState({
        theme: previousThemeState.theme,
        themePreference: previousThemeState.themePreference,
      })
    }
  }, [])

  const prototypeControlPanel = (
    <PrototypeControlPanel
      activeVariant={activeVariant}
      variantId={activeVariant}
      currentRotation={currentRotation}
      currentCorePhase={currentCorePhase}
      targetCorePhase={targetCorePhase}
      displayCurrentCorePhase={displayCurrentCorePhase}
      displayTargetCorePhase={displayTargetCorePhase}
      nextByPlay={nextByPlay}
      canPlayAdvance={canPlayAdvance}
      displayNextByPlay={displayNextByPlay}
      legalPlayLabel={legalPlayLabel}
      isFoundationalPhase={isFoundationalPhase(displayCurrentCorePhase)}
      isOurServe={isOurServe}
      canScore={scoringEnabled}
      connectorStyle={connectorStyle}
      playAnimationTrigger={playAnimationTrigger}
      isPhaseTraveling={isPhaseTraveling}
      isPreviewingMovement={isPreviewingMovement}
      switchMotion={tactileTuning.switchMotion}
      tactileTuning={tactileTuning}
      hasFirstAttackTargets={hasFirstAttackTargets}
      onRotationSelect={handleRotationSelect}
      onPhaseSelect={handlePhaseSelect}
      onPlay={() => {
        if (!canPlayAdvance) return
        handlePlay(nextByPlay)
      }}
      onPoint={handlePoint}
    />
  )

  const tuneGuide = null
  const flowBoard = <SequenceFlowBoard className={isMobile ? 'mt-4' : 'h-full'} />

  const labToolContent = (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={handleLoadDemoSeeds}>
          Load Demo Seeds
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={handleResetCurrentPhase}>
          Reset Current Phase
        </Button>
        {isDev ? (
          <Button
            type="button"
            size="sm"
            variant={isTuneOpen ? 'default' : 'outline'}
            className={cn('h-9', isMobile ? 'col-span-2' : 'w-full')}
            onClick={() => setIsTuneOpen((prev) => !prev)}
          >
            {isTuneOpen ? 'Tune On' : 'Tune'}
          </Button>
        ) : null}
      </div>

      <div className="lab-inset mt-3 rounded-lg p-1">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${PROTOTYPE_VARIANTS.length}, minmax(0, 1fr))` }}
        >
          {PROTOTYPE_VARIANTS.map((variant) => (
            <Button
              key={variant.id}
              type="button"
              variant={variant.id === activeVariant ? 'default' : 'outline'}
              size="sm"
              className="h-9 px-2 text-[11px]"
              onClick={() => {
                setActiveVariant(variant.id)
                if (isMobile) {
                  setIsLabTrayOpen(false)
                }
              }}
            >
              {variant.shortLabel}
            </Button>
          ))}
        </div>
        <div className="px-2 pt-1 text-[11px] text-muted-foreground">
          {PROTOTYPE_VARIANTS.find((variant) => variant.id === activeVariant)?.label}
        </div>
      </div>
      {tuneGuide}
    </>
  )

  const phoneShell = (
    <>
      {isMobile ? (
        <>
          <div className="pointer-events-none absolute inset-x-2 top-2 z-20 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="pointer-events-auto h-9 rounded-full border border-border bg-card px-4 text-[11px] uppercase tracking-[0.08em] shadow-[0_10px_24px_rgba(0,0,0,0.08)]"
              onClick={() => setIsLabTrayOpen(true)}
            >
              Lab
            </Button>
          </div>

          <Sheet open={isLabTrayOpen} onOpenChange={setIsLabTrayOpen}>
            <SheetContent
              side="top"
              className="rounded-b-3xl border-b border-border/60 bg-card px-0 pb-0 pt-0 shadow-[0_18px_40px_rgba(0,0,0,0.12)]"
            >
              <SheetHeader className="pb-2 pr-12">
                <SheetTitle className="text-base">Prototype Lab</SheetTitle>
                <SheetDescription>{labStatusCopy}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-4">{labToolContent}</div>
              <div className="px-4 pb-4">{flowBoard}</div>
            </SheetContent>
          </Sheet>
        </>
      ) : null}

      <main className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden">
        <section className="flex min-h-0 flex-1 items-end overflow-visible">
          <div className="relative w-full shrink-0 overflow-visible" style={{ aspectRatio: mobileCourtAspectRatio }}>
            <VolleyballCourt
              positions={positions}
              animationConfig={{ durationMs: playDurationMs }}
              hideAwayTeam={hideAwayTeam}
              awayTeamHidePercent={awayTeamHidePercent}
              rotation={currentRotation}
              roster={currentTeam?.roster || []}
              assignments={currentTeam?.position_assignments || {}}
              onPositionChange={
                isEditingAllowed
                  ? (role, position) => {
                      prototypeCourtState.updatePosition(currentRotation, currentCorePhase, role, position)
                    }
                  : undefined
              }
              arrows={currentArrows}
              arrowEndpointLabels={currentArrowLabels}
              secondaryArrows={currentSecondaryArrows}
              secondaryArrowEndpointLabels={currentSecondaryArrowLabels}
              allowReceiveSecondaryPreview={currentCorePhase === 'RECEIVE'}
              onArrowChange={
                isEditingAllowed
                  ? (role, position, options) => {
                      if (options?.variant === 'secondary') {
                        prototypeCourtState.updateSecondaryArrowTarget(currentRotation, currentCorePhase, role, position)
                        return
                      }

                      prototypeCourtState.updateArrowTarget(currentRotation, currentCorePhase, role, position)
                      if (!position) {
                        prototypeCourtState.setArrowCurve(currentRotation, currentCorePhase, role, null)
                      }
                    }
                  : undefined
              }
              arrowCurves={currentArrowCurves}
              onArrowCurveChange={
                isEditingAllowed
                  ? (role, curve) => {
                      prototypeCourtState.setArrowCurve(currentRotation, currentCorePhase, role, curve)
                    }
                  : undefined
              }
              showPosition={showPosition}
              showPlayer={showPlayer}
              showNumber={showNumber}
              circleTokens={circleTokens}
              legalityViolations={violations}
              showLibero={showLibero}
              currentPhase={currentCorePhase === 'FIRST_ATTACK' ? 'ATTACK_PHASE' : rallyPhase}
              attackBallPosition={currentCorePhase === 'FIRST_ATTACK' ? null : currentAttackBallPosition}
              onAttackBallChange={
                isEditingAllowed && currentCorePhase !== 'FIRST_ATTACK'
                  ? (position) => {
                      if (!position) {
                        clearAttackBallPosition(currentRotation, rallyPhase)
                        return
                      }

                      setAttackBallPosition(currentRotation, rallyPhase, position)
                    }
                  : undefined
              }
              statusFlags={currentCorePhase === 'FIRST_ATTACK' ? {} : currentStatusFlags}
              onStatusToggle={
                isEditingAllowed && currentCorePhase !== 'FIRST_ATTACK'
                  ? (role, status) => {
                      togglePlayerStatus(currentRotation, rallyPhase, role, status)
                    }
                  : undefined
              }
            fullStatusLabels={fullStatusLabels}
            animationTrigger={playAnimationTrigger}
            isPreviewingMovement={isPreviewingMovement}
            preserveAspectRatio="xMidYMax meet"
            tagFlags={currentTagFlags}
            onTagsChange={
                isEditingAllowed && currentCorePhase !== 'FIRST_ATTACK'
                  ? (role, tags) => {
                      setTokenTags(currentRotation, rallyPhase, role, tags)
                    }
                  : undefined
              }
              onPlayerAssign={
                isEditingAllowed
                  ? (role, playerId) => {
                      assignPlayerToRole(role, playerId)
                    }
                  : undefined
              }
            />
          </div>
        </section>

        <section className="w-full shrink-0 overflow-visible" style={mobileDockStyle}>
          <div className="flex min-h-0 items-end overflow-visible">{prototypeControlPanel}</div>
        </section>
      </main>
    </>
  )

  return (
    <div
      className="lab-light-canvas h-dvh w-full overflow-hidden bg-background text-foreground"
      data-rebuild-lab="tactile"
      style={tactileCssVariables}
    >
      {isMobile ? (
        <div className="relative mx-auto flex h-full w-full flex-col overflow-hidden">{phoneShell}</div>
      ) : (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden px-6 pb-4">
          <div className="flex h-full w-full max-w-[960px] items-center justify-center gap-8">
            <div className="relative flex shrink-0 items-center justify-center">
              <div
                className="relative rounded-[44px] border border-white/12 bg-[linear-gradient(180deg,rgba(18,18,22,0.98)_0%,rgba(8,8,10,0.98)_100%)] p-[10px] shadow-[0_32px_60px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]"
                style={{
                  height: 'min(852px, calc(100dvh - 32px))',
                  aspectRatio: '393 / 852',
                }}
              >
                <div className="pointer-events-none absolute left-1/2 top-[10px] h-[28px] w-[128px] -translate-x-1/2 rounded-full bg-black/55 ring-1 ring-white/10" />
                <div className="relative h-full w-full overflow-hidden rounded-[34px] border border-white/6 bg-background">
                  <div className="relative flex h-full w-full flex-col overflow-hidden">{phoneShell}</div>
                </div>
                <div className="pointer-events-none absolute bottom-[7px] left-1/2 h-[4px] w-[120px] -translate-x-1/2 rounded-full bg-white/10" />
              </div>
            </div>

            <aside className="flex h-full w-[420px] max-w-[420px] shrink-0 flex-col gap-4 py-4">
              <div className="rounded-[30px] border border-border bg-card/94 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.1)]">
                <div className="pb-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Mobile Simulator</p>
                  <h1 className="text-lg font-semibold">Prototype Lab</h1>
                  <p className="text-xs text-muted-foreground">{labStatusCopy}</p>
                </div>
                {labToolContent}
              </div>
              <div className="min-h-0 flex-1">{flowBoard}</div>
            </aside>
          </div>
        </div>
      )}

      {isDev && isTuneOpen ? (
        <RebuildDialKitBridge
          activeVariant={activeVariant}
          onTuningChange={handleTuningChange}
          position={isMobile ? 'top-right' : 'top-left'}
        />
      ) : null}
    </div>
  )
}
