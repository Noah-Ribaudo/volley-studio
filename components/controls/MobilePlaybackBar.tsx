'use client'

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Phase, PHASES, RALLY_PHASES, Rotation, ROTATIONS } from '@/lib/types'
import type { RallyPhase, PlaybackMode } from '@/lib/sim/types'
import { cn } from '@/lib/utils'
import { getPhaseInfo, getCompactPhaseIcon, isRallyPhase as checkIsRallyPhase } from '@/lib/phaseIcons'
import { UserGroupIcon, BookOpen01Icon, Timer01Icon, MoreVerticalIcon, Settings01Icon, ArrowLeft01Icon, ArrowRight01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useCarouselAnimation, CAROUSEL_TIMING } from '@/hooks/useCarouselAnimation'

interface MobilePlaybackBarProps {
  // Current state
  playbackMode: PlaybackMode
  currentRotation: Rotation
  currentPhase: Phase

  // Actions
  onPlaybackModeChange: (mode: PlaybackMode) => void
  onPhaseChange: (phase: Phase) => void
  onRotationChange: (rotation: Rotation) => void
  onNext?: () => void
  onPrev?: () => void

  // Optional actions
  onRosterOpen?: () => void
  onLearnOpen?: () => void

  // Visible phases for filtering
  visiblePhases?: Set<RallyPhase>
}

// Number of visible phase items on each side of center (total = 2*VISIBLE_SIDES + 1)
// Using 2 instead of 3 makes touch targets larger on small screens
const VISIBLE_SIDES = 2

/**
 * Mobile-optimized playback bar that sits at the bottom of the screen
 * for easy thumb reach. Designed for one-handed phone operation.
 */
export function MobilePlaybackBar({
  currentRotation,
  currentPhase,
  onPhaseChange,
  onRotationChange,
  onNext,
  onPrev,
  onRosterOpen,
  onLearnOpen,
  visiblePhases,
}: MobilePlaybackBarProps) {
  // Determine which phases to show
  const isRallyPhase = checkIsRallyPhase(currentPhase)
  const phasesToShow = isRallyPhase
    ? (visiblePhases ? RALLY_PHASES.filter(p => visiblePhases.has(p)) : RALLY_PHASES)
    : PHASES
  const currentIndex = phasesToShow.findIndex(p => p === currentPhase)

  // Use shared carousel animation hook
  const {
    animationPhase,
    slideOffset,
    baseOffset,
    containerRef,
    innerRef,
    getItemAtOffset,
  } = useCarouselAnimation({
    items: phasesToShow,
    currentIndex,
    gap: 8, // gap-2 = 8px
    enabled: true,
  })

  // Get phase at offset from display index
  const getPhaseAtOffset = useCallback((offset: number) => {
    const idx = getItemAtOffset(offset)
    return phasesToShow[idx]
  }, [getItemAtOffset, phasesToShow])

  // Generate offsets array: [-2, -1, 0, 1, 2] for VISIBLE_SIDES = 2
  const offsets = Array.from(
    { length: VISIBLE_SIDES * 2 + 1 },
    (_, i) => i - VISIBLE_SIDES
  )

  const { DIM_DURATION, SLIDE_DURATION, HIGHLIGHT_DURATION } = CAROUSEL_TIMING

  return (
    <div className="fixed left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t" style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}>
      <div className="flex items-center px-2 py-2 gap-1">
        {/* Left: Previous phase button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={onPrev}
          aria-label="Previous phase"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
        </Button>

        {/* Phase carousel with edge fade */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden h-11 min-w-0"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
          }}
        >
          <div
            ref={innerRef}
            className="flex items-center gap-2 h-full whitespace-nowrap"
            style={{
              transform: `translateX(${baseOffset + slideOffset}px)`,
              transition: animationPhase === 'sliding' ? `transform ${SLIDE_DURATION}ms ease-out` : 'none',
            }}
          >
            {offsets.map(offset => {
              // Use getPhaseAtOffset which uses displayIndex internally for stable animation
              const phase = getPhaseAtOffset(offset)
              const info = getPhaseInfo(phase)
              const isCurrent = offset === 0

              // Determine highlight state based on animation phase
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
                    // Larger touch targets on mobile: h-10 instead of h-9, more horizontal padding
                    "h-10 flex items-center justify-center gap-1.5 flex-shrink-0 px-3 min-w-[4rem]",
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

        {/* Right: Next phase button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={onNext}
          aria-label="Next phase"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} className="h-5 w-5" />
        </Button>

        {/* Divider */}
        <div className="w-px h-8 bg-border shrink-0" />

        {/* Rotation dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-11 px-3 shrink-0 gap-1">
              <span className="font-semibold">R{currentRotation}</span>
              <HugeiconsIcon icon={ArrowDown01Icon} className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="mb-2">
            {ROTATIONS.map((rotation) => (
              <DropdownMenuItem
                key={rotation}
                onClick={() => onRotationChange(rotation)}
                className={cn(
                  "py-2.5",
                  rotation === currentRotation && "bg-accent"
                )}
              >
                Rotation {rotation}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* More menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="More options">
              <HugeiconsIcon icon={MoreVerticalIcon} className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="mb-2 w-48">
            {onLearnOpen && (
              <DropdownMenuItem onClick={onLearnOpen} className="py-3">
                <HugeiconsIcon icon={BookOpen01Icon} className="h-4 w-4 mr-3" />
                Learn Rotations
              </DropdownMenuItem>
            )}
            {onRosterOpen && (
              <DropdownMenuItem onClick={onRosterOpen} className="py-3">
                <HugeiconsIcon icon={UserGroupIcon} className="h-4 w-4 mr-3" />
                Team Roster
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="py-3">
              <Link href="/volleyball/gametime">
                <HugeiconsIcon icon={Timer01Icon} className="h-4 w-4 mr-3" />
                Game Tracker
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="py-3">
              <Link href="/volleyball/settings">
                <HugeiconsIcon icon={Settings01Icon} className="h-4 w-4 mr-3" />
                Settings
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
