'use client'

import { cn } from '@/lib/utils'
import type { CorePhase } from '@/lib/rebuild/prototypeFlow'
import {
  PHASE_PAD_LAYOUT,
  PhasePadHardwareLane,
  PhasePadJoystick,
  PhasePadRotationRail,
  getQuarterTrackSegmentState,
  usePhasePadTransition,
} from './PhasePadShared'
import type { PrototypeControlProps } from './types'

const C8_PHASE_ORDER: CorePhase[] = ['DEFENSE', 'OFFENSE', 'RECEIVE', 'SERVE']

function PhaseAreaTile({
  phase,
  label,
  isActive,
  onPhaseSelect,
}: {
  phase: CorePhase
  label: string
  isActive: boolean
  onPhaseSelect: (phase: CorePhase) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onPhaseSelect(phase)}
      className={cn(
        'relative flex min-h-[5.2rem] items-center justify-center border border-[rgba(135,154,170,0.22)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(236,241,245,0.96)_100%)] px-3 py-3 text-center text-[1.05rem] font-medium text-slate-800 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/60',
        isActive && 'bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(228,236,242,0.98)_100%)] text-slate-900'
      )}
      style={{
        boxShadow: isActive
          ? 'inset 0 0 0 1px rgba(255,255,255,0.62), inset 0 14px 22px rgba(255,255,255,0.24), 0 12px 22px rgba(148,163,184,0.14)'
          : 'inset 0 0 0 1px rgba(255,255,255,0.48), 0 8px 18px rgba(148,163,184,0.08)',
      }}
    >
      <span className="relative z-[1] tracking-[-0.02em]">{label}</span>
    </button>
  )
}

export function Concept8FullLedPerimeter(props: PrototypeControlProps) {
  const { transitionFrom, transitionTo, transitionProgress } = usePhasePadTransition(props)
  const hardwareTuning = props.tactileTuning.phasePadHardware
  const lanePadding = Math.max(8, hardwareTuning.trackWidth + 4.5)
  const perimeterState = getQuarterTrackSegmentState({
    currentCorePhase: props.currentCorePhase,
    transitionFrom,
    transitionTo,
    transitionProgress,
    isPreviewingMovement: props.isPreviewingMovement,
    positionsPerQuarter: hardwareTuning.piecesPerQuarter,
    phaseOrder: C8_PHASE_ORDER,
  })

  return (
    <div className="flex w-full flex-col justify-end">
      <div className="rounded-[22px] border border-[rgba(160,174,189,0.45)] bg-[linear-gradient(180deg,rgba(250,251,252,0.98)_0%,rgba(231,236,241,0.98)_100%)] p-2 shadow-[0_16px_30px_rgba(148,163,184,0.16),inset_0_1px_0_rgba(255,255,255,0.88)]">
        <PhasePadRotationRail {...props} />

        <div className="overflow-visible rounded-[20px] border border-[rgba(160,174,189,0.32)] bg-[linear-gradient(180deg,rgba(245,248,250,0.98)_0%,rgba(223,230,236,0.98)_100%)] p-2">
          <div className="relative z-[1] overflow-visible rounded-[16px] border border-[rgba(160,174,189,0.26)] bg-[linear-gradient(180deg,rgba(250,252,253,0.98)_0%,rgba(234,239,243,0.98)_100%)] p-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-14px_22px_rgba(181,197,210,0.16)]">
            <div
              className="relative z-[3] rounded-[14px]"
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

              <div className="relative z-[1] grid grid-cols-2 gap-px overflow-hidden rounded-[12px] bg-[rgba(186,198,208,0.55)]">
              {PHASE_PAD_LAYOUT.map((item) => (
                <PhaseAreaTile
                  key={item.phase}
                  phase={item.phase}
                  label={item.label}
                  isActive={item.phase === props.currentCorePhase && !props.isPreviewingMovement}
                  onPhaseSelect={props.onPhaseSelect}
                />
              ))}
              </div>
            </div>

            <PhasePadJoystick props={props} />
          </div>
        </div>
      </div>
    </div>
  )
}
