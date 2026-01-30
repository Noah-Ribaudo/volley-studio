// State synchronization utilities for whiteboard-simulation integration
// Handles converting between whiteboard positions and WorldState

import type { Role, Rotation, PositionCoordinates } from "@/lib/types";
import type { PlayerState, Vec2, TeamSide, SimRole, SimRoleCategory } from "@/lib/sim/types";
import type { WorldState } from "@/lib/sim/world";
import { createWorldState } from "@/lib/sim/world";
import { DEFAULT_PLAYER_SKILLS } from "@/lib/sim/types";
import { ROLES } from "@/lib/types";
import { getRoleCategory } from "@/lib/sim/rotation";

/**
 * Convert whiteboard positions to players in WorldState
 * Used when starting simulation from whiteboard state
 */
export function whiteboardPositionsToPlayers(
  positions: PositionCoordinates,
  rotation: Rotation,
  team: TeamSide,
  baseOrder?: Role[]
): PlayerState[] {
  const players: PlayerState[] = [];

  for (const role of ROLES) {
    const pos = positions[role];
    if (!pos) continue;

    const simRole = role as SimRole;
    const category = getRoleCategory(simRole);

    players.push({
      id: `${team}-${role}`,
      role: simRole,
      category,
      team,
      position: { x: pos.x, y: pos.y },
      velocity: { x: 0, y: 0 },
      maxSpeed: 0.008, // Standard player speed
      priority: 0,
      requestedGoal: null,
      baseGoal: { type: "MaintainBaseResponsibility" },
      override: { active: false },
      active: true,
      skills: { ...DEFAULT_PLAYER_SKILLS },
    });
  }

  return players;
}

/**
 * Extract whiteboard positions from WorldState
 * Used when pausing simulation to return to whiteboard mode
 */
export function playersToWhiteboardPositions(
  players: PlayerState[],
  team: TeamSide
): PositionCoordinates {
  const positions: PositionCoordinates = {} as PositionCoordinates;

  for (const player of players) {
    if (player.team !== team) continue;

    // Extract role from player ID (e.g., "HOME-S" -> "S")
    const role = player.role as Role;
    positions[role] = { x: player.position.x, y: player.position.y };
  }

  return positions;
}

/**
 * Sync whiteboard state to create a new WorldState
 * This is the main entry point for starting simulation from whiteboard
 */
export function syncWhiteboardToWorld(
  homePositions: PositionCoordinates,
  awayPositions: PositionCoordinates | null,
  rotation: Rotation,
  serving: TeamSide
): WorldState {
  const homePlayers = whiteboardPositionsToPlayers(
    homePositions,
    rotation,
    "HOME"
  );

  // If no away positions, create mirrored positions
  const awayPlayers = awayPositions
    ? whiteboardPositionsToPlayers(awayPositions, rotation, "AWAY")
    : mirrorPositionsForAway(homePlayers, rotation);

  return createWorldState({
    homeRotation: rotation,
    awayRotation: rotation,
    serving,
    players: [...homePlayers, ...awayPlayers],
  });
}

/**
 * Mirror home positions to create opponent positions
 * Used when only home side is defined in whiteboard
 */
function mirrorPositionsForAway(
  homePlayers: PlayerState[],
  _rotation: Rotation
): PlayerState[] {
  return homePlayers.map((homePlayer) => ({
    ...homePlayer,
    id: `AWAY-${homePlayer.role}`,
    team: "AWAY" as TeamSide,
    position: {
      x: homePlayer.position.x,
      y: 1 - homePlayer.position.y, // Mirror across net (y = 0.5)
    },
  }));
}

/**
 * Blend player positions toward whiteboard targets
 * Used during simulation to incorporate whiteboard influence
 *
 * @param player Current player state
 * @param whiteboardTarget Target position from whiteboard
 * @param influence Blend factor (0 = no influence, 1 = full override)
 * @returns Blended goal position
 */
export function blendWithWhiteboardTarget(
  currentGoalPosition: Vec2,
  whiteboardTarget: Vec2,
  influence: number
): Vec2 {
  const t = Math.max(0, Math.min(1, influence));
  return {
    x: currentGoalPosition.x * (1 - t) + whiteboardTarget.x * t,
    y: currentGoalPosition.y * (1 - t) + whiteboardTarget.y * t,
  };
}

/**
 * Calculate the "drift" of players from their whiteboard positions
 * Useful for debug visualization
 */
export function calculatePositionDrift(
  players: PlayerState[],
  whiteboardPositions: PositionCoordinates,
  team: TeamSide
): Map<string, number> {
  const drifts = new Map<string, number>();

  for (const player of players) {
    if (player.team !== team) continue;

    const role = player.role as Role;
    const wbPos = whiteboardPositions[role];

    if (wbPos) {
      const dx = player.position.x - wbPos.x;
      const dy = player.position.y - wbPos.y;
      const drift = Math.sqrt(dx * dx + dy * dy);
      drifts.set(player.id, drift);
    }
  }

  return drifts;
}

/**
 * Check if simulation state has diverged significantly from whiteboard
 * Can be used to suggest resync or show warning
 */
export function hasSignificantDrift(
  players: PlayerState[],
  whiteboardPositions: PositionCoordinates,
  team: TeamSide,
  threshold: number = 0.1
): boolean {
  const drifts = calculatePositionDrift(players, whiteboardPositions, team);

  for (const drift of drifts.values()) {
    if (drift > threshold) return true;
  }

  return false;
}

/**
 * Reset players to their whiteboard positions
 * Used for "snap to whiteboard" functionality
 */
export function resetPlayersToWhiteboard(
  world: WorldState,
  homePositions: PositionCoordinates,
  awayPositions?: PositionCoordinates
): WorldState {
  const updatedPlayers = world.players.map((player) => {
    const positions =
      player.team === "HOME" ? homePositions : awayPositions;

    if (!positions) return player;

    const role = player.role as Role;
    const wbPos = positions[role];

    if (!wbPos) return player;

    return {
      ...player,
      position: { x: wbPos.x, y: wbPos.y },
      velocity: { x: 0, y: 0 },
    };
  });

  return {
    ...world,
    players: updatedPlayers,
  };
}
