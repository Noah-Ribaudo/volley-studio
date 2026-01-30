import type { Rotation, Role } from "@/lib/types";
import type { Blackboard, PlayerState, SimRole } from "@/lib/sim/types";
import { getRoleZone } from "@/lib/rotations";
import { getHitterMode, describeHitterMode, type HitterMode } from "@/lib/sim/rotation";
import {
  isDiagonalPair,
  getZoneRelationType,
  describeOverlapRelation,
  getConstraintDescription,
  type ZoneRelationType,
} from "@/lib/sim/ai/overlap";

export const isFrontRow = (bb: Blackboard, self: PlayerState): boolean => {
  return bb.rotation.front_row_players.includes(self.id);
};

export const isBackRow = (bb: Blackboard, self: PlayerState): boolean => {
  return !isFrontRow(bb, self);
};

/**
 * Determine which stack type for current rotation when receiving.
 * Based on 5-1 Paper:
 * - R1: Stack right (setter back-right, pins front-row H)
 * - R2: Stack middle (setter pins opposite at net)
 * - R3-6: Stack left (setter on left side, front-row stacks left)
 */
export const getReceiveStackType = (rotation: Rotation): "right" | "middle" | "left" => {
  if (rotation === 1) return "right";
  if (rotation === 2) return "middle";
  return "left";
};

/**
 * Check if this player should be "pinned at net" during serve receive.
 * Based on 5-1 Paper:
 * - R1 (stack right): Front-row OH is pinned at net
 * - R2 (stack middle): Front-row Opposite is pinned at net
 */
export const isPinnedAtNet = (bb: Blackboard, self: PlayerState): boolean => {
  const rotation = bb.rotation.index;
  const stackType = getReceiveStackType(rotation);

  // R1: Front-row OH is pinned
  if (stackType === "right" && self.category === "OUTSIDE" && isFrontRow(bb, self)) {
    return true;
  }
  // R2: Front-row Opposite is pinned
  if (stackType === "middle" && self.category === "OPPOSITE" && isFrontRow(bb, self)) {
    return true;
  }
  return false;
};

/**
 * Check if front-row player should come back to help receive.
 * Based on 5-1 Paper:
 * - R1: Opposite comes back to receive (slightly in front of back-row H)
 * - R2: Front-row Hitter comes back to receive (slightly in front of back-row M)
 * - R3: Opposite comes back to receive (slightly in front of back-row M)
 */
export const shouldComeBackToReceive = (bb: Blackboard, self: PlayerState): boolean => {
  const rotation = bb.rotation.index;

  // R1: Opposite comes back
  if (rotation === 1 && self.category === "OPPOSITE" && isFrontRow(bb, self)) {
    return true;
  }
  // R2: Front-row Hitter comes back
  if (rotation === 2 && self.category === "OUTSIDE" && isFrontRow(bb, self)) {
    return true;
  }
  // R3: Opposite comes back
  if (rotation === 3 && self.category === "OPPOSITE" && isFrontRow(bb, self)) {
    return true;
  }
  return false;
};

export const isSetter = (_bb: Blackboard, self: PlayerState): boolean => {
  return self.category === "SETTER";
};

export const isPrimaryPasser = (_bb: Blackboard, self: PlayerState): boolean => {
  // Primary passers in 3-person serve receive formation:
  // - OH1, OH2 (outside hitters) - always pass
  // - Libero - passes when subbed in
  // - Opposite - passes when in back row (without libero)
  // - Middle blockers - only pass in back row when libero is NOT in
  return self.category === "OUTSIDE" || self.category === "LIBERO";
};

/**
 * Check if player is one of the three passers in serve receive.
 * Based on reference doc: OH1, OH2, Libero form the 3-person passing triangle.
 */
export const isInPassingFormation = (bb: Blackboard, self: PlayerState): boolean => {
  // Outside hitters always pass in all 6 rotations
  if (self.category === "OUTSIDE") return true;

  // Libero is a primary passer when on court
  if (self.category === "LIBERO") return true;

  // Opposite passes when in back row (typically when libero is not in for them)
  if (self.category === "OPPOSITE" && isBackRow(bb, self)) return true;

  // Middle blockers only pass in back row AND when libero is not substituted in
  // For simplicity, we'll assume libero is always in, so middles don't pass
  // TODO: Add libero substitution tracking to determine if MB should pass
  if (self.category === "MIDDLE" && isBackRow(bb, self)) {
    // Check if libero is on court for this team
    // For now, assume libero is always in, so MBs don't pass
    return false;
  }

  return false;
};

