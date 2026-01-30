// Tick Pipeline - Unified simulation step with 4 phases
// Sense -> Think -> Propose -> Commit

import type { Rotation, Role } from "@/lib/types";
import type {
  Blackboard,
  BallState,
  CourtModel,
  PlayerId,
  PlayerState,
  TeamSide,
  Vec2,
} from "@/lib/sim/types";
import { vec2 } from "@/lib/sim/types";
import { getHitterMode } from "@/lib/sim/rotation";
import type { WorldState } from "@/lib/sim/world";
import {
  cloneWorldState,
  advanceTick,
  updatePlayer,
  getTeamPlayers,
  getActivePlayers,
} from "@/lib/sim/world";
import type { Intent } from "@/lib/sim/intent";
import { getBestIntentForActor, isGoalIntent, mergeIntents } from "@/lib/sim/intent";
import type { DecisionTrace } from "@/lib/sim/trace";
import { createDecisionTrace } from "@/lib/sim/trace";
import type { BTContext, BTNode, BTResult } from "@/lib/sim/bt";
import { toLegacyNode } from "@/lib/sim/bt";
import {
  createLiberoTree,
  createMiddleTree,
  createOppositeTree,
  createOutsideTree,
  createSetterTree,
} from "@/lib/sim/ai/trees";
import { resolveGoalToTarget } from "@/lib/sim/goals";
import { buildRotationResponsibilities, getServerRole } from "@/lib/sim/rotation";
import { reduceFSM } from "@/lib/sim/fsm";
import type { RallyEvent } from "@/lib/sim/fsm";
import { stepMovement } from "@/lib/sim/movement";

// ============================================================================
// Types
// ============================================================================

/**
 * Context built during the Sense phase
 */
export type SenseContext = {
  world: WorldState;
  blackboardByTeam: Record<TeamSide, Blackboard>;
  activePlayers: PlayerState[];
  btByPlayer: Map<PlayerId, BTNode>;
};

/**
 * Result of the Think phase
 */
export type ThinkResult = {
  senseCtx: SenseContext;
  btResults: Map<PlayerId, BTResult>;
  traces: DecisionTrace[];
};

/**
 * Result of the Propose phase
 */
export type ProposeResult = {
  thinkResult: ThinkResult;
  intents: Intent[];
};

/**
 * Result of a complete tick
 */
export type TickResult = {
  nextWorld: WorldState;
  intents: Intent[];
  traces: DecisionTrace[];
  fsmEvents: RallyEvent[];
};

/**
 * Whiteboard influence configuration
 */
export type WhiteboardInfluenceConfig = {
  /** Influence strength (0 = none, 1 = full) */
  strength: number;
  /** Target positions from whiteboard (by player ID) */
  targets: Map<PlayerId, Vec2>;
};

/**
 * Options for stepping a tick
 */
export type StepTickOptions = {
  /** Whether to commit changes to world state (default: true) */
  commit?: boolean;
  /** Time delta in seconds (default: 1/60) */
  dt?: number;
  /** Human-provided intents that override AI intents */
  humanIntents?: Intent[];
  /** Whiteboard influence configuration */
  whiteboardInfluence?: WhiteboardInfluenceConfig;
};

// ============================================================================
// Phase 1: Sense
// ============================================================================

/**
 * Build a blackboard for a specific team
 */
