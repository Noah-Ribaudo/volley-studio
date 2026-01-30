// Coordinate conversion utilities
// Converts between normalized (0-1) and percentage (0-100) coordinate systems

import type { NormalizedPosition } from './types'

export type PercentagePosition = { x: number; y: number }

/**
 * Convert percentage coordinates (0-100) to normalized coordinates (0-1)
 */
export const toNormalized = (pos: PercentagePosition): NormalizedPosition => ({
  x: pos.x / 100,
  y: pos.y / 100,
})

/**
 * Convert normalized coordinates (0-1) to percentage coordinates (0-100)
 */
export const toPercentage = (pos: NormalizedPosition): PercentagePosition => ({
  x: pos.x * 100,
  y: pos.y * 100,
})

/**
 * Clamp normalized position to valid range [0, 1]
 */
export const clampNormalized = (pos: NormalizedPosition): NormalizedPosition => ({
  x: Math.max(0, Math.min(1, pos.x)),
  y: Math.max(0, Math.min(1, pos.y)),
})

/**
 * Clamp percentage position to valid range [0, 100]
 */
export const clampPercentage = (pos: PercentagePosition): PercentagePosition => ({
  x: Math.max(0, Math.min(100, pos.x)),
  y: Math.max(0, Math.min(100, pos.y)),
})









