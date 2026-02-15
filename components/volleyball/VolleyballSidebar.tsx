'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Layout, Users, Timer, Settings } from 'lucide-react'
import VolleyBall from '@/components/logo/VolleyBall'
import { SidebarUserMenu } from '@/components/auth'
import { useAppStore } from '@/store/useAppStore'

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

export function VolleyballSidebar() {
  const pathname = usePathname()
  const sidebarProfileInFooter = useAppStore((state) => state.sidebarProfileInFooter)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
          aria-label="Volley Studio"
        >
          <VolleyBall size={20} fillColor="#f97316" className="shrink-0" />
          <span className="text-sm font-semibold text-foreground group-data-[collapsible=icon]:hidden">
            Volley Studio
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
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
      </SidebarContent>

      {sidebarProfileInFooter && (
        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarUserMenu />
        </SidebarFooter>
      )}

      <SidebarRail />
    </Sidebar>
  )
}
