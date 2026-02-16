'use client'

import { Button } from '@/components/ui/button'
import { Phase, PHASES, RALLY_PHASES, Rotation, ROTATIONS } from '@/lib/types'
import type { RallyPhase } from '@/lib/types'
import { cn } from '@/lib/utils'
import { getPhaseInfo, getCompactPhaseIcon, isRallyPhase as checkIsRallyPhase } from '@/lib/phaseIcons'
import { ArrowLeft01Icon, ArrowRight01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useAppStore } from '@/store/useAppStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MobileContextBarProps {
  currentRotation: Rotation
  currentPhase: Phase
  onPhaseChange: (phase: Phase) => void
  onRotationChange: (rotation: Rotation) => void
  onNext?: () => void
  onPrev?: () => void
  visiblePhases?: Set<RallyPhase>
}

/**
 * Mobile contextual bar that sits directly above the bottom tab bar.
 * Uses a fixed phase strip (prev/current/next) for higher readability and
 * more stable interaction than the animated carousel.
 */
export function MobileContextBar({
  currentRotation,
  currentPhase,
  onPhaseChange,
  onRotationChange,
  onNext,
  onPrev,
  visiblePhases,
}: MobileContextBarProps) {
  const isPreviewingMovement = useAppStore((state) => state.isPreviewingMovement)
  const setPreviewingMovement = useAppStore((state) => state.setPreviewingMovement)
  const triggerPlayAnimation = useAppStore((state) => state.triggerPlayAnimation)

  const isRallyPhase = checkIsRallyPhase(currentPhase)
  const phasesToShow = isRallyPhase
    ? (visiblePhases ? RALLY_PHASES.filter((phase) => visiblePhases.has(phase)) : RALLY_PHASES)
    : PHASES

  const phaseCount = phasesToShow.length
  const currentIndex = phasesToShow.findIndex((phase) => phase === currentPhase)
  const safeIndex = currentIndex >= 0 ? currentIndex : 0

  const getPhaseAtOffset = (offset: number): Phase => {
    if (phaseCount === 0) return currentPhase
    const idx = (safeIndex + offset + phaseCount) % phaseCount
    return phasesToShow[idx]
  }

  const phaseSlots = {
    left: phaseCount >= 2 ? getPhaseAtOffset(-1) : null,
    current: getPhaseAtOffset(0),
    right: phaseCount >= 3 ? getPhaseAtOffset(1) : null,
  }

  const handlePrevPhase = () => {
    if (onPrev) {
      onPrev()
      return
    }
    onPhaseChange(getPhaseAtOffset(-1))
  }

  const handleNextPhase = () => {
    if (onNext) {
      onNext()
      return
    }
    onPhaseChange(getPhaseAtOffset(1))
  }

  return (
    <div
      className="fixed left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md md:hidden"
      style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex items-center gap-1 px-2 py-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 shrink-0 gap-1 px-2.5 bg-background/85">
              <span className="text-sm font-semibold">R{currentRotation}</span>
              <HugeiconsIcon icon={ArrowDown01Icon} className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="mb-2">
            {ROTATIONS.map((rotation) => (
              <DropdownMenuItem
                key={rotation}
                onClick={() => onRotationChange(rotation)}
                className={cn(
                  "py-2",
                  rotation === currentRotation && "bg-accent"
                )}
              >
                Rotation {rotation}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex min-w-0 flex-1 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handlePrevPhase}
            aria-label="Previous phase"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
          </Button>

          <div className="grid min-w-0 flex-1 grid-cols-3 gap-1">
            {(['left', 'current', 'right'] as const).map((slot) => {
              const phase = phaseSlots[slot]
              if (!phase) {
                return <div key={slot} className="h-8 rounded-md" aria-hidden="true" />
              }

              const info = getPhaseInfo(phase)
              const isCurrent = slot === 'current'

              return (
                <Button
                  key={`${slot}-${phase}`}
                  variant="ghost"
                  size="sm"
                  onClick={() => onPhaseChange(phase)}
                  aria-pressed={isCurrent}
                  aria-label={info.name}
                  title={info.name}
                  className={cn(
                    'h-8 min-w-0 gap-1 px-2 text-[11px] leading-none',
                    isCurrent
                      ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  )}
                >
                  {getCompactPhaseIcon(phase)}
                  <span className="truncate font-medium">{info.name}</span>
                </Button>
              )
            })}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleNextPhase}
            aria-label="Next phase"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          className="h-9 min-w-[4.5rem] shrink-0 justify-center px-2.5"
          onClick={() => {
            if (isPreviewingMovement) {
              setPreviewingMovement(false)
              return
            }
            triggerPlayAnimation()
            setPreviewingMovement(true)
          }}
          aria-label={isPreviewingMovement ? 'Reset movement preview' : 'Play movement preview'}
        >
          <span className="text-xs font-semibold">
            {isPreviewingMovement ? 'Reset' : 'Play'}
          </span>
        </Button>
      </div>
    </div>
  )
}
