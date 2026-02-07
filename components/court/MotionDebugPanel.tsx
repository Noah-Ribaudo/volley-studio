'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Copy, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DragHandle } from '@/components/ui/drag-handle'
import type { Role } from '@/lib/types'
import type { WhiteboardMotionTuning } from '@/lib/whiteboard-motion'

type MotionDebugRoleStats = {
  role: Role
  hasLockedPath: boolean
  done: boolean
  progress: number
  currentSpeed: number
  targetSpeed: number
  lateralOffset: number
}

type TuningItem = {
  key: keyof WhiteboardMotionTuning
  label: string
  min: number
  max: number
  step: number
  tooltip: string
}

const TUNING_ITEMS: TuningItem[] = [
  {
    key: 'cruiseSpeed',
    label: 'speed',
    min: 0.1,
    max: 1.8,
    step: 0.01,
    tooltip: 'Base movement speed on straight segments.',
  },
  {
    key: 'acceleration',
    label: 'accel',
    min: 0.2,
    max: 8,
    step: 0.05,
    tooltip: 'How quickly tokens ramp up speed after starting or slowing down.',
  },
  {
    key: 'braking',
    label: 'brake',
    min: 0.2,
    max: 10,
    step: 0.05,
    tooltip: 'How quickly tokens can decelerate for stops, traffic, and corners.',
  },
  {
    key: 'lookAheadTime',
    label: 'lookAhead',
    min: 0.05,
    max: 1.2,
    step: 0.01,
    tooltip: 'Prediction horizon used for collision anticipation and corner planning.',
  },
  {
    key: 'maxLateralAccel',
    label: 'corner',
    min: 0.1,
    max: 4,
    step: 0.01,
    tooltip: 'Caps speed through curves based on turning demand.',
  },
  {
    key: 'curveStrength',
    label: 'curve',
    min: 0,
    max: 0.9,
    step: 0.01,
    tooltip: 'Default bend amount for auto-generated bezier control points.',
  },
  {
    key: 'tokenRadius',
    label: 'tokenR',
    min: 0.03,
    max: 0.15,
    step: 0.001,
    tooltip: 'Token collision radius in normalized court units.',
  },
  {
    key: 'minSpacingRadii',
    label: 'spacingR',
    min: 0,
    max: 3,
    step: 0.05,
    tooltip: 'Additional spacing buffer measured in token radii.',
  },
  {
    key: 'avoidanceBlend',
    label: 'sidestep',
    min: 0,
    max: 1,
    step: 0.01,
    tooltip: 'Blend between speed-reduction avoidance and lateral sidestepping.',
  },
  {
    key: 'deflectionStrength',
    label: 'deflect',
    min: 0,
    max: 3,
    step: 0.05,
    tooltip: 'Strength of lateral deflection response under collision pressure.',
  },
  {
    key: 'maxLateralOffsetRadii',
    label: 'maxOffR',
    min: 0,
    max: 5,
    step: 0.05,
    tooltip: 'Maximum sidestep offset from planned path, in token radii.',
  },
]