/**
 * Check if setter should release to target zone.
 * Based on reference doc: Setter releases ON SERVER CONTACT.
 */
export const shouldSetterRelease = (bb: Blackboard, self: PlayerState): boolean => {
  if (!isSetter(bb, self)) return false;

  // Release when serve is in the air (server already made contact)
  return bb.fsm.phase === "SERVE_IN_AIR" || bb.fsm.phase === "SERVE_RECEIVE";
};

/**
 * Check if setter should stack aggressively (back row only).
 * Based on reference doc: When setter is in back row, they should stack
 * close to target position to minimize distance traveled.
 */
export const shouldSetterStack = (bb: Blackboard, self: PlayerState): boolean => {
  if (!isSetter(bb, self)) return false;

  // Only stack when in back row during PRE_SERVE
  return bb.fsm.phase === "PRE_SERVE" && isBackRow(bb, self) && !bb.serving.isOurServe;
};

/**
 * Determine if the pass quality puts team in-system.
 * Based on reference doc: In-system = perfect or good pass to target zone.
 * This affects setter's available options (quick middle vs high outside).
 */
export const isInSystem = (bb: Blackboard, self: PlayerState): boolean => {
  // Check ball proximity to setting zone (right front area, ~0.65-0.75 x, near net)
  const settingZoneX = 0.7;
  const settingZoneY = self.team === "HOME" ? 0.58 : 0.42; // Just on team's side of net

  const ballPos = bb.ball.predicted_landing;
  const distToTarget = Math.hypot(
    ballPos.x - settingZoneX,
    ballPos.y - settingZoneY
  );

  // In-system if ball is within ~0.15 normalized units of target (good pass)
  // Out-of-system if ball is far from target (poor pass)
  return distToTarget < 0.15;
};

/**
 * Check if pass is way off target and setter should bail (send freeball over).
 * Based on reference doc: Setter bails when pass is 20+ feet off target.
 */
export const shouldSetterBail = (bb: Blackboard, self: PlayerState): boolean => {
  if (!isSetter(bb, self)) return false;

  const settingZoneX = 0.7;
  const settingZoneY = self.team === "HOME" ? 0.58 : 0.42;

  const ballPos = bb.ball.predicted_landing;
  const distToTarget = Math.hypot(
    ballPos.x - settingZoneX,
    ballPos.y - settingZoneY
  );

  // Bail if ball is more than ~0.25 normalized units away (very poor pass)
  // This is roughly 20+ feet in real court scale
  return distToTarget > 0.25;
};

/**
 * Count how many blockers are likely at the net for opponent.
 * Based on reference doc: Attackers adjust shots based on block (no block, single/double, triple).
 */
export const countOpponentBlockers = (params: {
  bb: Blackboard;
  self: PlayerState;
  allPlayers: PlayerState[];
}): number => {
  const { self, allPlayers } = params;

  // Get opponent's front row players near the net
  const opponentTeam = self.team === "HOME" ? "AWAY" : "HOME";
  const netY = 0.5; // Normalized net position

  const blockersNearNet = allPlayers.filter((p) => {
    if (p.team !== opponentTeam) return false;

    // Check if they're in front row (this is approximate without rotation info)
    const isFrontRowPosition = Math.abs(p.position.y - netY) < 0.15;

    // Check if they're near the net (blocking position)
    return isFrontRowPosition && Math.abs(p.position.y - netY) < 0.08;
  });

  return blockersNearNet.length;
};

/**
 * Determine shot selection based on block count.
 * Based on reference doc:
 * - No block: Power attack
 * - Single/double block: Hit around, tool, or off-speed
 * - Triple block: Tips and placement shots
 */
export const shouldUsePowerAttack = (params: {
  bb: Blackboard;
  self: PlayerState;
  allPlayers: PlayerState[];
}): boolean => {
  const blockerCount = countOpponentBlockers(params);

  // Use power attack if no block or only single block
  // Against double/triple block, prefer tips and placement
  return blockerCount <= 1;
};

/**
 * Check if attacker should use tip/roll shot instead of power.
 * Based on reference doc: More tips against stronger blocks.
 */
