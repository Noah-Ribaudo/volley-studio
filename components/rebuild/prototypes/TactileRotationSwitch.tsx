'use client'

import { motion, useReducedMotion } from 'motion/react'
import * as RadioGroup from '@radix-ui/react-radio-group'
import { cn } from '@/lib/utils'
import type { SwitchMotionTuning } from '@/lib/rebuild/tactileTuning'
import type { Rotation } from '@/lib/types'
import { TACTILE_ACCENT_HEX, TACTILE_ACCENT_SOFT_HEX } from './tactileAccent'

const ROTATIONS: Rotation[] = [1, 2, 3, 4, 5, 6]

interface TactileRotationSwitchProps {
  value: Rotation
  onValueChange: (rotation: Rotation) => void
  switchMotion: SwitchMotionTuning
  density?: 'default' | 'compact'
  className?: string
  style?: React.CSSProperties
  itemColors?: {
    bg: string
    activeBg: string
    text: string
    activeText: string
  }
}

export function TactileRotationSwitch({
  value,
  onValueChange,
  switchMotion,
  density = 'default',
  className,
  style,
  itemColors,
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
  const itemHeight = density === 'compact' ? 'h-[1.8rem]' : 'h-10'

  return (
    <RadioGroup.Root
      aria-label="Rotation selector"
      className={cn('lab-inset grid grid-cols-6 gap-0 overflow-hidden rounded-[inherit]', className)}
      style={style}
      value={String(value)}
      onValueChange={(next) => onValueChange(Number(next) as Rotation)}
    >
      {ROTATIONS.map((rotation) => {
        const isActive = value === rotation
        const isFirst = rotation === ROTATIONS[0]
        const isLast = rotation === ROTATIONS[ROTATIONS.length - 1]
        const backgroundSeed = itemColors?.activeBg ?? itemColors?.bg ?? 'rgba(255,255,255,0.14)'
        const inactiveShadow =
          'inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -1px 0 rgba(0,0,0,0.14), 0 3px 6px rgba(0,0,0,0.12)'
        const activeShadow =
          'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.28), 0 1px 2px rgba(0,0,0,0.12)'
        const inactiveBackground = `linear-gradient(180deg, color-mix(in oklch, ${backgroundSeed} 26%, white 74%) 0%, color-mix(in oklch, ${backgroundSeed} 14%, white 86%) 100%)`
        const activeBackground = `linear-gradient(180deg, color-mix(in oklch, ${backgroundSeed} 42%, black 58%) 0%, color-mix(in oklch, ${backgroundSeed} 24%, black 76%) 100%)`

        return (
          <RadioGroup.Item
            key={rotation}
            className={cn(
              'relative outline-none focus-visible:z-[2] focus-visible:ring-2 focus-visible:ring-primary/60',
              !isFirst && 'border-l border-black/10'
            )}
            value={String(rotation)}
          >
            <motion.div
              animate={{
                scale: 1,
                y: isActive ? pressTravel + 1.5 : 0,
              }}
              className={cn(
                'lab-pressable relative flex w-full items-center justify-center overflow-hidden border-y border-r text-center text-[10px] font-semibold tracking-[0.08em] transition-colors',
                itemHeight,
                isFirst && 'border-l',
                isFirst && 'rounded-l-[inherit]',
                isLast && 'rounded-r-[inherit]',
                isActive ? 'lab-pressed border-border/80 z-[1]' : 'border-border/55',
                !itemColors && (!isActive ? 'text-foreground/90 text-muted-foreground' : '')
              )}
              style={{
                ['--lab-switch-knob-glow' as string]: switchMotion.knobGlow,
                background: isActive ? activeBackground : inactiveBackground,
                color: isActive ? TACTILE_ACCENT_HEX : itemColors?.text,
                boxShadow: isActive ? activeShadow : inactiveShadow,
                textShadow: isActive ? `0 0 12px color-mix(in srgb, ${TACTILE_ACCENT_SOFT_HEX} 54%, transparent)` : undefined,
              }}
              transition={transition}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[inherit]"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 36%, transparent 100%)',
                  opacity: isActive ? 0.7 : 0.9,
                }}
              />
              R{rotation}
            </motion.div>
          </RadioGroup.Item>
        )
      })}
    </RadioGroup.Root>
  )
}
