'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useAppStore } from '@/store/useAppStore'
import { createRotationPhaseKey } from '@/lib/rotations'
import { Role, ArrowCurveConfig, PlayerStatus, Position, ArrowPositions, LayoutExtendedData, TokenTag } from '@/lib/types'
import type { Id } from '@/convex/_generated/dataModel'

// Debounce delay in milliseconds
const DEBOUNCE_MS = 750

// Pending save data for a single rotation/phase
interface PendingSave {
  teamId: Id<"teams">
  rotation: number
  phase: string
  positions: Record<string, { x: number; y: number }>
  flags: LayoutExtendedData
  timeoutId: ReturnType<typeof setTimeout> | null
}

// Track pending saves by rotation/phase key
const pendingSaves = new Map<string, PendingSave>()

/**
 * Hook that auto-saves whiteboard changes to Convex
 *
 * When a team is selected and you make changes to player positions,
 * arrows, status tags, etc., this hook will automatically queue
 * those changes to be saved to the database.
 *
 * Changes are debounced (750ms) to avoid spamming the database
 * during rapid edits like dragging players around.
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
    localTagFlags,
    attackBallPositions,
  } = useAppStore()

  const saveLayout = useMutation(api.layouts.save)

  // Track previous values to detect changes
  const prevValuesRef = useRef<{
    teamId: string | null
    key: string
    positionsJson: string
    arrowsJson: string
    curvesJson: string
    statusJson: string
    tagsJson: string
    attackBallJson: string
  } | null>(null)

  // Get current rotation/phase key
  const key = createRotationPhaseKey(currentRotation, currentPhase)

  // Get attack ball position for current key
  const currentAttackBall = attackBallPositions[key]

  // Serialize current state for comparison
  const positionsJson = JSON.stringify(localPositions[key] || {})
  const arrowsJson = JSON.stringify(localArrows[key] || {})
  const curvesJson = JSON.stringify(arrowCurves[key] || {})
  const statusJson = JSON.stringify(localStatusFlags[key] || {})
  const tagsJson = JSON.stringify(localTagFlags[key] || {})
  const attackBallJson = JSON.stringify(currentAttackBall || null)

  // Execute save function
  const executeSave = useCallback(async (pending: PendingSave) => {
    try {
      // Convert flags to the format Convex expects
      const convexFlags: {
        arrows?: Record<string, { x: number; y: number } | null>
        arrowFlips?: Record<string, boolean>
        arrowCurves?: Record<string, { x: number; y: number }>
        statusFlags?: Record<string, string[]>
        tagFlags?: Record<string, string[]>
        attackBallPosition?: { x: number; y: number } | null
      } = {}

      if (pending.flags.arrows && Object.keys(pending.flags.arrows).length > 0) {
        convexFlags.arrows = pending.flags.arrows as Record<string, { x: number; y: number } | null>
      }
      if (pending.flags.arrowFlips && Object.keys(pending.flags.arrowFlips).length > 0) {
        convexFlags.arrowFlips = pending.flags.arrowFlips as Record<string, boolean>
      }
      if (pending.flags.arrowCurves && Object.keys(pending.flags.arrowCurves).length > 0) {
        convexFlags.arrowCurves = pending.flags.arrowCurves as Record<string, { x: number; y: number }>
      }
      if (pending.flags.statusFlags && Object.keys(pending.flags.statusFlags).length > 0) {
        convexFlags.statusFlags = pending.flags.statusFlags as Record<string, string[]>
      }
      if (pending.flags.tagFlags && Object.keys(pending.flags.tagFlags).length > 0) {
        convexFlags.tagFlags = pending.flags.tagFlags as Record<string, string[]>
      }
      if (pending.flags.attackBallPosition !== undefined) {
        convexFlags.attackBallPosition = pending.flags.attackBallPosition
      }

      await saveLayout({
        teamId: pending.teamId,
        rotation: pending.rotation,
        phase: pending.phase,
        positions: pending.positions,
        flags: Object.keys(convexFlags).length > 0 ? convexFlags : undefined,
      })
    } catch (error) {
      console.error('Error saving layout to Convex:', error)
    }
  }, [saveLayout])

  // Handle state changes and queue saves
  useEffect(() => {
    // Skip if no team selected or team doesn't have a Convex ID
    if (!currentTeam?._id) {
      return
    }

    const currentValues = {
      teamId: currentTeam._id,
      key,
      positionsJson,
      arrowsJson,
      curvesJson,
      statusJson,
      tagsJson,
      attackBallJson,
    }

    const prev = prevValuesRef.current

    // Check if this is a meaningful change (not just initial load)
    const hasChanges = prev && prev.teamId === currentValues.teamId && prev.key === currentValues.key && (
      prev.positionsJson !== currentValues.positionsJson ||
      prev.arrowsJson !== currentValues.arrowsJson ||
      prev.curvesJson !== currentValues.curvesJson ||
      prev.statusJson !== currentValues.statusJson ||
      prev.tagsJson !== currentValues.tagsJson ||
      prev.attackBallJson !== currentValues.attackBallJson
    )

    // Only queue save if there are actual changes to the current rotation/phase
    // and we have local overrides (not just using defaults)
    if (hasChanges && localPositions[key]) {
      // Cancel any existing pending save for this key
      const existing = pendingSaves.get(key)
      if (existing?.timeoutId) {
        clearTimeout(existing.timeoutId)
      }

      // Build the extended data for this specific rotation/phase
      const flags: LayoutExtendedData = {}

      // Extract arrows for this rotation/phase
      const arrows = localArrows[key]
      if (arrows && Object.keys(arrows).length > 0) {
        flags.arrows = arrows
      }

      // Extract arrow curves for this rotation/phase
      const curves = arrowCurves[key]
      if (curves && Object.keys(curves).length > 0) {
        flags.arrowCurves = curves
      }

      // Extract status flags for this rotation/phase
      const status = localStatusFlags[key]
      if (status && Object.keys(status).length > 0) {
        flags.statusFlags = status
      }

      // Extract tag flags for this rotation/phase
      const tags = localTagFlags[key]
      if (tags && Object.keys(tags).length > 0) {
        flags.tagFlags = tags
      }

      // Extract attack ball position for this rotation/phase
      const attackBall = attackBallPositions[key]
      if (attackBall) {
        flags.attackBallPosition = attackBall
      }

      // Create new pending save
      // Convert PositionCoordinates to Record<string, {x, y}> for Convex
      const positionsRecord: Record<string, { x: number; y: number }> = {}
      const posData = localPositions[key]
      for (const [role, pos] of Object.entries(posData)) {
        if (pos) {
          positionsRecord[role] = { x: pos.x, y: pos.y }
        }
      }

      const pending: PendingSave = {
        teamId: currentTeam._id as Id<"teams">,
        rotation: currentRotation,
        phase: currentPhase,
        positions: positionsRecord,
        flags,
        timeoutId: null,
      }

      // Set up debounced execution
      pending.timeoutId = setTimeout(async () => {
        pendingSaves.delete(key)
        await executeSave(pending)
      }, DEBOUNCE_MS)

      pendingSaves.set(key, pending)
    }

    // Update previous values
    prevValuesRef.current = currentValues
  }, [
    currentTeam?._id,
    key,
    positionsJson,
    arrowsJson,
    curvesJson,
    statusJson,
    tagsJson,
    attackBallJson,
    currentRotation,
    currentPhase,
    localPositions,
    localArrows,
    arrowCurves,
    localStatusFlags,
    attackBallPositions,
    executeSave,
  ])

  // Flush pending saves before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear all timeouts and save synchronously isn't possible with Convex
      // The debounced saves will be lost, but this is acceptable for most use cases
      for (const save of pendingSaves.values()) {
        if (save.timeoutId) {
          clearTimeout(save.timeoutId)
        }
      }
      pendingSaves.clear()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])
}

/**
 * Force flush all pending whiteboard changes immediately
 * Useful before switching teams or navigating away
 */