export const shouldUseTipShot = (params: {
  bb: Blackboard;
  self: PlayerState;
  allPlayers: PlayerState[];
}): boolean => {
  const blockerCount = countOpponentBlockers(params);

  // Against triple block: 70% tips
  // Against double block: 30% tips
  // Against no block: 10% tips
  if (blockerCount >= 3) {
    return Math.random() < 0.7;
  } else if (blockerCount === 2) {
    return Math.random() < 0.3;
  } else {
    return Math.random() < 0.1;
  }
};

/**
 * Check if middle blocker should read and move to block location.
 * Based on reference doc: Read blocking - middle watches setter and reacts after seeing set.
 */
export const shouldMiddleBlockerRead = (bb: Blackboard, self: PlayerState): boolean => {
  // Middle blocker in front row during defense phase
  if (self.category !== "MIDDLE") return false;
  if (!isFrontRow(bb, self)) return false;

  return bb.fsm.phase === "DEFENSE_PHASE";
};

/**
 * Check if player is libero anchoring middle back defense.
 * Based on reference doc: Libero plays deepest in zone 6, anchors back row defense.
 */
export const isLiberoMiddleBack = (bb: Blackboard, self: PlayerState): boolean => {
  if (self.category !== "LIBERO") return false;

  // Libero plays middle back in defense
  return bb.fsm.phase === "DEFENSE_PHASE";
};

/**
 * Determine which defensive zone based on player role and rotation.
 * Based on reference doc: Perimeter defense with arc formation.
 */
export const getDefensiveZone = (bb: Blackboard, self: PlayerState): "left_back" | "middle_back" | "right_back" | "block" => {
  // Libero always plays middle back (deepest defender)
  if (self.category === "LIBERO") return "middle_back";

  // Front row players block
  if (isFrontRow(bb, self)) return "block";

  // Back row players form arc: left back, middle back, right back
  // This is simplified - in reality it depends on rotation
  if (self.category === "OUTSIDE") return "left_back";
  if (self.category === "OPPOSITE") return "right_back";

  return "middle_back";
};

export const canReachBallBeforeOthers = (params: {
  bb: Blackboard;
  self: PlayerState;
  allPlayers: PlayerState[];
  // Lower number = higher priority.
  priorityBias?: number;
}): boolean => {
  const { bb, self, allPlayers, priorityBias } = params;
  const bias = priorityBias ?? 0;

  const distSelf = Math.hypot(
    self.position.x - bb.ball.position.x,
    self.position.y - bb.ball.position.y
  );
  const timeSelf = distSelf / Math.max(0.001, self.maxSpeed) + (self.priority + bias) * 0.01;

  let bestTime = timeSelf;
  for (const p of allPlayers) {
    if (p.team !== self.team) continue;
    const dist = Math.hypot(p.position.x - bb.ball.position.x, p.position.y - bb.ball.position.y);
    const time = dist / Math.max(0.001, p.maxSpeed) + p.priority * 0.01;
    if (time < bestTime - 1e-6) return false;
    bestTime = Math.min(bestTime, time);
  }

  return true;
};

// ============================================================================
// Ball Reading Conditions
// Based on reference doc timing: quick sets ~0.3-0.5s, high balls ~1.0-1.5s
// ============================================================================

/**
 * Check if ball trajectory indicates a high set (more time for approach).
 * Based on reference doc: High ball = 1.0-1.5 seconds from setter contact to hitter contact.
 * High sets peak 8-12 feet above the net.
 */
export const isBallHighSet = (bb: Blackboard): boolean => {
  // A high set means the ball will take longer to reach the target
  // We can infer this from the distance to predicted landing and current ball position
  const distanceToLanding = Math.hypot(
    bb.ball.predicted_landing.x - bb.ball.position.x,
    bb.ball.predicted_landing.y - bb.ball.position.y
  );

  // High sets travel ~0.2-0.4 normalized distance and take 1+ seconds
  // Quick sets travel shorter distances with less arc
  return distanceToLanding > 0.15;
};

/**
 * Check if ball trajectory indicates a quick set (middle attack timing).
 * Based on reference doc: Quick middle ~0.3-0.5 seconds, very fast.
 * Ball is set low (1-3 feet above net).
 */
