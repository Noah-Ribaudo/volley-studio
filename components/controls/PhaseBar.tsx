'use client'

import { Button } from '@/components/ui/button'
import { Phase, PHASES, RALLY_PHASES, Rotation } from '@/lib/types'
import type { RallyPhase } from '@/lib/sim/types'
import { cn } from '@/lib/utils'
import { getPhaseInfo, getCompactPhaseIcon, isRallyPhase as checkIsRallyPhase } from '@/lib/phaseIcons'

interface PhaseBarProps {
  currentRotation: Rotation
  currentPhase: Phase
  onNext: () => void
  onPrev: () => void
  onPhaseChange: (phase: Phase) => void
  onRotationBadgeClick: () => void
  visiblePhases?: Set<RallyPhase>
}

export function PhaseBar({
  currentRotation,
  currentPhase,
  onNext,
  onPrev,
  onPhaseChange,
  onRotationBadgeClick,
  visiblePhases,
}: PhaseBarProps) {
  // Show visible RallyPhases if current phase is a RallyPhase, otherwise show legacy phases
  const isRallyPhase = checkIsRallyPhase(currentPhase)
  const phasesToShow = isRallyPhase
    ? (visiblePhases ? RALLY_PHASES.filter(p => visiblePhases.has(p)) : RALLY_PHASES)
    : PHASES

  return (
    <div className="flex-shrink-0 z-40 flex items-center gap-1 sm:gap-1.5 w-full bg-card/95 backdrop-blur-md border-t border-border px-2 py-2 sm:px-3 sm:py-2.5 safe-area-bottom">
      {/* Left arrow */}
      <Button
        variant="ghost"
        onClick={onPrev}
        aria-label="Previous phase"
        className="w-10 h-10 sm:w-9 sm:h-9 flex-shrink-0 p-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </Button>

      {/* Phase buttons - scrollable on mobile, wrap on larger screens */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide sm:flex-wrap sm:justify-center">
        {phasesToShow.map(phase => {
          const info = getPhaseInfo(phase)
          const selected = currentPhase === phase
          const isRally = RALLY_PHASES.includes(phase as RallyPhase)
          const isVisible = !isRally || !visiblePhases || visiblePhases.has(phase as RallyPhase)

          return (
            <Button
              key={phase}
              variant={selected ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onPhaseChange(phase)}
              aria-pressed={selected}
              aria-label={info.name}
              title={info.name}
              className={cn(
                "h-9 sm:h-8 flex items-center justify-center gap-1 transition-all flex-shrink-0",
                // Mobile: icon only, touch-friendly | Desktop: icon + abbreviated text
                "w-10 px-0 sm:w-auto sm:px-2.5",
                selected
                  ? 'shadow-sm bg-primary text-primary-foreground'
                  : 'opacity-70 hover:opacity-100 hover:bg-muted',
                !isVisible && 'opacity-40'
              )}
            >
              {getCompactPhaseIcon(phase)}
              <span className="hidden sm:inline text-xs font-medium capitalize whitespace-nowrap">
                {info.name}
              </span>
            </Button>
          )
        })}
      </div>

      {/* Right arrow */}
      <Button
        variant="ghost"
        onClick={onNext}
        aria-label="Next phase"
        className="w-10 h-10 sm:w-9 sm:h-9 flex-shrink-0 p-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </Button>

      {/* Rotation Badge */}
      <Button
        variant="outline"
        size="sm"
        onClick={onRotationBadgeClick}
        className="h-9 w-9 sm:h-8 sm:w-auto sm:px-2.5 flex-shrink-0 rounded-full sm:rounded-md font-bold text-xs border-2 hover:bg-muted"
        aria-label={`Rotation ${currentRotation}. Click to change.`}
      >
        <span className="sm:hidden">R{currentRotation}</span>
        <span className="hidden sm:inline">R{currentRotation}</span>
      </Button>
    </div>
  )
}
