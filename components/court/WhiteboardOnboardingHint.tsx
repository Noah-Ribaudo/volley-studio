'use client'

import { cn } from '@/lib/utils'

interface WhiteboardOnboardingHintProps {
  show: boolean
  message: string
  step?: number
  totalSteps?: number
  className?: string
}

export function WhiteboardOnboardingHint({
  show,
  message,
  step,
  totalSteps,
  className,
}: WhiteboardOnboardingHintProps) {
  if (!show) return null

  const isGuided = step != null && totalSteps != null

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-24 flex items-center justify-center pointer-events-none z-30',
        className
      )}
    >
      <div
        className="flex items-stretch rounded-lg bg-gray-900 dark:bg-gray-800 shadow-xl overflow-hidden"
        style={{
          animation: 'onboardingHintIn 250ms ease-out both',
        }}
      >
        {/* Orange accent bar */}
        <div className="w-1 shrink-0 bg-orange-500" />

        <div className="flex items-center gap-3 px-3.5 py-2.5">
          <span className="text-sm font-medium text-gray-50 leading-snug">
            {message}
          </span>

          {isGuided && (
            <span className="shrink-0 rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-semibold leading-none text-white tabular-nums">
              {step}/{totalSteps}
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes onboardingHintIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}
