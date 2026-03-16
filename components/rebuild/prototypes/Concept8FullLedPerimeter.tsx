'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import {
  formatPrototypePhaseLabel,
  type CorePhase,
  type PrototypePhase,
} from '@/lib/rebuild/prototypeFlow'
import { cn } from '@/lib/utils'
import type { PrototypeControlProps } from './types'
import {
  PHASE_PAD_LAYOUT,
  PhasePadHardwareLane,
  PhasePadJoystick,
  PhasePadRotationRail,
  useQuarterTrackTravelState,
} from './PhasePadShared'

const C8_PHASE_ORDER: CorePhase[] = ['DEFENSE', 'OFFENSE', 'RECEIVE', 'SERVE']
const INNER_CORNER_CUT = 64

function getInnerCornerPosition(row: 'top' | 'bottom', column: 'left' | 'right') {
  return {
    top: row === 'top' ? 'auto' : `${INNER_CORNER_CUT / -2}px`,
    bottom: row === 'top' ? `${INNER_CORNER_CUT / -2}px` : 'auto',
    left: column === 'left' ? 'auto' : `${INNER_CORNER_CUT / -2}px`,
    right: column === 'left' ? `${INNER_CORNER_CUT / -2}px` : 'auto',
  }
}

function PhaseAreaTile({
  phase,
  label,
  isActive,
  row,
  column,
  switchMotion,
  onManualPhaseSelect,
}: {
  phase: CorePhase
  label: string
  isActive: boolean
  row: 'top' | 'bottom'
  column: 'left' | 'right'
  switchMotion: PrototypeControlProps['switchMotion']
  onManualPhaseSelect: (phase: PrototypePhase) => void
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
      onClick={() => onManualPhaseSelect(phase)}
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
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            width: `${INNER_CORNER_CUT}px`,
            height: `${INNER_CORNER_CUT}px`,
            ...getInnerCornerPosition(row, column),
            background:
              'radial-gradient(circle at 50% 50%, rgba(206,186,153,0.84) 0%, rgba(216,197,166,0.96) 56%, rgba(229,214,188,0.98) 100%)',
            boxShadow: [
              'inset 0 1px 0 rgba(255,248,235,0.64)',
              'inset 0 -9px 12px rgba(141,112,76,0.12)',
              '0 1px 0 rgba(255,247,231,0.42)',
            ].join(', '),
          }}
        />
        <span className="relative z-[1] tracking-[-0.02em]">{label}</span>
      </motion.div>
    </button>
  )
}

function VariantAccessory(props: PrototypeControlProps) {
  const isReceiveActive = props.currentCorePhase === 'RECEIVE' || props.currentCorePhase === 'FIRST_ATTACK'
  const firstAttackActive = props.currentCorePhase === 'FIRST_ATTACK'

  if (props.variantId === 'playerToggle') {
    return (
      <div className="grid gap-2">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-[rgba(121,102,80,0.9)]">
          <span>Receive arrows</span>
          <span>{isReceiveActive ? 'Extend an attack path into 1st Attack' : 'Receive arrows saved per rotation'}</span>
        </div>
        <div className="rounded-2xl border border-[rgba(170,146,111,0.24)] bg-[rgba(244,237,224,0.72)] px-3 py-2 text-[11px] text-[rgba(112,98,79,0.92)]">
          Draw one receive arrow for normal Attack. Then hover that arrow and add a 2nd attack position to turn it into a 1st Attack path.
        </div>
      </div>
    )
  }

  if (props.variantId === 'attackLabel') {
    return (
      <div className="grid gap-2">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-[rgba(121,102,80,0.9)]">
          <span>Attack destination</span>
          <span>{props.hasFirstAttackTargets ? 'Receive can stop at 1st attack' : 'Receive goes straight to attack'}</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            type="button"
            variant={firstAttackActive ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-[11px]"
            disabled={!props.hasFirstAttackTargets}
            onClick={() => props.onManualPhaseSelect('FIRST_ATTACK')}
          >
            1st Attack
          </Button>
          <Button
            type="button"
            variant={props.currentCorePhase === 'OFFENSE' ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-[11px]"
            onClick={() => props.onManualPhaseSelect('OFFENSE')}
          >
            Attack
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-[rgba(121,102,80,0.9)]">
        <span>Attack controls</span>
        <span>Separate first-hit and normal attack</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Button
          type="button"
          variant={props.currentCorePhase === 'RECEIVE' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-[11px]"
          onClick={() => props.onManualPhaseSelect('RECEIVE')}
        >
          Receive
        </Button>
        <Button
          type="button"
          variant={firstAttackActive ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-[11px]"
          onClick={() => props.onManualPhaseSelect('FIRST_ATTACK')}
        >
          1st Attack
        </Button>
        <Button
          type="button"
          variant={props.currentCorePhase === 'OFFENSE' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-[11px]"
          onClick={() => props.onManualPhaseSelect('OFFENSE')}
        >
          Attack
        </Button>
      </div>
    </div>
  )
}

export function Concept8FullLedPerimeter(props: PrototypeControlProps) {
  const hardwareTuning = props.tactileTuning.phasePadHardware
  const lanePadding = Math.max(8, hardwareTuning.trackWidth + 4.5)
  const perimeterState = useQuarterTrackTravelState({
    currentCorePhase: props.displayCurrentCorePhase,
    targetCorePhase: props.displayTargetCorePhase,
    isPhaseTraveling: props.isPhaseTraveling,
    positionsPerQuarter: hardwareTuning.piecesPerQuarter,
    phaseOrder: C8_PHASE_ORDER,
    travelDurationMs: props.tactileTuning.c4Literal.connectorMotion.playDurationMs,
  })
  const activeDisplayPhase = props.isPhaseTraveling ? props.displayTargetCorePhase : props.displayCurrentCorePhase
  const offenseLabel = props.currentCorePhase === 'FIRST_ATTACK' ? '1st Attack' : 'Attack'
  const showAccessory = props.variantId !== 'clean'
  const showFooter = props.variantId !== 'clean'

  return (
    <div className="flex w-full flex-col justify-end">
      <div className="rounded-[22px] border border-[rgba(172,149,115,0.42)] bg-[linear-gradient(180deg,rgba(239,231,216,0.98)_0%,rgba(213,198,175,0.98)_100%)] p-2 shadow-[0_16px_30px_rgba(128,102,72,0.16),inset_0_1px_0_rgba(255,249,240,0.8)]">
        <PhasePadRotationRail {...props} />

        {showAccessory ? (
          <div className="mb-2 rounded-[16px] border border-[rgba(175,149,115,0.26)] bg-[rgba(247,240,228,0.74)] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,247,234,0.52)]">
            <VariantAccessory {...props} />
          </div>
        ) : null}

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

            <div className="relative z-[1] grid grid-cols-2 gap-px overflow-hidden rounded-[13px] bg-[rgba(187,164,131,0.34)]">
              {PHASE_PAD_LAYOUT.map((item) => (
                <PhaseAreaTile
                  key={item.phase}
                  phase={item.phase}
                  label={item.phase === 'OFFENSE' ? offenseLabel : item.label}
                  isActive={item.phase === activeDisplayPhase}
                  row={item.row}
                  column={item.column}
                  switchMotion={props.switchMotion}
                  onManualPhaseSelect={props.onManualPhaseSelect}
                />
              ))}
            </div>
          </div>

          <PhasePadJoystick props={props} />
        </div>

        {showFooter ? (
          <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-[rgba(108,90,70,0.92)]">
            <div className="font-medium">{formatPrototypePhaseLabel(props.currentCorePhase)}</div>
            <div>{props.legalPlayLabel}</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
