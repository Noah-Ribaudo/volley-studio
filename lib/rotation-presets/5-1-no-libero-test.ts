/**
 * Test transcription of 5-1 No Libero - Rotation 1
 *
 * Source: 5-1 Volleyball Rotation Guidelines and Formation.pdf, page 3
 *
 * Coordinate System:
 * - x: 0 = left sideline, 1 = right sideline
 * - y: 0.5 = net, 1.0 = home baseline
 *
 * Court viewed from opponent's side (net at top of diagram):
 * - Front row (zones 4,3,2): closer to net, y ~ 0.55-0.65
 * - Back row (zones 5,6,1): closer to baseline, y ~ 0.75-0.95
 */

import { PhasePreset } from './schema'

/**
 * Rotation 1 - Serve Receive Primary
 *
 * From the PDF diagram (page 3, Rotation 1 row, "Serve Receive Primary" column):
 *
 * Visual layout (NET at top):
 *
 *        RS    MB₁
 *    ┌──────────────┐
 *    │              │
 *    │OH₂      OH₁  │
 *    │     MB₂   S  │
 *    └──────────────┘
 *
 * Arrows indicate movement to base positions:
 * - RS: curves down-left (stays left side)
 * - MB₁: curves right (goes to zone 2)
 * - OH₂: slight movement right (stays left back)
 * - OH₁: curves down-left (goes to zone 4 front)
 * - MB₂: moves slightly back (stays zone 6)
 * - S: curves up-right (goes to zone 2-3 setter spot)
 */
export const rotation1ServeReceivePrimary: PhasePreset = {
  positions: {
    // Front row positions (near net)
    RS: { x: 0.20, y: 0.58 },   // Zone 4 area, left front
    MB1: { x: 0.70, y: 0.56 },  // Zone 2-3 boundary, right front

    // Back row positions (serve receive formation)
    OH2: { x: 0.18, y: 0.72 },  // Zone 5 area, left back (receiving)
    OH1: { x: 0.72, y: 0.70 },  // Zone 1-2 boundary (receiving)
    MB2: { x: 0.50, y: 0.88 },  // Zone 6, center back (receiving)
    S: { x: 0.85, y: 0.80 },    // Zone 1, back right (will run to set)
  },
  arrows: {
    // Arrows show movement to base positions after serve receive
    RS: { x: 0.15, y: 0.60 },   // Stays zone 4
    MB1: { x: 0.85, y: 0.58 },  // Moves to zone 2
    OH2: { x: 0.50, y: 0.83 },  // Moves to zone 6 or middle defense
    OH1: { x: 0.15, y: 0.58 },  // Moves to zone 4 (attack position)
    MB2: { x: 0.50, y: 0.85 },  // Stays zone 6
    S: { x: 0.70, y: 0.55 },    // Runs to setter spot (zone 2-3)
  },
}

/**
 * Rotation 1 - Base Position
 *
 * From the PDF diagram (page 3, Rotation 1 row, "Base" column):
 *
 * Visual layout (NET at top):
 *
 *    OH₁  MB₁   RS
 *    ┌──────────────┐
 *    │              │
 *    │  MB₂     S   │
 *    │              │
 *    │      OH₂     │
 *    └──────────────┘
 *
 * This is the standard defensive base position.
 */
export const rotation1Base: PhasePreset = {
  positions: {
    // Front row (at net for blocking)
    OH1: { x: 0.17, y: 0.58 },  // Zone 4, left front
    MB1: { x: 0.50, y: 0.58 },  // Zone 3, middle front
    RS: { x: 0.83, y: 0.58 },   // Zone 2, right front

    // Back row (defensive positions)
    MB2: { x: 0.35, y: 0.75 },  // Behind zone 4, left back
    S: { x: 0.83, y: 0.72 },    // Zone 1 area, right back (setter spot)
    OH2: { x: 0.50, y: 0.88 },  // Zone 6, center back
  },
}

/**
 * Rotation 1 - Home Position
 *
 * The starting position before serve - players must be in legal rotation order.
 * Referees check this before each serve.
 *
 * For Rotation 1, the positions are at zone centers:
 * - Zone 4 (LF): RS
 * - Zone 3 (MF): MB1
 * - Zone 2 (RF): OH1
 * - Zone 5 (LB): OH2
 * - Zone 6 (MB): MB2
 * - Zone 1 (RB): S
 */
export const rotation1Home: PhasePreset = {
  positions: {
    // Front row - legal positions before serve
    RS: { x: 0.17, y: 0.58 },   // Zone 4
    MB1: { x: 0.50, y: 0.58 },  // Zone 3
    OH1: { x: 0.83, y: 0.58 },  // Zone 2

    // Back row - legal positions before serve
    OH2: { x: 0.17, y: 0.83 },  // Zone 5
    MB2: { x: 0.50, y: 0.83 },  // Zone 6
    S: { x: 0.83, y: 0.83 },    // Zone 1
  },
}
