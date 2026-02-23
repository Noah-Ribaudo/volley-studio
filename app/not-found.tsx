'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getRecentPages, type Breadcrumb } from '@/lib/session-breadcrumbs'

// ---------------------------------------------------------------------------
// URL intent detection — gives route-specific messaging
// ---------------------------------------------------------------------------

interface Intent {
  description: string
  ctaLabel: string
  ctaHref: string
}

function detectIntent(pathname: string): Intent | null {
  try {
    if (pathname.startsWith('/teams')) {
      return {
        description: "This team page doesn't exist or may have been removed.",
        ctaLabel: 'Browse your teams',
        ctaHref: '/teams',
      }
    }
    if (pathname.startsWith('/gametime')) {
      return {
        description: "There's nothing here, but Game Time is ready.",
        ctaLabel: 'Go to Game Time',
        ctaHref: '/gametime',
      }
    }
    if (pathname.startsWith('/settings')) {
      return {
        description: "This settings page doesn't exist.",
        ctaLabel: 'Go to Settings',
        ctaHref: '/settings',
      }
    }
    if (pathname.startsWith('/learn')) {
      return {
        description: "This learning page doesn't exist.",
        ctaLabel: 'Go to Learn',
        ctaHref: '/learn',
      }
    }
    return null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Inline volleyball SVG (no component import)
// ---------------------------------------------------------------------------

function VolleyballIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="4" />
      <path
        d="M50 2C50 2 50 50 50 50M50 50C30 30 8 35 2 50M50 50C70 30 92 35 98 50M50 50C30 70 8 65 2 50M50 50C70 70 92 65 98 50M50 98C50 98 50 50 50 50"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function VolleyballWatermark() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      <VolleyballIcon className="h-64 w-64 text-foreground opacity-[0.04]" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// 404 Page
// ---------------------------------------------------------------------------

export default function NotFound() {
  const [attemptedPath, setAttemptedPath] = useState('')
  const [recentPages, setRecentPages] = useState<Breadcrumb[]>([])

  useEffect(() => {
    try {
      setAttemptedPath(window.location.pathname)
      const pages = getRecentPages(window.location.pathname, 3)
      setRecentPages(pages)
    } catch {
      // Failed to read — render with defaults
    }
  }, [])

  const intent = attemptedPath ? detectIntent(attemptedPath) : null

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="relative w-full max-w-md rounded-xl border bg-card p-6 shadow-sm overflow-hidden">
        <VolleyballWatermark />

        {/* Header */}
        <div className="relative flex items-center gap-2 text-orange-500">
          <VolleyballIcon className="h-5 w-5" />
          <span className="text-sm font-semibold tracking-wide">404</span>
        </div>

        {/* Headline */}
        <h1 className="relative mt-3 text-xl font-semibold text-foreground">
          Page not found
        </h1>

        {/* Description */}
        <p className="relative mt-2 text-sm text-muted-foreground">
          {intent?.description ?? "We couldn't find this page."}
        </p>

        {/* Attempted path */}
        {attemptedPath && (
          <p className="relative mt-1 break-all text-xs text-muted-foreground/60 font-mono">
            {attemptedPath}
          </p>
        )}

        {/* Recent pages section — fixed height to prevent layout shift */}
        <div className="relative mt-5 min-h-[120px]">
          {recentPages.length > 0 ? (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">
                Pick up where you left off
              </p>
              <ul className="mt-2 space-y-1">
                {recentPages.map((page) => (
                  <li key={page.path}>
                    <Link
                      href={page.path}
                      className="group flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <span className="truncate">{page.label}</span>
                      <span className="text-muted-foreground/50 group-hover:text-foreground transition-colors ml-2 shrink-0">
                        &rarr;
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[120px]">
              <Button asChild variant="outline" size="lg">
                <Link href="/">Go to Whiteboard</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="relative mt-4 flex gap-2">
          {intent && (
            <Button asChild>
              <Link href={intent.ctaHref}>{intent.ctaLabel}</Link>
            </Button>
          )}
          {/* Always show whiteboard button (unless already shown above as the empty-state CTA) */}
          {(intent || recentPages.length > 0) && (
            <Button asChild variant="outline">
              <Link href="/">Whiteboard</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
