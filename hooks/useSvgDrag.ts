import { useCallback, useRef, useState, RefObject } from 'react'
import type { Position } from '@/lib/types'

const THROTTLE_MS = 50

export interface UseSvgDragOptions {
  /** Reference to the SVG element for coordinate calculation */
  svgRef: RefObject<SVGSVGElement | null>
  /** Whether dragging is enabled */
  enabled?: boolean
  /** Function to constrain position during drag */
  constrainPosition?: (pos: Position) => Position
  /** Callback called during drag (throttled) */
  onDrag?: (position: Position) => void
  /** Callback called when drag ends */
  onDragEnd?: (position: Position) => void
  /** Throttle interval in ms (default: 50) */
  throttleMs?: number
  /** SVG viewBox parameters for coordinate conversion */
  viewBox: { x: number; y: number; width: number; height: number }
  /** Court dimensions within viewBox (for normalized coordinate conversion) */
  courtBounds: { x: number; y: number; width: number; height: number }
}

export interface UseSvgDragReturn {
  /** Whether currently dragging */
  isDragging: boolean
  /** Current drag position (normalized 0-1) */
  dragPosition: Position | null
  /** Call this to start dragging from a position */
  startDrag: (initialPosition: Position, event: React.MouseEvent | React.TouchEvent) => void
  /** Call this to cancel/stop dragging */
  stopDrag: () => void
}

/**
 * Hook for handling drag operations on SVG elements with:
 * - RAF-throttled updates for smooth animation
 * - Touch and mouse support
 * - Position constraints
 * - Normalized coordinate conversion (0-1)
 */
export function useSvgDrag({
  svgRef,
  enabled = true,
  constrainPosition,
  onDrag,
  onDragEnd,
  throttleMs = THROTTLE_MS,
  viewBox,
  courtBounds,
}: UseSvgDragOptions): UseSvgDragReturn {
  const [isDragging, setIsDragging] = useState(false)
  const [dragPosition, setDragPosition] = useState<Position | null>(null)

  // Refs for RAF and throttling
  const rafRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<number>(0)
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  // Use ref to track position for handleEnd callback (avoids stale closure)
  const dragPositionRef = useRef<Position | null>(null)

  // Convert client coordinates to SVG coordinates
  const getEventPosition = useCallback((e: MouseEvent | TouchEvent): { x: number; y: number } => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }

    const rect = svg.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0 : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY ?? 0 : e.clientY

    // Scale factor from client to viewBox
    const scaleX = viewBox.width / rect.width
    const scaleY = viewBox.height / rect.height

    return {
      x: (clientX - rect.left) * scaleX + viewBox.x,
      y: (clientY - rect.top) * scaleY + viewBox.y
    }
  }, [svgRef, viewBox])

  // Convert SVG coordinates to normalized (0-1)
  const toNormalizedCoords = useCallback((svgX: number, svgY: number): Position => {
    return {
      x: (svgX - courtBounds.x) / courtBounds.width,
      y: (svgY - courtBounds.y) / courtBounds.height
    }
  }, [courtBounds])

  // Convert normalized (0-1) to SVG coordinates
  const toSvgCoords = useCallback((pos: Position): { x: number; y: number } => {
    return {
      x: courtBounds.x + pos.x * courtBounds.width,
      y: courtBounds.y + pos.y * courtBounds.height
    }
  }, [courtBounds])

  // Stop dragging
  const stopDrag = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setIsDragging(false)
    setDragPosition(null)
  }, [])

  // Start dragging
  const startDrag = useCallback((initialPosition: Position, event: React.MouseEvent | React.TouchEvent) => {
    if (!enabled) return

    // Prevent default for mouse events (not touch - causes passive listener warnings)
    if (event.type === 'mousedown') {
      event.preventDefault()
    }
    event.stopPropagation()

    const pos = getEventPosition(event.nativeEvent as MouseEvent | TouchEvent)
    const currentSvgPos = toSvgCoords(initialPosition)

    // Calculate offset from cursor to element center
    dragOffsetRef.current = {
      x: currentSvgPos.x - pos.x,
      y: currentSvgPos.y - pos.y
    }

    setIsDragging(true)
    setDragPosition(initialPosition)
    lastUpdateRef.current = Date.now()

    // Prevent page scroll during drag
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault() // Prevent scrolling on mobile

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }

      rafRef.current = requestAnimationFrame(() => {
        const pos = getEventPosition(e)
        const newX = pos.x + dragOffsetRef.current.x
        const newY = pos.y + dragOffsetRef.current.y

        let normalizedPos = toNormalizedCoords(newX, newY)

        // Apply constraint if provided
        if (constrainPosition) {
          normalizedPos = constrainPosition(normalizedPos)
        }

        // Update visual position immediately (smooth)
        setDragPosition(normalizedPos)
        dragPositionRef.current = normalizedPos

        // Throttle callbacks to parent
        const now = Date.now()
        if (now - lastUpdateRef.current >= throttleMs && onDrag) {
          onDrag(normalizedPos)
          lastUpdateRef.current = now
        }
      })
    }

    const handleEnd = () => {
      // Re-enable page scroll
      document.body.style.overflow = ''
      document.body.style.touchAction = ''

      // Cancel any pending RAF
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }

      // Get final position from ref (avoids stale closure issue)
      const finalPosition = dragPositionRef.current
      if (finalPosition && onDragEnd) {
        onDragEnd(finalPosition)
      }

      setIsDragging(false)
      setDragPosition(null)
      dragPositionRef.current = null

      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd)
  }, [enabled, getEventPosition, toSvgCoords, toNormalizedCoords, constrainPosition, onDrag, onDragEnd, throttleMs])

  return {
    isDragging,
    dragPosition,
    startDrag,
    stopDrag,
  }
}

/**
 * Constraint helper: Keep position on home side of court (y >= 0.5)
 */
export function constrainToHomeSide(pos: Position): Position {
  return {
    x: Math.max(0, Math.min(1, pos.x)),
    y: Math.max(0.5, Math.min(1, pos.y))
  }
}

/**
 * Constraint helper: Keep position on away side of court (y <= 0.5)
 */
export function constrainToAwaySide(pos: Position): Position {
  return {
    x: Math.max(0, Math.min(1, pos.x)),
    y: Math.max(0, Math.min(0.5, pos.y))
  }
}

/**
 * Constraint helper: Keep attack ball near the net on opponent side
 */
export function constrainToAttackZone(pos: Position): Position {
  return {
    x: Math.max(0, Math.min(1, pos.x)),
    y: Math.max(0.25, Math.min(0.45, pos.y))
  }
}
