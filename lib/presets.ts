/**
 * Rotation Presets Data Layer
 *
 * Handles loading and saving admin-managed rotation presets from Supabase.
 * Falls back to code-based defaults when database is empty.
 */

import { supabase, isSupabaseConfigured } from './supabase'
import type { PresetSystem } from './database.types'
import type { Rotation, Phase, LayoutExtendedData, PositionCoordinates, CustomLayout } from './types'
import { getWhiteboardPositions } from './sim/whiteboard'
import type { RallyPhase } from './sim/types'
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

  // Note: rotation_presets table needs to be created via migration
  // Using type assertion since table types are generated from DB schema
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

  // Note: rotation_presets table needs to be created via migration
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
 * Save or update a preset
 */
export async function savePreset(
  system: PresetSystem,
  rotation: Rotation,
  phase: Phase,
  positions: PositionCoordinates,
  flags?: LayoutExtendedData | null
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  // Note: rotation_presets table needs to be created via migration
  // Using type assertion since table types are generated from DB schema
  const { error } = await (supabase as any)
    .from('rotation_presets')
    .upsert(
      {
        system,
        rotation,
        phase,
        positions: positions as unknown as Record<string, unknown>,
        flags: flags as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'system,rotation,phase',
      }
    )

  if (error) {
    console.error('Failed to save preset:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Delete a preset
 */
export async function deletePreset(
  system: PresetSystem,
  rotation: Rotation,
  phase: Phase
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  // Note: rotation_presets table needs to be created via migration
  const { error } = await (supabase as any)
    .from('rotation_presets')
    .delete()
    .eq('system', system)
    .eq('rotation', rotation)
    .eq('phase', phase)

  if (error) {
    console.error('Failed to delete preset:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Copy all presets from a system to a team's custom layouts
 * Used when creating a new team from a preset system
 */
export async function copyPresetsToTeam(
  system: PresetSystem,
  teamId: string
): Promise<{ success: boolean; error?: string; layoutsCreated: number }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Supabase not configured', layoutsCreated: 0 }
  }

  // Load all presets for the system
  const presets = await loadPresetsForSystem(system)

  if (presets.length === 0) {
    // No presets in DB, generate defaults and copy those
    const defaults = generateDefaultPresets(system)
    for (const preset of defaults) {
      const { error } = await supabase
        .from('custom_layouts')
        .insert({
          team_id: teamId,
          rotation: preset.rotation,
          phase: preset.phase,
          positions: preset.positions as unknown as Record<string, unknown>,
          flags: preset.flags as unknown as Record<string, unknown> | null,
        } as any)

      if (error) {
        console.error('Failed to create layout from default:', error)
      }
    }
    return { success: true, layoutsCreated: defaults.length }
  }

  // Copy each preset to the team's custom layouts
  let layoutsCreated = 0
  for (const preset of presets) {
    const { error } = await supabase
      .from('custom_layouts')
      .insert({
        team_id: teamId,
        rotation: preset.rotation,
        phase: preset.phase,
        positions: preset.positions as unknown as Record<string, unknown>,
        flags: preset.flags as unknown as Record<string, unknown> | null,
      } as any)

    if (error) {
      console.error('Failed to create layout from preset:', error)
    } else {
      layoutsCreated++
    }
  }

  return { success: true, layoutsCreated }
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
