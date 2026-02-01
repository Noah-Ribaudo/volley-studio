'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAdminStore } from '@/store/useAdminStore'
import { useAppStore } from '@/store/useAppStore'
import {
  loadPresetsForSystem,
  savePreset,
  presetsToLayoutFormat,
  RotationPreset,
} from '@/lib/presets'
import type { PresetSystem } from '@/lib/presetTypes'
import type { Rotation, Phase, LayoutExtendedData, PositionCoordinates } from '@/lib/types'
import { createRotationPhaseKey } from '@/lib/rotations'
import { debounce } from '@/lib/utils'

/**
 * Hook to manage rotation presets for admin mode
 *
 * Handles:
 * - Loading presets from database when admin mode is activated
 * - Populating the whiteboard with preset data
 * - Saving changes back to presets when in admin mode
 */
export function usePresets() {
  const { isAdminMode, selectedSystem, setHasUnsavedChanges } = useAdminStore()
  const {
    currentTeam,
    populateFromLayouts,
    localPositions,
    localArrows,
    arrowCurves,
    localStatusFlags,
    attackBallPositions,
    currentRotation,
    currentPhase,
    clearLocalChanges,
  } = useAppStore()

  const [presets, setPresets] = useState<RotationPreset[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastLoadedSystem, setLastLoadedSystem] = useState<PresetSystem | null>(null)

  // Track if we've initialized presets for the current system
  const initializedRef = useRef<PresetSystem | null>(null)

  // Load presets when admin mode is activated or system changes
  useEffect(() => {
    if (!isAdminMode) {
      // Clear when exiting admin mode
      if (initializedRef.current !== null) {
        initializedRef.current = null
        setPresets([])
        setLastLoadedSystem(null)
      }
      return
    }

    // Don't load if no system selected
    if (!selectedSystem) {
      return
    }

    // Don't reload if we already loaded this system
    if (lastLoadedSystem === selectedSystem) {
      return
    }

    const loadPresets = async () => {
      setIsLoading(true)
      try {
        const loaded = await loadPresetsForSystem(selectedSystem)
        setPresets(loaded)
        setLastLoadedSystem(selectedSystem)
        initializedRef.current = selectedSystem

        // Populate whiteboard with preset data
        if (loaded.length > 0 && !currentTeam) {
          const layoutFormat = presetsToLayoutFormat(loaded)
          populateFromLayouts(layoutFormat)
        } else if (!currentTeam) {
          // No presets in DB, clear local changes to show defaults
          clearLocalChanges()
        }
      } catch (error) {
        console.error('Failed to load presets:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPresets()
  }, [isAdminMode, selectedSystem, lastLoadedSystem, currentTeam, populateFromLayouts, clearLocalChanges])

  // Debounced save function
  const debouncedSave = useRef(
    debounce(async (
      system: PresetSystem,
      rotation: Rotation,
      phase: Phase,
      positions: PositionCoordinates,
      flags: LayoutExtendedData | null
    ) => {
      const result = await savePreset(system, rotation, phase, positions, flags)
      if (result.success) {
        setHasUnsavedChanges(false)
      }
    }, 1000)
  ).current

  // Save current layout as preset when admin makes changes
  const saveCurrentAsPreset = useCallback(async () => {
    if (!isAdminMode || currentTeam || !selectedSystem) return

    const key = createRotationPhaseKey(currentRotation, currentPhase)
    const positions = localPositions[key]

    if (!positions) return

    const flags: LayoutExtendedData = {}

    const arrows = localArrows[key]
    if (arrows && Object.keys(arrows).length > 0) {
      flags.arrows = arrows
    }

    const curves = arrowCurves[key]
    if (curves && Object.keys(curves).length > 0) {
      flags.arrowCurves = curves
    }

    const status = localStatusFlags[key]
    if (status && Object.keys(status).length > 0) {
      flags.statusFlags = status
    }

    const attackBall = attackBallPositions[key]
    if (attackBall) {
      flags.attackBallPosition = attackBall
    }

    setHasUnsavedChanges(true)
    debouncedSave(
      selectedSystem,
      currentRotation,
      currentPhase,
      positions,
      Object.keys(flags).length > 0 ? flags : null
    )
  }, [
    isAdminMode,
    currentTeam,
    selectedSystem,
    currentRotation,
    currentPhase,
    localPositions,
    localArrows,
    arrowCurves,
    localStatusFlags,
    attackBallPositions,
    setHasUnsavedChanges,
    debouncedSave,
  ])

  return {
    presets,
    isLoading,
    isAdminMode,
    selectedSystem,
    saveCurrentAsPreset,
  }
}
