// Unified WorldState - Single source of truth for the volleyball simulation
// This replaces the scattered state across engine, whiteboard, and store

import type { Rotation } from "@/lib/types";
import type {
  BallState,
  CourtModel,
  PlayerId,
  PlayerState,
  TeamSide,
  Vec2,
} from "@/lib/sim/types";
import { DEFAULT_COURT } from "@/lib/sim/types";
import type { RallyFSMState } from "@/lib/sim/fsm";
import { createInitialFSM } from "@/lib/sim/fsm";

/**
 * WorldState is the single, serializable source of truth for the simulation.
 * Both whiteboard (paused + human edits) and simulation (running + AI edits)
 * operate on the same WorldState structure.
 */
export type WorldState = {
  /** Current simulation tick (discrete time step) */
  tick: number;
  /** Continuous time in milliseconds */
  timeMs: number;

  /** Ball state */
  ball: BallState;

  /** All players (both teams) */
  players: PlayerState[];

  /** Rally FSM state */
  fsm: RallyFSMState;

  /** Court geometry */
  court: CourtModel;

  /** Team rotations */
  homeRotation: Rotation;
  awayRotation: Rotation;

  /** Which team is serving */
  serving: TeamSide;
};

/**
 * Parameters for creating a new WorldState
 */
export type CreateWorldStateParams = {
  court?: CourtModel;
  homeRotation?: Rotation;
  awayRotation?: Rotation;
  serving?: TeamSide;
  players?: PlayerState[];
};

/**
 * Create an initial WorldState with default values
 */
export const createWorldState = (
  params?: CreateWorldStateParams
): WorldState => {
  const court = params?.court ?? DEFAULT_COURT;
  const homeRotation = params?.homeRotation ?? 1;
  const awayRotation = params?.awayRotation ?? 1;
  const serving = params?.serving ?? "HOME";

  const ballY = serving === "HOME" ? 0.92 : 0.08;

  return {
    tick: 0,
    timeMs: 0,
    ball: {
      position: { x: 0.5, y: ballY },
      velocity: { x: 0, y: 0 },
      predicted_landing: { x: 0.5, y: serving === "HOME" ? 0.14 : 0.86 },
      touch_count: 0,
      on_our_side: true,
    },
    players: params?.players ?? [],
    fsm: createInitialFSM(serving),
    court,
    homeRotation,
    awayRotation,
    serving,
  };
};

/**
 * Deep clone a WorldState for immutable updates
 */
export const cloneWorldState = (world: WorldState): WorldState => {
  return {
    tick: world.tick,
    timeMs: world.timeMs,
    ball: {
      position: { ...world.ball.position },
      velocity: { ...world.ball.velocity },
      predicted_landing: { ...world.ball.predicted_landing },
      touch_count: world.ball.touch_count,
      on_our_side: world.ball.on_our_side,
    },
    players: world.players.map((p) => ({
      ...p,
      position: { ...p.position },
      velocity: { ...p.velocity },
      requestedGoal: p.requestedGoal ? { ...p.requestedGoal } : null,
      baseGoal: { ...p.baseGoal },
      override: p.override.active
        ? { ...p.override }
        : { active: false as const },
    })),
    fsm: { ...world.fsm },
    court: { ...world.court, boundsMin: { ...world.court.boundsMin }, boundsMax: { ...world.court.boundsMax } },
    homeRotation: world.homeRotation,
    awayRotation: world.awayRotation,
    serving: world.serving,
  };
};

/**
 * Serialize WorldState to JSON string for persistence/snapshots
 */
export const serializeWorldState = (world: WorldState): string => {
  return JSON.stringify(world);
};

/**
 * Deserialize WorldState from JSON string
 */
export const deserializeWorldState = (json: string): WorldState => {
  return JSON.parse(json) as WorldState;
};

/**
 * Get a player by ID from WorldState
 */
export const getPlayerById = (
  world: WorldState,
  playerId: PlayerId
): PlayerState | undefined => {
  return world.players.find((p) => p.id === playerId);
};

/**
 * Get all players for a team
 */
export const getTeamPlayers = (
  world: WorldState,
  team: TeamSide
): PlayerState[] => {
  return world.players.filter((p) => p.team === team);
};

/**
 * Get all active players (not substituted out)
 */
export const getActivePlayers = (world: WorldState): PlayerState[] => {
  return world.players.filter((p) => p.active);
};

/**
 * Update a specific player in WorldState (immutable)
 */
export const updatePlayer = (
  world: WorldState,
  playerId: PlayerId,
  update: Partial<PlayerState>
): WorldState => {
  return {
    ...world,
    players: world.players.map((p) =>
      p.id === playerId ? { ...p, ...update } : p
    ),
  };
};

/**
 * Update multiple players in WorldState (immutable)
 */
export const updatePlayers = (
  world: WorldState,
  updates: Array<{ id: PlayerId; update: Partial<PlayerState> }>
): WorldState => {
  const updateMap = new Map(updates.map((u) => [u.id, u.update]));
  return {
    ...world,
    players: world.players.map((p) => {
      const update = updateMap.get(p.id);
      return update ? { ...p, ...update } : p;
    }),
  };
};

/**
 * Update ball state (immutable)
 */
export const updateBall = (
  world: WorldState,
  ballUpdate: Partial<BallState>
): WorldState => {
  return {
    ...world,
    ball: {
      ...world.ball,
      ...ballUpdate,
      position: ballUpdate.position
        ? { ...ballUpdate.position }
        : { ...world.ball.position },
      velocity: ballUpdate.velocity
        ? { ...ballUpdate.velocity }
        : { ...world.ball.velocity },
      predicted_landing: ballUpdate.predicted_landing
        ? { ...ballUpdate.predicted_landing }
        : { ...world.ball.predicted_landing },
    },
  };
};

/**
 * Update FSM state (immutable)
 */
export const updateFSM = (
  world: WorldState,
  fsmUpdate: Partial<RallyFSMState>
): WorldState => {
  return {
    ...world,
    fsm: { ...world.fsm, ...fsmUpdate },
  };
};

/**
 * Advance the tick counter
 */
export const advanceTick = (
  world: WorldState,
  dtMs: number = 1000 / 60
): WorldState => {
  return {
    ...world,
    tick: world.tick + 1,
    timeMs: world.timeMs + dtMs,
  };
};

