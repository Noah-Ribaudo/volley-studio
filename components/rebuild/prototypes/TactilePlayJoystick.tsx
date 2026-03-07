'use client'

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { CorePhase } from '@/lib/rebuild/prototypeFlow'
import type { JoystickTuning, PhaseEmphasisTuning, SwitchMotionTuning } from '@/lib/rebuild/tactileTuning'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD
 *
 * Read top-to-bottom. Each state is ms after interaction.
 *
 *    0ms   touch begins, knob wakes and halo brightens
 *   40ms   hovered quadrant emphasis updates live while dragging
 *  120ms   legal-next halo settles on its target phase
 *  180ms   knob recenters using joystick settle spring
 * ───────────────────────────────────────────────────────── */

const TIMING = {
  highlightSettle: 120, // next-phase halo settles after state changes
}

const JOYSTICK_FRAME = {
  radial: {
    frameSize: 148,
    knobSize: 44,
    inset: 9,
    labelClassName: 'text-[11px] tracking-[0.01em]',
  },
  literal: {
    frameSize: 86,
    knobSize: 38,
    inset: 8,
    labelClassName: 'text-[9px] tracking-[0.06em]',
  },
} as const

type JoystickMode = keyof typeof JOYSTICK_FRAME

type PhaseChip = {
  phase: CorePhase
  longLabel: string
  shortLabel: string
}

const QUADRANT_PHASES: [PhaseChip, PhaseChip, PhaseChip, PhaseChip] = [
  { phase: 'SERVE', longLabel: 'Serve', shortLabel: 'Sv' },
  { phase: 'DEFENSE', longLabel: 'Defense', shortLabel: 'Df' },
  { phase: 'RECEIVE', longLabel: 'Receive', shortLabel: 'Rc' },
  { phase: 'OFFENSE', longLabel: 'Attack', shortLabel: 'At' },
]

interface TactilePlayJoystickProps {
  currentPhase: CorePhase
  nextPhase: CorePhase
  nextLabel: string
  mode?: JoystickMode
  switchMotion: SwitchMotionTuning
  joystickTuning: JoystickTuning
  phaseEmphasis: PhaseEmphasisTuning
  onPlay: () => void
  onPhaseSelect: (phase: CorePhase) => void
  className?: string
}