export const isBallQuickSet = (bb: Blackboard): boolean => {
  // Quick sets go to roughly the middle of the court (x ~0.4-0.6)
  // and very close to the net
  const landing = bb.ball.predicted_landing;
  const isMiddleCourt = landing.x > 0.35 && landing.x < 0.65;
  const isNearNet = Math.abs(landing.y - 0.5) < 0.12;

  return isMiddleCourt && isNearNet;
};

/**
 * Check if ball is headed to a specific zone of the court.
 * Zones: "left" (x < 0.33), "middle" (0.33-0.66), "right" (x > 0.66)
 */
export const isBallHeadedToZone = (
  bb: Blackboard,
  zone: "left" | "middle" | "right"
): boolean => {
  const x = bb.ball.predicted_landing.x;

  if (zone === "left") return x < 0.35;
  if (zone === "right") return x > 0.65;
  return x >= 0.35 && x <= 0.65;
};

/**
 * Check if ball is headed to our side of the court.
 */
export const isBallHeadedToOurSide = (
  bb: Blackboard,
  self: PlayerState
): boolean => {
  const landing = bb.ball.predicted_landing;
  if (self.team === "HOME") {
    return landing.y > 0.5; // Ball landing on HOME side (y > net)
  }
  return landing.y < 0.5; // Ball landing on AWAY side (y < net)
};

// ============================================================================
// Spatial Reasoning Conditions
// ============================================================================

/**
 * Check if there's a gap in the opponent's block formation.
 * Based on reference doc: "Hit around the block", "exploit the open seam"
 */
export const isGapInBlock = (params: {
  bb: Blackboard;
  self: PlayerState;
  allPlayers: PlayerState[];
  side: "left" | "right";
}): boolean => {
  const { self, allPlayers, side } = params;
  const opponentTeam = self.team === "HOME" ? "AWAY" : "HOME";
  const netY = 0.5;

  // Get blockers at the net
  const blockers = allPlayers.filter((p) => {
    if (p.team !== opponentTeam) return false;
    return Math.abs(p.position.y - netY) < 0.08; // Within blocking distance
  });

  // Check coverage on the specified side
  const sideX = side === "left" ? 0.25 : 0.75;
  const coveringBlockers = blockers.filter((b) =>
    Math.abs(b.position.x - sideX) < 0.2
  );

  // Gap exists if no blockers covering that side
  return coveringBlockers.length === 0;
};

/**
 * Check if opponent defense is set and ready for the attack.
 * If defense is not set, we have more attack options.
 */
export const isDefenseSetForAttack = (params: {
  bb: Blackboard;
  self: PlayerState;
  allPlayers: PlayerState[];
}): boolean => {
  const { self, allPlayers } = params;
  const opponentTeam = self.team === "HOME" ? "AWAY" : "HOME";

  const opponents = allPlayers.filter((p) => p.team === opponentTeam);

  // Check if opponents are in reasonable defensive positions
  // Front row near net, back row spread
  let frontRowReady = 0;
  let backRowReady = 0;

  for (const opp of opponents) {
    if (Math.abs(opp.position.y - 0.5) < 0.15) {
      // Near net - blocking position
      frontRowReady++;
    } else if (Math.abs(opp.position.y - 0.5) > 0.25) {
      // Deep court - defensive position
      backRowReady++;
    }
  }

  // Defense is "set" if at least 2 blockers and 2 back row defenders are positioned
  return frontRowReady >= 2 && backRowReady >= 2;
};

/**
 * Check if player should switch coverage responsibilities.
 * Used when ball direction changes or teammate is out of position.
 */
export const shouldSwitchCoverage = (params: {
  bb: Blackboard;
  self: PlayerState;
  allPlayers: PlayerState[];
}): boolean => {
  const { bb, self, allPlayers } = params;
  const landing = bb.ball.predicted_landing;

  // Find teammates on our team
  const teammates = allPlayers.filter(
    (p) => p.team === self.team && p.id !== self.id
  );

  // Check if any teammate is closer to the ball's landing spot
  const selfDist = Math.hypot(
    self.position.x - landing.x,
    self.position.y - landing.y
  );

  // If we're significantly closer than others to the ball, we should cover
  let anyoneCloser = false;
  for (const t of teammates) {
    const tDist = Math.hypot(
      t.position.x - landing.x,
      t.position.y - landing.y
    );
    if (tDist < selfDist - 0.05) {
      anyoneCloser = true;
      break;
    }
  }

  // Switch if no one else is covering and ball is headed to our zone
  return !anyoneCloser && selfDist < 0.2;
};

