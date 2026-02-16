'use client'

import { useEffect, useRef, useCallback, useSyncExternalStore } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useAppStore, getCurrentPositions } from '@/store/useAppStore'
import { createRotationPhaseKey } from '@/lib/rotations'
import { LayoutExtendedData } from '@/lib/types'
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
  status: 'pending' | 'saving'
}

// Track pending saves by rotation/phase key
const pendingSaves = new Map<string, PendingSave>()
const pendingSaveListeners = new Set<() => void>()

function emitPendingSaveChange() {
  for (const listener of pendingSaveListeners) {
    listener()
  }
}

function subscribePendingSaveChanges(listener: () => void) {
  pendingSaveListeners.add(listener)
  return () => {
    pendingSaveListeners.delete(listener)
  }
}

function getPendingSaveKey(teamId: string, rotationPhaseKey: string): string {
  return `${teamId}:${rotationPhaseKey}`
}

function getPendingSaveStatus(teamId: string | null, rotationPhaseKey: string): 'idle' | 'pending' | 'saving' {
  if (!teamId) {
    return 'idle'
  }
  const pending = pendingSaves.get(getPendingSaveKey(teamId, rotationPhaseKey))
  if (!pending) {
    return 'idle'
  }
  return pending.status
}

export function useWhiteboardSaveState(
  teamId: string | null,
  rotationPhaseKey: string
): 'idle' | 'pending' | 'saving' {
  return useSyncExternalStore(
    subscribePendingSaveChanges,
    () => getPendingSaveStatus(teamId, rotationPhaseKey),
    () => 'idle'
  )
}

