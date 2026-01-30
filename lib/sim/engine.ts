// Volleyball Simulation Engine
// Refactored to use BallFlight system for realistic ball movement

import type { Rotation } from "@/lib/types";
import type {
  Blackboard,
  BallState,
  CourtModel,
  PlayerState,
  TeamSide,
  ThoughtMessage,
  ThoughtCategory,
  ThoughtVerbosity,
  GoalType,
  Vec2,
} from "@/lib/sim/types";
import { DEFAULT_COURT, vec2, DEFAULT_PLAYER_SKILLS } from "@/lib/sim/types";
import { createInitialFSM, reduceFSM } from "@/lib/sim/fsm";
import type { RallyFSMState } from "@/lib/sim/fsm";
import type { BTNode } from "@/lib/sim/bt";
import {
  createLiberoTree,
  createMiddleTree,
  createOppositeTree,
  createOutsideTree,
  createSetterTree,
} from "@/lib/sim/ai/trees";
import { buildRotationResponsibilities, getServerRole, getHitterMode } from "@/lib/sim/rotation";
import { getRotationPositions } from "@/lib/model/loader";
import type { WorldState } from "@/lib/sim/world";
import { stepTick } from "@/lib/sim/tick";
import type { DecisionTrace } from "@/lib/sim/trace";
import type { Intent } from "@/lib/sim/intent";
import type { BallFlight, BallContactType } from "@/lib/sim/ball";
import {
  createBallFlight,
  getBallFlightPosition,
  isBallFlightComplete,
  getSettingZone,
  getAttackTarget,
  FLIGHT_CONFIGS,
} from "@/lib/sim/ball";
import {
  createBallContactEvent,
  createPhaseChangeEvent,
  createBallCrossedNetEvent,
  createRallyEndEvent,
} from "@/lib/sim/gameEvents";

type PlayerBrain = {
  id: string;
  tree: BTNode;
};

const CONTACT_RADIUS = 0.08; // Normalized distance for ball contact

const categoryPriority = (category: PlayerState["category"]): number => {
  if (category === "SETTER") return 1;
  if (category === "LIBERO") return 2;
  if (category === "OUTSIDE") return 3;
  if (category === "OPPOSITE") return 4;
  return 5;
};

const roleCategory = (role: PlayerState["role"]): PlayerState["category"] => {
  if (role === "S") return "SETTER";
  if (role === "OPP") return "OPPOSITE";
  if (role === "OH1" || role === "OH2") return "OUTSIDE";
  if (role === "MB1" || role === "MB2") return "MIDDLE";
  return "LIBERO";
};

const getDefaultMaxSpeed = (category: PlayerState["category"]): number => {
  if (category === "MIDDLE") return 0.9;
  if (category === "SETTER") return 1.05;
  return 1;
};

const teamSideForPoint = (court: CourtModel, p: Vec2): TeamSide => {
  return p.y >= court.netY ? "HOME" : "AWAY";
};

const randomLane = (): "left" | "middle" | "right" => {
  const r = Math.random();
  if (r < 0.33) return "left";
  if (r < 0.66) return "middle";
  return "right";
};

/**
 * VolleyballSimEngine - Main simulation engine with BallFlight system
 */
export class VolleyballSimEngine {
  readonly court: CourtModel;
  rotation: Rotation;
  homeRotation: Rotation;
  awayRotation: Rotation;
  players: PlayerState[];
  private brains: PlayerBrain[];
  ball: BallState;
  private currentFlight: BallFlight | null = null;
  private ballHeight: number = 0; // Visual height for ball shadow
  fsm: RallyFSMState;
  simTimeMs: number;
  thoughtsVersion: number;
  private thoughtsByPlayer: Record<string, ThoughtMessage[]>;
  private lastThoughtKeyByPlayer: Record<string, string>;
  private rallyEndTimer: number;

  // Spectate mode
  spectateMode: boolean = false;
  private autoServeTimer: number = 0;

  // Libero substitution control
  useLibero: boolean = false;

  // Contact flash effect
  private lastContactTimeMs: number = 0;

  // Track last tick result for explainability
  private lastTickIntents: Intent[] = [];
  private lastTickTraces: DecisionTrace[] = [];

  // Error callback for error handling
  onError?: (error: Error) => void;

  // Rally end callback - fires when a rally ends (for pause-on-rally-end)
  onRallyEnd?: (result: { winner: TeamSide; reason: string }) => void;