// ============================================================================
// Setter Intelligence Conditions
// ============================================================================

/**
 * Check if setter is in position to run a play.
 * Based on reference doc: Setting zone is zone 2-3 area, ~10-12 feet from net.
 */
export const isSetterInPosition = (params: {
  bb: Blackboard;
  self: PlayerState;
  allPlayers: PlayerState[];
}): boolean => {
  const { self, allPlayers } = params;

  const setter = allPlayers.find(
    (p) => p.team === self.team && p.category === "SETTER"
  );
  if (!setter) return false;

  // Setting zone is at x ~0.65-0.75, near the net
  const settingZoneX = 0.7;
  const settingZoneY = setter.team === "HOME" ? 0.58 : 0.42;

  const distToZone = Math.hypot(
    setter.position.x - settingZoneX,
    setter.position.y - settingZoneY
  );

  // Setter is "in position" if within ~0.1 normalized units
  return distToZone < 0.12;
};

/**
 * Determine the best attack option based on hitter positions and block.
 * Based on reference doc: In-system gives full menu, out-of-system defaults to high outside.
 */
export const getBestAttackOption = (params: {
  bb: Blackboard;
  self: PlayerState;
  allPlayers: PlayerState[];
  isInSystem: boolean;
}): "quick_middle" | "high_outside" | "back_set" | "back_row" => {
  const { bb, self, allPlayers, isInSystem } = params;

  if (!isInSystem) {
    // Out-of-system: default to high outside for safety
    return "high_outside";
  }

  // Get front row hitters using the actual blackboard
  const frontRowHitters = allPlayers.filter(
    (p) =>
      p.team === self.team &&
      p.category !== "SETTER" &&
      p.category !== "LIBERO" &&
      isFrontRow(bb, p)
  );

  // Check if middle is ready for quick (requires timing)
  const middle = frontRowHitters.find((p) => p.category === "MIDDLE");
  if (middle) {
    const middleReadyForQuick = isHitterInApproach({
      self: middle,
      bb,
      approachZone: "middle",
    });
    if (middleReadyForQuick) {
      return "quick_middle";
    }
  }

  // Check block and hitter readiness
  const blockerCount = countOpponentBlockers({
    bb,
    self,
    allPlayers,
  });

  // If weak block on right side, go back set to opposite
  if (blockerCount <= 1) {
    return "back_set";
  }

  // Default to high outside
  return "high_outside";
};

// ============================================================================
// Hitter Readiness Conditions
// ============================================================================

/**
 * Check if a hitter is in their approach position.
 * Based on reference doc: Hitters start approach as setter contacts ball.
 */
export const isHitterInApproach = (params: {
  self: PlayerState;
  bb: Blackboard;
  approachZone: "left" | "middle" | "right";
}): boolean => {
  const { self, approachZone } = params;

  // Approach positions vary by zone
  let targetX: number;
  const netDistanceForApproach = 0.15; // ~15% of court depth from net

  if (approachZone === "left") {
    targetX = 0.22;
  } else if (approachZone === "right") {
    targetX = 0.78;
  } else {
    targetX = 0.5;
  }

  const netY = 0.5;
  const approachY = self.team === "HOME" ? netY + netDistanceForApproach : netY - netDistanceForApproach;

  const distToApproach = Math.hypot(
    self.position.x - targetX,
    self.position.y - approachY
  );

  // Player is in approach if within ~0.1 of approach position
  return distToApproach < 0.12;
};

/**
 * Check if middle blocker is ready for a quick attack.
 * Based on reference doc: Middle starts approach BEFORE setter contact.
 */
export const isMiddleReadyForQuick = (params: {
  bb: Blackboard;
  self: PlayerState;
  allPlayers: PlayerState[];
}): boolean => {
  const { bb, self, allPlayers } = params;

  const middle = allPlayers.find(
    (p) => p.team === self.team && p.category === "MIDDLE"
  );

  if (!middle) return false;

  // Middle needs to be front row
  if (!isFrontRow(bb, middle)) {
    return false;
  }

  // Check if middle is in approach position (near center, close to net)
  return isHitterInApproach({
    self: middle,
    bb,
    approachZone: "middle",
  });
};

