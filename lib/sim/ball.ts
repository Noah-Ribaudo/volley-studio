// Ball Flight System - 3D physics-based ball movement
// Supports true 3D trajectories with distance-based timing and skill-based variance

import type { Vec2, Vec3, BallState3D, BallContactType, PlayerSkills, TeamSide } from "./types";
import { vec2, vec3 } from "./types";

// ============================================================================
// PHYSICS CONSTANTS
// ============================================================================

// Normalized height values (court is 0-1 in x/y, z uses same scale)
const HEIGHTS = {
  ground: 0,
  waist: 0.05,        // ~1m in real scale (waist height for passing)
  shoulder: 0.08,     // ~1.6m (shoulder height)
  netTop: 0.12,       // ~2.43m (men's net height, normalized)
  setHeight: 0.15,    // ~3m (typical set apex)
  attackHeight: 0.18, // ~3.5m (attack contact point)
  serveHeight: 0.15,  // ~3m (serve toss height)
};

// Gravity in normalized units per second^2 (tuned for visual feel)
const GRAVITY = 0.8;

// ============================================================================
// FLIGHT CONFIGURATION
// ============================================================================

export type FlightConfig3D = {
  // Timing
  minDurationMs: number;
  maxDurationMs: number;
  distanceScale: number;  // ms per normalized unit of distance

  // Height
  launchHeight: number;   // Initial z height
  peakHeightBase: number; // Base peak height
  peakHeightPerDistance: number; // Additional height per unit distance

  // Power affects
  powerDurationFactor: number; // How much power reduces duration (0-1)
  powerHeightFactor: number;   // How much power increases height (0-1)
};

export const FLIGHT_CONFIGS_3D: Record<BallContactType, FlightConfig3D> = {
  serve: {
    minDurationMs: 800,
    maxDurationMs: 1800,
    distanceScale: 1400,
    launchHeight: HEIGHTS.serveHeight,
    peakHeightBase: 0.12,
    peakHeightPerDistance: 0.08,
    powerDurationFactor: 0.3,
    powerHeightFactor: 0.2,
  },
  pass: {
    minDurationMs: 400,
    maxDurationMs: 1000,
    distanceScale: 900,
    launchHeight: HEIGHTS.waist,
    peakHeightBase: 0.10,
    peakHeightPerDistance: 0.12,
    powerDurationFactor: 0.2,
    powerHeightFactor: 0.3,
  },
  set: {
    minDurationMs: 500,
    maxDurationMs: 1400,
    distanceScale: 1000,
    launchHeight: HEIGHTS.setHeight,
    peakHeightBase: 0.14,
    peakHeightPerDistance: 0.10,
    powerDurationFactor: 0.15,
    powerHeightFactor: 0.25,
  },
  attack: {
    minDurationMs: 200,
    maxDurationMs: 600,
    distanceScale: 450,
    launchHeight: HEIGHTS.attackHeight,
    peakHeightBase: 0.02, // Attacks are flat
    peakHeightPerDistance: 0.01,
    powerDurationFactor: 0.4,
    powerHeightFactor: 0.1,
  },
  dig: {
    minDurationMs: 300,
    maxDurationMs: 900,
    distanceScale: 700,
    launchHeight: HEIGHTS.waist,
    peakHeightBase: 0.08,
    peakHeightPerDistance: 0.10,
    powerDurationFactor: 0.2,
    powerHeightFactor: 0.3,
  },
  block: {
    minDurationMs: 150,
    maxDurationMs: 500,
    distanceScale: 350,
    launchHeight: HEIGHTS.netTop,
    peakHeightBase: 0.02,
    peakHeightPerDistance: 0.01,
    powerDurationFactor: 0.3,
    powerHeightFactor: 0.1,
  },
  freeball: {
    minDurationMs: 700,
    maxDurationMs: 1400,
    distanceScale: 1100,
    launchHeight: HEIGHTS.shoulder,
    peakHeightBase: 0.12,
    peakHeightPerDistance: 0.08,
    powerDurationFactor: 0.1,
    powerHeightFactor: 0.2,
  },
};

// ============================================================================
// SKILL-BASED VARIANCE (like gun accuracy in shooters)
// ============================================================================

