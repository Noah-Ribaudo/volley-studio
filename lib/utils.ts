import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts lightness value from an oklch color string
 * @param oklchColor - Color in oklch format (e.g., "oklch(0.7 0.18 70)")
 * @returns Lightness value (0-1) or null if parsing fails
 */
export function getOklchLightness(oklchColor: string): number | null {
  const match = oklchColor.match(/oklch\(([\d.]+)/)
  return match ? parseFloat(match[1]) : null
}

/**
 * Determines appropriate text color (black or white) for an oklch background color
 * @param oklchColor - Color in oklch format
 * @returns "#000" for light colors, "#fff" for dark colors
 */
export function getTextColorForOklch(oklchColor: string): string {
  const lightness = getOklchLightness(oklchColor)
  // Use black text for colors with lightness > 0.7, white for darker colors
  return lightness !== null && lightness > 0.7 ? '#000' : '#fff'
}

/**
 * Adds opacity to an oklch color
 * @param oklchColor - Color in oklch format (e.g., "oklch(0.7 0.18 70)")
 * @param opacity - Opacity value between 0 and 1 (e.g., 0.2 for 20% opacity)
 * @returns oklch color with alpha channel (e.g., "oklch(0.7 0.18 70 / 0.2)")
 */
export function addOklchOpacity(oklchColor: string, opacity: number): string {
  // Remove existing alpha if present
  const withoutAlpha = oklchColor.replace(/\s*\/\s*[\d.]+\)$/, ')')
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
  const lightness = getOklchLightness(oklchColor)
  if (lightness === null) return oklchColor

  const newLightness = Math.max(0, lightness * factor)
  return oklchColor.replace(/oklch\([\d.]+/, `oklch(${newLightness.toFixed(3)}`)
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
