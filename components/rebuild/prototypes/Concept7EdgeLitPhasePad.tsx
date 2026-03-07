'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Button } from '@/components/ui/button'
import {
  type CorePhase,
  formatCorePhaseLabel,
} from '@/lib/rebuild/prototypeFlow'
import { cn } from '@/lib/utils'
import type { PrototypeControlProps } from './types'

type EdgeId = 'top' | 'right' | 'bottom' | 'left'

type EdgeLight = {
  key: string
  edge: EdgeId
  style: CSSProperties
}

const PHASE_LAYOUT: Array<{
  phase: CorePhase
  label: string
  row: 'top' | 'bottom'
  column: 'left' | 'right'
}> = [
  { phase: 'SERVE', label: 'Serve', row: 'top', column: 'left' },
  { phase: 'DEFENSE', label: 'Defense', row: 'top', column: 'right' },
  { phase: 'RECEIVE', label: 'Receive', row: 'bottom', column: 'left' },
  { phase: 'OFFENSE', label: 'Attack', row: 'bottom', column: 'right' },
]

const EDGE_LIGHTS: EdgeLight[] = [
  { key: 'top-0', edge: 'top', style: { top: 4, left: '18%' } },
  { key: 'top-1', edge: 'top', style: { top: 4, left: '50%', transform: 'translateX(-50%)' } },
  { key: 'top-2', edge: 'top', style: { top: 4, right: '18%' } },
  { key: 'right-0', edge: 'right', style: { right: 4, top: '18%' } },
  { key: 'right-1', edge: 'right', style: { right: 4, top: '50%', transform: 'translateY(-50%)' } },
  { key: 'right-2', edge: 'right', style: { right: 4, bottom: '18%' } },
  { key: 'bottom-0', edge: 'bottom', style: { bottom: 4, left: '18%' } },
  { key: 'bottom-1', edge: 'bottom', style: { bottom: 4, left: '50%', transform: 'translateX(-50%)' } },
  { key: 'bottom-2', edge: 'bottom', style: { bottom: 4, right: '18%' } },
  { key: 'left-0', edge: 'left', style: { left: 4, top: '18%' } },
  { key: 'left-1', edge: 'left', style: { left: 4, top: '50%', transform: 'translateY(-50%)' } },
  { key: 'left-2', edge: 'left', style: { left: 4, bottom: '18%' } },
]

function getTravelDirection(from: CorePhase, to: CorePhase): 1 | -1 {
  const fromColumn = PHASE_LAYOUT.find((item) => item.phase === from)?.column ?? 'left'
  const toColumn = PHASE_LAYOUT.find((item) => item.phase === to)?.column ?? fromColumn
  return fromColumn === toColumn ? 1 : toColumn === 'right' ? 1 : -1
}

function getSourceEdge(direction: 1 | -1): EdgeId {
  return direction === 1 ? 'right' : 'left'
}

function getTargetEdge(direction: 1 | -1): EdgeId {
  return direction === 1 ? 'left' : 'right'
}

function getPhaseRingProgress({
  phase,
  currentCorePhase,
  transitionFrom,
  transitionTo,
  transitionProgress,
  isPreviewingMovement,
}: {
  phase: CorePhase
  currentCorePhase: CorePhase
  transitionFrom: CorePhase
  transitionTo: CorePhase
  transitionProgress: number
  isPreviewingMovement: boolean
}) {
  if (!isPreviewingMovement) {
    return phase === currentCorePhase ? 1 : 0
  }

  if (phase === transitionFrom) {
    return 1 - transitionProgress * 0.88
  }

  if (phase === transitionTo) {
    return 0.18 + transitionProgress * 0.82
  }

  return 0
}