/**
 * Apply skill-based variance to a target position.
 * Lower accuracy = more spread, like weapon accuracy in games.
 * Uses Box-Muller transform for gaussian distribution.
 */
export const applySkillVariance = (
  baseTarget: Vec2,
  accuracy: number, // 0-1
  contactType: BallContactType
): Vec2 => {
  // Max spread varies by contact type
  const maxSpread: Record<BallContactType, number> = {
    serve: 0.12,    // Serves can miss by a lot
    pass: 0.10,     // Passes need to be relatively accurate
    set: 0.06,      // Sets need precision
    attack: 0.15,   // Attacks have the most variance
    dig: 0.12,      // Digs are reactive, high variance
    block: 0.05,    // Blocks are position-based
    freeball: 0.08, // Freeballs should be controlled
  };

  // Calculate spread based on accuracy (inverse relationship)
  const spread = maxSpread[contactType] * (1 - accuracy);

  if (spread < 0.001) {
    return { ...baseTarget };
  }

  // Box-Muller transform for gaussian distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const magnitude = spread * Math.sqrt(-2 * Math.log(Math.max(0.0001, u1)));
  const angle = 2 * Math.PI * u2;

  return {
    x: Math.max(0.02, Math.min(0.98, baseTarget.x + Math.cos(angle) * magnitude)),
    y: Math.max(0.02, Math.min(0.98, baseTarget.y + Math.sin(angle) * magnitude)),
  };
};

/**
 * Get the relevant skill for a contact type
 */
export const getSkillForContact = (
  skills: PlayerSkills,
  contactType: BallContactType
): { accuracy: number; power: number } => {
  switch (contactType) {
    case "serve":
      return skills.serving;
    case "pass":
    case "dig":
      return skills.passing;
    case "set":
      return { accuracy: skills.setting.accuracy, power: skills.setting.tempo };
    case "attack":
      return skills.attacking;
    case "block":
      return { accuracy: skills.blocking.timing, power: skills.blocking.reach };
    case "freeball":
      return skills.passing;
    default:
      return { accuracy: 0.7, power: 0.7 };
  }
};

// ============================================================================
// FLIGHT CALCULATION
// ============================================================================

/**
 * Calculate flight duration based on distance and contact type.
 * Longer distances = longer flight times (unlike the old fixed-duration system).
 */
export const calculateFlightDuration = (
  distance: number,
  contactType: BallContactType,
  power: number = 0.7
): number => {
  const config = FLIGHT_CONFIGS_3D[contactType];

  // Base duration from distance
  const baseDuration = config.distanceScale * distance;

  // Power reduces duration (faster ball)
  const powerFactor = 1 - (power * config.powerDurationFactor);
  const adjusted = baseDuration * powerFactor;

  // Clamp to reasonable bounds
  return Math.max(config.minDurationMs, Math.min(config.maxDurationMs, adjusted));
};

/**
 * Calculate peak height for a flight based on distance and contact type.
 */
export const calculatePeakHeight = (
  distance: number,
  contactType: BallContactType,
  power: number = 0.7
): number => {
  const config = FLIGHT_CONFIGS_3D[contactType];

  const baseHeight = config.peakHeightBase + (distance * config.peakHeightPerDistance);
  const powerBonus = power * config.powerHeightFactor * 0.05;

  return Math.max(config.launchHeight, baseHeight + powerBonus);
};

// ============================================================================
// 3D BALL FLIGHT
// ============================================================================

export type BallFlight3D = {
  origin: Vec3;
  target: Vec2;           // Ground target (where ball lands)
  startTimeMs: number;
  durationMs: number;
  peakHeight: number;
  contactType: BallContactType;
  lastTouchTeam: TeamSide;
  touchCount: number;
  crossedNet: boolean;
};

/**
 * Create a new 3D ball flight with physics-based parameters.
 */
