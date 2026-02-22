import {
  type Role,
  type Phase,
  type Rotation,
  type Team,
  type CustomLayout,
  type PositionSource,
  type Lineup,
  type PositionCoordinates,
  type ArrowPositions,
  type Position,
  type TokenTag,
  ROLES,
  COURT_ZONES,
  isRallyPhase,
} from '@/lib/types'
import { createRotationPhaseKey, DEFAULT_BASE_ORDER, getRoleZone } from '@/lib/rotations'
import { getWhiteboardPositions, getAutoArrows } from '@/lib/whiteboard'

// Get active lineup's position source from a team
export function getActiveLineupPositionSource(team: Team | null): PositionSource {
  if (!team) return 'custom'
  const activeLineup = team.lineups?.find((lineup) => lineup.id === team.active_lineup_id)
  return activeLineup?.position_source || 'custom'
}

// Get active lineup from a team
export function getActiveLineup(team: Team | null): Lineup | null {
  if (!team) return null
  return team.lineups?.find((lineup) => lineup.id === team.active_lineup_id) || null
}

// Get current positions (custom or default) - returns normalized coordinates (0-1)
// When presetLayouts is provided, it will be used instead of customLayouts
// (for when the active lineup uses a preset source)
export function getCurrentPositions(
  rotation: Rotation,
  phase: Phase,
  localPositions: Record<string, PositionCoordinates>,
  customLayouts: CustomLayout[],
  currentTeam: Team | null,
  isReceiving: boolean = true,
  baseOrder: Role[] = DEFAULT_BASE_ORDER,
  showLibero: boolean = false,
  attackBallPosition?: Position | null,
  presetLayouts?: CustomLayout[]
): PositionCoordinates {
  const key = createRotationPhaseKey(rotation, phase)

  // Determine which layouts to use
  const positionSource = getActiveLineupPositionSource(currentTeam)
  const isUsingPreset = positionSource !== 'custom'

  // Local overrides always win, regardless of source.
  if (localPositions[key]) {
    return localPositions[key]
  }

  // If using preset source and preset layouts are provided, use them
  if (isUsingPreset && presetLayouts && presetLayouts.length > 0) {
    const presetLayout = presetLayouts.find(
      (layout) => layout.rotation === rotation && layout.phase === phase
    )
    if (presetLayout) {
      return presetLayout.positions
    }
    // Fall through to whiteboard defaults if no preset found
  }

  // If in team mode with custom source, check for custom layout (already normalized)
  if (currentTeam && !isUsingPreset) {
    const currentTeamId = currentTeam.id ?? currentTeam._id
    const customLayout = customLayouts.find(
      (layout) =>
        (layout.team_id === currentTeamId || layout.teamId === currentTeamId) &&
        layout.rotation === rotation &&
        layout.phase === phase
    )
    if (customLayout) {
      return customLayout.positions
    }
  }

  // Check if phase is a RallyPhase, use whiteboard resolver
  if (isRallyPhase(phase)) {
    const result = getWhiteboardPositions({
      rotation,
      phase,
      isReceiving,
      baseOrder,
      showLibero,
      attackBallPosition: phase === 'DEFENSE_PHASE' ? attackBallPosition : null,
    })
    return result.home
  }

  // Fallback to zone centers for legacy phases (shouldn't happen in normal use)
  const fallback: PositionCoordinates = {} as PositionCoordinates
  for (const role of ROLES) {
    const zone = getRoleZone(rotation, role, baseOrder)
    const zonePos = COURT_ZONES[zone as 1 | 2 | 3 | 4 | 5 | 6]
    fallback[role] = { x: zonePos.x, y: zonePos.y }
  }
  return fallback
}

// Get current positions in normalized coordinates (for simulation/canonical model)
// Note: This is now the same as getCurrentPositions since all coordinates are normalized
export function getCurrentPositionsNormalized(
  rotation: Rotation,
  phase: Phase,
  localPositions: Record<string, PositionCoordinates>,
  customLayouts: CustomLayout[],
  currentTeam: Team | null,
  isReceiving: boolean = true,
  baseOrder: Role[] = DEFAULT_BASE_ORDER
): PositionCoordinates {
  return getCurrentPositions(
    rotation,
    phase,
    localPositions,
    customLayouts,
    currentTeam,
    isReceiving,
    baseOrder
  )
}

// Get current arrows (manual overrides auto-generated, otherwise defaults)
// Note: If manualArrows[role] === null, it means the arrow was explicitly deleted
// When presetLayouts is provided and team uses preset source, arrows come from preset
export function getCurrentArrows(
  rotation: Rotation,
  phase: Phase,
  localArrows: Record<string, ArrowPositions>,
  isReceiving: boolean = true,
  baseOrder: Role[] = DEFAULT_BASE_ORDER,
  showLibero: boolean = false,
  attackBallPosition?: Position | null,
  currentTeam?: Team | null,
  presetLayouts?: CustomLayout[]
): ArrowPositions {
  const key = createRotationPhaseKey(rotation, phase)

  // Check if we're using preset source
  const positionSource = currentTeam ? getActiveLineupPositionSource(currentTeam) : 'custom'
  const isUsingPreset = positionSource !== 'custom'
  const manualArrows = localArrows[key] || {}
  let presetArrows: ArrowPositions = {}

  // If using preset source and preset layouts are provided, use preset arrows
  if (isUsingPreset && presetLayouts && presetLayouts.length > 0) {
    const presetLayout = presetLayouts.find(
      (layout) => layout.rotation === rotation && layout.phase === phase
    )
    if (presetLayout?.flags?.arrows) {
      presetArrows = presetLayout.flags.arrows
    }
  }

  if (isRallyPhase(phase)) {
    const autoArrows = getAutoArrows(
      rotation,
      phase,
      isReceiving,
      baseOrder,
      undefined,
      showLibero,
      attackBallPosition
    )
    const merged = { ...autoArrows, ...presetArrows, ...manualArrows }

    const result: ArrowPositions = {}
    for (const [role, pos] of Object.entries(merged)) {
      if (pos !== null) {
        result[role as keyof ArrowPositions] = pos
      }
    }
    return result
  }

  const merged = { ...presetArrows, ...manualArrows }
  const result: ArrowPositions = {}
  for (const [role, pos] of Object.entries(merged)) {
    if (pos !== null) {
      result[role as keyof ArrowPositions] = pos
    }
  }
  return result
}

// Get current tags for a rotation/phase
export function getCurrentTags(
  rotation: Rotation,
  phase: Phase,
  localTagFlags: Record<string, Partial<Record<Role, TokenTag[]>>>
): Partial<Record<Role, TokenTag[]>> {
  const key = createRotationPhaseKey(rotation, phase)
  return localTagFlags[key] || {}
}
