'use client'

import { useCallback, useRef, useLayoutEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Phase, PHASES, RALLY_PHASES, Rotation, ROTATIONS, PositionCoordinates } from '@/lib/types'
import type { RallyPhase, PlaybackMode } from '@/lib/sim/types'
import type { ContactRecord } from '@/lib/sim/fsm'
import { cn } from '@/lib/utils'
import { getPhaseInfo, getCompactPhaseIcon, isRallyPhase as checkIsRallyPhase } from '@/lib/phaseIcons'
import { generateRallyEndDescription } from '@/lib/sim/rallyEndReasons'
import { ArrowDown01Icon, ArrowUp01Icon, ArrowLeft01Icon, ArrowRight01Icon, PlayIcon, PauseIcon, UserGroupIcon, BookOpen01Icon, Timer01Icon } from "@hugeicons/core-free-icons"
import Link from 'next/link'
import { HugeiconsIcon } from "@hugeicons/react"

// Speed mapping: display speeds vs actual engine speeds (half of display)
const DISPLAY_SPEEDS = [0.25, 0.5, 1, 1.5, 2]
const ACTUAL_SPEEDS = DISPLAY_SPEEDS.map(s => s * 0.5)

export interface RallyEndInfo {
  reason: string
  winner: "HOME" | "AWAY"
  lastContact: ContactRecord | null
  possessionChain: ContactRecord[]
  homeScore: number
  awayScore: number
  frozenPositions: PositionCoordinates
  frozenAwayPositions: PositionCoordinates
}

interface PlaybackBarProps {
  // Playback mode
  playbackMode: PlaybackMode
  onPlaybackModeChange: (mode: PlaybackMode) => void

  // Edit mode props
  currentRotation: Rotation
  currentPhase: Phase
  onNext: () => void
  onPrev: () => void
  onPhaseChange: (phase: Phase) => void
  onRotationChange: (rotation: Rotation) => void
  visiblePhases?: Set<RallyPhase>

  // Live mode props
  homeScore: number
  awayScore: number
  simPhase: RallyPhase
  currentSpeed: number
  onSpeedChange: (speed: number) => void
  onServe: () => void

  // Rally end props
  rallyEndInfo: RallyEndInfo | null
  onNextRally: () => void
  onBackToEdit: () => void

  // Roster control (Edit mode only)
  onRosterOpen?: () => void

  // Learning mode (Edit mode only)
  onLearnOpen?: () => void
}

