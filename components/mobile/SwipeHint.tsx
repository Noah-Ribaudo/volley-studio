'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { ArrowLeft02Icon, ArrowRight02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

interface SwipeHintProps {
  /** Whether to show the hint */
  show?: boolean
  /** Direction to indicate */
  direction?: 'left' | 'right' | 'both'
  /** Custom className */
  className?: string
  /** Auto-hide after milliseconds (0 = never) */
  autoHideMs?: number
  /** Storage key for "don't show again" */
  storageKey?: string
}

/**
 * A subtle visual hint that teaches users they can swipe.
 * Shows animated arrows that fade out after a few seconds.
 * Remembers if user has seen it before.
 */
export function SwipeHint({
  show = true,
  direction = 'both',
  className,
  autoHideMs = 3000,
  storageKey = 'swipe-hint-seen',
}: SwipeHintProps) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Check if user has seen this hint before
  useEffect(() => {
    if (typeof window === 'undefined') return
    const seen = localStorage.getItem(storageKey)
    if (seen) {
      setDismissed(true)
    } else {
      setVisible(true)
    }
  }, [storageKey])

  // Auto-hide after delay
  useEffect(() => {
    if (!visible || autoHideMs === 0) return

    const timer = setTimeout(() => {
      setVisible(false)
      if (storageKey) {
        localStorage.setItem(storageKey, 'true')
      }
    }, autoHideMs)

    return () => clearTimeout(timer)
  }, [visible, autoHideMs, storageKey])

  if (!show || dismissed || !visible) return null

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-24 flex items-center justify-center pointer-events-none z-30",
        "animate-in fade-in duration-500",
        className
      )}
    >
      <div className="flex items-center gap-4 px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg">
        {(direction === 'left' || direction === 'both') && (
          <div className="flex items-center gap-1 text-muted-foreground animate-pulse">
            <HugeiconsIcon icon={ArrowLeft02Icon} className="h-4 w-4" />
            <span className="text-xs">Previous</span>
          </div>
        )}

        <span className="text-xs text-muted-foreground">Swipe to navigate</span>

        {(direction === 'right' || direction === 'both') && (
          <div className="flex items-center gap-1 text-muted-foreground animate-pulse">
            <span className="text-xs">Next</span>
            <HugeiconsIcon icon={ArrowRight02Icon} className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  )
}