  constructor(params?: { court?: CourtModel; rotation?: Rotation; onError?: (error: Error) => void }) {
    this.court = params?.court ?? DEFAULT_COURT;
    this.rotation = params?.rotation ?? 1;
    this.onError = params?.onError;
    this.homeRotation = 1;
    this.awayRotation = 1;
    this.players = [];
    this.brains = [];
    this.ball = {
      position: { x: 0.5, y: this.court.netY + 0.28 },
      velocity: { x: 0, y: 0 },
      predicted_landing: { x: 0.5, y: this.court.netY + 0.28 },
      touch_count: 0,
      on_our_side: true,
    };
    this.currentFlight = null;
    this.fsm = createInitialFSM("HOME");
    this.simTimeMs = 0;
    this.thoughtsVersion = 0;
    this.thoughtsByPlayer = {};
    this.lastThoughtKeyByPlayer = {};
    this.rallyEndTimer = 0;

    this.resetPlayers();
    this.resetRally();
  }

  /**
   * Get ball visual height (for shadow effect)
   */
  getBallHeight(): number {
    return this.ballHeight;
  }

  /**
   * Check if ball was recently contacted (for flash effect)
   */
  wasRecentContact(withinMs: number = 150): boolean {
    return this.simTimeMs - this.lastContactTimeMs < withinMs;
  }

  /**
   * Get current WorldState (for integration with new architecture)
   */
  getWorldState(): WorldState {
    return {
      tick: Math.floor(this.simTimeMs / (1000 / 60)),
      timeMs: this.simTimeMs,
      ball: { ...this.ball },
      players: this.players.map((p) => ({ ...p })),
      fsm: { ...this.fsm },
      court: this.court,
      homeRotation: this.homeRotation,
      awayRotation: this.awayRotation,
      serving: this.fsm.serving,
    };
  }

  /**
   * Apply a WorldState to the engine
   */
  applyWorldState(world: WorldState): void {
    this.simTimeMs = world.timeMs;
    this.ball = { ...world.ball };
    this.players = world.players.map((p) => ({ ...p }));
    this.fsm = { ...world.fsm };
    this.homeRotation = world.homeRotation;
    this.awayRotation = world.awayRotation;
    this.rotation = world.homeRotation;
  }

  /**
   * Get the last tick's intents (for explainability UI)
   */
  getLastIntents(): Intent[] {
    return this.lastTickIntents;
  }

  /**
   * Get the last tick's decision traces (for explainability UI)
   */
  getLastTraces(): DecisionTrace[] {
    return this.lastTickTraces;
  }

  resetPlayers() {
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

    const canonicalPositions = getRotationPositions(this.homeRotation);
    const awayCanonicalPositions = getRotationPositions(this.awayRotation);

    const getCanonicalPosition = (
      role: PlayerState["role"],
      team: TeamSide,
      positions: Record<string, { x: number; y: number }> | null
    ): Vec2 => {
      if (positions && role in positions) {
        const pos = positions[role];
        if (team === "HOME") {
          return { x: pos.x, y: pos.y };
        } else {
          return { x: pos.x, y: 1.0 - pos.y };
        }
      }
      const jitter = (): number => (Math.random() - 0.5) * 0.06;
      const baseY = team === "HOME" ? 0.8333 : 0.1667;
      const defaultX =
        role === "S"
          ? 0.8333
          : role === "OH1"
          ? 0.1667
          : role === "OH2"
          ? 0.5
          : role === "MB1"
          ? 0.5
          : role === "MB2"
          ? 0.8333
          : 0.8333;
      return { x: defaultX + jitter(), y: baseY + jitter() };
    };

    // Create libero player with initial active state based on useLibero setting
    const makeLiberoPlayer = (params: {
      id: string;
      team: TeamSide;
      position: Vec2;
    }): PlayerState => {
      const player = makePlayer({ ...params, role: "L" });
      // Liberos start inactive unless useLibero is enabled
      if (!this.useLibero) {
        return { ...player, active: false, position: { x: -1, y: -1 } };
      }
      return player;
    };

    const home: PlayerState[] = [
      makePlayer({ id: "H-S", team: "HOME", role: "S", position: getCanonicalPosition("S", "HOME", canonicalPositions) }),
      makePlayer({ id: "H-OH1", team: "HOME", role: "OH1", position: getCanonicalPosition("OH1", "HOME", canonicalPositions) }),
      makePlayer({ id: "H-OH2", team: "HOME", role: "OH2", position: getCanonicalPosition("OH2", "HOME", canonicalPositions) }),
      makePlayer({ id: "H-MB1", team: "HOME", role: "MB1", position: getCanonicalPosition("MB1", "HOME", canonicalPositions) }),
      makePlayer({ id: "H-MB2", team: "HOME", role: "MB2", position: getCanonicalPosition("MB2", "HOME", canonicalPositions) }),
      makePlayer({ id: "H-OPP", team: "HOME", role: "OPP", position: getCanonicalPosition("OPP", "HOME", canonicalPositions) }),
      makeLiberoPlayer({ id: "H-L", team: "HOME", position: getCanonicalPosition("L", "HOME", canonicalPositions) }),
    ];

    const away: PlayerState[] = [
      makePlayer({ id: "A-S", team: "AWAY", role: "S", position: getCanonicalPosition("S", "AWAY", awayCanonicalPositions) }),
      makePlayer({ id: "A-OH1", team: "AWAY", role: "OH1", position: getCanonicalPosition("OH1", "AWAY", awayCanonicalPositions) }),
      makePlayer({ id: "A-OH2", team: "AWAY", role: "OH2", position: getCanonicalPosition("OH2", "AWAY", awayCanonicalPositions) }),
      makePlayer({ id: "A-MB1", team: "AWAY", role: "MB1", position: getCanonicalPosition("MB1", "AWAY", awayCanonicalPositions) }),
      makePlayer({ id: "A-MB2", team: "AWAY", role: "MB2", position: getCanonicalPosition("MB2", "AWAY", awayCanonicalPositions) }),
      makePlayer({ id: "A-OPP", team: "AWAY", role: "OPP", position: getCanonicalPosition("OPP", "AWAY", awayCanonicalPositions) }),
      makeLiberoPlayer({ id: "A-L", team: "AWAY", position: getCanonicalPosition("L", "AWAY", awayCanonicalPositions) }),
    ];

    this.players = [...home, ...away];
    this.brains = this.players.map((p) => ({
      id: p.id,
      tree: this.createTreeForPlayer(p),
    }));
    for (const p of this.players) {
      if (!this.thoughtsByPlayer[p.id]) this.thoughtsByPlayer[p.id] = [];
    }
  }

