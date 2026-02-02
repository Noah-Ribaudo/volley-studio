'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface SafeAreaHeaderProps {
  children: ReactNode
  className?: string
  /** Whether to show a bottom border */
  bordered?: boolean
  /** Background style - 'solid' for opaque, 'blur' for frosted glass effect */
  background?: 'solid' | 'blur'
}

/**
 * Sticky header component with iOS safe area support.
 * Extends background behind the status bar for proper Liquid Glass appearance.
 * 
 * Use this instead of manually adding `sticky top-0` to headers.
 */
export function SafeAreaHeader({
  children,
  className,
  bordered = true,
  background = 'blur',
}: SafeAreaHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-50',
        bordered && 'border-b',
        background === 'blur' 
          ? 'bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60'
          : 'bg-background',
        className
      )}
      style={{
        // Extend the header behind the iOS status bar
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      {children}
    </header>
  )
}
