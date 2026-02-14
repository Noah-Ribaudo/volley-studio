"use client"

import { useEffect, useRef } from "react"

import {
  applyTheme,
  DEFAULT_AUTO_TIMEZONE,
  DEFAULT_THEME,
  resolveThemeByHour,
  resolveThemeFromDaylight,
} from "@/lib/themes"
import { useThemeStore } from "@/store/useThemeStore"

const ThemeInitializer = () => {
  const theme = useThemeStore((state) => state.theme)
  const themePreference = useThemeStore((state) => state.themePreference)
  const autoTimeZone = useThemeStore((state) => state.autoTimeZone)
  const setResolvedTheme = useThemeStore((state) => state.setResolvedTheme)
  const setAutoTimeZone = useThemeStore((state) => state.setAutoTimeZone)
  const lastAppliedTheme = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (themePreference !== 'auto') return

    let isCancelled = false

    const applyAutoTheme = async () => {
      try {
        const response = await fetch('/api/theme-context', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`Theme context request failed with ${response.status}`)
        }

        const payload = await response.json() as { timeZone?: string; isDaylight?: boolean }
        if (isCancelled) return

        const timeZone = payload.timeZone || DEFAULT_AUTO_TIMEZONE
        const isDaylight = payload.isDaylight ?? false
        setAutoTimeZone(timeZone)
        setResolvedTheme(resolveThemeFromDaylight(isDaylight))
      } catch {
        if (isCancelled) return
        try {
          const hour = Number(
            new Intl.DateTimeFormat('en-US', {
              hour: 'numeric',
              hourCycle: 'h23',
              timeZone: autoTimeZone || DEFAULT_AUTO_TIMEZONE,
            }).format(new Date())
          )
          setResolvedTheme(resolveThemeByHour(hour))
        } catch {
          setResolvedTheme(resolveThemeByHour(12))
        }
      }
    }

    void applyAutoTheme()
    const interval = window.setInterval(() => {
      void applyAutoTheme()
    }, 15 * 60 * 1000)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void applyAutoTheme()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      isCancelled = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [themePreference, autoTimeZone, setAutoTimeZone, setResolvedTheme])

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



