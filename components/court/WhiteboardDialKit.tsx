'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Copy, ChevronDown, ChevronRight, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DragHandle } from '@/components/ui/drag-handle'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useWhiteboardDialStore,
  DIAL_DEFAULTS,
  type WhiteboardDialValues,
  type SpringPreset,
} from '@/store/useWhiteboardDialStore'
import { SPRING } from '@/lib/motion-utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

type DialCategory = 'tokens' | 'arrows' | 'timing' | 'springs' | 'glow'

type DialItem = {
  key: keyof WhiteboardDialValues
  label: string
  tooltip: string
  min: number
  max: number
  step: number
  format?: (v: number) => string
}

const fmt2 = (v: number) => v.toFixed(2)
const fmtInt = (v: number) => Math.round(v).toString()
const fmtMs = (v: number) => `${Math.round(v)}ms`
const fmtS = (v: number) => `${v.toFixed(1)}s`

const TOKEN_ITEMS: DialItem[] = [
  {
    key: 'tokenBaseSizePositionOnly',
    label: 'Base size (position-only)',
    tooltip: 'Diameter of tokens that only show a position label (no player assigned). Visible on the whiteboard at all times — just look at any unassigned position.',
    min: 32, max: 80, step: 1, format: fmtInt,
  },
  {
    key: 'tokenBaseSizePlayer',
    label: 'Base size (player)',
    tooltip: 'Diameter of tokens with a player name or number assigned. Assign a player to a position to see this in action.',
    min: 32, max: 80, step: 1, format: fmtInt,
  },
  {
    key: 'tokenCornerRadius',
    label: 'Corner radius',
    tooltip: 'Roundness of rectangular token corners. Set to 0 for sharp corners. Only affects non-circular tokens — visible on all rectangle tokens at rest.',
    min: 0, max: 24, step: 1, format: fmtInt,
  },
  {
    key: 'tokenDragScale',
    label: 'Drag scale',
    tooltip: 'How much a token grows when you pick it up. To test: drag any token on the whiteboard and watch it scale up.',
    min: 1.0, max: 1.3, step: 0.01, format: fmt2,
  },
  {
    key: 'tokenDragShadowBlur',
    label: 'Drag shadow blur',
    tooltip: 'Spread of the drop shadow under a token while dragging. To test: drag a token and look at the shadow beneath it.',
    min: 0, max: 40, step: 1, format: fmtInt,
  },
  {
    key: 'tokenDragShadowOpacity',
    label: 'Drag shadow opacity',
    tooltip: 'Darkness of the drop shadow under a token while dragging. To test: drag a token and look at the shadow beneath it.',
    min: 0, max: 1, step: 0.01, format: fmt2,
  },
  {
    key: 'tokenDimmedOpacity',
    label: 'Dimmed opacity',
    tooltip: 'How transparent role-dimmed tokens appear. To test: use the role filter in the sidebar to dim specific positions, then observe the dimmed tokens.',
    min: 0, max: 1, step: 0.01, format: fmt2,
  },
  {
    key: 'tokenInnerHighlight',
    label: 'Inner highlight',
    tooltip: 'Brightness of the white inner highlight that gives tokens visual depth. Visible on all tokens at rest — look for the subtle lighter area inside each token.',
    min: 0, max: 0.5, step: 0.01, format: fmt2,
  },
  {
    key: 'tokenBorderWidth',
    label: 'Border width',
    tooltip: 'Stroke width of the token border in its normal unselected state. Visible on all tokens at rest.',
    min: 0.5, max: 5, step: 0.1, format: fmt2,
  },
  {
    key: 'tokenSelectedBorderWidth',
    label: 'Selected border width',
    tooltip: 'Stroke width of the token border when selected or its context menu is open. To test: click a token to select it and observe the thicker border.',
    min: 1, max: 6, step: 0.1, format: fmt2,
  },
]

