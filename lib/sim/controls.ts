// SimController - Unified control API for the volleyball simulation
// Provides pause/resume, step, dry-run, and snapshot capabilities

import type { Rotation, Role } from "@/lib/types";
import type {
  CourtModel,
  PlayerId,
  PlayerState,
  TeamSide,
  Vec2,
  RallyPhase,
} from "@/lib/sim/types";
import { DEFAULT_COURT, vec2, DEFAULT_PLAYER_SKILLS } from "@/lib/sim/types";
import type { WorldState } from "@/lib/sim/world";
import {
  createWorldState,
  cloneWorldState,
  serializeWorldState,
  deserializeWorldState,
  updatePlayer,
  updateBall,
  updateFSM,
  getPlayerById,
} from "@/lib/sim/world";
import type { Intent } from "@/lib/sim/intent";
import { createMoveIntent, createGoalIntent } from "@/lib/sim/intent";
import type { DecisionTrace } from "@/lib/sim/trace";
import type { TickResult, StepTickOptions } from "@/lib/sim/tick";
import { stepTick, dryRunTick, simulateUntil } from "@/lib/sim/tick";
import { reduceFSM } from "@/lib/sim/fsm";
import type { RallyEvent } from "@/lib/sim/fsm";
import { getServerRole } from "@/lib/sim/rotation";

// ============================================================================
// Types
// ============================================================================

/**
 * Result of a dry run operation
 */
export type DryRunResult = {
  intents: Intent[];
  traces: DecisionTrace[];
  predictedWorld: WorldState;
};

/**
 * Snapshot of the simulation state
 */
export type SimSnapshot = {
  id: string;
  timestamp: number;
  world: WorldState;
  label?: string;
};

/**
 * Options for creating a SimController
 */
export type SimControllerOptions = {
  court?: CourtModel;
  homeRotation?: Rotation;
  awayRotation?: Rotation;
  serving?: TeamSide;
  initialPlayers?: PlayerState[];
};

/**
 * Callback for simulation events
 */
export type SimEventCallback = (event: {
  type: "tick" | "pause" | "resume" | "serve" | "rally_end" | "snapshot";
  world: WorldState;
  data?: unknown;
}) => void;

// ============================================================================
// Player Factory
// ============================================================================

const roleCategory = (
  role: PlayerState["role"]
): PlayerState["category"] => {
  if (role === "S") return "SETTER";
  if (role === "OPP") return "OPPOSITE";
  if (role === "OH1" || role === "OH2") return "OUTSIDE";
  if (role === "MB1" || role === "MB2") return "MIDDLE";
  return "LIBERO";
};

const categoryPriority = (category: PlayerState["category"]): number => {
  if (category === "SETTER") return 1;
  if (category === "LIBERO") return 2;
  if (category === "OUTSIDE") return 3;
  if (category === "OPPOSITE") return 4;
  return 5;
};

const getDefaultMaxSpeed = (category: PlayerState["category"]): number => {
  if (category === "MIDDLE") return 0.9;
  if (category === "SETTER") return 1.05;
  return 1;
};

const makePlayer = (params: {
  id: string;
  team: TeamSide;
  role: PlayerState["role"];
  position: Vec2;
}): PlayerState => {
  const category = roleCategory(params.role);
  return {
    id: params.id,
    team: params.team,
    role: params.role,
    category,
    priority: categoryPriority(category),
    position: params.position,
    velocity: { x: 0, y: 0 },
    maxSpeed: getDefaultMaxSpeed(category),
    requestedGoal: null,
    baseGoal: { type: "MaintainBaseResponsibility" },
    override: { active: false },
    active: true,
    skills: DEFAULT_PLAYER_SKILLS,
  };
};

