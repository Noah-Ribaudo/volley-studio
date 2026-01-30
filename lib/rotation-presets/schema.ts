/**
 * Rotation Preset Data Schema
 *
 * This defines the structure for storing volleyball rotation preset data
 * extracted from coaching reference PDFs. These presets provide default
 * player positions and movement arrows for each rotation/phase combination.
 */

import { Position, Role } from '@/lib/types'

/**
 * The five phases shown in the rotation guide diagrams
 */
export type PresetPhase =
  | 'home'              // Starting position (referees check)
  | 'serve'             // When your team serves
  | 'serveReceivePrimary'   // Default serve receive formation
  | 'serveReceiveAlternate' // Alternate serve receive formation
  | 'base'              // Defensive position (ball on opponent side)

/**
 * Libero configuration options
 */
export type LiberoOption =
  | 'none'        // No libero (all 6 players)
  | 'middleBack'  // Libero plays middle back (zone 6)
  | 'leftBack'    // Libero plays left back (zone 5)

/**
 * Rotation system type
 */
export type RotationSystem = '5-1' | '6-2'

/**
 * Positions for a single phase
 * All coordinates are normalized (0-1)
 * x: 0 = left sideline, 1 = right sideline
 * y: 0.5 = net, 1.0 = home baseline
 */
export interface PhasePositions {
  S: Position       // Setter (S1 in 6-2)
  S2?: Position     // Second setter (6-2 only)
  OH1: Position     // Outside Hitter 1
  OH2: Position     // Outside Hitter 2
  MB1: Position     // Middle Blocker 1
  MB2: Position     // Middle Blocker 2
  RS: Position      // Right Side / Opposite (RS1 in 6-2)
  RS2?: Position    // Second right side (6-2 only, or none)
  L?: Position      // Libero (when libero option is not 'none')
}

/**
 * Arrow destinations showing where players move after the phase
 * (from current position to this destination)
 */
export interface PhaseArrows {
  S?: Position | null
  S2?: Position | null
  OH1?: Position | null
  OH2?: Position | null
  MB1?: Position | null
  MB2?: Position | null
  RS?: Position | null
  RS2?: Position | null
  L?: Position | null
}

/**
 * Status tags for player roles in each phase
 * Maps role to their current function (passer, block, quick, etc.)
 */
export interface PhaseStatusTags {
  S?: 'passer' | 'quick' | 'swing' | 'pipe' | 'here1' | 'block' | 'tips'
  S2?: 'passer' | 'quick' | 'swing' | 'pipe' | 'here1' | 'block' | 'tips'
  OH1?: 'passer' | 'quick' | 'swing' | 'pipe' | 'here1' | 'block' | 'tips'
  OH2?: 'passer' | 'quick' | 'swing' | 'pipe' | 'here1' | 'block' | 'tips'
  MB1?: 'passer' | 'quick' | 'swing' | 'pipe' | 'here1' | 'block' | 'tips'
  MB2?: 'passer' | 'quick' | 'swing' | 'pipe' | 'here1' | 'block' | 'tips'
  RS?: 'passer' | 'quick' | 'swing' | 'pipe' | 'here1' | 'block' | 'tips'
  RS2?: 'passer' | 'quick' | 'swing' | 'pipe' | 'here1' | 'block' | 'tips'
  L?: 'passer' | 'quick' | 'swing' | 'pipe' | 'here1' | 'block' | 'tips'
}

/**
 * Complete data for a single rotation/phase combination
 */
export interface PhasePreset {
  positions: PhasePositions
  arrows?: PhaseArrows       // Movement arrows (optional for 'base' phase)
  statusTags?: PhaseStatusTags  // Player role tags (passer, block, quick, etc.)
}

/**
 * All phases for a single rotation number
 */
export interface RotationPreset {
  rotation: 1 | 2 | 3 | 4 | 5 | 6
  home: PhasePreset
  serve: PhasePreset
  serveReceivePrimary: PhasePreset
  serveReceiveAlternate: PhasePreset
  base: PhasePreset
}

/**
 * Complete preset data for one rotation system + libero option
 */
export interface RotationSystemPreset {
  system: RotationSystem
  liberoOption: LiberoOption
  rotations: RotationPreset[]  // Array of 6 rotations
}

/**
 * All presets organized by system and libero option
 */
export interface AllRotationPresets {
  '5-1': {
    none: RotationSystemPreset
    middleBack: RotationSystemPreset
    leftBack: RotationSystemPreset
  }
  '6-2': {
    none: RotationSystemPreset
    middleBack: RotationSystemPreset
    leftBack: RotationSystemPreset
  }
}

/**
 * Court zone center coordinates for reference
 * These are the "ideal" positions at zone centers
 */
export const ZONE_CENTERS: Record<1 | 2 | 3 | 4 | 5 | 6, Position> = {
  // Front row (closer to net, y ~ 0.58)
  4: { x: 0.167, y: 0.583 },  // Front left
  3: { x: 0.500, y: 0.583 },  // Front center
  2: { x: 0.833, y: 0.583 },  // Front right

  // Back row (closer to baseline, y ~ 0.83)
  5: { x: 0.167, y: 0.833 },  // Back left
  6: { x: 0.500, y: 0.833 },  // Back center
  1: { x: 0.833, y: 0.833 },  // Back right
}

/**
 * Helper to create a position from zone + offset
 */
export function positionFromZone(
  zone: 1 | 2 | 3 | 4 | 5 | 6,
  offsetX: number = 0,
  offsetY: number = 0
): Position {
  const base = ZONE_CENTERS[zone]
  return {
    x: Math.max(0, Math.min(1, base.x + offsetX)),
    y: Math.max(0, Math.min(1, base.y + offsetY)),
  }
}
