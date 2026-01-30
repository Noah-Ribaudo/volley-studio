'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <button
            onClick={() => reset()}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
