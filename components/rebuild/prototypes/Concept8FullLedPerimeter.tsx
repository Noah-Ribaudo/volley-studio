'use client'

import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import type { CorePhase } from '@/lib/rebuild/prototypeFlow'
import {
  PHASE_PAD_LAYOUT,
  PhasePadJoystick,
  PhasePadRotationRail,
  getSourceEdge,
  getTargetEdge,
  getTravelDirection,
  usePhasePadTransition,
} from './PhasePadShared'
import type { PrototypeControlProps } from './types'

type EdgeId = 'top' | 'right' | 'bottom' | 'left'

type RingLed = {
  key: string
  edge: EdgeId
  index: number
  style: CSSProperties
}

const LEDS_PER_EDGE = 14
const EDGE_SEQUENCE: EdgeId[] = ['top', 'right', 'bottom', 'left']

const RING_LEDS: RingLed[] = EDGE_SEQUENCE.flatMap((edge) =>
  Array.from({ length: LEDS_PER_EDGE }, (_, index) => {
    const offset = `${8 + index * 6.15}%`
    const styleByEdge: Record<EdgeId, CSSProperties> = {
      top: { top: 6, left: offset },
      right: { right: 6, top: offset },
      bottom: { bottom: 6, right: offset },
      left: { left: 6, bottom: offset },
    }

    return {
      key: `${edge}-${index}`,
      edge,
      index,
      style: styleByEdge[edge],
    }
  })
)

const PHASE_REGION_BY_EDGE: Record<EdgeId, Record<CorePhase, [number, number]>> = {
  top: {
    SERVE: [0, 6],
    DEFENSE: [7, 13],
    RECEIVE: [0, 1],
    OFFENSE: [12, 13],
  },
  right: {
    SERVE: [0, 1],
    DEFENSE: [0, 6],
    RECEIVE: [12, 13],
    OFFENSE: [7, 13],
  },
  bottom: {
    SERVE: [12, 13],
    DEFENSE: [0, 1],
    RECEIVE: [7, 13],
    OFFENSE: [0, 6],
  },
  left: {
    SERVE: [7, 13],
    DEFENSE: [12, 13],
    RECEIVE: [0, 6],
    OFFENSE: [0, 1],
  },
}

function isIndexInRange(index: number, range: [number, number]) {
  return index >= range[0] && index <= range[1]
}

function getBaseStrength(edge: EdgeId, index: number, phase: CorePhase) {
  return isIndexInRange(index, PHASE_REGION_BY_EDGE[edge][phase]) ? 1 : 0
}

function getTravelStrength({
  edge,
  index,
  currentCorePhase,
  transitionFrom,
  transitionTo,
  transitionProgress,
  isPreviewingMovement,
}: {
  edge: EdgeId
  index: number
  currentCorePhase: CorePhase
  transitionFrom: CorePhase
  transitionTo: CorePhase
  transitionProgress: number
  isPreviewingMovement: boolean
}) {
  if (!isPreviewingMovement) {
    return getBaseStrength(edge, index, currentCorePhase)
  }

  const direction = getTravelDirection(transitionFrom, transitionTo)
  const sourceEdge = getSourceEdge(direction)
  const targetEdge = getTargetEdge(direction)
  const fromStrength = getBaseStrength(edge, index, transitionFrom)
  const toStrength = getBaseStrength(edge, index, transitionTo)

  if (fromStrength === 0 && toStrength === 0) {
    return 0
  }

  if (fromStrength === 1 && toStrength === 1) {
    if (edge === sourceEdge || edge === targetEdge) {
      return 0.46 + 0.34 * Math.sin(transitionProgress * Math.PI)
    }
    return 0.5
  }

  if (fromStrength === 1) {
    if (edge === sourceEdge) {
      const travelCutoff = direction === 1 ? index / (LEDS_PER_EDGE - 1) : 1 - index / (LEDS_PER_EDGE - 1)
      return transitionProgress < travelCutoff
        ? 1
        : Math.max(0, 1 - (transitionProgress - travelCutoff) / 0.22)
    }

    return Math.max(0, 1 - transitionProgress * 1.3)
  }

  if (edge === targetEdge) {
    const travelCutoff = direction === 1 ? index / (LEDS_PER_EDGE - 1) : 1 - index / (LEDS_PER_EDGE - 1)
    return transitionProgress > travelCutoff
      ? Math.min(1, (transitionProgress - travelCutoff) / 0.22)
      : 0
  }

  return Math.max(0, transitionProgress - 0.22) / 0.78
}

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
          <div className="relative overflow-hidden rounded-[16px] border border-white/8 bg-[linear-gradient(180deg,rgba(64,64,64,0.55)_0%,rgba(38,38,40,0.88)_100%)] p-3">
            <div className="pointer-events-none absolute inset-0">
              {RING_LEDS.map((led) => {
                const strength = getTravelStrength({
                  edge: led.edge,
                  index: led.index,
                  currentCorePhase: props.currentCorePhase,
                  transitionFrom,
                  transitionTo,
                  transitionProgress,
                  isPreviewingMovement: props.isPreviewingMovement,
                })

                return (
                  <span
                    key={led.key}
                    className={cn(
                      'absolute rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(214,214,214,0.9)_100%)]',
                      led.edge === 'top' || led.edge === 'bottom' ? 'h-[4px] w-[12px]' : 'h-[12px] w-[4px]'
                    )}
                    style={{
                      ...led.style,
                      opacity: strength > 0 ? 0.08 + strength * 0.92 : 0.04,
                      boxShadow:
                        strength > 0
                          ? `0 0 ${3 + strength * 8}px rgba(255,255,255,${0.22 + strength * 0.38}), 0 0 ${8 + strength * 16}px rgba(245,245,245,${0.1 + strength * 0.18})`
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

            <div
              className="pointer-events-none absolute inset-[6%] rounded-[22px]"
              style={{
                background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,${0.03 + transitionProgress * 0.05}) 0%, transparent 72%)`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card/70 px-3 py-2 text-[11px] text-muted-foreground">
        A full perimeter ring holds the live phase. On play, the LEDs travel around the outer edge until the destination quarter takes over.
      </div>
    </div>
  )
}
