"use client"

import { useEffect, useRef } from "react"

import { applyTheme, DEFAULT_THEME } from "@/lib/themes"
import { useThemeStore } from "@/store/useThemeStore"

const ThemeInitializer = () => {
  const theme = useThemeStore((state) => state.theme)
  const lastAppliedTheme = useRef<string | null>(null)

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