interface MotionDebugPanelProps {
  mode: 'whiteboard' | 'simulation'
  animationMode: 'css' | 'raf'
  displaySource: string
  isBezierAnimating: boolean
  isPreviewingMovement: boolean
  hasPlayedPositions: boolean
  animationTrigger: number
  isRafActive: boolean
  lastFrameMs?: number
  draggingRole: Role | null
  draggingArrowRole: Role | null
  draggingCurveRole: Role | null
  tuning: WhiteboardMotionTuning
  onTuningChange: <K extends keyof WhiteboardMotionTuning>(key: K, value: number) => void
  roles: MotionDebugRoleStats[]
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function MotionDebugPanel({
  mode,
  animationMode,
  displaySource,
  isBezierAnimating,
  isPreviewingMovement,
  hasPlayedPositions,
  animationTrigger,
  isRafActive,
  lastFrameMs,
  draggingRole,
  draggingArrowRole,
  draggingCurveRole,
  tuning,
  onTuningChange,
  roles,
}: MotionDebugPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    offsetX: number
    offsetY: number
  } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 12, y: 64 })

  const fmt = useCallback((value?: number, digits = 2) => {
    return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '-'
  }, [])

  const clampPosition = useCallback((x: number, y: number) => {
    const panel = panelRef.current
    if (!panel) {
      return {
        x: Math.max(0, x),
        y: Math.max(0, y),
      }
    }

    const margin = 8
    const maxX = Math.max(margin, window.innerWidth - panel.offsetWidth - margin)
    const maxY = Math.max(margin, window.innerHeight - panel.offsetHeight - margin)

    return {
      x: clamp(x, margin, maxX),
      y: clamp(y, margin, maxY),
    }
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return

    e.preventDefault()
    e.stopPropagation()

    dragRef.current = {
      pointerId: e.pointerId,
      offsetX: e.clientX - position.x,
      offsetY: e.clientY - position.y,
    }
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [position.x, position.y])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return

    const nextX = e.clientX - drag.offsetX
    const nextY = e.clientY - drag.offsetY
    setPosition(clampPosition(nextX, nextY))
  }, [clampPosition])

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    dragRef.current = null
    setIsDragging(false)
  }, [])

  useEffect(() => {
    const syncBounds = () => {
      setPosition((prev) => clampPosition(prev.x, prev.y))
    }

    syncBounds()
    window.addEventListener('resize', syncBounds)

    const panel = panelRef.current
    const canObserve = typeof ResizeObserver !== 'undefined'
    let observer: ResizeObserver | null = null
    if (canObserve && panel) {
      observer = new ResizeObserver(syncBounds)
      observer.observe(panel)
    }

    return () => {
      window.removeEventListener('resize', syncBounds)
      observer?.disconnect()
    }
  }, [clampPosition])

  const copyPayload = useMemo(() => {
    const params: Partial<WhiteboardMotionTuning> = {}
    TUNING_ITEMS.forEach((item) => {
      params[item.key] = tuning[item.key]
    })
    return {
      params,
      state: {
        mode,
        animationMode,
        displaySource,
      },
    }
  }, [tuning, mode, animationMode, displaySource])

  const handleCopyValues = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(copyPayload, null, 2))
      toast.success('Motion values copied')
    } catch {
      toast.error('Failed to copy motion values')
    }
  }, [copyPayload])

  return (
    <TooltipProvider delayDuration={120}>
      <Card
        ref={panelRef}
        className="pointer-events-auto fixed z-50 w-[360px] max-w-[calc(100%-16px)] py-0 shadow-xl bg-card/95 backdrop-blur-sm"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <div
          className={`flex items-center justify-between border-b px-3 py-2 select-none touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="flex items-center gap-2">
            <DragHandle />
            <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Motion Debug</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={handleCopyValues}
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copy Values</span>
          </Button>
        </div>

        <div className="max-h-[72vh] overflow-auto px-3 py-2 space-y-2">
          <div className="text-[11px] text-muted-foreground">mode {mode} anim {animationMode} display {displaySource}</div>
          <div className="text-[11px] text-muted-foreground">
            bezier {isBezierAnimating ? 'on' : 'off'} preview {isPreviewingMovement ? 'on' : 'off'} played {hasPlayedPositions ? 'yes' : 'no'}
          </div>
          <div className="text-[11px] text-muted-foreground">
            trigger {animationTrigger} raf {isRafActive ? 'on' : 'off'} last {fmt(lastFrameMs, 0)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            drag {draggingRole ?? '-'} arrow {draggingArrowRole ?? '-'} curve {draggingCurveRole ?? '-'}
          </div>

          <Separator />

          <div className="space-y-2">
            {TUNING_ITEMS.map((item) => (
              <div key={item.key} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">{item.label}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground"
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[260px] leading-relaxed">
                        {item.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">{fmt(tuning[item.key])}</span>
                </div>
                <Slider
                  min={item.min}
                  max={item.max}
                  step={item.step}
                  value={[tuning[item.key]]}
                  onValueChange={([value]) => onTuningChange(item.key, value)}
                />
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">roles</div>
            {roles.map((roleRow) => (
              <div key={roleRow.role} className="text-[11px] text-muted-foreground">
                {roleRow.role}: {roleRow.hasLockedPath ? 'lock' : 'free'} {roleRow.done ? 'done' : 'move'} t {fmt(roleRow.progress)} v {fmt(roleRow.currentSpeed)}→{fmt(roleRow.targetSpeed)} off {fmt(roleRow.lateralOffset)}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </TooltipProvider>
  )
}