  resetRally(serving: TeamSide = this.fsm.serving) {
    const homeScore = this.fsm.homeScore;
    const awayScore = this.fsm.awayScore;

    this.fsm = createInitialFSM(serving, homeScore, awayScore);
    this.currentFlight = null;
    this.ballHeight = 0;
    this.ball.position = { x: 0.5, y: serving === "HOME" ? 0.92 : 0.08 };
    this.ball.velocity = { x: 0, y: 0 };
    this.ball.predicted_landing = {
      x: 0.5,
      y: serving === "HOME" ? 0.14 : 0.86,
    };

    // In spectate mode, auto-serve after a delay
    if (this.spectateMode) {
      this.autoServeTimer = 1500; // 1.5 second delay before auto-serve
    }
  }

  serve() {
    if (this.fsm.phase !== "PRE_SERVE") return;

    const server = this.getServerPlayer();
    this.fsm = reduceFSM(this.fsm, { type: "SERVE_CONTACT", playerId: server?.id ?? "unknown" });
    const receiving: TeamSide = this.fsm.serving === "HOME" ? "AWAY" : "HOME";
    const lane = randomLane();

    // Calculate serve target
    const targetY = receiving === "HOME" ? this.court.netY + 0.36 : this.court.netY - 0.36;
    const targetX = lane === "left" ? 0.25 : lane === "right" ? 0.75 : 0.5;
    const target = vec2.clamp(
      { x: targetX + (Math.random() - 0.5) * 0.1, y: targetY + (Math.random() - 0.5) * 0.05 },
      this.court.boundsMin,
      this.court.boundsMax
    );

    // Create serve flight
    this.currentFlight = createBallFlight({
      origin: { ...this.ball.position },
      target,
      startTimeMs: this.simTimeMs,
      contactType: "serve",
    });

    this.ball.predicted_landing = target;
    this.lastContactTimeMs = this.simTimeMs;
  }

  /**
   * Toggle spectate mode (auto-play)
   */
  setSpectateMode(enabled: boolean) {
    this.spectateMode = enabled;
    if (enabled && this.fsm.phase === "PRE_SERVE") {
      this.autoServeTimer = 500;
    }
  }

  /**
   * Enable/disable libero substitution
   */
  setUseLibero(enabled: boolean) {
    this.useLibero = enabled;
    // Immediately apply or revert substitution
    if (enabled) {
      this.applyLiberoSubstitution();
    } else {
      this.revertLiberoSubstitution();
    }
  }

