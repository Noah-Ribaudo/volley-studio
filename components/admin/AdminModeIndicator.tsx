'use client'

import { useAdminStore } from '@/store/useAdminStore'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PRESET_SYSTEMS, PRESET_SYSTEM_INFO, type PresetSystem } from '@/lib/database.types'

export function AdminModeIndicator() {
  const {
    isAdminMode,
    selectedSystem,
    setSelectedSystem,
    exitAdminMode,
    hasUnsavedChanges,
  } = useAdminStore()

  if (!isAdminMode) {
    return null
  }

  const systemInfo = selectedSystem ? PRESET_SYSTEM_INFO[selectedSystem] : null

  return (
    <div className="fixed top-16 left-4 md:top-4 md:left-72 z-50 flex items-center gap-2">
      {/* Admin badge */}
      <div className="flex items-center gap-2 bg-amber-500/90 backdrop-blur-sm text-black px-3 py-1.5 rounded-full text-sm font-medium shadow-lg">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <span>Admin Mode</span>
        {hasUnsavedChanges && (
          <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" title="Unsaved changes" />
        )}
      </div>

      {/* System selector dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={selectedSystem ? "secondary" : "outline"} size="sm" className="shadow-lg">
            {systemInfo ? systemInfo.name : "Select System..."}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-1"
            >
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Edit System Presets</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {PRESET_SYSTEMS.map((system) => (
            <DropdownMenuItem
              key={system}
              onClick={() => setSelectedSystem(system)}
              className={selectedSystem === system ? 'bg-accent' : ''}
            >
              <div className="flex flex-col">
                <span className="font-medium">{PRESET_SYSTEM_INFO[system].name}</span>
                <span className="text-xs text-muted-foreground">
                  {PRESET_SYSTEM_INFO[system].description}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={exitAdminMode} className="text-destructive">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" x2="9" y1="12" y2="12"/>
            </svg>
            Exit Admin Mode
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
