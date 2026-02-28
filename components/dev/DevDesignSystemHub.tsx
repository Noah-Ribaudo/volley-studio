'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { Check, AlertTriangle, ExternalLink, Search, Moon, Sun, Copy, RotateCcw, Smartphone } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlayerToken } from '@/components/court/PlayerToken'
import { PlayerContextContent } from '@/components/player-context/PlayerContextContent'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { Role } from '@/lib/types'

import {
  COVERAGE_COMING_NEXT,
  COVERAGE_DOCUMENTED_NOW,
  GLOSSARY_ITEMS,
  PLAYGROUND_SECTIONS,
  PRINCIPLE_CARDS,
} from '@/components/dev/design-system/data'
import type {
  GlossaryItem,
  PlaygroundSection,
  SectionCopyPayload,
  TweakControl,
  UsageNote,
} from '@/components/dev/design-system/types'

type PreviewTheme = 'light' | 'dark'
type CheckStatus = 'pass' | 'warn'

type SectionValues = Record<string, string | number>

interface ComputedCheck {
  id: string
  label: string
  helpText: string
  status: CheckStatus
  detail: string
}

const PREVIEW_THEME_VARS: Record<PreviewTheme, CSSProperties> = {
  light: {
    '--background': 'oklch(95% 0.015 95)',
    '--foreground': 'oklch(15% 0 0)',
    '--card': 'oklch(96% 0.011 95)',
    '--card-foreground': 'oklch(15% 0 0)',
    '--popover': 'oklch(96% 0.011 95)',
    '--popover-foreground': 'oklch(15% 0 0)',
    '--border': 'oklch(87% 0.009 95)',
    '--input': 'oklch(87% 0.009 95)',
    '--muted': 'oklch(92% 0.011 95)',
    '--muted-foreground': 'oklch(50% 0.01 95)',
    '--accent': 'oklch(92% 0.011 95)',
    '--accent-foreground': 'oklch(15% 0 0)',
    '--primary': 'oklch(70% 0.18 55)',
    '--primary-foreground': 'oklch(98% 0 0)',
    '--ring': 'oklch(70% 0.18 55)',
  } as CSSProperties,
  dark: {
    '--background': 'oklch(15% 0 0)',
    '--foreground': 'oklch(92% 0 0)',
    '--card': 'oklch(18% 0 0)',
    '--card-foreground': 'oklch(92% 0 0)',
    '--popover': 'oklch(18% 0 0)',
    '--popover-foreground': 'oklch(92% 0 0)',
    '--border': 'oklch(25% 0 0)',
    '--input': 'oklch(25% 0 0)',
    '--muted': 'oklch(22% 0 0)',
    '--muted-foreground': 'oklch(59% 0 0)',
    '--accent': 'oklch(22% 0 0)',
    '--accent-foreground': 'oklch(92% 0 0)',
    '--primary': 'oklch(70% 0.18 55)',
    '--primary-foreground': 'oklch(15% 0 0)',
    '--ring': 'oklch(70% 0.18 55)',
  } as CSSProperties,
}

const INITIAL_SECTION_VALUES: Record<string, SectionValues> = {
  buttons: {
    accentColor: '#f97316',
    textColor: '#ffffff',
    radius: 10,
    height: 44,
    motionMs: 180,
  },
  inputs: {
    surfaceColor: '#f8f7f3',
    borderColor: '#d6d2c8',
    ringColor: '#f97316',
    radius: 10,
    height: 44,
  },
  menus: {
    surfaceColor: '#faf8f2',
    itemHoverColor: '#f2ece0',
    borderColor: '#d6d2c8',
    radius: 10,
    itemHeight: 38,
  },
  overlays: {
    surfaceColor: '#faf8f2',
    borderColor: '#d6d2c8',
    radius: 16,
    shadow: 20,
    motionMs: 220,
  },
  tabs: {
    listSurface: '#ede8dd',
    activeSurface: '#ffffff',
    activeText: '#18181b',
    radius: 12,
    height: 42,
  },
  'player-context': {
    tokenScale: 1,
    panelRadius: 14,
    panelSurface: '#faf8f2',
    motionMs: 180,
    presentation: 'sheet',
  },
}

const STOCK_BUTTON_CLASS =
  'inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100'

const STOCK_PRIMARY_BUTTON_CLASS =
  'inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800'

const STOCK_INPUT_CLASS =
  'h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400'

const STOCK_MENU_ROW_CLASS =
  'flex h-9 items-center rounded-sm px-2 text-sm text-zinc-800 transition-colors hover:bg-zinc-100'

const STOCK_TAB_ROW_CLASS =
  'inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-zinc-600'

const PLAYER_ROSTER_SAMPLE = [
  { id: 'p1', name: 'Ari Stone', number: 7 },
  { id: 'p2', name: 'Nia Cole', number: 12 },
  { id: 'p3', name: 'Jade Park', number: 2 },
]

const PLAYER_ASSIGNMENTS_SAMPLE = {
  S: 'p1',
  OH1: 'p2',
}

const ONBOARDING_USE_STEPS = [
  'Pick a tab: Principles for rules, Glossary for definitions, Playground for side-by-side styling checks.',
  'Use search to jump directly to a rule, token, or interface piece.',
  'Tune one section at a time in Playground, then copy its update request for agent handoff.',
]

const ONBOARDING_ADD_STEPS = [
  'Add a glossary entry with purpose, defaults, and natural-language usage notes.',
  'Add matching principle evidence and at least one open-example link.',
  'Add a playground section with controls, checks, and a copy template before shipping the piece.',
]

