-- 5-1 Volleyball Rotation App Database Schema
-- Run this in your Supabase SQL Editor

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,                   -- URL-friendly identifier (e.g., "beach_boys")
  password TEXT,                               -- Optional simple password/secret
  archived BOOLEAN DEFAULT FALSE,              -- Whether team is archived (hidden from list)
  roster JSONB DEFAULT '[]'::jsonb,           -- [{id, name, number}]
  position_assignments JSONB DEFAULT '{}'::jsonb, -- {role: playerId}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom layouts table
CREATE TABLE IF NOT EXISTS custom_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  rotation INT NOT NULL CHECK (rotation >= 1 AND rotation <= 6),
  phase TEXT NOT NULL CHECK (phase IN ('serve', 'receive', 'attack', 'defense')),
  positions JSONB NOT NULL,            -- {role: {x, y}} in normalized coordinates (0-1)
  flags JSONB DEFAULT '{}'::jsonb,     -- {role: ['attacking-1', ...]}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, rotation, phase)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);
CREATE INDEX IF NOT EXISTS idx_teams_archived ON teams(archived) WHERE archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_custom_layouts_team_id ON custom_layouts(team_id);
CREATE INDEX IF NOT EXISTS idx_custom_layouts_rotation_phase ON custom_layouts(rotation, phase);

-- Enable Row Level Security (RLS)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_layouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow anonymous access (no authentication required)
-- Anyone can read teams
CREATE POLICY "Allow anonymous read access to teams" ON teams
  FOR SELECT USING (true);

-- Anyone can create teams  
CREATE POLICY "Allow anonymous insert access to teams" ON teams
  FOR INSERT WITH CHECK (true);

-- Anyone can update teams
CREATE POLICY "Allow anonymous update access to teams" ON teams
  FOR UPDATE USING (true);

-- Anyone can delete teams
CREATE POLICY "Allow anonymous delete access to teams" ON teams
  FOR DELETE USING (true);

-- Custom layouts policies (same as teams)
CREATE POLICY "Allow anonymous read access to custom_layouts" ON custom_layouts
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access to custom_layouts" ON custom_layouts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to custom_layouts" ON custom_layouts
  FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete access to custom_layouts" ON custom_layouts
  FOR DELETE USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for teams table
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

