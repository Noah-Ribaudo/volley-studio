// Movement System - Player movement with anticipation, smooth arrival, and intelligent collision avoidance
// Phase 2 of the simulation overhaul

import type { Blackboard, CourtModel, PlayerState, Vec2, BallState3D } from "@/lib/sim/types";
import { vec2 } from "@/lib/sim/types";
import { resolveGoalToTarget } from "@/lib/sim/goals";
import type { Rotation } from "@/lib/types";
import type { BallFlight3D } from "@/lib/sim/ball";
import { getBallPosition3D } from "@/lib/sim/ball";

// ============================================================================
// MOVEMENT CONFIGURATION
// ============================================================================

export type MovementConfig = {
  // Collision
  collisionRadius: number;
  separationStrength: number;
  maxSeparationPerStep: number;

  // Velocity
  velocitySmoothing: number;      // Blend factor for velocity changes (lower = smoother)
  momentumPreservation: number;   // How much to preserve movement direction (0-1)

  // Court boundaries
  netBuffer: number;
  netCloseBuffer: number;

  // Arrival
  arrivalThreshold: number;
  deadzoneThreshold: number;
  slowdownZone: number;           // Distance at which deceleration begins (multiplier of arrivalThreshold)

  // Anticipation
  anticipationWeight: number;     // How much to weight ball prediction vs goal position (0-1)
  lookAheadMs: number;            // How far ahead to predict ball position
};

export const DEFAULT_MOVEMENT_CONFIG: MovementConfig = {
  collisionRadius: 0.05,
  separationStrength: 1.2,
  maxSeparationPerStep: 0.03,

  velocitySmoothing: 0.18,        // Lower = smoother (was 0.35)
  momentumPreservation: 0.3,

  netBuffer: 0.03,
  netCloseBuffer: 0.012,

  arrivalThreshold: 0.025,
  deadzoneThreshold: 0.006,
  slowdownZone: 3.5,              // Start slowing down at 3.5x arrival threshold

  anticipationWeight: 0.4,
  lookAheadMs: 300,
};

// ============================================================================
// APPROACH ANGLE SYSTEM (for attackers)
// ============================================================================

export type ApproachInfo = {
  hasApproach: boolean;
  waypoint: Vec2 | null;          // Pre-attack position
  finalTarget: Vec2;              // Net contact position
  approachAngleDeg: number;       // Angle of approach (0 = straight, negative = from right)
};

/**
 * Calculate approach path for an attacker.
 * Attackers should approach at an angle, not perpendicular to net.
 */
const calculateApproachPath = (
  player: PlayerState,
  target: Vec2,
  goalType: string,
  court: CourtModel
): ApproachInfo => {
  // Only calculate approach for attack goals
  const isAttackGoal = goalType.includes("Approach") || goalType.includes("Attack");

  if (!isAttackGoal) {
    return {
      hasApproach: false,
      waypoint: null,
      finalTarget: target,
      approachAngleDeg: 0,
    };
  }

  const isHome = player.team === "HOME";
  const netDirection = isHome ? -1 : 1;  // Direction toward net

  // Determine approach angle based on attack side
  let approachAngleDeg: number;
  if (goalType.includes("Left")) {
    // Left-side attack: approach from right (positive angle for HOME)
    approachAngleDeg = isHome ? 25 : -25;
  } else if (goalType.includes("Right")) {
    // Right-side attack: approach from left (negative angle for HOME)
    approachAngleDeg = isHome ? -25 : 25;
  } else {
    // Middle attack: approach at slight angle based on player position
    approachAngleDeg = player.position.x < 0.5 ? 15 : -15;
  }

  // Calculate waypoint (position before approach)
  const approachDistance = 0.12;  // Distance back from attack position
  const angleRad = (approachAngleDeg * Math.PI) / 180;

  const waypoint: Vec2 = {
    x: target.x - Math.sin(angleRad) * approachDistance,
    y: target.y + netDirection * approachDistance,
  };

  // Clamp waypoint to court
  const clampedWaypoint = vec2.clamp(waypoint, court.boundsMin, court.boundsMax);

  return {
    hasApproach: true,
    waypoint: clampedWaypoint,
    finalTarget: target,
    approachAngleDeg,
  };
};

/**
 * Get the current movement target based on approach phase.
 */
