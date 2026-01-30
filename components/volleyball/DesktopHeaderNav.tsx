'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Layout, Users, Timer, Settings, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/store/useAppStore'
import { ROTATIONS, RALLY_PHASES } from '@/lib/types'
import type { RallyPhase } from '@/lib/types'
import { getPhaseInfo } from '@/lib/phaseIcons'

const navItems = [
  {
    title: 'Whiteboard',
    url: '/volleyball',
    icon: Layout,
  },
  {
    title: 'Teams',
    url: '/volleyball/roster',
    icon: Users,
  },
  {
    title: 'Game',
    url: '/volleyball/gametime',
    icon: Timer,
  },
  {
    title: 'Settings',
    url: '/volleyball/settings',
    icon: Settings,
  },
]

export function DesktopHeaderNav() {
  const pathname = usePathname()
  const isWhiteboardPage = pathname === '/volleyball'

  // Only pull from store if on whiteboard page
  const currentRotation = useAppStore((state) => state.currentRotation)
  const currentPhase = useAppStore((state) => state.currentPhase)
  const visiblePhases = useAppStore((state) => state.visiblePhases)
  const setRotation = useAppStore((state) => state.setRotation)
  const setPhase = useAppStore((state) => state.setPhase)
  const nextPhase = useAppStore((state) => state.nextPhase)
  const prevPhase = useAppStore((state) => state.prevPhase)

  // Get visible phases
  const phasesToShow = visiblePhases
    ? RALLY_PHASES.filter(p => visiblePhases.has(p))
    : RALLY_PHASES

  return (
    <header className="hidden md:flex items-center h-12 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav className="flex items-center gap-1">
        {navItems.map((item) => {
          const isActive = item.url === '/volleyball'
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
                <Button variant="outline" className="h-8 px-3 gap-1.5 min-w-[100px]">
                  <span className="text-sm font-medium">
                    {getPhaseInfo(currentPhase).name}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
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
        </div>
      )}
    </header>
  )
}
