'use client'

import { Button } from '@/components/ui/button'
import { Rotation, ROTATIONS } from '@/lib/types'
import { cn } from '@/lib/utils'

interface RotationControlBarProps {
  currentRotation: Rotation
  onRotationChange: (rotation: Rotation) => void
  onNext: () => void
  onPrev: () => void
}

export function RotationControlBar({
  currentRotation,
  onRotationChange,
  onNext,
  onPrev
}: RotationControlBarProps) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Main navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="lg"
          onClick={onPrev}
          className="flex-shrink-0 px-4"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6"/>
          </svg>
          <span className="ml-1">Prev</span>
        </Button>
        
        <div className="flex-1 text-center">
          <div className="text-3xl font-bold text-primary">
            Rotation {currentRotation}
          </div>
          <div className="text-sm text-muted-foreground">
            of 6
          </div>
        </div>
        
        <Button
          variant="outline"
          size="lg"
          onClick={onNext}
          className="flex-shrink-0 px-4"
        >
          <span className="mr-1">Next</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </Button>
      </div>
      
      {/* Quick rotation selector */}
      <div className="flex justify-center gap-1">
        {ROTATIONS.map(rotation => {
          const isActive = currentRotation === rotation
          return (
            <Button
              key={rotation}
              variant={isActive ? "default" : "outline"}
              size="sm"
              aria-pressed={isActive}
              data-active={isActive}
              onClick={() => onRotationChange(rotation)}
              className={cn(
                'w-10 h-10 rounded-full font-bold transition-all',
                isActive 
                  ? 'shadow-lg scale-110 ring-2 ring-primary/40 ring-offset-2 ring-offset-background' 
                  : 'opacity-70 hover:opacity-100'
              )}
            >
              {rotation}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

