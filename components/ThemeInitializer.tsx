"use client"

import { useEffect, useRef } from "react"

import {
  applyTheme,
  DEFAULT_THEME,
} from "@/lib/themes"
import { useThemeStore } from "@/store/useThemeStore"

const ThemeInitializer = () => {
  const theme = useThemeStore((state) => state.theme)
  const themePreference = useThemeStore((state) => state.themePreference)
  const setResolvedTheme = useThemeStore((state) => state.setResolvedTheme)
  const setAutoTimeZone = useThemeStore((state) => state.setAutoTimeZone)
  const lastAppliedTheme = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || themePreference !== 'auto') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const syncAutoTheme = () => {
      setResolvedTheme(mediaQuery.matches ? 'dark' : 'light')
      try {
        const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (detectedTimeZone) {
          setAutoTimeZone(detectedTimeZone)
        }
      } catch {
        // Keep prior timezone if runtime cannot resolve it.
      }
    }

    syncAutoTheme()

    const handleChange = () => {
      syncAutoTheme()
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [themePreference, setAutoTimeZone, setResolvedTheme])

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const themeToApply = theme ?? DEFAULT_THEME
    
    // Only apply if theme has actually changed
    if (lastAppliedTheme.current !== themeToApply) {
      lastAppliedTheme.current = themeToApply
      applyTheme(themeToApply)
    }
  }, [theme])

  return null
}

export default ThemeInitializer

