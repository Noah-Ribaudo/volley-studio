'use client'

import { useCallback, useRef, useLayoutEffect, useState } from 'react'

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

  const { DIM_DURATION, SLIDE_DURATION, HIGHLIGHT_DURATION } = CAROUSEL_TIMING

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

  // Handle index changes with animation
  useLayoutEffect(() => {
    if (!enabled) return

    const newIndex = currentIndex

    if (!hasMeasured.current) {
      hasMeasured.current = true
      // displayIndex is already initialized with currentIndex via useState
      prevIndexRef.current = newIndex
      return
    }

    if (prevIndexRef.current === newIndex) return

    const len = items.length
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
  }, [currentIndex, items.length, measureSlideDistance, enabled, DIM_DURATION, SLIDE_DURATION, HIGHLIGHT_DURATION])

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
