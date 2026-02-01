import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Minimal Database type for Supabase (no longer using actual database types)
type Database = any

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Only create client if configured
let supabaseClient: SupabaseClient<Database> | null = null

if (supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey)
}

// Export the client (null when not configured)
export const supabase: SupabaseClient<Database> | null = supabaseClient

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseClient)
}

// Get the client safely (throws if not configured)
export const getSupabase = (): SupabaseClient<Database> => {
  if (!supabaseClient) {
    throw new Error(
      'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and deploy settings, then run the SQL in supabase/schema.sql.'
    )
  }
  return supabaseClient
}