const ARROW_ITEMS: DialItem[] = [
  {
    key: 'arrowheadSizeMultiplier',
    label: 'Arrowhead size multiplier',
    tooltip: 'Scale of the arrowhead relative to the arrow stroke width. To test: draw an arrow between two tokens (long-press a token, then tap another).',
    min: 1, max: 5, step: 0.1, format: fmt2,
  },
  {
    key: 'arrowheadAngle',
    label: 'Arrowhead angle',
    tooltip: 'Spread angle of the arrowhead wings in degrees. Wider = more open chevron shape. To test: draw an arrow and observe the head shape.',
    min: 10, max: 60, step: 1, format: fmtInt,
  },
  {
    key: 'arrowStartDotRadius',
    label: 'Start dot radius',
    tooltip: 'Size of the small circle at the arrow\'s origin point. To test: draw an arrow and look at the dot where it starts (at the source token).',
    min: 0, max: 8, step: 0.1, format: fmt2,
  },
  {
    key: 'arrowStartDotOpacity',
    label: 'Start dot opacity',
    tooltip: 'Brightness of the dot at the arrow\'s starting point. To test: draw an arrow and observe the origin dot opacity.',
    min: 0, max: 1, step: 0.01, format: fmt2,
  },
  {
    key: 'arrowheadOpacity',
    label: 'Arrowhead opacity',
    tooltip: 'Brightness of the arrowhead at the arrow\'s endpoint. To test: draw an arrow and observe the arrowhead opacity.',
    min: 0, max: 1, step: 0.01, format: fmt2,
  },
  {
    key: 'arrowHitAreaWidth',
    label: 'Hit area width',
    tooltip: 'Width of the invisible hover/tap target around an arrow path (in pixels). Larger = easier to click/hover. Turn on Debug Hitboxes in dev settings to visualize this.',
    min: 10, max: 60, step: 1, format: fmtInt,
  },
  {
    key: 'arrowCurveHandleRadius',
    label: 'Curve handle radius',
    tooltip: 'Size of the visible dot at the midpoint of a curved arrow. To test: hover over an existing arrow to reveal the curve handle dot.',
    min: 2, max: 15, step: 0.5, format: fmt2,
  },
  {
    key: 'arrowCurveHandleHitRadius',
    label: 'Curve handle hit radius',
    tooltip: 'Size of the invisible grab target around the curve handle (in pixels). Larger = easier to grab for dragging. Turn on Debug Hitboxes to visualize.',
    min: 10, max: 50, step: 1, format: fmtInt,
  },
]

const TIMING_ITEMS: DialItem[] = [
  {
    key: 'arrowDrawInDuration',
    label: 'Draw-in duration',
    tooltip: 'How long the arrow "draws itself" when first created (in milliseconds). To test: draw a new arrow between tokens and watch the line animate in.',
    min: 50, max: 1000, step: 10, format: fmtMs,
  },
  {
    key: 'arrowPeekRevealDuration',
    label: 'Peek reveal duration',
    tooltip: 'How fast arrows fade in when you hover over a token (in milliseconds). To test: hover your cursor over a token that has arrows attached.',
    min: 50, max: 800, step: 10, format: fmtMs,
  },
  {
    key: 'arrowPeekRetractDuration',
    label: 'Peek retract duration',
    tooltip: 'How fast arrows fade out when you stop hovering (in milliseconds). To test: hover a token with arrows, then move your cursor away.',
    min: 50, max: 800, step: 10, format: fmtMs,
  },
  {
    key: 'tokenTransitionMs',
    label: 'Token transition',
    tooltip: 'Duration of the drag scale and shadow transitions when picking up or dropping a token (in milliseconds). To test: drag and release a token.',
    min: 0, max: 500, step: 10, format: fmtMs,
  },
]

const GLOW_ITEMS: DialItem[] = [
  {
    key: 'glowPulseDuration',
    label: 'Pulse duration',
    tooltip: 'How fast the glow ring pulses in seconds. To test: long-press a token on mobile (or use the prime action) to see the pulsing glow ring.',
    min: 0.3, max: 3.0, step: 0.1, format: fmtS,
  },
  {
    key: 'glowMinOpacity',
    label: 'Min opacity',
    tooltip: 'Glow brightness at its dimmest pulse point. To test: prime a token and watch the glow ring cycle between dim and bright.',
    min: 0, max: 1, step: 0.01, format: fmt2,
  },
  {
    key: 'glowMaxOpacity',
    label: 'Max opacity',
    tooltip: 'Glow brightness at its brightest pulse point. To test: prime a token and watch the glow ring cycle between dim and bright.',
    min: 0, max: 1, step: 0.01, format: fmt2,
  },
  {
    key: 'glowMinStrokeWidth',
    label: 'Min stroke width',
    tooltip: 'Glow ring thickness at its thinnest pulse point. To test: prime a token and watch the ring thickness pulse.',
    min: 1, max: 8, step: 0.5, format: fmt2,
  },
  {
    key: 'glowMaxStrokeWidth',
    label: 'Max stroke width',
    tooltip: 'Glow ring thickness at its thickest pulse point. To test: prime a token and watch the ring thickness pulse.',
    min: 1, max: 10, step: 0.5, format: fmt2,
  },
  {
    key: 'glowOffset',
    label: 'Glow offset',
    tooltip: 'Distance of the glow ring from the token edge in pixels. To test: prime a token and observe how far the ring sits from the token boundary.',
    min: 2, max: 16, step: 0.5, format: fmt2,
  },
]

