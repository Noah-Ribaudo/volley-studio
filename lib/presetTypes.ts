/**
 * Preset system types
 * Extracted from database.types.ts for use without Supabase dependency
 */

// JSON type for database compatibility
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type FlagType = 'attacking-1' | 'cannot-block' | 'back-row-hit'

export type PresetSystem = 'full-5-1' | '5-1-libero' | '6-2'

export const PRESET_SYSTEMS: PresetSystem[] = ['full-5-1', '5-1-libero', '6-2']

export const PRESET_SYSTEM_INFO: Record<PresetSystem, { name: string; description: string }> = {
  'full-5-1': {
    name: '5-1 (Full Court)',
    description: 'Standard 5-1 with all 6 players visible'
  },
  '5-1-libero': {
    name: '5-1 (with Libero)',
    description: '5-1 system with libero replacing back-row middle'
  },
  '6-2': {
    name: '6-2',
    description: 'Two-setter system with designated hitters'
  }
}
