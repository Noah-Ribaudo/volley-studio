'use client'

import { cn } from '@/lib/utils'
import type { CorePhase } from '@/lib/rebuild/prototypeFlow'
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

const OUTER_RING_LIGHTS = createPerimeterLights({
  ledsPerEdge: 14,
  inset: 4,
  startPercent: 5,
  endPercent: 95,
})

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
        'relative flex min-h-[5.2rem] items-center justify-center border border-white/12 bg-[linear-gradient(180deg,rgba(198,198,198,0.28)_0%,rgba(126,126,126,0.25)_100%)] px-3 py-3 text-center text-[1.05rem] font-medium text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/60',
        isActive && 'bg-[linear-gradient(180deg,rgba(220,220,220,0.34)_0%,rgba(138,138,138,0.3)_100%)]'
      )}
      style={{
        boxShadow: isActive
          ? 'inset 0 0 0 1px rgba(255,255,255,0.2), inset 0 14px 22px rgba(255,255,255,0.04)'
          : 'inset 0 0 0 1px rgba(255,255,255,0.08)',
      }}
    >
      <span className="relative z-[1] tracking-[-0.02em]">{label}</span>
    </button>
  )
}

export function Concept8FullLedPerimeter(props: PrototypeControlProps) {
  const { transitionFrom, transitionTo, transitionProgress, liveStatus } = usePhasePadTransition(props)
  const perimeterState = getPerimeterSegmentState({
    currentCorePhase: props.currentCorePhase,
    transitionFrom,
    transitionTo,
    transitionProgress,
    isPreviewingMovement: props.isPreviewingMovement,
    ledsPerEdge: 14,
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

      <div className="rounded-[22px] border border-border/70 bg-[linear-gradient(180deg,rgba(58,58,60,0.94)_0%,rgba(22,22,26,0.99)_100%)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <PhasePadRotationRail {...props} />

        <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(114,114,114,0.18)_0%,rgba(64,64,64,0.26)_100%)] p-2">
          <div className="relative overflow-hidden rounded-[16px] border border-white/8 bg-[linear-gradient(180deg,rgba(64,64,64,0.55)_0%,rgba(38,38,40,0.88)_100%)] p-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-18px_26px_rgba(0,0,0,0.16)]">
            <div className="pointer-events-none absolute inset-0">
              {OUTER_RING_LIGHTS.map((led) => {
                const strength = getPerimeterCoverage({
                  globalIndex: led.globalIndex,
                  segmentStart: perimeterState.segmentStart,
                  segmentLength: perimeterState.segmentLength,
                  totalLights: perimeterState.totalLights,
                })

                return (
                  <span
                    key={led.key}
                    className={cn(
                      'absolute rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(214,214,214,0.9)_100%)]',
                      led.edge === 'top' || led.edge === 'bottom' ? 'h-[3px] w-[11px]' : 'h-[11px] w-[3px]'
                    )}
                    style={{
                      ...led.style,
                      opacity: strength > 0 ? 0.08 + strength * 0.92 : 0.02,
                      boxShadow:
                        strength > 0
                          ? `0 0 ${2 + strength * 6}px rgba(255,255,255,${0.24 + strength * 0.3}), 0 0 ${7 + strength * 14}px rgba(245,245,245,${0.08 + strength * 0.14})`
                          : 'none',
                    }}
                  />
                )
              })}
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] bg-black/40">
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

            <PhasePadJoystick props={props} />
          </div>
        </div>
      </div>
    </div>
  )
}
