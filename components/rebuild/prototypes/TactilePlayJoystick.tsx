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
    inset: 10,
    labelClassName: 'text-[11px] tracking-[0.01em]',
  },
  literal: {
    frameSize: 84,
    knobSize: 36,
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

const LITERAL_GUIDES: Array<{ phase: CorePhase; x: number; y: number }> = [
  { phase: 'SERVE', x: 28, y: 28 },
  { phase: 'DEFENSE', x: 72, y: 28 },
  { phase: 'RECEIVE', x: 28, y: 72 },
  { phase: 'OFFENSE', x: 72, y: 72 },
]

interface TactilePlayJoystickProps {
  currentPhase: CorePhase
  nextPhase: CorePhase
  nextLabel: string
  isPreviewingMovement?: boolean
  transitionProgress?: number
  mode?: JoystickMode
  frameSizeOverride?: number
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

function getPhaseTint(phase: CorePhase): string {
  return isFoundationalPhase(phase) ? 'oklch(78% 0.08 72)' : 'oklch(76% 0.03 255)'
}

export function TactilePlayJoystick({
  currentPhase,
  nextPhase,
  nextLabel,
  mode = 'radial',
  frameSizeOverride,
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

  const defaultFrame = JOYSTICK_FRAME[mode]
  const frame =
    mode === 'literal' && frameSizeOverride
      ? {
          ...defaultFrame,
          frameSize: frameSizeOverride,
          knobSize: Math.round(frameSizeOverride * 0.43),
          inset: Math.max(6, Math.round(frameSizeOverride * 0.1)),
        }
      : defaultFrame
  const selectedPhase = dragPhase ?? currentPhase
  const textureSize = `${joystickTuning.ringTextureSpacingX}px ${joystickTuning.ringTextureSpacingY}px`
  const textureStroke = `oklch(96% 0.02 90 / ${0.1 + joystickTuning.ringTextureOpacity * 0.45})`
  const textureShadow = `oklch(45% 0.12 42 / ${joystickTuning.ringTextureDepth * 0.34})`

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
          {mode === 'radial'
            ? QUADRANT_PHASES.map((chip) => {
                const isSelected = selectedPhase === chip.phase
                const isNext = nextPhase === chip.phase
                const contrast = getPhaseContrast(chip.phase, currentPhase, phaseEmphasis)
                const selectedScale = isSelected ? phaseEmphasis.currentWeight : 1
                const tone = getPhaseTint(chip.phase)

                return (
                  <motion.div
                    key={chip.phase}
                    animate={{
                      scale: selectedScale,
                      opacity: isSelected ? 1 : 0.88 + contrast * 0.06,
                    }}
                    transition={quadrantTransition}
                    className={cn(
                      'relative flex items-center justify-center rounded-[999px] border text-center font-medium text-foreground/90',
                      frame.labelClassName
                    )}
                    style={{
                      background: isSelected
                        ? `color-mix(in oklch, var(--card) 66%, ${tone} 34%)`
                        : `color-mix(in oklch, var(--card) 84%, ${tone} 16%)`,
                      borderColor: isSelected
                        ? `color-mix(in oklch, var(--border) 36%, ${tone} 64%)`
                        : `color-mix(in oklch, var(--border) 78%, ${tone} 22%)`,
                      boxShadow: isNext
                        ? `0 0 ${10 + phaseEmphasis.nextGlow * 16}px oklch(72% 0.14 55 / ${phaseEmphasis.nextGlow * 0.24})`
                        : undefined,
                    }}
                  >
                    <span>{getQuadrantLabel(chip, mode)}</span>
                  </motion.div>
                )
              })
            : null}
        </div>

        {mode === 'literal' ? (
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-[18%]"
            viewBox="0 0 100 100"
          >
            {LITERAL_GUIDES.map((guide) => {
              const isSelected = selectedPhase === guide.phase
              const isNext = nextPhase === guide.phase

              return (
                <path
                  key={guide.phase}
                  d={`M50 50 L${guide.x} ${guide.y}`}
                  fill="none"
                  stroke="var(--primary)"
                  strokeLinecap="round"
                  strokeOpacity={isSelected ? 0.52 : isNext ? 0.38 : 0.16}
                  strokeWidth={isSelected ? 2.6 : isNext ? 2 : 1.2}
                />
              )
            })}
          </svg>
        ) : null}

        <div
          className="pointer-events-none absolute left-1/2 top-1/2"
          style={{
            width: frame.knobSize,
            height: frame.knobSize,
            marginLeft: frame.knobSize / -2,
            marginTop: frame.knobSize / -2,
          }}
        >
          <motion.div
            animate={{
              x: offset.x,
              y: offset.y,
              scale: isDragging ? 0.97 : 1,
            }}
            transition={knobTransition}
            className={cn(
              'lab-raised relative flex h-full w-full items-center justify-center rounded-full text-sm font-semibold text-foreground',
              isDragging && 'lab-pressed'
            )}
            style={{
              background:
                'radial-gradient(circle at 32% 28%, oklch(88% 0.05 85 / 0.92) 0%, oklch(82% 0.08 74 / 0.78) 12%, transparent 26%), linear-gradient(180deg, oklch(76% 0.17 62) 0%, oklch(68% 0.19 52) 42%, oklch(60% 0.18 42) 100%)',
              boxShadow: `0 0 ${14 + joystickTuning.haloIntensity * 18}px oklch(72% 0.14 55 / ${0.08 + joystickTuning.haloIntensity * 0.24}), inset 0 1px 0 oklch(97% 0.01 90 / 0.52), inset 0 -7px 12px oklch(42% 0.12 34 / 0.34)`,
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-full opacity-70"
              style={{
                backgroundImage: [
                  `linear-gradient(30deg, ${textureStroke} 10%, transparent 10.5%, transparent 89%, ${textureStroke} 89.5%, ${textureStroke} 100%)`,
                  `linear-gradient(150deg, ${textureStroke} 10%, transparent 10.5%, transparent 89%, ${textureStroke} 89.5%, ${textureStroke} 100%)`,
                  `linear-gradient(90deg, ${textureShadow} 2%, transparent 2.5%, transparent 97%, ${textureShadow} 98%)`,
                ].join(', '),
                backgroundSize: `${textureSize}, ${textureSize}, ${textureSize}`,
                backgroundPosition: '0 0, 0 0, 0 0',
                WebkitMaskImage:
                  `radial-gradient(circle, transparent 50%, black 56%, black 100%)`,
                maskImage:
                  `radial-gradient(circle, transparent 50%, black 56%, black 100%)`,
              }}
            />
            <div className="pointer-events-none absolute inset-[18%] rounded-full border border-white/18 bg-black/5" />
          </motion.div>
        </div>
      </motion.button>
    </div>
  )
}
