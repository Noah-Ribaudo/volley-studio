'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { PlayerContextContent } from './PlayerContextContent'
import type { Role, RosterPlayer, PositionAssignments, PlayerStatus } from '@/lib/types'

interface PlayerContextUIProps {
  /** The role of the player with context UI open, or null if closed */
  contextPlayer: Role | null
  /** Callback to set/clear the context player */
  onContextPlayerChange: (role: Role | null) => void
  /** Anchor position in screen coordinates for popover positioning */
  anchorPosition?: { x: number; y: number } | null
  /** Roster for player info */
  roster?: RosterPlayer[]
  /** Position assignments */
  assignments?: PositionAssignments
  /** Current mode */
  mode?: 'whiteboard' | 'simulation'
  /** Current statuses for the context player (multiple allowed) */
  currentStatuses?: PlayerStatus[]
  /** Callback when a status is toggled (add/remove) */
  onStatusToggle?: (status: PlayerStatus) => void
  /** Whether this player is currently highlighted */
  isHighlighted?: boolean
  /** Callback to toggle highlight */
  onHighlightToggle?: () => void
  /** Whether the context player has an arrow */
  hasArrow?: boolean
  /** Whether arrow placement can be started */
  canStartArrow?: boolean
  /** Callback to start arrow placement mode */
  onStartArrow?: () => void
  /** Whether a team is currently selected */
  hasTeam?: boolean
  /** Callback to open roster management */
  onManageRoster?: () => void
  /** Callback to assign a player to a role */
  onPlayerAssign?: (role: Role, playerId: string | undefined) => void
}

export function PlayerContextUI({
  contextPlayer,
  onContextPlayerChange,
  anchorPosition,
  roster = [],
  assignments = {},
  mode = 'whiteboard',
  currentStatuses = [],
  onStatusToggle,
  isHighlighted,
  onHighlightToggle,
  hasArrow,
  canStartArrow,
  onStartArrow,
  hasTeam,
  onManageRoster,
  onPlayerAssign,
}: PlayerContextUIProps) {
  const isMobile = useIsMobile()
  const isOpen = contextPlayer !== null

  // For portal - only render on client (SSR-safe)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Desktop popover position state - must be declared before any returns
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)

  // Calculate desktop popover position when anchor changes
  // Tries to position to the right of token, but flips/adjusts to stay in viewport
  useEffect(() => {
    if (!isOpen || !anchorPosition || isMobile) {
      setPosition(null)
      return
    }

    const POPOVER_WIDTH = 224 // w-56 = 14rem = 224px
    const POPOVER_HEIGHT = 520 // Approximate max height (header + roster picker + status buttons)
    const GAP = 20 // Gap between token and popover
    const VIEWPORT_PADDING = 12 // Minimum distance from viewport edge

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Try positioning to the right first
    let left = anchorPosition.x + GAP
    let top = anchorPosition.y - POPOVER_HEIGHT / 2

    // Check if it overflows the right edge - if so, flip to left side
    if (left + POPOVER_WIDTH > viewportWidth - VIEWPORT_PADDING) {
      left = anchorPosition.x - POPOVER_WIDTH - GAP
    }

    // If it still overflows the left edge, position at left padding
    if (left < VIEWPORT_PADDING) {
      left = VIEWPORT_PADDING
    }

    // Constrain vertical position to stay within viewport
    if (top < VIEWPORT_PADDING) {
      top = VIEWPORT_PADDING
    }
    if (top + POPOVER_HEIGHT > viewportHeight - VIEWPORT_PADDING) {
      top = viewportHeight - POPOVER_HEIGHT - VIEWPORT_PADDING
    }

    setPosition({ left, top })
  }, [isOpen, anchorPosition, isMobile])

  // Close handler
  const handleClose = () => {
    onContextPlayerChange(null)
  }

  // Handle Escape key to close popover (desktop only)
  useEffect(() => {
    if (!isOpen || isMobile) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onContextPlayerChange(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isMobile, onContextPlayerChange])

  // Mobile: Use bottom sheet
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto px-6 pt-6 pb-8">
          <VisuallyHidden>
            <SheetTitle>Player options</SheetTitle>
            <SheetDescription>Options for the selected player</SheetDescription>
          </VisuallyHidden>
          {contextPlayer && (
            <PlayerContextContent
              role={contextPlayer}
              roster={roster}
              assignments={assignments}
              mode={mode}
              currentStatuses={currentStatuses}
              onStatusToggle={onStatusToggle}
              isHighlighted={isHighlighted}
              onHighlightToggle={onHighlightToggle}
              hasArrow={hasArrow}
              canStartArrow={canStartArrow}
              onStartArrow={onStartArrow ? () => {
                handleClose()
                onStartArrow()
              } : undefined}
              isMobile={true}
              hasTeam={hasTeam}
              onManageRoster={onManageRoster ? () => {
                handleClose()
                onManageRoster()
              } : undefined}
              onPlayerAssign={onPlayerAssign}
            />
          )}
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: Don't render until mounted (client-side) and position is calculated
  // Use portal to render outside the transformed container
  if (!mounted || !isOpen || !anchorPosition || !position) {
    return null
  }

  return createPortal(
    <>
      {/* Invisible backdrop to catch clicks outside */}
      <div
        className="fixed inset-0 z-40"
        onClick={handleClose}
        onPointerDown={handleClose}
      />
      {/* Popover content */}
      <div
        className="fixed z-50 w-56 max-h-[80vh] overflow-y-auto rounded-md border bg-popover p-4 text-popover-foreground shadow-md"
        style={{
          left: position.left,
          top: position.top,
        }}
      >
        <PlayerContextContent
          role={contextPlayer}
          roster={roster}
          assignments={assignments}
          mode={mode}
          currentStatuses={currentStatuses}
          onStatusToggle={onStatusToggle}
          isHighlighted={isHighlighted}
          onHighlightToggle={onHighlightToggle}
          hasArrow={hasArrow}
          canStartArrow={canStartArrow}
          onStartArrow={onStartArrow}
          isMobile={false}
          hasTeam={hasTeam}
          onManageRoster={onManageRoster ? () => {
            handleClose()
            onManageRoster()
          } : undefined}
          onPlayerAssign={onPlayerAssign}
        />
      </div>
    </>,
    document.body
  )
}