const buildBlackboardForTeam = (
  world: WorldState,
  team: TeamSide
): Blackboard => {
  const fsmPhase = world.fsm.phase;

  const touchCount =
    world.fsm.lastTouchTeam === team ? world.fsm.touchCount : 0;

  const teamSideForPoint = (pos: Vec2): TeamSide => {
    return pos.y >= world.court.netY ? "HOME" : "AWAY";
  };

  const ballOnSide = teamSideForPoint(world.ball.position) === team;

  const setter = world.players.find(
    (p) => p.team === team && p.category === "SETTER"
  );
  const setterId = setter?.id ?? (team === "HOME" ? "H-S" : "A-S");

  const teamRotation =
    team === "HOME" ? world.homeRotation : world.awayRotation;

  const teamPlayers = getTeamPlayers(world, team);
  const lineupByRole: Partial<Record<Role | "L", PlayerId>> = {};
  for (const p of teamPlayers) {
    lineupByRole[p.role as Role | "L"] = p.id;
  }

  const rotationInfo = buildRotationResponsibilities({
    rotation: teamRotation,
    team,
    lineupByRole,
    liberoId: teamPlayers.find((p) => p.role === "L")?.id,
  });

  const isOurServe = world.fsm.serving === team;
  const serverRole = getServerRole(teamRotation);
  const serverPlayer = teamPlayers.find((p) => p.role === serverRole);
  const serverId = serverPlayer?.id ?? null;

  const opponentLaneFromBallTarget = (): "left" | "middle" | "right" => {
    const x = world.ball.predicted_landing.x;
    if (x < 0.4) return "left";
    if (x > 0.6) return "right";
    return "middle";
  };

  return {
    ball: {
      position: world.ball.position,
      velocity: world.ball.velocity,
      predicted_landing: world.ball.predicted_landing,
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
      attack_lane: opponentLaneFromBallTarget(),
    },
    override: { active: false },
    serving: {
      isOurServe,
      serverId,
    },
  };
};

/**
 * Get the behavior tree for a player based on their category
 */
const getTreeForPlayer = (player: PlayerState): BTNode => {
  if (player.category === "SETTER") return createSetterTree();
  if (player.category === "LIBERO") return createLiberoTree();
  if (player.category === "MIDDLE") return createMiddleTree();
  if (player.category === "OPPOSITE") return createOppositeTree();
  return createOutsideTree({ side: "left" });
};

/**
 * Sense phase: Read world state and build context for thinking
 */
export const sense = (world: WorldState): SenseContext => {
  const blackboardByTeam: Record<TeamSide, Blackboard> = {
    HOME: buildBlackboardForTeam(world, "HOME"),
    AWAY: buildBlackboardForTeam(world, "AWAY"),
  };

  const activePlayers = getActivePlayers(world);

  const btByPlayer = new Map<PlayerId, BTNode>();
  for (const player of activePlayers) {
    btByPlayer.set(player.id, getTreeForPlayer(player));
  }

  return {
    world,
    blackboardByTeam,
    activePlayers,
    btByPlayer,
  };
};

// ============================================================================
// Phase 2: Think
// ============================================================================

/**
 * Think phase: Run BTs for all players and collect results
 */
export const think = (senseCtx: SenseContext): ThinkResult => {
  const btResults = new Map<PlayerId, BTResult>();
  const traces: DecisionTrace[] = [];

  for (const player of senseCtx.activePlayers) {
    const tree = senseCtx.btByPlayer.get(player.id);
    if (!tree) continue;

    const blackboard = senseCtx.blackboardByTeam[player.team];
    const btContext: BTContext = {
      blackboard,
      self: player,
      allPlayers: senseCtx.activePlayers,
      simTimeMs: senseCtx.world.timeMs,
    };

    const result = tree.tick(btContext);
    btResults.set(player.id, result);

    // Build decision trace
    const selectedIntent = result.intents.length > 0 ? result.intents[0] : null;
    const alternativeIntents = result.intents.slice(1);

    traces.push(
      createDecisionTrace({
        playerId: player.id,
        tick: senseCtx.world.tick,
        timeMs: senseCtx.world.timeMs,
        phase: blackboard.fsm.phase,
        rootTrace: result.trace,
        selectedIntent,
        alternativeIntents,
      })
    );
  }

  return {
    senseCtx,
    btResults,
    traces,
  };
};

// ============================================================================
// Phase 3: Propose
// ============================================================================

/**
 * Propose phase: Collect and rank all intents
 */
