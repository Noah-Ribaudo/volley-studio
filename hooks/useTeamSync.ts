'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import {
  queueRosterSave,
  queueLineupsSave,
  queueTeamNameSave,
  flushPendingTeamSaves,
  cancelPendingTeamSaves,
  configureTeamConflictDetection,
  clearTeamConflictDetection,
  forceSaveTeamAfterConflict,
  TeamConflictInfo,
} from '@/lib/team-sync'
import { isSupabaseConfigured, getTeam } from '@/lib/teams'
import { RosterPlayer, PositionAssignments, Lineup } from '@/lib/types'

/**
 * Hook that auto-saves team changes to Supabase
 *
 * When a team is selected and you make changes to roster, lineups,
 * or team name, this hook will automatically queue those changes
 * to be saved to the database.
 *
 * Different data types have different debounce times:
 * - Roster (player names/numbers): 1500ms (typing text)
 * - Lineups (position assignments): 1000ms (dropdown selections)
 * - Team name: 1500ms (typing text)
 *
 * Includes conflict detection for multi-device sync:
 * - Checks if server data changed since we loaded it before saving
 * - Shows a modal if there's a conflict so user can choose what to do
 */
export function useTeamSync(
  localRoster: RosterPlayer[],
  localLineups: Lineup[],
  localActiveLineupId: string | null,
  localAssignments: PositionAssignments,
  localTeamName: string,
  teamId: string | null
) {
  const {
    currentTeam,
    getTeamLoadedTimestamp,
    setTeamLoadedTimestamp,
    setTeamConflict,
  } = useAppStore()

  // Track previous values to detect changes
  const prevValuesRef = useRef<{
    teamId: string | null
    rosterJson: string
    lineupsJson: string
    assignmentsJson: string
    teamName: string
  } | null>(null)

  // Track if this is the initial render (skip saving on initial load)
  const isInitialRenderRef = useRef(true)

  // Configure conflict detection callbacks when hook mounts
  useEffect(() => {
    configureTeamConflictDetection({
      onConflict: (conflict: TeamConflictInfo) => {
        setTeamConflict(conflict)
      },
      onTimestampUpdated: (newTimestamp: string) => {
        setTeamLoadedTimestamp(newTimestamp)
      },
      getLoadedTimestamp: () => {
        return getTeamLoadedTimestamp()
      },
    })

    return () => {
      clearTeamConflictDetection()
    }
  }, [setTeamConflict, setTeamLoadedTimestamp, getTeamLoadedTimestamp])

  // Serialize current state for comparison
  const rosterJson = JSON.stringify(localRoster)
  const lineupsJson = JSON.stringify(localLineups)
  const assignmentsJson = JSON.stringify(localAssignments)

  // Handle roster changes
  useEffect(() => {
    // Skip if Supabase not configured or no team selected
    if (!isSupabaseConfigured() || !teamId) {
      return
    }

    // Skip initial render
    if (isInitialRenderRef.current) {
      return
    }

    const prev = prevValuesRef.current

    // Check if roster changed
    const hasRosterChange = prev &&
      prev.teamId === teamId &&
      prev.rosterJson !== rosterJson

    if (hasRosterChange) {
      queueRosterSave(teamId, localRoster)
    }
  }, [teamId, rosterJson, localRoster])

  // Handle lineups/assignments changes
  useEffect(() => {
    // Skip if Supabase not configured or no team selected
    if (!isSupabaseConfigured() || !teamId) {
      return
    }

    // Skip initial render
    if (isInitialRenderRef.current) {
      return
    }

    const prev = prevValuesRef.current

    // Check if lineups or assignments changed
    const hasLineupsChange = prev &&
      prev.teamId === teamId &&
      (prev.lineupsJson !== lineupsJson || prev.assignmentsJson !== assignmentsJson)

    if (hasLineupsChange) {
      queueLineupsSave(teamId, localLineups, localActiveLineupId, localAssignments)
    }
  }, [teamId, lineupsJson, assignmentsJson, localLineups, localActiveLineupId, localAssignments])

  // Handle team name changes
  useEffect(() => {
    // Skip if Supabase not configured or no team selected
    if (!isSupabaseConfigured() || !teamId) {
      return
    }

    // Skip initial render
    if (isInitialRenderRef.current) {
      return
    }

    const prev = prevValuesRef.current

    // Check if team name changed
    const hasNameChange = prev &&
      prev.teamId === teamId &&
      prev.teamName !== localTeamName &&
      localTeamName.trim() !== ''

    if (hasNameChange) {
      queueTeamNameSave(teamId, localTeamName)
    }
  }, [teamId, localTeamName])

  // Update previous values after all checks
  useEffect(() => {
    // Mark initial render as complete after first update
    if (isInitialRenderRef.current && teamId) {
      // Use a small delay to let the initial load complete
      const timer = setTimeout(() => {
        isInitialRenderRef.current = false
      }, 100)
      return () => clearTimeout(timer)
    }

    prevValuesRef.current = {
      teamId,
      rosterJson,
      lineupsJson,
      assignmentsJson,
      teamName: localTeamName,
    }
  }, [teamId, rosterJson, lineupsJson, assignmentsJson, localTeamName])

  // Reset initial render flag when team changes
  useEffect(() => {
    isInitialRenderRef.current = true
    // Also update prevValues to the new team's values
    prevValuesRef.current = {
      teamId,
      rosterJson,
      lineupsJson,
      assignmentsJson,
      teamName: localTeamName,
    }

    // Mark initial render as complete after a short delay
    const timer = setTimeout(() => {
      isInitialRenderRef.current = false
    }, 100)

    return () => {
      clearTimeout(timer)
      // Cancel pending saves when team changes
      cancelPendingTeamSaves()
    }
  }, [teamId]) // Only run when teamId changes

  // Flush pending saves before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushPendingTeamSaves()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Flush any pending saves on unmount
      flushPendingTeamSaves()
    }
  }, [])
}

