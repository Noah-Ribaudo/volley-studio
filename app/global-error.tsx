'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const message = error.message?.trim() || 'A global application error occurred.'

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center p-4 bg-background text-foreground">
          <div className="w-full max-w-xl rounded-xl border bg-card p-6 shadow-sm">
            <h1 className="text-xl font-semibold">The app failed to load</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This is a global error boundary, so the full app shell could not render.
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
              <button
                onClick={() => {
                  window.location.href = '/'
                }}
                className="rounded border px-4 py-2 text-sm hover:bg-accent"
              >
                Back to whiteboard
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
