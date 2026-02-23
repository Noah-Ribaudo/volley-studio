'use client'

import { createContext, useContext } from 'react'
import { useWhiteboardDialStore, DIAL_DEFAULTS, type WhiteboardDialValues } from '@/store/useWhiteboardDialStore'
import { useUIPrefsStore } from '@/store/useUIPrefsStore'
import { SPRING } from '@/lib/motion-utils'
import type { SpringOptions } from 'motion'

export type WhiteboardDialContext = WhiteboardDialValues & {
  /** Resolved spring config based on preset + overrides */
  resolvedSpring: SpringOptions
}

const STATIC_DEFAULTS: WhiteboardDialContext = {
  ...DIAL_DEFAULTS,
  resolvedSpring: SPRING[DIAL_DEFAULTS.springPreset],
}

const Ctx = createContext<WhiteboardDialContext | null>(null)

/**
 * Inner provider that subscribes to every dial value.
 * Only mounted when the DialKit panel is open — zero overhead otherwise.
 */
function WhiteboardDialProviderActive({ children }: { children: React.ReactNode }) {
  const tokenBaseSizePositionOnly = useWhiteboardDialStore((s) => s.tokenBaseSizePositionOnly)
  const tokenBaseSizePlayer = useWhiteboardDialStore((s) => s.tokenBaseSizePlayer)
  const tokenCornerRadius = useWhiteboardDialStore((s) => s.tokenCornerRadius)
  const tokenDragScale = useWhiteboardDialStore((s) => s.tokenDragScale)
  const tokenDragShadowBlur = useWhiteboardDialStore((s) => s.tokenDragShadowBlur)
  const tokenDragShadowOpacity = useWhiteboardDialStore((s) => s.tokenDragShadowOpacity)
  const tokenDimmedOpacity = useWhiteboardDialStore((s) => s.tokenDimmedOpacity)
  const tokenInnerHighlight = useWhiteboardDialStore((s) => s.tokenInnerHighlight)
  const tokenBorderWidth = useWhiteboardDialStore((s) => s.tokenBorderWidth)
  const tokenSelectedBorderWidth = useWhiteboardDialStore((s) => s.tokenSelectedBorderWidth)
  const arrowheadSizeMultiplier = useWhiteboardDialStore((s) => s.arrowheadSizeMultiplier)
  const arrowheadAngle = useWhiteboardDialStore((s) => s.arrowheadAngle)
  const arrowStartDotRadius = useWhiteboardDialStore((s) => s.arrowStartDotRadius)
  const arrowStartDotOpacity = useWhiteboardDialStore((s) => s.arrowStartDotOpacity)
  const arrowheadOpacity = useWhiteboardDialStore((s) => s.arrowheadOpacity)
  const arrowHitAreaWidth = useWhiteboardDialStore((s) => s.arrowHitAreaWidth)
  const arrowCurveHandleRadius = useWhiteboardDialStore((s) => s.arrowCurveHandleRadius)
  const arrowCurveHandleHitRadius = useWhiteboardDialStore((s) => s.arrowCurveHandleHitRadius)
  const arrowDrawInDuration = useWhiteboardDialStore((s) => s.arrowDrawInDuration)
  const arrowPeekRevealDuration = useWhiteboardDialStore((s) => s.arrowPeekRevealDuration)
  const arrowPeekRetractDuration = useWhiteboardDialStore((s) => s.arrowPeekRetractDuration)
  const tokenTransitionMs = useWhiteboardDialStore((s) => s.tokenTransitionMs)
  const springPreset = useWhiteboardDialStore((s) => s.springPreset)
  const springStiffness = useWhiteboardDialStore((s) => s.springStiffness)
  const springDamping = useWhiteboardDialStore((s) => s.springDamping)
  const glowColor = useWhiteboardDialStore((s) => s.glowColor)
  const glowPulseDuration = useWhiteboardDialStore((s) => s.glowPulseDuration)
  const glowMinOpacity = useWhiteboardDialStore((s) => s.glowMinOpacity)
  const glowMaxOpacity = useWhiteboardDialStore((s) => s.glowMaxOpacity)
  const glowMinStrokeWidth = useWhiteboardDialStore((s) => s.glowMinStrokeWidth)
  const glowMaxStrokeWidth = useWhiteboardDialStore((s) => s.glowMaxStrokeWidth)
  const glowOffset = useWhiteboardDialStore((s) => s.glowOffset)

  const presetSpring = SPRING[springPreset]
  const resolvedSpring: SpringOptions = {
    stiffness: springStiffness !== presetSpring.stiffness ? springStiffness : presetSpring.stiffness,
    damping: springDamping !== presetSpring.damping ? springDamping : presetSpring.damping,
  }

  const value: WhiteboardDialContext = {
    tokenBaseSizePositionOnly, tokenBaseSizePlayer, tokenCornerRadius,
    tokenDragScale, tokenDragShadowBlur, tokenDragShadowOpacity,
    tokenDimmedOpacity, tokenInnerHighlight, tokenBorderWidth, tokenSelectedBorderWidth,
    arrowheadSizeMultiplier, arrowheadAngle, arrowStartDotRadius,
    arrowStartDotOpacity, arrowheadOpacity, arrowHitAreaWidth,
    arrowCurveHandleRadius, arrowCurveHandleHitRadius,
    arrowDrawInDuration, arrowPeekRevealDuration, arrowPeekRetractDuration, tokenTransitionMs,
    springPreset, springStiffness, springDamping,
    glowColor, glowPulseDuration, glowMinOpacity, glowMaxOpacity,
    glowMinStrokeWidth, glowMaxStrokeWidth, glowOffset,
    resolvedSpring,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/**
 * Conditionally activates dial overrides.
 * When the DialKit panel is closed the provider is a no-op pass-through:
 * no store subscriptions, no extra renders, components use hardcoded defaults.
 */
export function WhiteboardDialProvider({ children }: { children: React.ReactNode }) {
  const panelOpen = useUIPrefsStore((s) => s.showWhiteboardDialKit)

  if (!panelOpen) {
    return <>{children}</>
  }

  return <WhiteboardDialProviderActive>{children}</WhiteboardDialProviderActive>
}

/**
 * Read whiteboard dial values from context.
 * Returns hardcoded defaults when the DialKit panel is closed (no context
 * provided), so production rendering is completely unchanged.
 */
export function useWhiteboardDials(): WhiteboardDialContext {
  const ctx = useContext(Ctx)
  if (ctx) return ctx
  return STATIC_DEFAULTS
}
