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
      <SidebarHeader className="h-12 border-b border-sidebar-border p-0">
        <Link
          href="/"
          className="flex h-full items-center gap-2 overflow-hidden rounded-none px-3 py-0 transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
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
    </Sidebar>
  )
}
