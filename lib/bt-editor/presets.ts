import type { BTNode } from '@/lib/sim/bt'
import type { PlayerRole } from '@/store/useBTEditorStore'
import {
  createSetterTree,
  createOutsideTree,
  createOppositeTree,
  createMiddleTree,
  createLiberoTree,
} from '@/lib/sim/ai/trees'

// ============================================================================
// Preset Types
// ============================================================================

export type PresetId = string

export interface TreePreset {
  /** Unique identifier for this preset */
  id: PresetId
  /** Display name for the UI */
  name: string
  /** Short description of what makes this preset different */
  description: string
  /** The role this preset applies to */
  role: PlayerRole
  /** Factory function to create the tree */
  createTree: () => BTNode
}

export interface PresetCollection {
  /** The role these presets apply to */
  role: PlayerRole
  /** Available presets for this role */
  presets: TreePreset[]
  /** Which preset to use by default */
  defaultPresetId: PresetId
}

// ============================================================================
// Preset Definitions
// ============================================================================

export const setterPresets: PresetCollection = {
  role: 'setter',
  presets: [
    {
      id: 'setter-standard',
      name: 'Standard Setter',
      description: 'Balanced play calling with priority on pin hitters',
      role: 'setter',
      createTree: createSetterTree,
    },
    // Future presets will be added here:
    // {
    //   id: 'setter-aggressive',
    //   name: 'Aggressive Setter',
    //   description: 'Favors quick attacks and dumps when front row',
    //   role: 'setter',
    //   createTree: createAggressiveSetterTree,
    // },
  ],
  defaultPresetId: 'setter-standard',
}

export const outsidePresets: PresetCollection = {
  role: 'outside',
  presets: [
    {
      id: 'outside-standard',
      name: 'Standard Outside',
      description: 'Balanced approach and defense',
      role: 'outside',
      createTree: () => createOutsideTree({ side: 'left' }),
    },
  ],
  defaultPresetId: 'outside-standard',
}

export const oppositePresets: PresetCollection = {
  role: 'opposite',
  presets: [
    {
      id: 'opposite-standard',
      name: 'Standard Opposite',
      description: 'Right-side attack focus',
      role: 'opposite',
      createTree: createOppositeTree,
    },
  ],
  defaultPresetId: 'opposite-standard',
}

export const middlePresets: PresetCollection = {
  role: 'middle',
  presets: [
    {
      id: 'middle-standard',
      name: 'Standard Middle',
      description: 'Quick attacks and blocking',
      role: 'middle',
      createTree: createMiddleTree,
    },
  ],
  defaultPresetId: 'middle-standard',
}

export const liberoPresets: PresetCollection = {
  role: 'libero',
  presets: [
    {
      id: 'libero-standard',
      name: 'Standard Libero',
      description: 'Defensive specialist',
      role: 'libero',
      createTree: createLiberoTree,
    },
  ],
  defaultPresetId: 'libero-standard',
}

// All preset collections
export const allPresetCollections: PresetCollection[] = [
  setterPresets,
  outsidePresets,
  oppositePresets,
  middlePresets,
  liberoPresets,
]

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get presets for a specific role
 */
export function getPresetsForRole(role: PlayerRole): TreePreset[] {
  const collection = allPresetCollections.find((c) => c.role === role)
  return collection?.presets ?? []
}

/**
 * Get the default preset ID for a role
 */
export function getDefaultPresetId(role: PlayerRole): PresetId {
  const collection = allPresetCollections.find((c) => c.role === role)
  return collection?.defaultPresetId ?? `${role}-standard`
}

/**
 * Get a specific preset by ID
 */
export function getPresetById(presetId: PresetId): TreePreset | undefined {
  for (const collection of allPresetCollections) {
    const preset = collection.presets.find((p) => p.id === presetId)
    if (preset) return preset
  }
  return undefined
}

/**
 * Create a tree from a preset ID
 */
export function createTreeFromPreset(presetId: PresetId): BTNode | undefined {
  const preset = getPresetById(presetId)
  return preset?.createTree()
}
