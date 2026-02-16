'use client'

import { useCallback, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MobileBottomNav } from '@/components/volleyball/MobileBottomNav'
import { DesktopHeaderNav } from '@/components/volleyball/DesktopHeaderNav'
import { VolleyballSidebar } from '@/components/volleyball/VolleyballSidebar'
import { MobileContextBar } from '@/components/controls'
import { useAppStore, getCurrentPositions } from '@/store/useAppStore'
import { useGameTimeStore } from '@/store/useGameTimeStore'
import { Button } from '@/components/ui/button'
import { PrinterIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { PrintDialog } from '@/components/print'
import { getActiveAssignments } from '@/lib/lineups'
import type { Rotation, Phase, PositionCoordinates, RallyPhase } from '@/lib/types'
import { RALLY_PHASES, isRallyPhase as checkIsRallyPhase } from '@/lib/types'
import VolleyBall from '@/components/logo/VolleyBall'
import { UserMenu } from '@/components/auth'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import Link from 'next/link'

const OPEN_COURT_SETUP_EVENT = 'open-court-setup'

export default function VolleyballLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const currentRotation = useAppStore((state) => state.currentRotation)
  const currentPhase = useAppStore((state) => state.currentPhase)
  const visiblePhases = useAppStore((state) => state.visiblePhases)
  const setRotation = useAppStore((state) => state.setRotation)
  const setPhase = useAppStore((state) => state.setPhase)
  const nextPhase = useAppStore((state) => state.nextPhase)
  const prevPhase = useAppStore((state) => state.prevPhase)
  const showPrintFeature = useAppStore((state) => state.showPrintFeature)

  // Data for print dialog
  const currentTeam = useAppStore((state) => state.currentTeam)
  const baseOrder = useAppStore((state) => state.baseOrder)
  const localPositions = useAppStore((state) => state.localPositions)
  const customLayouts = useAppStore((state) => state.customLayouts)

  // Function to get positions for any rotation/phase (used by print dialog)
  const getPositionsForRotation = useCallback((rotation: Rotation, phase: Phase): PositionCoordinates => {
    return getCurrentPositions(
      rotation,
      phase,
      localPositions,
      customLayouts,
      currentTeam,
      true,
      baseOrder
    )
  }, [localPositions, customLayouts, currentTeam, baseOrder])

  // Get visible phases for print
  const isRallyPhase = checkIsRallyPhase(currentPhase)
  const phasesToShow = isRallyPhase
    ? (visiblePhases ? RALLY_PHASES.filter(p => visiblePhases.has(p)) : RALLY_PHASES)
    : RALLY_PHASES

  // GameTime bypasses normal layout only when actively playing in fullscreen
  const gamePhase = useGameTimeStore((s) => s.phase)
  const isFullscreen = useGameTimeStore((s) => s.isFullscreen)
  const isGameTimeFullscreen = pathname?.startsWith('/gametime') && gamePhase === 'playing' && isFullscreen

  if (isGameTimeFullscreen) {
    return <>{children}</>
  }

  // Determine if we should show the contextual bar (phase carousel + rotation)
  // Only show on whiteboard page
  const isWhiteboardPage = pathname === '/'
  const showContextBar = isWhiteboardPage

  // Always reserve space for context bar to prevent layout jump
  // This keeps the layout stable when navigating between pages
  const paddingClass = '[padding-bottom:calc(6rem+env(safe-area-inset-bottom,0px))]'
  const contentShellClass = isWhiteboardPage
    ? 'mx-auto w-full max-w-[1200px] flex flex-col flex-1 min-h-0'
    : 'w-full flex flex-col flex-1 min-h-0'

  return (
    <div className="h-dvh relative overflow-hidden bg-background">
      <SidebarProvider defaultOpen className="h-dvh w-full">
        <VolleyballSidebar />
        <SidebarInset className="relative h-dvh flex flex-col bg-gradient-to-b from-background to-muted/30">
        {/* Desktop header nav */}
        <DesktopHeaderNav
          onOpenPrintDialog={() => setPrintDialogOpen(true)}
          onOpenCourtSetup={(anchorRect) => {
            window.dispatchEvent(new CustomEvent(OPEN_COURT_SETUP_EVENT, { detail: { anchorRect } }))
          }}
          showNav={false}
        />

        {/* Mobile top header - minimal, just for context */}
        <header
          className="md:hidden flex items-center justify-between h-12 px-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 0.75rem)',
            paddingRight: 'calc(env(safe-area-inset-right, 0px) + 0.75rem)',
            height: 'calc(3rem + env(safe-area-inset-top, 0px))',
          }}
        >
          <span className="font-medium text-sm flex items-center gap-1.5">
            <VolleyBall size={18} fillColor="#f97316" />
            Volley Studio
          </span>
          <div className="flex items-center gap-1">
            {isWhiteboardPage && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => {
                    window.dispatchEvent(new Event(OPEN_COURT_SETUP_EVENT))
                  }}
                  aria-label="Open court setup"
                  title="Open court setup"
                >
                  Court Setup
                </Button>
                {showPrintFeature && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPrintDialogOpen(true)}
                    aria-label="Print rotations"
                  >
                    <HugeiconsIcon icon={PrinterIcon} className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
            <UserMenu />
          </div>
        </header>

        {/* Main content with bottom padding for mobile nav + context bar */}
        <main
          className={`flex flex-col flex-1 min-h-0 md:pb-0 ${isWhiteboardPage ? 'overflow-hidden overscroll-none' : 'overflow-auto'} ${paddingClass}`}
        >
          <div className={contentShellClass}>
            {children}
          </div>
        </main>

        {/* Mobile contextual bar (phase/rotation) - only on whiteboard */}
        {showContextBar && (
          <MobileContextBar
            currentRotation={currentRotation}
            currentPhase={currentPhase}
            onPhaseChange={setPhase}
            onRotationChange={setRotation}
            onNext={nextPhase}
            onPrev={prevPhase}
            visiblePhases={visiblePhases}
          />
        )}

        {/* Mobile bottom navigation (4 tabs) */}
        <MobileBottomNav />

        {/* Privacy link - required for Google OAuth verification */}
        <Link
          href="/privacy"
          className="fixed bottom-2 left-2 z-30 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors hidden md:block"
        >
          Privacy
        </Link>

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
          visiblePhases={phasesToShow as RallyPhase[]}
        />
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
