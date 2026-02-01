'use client'

import { usePathname } from 'next/navigation'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { VolleyballSidebar } from '@/components/volleyball/VolleyballSidebar'
import { MobileBottomNav } from '@/components/volleyball/MobileBottomNav'
import { DesktopHeaderNav } from '@/components/volleyball/DesktopHeaderNav'
import { MobileContextBar } from '@/components/controls'
import { useAppStore } from '@/store/useAppStore'

export default function VolleyballLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const currentRotation = useAppStore((state) => state.currentRotation)
  const currentPhase = useAppStore((state) => state.currentPhase)
  const visiblePhases = useAppStore((state) => state.visiblePhases)
  const setRotation = useAppStore((state) => state.setRotation)
  const setPhase = useAppStore((state) => state.setPhase)
  const nextPhase = useAppStore((state) => state.nextPhase)
  const prevPhase = useAppStore((state) => state.prevPhase)
  const navMode = useAppStore((state) => state.navMode)

  // GameTime has its own mobile-first layout without sidebar
  if (pathname?.startsWith('/volleyball/gametime')) {
    return <>{children}</>
  }

  // Determine if we should show the contextual bar (phase carousel + rotation)
  // Only show on whiteboard page
  const isWhiteboardPage = pathname === '/volleyball'
  const showContextBar = isWhiteboardPage

  // Always reserve space for context bar to prevent layout jump
  // This keeps the layout stable when navigating between pages
  const paddingClass = '[padding-bottom:calc(6rem+env(safe-area-inset-bottom,0px))]'

  // Header mode - no sidebar, just top nav on desktop
  if (navMode === 'header') {
    return (
      <div className="h-dvh flex flex-col">
        {/* Desktop header nav */}
        <DesktopHeaderNav />

        {/* Mobile top header - minimal, just for context */}
        <header className="md:hidden flex items-center h-12 px-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <span className="font-medium text-sm">Volleyball</span>
        </header>

        {/* Main content with bottom padding for mobile nav + context bar */}
        <main
          className={`flex-1 min-h-0 overflow-auto md:pb-0 ${paddingClass}`}
        >
          {children}
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
      </div>
    )
  }

  // Sidebar mode - original layout with sidebar
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
      </SidebarInset>
    </SidebarProvider>
  )
}