function parseHexColor(value: string): [number, number, number] | null {
  const hex = value.trim()
  if (!/^#([\da-fA-F]{3}|[\da-fA-F]{6})$/.test(hex)) return null

  if (hex.length === 4) {
    const r = parseInt(hex[1] + hex[1], 16)
    const g = parseInt(hex[2] + hex[2], 16)
    const b = parseInt(hex[3] + hex[3], 16)
    return [r, g, b]
  }

  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function srgbToLinear(channel: number): number {
  const v = channel / 255
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const parsed = parseHexColor(hex)
  if (!parsed) return 0
  const [r, g, b] = parsed
  const rl = srgbToLinear(r)
  const gl = srgbToLinear(g)
  const bl = srgbToLinear(b)
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
}

function contrastRatio(foreground: string, background: string): number {
  const l1 = luminance(foreground)
  const l2 = luminance(background)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function channelToHex(channel: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(channel)))
  return clamped.toString(16).padStart(2, '0')
}

function tint(hex: string, amount: number): string {
  const parsed = parseHexColor(hex)
  if (!parsed) return hex
  const [r, g, b] = parsed
  const mixed = [r, g, b].map((channel) => channel + (255 - channel) * amount)
  return `#${channelToHex(mixed[0])}${channelToHex(mixed[1])}${channelToHex(mixed[2])}`
}

function shade(hex: string, amount: number): string {
  const parsed = parseHexColor(hex)
  if (!parsed) return hex
  const [r, g, b] = parsed
  const mixed = [r, g, b].map((channel) => channel * (1 - amount))
  return `#${channelToHex(mixed[0])}${channelToHex(mixed[1])}${channelToHex(mixed[2])}`
}

function distance(a: string, b: string): number {
  const colorA = parseHexColor(a)
  const colorB = parseHexColor(b)
  if (!colorA || !colorB) return 0
  const [ar, ag, ab] = colorA
  const [br, bg, bb] = colorB
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2)
}

function filterUsage(usage: UsageNote[], query: string): UsageNote[] {
  if (!query) return usage
  return usage.filter((note) => note.text.toLowerCase().includes(query))
}

function matchesText(query: string, ...fields: string[]): boolean {
  if (!query) return true
  return fields.join(' ').toLowerCase().includes(query)
}

function checkTone(status: CheckStatus): string {
  return status === 'pass'
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
}

function getSectionValues(sectionId: string, valuesBySection: Record<string, SectionValues>): SectionValues {
  return valuesBySection[sectionId] ?? {}
}

function valueAsNumber(values: SectionValues, key: string, fallback: number): number {
  const value = values[key]
  return typeof value === 'number' ? value : fallback
}

function valueAsString(values: SectionValues, key: string, fallback: string): string {
  const value = values[key]
  return typeof value === 'string' ? value : fallback
}

