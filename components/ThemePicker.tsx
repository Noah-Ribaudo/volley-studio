"use client"

import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ThemeId } from "@/lib/themes"
import { useThemeStore } from "@/store/useThemeStore"
import { Sun, Moon } from "lucide-react"

const ThemePicker = () => {
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)

  const toggleTheme = useCallback(() => {
    const nextTheme: ThemeId = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
  }, [theme, setTheme])

  const isDark = theme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  )
}

export default ThemePicker
