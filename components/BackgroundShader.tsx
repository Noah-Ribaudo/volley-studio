'use client'

import { useEffect, useMemo, useState, type ComponentType } from 'react'
import dynamic from 'next/dynamic'
import { useUIPrefsStore } from '@/store/useUIPrefsStore'
import { useThemeStore } from '@/store/useThemeStore'
import { SHADER_OPTIONS, type ShaderId } from '@/lib/shaders'
import { useDevThemeStore } from '@/store/useDevThemeStore'

type RGB = [number, number, number]

const FALLBACK_ACCENT = '#f59e0b'
const FALLBACK_BG = '#0a0a0a'

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function oklchToRgb(oklch: string): RGB | null {
  const match = oklch.match(/oklch\(([^)]+)\)/)
  if (!match) return null

  const body = match[1] ?? ''
  const [lchPart] = body.split('/')
  const parts = lchPart.trim().split(/\s+/)
  if (parts.length < 3) return null

  let l = parseFloat(parts[0] ?? '')
  const c = parseFloat(parts[1] ?? '')
  const h = parseFloat(parts[2] ?? '')
  if (Number.isNaN(l) || Number.isNaN(c) || Number.isNaN(h)) return null

  if (parts[0]?.includes('%')) {
    l = l / 100
  }

  const hRad = (h * Math.PI) / 180
  const a = c * Math.cos(hRad)
  const b = c * Math.sin(hRad)

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.291485548 * b

  const l3 = l_ ** 3
  const m3 = m_ ** 3
  const s3 = s_ ** 3

  let r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3
  let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3
  let b2 = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3

  const toSrgb = (v: number) =>
    v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055

  r = clamp01(toSrgb(r))
  g = clamp01(toSrgb(g))
  b2 = clamp01(toSrgb(b2))

  return [r, g, b2]
}

