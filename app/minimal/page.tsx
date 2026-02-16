'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { VolleyballCourt } from '@/components/court'
import {
  MinimalAssignmentsCard,
  MinimalHeaderStrip,
  MinimalPhaseRotationCard,
  MinimalSettingsCard,
  MinimalTokenLabelsCard,
} from '@/components/minimal'
import {
  useAppStore,
  getCurrentArrows,
  getCurrentPositions,
  getCurrentTags,
  getActiveLineupPositionSource,
} from '@/store/useAppStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useWhiteboardSaveState, useWhiteboardSync } from '@/hooks/useWhiteboardSync'
import {
  ROLES,
  RALLY_PHASES,
  isRallyPhase,
  type Role,
  type Position,
  type PositionCoordinates,
  type RallyPhase,
} from '@/lib/types'
import { getActiveAssignments, getActiveLineup } from '@/lib/lineups'
import { getWhiteboardPositions } from '@/lib/whiteboard'
import { getVisibleOrderedRallyPhases } from '@/lib/rallyPhaseOrder'
import { getPhaseInfo } from '@/lib/phaseIcons'
import { createRotationPhaseKey, getBackRowMiddle, getRoleZone } from '@/lib/rotations'
import { validateRotationLegality } from '@/lib/model/legality'
import { cn } from '@/lib/utils'

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

function getServerRole(rotation: number, baseOrder: Role[]): Role {
  for (const role of baseOrder) {
    if (getRoleZone(rotation as 1 | 2 | 3 | 4 | 5 | 6, role, baseOrder) === 1) {
      return role
    }
  }
  return 'S'
}