function getChecks(section: PlaygroundSection, values: SectionValues): ComputedCheck[] {
  if (section.id === 'buttons') {
    const accentColor = valueAsString(values, 'accentColor', '#f97316')
    const textColor = valueAsString(values, 'textColor', '#ffffff')
    const height = valueAsNumber(values, 'height', 44)
    const hoverColor = shade(accentColor, 0.12)
    const ringContrast = contrastRatio('#f5f5f5', accentColor)
    const textContrast = contrastRatio(textColor, accentColor)

    return [
      {
        id: 'readability',
        label: 'Readability',
        helpText: 'Checks if text/background contrast is strong enough.',
        status: textContrast >= 4.5 ? 'pass' : 'warn',
        detail: `Contrast ${textContrast.toFixed(2)}:1`,
      },
      {
        id: 'focus',
        label: 'Focus visibility',
        helpText: 'Checks if the focus ring stands out from nearby surfaces.',
        status: ringContrast >= 2 ? 'pass' : 'warn',
        detail: ringContrast >= 2 ? 'Ring is visually distinct' : 'Ring blends into nearby surface',
      },
      {
        id: 'touch',
        label: 'Touch target',
        helpText: 'Checks if the target reaches at least 44px in height.',
        status: height >= 44 ? 'pass' : 'warn',
        detail: `${height}px target height`,
      },
      {
        id: 'states',
        label: 'State distinction',
        helpText: 'Checks if hover/pressed states are visibly different from default.',
        status: distance(accentColor, hoverColor) >= 18 ? 'pass' : 'warn',
        detail: distance(accentColor, hoverColor) >= 18 ? 'Hover state is easy to spot' : 'Hover state is subtle',
      },
    ]
  }

  if (section.id === 'inputs') {
    const surfaceColor = valueAsString(values, 'surfaceColor', '#f8f7f3')
    const borderColor = valueAsString(values, 'borderColor', '#d6d2c8')
    const ringColor = valueAsString(values, 'ringColor', '#f97316')
    const height = valueAsNumber(values, 'height', 44)

    return [
      {
        id: 'readability',
        label: 'Readability',
        helpText: 'Checks text contrast inside the field.',
        status: contrastRatio('#18181b', surfaceColor) >= 7 ? 'pass' : 'warn',
        detail: `Contrast ${contrastRatio('#18181b', surfaceColor).toFixed(2)}:1`,
      },
      {
        id: 'focus',
        label: 'Focus visibility',
        helpText: 'Checks if focus ring is distinct from border.',
        status: distance(ringColor, borderColor) >= 24 ? 'pass' : 'warn',
        detail: distance(ringColor, borderColor) >= 24 ? 'Ring separation is clear' : 'Ring may blend with border',
      },
      {
        id: 'touch',
        label: 'Touch target',
        helpText: 'Checks minimum control height.',
        status: height >= 44 ? 'pass' : 'warn',
        detail: `${height}px field height`,
      },
    ]
  }

  if (section.id === 'menus') {
    const surfaceColor = valueAsString(values, 'surfaceColor', '#faf8f2')
    const hoverColor = valueAsString(values, 'itemHoverColor', '#f2ece0')
    const rowHeight = valueAsNumber(values, 'itemHeight', 38)

    return [
      {
        id: 'readability',
        label: 'Readability',
        helpText: 'Checks row text against menu surface.',
        status: contrastRatio('#18181b', surfaceColor) >= 7 ? 'pass' : 'warn',
        detail: `Contrast ${contrastRatio('#18181b', surfaceColor).toFixed(2)}:1`,
      },
      {
        id: 'touch',
        label: 'Touch target',
        helpText: 'Checks if rows are large enough for touch use.',
        status: rowHeight >= 36 ? 'pass' : 'warn',
        detail: `${rowHeight}px row height`,
      },
      {
        id: 'states',
        label: 'State distinction',
        helpText: 'Checks default vs hover row separation.',
        status: distance(surfaceColor, hoverColor) >= 10 ? 'pass' : 'warn',
        detail: distance(surfaceColor, hoverColor) >= 10 ? 'Hover row has clear tone change' : 'Hover row needs stronger separation',
      },
    ]
  }

  if (section.id === 'overlays') {
    const surfaceColor = valueAsString(values, 'surfaceColor', '#faf8f2')
    const shadow = valueAsNumber(values, 'shadow', 20)

    return [
      {
        id: 'readability',
        label: 'Readability',
        helpText: 'Checks text contrast on overlay surface.',
        status: contrastRatio('#18181b', surfaceColor) >= 7 ? 'pass' : 'warn',
        detail: `Contrast ${contrastRatio('#18181b', surfaceColor).toFixed(2)}:1`,
      },
      {
        id: 'states',
        label: 'State distinction',
        helpText: 'Checks that overlay surface stands apart from app background.',
        status: shadow >= 12 ? 'pass' : 'warn',
        detail: shadow >= 12 ? 'Overlay elevation reads clearly' : 'Overlay may feel too flat',
      },
    ]
  }

  if (section.id === 'tabs') {
    const activeSurface = valueAsString(values, 'activeSurface', '#ffffff')
    const listSurface = valueAsString(values, 'listSurface', '#ede8dd')
    const activeText = valueAsString(values, 'activeText', '#18181b')
    const height = valueAsNumber(values, 'height', 42)

    return [
      {
        id: 'readability',
        label: 'Readability',
        helpText: 'Checks active tab text contrast.',
        status: contrastRatio(activeText, activeSurface) >= 4.5 ? 'pass' : 'warn',
        detail: `Contrast ${contrastRatio(activeText, activeSurface).toFixed(2)}:1`,
      },
      {
        id: 'states',
        label: 'State distinction',
        helpText: 'Checks active tab is clearly distinct from inactive tabs.',
        status: distance(activeSurface, listSurface) >= 12 ? 'pass' : 'warn',
        detail: distance(activeSurface, listSurface) >= 12 ? 'Active tab stands out' : 'Active tab may blend in',
      },
      {
        id: 'touch',
        label: 'Touch target',
        helpText: 'Checks trigger height against touch guidance.',
        status: height >= 40 ? 'pass' : 'warn',
        detail: `${height}px trigger height`,
      },
    ]
  }

  const tokenScale = valueAsNumber(values, 'tokenScale', 1)
  const panelSurface = valueAsString(values, 'panelSurface', '#faf8f2')

  return [
    {
      id: 'readability',
      label: 'Readability',
      helpText: 'Checks panel text contrast.',
      status: contrastRatio('#18181b', panelSurface) >= 7 ? 'pass' : 'warn',
      detail: `Contrast ${contrastRatio('#18181b', panelSurface).toFixed(2)}:1`,
    },
    {
      id: 'touch',
      label: 'Touch target',
      helpText: 'Checks token and action sizes against touch guidance.',
      status: tokenScale >= 0.95 ? 'pass' : 'warn',
      detail: tokenScale >= 0.95 ? 'Token size is touch friendly' : 'Token scale is small for touch use',
    },
    {
      id: 'states',
      label: 'State distinction',
      helpText: 'Checks selected statuses are clearly distinct from idle states.',
      status: true ? 'pass' : 'warn',
      detail: 'Selected statuses use filled chips and check indicators',
    },
  ]
}

function buildSectionCopyPayload(section: PlaygroundSection, values: SectionValues): SectionCopyPayload {
  const valueLines = Object.entries(values).map(([key, value]) => {
    if (typeof value === 'number') return `${key}: ${Number.isInteger(value) ? value : value.toFixed(2)}`
    return `${key}: ${value}`
  })

  const prompt = [
    `Update the ${section.title} defaults in Volley Studio to match this approved design-system tuning.`,
    'Apply these values as the new default behavior in production UI, not only in the dev preview.',
    ...valueLines,
    'Keep the stock shadcn reference lane unchanged and update only the custom design lane implementation.',
    'Preserve layout stability: do not introduce UI jumps when states change.',
  ].join('\n')

  return {
    sectionId: section.id,
    sectionTitle: section.title,
    values,
    prompt,
  }
}