const getApproachTarget = (
  player: PlayerState,
  approachInfo: ApproachInfo,
  distToFinalTarget: number
): Vec2 => {
  if (!approachInfo.hasApproach || !approachInfo.waypoint) {
    return approachInfo.finalTarget;
  }

  // If we're close to the waypoint, switch to final target
  const distToWaypoint = vec2.dist(player.position, approachInfo.waypoint);
  const waypointThreshold = 0.04;

  if (distToWaypoint < waypointThreshold || distToFinalTarget < 0.08) {
    return approachInfo.finalTarget;
  }

  return approachInfo.waypoint;
};

// ============================================================================
// BALL ANTICIPATION
// ============================================================================

/**
 * Predict intercept point for ball-related goals.
 * Players should move toward where the ball will be, not where it is.
 */
const predictBallIntercept = (
  player: PlayerState,
  ball: BallState3D | null,
  currentTimeMs: number,
  config: MovementConfig
): Vec2 | null => {
  if (!ball || ball.flightPhase === "grounded") {
    return null;
  }

  // Predict where ball will be at lookAhead time
  const futureTimeMs = currentTimeMs + config.lookAheadMs;

  // Simple prediction: interpolate toward landing
  if (ball.predictedLandingTimeMs > currentTimeMs) {
    const timeToLanding = ball.predictedLandingTimeMs - currentTimeMs;
    const lookAheadRatio = Math.min(1, config.lookAheadMs / timeToLanding);

    return {
      x: ball.groundPosition.x + (ball.predictedLanding.x - ball.groundPosition.x) * lookAheadRatio,
      y: ball.groundPosition.y + (ball.predictedLanding.y - ball.groundPosition.y) * lookAheadRatio,
    };
  }

  return ball.predictedLanding;
};

/**
 * Blend goal target with ball anticipation for ball-related goals.
 */
const applyAnticipation = (
  goalTarget: Vec2,
  predictedBall: Vec2 | null,
  goalType: string,
  config: MovementConfig
): Vec2 => {
  if (!predictedBall) {
    return goalTarget;
  }

  // Goals that should anticipate ball position
  const ballRelatedGoals = [
    "ReceiveServe",
    "DefendZone",
    "CoverHitter",
    "BlockMiddle",
    "BlockLeftSide",
    "BlockRightSide",
  ];

  const shouldAnticipate = ballRelatedGoals.some(g => goalType.includes(g));

  if (!shouldAnticipate) {
    return goalTarget;
  }

  // Blend goal target with ball prediction
  const weight = config.anticipationWeight;
  return {
    x: goalTarget.x * (1 - weight) + predictedBall.x * weight,
    y: goalTarget.y * (1 - weight) + predictedBall.y * weight,
  };
};

// ============================================================================
// SMOOTH ARRIVAL
// ============================================================================

/**
 * Calculate velocity for smooth deceleration as player approaches target.
 * Uses quadratic ease-out for natural stopping.
 */
const calculateArrivalVelocity = (
  current: Vec2,
  target: Vec2,
  currentVelocity: Vec2,
  maxSpeed: number,
  desiredSpeedFactor: number,
  config: MovementConfig
): Vec2 => {
  const toTarget = vec2.sub(target, current);
  const distance = vec2.len(toTarget);

  // Dead zone - stop completely
  if (distance < config.deadzoneThreshold) {
    return { x: 0, y: 0 };
  }

  // Direction to target
  const direction = vec2.norm(toTarget);

  // Calculate speed based on distance (quadratic ease-out in slowdown zone)
  const slowdownDistance = config.arrivalThreshold * config.slowdownZone;
  let speedFactor = 1.0;

  if (distance < slowdownDistance) {
    // Quadratic ease-out: speed = (distance / slowdownDistance)^2
    const t = distance / slowdownDistance;
    speedFactor = t * t;

    // Minimum speed factor to prevent getting stuck
    speedFactor = Math.max(0.15, speedFactor);
  }

  const targetSpeed = maxSpeed * desiredSpeedFactor * speedFactor;
  const targetVelocity = vec2.mul(direction, targetSpeed);

  // Blend with current velocity for momentum
  const momentum = config.momentumPreservation;
  const currentSpeed = vec2.len(currentVelocity);

  if (currentSpeed > 0.001) {
    const currentDir = vec2.norm(currentVelocity);
    const blendedDir = vec2.norm({
      x: direction.x * (1 - momentum) + currentDir.x * momentum,
      y: direction.y * (1 - momentum) + currentDir.y * momentum,
    });
    return vec2.mul(blendedDir, targetSpeed);
  }

  return targetVelocity;
};

