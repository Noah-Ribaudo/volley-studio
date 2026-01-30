'use client'

import { useState, useCallback } from 'react'
import { Rotation, ROTATIONS, Role } from '@/lib/types'
import { getWhiteboardPositions } from '@/lib/whiteboard'
import { VolleyballCourt } from '@/components/court'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation'
import { Cancel01Icon, ArrowLeft02Icon, ArrowRight02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

interface QuickLookViewProps {
  initialRotation?: Rotation
  onClose: () => void
}

/**
 * Quick Look mode: A dead-simple rotation reference.
 *
 * - Tap a rotation number to see it
 * - Swipe left/right to navigate between rotations
 * - Shows the serve receive formation (most common use case)
 * - Full-screen, distraction-free
 */
export function QuickLookView({ initialRotation = 1, onClose }: QuickLookViewProps) {
  const [currentRotation, setCurrentRotation] = useState<Rotation>(initialRotation)

  // Get positions for current rotation in serve receive
  const positions = getWhiteboardPositions({
    rotation: currentRotation,
    phase: 'SERVE_RECEIVE',
    isReceiving: true,
    showBothSides: false,
    baseOrder: ['S', 'OH1', 'MB1', 'OPP', 'OH2', 'MB2'],
    attackBallPosition: null,
  })

  // Navigation helpers
  const goToNext = useCallback(() => {
    setCurrentRotation(prev => {
      const idx = ROTATIONS.indexOf(prev)
      return ROTATIONS[(idx + 1) % ROTATIONS.length]
    })
  }, [])

  const goToPrev = useCallback(() => {
    setCurrentRotation(prev => {
      const idx = ROTATIONS.indexOf(prev)
      return ROTATIONS[(idx - 1 + ROTATIONS.length) % ROTATIONS.length]
    })
  }, [])

  // Swipe navigation
  const { swipeState, handlers } = useSwipeNavigation({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrev,
    threshold: 40,
  })

  // Visual feedback during swipe
  const swipeOffset = swipeState.swiping ? swipeState.delta.x * 0.3 : 0

  return (
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      {...handlers}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-10 w-10"
        >
          <HugeiconsIcon icon={Cancel01Icon} className="h-5 w-5" />
        </Button>

        <h1 className="text-lg font-bold">Quick Look</h1>

        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Rotation tabs - large, easy to tap */}
      <div className="flex items-center justify-center gap-2 px-4 py-4 bg-muted/30">
        {ROTATIONS.map((rotation) => (
          <button
            key={rotation}
            onClick={() => setCurrentRotation(rotation)}
            className={cn(
              "h-14 w-14 rounded-xl text-lg font-bold transition-all",
              "flex items-center justify-center",
              rotation === currentRotation
                ? "bg-primary text-primary-foreground shadow-md scale-105"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            )}
          >
            {rotation}
          </button>
        ))}
      </div>

      {/* Court view with swipe feedback */}
      <div
        className="flex-1 flex items-center justify-center p-4 overflow-hidden"
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeState.swiping ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        <div className="w-full max-w-md aspect-[2/3]">
          <VolleyballCourt
            mode="whiteboard"
            positions={positions.home}
            highlightedRole={null}
            rotation={currentRotation}
            baseOrder={['S', 'OH1', 'MB1', 'OPP', 'OH2', 'MB2']}
            roster={[]}
            assignments={{}}
            editable={false}
            animationMode="css"
            animationConfig={{ durationMs: 300, easingFn: 'cubic' }}
            arrows={{}}
            arrowCurves={{}}
            showLibero={false}
            showPosition={true}
            showPlayer={false}
            circleTokens={true}
            tokenScaleDesktop={1.8}
            tokenScaleMobile={1.8}
            legalityViolations={[]}
            currentPhase="SERVE_RECEIVE"
          />
        </div>
      </div>

      {/* Navigation hints */}
      <div className="flex items-center justify-between px-6 py-4 text-muted-foreground">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={ArrowLeft02Icon} className="h-4 w-4" />
          <span className="text-sm">Swipe for previous</span>
        </div>
        <div className="text-sm font-medium">
          Rotation {currentRotation} of 6
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Swipe for next</span>
          <HugeiconsIcon icon={ArrowRight02Icon} className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}
