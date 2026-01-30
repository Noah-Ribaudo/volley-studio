'use client'

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Phase, PHASES, RALLY_PHASES, Rotation, ROTATIONS } from '@/lib/types'
import type { RallyPhase } from '@/lib/sim/types'
import { cn } from '@/lib/utils'
import { getPhaseInfo, getCompactPhaseIcon, isRallyPhase as checkIsRallyPhase } from '@/lib/phaseIcons'
import { ArrowLeft01Icon, ArrowRight01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCarouselAnimation, CAROUSEL_TIMING } from '@/hooks/useCarouselAnimation'

interface MobileContextBarProps {
  currentRotation: Rotation
  currentPhase: Phase
  onPhaseChange: (phase: Phase) => void
  onRotationChange: (rotation: Rotation) => void
  onNext?: () => void
  onPrev?: () => void
  visiblePhases?: Set<RallyPhase>
}

// Number of visible phase items on each side of center
const VISIBLE_SIDES = 2

/**
 * Mobile contextual bar that sits directly above the bottom tab bar.
 * Contains phase carousel, navigation arrows, and rotation selector.
 * Only appears on Whiteboard and Learn pages.
 */
export function MobileContextBar({
  currentRotation,
  currentPhase,
  onPhaseChange,
  onRotationChange,
  onNext,
  onPrev,
  visiblePhases,
}: MobileContextBarProps) {
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
    gap: 8,
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
    <div
      className="fixed left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t md:hidden"
      style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex items-center px-1 py-1.5 gap-0.5">
        {/* Left: Previous phase button - narrow but tall touch target */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-8 shrink-0"
          onClick={onPrev}
          aria-label="Previous phase"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
        </Button>

        {/* Phase carousel with edge fade */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden h-10 min-w-0"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
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
                    "h-9 flex items-center justify-center gap-1.5 flex-shrink-0 px-2.5 min-w-[3.5rem]",
                    isHighlighted
                      ? 'shadow-sm bg-primary text-primary-foreground'
                      : 'hover:opacity-80 hover:bg-muted',
                    !isHighlighted && 'opacity-50',
                    isDimmed && isCurrent && 'opacity-50',
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

        {/* Right: Next phase button - narrow but tall touch target */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-8 shrink-0"
          onClick={onNext}
          aria-label="Next phase"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" />
        </Button>

        {/* Divider */}
        <div className="w-px h-7 bg-border shrink-0" />

        {/* Rotation dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 px-2.5 shrink-0 gap-0.5">
              <span className="font-semibold text-sm">R{currentRotation}</span>
              <HugeiconsIcon icon={ArrowDown01Icon} className="h-3 w-3" />
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
      </div>
    </div>
  )
}
