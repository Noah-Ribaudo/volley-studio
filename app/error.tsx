'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getRecentPages, type Breadcrumb } from '@/lib/session-breadcrumbs'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [recentPages, setRecentPages] = useState<Breadcrumb[]>([])

  useEffect(() => {
    console.error(error)
  }, [error])

  useEffect(() => {
    try {
      const pages = getRecentPages(undefined, 2)
      setRecentPages(pages)
    } catch { /* never break the error page */ }
  }, [])

  const message = error.message?.trim() || 'An unexpected client-side error occurred.'

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">This page ran into a problem</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn't load this screen right now. Try again, or go back and keep working.
        </p>

        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm font-medium text-destructive">Error details</p>
          <p className="mt-1 break-words text-sm text-destructive/90">{message}</p>
          {error.digest && (
            <p className="mt-2 text-xs text-destructive/80">Reference: {error.digest}</p>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => reset()}
            className="rounded bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
          >
            Retry
          </button>
          <Link
            href="/"
            className="rounded border px-4 py-2 text-sm hover:bg-accent"
          >
            Back to whiteboard
          </Link>
        </div>

        {/* Breadcrumb suggestions — hidden if none exist */}
        {recentPages.length > 0 && (
          <div className="mt-4 rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">Or go back to</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {recentPages.map((page) => (
                <Link
                  key={page.path}
                  href={page.path}
                  className="rounded-md border bg-card px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                >
                  {page.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
