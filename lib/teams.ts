/**
 * Teams stub - Supabase-based team management has been removed
 * This file exists to prevent import errors in legacy code
 *
 * TODO: Migrate all team management to Convex
 * - See /volleyball/teams page for working Convex implementation
 * - Roster page and related components need refactoring
 */

import { isSupabaseConfigured } from './supabase'
import { generateSlug, getTeamShareUrl } from './teamUtils'

// Re-export utilities
export { isSupabaseConfigured, generateSlug, getTeamShareUrl }

// Stub functions that throw errors
const notImplemented = (fnName: string): never => {
  throw new Error(
    `${fnName} is not implemented. Supabase has been removed. Use Convex instead (see /volleyball/teams for example).`
  )
}

export const createTeam = async (..._args: any[]): Promise<any> => notImplemented('createTeam')
export const updateTeam = async (..._args: any[]): Promise<any> => notImplemented('updateTeam')
export const getAllTeams = async (..._args: any[]): Promise<any> => notImplemented('getAllTeams')
export const getTeam = async (..._args: any[]): Promise<any> => notImplemented('getTeam')
export const getTeamLayouts = async (..._args: any[]): Promise<any> => notImplemented('getTeamLayouts')
export const archiveTeam = async (..._args: any[]): Promise<any> => notImplemented('archiveTeam')
export const saveLayout = async (..._args: any[]): Promise<any> => notImplemented('saveLayout')
export const checkLayoutConflict = async (..._args: any[]): Promise<any> => notImplemented('checkLayoutConflict')
export const forceSaveLayout = async (..._args: any[]): Promise<any> => notImplemented('forceSaveLayout')
