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
      className={cn('lab-inset grid grid-cols-6 gap-1 rounded-xl p-1', className)}
      style={style}
      value={String(value)}
      onValueChange={(next) => onValueChange(Number(next) as Rotation)}
    >
      {ROTATIONS.map((rotation) => {
        const isActive = value === rotation
        const inactiveShadow =
          'inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -1px 0 rgba(0,0,0,0.14), 0 4px 8px rgba(0,0,0,0.14), 0 10px 14px -12px rgba(0,0,0,0.28)'
        const activeShadow =
          'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 8px 12px rgba(255,255,255,0.08), inset 0 -5px 8px rgba(0,0,0,0.18), 0 2px 3px rgba(0,0,0,0.12)'
        const inactiveBackground = itemColors?.bg ?? 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)'
        const activeBackground =
          itemColors?.activeBg ?? 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 100%)'

        return (
          <RadioGroup.Item
            key={rotation}
            className="relative rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            value={String(rotation)}
          >
            <motion.div
              animate={{
                scale: isActive ? 0.972 : 1,
                y: isActive ? pressTravel + 0.5 : 0,
              }}
              className={cn(
                'lab-pressable relative flex w-full items-center justify-center overflow-hidden rounded-lg border text-center text-[10px] font-semibold tracking-[0.08em] transition-colors',
                itemHeight,
                isActive ? 'lab-pressed border-border/80' : 'border-border/55',
                !itemColors && (isActive ? 'text-foreground' : 'text-foreground/90 text-muted-foreground')
              )}
              style={{
                ['--lab-switch-knob-glow' as string]: switchMotion.knobGlow,
                background: isActive ? activeBackground : inactiveBackground,
                color: itemColors ? (isActive ? itemColors.activeText : itemColors.text) : undefined,
                boxShadow: isActive ? activeShadow : inactiveShadow,
              }}
              transition={transition}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[inherit]"
                style={{
                  background: isActive
                    ? 'linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.06) 42%, transparent 100%)'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 36%, transparent 100%)',
                  opacity: isActive ? 1 : 0.9,
                }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-[4px] bottom-[2px] h-[22%] rounded-full"
                style={{
                  background: isActive
                    ? 'radial-gradient(circle at 50% 0%, rgba(0,0,0,0.16) 0%, transparent 80%)'
                    : 'radial-gradient(circle at 50% 0%, rgba(0,0,0,0.1) 0%, transparent 78%)',
                  opacity: isActive ? 0.8 : 0.55,
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
