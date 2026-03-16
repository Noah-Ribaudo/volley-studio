'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import type { CorePhase } from '@/lib/rebuild/prototypeFlow'
import {
  PHASE_PAD_LAYOUT,
  PhasePadHardwareLane,
  PhasePadJoystick,
  PhasePadRotationRail,
  useQuarterTrackTravelState,
} from './PhasePadShared'
import type { PrototypeControlProps } from './types'

const C8_PHASE_ORDER: CorePhase[] = ['DEFENSE', 'OFFENSE', 'RECEIVE', 'SERVE']

function PhaseAreaTile({
  phase,
  label,
  isActive,
  switchMotion,
  onPhaseSelect,
}: {
  phase: CorePhase
  label: string
  isActive: boolean
  switchMotion: PrototypeControlProps['switchMotion']
  onPhaseSelect: (phase: CorePhase) => void
}) {
  const prefersReducedMotion = useReducedMotion()
  const [isPressed, setIsPressed] = useState(false)
  const transition = prefersReducedMotion
    ? { duration: 0.001 }
    : {
        type: 'spring' as const,
        stiffness: switchMotion.spring.stiffness,
        damping: switchMotion.spring.damping,
        mass: switchMotion.spring.mass,
      }

  return (
    <button
      type="button"
      onClick={() => onPhaseSelect(phase)}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerCancel={() => setIsPressed(false)}
      onPointerLeave={() => setIsPressed(false)}
      aria-pressed={isActive}
      className="relative rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <motion.div
        animate={{
          scale: isPressed && !isActive ? 0.992 : isActive ? 0.985 : 1,
          y: isPressed || isActive ? switchMotion.pressTravel : 0,
        }}
        transition={transition}
        className={cn(
          'lab-pressable relative flex min-h-[5.2rem] items-center justify-center border px-3 py-3 text-center text-[1.05rem] font-medium text-slate-800 transition-colors',
          isActive ? 'lab-pressed border-border/80 text-slate-950' : 'border-border/55 text-slate-700'
        )}
        style={{
          ['--lab-switch-knob-glow' as string]: switchMotion.knobGlow,
          background: isActive
            ? 'linear-gradient(180deg,rgba(223,210,188,0.98)_0%,rgba(198,181,155,0.98)_100%)'
            : 'linear-gradient(180deg,rgba(244,237,224,0.98)_0%,rgba(224,212,191,0.98)_100%)',
          borderColor: isActive ? 'rgba(152,126,89,0.58)' : 'rgba(170,146,111,0.3)',
        }}
      >
        <span className="relative z-[1] tracking-[-0.02em]">{label}</span>
      </motion.div>
    </button>
  )
}

export function Concept8FullLedPerimeter(props: PrototypeControlProps) {
  const hardwareTuning = props.tactileTuning.phasePadHardware
  const lanePadding = Math.max(8, hardwareTuning.trackWidth + 4.5)
  const perimeterState = useQuarterTrackTravelState({
    currentCorePhase: props.currentCorePhase,
    targetCorePhase: props.targetCorePhase,
    isPhaseTraveling: props.isPhaseTraveling,
    positionsPerQuarter: hardwareTuning.piecesPerQuarter,
    phaseOrder: C8_PHASE_ORDER,
    travelDurationMs: props.tactileTuning.c4Literal.connectorMotion.playDurationMs,
  })
  const activePhase = props.isPhaseTraveling ? props.targetCorePhase : props.currentCorePhase

  return (
    <div className="flex w-full flex-col justify-end">
      <div className="rounded-[22px] border border-[rgba(172,149,115,0.42)] bg-[linear-gradient(180deg,rgba(239,231,216,0.98)_0%,rgba(213,198,175,0.98)_100%)] p-2 shadow-[0_16px_30px_rgba(128,102,72,0.16),inset_0_1px_0_rgba(255,249,240,0.8)]">
        <PhasePadRotationRail {...props} />

        <div className="relative overflow-visible rounded-[18px] p-[10px]">
          <div
            className="relative z-[1] rounded-[14px]"
            style={{
              padding: `${lanePadding}px`,
            }}
          >
            <PhasePadHardwareLane
              tuning={hardwareTuning}
              segmentStart={perimeterState.segmentStart}
              segmentLength={perimeterState.segmentLength}
              totalLights={perimeterState.totalLights}
            />

            <div className="relative z-[1] grid grid-cols-2 gap-px overflow-hidden rounded-[13px] border border-[rgba(174,150,116,0.24)] bg-[rgba(187,164,131,0.34)] shadow-[inset_0_1px_0_rgba(255,247,234,0.38)]">
              {PHASE_PAD_LAYOUT.map((item) => (
                <PhaseAreaTile
                  key={item.phase}
                  phase={item.phase}
                  label={item.label}
                  isActive={item.phase === activePhase}
                  switchMotion={props.switchMotion}
                  onPhaseSelect={props.onPhaseSelect}
                />
              ))}
            </div>
          </div>

          <PhasePadJoystick props={props} />
        </div>
      </div>
    </div>
  )
}