const createDefaultPlayers = (
  homeRotation: Rotation,
  awayRotation: Rotation
): PlayerState[] => {
  const jitter = (): number => (Math.random() - 0.5) * 0.06;
  
  const getDefaultPosition = (
    role: PlayerState["role"],
    team: TeamSide
  ): Vec2 => {
    const baseY = team === "HOME" ? 0.75 : 0.25;
    const positions: Record<string, number> = {
      S: 0.8333,
      OH1: 0.1667,
      OH2: 0.5,
      MB1: 0.5,
      MB2: 0.8333,
      OPP: 0.8333,
      L: 0.5,
    };
    const x = positions[role] ?? 0.5;
    return { x: x + jitter(), y: baseY + jitter() };
  };

  const home: PlayerState[] = [
    makePlayer({ id: "H-S", team: "HOME", role: "S", position: getDefaultPosition("S", "HOME") }),
    makePlayer({ id: "H-OH1", team: "HOME", role: "OH1", position: getDefaultPosition("OH1", "HOME") }),
    makePlayer({ id: "H-OH2", team: "HOME", role: "OH2", position: getDefaultPosition("OH2", "HOME") }),
    makePlayer({ id: "H-MB1", team: "HOME", role: "MB1", position: getDefaultPosition("MB1", "HOME") }),
    makePlayer({ id: "H-MB2", team: "HOME", role: "MB2", position: getDefaultPosition("MB2", "HOME") }),
    makePlayer({ id: "H-OPP", team: "HOME", role: "OPP", position: getDefaultPosition("OPP", "HOME") }),
    makePlayer({ id: "H-L", team: "HOME", role: "L", position: getDefaultPosition("L", "HOME") }),
  ];

  const away: PlayerState[] = [
    makePlayer({ id: "A-S", team: "AWAY", role: "S", position: getDefaultPosition("S", "AWAY") }),
    makePlayer({ id: "A-OH1", team: "AWAY", role: "OH1", position: getDefaultPosition("OH1", "AWAY") }),
    makePlayer({ id: "A-OH2", team: "AWAY", role: "OH2", position: getDefaultPosition("OH2", "AWAY") }),
    makePlayer({ id: "A-MB1", team: "AWAY", role: "MB1", position: getDefaultPosition("MB1", "AWAY") }),
    makePlayer({ id: "A-MB2", team: "AWAY", role: "MB2", position: getDefaultPosition("MB2", "AWAY") }),
    makePlayer({ id: "A-OPP", team: "AWAY", role: "OPP", position: getDefaultPosition("OPP", "AWAY") }),
    makePlayer({ id: "A-L", team: "AWAY", role: "L", position: getDefaultPosition("L", "AWAY") }),
  ];

  return [...home, ...away];
};

// ============================================================================
// SimController Class
// ============================================================================

/**
 * SimController provides a unified API for controlling the volleyball simulation.
 * It wraps the tick pipeline and provides pause/resume, stepping, dry-run,
 * and snapshot capabilities.
 */
export class SimController {
  private _world: WorldState;
  private _isPaused: boolean = true;
  private _snapshots: SimSnapshot[] = [];
  private _eventListeners: Set<SimEventCallback> = new Set();
  
  // Ball control state (for simulation physics)
  private _ballTarget: Vec2;
  private _ballSpeed: number = 1.2;
  private _ballCrossedNet: boolean = false;
  private _rallyEndTimer: number = 0;

  constructor(options: SimControllerOptions = {}) {
    const court = options.court ?? DEFAULT_COURT;
    const homeRotation = options.homeRotation ?? 1;
    const awayRotation = options.awayRotation ?? 1;
    const serving = options.serving ?? "HOME";

    const players =
      options.initialPlayers ?? createDefaultPlayers(homeRotation, awayRotation);

    this._world = createWorldState({
      court,
      homeRotation,
      awayRotation,
      serving,
      players,
    });

    this._ballTarget = {
      x: 0.5,
      y: serving === "HOME" ? 0.14 : 0.86,
    };
  }

  // ============================================================================
  // State Access
  // ============================================================================

  /**
   * Get the current world state (read-only clone)
   */
  getWorld(): WorldState {
    return cloneWorldState(this._world);
  }

  /**
   * Get a reference to the current world (for performance-critical reads)
   * WARNING: Do not mutate the returned object
   */
  getWorldRef(): Readonly<WorldState> {
    return this._world;
  }

  /**
   * Check if simulation is paused
   */
  isPaused(): boolean {
    return this._isPaused;
  }

  /**
   * Get current phase
   */
  getPhase(): RallyPhase {
    return this._world.fsm.phase;
  }

  /**
   * Get current rotation for a team
   */
  getRotation(team: TeamSide = "HOME"): Rotation {
    return team === "HOME" ? this._world.homeRotation : this._world.awayRotation;
  }

