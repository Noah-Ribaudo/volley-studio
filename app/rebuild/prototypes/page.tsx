'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { VolleyballCourt } from '@/components/court'
import { PrototypeControlPanel } from '@/components/rebuild/prototypes'
import { RebuildDialKitBridge } from '@/components/rebuild/prototypes/RebuildDialKitBridge'
import { usePrototypeLabController } from '@/components/rebuild/prototypes/usePrototypeLabController'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import { validateRotationLegality } from '@/lib/model/legality'
import {
  canVariantScore,
  CONNECTOR_STYLE_OPTIONS,
  CORE_PHASES,
  formatCorePhaseLabel,
  getLegalPlayLabel,
  getNextByPlay,
  isFoundationalPhase,
  PROTOTYPE_VARIANTS,
  toRallyPhase,
} from '@/lib/rebuild/prototypeFlow'
import { getPrototypeSeed } from '@/lib/rebuild/prototypeSeeds'
import { DEFAULT_TACTILE_TUNING, toTactileCssVariables, type TactileTuning } from '@/lib/rebuild/tactileTuning'
import { createRotationPhaseKey, getBackRowMiddle } from '@/lib/rotations'
import { getCurrentArrows, getCurrentPositions, getCurrentTags } from '@/lib/whiteboardHelpers'
import { ROLES, type Position, type Role, type Rotation } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useDisplayPrefsStore } from '@/store/useDisplayPrefsStore'
import { useTeamStore } from '@/store/useTeamStore'
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
    isOurServe,
    isPreviewingMovement,
    playAnimationTrigger,
    isLabTrayOpen,
    setIsLabTrayOpen,
    connectorStyle,
    setConnectorStyle,
    handleRotationSelect,
    handlePhaseSelect,
    handlePlay,
    handlePoint,
    resetPreview,
    resetToBaseline,
  } = usePrototypeLabController(playDurationMs)

  const rallyPhase = toRallyPhase(currentCorePhase)
  const rotationPhaseKey = createRotationPhaseKey(currentRotation, rallyPhase)

  const localPositions = useWhiteboardStore((state) => state.localPositions)
  const localArrows = useWhiteboardStore((state) => state.localArrows)
  const arrowCurves = useWhiteboardStore((state) => state.arrowCurves)
  const localStatusFlags = useWhiteboardStore((state) => state.localStatusFlags)
  const localTagFlags = useWhiteboardStore((state) => state.localTagFlags)
  const attackBallPositions = useWhiteboardStore((state) => state.attackBallPositions)
  const updateLocalPosition = useWhiteboardStore((state) => state.updateLocalPosition)
  const updateArrow = useWhiteboardStore((state) => state.updateArrow)
  const clearArrow = useWhiteboardStore((state) => state.clearArrow)
  const setArrowCurve = useWhiteboardStore((state) => state.setArrowCurve)
  const togglePlayerStatus = useWhiteboardStore((state) => state.togglePlayerStatus)
  const setTokenTags = useWhiteboardStore((state) => state.setTokenTags)
  const setAttackBallPosition = useWhiteboardStore((state) => state.setAttackBallPosition)
  const clearAttackBallPosition = useWhiteboardStore((state) => state.clearAttackBallPosition)
  const resetToDefaults = useWhiteboardStore((state) => state.resetToDefaults)

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

  const isReceivingContext = currentCorePhase === 'RECEIVE'

  const positions = useMemo(
    () =>
      getCurrentPositions(
        currentRotation,
        rallyPhase,
        localPositions,
        customLayouts,
        currentTeam,
        isReceivingContext,
        undefined,
        showLibero,
        currentAttackBallPosition
      ),
    [
      currentAttackBallPosition,
      currentRotation,
      currentTeam,
      customLayouts,
      isReceivingContext,
      localPositions,
      rallyPhase,
      showLibero,
    ]
  )

  const currentArrows = useMemo(
    () =>
      getCurrentArrows(
        currentRotation,
        rallyPhase,
        localArrows,
        isReceivingContext,
        undefined,
        showLibero,
        currentAttackBallPosition,
        currentTeam
      ),
    [
      currentAttackBallPosition,
      currentRotation,
      currentTeam,
      isReceivingContext,
      localArrows,
      rallyPhase,
      showLibero,
    ]
  )

  const currentArrowCurves = arrowCurves[rotationPhaseKey] || {}
  const currentStatusFlags = localStatusFlags[rotationPhaseKey] || {}
  const currentTagFlags = getCurrentTags(currentRotation, rallyPhase, localTagFlags)

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

    ;([1, 4] as Rotation[]).forEach((rotation) => {
      CORE_PHASES.forEach((phase) => {
        const seed = getPrototypeSeed(rotation, phase)
        if (!seed) return
        const mappedPhase = toRallyPhase(phase)

        for (const role of ROLES) {
          clearArrow(rotation, mappedPhase, role)
        }

        for (const [role, pos] of Object.entries(seed.positions)) {
          if (!pos) continue
          updateLocalPosition(rotation, mappedPhase, role as Role, pos)
        }

        for (const [role, pos] of Object.entries(seed.arrows)) {
          if (!pos) continue
          updateArrow(rotation, mappedPhase, role as Role, pos)
        }
      })
    })

    resetToBaseline()
  }, [clearArrow, resetPreview, resetToBaseline, updateArrow, updateLocalPosition])

  const handleResetCurrentPhase = useCallback(() => {
    resetPreview()
    resetToDefaults(currentRotation, rallyPhase)
    clearAttackBallPosition(currentRotation, rallyPhase)
  }, [clearAttackBallPosition, currentRotation, rallyPhase, resetPreview, resetToDefaults])

  useEffect(() => {
    if (didBootstrapSeedsRef.current) return
    didBootstrapSeedsRef.current = true
    handleLoadDemoSeeds()
  }, [handleLoadDemoSeeds])

  const isEditingAllowed = !isPreviewingMovement
  const nextByPlay = getNextByPlay(currentCorePhase)
  const legalPlayLabel = getLegalPlayLabel(currentCorePhase)
  const scoringEnabled = canVariantScore(activeVariant)
  const handleTuningChange = useCallback((next: TactileTuning) => {
    setTactileTuning(next)
  }, [])
  const mobileDockHeight =
    activeVariant === 'concept4' ? tactileTuning.c4Literal.clusterLayout.dockHeight : tactileTuning.dock.collapsedHeight

  const labStatusCopy = `Rotation ${currentRotation} • ${formatCorePhaseLabel(currentCorePhase)} • ${
    isOurServe ? 'We Serve' : 'We Receive'
  }`

  const prototypeControlPanel = (
    <PrototypeControlPanel
      activeVariant={activeVariant}
      variantId={activeVariant}
      currentRotation={currentRotation}
      currentCorePhase={currentCorePhase}
      nextByPlay={nextByPlay}
      legalPlayLabel={legalPlayLabel}
      isFoundationalPhase={isFoundationalPhase(currentCorePhase)}
      isOurServe={isOurServe}
      canScore={scoringEnabled}
      connectorStyle={connectorStyle}
      playAnimationTrigger={playAnimationTrigger}
      isPreviewingMovement={isPreviewingMovement}
      switchMotion={tactileTuning.switchMotion}
      tactileTuning={tactileTuning}
      onRotationSelect={handleRotationSelect}
      onPhaseSelect={handlePhaseSelect}
      onPlay={handlePlay}
      onPoint={handlePoint}
    />
  )

  const connectorStyleControls =
    activeVariant === 'concept4' ? (
      <div className="mt-2 border-t border-border/40 px-1 pt-2">
        <div className="px-1 pb-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Connection Style</div>
        <div className="grid grid-cols-4 gap-1">
          {CONNECTOR_STYLE_OPTIONS.map((style) => (
            <Button
              key={style.id}
              type="button"
              variant={style.id === connectorStyle ? 'default' : 'outline'}
              size="sm"
              className="h-8 px-1 text-[10px]"
              onClick={() => setConnectorStyle(style.id)}
            >
              {style.label}
            </Button>
          ))}
        </div>
      </div>
    ) : null

  const tuneGuide =
    isTuneOpen && activeVariant === 'concept4' ? (
      <div className="lab-inset mt-3 rounded-lg p-3">
        <div className="pb-2 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Tune Guide</div>
        <div className="grid gap-2 text-[11px] leading-[1.45] text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Global Light</span>
            {' '}
            controls the shared top-left light and overall surface depth.
          </div>
          <div>
            <span className="font-medium text-foreground">Joystick</span>
            {' '}
            changes stick travel, dead zone, and settle feel.
          </div>
          <div>
            <span className="font-medium text-foreground">Cluster Layout</span>
            {' '}
            changes the height, spacing, and button sizes of the literal control bank.
          </div>
          <div>
            <span className="font-medium text-foreground">Loading Bar</span>
            {' '}
            controls how far the line rests, how fast it travels, how big the head is, and how hard the destination charges.
          </div>
        </div>
      </div>
    ) : null

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
        {connectorStyleControls}
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
              className="pointer-events-auto lab-panel lab-texture h-9 rounded-full px-4 text-[11px] uppercase tracking-[0.08em]"
              onClick={() => setIsLabTrayOpen(true)}
            >
              Lab
            </Button>
          </div>

          <Sheet open={isLabTrayOpen} onOpenChange={setIsLabTrayOpen}>
            <SheetContent
              side="top"
              className="lab-panel lab-texture rounded-b-3xl border-b border-border/60 px-0 pb-0 pt-0"
            >
              <SheetHeader className="pb-2 pr-12">
                <SheetTitle className="text-base">Prototype Lab</SheetTitle>
                <SheetDescription>{labStatusCopy}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-4">{labToolContent}</div>
            </SheetContent>
          </Sheet>
        </>
      ) : null}

      <main className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <section className="lab-panel min-h-0 flex-1 overflow-hidden rounded-xl p-1 sm:p-2">
          <div className="h-full w-full overflow-hidden rounded-lg border border-border bg-background/70">
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
                      updateLocalPosition(currentRotation, rallyPhase, role, position)
                    }
                  : undefined
              }
              arrows={currentArrows}
              onArrowChange={
                isEditingAllowed
                  ? (role, position) => {
                      if (!position) {
                        clearArrow(currentRotation, rallyPhase, role)
                        return
                      }

                      updateArrow(currentRotation, rallyPhase, role, position)
                    }
                  : undefined
              }
              arrowCurves={currentArrowCurves}
              onArrowCurveChange={
                isEditingAllowed
                  ? (role, curve) => {
                      setArrowCurve(currentRotation, rallyPhase, role, curve)
                    }
                  : undefined
              }
              showPosition={showPosition}
              showPlayer={showPlayer}
              showNumber={showNumber}
              circleTokens={circleTokens}
              legalityViolations={violations}
              showLibero={showLibero}
              currentPhase={rallyPhase}
              attackBallPosition={currentAttackBallPosition}
              onAttackBallChange={
                isEditingAllowed
                  ? (position) => {
                      if (!position) {
                        clearAttackBallPosition(currentRotation, rallyPhase)
                        return
                      }

                      setAttackBallPosition(currentRotation, rallyPhase, position)
                    }
                  : undefined
              }
              statusFlags={currentStatusFlags}
              onStatusToggle={
                isEditingAllowed
                  ? (role, status) => {
                      togglePlayerStatus(currentRotation, rallyPhase, role, status)
                    }
                  : undefined
              }
              fullStatusLabels={fullStatusLabels}
              animationTrigger={playAnimationTrigger}
              isPreviewingMovement={isPreviewingMovement}
              tagFlags={currentTagFlags}
              onTagsChange={
                isEditingAllowed
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

        <section className="lab-panel shrink-0 overflow-hidden rounded-2xl p-1.5" style={{ height: mobileDockHeight }}>
          <div className="h-full min-h-0 overflow-y-auto pr-1">{prototypeControlPanel}</div>
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
        <div className="relative mx-auto flex h-full w-full flex-col overflow-hidden p-2 sm:p-3">{phoneShell}</div>
      ) : (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden px-6 py-4">
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
                  <div className="relative flex h-full w-full flex-col overflow-hidden p-2">{phoneShell}</div>
                </div>
                <div className="pointer-events-none absolute bottom-[7px] left-1/2 h-[4px] w-[120px] -translate-x-1/2 rounded-full bg-white/10" />
              </div>
            </div>

            <aside className="w-[340px] max-w-[340px] shrink-0">
              <div className="lab-panel lab-texture rounded-[30px] p-4">
                <div className="pb-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Mobile Simulator</p>
                  <h1 className="text-lg font-semibold">Prototype Lab</h1>
                  <p className="text-xs text-muted-foreground">{labStatusCopy}</p>
                </div>
                {labToolContent}
              </div>
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
