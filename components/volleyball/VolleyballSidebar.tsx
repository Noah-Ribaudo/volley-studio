'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Home, Layout, GitBranch, Play, Settings, Lock, LogOut } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAdminStore } from '@/store/useAdminStore'

const navItems = [
  {
    title: 'Whiteboard',
    url: '/volleyball',
    icon: Layout,
  },
  {
    title: 'Simulation',
    url: '/volleyball/simulation',
    icon: GitBranch,
  },
  {
    title: 'Full Game',
    url: '/volleyball/full-game',
    icon: Play,
  },
  {
    title: 'Settings',
    url: '/volleyball/settings',
    icon: Settings,
  },
]

export function VolleyballSidebar() {
  const pathname = usePathname()
  const { isAdminMode, unlockAdmin, exitAdminMode } = useAdminStore()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleAdminLogin = () => {
    if (unlockAdmin(password)) {
      setPassword('')
      setError(false)
    } else {
      setError(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdminLogin()
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Back to Home">
              <Link href="/">
                <Home />
                <span>Home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Volleyball</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
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

      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            {isAdminMode ? (
              <div className="px-2 py-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={exitAdminMode}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </Button>
              </div>
            ) : (
              <div className="px-2 py-1 space-y-2">
                <div className="flex gap-1">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError(false)
                    }}
                    onKeyDown={handleKeyDown}
                    className={`h-8 text-sm ${error ? 'border-red-500' : ''}`}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2"
                    onClick={handleAdminLogin}
                    disabled={!password}
                  >
                    <Lock className="h-4 w-4" />
                  </Button>
                </div>
                {error && (
                  <p className="text-xs text-red-500">Wrong password</p>
                )}
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
