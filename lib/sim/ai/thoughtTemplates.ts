/**
 * Principle-based thought generation for educational volleyball explanations.
 *
 * Based on research findings, thoughts should explain the "why" not just the "what":
 * - Reference diagonal freedom when applicable
 * - Explain 2/3-hitter mode implications
 * - Describe T/L relationships affecting positioning
 *
 * These templates transform simple action descriptions into educational moments.
 */

import type { Rotation, Role } from "@/lib/types";
import type { Blackboard, PlayerState, SimRoleCategory, RallyPhase } from "@/lib/sim/types";
import { getHitterMode, describeHitterMode, type HitterMode } from "@/lib/sim/rotation";
import { getRoleZone } from "@/lib/rotations";
import {
  isDiagonalPair,
  getZoneRelationType,
  getConstraintDescription,
} from "@/lib/sim/ai/overlap";

// ============================================================================
// Role Name Helpers
// ============================================================================

const ROLE_DISPLAY_NAMES: Record<SimRoleCategory, string> = {
  SETTER: "setter",
  OUTSIDE: "outside hitter",
  MIDDLE: "middle blocker",
  OPPOSITE: "opposite",
  LIBERO: "libero",
};

function getRoleDisplayName(category: SimRoleCategory): string {
  return ROLE_DISPLAY_NAMES[category] ?? category.toLowerCase();
}

// ============================================================================
// Context Building
// ============================================================================

export type ThoughtContext = {
  rotation: Rotation;
  hitterMode: HitterMode;
  playerRole: SimRoleCategory;
  phase: RallyPhase;
  selfZone: number;
  // Overlap context
  isDiagonalToSetter: boolean;
  zoneType: "T" | "L";
};

/**
 * Build thought context from blackboard and player state.
 */
export function buildThoughtContext(bb: Blackboard, self: PlayerState): ThoughtContext {
  const rotation = bb.rotation.index;
  const selfRole = self.role === "L" ? "OPP" : self.role as Role;
  const selfZone = getRoleZone(rotation, selfRole);
  const setterZone = getRoleZone(rotation, "S");

  return {
    rotation,
    hitterMode: getHitterMode(rotation),
    playerRole: self.category,
    phase: bb.fsm.phase,
    selfZone,
    isDiagonalToSetter: isDiagonalPair(selfZone, setterZone),
    zoneType: getZoneRelationType(selfZone),
  };
}

// ============================================================================
// Thought Templates
// ============================================================================

/**
 * Build a thought with role prefix.
 * Example: "As the outside hitter, I'm coming back to pass."
 */
export function withRolePrefix(category: SimRoleCategory, thought: string): string {
  const roleName = getRoleDisplayName(category);
  return `As the ${roleName}, ${thought}`;
}

/**
 * Add diagonal freedom explanation if applicable.
 * Example: "Since I'm diagonal to the setter, I can position freely."
 */
export function addDiagonalExplanation(
  thought: string,
  isDiagonal: boolean,
  targetRole: string = "setter"
): string {
  if (!isDiagonal) return thought;
  return `${thought} Since I'm diagonal to the ${targetRole}, I can position freely.`;
}

/**
 * Add overlap constraint explanation.
 * Example: "I'm in an L relationship with the middle - I need to stay to their left."
 */
export function addConstraintExplanation(
  thought: string,
  selfZone: number,
  otherZone: number,
  otherRoleName: string
): string {
  const constraint = getConstraintDescription(selfZone, otherZone, otherRoleName);
  if (!constraint) return thought;
  return `${thought} ${constraint}.`;
}

/**
 * Add hitter mode context.
 * Example: "This is a 3-hitter rotation, so we have all three attack options."
 */
export function addHitterModeContext(thought: string, rotation: Rotation): string {
  const mode = getHitterMode(rotation);
  if (mode === "3-hitter") {
    return `${thought} (3-hitter rotation - all attack options available)`;
  }
  return `${thought} (2-hitter rotation)`;
}

// ============================================================================
// Pre-built Thought Patterns for Common Scenarios
// ============================================================================

/**
 * Generate a serve receive thought with overlap context.
 */
