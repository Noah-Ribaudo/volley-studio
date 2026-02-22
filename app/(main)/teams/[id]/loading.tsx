import { Skeleton } from '@/components/ui/skeleton'

export default function TeamDetailLoading() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Back button + team name */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-7 w-48" />
        </div>

        {/* Team name input */}
        <Skeleton className="h-10 w-full rounded-md" />

        {/* Roster card skeleton */}
        <div className="rounded-xl border bg-card">
          <div className="p-6 pb-2 space-y-1.5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="p-6 pt-3 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-10 rounded-md" />
                <Skeleton className="h-8 flex-1 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            ))}
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>

        {/* Lineup card skeleton */}
        <div className="rounded-xl border bg-card">
          <div className="p-6 pb-2 space-y-1.5">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="p-6 pt-3 space-y-3">
            <Skeleton className="h-10 w-full rounded-md" />
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 rounded-md" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
