'use client'

import { useRef, useEffect, useCallback, useState, useLayoutEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Phase, RALLY_PHASES } from '@/lib/types'
import type { RallyPhase } from '@/lib/sim/types'
import { cn } from '@/lib/utils'
import { getPhaseInfo, getCompactPhaseIcon } from '@/lib/phaseIcons'

interface PhaseCarouselProps {
  currentPhase: Phase
  visiblePhases?: Set<RallyPhase>
  onPhaseChange: (phase: Phase) => void
  phases: Phase[]
}

export function PhaseCarousel({
  currentPhase,
  visiblePhases,
  onPhaseChange,
  phases,
}: PhaseCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)
  const prevPhasesKey = useRef<string>('')

  // Create a key from phases array to detect changes
  const phasesKey = phases.join(',')

  // Find current phase index (default to 0 if not found)
  const currentIndex = Math.max(0, phases.indexOf(currentPhase))

  // Create extended array for infinite scroll illusion (3 copies)
  const extendedPhases = [...phases, ...phases, ...phases]

  // Scroll to center a specific button by its index in extendedPhases
  const scrollToButton = useCallback((extendedIndex: number, smooth = true) => {
    const container = containerRef.current
    const button = buttonRefs.current.get(extendedIndex)
    if (!container || !button) return

    const containerWidth = container.offsetWidth
    const buttonLeft = button.offsetLeft
    const buttonWidth = button.offsetWidth

    // Calculate scroll position to center the button
    const targetScroll = buttonLeft - (containerWidth / 2) + (buttonWidth / 2)

    container.scrollTo({
      left: targetScroll,
      behavior: smooth ? 'smooth' : 'instant'
    })
  }, [])

  // Get the middle copy's index for current phase
  const getMiddleIndex = useCallback((phaseIndex: number) => {
    return phaseIndex + phases.length
  }, [phases.length])

  // Reset and re-center when phases array changes
  useLayoutEffect(() => {
    if (prevPhasesKey.current !== phasesKey) {
      prevPhasesKey.current = phasesKey
      // Clear old refs since buttons will remount
      buttonRefs.current.clear()
      setIsInitialized(false)
    }
  }, [phasesKey])

  // Initial scroll to current phase (no animation)
  useLayoutEffect(() => {
    if (isInitialized) return

    // Small delay to ensure DOM and refs are ready
    const timer = setTimeout(() => {
      scrollToButton(getMiddleIndex(currentIndex), false)
      setIsInitialized(true)
    }, 50)
    return () => clearTimeout(timer)
  }, [isInitialized, scrollToButton, getMiddleIndex, currentIndex])

  // Scroll when phase changes (only after initialized)
  useEffect(() => {
    if (!isInitialized) return
    scrollToButton(getMiddleIndex(currentIndex), true)
  }, [currentIndex, scrollToButton, getMiddleIndex, isInitialized])

  // Handle infinite scroll looping
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container || isDragging) return

    const scrollPos = container.scrollLeft
    const scrollWidth = container.scrollWidth
    const oneThird = scrollWidth / 3

    // If scrolled into first third, jump to middle third
    if (scrollPos < oneThird * 0.5) {
      container.scrollLeft = scrollPos + oneThird
    }
    // If scrolled into last third, jump to middle third
    else if (scrollPos > oneThird * 1.5) {
      container.scrollLeft = scrollPos - oneThird
    }
  }, [isDragging])

  // Mouse/touch drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartX(e.pageX - (containerRef.current?.offsetLeft || 0))
    setScrollLeft(containerRef.current?.scrollLeft || 0)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const x = e.pageX - (containerRef.current?.offsetLeft || 0)
    const walk = (x - startX) * 1.5
    if (containerRef.current) {
      containerRef.current.scrollLeft = scrollLeft - walk
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  // Touch handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setStartX(e.touches[0].pageX - (containerRef.current?.offsetLeft || 0))
    setScrollLeft(containerRef.current?.scrollLeft || 0)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const x = e.touches[0].pageX - (containerRef.current?.offsetLeft || 0)
    const walk = (x - startX) * 1.5
    if (containerRef.current) {
      containerRef.current.scrollLeft = scrollLeft - walk
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  // Store button ref
  const setButtonRef = useCallback((el: HTMLButtonElement | null, idx: number) => {
    if (el) {
      buttonRefs.current.set(idx, el)
    } else {
      buttonRefs.current.delete(idx)
    }
  }, [])

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Gradient fades on edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-card/95 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card/95 to-transparent z-10 pointer-events-none" />

      {/* Scrollable container */}
      <div
        ref={containerRef}
        className={cn(
          "flex items-center gap-1 overflow-x-auto scrollbar-hide",
          "cursor-grab active:cursor-grabbing",
          "select-none"
        )}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {extendedPhases.map((phase, idx) => {
          const info = getPhaseInfo(phase)
          const originalIndex = idx % phases.length
          const isCurrentPhase = phases[originalIndex] === currentPhase
          const isRally = RALLY_PHASES.includes(phase as RallyPhase)
          const isVisible = !isRally || !visiblePhases || visiblePhases.has(phase as RallyPhase)

          return (
            <Button
              key={`${phase}-${idx}`}
              ref={(el) => setButtonRef(el, idx)}
              variant={isCurrentPhase ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onPhaseChange(phase)}
              aria-pressed={isCurrentPhase}
              aria-label={info.name}
              title={info.name}
              className={cn(
                "h-8 flex items-center justify-center gap-1.5 transition-all flex-shrink-0",
                "px-2.5",
                isCurrentPhase
                  ? 'shadow-md bg-primary text-primary-foreground scale-105'
                  : 'opacity-50 hover:opacity-80 hover:bg-muted scale-95',
                !isVisible && 'opacity-30'
              )}
            >
              {getCompactPhaseIcon(phase)}
              <span className="text-xs font-medium whitespace-nowrap">
                {info.name}
              </span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
