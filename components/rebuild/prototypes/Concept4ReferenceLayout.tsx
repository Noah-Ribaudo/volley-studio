'use client'

import { motion, useReducedMotion } from 'motion/react'
import { formatCorePhaseLabel, type CorePhase } from '@/lib/rebuild/prototypeFlow'
import { cn } from '@/lib/utils'
import { TactileRotationSwitch } from './TactileRotationSwitch'
import type { PrototypeControlProps } from './types'

function getPhaseLabel(phase: CorePhase): string {
  if (phase === 'OFFENSE') return 'Attack'
  return formatCorePhaseLabel(phase)
}

function TactilePhaseButton({
  phase,
  currentCorePhase,
  nextByPlay,
  switchMotion,
  onPhaseSelect,
}: {
  phase: CorePhase
  currentCorePhase: CorePhase
  nextByPlay: CorePhase
  switchMotion: PrototypeControlProps['switchMotion']
  onPhaseSelect: (phase: CorePhase) => void
}) {
  const prefersReducedMotion = useReducedMotion()
  const isActive = currentCorePhase === phase
  const isNext = nextByPlay === phase

  const transition = prefersReducedMotion
    ? { duration: 0.001 }
    : {
        type: 'spring' as const,
        stiffness: switchMotion.spring.stiffness,
        damping: switchMotion.spring.damping,
        mass: switchMotion.spring.mass,
      }

  const pressTravel = prefersReducedMotion ? 0 : switchMotion.pressTravel

  return (
    <motion.button
      type="button"
      aria-pressed={isActive}
      onClick={() => onPhaseSelect(phase)}
      animate={{
        y: isActive ? pressTravel : 0,
        scale: isActive ? 0.985 : 1,
      }}
      transition={transition}
      className={cn(
        'lab-pressable lab-texture relative z-[2] flex h-14 items-center justify-center rounded-xl border px-3 text-center text-xl font-medium tracking-[0.01em] text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/60',
        isActive ? 'lab-pressed border-border/85' : 'border-border/60 hover:border-border/75',
        isNext && !isActive ? 'ring-1 ring-primary/40' : undefined
      )}
    >
      {getPhaseLabel(phase)}
    </motion.button>
  )
}

export function Concept4ReferenceLayout({
  currentRotation,
  currentCorePhase,
  nextByPlay,
  switchMotion,
  onRotationSelect,
  onPhaseSelect,
  onPlay,
}: PrototypeControlProps) {
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
  const topLinkActive = currentCorePhase === 'SERVE'
  const bottomLinkActive = currentCorePhase === 'RECEIVE'
  const loopLinkActive = currentCorePhase === 'OFFENSE' || currentCorePhase === 'DEFENSE'

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Concept 4</p>
          <h2 className="text-sm font-semibold">Reference Relay Layout</h2>
        </div>
        <div className="rounded-full border border-border bg-card px-3 py-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          Next: {getPhaseLabel(nextByPlay)}
        </div>
      </div>

      <TactileRotationSwitch value={currentRotation} onValueChange={onRotationSelect} switchMotion={switchMotion} />

      <div className="lab-inset relative min-h-0 flex-1 rounded-xl p-3">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 66"
          preserveAspectRatio="none"
        >
          <line
            x1="30"
            y1="20"
            x2="70"
            y2="20"
            stroke={topLinkActive ? 'var(--primary)' : 'var(--border)'}
            strokeOpacity={topLinkActive ? 0.95 : 0.8}
            strokeWidth="1.25"
          />
          <line
            x1="30"
            y1="46"
            x2="70"
            y2="46"
            stroke={bottomLinkActive ? 'var(--primary)' : 'var(--border)'}
            strokeOpacity={bottomLinkActive ? 0.95 : 0.7}
            strokeWidth="1.25"
            strokeDasharray="2.25 1.75"
          />
          <line
            x1="78"
            y1="24"
            x2="78"
            y2="42"
            stroke={loopLinkActive ? 'var(--primary)' : 'var(--border)'}
            strokeOpacity={loopLinkActive ? 0.95 : 0.8}
            strokeWidth="1.25"
          />
          <text
            x="52.5"
            y="18.5"
            fill="var(--muted-foreground)"
            fontSize="2.6"
            textAnchor="middle"
            style={{ letterSpacing: '0.04em' }}
          >
            serve to defense
          </text>
          <text
            x="52.5"
            y="49.5"
            fill="var(--muted-foreground)"
            fontSize="2.6"
            textAnchor="middle"
            style={{ letterSpacing: '0.04em' }}
          >
            receive to attack
          </text>
          <text
            x="80"
            y="34"
            fill="var(--muted-foreground)"
            fontSize="2.6"
            textAnchor="start"
            style={{ letterSpacing: '0.04em' }}
          >
            live loop
          </text>
        </svg>

        <div className="relative z-[2] grid h-full min-h-[188px] grid-cols-[1fr_auto_1fr] grid-rows-2 gap-x-3 gap-y-3">
          <TactilePhaseButton
            phase="SERVE"
            currentCorePhase={currentCorePhase}
            nextByPlay={nextByPlay}
            switchMotion={switchMotion}
            onPhaseSelect={onPhaseSelect}
          />

          <motion.button
            type="button"
            aria-label={`Play to ${getPhaseLabel(nextByPlay)}`}
            onClick={onPlay}
            whileTap={prefersReducedMotion ? undefined : { y: pressTravel, scale: 0.985 }}
            transition={transition}
            className="lab-pressable lab-texture row-span-2 flex h-full min-h-[128px] w-16 items-center justify-center rounded-xl border border-border/60 px-2 outline-none transition-colors hover:border-border/80 focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="lab-raised flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 text-center text-base font-semibold">
                {'>'}
              </div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Play</div>
            </div>
          </motion.button>

          <TactilePhaseButton
            phase="DEFENSE"
            currentCorePhase={currentCorePhase}
            nextByPlay={nextByPlay}
            switchMotion={switchMotion}
            onPhaseSelect={onPhaseSelect}
          />

          <TactilePhaseButton
            phase="RECEIVE"
            currentCorePhase={currentCorePhase}
            nextByPlay={nextByPlay}
            switchMotion={switchMotion}
            onPhaseSelect={onPhaseSelect}
          />

          <TactilePhaseButton
            phase="OFFENSE"
            currentCorePhase={currentCorePhase}
            nextByPlay={nextByPlay}
            switchMotion={switchMotion}
            onPhaseSelect={onPhaseSelect}
          />
        </div>
      </div>
    </div>
  )
}