function themeButtonLabel(theme: PreviewTheme): string {
  return theme === 'light' ? 'Light preview' : 'Dark preview'
}

function ExternalUsageList({ usage, query }: { usage: UsageNote[]; query: string }) {
  const filtered = filterUsage(usage, query)

  if (filtered.length === 0) {
    return <p className="text-xs text-muted-foreground">No usage notes match this search.</p>
  }

  return (
    <div className="space-y-2">
      {filtered.map((note) => (
        <div key={note.id} className="rounded-md border border-border/70 bg-muted/20 p-2.5">
          <p className="text-xs text-foreground/90">{note.text}</p>
          <a
            href={note.href}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            {note.openLabel}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ))}
    </div>
  )
}

function sampleGlossaryPreview(item: GlossaryItem) {
  if (item.id === 'shared-button') {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm">Primary Action</Button>
        <Button size="sm" variant="outline">Secondary</Button>
      </div>
    )
  }

  if (item.id === 'shared-input') {
    return <Input value="Rotation 1 Notes" readOnly aria-label="Input sample" className="max-w-xs" />
  }

  if (item.id === 'shared-dropdown' || item.id === 'shared-context-menu') {
    return (
      <div className="w-52 rounded-md border border-border bg-popover p-1.5">
        <div className="rounded-sm px-2 py-1.5 text-sm hover:bg-accent">Rotation 1</div>
        <div className="rounded-sm px-2 py-1.5 text-sm hover:bg-accent">Rotation 2</div>
        <div className="rounded-sm px-2 py-1.5 text-sm hover:bg-accent">Rotation 3</div>
      </div>
    )
  }

  if (item.id === 'shared-overlays') {
    return (
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-4 shadow-lg">
        <div className="text-sm font-semibold">Overlay Preview</div>
        <div className="mt-1 text-xs text-muted-foreground">Temporary layer for focused tasks.</div>
      </div>
    )
  }

  if (item.id === 'shared-tabs') {
    return (
      <div className="inline-flex h-9 rounded-lg bg-muted p-1">
        <div className="rounded-md border border-border bg-background px-3 py-1 text-xs font-medium">Overview</div>
        <div className="px-3 py-1 text-xs text-muted-foreground">Assignments</div>
      </div>
    )
  }

  if (item.id === 'volley-player-token') {
    return (
      <svg viewBox="0 0 180 120" className="h-24 w-full max-w-xs rounded-md border border-border bg-muted/20">
        <g transform="translate(90 60)">
          <PlayerToken
            role={'S' as Role}
            x={0}
            y={0}
            showPlayer={true}
            showNumber={true}
            showPosition={true}
            playerName="Ari"
            playerNumber={7}
            tokenSize="big"
            isCircle={true}
            statuses={['passer', 'quick']}
          />
        </g>
      </svg>
    )
  }

  if (item.id === 'volley-player-actions') {
    return (
      <div className="max-w-sm rounded-md border border-border bg-popover p-3">
        <PlayerContextContent
          role={'OH1' as Role}
          roster={PLAYER_ROSTER_SAMPLE}
          assignments={PLAYER_ASSIGNMENTS_SAMPLE}
          mode="whiteboard"
          currentStatuses={['passer', 'pipe']}
          onStatusToggle={() => undefined}
          isHighlighted={true}
          onHighlightToggle={() => undefined}
          isMobile={false}
          hasTeam={false}
          onPlayerAssign={() => undefined}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline">Surface</Badge>
      <Badge variant="outline">Border</Badge>
      <Badge variant="outline">Accent</Badge>
    </div>
  )
}

function SectionControl({
  control,
  value,
  onChange,
}: {
  control: TweakControl
  value: string | number
  onChange: (next: string | number) => void
}) {
  if (control.type === 'color') {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-foreground">{control.label}</label>
          <span className="text-[11px] text-muted-foreground">{String(value)}</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={String(value)}
            onChange={(event) => onChange(event.target.value)}
            className="h-8 w-10 rounded border border-border bg-transparent p-1"
            aria-label={control.label}
          />
          <Input
            value={String(value)}
            onChange={(event) => onChange(event.target.value)}
            className="h-8 text-xs"
            aria-label={`${control.label} hex value`}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">{control.helpText}</p>
      </div>
    )
  }

  if (control.type === 'select') {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">{control.label}</label>
        <select
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
          aria-label={control.label}
        >
          {control.options?.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground">{control.helpText}</p>
      </div>
    )
  }

  const numericValue = typeof value === 'number' ? value : Number(value)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground">{control.label}</label>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {Number.isInteger(numericValue) ? numericValue : numericValue.toFixed(2)}{control.unit ?? ''}
        </span>
      </div>
      <Slider
        value={[numericValue]}
        onValueChange={([next]) => onChange(next)}
        min={control.min}
        max={control.max}
        step={control.step}
      />
      <p className="text-[11px] text-muted-foreground">{control.helpText}</p>
    </div>
  )
}

function PreviewLane({
  title,
  subtitle,
  children,
  style,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  style?: CSSProperties
}) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <span className="text-[11px] text-muted-foreground">{subtitle}</span>
      </div>
      <div className="min-h-44 rounded-md border border-border/70 bg-background p-3" style={style}>
        {children}
      </div>
    </div>
  )
}

