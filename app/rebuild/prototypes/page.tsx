'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { VolleyballCourt } from '@/components/court'
import { PrototypeControlPanel } from '@/components/rebuild/prototypes'
import { RebuildDialKitBridge } from '@/components/rebuild/prototypes/RebuildDialKitBridge'
import { usePrototypeLabController } from '@/components/rebuild/prototypes/usePrototypeLabController'
import { Button } from '@/components/ui/button'
import { validateRotationLegality } from '@/lib/model/legality'
import {
  canVariantScore,
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
import { useDisplayPrefsStore } from '@/store/useDisplayPrefsStore'
import { useStoreBootstrapReady } from '@/store/StoreProvider'
import { useTeamStore } from '@/store/useTeamStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useWhiteboardStore } from '@/store/useWhiteboardStore'

export default function RebuildPrototypeLabPage() {
  const isDev = process.env.NODE_ENV === 'development'
  const isBootstrapped = useStoreBootstrapReady()
  const whiteboardHydrated = useWhiteboardStore((state) => state.isHydrated)
  const teamHydrated = useTeamStore((state) => state.isHydrated)
  const displayPrefsHydrated = useDisplayPrefsStore((state) => state.isHydrated)
  const themeHydrated = useThemeStore((state) => state.isHydrated)
  const isUiHydrated =
    isBootstrapped &&
    whiteboardHydrated &&
    teamHydrated &&
    displayPrefsHydrated &&
    themeHydrated
  const didBootstrapSeedsRef = useRef(false)
  const [isTuneOpen, setIsTuneOpen] = useState(false)
  const [tactileTuning, setTactileTuning] = useState<TactileTuning>(DEFAULT_TACTILE_TUNING)
  const tactileCssVariables = useMemo(() => toTactileCssVariables(tactileTuning), [tactileTuning])

  const {
    activeVariant,
    setActiveVariant,
    currentRotation,
    currentCorePhase,
    isOurServe,
    isPreviewingMovement,
    playAnimationTrigger,
    handleRotationSelect,
    handlePhaseSelect,
    handlePlay,
    handlePoint,
    resetPreview,
    resetToBaseline,
  } = usePrototypeLabController()

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

  if (!isUiHydrated) {
    return (
      <div className="flex h-dvh w-full items-center justify-center overflow-hidden bg-background text-foreground">
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Loading prototype lab...
        </div>
      </div>
    )
  }

  return (
    <div
      className="lab-light-canvas h-dvh w-full overflow-hidden bg-background text-foreground"
      data-rebuild-lab="tactile"
      style={tactileCssVariables}
    >
      <div className="mx-auto flex h-full w-full max-w-[1280px] flex-col overflow-hidden p-2 sm:p-3">
        <header className="lab-panel lab-texture shrink-0 rounded-xl p-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Volley Studio Rebuild Lab</p>
              <h1 className="text-lg font-semibold">Experimental Control Prototypes</h1>
              <p className="text-xs text-muted-foreground">
                Rotation {currentRotation} • {formatCorePhaseLabel(currentCorePhase)} • {isOurServe ? 'We Serve' : 'We Receive'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={handleLoadDemoSeeds}>
                Load Demo Seeds
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={handleResetCurrentPhase}>
                Reset Current Phase
              </Button>
              {isDev ? (
                <div className="w-[5.25rem]">
                  <Button
                    type="button"
                    size="sm"
                    variant={isTuneOpen ? 'default' : 'outline'}
                    className="h-8 w-full"
                    onClick={() => setIsTuneOpen((prev) => !prev)}
                  >
                    {isTuneOpen ? 'Tune On' : 'Tune'}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="lab-inset mt-2 rounded-lg p-1">
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
                  onClick={() => setActiveVariant(variant.id)}
                >
                  {variant.shortLabel}
                </Button>
              ))}
            </div>
            <div className="px-2 pt-1 text-[11px] text-muted-foreground">
              {PROTOTYPE_VARIANTS.find((variant) => variant.id === activeVariant)?.label}
            </div>
          </div>
        </header>

        <main className="mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          <section className="lab-panel min-h-0 flex-1 overflow-hidden rounded-xl p-1 sm:p-2">
            <div className="h-full w-full overflow-hidden rounded-lg border border-border bg-background/70">
              <VolleyballCourt
                positions={positions}
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

          <section className="lab-panel h-[38dvh] min-h-[240px] max-h-[360px] shrink-0 overflow-hidden rounded-xl p-2">
            <div className="h-full min-h-0 overflow-y-auto pr-1">
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
                switchMotion={tactileTuning.switchMotion}
                onRotationSelect={handleRotationSelect}
                onPhaseSelect={handlePhaseSelect}
                onPlay={handlePlay}
                onPoint={handlePoint}
              />
            </div>
          </section>
        </main>

        {isDev && isTuneOpen ? <RebuildDialKitBridge onTuningChange={handleTuningChange} /> : null}
      </div>
    </div>
  )
}