// ============================================================================
// INTELLIGENT COLLISION AVOIDANCE
// ============================================================================

/**
 * Calculate collision avoidance using predictive approach.
 * Instead of just pushing apart when overlapping, we predict collisions
 * and steer perpendicular to avoid them.
 */
const calculateCollisionAvoidance = (
  player: PlayerState,
  others: PlayerState[],
  desiredVelocity: Vec2,
  config: MovementConfig
): Vec2 => {
  let avoidance: Vec2 = { x: 0, y: 0 };

  for (const other of others) {
    if (other.id === player.id) continue;
    if (!other.active) continue;
    if (other.team !== player.team) continue;  // Only avoid teammates

    const diff = vec2.sub(player.position, other.position);
    const dist = vec2.len(diff);

    // Too far to matter
    if (dist >= config.collisionRadius * 2.5) continue;

    // If overlapping, apply direct separation
    if (dist < config.collisionRadius && dist > 0.001) {
      const overlap = config.collisionRadius - dist;
      const pushDir = vec2.norm(diff);

      // Priority-based separation
      const playerWins = player.priority < other.priority;
      const pushStrength = playerWins ? 0.3 : 0.7;

      avoidance = vec2.add(avoidance, vec2.mul(pushDir, overlap * pushStrength * 2));
      continue;
    }

    // Predictive avoidance: are we moving toward each other?
    if (dist > 0.001) {
      const relativeVel = vec2.sub(desiredVelocity, other.velocity);
      const diffNorm = vec2.norm(diff);
      const closingSpeed = -vec2.dot(relativeVel, diffNorm);

      // If moving apart, no avoidance needed
      if (closingSpeed <= 0) continue;

      // Calculate time to collision
      const timeToCollision = (dist - config.collisionRadius) / Math.max(0.01, closingSpeed);

      // Only avoid if collision is imminent (within ~0.5 seconds)
      if (timeToCollision > 0.5) continue;

      // Steer perpendicular to collision axis
      const perpendicular: Vec2 = { x: -diffNorm.y, y: diffNorm.x };

      // Choose direction based on current velocity
      const perpDot = vec2.dot(desiredVelocity, perpendicular);
      const steerDir = perpDot >= 0 ? perpendicular : vec2.mul(perpendicular, -1);

      // Urgency based on time to collision and closing speed
      const urgency = Math.min(1, closingSpeed / 0.3) * Math.max(0, 1 - timeToCollision);

      // Priority: lower priority players yield more
      const priorityFactor = player.priority > other.priority ? 1.2 : 0.6;

      avoidance = vec2.add(avoidance, vec2.mul(steerDir, urgency * priorityFactor * 0.08));
    }
  }

  return avoidance;
};

// ============================================================================
// COURT BOUNDARY UTILITIES
// ============================================================================

const clampToTeamSide = (params: {
  court: CourtModel;
  player: PlayerState;
  point: Vec2;
  allowNetProximity: boolean;
  config: MovementConfig;
}): Vec2 => {
  const { court, player, point, allowNetProximity, config } = params;
  const buffer = allowNetProximity ? config.netCloseBuffer : config.netBuffer;

  if (player.team === "HOME") {
    return { x: point.x, y: Math.max(point.y, court.netY + buffer) };
  }
  return { x: point.x, y: Math.min(point.y, court.netY - buffer) };
};

// ============================================================================
// MAIN MOVEMENT STEP
// ============================================================================

