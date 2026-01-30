// Rally FSM - Finite State Machine for volleyball rally progression
// Enhanced with contact quality tracking, system state, and termination detection

import type { RallyPhase, TeamSide, Vec2, ContactQuality, BallDeadReason } from "@/lib/sim/types";

// ============================================================================
// Types
// ============================================================================

export type ContactRecord = {
  type: "serve" | "pass" | "set" | "attack" | "dig" | "block" | "freeball";
  quality: ContactQuality;
  playerId: string;
  team: TeamSide;
  timeMs: number;
};

export type RallyEvent =
  | { type: "START_RALLY"; serving: TeamSide }
  | { type: "SERVE_CONTACT"; playerId: string }
  | { type: "BALL_CROSSED_NET"; fromSide: TeamSide }
  | {
      type: "TEAM_TOUCHED_BALL";
      team: TeamSide;
      playerId: string;
      contactType: ContactRecord["type"];
      quality: ContactQuality;
      timeMs: number;
    }
  | { type: "BALL_DEAD"; reason: BallDeadReason; winner: TeamSide };

export type RallyFSMState = {
  phase: RallyPhase;
  serving: TeamSide;

  // Touches for the team currently playing the ball
  touchCount: number;
  lastTouchTeam: TeamSide | null;

  // Contact tracking
  possessionChain: ContactRecord[];
  lastContact: ContactRecord | null;

  // System state: true if pass was good enough for setter to run plays
  isInSystem: boolean;

  // Score tracking
  homeScore: number;
  awayScore: number;

  // Rally termination info
  rallyEndReason: BallDeadReason | null;
  rallyWinner: TeamSide | null;
};

// ============================================================================
// Contact Quality Assessment
// ============================================================================

/**
 * Assess pass quality based on distance from setter target zone
 * Setter target is typically at x=0.65-0.7, y varies by team side
 */
export const assessPassQuality = (
  landingPosition: Vec2,
  setterPosition: Vec2,
  team: TeamSide
): ContactQuality => {
  // Ideal setting zone is near the net, right of center
  const idealX = 0.65;
  const idealY = team === "HOME" ? 0.55 : 0.45; // Just past net on own side

  const distFromIdeal = Math.hypot(
    landingPosition.x - idealX,
    landingPosition.y - idealY
  );

  const distFromSetter = Math.hypot(
    landingPosition.x - setterPosition.x,
    landingPosition.y - setterPosition.y
  );

  // Combine both factors (where ball goes and where setter is)
  const combinedDist = (distFromIdeal + distFromSetter) / 2;

  if (combinedDist < 0.08) return "perfect";
  if (combinedDist < 0.15) return "good";
  if (combinedDist < 0.25) return "poor";
  return "error";
};

/**
 * Assess set quality based on hitter readiness and set location
 */
export const assessSetQuality = (
  setTarget: Vec2,
  hitterPosition: Vec2,
  hitterIsApproaching: boolean
): ContactQuality => {
  // How far is the set from a good attack position?
  // Good attacks come from near the pins (x < 0.25 or x > 0.75)
  const atPin = setTarget.x < 0.25 || setTarget.x > 0.75;
  const nearNet = Math.abs(setTarget.y - 0.5) < 0.08;

  const distToHitter = Math.hypot(
    setTarget.x - hitterPosition.x,
    setTarget.y - hitterPosition.y
  );

  if (atPin && nearNet && hitterIsApproaching && distToHitter < 0.15) {
    return "perfect";
  }
  if (nearNet && distToHitter < 0.2) {
    return "good";
  }
  if (distToHitter < 0.3) {
    return "poor";
  }
  return "error";
};

/**
 * Assess attack quality based on block and landing zone
 */
export const assessAttackQuality = (
  attackTarget: Vec2,
  blockersPresent: number,
  isInBounds: boolean
): ContactQuality => {
  if (!isInBounds) return "error";

  // Attacks with fewer blockers are generally higher quality opportunities
  // But execution still matters
  if (blockersPresent === 0) {
    return "perfect"; // No block = should be a kill
  }
  if (blockersPresent === 1) {
    return "good";
  }
  if (blockersPresent === 2) {
    return "poor"; // Double block is tough
  }
  return "poor"; // Triple block
};

// ============================================================================
// FSM State Creation
// ============================================================================

export const createInitialFSM = (
  serving: TeamSide = "HOME",
  homeScore = 0,
  awayScore = 0
): RallyFSMState => ({
  phase: "PRE_SERVE",
  serving,
  touchCount: 0,
  lastTouchTeam: null,
  possessionChain: [],
  lastContact: null,
  isInSystem: true, // Reset at rally start
  homeScore,
  awayScore,
  rallyEndReason: null,
  rallyWinner: null,
});

// ============================================================================
// FSM Reducer
// ============================================================================

