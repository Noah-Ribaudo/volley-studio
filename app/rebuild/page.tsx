'use client'

import { useCallback, useMemo } from 'react'
import { VolleyballCourt } from '@/components/court'
import { Button } from '@/components/ui/button'
import { getPhaseInfo } from '@/lib/phaseIcons'
import { validateRotationLegality } from '@/lib/model/legality'
import { createRotationPhaseKey, getBackRowMiddle } from '@/lib/rotations'
import { getCurrentArrows, getCurrentPositions, getCurrentTags } from '@/lib/whiteboardHelpers'
import { ROLES, type Phase, type Position, type RallyPhase, type Role, type Rotation } from '@/lib/types'
import { useStoresHydrated } from '@/store/hydration'
import { useDisplayPrefsStore } from '@/store/useDisplayPrefsStore'
import { useNavigationStore } from '@/store/useNavigationStore'
import { useTeamStore } from '@/store/useTeamStore'
import { useWhiteboardStore } from '@/store/useWhiteboardStore'

const CORE_PHASES: RallyPhase[] = ['PRE_SERVE', 'SERVE_RECEIVE', 'ATTACK_PHASE', 'DEFENSE_PHASE']

function wrapRotation(rotation: Rotation, delta: -1 | 1): Rotation {
  if (delta === 1) return rotation === 6 ? 1 : ((rotation + 1) as Rotation)
  return rotation === 1 ? 6 : ((rotation - 1) as Rotation)
}

