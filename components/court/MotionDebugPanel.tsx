'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Copy, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
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

type MotionDebugWhiteboardTuning = {
  collisionRadius: number
  separationStrength: number
  maxSeparation: number
}

type TuningItem<T extends string> = {
  key: T
  label: string
  helper: string
  tooltip: string
  min: number
  max: number
  step: number
}

const WHITEBOARD_TUNING_ITEMS: TuningItem<keyof MotionDebugWhiteboardTuning>[] = [
  {
    key: 'collisionRadius',
    label: 'Collision Radius',
    helper: 'How close two players can get before they start pushing apart while dragging.',
    tooltip: 'Distance threshold for collision response during regular whiteboard drag interactions.',
    min: 0.04,
    max: 0.25,
    step: 0.001,
  },
  {
    key: 'separationStrength',
    label: 'Separation Strength',
    helper: 'How strongly nearby players are pushed away from each other during drag.',
    tooltip: 'Higher values increase steering force used to separate nearby players in whiteboard mode.',
    min: 0.1,
    max: 16,
    step: 0.05,
  },
  {
    key: 'maxSeparation',
    label: 'Max Separation',
    helper: 'Limits how much any one collision push can move a player each frame.',
    tooltip: 'Upper cap for per-step separation response in whiteboard drag collision avoidance.',
    min: 0.1,
    max: 8,
    step: 0.05,
  },
]

const PREVIEW_SPEED_ITEMS: TuningItem<keyof WhiteboardMotionTuning>[] = [
  {
    key: 'cruiseSpeed',
    label: 'Cruise Speed',
    helper: 'Base movement speed on straight paths during Play preview.',
    tooltip: 'Default travel speed for preview movement on low-curvature segments.',
    min: 0.1,
    max: 1.8,
    step: 0.01,
  },
  {
    key: 'acceleration',
    label: 'Acceleration',
    helper: 'How quickly players ramp up speed after starting or slowing.',
    tooltip: 'Controls how quickly preview agents gain speed over time.',
    min: 0.2,
    max: 8,
    step: 0.05,
  },
  {
    key: 'braking',
    label: 'Braking',
    helper: 'How quickly players can slow down for stops, traffic, or curves.',
    tooltip: 'Higher values allow quicker deceleration near path end and collisions.',
    min: 0.2,
    max: 10,
    step: 0.05,
  },
]

const PREVIEW_PATH_ITEMS: TuningItem<keyof WhiteboardMotionTuning>[] = [
  {
    key: 'lookAheadTime',
    label: 'Look-Ahead',
    helper: 'How far ahead motion planning looks while previewing movement.',
    tooltip: 'Prediction horizon used for anticipating collisions and path shape changes.',
    min: 0.05,
    max: 1.2,
    step: 0.01,
  },
  {
    key: 'maxLateralAccel',
    label: 'Corner Limit',
    helper: 'Caps how hard players can turn through curves at speed.',
    tooltip: 'Lower values force larger slowdowns in high-curvature turns.',
    min: 0.1,
    max: 4,
    step: 0.01,
  },
]

const PREVIEW_AVOIDANCE_ITEMS: TuningItem<keyof WhiteboardMotionTuning>[] = [
  {
    key: 'tokenRadius',
    label: 'Token Radius',
    helper: 'Collision radius used for preview movement avoidance.',
    tooltip: 'Physical token radius in normalized court units for preview collision checks.',
    min: 0.03,
    max: 0.15,
    step: 0.001,
  },
  {
    key: 'minSpacingRadii',
    label: 'Extra Spacing',
    helper: 'Adds extra safety buffer between players during preview movement.',
    tooltip: 'Additional spacing target measured in token radii.',
    min: 0,
    max: 3,
    step: 0.05,
  },
  {
    key: 'avoidanceBlend',
    label: 'Sidestep Blend',
    helper: 'Mixes slowing down vs stepping sideways to avoid collisions.',
    tooltip: '0 favors speed reduction; 1 favors lateral sidestepping.',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    key: 'deflectionStrength',
    label: 'Deflection Strength',
    helper: 'How strongly players are pushed sideways under collision pressure.',
    tooltip: 'Scales lateral deflection force when crowding occurs.',
    min: 0,
    max: 3,
    step: 0.05,
  },
  {
    key: 'maxLateralOffsetRadii',
    label: 'Max Offset',
    helper: 'Maximum sideways distance from planned path during avoidance.',
    tooltip: 'Caps total sidestep distance from the planned curve, in token radii.',
    min: 0,
    max: 5,
    step: 0.05,
  },
]

