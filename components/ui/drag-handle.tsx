'use client'

import { cn } from '@/lib/utils'

interface DragHandleProps {
  className?: string
  /** Show a visual grip indicator */
  showGrip?: boolean
  /** Position of the grip indicator */
  gripPosition?: 'left' | 'center'
}

/**
 * Visual affordance component for draggable areas.
 * Use this to indicate that an area can be dragged.
 */
export function DragHandle({
  className,
  showGrip = true,
  gripPosition = 'center'
}: DragHandleProps) {
  if (!showGrip) {
    return null
  }

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 select-none pointer-events-none",
        gripPosition === 'center' && "justify-center",
        className
      )}
      aria-hidden="true"
    >
      {/* Grip dots */}
      <div className="flex gap-0.5">
        <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
        <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
      </div>
      <div className="flex gap-0.5">
        <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
        <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
      </div>
      <div className="flex gap-0.5">
        <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
        <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
      </div>
    </div>
  )
}