function cloneForSave<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}

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
    customLayouts,
    isReceivingContext,
    baseOrder,
    showLibero,
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
  const currentTeamId = currentTeam?._id || currentTeam?.id || null

  // Get attack ball position for current key
  const currentAttackBall = attackBallPositions[key]

  // Build the effective positions that should be stored for this key.
  // This avoids saving partial/empty position payloads when only arrows/tags change.
  const effectivePositions = getCurrentPositions(
    currentRotation,
    currentPhase,
    localPositions,
    customLayouts,
    currentTeam ?? null,
    isReceivingContext,
    baseOrder,
    showLibero,
    currentAttackBall || null
  )

  // Serialize current state for comparison
  const positionsJson = JSON.stringify(effectivePositions || {})
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

  const flushPendingSaves = useCallback(() => {
    const saves = Array.from(pendingSaves.values())
    pendingSaves.clear()
    emitPendingSaveChange()

    for (const pending of saves) {
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId)
      }
      // beforeunload/pagehide cannot await; fire best-effort saves
      void executeSave({ ...pending, timeoutId: null })
    }
  }, [executeSave])

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

    // Check if this key changed relative to our previous snapshot.
    const hasChangesInCurrentKey = prev && prev.teamId === currentValues.teamId && prev.key === currentValues.key && (
      prev.positionsJson !== currentValues.positionsJson ||
      prev.arrowsJson !== currentValues.arrowsJson ||
      prev.curvesJson !== currentValues.curvesJson ||
      prev.statusJson !== currentValues.statusJson ||
      prev.tagsJson !== currentValues.tagsJson ||
      prev.attackBallJson !== currentValues.attackBallJson
    )

    const teamId = currentTeam._id as Id<"teams">
    const pendingSaveKey = getPendingSaveKey(teamId, key)
    const hasLocalOverrides = Boolean(
      localPositions[key] ||
      localArrows[key] ||
      arrowCurves[key] ||
      localStatusFlags[key] ||
      localTagFlags[key] ||
      attackBallPositions[key]
    )

    // Compare current local snapshot to the latest server version for this key.
    // This catches first edits after navigation (before we have a same-key baseline).
    const matchingServerLayout = customLayouts.find((layout) => {
      const layoutTeamId = layout.teamId || layout.team_id
      return layoutTeamId === currentTeamId &&
        layout.rotation === currentRotation &&
        layout.phase === currentPhase
    })
    const serverFlags = matchingServerLayout?.flags ?? null
    const differsFromServer =
      JSON.stringify(matchingServerLayout?.positions || {}) !== currentValues.positionsJson ||
      JSON.stringify(serverFlags?.arrows || {}) !== currentValues.arrowsJson ||
      JSON.stringify(serverFlags?.arrowCurves || {}) !== currentValues.curvesJson ||
      JSON.stringify(serverFlags?.statusFlags || {}) !== currentValues.statusJson ||
      JSON.stringify(serverFlags?.tagFlags || {}) !== currentValues.tagsJson ||
      JSON.stringify(serverFlags?.attackBallPosition || null) !== currentValues.attackBallJson

    const switchedKey =
      !prev ||
      prev.teamId !== currentValues.teamId ||
      prev.key !== currentValues.key

    const shouldQueueSave =
      hasLocalOverrides &&
      (hasChangesInCurrentKey || (switchedKey && differsFromServer))

    if (shouldQueueSave) {
      // Cancel any existing pending save for this key
      const existing = pendingSaves.get(pendingSaveKey)
      if (existing?.timeoutId) {
        clearTimeout(existing.timeoutId)
      }

      // Build the extended data for this specific rotation/phase
      const flags: LayoutExtendedData = {}

      // Extract arrows for this rotation/phase
      const arrows = localArrows[key]
      if (arrows && Object.keys(arrows).length > 0) {
        flags.arrows = cloneForSave(arrows)
      }

      // Extract arrow curves for this rotation/phase
      const curves = arrowCurves[key]
      if (curves && Object.keys(curves).length > 0) {
        flags.arrowCurves = cloneForSave(curves)
      }

      // Extract status flags for this rotation/phase
      const status = localStatusFlags[key]
      if (status && Object.keys(status).length > 0) {
        flags.statusFlags = cloneForSave(status)
      }

      // Extract tag flags for this rotation/phase
      const tags = localTagFlags[key]
      if (tags && Object.keys(tags).length > 0) {
        flags.tagFlags = cloneForSave(tags)
      }

      // Extract attack ball position for this rotation/phase
      const attackBall = attackBallPositions[key]
      if (attackBall) {
        flags.attackBallPosition = cloneForSave(attackBall)
      }

      // Create new pending save
      // Convert PositionCoordinates to Record<string, {x, y}> for Convex
      const positionsRecord: Record<string, { x: number; y: number }> = {}
      const posData = JSON.parse(currentValues.positionsJson) as Record<string, { x: number; y: number }>
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
        status: 'pending',
      }

      // Set up debounced execution
      pending.timeoutId = setTimeout(async () => {
        const currentPending = pendingSaves.get(pendingSaveKey)
        if (!currentPending) {
          return
        }

        pendingSaves.set(pendingSaveKey, {
          ...currentPending,
          timeoutId: null,
          status: 'saving',
        })
        emitPendingSaveChange()

        await executeSave({ ...currentPending, timeoutId: null, status: 'saving' })

        pendingSaves.delete(pendingSaveKey)
        emitPendingSaveChange()
      }, DEBOUNCE_MS)

      pendingSaves.set(pendingSaveKey, pending)
      emitPendingSaveChange()
    }

    // Update previous values
    prevValuesRef.current = currentValues
  }, [
    currentTeam?._id,
    currentTeamId,
    key,
    positionsJson,
    arrowsJson,
    curvesJson,
    statusJson,
    tagsJson,
    attackBallJson,
    currentRotation,
    currentPhase,
    customLayouts,
    isReceivingContext,
    baseOrder,
    showLibero,
    localPositions,
    localArrows,
    arrowCurves,
    localStatusFlags,
    localTagFlags,
    attackBallPositions,
    executeSave,
  ])

  // Flush pending saves before page unload
  useEffect(() => {
    const handleBeforeUnload = () => flushPendingSaves()
    const handlePageHide = () => flushPendingSaves()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSaves()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      flushPendingSaves()
    }
  }, [flushPendingSaves])
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
    emitPendingSaveChange()

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
