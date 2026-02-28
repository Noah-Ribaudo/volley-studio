'use client'

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import type { SwitchMotionTuning } from '@/lib/rebuild/tactileTuning'

interface PlayVector {
  x: number
  y: number
}

interface TactilePlayJoystickProps {
  nextLabel: string
  playVector: PlayVector
  switchMotion: SwitchMotionTuning
  onPlay: () => void
  className?: string
}

interface PointerOrigin {
  x: number
  y: number
}

function normalizeVector(vector: PlayVector): PlayVector {
  const mag = Math.hypot(vector.x, vector.y)
  if (mag < 0.0001) return { x: 1, y: 0 }
  return { x: vector.x / mag, y: vector.y / mag }
}

function clampOffset(x: number, y: number, radius: number): PlayVector {
  const mag = Math.hypot(x, y)
  if (mag <= radius || mag < 0.0001) return { x, y }
  const k = radius / mag
  return { x: x * k, y: y * k }
}

export function TactilePlayJoystick({
  nextLabel,
  playVector,
  switchMotion,
  onPlay,
  className,
}: TactilePlayJoystickProps) {
  const prefersReducedMotion = useReducedMotion()
  const [offset, setOffset] = useState<PlayVector>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const pointerOriginRef = useRef<PointerOrigin | null>(null)
  const movedSinceDownRef = useRef(false)

  const MAX_TRAVEL = 16
  const TRIGGER_PROJECTION = 10
  const targetDirection = useMemo(() => normalizeVector(playVector), [playVector])
  const indicatorDistance = 24

  const transition = prefersReducedMotion
    ? { duration: 0.001 }
    : {
        type: 'spring' as const,
        stiffness: switchMotion.spring.stiffness,
        damping: switchMotion.spring.damping,
        mass: switchMotion.spring.mass,
      }

  const indicatorX = targetDirection.x * indicatorDistance
  const indicatorY = targetDirection.y * indicatorDistance

  const resetStick = () => {
    pointerOriginRef.current = null
    movedSinceDownRef.current = false
    setIsDragging(false)
    setOffset({ x: 0, y: 0 })
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    pointerOriginRef.current = { x: event.clientX, y: event.clientY }
    movedSinceDownRef.current = false
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const origin = pointerOriginRef.current
    if (!origin) return

    const dx = event.clientX - origin.x
    const dy = event.clientY - origin.y
    const clamped = clampOffset(dx, dy, MAX_TRAVEL)
    if (Math.hypot(clamped.x, clamped.y) > 2) {
      movedSinceDownRef.current = true
    }
    setOffset(clamped)
  }

  const maybeTriggerPlay = () => {
    const projection = offset.x * targetDirection.x + offset.y * targetDirection.y
    if (projection >= TRIGGER_PROJECTION) {
      onPlay()
    }
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointerOriginRef.current) {
      if (movedSinceDownRef.current) {
        maybeTriggerPlay()
      } else {
        onPlay()
      }
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

        <div
          className="pointer-events-none absolute h-3 w-3 rounded-full bg-primary/35"
          style={{
            left: `calc(50% + ${indicatorX}px)`,
            top: `calc(50% + ${indicatorY}px)`,
            transform: 'translate(-50%, -50%)',
          }}
        />

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
      <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Push to {nextLabel}</div>
    </div>
  )
}