export function useFlushWhiteboardSync() {
  const saveLayout = useMutation(api.layouts.save)

  return useCallback(async () => {
    const saves = Array.from(pendingSaves.values())
    pendingSaves.clear()

    // Clear all timeouts
    for (const save of saves) {
      if (save.timeoutId) {
        clearTimeout(save.timeoutId)
      }
    }

    // Execute all saves
    await Promise.all(saves.map(async (pending) => {
      try {
        const convexFlags: {
          arrows?: Record<string, { x: number; y: number } | null>
          arrowFlips?: Record<string, boolean>
          arrowCurves?: Record<string, { x: number; y: number }>
          statusFlags?: Record<string, string[]>
          tagFlags?: Record<string, string[]>
          attackBallPosition?: { x: number; y: number } | null
        } = {}

        if (pending.flags.arrows && Object.keys(pending.flags.arrows).length > 0) {
          convexFlags.arrows = pending.flags.arrows as Record<string, { x: number; y: number } | null>
        }
        if (pending.flags.arrowCurves && Object.keys(pending.flags.arrowCurves).length > 0) {
          convexFlags.arrowCurves = pending.flags.arrowCurves as Record<string, { x: number; y: number }>
        }
        if (pending.flags.statusFlags && Object.keys(pending.flags.statusFlags).length > 0) {
          convexFlags.statusFlags = pending.flags.statusFlags as Record<string, string[]>
        }
        if (pending.flags.tagFlags && Object.keys(pending.flags.tagFlags).length > 0) {
          convexFlags.tagFlags = pending.flags.tagFlags as Record<string, string[]>
        }
        if (pending.flags.attackBallPosition !== undefined) {
          convexFlags.attackBallPosition = pending.flags.attackBallPosition
        }

        await saveLayout({
          teamId: pending.teamId,
          rotation: pending.rotation,
          phase: pending.phase,
          positions: pending.positions,
          flags: Object.keys(convexFlags).length > 0 ? convexFlags : undefined,
        })
      } catch (error) {
        console.error('Error flushing layout save:', error)
      }
    }))
  }, [saveLayout])
}

/**
 * Hook for handling conflict resolution
 * Note: Convex handles real-time sync automatically, so conflicts are less of an issue
 * This is kept for API compatibility but simplified
 */
export function useConflictResolution() {
  const { layoutConflict, resolveConflictKeepMine, resolveConflictLoadTheirs } = useAppStore()

  // In Convex, the last write wins and updates are reactive
  // So conflict resolution is simpler - we just clear the conflict state
  const keepMine = useCallback(() => {
    resolveConflictKeepMine()
  }, [resolveConflictKeepMine])

  const loadTheirs = useCallback(() => {
    resolveConflictLoadTheirs()
  }, [resolveConflictLoadTheirs])

  return {
    hasConflict: !!layoutConflict,
    conflict: layoutConflict,
    keepMine,
    loadTheirs,
  }
}