export default function MinimalModePage() {
  useWhiteboardSync()

  const {
    currentRotation,
    currentPhase,
    localPositions,
    localArrows,
    arrowCurves,
    localStatusFlags,
    localTagFlags,
    attackBallPositions,
    customLayouts,
    currentTeam,
    baseOrder,
    isReceivingContext,
    showLibero,
    showPosition,
    showPlayer,
    showNumber,
    circleTokens,
    fullStatusLabels,
    hideAwayTeam,
    awayTeamHidePercent,
    contextPlayer,
    isPreviewingMovement,
    playAnimationTrigger,
    visiblePhases,
    phaseOrder,
    minimalContrast,
    minimalAllowAccent,
    minimalDenseLayout,
    setUiMode,
    setRotation,
    setPhase,
    nextPhase,
    prevPhase,
    updateLocalPosition,
    updateArrow,
    clearArrow,
    setArrowCurve,
    setContextPlayer,
    togglePlayerStatus,
    setTokenTags,
    assignPlayerToRole,
    setShowPosition,
    setShowPlayer,
    setShowNumber,
    setPreviewingMovement,
    triggerPlayAnimation,
    setMinimalContrast,
    setMinimalAllowAccent,
    setMinimalDenseLayout,
    setAttackBallPosition,
    clearAttackBallPosition,
    isHydrated: isAppHydrated,
  } = useAppStore()
  const isThemeHydrated = useThemeStore((state) => state.isHydrated)
  const isUiHydrated = isAppHydrated && isThemeHydrated

  useEffect(() => {
    setUiMode('minimal')
    return () => {
      setUiMode('normal')
    }
  }, [setUiMode])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).isContentEditable
      ) {
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        nextPhase()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        prevPhase()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextPhase, prevPhase])

  const rotationPhaseKey = createRotationPhaseKey(currentRotation, currentPhase)
  const teamId = currentTeam?._id || null
  const saveState = useWhiteboardSaveState(teamId, rotationPhaseKey)

  const currentAttackBallPosition = currentPhase === 'DEFENSE_PHASE'
    ? attackBallPositions[rotationPhaseKey] || null
    : null

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

  const positions = getCurrentPositions(
    currentRotation,
    currentPhase,
    localPositions,
    customLayouts,
    currentTeam,
    isReceivingContext,
    baseOrder,
    showLibero,
    currentAttackBallPosition
  )

  const awayPositionKey = `${currentRotation}-${currentPhase}-${isReceivingContext}`
  const [awayOverrides, setAwayOverrides] = useState<{ key: string; positions: PositionCoordinates | null }>({
    key: awayPositionKey,
    positions: null,
  })
  const localAwayPositions = awayOverrides.key === awayPositionKey ? awayOverrides.positions : null

  const awayPositions = useMemo(() => {
    const awayDefault = whiteboardResult?.away
    if (!awayDefault) {
      return undefined
    }
    if (!localAwayPositions) {
      return awayDefault
    }
    return { ...awayDefault, ...localAwayPositions }
  }, [whiteboardResult, localAwayPositions])

  const handleAwayPositionChange = useCallback((role: Role, position: Position) => {
    setAwayOverrides((previous) => ({
      key: awayPositionKey,
      positions: {
        ...(previous.key === awayPositionKey ? previous.positions || {} : {}),
        [role]: position,
      } as PositionCoordinates,
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
    currentTeam
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
        validPositions[role] = positions['L'] || positions[replacedMB] || { x: 0.5, y: 0.5 }
      } else {
        validPositions[role] = positions[role] || { x: 0.5, y: 0.5 }
      }
    }

    return validateRotationLegality(currentRotation, validPositions, undefined, baseOrder)
  }, [baseOrder, currentPhase, currentRotation, positions, showLibero])

  const orderedVisiblePhases = getVisibleOrderedRallyPhases(phaseOrder, visiblePhases)
  const phasesToShow: RallyPhase[] = isRallyPhase(currentPhase) && !orderedVisiblePhases.includes(currentPhase)
    ? [currentPhase, ...orderedVisiblePhases]
    : orderedVisiblePhases

  const activeLineup = currentTeam ? getActiveLineup(currentTeam) : null
  const assignments = currentTeam ? getActiveAssignments(currentTeam) : {}
  const activePositionSource = getActiveLineupPositionSource(currentTeam)
  const isEditingAllowed = activePositionSource === 'custom'

  const saveLabel: 'local' | 'synced' | 'pending' | 'saving' = !currentTeam
    ? 'local'
    : saveState === 'idle'
      ? 'synced'
      : saveState
  const phaseLabel = isRallyPhase(currentPhase)
    ? getPhaseInfo(currentPhase).name
    : currentPhase

  return (
    <div
      data-mode="minimal"
      data-minimal-contrast={minimalContrast}
      data-minimal-accent={minimalAllowAccent ? 'on' : 'off'}
      className="h-dvh overflow-hidden bg-background text-foreground"
    >
      <div
        className={cn(
          'mx-auto flex h-full max-w-[1400px] flex-col gap-3 p-3 md:p-4',
          minimalDenseLayout && 'gap-2 p-2.5 md:p-3'
        )}
      >
        <MinimalHeaderStrip
          teamName={currentTeam?.name || 'Practice'}
          lineupName={activeLineup?.name || 'No lineup'}
          rotationLabel={`R${currentRotation}`}
          phaseLabel={phaseLabel}
          saveState={saveLabel}
          allowAccent={minimalAllowAccent}
        />

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="min-h-0">
            <div className="h-[54dvh] min-h-[320px] rounded-md border border-border bg-card p-2 lg:h-full lg:min-h-0">
              <div
                className="h-full w-full"
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
                  rotation={currentRotation}
                  baseOrder={baseOrder}
                  roster={currentTeam?.roster || []}
                  assignments={assignments}
                  contextPlayer={contextPlayer}
                  onContextPlayerChange={setContextPlayer}
                  editable={isEditingAllowed}
                  animationMode={ANIMATION_MODE}
                  animationConfig={ANIMATION_CONFIG}
                  onPositionChange={(role, position) => {
                    updateLocalPosition(currentRotation, currentPhase, role, position)
                  }}
                  onAwayPositionChange={handleAwayPositionChange}
                  arrows={currentArrows}
                  onArrowChange={isEditingAllowed ? (role, position) => {
                    if (!position) {
                      clearArrow(currentRotation, currentPhase, role)
                      return
                    }
                    updateArrow(currentRotation, currentPhase, role, position)
                  } : undefined}
                  arrowCurves={currentArrowCurves}
                  onArrowCurveChange={isEditingAllowed ? (role, curve) => {
                    setArrowCurve(currentRotation, currentPhase, role, curve)
                  } : undefined}
                  showPosition={showPosition}
                  showPlayer={showPlayer}
                  showNumber={showNumber}
                  circleTokens={circleTokens}
                  tokenScaleDesktop={TOKEN_SCALES.desktop}
                  tokenScaleMobile={TOKEN_SCALES.mobile}
                  tokenWidthOffset={TOKEN_DIMENSIONS.widthOffset}
                  tokenHeightOffset={TOKEN_DIMENSIONS.heightOffset}
                  legalityViolations={violations}
                  showLibero={showLibero}
                  currentPhase={currentPhase}
                  attackBallPosition={currentAttackBallPosition}
                  onAttackBallChange={isEditingAllowed ? (position) => {
                    if (!position) {
                      clearAttackBallPosition(currentRotation, currentPhase)
                      return
                    }
                    setAttackBallPosition(currentRotation, currentPhase, position)
                  } : undefined}
                  ballPosition={currentPhase === 'PRE_SERVE' ? (() => {
                    const serverRole = getServerRole(currentRotation, baseOrder)
                    const serverPos = positions[serverRole]
                    if (!serverPos) return undefined
                    return {
                      x: serverPos.x + 0.04,
                      y: serverPos.y - 0.03,
                    }
                  })() : undefined}
                  ballHeight={currentPhase === 'PRE_SERVE' ? 0.15 : undefined}
                  statusFlags={currentStatusFlags}
                  onStatusToggle={isEditingAllowed ? (role, status) => {
                    togglePlayerStatus(currentRotation, currentPhase, role, status)
                  } : undefined}
                  fullStatusLabels={fullStatusLabels}
                  hasTeam={Boolean(currentTeam)}
                  animationTrigger={playAnimationTrigger}
                  isPreviewingMovement={isPreviewingMovement}
                  tagFlags={currentTagFlags}
                  onTagsChange={isEditingAllowed ? (role, tags) => {
                    setTokenTags(currentRotation, currentPhase, role, tags)
                  } : undefined}
                  onPlayerAssign={isEditingAllowed ? (role, playerId) => {
                    assignPlayerToRole(role, playerId)
                  } : undefined}
                />
              </div>
            </div>
          </section>

          <aside className="min-h-0 overflow-auto">
            <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-1', minimalDenseLayout && 'gap-2')}>
              <MinimalPhaseRotationCard
                currentRotation={currentRotation}
                currentPhase={currentPhase}
                visiblePhases={phasesToShow}
                onRotationChange={setRotation}
                onPhaseChange={setPhase}
                onNextPhase={nextPhase}
                onPrevPhase={prevPhase}
                isPreviewingMovement={isPreviewingMovement}
                onPlayToggle={() => {
                  if (isPreviewingMovement) {
                    setPreviewingMovement(false)
                    return
                  }
                  triggerPlayAnimation()
                  setPreviewingMovement(true)
                }}
              />
              <MinimalTokenLabelsCard
                showPosition={showPosition}
                showPlayer={showPlayer}
                showNumber={showNumber}
                onShowPositionChange={setShowPosition}
                onShowPlayerChange={setShowPlayer}
                onShowNumberChange={setShowNumber}
              />
              <MinimalAssignmentsCard
                lineupName={activeLineup?.name || 'Current lineup'}
                roster={currentTeam?.roster || []}
                assignments={assignments}
                onAssignPlayer={assignPlayerToRole}
              />
              <MinimalSettingsCard
                contrast={minimalContrast}
                allowAccent={minimalAllowAccent}
                denseLayout={minimalDenseLayout}
                onContrastChange={setMinimalContrast}
                onAllowAccentChange={setMinimalAllowAccent}
                onDenseLayoutChange={setMinimalDenseLayout}
                onExit={() => setUiMode('normal')}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