export const createBallFlight3D = (params: {
  origin: Vec2 | Vec3;
  target: Vec2;
  startTimeMs: number;
  contactType: BallContactType;
  playerSkills: PlayerSkills;
  lastTouchTeam: TeamSide;
  touchCount: number;
}): BallFlight3D => {
  const skill = getSkillForContact(params.playerSkills, params.contactType);

  // Apply skill-based variance to target
  const actualTarget = applySkillVariance(params.target, skill.accuracy, params.contactType);

  // Calculate origin as Vec3
  const config = FLIGHT_CONFIGS_3D[params.contactType];
  const origin3D: Vec3 = 'z' in params.origin
    ? params.origin as Vec3
    : { ...params.origin as Vec2, z: config.launchHeight };

  // Calculate distance (ground distance)
  const distance = vec2.dist(vec3.toVec2(origin3D), actualTarget);

  // Calculate duration and peak height based on distance
  const durationMs = calculateFlightDuration(distance, params.contactType, skill.power);
  const peakHeight = calculatePeakHeight(distance, params.contactType, skill.power);

  return {
    origin: origin3D,
    target: actualTarget,
    startTimeMs: params.startTimeMs,
    durationMs,
    peakHeight,
    contactType: params.contactType,
    lastTouchTeam: params.lastTouchTeam,
    touchCount: params.touchCount,
    crossedNet: false,
  };
};

/**
 * Calculate 3D position at a given time in flight.
 * Uses parabolic trajectory for realistic ball physics.
 */
export const getBallPosition3D = (
  flight: BallFlight3D,
  currentTimeMs: number
): BallState3D | null => {
  if (!flight || !isFinite(currentTimeMs)) {
    return null;
  }

  const elapsed = currentTimeMs - flight.startTimeMs;

  if (elapsed < 0) {
    // Flight hasn't started yet - return at origin
    return {
      position: { ...flight.origin },
      velocity: { x: 0, y: 0, z: 0 },
      groundPosition: vec3.toVec2(flight.origin),
      predictedLanding: flight.target,
      predictedLandingTimeMs: flight.startTimeMs + flight.durationMs,
      peakHeight: flight.peakHeight,
      flightPhase: "grounded",
      touchCount: flight.touchCount,
      lastTouchTeam: flight.lastTouchTeam,
      contactType: flight.contactType,
    };
  }

  // Progress through flight (0 to 1+)
  const t = Math.min(1, elapsed / flight.durationMs);

  // Horizontal interpolation (ground plane) - linear
  const groundX = flight.origin.x + (flight.target.x - flight.origin.x) * t;
  const groundY = flight.origin.y + (flight.target.y - flight.origin.y) * t;

  // Vertical trajectory - parabolic arc
  // z(t) = z0 + v0z*t - 0.5*g*t^2
  // We solve for v0z such that z reaches peakHeight at t=0.5 and z=0 at t=1
  // Simplified: z = 4 * (peakHeight - z0/2) * t * (1-t) + z0 * (1-t)
  // Even simpler for visual feel: parabola from origin.z to 0, peaking at peakHeight

  const z0 = flight.origin.z;
  const zPeak = flight.peakHeight;

  // Quadratic that goes through (0, z0), (0.5, zPeak), (1, 0)
  // Using Lagrange interpolation or just fitting:
  // z(t) = z0*(1-t)*(1-2t) + 4*zPeak*t*(1-t) + 0*t*(2t-1)
  // Simplified: z(t) = z0 - 2*z0*t + z0*t + 4*zPeak*t - 4*zPeak*t^2
  // Actually let's use standard parabola form:
  // z(t) = a*t^2 + b*t + c where z(0)=z0, z(1)=0, z(0.5)=zPeak
  // c = z0
  // a + b + z0 = 0 → a + b = -z0
  // 0.25a + 0.5b + z0 = zPeak → 0.25a + 0.5b = zPeak - z0
  // From first: a = -z0 - b
  // Substitute: 0.25(-z0 - b) + 0.5b = zPeak - z0
  // -0.25*z0 - 0.25b + 0.5b = zPeak - z0
  // 0.25b = zPeak - z0 + 0.25*z0 = zPeak - 0.75*z0
  // b = 4*zPeak - 3*z0
  // a = -z0 - (4*zPeak - 3*z0) = -z0 - 4*zPeak + 3*z0 = 2*z0 - 4*zPeak

  const a = 2 * z0 - 4 * zPeak;
  const b = 4 * zPeak - 3 * z0;
  const c = z0;

  let z = a * t * t + b * t + c;
  z = Math.max(0, z); // Don't go below ground

  // Calculate velocity (derivative of position)
  const dt = 0.001; // Small delta for numerical derivative
  const t2 = Math.min(1, t + dt);
  const groundX2 = flight.origin.x + (flight.target.x - flight.origin.x) * t2;
  const groundY2 = flight.origin.y + (flight.target.y - flight.origin.y) * t2;
  const z2 = Math.max(0, a * t2 * t2 + b * t2 + c);

  const velocityScale = flight.durationMs / 1000; // Convert to per-second
  const velocity: Vec3 = {
    x: (groundX2 - groundX) / dt / velocityScale,
    y: (groundY2 - groundY) / dt / velocityScale,
    z: (z2 - z) / dt / velocityScale,
  };

  // Determine flight phase
  const flightPhase = t >= 1 ? "grounded" : (velocity.z >= 0 ? "rising" : "falling");

  return {
    position: { x: groundX, y: groundY, z },
    velocity,
    groundPosition: { x: groundX, y: groundY },
    predictedLanding: flight.target,
    predictedLandingTimeMs: flight.startTimeMs + flight.durationMs,
    peakHeight: flight.peakHeight,
    flightPhase,
    touchCount: flight.touchCount,
    lastTouchTeam: flight.lastTouchTeam,
    contactType: flight.contactType,
  };
};

