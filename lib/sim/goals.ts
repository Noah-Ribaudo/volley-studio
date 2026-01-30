import { COURT_ZONES } from "@/lib/types";
import { DEFAULT_BASE_ORDER, getRoleZone } from "@/lib/rotations";
import type { Role, Rotation } from "@/lib/types";
import type { Blackboard, CourtModel, GoalType, PlayerState, Vec2 } from "@/lib/sim/types";
import { vec2 } from "@/lib/sim/types";

export type GoalResolution = {
  target: Vec2;
  // Movement constraints (downstream only).
  allowNetProximity: boolean;
  desiredSpeedFactor: number;
};

const pctToNorm = (pct: number): number => pct / 100;

const zoneToNormalizedPoint = (zone: number): Vec2 => {
  const z = COURT_ZONES[zone as 1 | 2 | 3 | 4 | 5 | 6];
  // COURT_ZONES is now in normalized coordinates (0-1), no conversion needed
  if (!z || typeof z.x !== 'number' || typeof z.y !== 'number') {
    console.warn(`Invalid zone ${zone}, using fallback`);
    return { x: 0.5, y: 0.5 }; // Fallback to center
  }
  return { x: z.x, y: z.y };
};

const mirrorForAway = (court: CourtModel, point: Vec2): Vec2 => {
  // Mirror around the net line for the opposite side.
  const dy = point.y - court.netY;
  return { x: point.x, y: court.netY - dy };
};

const clampToCourt = (court: CourtModel, point: Vec2): Vec2 => {
  return vec2.clamp(point, court.boundsMin, court.boundsMax);
};

const attackLaneBias = (lane: "left" | "middle" | "right"): number => {
  if (lane === "left") return -0.18;
  if (lane === "right") return 0.18;
  return 0;
};