const SHARED_ITEMS: TuningItem<keyof WhiteboardMotionTuning>[] = [
  {
    key: 'curveStrength',
    label: 'Curve Strength',
    helper: 'Controls default bend for auto-generated movement curves and preview paths.',
    tooltip: 'Used when generating default bezier control points, including non-preview arrow defaults.',
    min: 0,
    max: 0.9,
    step: 0.01,
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
  whiteboardTuning: MotionDebugWhiteboardTuning
  onWhiteboardTuningChange: <K extends keyof MotionDebugWhiteboardTuning>(key: K, value: number) => void
  onResetWhiteboardTuning: () => void
  tuning: WhiteboardMotionTuning
  onTuningChange: <K extends keyof WhiteboardMotionTuning>(key: K, value: number) => void
  onResetPreviewTuning: () => void
  onResetSharedTuning: () => void
  roles: MotionDebugRoleStats[]
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

type ScopeLabel = 'Always On' | 'Preview Only' | 'Shared'

function ScopePill({ label }: { label: ScopeLabel }) {
  const classes =
    label === 'Always On'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : label === 'Preview Only'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
        : 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300'
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${classes}`}>
      {label}
    </span>
  )
}

type SliderControlProps = {
  label: string
  helper: string
  tooltip: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}

function SliderControl({
  label,
  helper,
  tooltip,
  value,
  min,
  max,
  step,
  onChange,
}: SliderControlProps) {
  const formatted = Number.isFinite(value) ? value.toFixed(2) : '-'

  return (
    <div className="space-y-1.5 rounded-md border border-border/60 bg-background/40 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium">{label}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[260px] leading-relaxed">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{formatted}</span>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{helper}</p>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([nextValue]) => onChange(nextValue)}
      />
    </div>
  )
}

function SectionCard({
  title,
  subtitle,
  scope,
  onReset,
  children,
}: {
  title: string
  subtitle: string
  scope: ScopeLabel
  onReset: () => void
  children: ReactNode
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</h3>
            <ScopePill label={scope} />
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={onReset}>
          Reset
        </Button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

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
  whiteboardTuning,
  onWhiteboardTuningChange,
  onResetWhiteboardTuning,
  tuning,
  onTuningChange,
  onResetPreviewTuning,
  onResetSharedTuning,
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
    const target = e.target as HTMLElement | null
    if (target?.closest('[data-no-drag="true"]')) return

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
    return {
      whiteboardEditing: {
        collisionRadius: whiteboardTuning.collisionRadius,
        separationStrength: whiteboardTuning.separationStrength,
        maxSeparation: whiteboardTuning.maxSeparation,
      },
      previewPlayback: {
        speedProfile: {
          cruiseSpeed: tuning.cruiseSpeed,
          acceleration: tuning.acceleration,
          braking: tuning.braking,
        },
        pathPlanning: {
          lookAheadTime: tuning.lookAheadTime,
          maxLateralAccel: tuning.maxLateralAccel,
        },
        collisionAvoidance: {
          tokenRadius: tuning.tokenRadius,
          minSpacingRadii: tuning.minSpacingRadii,
          avoidanceBlend: tuning.avoidanceBlend,
          deflectionStrength: tuning.deflectionStrength,
          maxLateralOffsetRadii: tuning.maxLateralOffsetRadii,
        },
      },
      shared: {
        curveStrength: tuning.curveStrength,
      },
      state: {
        mode,
        animationMode,
        displaySource,
        isBezierAnimating,
        isPreviewingMovement,
        hasPlayedPositions,
        animationTrigger,
        isRafActive,
      },
    }
  }, [
    whiteboardTuning.collisionRadius,
    whiteboardTuning.separationStrength,
    whiteboardTuning.maxSeparation,
    tuning.cruiseSpeed,
    tuning.acceleration,
    tuning.braking,
    tuning.lookAheadTime,
    tuning.maxLateralAccel,
    tuning.tokenRadius,
    tuning.minSpacingRadii,
    tuning.avoidanceBlend,
    tuning.deflectionStrength,
    tuning.maxLateralOffsetRadii,
    tuning.curveStrength,
    mode,
    animationMode,
    displaySource,
    isBezierAnimating,
    isPreviewingMovement,
    hasPlayedPositions,
    animationTrigger,
    isRafActive,
  ])

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
        className="pointer-events-auto fixed z-50 w-[430px] max-w-[calc(100%-16px)] py-0 shadow-xl bg-card/95 backdrop-blur-sm"
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
            data-no-drag="true"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleCopyValues}
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copy Values</span>
          </Button>
        </div>

        <div className="max-h-[76vh] overflow-auto px-3 py-3 space-y-3">
          <div className="rounded-md border border-border/60 bg-muted/20 p-2">
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
          </div>

          <SectionCard
            title="Whiteboard Editing"
            subtitle="These values affect normal token dragging on the whiteboard, even when preview is off."
            scope="Always On"
            onReset={onResetWhiteboardTuning}
          >
            {WHITEBOARD_TUNING_ITEMS.map((item) => (
              <SliderControl
                key={item.key}
                label={item.label}
                helper={item.helper}
                tooltip={item.tooltip}
                value={whiteboardTuning[item.key]}
                min={item.min}
                max={item.max}
                step={item.step}
                onChange={(value) => onWhiteboardTuningChange(item.key, value)}
              />
            ))}
          </SectionCard>

          <SectionCard
            title="Preview Playback"
            subtitle="These values affect Play preview movement only. They do not change normal whiteboard dragging."
            scope="Preview Only"
            onReset={onResetPreviewTuning}
          >
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Speed Profile</p>
              <div className="space-y-2">
                {PREVIEW_SPEED_ITEMS.map((item) => (
                  <SliderControl
                    key={item.key}
                    label={item.label}
                    helper={item.helper}
                    tooltip={item.tooltip}
                    value={tuning[item.key]}
                    min={item.min}
                    max={item.max}
                    step={item.step}
                    onChange={(value) => onTuningChange(item.key, value)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Path Planning</p>
              <div className="space-y-2">
                {PREVIEW_PATH_ITEMS.map((item) => (
                  <SliderControl
                    key={item.key}
                    label={item.label}
                    helper={item.helper}
                    tooltip={item.tooltip}
                    value={tuning[item.key]}
                    min={item.min}
                    max={item.max}
                    step={item.step}
                    onChange={(value) => onTuningChange(item.key, value)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Collision Avoidance</p>
              <div className="space-y-2">
                {PREVIEW_AVOIDANCE_ITEMS.map((item) => (
                  <SliderControl
                    key={item.key}
                    label={item.label}
                    helper={item.helper}
                    tooltip={item.tooltip}
                    value={tuning[item.key]}
                    min={item.min}
                    max={item.max}
                    step={item.step}
                    onChange={(value) => onTuningChange(item.key, value)}
                  />
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Shared"
            subtitle="These values are used by both whiteboard defaults and preview path generation."
            scope="Shared"
            onReset={onResetSharedTuning}
          >
            {SHARED_ITEMS.map((item) => (
              <SliderControl
                key={item.key}
                label={item.label}
                helper={item.helper}
                tooltip={item.tooltip}
                value={tuning[item.key]}
                min={item.min}
                max={item.max}
                step={item.step}
                onChange={(value) => onTuningChange(item.key, value)}
              />
            ))}
          </SectionCard>

          <div className="rounded-md border border-border/60 bg-muted/20 p-2 space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Preview Agent Stats</div>
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
