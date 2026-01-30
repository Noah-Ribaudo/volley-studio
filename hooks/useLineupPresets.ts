'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import {
  loadPresetsForSystem,
  presetsToLayoutFormat,
  RotationPreset,
} from '@/lib/presets'
import type { PresetSystem } from '@/lib/database.types'
import type { PositionSource, Rotation, Phase, PositionCoordinates, LayoutExtendedData, CustomLayout } from '@/lib/types'
import { createRotationPhaseKey } from '@/lib/rotations'

interface PresetCache {
  [system: string]: RotationPreset[]
}

/**
 * Hook to manage rotation presets for per-lineup position sources
 *
 * Unlike usePresets (admin mode), this hook:
 * - Loads presets only when a lineup uses a preset source
 * - Caches presets to avoid re-fetching
 * - Provides read-only position data for preset sources
 */
export function useLineupPresets() {
  const { currentTeam } = useAppStore()

  const [presetCache, setPresetCache] = useState<PresetCache>({})
  const [loadingSystem, setLoadingSystem] = useState<PresetSystem | null>(null)
  const loadingRef = useRef<Set<string>>(new Set())

  // Get the active lineup's position source
  const activeLineup = currentTeam?.lineups.find(l => l.id === currentTeam.active_lineup_id)
  const activePositionSource: PositionSource = activeLineup?.position_source || 'custom'

  // Determine if we're using a preset source
  const isUsingPreset = activePositionSource !== 'custom'
  const presetSystem = isUsingPreset ? activePositionSource as PresetSystem : null

  // Load presets for a system if not already cached
  const loadPresets = useCallback(async (system: PresetSystem) => {
    // Check if already cached
    if (presetCache[system]) {
      return presetCache[system]
    }

    // Check if already loading
    if (loadingRef.current.has(system)) {
      return []
    }

    loadingRef.current.add(system)
    setLoadingSystem(system)

    try {
      const loaded = await loadPresetsForSystem(system)
      setPresetCache(prev => ({
        ...prev,
        [system]: loaded,
      }))
      return loaded
    } catch (error) {
      console.error('Failed to load presets for system:', system, error)
      return []
    } finally {
      loadingRef.current.delete(system)
      setLoadingSystem(null)
    }
  }, [presetCache])

  // Auto-load presets when the active lineup uses a preset source
  useEffect(() => {
    if (presetSystem && !presetCache[presetSystem]) {
      loadPresets(presetSystem)
    }
  }, [presetSystem, presetCache, loadPresets])

  // Get positions for a specific rotation/phase from the preset cache
  const getPresetPositions = useCallback((
    system: PresetSystem,
    rotation: Rotation,
    phase: Phase
  ): { positions: PositionCoordinates | null; flags: LayoutExtendedData | null } => {
    const presets = presetCache[system]
    if (!presets) {
      return { positions: null, flags: null }
    }

    const preset = presets.find(
      p => p.rotation === rotation && p.phase === phase
    )

    if (!preset) {
      return { positions: null, flags: null }
    }

    return {
      positions: preset.positions,
      flags: preset.flags || null,
    }
  }, [presetCache])

  // Convert presets to CustomLayout format for use in getCurrentPositions
  const getPresetLayouts = useCallback((system: PresetSystem): CustomLayout[] => {
    const presets = presetCache[system]
    if (!presets) {
      return []
    }

    return presetsToLayoutFormat(presets)
  }, [presetCache])

  // Check if a specific system is loaded
  const isSystemLoaded = useCallback((system: PresetSystem): boolean => {
    return Boolean(presetCache[system])
  }, [presetCache])

  return {
    activePositionSource,
    isUsingPreset,
    presetSystem,
    isLoading: loadingSystem !== null,
    loadingSystem,
    loadPresets,
    getPresetPositions,
    getPresetLayouts,
    isSystemLoaded,
    presetCache,
  }
}