/**
 * Check if a 3D ball flight has completed (ball has landed).
 */
export const isBallFlight3DComplete = (
  flight: BallFlight3D,
  currentTimeMs: number
): boolean => {
  return currentTimeMs >= flight.startTimeMs + flight.durationMs;
};

/**
 * Check if ball has crossed the net during flight.
 */
export const hasBallCrossedNet3D = (
  flight: BallFlight3D,
  currentTimeMs: number,
  netY: number = 0.5
): boolean => {
  const state = getBallPosition3D(flight, currentTimeMs);
  if (!state) return false;

  const originSide = flight.origin.y >= netY ? "HOME" : "AWAY";
  const currentSide = state.groundPosition.y >= netY ? "HOME" : "AWAY";

  return originSide !== currentSide;
};

/**
 * Check if ball is at a contactable height (can be played by a player).
 */
export const isBallContactable = (
  state: BallState3D,
  maxContactHeight: number = HEIGHTS.attackHeight
): boolean => {
  return state.position.z <= maxContactHeight && state.flightPhase !== "grounded";
};

/**
 * Predict where the ball will be at a future time.
 * Useful for player movement AI.
 */
export const predictBallPosition = (
  flight: BallFlight3D,
  futureTimeMs: number
): Vec2 | null => {
  const state = getBallPosition3D(flight, futureTimeMs);
  return state ? state.groundPosition : null;
};

// ============================================================================
// LEGACY COMPATIBILITY (Keep old API working during transition)
// ============================================================================

// Re-export BallContactType from types.ts for backward compat
export type { BallContactType } from "./types";

export type FlightConfig = {
  baseDuration: number;
  durationVariance: number;
  arcHeight: number;
  speed: number;
};

// Legacy configs (mapped from new system)
export const FLIGHT_CONFIGS: Record<BallContactType, FlightConfig> = {
  serve: { baseDuration: 1200, durationVariance: 200, arcHeight: 0.15, speed: 0.8 },
  pass: { baseDuration: 600, durationVariance: 100, arcHeight: 0.08, speed: 0.6 },
  set: { baseDuration: 800, durationVariance: 150, arcHeight: 0.12, speed: 0.5 },
  attack: { baseDuration: 400, durationVariance: 80, arcHeight: 0.03, speed: 1.5 },
  dig: { baseDuration: 500, durationVariance: 150, arcHeight: 0.06, speed: 0.7 },
  block: { baseDuration: 300, durationVariance: 100, arcHeight: 0.02, speed: 1.2 },
  freeball: { baseDuration: 900, durationVariance: 200, arcHeight: 0.1, speed: 0.5 },
};

export type BallFlight = {
  origin: Vec2;
  target: Vec2;
  startTimeMs: number;
  duration: number;
  arcHeight: number;
  contactType: BallContactType;
  crossedNet: boolean;
};

