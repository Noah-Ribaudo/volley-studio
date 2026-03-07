'use client'

import { cn } from '@/lib/utils'
import { formatCorePhaseLabel, type CorePhase } from '@/lib/rebuild/prototypeFlow'
import {
  PHASE_PAD_LAYOUT,
  PhasePadHardwareLane,
  PhasePadRotationRail,
  getPhasePadJoystickEmphasis,
  getQuarterTrackSegmentState,
  usePhasePadTransition,
} from './PhasePadShared'
import { TactilePlayJoystick } from './TactilePlayJoystick'
import type { PrototypeControlProps } from './types'

const C8_PHASE_ORDER: CorePhase[] = ['DEFENSE', 'OFFENSE', 'RECEIVE', 'SERVE']
const PHASE_PAD_INSET = 18

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
        'relative flex min-h-0 items-center justify-center bg-[linear-gradient(180deg,rgba(158,158,160,0.5)_0%,rgba(102,102,106,0.42)_100%)] text-center text-[1.72rem] font-medium text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/60',
        isActive && 'bg-[linear-gradient(180deg,rgba(172,172,174,0.56)_0%,rgba(112,112,116,0.48)_100%)]'
      )}
      style={{
        boxShadow: isActive
          ? 'inset 0 0 0 1px rgba(255,255,255,0.18), inset 0 12px 18px rgba(255,255,255,0.05)'
          : 'inset 0 0 0 1px rgba(255,255,255,0.08)',
      }}
    >
      <span className="relative z-[1] tracking-[-0.03em]">{label}</span>
    </button>
  )
}

export function Concept8FullLedPerimeter(props: PrototypeControlProps) {
  const { transitionFrom, transitionTo, transitionProgress, liveStatus } = usePhasePadTransition(props)
  const hardwareTuning = props.tactileTuning.phasePadHardware
  const trackState = getQuarterTrackSegmentState({
    currentCorePhase: props.currentCorePhase,
    transitionFrom,
    transitionTo,
    transitionProgress,
    isPreviewingMovement: props.isPreviewingMovement,
    positionsPerQuarter: hardwareTuning.piecesPerQuarter,
    phaseOrder: C8_PHASE_ORDER,
  })

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Concept 8</p>
          <h2 className="text-sm font-semibold">Full LED Perimeter</h2>
        </div>
        <div className="rounded-full border border-border bg-card px-3 py-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          {props.isPreviewingMovement ? liveStatus : `${liveStatus} Active`}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(54,54,58,0.96)_0%,rgba(24,24,28,0.98)_100%)] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <PhasePadRotationRail {...props} />

        <div className="relative mt-1.5 h-[192px] overflow-visible rounded-[18px] border border-white/5 bg-[rgba(14,14,16,0.38)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-8px_14px_rgba(0,0,0,0.22)]">
          <div className="absolute inset-0 z-[1] overflow-visible rounded-[18px]">
            <PhasePadHardwareLane
              tuning={hardwareTuning}
              segmentStart={trackState.segmentStart}
              segmentLength={trackState.segmentLength}
              totalLights={trackState.totalLights}
            />
          </div>

          <div
            className="relative z-[2] grid h-full grid-cols-2 gap-px overflow-hidden rounded-[16px] bg-black/35"
            style={{
              padding: `${PHASE_PAD_INSET}px`,
            }}
          >
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

          <div
            className="pointer-events-none absolute z-[3]"
            style={{
              width: '62px',
              height: '62px',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="pointer-events-auto">
              <TactilePlayJoystick
                currentPhase={props.currentCorePhase}
                nextPhase={props.nextByPlay}
                nextLabel={formatCorePhaseLabel(props.nextByPlay)}
                mode="literal"
                frameSizeOverride={62}
                switchMotion={props.switchMotion}
                joystickTuning={props.tactileTuning.joystick}
                phaseEmphasis={getPhasePadJoystickEmphasis(props)}
                onPlay={props.onPlay}
                onPhaseSelect={props.onPhaseSelect}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
