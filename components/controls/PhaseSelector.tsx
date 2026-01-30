'use client'

import { Button } from '@/components/ui/button'
import { Phase, RALLY_PHASES } from '@/lib/types'
import type { RallyPhase } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Eye, EyeOff } from 'lucide-react'
import { getPhaseInfo, getPhaseIcon, isRallyPhase as checkIsRallyPhase } from '@/lib/phaseIcons'

interface PhaseSelectorProps {
  currentPhase: Phase
  visiblePhases: Set<RallyPhase>
  onPhaseChange: (phase: Phase) => void
  onToggleVisibility?: (phase: RallyPhase) => void
}

export function PhaseSelector({ 
  currentPhase, 
  visiblePhases, 
  onPhaseChange, 
  onToggleVisibility 
}: PhaseSelectorProps) {
  // Get phases to display - only show visible phases
  const phasesToShow = RALLY_PHASES.filter(p => visiblePhases.has(p))

  const isPhaseVisible = (phase: Phase) => {
    if (checkIsRallyPhase(phase)) {
      return visiblePhases.has(phase)
    }
    return true // Legacy phases always visible
  }

  // Calculate next/prev phase navigation
  const handleNext = () => {
    const currentIndex = phasesToShow.indexOf(currentPhase as RallyPhase)
    if (currentIndex !== -1 && currentIndex < phasesToShow.length - 1) {
      onPhaseChange(phasesToShow[currentIndex + 1])
    } else if (phasesToShow.length > 0) {
      onPhaseChange(phasesToShow[0])
    }
  }

  const handlePrev = () => {
    const currentIndex = phasesToShow.indexOf(currentPhase as RallyPhase)
    if (currentIndex > 0) {
      onPhaseChange(phasesToShow[currentIndex - 1])
    } else if (phasesToShow.length > 0) {
      onPhaseChange(phasesToShow[phasesToShow.length - 1])
    }
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-full overflow-hidden">
      <div className="text-sm font-medium text-muted-foreground text-center">
        Game Phase
      </div>
      <div className="flex items-start gap-1 w-full max-w-full overflow-hidden">
        {/* Left arrow */}
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrev}
          aria-label="Previous phase"
          className="h-9 w-9 sm:h-8 sm:w-8 flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Button>

        {/* Phase buttons - wrap to multiple rows */}
        <div className="flex flex-wrap gap-2 flex-1 min-w-0 justify-center">
          {phasesToShow.map(phase => {
            const info = getPhaseInfo(phase)
            const isSelected = currentPhase === phase
            const isVisible = isPhaseVisible(phase)
            
            return (
              <div key={phase} className="relative flex-shrink-0">
                <Button
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPhaseChange(phase)}
                  aria-pressed={isSelected}
                  data-active={isSelected}
                  className={cn(
                    'flex flex-col items-center gap-1 h-auto py-2 px-3 transition-all min-h-[72px] min-w-[136px] sm:min-w-[120px]',
                    isSelected 
                      ? 'shadow-md ring-1 ring-primary/40 ring-offset-2 ring-offset-background' 
                      : 'opacity-80 hover:opacity-100',
                    !isVisible && 'opacity-40'
                  )}
                >
                  {getPhaseIcon(phase)}
                  <span className="text-[12px] leading-tight font-medium text-center">
                    {info.name}
                  </span>
                  {info.isIntermediate && (
                    <span className="text-[10px] text-muted-foreground">(transition)</span>
                  )}
                </Button>
                {onToggleVisibility && RALLY_PHASES.includes(phase as RallyPhase) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleVisibility(phase as RallyPhase)
                    }}
                    className="absolute top-1 right-1 p-1 rounded hover:bg-background/80 transition-colors"
                    aria-label={isVisible ? 'Hide phase' : 'Show phase'}
                  >
                    {isVisible ? (
                      <Eye className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <EyeOff className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Right arrow */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          aria-label="Next phase"
          className="h-9 w-9 sm:h-8 sm:w-8 flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Button>
      </div>
      
      {/* Current phase description */}
      <div className="text-center text-xs leading-tight text-muted-foreground mt-1">
        {getPhaseInfo(currentPhase).description}
      </div>
    </div>
  )
}
