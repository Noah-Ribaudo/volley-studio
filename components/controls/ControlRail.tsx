'use client'

import { Button } from '@/components/ui/button'
import { Phase, PHASES, RALLY_PHASES, Rotation, ROTATIONS, Role, ROLES, ROLE_INFO } from '@/lib/types'
import type { RallyPhase } from '@/lib/types'
import { cn, getTextColorForOklch } from '@/lib/utils'
import { getPhaseInfo, getCompactPhaseIcon, isRallyPhase as checkIsRallyPhase } from '@/lib/phaseIcons'

interface ControlRailProps {
  currentRotation: Rotation
  currentPhase: Phase
  onRotationChange: (rotation: Rotation) => void
  onNext: () => void
  onPrev: () => void
  onPhaseChange: (phase: Phase) => void
  highlightedRole?: Role | null
  onRoleSelect?: (role: Role | null) => void
  visiblePhases?: Set<RallyPhase>
}

export function ControlRail({
  currentRotation,
  currentPhase,
  onRotationChange,
  onNext,
  onPrev,
  onPhaseChange,
  highlightedRole = null,
  onRoleSelect,
  visiblePhases
}: ControlRailProps) {
  // Show visible RallyPhases if current phase is a RallyPhase, otherwise show legacy phases
  const isRallyPhase = checkIsRallyPhase(currentPhase)
  const phasesToShow = isRallyPhase
    ? (visiblePhases ? RALLY_PHASES.filter(p => visiblePhases.has(p)) : RALLY_PHASES)
    : PHASES

  return (
    <div className="rounded-lg border border-border bg-card/50 backdrop-blur-sm shadow-sm p-1.5 sm:p-2.5 space-y-1.5 sm:space-y-2.5 w-full max-w-full overflow-hidden">
      {/* First row: [<] [Phases, wrapping] [>] */}
      <div className="flex items-stretch gap-0.5 sm:gap-1 w-full max-w-full overflow-hidden" aria-label="Select phase">
        {/* Left arrow - 44px touch target on mobile */}
        <Button
          variant="outline"
          onClick={onPrev}
          aria-label="Previous phase"
          className="w-11 h-11 sm:w-9 sm:h-auto sm:!h-full flex-shrink-0 flex items-center justify-center p-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Button>

        {/* Phase buttons - wrap to multiple rows */}
        <div className="flex flex-wrap gap-0.5 sm:gap-1 flex-1 min-w-0 justify-center">
          {phasesToShow.map(phase => {
            const info = getPhaseInfo(phase)
            const selected = currentPhase === phase
            // For RallyPhases, check visibility; legacy phases are always visible
            const isRallyPhase = RALLY_PHASES.includes(phase as RallyPhase)
            const isVisible = !isRallyPhase || !visiblePhases || visiblePhases.has(phase as RallyPhase)
            return (
              <Button
                key={phase}
                variant={selected ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPhaseChange(phase)}
                data-active={selected}
                aria-pressed={selected}
                aria-label={info.name}
                title={info.name}
                className={cn(
                  "h-10 sm:h-9 flex items-center justify-center gap-1 rounded-lg transition-all flex-shrink-0",
                  // Mobile: icon only, 44px width for touch | Desktop: icon + text, auto width
                  "w-11 px-0 sm:w-auto sm:px-2",
                  selected
                    ? 'shadow-md ring-1 ring-primary/40 ring-offset-1 ring-offset-background'
                    : 'opacity-80 hover:opacity-100',
                  !isVisible && 'opacity-40'
                )}
              >
                {getCompactPhaseIcon(phase)}
                {/* Text hidden on mobile */}
                <span className="hidden sm:inline text-xs font-medium capitalize whitespace-nowrap">{info.name}</span>
              </Button>
            )
          })}
        </div>

        {/* Right arrow - 44px touch target on mobile */}
        <Button
          variant="outline"
          onClick={onNext}
          aria-label="Next phase"
          className="w-11 h-11 sm:w-9 sm:h-auto sm:!h-full flex-shrink-0 flex items-center justify-center p-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Button>
      </div>

      {/* Second row: Rotation: [1][2][3][4][5][6] */}
      <div className="flex items-center justify-center gap-1 sm:gap-2" aria-label="Select rotation">
        <span className="text-[11px] sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Rot:</span>
        <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto">
          {ROTATIONS.map(rotation => {
            const isActive = rotation === currentRotation
            return (
              <Button
                key={rotation}
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onRotationChange(rotation)}
                data-active={isActive}
                aria-pressed={isActive}
                className={cn(
                  "h-9 w-9 sm:w-auto sm:px-3 p-0 rounded-full font-semibold transition-all text-xs",
                  isActive
                    ? 'shadow-md ring-1 ring-primary/40 ring-offset-1 ring-offset-background'
                    : 'opacity-80 hover:opacity-100'
                )}
              >
                {rotation}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Third row: [all highlight buttons - horizontally scrollable on mobile, wrapped on desktop] */}
      {onRoleSelect && (
        <div className="border-t border-border pt-1.5 sm:pt-2.5">
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 sm:flex-wrap sm:justify-center scrollbar-hide">
            {ROLES.map(role => {
              const info = ROLE_INFO[role]
              const isSelected = highlightedRole === role

              return (
                <Button
                  key={role}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => onRoleSelect(isSelected ? null : role)}
                  data-active={isSelected}
                  aria-pressed={isSelected}
                  className={cn(
                    "h-9 px-3 sm:px-3 transition-all border-2 font-bold whitespace-nowrap text-xs flex-shrink-0",
                    isSelected
                      ? "shadow-lg scale-105 ring-2 ring-offset-2 ring-offset-background"
                      : "role-chip border-transparent opacity-80 hover:opacity-100 hover:border-border"
                  )}
                  style={{
                    backgroundColor: isSelected ? info.color : undefined,
                    color: isSelected ? getTextColorForOklch(info.color) : info.color,
                    borderColor: isSelected ? info.color : undefined,
                    // Use role color for ring on selected state
                    ...(isSelected && {
                      '--tw-ring-color': info.color,
                      boxShadow: `0 4px 6px -1px ${info.color}30, 0 2px 4px -2px ${info.color}20`,
                    } as React.CSSProperties),
                  }}
                >
                  {role}
                </Button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

