'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { useGameTimeStore } from '@/store/useGameTimeStore'
import {
  PresentationBarChart01Icon,
  Timer01Icon,
  UserGroupIcon,
  Settings01Icon,
  AddTeamIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

const navItems = [
  {
    title: 'Whiteboard',
    url: '/',
    icon: PresentationBarChart01Icon,
  },
  {
    title: 'Teams',
    url: '/teams',
    icon: UserGroupIcon,
    // Uses AddTeamIcon when no team is selected
    emptyIcon: AddTeamIcon,
    requiresTeam: true,
  },
  {
    title: 'Game',
    url: '/gametime',
    icon: Timer01Icon,
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings01Icon,
  },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const currentTeam = useAppStore((state) => state.currentTeam)
  const gamePhase = useGameTimeStore((s) => s.phase)
  const hasActiveGame = gamePhase === 'playing'

  const hasTeam = Boolean(currentTeam)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = item.url === '/'
            ? pathname === item.url
            : pathname?.startsWith(item.url)

          // Determine which icon to use
          const IconComponent = (item.requiresTeam && !hasTeam && item.emptyIcon)
            ? item.emptyIcon
            : item.icon

          const showGameDot = item.url === '/gametime' && hasActiveGame && !isActive

          return (
            <Link
              key={item.title}
              href={item.url}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-xs transition-colors relative',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <HugeiconsIcon icon={IconComponent} className="h-5 w-5" />
                {showGameDot && (
                  <div className="absolute -top-0.5 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                )}
              </div>
              <span className="text-xs">{item.title}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
