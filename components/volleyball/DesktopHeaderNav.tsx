'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Layout, Users, Timer, Settings, ChevronLeft, ChevronRight, ChevronDown, Play, RotateCcw, Printer } from 'lucide-react'
import VolleyBall from '@/components/logo/VolleyBall'
import { useGameTimeStore } from '@/store/useGameTimeStore'
import { UserMenu } from '@/components/auth'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/store/useAppStore'
import { ROTATIONS, RALLY_PHASES, type RallyPhase } from '@/lib/types'
import { getPhaseInfo } from '@/lib/phaseIcons'

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

interface DesktopHeaderNavProps {
  onOpenPrintDialog?: () => void
  onOpenCourtSetup?: (anchorRect?: DOMRect) => void
  showNav?: boolean
}

export function DesktopHeaderNav({
  onOpenPrintDialog,
  onOpenCourtSetup,
  showNav = true,
}: DesktopHeaderNavProps) {
  const pathname = usePathname()
  const isWhiteboardPage = pathname === '/'
  const gamePhase = useGameTimeStore((s) => s.phase)
  const hasActiveGame = gamePhase === 'playing'

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
  const showPrintFeature = useAppStore((state) => state.showPrintFeature)
  const sidebarProfileInFooter = useAppStore((state) => state.sidebarProfileInFooter)
  const phaseTrackRef = useRef<HTMLDivElement | null>(null)
  const phaseButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Get visible phases
  const enabledPhases = visiblePhases
    ? RALLY_PHASES.filter(p => visiblePhases.has(p))
    : RALLY_PHASES
  const phaseSeen = new Set<RallyPhase>()
  const phasesToShow = enabledPhases.filter((phase) => {
    if (phaseSeen.has(phase)) return false
    phaseSeen.add(phase)
    return true
  })

  useEffect(() => {
    const track = phaseTrackRef.current
    const activeButton = phaseButtonRefs.current[currentPhase]
    if (!track || !activeButton) return

    const trackRect = track.getBoundingClientRect()
    const buttonRect = activeButton.getBoundingClientRect()
    const leftOverflow = buttonRect.left - trackRect.left
    const rightOverflow = buttonRect.right - trackRect.right

    if (leftOverflow < 0 || rightOverflow > 0) {
      const target = activeButton.offsetLeft - (track.clientWidth - activeButton.clientWidth) / 2
      track.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
    }
  }, [currentPhase, phasesToShow.length])

  return (
    <header className="hidden md:flex items-center h-12 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {showNav ? (
        <>
          <Link href="/" className="mr-2 flex items-center gap-1.5 hover:opacity-80 transition-opacity">
            <VolleyBall size={20} fillColor="#f97316" />
            <span className="text-sm font-semibold text-foreground">Volley Studio</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = item.url === '/'
                ? pathname === item.url
                : pathname?.startsWith(item.url)

              const showGameDot = item.url === '/gametime' && hasActiveGame && !isActive

              return (
                <Link
                  key={item.title}
                  href={item.url}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors relative',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <div className="relative">
                    <item.icon className="h-4 w-4" />
                    {showGameDot && (
                      <div className="absolute -top-0.5 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </div>
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </nav>
        </>
      ) : (
        <div className="flex items-center">
          <SidebarTrigger className="h-8 w-8" />
        </div>
      )}

      {/* Phase and Rotation controls - only on whiteboard */}
      {isWhiteboardPage && (
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/40 px-2 py-1 shadow-sm">
            {/* Phase selector */}
            <div className="flex items-center gap-1 min-w-[13rem] max-w-[min(48rem,46vw)]">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={prevPhase}
                aria-label="Previous phase"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="h-8 min-w-[8rem] rounded-md bg-background/80 px-1 max-w-[min(42rem,40vw)]">
                <div
                  ref={phaseTrackRef}
                  className="flex h-full items-center gap-1 overflow-x-auto scrollbar-hide"
                >
                  {phasesToShow.map((phase) => (
                    <Button
                      key={phase}
                      ref={(el) => {
                        phaseButtonRefs.current[phase] = el
                      }}
                      variant={phase === currentPhase ? 'default' : 'ghost'}
                      size="sm"
                      className={cn(
                        'h-7 w-auto max-w-[11.5rem] shrink-0 justify-center px-2.5 text-xs font-medium',
                        phase !== currentPhase && 'text-muted-foreground hover:text-foreground'
                      )}
                      onClick={() => setPhase(phase)}
                      aria-pressed={phase === currentPhase}
                    >
                      <span className="truncate">{getPhaseInfo(phase).name}</span>
                    </Button>
                  ))}
                </div>
              </div>

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

            {/* Rotation selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-8 px-3 gap-1.5 bg-background/80">
                  <span className="text-sm font-medium hidden xl:inline">Rotation {currentRotation}</span>
                  <span className="text-sm font-medium xl:hidden">R{currentRotation}</span>
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

          {/* Play/Reset button */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-24 gap-1.5 bg-background/70"
            onClick={() => {
              if (isPreviewingMovement) {
                setPreviewingMovement(false)
                return
              }

              triggerPlayAnimation()
              setPreviewingMovement(true)
            }}
          >
            {isPreviewingMovement ? (
              <>
                <RotateCcw className="h-4 w-4" />
                <span>Reset</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Play</span>
              </>
            )}
          </Button>

          {/* Court setup trigger */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={(event) => onOpenCourtSetup?.(event.currentTarget.getBoundingClientRect())}
            title="Open court setup"
          >
            <span>Court Setup</span>
          </Button>

          {/* Print button - dev toggle */}
          {showPrintFeature && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => onOpenPrintDialog?.()}
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </Button>
          )}
        </div>
      )}

      {/* User menu - show on right side when not on whiteboard */}
      {!sidebarProfileInFooter && !isWhiteboardPage && (
        <div className="ml-auto">
          <UserMenu />
        </div>
      )}

      {/* User menu - show after whiteboard controls */}
      {!sidebarProfileInFooter && isWhiteboardPage && (
        <div className="ml-1">
          <UserMenu />
        </div>
      )}

    </header>
  )
}