  /**
   * Get score
   */
  getScore(): { home: number; away: number } {
    return {
      home: this._world.fsm.homeScore,
      away: this._world.fsm.awayScore,
    };
  }

  // ============================================================================
  // Time Controls
  // ============================================================================

  /**
   * Pause the simulation
   */
  pause(): void {
    if (!this._isPaused) {
      this._isPaused = true;
      this._emitEvent({ type: "pause", world: this._world });
    }
  }

  /**
   * Resume the simulation
   */
  resume(): void {
    if (this._isPaused) {
      this._isPaused = false;
      this._emitEvent({ type: "resume", world: this._world });
    }
  }

  /**
   * Toggle pause state
   */
  togglePause(): void {
    if (this._isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  // ============================================================================
  // Tick Operations
  // ============================================================================

  /**
   * Step one tick of the simulation
   */
  step(options: StepTickOptions = {}): TickResult {
    const result = stepTick(this._world, {
      ...options,
      commit: options.commit ?? true,
    });

    if (options.commit !== false) {
      this._world = result.nextWorld;
      this._emitEvent({ type: "tick", world: this._world, data: result });
    }

    return result;
  }

  /**
   * Dry run a tick without committing changes
   */
  dryRun(): DryRunResult {
    const result = dryRunTick(this._world);
    return {
      intents: result.intents,
      traces: result.traces,
      predictedWorld: result.nextWorld,
    };
  }

  /**
   * Run simulation until a condition is met
   */
  simulateUntil(
    condition: (w: WorldState) => boolean,
    maxTicks: number = 1000
  ): { finalWorld: WorldState; ticksRun: number } {
    const result = simulateUntil(this._world, condition, maxTicks);
    this._world = result.finalWorld;
    return {
      finalWorld: result.finalWorld,
      ticksRun: result.ticksRun,
    };
  }

  // ============================================================================
  // Human Edits
  // ============================================================================

  /**
   * Apply a human edit to the world state
   */
  applyEdit(edit: (world: WorldState) => WorldState): void {
    this._world = edit(cloneWorldState(this._world));
  }

  /**
   * Move a player to a new position (human edit)
   */
  movePlayer(playerId: PlayerId, position: Vec2): void {
    this._world = updatePlayer(this._world, playerId, { position });
  }

  /**
   * Set a player's goal (human override)
   */
  setPlayerGoal(playerId: PlayerId, goal: PlayerState["requestedGoal"]): void {
    this._world = updatePlayer(this._world, playerId, { requestedGoal: goal });
  }

  /**
   * Update ball position (human edit)
   */
  setBallPosition(position: Vec2): void {
    this._world = updateBall(this._world, { position });
    this._ballTarget = position;
  }

  /**
   * Set the current phase (for whiteboard mode)
   */
  setPhase(phase: RallyPhase): void {
    this._world = updateFSM(this._world, { phase });
  }

  /**
   * Set rotation for a team
   */
  setRotation(team: TeamSide, rotation: Rotation): void {
    if (team === "HOME") {
      this._world = { ...this._world, homeRotation: rotation };
    } else {
      this._world = { ...this._world, awayRotation: rotation };
    }
  }

  // ============================================================================
  // Rally Controls
  // ============================================================================

  /**
   * Start a serve
   */
  serve(): void {
    if (this._world.fsm.phase !== "PRE_SERVE") return;

    // Find the server
    const servingTeam = this._world.fsm.serving;
    const teamRotation = servingTeam === "HOME" ? this._world.homeRotation : this._world.awayRotation;
    const serverRole = getServerRole(teamRotation);
    const server = this._world.players.find(p => p.team === servingTeam && p.role === serverRole);

    const newFSM = reduceFSM(this._world.fsm, { type: "SERVE_CONTACT", playerId: server?.id ?? "unknown" });
    this._world = updateFSM(this._world, newFSM);

    const receiving: TeamSide =
      this._world.fsm.serving === "HOME" ? "AWAY" : "HOME";
    const randomLane = (): "left" | "middle" | "right" => {
      const r = Math.random();
      if (r < 0.33) return "left";
      if (r < 0.66) return "middle";
      return "right";
    };
    const lane = randomLane();
    const laneX = lane === "left" ? 0.25 : lane === "right" ? 0.75 : 0.5;
    const laneY = receiving === "HOME" ? 0.86 : 0.14;

    this._ballTarget = vec2.clamp(
      { x: laneX, y: laneY },
      this._world.court.boundsMin,
      this._world.court.boundsMax
    );
    this._ballCrossedNet = false;
    this._world = updateBall(this._world, {
      predicted_landing: this._ballTarget,
    });

    this._emitEvent({ type: "serve", world: this._world });
  }

  /**
   * Reset the rally (keep scores)
   */
  resetRally(serving?: TeamSide): void {
    const newServing = serving ?? this._world.fsm.serving;
    const ballY = newServing === "HOME" ? 0.92 : 0.08;

    this._world = updateFSM(this._world, {
      phase: "PRE_SERVE",
      serving: newServing,
      touchCount: 0,
      lastTouchTeam: null,
    });

    this._world = updateBall(this._world, {
      position: { x: 0.5, y: ballY },
      velocity: { x: 0, y: 0 },
      predicted_landing: {
        x: 0.5,
        y: newServing === "HOME" ? 0.14 : 0.86,
      },
      touch_count: 0,
    });

    this._ballTarget = {
      x: 0.5,
      y: newServing === "HOME" ? 0.14 : 0.86,
    };
    this._ballCrossedNet = false;
    this._rallyEndTimer = 0;
  }

  /**
   * Full reset (scores and rotations)
   */
  reset(): void {
    const players = createDefaultPlayers(1, 1);

    this._world = createWorldState({
      court: this._world.court,
      homeRotation: 1,
      awayRotation: 1,
      serving: "HOME",
      players,
    });

    this._ballTarget = { x: 0.5, y: 0.14 };
    this._ballSpeed = 1.2;
    this._ballCrossedNet = false;
    this._rallyEndTimer = 0;
  }

  // ============================================================================
  // Snapshots
  // ============================================================================

  /**
   * Create a snapshot of the current state
   */
  createSnapshot(label?: string): SimSnapshot {
    const snapshot: SimSnapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      world: cloneWorldState(this._world),
      label,
    };
    this._snapshots.push(snapshot);
    this._emitEvent({ type: "snapshot", world: this._world, data: snapshot });
    return snapshot;
  }

  /**
   * Restore from a snapshot
   */
  restoreSnapshot(snapshotOrId: SimSnapshot | string): boolean {
    const snapshot =
      typeof snapshotOrId === "string"
        ? this._snapshots.find((s) => s.id === snapshotOrId)
        : snapshotOrId;

    if (!snapshot) return false;

    this._world = cloneWorldState(snapshot.world);
    return true;
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): SimSnapshot[] {
    return [...this._snapshots];
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this._snapshots = [];
  }

  /**
   * Export world state as JSON
   */
  exportState(): string {
    return serializeWorldState(this._world);
  }

  /**
   * Import world state from JSON
   */
  importState(json: string): void {
    this._world = deserializeWorldState(json);
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to simulation events
   */
  subscribe(callback: SimEventCallback): () => void {
    this._eventListeners.add(callback);
    return () => {
      this._eventListeners.delete(callback);
    };
  }

  private _emitEvent(event: Parameters<SimEventCallback>[0]): void {
    for (const listener of this._eventListeners) {
      listener(event);
    }
  }

  // ============================================================================
  // Utility
  // ============================================================================

  /**
   * Get a player by ID
   */
  getPlayer(playerId: PlayerId): PlayerState | undefined {
    return getPlayerById(this._world, playerId);
  }

  /**
   * Get all players for a team
   */
  getTeamPlayers(team: TeamSide): PlayerState[] {
    return this._world.players.filter((p) => p.team === team);
  }

  /**
   * Get active players
   */
  getActivePlayers(): PlayerState[] {
    return this._world.players.filter((p) => p.active);
  }

  /**
   * Get ball position
   */
  getBallPosition(): Vec2 {
    return { ...this._world.ball.position };
  }

  /**
   * Check if we're in whiteboard mode (paused)
   */
  isWhiteboardMode(): boolean {
    return this._isPaused;
  }

  /**
   * Check if we're in simulation mode (running)
   */
  isSimulationMode(): boolean {
    return !this._isPaused;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new SimController instance
 */
export const createSimController = (
  options: SimControllerOptions = {}
): SimController => {
  return new SimController(options);
};

