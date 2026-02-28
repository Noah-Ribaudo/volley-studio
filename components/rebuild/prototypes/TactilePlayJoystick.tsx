'use client'

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import type { SwitchMotionTuning } from '@/lib/rebuild/tactileTuning'
import type { CorePhase } from '@/lib/rebuild/prototypeFlow'

interface TactilePlayJoystickProps {
  currentPhase: CorePhase
  nextPhase: CorePhase
  nextLabel: string
  switchMotion: SwitchMotionTuning
  onPlay: () => void
  onPhaseSelect: (phase: CorePhase) => void
  className?: string
}

type PhaseChip = {
  phase: CorePhase
  shortLabel: string
}

const QUADRANT_PHASES: [PhaseChip, PhaseChip, PhaseChip, PhaseChip] = [
  { phase: 'SERVE', shortLabel: 'Sv' },
  { phase: 'DEFENSE', shortLabel: 'Df' },
  { phase: 'RECEIVE', shortLabel: 'Rc' },
  { phase: 'OFFENSE', shortLabel: 'At' },
]

function clampOffset(x: number, y: number, radius: number): { x: number; y: number } {
  const mag = Math.hypot(x, y)
  if (mag <= radius || mag < 0.0001) return { x, y }
  const k = radius / mag
  return { x: x * k, y: y * k }
}

function getPhaseFromVector(dx: number, dy: number, deadZone: number): CorePhase | null {
  if (Math.hypot(dx, dy) < deadZone) {
    return null
  }
  if (dy < 0) {
    return dx < 0 ? 'SERVE' : 'DEFENSE'
  }
  return dx < 0 ? 'RECEIVE' : 'OFFENSE'
}

export function TactilePlayJoystick({
  currentPhase,
  nextPhase,
  nextLabel,
  switchMotion,
  onPlay,
  onPhaseSelect,
  className,
}: TactilePlayJoystickProps) {
  const prefersReducedMotion = useReducedMotion()
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragPhase, setDragPhase] = useState<CorePhase | null>(null)
  const isPointerDownRef = useRef(false)
  const movedSinceDownRef = useRef(false)
  const lastDragPhaseRef = useRef<CorePhase | null>(null)

  const MAX_TRAVEL = 16
  const DEAD_ZONE = 7

  const transition = prefersReducedMotion
    ? { duration: 0.001 }
    : {
        type: 'spring' as const,
        stiffness: switchMotion.spring.stiffness,
        damping: switchMotion.spring.damping,
        mass: switchMotion.spring.mass,
      }

  const selectedPhase = dragPhase ?? currentPhase

  const resetStick = () => {
    isPointerDownRef.current = false
    movedSinceDownRef.current = false
    lastDragPhaseRef.current = null
    setIsDragging(false)
    setDragPhase(null)
    setOffset({ x: 0, y: 0 })
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    isPointerDownRef.current = true
    movedSinceDownRef.current = false
    lastDragPhaseRef.current = null
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!isPointerDownRef.current) return

    const rect = event.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const dx = event.clientX - centerX
    const dy = event.clientY - centerY
    const clamped = clampOffset(dx, dy, MAX_TRAVEL)
    if (Math.hypot(clamped.x, clamped.y) > 2) {
      movedSinceDownRef.current = true
    }
    setOffset(clamped)

    const hovered = getPhaseFromVector(dx, dy, DEAD_ZONE)
    setDragPhase(hovered)
    if (hovered && hovered !== lastDragPhaseRef.current) {
      onPhaseSelect(hovered)
      lastDragPhaseRef.current = hovered
    }
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (isPointerDownRef.current && !movedSinceDownRef.current) {
      onPlay()
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    resetStick()
  }

  const handlePointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    resetStick()
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-1', className)}>
      <button
        type="button"
        aria-label={`Advance play to ${nextLabel}`}
        className={cn(
          'lab-inset lab-texture relative flex h-24 w-24 items-center justify-center rounded-full border border-border/60 p-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={isDragging ? handlePointerCancel : undefined}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onPlay()
          }
        }}
      >
        <div className="pointer-events-none absolute inset-3 rounded-full border border-border/45" />

        <div className="pointer-events-none absolute inset-2 grid grid-cols-2 grid-rows-2 overflow-hidden rounded-full">
          {QUADRANT_PHASES.map(({ phase, shortLabel }) => {
            const isSelected = selectedPhase === phase
            const isNext = !isDragging && nextPhase === phase
            return (
              <div
                key={phase}
                className={cn(
                  'flex items-center justify-center text-[9px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/80 transition-colors',
                  isSelected ? 'bg-primary/18 text-foreground' : undefined,
                  isNext && !isSelected ? 'bg-primary/10' : undefined
                )}
              >
                {shortLabel}
              </div>
            )
          })}
        </div>

        <motion.div
          animate={{ x: offset.x, y: offset.y, scale: isDragging ? 0.97 : 1 }}
          transition={transition}
          className="lab-pressable lab-texture relative flex h-11 w-11 items-center justify-center rounded-full border border-border/70 text-sm font-semibold text-foreground"
        >
          <span aria-hidden className="translate-x-[0.5px]">
            {'>'}
          </span>
        </motion.div>
      </button>
      <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Tap: {nextLabel} | Drag: phase</div>
    </div>
  )
}
