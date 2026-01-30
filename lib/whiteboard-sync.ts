/**
 * Whiteboard Sync Layer
 *
 * Handles debounced auto-save of whiteboard state to Supabase.
 * Changes are batched and saved after 750ms of inactivity.
 *
 * Includes conflict detection for multi-device sync:
 * - Before saving, checks if server data changed since we loaded it
 * - If conflict detected, calls the conflict callback instead of saving
 * - User can choose to keep their changes or load server version
 */

import { saveLayout, isSupabaseConfigured, checkLayoutConflict, forceSaveLayout } from './teams'
import { LayoutExtendedData, PositionCoordinates, Rotation, Phase, ArrowPositions, PlayerStatus, Role, Position, ArrowCurveConfig } from './types'
import { createRotationPhaseKey } from './rotations'

// Conflict info passed to callback
export interface WhiteboardConflictInfo {
  rotation: Rotation
  phase: Phase
  localUpdatedAt: string | null
  serverUpdatedAt: string
  pendingPositions: PositionCoordinates
  pendingFlags: LayoutExtendedData
}

// Callback for when a conflict is detected
type ConflictCallback = (conflict: WhiteboardConflictInfo) => void

// Callback for updating loaded timestamp after successful save
type UpdateTimestampCallback = (rotation: Rotation, phase: Phase, newTimestamp: string) => void

// Callback for getting the loaded timestamp for a layout
type GetTimestampCallback = (rotation: Rotation, phase: Phase) => string | null

// Module-level callbacks (set by useWhiteboardSync hook)
let onConflictDetected: ConflictCallback | null = null
let onTimestampUpdated: UpdateTimestampCallback | null = null
let getLoadedTimestamp: GetTimestampCallback | null = null

/**
 * Configure conflict detection callbacks
 */
export function configureConflictDetection(config: {
  onConflict: ConflictCallback
  onTimestampUpdated: UpdateTimestampCallback
  getLoadedTimestamp: GetTimestampCallback
}) {
  onConflictDetected = config.onConflict
  onTimestampUpdated = config.onTimestampUpdated
  getLoadedTimestamp = config.getLoadedTimestamp
}

/**
 * Clear conflict detection callbacks
 */
export function clearConflictDetection() {
  onConflictDetected = null
  onTimestampUpdated = null
  getLoadedTimestamp = null
}

// Debounce delay in milliseconds
const DEBOUNCE_MS = 750

// Pending save data for a single rotation/phase
interface PendingSave {
  teamId: string
  rotation: Rotation
  phase: Phase
  positions: PositionCoordinates
  flags: LayoutExtendedData
  timeoutId: ReturnType<typeof setTimeout> | null
}

// Track pending saves by rotation/phase key
const pendingSaves = new Map<string, PendingSave>()

// Track online status for retry logic
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

// Queue for saves that failed while offline
const offlineQueue: Array<{
  teamId: string
  rotation: Rotation
  phase: Phase
  positions: PositionCoordinates
  flags: LayoutExtendedData
}> = []

// Initialize online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true
    processOfflineQueue()
  })
  window.addEventListener('offline', () => {
    isOnline = false
  })
}

/**
 * Process any saves that were queued while offline
 */
async function processOfflineQueue() {
  if (!isOnline || offlineQueue.length === 0) return

  while (offlineQueue.length > 0) {
    const item = offlineQueue.shift()
    if (!item) continue

    try {
      await saveLayout(item.teamId, item.rotation, item.phase, item.positions, item.flags)
    } catch {
      // Re-queue if still failing
      offlineQueue.push(item)
      break
    }
  }
}

/**
 * Execute the actual save to Supabase
 * Checks for conflicts before saving
 */
