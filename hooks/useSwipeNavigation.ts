import { useCallback, useRef, useState } from 'react'

interface SwipeNavigationOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number // Minimum distance in pixels to trigger swipe
  velocityThreshold?: number // Minimum velocity to trigger swipe
  enabled?: boolean
  // Dead zone at start of touch - if movement exceeds this before intent is clear, cancel swipe
  deadZone?: number
  // Angle tolerance for horizontal swipes (in degrees from horizontal)
  angleTolerance?: number
}

interface SwipeState {
  swiping: boolean
  direction: 'left' | 'right' | 'up' | 'down' | null
  delta: { x: number; y: number }
}

/**
 * Hook for handling swipe gestures on touch devices.
 * Returns handlers to attach to your swipeable element.
 *
 * Designed to coexist with drag gestures by requiring:
 * - Fast, intentional horizontal movement (velocity-based)
 * - Movement angle close to horizontal (to avoid triggering during vertical scrolling)
 * - The swipe to start clearly horizontal before crossing the dead zone
 */
export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 80, // Increased from 50 - require more deliberate swipe
  velocityThreshold = 0.5, // Increased from 0.3 - require faster movement
  enabled = true,
  deadZone = 15, // Movement below this is considered noise
  angleTolerance = 30, // Degrees from horizontal - must be clearly horizontal
}: SwipeNavigationOptions = {}) {
  const [swipeState, setSwipeState] = useState<SwipeState>({
    swiping: false,
    direction: null,
    delta: { x: 0, y: 0 },
  })

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const touchCurrentRef = useRef<{ x: number; y: number } | null>(null)
  // Track whether this touch started on a draggable element
  const touchCancelledRef = useRef(false)
  // Track if swipe intent has been established
  const swipeIntentRef = useRef<'horizontal' | 'vertical' | 'unknown'>('unknown')

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return

    // Check if touch started on a player token or draggable element
    const target = e.target as HTMLElement
    const isDraggableTarget = target.closest('[data-draggable]') !== null ||
                              target.closest('circle[style*="cursor: grab"]') !== null ||
                              target.closest('circle[style*="cursor: move"]') !== null ||
                              target.closest('.player-token') !== null

    // Reset state for new touch
    touchCancelledRef.current = isDraggableTarget
    swipeIntentRef.current = 'unknown'

    if (isDraggableTarget) {
      // Don't start swipe tracking if on a draggable element
      return
    }

    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    }
    touchCurrentRef.current = { x: touch.clientX, y: touch.clientY }

    setSwipeState({
      swiping: true,
      direction: null,
      delta: { x: 0, y: 0 },
    })
  }, [enabled])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !touchStartRef.current || touchCancelledRef.current) return

    const touch = e.touches[0]
    touchCurrentRef.current = { x: touch.clientX, y: touch.clientY }

    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Establish intent once we cross the dead zone
    if (swipeIntentRef.current === 'unknown' && distance > deadZone) {
      // Calculate angle from horizontal (0 degrees = pure horizontal)
      const angle = Math.abs(Math.atan2(Math.abs(deltaY), Math.abs(deltaX)) * (180 / Math.PI))

      if (angle <= angleTolerance) {
        swipeIntentRef.current = 'horizontal'
      } else if (angle >= (90 - angleTolerance)) {
        swipeIntentRef.current = 'vertical'
        // Cancel swipe tracking - this is a vertical gesture
        touchCancelledRef.current = true
        setSwipeState({ swiping: false, direction: null, delta: { x: 0, y: 0 } })
        return
      }
      // Between tolerances - keep tracking to see if it resolves
    }

    // Determine primary direction
    let direction: 'left' | 'right' | 'up' | 'down' | null = null
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left'
    } else if (Math.abs(deltaY) > Math.abs(deltaX)) {
      direction = deltaY > 0 ? 'down' : 'up'
    }

    setSwipeState({
      swiping: true,
      direction,
      delta: { x: deltaX, y: deltaY },
    })
  }, [enabled, deadZone, angleTolerance])

  const handleTouchEnd = useCallback(() => {
    // Check if this touch was cancelled (started on draggable or became vertical)
    if (!enabled || !touchStartRef.current || !touchCurrentRef.current || touchCancelledRef.current) {
      setSwipeState({ swiping: false, direction: null, delta: { x: 0, y: 0 } })
      touchStartRef.current = null
      touchCurrentRef.current = null
      touchCancelledRef.current = false
      swipeIntentRef.current = 'unknown'
      return
    }

    const deltaX = touchCurrentRef.current.x - touchStartRef.current.x
    const deltaY = touchCurrentRef.current.y - touchStartRef.current.y
    const elapsed = Date.now() - touchStartRef.current.time

    // Calculate velocity (pixels per millisecond)
    const velocityX = Math.abs(deltaX) / elapsed
    const velocityY = Math.abs(deltaY) / elapsed

    // Determine if swipe was significant enough
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY)
    const distance = isHorizontalSwipe ? Math.abs(deltaX) : Math.abs(deltaY)
    const velocity = isHorizontalSwipe ? velocityX : velocityY

    // For horizontal swipes, require established horizontal intent
    const hasHorizontalIntent = swipeIntentRef.current === 'horizontal'

    // Must have both sufficient distance AND velocity (AND intent for horizontal)
    // Using AND instead of OR makes it more deliberate
    if (distance > threshold && velocity > velocityThreshold) {
      if (isHorizontalSwipe && hasHorizontalIntent) {
        if (deltaX > 0) {
          onSwipeRight?.()
        } else {
          onSwipeLeft?.()
        }
      } else if (!isHorizontalSwipe) {
        if (deltaY > 0) {
          onSwipeDown?.()
        } else {
          onSwipeUp?.()
        }
      }
    }

    // Reset state
    touchStartRef.current = null
    touchCurrentRef.current = null
    touchCancelledRef.current = false
    swipeIntentRef.current = 'unknown'
    setSwipeState({ swiping: false, direction: null, delta: { x: 0, y: 0 } })
  }, [enabled, threshold, velocityThreshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  const handleTouchCancel = useCallback(() => {
    touchStartRef.current = null
    touchCurrentRef.current = null
    touchCancelledRef.current = false
    swipeIntentRef.current = 'unknown'
    setSwipeState({ swiping: false, direction: null, delta: { x: 0, y: 0 } })
  }, [])

  return {
    swipeState,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
  }
}