export const propose = (
  thinkResult: ThinkResult,
  humanIntents: Intent[] = []
): ProposeResult => {
  // Collect all AI intents
  const aiIntents: Intent[] = [];
  for (const [, result] of thinkResult.btResults) {
    aiIntents.push(...result.intents);
  }

  // Merge with human intents (human overrides AI for same actor)
  const mergedIntents = mergeIntents(aiIntents, humanIntents);

  return {
    thinkResult,
    intents: mergedIntents,
  };
};

// ============================================================================
// Phase 4: Commit
// ============================================================================

/**
 * Apply a single intent to the world state
 */
const applyIntent = (
  world: WorldState,
  intent: Intent,
  blackboardByTeam: Record<TeamSide, Blackboard>
): WorldState => {
  const player = world.players.find((p) => p.id === intent.actor);
  if (!player) return world;

  switch (intent.action.type) {
    case "REQUEST_GOAL": {
      // Update the player's requested goal
      return updatePlayer(world, intent.actor, {
        requestedGoal: { type: intent.action.goal },
      });
    }
    case "MOVE_TO": {
      // Direct position update (for human edits)
      return updatePlayer(world, intent.actor, {
        position: intent.action.target,
      });
    }
    case "STAY_IN_PLACE": {
      // No change needed
      return world;
    }
    case "BALL_CONTACT": {
      // Ball contact events are handled separately via FSM
      return world;
    }
    default:
      return world;
  }
};

/**
 * Blend a position toward a whiteboard target
 */
const blendTowardWhiteboard = (
  currentTarget: Vec2,
  whiteboardTarget: Vec2 | undefined,
  strength: number
): Vec2 => {
  if (!whiteboardTarget || strength <= 0) return currentTarget;

  const t = Math.max(0, Math.min(1, strength));
  return {
    x: currentTarget.x * (1 - t) + whiteboardTarget.x * t,
    y: currentTarget.y * (1 - t) + whiteboardTarget.y * t,
  };
};

/**
 * Apply movement physics to all players based on their requested goals
 * Optionally blends goals toward whiteboard targets
 */
const applyMovement = (
  world: WorldState,
  blackboardByTeam: Record<TeamSide, Blackboard>,
  dt: number,
  whiteboardInfluence?: WhiteboardInfluenceConfig
): WorldState => {
  // If we have whiteboard influence, create modified players with blended goals
  let playersForMovement = world.players;

  if (whiteboardInfluence && whiteboardInfluence.strength > 0) {
    playersForMovement = world.players.map((player) => {
      const wbTarget = whiteboardInfluence.targets.get(player.id);
      if (!wbTarget) return player;

      // If player has a requested goal, we'll let the movement system
      // handle it but the goal resolution will consider the whiteboard
      // For now, we store the whiteboard target in the override payload
      if (player.requestedGoal) {
        return {
          ...player,
          override: {
            active: true as const,
            goal_type: "ForcedStartingPosition" as const,
            payload: {
              whiteboardTarget: wbTarget,
              influence: whiteboardInfluence.strength,
            },
          },
        };
      }

      return player;
    });
  }

  const updatedPlayers = stepMovement({
    dt,
    rotation: world.homeRotation,
    court: world.court,
    players: playersForMovement,
    blackboardByTeam,
  });

  return {
    ...world,
    players: updatedPlayers,
  };
};

/**
 * Apply ball physics
 */