export const stepMovement = (params: {
  dt: number;
  rotation: Rotation;
  court: CourtModel;
  players: PlayerState[];
  blackboardByTeam: Record<"HOME" | "AWAY", Blackboard>;
  ballFlight?: BallFlight3D | null;
  currentTimeMs?: number;
  config?: Partial<MovementConfig>;
}): PlayerState[] => {
  const { dt, rotation, court, players, blackboardByTeam } = params;
  const ballFlight = params.ballFlight ?? null;
  const currentTimeMs = params.currentTimeMs ?? 0;

  // Validate inputs
  if (!isFinite(dt) || dt <= 0 || dt > 1) {
    console.warn(`Invalid dt in stepMovement: ${dt}`);
    return players.map(p => ({ ...p }));
  }

  if (!Array.isArray(players)) {
    console.error("Invalid players array in stepMovement");
    return [];
  }

  if (!court.boundsMin || !court.boundsMax || !isFinite(court.netY)) {
    console.error("Invalid court in stepMovement");
    return players.map(p => ({ ...p }));
  }

  const config: MovementConfig = { ...DEFAULT_MOVEMENT_CONFIG, ...(params.config ?? {}) };

  try {
    const next = players.map(p => ({ ...p }));

    // Get current ball state for anticipation
    const ballState = ballFlight ? getBallPosition3D(ballFlight, currentTimeMs) : null;

    // ========================================
    // Phase 1: Calculate desired velocities
    // ========================================

    const desiredVel: Record<string, Vec2> = {};
    const allowNet: Record<string, boolean> = {};
    const approachInfos: Record<string, ApproachInfo> = {};

    for (const p of next) {
      if (!p.active) {
        desiredVel[p.id] = { x: 0, y: 0 };
        allowNet[p.id] = false;
        continue;
      }

      const bb = blackboardByTeam[p.team];
      const goalType = p.requestedGoal?.type ?? p.baseGoal.type;
      const resolved = resolveGoalToTarget({ goal: goalType, self: p, bb, court, rotation });
      allowNet[p.id] = resolved.allowNetProximity;

      // Calculate approach path for attackers
      const approachInfo = calculateApproachPath(p, resolved.target, goalType, court);
      approachInfos[p.id] = approachInfo;

      // Get current target based on approach phase
      const distToFinal = vec2.dist(p.position, approachInfo.finalTarget);
      let currentTarget = getApproachTarget(p, approachInfo, distToFinal);

      // Apply ball anticipation for relevant goals
      const predictedBall = predictBallIntercept(p, ballState, currentTimeMs, config);
      currentTarget = applyAnticipation(currentTarget, predictedBall, goalType, config);

      // Clamp to team side
      const clampedTarget = clampToTeamSide({
        court,
        player: p,
        point: currentTarget,
        allowNetProximity: resolved.allowNetProximity,
        config,
      });

      // Calculate velocity with smooth arrival
      desiredVel[p.id] = calculateArrivalVelocity(
        p.position,
        clampedTarget,
        p.velocity,
        p.maxSpeed,
        resolved.desiredSpeedFactor,
        config
      );
    }

    // ========================================
    // Phase 2: Collision avoidance
    // ========================================

    const avoidanceVel: Record<string, Vec2> = {};

    for (const p of next) {
      if (!p.active) {
        avoidanceVel[p.id] = { x: 0, y: 0 };
        continue;
      }

      avoidanceVel[p.id] = calculateCollisionAvoidance(
        p,
        next,
        desiredVel[p.id],
        config
      );
    }

    // ========================================
    // Phase 3: Integrate velocities
    // ========================================

    for (const p of next) {
      if (!p.active) continue;

      // Combine desired velocity with avoidance
      const combinedDesired = vec2.add(desiredVel[p.id], vec2.mul(avoidanceVel[p.id], config.separationStrength));

      // Smooth velocity transition
      const blended = vec2.add(
        vec2.mul(p.velocity, 1 - config.velocitySmoothing),
        vec2.mul(combinedDesired, config.velocitySmoothing)
      );

      // Cap speed
      const speed = vec2.len(blended);
      const maxAllowed = p.maxSpeed * 1.3;  // Allow slight overspeed for separation
      const capped = speed > maxAllowed ? vec2.mul(vec2.norm(blended), maxAllowed) : blended;

      // Zero out very small velocities to prevent jitter
      const finalSpeed = vec2.len(capped);
      p.velocity = finalSpeed < 0.0008 ? { x: 0, y: 0 } : capped;

      // Update position
      const moved = vec2.add(p.position, vec2.mul(p.velocity, dt));

      // Clamp to court and team side
      const sideClamped = clampToTeamSide({
        court,
        player: p,
        point: moved,
        allowNetProximity: allowNet[p.id],
        config,
      });

      p.position = vec2.clamp(sideClamped, court.boundsMin, court.boundsMax);
    }

    return next;

  } catch (error) {
    console.error("Error in stepMovement:", error);
    return players.map(p => ({ ...p }));
  }
};

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export { calculateApproachPath, getApproachTarget, predictBallIntercept };
