// Goal-driven volleyball simulation core types (client-only, ES modules).

import type { Role, Rotation } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

export type TeamSide = "HOME" | "AWAY";

export type SimRoleCategory =
  | "SETTER"
  | "OUTSIDE"
  | "MIDDLE"
  | "OPPOSITE"
  | "LIBERO";

export type SimRole = Role | "L";

export type PlayerId = string;

export type Vec2 = {
  x: number;
  y: number;
};

export type Vec3 = {
  x: number;  // Normalized court x (0-1)
  y: number;  // Normalized court y (0-1)
  z: number;  // Height above court (0 = ground, ~0.3 = net height, ~0.4 = attack height)
};

export const vec2 = {
  add: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y }),
  mul: (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s }),
  len: (a: Vec2): number => Math.hypot(a.x, a.y),
  norm: (a: Vec2): Vec2 => {
    const l = Math.hypot(a.x, a.y);
    if (l <= 1e-9) return { x: 0, y: 0 };
    return { x: a.x / l, y: a.y / l };
  },
  clamp: (a: Vec2, min: Vec2, max: Vec2): Vec2 => ({
    x: Math.max(min.x, Math.min(max.x, a.x)),
    y: Math.max(min.y, Math.min(max.y, a.y)),
  }),
  dot: (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y,
  dist: (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y),
};

export const vec3 = {
  add: (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
  sub: (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
  mul: (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s }),
  len: (a: Vec3): number => Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z),
  toVec2: (a: Vec3): Vec2 => ({ x: a.x, y: a.y }),
  fromVec2: (a: Vec2, z: number): Vec3 => ({ x: a.x, y: a.y, z }),
};

export type RallyPhase =
  | "PRE_SERVE"
  | "SERVE_IN_AIR"
  | "SERVE_RECEIVE"
  | "TRANSITION_TO_OFFENSE"
  | "SET_PHASE"
  | "ATTACK_PHASE"
  | "TRANSITION_TO_DEFENSE"
  | "DEFENSE_PHASE"
  | "BALL_DEAD";

export type AttackLane = "left" | "middle" | "right";

export type OverrideGoalType =
  | GoalType
  | "ForcedStartingPosition"
  | "AlternateStackingStrategy"
  | "TemporaryRoleModifier"
  | "SubtreeSuppression";

export type OverrideState =
  | { active: false }
  | {
      active: true;
      goal_type: OverrideGoalType;
      // Optional payload for movement system and/or AI policy.
      payload?: unknown;
    };

// Legacy 2D ball state (used by Blackboard, kept for backward compat)
export type BallState = {
  position: Vec2;
  velocity: Vec2;
  predicted_landing: Vec2;
  touch_count: number;
  on_our_side: boolean;
};

// New 3D ball state with full physics
export type BallFlightPhase = "rising" | "falling" | "grounded";

export type BallState3D = {
  position: Vec3;              // Current 3D position
  velocity: Vec3;              // Current 3D velocity (for physics calculations)
  groundPosition: Vec2;        // Projected ground position (shadow)
  predictedLanding: Vec2;      // Where ball will land
  predictedLandingTimeMs: number;  // When it will land (absolute sim time)
  peakHeight: number;          // Max height of current arc
  flightPhase: BallFlightPhase;
  touchCount: number;          // Touches by current team
  lastTouchTeam: TeamSide | null;
  contactType: BallContactType | null;  // Type of contact that created this flight
};

// Contact types that determine flight characteristics
export type BallContactType =
  | "serve"
  | "pass"
  | "set"
  | "attack"
  | "dig"
  | "block"
  | "freeball";

// Player skill stats (0-1 scale, affects accuracy variance)
export type PlayerSkills = {
  passing: { accuracy: number; power: number };
  setting: { accuracy: number; tempo: number };
  attacking: { accuracy: number; power: number };
  serving: { accuracy: number; power: number };
  blocking: { timing: number; reach: number };
  movement: { speed: number; agility: number };
};

// Default skills for a typical HS varsity player
export const DEFAULT_PLAYER_SKILLS: PlayerSkills = {
  passing: { accuracy: 0.7, power: 0.6 },
  setting: { accuracy: 0.7, tempo: 0.6 },
  attacking: { accuracy: 0.65, power: 0.7 },
  serving: { accuracy: 0.7, power: 0.65 },
  blocking: { timing: 0.6, reach: 0.5 },
  movement: { speed: 0.7, agility: 0.6 },
};

// Contact quality for FSM (Phase 3, but defining type here)
export type ContactQuality = "perfect" | "good" | "poor" | "error";

