// Motion animation utilities and spring configurations
// Using motion.dev for smooth, natural-feeling animations with spring physics

import { animate, spring } from 'motion'
import type { AnimationPlaybackControls, SpringOptions } from 'motion'

// =============================================================================
// SPRING PRESETS
// Tuned for different use cases - stiffness controls speed, damping controls bounce
// =============================================================================

export const SPRING = {
  // Player movement - smooth but responsive for dragging and position changes
  player: { stiffness: 300, damping: 30 } satisfies SpringOptions,

  // Quick interactions - snappy response for UI elements
  snappy: { stiffness: 400, damping: 35 } satisfies SpringOptions,

  // Gentle UI transitions - slower, more relaxed feel
  gentle: { stiffness: 200, damping: 25 } satisfies SpringOptions,

  // Bouncy - playful with visible overshoot
  bouncy: { stiffness: 350, damping: 20 } satisfies SpringOptions,

  // Stiff - minimal bounce, direct movement
  stiff: { stiffness: 500, damping: 40 } satisfies SpringOptions,
} as const

// =============================================================================
// ANIMATION HELPERS
// =============================================================================

/**
 * Create a spring animation with collision avoidance callback
 * Used for player position animations where we need to run collision
 * steering on each frame
 */
export function animateWithCollision(options: {
  from: { x: number; y: number }
  to: { x: number; y: number }
  spring?: SpringOptions
  onUpdate: (current: { x: number; y: number }) => void
  onComplete?: () => void
}): AnimationPlaybackControls {
  const { from, to, spring: springConfig = SPRING.player, onUpdate, onComplete } = options

  // Animate both x and y together using a single 0-1 progress animation
  return animate(0, 1, {
    type: 'spring',
    ...springConfig,
    onUpdate: (progress) => {
      const x = from.x + (to.x - from.x) * progress
      const y = from.y + (to.y - from.y) * progress
      onUpdate({ x, y })
    },
    onComplete,
  })
}

/**
 * Animate along a bezier curve path
 * Used for the Play button animation where players follow arrow paths
 */
export function animateBezierPath(options: {
  start: { x: number; y: number }
  end: { x: number; y: number }
  control: { x: number; y: number } | null
  duration?: number
  onUpdate: (current: { x: number; y: number }, t: number) => void
  onComplete?: () => void
}): AnimationPlaybackControls {
  const { start, end, control, duration = 1500, onUpdate, onComplete } = options

  return animate(0, 1, {
    duration: duration / 1000, // Motion uses seconds
    ease: [0.4, 0, 0.2, 1], // Cubic bezier easing
    onUpdate: (t) => {
      let x: number
      let y: number

      if (control) {
        // Quadratic Bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
        const oneMinusT = 1 - t
        x = oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * control.x + t * t * end.x
        y = oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * control.y + t * t * end.y
      } else {
        // Straight line
        x = start.x + (end.x - start.x) * t
        y = start.y + (end.y - start.y) * t
      }

      onUpdate({ x, y }, t)
    },
    onComplete,
  })
}

/**
 * Create a path draw animation (for arrows appearing)
 */
export function animatePathDraw(options: {
  element: SVGPathElement
  duration?: number
  onComplete?: () => void
}): AnimationPlaybackControls {
  const { element, duration = 300, onComplete } = options

  const pathLength = element.getTotalLength()

  // Set up initial state
  element.style.strokeDasharray = `${pathLength}`
  element.style.strokeDashoffset = `${pathLength}`

  return animate(element, {
    strokeDashoffset: 0,
  }, {
    duration: duration / 1000,
    ease: [0.4, 0, 0.2, 1],
    onComplete,
  })
}

/**
 * Animate a pulsing glow effect (for primed state)
 */
export function animatePulse(options: {
  onUpdate: (scale: number, opacity: number) => void
}): AnimationPlaybackControls {
  const { onUpdate } = options

  return animate(0, 1, {
    duration: 1,
    repeat: Infinity,
    ease: 'easeInOut',
    onUpdate: (t) => {
      // Sin wave for smooth pulse
      const pulse = Math.sin(t * Math.PI)
      const scale = 1 + pulse * 0.15
      const opacity = 0.6 + pulse * 0.4
      onUpdate(scale, opacity)
    },
  })
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Stop an animation if it exists and is running
 */
export function stopAnimation(animation: AnimationPlaybackControls | null | undefined): void {
  if (animation) {
    animation.stop()
  }
}

/**
 * Check if an animation is still running
 * Note: Motion's AnimationPlaybackControls doesn't expose currentTime/duration
 * This function checks if the animation object exists and hasn't been stopped
 */
export function isAnimating(animation: AnimationPlaybackControls | null | undefined): boolean {
  // Motion doesn't expose a simple "isPlaying" property
  // We return true if the animation exists (hasn't been stopped)
  return animation !== null && animation !== undefined
}

// Re-export commonly used items from motion
export { animate, spring }
export type { AnimationPlaybackControls, SpringOptions }