  /**
   * Revert libero substitution - reactivate all MBs and deactivate liberos
   */
  private revertLiberoSubstitution() {
    this.players = this.players.map((p) => {
      if (p.role === "L") {
        // Deactivate liberos
        return { ...p, active: false, position: { x: -1, y: -1 } };
      }
      if (p.role === "MB1" || p.role === "MB2") {
        // Reactivate all middle blockers with valid positions if needed
        if (!p.active || p.position.x < 0) {
          const canonicalPositions = getRotationPositions(
            p.team === "HOME" ? this.homeRotation : this.awayRotation
          );
          const defaultPos = canonicalPositions?.[p.role] || { x: 0.5, y: p.team === "HOME" ? 0.8 : 0.2 };
          return {
            ...p,
            active: true,
            position: p.team === "HOME" ? defaultPos : { x: defaultPos.x, y: 1.0 - defaultPos.y }
          };
        }
      }
      return p;
    });
  }

  /**
   * Validate a position vector and clamp to court bounds
   */
  private validatePosition(pos: Vec2, label: string): Vec2 {
    if (!isFinite(pos.x) || !isFinite(pos.y)) {
      console.warn(`Invalid position for ${label}: (${pos.x}, ${pos.y}), resetting to center`);
      return { x: 0.5, y: 0.5 };
    }
    return vec2.clamp(pos, this.court.boundsMin, this.court.boundsMax);
  }

