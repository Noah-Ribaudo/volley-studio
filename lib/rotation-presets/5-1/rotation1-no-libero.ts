/**
 * 5-1 Rotation 1 - No Libero
 *
 * Source: 5-1 Volleyball Rotation Guidelines and Formation.pdf, page 3
 *
 * Coordinate System:
 * - x: 0 = left sideline, 1 = right sideline
 * - y: 0.5 = net, 1.0 = home baseline
 *
 * Court viewed from our team's side (net at top):
 * - Front row (zones 4,3,2): y ~ 0.55-0.65
 * - Back row (zones 5,6,1): y ~ 0.75-0.95
 *
 * Rotation 1 Overview:
 * - Setter (S) starts in Zone 1 (back right)
 * - This is a "setter in back row" rotation = 3 front row attackers
 * - Front row: RS (Zone 4), MB1 (Zone 3), OH1 (Zone 2)
 * - Back row: OH2 (Zone 5), MB2 (Zone 6), S (Zone 1)
 */

import { RotationPreset } from '../schema'

export const rotation1NoLibero: RotationPreset = {
  rotation: 1,

  /**
   * HOME - Legal starting position before serve
   *
   * Referees check this position. Players must maintain proper
   * rotation order (front row left-to-right, back row left-to-right).
   *
   * Visual (NET at top):
   *   RS    MB₁   OH₁
   *   ┌──────────────┐
   *   │              │
   *   │OH₂  MB₂   S  │
   *   └──────────────┘
   */
  home: {
    positions: {
      // Front row - legal positions at zone centers
      RS: { x: 0.17, y: 0.58 },    // Zone 4 - left front
      MB1: { x: 0.50, y: 0.58 },   // Zone 3 - center front
      OH1: { x: 0.83, y: 0.58 },   // Zone 2 - right front

      // Back row - legal positions at zone centers
      OH2: { x: 0.17, y: 0.83 },   // Zone 5 - left back
      MB2: { x: 0.50, y: 0.83 },   // Zone 6 - center back
      S: { x: 0.83, y: 0.83 },     // Zone 1 - right back
    },
    // Arrows show movement to Serve Receive positions
    arrows: {
      RS: { x: 0.20, y: 0.58 },    // Stays zone 4 area
      MB1: { x: 0.70, y: 0.56 },   // Shifts right toward zone 2-3
      OH1: { x: 0.72, y: 0.70 },   // Drops back to receive
      OH2: { x: 0.18, y: 0.72 },   // Moves into receive position
      MB2: { x: 0.50, y: 0.88 },   // Drops to deep center for receive
      S: { x: 0.85, y: 0.80 },     // Stays back right, ready to release
    },
  },

  /**
   * SERVE - Position when YOUR team is serving
   *
   * Players are in positions preparing to transition to defense.
   * The arrows show movement to BASE (defensive) positions.
   *
   * Visual (NET at top):
   *       MB₁
   *   RS  ↘OH₁
   *   ┌──────────────┐
   *   │      ↓       │
   *   │ MB₂         │
   *   │     ↙       │
   *   │OH₂          │
   *   └──────────────┘
   *
   * Note: Players outside box start there, arrows show transition
   */
  serve: {
    positions: {
      // Front row - shifted from home to prepare for defense
      RS: { x: 0.20, y: 0.55 },    // Zone 4 - left front at net
      MB1: { x: 0.55, y: 0.52 },   // Zone 3 area - center front at net
      OH1: { x: 0.75, y: 0.55 },   // Zone 2 area - right front

      // Back row - defensive preparation
      OH2: { x: 0.22, y: 0.75 },   // Zone 5 area - left back
      MB2: { x: 0.50, y: 0.72 },   // Zone 6 area - center back
      S: { x: 0.78, y: 0.70 },     // Moving toward setter spot
    },
    // Arrows show movement to Base (defense) positions
    arrows: {
      RS: { x: 0.83, y: 0.58 },    // Moves to zone 2 for blocking
      MB1: { x: 0.50, y: 0.58 },   // Centers at zone 3 for blocking
      OH1: { x: 0.17, y: 0.58 },   // Moves to zone 4 for blocking
      OH2: { x: 0.50, y: 0.88 },   // Moves to zone 6 for defense
      MB2: { x: 0.35, y: 0.75 },   // Moves to left-back defense
      S: { x: 0.83, y: 0.72 },     // Stays zone 1 area
    },
    // Tags for defensive readiness
    statusTags: {
      RS: 'block',   // Front row blocking
      MB1: 'block',  // Middle blocker
      OH1: 'block',  // Front row blocking
    },
  },

  /**
   * SERVE RECEIVE PRIMARY - Default receive formation
   *
   * Three-person serve receive with OH1, OH2, and MB2 as passers.
   * Setter (S) is stacked in back right, ready to release to target.
   *
   * Visual (NET at top):
   *   RS   MB₁↘
   *   ┌──────────────┐
   *   │              │
   *   │OH₂↗    OH₁↙ S↗│
   *   │     MB₂↓    │
   *   └──────────────┘
   */
  serveReceivePrimary: {
    positions: {
      // Front row - RS and MB1 at net
      RS: { x: 0.20, y: 0.58 },    // Zone 4 - left front (hitting position)
      MB1: { x: 0.70, y: 0.56 },   // Zone 2-3 boundary - quick attack spot

      // Back row - receive formation
      OH2: { x: 0.18, y: 0.72 },   // Zone 5 area - left passer
      OH1: { x: 0.72, y: 0.70 },   // Zone 1-2 area - right passer
      MB2: { x: 0.50, y: 0.88 },   // Zone 6 - center passer (deep)
      S: { x: 0.85, y: 0.80 },     // Zone 1 - back right, ready to release
    },
    // Arrows show movement after pass (to attack/base positions)
    arrows: {
      RS: { x: 0.15, y: 0.60 },    // Stays zone 4 for swing attack
      MB1: { x: 0.50, y: 0.55 },   // Goes to zone 3 for quick attack
      OH2: { x: 0.50, y: 0.85 },   // Moves to zone 6 defense
      OH1: { x: 0.15, y: 0.58 },   // Approaches zone 4 for attack
      MB2: { x: 0.35, y: 0.80 },   // Stays back for defense
      S: { x: 0.70, y: 0.55 },     // Releases to setter target (zone 2-3)
    },
    // Tags for serve receive roles
    statusTags: {
      OH1: 'passer',   // Primary passer
      OH2: 'passer',   // Primary passer
      MB2: 'passer',   // Primary passer (center)
      MB1: 'quick',    // Ready for quick attack
      RS: 'swing',     // Ready for swing attack
    },
  },

  /**
   * SERVE RECEIVE ALTERNATE - Alternative receive formation
   *
   * Different arrangement with stacking on the right side.
   * Used when coach wants different passing responsibilities.
   *
   * Visual (NET at top):
   *        OH₁↗
   *   MB₁  S↗
   *   ┌──────────────┐
   *   │              │
   *   │RS↘    MB₂↗   │
   *   │              │
   *   │     OH₂↓     │
   *   └──────────────┘
   */
  serveReceiveAlternate: {
    positions: {
      // Front row - MB1 at net, OH1 and S stacked right
      MB1: { x: 0.35, y: 0.56 },   // Zone 3-4 boundary
      OH1: { x: 0.72, y: 0.54 },   // Zone 2 area - stacked near net
      S: { x: 0.78, y: 0.62 },     // Behind OH1 - stacked

      // Back row - RS drops back, MB2 and OH2 receive
      RS: { x: 0.25, y: 0.70 },    // Zone 5 area - left
      MB2: { x: 0.70, y: 0.75 },   // Zone 1-2 area - right passer
      OH2: { x: 0.45, y: 0.88 },   // Zone 6 - center passer (deep)
    },
    // Arrows show movement after pass
    arrows: {
      MB1: { x: 0.50, y: 0.55 },   // Centers for quick attack
      OH1: { x: 0.17, y: 0.58 },   // Goes to zone 4 for attack
      S: { x: 0.70, y: 0.55 },     // Releases to setter target
      RS: { x: 0.83, y: 0.58 },    // Moves to zone 2 for attack
      MB2: { x: 0.35, y: 0.80 },   // Moves to back defense
      OH2: { x: 0.50, y: 0.88 },   // Stays zone 6
    },
    // Tags for alternate receive
    statusTags: {
      RS: 'passer',    // Passer in this formation
      MB2: 'passer',   // Passer
      OH2: 'passer',   // Passer (deep center)
      MB1: 'quick',    // Quick attack ready
    },
  },

  /**
   * BASE - Defensive position
   *
   * Standard defensive alignment when ball is on opponent's side.
   * Front row at net for blocking, back row in defensive positions.
   *
   * Visual (NET at top):
   *   OH₁  MB₁   RS
   *   ┌──────────────┐
   *   │              │
   *   │  MB₂     S   │
   *   │              │
   *   │      OH₂     │
   *   └──────────────┘
   *
   * Note: This is the terminal phase - no arrows needed.
   */
  base: {
    positions: {
      // Front row - blocking positions at net
      OH1: { x: 0.17, y: 0.58 },   // Zone 4 - left front blocker
      MB1: { x: 0.50, y: 0.58 },   // Zone 3 - middle blocker
      RS: { x: 0.83, y: 0.58 },    // Zone 2 - right front blocker

      // Back row - defensive positions
      MB2: { x: 0.35, y: 0.75 },   // Behind zone 4 - left back defense
      S: { x: 0.83, y: 0.72 },     // Zone 1 area - setter spot for defense
      OH2: { x: 0.50, y: 0.88 },   // Zone 6 - center back defense
    },
    // No arrows - base is the terminal defensive position
    // Tags for defensive roles
    statusTags: {
      OH1: 'block',   // Front row blocking
      MB1: 'block',   // Middle blocking
      RS: 'block',    // Front row blocking
      MB2: 'tips',    // Covering tips and short balls
      OH2: 'tips',    // Deep defense and tips
    },
  },
}
