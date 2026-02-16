'use client'

import { cn } from '@/lib/utils'

interface WhiteboardOnboardingHintProps {
  show: boolean
  message: string
  className?: string
}

export function WhiteboardOnboardingHint({
  show,
  message,
  className,
}: WhiteboardOnboardingHintProps) {
  if (!show) return null

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-24 flex items-center justify-center pointer-events-none z-30',
        'animate-in fade-in duration-300',
        className
      )}
    >
      <div className="px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg">
        <span className="text-xs text-muted-foreground">{message}</span>
      </div>
    </div>
  )
}