function rgbToHex([r, g, b]: RGB): string {
  const toHex = (v: number) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function mixColors(a: RGB, b: RGB, t: number): RGB {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}

function useThemeShaderColors() {
  const theme = useThemeStore((state) => state.theme)
  // In dev, re-read CSS vars when accent color changes
  const devAccentHue = useDevThemeStore((s) => s.accentHue)
  const devAccentLightness = useDevThemeStore((s) => s.accentLightness)
  const devAccentChroma = useDevThemeStore((s) => s.accentChroma)
  const [colors, setColors] = useState(() => ({
    accent: FALLBACK_ACCENT,
    accentSoft: FALLBACK_ACCENT,
    accentStrong: FALLBACK_ACCENT,
    background: FALLBACK_BG,
  }))

  useEffect(() => {
    const root = document.documentElement
    const styles = getComputedStyle(root)
    const accentVar = styles.getPropertyValue('--c-accent').trim()
    const bgVar = styles.getPropertyValue('--c-bg').trim()

    const accentRgb = oklchToRgb(accentVar)
    const bgRgb = oklchToRgb(bgVar)

    if (!accentRgb || !bgRgb) {
      setColors({
        accent: FALLBACK_ACCENT,
        accentSoft: FALLBACK_ACCENT,
        accentStrong: FALLBACK_ACCENT,
        background: FALLBACK_BG,
      })
      return
    }

    const accent = rgbToHex(accentRgb)
    const accentSoft = rgbToHex(mixColors(accentRgb, bgRgb, 0.45))
    const accentStrong = rgbToHex(mixColors(accentRgb, [1, 1, 1], 0.2))
    const background = rgbToHex(bgRgb)

    setColors({ accent, accentSoft, accentStrong, background })
  }, [theme, devAccentHue, devAccentLightness, devAccentChroma])

  return colors
}

// Lazy-load each shader individually so only the active one downloads
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyShader(name: string): ComponentType<any> {
  return dynamic(
    () => import('@paper-design/shaders-react').then((m) => ({ default: (m as unknown as Record<string, ComponentType<any>>)[name] })),
    { ssr: false }
  )
}

const LazyMeshGradient = lazyShader('MeshGradient')
const LazyStaticMeshGradient = lazyShader('StaticMeshGradient')
const LazyStaticRadialGradient = lazyShader('StaticRadialGradient')
const LazySmokeRing = lazyShader('SmokeRing')
const LazyNeuroNoise = lazyShader('NeuroNoise')
const LazyDotOrbit = lazyShader('DotOrbit')
const LazyDotGrid = lazyShader('DotGrid')
const LazySimplexNoise = lazyShader('SimplexNoise')
const LazyPerlinNoise = lazyShader('PerlinNoise')
const LazyMetaballs = lazyShader('Metaballs')
const LazyWaves = lazyShader('Waves')
const LazyVoronoi = lazyShader('Voronoi')
const LazyWarp = lazyShader('Warp')
const LazyGodRays = lazyShader('GodRays')
const LazySpiral = lazyShader('Spiral')
const LazySwirl = lazyShader('Swirl')
const LazyDithering = lazyShader('Dithering')
const LazyPulsingBorder = lazyShader('PulsingBorder')
const LazyColorPanels = lazyShader('ColorPanels')
const LazyPaperTexture = lazyShader('PaperTexture')
const LazyFlutedGlass = lazyShader('FlutedGlass')
const LazyWater = lazyShader('Water')
const LazyLiquidMetal = lazyShader('LiquidMetal')
const LazyGrainGradient = lazyShader('GrainGradient')

function renderShader(shaderId: ShaderId, palette: ReturnType<typeof useThemeShaderColors>, devParams: Record<string, number> = {}) {
  const sharedProps = {
    className: 'h-full w-full',
    style: { width: '100%', height: '100%', backgroundColor: palette.background },
  }
  const colors = [palette.accentSoft, palette.accent, palette.accentStrong]

  switch (shaderId) {
    case 'mesh-gradient':
      return <LazyMeshGradient {...sharedProps} colors={colors} {...devParams} />
    case 'static-mesh-gradient':
      return <LazyStaticMeshGradient {...sharedProps} colors={colors} {...devParams} />
    case 'static-radial-gradient':
      return <LazyStaticRadialGradient {...sharedProps} colors={colors} colorBack={palette.background} {...devParams} />
    case 'smoke-ring':
      return <LazySmokeRing {...sharedProps} colors={[palette.accent]} colorBack={palette.background} {...devParams} />
    case 'neuro-noise':
      return (
        <LazyNeuroNoise
          {...sharedProps}
          colorFront={palette.accentStrong}
          colorMid={palette.accent}
          colorBack={palette.background}
          {...devParams}
        />
      )
    case 'dot-orbit':
      return <LazyDotOrbit {...sharedProps} colors={colors} colorBack={palette.background} {...devParams} />
    case 'dot-grid':
      return (
        <LazyDotGrid
          {...sharedProps}
          colorBack={palette.background}
          colorFill={palette.accent}
          colorStroke={palette.accentSoft}
          {...devParams}
        />
      )
    case 'simplex-noise':
      return <LazySimplexNoise {...sharedProps} colors={colors} {...devParams} />
    case 'perlin-noise':
      return (
        <LazyPerlinNoise
          {...sharedProps}
          colorFront={palette.accentStrong}
          colorBack={palette.background}
          {...devParams}
        />
      )
    case 'metaballs':
      return <LazyMetaballs {...sharedProps} colors={colors} colorBack={palette.background} {...devParams} />
    case 'waves':
      return <LazyWaves {...sharedProps} colorFront={palette.accentStrong} colorBack={palette.background} {...devParams} />
    case 'voronoi':
      return <LazyVoronoi {...sharedProps} colors={colors} colorGap={palette.background} colorGlow={palette.accentStrong} {...devParams} />
    case 'warp':
      return <LazyWarp {...sharedProps} colors={colors} {...devParams} />
    case 'god-rays':
      return <LazyGodRays {...sharedProps} colors={colors} colorBack={palette.background} colorBloom={palette.accentStrong} {...devParams} />
    case 'spiral':
      return <LazySpiral {...sharedProps} colorFront={palette.accentStrong} colorBack={palette.background} {...devParams} />
    case 'swirl':
      return <LazySwirl {...sharedProps} colors={colors} colorBack={palette.background} {...devParams} />
    case 'dithering':
      return <LazyDithering {...sharedProps} colorFront={palette.accent} colorBack={palette.background} {...devParams} />
    case 'pulsing-border':
      return <LazyPulsingBorder {...sharedProps} colors={colors} colorBack={palette.background} {...devParams} />
    case 'color-panels':
      return <LazyColorPanels {...sharedProps} colors={colors} colorBack={palette.background} {...devParams} />
    case 'paper-texture':
      return <LazyPaperTexture {...sharedProps} colorFront={palette.accentStrong} colorBack={palette.background} {...devParams} />
    case 'fluted-glass':
      return <LazyFlutedGlass {...sharedProps} colorHighlight={palette.accentStrong} colorShadow={palette.background} {...devParams} />
    case 'water':
      return <LazyWater {...sharedProps} colorHighlight={palette.accentStrong} colorBack={palette.background} {...devParams} />
    case 'liquid-metal':
      return <LazyLiquidMetal {...sharedProps} colorTint={palette.accentStrong} colorBack={palette.background} {...devParams} />
    case 'grain-gradient':
    default:
      return (
        <LazyGrainGradient
          {...sharedProps}
          colorBack={palette.background}
          colors={[palette.accentSoft, palette.accent, palette.accentStrong]}
          softness={0.8}
          intensity={0.4}
          noise={0.3}
          shape="blob"
          speed={0.2}
          {...devParams}
        />
      )
  }
}

export function BackgroundShader() {
  const shaderId = useUIPrefsStore((state) => state.backgroundShader)
  const palette = useThemeShaderColors()
  const devShaderParams = useDevThemeStore((s) => s.shaderParams)
  const devParams = process.env.NODE_ENV === 'development'
    ? (devShaderParams[shaderId] ?? {})
    : {}
  const activeShader = useMemo(
    () => (SHADER_OPTIONS.some((option) => option.id === shaderId) ? shaderId : 'grain-gradient'),
    [shaderId]
  )

  if (activeShader === 'none') return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-70" aria-hidden="true">
      {renderShader(activeShader, palette, devParams)}
    </div>
  )
}
