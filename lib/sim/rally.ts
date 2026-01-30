// Rally Sequencer - Deterministic rally script system
// Provides structured rally flow with slight randomization for believable play

import type { TeamSide, Vec2 } from "./types";
import type { BallContactType } from "./ball";

/**
 * A single step in a rally sequence
 */
export type RallyStep = {
  /** Type of ball contact */
  contactType: BallContactType;
  /** Which team makes this contact */
  team: TeamSide;
  /** Target zone for the ball (normalized coordinates) */
  targetZone: "setZone" | "attackLeft" | "attackMiddle" | "attackRight" | "defenseLeft" | "defenseMiddle" | "defenseRight" | "backRow";
  /** Duration override for this flight (ms) */
  durationMs?: number;
  /** Probability this step succeeds (0-1). If fails, point ends */
  successProbability: number;
};

/**
 * A complete rally script
 */
export type RallyScript = {
  servingTeam: TeamSide;
  steps: RallyStep[];
};

/**
 * Rally outcome
 */
export type RallyOutcome = {
  winner: TeamSide;
  reason: "ace" | "kill" | "block" | "error" | "dig_fail";
  stepsCompleted: number;
};

/**
 * Target zone coordinates (normalized 0-1)
 */
const TARGET_ZONES: Record<string, (team: TeamSide, netY: number) => Vec2> = {
  setZone: (team, netY) => ({
    x: 0.7,
    y: team === "HOME" ? netY + 0.08 : netY - 0.08,
  }),
  attackLeft: (team, netY) => ({
    x: 0.22,
    y: team === "HOME" ? netY + 0.06 : netY - 0.06,
  }),
  attackMiddle: (team, netY) => ({
    x: 0.52,
    y: team === "HOME" ? netY + 0.05 : netY - 0.05,
  }),
  attackRight: (team, netY) => ({
    x: 0.82,
    y: team === "HOME" ? netY + 0.06 : netY - 0.06,
  }),
  defenseLeft: (team, netY) => ({
    x: 0.25,
    y: team === "HOME" ? netY + 0.36 : netY - 0.36,
  }),
  defenseMiddle: (team, netY) => ({
    x: 0.5,
    y: team === "HOME" ? netY + 0.36 : netY - 0.36,
  }),
  defenseRight: (team, netY) => ({
    x: 0.75,
    y: team === "HOME" ? netY + 0.36 : netY - 0.36,
  }),
  backRow: (team, netY) => ({
    x: 0.5,
    y: team === "HOME" ? netY + 0.30 : netY - 0.30,
  }),
};

/**
 * Get target position for a zone
 */
export const getTargetForZone = (
  zone: RallyStep["targetZone"],
  team: TeamSide,
  netY: number
): Vec2 => {
  const zoneFn = TARGET_ZONES[zone];
  if (!zoneFn) {
    return { x: 0.5, y: team === "HOME" ? netY + 0.3 : netY - 0.3 };
  }
  return zoneFn(team, netY);
};

/**
 * Add randomization to a target position
 */
export const addTargetVariance = (target: Vec2, variance: number = 0.05): Vec2 => ({
  x: target.x + (Math.random() - 0.5) * variance,
  y: target.y + (Math.random() - 0.5) * variance,
});

/**
 * Generate a basic rally script (serve -> pass -> set -> attack pattern)
 * Can repeat if the ball is defended
 */
export const generateRallyScript = (servingTeam: TeamSide): RallyScript => {
  const receivingTeam: TeamSide = servingTeam === "HOME" ? "AWAY" : "HOME";
  const attackLanes: RallyStep["targetZone"][] = ["attackLeft", "attackMiddle", "attackRight"];
  const defenseLanes: RallyStep["targetZone"][] = ["defenseLeft", "defenseMiddle", "defenseRight"];
  
  const randomLane = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  
  const steps: RallyStep[] = [];
  
  // Serve reception (receiving team)
  const serveTargetLane = randomLane(defenseLanes);
  steps.push({
    contactType: "pass",
    team: receivingTeam,
    targetZone: "setZone",
    successProbability: 0.85, // 85% chance to pass successfully
  });
  
  // Set (receiving team)
  const attackLane = randomLane(attackLanes);
  steps.push({
    contactType: "set",
    team: receivingTeam,
    targetZone: attackLane,
    successProbability: 0.95, // 95% chance to set successfully
  });
  
  // Attack (receiving team attacks the serving team's side)
  const defenseTargetLane = randomLane(defenseLanes);
  steps.push({
    contactType: "attack",
    team: receivingTeam,
    targetZone: defenseTargetLane,
    successProbability: 0.7, // 70% chance attack gets through
  });
  
  // Potential dig/transition by serving team
  // This creates rally extension possibilities
  const maxRallyExtensions = 3;
  let currentAttacker = servingTeam;
  
  for (let i = 0; i < maxRallyExtensions; i++) {
    // Dig
    steps.push({
      contactType: "dig",
      team: currentAttacker,
      targetZone: "setZone",
      successProbability: 0.5 - i * 0.1, // Gets harder each rally
    });
    
    // Set
    steps.push({
      contactType: "set",
      team: currentAttacker,
      targetZone: randomLane(attackLanes),
      successProbability: 0.9,
    });
    
    // Counter-attack
    const defender: TeamSide = currentAttacker === "HOME" ? "AWAY" : "HOME";
    steps.push({
      contactType: "attack",
      team: currentAttacker,
      targetZone: randomLane(defenseLanes),
      successProbability: 0.6 - i * 0.1,
    });
    
    currentAttacker = defender;
  }
  
  return {
    servingTeam,
    steps,
  };
};

/**
 * Simulate a rally script and determine outcome
 * Used for quick simulation without visual animation
 */
export const simulateRallyScript = (script: RallyScript): RallyOutcome => {
  const receivingTeam: TeamSide = script.servingTeam === "HOME" ? "AWAY" : "HOME";
  
  for (let i = 0; i < script.steps.length; i++) {
    const step = script.steps[i];
    const succeeded = Math.random() < step.successProbability;
    
    if (!succeeded) {
      // Step failed - point ends
      const winner = step.team === "HOME" ? "AWAY" : "HOME";
      let reason: RallyOutcome["reason"] = "error";
      
      if (step.contactType === "pass" && i === 0) {
        reason = "ace";
      } else if (step.contactType === "attack") {
        reason = "kill"; // Attack not defended
      } else if (step.contactType === "dig") {
        reason = "dig_fail";
      }
      
      return {
        winner,
        reason,
        stepsCompleted: i,
      };
    }
  }
  
  // All steps completed - last attacking team wins
  const lastStep = script.steps[script.steps.length - 1];
  const winner = lastStep.team;
  
  return {
    winner,
    reason: "kill",
    stepsCompleted: script.steps.length,
  };
};

/**
 * Determine rally outcome probabilities based on current game state
 */
export type RallyProbabilities = {
  aceChance: number;
  killChance: number;
  rallyExtensionChance: number;
};

export const getDefaultRallyProbabilities = (): RallyProbabilities => ({
  aceChance: 0.08, // 8% of serves are aces
  killChance: 0.35, // 35% of attacks result in kills
  rallyExtensionChance: 0.45, // 45% of attacks are defended
});

/**
 * Simple random lane selection
 */
export const randomAttackLane = (): "left" | "middle" | "right" => {
  const r = Math.random();
  if (r < 0.33) return "left";
  if (r < 0.66) return "middle";
  return "right";
};

/**
 * Get the opposite team
 */
export const getOppositeTeam = (team: TeamSide): TeamSide => {
  return team === "HOME" ? "AWAY" : "HOME";
};