export const reduceFSM = (state: RallyFSMState, event: RallyEvent): RallyFSMState => {
  switch (event.type) {
    case "START_RALLY":
      return {
        phase: "PRE_SERVE",
        serving: event.serving,
        touchCount: 0,
        lastTouchTeam: null,
        possessionChain: [],
        lastContact: null,
        isInSystem: true,
        homeScore: state.homeScore,
        awayScore: state.awayScore,
        rallyEndReason: null,
        rallyWinner: null,
      };

    case "SERVE_CONTACT": {
      if (state.phase !== "PRE_SERVE") return state;

      const serveContact: ContactRecord = {
        type: "serve",
        quality: "good", // Serve quality determined by landing
        playerId: event.playerId,
        team: state.serving,
        timeMs: 0,
      };

      return {
        ...state,
        phase: "SERVE_IN_AIR",
        touchCount: 0,
        lastTouchTeam: state.serving,
        possessionChain: [serveContact],
        lastContact: serveContact,
      };
    }

    case "BALL_CROSSED_NET": {
      if (state.phase === "SERVE_IN_AIR") {
        // Serve crossed - receiving team now has possession
        return {
          ...state,
          phase: "SERVE_RECEIVE",
          touchCount: 0,
          isInSystem: true, // Reset for receiving team
        };
      }
      if (state.phase === "ATTACK_PHASE") {
        // Attack crossed - defending team now has possession
        return {
          ...state,
          phase: "DEFENSE_PHASE",
          touchCount: 0,
          isInSystem: false, // Defense starts out of system by default
        };
      }
      // Handle other phases (e.g., freeball situations)
      if (state.phase === "SET_PHASE" || state.phase === "TRANSITION_TO_OFFENSE") {
        // Unexpected crossing (freeball over)
        return {
          ...state,
          phase: "DEFENSE_PHASE",
          touchCount: 0,
          isInSystem: false,
        };
      }
      return state;
    }

    case "TEAM_TOUCHED_BALL": {
      const { team, playerId, contactType, quality, timeMs } = event;

      // Track the contact
      const contact: ContactRecord = {
        type: contactType,
        quality,
        playerId,
        team,
        timeMs,
      };

      const newChain = [...state.possessionChain, contact];

      // Calculate touch count
      const nextTouchCount = state.lastTouchTeam === team ? state.touchCount + 1 : 1;

      // Check for four touches violation
      if (nextTouchCount > 3) {
        return {
          ...state,
          phase: "BALL_DEAD",
          touchCount: nextTouchCount,
          lastTouchTeam: team,
          possessionChain: newChain,
          lastContact: contact,
          rallyEndReason: "four_touches",
          rallyWinner: team === "HOME" ? "AWAY" : "HOME",
        };
      }

      // Check for error contact
      if (quality === "error") {
        // Determine error type based on context
        const errorReason: BallDeadReason =
          contactType === "attack" ? "error_out" :
          contactType === "serve" ? "error_out" :
          "error_net";

        return {
          ...state,
          phase: "BALL_DEAD",
          touchCount: nextTouchCount,
          lastTouchTeam: team,
          possessionChain: newChain,
          lastContact: contact,
          rallyEndReason: errorReason,
          rallyWinner: team === "HOME" ? "AWAY" : "HOME",
        };
      }

      // Update system state based on contact quality
      let isInSystem = state.isInSystem;
      if (contactType === "pass" || contactType === "dig") {
        // Pass/dig quality determines if we're in system
        isInSystem = quality === "perfect" || quality === "good";
      }

      // Phase progression based on contact type and count
      let nextPhase = state.phase;

      if (state.phase === "SERVE_RECEIVE") {
        if (contactType === "pass" && nextTouchCount === 1) {
          nextPhase = "TRANSITION_TO_OFFENSE";
        }
      }

      if (state.phase === "TRANSITION_TO_OFFENSE") {
        if (contactType === "set" && nextTouchCount === 2) {
          nextPhase = "SET_PHASE";
        }
      }

      if (state.phase === "SET_PHASE") {
        if (contactType === "attack" && nextTouchCount === 3) {
          nextPhase = "ATTACK_PHASE";
        }
      }

      if (state.phase === "DEFENSE_PHASE") {
        if ((contactType === "dig" || contactType === "pass") && nextTouchCount === 1) {
          nextPhase = "TRANSITION_TO_OFFENSE";
        }
        if (contactType === "block") {
          // Block doesn't count as a touch, stay in defense
          // But we need special handling - block can kill or deflect
          nextPhase = "DEFENSE_PHASE";
        }
      }

      return {
        ...state,
        phase: nextPhase,
        touchCount: nextTouchCount,
        lastTouchTeam: team,
        possessionChain: newChain,
        lastContact: contact,
        isInSystem,
      };
    }

    case "BALL_DEAD": {
      const { reason, winner } = event;
      const newHomeScore = winner === "HOME" ? state.homeScore + 1 : state.homeScore;
      const newAwayScore = winner === "AWAY" ? state.awayScore + 1 : state.awayScore;

      // Winner serves next rally
      const newServing = winner;

      return {
        ...state,
        phase: "BALL_DEAD",
        homeScore: newHomeScore,
        awayScore: newAwayScore,
        serving: newServing,
        rallyEndReason: reason,
        rallyWinner: winner,
      };
    }

    default:
      return state;
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine rally termination reason based on ball state and last contact
 */
export const detectRallyTermination = (params: {
  ballLanded: boolean;
  ballPosition: Vec2;
  lastContact: ContactRecord | null;
  servingTeam: TeamSide;
  phase: RallyPhase;
}): { terminated: boolean; reason?: BallDeadReason; winner?: TeamSide } => {
  const { ballLanded, ballPosition, lastContact, servingTeam, phase } = params;

  if (!ballLanded) {
    return { terminated: false };
  }

  // Determine which side the ball landed on
  const landedOnHomeSide = ballPosition.y > 0.5;
  const landedTeam: TeamSide = landedOnHomeSide ? "HOME" : "AWAY";
  const scoringTeam: TeamSide = landedTeam === "HOME" ? "AWAY" : "HOME";

  // Check if ball landed in bounds
  const inBoundsX = ballPosition.x >= 0.05 && ballPosition.x <= 0.95;
  const inBoundsY = ballPosition.y >= 0.05 && ballPosition.y <= 0.95;
  const inBounds = inBoundsX && inBoundsY;

  if (!inBounds) {
    // Ball landed out - last touching team loses point
    const loser = lastContact?.team ?? servingTeam;
    return {
      terminated: true,
      reason: "error_out",
      winner: loser === "HOME" ? "AWAY" : "HOME",
    };
  }

  // Ball landed in bounds
  if (phase === "SERVE_IN_AIR" || phase === "SERVE_RECEIVE") {
    // Ace - serve not returned
    return {
      terminated: true,
      reason: "ace",
      winner: servingTeam,
    };
  }

  if (phase === "ATTACK_PHASE" || phase === "DEFENSE_PHASE") {
    // Determine if it was a kill or dig failure
    const lastContactType = lastContact?.type;

    if (lastContactType === "attack" && lastContact) {
      return {
        terminated: true,
        reason: "kill",
        winner: lastContact.team,
      };
    }

    if (lastContactType === "block" && lastContact) {
      // Block put ball down on attacker's side
      return {
        terminated: true,
        reason: "block_kill",
        winner: lastContact.team,
      };
    }
  }

  // Generic ball landed
  return {
    terminated: true,
    reason: "ball_landed",
    winner: scoringTeam,
  };
};

/**
 * Check if the rally is in a terminal state
 */
export const isRallyOver = (state: RallyFSMState): boolean => {
  return state.phase === "BALL_DEAD";
};

/**
 * Get the number of contacts by a specific team in the current possession
 */
export const getTeamContactCount = (
  state: RallyFSMState,
  team: TeamSide
): number => {
  let count = 0;
  // Count backwards from end of chain until we hit a different team
  for (let i = state.possessionChain.length - 1; i >= 0; i--) {
    if (state.possessionChain[i].team === team) {
      count++;
    } else {
      break;
    }
  }
  return count;
};

/**
 * Get the last contact of a specific type by a team
 */
export const getLastContactOfType = (
  state: RallyFSMState,
  team: TeamSide,
  type: ContactRecord["type"]
): ContactRecord | null => {
  for (let i = state.possessionChain.length - 1; i >= 0; i--) {
    const contact = state.possessionChain[i];
    if (contact.team === team && contact.type === type) {
      return contact;
    }
  }
  return null;
};

/**
 * Create a TEAM_TOUCHED_BALL event with inferred contact type
 */
export const createTouchEvent = (params: {
  team: TeamSide;
  playerId: string;
  quality: ContactQuality;
  timeMs: number;
  touchCount: number;
  isReceivingServe: boolean;
  isDefending: boolean;
}): Extract<RallyEvent, { type: "TEAM_TOUCHED_BALL" }> => {
  const { team, playerId, quality, timeMs, touchCount, isReceivingServe, isDefending } = params;

  // Infer contact type based on game state
  let contactType: ContactRecord["type"];

  if (touchCount === 0 || (touchCount === 1 && isReceivingServe)) {
    contactType = isReceivingServe ? "pass" : "dig";
  } else if (touchCount === 1 && isDefending) {
    contactType = "dig";
  } else if (touchCount === 1) {
    contactType = "pass";
  } else if (touchCount === 2) {
    contactType = "set";
  } else {
    contactType = "attack";
  }

  return {
    type: "TEAM_TOUCHED_BALL",
    team,
    playerId,
    contactType,
    quality,
    timeMs,
  };
};