function SectionChecks({ checks }: { checks: ComputedCheck[] }) {
  return (
    <div className="min-h-14 rounded-md border border-border/70 bg-muted/20 p-2.5">
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {checks.map((check) => (
          <div key={check.id} className={`rounded-md border px-2 py-1.5 ${checkTone(check.status)}`}>
            <div className="flex items-center gap-1 text-[11px] font-semibold">
              {check.status === 'pass' ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {check.label}
            </div>
            <p className="mt-0.5 text-[10px] leading-relaxed">{check.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DevDesignSystemHub() {
  const isMobile = useIsMobile()
  const [query, setQuery] = useState('')
  const [previewTheme, setPreviewTheme] = useState<PreviewTheme>('light')
  const [valuesBySection, setValuesBySection] = useState<Record<string, SectionValues>>(INITIAL_SECTION_VALUES)
  const [motionToggle, setMotionToggle] = useState<Record<string, boolean>>({})
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null)

  const normalizedQuery = query.trim().toLowerCase()

  const filteredPrinciples = useMemo(
    () =>
      PRINCIPLE_CARDS.filter((card) =>
        matchesText(
          normalizedQuery,
          card.title,
          card.rule,
          card.why,
          card.doExample,
          card.dontExample,
          card.numericGuideline,
          ...card.usage.map((note) => note.text)
        )
      ),
    [normalizedQuery]
  )

  const filteredGlossary = useMemo(
    () =>
      GLOSSARY_ITEMS.filter((item) =>
        matchesText(
          normalizedQuery,
          item.name,
          item.category,
          item.purpose,
          ...item.defaults,
          ...item.usage.map((note) => note.text)
        )
      ),
    [normalizedQuery]
  )

  const filteredPlayground = useMemo(
    () => PLAYGROUND_SECTIONS.filter((section) => matchesText(normalizedQuery, section.title, section.description, section.copyHeading)),
    [normalizedQuery]
  )

  function updateSectionValue(sectionId: string, key: string, value: string | number) {
    setValuesBySection((previous) => ({
      ...previous,
      [sectionId]: {
        ...getSectionValues(sectionId, previous),
        [key]: value,
      },
    }))
  }

  function resetSection(sectionId: string) {
    setValuesBySection((previous) => ({
      ...previous,
      [sectionId]: { ...INITIAL_SECTION_VALUES[sectionId] },
    }))
    setCopiedSectionId(null)
  }

  async function copySection(section: PlaygroundSection) {
    const values = getSectionValues(section.id, valuesBySection)
    const payload = buildSectionCopyPayload(section, values)

    try {
      await navigator.clipboard.writeText(payload.prompt)
      setCopiedSectionId(section.id)
      toast.success(`${section.title} update request copied`)
    } catch {
      toast.error('Clipboard copy failed')
    }
  }

  if (isMobile) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Design System Workspace</CardTitle>
          <CardDescription>
            This workspace is desktop-only so comparisons and controls stay readable and stable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            Open this page on a larger screen to view principles, glossary references, and side-by-side design previews.
          </div>
          <Button asChild>
            <a href="/" target="_blank" rel="noreferrer">Open Whiteboard in New Tab</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Design System</CardTitle>
          <CardDescription>
            Learn the rules, inspect how pieces are used, and tune section-by-section previews before promoting updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[16rem] flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search principles, glossary, and playground sections"
                className="pl-8"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              onClick={() => setPreviewTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            >
              {previewTheme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {themeButtonLabel(previewTheme)}
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-sm font-semibold">How to use this page</p>
              <div className="mt-2 space-y-2">
                {ONBOARDING_USE_STEPS.map((step) => (
                  <div key={step} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
                    <p className="text-xs text-muted-foreground">{step}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-sm font-semibold">How to add a new piece</p>
              <div className="mt-2 space-y-2">
                {ONBOARDING_ADD_STEPS.map((step) => (
                  <div key={step} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
                    <p className="text-xs text-muted-foreground">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="principles" className="space-y-3">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="principles">Principles</TabsTrigger>
          <TabsTrigger value="glossary">Glossary</TabsTrigger>
          <TabsTrigger value="playground">Live Playground</TabsTrigger>
        </TabsList>

        <TabsContent value="principles" className="space-y-3">
          {filteredPrinciples.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No principle cards match this search.
              </CardContent>
            </Card>
          ) : (
            filteredPrinciples.map((card) => (
              <Card key={card.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{card.title}</CardTitle>
                    <Badge variant="outline">Rule</Badge>
                  </div>
                  <CardDescription>{card.rule}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{card.why}</p>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Do</p>
                      <p className="mt-1 text-sm text-foreground/90">{card.doExample}</p>
                    </div>
                    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Don\'t</p>
                      <p className="mt-1 text-sm text-foreground/90">{card.dontExample}</p>
                    </div>
                  </div>

                  <div className="rounded-md border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Numeric guidance:</span> {card.numericGuideline}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Where this appears</p>
                    <ExternalUsageList usage={card.usage} query={normalizedQuery} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="glossary" className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Coverage Checklist</CardTitle>
              <CardDescription>Comprehensive by intent, phased by delivery. No progress meter, just concrete checklist visibility.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-border bg-muted/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Documented now</p>
                <ul className="mt-2 space-y-1.5">
                  {COVERAGE_DOCUMENTED_NOW.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-foreground/90">
                      <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md border border-border bg-muted/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coming next</p>
                <ul className="mt-2 space-y-1.5">
                  {COVERAGE_COMING_NEXT.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-foreground/90">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {filteredGlossary.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No glossary items match this search.
              </CardContent>
            </Card>
          ) : (
            filteredGlossary.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{item.name}</CardTitle>
                    <Badge variant="secondary">{item.category}</Badge>
                  </div>
                  <CardDescription>{item.purpose}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-md border border-border/70 bg-background/80 p-3">{sampleGlossaryPreview(item)}</div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Default style notes</p>
                    <ul className="space-y-1.5">
                      {item.defaults.map((defaultValue) => (
                        <li key={defaultValue} className="text-sm text-foreground/90">- {defaultValue}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Where this appears</p>
                    <ExternalUsageList usage={item.usage} query={normalizedQuery} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="playground" className="space-y-3">
          {filteredPlayground.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No playground sections match this search.
              </CardContent>
            </Card>
          ) : (
            filteredPlayground.map((section) => {
              const values = getSectionValues(section.id, valuesBySection)
              const checks = getChecks(section, values)
              const motionOn = motionToggle[section.id] ?? false

              const customThemeVars: CSSProperties = {
                ...PREVIEW_THEME_VARS[previewTheme],
              }

              return (
                <Card key={section.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {section.baselineNote && (
                      <div className="rounded-md border border-border/70 bg-muted/20 p-2.5 text-xs text-muted-foreground">
                        {section.baselineNote}
                      </div>
                    )}

                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_20rem]">
                      <div className="space-y-3">
                        <div className={`grid gap-3 ${section.stockComparable ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
                          {section.stockComparable && (
                            <PreviewLane
                              title="Stock shadcn reference"
                              subtitle="Fixed baseline"
                              style={PREVIEW_THEME_VARS[previewTheme]}
                            >
                              {section.id === 'buttons' && (
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-2">
                                    <button type="button" className={STOCK_PRIMARY_BUTTON_CLASS}>Save Rotation</button>
                                    <button type="button" className={STOCK_BUTTON_CLASS}>Cancel</button>
                                  </div>
                                  <div className="text-xs text-zinc-500">Reference mirrors stock shadcn new-york tone and spacing.</div>
                                </div>
                              )}

                              {section.id === 'inputs' && (
                                <div className="space-y-2">
                                  <input className={STOCK_INPUT_CLASS} defaultValue="Serve receive notes" readOnly />
                                  <input className={STOCK_INPUT_CLASS} defaultValue="Highlighted focus sample" readOnly style={{ boxShadow: '0 0 0 1px #a1a1aa' }} />
                                </div>
                              )}

                              {section.id === 'menus' && (
                                <div className="w-56 rounded-md border border-zinc-200 bg-white p-1 shadow-md">
                                  <div className={STOCK_MENU_ROW_CLASS}>Rotation 1</div>
                                  <div className={`${STOCK_MENU_ROW_CLASS} bg-zinc-100`}>Rotation 2</div>
                                  <div className={STOCK_MENU_ROW_CLASS}>Rotation 3</div>
                                </div>
                              )}

                              {section.id === 'overlays' && (
                                <div className="relative min-h-40 rounded-md border border-zinc-200 bg-zinc-100/80 p-2">
                                  <div className="absolute left-1/2 top-3 w-52 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
                                    <div className="text-sm font-semibold text-zinc-900">Stock Dialog</div>
                                    <div className="text-xs text-zinc-600">Centered temporary task layer.</div>
                                  </div>
                                  <div className="absolute bottom-2 left-2 right-2 rounded-t-xl border border-zinc-200 bg-white p-2">
                                    <div className="text-[11px] text-zinc-600">Stock mobile sheet</div>
                                  </div>
                                </div>
                              )}

                              {section.id === 'tabs' && (
                                <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-100 p-1">
                                  <span className={`${STOCK_TAB_ROW_CLASS} border border-zinc-200 bg-white text-zinc-900`}>Assignments</span>
                                  <span className={STOCK_TAB_ROW_CLASS}>Lineups</span>
                                </div>
                              )}
                            </PreviewLane>
                          )}

                          <PreviewLane
                            title="Custom preview"
                            subtitle="Live tweakable"
                            style={customThemeVars}
                          >
                            {section.id === 'buttons' && (() => {
                              const accent = valueAsString(values, 'accentColor', '#f97316')
                              const text = valueAsString(values, 'textColor', '#ffffff')
                              const radius = valueAsNumber(values, 'radius', 10)
                              const height = valueAsNumber(values, 'height', 44)
                              const motionMs = valueAsNumber(values, 'motionMs', 180)
                              const hover = shade(accent, 0.12)
                              const pressed = shade(accent, 0.2)

                              return (
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      style={{
                                        backgroundColor: accent,
                                        color: text,
                                        borderRadius: radius,
                                        height,
                                        transitionDuration: `${motionMs}ms`,
                                      }}
                                      className="px-4 text-sm font-medium"
                                    >
                                      Default
                                    </button>
                                    <button
                                      type="button"
                                      style={{
                                        backgroundColor: hover,
                                        color: text,
                                        borderRadius: radius,
                                        height,
                                        transitionDuration: `${motionMs}ms`,
                                      }}
                                      className="px-4 text-sm font-medium"
                                    >
                                      Hover
                                    </button>
                                    <button
                                      type="button"
                                      style={{
                                        backgroundColor: pressed,
                                        color: text,
                                        borderRadius: radius,
                                        height,
                                        transitionDuration: `${motionMs}ms`,
                                      }}
                                      className="px-4 text-sm font-medium"
                                    >
                                      Pressed
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    style={{
                                      borderRadius: radius,
                                      height,
                                      border: '1px solid color-mix(in oklch, var(--border) 80%, var(--foreground))',
                                      boxShadow: `0 0 0 3px ${tint(accent, 0.5)}`,
                                      transitionDuration: `${motionMs}ms`,
                                    }}
                                    className="w-full bg-background px-4 text-sm font-medium text-foreground"
                                  >
                                    Focus-visible sample
                                  </button>

                                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                    <button
                                      type="button"
                                      className="rounded border border-border px-2 py-1"
                                      onClick={() =>
                                        setMotionToggle((prev) => ({
                                          ...prev,
                                          [section.id]: !motionOn,
                                        }))
                                      }
                                    >
                                      Toggle motion preview
                                    </button>
                                    <div className="relative h-2 w-24 rounded-full bg-muted">
                                      <span
                                        className="absolute top-0 h-2 w-2 rounded-full bg-primary"
                                        style={{
                                          transform: motionOn ? 'translateX(5.25rem)' : 'translateX(0)',
                                          transitionDuration: `${motionMs}ms`,
                                          transitionProperty: 'transform',
                                          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )
                            })()}

                            {section.id === 'inputs' && (() => {
                              const surface = valueAsString(values, 'surfaceColor', '#f8f7f3')
                              const border = valueAsString(values, 'borderColor', '#d6d2c8')
                              const ring = valueAsString(values, 'ringColor', '#f97316')
                              const radius = valueAsNumber(values, 'radius', 10)
                              const height = valueAsNumber(values, 'height', 44)

                              return (
                                <div className="space-y-2">
                                  <input
                                    readOnly
                                    defaultValue="Serve receive call"
                                    style={{
                                      backgroundColor: surface,
                                      borderColor: border,
                                      borderRadius: radius,
                                      height,
                                      color: 'var(--foreground)',
                                    }}
                                    className="w-full border px-3 text-sm"
                                  />
                                  <input
                                    readOnly
                                    defaultValue="Focused field"
                                    style={{
                                      backgroundColor: surface,
                                      borderColor: border,
                                      borderRadius: radius,
                                      height,
                                      color: 'var(--foreground)',
                                      boxShadow: `0 0 0 3px ${tint(ring, 0.55)}`,
                                    }}
                                    className="w-full border px-3 text-sm"
                                  />
                                </div>
                              )
                            })()}

                            {section.id === 'menus' && (() => {
                              const surface = valueAsString(values, 'surfaceColor', '#faf8f2')
                              const hover = valueAsString(values, 'itemHoverColor', '#f2ece0')
                              const border = valueAsString(values, 'borderColor', '#d6d2c8')
                              const radius = valueAsNumber(values, 'radius', 10)
                              const rowHeight = valueAsNumber(values, 'itemHeight', 38)

                              return (
                                <div
                                  className="w-56 border p-1"
                                  style={{
                                    backgroundColor: surface,
                                    borderColor: border,
                                    borderRadius: radius,
                                  }}
                                >
                                  <div className="flex items-center rounded-sm px-2 text-sm text-foreground" style={{ height: rowHeight }}>Rotation 1</div>
                                  <div className="flex items-center rounded-sm px-2 text-sm text-foreground" style={{ height: rowHeight, backgroundColor: hover }}>Rotation 2</div>
                                  <div className="flex items-center rounded-sm px-2 text-sm text-foreground" style={{ height: rowHeight }}>Rotation 3</div>
                                </div>
                              )
                            })()}

                            {section.id === 'overlays' && (() => {
                              const surface = valueAsString(values, 'surfaceColor', '#faf8f2')
                              const border = valueAsString(values, 'borderColor', '#d6d2c8')
                              const radius = valueAsNumber(values, 'radius', 16)
                              const shadow = valueAsNumber(values, 'shadow', 20)
                              const motionMs = valueAsNumber(values, 'motionMs', 220)

                              return (
                                <div className="relative min-h-40 rounded-md border border-border/60 bg-muted/20 p-2">
                                  <div
                                    className="absolute left-1/2 top-3 w-52 -translate-x-1/2 border p-3"
                                    style={{
                                      backgroundColor: surface,
                                      borderColor: border,
                                      borderRadius: radius,
                                      boxShadow: `0 12px ${shadow}px rgba(0, 0, 0, 0.18)`,
                                      transform: motionOn ? 'translate(-50%, 2px)' : 'translate(-50%, 0)',
                                      transition: `transform ${motionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                                    }}
                                  >
                                    <div className="text-sm font-semibold text-foreground">Custom Dialog</div>
                                    <div className="text-xs text-muted-foreground">Temporary high-focus decision panel.</div>
                                  </div>
                                  <div
                                    className="absolute bottom-2 left-2 right-2 border p-2"
                                    style={{
                                      backgroundColor: surface,
                                      borderColor: border,
                                      borderRadius: `${radius}px ${radius}px 0 0`,
                                      boxShadow: `0 -4px ${shadow * 0.6}px rgba(0, 0, 0, 0.12)`,
                                    }}
                                  >
                                    <div className="text-[11px] text-muted-foreground">Custom mobile sheet</div>
                                  </div>
                                </div>
                              )
                            })()}

                            {section.id === 'tabs' && (() => {
                              const listSurface = valueAsString(values, 'listSurface', '#ede8dd')
                              const activeSurface = valueAsString(values, 'activeSurface', '#ffffff')
                              const activeText = valueAsString(values, 'activeText', '#18181b')
                              const radius = valueAsNumber(values, 'radius', 12)
                              const height = valueAsNumber(values, 'height', 42)

                              return (
                                <div className="inline-flex p-1" style={{ borderRadius: radius, backgroundColor: listSurface }}>
                                  <div
                                    className="flex items-center border px-3 text-sm font-medium"
                                    style={{
                                      height,
                                      borderRadius: Math.max(6, radius - 4),
                                      backgroundColor: activeSurface,
                                      color: activeText,
                                      borderColor: 'color-mix(in oklch, var(--border) 80%, var(--foreground))',
                                    }}
                                  >
                                    Assignments
                                  </div>
                                  <div className="flex items-center px-3 text-sm text-muted-foreground" style={{ height }}>
                                    Lineups
                                  </div>
                                </div>
                              )
                            })()}

                            {section.id === 'player-context' && (() => {
                              const tokenScale = valueAsNumber(values, 'tokenScale', 1)
                              const panelRadius = valueAsNumber(values, 'panelRadius', 14)
                              const panelSurface = valueAsString(values, 'panelSurface', '#faf8f2')
                              const motionMs = valueAsNumber(values, 'motionMs', 180)
                              const presentation = valueAsString(values, 'presentation', 'sheet')

                              return (
                                <div className="space-y-3">
                                  <div className="rounded-md border border-border bg-muted/30 p-2">
                                    <svg viewBox="0 0 280 150" className="h-32 w-full">
                                      <rect x="8" y="8" width="264" height="134" rx="12" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
                                      <g transform={`translate(90 74) scale(${tokenScale})`}>
                                        <PlayerToken
                                          role={'OH1' as Role}
                                          x={0}
                                          y={0}
                                          showPosition={true}
                                          showPlayer={true}
                                          showNumber={true}
                                          playerName="Nia"
                                          playerNumber={12}
                                          tokenSize="big"
                                          isCircle={true}
                                          statuses={['passer', 'quick']}
                                          isContextOpen={true}
                                        />
                                      </g>
                                    </svg>
                                  </div>

                                  <div className="grid gap-3 md:grid-cols-2">
                                    <div
                                      className="rounded-md border border-border p-2"
                                      style={{
                                        backgroundColor: panelSurface,
                                        borderRadius: panelRadius,
                                        transition: `transform ${motionMs}ms ease`,
                                        transform: motionOn ? 'translateY(-2px)' : 'translateY(0)',
                                      }}
                                    >
                                      <p className="mb-2 text-xs font-semibold text-muted-foreground">Desktop action popover</p>
                                      <PlayerContextContent
                                        role={'OH1' as Role}
                                        roster={PLAYER_ROSTER_SAMPLE}
                                        assignments={PLAYER_ASSIGNMENTS_SAMPLE}
                                        mode="whiteboard"
                                        currentStatuses={['passer', 'pipe']}
                                        onStatusToggle={() => undefined}
                                        isHighlighted={true}
                                        onHighlightToggle={() => undefined}
                                        isMobile={false}
                                        hasTeam={false}
                                        onPlayerAssign={() => undefined}
                                      />
                                    </div>
                                    <div className="rounded-[1.5rem] border border-border bg-zinc-950 p-2">
                                      <div className="mx-auto w-full max-w-[16rem] overflow-hidden rounded-[1.25rem] border border-zinc-700 bg-zinc-900 p-2">
                                        <div
                                          className="rounded-t-[0.75rem] border border-zinc-700 p-2"
                                          style={{
                                            backgroundColor: panelSurface,
                                            borderRadius: presentation === 'sheet' ? `${panelRadius}px ${panelRadius}px 0 0` : panelRadius,
                                            minHeight: 176,
                                          }}
                                        >
                                          <div className="mb-2 flex items-center gap-1 text-[11px] font-semibold text-zinc-800">
                                            <Smartphone className="h-3.5 w-3.5" />
                                            Mobile {presentation === 'sheet' ? 'sheet' : 'popover'} preview
                                          </div>
                                          <PlayerContextContent
                                            role={'OH1' as Role}
                                            roster={PLAYER_ROSTER_SAMPLE}
                                            assignments={PLAYER_ASSIGNMENTS_SAMPLE}
                                            mode="whiteboard"
                                            currentStatuses={['passer', 'pipe']}
                                            onStatusToggle={() => undefined}
                                            isHighlighted={true}
                                            onHighlightToggle={() => undefined}
                                            isMobile={true}
                                            hasTeam={false}
                                            onPlayerAssign={() => undefined}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })()}
                          </PreviewLane>
                        </div>

                        <SectionChecks checks={checks} />
                      </div>

                      <div className="rounded-lg border border-border bg-muted/20 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Controls</p>
                          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => resetSection(section.id)}>
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset section
                          </Button>
                        </div>

                        <div className="space-y-3 min-h-[22rem]">
                          {section.controls.map((control) => (
                            <SectionControl
                              key={`${section.id}-${control.id}`}
                              control={control}
                              value={values[control.id] ?? ''}
                              onChange={(next) => updateSectionValue(section.id, control.id, next)}
                            />
                          ))}
                        </div>

                        <div className="mt-3 min-h-16 rounded-md border border-border/70 bg-background/70 p-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{section.copyHeading}</p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="h-8"
                              onClick={() => copySection(section)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copy update request
                            </Button>
                            <span className="text-[11px] text-muted-foreground">
                              {copiedSectionId === section.id ? 'Copied to clipboard' : 'Plain-language payload'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