// ============================================================================
// Attack Coverage Conditions
// ============================================================================

/**
 * Check if team should collapse for hitter coverage.
 * Based on reference doc: Coverage forms semicircle 10-15 feet from hitter.
 */
export const shouldCollapseCoverage = (params: {
  bb: Blackboard;
  self: PlayerState;
}): boolean => {
  const { bb, self } = params;

  // Collapse when in attack phase and ball is on our side
  if (bb.fsm.phase !== "ATTACK_PHASE") return false;
  if (!bb.ball.on_our_side) return false;

  // Non-attacking players should collapse
  // Check if we're not the one closest to the attack position
  const attackX = bb.ball.predicted_landing.x;
  const selfDistToAttack = Math.abs(self.position.x - attackX);

  // If we're far from the attack position, we should collapse
  return selfDistToAttack > 0.2;
};

/**
 * Get optimal coverage position based on attack direction.
 */
export const getCoveragePosition = (params: {
  bb: Blackboard;
  self: PlayerState;
  attackSide: "left" | "middle" | "right";
}): "front_left" | "front_right" | "back_center" | "back_left" | "back_right" => {
  const { self, attackSide } = params;

  // Coverage positions based on attacker location
  // Setter covers front, back row players cover sides
  if (self.category === "SETTER") {
    return attackSide === "left" ? "front_right" : "front_left";
  }

  if (self.category === "LIBERO") {
    return "back_center";
  }

  // Other back row players
  if (attackSide === "left") {
    return self.position.x < 0.5 ? "back_left" : "back_right";
  }

  return self.position.x < 0.5 ? "back_left" : "back_right";
};

// ============================================================================
// Urgency Conditions
// ============================================================================

/**
 * Check if player should dive to save the ball.
 * Based on reference doc: Diving is necessary when ball is out of normal reach.
 */
export const shouldDive = (params: {
  bb: Blackboard;
  self: PlayerState;
  allPlayers: PlayerState[];
}): boolean => {
  const { bb, self, allPlayers } = params;

  const distToBall = Math.hypot(
    self.position.x - bb.ball.position.x,
    self.position.y - bb.ball.position.y
  );

  // Check if we're the closest player
  const isClosest = canReachBallBeforeOthers({
    bb,
    self,
    allPlayers,
    priorityBias: 0,
  });

  // Dive conditions:
  // 1. We're the closest player
  // 2. Ball is at edge of our reach (0.12-0.2 normalized distance)
  // 3. Ball is on our side
  const needsDive = isClosest && distToBall > 0.1 && distToBall < 0.22 && bb.ball.on_our_side;

  return needsDive;
};

/**
 * Check if ball is an emergency situation (about to land, no one in position).
 */
export const isEmergencyBall = (params: {
  bb: Blackboard;
  self: PlayerState;
  allPlayers: PlayerState[];
}): boolean => {
  const { bb, self, allPlayers } = params;

  if (!bb.ball.on_our_side) return false;

  // Check if anyone is close enough to the ball
  const teammates = allPlayers.filter((p) => p.team === self.team);

  let closestDist = Infinity;
  for (const t of teammates) {
    const dist = Math.hypot(
      t.position.x - bb.ball.position.x,
      t.position.y - bb.ball.position.y
    );
    closestDist = Math.min(closestDist, dist);
  }

  // Emergency if closest teammate is >0.15 away (borderline unreachable)
  return closestDist > 0.15;
};

// ============================================================================
// Transition Conditions
// ============================================================================

/**
 * Check if player should transition from defense to offense.
 * Based on reference doc: After dig, players transition to attack positions.
 */
export const shouldTransitionToOffense = (bb: Blackboard, _self: PlayerState): boolean => {
  // Transition when:
  // 1. Ball is on our side (we have control)
  // 2. We just made contact (touch_count > 0)
  // 3. We're not in attack phase yet
  return (
    bb.ball.on_our_side &&
    bb.ball.touch_count >= 1 &&
    bb.fsm.phase !== "ATTACK_PHASE"
  );
};

/**
 * Check if player should transition from offense to defense.
 * Based on reference doc: After attack, players prepare for possible return.
 */
export const shouldTransitionToDefense = (bb: Blackboard, _self: PlayerState): boolean => {
  // Transition to defense when:
  // 1. Ball is not on our side (opponent has it)
  // 2. Or we just attacked (phase is ATTACK_PHASE and ball crossed)
  return !bb.ball.on_our_side;
};

