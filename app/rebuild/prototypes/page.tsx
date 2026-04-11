'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { VolleyballCourt } from '@/components/court'
import { PrototypeControlPanel } from '@/components/rebuild/prototypes'
import { RebuildDialKitBridge } from '@/components/rebuild/prototypes/RebuildDialKitBridge'
import { SequenceFlowBoard } from '@/components/rebuild/prototypes/SequenceFlowBoard'
import { PROTOTYPE_SURFACE_THEMES } from '@/components/rebuild/prototypes/prototypeSurfaceThemes'
import { usePrototypeCourtState } from '@/components/rebuild/prototypes/usePrototypeCourtState'
import { usePrototypeLabController } from '@/components/rebuild/prototypes/usePrototypeLabController'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ChevronDown } from 'lucide-react'
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
import { ROLE_INFO, ROLES, type PositionAssignments, type Position, type Role, type RosterPlayer, type Rotation, type Team } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useDisplayPrefsStore } from '@/store/useDisplayPrefsStore'
import { useTeamStore } from '@/store/useTeamStore'
import { useWhiteboardStore } from '@/store/useWhiteboardStore'

type TopMenuTab = 'settings' | 'team'

const MAIN_TEAM_ROLES: Role[] = ['S', 'OH1', 'MB1', 'OPP', 'OH2', 'MB2']
const TEAM_FORM_ROLE_ORDER: Role[] = [...MAIN_TEAM_ROLES, 'L']

interface PrototypeTeamDraft {
  id: string
  name: string
  hasLibero: boolean
  rosterCount: number
  roleNames: Record<Role, string>
}

function createEmptyRoleNames(): Record<Role, string> {
  return {
    S: '',
    OH1: '',
    OH2: '',
    MB1: '',
    MB2: '',
    OPP: '',
    L: '',
  }
}

function getRoleNamesFromTeam(team: Team | null): Record<Role, string> {
  const next = createEmptyRoleNames()
  if (!team) return next

  const rosterById = new Map(team.roster.map((player) => [player.id, player]))

  for (const role of ROLES) {
    const playerId = team.position_assignments?.[role]
    if (!playerId) continue
    next[role] = rosterById.get(playerId)?.name?.trim() ?? ''
  }

  return next
}

