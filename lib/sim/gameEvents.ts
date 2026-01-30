// Game Event Message Generator
// Creates timeline markers for player thoughts to show game context

import type {
  ThoughtMessage,
  PlayerId,
  TeamSide,
  BallContactType,
  ContactQuality,
  RallyPhase,
} from "@/lib/sim/types";
import type { ContactRecord } from "@/lib/sim/fsm";

let eventIdCounter = 0;

/**
 * Generate a unique ID for game events
 */
function generateEventId(): string {
  return `game_event_${Date.now()}_${eventIdCounter++}`;
}

/**
 * Get friendly player name with role
 */
function getPlayerDescription(
  playerId: PlayerId,
  team: TeamSide,
  playerNames?: Record<PlayerId, string>
): string {
  const name = playerNames?.[playerId] || playerId;
  const teamName = team === "HOME" ? "home" : "away";
  return `${teamName} ${name}`;
}

/**
 * Get contact type description
 */
function getContactTypeDescription(contactType: BallContactType): string {
  switch (contactType) {
    case "serve": return "served";
    case "pass": return "passed";
    case "set": return "set";
    case "attack": return "attacked";
    case "dig": return "dug";
    case "block": return "blocked";
    case "freeball": return "sent a freeball";
    default: return "contacted";
  }
}

/**
 * Get contact quality description
 */
function getQualityDescription(quality: ContactQuality): string {
  switch (quality) {
    case "perfect": return "perfectly";
    case "good": return "well";
    case "poor": return "poorly";
    case "error": return "with an error";
    default: return "";
  }
}

/**
 * Create a ball contact game event
 */
export function createBallContactEvent(params: {
  contact: ContactRecord;
  timeMs: number;
  playerNames?: Record<PlayerId, string>;
}): ThoughtMessage {
  const { contact, timeMs, playerNames } = params;

  const player = getPlayerDescription(contact.playerId, contact.team, playerNames);
  const actionVerb = getContactTypeDescription(contact.type);
  const quality = getQualityDescription(contact.quality);

  let content: string;

  if (quality && quality !== "") {
    content = `${player} ${actionVerb} ${quality}`;
  } else {
    content = `${player} ${actionVerb}`;
  }

  return {
    id: generateEventId(),
    role: "game_event",
    content,
    createdAtMs: timeMs,
    meta: {
      eventType: "ball_contact",
      contactType: contact.type,
      contactQuality: contact.quality,
      actingPlayer: contact.playerId,
      team: contact.team,
    },
  };
}

/**
 * Create a phase change game event
 */
export function createPhaseChangeEvent(params: {
  newPhase: RallyPhase;
  timeMs: number;
}): ThoughtMessage {
  const { newPhase, timeMs } = params;

  const phaseDescriptions: Record<RallyPhase, string> = {
    PRE_SERVE: "Rally starting - teams in serve receive formation",
    SERVE_IN_AIR: "Serve in the air",
    SERVE_RECEIVE: "Receiving serve",
    TRANSITION_TO_OFFENSE: "Transitioning to offense",
    SET_PHASE: "Setter making play",
    ATTACK_PHASE: "Attack incoming",
    TRANSITION_TO_DEFENSE: "Transitioning to defense",
    DEFENSE_PHASE: "Defending",
    BALL_DEAD: "Rally ended",
  };

  return {
    id: generateEventId(),
    role: "game_event",
    content: phaseDescriptions[newPhase] || `Phase: ${newPhase}`,
    createdAtMs: timeMs,
    meta: {
      eventType: "phase_change",
      phase: newPhase,
    },
  };
}

/**
 * Create a ball crossed net event
 */
export function createBallCrossedNetEvent(params: {
  fromSide: TeamSide;
  timeMs: number;
}): ThoughtMessage {
  const { fromSide, timeMs } = params;

  const fromTeam = fromSide === "HOME" ? "home" : "away";
  const toTeam = fromSide === "HOME" ? "away" : "home";

  return {
    id: generateEventId(),
    role: "game_event",
    content: `Ball crossed net from ${fromTeam} to ${toTeam}`,
    createdAtMs: timeMs,
    meta: {
      eventType: "ball_crossed_net",
      team: fromSide,
    },
  };
}

/**
 * Create a rally end event
 */
export function createRallyEndEvent(params: {
  reason: string;
  winner: TeamSide;
  timeMs: number;
}): ThoughtMessage {
  const { reason, winner, timeMs } = params;

  const winnerTeam = winner === "HOME" ? "home" : "away";

  return {
    id: generateEventId(),
    role: "game_event",
    content: `Rally ended: ${reason} - ${winnerTeam} wins point`,
    createdAtMs: timeMs,
    meta: {
      eventType: "rally_end",
      team: winner,
    },
  };
}

/**
 * Create a simple descriptive game event
 */
export function createGameEvent(params: {
  description: string;
  timeMs: number;
  eventType?: "ball_contact" | "phase_change" | "rally_end" | "ball_crossed_net";
}): ThoughtMessage {
  const { description, timeMs, eventType } = params;

  return {
    id: generateEventId(),
    role: "game_event",
    content: description,
    createdAtMs: timeMs,
    meta: {
      eventType,
    },
  };
}