// ============================================================================
// Hitter Mode Conditions (Based on Research)
// ============================================================================

/**
 * Check if current rotation is a 3-hitter rotation (setter in back row).
 * In 3-hitter rotations (R1-3), team has all three front-row attackers available.
 */
export const is3HitterRotation = (bb: Blackboard): boolean => {
  return getHitterMode(bb.rotation.index) === "3-hitter";
};

/**
 * Check if current rotation is a 2-hitter rotation (setter in front row).
 * In 2-hitter rotations (R4-6), only 2 front-row attackers are available.
 */
export const is2HitterRotation = (bb: Blackboard): boolean => {
  return getHitterMode(bb.rotation.index) === "2-hitter";
};

/**
 * Get hitter mode for current rotation.
 */
export const getCurrentHitterMode = (bb: Blackboard): HitterMode => {
  return getHitterMode(bb.rotation.index);
};

/**
 * Get educational description of current hitter mode.
 */
export const getHitterModeDescription = (bb: Blackboard): string => {
  return describeHitterMode(bb.rotation.index);
};

// ============================================================================
// Overlap Relationship Conditions (Based on Research: T and L Rule)
// ============================================================================

/**
 * Get the zone for a player's role in the current rotation.
 */
export const getPlayerZone = (bb: Blackboard, self: PlayerState): number => {
  // Convert SimRole to Role (excluding 'L' for libero)
  const role = self.role === "L" ? "OPP" : self.role as Role; // Libero replaces a position
  return getRoleZone(bb.rotation.index, role);
};

/**
 * Check if this player is diagonal to another player.
 * Diagonal players have NO overlap constraint - they can position freely.
 */
export const isDiagonalToRole = (
  bb: Blackboard,
  self: PlayerState,
  otherRole: SimRole
): boolean => {
  const selfZone = getPlayerZone(bb, self);
  const otherRoleAsRole = otherRole === "L" ? "OPP" : otherRole as Role;
  const otherZone = getRoleZone(bb.rotation.index, otherRoleAsRole);

  return isDiagonalPair(selfZone, otherZone);
};

/**
 * Check if this player is diagonal to the setter.
 * If diagonal, player has complete positioning freedom pre-serve.
 */
export const isDiagonalToSetter = (bb: Blackboard, self: PlayerState): boolean => {
  return isDiagonalToRole(bb, self, "S");
};

/**
 * Check if player has positioning freedom due to diagonal relationships.
 * Returns true if the player is diagonal to key constraint players.
 */
export const hasOverlapFreedom = (bb: Blackboard, self: PlayerState): boolean => {
  // Check diagonal relationship with setter (most common constraint concern)
  return isDiagonalToSetter(bb, self);
};

/**
 * Get the zone relationship type for this player's position.
 * - "T" positions (zones 3, 6) have 3 adjacent zones
 * - "L" positions (zones 1, 2, 4, 5) have 2 adjacent zones
 */
export const getPlayerZoneType = (bb: Blackboard, self: PlayerState): ZoneRelationType => {
  const zone = getPlayerZone(bb, self);
  return getZoneRelationType(zone);
};

/**
 * Get a description of the overlap relationship for educational thoughts.
 */
export const getOverlapDescription = (
  bb: Blackboard,
  self: PlayerState,
  otherRole: SimRole,
  otherRoleName: string
): string => {
  const selfZone = getPlayerZone(bb, self);
  const otherRoleAsRole = otherRole === "L" ? "OPP" : otherRole as Role;
  const otherZone = getRoleZone(bb.rotation.index, otherRoleAsRole);

  return describeOverlapRelation(selfZone, otherZone, otherRoleName);
};

/**
 * Get the constraint description if an overlap constraint exists.
 */
export const getOverlapConstraintDescription = (
  bb: Blackboard,
  self: PlayerState,
  otherRole: SimRole,
  otherRoleName: string
): string => {
  const selfZone = getPlayerZone(bb, self);
  const otherRoleAsRole = otherRole === "L" ? "OPP" : otherRole as Role;
  const otherZone = getRoleZone(bb.rotation.index, otherRoleAsRole);

  return getConstraintDescription(selfZone, otherZone, otherRoleName);
};

