'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSafeLocalStorage } from '@/store/safeStorage'
import type { Team, Role, CustomLayout } from '@/lib/types'

export type TeamConflictType = 'roster' | 'lineups' | 'teamName' | 'settings'

export interface TeamConflictInfo {
  type: TeamConflictType
  teamId: string
  localUpdatedAt: string | null
  serverUpdatedAt: string
  description: string
  pendingData: Partial<Team>
}

export type TeamPersistedState = {
  currentTeam: Team | null
  customLayouts: CustomLayout[]
  accessMode: 'none' | 'local' | 'full'
  teamPasswordProvided: boolean
}

interface TeamState {
  currentTeam: Team | null
  customLayouts: CustomLayout[]
  accessMode: 'none' | 'local' | 'full'
  teamPasswordProvided: boolean

  teamLoadedTimestamp: string | null
  teamConflict: TeamConflictInfo | null
  isHydrated: boolean

  setCurrentTeam: (team: Team | null) => void
  assignPlayerToRole: (role: Role, playerId: string | undefined) => void
  setCustomLayouts: (layouts: CustomLayout[]) => void
  setAccessMode: (mode: 'none' | 'local' | 'full') => void
  setTeamPasswordProvided: (val: boolean) => void

  getTeamLoadedTimestamp: () => string | null
  setTeamLoadedTimestamp: (timestamp: string) => void
  setTeamConflict: (conflict: TeamConflictInfo | null) => void
  resolveTeamConflictKeepMine: () => void
  resolveTeamConflictLoadTheirs: () => void
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      currentTeam: null,
      customLayouts: [],
      accessMode: 'none',
      teamPasswordProvided: false,
      teamLoadedTimestamp: null,
      teamConflict: null,
      isHydrated: false,

      setCurrentTeam: (team) =>
        set({
          currentTeam: team,
          teamLoadedTimestamp: team?.updated_at || null,
          teamConflict: null,
        }),

      assignPlayerToRole: (role, playerId) =>
        set((state) => {
          if (!state.currentTeam) return {}

          const activeLineupId = state.currentTeam.active_lineup_id
          const nextLineups = state.currentTeam.lineups.map((lineup) => {
            if (lineup.id !== activeLineupId) {
              return lineup
            }
            const nextAssignments = { ...lineup.position_assignments }
            if (playerId) {
              nextAssignments[role] = playerId
            } else {
              delete nextAssignments[role]
            }
            return {
              ...lineup,
              position_assignments: nextAssignments,
            }
          })

          const nextTeamAssignments = { ...state.currentTeam.position_assignments }
          if (playerId) {
            nextTeamAssignments[role] = playerId
          } else {
            delete nextTeamAssignments[role]
          }

          return {
            currentTeam: {
              ...state.currentTeam,
              position_assignments: nextTeamAssignments,
              lineups: nextLineups,
            },
          }
        }),

      setCustomLayouts: (layouts) => set({ customLayouts: layouts }),
      setAccessMode: (mode) => set({ accessMode: mode }),
      setTeamPasswordProvided: (val) => set({ teamPasswordProvided: val }),

      getTeamLoadedTimestamp: () => get().teamLoadedTimestamp,
      setTeamLoadedTimestamp: (timestamp) => set({ teamLoadedTimestamp: timestamp }),
      setTeamConflict: (conflict) => set({ teamConflict: conflict }),
      resolveTeamConflictKeepMine: () => set({ teamConflict: null }),
      resolveTeamConflictLoadTheirs: () => set({ teamConflict: null }),
    }),
    {
      name: 'volley-team-state',
      storage: createSafeLocalStorage<TeamPersistedState>(),
      skipHydration: true,
      partialize: (state) => ({
        currentTeam: state.currentTeam,
        customLayouts: state.customLayouts,
        accessMode: state.accessMode,
        teamPasswordProvided: state.teamPasswordProvided,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          useTeamStore.setState({ isHydrated: true })
          return
        }

        if (!Array.isArray(state.customLayouts)) {
          state.customLayouts = []
        }

        state.teamLoadedTimestamp = null
        state.teamConflict = null
        state.isHydrated = true
      },
    }
  )
)
