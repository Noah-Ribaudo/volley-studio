/**
 * Rotation Presets Data Layer
 *
 * Handles loading rotation presets for read-only display.
 * Presets are generated from the built-in whiteboard model.
 */

import type { PresetSystem } from '@/lib/presetTypes'
import type { Rotation, Phase, LayoutExtendedData, PositionCoordinates, RallyPhase } from './types'
import { getWhiteboardPositions } from './whiteboard'
import { RALLY_PHASES, DEFAULT_VISIBLE_PHASES } from './types'
import { DEFAULT_BASE_ORDER } from './rotations'

// Local interface for presets (matches database structure)
export interface RotationPreset {
  id: string
  system: PresetSystem
  rotation: number
  phase: string
  positions: PositionCoordinates
  flags?: LayoutExtendedData | null
  created_at: string | null
  updated_at: string | null
}

export async function loadPresetsForSystem(system: PresetSystem): Promise<RotationPreset[]> {
  const now = new Date().toISOString()
  return generateDefaultPresets(system).map((preset) => ({
    id: `preset-${system}-${preset.rotation}-${preset.phase}`,
    system,
    rotation: preset.rotation,
    phase: preset.phase,
    positions: preset.positions,
    flags: preset.flags,
    created_at: now,
    updated_at: null,
  }))
}

export async function loadPreset(
  system: PresetSystem,
  rotation: Rotation,
  phase: Phase
): Promise<RotationPreset | null> {
  const presets = await loadPresetsForSystem(system)
  const preset = presets.find((entry) => entry.rotation === rotation && entry.phase === phase)

  return preset ?? null
}

/**
 * Generate default preset positions for a system
 * Uses the existing whiteboard position generation logic
 */
export function generateDefaultPresets(system: PresetSystem): Array<{
  rotation: Rotation
  phase: string
  positions: PositionCoordinates
  flags: LayoutExtendedData | null
}> {
  const results: Array<{
    rotation: Rotation
    phase: string
    positions: PositionCoordinates
    flags: LayoutExtendedData | null
  }> = []

  const showLibero = system === '5-1-libero'
  const isReceiving = true // Default context

  // Generate for all visible phases across all rotations
  for (let r = 1; r <= 6; r++) {
    const rotation = r as Rotation

    for (const phase of DEFAULT_VISIBLE_PHASES) {
      const whiteboardResult = getWhiteboardPositions({
        rotation,
        phase,
        isReceiving,
        showBothSides: false,
        baseOrder: DEFAULT_BASE_ORDER,
        showLibero,
      })

      results.push({
        rotation,
        phase,
        positions: whiteboardResult.home,
        flags: null, // No arrows/status by default
      })
    }
  }

  return results
}

/**
 * Get positions for a rotation/phase, falling back to defaults if no preset exists
 * This is the main function used by the whiteboard when no team is selected
 */
export async function getPresetPositions(
  system: PresetSystem,
  rotation: Rotation,
  phase: Phase
): Promise<{ positions: PositionCoordinates; flags: LayoutExtendedData | null }> {
  // Try to load from database first
  const preset = await loadPreset(system, rotation, phase)

  if (preset) {
    return {
      positions: preset.positions,
      flags: preset.flags || null,
    }
  }

  // Fall back to generated defaults
  const showLibero = system === '5-1-libero'
  const isReceiving = true

  // Check if this is a rally phase
  if (RALLY_PHASES.includes(phase as RallyPhase)) {
    const whiteboardResult = getWhiteboardPositions({
      rotation,
      phase: phase as RallyPhase,
      isReceiving,
      showBothSides: false,
      baseOrder: DEFAULT_BASE_ORDER,
      showLibero,
    })

    return {
      positions: whiteboardResult.home,
      flags: null,
    }
  }

  // For non-rally phases, return empty (shouldn't happen in normal use)
  return {
    positions: {} as PositionCoordinates,
    flags: null,
  }
}

/**
 * Sync helper: Convert presets to the format expected by populateFromLayouts
 */
export function presetsToLayoutFormat(presets: RotationPreset[]): Array<{
  id: string
  team_id: string
  rotation: Rotation
  phase: Phase
  positions: PositionCoordinates
  flags: LayoutExtendedData | null
  created_at: string
  updated_at: string | null
}> {
  return presets.map(preset => ({
    id: preset.id,
    team_id: '', // Not associated with a team
    rotation: preset.rotation as Rotation,
    phase: preset.phase as Phase,
    positions: preset.positions,
    flags: preset.flags || null,
    created_at: preset.created_at || new Date().toISOString(),
    updated_at: preset.updated_at,
  }))
}
