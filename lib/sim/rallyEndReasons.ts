// Rally End Reason Generator
// Creates human-readable descriptions of how rallies ended

import type { BallDeadReason, TeamSide, PlayerId } from "@/lib/sim/types";
import type { ContactRecord } from "@/lib/sim/fsm";

export type RallyEndDescription = {
  title: string;
  description: string;
  reason: BallDeadReason;
  winner: TeamSide;
  keyPlayer?: PlayerId;
};

// Map role abbreviations to friendly display names
const ROLE_DISPLAY_NAMES: Record<string, string> = {
  "S": "setter",
  "OH1": "outside hitter",
  "OH2": "outside hitter",
  "MB1": "middle blocker",
  "MB2": "middle blocker",
  "OPP": "opposite",
  "L": "libero",
};

/**
 * Convert a player ID like "H-OPP" or "A-MB1" to a friendly name like "Our opposite" or "Their middle blocker"
 */
function formatPlayerName(playerId: PlayerId, playerTeam: TeamSide | null): string {
  // Extract role from player ID (e.g., "H-OPP" -> "OPP", "A-MB1" -> "MB1")
  const parts = playerId.split("-");
  const role = parts.length > 1 ? parts[1] : playerId;

  // Get friendly role name
  const roleName = ROLE_DISPLAY_NAMES[role] || role.toLowerCase();

  // Determine team prefix based on player ID prefix
  const isHomePlayer = playerId.startsWith("H-");
  const teamPrefix = isHomePlayer ? "Our" : "Their";

  return `${teamPrefix} ${roleName}`;
}

/**
 * Generate a human-readable description of how the rally ended.
 */
export function generateRallyEndDescription(params: {
  reason: BallDeadReason;
  winner: TeamSide;
  lastContact: ContactRecord | null;
  possessionChain: ContactRecord[];
  playerNames?: Record<PlayerId, string>; // Optional player name lookup
}): RallyEndDescription {
  const { reason, winner, lastContact, possessionChain, playerNames = {} } = params;

  const getPlayerName = (playerId: PlayerId, team: TeamSide | null = null) => {
    // If custom name provided, use it
    if (playerNames[playerId]) {
      return playerNames[playerId];
    }
    // Otherwise format the player ID nicely
    return formatPlayerName(playerId, team);
  };

  const loser: TeamSide = winner === "HOME" ? "AWAY" : "HOME";
  const winnerName = winner === "HOME" ? "Us" : "Them";
  const loserName = loser === "HOME" ? "Us" : "Them";

  switch (reason) {
    case "ace": {
      // Serve not returned
      const server = lastContact?.playerId;
      const serverName = server ? getPlayerName(server) : "Server";

      return {
        title: "Ace!",
        description: `${serverName} delivered a service ace. The receiving team couldn't make a play on the ball.`,
        reason,
        winner,
        keyPlayer: server || undefined,
      };
    }

    case "kill": {
      // Attack not returned
      const attacker = lastContact?.playerId;
      const attackerName = attacker ? getPlayerName(attacker) : "Attacker";

      return {
        title: "Kill!",
        description: `${attackerName} hammered it down for a kill. The defense couldn't dig it.`,
        reason,
        winner,
        keyPlayer: attacker || undefined,
      };
    }

    case "block_kill": {
      // Ball lands on attacker's side after block
      const blocker = lastContact?.playerId;
      const blockerName = blocker ? getPlayerName(blocker) : "Blocker";

      return {
        title: "Stuff Block!",
        description: `${blockerName} roofed it! The block sent the ball straight down on the attacker's side.`,
        reason,
        winner,
        keyPlayer: blocker || undefined,
      };
    }

    case "error_net": {
      // Ball hit into net
      const errorPlayer = lastContact?.playerId;
      const errorPlayerName = errorPlayer ? getPlayerName(errorPlayer) : "A player";
      const contactType = lastContact?.type || "hit";
      const weWon = winner === "HOME";

      return {
        title: "Net Violation",
        description: `${errorPlayerName}'s ${contactType} went into the net. ${weWon ? "We win" : "They win"} the point.`,
        reason,
        winner,
        keyPlayer: errorPlayer || undefined,
      };
    }

    case "error_out": {
      // Ball hit out of bounds
      const errorPlayer = lastContact?.playerId;
      const errorPlayerName = errorPlayer ? getPlayerName(errorPlayer) : "A player";
      const contactType = lastContact?.type || "hit";
      const weWon = winner === "HOME";

      return {
        title: "Out of Bounds",
        description: `${errorPlayerName}'s ${contactType} sailed out of bounds. ${weWon ? "We win" : "They win"} the point.`,
        reason,
        winner,
        keyPlayer: errorPlayer || undefined,
      };
    }

    case "four_touches": {
      // Too many touches
      const weLost = loser === "HOME";
      const weWon = winner === "HOME";
      return {
        title: "Four Touches",
        description: `${weLost ? "We" : "They"} touched the ball four times. ${weWon ? "We win" : "They win"} the point on the violation.`,
        reason,
        winner,
      };
    }

    case "double_hit": {
      // Illegal double contact
      const errorPlayer = lastContact?.playerId;
      const errorPlayerName = errorPlayer ? getPlayerName(errorPlayer) : "A player";
      const weWon = winner === "HOME";

      return {
        title: "Double Contact",
        description: `${errorPlayerName} was called for a double hit. ${weWon ? "We win" : "They win"} the point.`,
        reason,
        winner,
        keyPlayer: errorPlayer || undefined,
      };
    }

    case "ball_landed": {
      // Generic ball hit floor
      // Try to determine who couldn't get to it
      const defenders = possessionChain
        .slice()
        .reverse()
        .filter((c) => c.team === loser);

      const lastDefender = defenders[0];
      const weWon = winner === "HOME";

      if (lastDefender) {
        const defenderName = getPlayerName(lastDefender.playerId);
        return {
          title: "Ball Down",
          description: `${defenderName} couldn't get to the ball in time. ${weWon ? "We win" : "They win"} the point.`,
          reason,
          winner,
          keyPlayer: lastDefender.playerId,
        };
      }

      const weLost = loser === "HOME";
      return {
        title: "Ball Down",
        description: `The ball hit the floor. ${weLost ? "We" : "They"} couldn't make a play on it.`,
        reason,
        winner,
      };
    }

    default: {
      const weWon = winner === "HOME";
      return {
        title: "Point Scored",
        description: `${weWon ? "We win" : "They win"} the point.`,
        reason,
        winner,
      };
    }
  }
}

/**
 * Get a concise title for the rally end (for notifications, etc.)
 */
export function getRallyEndTitle(reason: BallDeadReason): string {
  switch (reason) {
    case "ace": return "Ace!";
    case "kill": return "Kill!";
    case "block_kill": return "Stuff Block!";
    case "error_net": return "Net Violation";
    case "error_out": return "Out of Bounds";
    case "four_touches": return "Four Touches";
    case "double_hit": return "Double Contact";
    case "ball_landed": return "Ball Down";
    default: return "Point Scored";
  }
}
