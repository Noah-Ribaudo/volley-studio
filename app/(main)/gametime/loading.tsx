import { Skeleton } from '@/components/ui/skeleton'

export default function GameTimeLoading() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>

        {/* Setup cards skeleton */}
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />

        {/* Start button skeleton */}
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  )
}
