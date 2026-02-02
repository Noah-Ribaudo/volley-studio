export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ear_candy_moments: {
        Row: {
          id: string
          youtube_url: string
          start_time_seconds: number
          end_time_seconds: number
          audio_file_path: string | null
          audio_duration_seconds: number | null
          waveform_data: Json | null
          song_title: string
          artist_name: string
          album_name: string | null
          description: string
          is_curated: boolean
          status: 'pending' | 'processing' | 'ready' | 'failed' | 'rejected'
          submitter_name: string | null
          created_at: string
          updated_at: string
          published_at: string | null
        }
        Insert: {
          id?: string
          youtube_url: string
          start_time_seconds: number
          end_time_seconds: number
          audio_file_path?: string | null
          audio_duration_seconds?: number | null
          waveform_data?: Json | null
          song_title: string
          artist_name: string
          album_name?: string | null
          description: string
          is_curated?: boolean
          status?: 'pending' | 'processing' | 'ready' | 'failed' | 'rejected'
          submitter_name?: string | null
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Update: {
          id?: string
          youtube_url?: string
          start_time_seconds?: number
          end_time_seconds?: number
          audio_file_path?: string | null
          audio_duration_seconds?: number | null
          waveform_data?: Json | null
          song_title?: string
          artist_name?: string
          album_name?: string | null
          description?: string
          is_curated?: boolean
          status?: 'pending' | 'processing' | 'ready' | 'failed' | 'rejected'
          submitter_name?: string | null
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Relationships: []
      }
      custom_layouts: {
        Row: {
          created_at: string | null
          flags: Json | null
          id: string
          phase: string
          positions: Json
          rotation: number
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          flags?: Json | null
          id?: string
          phase: string
          positions: Json
          rotation: number
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          flags?: Json | null
          id?: string
          phase?: string
          positions?: Json
          rotation?: number
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_layouts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
          password: string | null
          archived: boolean | null
          position_assignments: Json | null
          roster: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
          password?: string | null
          archived?: boolean | null
          position_assignments?: Json | null
          roster?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          password?: string | null
          archived?: boolean | null
          position_assignments?: Json | null
          roster?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rotation_presets: {
        Row: {
          id: string
          system: 'full-5-1' | '5-1-libero' | '6-2'
          rotation: number
          phase: string
          positions: Json
          flags: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          system: 'full-5-1' | '5-1-libero' | '6-2'
          rotation: number
          phase: string
          positions: Json
          flags?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          system?: 'full-5-1' | '5-1-libero' | '6-2'
          rotation?: number
          phase?: string
          positions?: Json
          flags?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Custom types (for application use, not database types)
export type Role = 'S' | 'OH1' | 'OH2' | 'MB1' | 'MB2' | 'OPP'
export type Phase = 'serve' | 'receive' | 'attack' | 'defense'
export type FlagType = 'attacking-1' | 'cannot-block' | 'back-row-hit'

export interface RosterPlayer {
  id: string
  name: string
  number: number
}

export interface PositionAssignments {
  [role: string]: string | undefined // role -> player id
}

export interface Position {
  x: number
  y: number
}

export interface PositionCoordinates {
  [role: string]: Position
}

export interface PlayerFlags {
  [role: string]: FlagType[]
}

// Preset system types
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
