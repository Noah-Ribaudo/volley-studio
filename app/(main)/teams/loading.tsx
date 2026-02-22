import { Skeleton } from '@/components/ui/skeleton'

export default function TeamsLoading() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        <Skeleton className="h-7 w-20" />

        {/* Action cards skeleton */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>

        {/* Team card skeletons */}
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-6 w-40 max-w-[70%]" />
                  <Skeleton className="h-4 w-56 max-w-[85%]" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-16 rounded-md" />
                  <Skeleton className="h-8 w-20 rounded-md" />
                  <Skeleton className="h-8 w-14 rounded-md" />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <Skeleton className="h-5 w-16 rounded-sm" />
                <Skeleton className="h-5 w-20 rounded-sm" />
                <Skeleton className="h-5 w-14 rounded-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
