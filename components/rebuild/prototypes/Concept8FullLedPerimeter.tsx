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
            ? 'linear-gradient(180deg,rgba(241,245,248,0.98)_0%,rgba(216,224,230,0.98)_100%)'
            : 'linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(236,241,245,0.96)_100%)',
          borderColor: isActive ? 'rgba(117,132,145,0.62)' : 'rgba(135,154,170,0.28)',
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
      <div className="rounded-[22px] border border-[rgba(160,174,189,0.45)] bg-[linear-gradient(180deg,rgba(249,250,252,0.98)_0%,rgba(229,235,240,0.98)_100%)] p-2 shadow-[0_16px_30px_rgba(148,163,184,0.16),inset_0_1px_0_rgba(255,255,255,0.88)]">
        <PhasePadRotationRail {...props} />

        <div className="relative overflow-visible rounded-[18px] border border-[rgba(160,174,189,0.28)] bg-[linear-gradient(180deg,rgba(246,249,251,0.98)_0%,rgba(232,237,242,0.98)_100%)] p-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.84),inset_0_-10px_18px_rgba(181,197,210,0.12)]">
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

            <div className="relative z-[1] grid grid-cols-2 gap-px overflow-hidden rounded-[13px] border border-[rgba(170,181,191,0.22)] bg-[rgba(190,201,210,0.42)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
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
