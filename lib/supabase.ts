/**
 * Supabase stub - Supabase has been removed from this project
 * This file exists to prevent import errors in legacy code
 * TODO: Remove all Supabase references and migrate to Convex
 */

// Stub type to satisfy TypeScript
type SupabaseStub = any

// Supabase is not configured and not available
export const supabase: SupabaseStub | null = null

// Always returns false - Supabase is not configured
export const isSupabaseConfigured = () => {
  return false
}

// Always throws - Supabase is not available
export const getSupabase = (): never => {
  throw new Error(
    'Supabase is no longer available in this project. Please use Convex for data storage.'
  )
}