export function buildServeReceiveThought(
  action: string,
  context: ThoughtContext
): string {
  const roleName = getRoleDisplayName(context.playerRole);

  // Base thought with role
  let thought = `As the ${roleName}, ${action}`;

  // Add diagonal freedom if applicable
  if (context.isDiagonalToSetter) {
    thought = `${thought}. Since I'm diagonal to the setter, I can position freely.`;
  }

  return thought;
}

/**
 * Generate a pinned-at-net thought with constraint explanation.
 */
export function buildPinnedThought(
  context: ThoughtContext,
  constraintWith: { zone: number; roleName: string }
): string {
  const roleName = getRoleDisplayName(context.playerRole);
  const zoneType = context.zoneType;

  const constraint = getConstraintDescription(
    context.selfZone,
    constraintWith.zone,
    constraintWith.roleName
  );

  return `As the ${roleName}, I'm pinned at the net. I'm in a ${zoneType} relationship with the ${constraintWith.roleName} - ${constraint || "I need to maintain my relative position"}.`;
}

/**
 * Generate a setting decision thought with hitter mode context.
 */
export function buildSetDecisionThought(
  setType: "quick" | "high_outside" | "back_set" | "dump",
  context: ThoughtContext
): string {
  const modeDescription = describeHitterMode(context.rotation);

  const setDescriptions = {
    quick: "Running a quick set to the middle.",
    high_outside: "Setting high ball to the outside.",
    back_set: "Going with a back set to the opposite.",
    dump: "Taking the setter dump - I'm front row.",
  };

  return `${modeDescription} ${setDescriptions[setType]}`;
}

/**
 * Generate an attack approach thought.
 */
export function buildApproachThought(
  side: "left" | "right" | "middle",
  context: ThoughtContext
): string {
  const roleName = getRoleDisplayName(context.playerRole);

  const sideDescriptions = {
    left: "approaching from the left side",
    right: "approaching from the right side",
    middle: "approaching for a quick attack in the middle",
  };

  return `As the ${roleName}, ${sideDescriptions[side]}.`;
}

/**
 * Generate a defense positioning thought.
 */
export function buildDefenseThought(
  position: "left_back" | "middle_back" | "right_back" | "block",
  context: ThoughtContext
): string {
  const roleName = getRoleDisplayName(context.playerRole);

  const positionDescriptions = {
    left_back: "positioning in left back for perimeter defense",
    middle_back: "anchoring middle back - deepest defender",
    right_back: "covering right back",
    block: "moving to the net to block",
  };

  return `As the ${roleName}, ${positionDescriptions[position]}.`;
}

// ============================================================================
// Utility: Combine thoughts
// ============================================================================

/**
 * Combine multiple thought fragments into a coherent sentence.
 */
export function combineThoughts(...fragments: (string | null | undefined)[]): string {
  return fragments
    .filter((f): f is string => Boolean(f))
    .join(" ")
    .trim();
}

// ============================================================================
// Quick builders for common BT action reasons
// ============================================================================

/**
 * Build a simple thought for stacking positions.
 */
export function buildStackThought(
  stackType: "right" | "middle" | "left",
  context: ThoughtContext
): string {
  const roleName = getRoleDisplayName(context.playerRole);

  const stackDescriptions = {
    right: "Stack right formation - setter is back-right.",
    middle: "Stack middle formation - setter pins opposite at net.",
    left: "Stack left formation - front-row players stack left of passers.",
  };

  let thought = `As the ${roleName}, forming ${stackDescriptions[stackType]}`;

  if (context.isDiagonalToSetter) {
    thought += " I'm diagonal to the setter, so I have positioning freedom.";
  }

  return thought;
}

/**
 * Build a thought for coming back to receive.
 */
export function buildComeBackThought(context: ThoughtContext): string {
  const roleName = getRoleDisplayName(context.playerRole);

  let thought = `As the front-row ${roleName}, I'm coming back to help receive.`;

  if (context.isDiagonalToSetter) {
    thought += " Since I'm diagonal to the setter, I can position freely without overlap concerns.";
  }

  return thought;
}
