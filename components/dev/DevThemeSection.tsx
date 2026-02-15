'use client'

import { useDevThemeStore } from '@/store/useDevThemeStore'
import { useDevThemeApplicator } from '@/hooks/useDevThemeApplicator'
import { useAppStore } from '@/store/useAppStore'
import { FONT_OPTIONS, DISPLAY_FONT_OPTIONS } from '@/lib/devThemeFonts'
import { SHADER_PARAM_MAP } from '@/lib/devThemeShaderParams'
import { SHADER_OPTIONS, type ShaderId } from '@/lib/shaders'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { ComponentType, SVGProps } from 'react'

// lucide-react icons actually used in the app
import {
  Sun, Moon, Eye, EyeOff, X, Check, Circle,
  RotateCw, ChevronLeft, ChevronRight, ChevronDown,
  Users, Zap, Timer, RotateCcw, Shield,
  TrendingUp, TrendingDown, Minus,
  Printer, LogIn, Layout, Settings, Play, Home,
} from 'lucide-react'

// hugeicons actually used in the app
import { HugeiconsIcon } from '@hugeicons/react'
import {
  PrinterIcon,
  Share01Icon,
  Settings01Icon,
  DragDropVerticalIcon,
  Cancel01Icon,
  Search01Icon,
  FilterIcon,
  BookOpen01Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  CheckmarkCircle01Icon,
  Layers01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Tick02Icon,
  ViewIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons'

type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>

const LUCIDE_ICONS: { name: string; icon: LucideIcon }[] = [
  { name: 'Sun', icon: Sun },
  { name: 'Moon', icon: Moon },
  { name: 'Eye', icon: Eye },
  { name: 'EyeOff', icon: EyeOff },
  { name: 'X', icon: X },
  { name: 'Check', icon: Check },
  { name: 'Circle', icon: Circle },
  { name: 'RotateCw', icon: RotateCw },
  { name: 'ChevronLeft', icon: ChevronLeft },
  { name: 'ChevronRight', icon: ChevronRight },
  { name: 'ChevronDown', icon: ChevronDown },
  { name: 'Users', icon: Users },
  { name: 'Zap', icon: Zap },
  { name: 'Timer', icon: Timer },
  { name: 'RotateCcw', icon: RotateCcw },
  { name: 'Shield', icon: Shield },
  { name: 'TrendingUp', icon: TrendingUp },
  { name: 'TrendingDown', icon: TrendingDown },
  { name: 'Minus', icon: Minus },
  { name: 'Printer', icon: Printer },
  { name: 'LogIn', icon: LogIn },
  { name: 'Layout', icon: Layout },
  { name: 'Settings', icon: Settings },
  { name: 'Play', icon: Play },
  { name: 'Home', icon: Home },
]

const HUGEICON_ICONS: { name: string; icon: any }[] = [
  { name: 'Printer', icon: PrinterIcon },
  { name: 'Share01', icon: Share01Icon },
  { name: 'Settings01', icon: Settings01Icon },
  { name: 'DragDropVertical', icon: DragDropVerticalIcon },
  { name: 'Cancel01', icon: Cancel01Icon },
  { name: 'Search01', icon: Search01Icon },
  { name: 'Filter', icon: FilterIcon },
  { name: 'BookOpen01', icon: BookOpen01Icon },
  { name: 'ArrowLeft02', icon: ArrowLeft02Icon },
  { name: 'ArrowRight02', icon: ArrowRight02Icon },
  { name: 'CheckmarkCircle01', icon: CheckmarkCircle01Icon },
  { name: 'Layers01', icon: Layers01Icon },
  { name: 'ArrowLeft01', icon: ArrowLeft01Icon },
  { name: 'ArrowRight01', icon: ArrowRight01Icon },
  { name: 'ArrowDown01', icon: ArrowDown01Icon },
  { name: 'ArrowUp01', icon: ArrowUp01Icon },
  { name: 'Tick02', icon: Tick02Icon },
  { name: 'View', icon: ViewIcon },
  { name: 'ViewOff', icon: ViewOffIcon },
]

function getFontVariantPreview(id: string) {
  const key = id.toLowerCase()

  let fontWeight = 400
  if (key.includes('thin')) fontWeight = 100
  else if (key.includes('light')) fontWeight = 300
  else if (key.includes('medium')) fontWeight = 500
  else if (key.includes('semibold') || key.includes('demi') || key.includes('demibold')) fontWeight = 600
  else if (key.includes('bold')) fontWeight = 700
  else if (key.includes('black')) fontWeight = 900

  const fontStyle: 'normal' | 'italic' = key.includes('italic') ? 'italic' : 'normal'
  return { fontWeight, fontStyle }
}

export default function DevThemeSection() {
  useDevThemeApplicator()

  const {
    fontSans,
    fontDisplay,
    setFontSans,
    setFontDisplay,
    accentHue,
    accentLightness,
    accentChroma,
    setAccentHue,
    setAccentLightness,
    setAccentChroma,
    shaderParams,
    setShaderParam,
    resetShaderParams,
    borderRadius,
    letterSpacing,
    setBorderRadius,
    setLetterSpacing,
    resetAll,
  } = useDevThemeStore()

  const backgroundShader = useAppStore((s) => s.backgroundShader)
  const setBackgroundShader = useAppStore((s) => s.setBackgroundShader)
  const backgroundOpacity = useAppStore((s) => s.backgroundOpacity)
  const setBackgroundOpacity = useAppStore((s) => s.setBackgroundOpacity)

  const accentColor = `oklch(${accentLightness}% ${accentChroma / 1000} ${accentHue})`
  const selectedSansFont = FONT_OPTIONS.find((f) => f.id === fontSans)
  const selectedDisplayFont = DISPLAY_FONT_OPTIONS.find((f) => f.id === fontDisplay)
  const sansPreview = selectedSansFont ? getFontVariantPreview(selectedSansFont.id) : null
  const displayPreview = selectedDisplayFont ? getFontVariantPreview(selectedDisplayFont.id) : null

  const renderFontOptionLabel = (f: { id: string; label: string; cssValue: string; category: string }) => {
    const preview = getFontVariantPreview(f.id)
    return (
      <span className="flex items-center gap-2">
        <span
          style={{
            fontFamily: f.cssValue,
            fontWeight: preview.fontWeight,
            fontStyle: preview.fontStyle,
          }}
        >
          {f.label}
        </span>
        <span className="text-[10px] text-muted-foreground">{f.category}</span>
      </span>
    )
  }

  function handleCopyTheme() {
    const sansFont = FONT_OPTIONS.find((f) => f.id === fontSans)
    const displayFont = DISPLAY_FONT_OPTIONS.find((f) => f.id === fontDisplay)

    const lines = [':root {']
    if (sansFont) lines.push(`  --font-sans: ${sansFont.cssValue};`)
    if (displayFont) lines.push(`  --font-display: ${displayFont.cssValue};`)
    lines.push(`  --c-accent: oklch(${accentLightness}% ${accentChroma / 1000} ${accentHue});`)
    lines.push(`  --primary: oklch(${accentLightness}% ${accentChroma / 1000} ${accentHue});`)
    lines.push(`  --ring: oklch(${accentLightness}% ${accentChroma / 1000} ${accentHue});`)
    lines.push(`  --radius: ${borderRadius / 100}rem;`)
    lines.push(`  --tracking-tight: ${letterSpacing / 1000}em;`)
    lines.push('}')

    navigator.clipboard.writeText(lines.join('\n'))
    toast.success('Theme CSS copied to clipboard')
  }

  // Current shader params config
  const currentShaderParams = SHADER_PARAM_MAP[backgroundShader as ShaderId] ?? []
  const currentShaderOverrides = shaderParams[backgroundShader] ?? {}

  const [isOpen, setIsOpen] = useState(false)

  return (
    <Card className="border-dashed border-orange-500/30 bg-orange-500/[0.02]">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform duration-200",
                !isOpen && "-rotate-90"
              )}
            />
            <div>
              <CardTitle className="text-base">Theme Lab</CardTitle>
              <CardDescription>Dev-only — live-test fonts, colors, shaders, layout</CardDescription>
            </div>
          </div>
          {isOpen && (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={resetAll}
                className="text-xs px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
              >
                Reset All
              </button>
              <button
                onClick={handleCopyTheme}
                className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Copy Theme as CSS
              </button>
            </div>
          )}
        </div>
      </CardHeader>
      {isOpen && <CardContent className="space-y-8">
        {/* 1. Typography */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Typography</h3>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Body Font</Label>
            <p
              className="text-sm p-3 rounded-md bg-muted/50 border"
              style={{
                fontFamily: selectedSansFont?.cssValue,
                fontWeight: sansPreview?.fontWeight,
                fontStyle: sansPreview?.fontStyle,
              }}
            >
              The quick brown fox jumps over the lazy dog. 0123456789
            </p>
            <Select value={fontSans} onValueChange={() => undefined}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((f) => (
                  <SelectItem
                    key={f.id}
                    value={f.id}
                    onMouseEnter={() => setFontSans(f.id)}
                    onFocus={() => setFontSans(f.id)}
                  >
                    {renderFontOptionLabel(f)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Display / Heading Font</Label>
            <p
              className="text-lg font-semibold p-3 rounded-md bg-muted/50 border"
              style={{
                fontFamily: selectedDisplayFont?.cssValue,
                fontWeight: displayPreview?.fontWeight,
                fontStyle: displayPreview?.fontStyle,
              }}
            >
              Rotation 1 — Serve Receive
            </p>
            <Select value={fontDisplay} onValueChange={() => undefined}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISPLAY_FONT_OPTIONS.map((f) => (
                  <SelectItem
                    key={f.id}
                    value={f.id}
                    onMouseEnter={() => setFontDisplay(f.id)}
                    onFocus={() => setFontDisplay(f.id)}
                  >
                    {renderFontOptionLabel(f)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* 2. Colors */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Colors</h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Accent Hue</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{accentHue}°</span>
            </div>
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full h-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  background: 'linear-gradient(to right, hsl(0,80%,60%), hsl(60,80%,60%), hsl(120,80%,60%), hsl(180,80%,60%), hsl(240,80%,60%), hsl(300,80%,60%), hsl(360,80%,60%))',
                }}
              />
              <Slider
                value={[accentHue]}
                onValueChange={([v]) => setAccentHue(v)}
                min={0}
                max={360}
                step={1}
                className="relative [&_[data-slot=slider-track]]:bg-transparent [&_[data-slot=slider-range]]:bg-transparent"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Lightness</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{accentLightness}%</span>
            </div>
            <Slider
              value={[accentLightness]}
              onValueChange={([v]) => setAccentLightness(v)}
              min={40}
              max={90}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Chroma</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{(accentChroma / 1000).toFixed(3)}</span>
            </div>
            <Slider
              value={[accentChroma]}
              onValueChange={([v]) => setAccentChroma(v)}
              min={0}
              max={400}
              step={5}
            />
          </div>

          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg border shadow-sm"
              style={{ backgroundColor: accentColor }}
            />
            <div className="space-y-0.5">
              <p className="text-xs font-mono text-muted-foreground">{accentColor}</p>
              <p className="text-xs text-muted-foreground">Current accent</p>
            </div>
          </div>

          {/* Role color palette reference */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Role palette (read-only)</Label>
            <div className="grid grid-cols-7 gap-1.5">
              {[
                { label: 'S', var: '--c-setter' },
                { label: 'OH1', var: '--c-oh1' },
                { label: 'OH2', var: '--c-oh2' },
                { label: 'MB1', var: '--c-mb1' },
                { label: 'MB2', var: '--c-mb2' },
                { label: 'OPP', var: '--c-opp' },
                { label: 'L', var: '--c-libero' },
              ].map((role) => (
                <div key={role.var} className="flex flex-col items-center gap-1">
                  <div
                    className="w-8 h-8 rounded-md border"
                    style={{ backgroundColor: `var(${role.var})` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{role.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Shaders */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Shaders</h3>

          <div className="space-y-2">
            <Label htmlFor="dev-shader-select" className="text-sm font-medium">
              Background Shader
            </Label>
            <Select
              value={backgroundShader}
              onValueChange={(value) => setBackgroundShader(value as ShaderId)}
            >
              <SelectTrigger id="dev-shader-select">
                <SelectValue placeholder="Select shader" />
              </SelectTrigger>
              <SelectContent>
                {SHADER_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    <span className="flex items-center justify-between w-full gap-3">
                      <span>{option.label}</span>
                      {option.cost > 0 && (
                        <span className={cn(
                          'text-[10px] tabular-nums shrink-0',
                          option.cost <= 3 ? 'text-muted-foreground' :
                          option.cost <= 5 ? 'text-yellow-500' :
                          'text-orange-500'
                        )}>
                          {option.cost}/10
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Shader Visibility</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{100 - backgroundOpacity}%</span>
            </div>
            <Slider
              value={[100 - backgroundOpacity]}
              onValueChange={([v]) => setBackgroundOpacity(100 - v)}
              min={0}
              max={50}
              step={1}
            />
          </div>

          {currentShaderParams.length > 0 && (
            <>
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <Label className="text-xs text-muted-foreground">
                  {SHADER_OPTIONS.find((s) => s.id === backgroundShader)?.label} params
                </Label>
                <button
                  onClick={() => resetShaderParams(backgroundShader as ShaderId)}
                  className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                >
                  Reset
                </button>
              </div>

              {currentShaderParams.map((param) => {
                const value = currentShaderOverrides[param.key] ?? param.defaultValue
                return (
                  <div key={param.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">{param.label}</Label>
                      <span className="text-xs text-muted-foreground tabular-nums">{value.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[value]}
                      onValueChange={([v]) => setShaderParam(backgroundShader as ShaderId, param.key, v)}
                      min={param.min}
                      max={param.max}
                      step={param.step}
                    />
                  </div>
                )
              })}
            </>
          )}
        </section>

        {/* 4. Icons */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Icons</h3>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">lucide-react ({LUCIDE_ICONS.length})</Label>
            <div className="grid grid-cols-6 gap-3">
              {LUCIDE_ICONS.map(({ name, icon: Icon }) => (
                <div key={name} className="flex flex-col items-center gap-1.5 p-2 rounded-md bg-muted/30">
                  <Icon className="w-5 h-5 text-foreground" />
                  <span className="text-[9px] text-muted-foreground leading-tight text-center">{name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">@hugeicons ({HUGEICON_ICONS.length})</Label>
            <div className="grid grid-cols-6 gap-3">
              {HUGEICON_ICONS.map(({ name, icon }) => (
                <div key={name} className="flex flex-col items-center gap-1.5 p-2 rounded-md bg-muted/30">
                  <HugeiconsIcon icon={icon} className="w-5 h-5 text-foreground" />
                  <span className="text-[9px] text-muted-foreground leading-tight text-center">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Layout */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Layout</h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Border Radius</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{(borderRadius / 100).toFixed(2)}rem</span>
            </div>
            <Slider
              value={[borderRadius]}
              onValueChange={([v]) => setBorderRadius(v)}
              min={0}
              max={150}
              step={5}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Letter Spacing</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{(letterSpacing / 1000).toFixed(3)}em</span>
            </div>
            <Slider
              value={[letterSpacing]}
              onValueChange={([v]) => setLetterSpacing(v)}
              min={-50}
              max={20}
              step={1}
            />
          </div>

          {/* Live preview */}
          <div
            className="p-4 border bg-card text-card-foreground"
            style={{ borderRadius: `${borderRadius / 100}rem` }}
          >
            <p className="text-sm font-semibold mb-1" style={{ letterSpacing: `${letterSpacing / 1000}em` }}>
              Preview Card
            </p>
            <p className="text-xs text-muted-foreground">
              Radius and spacing applied live
            </p>
            <button
              className="mt-3 px-4 py-1.5 text-xs bg-primary text-primary-foreground font-medium"
              style={{ borderRadius: `${Math.max(0, borderRadius / 100 - 0.2)}rem` }}
            >
              Sample Button
            </button>
          </div>
        </section>
      </CardContent>}
    </Card>
  )
}
