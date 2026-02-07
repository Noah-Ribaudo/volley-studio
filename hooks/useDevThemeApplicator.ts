'use client'

import { useEffect } from 'react'
import { useDevThemeStore } from '@/store/useDevThemeStore'
import { FONT_OPTIONS, DISPLAY_FONT_OPTIONS, getFontOption } from '@/lib/devThemeFonts'

/**
 * Subscribes to the dev theme store and applies overrides as CSS custom
 * properties on document.documentElement.style. Only runs in dev.
 */
export function useDevThemeApplicator() {
  const fontSans = useDevThemeStore((s) => s.fontSans)
  const fontDisplay = useDevThemeStore((s) => s.fontDisplay)
  const accentHue = useDevThemeStore((s) => s.accentHue)
  const accentLightness = useDevThemeStore((s) => s.accentLightness)
  const accentChroma = useDevThemeStore((s) => s.accentChroma)
  const borderRadius = useDevThemeStore((s) => s.borderRadius)
  const letterSpacing = useDevThemeStore((s) => s.letterSpacing)

  useEffect(() => {
    const root = document.documentElement.style

    // Typography
    const sansFont = getFontOption(fontSans, FONT_OPTIONS)
    if (sansFont) root.setProperty('--font-sans', sansFont.cssValue)

    const displayFont = getFontOption(fontDisplay, DISPLAY_FONT_OPTIONS)
    if (displayFont) root.setProperty('--font-display', displayFont.cssValue)

    // Colors
    const chroma = accentChroma / 1000
    root.setProperty('--c-accent', `oklch(${accentLightness}% ${chroma} ${accentHue})`)
    root.setProperty('--primary', `oklch(${accentLightness}% ${chroma} ${accentHue})`)
    root.setProperty('--ring', `oklch(${accentLightness}% ${chroma} ${accentHue})`)

    // Layout
    root.setProperty('--radius', `${borderRadius / 100}rem`)
    root.setProperty('--tracking-tight', `${letterSpacing / 1000}em`)

    return () => {
      // Clean up on unmount
      root.removeProperty('--font-sans')
      root.removeProperty('--font-display')
      root.removeProperty('--c-accent')
      root.removeProperty('--primary')
      root.removeProperty('--ring')
      root.removeProperty('--radius')
      root.removeProperty('--tracking-tight')
    }
  }, [fontSans, fontDisplay, accentHue, accentLightness, accentChroma, borderRadius, letterSpacing])
}
