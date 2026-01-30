'use client'

import { useCallback, useRef, useLayoutEffect, useState } from 'react'
import { animate, stopAnimation, type AnimationPlaybackControls } from '@/lib/motion-utils'

// Animation timing constants (in ms)
export const CAROUSEL_TIMING = {
  DIM_DURATION: 100,
  SLIDE_DURATION: 300,
  HIGHLIGHT_DURATION: 80,
} as const

export type AnimationPhase = 'idle' | 'dimming' | 'sliding' | 'highlighting'

interface UseCarouselAnimationOptions<T> {
  /** Array of items to cycle through */
  items: T[]
  /** Current index in the items array */
  currentIndex: number
  /** Gap between items in pixels */
  gap?: number
  /** Whether animation is enabled (e.g., disabled in live mode) */
  enabled?: boolean
}

interface UseCarouselAnimationResult {
  /** Current animation phase */
  animationPhase: AnimationPhase
  /** Index to use for display (may differ from currentIndex during animation) */
  displayIndex: number
  /** Current slide offset in pixels */
  slideOffset: number
  /** Base offset to center the current item */
  baseOffset: number
  /** Ref to attach to the container element */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** Ref to attach to the inner scrolling element */
  innerRef: React.RefObject<HTMLDivElement | null>
  /** Get item at offset from center (handles looping) */
  getItemAtOffset: (offset: number) => number
}

/**
 * Shared carousel animation hook for phase selectors.
 *
 * Handles the dim → slide → highlight animation sequence when
 * the current phase changes. Used by both PlaybackBar and MobilePlaybackBar.
 *
 * Uses Motion for interruptible, smooth animations.
 */
export function useCarouselAnimation<T>({
  items,
  currentIndex,
  gap = 12,
  enabled = true,
}: UseCarouselAnimationOptions<T>): UseCarouselAnimationResult {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const innerRef = useRef<HTMLDivElement | null>(null)

  // Animation state
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('idle')
  const [displayIndex, setDisplayIndex] = useState(currentIndex)
  const [slideOffset, setSlideOffset] = useState(0)
  const [baseOffset, setBaseOffset] = useState(0)
  const prevIndexRef = useRef(currentIndex)
  const hasMeasured = useRef(false)

  // Track current animation for cleanup/interruption
  const animationRef = useRef<AnimationPlaybackControls | null>(null)
  const pendingIndexRef = useRef<number | null>(null)

  const { DIM_DURATION, SLIDE_DURATION, HIGHLIGHT_DURATION } = CAROUSEL_TIMING
  const totalDuration = DIM_DURATION + SLIDE_DURATION + HIGHLIGHT_DURATION

  // Get item index at offset from a given center index (looping)
  const getItemAtOffset = useCallback((offset: number) => {
    const len = items.length
    const idx = ((displayIndex + offset) % len + len) % len
    return idx
  }, [items.length, displayIndex])

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
      itemStartX += child.offsetWidth + gap
    }
    const itemCenterX = itemStartX + centerItem.offsetWidth / 2
    return containerWidth / 2 - itemCenterX
  }, [gap])

  // Measure item widths for sliding calculation
  const measureSlideDistance = useCallback((direction: number) => {
    const inner = innerRef.current
    if (!inner) return 0

    const targetOffset = direction > 0 ? 1 : -1
    const targetItem = inner.querySelector(`[data-offset="${targetOffset}"]`) as HTMLElement
    const centerItem = inner.querySelector('[data-offset="0"]') as HTMLElement

    if (!targetItem || !centerItem) return 0

    if (direction > 0) {
      return -(centerItem.offsetWidth / 2 + gap + targetItem.offsetWidth / 2)
    } else {
      return centerItem.offsetWidth / 2 + gap + targetItem.offsetWidth / 2
    }
  }, [gap])

  // Handle index changes with animation - using Motion for interruptibility
  useLayoutEffect(() => {
    if (!enabled) return

    const newIndex = currentIndex

    if (!hasMeasured.current) {
      hasMeasured.current = true
      prevIndexRef.current = newIndex
      return
    }

    if (prevIndexRef.current === newIndex) return

    // Stop any existing animation when a new one starts (interruptibility)
    stopAnimation(animationRef.current)

    const len = items.length
    const rawDiff = newIndex - prevIndexRef.current
    let direction: number
    if (Math.abs(rawDiff) <= len / 2) {
      direction = rawDiff > 0 ? 1 : -1
    } else {
      direction = rawDiff > 0 ? -1 : 1
    }

    const slideDistance = measureSlideDistance(direction)
    pendingIndexRef.current = newIndex

    // Use a single Motion animation that drives all phases based on progress
    // This makes the animation fully interruptible
    animationRef.current = animate(0, 1, {
      duration: totalDuration / 1000, // Motion uses seconds
      ease: 'linear', // We control easing per-phase
      onUpdate: (progress) => {
        const elapsed = progress * totalDuration

        if (elapsed < DIM_DURATION) {
          // Dimming phase
          setAnimationPhase('dimming')
          setSlideOffset(0)
        } else if (elapsed < DIM_DURATION + SLIDE_DURATION) {
          // Sliding phase - ease the slide with cubic bezier feel
          setAnimationPhase('sliding')
          const slideProgress = (elapsed - DIM_DURATION) / SLIDE_DURATION
          // Apply easing to slide progress
          const easedProgress = slideProgress < 0.5
            ? 2 * slideProgress * slideProgress
            : 1 - Math.pow(-2 * slideProgress + 2, 2) / 2
          setSlideOffset(slideDistance * easedProgress)
        } else {
          // Highlighting phase
          setAnimationPhase('highlighting')
          // At this point, snap to final position
          setSlideOffset(0)
          if (pendingIndexRef.current !== null) {
            setDisplayIndex(pendingIndexRef.current)
            pendingIndexRef.current = null
          }
        }
      },
      onComplete: () => {
        setAnimationPhase('idle')
        setSlideOffset(0)
        animationRef.current = null
      },
    })

    prevIndexRef.current = newIndex

    return () => {
      stopAnimation(animationRef.current)
    }
  }, [currentIndex, items.length, measureSlideDistance, enabled, DIM_DURATION, SLIDE_DURATION, HIGHLIGHT_DURATION, totalDuration])

  // Calculate base offset when displayIndex or items change
  useLayoutEffect(() => {
    if (!enabled) return

    const timer = requestAnimationFrame(() => {
      setBaseOffset(calculateBaseOffset())
    })
    return () => cancelAnimationFrame(timer)
  }, [displayIndex, items, calculateBaseOffset, enabled])

  return {
    animationPhase,
    displayIndex,
    slideOffset,
    baseOffset,
    containerRef,
    innerRef,
    getItemAtOffset,
  }
}
