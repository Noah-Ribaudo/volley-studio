import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Resolves a color string that might be a CSS variable reference.
 * If the string is "var(--foo)", reads the computed value from :root.
 * Otherwise returns the string as-is.
 */
function resolveColor(color: string): string {
  if (typeof window === 'undefined') return color
  const varMatch = color.match(/^var\((--[^)]+)\)$/)
  if (!varMatch) return color
  return getComputedStyle(document.documentElement).getPropertyValue(varMatch[1]).trim()
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

function parseOklch(color: string): { l: number; c: number; h: number } | null {
  const match = color.match(/oklch\(([^)]+)\)/)
  if (!match) return null
  const [lchPart] = match[1].split('/')
  const parts = lchPart.trim().split(/\s+/)
  if (parts.length < 3) return null

  let l = parseFloat(parts[0] ?? '')
  const c = parseFloat(parts[1] ?? '')
  const h = parseFloat(parts[2] ?? '')
  if (Number.isNaN(l) || Number.isNaN(c) || Number.isNaN(h)) return null

  if (parts[0]?.includes('%')) {
    l /= 100
  }

  return { l, c, h }
}

function oklchToSrgb(color: string): [number, number, number] | null {
  const parsed = parseOklch(color)
  if (!parsed) return null
  const { l, c, h } = parsed
  const hRad = (h * Math.PI) / 180
  const a = c * Math.cos(hRad)
  const b = c * Math.sin(hRad)

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.291485548 * b

  const l3 = l_ ** 3
  const m3 = m_ ** 3
  const s3 = s_ ** 3

  const linearR = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3
  const linearG = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3
  const linearB = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3

  const toSrgb = (value: number) =>
    value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055

  return [
    clamp01(toSrgb(linearR)),
    clamp01(toSrgb(linearG)),
    clamp01(toSrgb(linearB)),
  ]
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLinear = (value: number) =>
    value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)

  const R = toLinear(r)
  const G = toLinear(g)
  const B = toLinear(b)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

function getContrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const bright = Math.max(l1, l2)
  const dark = Math.min(l1, l2)
  return (bright + 0.05) / (dark + 0.05)
}

/**
 * Extracts lightness value from an oklch color string
 * Handles both direct oklch values and CSS variable references
 * @returns Lightness value (0-1) or null if parsing fails
 */
export function getOklchLightness(oklchColor: string): number | null {
  const resolved = resolveColor(oklchColor)
  // Handle both "oklch(0.7 0.18 70)" and "oklch(70% 0.18 70)" formats
  const match = resolved.match(/oklch\(([\d.]+)(%?)/)
  if (!match) return null
  const value = parseFloat(match[1])
  return match[2] === '%' ? value / 100 : value
}

/**
 * Determines appropriate text color (black or white) for an oklch background color
 * @returns "#000" for light colors, "#fff" for dark colors
 */
export function getTextColorForOklch(oklchColor: string): string {
  const resolved = resolveColor(oklchColor)
  const rgb = oklchToSrgb(resolved)
  if (!rgb) {
    const lightness = getOklchLightness(oklchColor)
    return lightness !== null && lightness > 0.7 ? '#000' : '#fff'
  }

  const whiteContrast = getContrastRatio(rgb, [1, 1, 1])
  const blackContrast = getContrastRatio(rgb, [0, 0, 0])
  return blackContrast >= whiteContrast ? '#000' : '#fff'
}

/**
 * Adds opacity to an oklch color
 * Resolves CSS variable references before manipulation
 */
export function addOklchOpacity(oklchColor: string, opacity: number): string {
  const resolved = resolveColor(oklchColor)
  // Remove existing alpha if present
  const withoutAlpha = resolved.replace(/\s*\/\s*[\d.]+\)$/, ')')
  // Add new alpha
  return withoutAlpha.replace(')', ` / ${opacity})`)
}

/**
 * Darkens an oklch color by reducing its lightness
 * @param oklchColor - Color in oklch format
 * @param factor - Factor to multiply lightness by (e.g., 0.7 to reduce lightness by 30%)
 * @returns Darkened oklch color string
 */
export function darkenOklch(oklchColor: string, factor: number = 0.7): string {
  const resolved = resolveColor(oklchColor)
  const lightness = getOklchLightness(resolved)
  if (lightness === null) return resolved

  const newLightness = Math.max(0, lightness * factor)
  return resolved.replace(/oklch\([\d.]+%?/, `oklch(${newLightness.toFixed(3)}`)
}

/**
 * Creates a debounced function that delays invoking the provided function
 * until after `wait` milliseconds have elapsed since the last invocation.
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, wait)
  }
}

/**
 * Generate a UUID v4 string
 * Uses crypto.randomUUID when available, falls back to manual generation
 */
export function generateUUID(): string {
  // Try native crypto.randomUUID first (available in modern browsers and Node 19+)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // Fallback: generate a UUID v4 manually
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
