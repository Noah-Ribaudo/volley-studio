'use client'

import { motion, useReducedMotion } from 'motion/react'
import * as RadioGroup from '@radix-ui/react-radio-group'
import { cn } from '@/lib/utils'
import type { SwitchMotionTuning } from '@/lib/rebuild/tactileTuning'
import type { Rotation } from '@/lib/types'

const ROTATIONS: Rotation[] = [1, 2, 3, 4, 5, 6]

interface TactileRotationSwitchProps {
  value: Rotation
  onValueChange: (rotation: Rotation) => void
  switchMotion: SwitchMotionTuning
  density?: 'default' | 'compact'
  className?: string
}

export function TactileRotationSwitch({
  value,
  onValueChange,
  switchMotion,
  density = 'default',
  className,
}: TactileRotationSwitchProps) {
  const prefersReducedMotion = useReducedMotion()

  const transition = prefersReducedMotion
    ? { duration: 0.001 }
    : {
        type: 'spring' as const,
        stiffness: switchMotion.spring.stiffness,
        damping: switchMotion.spring.damping,
        mass: switchMotion.spring.mass,
      }

  const pressTravel = prefersReducedMotion ? 0 : switchMotion.pressTravel
  const itemHeight = density === 'compact' ? 'h-8' : 'h-10'

  return (
    <RadioGroup.Root
      aria-label="Rotation selector"
      className={cn('lab-inset grid grid-cols-6 gap-1 rounded-xl p-1', className)}
      value={String(value)}
      onValueChange={(next) => onValueChange(Number(next) as Rotation)}
    >
      {ROTATIONS.map((rotation) => {
        const isActive = value === rotation

        return (
          <RadioGroup.Item
            key={rotation}
            className="relative rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            value={String(rotation)}
          >
            <motion.div
              animate={{
                scale: isActive ? 0.985 : 1,
                y: isActive ? pressTravel : 0,
              }}
              className={cn(
                'lab-pressable flex w-full items-center justify-center rounded-lg border text-center text-[11px] font-semibold tracking-[0.08em] text-foreground/90 transition-colors',
                itemHeight,
                isActive ? 'lab-pressed border-border/80 text-foreground' : 'border-border/55 text-muted-foreground'
              )}
              style={{ ['--lab-switch-knob-glow' as string]: switchMotion.knobGlow }}
              transition={transition}
            >
              R{rotation}
            </motion.div>
          </RadioGroup.Item>
        )
      })}
    </RadioGroup.Root>
  )
}
