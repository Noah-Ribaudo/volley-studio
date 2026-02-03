'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Layout, Users, Timer, Settings, ChevronLeft, ChevronRight, ChevronDown, Play, RotateCcw, Printer } from 'lucide-react'
import { UserMenu } from '@/components/auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore, getCurrentPositions } from '@/store/useAppStore'
import { ROTATIONS, RALLY_PHASES } from '@/lib/types'
import type { RallyPhase, Rotation, Phase } from '@/lib/types'
import { getPhaseInfo } from '@/lib/phaseIcons'
import { PrintDialog } from '@/components/print'
import { getActiveAssignments } from '@/lib/lineups'

const navItems = [
  {
    title: 'Whiteboard',
    url: '/',
    icon: Layout,
  },
  {
    title: 'Teams',
    url: '/teams',
    icon: Users,
  },
  {
    title: 'Game',
    url: '/gametime',
    icon: Timer,
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
  },
]

export function DesktopHeaderNav() {
  const pathname = usePathname()
  const isWhiteboardPage = pathname === '/'
  const [printDialogOpen, setPrintDialogOpen] = useState(false)

  // Only pull from store if on whiteboard page
  const currentRotation = useAppStore((state) => state.currentRotation)
  const currentPhase = useAppStore((state) => state.currentPhase)
  const visiblePhases = useAppStore((state) => state.visiblePhases)
  const setRotation = useAppStore((state) => state.setRotation)
  const setPhase = useAppStore((state) => state.setPhase)
  const nextPhase = useAppStore((state) => state.nextPhase)
  const prevPhase = useAppStore((state) => state.prevPhase)
  const isPreviewingMovement = useAppStore((state) => state.isPreviewingMovement)
  const setPreviewingMovement = useAppStore((state) => state.setPreviewingMovement)
  const triggerPlayAnimation = useAppStore((state) => state.triggerPlayAnimation)
  const currentTeam = useAppStore((state) => state.currentTeam)
  const baseOrder = useAppStore((state) => state.baseOrder)
  const localPositions = useAppStore((state) => state.localPositions)
  const customLayouts = useAppStore((state) => state.customLayouts)

  // Get visible phases
  const phasesToShow = visiblePhases
    ? RALLY_PHASES.filter(p => visiblePhases.has(p))
    : RALLY_PHASES

  // Function to get positions for any rotation/phase (used by print dialog)
  const getPositionsForRotation = (rotation: Rotation, phase: Phase) => {
    return getCurrentPositions(
      rotation,
      phase,
      localPositions,
      customLayouts,
      currentTeam,
      true, // isReceiving
      baseOrder
    )
  }

  return (
    <header className="hidden md:flex items-center h-12 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav className="flex items-center gap-1">
        {navItems.map((item) => {
          const isActive = item.url === '/'
            ? pathname === item.url
            : pathname?.startsWith(item.url)

          return (
            <Link
              key={item.title}
              href={item.url}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>

      {/* Phase and Rotation controls - only on whiteboard */}
      {isWhiteboardPage && (
        <div className="ml-auto flex items-center gap-2">
          {/* Phase selector */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={prevPhase}
              aria-label="Previous phase"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-8 px-3 gap-1.5 w-[160px] justify-between">
                  <span className="text-sm font-medium truncate">
                    {getPhaseInfo(currentPhase).name}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                {phasesToShow.map((phase) => (
                  <DropdownMenuItem
                    key={phase}
                    onClick={() => setPhase(phase)}
                    className={cn(
                      phase === currentPhase && "bg-accent"
                    )}
                  >
                    {getPhaseInfo(phase).name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={nextPhase}
              aria-label="Next phase"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-border" />

          {/* Rotation selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 px-3 gap-1.5">
                <span className="text-sm font-medium">R{currentRotation}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {ROTATIONS.map((rotation) => (
                <DropdownMenuItem
                  key={rotation}
                  onClick={() => setRotation(rotation)}
                  className={cn(
                    rotation === currentRotation && "bg-accent"
                  )}
                >
                  Rotation {rotation}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Divider */}
          <div className="w-px h-6 bg-border" />

          {/* Play/Reset buttons */}
          {isPreviewingMovement ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setPreviewingMovement(false)}
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => {
                triggerPlayAnimation()
                setPreviewingMovement(true)
              }}
            >
              <Play className="h-4 w-4" />
              <span>Play</span>
            </Button>
          )}

          {/* Divider */}
          <div className="w-px h-6 bg-border" />

          {/* Print button */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setPrintDialogOpen(true)}
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </Button>
        </div>
      )}

      {/* User menu - show on right side when not on whiteboard */}
      {!isWhiteboardPage && (
        <div className="ml-auto">
          <UserMenu />
        </div>
      )}

      {/* User menu - show after whiteboard controls */}
      {isWhiteboardPage && (
        <>
          <div className="w-px h-6 bg-border ml-2" />
          <UserMenu />
        </>
      )}

      {/* Print Dialog */}
      <PrintDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        currentRotation={currentRotation}
        currentPhase={currentPhase}
        getPositionsForRotation={getPositionsForRotation}
        roster={currentTeam?.roster}
        assignments={currentTeam ? getActiveAssignments(currentTeam) : undefined}
        baseOrder={baseOrder}
        teamName={currentTeam?.name}
        visiblePhases={phasesToShow}
      />
    </header>
  )
}
