'use client'

import { type CorePhase } from '@/lib/rebuild/prototypeFlow'
import { cn } from '@/lib/utils'
import {
  PHASE_PAD_LAYOUT,
  PhasePadJoystick,
  PhasePadRotationRail,
  createPerimeterLights,
  getPerimeterCoverage,
  getPerimeterSegmentState,
  usePhasePadTransition,
} from './PhasePadShared'
import type { PrototypeControlProps } from './types'

const OUTER_LIGHTS = createPerimeterLights({
  ledsPerEdge: 6,
  inset: 5,
  startPercent: 6.5,
  endPercent: 93.5,
})

function PhaseTile({
  phase,
  label,
  currentCorePhase,
  transitionTo,
  isPreviewingMovement,
  onPhaseSelect,
}: {
  phase: CorePhase
  label: string
  currentCorePhase: CorePhase
  transitionTo: CorePhase
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
        'relative flex min-h-[4.9rem] items-center justify-center overflow-hidden rounded-none border border-[rgba(135,154,170,0.22)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(236,241,245,0.96)_100%)] px-3 py-3 text-center text-xl font-medium text-slate-800 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/60',
        emphasis > 0 && 'bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(228,236,242,0.98)_100%)] text-slate-900'
      )}
      style={{
        boxShadow:
          emphasis > 0
            ? `inset 0 0 0 1px rgba(255,255,255,${0.62 + emphasis * 0.12}), 0 10px ${10 + emphasis * 10}px rgba(123,140,156,${0.12 + emphasis * 0.06})`
            : 'inset 0 0 0 1px rgba(255,255,255,0.52), 0 8px 18px rgba(148,163,184,0.1)',
      }}
    >
      <span className="relative z-[1] tracking-[-0.02em]">{label}</span>
    </button>
  )
}

export function Concept7EdgeLitPhasePad(props: PrototypeControlProps) {
  const { transitionFrom, transitionTo, transitionProgress, liveStatus } = usePhasePadTransition(props)
  const perimeterState = getPerimeterSegmentState({
    currentCorePhase: props.displayCurrentCorePhase,
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

      <div className="rounded-[22px] border border-[rgba(160,174,189,0.45)] bg-[linear-gradient(180deg,rgba(250,251,252,0.98)_0%,rgba(231,236,241,0.98)_100%)] p-2 shadow-[0_16px_30px_rgba(148,163,184,0.16),inset_0_1px_0_rgba(255,255,255,0.88)]">
        <PhasePadRotationRail {...props} />

        <div className="relative overflow-hidden rounded-[18px] border border-[rgba(160,174,189,0.32)] bg-[linear-gradient(180deg,rgba(245,248,250,0.98)_0%,rgba(223,230,236,0.98)_100%)] p-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <div className="pointer-events-none absolute inset-0">
            {OUTER_LIGHTS.map((light) => {
              const strength = getPerimeterCoverage({
                globalIndex: light.globalIndex,
                segmentStart: perimeterState.segmentStart,
                segmentLength: perimeterState.segmentLength,
                totalLights: perimeterState.totalLights,
              })

              return (
                <span
                  key={light.key}
                  className={cn(
                    'absolute rounded-full bg-[linear-gradient(180deg,rgba(255,205,132,0.98)_0%,rgba(255,148,41,0.94)_100%)]',
                    light.edge === 'top' || light.edge === 'bottom' ? 'h-[4px] w-[15px]' : 'h-[15px] w-[4px]'
                  )}
                  style={{
                    ...light.style,
                    opacity: strength > 0 ? 0.1 + strength * 0.9 : 0.04,
                    boxShadow:
                      strength > 0
                        ? `0 0 ${2 + strength * 6}px rgba(255,179,77,${0.42 + strength * 0.24}), 0 0 ${7 + strength * 12}px rgba(255,126,33,${0.14 + strength * 0.2})`
                        : 'none',
                  }}
                />
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] bg-[rgba(186,198,208,0.55)]">
            {PHASE_PAD_LAYOUT.map((item) => (
              <PhaseTile
                key={item.phase}
                phase={item.phase}
                label={item.label}
                currentCorePhase={props.displayCurrentCorePhase}
                transitionTo={transitionTo}
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