const SPRING_PRESETS: { value: SpringPreset; label: string }[] = [
  { value: 'player', label: 'Player' },
  { value: 'snappy', label: 'Snappy' },
  { value: 'gentle', label: 'Gentle' },
  { value: 'bouncy', label: 'Bouncy' },
  { value: 'stiff', label: 'Stiff' },
]

type ScopeLabel = 'Tokens' | 'Arrows' | 'Timing' | 'Springs' | 'Glow'

const SCOPE_CLASSES: Record<ScopeLabel, string> = {
  Tokens: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  Arrows: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  Timing: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  Springs: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  Glow: 'border-lime-500/40 bg-lime-500/10 text-lime-700 dark:text-lime-300',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScopePill({ label }: { label: ScopeLabel }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SCOPE_CLASSES[label]}`}>
      {label}
    </span>
  )
}

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
          data-no-drag="true"
        >
          <Info className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-[280px] leading-relaxed text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

function DialSlider({ item }: { item: DialItem }) {
  const value = useWhiteboardDialStore((s) => s[item.key] as number)
  const set = useWhiteboardDialStore((s) => s.set)
  const formatted = item.format ? item.format(value) : fmt2(value)

  return (
    <div className="space-y-1 rounded-md border border-border/60 bg-background/40 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium">{item.label}</span>
          <InfoTip text={item.tooltip} />
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{formatted}</span>
      </div>
      <Slider
        min={item.min}
        max={item.max}
        step={item.step}
        value={[value]}
        onValueChange={([v]) => set(item.key, v)}
      />
    </div>
  )
}

function FolderSection({
  title,
  scope,
  category,
  defaultOpen,
  children,
}: {
  title: string
  scope: ScopeLabel
  category: DialCategory
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  const resetCategory = useWhiteboardDialStore((s) => s.resetCategory)

  return (
    <div className="rounded-lg border border-border/70 bg-muted/20">
      <div className="flex w-full items-center justify-between gap-2 p-3">
        <div
          className="flex flex-1 cursor-pointer items-center gap-2"
          role="button"
          tabIndex={0}
          onClick={() => setOpen(!open)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open) } }}
        >
          {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</h3>
          <ScopePill label={scope} />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[10px]"
          data-no-drag="true"
          onClick={() => resetCategory(category)}
        >
          Reset
        </Button>
      </div>
      {open && <div className="space-y-2 px-3 pb-3">{children}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function WhiteboardDialKit() {
  const panelRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    offsetX: number
    offsetY: number
  } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 12, y: 64 })

  // Spring preset/stiffness/damping
  const springPreset = useWhiteboardDialStore((s) => s.springPreset)
  const springStiffness = useWhiteboardDialStore((s) => s.springStiffness)
  const springDamping = useWhiteboardDialStore((s) => s.springDamping)
  const glowColor = useWhiteboardDialStore((s) => s.glowColor)
  const setDial = useWhiteboardDialStore((s) => s.set)

  // Drag logic (identical to MotionDebugPanel)
  const clampPosition = useCallback((x: number, y: number) => {
    const panel = panelRef.current
    if (!panel) return { x: Math.max(0, x), y: Math.max(0, y) }
    const margin = 8
    const maxX = Math.max(margin, window.innerWidth - panel.offsetWidth - margin)
    const maxY = Math.max(margin, window.innerHeight - panel.offsetHeight - margin)
    return { x: clamp(x, margin, maxX), y: clamp(y, margin, maxY) }
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
    setPosition(clampPosition(e.clientX - drag.offsetX, e.clientY - drag.offsetY))
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

  // Clamp on resize
  useEffect(() => {
    const syncBounds = () => setPosition((prev) => clampPosition(prev.x, prev.y))
    syncBounds()
    window.addEventListener('resize', syncBounds)
    const panel = panelRef.current
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && panel) {
      observer = new ResizeObserver(syncBounds)
      observer.observe(panel)
    }
    return () => {
      window.removeEventListener('resize', syncBounds)
      observer?.disconnect()
    }
  }, [clampPosition])

  // Copy all values as JSON
  const handleCopyValues = useCallback(async () => {
    const state = useWhiteboardDialStore.getState()
    const payload: Record<string, unknown> = {}
    for (const key of Object.keys(DIAL_DEFAULTS) as (keyof WhiteboardDialValues)[]) {
      payload[key] = state[key]
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      toast.success('Dial values copied')
    } catch {
      toast.error('Failed to copy dial values')
    }
  }, [])

  // Sync spring stiffness/damping when preset changes
  const handlePresetChange = useCallback((preset: SpringPreset) => {
    const spring = SPRING[preset]
    setDial('springPreset', preset)
    setDial('springStiffness', spring.stiffness)
    setDial('springDamping', spring.damping)
  }, [setDial])

  return (
    <TooltipProvider delayDuration={120}>
      <Card
        ref={panelRef}
        className="pointer-events-auto fixed z-50 w-[400px] max-w-[calc(100%-16px)] py-0 shadow-xl bg-card/95 backdrop-blur-sm"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      >
        {/* Header / drag handle */}
        <div
          className={`flex items-center justify-between border-b px-3 py-2 select-none touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="flex items-center gap-2">
            <DragHandle />
            <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Whiteboard DialKit</span>
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

        {/* Scrollable content */}
        <div className="max-h-[76vh] overflow-auto px-3 py-3 space-y-3">
          {/* Tokens */}
          <FolderSection title="Tokens" scope="Tokens" category="tokens">
            {TOKEN_ITEMS.map((item) => <DialSlider key={item.key} item={item} />)}
          </FolderSection>

          {/* Arrows */}
          <FolderSection title="Arrows" scope="Arrows" category="arrows" defaultOpen={false}>
            {ARROW_ITEMS.map((item) => <DialSlider key={item.key} item={item} />)}
          </FolderSection>

          {/* Animation Timing */}
          <FolderSection title="Animation Timing" scope="Timing" category="timing" defaultOpen={false}>
            {TIMING_ITEMS.map((item) => <DialSlider key={item.key} item={item} />)}
          </FolderSection>

          {/* Springs */}
          <FolderSection title="Springs" scope="Springs" category="springs" defaultOpen={false}>
            <div className="space-y-1 rounded-md border border-border/60 bg-background/40 p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium">Active preset</span>
                  <InfoTip text="Which spring physics preset to use for token movement animations. Each preset has a different balance of stiffness and damping. Changing this updates the stiffness/damping sliders below." />
                </div>
              </div>
              <Select
                value={springPreset}
                onValueChange={(v) => handlePresetChange(v as SpringPreset)}
              >
                <SelectTrigger className="h-8 text-xs" data-no-drag="true">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPRING_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 rounded-md border border-border/60 bg-background/40 p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium">Stiffness</span>
                  <InfoTip text="Spring stiffness — higher values make token movement snappier and faster. Lower values create a softer, slower feel. To test: drag a token and release it to see the spring settle." />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">{Math.round(springStiffness)}</span>
              </div>
              <Slider
                min={50}
                max={800}
                step={5}
                value={[springStiffness]}
                onValueChange={([v]) => setDial('springStiffness', v)}
              />
            </div>
            <div className="space-y-1 rounded-md border border-border/60 bg-background/40 p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium">Damping</span>
                  <InfoTip text="Spring damping — higher values reduce bounce and overshoot, making movement feel more controlled. Lower values let tokens bounce more. To test: drag a token and release it." />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">{Math.round(springDamping)}</span>
              </div>
              <Slider
                min={5}
                max={80}
                step={1}
                value={[springDamping]}
                onValueChange={([v]) => setDial('springDamping', v)}
              />
            </div>
          </FolderSection>

          {/* Primed Glow */}
          <FolderSection title="Primed Glow" scope="Glow" category="glow" defaultOpen={false}>
            <div className="space-y-1 rounded-md border border-border/60 bg-background/40 p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium">Glow color</span>
                  <InfoTip text="Color of the pulsing ring that appears around a primed token. To test: long-press a token on mobile (or use the prime action) to activate the glow." />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">{glowColor}</span>
                  <input
                    type="color"
                    value={glowColor}
                    onChange={(e) => setDial('glowColor', e.target.value)}
                    className="h-6 w-8 cursor-pointer rounded border border-border/60 bg-transparent p-0"
                    data-no-drag="true"
                  />
                </div>
              </div>
            </div>
            {GLOW_ITEMS.map((item) => <DialSlider key={item.key} item={item} />)}
          </FolderSection>
        </div>
      </Card>
    </TooltipProvider>
  )
}
