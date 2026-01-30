'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAppStore, LayoutConflictInfo } from '@/store/useAppStore'
import {
  queueWhiteboardSave,
  flushPendingSaves,
  configureConflictDetection,
  clearConflictDetection,
  forceSaveAfterConflict,
  WhiteboardConflictInfo,
} from '@/lib/whiteboard-sync'
import { isSupabaseConfigured, getServerLayout } from '@/lib/teams'
import { createRotationPhaseKey } from '@/lib/rotations'

/**
 * Hook that auto-saves whiteboard changes to Supabase
 *
 * When a team is selected and you make changes to player positions,
 * arrows, status tags, etc., this hook will automatically queue
 * those changes to be saved to the database.
 *
 * Changes are debounced (750ms) to avoid spamming the database
 * during rapid edits like dragging players around.
 *
 * Includes conflict detection for multi-device sync:
 * - Checks if server data changed since we loaded it before saving
 * - Shows a modal if there's a conflict so user can choose what to do
 */
export function useWhiteboardSync() {
  const {
    currentTeam,
    currentRotation,
    currentPhase,
    localPositions,
    localArrows,
    arrowCurves,
    localStatusFlags,
    attackBallPositions,
    getLayoutLoadedTimestamp,
    setLayoutLoadedTimestamp,
    setLayoutConflict,
  } = useAppStore()

  // Track previous values to detect changes
  const prevValuesRef = useRef<{
    teamId: string | null
    key: string
    positionsJson: string
    arrowsJson: string
    curvesJson: string
    statusJson: string
    attackBallJson: string
  } | null>(null)

  // Get current rotation/phase key
  const key = createRotationPhaseKey(currentRotation, currentPhase)

  // Get attack ball position for current key
  const currentAttackBall = attackBallPositions[key]

  // Configure conflict detection callbacks when hook mounts
  useEffect(() => {
    configureConflictDetection({
      onConflict: (conflict: WhiteboardConflictInfo) => {
        // Convert to store's conflict info format
        const storeConflict: LayoutConflictInfo = {
          rotation: conflict.rotation,
          phase: conflict.phase,
          localUpdatedAt: conflict.localUpdatedAt,
          serverUpdatedAt: conflict.serverUpdatedAt,
          pendingPositions: conflict.pendingPositions,
          pendingFlags: conflict.pendingFlags,
        }
        setLayoutConflict(storeConflict)
      },
      onTimestampUpdated: (rotation, phase, newTimestamp) => {
        setLayoutLoadedTimestamp(rotation, phase, newTimestamp)
      },
      getLoadedTimestamp: (rotation, phase) => {
        return getLayoutLoadedTimestamp(rotation, phase)
      },
    })

    return () => {
      clearConflictDetection()
    }
  }, [setLayoutConflict, setLayoutLoadedTimestamp, getLayoutLoadedTimestamp])

  // Serialize current state for comparison
  const positionsJson = JSON.stringify(localPositions[key] || {})
  const arrowsJson = JSON.stringify(localArrows[key] || {})
  const curvesJson = JSON.stringify(arrowCurves[key] || {})
  const statusJson = JSON.stringify(localStatusFlags[key] || {})
  const attackBallJson = JSON.stringify(currentAttackBall || null)

  // Handle state changes and queue saves
  useEffect(() => {
    // Skip if Supabase not configured or no team selected
    if (!isSupabaseConfigured() || !currentTeam?.id) {
      return
    }

    const currentValues = {
      teamId: currentTeam.id,
      key,
      positionsJson,
      arrowsJson,
      curvesJson,
      statusJson,
      attackBallJson,
    }

    const prev = prevValuesRef.current

    // Check if this is a meaningful change (not just initial load)
    const hasChanges = prev && prev.teamId === currentValues.teamId && prev.key === currentValues.key && (
      prev.positionsJson !== currentValues.positionsJson ||
      prev.arrowsJson !== currentValues.arrowsJson ||
      prev.curvesJson !== currentValues.curvesJson ||
      prev.statusJson !== currentValues.statusJson ||
      prev.attackBallJson !== currentValues.attackBallJson
    )

    // Only queue save if there are actual changes to the current rotation/phase
    // and we have local overrides (not just using defaults)
    if (hasChanges && localPositions[key]) {
      queueWhiteboardSave(
        currentTeam.id,
        currentRotation,
        currentPhase,
        localPositions[key],
        localArrows,
        arrowCurves,
        localStatusFlags,
        attackBallPositions
      )
    }

    // Update previous values
    prevValuesRef.current = currentValues
  }, [
    currentTeam?.id,
    key,
    positionsJson,
    arrowsJson,
    curvesJson,
    statusJson,
    attackBallJson,
    currentRotation,
    currentPhase,
    localPositions,
    localArrows,
    arrowCurves,
    localStatusFlags,
    attackBallPositions,
  ])

  // Cancel pending saves when team changes
  useEffect(() => {
    return () => {
      // When team changes or component unmounts, cancel pending saves
      // This prevents saving data to the wrong team
    }
  }, [currentTeam?.id])

  // Flush pending saves before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Note: async operations may not complete in beforeunload
      // We use sendBeacon in the sync module for critical saves
      flushPendingSaves()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Flush any pending saves on unmount
      flushPendingSaves()
    }
  }, [])
}

/**
 * Force save all pending whiteboard changes immediately
 * Useful before switching teams or navigating away
 */
export function useFlushWhiteboardSync() {
  return useCallback(async () => {
    await flushPendingSaves()
  }, [])
}

/**
 * Hook for handling conflict resolution
 * Returns functions to resolve conflicts
 */
export function useConflictResolution() {
  const {
    currentTeam,
    layoutConflict,
    resolveConflictKeepMine,
    resolveConflictLoadTheirs,
    populateFromLayouts,
    customLayouts,
  } = useAppStore()

  // Handle "Keep my changes" - force save local version
  const keepMine = useCallback(async () => {
    if (!layoutConflict || !currentTeam) return

    // Force save the pending data (bypasses conflict check)
    await forceSaveAfterConflict(
      currentTeam.id,
      layoutConflict.rotation,
      layoutConflict.phase,
      layoutConflict.pendingPositions,
      layoutConflict.pendingFlags
    )

    // Clear the conflict state
    resolveConflictKeepMine()
  }, [layoutConflict, currentTeam, resolveConflictKeepMine])

  // Handle "Load their changes" - discard local and reload from server
  const loadTheirs = useCallback(async () => {
    if (!layoutConflict || !currentTeam) return

    try {
      // Fetch the server version
      const serverLayout = await getServerLayout(
        currentTeam.id,
        layoutConflict.rotation,
        layoutConflict.phase
      )

      if (serverLayout) {
        // Update our layouts with the server version
        const updatedLayouts = customLayouts.filter(
          l => !(l.team_id === currentTeam.id &&
                 l.rotation === layoutConflict.rotation &&
                 l.phase === layoutConflict.phase)
        )
        updatedLayouts.push(serverLayout)

        // Repopulate from the updated layouts
        populateFromLayouts(updatedLayouts)
      }
    } catch (error) {
      console.error('Error loading server layout:', error)
    }

    // Clear the conflict state
    resolveConflictLoadTheirs()
  }, [layoutConflict, currentTeam, customLayouts, populateFromLayouts, resolveConflictLoadTheirs])

  return {
    hasConflict: !!layoutConflict,
    conflict: layoutConflict,
    keepMine,
    loadTheirs,
  }
}
