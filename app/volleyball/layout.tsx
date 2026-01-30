'use client'

import { usePathname } from 'next/navigation'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { VolleyballSidebar } from '@/components/volleyball/VolleyballSidebar'
import { MobileBottomNav } from '@/components/volleyball/MobileBottomNav'
import { MobileContextBar } from '@/components/controls'
import { useAppStore } from '@/store/useAppStore'

export default function VolleyballLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const playbackMode = useAppStore((state) => state.playbackMode)
  const currentRotation = useAppStore((state) => state.currentRotation)
  const currentPhase = useAppStore((state) => state.currentPhase)
  const visiblePhases = useAppStore((state) => state.visiblePhases)
  const setRotation = useAppStore((state) => state.setRotation)
  const setPhase = useAppStore((state) => state.setPhase)
  const nextPhase = useAppStore((state) => state.nextPhase)
  const prevPhase = useAppStore((state) => state.prevPhase)

  // GameTime has its own mobile-first layout without sidebar
  if (pathname?.startsWith('/volleyball/gametime')) {
    return <>{children}</>
  }

  // Determine if we should show the contextual bar (phase carousel + rotation)
  // Only show on whiteboard page in edit/paused mode
  const isWhiteboardPage = pathname === '/volleyball'
  const isLiveMode = playbackMode === 'live'
  const showContextBar = isWhiteboardPage && !isLiveMode

  // Calculate bottom padding:
  // - Bottom nav: h-14 (56px) + safe area
  // - Context bar (if shown): h-12 (48px) positioned above nav
  // - When context bar shows: extra ~3rem for the bar
  const reducedPadding = isWhiteboardPage && isLiveMode

  // Different padding based on what's visible:
  // - Live mode on whiteboard: just safe area (nav is hidden)
  // - Whiteboard with context bar: nav + context bar = ~6.5rem
  // - Other pages: just nav = ~3.5rem
  let paddingClass = '[padding-bottom:calc(3.5rem+env(safe-area-inset-bottom,0px))]'
  if (reducedPadding) {
    paddingClass = '[padding-bottom:env(safe-area-inset-bottom,0px)]'
  } else if (showContextBar) {
    paddingClass = '[padding-bottom:calc(6.5rem+env(safe-area-inset-bottom,0px))]'
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <VolleyballSidebar />
      <SidebarInset className="h-dvh flex flex-col">
        {/* Mobile top header with menu button */}
        <header className="md:hidden flex items-center h-12 px-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <SidebarTrigger className="h-8 w-8" />
          <span className="ml-2 font-medium text-sm">Volleyball</span>
        </header>
        {/* Floating toggle button - desktop only */}
        <SidebarTrigger
          className="hidden md:flex absolute top-2 left-2 z-50 h-8 w-8 rounded-lg bg-background/80 backdrop-blur-sm border shadow-sm hover:bg-accent"
        />
        {/* Main content with bottom padding for mobile nav + context bar */}
        <main
          className={`flex-1 min-h-0 overflow-auto md:pb-0 ${paddingClass}`}
        >
          {children}
        </main>
        {/* Mobile contextual bar (phase/rotation) - only on whiteboard in edit mode */}
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
        {/* Mobile bottom navigation (5 tabs) */}
        <MobileBottomNav />
      </SidebarInset>
    </SidebarProvider>
  )
}
