'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useConflictResolution } from '@/hooks/useWhiteboardSync'
import { RALLY_PHASE_INFO, PHASE_INFO } from '@/lib/types'

/**
 * Format a timestamp to a relative time string
 */
function formatRelativeTime(timestamp: string | null): string {
  if (!timestamp) return 'Unknown'

  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'Just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  } else {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  }
}

/**
 * Determine which timestamp is newer
 */
function isServerNewer(localTimestamp: string | null, serverTimestamp: string): boolean {
  if (!localTimestamp) return true
  return new Date(serverTimestamp).getTime() > new Date(localTimestamp).getTime()
}

/**
 * Modal shown when a save conflict is detected (whiteboard layout)
 *
 * This appears when:
 * 1. You edit a layout on this device
 * 2. Someone else edited the same layout on another device
 * 3. Your save tries to happen after theirs
 *
 * User can choose to:
 * - Keep mine: Overwrite the server with your local changes
 * - Load theirs: Discard your local changes and load the server version
 */
export function ConflictResolutionModal() {
  const { hasConflict, conflict, keepMine, loadTheirs } = useConflictResolution()
  const [isResolving, setIsResolving] = useState(false)

  if (!hasConflict || !conflict) return null

  // Get a friendly name for the phase
  const phaseName = RALLY_PHASE_INFO[conflict.phase as keyof typeof RALLY_PHASE_INFO]?.name
    || PHASE_INFO[conflict.phase]?.name
    || conflict.phase

  const handleKeepMine = async () => {
    setIsResolving(true)
    await keepMine()
    setIsResolving(false)
  }

  const handleLoadTheirs = async () => {
    setIsResolving(true)
    await loadTheirs()
    setIsResolving(false)
  }

  const serverIsNewer = isServerNewer(conflict.localUpdatedAt, conflict.serverUpdatedAt)

  return (
    <Dialog open={hasConflict} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Whiteboard Changed on Another Device</DialogTitle>
          <DialogDescription>
            Player positions for Rotation {conflict.rotation}, {phaseName} were changed on another device while you were editing.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Timestamp comparison */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your version:</span>
              <span className="font-medium">{formatRelativeTime(conflict.localUpdatedAt)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Their version:</span>
              <span className="font-medium">
                {formatRelativeTime(conflict.serverUpdatedAt)}
                {serverIsNewer && <span className="text-primary ml-1">(newer)</span>}
              </span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Choose which version to keep:
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleKeepMine}
            disabled={isResolving}
            className="w-full"
            size="lg"
          >
            Keep My Changes
          </Button>
          <Button
            onClick={handleLoadTheirs}
            disabled={isResolving}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Load Their Changes
          </Button>
          <p className="text-xs text-muted-foreground text-center pt-2">
            The other version will be discarded.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
