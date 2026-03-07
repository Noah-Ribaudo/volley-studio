'use client'

import { type CorePhase } from '@/lib/rebuild/prototypeFlow'
import { cn } from '@/lib/utils'
import {
  PHASE_PAD_LAYOUT,
  PhasePadPerimeterRing,
  PhasePadJoystick,
  PhasePadRotationRail,
  getPerimeterSegmentState,
  usePhasePadTransition,
} from './PhasePadShared'
import type { PrototypeControlProps } from './types'

function PhaseTile({
  phase,
  label,
  currentCorePhase,
  transitionFrom,
  transitionTo,
  transitionProgress,
  isPreviewingMovement,
  onPhaseSelect,
}: {
  phase: CorePhase
  label: string
  currentCorePhase: CorePhase
  transitionFrom: CorePhase
  transitionTo: CorePhase
  transitionProgress: number
  isPreviewingMovement: boolean
  onPhaseSelect: (phase: CorePhase) => void
}) {
  const isCurrentPhase = currentCorePhase === phase
  const isNextPhase = transitionTo === phase
  const emphasis = isPreviewingMovement ? (isCurrentPhase || isNextPhase ? 1 : 0) : isCurrentPhase ? 1 : 0

  return (
    <button
      type="button"
      onClick={() => onPhaseSelect(phase)}
      className={cn(
        'relative flex min-h-[4.9rem] items-center justify-center overflow-hidden rounded-none border border-white/20 bg-[linear-gradient(180deg,rgba(196,196,196,0.3)_0%,rgba(138,138,138,0.3)_100%)] px-3 py-3 text-center text-xl font-medium text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/60',
        emphasis > 0 && 'bg-[linear-gradient(180deg,rgba(214,214,214,0.36)_0%,rgba(148,148,148,0.34)_100%)]'
      )}
      style={{
        boxShadow:
          emphasis > 0
            ? `inset 0 0 0 1px rgba(255,255,255,${0.1 + emphasis * 0.12}), 0 0 ${4 + emphasis * 6}px rgba(255,255,255,${0.04 + emphasis * 0.04})`
            : 'inset 0 0 0 1px rgba(255,255,255,0.08)',
      }}
    >
      <span className="relative z-[1] tracking-[-0.02em]">{label}</span>
    </button>
  )
}

export function Concept7EdgeLitPhasePad(props: PrototypeControlProps) {
  const { transitionFrom, transitionTo, transitionProgress, liveStatus } = usePhasePadTransition(props)
  const perimeterState = getPerimeterSegmentState({
    currentCorePhase: props.currentCorePhase,
    transitionFrom,
    transitionTo,
    transitionProgress,
    isPreviewingMovement: props.isPreviewingMovement,
    ledsPerEdge: 6,
  })

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Concept 7</p>
          <h2 className="text-sm font-semibold">Perimeter Phase Lights</h2>
        </div>
        <div className="rounded-full border border-border bg-card px-3 py-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          {props.isPreviewingMovement ? liveStatus : `${liveStatus} Active`}
        </div>
      </div>

      <div className="rounded-[22px] border border-border/70 bg-[linear-gradient(180deg,rgba(58,58,60,0.94)_0%,rgba(28,28,32,0.98)_100%)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <PhasePadRotationRail {...props} />

        <div className="relative overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(122,122,122,0.22)_0%,rgba(92,92,92,0.22)_100%)] p-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <PhasePadPerimeterRing
            segmentStart={perimeterState.segmentStart}
            segmentLength={perimeterState.segmentLength}
            totalLights={perimeterState.totalLights}
          />

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] bg-black/35">
            {PHASE_PAD_LAYOUT.map((item) => (
              <PhaseTile
                key={item.phase}
                phase={item.phase}
                label={item.label}
                currentCorePhase={props.currentCorePhase}
                transitionFrom={transitionFrom}
                transitionTo={transitionTo}
                transitionProgress={transitionProgress}
                isPreviewingMovement={props.isPreviewingMovement}
                onPhaseSelect={props.onPhaseSelect}
              />
            ))}
          </div>

          <PhasePadJoystick props={props} />
        </div>
      </div>
    </div>
  )
}