export default function RebuildPrototypeLabPage() {
  const isDev = process.env.NODE_ENV === 'development'
  const isMobile = useIsMobile()
  const prefersReducedMotion = useReducedMotion()
  const didBootstrapSeedsRef = useRef(false)
  const teamFieldRefs = useRef<Array<HTMLInputElement | null>>([])
  const teamNameInputRef = useRef<HTMLInputElement | null>(null)
  const [isTuneOpen, setIsTuneOpen] = useState(false)
  const [activeTopMenuTab, setActiveTopMenuTab] = useState<TopMenuTab | null>(null)
  const [prototypeTeamDrafts, setPrototypeTeamDrafts] = useState<PrototypeTeamDraft[]>([])
  const [draftTeamName, setDraftTeamName] = useState('New Team')
  const [draftTeamHasLibero, setDraftTeamHasLibero] = useState(true)
  const [draftRoleNames, setDraftRoleNames] = useState<Record<Role, string>>(() => createEmptyRoleNames())
  const [selectedPrototypeTeamId, setSelectedPrototypeTeamId] = useState<string | null>(null)
  const [isKeyboardSimOpen, setIsKeyboardSimOpen] = useState(false)
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  const [isTeamDraftDirty, setIsTeamDraftDirty] = useState(false)
  const [draftSaveState, setDraftSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
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
    manualJoystickNudge,
    handleRotationSelect,
    handlePhaseSelect,
    handleManualPhasePress,
    handleManualPhaseCancel,
    handleManualPhaseSelect,
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
  const currentSecondaryArrowSources = useMemo(
    () => (currentCorePhase === 'RECEIVE' ? currentArrows : {}),
    [currentArrows, currentCorePhase]
  )

  const currentArrowCurves = useMemo(
    () => prototypeCourtState.getArrowCurves(currentRotation, currentCorePhase),
    [currentCorePhase, currentRotation, prototypeCourtState]
  )
  const currentSecondaryArrowCurves = useMemo(
    () => prototypeCourtState.getSecondaryArrowCurves(currentRotation, currentCorePhase),
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
  const surfaceTheme = PROTOTYPE_SURFACE_THEMES[activeVariant]
  const handleTuningChange = useCallback((next: TactileTuning) => {
    setTactileTuning(next)
  }, [])
  const mobileDockStyle = undefined
  const mobileCourtAspectRatio = '393 / 696'
  const topMenuTransition = prefersReducedMotion
    ? { duration: 0.001 }
    : {
        type: 'spring' as const,
        stiffness: tactileTuning.topMenu.panelSpring.stiffness,
        damping: tactileTuning.topMenu.panelSpring.damping,
        mass: tactileTuning.topMenu.panelSpring.mass,
      }
  const topTabTransition = prefersReducedMotion
    ? { duration: 0.001 }
    : {
        type: 'spring' as const,
        stiffness: tactileTuning.topMenu.tabSpring.stiffness,
        damping: tactileTuning.topMenu.tabSpring.damping,
        mass: tactileTuning.topMenu.tabSpring.mass,
      }
  const topMenuExpandedMinHeight = tactileTuning.topMenu.expandHeight
  const topMenuRowHeight = 54
  const topMenuPadding = tactileTuning.topMenu.panelPadding
  const topTabLift = tactileTuning.topMenu.tabLift * 0.35
  const keyboardSimHeight = 252
  const keyboardViewportOffset = isKeyboardSimOpen ? keyboardSimHeight : 0

  const labStatusCopy = `Rotation ${currentRotation} • ${formatPrototypePhaseLabel(currentCorePhase)} • ${
    isOurServe ? 'We Serve' : 'We Receive'
  }`
  const hasAnySavedTeamOptions = prototypeTeamDrafts.length > 0 || Boolean(currentTeam)
  const filledRoleCount = TEAM_FORM_ROLE_ORDER.reduce((count, role) => {
    if (role === 'L' && !draftTeamHasLibero) {
      return count
    }
    return draftRoleNames[role].trim() ? count + 1 : count
  }, 0)
  const hasMeaningfulDraftContent = filledRoleCount > 0 || draftTeamName.trim() !== '' && draftTeamName.trim() !== 'New Team'
  const hasPrototypeDrafts = prototypeTeamDrafts.length > 0
  const hasActivatedPrototypeTeam = hasPrototypeDrafts || hasMeaningfulDraftContent
  const prototypeActiveTeam = useMemo<{ roster: RosterPlayer[]; position_assignments: PositionAssignments } | null>(() => {
    if (!hasActivatedPrototypeTeam) return null
    const roster: RosterPlayer[] = []
    const assignments: PositionAssignments = {}
    for (const role of TEAM_FORM_ROLE_ORDER) {
      if (role === 'L' && !draftTeamHasLibero) continue
      const name = draftRoleNames[role].trim()
      if (!name) continue
      const id = `proto-${role}`
      roster.push({ id, name })
      assignments[role] = id
    }
    return { roster, position_assignments: assignments }
  }, [hasActivatedPrototypeTeam, draftRoleNames, draftTeamHasLibero])
  const courtRoster = prototypeActiveTeam?.roster ?? currentTeam?.roster ?? []
  const courtAssignments = prototypeActiveTeam?.position_assignments ?? currentTeam?.position_assignments ?? {}
  const prototypeTeamOptions = useMemo(() => {
    const savedTeam = currentTeam
      ? [
          {
            id: currentTeam.id,
            name: currentTeam.name,
            kind: 'saved' as const,
            rosterCount: currentTeam.roster.length,
            hasLibero: showLibero,
            roleNames: getRoleNamesFromTeam(currentTeam),
          },
        ]
      : []

    return [
      ...savedTeam,
      ...prototypeTeamDrafts.map((team) => ({
        ...team,
        kind: 'draft' as const,
      })),
    ]
  }, [currentTeam, prototypeTeamDrafts, showLibero])

  const selectedPrototypeTeam = useMemo(
    () => prototypeTeamOptions.find((team) => team.id === selectedPrototypeTeamId) ?? null,
    [prototypeTeamOptions, selectedPrototypeTeamId]
  )

  useEffect(() => {
    if (selectedPrototypeTeamId) return
    if (currentTeam?.id) {
      setSelectedPrototypeTeamId(currentTeam.id)
    }
  }, [currentTeam, selectedPrototypeTeamId])

  useEffect(() => {
    if (currentTeam?.name && draftTeamName === 'New Team') {
      setDraftTeamName(`${currentTeam.name} Next`)
    }
  }, [currentTeam, draftTeamName])

  useEffect(() => {
    if (!selectedPrototypeTeam) return
    setDraftTeamName(selectedPrototypeTeam.name)
    setDraftTeamHasLibero(selectedPrototypeTeam.hasLibero)
    setDraftRoleNames(selectedPrototypeTeam.roleNames)
    setActiveDraftId(selectedPrototypeTeam.kind === 'draft' ? selectedPrototypeTeam.id : null)
    setIsTeamDraftDirty(false)
    setDraftSaveState(selectedPrototypeTeam.kind === 'draft' ? 'saved' : 'idle')
  }, [selectedPrototypeTeam])

  const handleTopTabToggle = useCallback((tab: TopMenuTab) => {
    setActiveTopMenuTab((prev) => {
      const next = prev === tab ? null : tab
      if (next === 'team' && !hasAnySavedTeamOptions) {
        requestAnimationFrame(() => {
          teamNameInputRef.current?.focus({ preventScroll: true })
          teamNameInputRef.current?.select()
        })
      }
      return next
    })
  }, [hasAnySavedTeamOptions])

  const handleStartFreshTeam = useCallback(() => {
    setSelectedPrototypeTeamId(null)
    setDraftTeamName(currentTeam?.name ? `${currentTeam.name} Next` : 'New Team')
    setDraftTeamHasLibero(true)
    setDraftRoleNames(createEmptyRoleNames())
    setActiveDraftId(null)
    setIsTeamDraftDirty(false)
    setDraftSaveState('idle')
    requestAnimationFrame(() => {
      teamNameInputRef.current?.focus({ preventScroll: true })
      teamNameInputRef.current?.select()
    })
  }, [currentTeam])

  const handleDraftRoleNameChange = useCallback((role: Role, value: string) => {
    setIsTeamDraftDirty(true)
    setDraftSaveState('saving')
    setDraftRoleNames((prev) => ({
      ...prev,
      [role]: value,
    }))
  }, [])

  const handleTeamFieldKeyDown = useCallback((index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (index === TEAM_FORM_ROLE_ORDER.length - 1) return
    teamFieldRefs.current[index + 1]?.focus({ preventScroll: true })
    teamFieldRefs.current[index + 1]?.select()
  }, [])

  const handleCreateDraftTeam = useCallback(() => {
    const trimmedName = draftTeamName.trim()
    if (!trimmedName) return
    const rosterCount = TEAM_FORM_ROLE_ORDER.reduce((count, role) => {
      return draftRoleNames[role].trim() ? count + 1 : count
    }, 0)
    const nextId = activeDraftId ?? `draft-${crypto.randomUUID()}`

    const nextDraft: PrototypeTeamDraft = {
      id: nextId,
      name: trimmedName,
      hasLibero: draftTeamHasLibero,
      rosterCount,
      roleNames: draftRoleNames,
    }

    setPrototypeTeamDrafts((prev) => {
      const existingIndex = prev.findIndex((team) => team.id === nextDraft.id)
      if (existingIndex === -1) {
        return [nextDraft, ...prev]
      }

      const next = [...prev]
      next[existingIndex] = nextDraft
      return next
    })
    setSelectedPrototypeTeamId(nextDraft.id)
    setActiveDraftId(nextDraft.id)
    setIsTeamDraftDirty(false)
    setDraftSaveState('saved')
  }, [activeDraftId, draftRoleNames, draftTeamHasLibero, draftTeamName])

  useEffect(() => {
    if (!isTeamDraftDirty || !hasMeaningfulDraftContent) {
      return
    }

    setDraftSaveState('saving')

    const timeoutId = window.setTimeout(() => {
      const trimmedName = draftTeamName.trim() || 'New Team'
      const rosterCount = TEAM_FORM_ROLE_ORDER.reduce((count, role) => {
        if (role === 'L' && !draftTeamHasLibero) {
          return count
        }
        return draftRoleNames[role].trim() ? count + 1 : count
      }, 0)

      const nextDraft: PrototypeTeamDraft = {
        id: activeDraftId ?? `draft-${crypto.randomUUID()}`,
        name: trimmedName,
        hasLibero: draftTeamHasLibero,
        rosterCount,
        roleNames: draftRoleNames,
      }

      setPrototypeTeamDrafts((prev) => {
        const existingIndex = prev.findIndex((team) => team.id === nextDraft.id)
        if (existingIndex === -1) {
          return [nextDraft, ...prev]
        }

        const next = [...prev]
        next[existingIndex] = nextDraft
        return next
      })
      setActiveDraftId(nextDraft.id)
      setSelectedPrototypeTeamId(nextDraft.id)
      setIsTeamDraftDirty(false)
      setDraftSaveState('saved')
    }, 220)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    activeDraftId,
    draftRoleNames,
    draftTeamHasLibero,
    draftTeamName,
    hasMeaningfulDraftContent,
    isTeamDraftDirty,
  ])

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
      manualJoystickNudge={manualJoystickNudge}
      onRotationSelect={handleRotationSelect}
      onPhaseSelect={handlePhaseSelect}
      onManualPhasePress={handleManualPhasePress}
      onManualPhaseCancel={handleManualPhaseCancel}
      onManualPhaseSelect={handleManualPhaseSelect}
      onPlay={() => {
        if (!canPlayAdvance) return
        handlePlay(nextByPlay)
      }}
      onPoint={handlePoint}
    />
  )

  const tuneGuide = null
  const flowBoard = <SequenceFlowBoard className={isMobile ? 'mt-4' : 'h-full'} />
  const isTopMenuExpanded = activeTopMenuTab !== null
const topMenuSurfaceShadow = isTopMenuExpanded
    ? '0 22px 42px rgba(0,0,0,0.18)'
    : surfaceTheme.sidebarCardShadow

  const settingsTabContent = (
    <div className="space-y-3">
      <div className="rounded-[18px] border border-border/60 bg-card/65 p-2">
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'soft', label: 'Light', detail: 'Soft surface' },
            { id: 'rubber', label: 'Dark', detail: 'Rubber surface' },
          ].map((option) => {
            const isActive = activeVariant === option.id

            return (
              <motion.button
                key={option.id}
                type="button"
                whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                animate={{
                  y: isActive ? topTabLift : 0,
                  opacity: isActive ? 1 : 0.92,
                }}
                transition={topTabTransition}
                className={cn(
                  'rounded-[16px] border px-3 py-3 text-left',
                  isActive ? 'border-border/80' : 'border-border/55'
                )}
                style={{
                  background: isActive
                    ? surfaceTheme.mode === 'dark'
                      ? 'linear-gradient(180deg, oklch(0.28 0.02 250 / 0.92) 0%, oklch(0.19 0.02 250 / 0.96) 100%)'
                      : 'linear-gradient(180deg, oklch(0.98 0.01 95 / 0.98) 0%, oklch(0.93 0.012 95 / 0.98) 100%)'
                    : surfaceTheme.mode === 'dark'
                      ? 'linear-gradient(180deg, oklch(0.22 0.015 250 / 0.9) 0%, oklch(0.17 0.015 250 / 0.94) 100%)'
                      : 'linear-gradient(180deg, oklch(0.99 0.005 95 / 0.9) 0%, oklch(0.95 0.008 95 / 0.96) 100%)',
                  boxShadow: isActive
                    ? 'inset 0 1px 0 rgba(255,255,255,0.3), 0 8px 20px rgba(0,0,0,0.12)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.18)',
                }}
                onClick={() => setActiveVariant(option.id as typeof activeVariant)}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.1em]">{option.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{option.detail}</div>
              </motion.button>
            )
          })}
        </div>
      </div>
      <div className="rounded-[18px] border border-border/60 bg-card/60 p-2">
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'off', label: 'Keyboard Off', active: !isKeyboardSimOpen },
            { id: 'on', label: 'Keyboard On', active: isKeyboardSimOpen },
          ].map((option) => (
            <motion.button
              key={option.id}
              type="button"
              whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
              animate={{
                y: option.active ? topTabLift : 0,
                opacity: option.active ? 1 : 0.92,
              }}
              transition={topTabTransition}
              className={cn(
                'rounded-[16px] border px-3 py-3 text-left',
                option.active ? 'border-border/80' : 'border-border/55'
              )}
              style={{
                background: option.active
                  ? surfaceTheme.mode === 'dark'
                    ? 'linear-gradient(180deg, oklch(0.28 0.02 250 / 0.92) 0%, oklch(0.19 0.02 250 / 0.96) 100%)'
                    : 'linear-gradient(180deg, oklch(0.98 0.01 95 / 0.98) 0%, oklch(0.93 0.012 95 / 0.98) 100%)'
                  : surfaceTheme.mode === 'dark'
                    ? 'linear-gradient(180deg, oklch(0.22 0.015 250 / 0.9) 0%, oklch(0.17 0.015 250 / 0.94) 100%)'
                    : 'linear-gradient(180deg, oklch(0.99 0.005 95 / 0.9) 0%, oklch(0.95 0.008 95 / 0.96) 100%)',
                boxShadow: option.active
                  ? 'inset 0 1px 0 rgba(255,255,255,0.3), 0 8px 20px rgba(0,0,0,0.12)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.18)',
              }}
              onClick={() => setIsKeyboardSimOpen(option.id === 'on')}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em]">{option.label}</div>
            </motion.button>
          ))}
        </div>
      </div>
      <div className="rounded-[18px] border border-border/60 bg-card/55 px-3 py-3 text-sm text-muted-foreground">
        This only changes the phone prototype surface, so you can compare the mobile feel without changing the rest of the browser.
      </div>
    </div>
  )

  const teamSetupTabContent = (
    <div className="space-y-3">
      {hasPrototypeDrafts ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-11 w-full justify-between rounded-[14px] border-border/60 bg-background/80 px-3 text-sm font-semibold"
            >
              <span className="flex items-center gap-2 truncate">
                <span className="truncate">
                  {selectedPrototypeTeam?.name ?? 'Select team'}
                </span>
                {hasActivatedPrototypeTeam ? (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white"
                    style={{ backgroundColor: '#22c55e' }}
                  >
                    Active
                  </span>
                ) : null}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[var(--radix-dropdown-menu-trigger-width)]">
            {prototypeTeamDrafts.map((team) => (
              <DropdownMenuItem
                key={team.id}
                className={cn(team.id === selectedPrototypeTeamId && 'bg-accent')}
                onClick={() => setSelectedPrototypeTeamId(team.id)}
              >
                {team.name || 'Untitled team'}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleStartFreshTeam}>
              + New Team
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <input
        ref={teamNameInputRef}
        value={draftTeamName}
        onChange={(event) => {
          setIsTeamDraftDirty(true)
          setDraftSaveState('saving')
          setDraftTeamName(event.target.value)
        }}
        placeholder="Team name"
        className="h-11 w-full rounded-[14px] border border-border/60 bg-background/80 px-3 text-sm font-semibold outline-none transition focus:border-border"
      />

      <div className="space-y-1.5">
        {MAIN_TEAM_ROLES.map((role, index) => (
          <div key={role} className="flex items-center gap-2">
            <div className="w-10 shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {role}
            </div>
            <input
              ref={(node) => {
                teamFieldRefs.current[index] = node
              }}
              value={draftRoleNames[role]}
              onChange={(event) => handleDraftRoleNameChange(role, event.target.value)}
              onKeyDown={(event) => handleTeamFieldKeyDown(index, event)}
              placeholder={ROLE_INFO[role].name}
              autoComplete="off"
              className="h-10 w-full rounded-[12px] border border-border/60 bg-background/80 px-3 text-sm outline-none transition focus:border-border"
            />
          </div>
        ))}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsTeamDraftDirty(true)
              setDraftSaveState('saving')
              setDraftTeamHasLibero((prev) => !prev)
            }}
            className="w-10 shrink-0 text-left text-[11px] font-semibold uppercase tracking-[0.08em] transition-opacity"
            style={{ opacity: draftTeamHasLibero ? 1 : 0.35 }}
            aria-pressed={draftTeamHasLibero}
            title={draftTeamHasLibero ? 'Libero enabled — click to disable' : 'Libero disabled — click to enable'}
          >
            L
          </button>
          <input
            ref={(node) => {
              teamFieldRefs.current[TEAM_FORM_ROLE_ORDER.length - 1] = node
            }}
            value={draftRoleNames.L}
            onChange={(event) => handleDraftRoleNameChange('L', event.target.value)}
            onKeyDown={(event) => handleTeamFieldKeyDown(TEAM_FORM_ROLE_ORDER.length - 1, event)}
            placeholder="Libero"
            autoComplete="off"
            disabled={!draftTeamHasLibero}
            className="h-10 w-full rounded-[12px] border border-border/60 bg-background/80 px-3 text-sm outline-none transition focus:border-border disabled:cursor-not-allowed disabled:opacity-45"
          />
        </div>
      </div>

      <div className="h-16" />

      <div className="sticky bottom-0 z-10 -mx-1 mt-2 bg-[linear-gradient(180deg,transparent_0%,rgba(10,14,20,0.08)_18%,rgba(10,14,20,0.14)_100%)] px-1 pb-1 pt-4">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-2">
          <div aria-hidden="true" />
          <Button
            type="button"
            className="h-11 rounded-[16px] text-[11px] uppercase tracking-[0.1em]"
            onClick={handleCreateDraftTeam}
          >
            {draftSaveState === 'saving' ? 'Saving Draft' : draftSaveState === 'saved' ? 'Draft Saved' : 'Save Draft'}
          </Button>
        </div>
      </div>
    </div>
  )

  const miniControlMenu = (
    <div className="pointer-events-none absolute inset-x-0 inset-y-0 z-20 px-3 pb-3 pt-3">
      <motion.div
        className="pointer-events-auto w-full rounded-[22px] border p-1.5 shadow-[0_16px_34px_rgba(0,0,0,0.12)] backdrop-blur-xl"
        animate={{
          height: isTopMenuExpanded ? 'calc(100% - 12px)' : topMenuRowHeight + topMenuPadding,
          y: 0,
        }}
        transition={topMenuTransition}
        style={{
          background: surfaceTheme.sidebarCardBackground,
          border: `1px solid ${surfaceTheme.sidebarCardBorder}`,
          boxShadow: topMenuSurfaceShadow,
          minHeight: isTopMenuExpanded ? topMenuExpandedMinHeight : undefined,
        }}
      >
        <div
          className="flex h-full flex-col"
          style={{ gap: tactileTuning.topMenu.tabGap, padding: `${topMenuPadding / 2}px`, overflow: 'clip' }}
        >
          <div className="grid grid-cols-2 gap-0">
            {[
              { id: 'settings' as const, label: 'Settings' },
              { id: 'team' as const, label: 'Team Setup' },
            ].map((tab) => {
              const isActive = activeTopMenuTab === tab.id

              return (
                <motion.button
                  key={tab.id}
                  type="button"
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                  animate={{
                    y: isActive ? topTabLift : 0,
                    opacity: isActive || !isTopMenuExpanded ? 1 : 0.96,
                  }}
                  transition={topTabTransition}
                  className={cn(
                    'h-11 border px-3 text-[11px] font-semibold uppercase tracking-[0.08em]',
                    tab.id === 'settings' ? 'rounded-l-[14px] rounded-r-[4px]' : 'rounded-l-[4px] rounded-r-[14px]'
                  )}
                  style={{
                    background: isActive
                      ? surfaceTheme.mode === 'dark'
                        ? 'linear-gradient(180deg, oklch(0.3 0.02 250 / 0.96) 0%, oklch(0.2 0.02 250 / 0.98) 100%)'
                        : 'linear-gradient(180deg, oklch(0.995 0.004 95 / 0.98) 0%, oklch(0.94 0.012 95 / 0.98) 100%)'
                      : surfaceTheme.mode === 'dark'
                        ? 'linear-gradient(180deg, oklch(0.17 0.01 250 / 0.96) 0%, oklch(0.14 0.01 250 / 0.98) 100%)'
                        : 'linear-gradient(180deg, oklch(0.92 0.004 95 / 0.74) 0%, oklch(0.89 0.004 95 / 0.82) 100%)',
                    borderColor: isActive
                      ? surfaceTheme.mode === 'dark'
                        ? 'oklch(0.62 0.04 80 / 0.34)'
                        : 'oklch(0.72 0.04 90 / 0.42)'
                      : 'transparent',
                    boxShadow: isActive
                      ? surfaceTheme.mode === 'dark'
                        ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 24px rgba(0,0,0,0.18)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.72), 0 12px 24px rgba(0,0,0,0.12)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.08)',
                    color: isActive
                      ? undefined
                      : surfaceTheme.mode === 'dark'
                        ? 'oklch(0.82 0.01 95 / 0.74)'
                        : 'oklch(0.34 0.01 260 / 0.74)',
                  }}
                  onClick={() => handleTopTabToggle(tab.id)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {tab.label}
                    {tab.id === 'team' && hasActivatedPrototypeTeam ? (
                      <span
                        aria-hidden="true"
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: '#22c55e' }}
                      />
                    ) : null}
                  </span>
                </motion.button>
              )
            })}
          </div>

          <AnimatePresence initial={false}>
            {activeTopMenuTab ? (
              <motion.div
                key="top-menu-panel"
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -6 }}
                transition={topMenuTransition}
                className="min-h-0 flex-1"
                style={{ overflow: 'clip' }}
              >
                <motion.div
                  initial={false}
                  animate={{
                    x: activeTopMenuTab === 'team' ? '-50%' : '0%',
                  }}
                  transition={topMenuTransition}
                  className="grid h-full"
                  style={{
                    width: '200%',
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                    willChange: 'transform',
                  }}
                >
                  <div
                    className="min-h-0 min-w-0 overflow-y-auto scrollbar-hide"
                    style={{ padding: topMenuPadding }}
                  >
                    {settingsTabContent}
                  </div>
                  <div
                    className="min-h-0 min-w-0 overflow-y-auto scrollbar-hide"
                    style={{ padding: topMenuPadding }}
                  >
                    {teamSetupTabContent}
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )

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
      {miniControlMenu}
      {isMobile ? (
        <>
          <div className="pointer-events-none absolute inset-x-2 top-[4.75rem] z-20 flex justify-end">
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

      <main
        className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden"
        style={{
          paddingBottom: keyboardViewportOffset,
        }}
      >
        <section className="flex min-h-0 flex-1 items-end overflow-visible">
          <div className="relative w-full shrink-0 overflow-visible" style={{ aspectRatio: mobileCourtAspectRatio }}>
            <motion.div
              animate={{
                opacity: isTopMenuExpanded ? 0.68 : 1,
                scale: isTopMenuExpanded ? 0.985 : 1,
                y: isTopMenuExpanded ? 14 : isKeyboardSimOpen ? -22 : 0,
              }}
              transition={topMenuTransition}
              className="h-full w-full"
            >
            <VolleyballCourt
              positions={positions}
              animationConfig={{ durationMs: playDurationMs }}
              hideAwayTeam={hideAwayTeam}
              awayTeamHidePercent={awayTeamHidePercent}
              rotation={currentRotation}
              roster={courtRoster}
              assignments={courtAssignments}
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
              secondaryArrowSources={currentSecondaryArrowSources}
              secondaryArrowEndpointLabels={currentSecondaryArrowLabels}
              secondaryArrowCurves={currentSecondaryArrowCurves}
              arrowTagFontSize={tactileTuning.arrowTags.fontSize}
              onCreateSecondaryArrow={
                isEditingAllowed && currentCorePhase === 'RECEIVE'
                  ? (role) => {
                      prototypeCourtState.createSecondaryArrowTarget(currentRotation, currentCorePhase, role)
                    }
                  : undefined
              }
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
                  ? (role, curve, options) => {
                      if (options?.variant === 'secondary') {
                        prototypeCourtState.setSecondaryArrowCurve(currentRotation, currentCorePhase, role, curve)
                        return
                      }

                      prototypeCourtState.setArrowCurve(currentRotation, currentCorePhase, role, curve)
                    }
                  : undefined
              }
              showPosition={showPosition}
              showPlayer={hasActivatedPrototypeTeam ? true : showPlayer}
              showNumber={hasActivatedPrototypeTeam ? false : showNumber}
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
            courtPalette={surfaceTheme.court}
            courtPaddingBackground={surfaceTheme.court.paddingBackground}
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
            </motion.div>
          </div>
        </section>

        <section className="w-full shrink-0 overflow-visible" style={mobileDockStyle}>
          <motion.div
            animate={{
              opacity: isTopMenuExpanded ? 0.34 : 1,
              y: isTopMenuExpanded ? 16 : isKeyboardSimOpen ? -18 : 0,
            }}
            transition={topMenuTransition}
            className="flex min-h-0 items-end overflow-visible"
          >
            {prototypeControlPanel}
          </motion.div>
        </section>
      </main>

      <AnimatePresence initial={false}>
        {isKeyboardSimOpen ? (
          <motion.div
            initial={{ y: keyboardSimHeight, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: keyboardSimHeight, opacity: 0 }}
            transition={topMenuTransition}
            className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-2 pb-2"
          >
            <div
              className="rounded-[26px] border px-3 pb-3 pt-2 shadow-[0_-18px_40px_rgba(0,0,0,0.26)]"
              style={{
                height: keyboardSimHeight,
                background: surfaceTheme.mode === 'dark'
                  ? 'linear-gradient(180deg, oklch(0.2 0.01 255 / 0.98) 0%, oklch(0.14 0.01 255 / 0.99) 100%)'
                  : 'linear-gradient(180deg, oklch(0.94 0.008 95 / 0.98) 0%, oklch(0.9 0.01 95 / 0.99) 100%)',
                borderColor: surfaceTheme.sidebarCardBorder,
              }}
            >
              <div className="flex items-center justify-between gap-3 px-1 pb-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Keyboard</div>
                <div className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Viewport Shrink</div>
              </div>
              <div className="grid grid-cols-10 gap-1.5">
                {Array.from({ length: 30 }, (_, index) => (
                  <div
                    key={index}
                    className="rounded-[10px] border"
                    style={{
                      height: 26,
                      background: surfaceTheme.mode === 'dark'
                        ? 'oklch(0.28 0.01 255 / 0.94)'
                        : 'oklch(0.985 0.004 95 / 0.94)',
                      borderColor: surfaceTheme.sidebarCardBorder,
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 grid grid-cols-[1.2fr_5fr_1.6fr] gap-1.5">
                <div className="h-9 rounded-[12px] border" style={{ borderColor: surfaceTheme.sidebarCardBorder }} />
                <div className="h-9 rounded-[12px] border" style={{ borderColor: surfaceTheme.sidebarCardBorder }} />
                <div className="h-9 rounded-[12px] border" style={{ borderColor: surfaceTheme.sidebarCardBorder }} />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )

  return (
    <div
      className="lab-light-canvas h-dvh w-full overflow-hidden text-foreground"
      data-rebuild-lab="tactile"
      style={{
        ...tactileCssVariables,
        background: surfaceTheme.canvasBackground,
        color: surfaceTheme.mode === 'dark' ? 'oklch(0.95 0.01 95)' : 'oklch(0.24 0.01 260)',
      }}
    >
      {isMobile ? (
        <div className="relative mx-auto flex h-full w-full flex-col overflow-hidden">{phoneShell}</div>
      ) : (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden px-6 pb-4">
          <div className="flex h-full w-full max-w-[960px] items-center justify-center gap-8">
            <div className="relative flex shrink-0 items-center justify-center">
              <div
                className="relative rounded-[44px] p-[10px]"
                style={{
                  height: 'min(852px, calc(100dvh - 32px))',
                  aspectRatio: '393 / 852',
                  background: surfaceTheme.desktopShellBackground,
                  border: `1px solid ${surfaceTheme.desktopShellBorder}`,
                  boxShadow: surfaceTheme.desktopShellShadow,
                }}
              >
                <div
                  className="pointer-events-none absolute left-1/2 top-[10px] h-[28px] w-[128px] -translate-x-1/2 rounded-full"
                  style={{
                    background: surfaceTheme.mode === 'dark' ? 'oklch(0.08 0.008 260 / 0.78)' : 'oklch(0.76 0.01 95 / 0.82)',
                    boxShadow: surfaceTheme.mode === 'dark'
                      ? 'inset 0 1px 0 oklch(1 0 0 / 0.08)'
                      : 'inset 0 1px 0 oklch(1 0 0 / 0.7)',
                  }}
                />
                <div
                  className="relative h-full w-full overflow-hidden rounded-[34px]"
                  style={{
                    background: surfaceTheme.phoneScreenBackground,
                    border: `1px solid ${surfaceTheme.desktopShellBorder}`,
                  }}
                >
                  <div className="relative flex h-full w-full flex-col overflow-hidden">{phoneShell}</div>
                </div>
                <div
                  className="pointer-events-none absolute bottom-[7px] left-1/2 h-[4px] w-[120px] -translate-x-1/2 rounded-full"
                  style={{
                    background: surfaceTheme.mode === 'dark' ? 'oklch(1 0 0 / 0.1)' : 'oklch(0.46 0.008 250 / 0.16)',
                  }}
                />
              </div>
            </div>

            <aside className="flex h-full w-[420px] max-w-[420px] shrink-0 flex-col gap-4 py-4">
              <div
                className="rounded-[30px] p-4"
                style={{
                  background: surfaceTheme.sidebarCardBackground,
                  border: `1px solid ${surfaceTheme.sidebarCardBorder}`,
                  boxShadow: surfaceTheme.sidebarCardShadow,
                }}
              >
                <div className="pb-3">
                  <p
                    className="text-[11px] uppercase tracking-[0.12em]"
                    style={{
                      color: surfaceTheme.mode === 'dark'
                        ? 'oklch(0.76 0.012 95 / 0.72)'
                        : 'oklch(0.42 0.012 250 / 0.62)',
                    }}
                  >
                    Mobile Simulator
                  </p>
                  <h1 className="text-lg font-semibold">Prototype Lab</h1>
                  <p
                    className="text-xs"
                    style={{
                      color: surfaceTheme.mode === 'dark'
                        ? 'oklch(0.8 0.01 95 / 0.72)'
                        : 'oklch(0.38 0.01 250 / 0.72)',
                    }}
                  >
                    {labStatusCopy}
                  </p>
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