export function PlaybackBar({
  playbackMode,
  onPlaybackModeChange,
  currentRotation,
  currentPhase,
  onNext,
  onPrev,
  onPhaseChange,
  onRotationChange,
  visiblePhases,
  homeScore,
  awayScore,
  simPhase,
  currentSpeed,
  onSpeedChange,
  onServe,
  rallyEndInfo,
  onNextRally,
  onBackToEdit,
  onRosterOpen,
  onLearnOpen,
}: PlaybackBarProps) {
  // ===== ALL HOOKS MUST BE BEFORE ANY EARLY RETURNS =====

  // Determine which content to show
  const isLive = playbackMode === 'live'
  const showRallyEnd = isLive && rallyEndInfo !== null

  // Speed control helpers
  const currentSpeedIndex = ACTUAL_SPEEDS.indexOf(currentSpeed)
  const displaySpeed = currentSpeedIndex >= 0 ? DISPLAY_SPEEDS[currentSpeedIndex] : 1

  const handleIncreaseSpeed = useCallback(() => {
    const nextIndex = Math.min(currentSpeedIndex + 1, ACTUAL_SPEEDS.length - 1)
    onSpeedChange(ACTUAL_SPEEDS[nextIndex])
  }, [currentSpeedIndex, onSpeedChange])

  const handleDecreaseSpeed = useCallback(() => {
    const nextIndex = Math.max(currentSpeedIndex - 1, 0)
    onSpeedChange(ACTUAL_SPEEDS[nextIndex])
  }, [currentSpeedIndex, onSpeedChange])

  // Edit mode calculations (needed for hooks even if we're in live mode)
  const isRallyPhase = checkIsRallyPhase(currentPhase)
  const phasesToShow = isRallyPhase
    ? (visiblePhases ? RALLY_PHASES.filter(p => visiblePhases.has(p)) : RALLY_PHASES)
    : PHASES
  const currentIndex = phasesToShow.findIndex(p => p === currentPhase)

  // Refs for measuring and animating
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  // Animation state
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'dimming' | 'sliding' | 'highlighting'>('idle')
  const [displayIndex, setDisplayIndex] = useState(currentIndex)
  const [slideOffset, setSlideOffset] = useState(0)
  const prevIndexRef = useRef(currentIndex)
  const hasMeasured = useRef(false)

  // Animation timing constants (in ms)
  const DIM_DURATION = 100
  const SLIDE_DURATION = 300
  const HIGHLIGHT_DURATION = 80

  // Get phase at offset from a given center index (looping)
  const getPhaseAtOffset = useCallback((offset: number, centerIdx: number) => {
    const len = phasesToShow.length
    const idx = ((centerIdx + offset) % len + len) % len
    return phasesToShow[idx]
  }, [phasesToShow])

  // Calculate base offset to center the display (with slideOffset = 0)
  const calculateBaseOffset = useCallback(() => {
    const container = containerRef.current
    const inner = innerRef.current
    if (!container || !inner) return 0

    const centerItem = inner.querySelector('[data-offset="0"]') as HTMLElement
    if (!centerItem) return 0

    const containerWidth = container.offsetWidth
    let itemStartX = 0
    const children = Array.from(inner.children) as HTMLElement[]
    for (const child of children) {
      if (child === centerItem) break
      itemStartX += child.offsetWidth + 12
    }
    const itemCenterX = itemStartX + centerItem.offsetWidth / 2
    return containerWidth / 2 - itemCenterX
  }, [])

  // Measure item widths for sliding calculation
  const measureSlideDistance = useCallback((direction: number) => {
    const inner = innerRef.current
    if (!inner) return 0

    const targetOffset = direction > 0 ? 1 : -1
    const targetItem = inner.querySelector(`[data-offset="${targetOffset}"]`) as HTMLElement
    const centerItem = inner.querySelector('[data-offset="0"]') as HTMLElement

    if (!targetItem || !centerItem) return 0

    const gap = 12
    if (direction > 0) {
      return -(centerItem.offsetWidth / 2 + gap + targetItem.offsetWidth / 2)
    } else {
      return centerItem.offsetWidth / 2 + gap + targetItem.offsetWidth / 2
    }
  }, [])

  // Handle phase changes with animation
  useLayoutEffect(() => {
    // Skip if in live mode
    if (isLive) return

    const newIndex = currentIndex

    if (!hasMeasured.current) {
      hasMeasured.current = true
      // displayIndex is already initialized with currentIndex via useState
      prevIndexRef.current = newIndex
      return
    }

    if (prevIndexRef.current === newIndex) return

    const len = phasesToShow.length
    const rawDiff = newIndex - prevIndexRef.current
    let direction: number
    if (Math.abs(rawDiff) <= len / 2) {
      direction = rawDiff > 0 ? 1 : -1
    } else {
      direction = rawDiff > 0 ? -1 : 1
    }

    setAnimationPhase('dimming')

    setTimeout(() => {
      const slideDistance = measureSlideDistance(direction)
      setAnimationPhase('sliding')
      setSlideOffset(slideDistance)
    }, DIM_DURATION)

    setTimeout(() => {
      setSlideOffset(0)
      setDisplayIndex(newIndex)
      setAnimationPhase('highlighting')
    }, DIM_DURATION + SLIDE_DURATION)

    setTimeout(() => {
      setAnimationPhase('idle')
    }, DIM_DURATION + SLIDE_DURATION + HIGHLIGHT_DURATION)

    prevIndexRef.current = newIndex
  }, [currentIndex, phasesToShow.length, measureSlideDistance, isLive])

  // Calculate total transform: base centering + slide animation
  const [baseOffset, setBaseOffset] = useState(0)
  useLayoutEffect(() => {
    // Skip if in live mode
    if (isLive) return

    const timer = requestAnimationFrame(() => {
      setBaseOffset(calculateBaseOffset())
    })
    return () => cancelAnimationFrame(timer)
  }, [displayIndex, phasesToShow, calculateBaseOffset, isLive])

  // ===== END OF HOOKS - NOW WE CAN HAVE EARLY RETURNS =====

  // Floating panel styles
  const panelClasses = "absolute top-2 left-2 right-2 z-20 flex items-center gap-2 p-2 rounded-lg bg-card/95 backdrop-blur-md border shadow-lg"
  // Two-row layout for edit mode
  const twoRowPanelClasses = "absolute top-2 left-2 right-2 z-20 flex flex-col gap-2 p-2 rounded-lg bg-card/95 backdrop-blur-md border shadow-lg"

  // Rally end content
  if (showRallyEnd && rallyEndInfo) {
    const description = generateRallyEndDescription({
      reason: rallyEndInfo.reason as Parameters<typeof generateRallyEndDescription>[0]['reason'],
      winner: rallyEndInfo.winner,
      lastContact: rallyEndInfo.lastContact,
      possessionChain: rallyEndInfo.possessionChain,
    })

    return (
      <div className={panelClasses}>
        {/* Score */}
        <div className="flex-shrink-0 text-center px-2">
          <div className="text-lg font-bold tabular-nums">
            {rallyEndInfo.homeScore} - {rallyEndInfo.awayScore}
          </div>
        </div>

        {/* Result summary */}
        <div className="flex-1 min-w-0 text-center">
          <div className="text-sm font-semibold truncate">
            {description.title}
          </div>
          <div className="text-xs text-muted-foreground truncate hidden sm:block">
            {description.description}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          <Button
            variant="default"
            size="sm"
            onClick={onNextRally}
            className="h-8"
          >
            Next Rally
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onBackToEdit}
            className="h-8"
          >
            Edit
          </Button>
        </div>
      </div>
    )
  }

  // Live mode content (during rally)
  if (isLive) {
    const phaseInfo = getPhaseInfo(simPhase)

    return (
      <div className={panelClasses}>
        {/* Score */}
        <div className="flex-shrink-0 text-center">
          <div className="text-lg font-bold tabular-nums">
            {homeScore} - {awayScore}
          </div>
        </div>

        {/* Phase indicator */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
            {getCompactPhaseIcon(simPhase)}
            <span className="text-xs sm:text-sm font-medium">{phaseInfo.name}</span>
          </div>
        </div>

        {/* Speed controls */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8"
            onClick={handleDecreaseSpeed}
            disabled={currentSpeedIndex === 0}
          >
            <HugeiconsIcon icon={ArrowDown01Icon} className="h-3 w-3" />
          </Button>
          <span className="text-sm font-bold tabular-nums min-w-[2rem] text-center">
            {displaySpeed}x
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8"
            onClick={handleIncreaseSpeed}
            disabled={currentSpeedIndex === ACTUAL_SPEEDS.length - 1}
          >
            <HugeiconsIcon icon={ArrowUp01Icon} className="h-3 w-3" />
          </Button>
        </div>

        {/* Serve button - shown during PRE_SERVE */}
        {simPhase === 'PRE_SERVE' && (
          <Button
            variant="default"
            size="sm"
            onClick={onServe}
            className="h-8"
          >
            Serve
          </Button>
        )}

        {/* Back to edit */}
        <Button
          variant="outline"
          size="sm"
          onClick={onBackToEdit}
          className="h-8"
        >
          <HugeiconsIcon icon={PauseIcon} className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Edit</span>
        </Button>
      </div>
    )
  }

  // Edit mode content (paused/whiteboard)

  return (
    <div className={twoRowPanelClasses}>
      {/* Top row: Action buttons */}
      <div className="flex items-center justify-end gap-1.5">
        {/* Learn button */}
        {onLearnOpen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLearnOpen}
            aria-label="Learn rotations"
            className="h-8 px-2.5"
          >
            <HugeiconsIcon icon={BookOpen01Icon} className="h-4 w-4 mr-1.5" />
            <span className="text-xs">Learn</span>
          </Button>
        )}

        {/* Roster button */}
        {onRosterOpen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRosterOpen}
            aria-label="Open roster"
            className="h-8 px-2.5"
          >
            <HugeiconsIcon icon={UserGroupIcon} className="h-4 w-4 mr-1.5" />
            <span className="text-xs">Roster</span>
          </Button>
        )}

        {/* GameTime link */}
        <Link href="/volleyball/gametime">
          <Button
            variant="ghost"
            size="sm"
            aria-label="GameTime tracker"
            className="h-8 px-2.5"
          >
            <HugeiconsIcon icon={Timer01Icon} className="h-4 w-4 mr-1.5" />
            <span className="text-xs">Game</span>
          </Button>
        </Link>

        {/* Play button */}
        <Button
          variant="default"
          size="sm"
          onClick={() => onPlaybackModeChange('live')}
          className="h-8 px-3"
        >
          <HugeiconsIcon icon={PlayIcon} className="h-4 w-4 mr-1.5" />
          <span className="text-xs font-medium">Play</span>
        </Button>
      </div>

      {/* Bottom row: Phase and Rotation controls */}
      <div className="flex items-center gap-2">
        {/* Left: Phase navigation arrow */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onPrev}
          aria-label="Previous phase"
          className="h-8 w-8 flex-shrink-0"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
        </Button>

        {/* Phase carousel with edge fade */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden h-8 min-w-0"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
          }}
        >
          <div
            ref={innerRef}
            className="flex items-center gap-3 h-full whitespace-nowrap"
            style={{
              transform: `translateX(${baseOffset + slideOffset}px)`,
              transition: animationPhase === 'sliding' ? `transform ${SLIDE_DURATION}ms ease-out` : 'none',
            }}
          >
            {[-3, -2, -1, 0, 1, 2, 3].map(offset => {
              // Use displayIndex (not currentIndex) so content stays stable during animation
              const phase = getPhaseAtOffset(offset, displayIndex)
              const info = getPhaseInfo(phase)
              const isCurrent = offset === 0

              // Determine highlight state based on animation phase
              // During dimming: old highlight fades out (all items dimmed)
              // During sliding: all items dimmed, no highlight
              // During highlighting: new center item snaps on
              // Idle: normal state
              const isHighlighted = isCurrent && (animationPhase === 'idle' || animationPhase === 'highlighting')
              const isDimmed = animationPhase === 'dimming' || animationPhase === 'sliding'

              return (
                <Button
                  key={`${phase}-${offset}`}
                  data-offset={offset}
                  variant={isHighlighted ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onPhaseChange(phase)}
                  aria-pressed={isCurrent}
                  aria-label={info.name}
                  title={info.name}
                  className={cn(
                    "h-8 flex items-center justify-center gap-1.5 flex-shrink-0 px-3",
                    isHighlighted
                      ? 'shadow-sm bg-primary text-primary-foreground'
                      : 'hover:opacity-80 hover:bg-muted',
                    // Opacity transitions
                    !isHighlighted && 'opacity-50',
                    isDimmed && isCurrent && 'opacity-50',
                    // Transition for smooth dim/highlight
                    isCurrent && 'transition-all',
                  )}
                  style={{
                    transitionDuration: isCurrent
                      ? (animationPhase === 'dimming' ? `${DIM_DURATION}ms` :
                         animationPhase === 'highlighting' ? `${HIGHLIGHT_DURATION}ms` : undefined)
                      : undefined
                  }}
                >
                  {getCompactPhaseIcon(phase)}
                  <span className="text-xs font-medium capitalize whitespace-nowrap">
                    {info.name}
                  </span>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Right: Phase navigation arrow */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onNext}
          aria-label="Next phase"
          className="h-8 w-8 flex-shrink-0"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" />
        </Button>

        {/* Divider */}
        <div className="w-px h-6 bg-border" />

        {/* Rotation Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 flex-shrink-0 font-bold text-xs border-2 hover:bg-muted"
              aria-label={`Rotation ${currentRotation}. Click to change.`}
            >
              R{currentRotation}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ROTATIONS.map((rotation) => (
              <DropdownMenuItem
                key={rotation}
                onClick={() => onRotationChange(rotation)}
                className={cn(
                  "font-medium",
                  rotation === currentRotation && "bg-accent"
                )}
              >
                Rotation {rotation}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
