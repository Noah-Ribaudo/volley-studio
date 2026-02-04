/**
 * Rotation Presets Data Layer
 *
 * Handles loading rotation presets for read-only display.
 * Falls back to code-based defaults when database is empty.
 *
 * Note: Supabase has been removed from this project, so these functions
 * will always return defaults until presets are migrated to Convex.
 */

import { supabase, isSupabaseConfigured } from './supabase'
import type { PresetSystem } from '@/lib/presetTypes'
import type { Rotation, Phase, LayoutExtendedData, PositionCoordinates, CustomLayout, RallyPhase } from './types'
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

/**
 * Load all presets for a specific system from the database
 */
export async function loadPresetsForSystem(system: PresetSystem): Promise<RotationPreset[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return []
  }

  const { data, error } = await (supabase as any)
    .from('rotation_presets')
    .select('*')
    .eq('system', system)

  if (error) {
    console.error('Failed to load presets:', error)
    return []
  }

  return (data || []).map((row: any) => ({
    ...row,
    positions: row.positions as unknown as PositionCoordinates,
    flags: row.flags as LayoutExtendedData | null,
  }))
}

/**
 * Load a specific preset by system, rotation, and phase
 */
export async function loadPreset(
  system: PresetSystem,
  rotation: Rotation,
  phase: Phase
): Promise<RotationPreset | null> {
  if (!isSupabaseConfigured() || !supabase) {
    return null
  }

  const { data, error } = await (supabase as any)
    .from('rotation_presets')
    .select('*')
    .eq('system', system)
    .eq('rotation', rotation)
    .eq('phase', phase)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') { // Not found is OK
      console.error('Failed to load preset:', error)
    }
    return null
  }

  return {
    ...data,
    positions: data.positions as unknown as PositionCoordinates,
    flags: data.flags as LayoutExtendedData | null,
  }
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