/**
 * Force save all pending team changes immediately
 * Useful before switching teams or navigating away
 */
export function useFlushTeamSync() {
  return useCallback(async () => {
    await flushPendingTeamSaves()
  }, [])
}

/**
 * Hook for handling team conflict resolution
 * Returns functions to resolve conflicts
 */
export function useTeamConflictResolution() {
  const {
    currentTeam,
    teamConflict,
    resolveTeamConflictKeepMine,
    resolveTeamConflictLoadTheirs,
    setCurrentTeam,
  } = useAppStore()

  // Handle "Keep my changes" - force save local version
  const keepMine = useCallback(async () => {
    if (!teamConflict || !currentTeam) return

    // Force save the pending data (bypasses conflict check)
    await forceSaveTeamAfterConflict(
      teamConflict.teamId,
      teamConflict.type,
      teamConflict.pendingData
    )

    // Clear the conflict state
    resolveTeamConflictKeepMine()
  }, [teamConflict, currentTeam, resolveTeamConflictKeepMine])

  // Handle "Load their changes" - discard local and reload from server
  const loadTheirs = useCallback(async () => {
    if (!teamConflict || !currentTeam) return

    try {
      // Fetch the server version
      const serverTeam = await getTeam(teamConflict.teamId)

      if (serverTeam) {
        // Update our current team with the server version
        setCurrentTeam(serverTeam)
      }
    } catch (error) {
      console.error('Error loading server team:', error)
    }

    // Clear the conflict state
    resolveTeamConflictLoadTheirs()
  }, [teamConflict, currentTeam, setCurrentTeam, resolveTeamConflictLoadTheirs])

  return {
    hasConflict: !!teamConflict,
    conflict: teamConflict,
    keepMine,
    loadTheirs,
  }
}