// Ball dead reasons for rally termination
export type BallDeadReason =
  | "ace"           // Serve not returned
  | "kill"          // Attack not returned
  | "block_kill"    // Ball lands on attacker's side after block
  | "error_net"     // Ball hit into net
  | "error_out"     // Ball hit out of bounds
  | "four_touches"  // Too many touches
  | "double_hit"    // Illegal double contact
  | "ball_landed";  // Generic - ball hit floor

export type HitterMode = "2-hitter" | "3-hitter";

export type RotationBlackboard = {
  index: Rotation;
  front_row_players: PlayerId[];
  // Research-based classification: setter front row (2-hitter) vs back row (3-hitter)
  hitterMode: HitterMode;
};

export type TeamBlackboard = {
  setter_id: PlayerId;
};

export type Blackboard = {
  ball: BallState;
  fsm: { phase: RallyPhase };
  rotation: RotationBlackboard;
  team: TeamBlackboard;
  opponent: { attack_lane: AttackLane };
  override: OverrideState;
  serving: {
    isOurServe: boolean;
    serverId: PlayerId | null;
  };
};

// ============================================================================
// Thought System Types (Phase 4.5)
// Thoughts ARE the simulation's decision log, presented through player cognition
// ============================================================================

/**
 * Thought categories - what triggered the thought
 * Used for filtering and understanding decision sources
 */
export type ThoughtCategory =
  | "goal_change"      // "Moving to block left side"
  | "phase_reaction"   // "Ball crossed net, transitioning to defense"
  | "spatial_read"     // "Saw gap in block, hitting angle"
  | "system_state"     // "Pass was poor, going out-of-system"
  | "role_decision"    // "I'm closest to ball, taking it"
  | "timing_cue"       // "Setter touching ball, starting approach"
  | "coverage"         // "Collapsing for hitter coverage"
  | "quality_assess"   // "Pass quality: good, can run play"
  | "game_event"       // System events like ball contact, phase change
  | "debug";           // Internal state for developers

/**
 * Verbosity levels - who sees what
 * Controls thought visibility based on user preference
 */
export type ThoughtVerbosity = "essential" | "standard" | "detailed" | "debug";

/**
 * Verbosity presets mapping
 * - Beginner: essential only
 * - Standard: essential + standard
 * - Expert: essential + standard + detailed
 * - Debug: all including debug
 */
export const VERBOSITY_PRESETS = {
  beginner: ["essential"] as ThoughtVerbosity[],
  standard: ["essential", "standard"] as ThoughtVerbosity[],
  expert: ["essential", "standard", "detailed"] as ThoughtVerbosity[],
  debug: ["essential", "standard", "detailed", "debug"] as ThoughtVerbosity[],
} as const;

export type VerbosityPreset = keyof typeof VERBOSITY_PRESETS;

// AI-SDK-compatible message shape (future-proof for interactive chat).
export type ThoughtMessage = {
  id: string;
  role: "assistant" | "system" | "game_event"; // Added game_event for timeline markers
  content: string;
  createdAtMs: number;
  // Enhanced thought metadata (Phase 4.5)
  category?: ThoughtCategory;
  verbosity?: ThoughtVerbosity;
  meta?: {
    playerId?: PlayerId;
    team?: TeamSide;
    simRole?: SimRole;
    phase?: RallyPhase;
    goal?: GoalType;
    // Game event specific metadata
    eventType?: "ball_contact" | "phase_change" | "rally_end" | "ball_crossed_net";
    contactType?: BallContactType;
    contactQuality?: ContactQuality;
    actingPlayer?: PlayerId; // Player who performed the action
    // Enhanced metadata (Phase 4.5)
    trigger?: string;       // What caused this thought
    relatedEvent?: string;  // Link to FSM event or contact
    btNode?: string;        // Which BT node generated this thought
  };
};

export type GoalType =
  | "MaintainBaseResponsibility"
  | "ParticipateInLegalStack"
  | "HideBehindPrimaryPasser"
  | "MoveTowardSettingZone"
  | "SetterDump"
  | "EmergencySet"
  | "QuickSetMiddle"
  | "SetToOutside"
  | "SetToOpposite"
  | "HighOutOfSystemSet"
  | "BlockRightSide"
  | "BlockMiddle"
  | "BlockLeftSide"
  | "BlockOpponentOutside"
  | "DefendZoneBiasRightBack"
  | "DefendZoneBiasMiddleBack"
  | "DefendZoneBiasLeftBack"
  | "ReceiveServe"
  | "ApproachAttackLeft"
  | "ApproachAttackRight"
  | "ApproachAttackMiddle"
  | "CoverHitter"
  | "CoverTips"
  | "FreeBallToTarget"
  | "PrepareToServe"
  | "TransitionFromServe"
  // Stacking goals for serve receive (per 5-1 Paper)
  | "StackRightReceivePosition"   // Passers spread for stack-right (R1)
  | "StackMiddleReceivePosition"  // Passers spread for stack-middle (R2)
  | "StackLeftReceivePosition"    // Passers spread for stack-left (R3-6)
  | "PinnedAtNet"                 // Front-row player pinned at net during stack
  | "ComeBackToReceive"           // Front-row player coming back to help receive
  | "FrontRowMiddleHideReceive";  // Middle crouches/slides near stack

