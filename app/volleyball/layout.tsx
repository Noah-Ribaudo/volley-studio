'use client'

import { usePathname } from 'next/navigation'
import { MobileBottomNav } from '@/components/volleyball/MobileBottomNav'
import { DesktopHeaderNav } from '@/components/volleyball/DesktopHeaderNav'
import { VolleyballSidebar } from '@/components/volleyball/VolleyballSidebar'
import { MobileContextBar } from '@/components/controls'
import { useAppStore } from '@/store/useAppStore'
import { UserMenu } from '@/components/auth'
import { Button } from '@/components/ui/button'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

const OPEN_COURT_SETUP_EVENT = 'open-court-setup'

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

  return (
    <SidebarProvider defaultOpen className="h-dvh w-full">
      <VolleyballSidebar />
      <SidebarInset className="h-dvh flex flex-col">
      {/* Desktop header nav */}
      <DesktopHeaderNav
        onOpenCourtSetup={() => {
          window.dispatchEvent(new Event(OPEN_COURT_SETUP_EVENT))
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
        <span className="font-medium text-sm">Volleyball</span>
        <div className="flex items-center gap-1">
          {isWhiteboardPage && (
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
          )}
          <UserMenu />
        </div>
      </header>

      {/* Main content with bottom padding for mobile nav + context bar */}
      <main
        className={`flex flex-col flex-1 min-h-0 md:pb-0 ${isWhiteboardPage ? 'overflow-hidden overscroll-none' : 'overflow-auto'} ${paddingClass}`}
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
