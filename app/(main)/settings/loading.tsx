import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6 pb-32 max-w-2xl space-y-6">
        {/* Account card skeleton */}
        <div className="rounded-xl border bg-card">
          <div className="p-6 pb-2 space-y-1.5">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <div className="p-6 pt-3">
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>

        {/* Appearance card skeleton */}
        <div className="rounded-xl border bg-card">
          <div className="p-6 pb-2 space-y-1.5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="p-6 pt-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
        </div>

        {/* Suggestion box skeleton */}
        <div className="rounded-xl border bg-card">
          <div className="p-6 pb-2 space-y-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="p-6 pt-3">
            <Skeleton className="h-24 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}
