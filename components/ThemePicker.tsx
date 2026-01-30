"use client"

import { useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { THEME_OPTIONS, ThemeId } from "@/lib/themes"
import { cn } from "@/lib/utils"
import { useThemeStore } from "@/store/useThemeStore"

const ThemePicker = () => {
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)

  const handleSelectTheme = useCallback((nextTheme: ThemeId) => {
    if (nextTheme === theme) return
    setTheme(nextTheme)
  }, [theme, setTheme])

  const themeButtons = useMemo(() => {
    return THEME_OPTIONS.map((option) => {
      const isActive = theme === option.id
      return (
        <Tooltip key={option.id}>
          <TooltipTrigger asChild>
            <Button
              variant={isActive ? "default" : "ghost"}
              size="icon-sm"
              aria-label={`Use ${option.label} theme`}
              aria-pressed={isActive}
              data-active={isActive}
              onClick={() => handleSelectTheme(option.id)}
              className={cn(
                "rounded-full border border-border/60 transition-all",
                "data-[active=true]:ring-2 data-[active=true]:ring-primary/55 data-[active=true]:ring-offset-2 data-[active=true]:ring-offset-background data-[active=true]:shadow-md",
                "hover:translate-y-[-1px] hover:shadow-sm"
              )}
            >
              <span className="flex h-5 w-5 overflow-hidden rounded-full ring-1 ring-border/60">
                {option.swatch.map((color, index) => (
                  <span
                    key={`${option.id}-${index}`}
                    className="flex-1"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[220px]">
            <p className="text-xs font-semibold leading-tight">{option.label}</p>
            <p className="text-[11px] text-muted-foreground leading-snug">{option.description}</p>
          </TooltipContent>
        </Tooltip>
      )
    })
  }, [theme, handleSelectTheme])

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={0}>
      <div className="flex items-center gap-2">
        <span className="hidden text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:inline">
          Theme
        </span>
        <div className="flex items-center gap-1">
          {themeButtons}
        </div>
      </div>
    </TooltipProvider>
  )
}

export default ThemePicker