function clampOffset(x: number, y: number, radius: number): { x: number; y: number } {
  const magnitude = Math.hypot(x, y)
  if (magnitude <= radius || magnitude < 0.0001) return { x, y }
  const scalar = radius / magnitude
  return { x: x * scalar, y: y * scalar }
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

function isFoundationalPhase(phase: CorePhase): boolean {
  return phase === 'SERVE' || phase === 'RECEIVE'
}

function getPhaseContrast(
  phase: CorePhase,
  currentPhase: CorePhase,
  phaseEmphasis: PhaseEmphasisTuning
): number {
  const currentIsFoundational = isFoundationalPhase(currentPhase)
  const phaseIsFoundational = isFoundationalPhase(phase)
  const contrast = currentIsFoundational
    ? phaseEmphasis.foundationalContrast
    : phaseEmphasis.reactiveContrast

  return phaseIsFoundational === currentIsFoundational
    ? 1 + contrast * 0.22
    : 1 - contrast * 0.18
}

function getQuadrantLabel(chip: PhaseChip, mode: JoystickMode): string {
  return mode === 'radial' ? chip.longLabel : chip.shortLabel
}

export function TactilePlayJoystick({
  currentPhase,
  nextPhase,
  nextLabel,
  mode = 'radial',
  switchMotion,
  joystickTuning,
  phaseEmphasis,
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

  const frame = JOYSTICK_FRAME[mode]
  const selectedPhase = dragPhase ?? currentPhase

  const quadrantTransition = prefersReducedMotion
    ? { duration: 0.001 }
    : {
        duration: TIMING.highlightSettle / 1000,
      }

  const knobTransition = prefersReducedMotion
    ? { duration: 0.001 }
    : {
        type: 'spring' as const,
        stiffness: joystickTuning.settleSpring.stiffness,
        damping: joystickTuning.settleSpring.damping,
        mass: joystickTuning.settleSpring.mass,
      }

  const shellTransition = prefersReducedMotion
    ? { duration: 0.001 }
    : {
        type: 'spring' as const,
        stiffness: switchMotion.spring.stiffness,
        damping: switchMotion.spring.damping,
        mass: switchMotion.spring.mass,
      }

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
    const clamped = clampOffset(dx, dy, joystickTuning.travel)
    if (Math.hypot(clamped.x, clamped.y) > 2) {
      movedSinceDownRef.current = true
    }
    setOffset(clamped)

    const hovered = getPhaseFromVector(dx, dy, joystickTuning.deadZone)
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
    <div className={cn('flex items-center justify-center', className)}>
      <motion.button
        type="button"
        aria-label={`Advance play to ${nextLabel}`}
        animate={{
          scale: isDragging ? 0.992 : 1,
          y: isDragging ? switchMotion.pressTravel * 0.2 : 0,
        }}
        transition={shellTransition}
        className={cn(
          'lab-inset lab-texture relative shrink-0 rounded-full border border-border/60 p-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
        style={{
          width: frame.frameSize,
          height: frame.frameSize,
          touchAction: 'none',
        }}
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
        <div
          className="pointer-events-none absolute rounded-full border border-border/45"
          style={{
            inset: frame.inset,
          }}
        />

        <div
          className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-2 overflow-hidden rounded-full"
          style={{
            padding: frame.inset,
            gap: mode === 'radial' ? 7 : 5,
          }}
        >
          {QUADRANT_PHASES.map((chip) => {
            const isSelected = selectedPhase === chip.phase
            const isCurrent = currentPhase === chip.phase
            const isNext = nextPhase === chip.phase
            const contrast = getPhaseContrast(chip.phase, currentPhase, phaseEmphasis)
            const selectedScale = isSelected ? phaseEmphasis.currentWeight : 1
            const glowAlpha = isNext ? phaseEmphasis.nextGlow * 0.32 : 0
            const fillAlpha = isSelected ? 0.12 + contrast * 0.12 : 0.03 + contrast * 0.04

            return (
              <motion.div
                key={chip.phase}
                animate={{
                  scale: selectedScale,
                  opacity: isSelected ? 1 : 0.84 + contrast * 0.1,
                }}
                transition={quadrantTransition}
                className={cn(
                  'relative flex items-center justify-center rounded-[999px] border border-transparent text-center font-medium text-foreground/88',
                  frame.labelClassName,
                  mode === 'literal' && 'uppercase'
                )}
                style={{
                  background: `oklch(72% 0.14 55 / ${fillAlpha})`,
                  boxShadow: isNext
                    ? `0 0 ${10 + phaseEmphasis.nextGlow * 16}px oklch(72% 0.14 55 / ${glowAlpha})`
                    : undefined,
                }}
              >
                {isCurrent ? (
                  <span className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-foreground/85" />
                ) : null}
                <span>{getQuadrantLabel(chip, mode)}</span>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          animate={{
            x: offset.x,
            y: offset.y,
            scale: isDragging ? 0.97 : 1,
          }}
          transition={knobTransition}
          className="lab-pressable lab-texture absolute left-1/2 top-1/2 flex items-center justify-center rounded-full border border-border/70 text-sm font-semibold text-foreground"
          style={{
            width: frame.knobSize,
            height: frame.knobSize,
            marginLeft: frame.knobSize / -2,
            marginTop: frame.knobSize / -2,
            boxShadow: `0 0 ${14 + joystickTuning.haloIntensity * 18}px oklch(72% 0.14 55 / ${0.08 + joystickTuning.haloIntensity * 0.24})`,
          }}
        >
          <span aria-hidden className="translate-x-[0.5px] text-base">
            {'>'}
          </span>
        </motion.div>
      </motion.button>
    </div>
  )
}