async function executeSave(pending: PendingSave, forceOverwrite = false): Promise<void> {
  if (!isSupabaseConfigured()) {
    return
  }

  try {
    // Check for conflicts unless force overwrite is requested
    if (!forceOverwrite && onConflictDetected && getLoadedTimestamp) {
      const localUpdatedAt = getLoadedTimestamp(pending.rotation, pending.phase)
      const conflictResult = await checkLayoutConflict(
        pending.teamId,
        pending.rotation,
        pending.phase,
        localUpdatedAt
      )

      if (conflictResult.hasConflict && conflictResult.serverUpdatedAt) {
        // Conflict detected - notify callback and don't save
        onConflictDetected({
          rotation: pending.rotation,
          phase: pending.phase,
          localUpdatedAt,
          serverUpdatedAt: conflictResult.serverUpdatedAt,
          pendingPositions: pending.positions,
          pendingFlags: pending.flags,
        })
        return
      }
    }

    // No conflict (or force overwrite) - proceed with save
    const savedLayout = await saveLayout(
      pending.teamId,
      pending.rotation,
      pending.phase,
      pending.positions,
      pending.flags
    )

    // Update the loaded timestamp to the new server timestamp
    if (onTimestampUpdated && savedLayout.updated_at) {
      onTimestampUpdated(pending.rotation, pending.phase, savedLayout.updated_at)
    }
  } catch {
    // If offline, queue for later
    if (!isOnline) {
      offlineQueue.push({
        teamId: pending.teamId,
        rotation: pending.rotation,
        phase: pending.phase,
        positions: pending.positions,
        flags: pending.flags,
      })
    }
  }
}

/**
 * Queue a save operation with debouncing
 *
 * @param teamId - The team ID to save for
 * @param rotation - Current rotation number
 * @param phase - Current phase
 * @param positions - Player positions for this rotation/phase
 * @param localArrows - All arrows data (we'll extract for this rotation/phase)
 * @param arrowCurves - All arrow curve data (direction and intensity)
 * @param statusFlags - All status flags data
 * @param attackBallPosition - Attack ball position (for defense phase)
 */
export function queueWhiteboardSave(
  teamId: string,
  rotation: Rotation,
  phase: Phase,
  positions: PositionCoordinates,
  localArrows: Record<string, ArrowPositions>,
  arrowCurves: Record<string, Partial<Record<Role, ArrowCurveConfig>>>,
  statusFlags: Record<string, Partial<Record<Role, PlayerStatus[]>>>,
  attackBallPositions: Record<string, Position>
): void {
  const key = createRotationPhaseKey(rotation, phase)

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
  const status = statusFlags[key]
  if (status && Object.keys(status).length > 0) {
    flags.statusFlags = status
  }

  // Extract attack ball position for this rotation/phase
  const attackBall = attackBallPositions[key]
  if (attackBall) {
    flags.attackBallPosition = attackBall
  }

  // Cancel any existing pending save for this key
  const existing = pendingSaves.get(key)
  if (existing?.timeoutId) {
    clearTimeout(existing.timeoutId)
  }

  // Create new pending save
  const pending: PendingSave = {
    teamId,
    rotation,
    phase,
    positions,
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

/**
 * Immediately flush all pending saves (e.g., before unload)
 */
export async function flushPendingSaves(): Promise<void> {
  const saves = Array.from(pendingSaves.values())
  pendingSaves.clear()

  // Clear all timeouts
  for (const save of saves) {
    if (save.timeoutId) {
      clearTimeout(save.timeoutId)
    }
  }

  // Execute all saves (without conflict checking - flush is for emergency saves)
  await Promise.all(saves.map(save => executeSave(save, true)))
}

/**
 * Cancel all pending saves (e.g., when switching teams)
 */
export function cancelPendingSaves(): void {
  for (const save of pendingSaves.values()) {
    if (save.timeoutId) {
      clearTimeout(save.timeoutId)
    }
  }
  pendingSaves.clear()
}

/**
 * Check if there are any pending saves
 */
export function hasPendingSaves(): boolean {
  return pendingSaves.size > 0
}

/**
 * Force save a layout after user resolves conflict with "keep mine"
 * This bypasses conflict detection since user explicitly chose to overwrite
 */
export async function forceSaveAfterConflict(
  teamId: string,
  rotation: Rotation,
  phase: Phase,
  positions: PositionCoordinates,
  flags: LayoutExtendedData
): Promise<void> {
  if (!isSupabaseConfigured()) {
    return
  }

  try {
    const savedLayout = await forceSaveLayout(teamId, rotation, phase, positions, flags)

    // Update the loaded timestamp to the new server timestamp
    if (onTimestampUpdated && savedLayout.updated_at) {
      onTimestampUpdated(rotation, phase, savedLayout.updated_at)
    }
  } catch (error) {
    console.error('Error force-saving after conflict:', error)
    // If offline, queue for later (without conflict check)
    if (!isOnline) {
      offlineQueue.push({
        teamId,
        rotation,
        phase,
        positions,
        flags,
      })
    }
  }
}