export default function RebuildPage() {
  const isUiHydrated = useStoresHydrated()

  const currentRotation = useNavigationStore((state) => state.currentRotation)
  const currentPhase = useNavigationStore((state) => state.currentPhase)
  const baseOrder = useNavigationStore((state) => state.baseOrder)
  const isPreviewingMovement = useNavigationStore((state) => state.isPreviewingMovement)
  const playAnimationTrigger = useNavigationStore((state) => state.playAnimationTrigger)
  const setRotation = useNavigationStore((state) => state.setRotation)
  const setPhase = useNavigationStore((state) => state.setPhase)
  const setPreviewingMovement = useNavigationStore((state) => state.setPreviewingMovement)
  const triggerPlayAnimation = useNavigationStore((state) => state.triggerPlayAnimation)

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

  const isReceivingContext = useDisplayPrefsStore((state) => state.isReceivingContext)
  const showLibero = useDisplayPrefsStore((state) => state.showLibero)
  const showPosition = useDisplayPrefsStore((state) => state.showPosition)
  const showPlayer = useDisplayPrefsStore((state) => state.showPlayer)
  const showNumber = useDisplayPrefsStore((state) => state.showNumber)
  const circleTokens = useDisplayPrefsStore((state) => state.circleTokens)
  const fullStatusLabels = useDisplayPrefsStore((state) => state.fullStatusLabels)
  const hideAwayTeam = useDisplayPrefsStore((state) => state.hideAwayTeam)
  const awayTeamHidePercent = useDisplayPrefsStore((state) => state.awayTeamHidePercent)

  const rotationPhaseKey = createRotationPhaseKey(currentRotation, currentPhase)
  const currentAttackBallPosition = attackBallPositions[rotationPhaseKey] || null

  const positions = useMemo(
    () =>
      getCurrentPositions(
        currentRotation,
        currentPhase,
        localPositions,
        customLayouts,
        currentTeam,
        isReceivingContext,
        baseOrder,
        showLibero,
        currentAttackBallPosition
      ),
    [
      baseOrder,
      currentAttackBallPosition,
      currentPhase,
      currentRotation,
      currentTeam,
      customLayouts,
      isReceivingContext,
      localPositions,
      showLibero,
    ]
  )

  const currentArrows = useMemo(
    () =>
      getCurrentArrows(
        currentRotation,
        currentPhase,
        localArrows,
        isReceivingContext,
        baseOrder,
        showLibero,
        currentAttackBallPosition,
        currentTeam
      ),
    [
      baseOrder,
      currentAttackBallPosition,
      currentPhase,
      currentRotation,
      currentTeam,
      isReceivingContext,
      localArrows,
      showLibero,
    ]
  )

  const currentArrowCurves = arrowCurves[rotationPhaseKey] || {}
  const currentStatusFlags = localStatusFlags[rotationPhaseKey] || {}
  const currentTagFlags = getCurrentTags(currentRotation, currentPhase, localTagFlags)

  const violations = useMemo(() => {
    if (currentPhase !== 'PRE_SERVE' && currentPhase !== 'SERVE_RECEIVE') {
      return []
    }

    const replacedMB = showLibero ? getBackRowMiddle(currentRotation, baseOrder) : null
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

    return validateRotationLegality(currentRotation, validPositions, undefined, baseOrder)
  }, [baseOrder, currentPhase, currentRotation, positions, showLibero])

  const handleRotationStep = useCallback(
    (delta: -1 | 1) => {
      setPreviewingMovement(false)
      setRotation(wrapRotation(currentRotation, delta))
    },
    [currentRotation, setPreviewingMovement, setRotation]
  )

  const handlePhaseSelect = useCallback(
    (phase: RallyPhase) => {
      setPreviewingMovement(false)
      setPhase(phase)
    },
    [setPhase, setPreviewingMovement]
  )

  const handlePlayToggle = useCallback(() => {
    if (isPreviewingMovement) {
      setPreviewingMovement(false)
      return
    }

    triggerPlayAnimation()
    setPreviewingMovement(true)
  }, [isPreviewingMovement, setPreviewingMovement, triggerPlayAnimation])

  const isEditingAllowed = !isPreviewingMovement

  if (!isUiHydrated) {
    return <div className="h-dvh bg-background" />
  }

  const activePhaseName = getPhaseInfo(currentPhase as Phase).name

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,oklch(27%_0.03_250)_0%,oklch(14%_0.01_260)_52%,oklch(10%_0.01_260)_100%)] text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1280px] flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
        <header className="flex shrink-0 flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.85)] backdrop-blur-md md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/60">Volley Studio Rebuild</p>
            <h1 className="font-[var(--font-barlow-condensed)] text-3xl leading-none text-white md:text-4xl">Court Core</h1>
            <p className="mt-1 text-sm text-white/70">Step 1: position players, draw paths, and preview movement.</p>
          </div>
          <div className="flex h-10 items-center rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white/80">
            Rotation {currentRotation} | {activePhaseName}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <section className="min-h-0 flex-1 rounded-2xl border border-white/10 bg-black/20 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:p-3">
            <div className="h-full w-full overflow-hidden rounded-xl border border-white/10 bg-background/60 p-1 md:p-2">
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
                        updateLocalPosition(currentRotation, currentPhase, role, position)
                      }
                    : undefined
                }
                arrows={currentArrows}
                onArrowChange={
                  isEditingAllowed
                    ? (role, position) => {
                        if (!position) {
                          clearArrow(currentRotation, currentPhase, role)
                          return
                        }

                        updateArrow(currentRotation, currentPhase, role, position)
                      }
                    : undefined
                }
                arrowCurves={currentArrowCurves}
                onArrowCurveChange={
                  isEditingAllowed
                    ? (role, curve) => {
                        setArrowCurve(currentRotation, currentPhase, role, curve)
                      }
                    : undefined
                }
                showPosition={showPosition}
                showPlayer={showPlayer}
                showNumber={showNumber}
                circleTokens={circleTokens}
                legalityViolations={violations}
                showLibero={showLibero}
                currentPhase={currentPhase}
                attackBallPosition={currentAttackBallPosition}
                onAttackBallChange={
                  isEditingAllowed
                    ? (position) => {
                        if (!position) {
                          clearAttackBallPosition(currentRotation, currentPhase)
                          return
                        }

                        setAttackBallPosition(currentRotation, currentPhase, position)
                      }
                    : undefined
                }
                statusFlags={currentStatusFlags}
                onStatusToggle={
                  isEditingAllowed
                    ? (role, status) => {
                        togglePlayerStatus(currentRotation, currentPhase, role, status)
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
                        setTokenTags(currentRotation, currentPhase, role, tags)
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

          <section className="shrink-0 rounded-2xl border border-white/10 bg-black/25 px-3 py-3 backdrop-blur-sm md:px-4">
            <div className="grid gap-3 md:grid-cols-[auto_1fr_auto] md:items-center">
              <div className="flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 px-0"
                  onClick={() => handleRotationStep(-1)}
                  aria-label="Previous rotation"
                >
                  -
                </Button>
                <div className="w-24 text-center text-sm font-medium text-white">Rotation {currentRotation}</div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 px-0"
                  onClick={() => handleRotationStep(1)}
                  aria-label="Next rotation"
                >
                  +
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {CORE_PHASES.map((phase) => {
                  const selected = currentPhase === phase
                  return (
                    <Button
                      key={phase}
                      type="button"
                      variant="outline"
                      size="sm"
                      data-active={selected}
                      className="h-10 border-white/20 bg-white/5 text-xs font-semibold uppercase tracking-[0.12em] text-white/75 hover:bg-white/10"
                      onClick={() => handlePhaseSelect(phase)}
                    >
                      {getPhaseInfo(phase).name}
                    </Button>
                  )
                })}
              </div>

              <div className="flex h-10 gap-2 md:justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-10 min-w-[6.5rem] border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
                  onClick={() => {
                    setPreviewingMovement(false)
                    resetToDefaults(currentRotation, currentPhase)
                  }}
                >
                  Reset Phase
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-10 min-w-[7rem]"
                  onClick={handlePlayToggle}
                  aria-label={isPreviewingMovement ? 'Reset movement preview' : 'Play movement preview'}
                >
                  {isPreviewingMovement ? 'Reset View' : 'Play'}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
