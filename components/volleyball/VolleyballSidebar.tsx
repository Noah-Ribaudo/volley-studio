'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Layout, Users, Timer, Settings, SlidersHorizontal, Palette, Paintbrush, RectangleEllipsis, RotateCcw, Gauge } from 'lucide-react'
import VolleyBall from '@/components/logo/VolleyBall'
import { SidebarUserMenu } from '@/components/auth'
import { useUIPrefsStore } from '@/store/useUIPrefsStore'

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

const developerNavItems = [
  {
    title: 'Dev Toggles',
    url: '/developer/settings',
    icon: Settings,
  },
  {
    title: 'Open Minimal Mode',
    url: '/minimal',
    icon: RectangleEllipsis,
  },
  {
    title: 'Theme Lab',
    url: '/developer/theme-lab',
    icon: Palette,
  },
  {
    title: 'Logo Lab',
    url: '/developer/logo-lab',
    icon: Paintbrush,
  },
]

export function VolleyballSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const sidebarProfileInFooter = useUIPrefsStore((state) => state.sidebarProfileInFooter)
  const showMotionDebugPanel = useUIPrefsStore((state) => state.showMotionDebugPanel)
  const setShowMotionDebugPanel = useUIPrefsStore((state) => state.setShowMotionDebugPanel)
  const showWhiteboardDialKit = useUIPrefsStore((state) => state.showWhiteboardDialKit)
  const setShowWhiteboardDialKit = useUIPrefsStore((state) => state.setShowWhiteboardDialKit)
  const showMotionDebugToggle = process.env.NODE_ENV === 'development'
  const isOnWhiteboard = pathname === '/'

  const handleMotionDebugClick = () => {
    if (isOnWhiteboard) {
      setShowMotionDebugPanel(!showMotionDebugPanel)
      return
    }
    setShowMotionDebugPanel(true)
    router.push('/')
  }

  const handleDialKitClick = () => {
    if (isOnWhiteboard) {
      setShowWhiteboardDialKit(!showWhiteboardDialKit)
      return
    }
    setShowWhiteboardDialKit(true)
    router.push('/')
  }

  const handleResetTooltips = () => {
    localStorage.removeItem('volleyball-hints')
    window.location.href = '/'
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-12 border-b border-sidebar-border p-0">
        <Link
          href="/"
          className="flex h-full items-center gap-2 overflow-hidden rounded-none pr-3 pl-3.5 py-0 transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          aria-label="Volley Studio"
        >
          <VolleyBall size={20} fillColor="#f97316" className="shrink-0" />
          <span
            className="max-w-[9rem] origin-left whitespace-nowrap text-sm font-semibold text-foreground transition-[max-width,opacity,transform] duration-200 ease-out group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:-translate-x-1 group-data-[collapsible=icon]:opacity-0"
          >
            Volley Studio
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.url === '/'
                        ? pathname === item.url
                        : pathname?.startsWith(item.url)
                    }
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showMotionDebugToggle && (
          <>
            <SidebarSeparator className="mx-2" />
            <SidebarGroup>
              <SidebarGroupLabel>Developer</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      type="button"
                      isActive={showMotionDebugPanel && isOnWhiteboard}
                      tooltip="Motion Debug"
                      onClick={handleMotionDebugClick}
                    >
                      <SlidersHorizontal />
                      <span>Motion Debug</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      type="button"
                      isActive={showWhiteboardDialKit && isOnWhiteboard}
                      tooltip="Whiteboard DialKit"
                      onClick={handleDialKitClick}
                    >
                      <Gauge />
                      <span>Whiteboard DialKit</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      type="button"
                      tooltip="Reset Tooltips"
                      onClick={handleResetTooltips}
                    >
                      <RotateCcw />
                      <span>Reset Tooltips</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {developerNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname?.startsWith(item.url)}
                        tooltip={item.title}
                      >
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {sidebarProfileInFooter && (
        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarUserMenu />
        </SidebarFooter>
      )}
    </Sidebar>
  )
}
