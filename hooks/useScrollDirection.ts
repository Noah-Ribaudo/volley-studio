'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type ScrollDirection = 'up' | 'down' | null

interface UseScrollDirectionOptions {
  /** Minimum scroll distance before direction change is registered (default: 10) */
  threshold?: number
  /** Initial direction (default: null) */
  initialDirection?: ScrollDirection
  /** Disable on desktop viewports (default: true) */
  mobileOnly?: boolean
  /** Breakpoint for mobile detection in pixels (default: 768) */
  mobileBreakpoint?: number
}

interface UseScrollDirectionReturn {
  /** Current scroll direction */
  scrollDirection: ScrollDirection
  /** Whether the user is at the top of the page */
  isAtTop: boolean
  /** Whether the header should be visible */
  shouldShowHeader: boolean
}

/**
 * Hook to detect scroll direction for intelligent header collapse
 * Best practices implemented:
 * - Throttled scroll handler for performance
 * - Threshold to prevent jitter on small scrolls
 * - Always shows header at top of page
 * - Mobile-only by default (desktop keeps header visible)
 */
export function useScrollDirection(
  options: UseScrollDirectionOptions = {}
): UseScrollDirectionReturn {
  const {
    threshold = 10,
    initialDirection = null,
    mobileOnly = true,
    mobileBreakpoint = 768,
  } = options

  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(initialDirection)
  const [isAtTop, setIsAtTop] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  // Handle resize for mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [mobileBreakpoint])

  const updateScrollDirection = useCallback(() => {
    const scrollY = window.scrollY
    
    // Update isAtTop
    const atTop = scrollY < 10
    setIsAtTop(atTop)
    
    // If at top, always show header
    if (atTop) {
      setScrollDirection(null)
      lastScrollY.current = scrollY
      ticking.current = false
      return
    }
    
    // Calculate direction with threshold
    const difference = scrollY - lastScrollY.current
    
    if (Math.abs(difference) < threshold) {
      ticking.current = false
      return
    }
    
    const direction: ScrollDirection = difference > 0 ? 'down' : 'up'
    
    if (direction !== scrollDirection) {
      setScrollDirection(direction)
    }
    
    lastScrollY.current = scrollY
    ticking.current = false
  }, [scrollDirection, threshold])

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScrollDirection)
        ticking.current = true
      }
    }

    // Set initial scroll position via ref, then trigger an update via rAF
    lastScrollY.current = window.scrollY
    // Use rAF to set initial state (avoids synchronous setState in effect)
    window.requestAnimationFrame(updateScrollDirection)

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [updateScrollDirection])

  // Determine if header should be visible
  const shouldShowHeader = mobileOnly
    ? !isMobile || isAtTop || scrollDirection === 'up'
    : isAtTop || scrollDirection === 'up'

  return {
    scrollDirection,
    isAtTop,
    shouldShowHeader,
  }
}