/** @deprecated Use createBallFlight3D instead */
export const createBallFlight = (params: {
  origin: Vec2;
  target: Vec2;
  startTimeMs: number;
  contactType: BallContactType;
  durationOverride?: number;
}): BallFlight => {
  const config = FLIGHT_CONFIGS[params.contactType];
  const variance = (Math.random() - 0.5) * 2 * config.durationVariance;
  const duration = params.durationOverride ?? config.baseDuration + variance;

  return {
    origin: { ...params.origin },
    target: { ...params.target },
    startTimeMs: params.startTimeMs,
    duration: Math.max(100, duration),
    arcHeight: config.arcHeight,
    contactType: params.contactType,
    crossedNet: false,
  };
};

/** @deprecated Use getBallPosition3D instead */
export const getBallFlightPosition = (
  flight: BallFlight,
  currentTimeMs: number
): { position: Vec2; progress: number; velocity: Vec2; height: number } | null => {
  if (!flight || !isFinite(currentTimeMs)) return null;
  if (!isFinite(flight.startTimeMs) || !isFinite(flight.duration) || flight.duration <= 0) return null;
  if (!isFinite(flight.origin.x) || !isFinite(flight.origin.y) ||
      !isFinite(flight.target.x) || !isFinite(flight.target.y)) return null;

  const elapsed = currentTimeMs - flight.startTimeMs;
  if (elapsed < 0) return null;

  const rawProgress = Math.min(1, elapsed / flight.duration);
  if (!isFinite(rawProgress)) return null;

  const position: Vec2 = {
    x: flight.origin.x + (flight.target.x - flight.origin.x) * rawProgress,
    y: flight.origin.y + (flight.target.y - flight.origin.y) * rawProgress,
  };

  const height = 4 * flight.arcHeight * rawProgress * (1 - rawProgress);
  const config = FLIGHT_CONFIGS[flight.contactType];
  const direction = vec2.norm(vec2.sub(flight.target, flight.origin));
  const velocity = vec2.mul(direction, config.speed);

  return { position, progress: rawProgress, velocity, height };
};

/** @deprecated Use isBallFlight3DComplete instead */
export const isBallFlightComplete = (flight: BallFlight, currentTimeMs: number): boolean => {
  return currentTimeMs >= flight.startTimeMs + flight.duration;
};

/** @deprecated Use hasBallCrossedNet3D instead */
export const hasBallCrossedNet = (flight: BallFlight, currentTimeMs: number, netY: number): boolean => {
  const result = getBallFlightPosition(flight, currentTimeMs);
  if (!result) return false;
  const originSide = flight.origin.y >= netY ? "HOME" : "AWAY";
  const currentSide = result.position.y >= netY ? "HOME" : "AWAY";
  return originSide !== currentSide;
};

export const calculateContactTarget = (baseTarget: Vec2, variance: number = 0.05): Vec2 => {
  return {
    x: baseTarget.x + (Math.random() - 0.5) * variance,
    y: baseTarget.y + (Math.random() - 0.5) * variance,
  };
};

export const getServeLandingZone = (
  receivingSide: "HOME" | "AWAY",
  lane: "left" | "middle" | "right",
  netY: number
): Vec2 => {
  const laneX = lane === "left" ? 0.25 : lane === "right" ? 0.75 : 0.5;
  const y = receivingSide === "HOME" ? netY + 0.36 : netY - 0.36;
  return calculateContactTarget({ x: laneX, y }, 0.08);
};

export const getSettingZone = (side: "HOME" | "AWAY", netY: number): Vec2 => {
  const y = side === "HOME" ? netY + 0.08 : netY - 0.08;
  return { x: 0.7, y };
};

export const getAttackTarget = (
  targetSide: "HOME" | "AWAY",
  lane: "left" | "middle" | "right",
  netY: number
): Vec2 => {
  const laneX = lane === "left" ? 0.22 : lane === "right" ? 0.78 : 0.5;
  const y = targetSide === "HOME" ? netY + 0.36 : netY - 0.36;
  return calculateContactTarget({ x: laneX, y }, 0.1);
};

// Easing functions (still used for rendering)
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
export const easeLinear = (t: number): number => t;
export const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