  /**
   * Step the simulation forward by dt seconds.
   */
  step(dt: number) {
    try {
      // Validate dt input
      if (!isFinite(dt) || dt < 0 || dt > 1) {
        console.error(`Invalid dt: ${dt}, clamping to safe range`);
        dt = Math.max(0, Math.min(0.1, dt));
      }

      this.simTimeMs += Math.round(dt * 1000);

      // Handle rally end timer for auto-restart
      if (this.rallyEndTimer > 0) {
        this.rallyEndTimer -= dt * 1000;
        if (this.rallyEndTimer <= 0) {
          this.rallyEndTimer = 0;
          this.handlePointEnd();
          return;
        }
        return;
      }

      // Handle auto-serve in spectate mode
      if (this.spectateMode && this.autoServeTimer > 0) {
        this.autoServeTimer -= dt * 1000;
        if (this.autoServeTimer <= 0) {
          this.autoServeTimer = 0;
          if (this.fsm.phase === "PRE_SERVE") {
            this.serve();
          }
        }
      }

      // Apply libero substitution only if enabled
      if (this.useLibero) {
        this.applyLiberoSubstitution();
      }

      // During PRE_SERVE, position ball with the server
      if (this.fsm.phase === "PRE_SERVE") {
        this.positionBallWithServer();
      }

      // Update ball using flight system
      if (this.fsm.phase !== "PRE_SERVE" && this.fsm.phase !== "BALL_DEAD") {
        this.stepBallFlight();
      }

      // Use the tick pipeline for AI decisions and movement
      const world = this.getWorldState();
      const tickResult = stepTick(world, { dt, commit: true });

      // Store for explainability
      this.lastTickIntents = tickResult.intents;
      this.lastTickTraces = tickResult.traces;

      // Apply the result
      this.players = tickResult.nextWorld.players;

      // Extract thoughts from traces
      this.extractThoughtsFromTraces(tickResult.traces);
    } catch (error) {
      console.error('Simulation error in step():', error);
      // Graceful degradation: freeze simulation instead of crashing
      this.fsm.phase = 'BALL_DEAD';
      // Notify error handler if provided
      if (this.onError) {
        this.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Handle point end - rotation and reset
   */
  private handlePointEnd() {
    const newServing = this.fsm.serving;

    // Rotate if serving team won
    if (newServing === "HOME") {
      this.homeRotation = ((this.homeRotation % 6) + 1) as Rotation;
    } else {
      this.awayRotation = ((this.awayRotation % 6) + 1) as Rotation;
    }

    this.rotation = this.homeRotation;
    this.resetPlayers();
    this.resetRally(newServing);
  }

  /**
   * Step ball using flight system with contact detection
   */
  private stepBallFlight() {
    if (!this.currentFlight) return;

    const flightResult = getBallFlightPosition(this.currentFlight, this.simTimeMs);
    if (!flightResult) return;

    const { position, progress, velocity, height } = flightResult;

    this.ball.position = position;
    this.ball.velocity = velocity;
    this.ballHeight = height;

    // Check if ball has crossed the net
    if (!this.currentFlight.crossedNet) {
      const originSide = teamSideForPoint(this.court, this.currentFlight.origin);
      const currentSide = teamSideForPoint(this.court, position);

      if (originSide !== currentSide) {
        this.currentFlight.crossedNet = true;
        if (this.fsm.phase === "SERVE_IN_AIR" || this.fsm.phase === "ATTACK_PHASE") {
          this.fsm = reduceFSM(this.fsm, { type: "BALL_CROSSED_NET", fromSide: originSide });

          // Broadcast ball crossed net event
          const netCrossEvent = createBallCrossedNetEvent({
            fromSide: originSide,
            timeMs: this.simTimeMs,
          });
          this.broadcastGameEvent(netCrossEvent);
        }
      }
    }

    // Check for player contact when ball is close to target (80%+ progress)
    if (progress >= 0.75) {
      const contactingPlayer = this.findContactingPlayer(position);
      if (contactingPlayer) {
        this.handlePlayerContact(contactingPlayer);
        return;
      }
    }

    // Check if flight is complete without contact (ball landed)
    if (isBallFlightComplete(this.currentFlight, this.simTimeMs)) {
      this.handleBallLanded();
    }
  }

  /**
   * Find a player within contact radius of the ball
   */
  private findContactingPlayer(ballPos: Vec2): PlayerState | null {
    const ballSide = teamSideForPoint(this.court, ballPos);

    // Only players on the ball's side can contact
    const eligiblePlayers = this.players.filter(
      (p) => p.active && p.team === ballSide
    );

    let closest: PlayerState | null = null;
    let closestDist = CONTACT_RADIUS;

    for (const player of eligiblePlayers) {
      const dist = vec2.len(vec2.sub(player.position, ballPos));
      if (dist < closestDist) {
        closest = player;
        closestDist = dist;
      }
    }

    return closest;
  }

  /**
   * Handle a player contacting the ball
   */
  private handlePlayerContact(player: PlayerState) {
    const contactingTeam = player.team;
    const phase = this.fsm.phase;
    const currentTouchCount = this.fsm.lastTouchTeam === contactingTeam ? this.fsm.touchCount : 0;

    // Determine contact type based on phase and touch count
    let contactType: "pass" | "set" | "attack" | "dig" | "block" | "freeball" | "serve" = "pass";
    if (phase === "SERVE_RECEIVE" && currentTouchCount === 0) {
      contactType = "pass";
    } else if (phase === "DEFENSE_PHASE" && currentTouchCount === 0) {
      contactType = "dig";
    } else if (currentTouchCount === 1) {
      contactType = "set";
    } else if (currentTouchCount === 2) {
      contactType = "attack";
    }

    // Update FSM with touch event (using "good" quality for now - will be computed properly in Phase 4)
    const previousPhase = this.fsm.phase;
    this.fsm = reduceFSM(this.fsm, {
      type: "TEAM_TOUCHED_BALL",
      team: contactingTeam,
      playerId: player.id,
      contactType,
      quality: "good",
      timeMs: this.simTimeMs,
    });

    this.lastContactTimeMs = this.simTimeMs;

    // Broadcast ball contact event to all players
    if (this.fsm.lastContact) {
      const contactEvent = createBallContactEvent({
        contact: this.fsm.lastContact,
        timeMs: this.simTimeMs,
      });
      this.broadcastGameEvent(contactEvent);
    }

    // Broadcast phase change event if phase changed
    const newPhase = this.fsm.phase;
    if (newPhase !== previousPhase) {
      const phaseEvent = createPhaseChangeEvent({
        newPhase,
        timeMs: this.simTimeMs,
      });
      this.broadcastGameEvent(phaseEvent);
    }

    // Determine next flight based on current phase and touch count
    const touchCount = this.fsm.touchCount;

    let nextTarget: Vec2;
    let nextContactType: BallContactType;

    if (newPhase === "TRANSITION_TO_OFFENSE" && touchCount === 1) {
      // First touch - pass to setter zone
      nextContactType = phase === "SERVE_RECEIVE" ? "pass" : "dig";
      nextTarget = getSettingZone(contactingTeam, this.court.netY);
    } else if (newPhase === "SET_PHASE" && touchCount === 2) {
      // Second touch - set to attacker
      nextContactType = "set";
      const attackLane = randomLane();
      const attackY = contactingTeam === "HOME" ? this.court.netY + 0.06 : this.court.netY - 0.06;
      nextTarget = {
        x: attackLane === "left" ? 0.22 : attackLane === "right" ? 0.82 : 0.52,
        y: attackY,
      };
    } else if (newPhase === "ATTACK_PHASE" && touchCount === 3) {
      // Third touch - attack across net
      nextContactType = "attack";
      const defendingSide: TeamSide = contactingTeam === "HOME" ? "AWAY" : "HOME";
      const attackLane = randomLane();
      nextTarget = getAttackTarget(defendingSide, attackLane, this.court.netY);
    } else {
      // Default: keep ball on same side, send toward setter zone
      nextContactType = touchCount === 1 ? "pass" : touchCount === 2 ? "set" : "freeball";
      nextTarget = getSettingZone(contactingTeam, this.court.netY);
    }

    // Clamp target to court bounds
    nextTarget = vec2.clamp(nextTarget, this.court.boundsMin, this.court.boundsMax);

    // Create new flight from current ball position
    this.currentFlight = createBallFlight({
      origin: { ...this.ball.position },
      target: nextTarget,
      startTimeMs: this.simTimeMs,
      contactType: nextContactType,
    });

    this.ball.predicted_landing = nextTarget;
  }

  /**
   * Handle ball landing on ground (no contact)
   */
  private handleBallLanded() {
    if (!this.currentFlight) return;

    const landingPos = this.currentFlight.target;

    // Check if out of bounds
    const outOfBounds =
      landingPos.x < this.court.boundsMin.x ||
      landingPos.x > this.court.boundsMax.x ||
      landingPos.y < this.court.boundsMin.y ||
      landingPos.y > this.court.boundsMax.y;

    if (outOfBounds) {
      // Last touching team loses
      const winner: TeamSide = this.fsm.lastTouchTeam === "HOME" ? "AWAY" : "HOME";
      this.fsm = reduceFSM(this.fsm, {
        type: "BALL_DEAD",
        reason: "error_out",
        winner,
      });

      // Broadcast rally end event
      const rallyEndEvent = createRallyEndEvent({
        reason: "error_out",
        winner,
        timeMs: this.simTimeMs,
      });
      this.broadcastGameEvent(rallyEndEvent);

      // Fire rally end callback for pause-on-rally-end
      this.onRallyEnd?.({ winner, reason: "error_out" });
    } else {
      // Ball landed in bounds - determine reason based on phase
      const ballSide = teamSideForPoint(this.court, landingPos);
      const winner: TeamSide = ballSide === "HOME" ? "AWAY" : "HOME";
      const lastContactType = this.fsm.lastContact?.type;

      // Determine the reason based on context
      let reason: "ace" | "kill" | "block_kill" | "ball_landed" = "ball_landed";
      if (this.fsm.phase === "SERVE_IN_AIR" || this.fsm.phase === "SERVE_RECEIVE") {
        reason = "ace";
      } else if (lastContactType === "attack") {
        reason = "kill";
      } else if (lastContactType === "block") {
        reason = "block_kill";
      }

      this.fsm = reduceFSM(this.fsm, {
        type: "BALL_DEAD",
        reason,
        winner,
      });

      // Broadcast rally end event
      const rallyEndEvent = createRallyEndEvent({
        reason,
        winner,
        timeMs: this.simTimeMs,
      });
      this.broadcastGameEvent(rallyEndEvent);

      // Fire rally end callback for pause-on-rally-end
      this.onRallyEnd?.({ winner, reason });
    }

    this.currentFlight = null;
    this.rallyEndTimer = 2000;
  }

  /**
   * Extract thought messages from decision traces
   * Infers category and verbosity from the thought content and context
   */
  private extractThoughtsFromTraces(traces: DecisionTrace[]) {
    for (const trace of traces) {
      if (trace.selectedIntent && trace.selectedIntent.reason) {
        const player = this.players.find((p) => p.id === trace.playerId);
        if (player) {
          const goal = trace.selectedIntent.action.type === "REQUEST_GOAL"
            ? trace.selectedIntent.action.goal
            : undefined;

          // Infer category from the thought content and goal
          const category = this.inferThoughtCategory(trace.selectedIntent.reason, goal);
          const verbosity = this.inferThoughtVerbosity(category, trace.selectedIntent.reason);

          this.publishPlayerThought({
            player,
            content: trace.selectedIntent.reason,
            goal,
            category,
            verbosity,
            btNode: trace.rootTrace?.nodeName,
          });
        }
      }
    }
  }

  /**
   * Infer thought category from content and goal
   */
  private inferThoughtCategory(
    content: string,
    goal?: GoalType
  ): ThoughtCategory {
    const lowerContent = content.toLowerCase();

    // Coverage-related thoughts
    if (lowerContent.includes("coverage") || lowerContent.includes("collapsing")) {
      return "coverage";
    }

    // Spatial reads (block, gap, positioning)
    if (
      lowerContent.includes("gap") ||
      lowerContent.includes("block") ||
      lowerContent.includes("seam") ||
      lowerContent.includes("reading")
    ) {
      return "spatial_read";
    }

    // System state (in-system, out-of-system, pass quality)
    if (
      lowerContent.includes("in-system") ||
      lowerContent.includes("out-of-system") ||
      lowerContent.includes("pass quality") ||
      lowerContent.includes("off target")
    ) {
      return "system_state";
    }

    // Timing cues
    if (
      lowerContent.includes("approach") ||
      lowerContent.includes("starting") ||
      lowerContent.includes("timing")
    ) {
      return "timing_cue";
    }

    // Role decisions (closest, taking it, mine)
    if (
      lowerContent.includes("closest") ||
      lowerContent.includes("taking") ||
      lowerContent.includes("i can reach")
    ) {
      return "role_decision";
    }

    // Phase reactions (transitioning, ball crossed)
    if (
      lowerContent.includes("transitioning") ||
      lowerContent.includes("ball crossed") ||
      lowerContent.includes("releasing")
    ) {
      return "phase_reaction";
    }

    // Default to goal_change for most intent-based thoughts
    if (goal) {
      return "goal_change";
    }

    return "goal_change";
  }

  /**
   * Infer verbosity level from category and content
   */
  private inferThoughtVerbosity(
    category: ThoughtCategory,
    content: string
  ): ThoughtVerbosity {
    // Essential: Major actions users always want to see
    const essentialPatterns = [
      "setting to",
      "attacking",
      "serving",
      "passing",
      "blocking",
      "digging",
    ];
    if (essentialPatterns.some((p) => content.toLowerCase().includes(p))) {
      return "essential";
    }

    // Standard: Phase reactions and system state
    if (category === "phase_reaction" || category === "system_state") {
      return "standard";
    }

    // Detailed: Spatial reads, timing cues, coverage
    if (
      category === "spatial_read" ||
      category === "timing_cue" ||
      category === "coverage"
    ) {
      return "detailed";
    }

    // Debug: Internal state
    if (category === "debug") {
      return "debug";
    }

    // Default to standard for goal changes
    return "standard";
  }

  getThoughtsForPlayer(playerId: string): ThoughtMessage[] {
    return this.thoughtsByPlayer[playerId] ?? [];
  }

  private publishPlayerThought(params: {
    player: PlayerState;
    content: string;
    goal?: NonNullable<ThoughtMessage["meta"]>["goal"];
    category?: ThoughtCategory;
    verbosity?: ThoughtVerbosity;
    btNode?: string;
    trigger?: string;
  }) {
    const { player, content, goal, category, verbosity, btNode, trigger } = params;
    const phase = this.fsm.phase;
    const key = `${phase}:${goal ?? "none"}:${content}`;
    if (this.lastThoughtKeyByPlayer[player.id] === key) return;
    this.lastThoughtKeyByPlayer[player.id] = key;

    const msg: ThoughtMessage = {
      id: `${player.id}-${this.simTimeMs}-${Math.random().toString(16).slice(2)}`,
      role: "assistant",
      content,
      createdAtMs: this.simTimeMs,
      category: category ?? "goal_change",
      verbosity: verbosity ?? "standard",
      meta: {
        playerId: player.id,
        team: player.team,
        simRole: player.role,
        phase,
        goal,
        btNode,
        trigger,
      },
    };
    const list = this.thoughtsByPlayer[player.id] ?? [];
    list.push(msg);
    this.thoughtsByPlayer[player.id] = list.slice(-200);
    this.thoughtsVersion += 1;
  }

  /**
   * Broadcast a game event to all players' thought streams
   */
  private broadcastGameEvent(event: ThoughtMessage) {
    for (const player of this.players) {
      const list = this.thoughtsByPlayer[player.id] ?? [];
      list.push(event);
      this.thoughtsByPlayer[player.id] = list.slice(-200);
    }
    this.thoughtsVersion += 1;
  }

  private createTreeForPlayer(player: PlayerState): BTNode {
    if (player.category === "SETTER") return createSetterTree();
    if (player.category === "LIBERO") return createLiberoTree();
    if (player.category === "MIDDLE") return createMiddleTree();
    if (player.category === "OPPOSITE") return createOppositeTree();
    return createOutsideTree({ side: "left" });
  }

  private buildBlackboardForTeam(team: TeamSide): Blackboard {
    const fsmPhase = this.fsm.phase;
    const side = team;

    const touchCount =
      this.fsm.lastTouchTeam === side ? this.fsm.touchCount : 0;
    const ballOnSide = teamSideForPoint(this.court, this.ball.position) === side;

    const setter = this.players.find(
      (p) => p.team === side && p.category === "SETTER"
    );
    const setterId = setter?.id ?? (side === "HOME" ? "H-S" : "A-S");

    const teamRotation = side === "HOME" ? this.homeRotation : this.awayRotation;

    const rotationInfo = buildRotationResponsibilities({
      rotation: teamRotation,
      team: side,
      lineupByRole: {
        S: setterId,
        OH1: this.players.find((p) => p.team === side && p.role === "OH1")?.id,
        OH2: this.players.find((p) => p.team === side && p.role === "OH2")?.id,
        MB1: this.players.find((p) => p.team === side && p.role === "MB1")?.id,
        MB2: this.players.find((p) => p.team === side && p.role === "MB2")?.id,
        OPP: this.players.find((p) => p.team === side && p.role === "OPP")?.id,
        L: this.players.find((p) => p.team === side && p.role === "L")?.id,
      },
      liberoId: this.players.find((p) => p.team === side && p.role === "L")?.id,
    });

    const isOurServe = this.fsm.serving === side;
    const serverRole = getServerRole(teamRotation);
    const serverPlayer = this.players.find(
      (p) => p.team === side && p.role === serverRole
    );
    const serverId = serverPlayer?.id ?? null;

    return {
      ball: {
        position: this.ball.position,
        velocity: this.ball.velocity,
        predicted_landing: this.ball.predicted_landing,
        touch_count: touchCount,
        on_our_side: ballOnSide,
      },
      fsm: { phase: fsmPhase },
      rotation: {
        index: teamRotation,
        front_row_players: rotationInfo.frontRowPlayers,
        hitterMode: getHitterMode(teamRotation),
      },
      team: { setter_id: setterId },
      opponent: {
        attack_lane: this.opponentLaneFromBallTarget(),
      },
      override: { active: false },
      serving: {
        isOurServe,
        serverId,
      },
    };
  }

  private opponentLaneFromBallTarget(): "left" | "middle" | "right" {
    const x = this.ball.predicted_landing.x;
    if (x < 0.4) return "left";
    if (x > 0.6) return "right";
    return "middle";
  }

  private getServerPlayer(): PlayerState | null {
    const servingTeam = this.fsm.serving;
    const teamRotation =
      servingTeam === "HOME" ? this.homeRotation : this.awayRotation;
    const serverRole = getServerRole(teamRotation);
    return (
      this.players.find(
        (p) => p.team === servingTeam && p.role === serverRole
      ) ?? null
    );
  }

  private positionBallWithServer() {
    const server = this.getServerPlayer();
    if (!server) return;

    // Position at 2:30 on clock face (right side, slightly up from center)
    // This matches the whiteboard mode positioning
    this.ball.position = {
      x: server.position.x + 0.04,  // Right side
      y: server.position.y - 0.03,  // Slightly up
    };
    this.ball.velocity = { x: 0, y: 0 };
    // Set visual height so ball appears held by server (not on ground)
    this.ballHeight = 0.15; // Roughly shoulder/arm height
  }

  private applyLiberoSubstitution() {
    const applyForTeam = (team: TeamSide) => {
      const libero = this.players.find(
        (p) => p.team === team && p.role === "L"
      );
      const mb1 = this.players.find(
        (p) => p.team === team && p.role === "MB1"
      );
      const mb2 = this.players.find(
        (p) => p.team === team && p.role === "MB2"
      );
      if (!libero || !mb1 || !mb2) return;

      const bb = this.buildBlackboardForTeam(team);
      const frontRow = bb.rotation.front_row_players;

      const mb1Front = frontRow.includes(mb1.id);
      const mb2Front = frontRow.includes(mb2.id);

      const replaced =
        mb1Front && !mb2Front ? mb2 : !mb1Front && mb2Front ? mb1 : mb2;

      this.players = this.players.map((p) => {
        if (p.id === libero.id) return { ...p, active: true };
        if (p.id === replaced.id)
          return {
            ...p,
            active: false,
            position: { x: -1, y: -1 },
            velocity: { x: 0, y: 0 },
          };
        return {
          ...p,
          active: p.active && p.position.x >= 0 && p.position.y >= 0,
        };
      });
    };

    applyForTeam("HOME");
    applyForTeam("AWAY");
  }
}