export const resolveGoalToTarget = (params: {
  goal: GoalType;
  self: PlayerState;
  bb: Blackboard;
  court: CourtModel;
  rotation: Rotation;
  baseOrder?: Role[];
}): GoalResolution => {
  const { goal, self, bb, court, rotation } = params;
  const baseOrder = params.baseOrder ?? DEFAULT_BASE_ORDER;

  // Base zone anchor (only used by movement system, never by BTs).
  const zone = getRoleZone(rotation, self.role as Role, baseOrder);
  const basePointHome = zoneToNormalizedPoint(zone);
  // Ensure basePointHome is valid (defensive check)
  if (!basePointHome || typeof basePointHome.x !== 'number' || typeof basePointHome.y !== 'number' || 
      isNaN(basePointHome.x) || isNaN(basePointHome.y)) {
    console.warn(`Invalid basePointHome for role ${self.role}, zone ${zone}, using fallback`);
    const fallbackZone = COURT_ZONES[1] || { x: 0.5, y: 0.5 };
    return { target: fallbackZone, allowNetProximity: false, desiredSpeedFactor: 0.85 };
  }
  const basePoint = self.team === "HOME" ? basePointHome : mirrorForAway(court, basePointHome);

  const ball = bb.ball.position;
  const landing = bb.ball.predicted_landing;
  const laneBiasX = attackLaneBias(bb.opponent.attack_lane);

  // Utility anchors around the net.
  const settingZoneHome: Vec2 = clampToCourt(court, { x: 0.7, y: court.netY + 0.08 });
  const settingZone = self.team === "HOME" ? settingZoneHome : mirrorForAway(court, settingZoneHome);

  const rightBlockHome: Vec2 = clampToCourt(court, { x: 0.78, y: court.netY + 0.015 });
  const rightBlock = self.team === "HOME" ? rightBlockHome : mirrorForAway(court, rightBlockHome);

  const leftApproachHome: Vec2 = clampToCourt(court, { x: 0.22, y: court.netY + 0.06 });
  const rightApproachHome: Vec2 = clampToCourt(court, { x: 0.82, y: court.netY + 0.06 });
  const middleApproachHome: Vec2 = clampToCourt(court, { x: 0.52, y: court.netY + 0.05 });

  const leftApproach = self.team === "HOME" ? leftApproachHome : mirrorForAway(court, leftApproachHome);
  const rightApproach = self.team === "HOME" ? rightApproachHome : mirrorForAway(court, rightApproachHome);
  const middleApproach = self.team === "HOME" ? middleApproachHome : mirrorForAway(court, middleApproachHome);

  switch (goal) {
    case "MaintainBaseResponsibility":
    case "ParticipateInLegalStack":
      // Ensure basePoint is within court bounds
      return { target: clampToCourt(court, basePoint), allowNetProximity: false, desiredSpeedFactor: 0.85 };

    case "HideBehindPrimaryPasser": {
      // Move slightly behind base relative to net (setter hiding in receive).
      const dy = self.team === "HOME" ? 0.08 : -0.08;
      return {
        target: clampToCourt(court, { x: basePoint.x, y: basePoint.y + dy }),
        allowNetProximity: false,
        desiredSpeedFactor: 1,
      };
    }

    case "MoveTowardSettingZone":
      return { target: clampToCourt(court, settingZone), allowNetProximity: false, desiredSpeedFactor: 1.1 };

    case "SetterDump":
      return { target: clampToCourt(court, vec2.add(settingZone, { x: 0.0, y: self.team === "HOME" ? -0.03 : 0.03 })), allowNetProximity: true, desiredSpeedFactor: 1.25 };

    case "EmergencySet":
      return { target: clampToCourt(court, settingZone), allowNetProximity: false, desiredSpeedFactor: 1.25 };

    case "QuickSetMiddle":
      return { target: clampToCourt(court, middleApproach), allowNetProximity: true, desiredSpeedFactor: 1.15 };

    case "SetToOutside":
      return { target: clampToCourt(court, leftApproach), allowNetProximity: true, desiredSpeedFactor: 1.15 };

    case "SetToOpposite":
      return { target: clampToCourt(court, rightApproach), allowNetProximity: true, desiredSpeedFactor: 1.15 };

    case "HighOutOfSystemSet":
      return {
        target: clampToCourt(court, vec2.add(settingZone, { x: 0.0, y: self.team === "HOME" ? 0.08 : -0.08 })),
        allowNetProximity: false,
        desiredSpeedFactor: 1.05,
      };

    case "ReceiveServe": {
      // Bias toward predicted landing, but keep some base structure.
      const blend = 0.65;
      const t = {
        x: basePoint.x * (1 - blend) + landing.x * blend,
        y: basePoint.y * (1 - blend) + landing.y * blend,
      };
      return { target: clampToCourt(court, t), allowNetProximity: false, desiredSpeedFactor: 1.2 };
    }

    case "ApproachAttackLeft":
      return { target: clampToCourt(court, leftApproach), allowNetProximity: true, desiredSpeedFactor: 1.25 };
    case "ApproachAttackRight":
      return { target: clampToCourt(court, rightApproach), allowNetProximity: true, desiredSpeedFactor: 1.25 };
    case "ApproachAttackMiddle":
      return { target: clampToCourt(court, middleApproach), allowNetProximity: true, desiredSpeedFactor: 1.25 };

    case "BlockRightSide": {
      // Dynamic blocking: follow the ball's x position, clamped to right side zone
      // Right side blocker covers x range roughly 0.6 to 0.9
      const ballX = landing.x;
      const clampedX = Math.max(0.6, Math.min(0.9, ballX));
      const blockPosHome: Vec2 = { x: clampedX, y: court.netY + 0.015 };
      const blockPos = self.team === "HOME" ? blockPosHome : mirrorForAway(court, blockPosHome);
      return { target: clampToCourt(court, blockPos), allowNetProximity: true, desiredSpeedFactor: 1.2 };
    }

    case "BlockMiddle": {
      // Dynamic blocking: middle blocker follows ball position across full width
      // Middle can slide anywhere to close the block
      const ballX = landing.x;
      // Clamp to reasonable blocking range (not too far into the pins)
      const clampedX = Math.max(0.2, Math.min(0.8, ballX));
      const blockPosHome: Vec2 = { x: clampedX, y: court.netY + 0.015 };
      const blockPos = self.team === "HOME" ? blockPosHome : mirrorForAway(court, blockPosHome);
      return { target: clampToCourt(court, blockPos), allowNetProximity: true, desiredSpeedFactor: 1.25 };
    }

    case "BlockLeftSide": {
      // Dynamic blocking: follow the ball's x position, clamped to left side zone
      // Left side blocker covers x range roughly 0.1 to 0.4
      const ballX = landing.x;
      const clampedX = Math.max(0.1, Math.min(0.4, ballX));
      const blockPosHome: Vec2 = { x: clampedX, y: court.netY + 0.015 };
      const blockPos = self.team === "HOME" ? blockPosHome : mirrorForAway(court, blockPosHome);
      return { target: clampToCourt(court, blockPos), allowNetProximity: true, desiredSpeedFactor: 1.2 };
    }

    case "BlockOpponentOutside": {
      // Dynamic blocking: follows ball position with lane bias for anticipation
      const ballX = landing.x;
      const biasedX = Math.max(0.15, Math.min(0.85, ballX + laneBiasX * 0.5));
      const blockPosHome: Vec2 = { x: biasedX, y: court.netY + 0.015 };
      const blockPos = self.team === "HOME" ? blockPosHome : mirrorForAway(court, blockPosHome);
      return { target: clampToCourt(court, blockPos), allowNetProximity: true, desiredSpeedFactor: 1.2 };
    }

    case "CoverTips": {
      // Tip coverage: position near net but behind blockers, on the opposite side of the block
      // Coverage position is ~0.08-0.12 back from net, positioned to cover tips/deflections
      const attackLane = bb.opponent.attack_lane;
      const tipCoverOffset = 0.10; // Distance back from net for tip coverage
      
      let coverX: number;
      if (attackLane === "left") {
        // Block is on left, cover right side for tips
        coverX = 0.65;
      } else if (attackLane === "right") {
        // Block is on right, cover left side for tips
        coverX = 0.35;
      } else {
        // Block is in middle, cover the side based on player's base position
        // Use player's base x to determine which side they should cover
        coverX = basePoint.x < 0.5 ? 0.3 : 0.7;
      }
      
      const tipCoverHome: Vec2 = { x: coverX, y: court.netY + tipCoverOffset };
      const tipCover = self.team === "HOME" ? tipCoverHome : mirrorForAway(court, tipCoverHome);
      return { target: clampToCourt(court, tipCover), allowNetProximity: true, desiredSpeedFactor: 1.1 };
    }

    case "DefendZoneBiasRightBack": {
      // Right-back defensive anchor with lane bias.
      const rightBackHome: Vec2 = clampToCourt(court, { x: 0.8333, y: 0.8333 });
      const rightBack = self.team === "HOME" ? rightBackHome : mirrorForAway(court, rightBackHome);
      return { target: clampToCourt(court, vec2.add(rightBack, { x: laneBiasX * 0.8, y: 0 })), allowNetProximity: false, desiredSpeedFactor: 1 };
    }

    case "DefendZoneBiasMiddleBack": {
      const midBackHome: Vec2 = clampToCourt(court, { x: 0.5, y: 0.8333 });
      const midBack = self.team === "HOME" ? midBackHome : mirrorForAway(court, midBackHome);
      return { target: clampToCourt(court, vec2.add(midBack, { x: laneBiasX * 0.6, y: 0 })), allowNetProximity: false, desiredSpeedFactor: 1 };
    }

    case "DefendZoneBiasLeftBack": {
      const leftBackHome: Vec2 = clampToCourt(court, { x: 0.1667, y: 0.8333 });
      const leftBack = self.team === "HOME" ? leftBackHome : mirrorForAway(court, leftBackHome);
      return { target: clampToCourt(court, vec2.add(leftBack, { x: laneBiasX * 0.8, y: 0 })), allowNetProximity: false, desiredSpeedFactor: 1 };
    }

    case "CoverHitter": {
      // Stay behind the ball as a generic cover heuristic.
      const dirToNet = self.team === "HOME" ? -1 : 1;
      return {
        target: clampToCourt(court, { x: ball.x, y: ball.y + dirToNet * 0.08 }),
        allowNetProximity: false,
        desiredSpeedFactor: 1,
      };
    }

    case "FreeBallToTarget":
      return { target: clampToCourt(court, settingZone), allowNetProximity: false, desiredSpeedFactor: 0.9 };

    case "PrepareToServe": {
      // Server goes to serving position behind the baseline (zone 1 / back right)
      // Note: Don't clamp to court - serve position should be BEHIND the baseline
      const servePositionHome: Vec2 = { x: 0.85, y: 0.98 }; // Behind home baseline
      const servePosition = self.team === "HOME" ? servePositionHome : mirrorForAway(court, servePositionHome);
      return { target: servePosition, allowNetProximity: false, desiredSpeedFactor: 1.1 };
    }

    case "TransitionFromServe": {
      // After serving, move back toward base position but slightly forward
      const transitionHome: Vec2 = clampToCourt(court, { x: 0.78, y: 0.82 });
      const transition = self.team === "HOME" ? transitionHome : mirrorForAway(court, transitionHome);
      return { target: clampToCourt(court, transition), allowNetProximity: false, desiredSpeedFactor: 1.15 };
    }

    // ========================================
    // Stacking Goals for Serve Receive (5-1 Paper)
    // ========================================

    case "PinnedAtNet": {
      // Front-row player pinned at net during receive stack.
      // R1: Front-row OH pinned on right side. R2: Front-row O pinned at net.
      // Position varies based on stack type, but generally right-center near net.
      const pinnedHome: Vec2 = { x: 0.7, y: court.netY + 0.04 };
      const pinned = self.team === "HOME" ? pinnedHome : mirrorForAway(court, pinnedHome);
      return { target: clampToCourt(court, pinned), allowNetProximity: true, desiredSpeedFactor: 0.9 };
    }

    case "ComeBackToReceive": {
      // Front-row player drops back to help receive, but stays in front of back-row players.
      // Per 5-1 Paper: "must stay slightly in front of the back row hitter/middle"
      // Position is roughly mid-court depth, left-center for most stacks.
      const comeBackHome: Vec2 = { x: 0.35, y: court.netY + 0.22 };
      const comeBack = self.team === "HOME" ? comeBackHome : mirrorForAway(court, comeBackHome);
      return { target: clampToCourt(court, comeBack), allowNetProximity: false, desiredSpeedFactor: 1.1 };
    }

    case "FrontRowMiddleHideReceive": {
      // Front-row middle crouches near the stack or slides to edge during serve receive.
      // Per 5-1 Paper: "can slide over near these two, to be out of the way of the receivers,
      // or can just crouch down out of the way in the middle front"
      const hideHome: Vec2 = { x: 0.55, y: court.netY + 0.06 };
      const hide = self.team === "HOME" ? hideHome : mirrorForAway(court, hideHome);
      return { target: clampToCourt(court, hide), allowNetProximity: true, desiredSpeedFactor: 0.8 };
    }

    case "StackRightReceivePosition": {
      // Stack right receive position (R1) - passers spread on right side of court.
      // Setter is back-right, so passers fill left and middle.
      const stackRightHome: Vec2 = { x: 0.35, y: court.netY + 0.35 };
      const stackRight = self.team === "HOME" ? stackRightHome : mirrorForAway(court, stackRightHome);
      return { target: clampToCourt(court, stackRight), allowNetProximity: false, desiredSpeedFactor: 1.0 };
    }

    case "StackMiddleReceivePosition": {
      // Stack middle receive position (R2) - passers spread across middle.
      const stackMiddleHome: Vec2 = { x: 0.5, y: court.netY + 0.35 };
      const stackMiddle = self.team === "HOME" ? stackMiddleHome : mirrorForAway(court, stackMiddleHome);
      return { target: clampToCourt(court, stackMiddle), allowNetProximity: false, desiredSpeedFactor: 1.0 };
    }

    case "StackLeftReceivePosition": {
      // Stack left receive position (R3-6) - front-row players stack left with setter.
      // Per 5-1 Paper: "stack left" means cluster on left side, setter needs space to run right.
      const stackLeftHome: Vec2 = { x: 0.25, y: court.netY + 0.08 };
      const stackLeft = self.team === "HOME" ? stackLeftHome : mirrorForAway(court, stackLeftHome);
      return { target: clampToCourt(court, stackLeft), allowNetProximity: true, desiredSpeedFactor: 0.9 };
    }

    default:
      // Ensure basePoint is valid before returning
      return { target: clampToCourt(court, basePoint), allowNetProximity: false, desiredSpeedFactor: 0.85 };
  }
};