function getEdgeStrength({
  edge,
  phase,
  currentCorePhase,
  transitionFrom,
  transitionTo,
  transitionProgress,
  isPreviewingMovement,
}: {
  edge: EdgeId
  phase: CorePhase
  currentCorePhase: CorePhase
  transitionFrom: CorePhase
  transitionTo: CorePhase
  transitionProgress: number
  isPreviewingMovement: boolean
}) {
  const ringProgress = getPhaseRingProgress({
    phase,
    currentCorePhase,
    transitionFrom,
    transitionTo,
    transitionProgress,
    isPreviewingMovement,
  })

  if (!isPreviewingMovement) {
    return ringProgress
  }

  const direction = getTravelDirection(transitionFrom, transitionTo)
  const sourceEdge = getSourceEdge(direction)
  const targetEdge = getTargetEdge(direction)

  if (phase === transitionFrom) {
    if (edge === sourceEdge) return 0.85 + (1 - transitionProgress) * 0.15
    if (edge === 'top' || edge === 'bottom') return Math.max(0, 0.7 - transitionProgress * 0.52)
    return Math.max(0, 0.52 - transitionProgress * 0.6)
  }

  if (phase === transitionTo) {
    if (edge === targetEdge) return 0.26 + transitionProgress * 0.74
    if (edge === 'top' || edge === 'bottom') return Math.max(0, transitionProgress - 0.18) / 0.82
    return Math.max(0, transitionProgress - 0.38) / 0.62
  }

  return ringProgress
}

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
  const isActive = currentCorePhase === phase && !isPreviewingMovement
  const ringProgress = getPhaseRingProgress({
    phase,
    currentCorePhase,
    transitionFrom,
    transitionTo,
    transitionProgress,
    isPreviewingMovement,
  })

  return (
    <button
      type="button"
      onClick={() => onPhaseSelect(phase)}
      className={cn(
        'relative flex min-h-[4.9rem] items-center justify-center overflow-hidden rounded-none border border-white/20 bg-[linear-gradient(180deg,rgba(196,196,196,0.3)_0%,rgba(138,138,138,0.3)_100%)] px-3 py-3 text-center text-xl font-medium text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/60',
        isActive && 'bg-[linear-gradient(180deg,rgba(214,214,214,0.36)_0%,rgba(148,148,148,0.34)_100%)]'
      )}
      style={{
        boxShadow:
          ringProgress > 0
            ? `inset 0 0 0 1px rgba(255,255,255,${0.12 + ringProgress * 0.18}), 0 0 ${6 + ringProgress * 14}px rgba(255,255,255,${0.05 + ringProgress * 0.08})`
            : 'inset 0 0 0 1px rgba(255,255,255,0.08)',
      }}
    >
      {EDGE_LIGHTS.map((light) => {
        const strength = getEdgeStrength({
          edge: light.edge,
          phase,
          currentCorePhase,
          transitionFrom,
          transitionTo,
          transitionProgress,
          isPreviewingMovement,
        })

        return (
          <span
            key={light.key}
            className="pointer-events-none absolute h-[6px] w-[14px] rounded-full bg-white"
            style={{
              ...light.style,
              opacity: strength > 0 ? 0.18 + strength * 0.82 : 0.06,
              boxShadow:
                strength > 0
                  ? `0 0 ${3 + strength * 8}px rgba(255,255,255,${0.24 + strength * 0.3})`
                  : 'none',
            }}
          />
        )
      })}

      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            ringProgress > 0
              ? `radial-gradient(circle at 50% 50%, rgba(255,255,255,${0.05 + ringProgress * 0.06}) 0%, transparent 70%)`
              : 'transparent',
        }}
      />
      <span className="relative z-[1] tracking-[-0.02em]">{label}</span>
    </button>
  )
}

export function Concept7EdgeLitPhasePad(props: PrototypeControlProps) {
  const [transitionFrom, setTransitionFrom] = useState<CorePhase>(props.currentCorePhase)
  const [transitionTo, setTransitionTo] = useState<CorePhase>(props.nextByPlay)
  const [transitionProgress, setTransitionProgress] = useState(0)

  const playDurationMs = props.tactileTuning.c4Literal.connectorMotion.playDurationMs

  useEffect(() => {
    if (!props.isPreviewingMovement) {
      setTransitionProgress(0)
      setTransitionFrom(props.currentCorePhase)
      setTransitionTo(props.nextByPlay)
      return
    }

    setTransitionFrom(props.currentCorePhase)
    setTransitionTo(props.nextByPlay)
    setTransitionProgress(0)

    let frameId = 0
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / playDurationMs, 1)
      setTransitionProgress(progress)
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick)
      }
    }

    frameId = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [playDurationMs, props.currentCorePhase, props.isPreviewingMovement, props.nextByPlay, props.playAnimationTrigger])

  const liveStatus = useMemo(() => {
    if (props.isPreviewingMovement) {
      return `${formatCorePhaseLabel(transitionFrom)} -> ${formatCorePhaseLabel(transitionTo)}`
    }

    return formatCorePhaseLabel(props.currentCorePhase)
  }, [props.currentCorePhase, props.isPreviewingMovement, transitionFrom, transitionTo])

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
        <div className="mb-2 rounded-[14px] border border-white/6 bg-black/20 p-1">
          <div className="grid grid-cols-6 gap-1">
            {[1, 2, 3, 4, 5, 6].map((rotation) => (
              <Button
                key={rotation}
                type="button"
                size="sm"
                variant={rotation === props.currentRotation ? 'default' : 'outline'}
                className="h-8 min-w-0 px-0 text-base font-semibold tracking-[-0.03em]"
                onClick={() => props.onRotationSelect(rotation as 1 | 2 | 3 | 4 | 5 | 6)}
              >
                R{rotation}
              </Button>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(122,122,122,0.22)_0%,rgba(92,92,92,0.22)_100%)] p-1">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] bg-black/35">
            {PHASE_LAYOUT.map((item) => (
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

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Button
              type="button"
              onClick={props.onPlay}
              className="pointer-events-auto h-16 w-16 rounded-full border border-white/30 bg-[linear-gradient(180deg,rgba(245,245,245,0.96)_0%,rgba(188,188,188,0.92)_100%)] px-0 text-foreground shadow-[0_12px_24px_rgba(0,0,0,0.28)]"
            >
              <span
                aria-hidden
                className="ml-1 h-0 w-0 border-y-[12px] border-l-[18px] border-r-0 border-y-transparent border-l-foreground/80"
              />
              <span className="sr-only">Play transition</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="rounded-lg border border-border bg-card/70 px-3 py-2">
          Active lights hold the current phase. On play, the border glow collapses toward the exit edge and rebuilds around the destination phase.
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-9 min-w-[9rem] text-[11px] uppercase tracking-[0.08em]"
          onClick={props.onPlay}
        >
          Play {formatCorePhaseLabel(props.nextByPlay)}
        </Button>
      </div>
    </div>
  )
}