export type RequestedGoal = {
  type: GoalType;
  // Optional parameters without requiring BTs to know coordinates.
  params?: Record<string, unknown>;
};

export type PlayerRoleInfo = {
  role: SimRole;
  category: SimRoleCategory;
  team: TeamSide;
};

export type PlayerKinematics = {
  position: Vec2;
  velocity: Vec2;
  maxSpeed: number;
};

export type PlayerState = PlayerRoleInfo &
  PlayerKinematics & {
    id: PlayerId;
    priority: number;
    requestedGoal: RequestedGoal | null;
    baseGoal: RequestedGoal;
    override: OverrideState;
    active: boolean;
    skills: PlayerSkills;  // Player skill stats for accuracy variance
  };

export type CourtModel = {
  // Normalized coordinates: x in [0,1], y in [0,1], net at y = 0.5.
  boundsMin: Vec2;
  boundsMax: Vec2;
  netY: number;
  attackLineOffset: number; // distance from net towards baseline (normalized).
};

export const DEFAULT_COURT: CourtModel = {
  // Bounds include serve area behind baselines
  // Court lines are at 0-1, but players can be at ~1.05 for serve position
  boundsMin: { x: 0, y: -0.05 }, // Allows away serve area
  boundsMax: { x: 1, y: 1.05 },  // Allows home serve area
  netY: 0.5,
  attackLineOffset: 0.1667, // 3m / 18m total length
};

// ============================================================================
// Game & Rally Types (Phase 6)
// ============================================================================

/**
 * Playback mode for the unified single-page experience
 */
export type PlaybackMode =
  | "live"          // Current rally, simulation running
  | "paused"        // Current rally, simulation paused (whiteboard mode)
  | "replay"        // Viewing historical rally, playing
  | "replay_paused"; // Viewing historical rally, paused

/**
 * A snapshot of key simulation state at a specific moment
 * Stored as serialized JSON to avoid circular dependencies
 */
export type WorldSnapshot = {
  tick: number;
  timeMs: number;
  worldStateJson: string; // Serialized WorldState
  trigger: "rally_start" | "ball_contact" | "rally_end" | "phase_change";
};

/**
 * A single rally from start to end
 */
export type Rally = {
  id: string;
  index: number;           // Rally number in the game (1-indexed)
  startTick: number;
  endTick: number | null;  // null if in progress
  winner: TeamSide | null; // null if in progress
  reason: BallDeadReason | null;
  homeRotation: Rotation;  // Rotation at start of rally
  awayRotation: Rotation;
  serving: TeamSide;
  snapshots: WorldSnapshot[];   // Key moments for replay
  thoughts: ThoughtMessage[];   // All thoughts during rally
};

/**
 * A game contains multiple rallies and tracks score
 */
export type Game = {
  id: string;
  createdAt: number;
  homeScore: number;
  awayScore: number;
  currentRallyIndex: number; // Index of rally in progress or most recent
  rallies: Rally[];
  // Rotation state (updated as rallies complete)
  homeRotation: Rotation;
  awayRotation: Rotation;
  serving: TeamSide;
};

/**
 * Create an empty rally
 */
export function createRally(params: {
  id: string;
  index: number;
  startTick: number;
  homeRotation: Rotation;
  awayRotation: Rotation;
  serving: TeamSide;
}): Rally {
  return {
    id: params.id,
    index: params.index,
    startTick: params.startTick,
    endTick: null,
    winner: null,
    reason: null,
    homeRotation: params.homeRotation,
    awayRotation: params.awayRotation,
    serving: params.serving,
    snapshots: [],
    thoughts: [],
  };
}

/**
 * Create a new game
 */
export function createGame(params?: {
  id?: string;
  homeRotation?: Rotation;
  awayRotation?: Rotation;
  serving?: TeamSide;
}): Game {
  return {
    id: params?.id ?? generateUUID(),
    createdAt: Date.now(),
    homeScore: 0,
    awayScore: 0,
    currentRallyIndex: 0,
    rallies: [],
    homeRotation: params?.homeRotation ?? 1,
    awayRotation: params?.awayRotation ?? 1,
    serving: params?.serving ?? "HOME",
  };
}

