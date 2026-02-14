"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ThemePreference } from "@/lib/themes"
import { useThemeStore } from "@/store/useThemeStore"
import { Moon, Sun, SunMoon } from "lucide-react"

const OPTIONS: Array<{
  id: ThemePreference
  label: string
  icon: typeof Sun
}> = [
  { id: 'auto', label: 'Auto', icon: SunMoon },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
]

const ThemePicker = () => {
  const themePreference = useThemeStore((state) => state.themePreference)
  const setThemePreference = useThemeStore((state) => state.setThemePreference)

  return (
    <div className="inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5">
      {OPTIONS.map((option) => {
        const Icon = option.icon
        const isActive = option.id === themePreference

        return (
          <Button
            key={option.id}
            type="button"
            size="sm"
            variant={isActive ? 'default' : 'ghost'}
            className={cn(
              'h-7 gap-1.5 px-2 text-xs',
              !isActive && 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setThemePreference(option.id)}
            aria-pressed={isActive}
            aria-label={`Use ${option.label.toLowerCase()} theme mode`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{option.label}</span>
          </Button>
        )
      })}
    </div>
  )
}

export default ThemePicker
