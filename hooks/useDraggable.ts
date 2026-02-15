'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface UseDraggableOptions {
  /** Initial position of the draggable element */
  initialPosition?: { x: number; y: number }
  /** Callback when position changes */
  onPositionChange?: (position: { x: number; y: number }) => void
  /** Whether dragging is enabled */
  disabled?: boolean
  /** Constrain dragging to viewport bounds */
  constrainToViewport?: boolean
  /** Storage key for persisting position */
  storageKey?: string
}

interface UseDraggableReturn {
  /** Current position */
  position: { x: number; y: number }
  /** Whether currently dragging */
  isDragging: boolean
  /** Ref to attach to the draggable element */
  dragRef: React.RefObject<HTMLDivElement | null>
  /** Ref to attach to the drag handle (optional, defaults to entire element) */
  handleRef: React.RefObject<HTMLDivElement | null>
  /** Reset position to initial */
  resetPosition: () => void
  /** Set position programmatically */
  setPosition: (position: { x: number; y: number }) => void
}

/**
 * Hook for making elements draggable.
 * Returns refs to attach to the draggable element and its handle.
 */
export function useDraggable({
  initialPosition = { x: 0, y: 0 },
  onPositionChange,
  disabled = false,
  constrainToViewport = true,
  storageKey
}: UseDraggableOptions = {}): UseDraggableReturn {
  // Load initial position from storage if available
  const getInitialPosition = useCallback(() => {
    if (typeof window === 'undefined') return initialPosition

    if (storageKey) {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          return { x: parsed.x ?? initialPosition.x, y: parsed.y ?? initialPosition.y }
        }
      } catch {
        // Ignore malformed local storage payloads.
      }
    }
    return initialPosition
  }, [initialPosition, storageKey])

  const [position, setPositionState] = useState(getInitialPosition)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const elementStartPos = useRef({ x: 0, y: 0 })

  // Save position to storage
  const savePosition = useCallback((pos: { x: number; y: number }) => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(pos))
      } catch {
        // Ignore local storage write failures.
      }
    }
  }, [storageKey])

  // Set position with storage persistence
  const setPosition = useCallback((newPosition: { x: number; y: number }) => {
    setPositionState(newPosition)
    savePosition(newPosition)
    onPositionChange?.(newPosition)
  }, [onPositionChange, savePosition])

  // Reset to initial position
  const resetPosition = useCallback(() => {
    setPosition(initialPosition)
  }, [initialPosition, setPosition])

  // Constrain position to viewport
  const constrainPosition = useCallback((pos: { x: number; y: number }): { x: number; y: number } => {
    if (!constrainToViewport || !dragRef.current) return pos

    const element = dragRef.current
    const rect = element.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let { x, y } = pos

    // Constrain to viewport bounds (keep at least part of element visible)
    const minVisible = 50 // Minimum pixels visible
    x = Math.max(-rect.width + minVisible, Math.min(viewportWidth - minVisible, x))
    y = Math.max(0, Math.min(viewportHeight - minVisible, y))

    return { x, y }
  }, [constrainToViewport])

  // Handle drag start
  const handleDragStart = useCallback((e: MouseEvent | TouchEvent) => {
    if (disabled) return

    const handle = handleRef.current
    const draggable = dragRef.current

    // Check if the drag started on the handle (or draggable if no handle)
    const target = e.target as Node
    const handleElement = handle || draggable
    if (!handleElement || !handleElement.contains(target)) return

    e.preventDefault()
    setIsDragging(true)

    // Get initial positions
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    dragStartPos.current = { x: clientX, y: clientY }
    elementStartPos.current = position

    // Prevent text selection during drag
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'
  }, [disabled, position])

  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return

    e.preventDefault()

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const deltaX = clientX - dragStartPos.current.x
    const deltaY = clientY - dragStartPos.current.y

    const newPosition = constrainPosition({
      x: elementStartPos.current.x + deltaX,
      y: elementStartPos.current.y + deltaY
    })

    setPositionState(newPosition)
  }, [isDragging, constrainPosition])

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return

    setIsDragging(false)

    // Re-enable text selection
    document.body.style.userSelect = ''
    document.body.style.webkitUserSelect = ''

    // Save final position
    savePosition(position)
    onPositionChange?.(position)
  }, [isDragging, position, onPositionChange, savePosition])

  // Set up event listeners
  useEffect(() => {
    const handle = handleRef.current || dragRef.current
    if (!handle || disabled) return

    // Mouse events
    handle.addEventListener('mousedown', handleDragStart)
    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)

    // Touch events
    handle.addEventListener('touchstart', handleDragStart, { passive: false })
    document.addEventListener('touchmove', handleDragMove, { passive: false })
    document.addEventListener('touchend', handleDragEnd)

    return () => {
      handle.removeEventListener('mousedown', handleDragStart)
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('mouseup', handleDragEnd)

      handle.removeEventListener('touchstart', handleDragStart)
      document.removeEventListener('touchmove', handleDragMove)
      document.removeEventListener('touchend', handleDragEnd)
    }
  }, [handleDragStart, handleDragMove, handleDragEnd, disabled])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      document.body.style.userSelect = ''
      document.body.style.webkitUserSelect = ''
    }
  }, [])

  return {
    position,
    isDragging,
    dragRef,
    handleRef,
    resetPosition,
    setPosition
  }
}
