import type { Team } from '@/lib/types'

const LOCAL_TEAMS_STORAGE_KEY = 'volley-local-teams'

function normalizeTeam(raw: Team): Team {
  const now = new Date().toISOString()
  const lineups = Array.isArray(raw.lineups) && raw.lineups.length > 0
    ? raw.lineups
    : [{
        id: 'default',
        name: 'Default',
        position_assignments: {},
        created_at: now,
      }]

  const activeLineupId = raw.active_lineup_id ?? lineups[0]?.id ?? 'default'
  const activeLineup = lineups.find((lineup) => lineup.id === activeLineupId)

  return {
    ...raw,
    lineups,
    active_lineup_id: activeLineupId,
    position_assignments: activeLineup?.position_assignments ?? raw.position_assignments ?? {},
    created_at: raw.created_at ?? now,
    updated_at: raw.updated_at ?? now,
  }
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function writeLocalTeams(teams: Team[]) {
  if (!canUseStorage()) return
  window.localStorage.setItem(LOCAL_TEAMS_STORAGE_KEY, JSON.stringify(teams))
}

export function listLocalTeams(): Team[] {
  if (!canUseStorage()) return []

  const raw = window.localStorage.getItem(LOCAL_TEAMS_STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as Team[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((team) => normalizeTeam(team))
      .sort((a, b) => {
        const aTime = new Date(a.updated_at ?? a.created_at ?? 0).getTime()
        const bTime = new Date(b.updated_at ?? b.created_at ?? 0).getTime()
        return bTime - aTime
      })
  } catch {
    return []
  }
}

export function getLocalTeamById(id: string): Team | null {
  const team = listLocalTeams().find((item) => item.id === id)
  return team ?? null
}

export function upsertLocalTeam(team: Team): Team[] {
  const current = listLocalTeams()
  const existing = current.find((item) => item.id === team.id)
  const now = new Date().toISOString()
  const nextTeam = normalizeTeam({
    ...team,
    created_at: team.created_at ?? existing?.created_at ?? now,
    updated_at: now,
  })

  const withoutExisting = current.filter((item) => item.id !== team.id)
  const next = [nextTeam, ...withoutExisting]
  writeLocalTeams(next)
  return next
}

export function removeLocalTeam(id: string): Team[] {
  const next = listLocalTeams().filter((team) => team.id !== id)
  writeLocalTeams(next)
  return next
}
