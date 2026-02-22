import { Skeleton } from '@/components/ui/skeleton'

export default function MainLoading() {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 h-full overflow-hidden">
        <div className="w-full h-full sm:max-w-3xl mx-auto px-0 sm:px-2 relative flex items-center justify-center">
          <Skeleton className="w-full aspect-[3/4] max-w-md rounded-xl" />
        </div>
      </div>
    </div>
  )
}
