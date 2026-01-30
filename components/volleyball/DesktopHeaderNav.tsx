'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Layout, Users, Timer, Settings } from 'lucide-react'

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
    </header>
  )
}