const applyBallPhysics = (
  world: WorldState,
  dt: number,
  ballTarget: Vec2,
  ballSpeed: number
): { world: WorldState; events: RallyEvent[] } => {
  const events: RallyEvent[] = [];

  if (world.fsm.phase === "PRE_SERVE") {
    // Ball follows server
    const servingTeam = world.fsm.serving;
    const serverRole = getServerRole(
      servingTeam === "HOME" ? world.homeRotation : world.awayRotation
    );
    const server = world.players.find(
      (p) => p.team === servingTeam && p.role === serverRole
    );
    if (server) {
      const offsetY = server.team === "HOME" ? 0.02 : -0.02;
      return {
        world: {
          ...world,
          ball: {
            ...world.ball,
            position: {
              x: server.position.x - 0.02,
              y: server.position.y + offsetY,
            },
            velocity: { x: 0, y: 0 },
          },
        },
        events,
      };
    }
  }

  // Move ball toward target
  const pos = world.ball.position;
  const toTarget = vec2.sub(ballTarget, pos);
  const d = vec2.len(toTarget);
  const dir = vec2.norm(toTarget);
  const v = vec2.mul(dir, ballSpeed);

  const newPosition =
    d <= 0.001 ? ballTarget : vec2.add(pos, vec2.mul(v, dt));

  return {
    world: {
      ...world,
      ball: {
        ...world.ball,
        position: newPosition,
        velocity: v,
      },
    },
    events,
  };
};

/**
 * Commit phase: Apply intents and physics to world state
 */
export const commit = (
  proposeResult: ProposeResult,
  options: StepTickOptions = {}
): TickResult => {
  const dt = options.dt ?? 1 / 60;
  const { thinkResult, intents } = proposeResult;
  const { senseCtx } = thinkResult;

  // Start with a clone of the world
  let nextWorld = cloneWorldState(senseCtx.world);

  // Clear requested goals before applying new ones
  nextWorld = {
    ...nextWorld,
    players: nextWorld.players.map((p) => ({
      ...p,
      requestedGoal: null,
    })),
  };

  // Apply each intent
  for (const intent of intents) {
    nextWorld = applyIntent(
      nextWorld,
      intent,
      senseCtx.blackboardByTeam
    );
  }

  // Note: Libero substitution is now handled by the engine directly
  // to allow toggling via the UI. See engine.setUseLibero()

  // Apply movement physics with optional whiteboard influence
  nextWorld = applyMovement(
    nextWorld,
    senseCtx.blackboardByTeam,
    dt,
    options.whiteboardInfluence
  );

  // Advance tick counter
  nextWorld = advanceTick(nextWorld, dt * 1000);

  return {
    nextWorld,
    intents,
    traces: thinkResult.traces,
    fsmEvents: [],
  };
};

// ============================================================================
// Unified Step Function
// ============================================================================

/**
 * Execute a complete tick of the simulation
 */
export const stepTick = (
  world: WorldState,
  options: StepTickOptions = {}
): TickResult => {
  const shouldCommit = options.commit ?? true;
  const humanIntents = options.humanIntents ?? [];

  // Phase 1: Sense
  const senseCtx = sense(world);

  // Phase 2: Think
  const thinkResult = think(senseCtx);

  // Phase 3: Propose
  const proposeResult = propose(thinkResult, humanIntents);

  // Phase 4: Commit (optional)
  if (shouldCommit) {
    return commit(proposeResult, options);
  }

  // Dry run - return current state with intents/traces
  return {
    nextWorld: cloneWorldState(world),
    intents: proposeResult.intents,
    traces: thinkResult.traces,
    fsmEvents: [],
  };
};

/**
 * Dry run a tick without committing changes
 */
export const dryRunTick = (world: WorldState): TickResult => {
  return stepTick(world, { commit: false });
};

/**
 * Run simulation until a condition is met or max ticks reached
 */
export const simulateUntil = (
  world: WorldState,
  condition: (w: WorldState) => boolean,
  maxTicks: number = 1000,
  options: Omit<StepTickOptions, "commit"> = {}
): { finalWorld: WorldState; ticksRun: number; traces: DecisionTrace[][] } => {
  let currentWorld = world;
  let ticksRun = 0;
  const allTraces: DecisionTrace[][] = [];

  while (!condition(currentWorld) && ticksRun < maxTicks) {
    const result = stepTick(currentWorld, { ...options, commit: true });
    currentWorld = result.nextWorld;
    allTraces.push(result.traces);
    ticksRun++;
  }

  return {
    finalWorld: currentWorld,
    ticksRun,
    traces: allTraces,
  };
};

