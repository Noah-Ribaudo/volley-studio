'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PresetSystem } from '@/lib/database.types'
import { isAdminAuthenticated, authenticateAdmin, clearAdminAuth } from '@/lib/admin-auth'

interface AdminState {
  // Whether admin mode is active (authenticated and enabled)
  isAdminMode: boolean

  // Whether the unlock dialog should be shown
  showUnlockDialog: boolean

  // The currently selected preset system being edited (null = none selected)
  selectedSystem: PresetSystem | null

  // Whether presets have been modified (for save indicator)
  hasUnsavedChanges: boolean

  // Actions
  checkAdminAuth: () => boolean
  requestAdminMode: () => void
  unlockAdmin: (password: string) => boolean
  exitAdminMode: () => void
  closeUnlockDialog: () => void
  setSelectedSystem: (system: PresetSystem | null) => void
  setHasUnsavedChanges: (value: boolean) => void
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      isAdminMode: false,
      showUnlockDialog: false,
      selectedSystem: null,
      hasUnsavedChanges: false,

      // Check if admin is authenticated (from localStorage)
      checkAdminAuth: () => {
        const authenticated = isAdminAuthenticated()
        if (!authenticated && get().isAdminMode) {
          // Auth was cleared externally, disable admin mode
          set({ isAdminMode: false })
        }
        return authenticated
      },

      // Request to enter admin mode - shows unlock dialog if not authenticated
      requestAdminMode: () => {
        if (isAdminAuthenticated()) {
          set({ isAdminMode: true })
        } else {
          set({ showUnlockDialog: true })
        }
      },

      // Attempt to unlock admin mode with password
      unlockAdmin: (password: string) => {
        if (authenticateAdmin(password)) {
          set({ isAdminMode: true, showUnlockDialog: false })
          return true
        }
        return false
      },

      // Exit admin mode
      exitAdminMode: () => {
        set({ isAdminMode: false, hasUnsavedChanges: false })
      },

      // Close the unlock dialog without authenticating
      closeUnlockDialog: () => {
        set({ showUnlockDialog: false })
      },

      // Change the selected preset system
      setSelectedSystem: (system) => {
        set({ selectedSystem: system })
      },

      // Track unsaved changes
      setHasUnsavedChanges: (value) => {
        set({ hasUnsavedChanges: value })
      },
    }),
    {
      name: 'volleyball-admin-storage',
      partialize: (state) => ({
        // Only persist the selected system preference
        selectedSystem: state.selectedSystem,
      }),
    }
  )
)
