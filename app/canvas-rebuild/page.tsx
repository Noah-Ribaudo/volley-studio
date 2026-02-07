import { VolleyballCourtRebuild } from '@/components/court/VolleyballCourtRebuild'

export default function CanvasRebuildPage() {
  return (
    <div className="h-[100dvh] bg-background text-foreground overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 py-4">
        <div className="flex-1 min-h-0 h-full">
          <VolleyballCourtRebuild />
        </div>
      </div>
    </div>
  )
}
