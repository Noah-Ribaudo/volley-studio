// Court geometry definitions
// Loaded from canonical JSON at build time

import type { CourtGeometry } from './types'

// Default court geometry from canonical model
// This will be loaded from court.json, but we provide a default structure
export const DEFAULT_COURT: CourtGeometry = {
  width: 1.0,
  depth: 1.0,
  net_y: 0.0,
  zones: {
    Z1: {
      x: [0.66, 1.0],
      y: [0.5, 1.0],
    },
    Z2: {
      x: [0.66, 1.0],
      y: [0.0, 0.5],
    },
    Z3: {
      x: [0.33, 0.66],
      y: [0.0, 0.5],
    },
    Z4: {
      x: [0.0, 0.33],
      y: [0.0, 0.5],
    },
    Z5: {
      x: [0.0, 0.33],
      y: [0.5, 1.0],
    },
    Z6: {
      x: [0.33, 0.66],
      y: [0.5, 1.0],
    },
  },
}

/**
 * Get the zone that contains a given normalized position
 */
export const getZoneForPosition = (
  pos: { x: number; y: number },
  court: CourtGeometry = DEFAULT_COURT
): string | null => {
  for (const [zone, bounds] of Object.entries(court.zones)) {
    const [xMin, xMax] = bounds.x
    const [yMin, yMax] = bounds.y
    if (pos.x >= xMin && pos.x <= xMax && pos.y >= yMin && pos.y <= yMax) {
      return zone
    }
  }
  return null
}

/**
 * Check if a position is within court bounds
 */
export const isWithinCourtBounds = (
  pos: { x: number; y: number },
  court: CourtGeometry = DEFAULT_COURT
): boolean => {
  return pos.x >= 0 && pos.x <= court.width && pos.y >= 0 && pos.y <= court.depth
}









