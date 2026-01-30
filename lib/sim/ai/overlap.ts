/**
 * Zone relationship utilities for volleyball overlap rules.
 *
 * Based on research findings:
 * - Diagonal pairs (1-4, 2-5, 3-6) have NO overlap relationship
 * - Middle positions (3, 6) form "T" relationships with 3 adjacent zones
 * - Corner positions (1, 2, 4, 5) form "L" relationships with 2 adjacent zones
 *
 * This enables smarter pre-serve positioning by recognizing which players
 * can move freely vs. which must maintain relative positioning.
 */

/**
 * Zone numbers follow standard volleyball notation:
 *
 *   4 --- 3 --- 2   (front row, near net)
 *   5 --- 6 --- 1   (back row, near baseline)
 *
 * Looking from the player's perspective on their own side of the court.
 */

export type ZoneRelationType = "T" | "L";
export type OverlapRelation = "adjacent" | "diagonal" | "none";

/**
 * Diagonal pairs have NO overlap relationship at all.
 * These players can position freely relative to each other.
 */
export const DIAGONAL_PAIRS = [
  [1, 4],
  [2, 5],
  [3, 6],
] as const;

/**
 * Zone adjacency map defines which zones have overlap constraints.
 * Adjacent zones must maintain front/back or left/right relationships.
 *
 * Front/back relationships (zones in same column):
 * - 1 and 2, 6 and 3, 5 and 4
 *
 * Left/right relationships (zones in same row):
 * - Front row: 4-3-2 (4 left of 3, 3 left of 2)
 * - Back row: 5-6-1 (5 left of 6, 6 left of 1)
 */
export const ADJACENT_ZONES: Record<number, number[]> = {
  1: [2, 6], // back-right: adjacent to front-right (2) and back-center (6)
  2: [1, 3], // front-right: adjacent to back-right (1) and front-center (3)
  3: [2, 4, 6], // front-center: T relationship with front-right (2), front-left (4), back-center (6)
  4: [3, 5], // front-left: adjacent to front-center (3) and back-left (5)
  5: [4, 6], // back-left: adjacent to front-left (4) and back-center (6)
  6: [1, 3, 5], // back-center: T relationship with back-right (1), front-center (3), back-left (5)
};

/**
 * Check if two zones form a diagonal pair.
 * Diagonal players have complete positioning freedom before serve contact.
 */
export function isDiagonalPair(zone1: number, zone2: number): boolean {
  return DIAGONAL_PAIRS.some(
    ([a, b]) => (zone1 === a && zone2 === b) || (zone1 === b && zone2 === a)
  );
}

/**
 * Get the relationship type for a zone.
 * - Middle positions (3, 6) have "T" relationships (3 adjacent zones)
 * - Corner positions (1, 2, 4, 5) have "L" relationships (2 adjacent zones)
 */
export function getZoneRelationType(zone: number): ZoneRelationType {
  // Middle positions form T with three neighbors
  if (zone === 3 || zone === 6) return "T";
  // Corner positions form L with two neighbors
  return "L";
}

/**
 * Get all zones that have an overlap relationship with the given zone.
 * Does NOT include diagonal zones (which have no relationship).
 */
export function getAdjacentZones(zone: number): number[] {
  return ADJACENT_ZONES[zone] ?? [];
}

/**
 * Get the overlap relationship between two zones.
 *
 * @returns "diagonal" if no overlap constraint exists (free movement)
 * @returns "adjacent" if overlap constraint exists (must maintain relative position)
 * @returns "none" if same zone or invalid
 */
export function getOverlapRelation(zone1: number, zone2: number): OverlapRelation {
  if (zone1 === zone2) return "none";
  if (isDiagonalPair(zone1, zone2)) return "diagonal";
  if (ADJACENT_ZONES[zone1]?.includes(zone2)) return "adjacent";
  return "none";
}

/**
 * Check if a player in zone1 has overlap constraints with zone2.
 * Returns true if they must maintain front/back or left/right relationship.
 * Returns false if they are diagonal (complete freedom).
 */
export function hasOverlapConstraint(zone1: number, zone2: number): boolean {
  return getOverlapRelation(zone1, zone2) === "adjacent";
}

/**
 * Generate a human-readable description of the overlap relationship.
 * Used for educational thought explanations.
 */
export function describeOverlapRelation(
  selfZone: number,
  otherZone: number,
  otherRoleName: string
): string {
  const relation = getOverlapRelation(selfZone, otherZone);

  if (relation === "diagonal") {
    return `diagonal to the ${otherRoleName} - I can position freely`;
  }

  if (relation === "adjacent") {
    const relationType = getZoneRelationType(selfZone);
    return `in an ${relationType} relationship with the ${otherRoleName}`;
  }

  return "";
}

/**
 * Get a constraint description for the specific adjacent relationship.
 * Explains what position must be maintained.
 */
export function getConstraintDescription(
  selfZone: number,
  otherZone: number,
  otherRoleName: string
): string {
  if (!hasOverlapConstraint(selfZone, otherZone)) {
    return "";
  }

  // Determine if it's a front/back or left/right constraint
  const frontRow = [2, 3, 4];

  const selfInFront = frontRow.includes(selfZone);
  const otherInFront = frontRow.includes(otherZone);

  // Same row = left/right constraint
  if (selfInFront === otherInFront) {
    // Left/right constraint within same row
    const leftToRight = {
      4: [3, 2],
      3: [2],
      5: [6, 1],
      6: [1],
    } as Record<number, number[]>;

    const selfIsLeftOfOther = leftToRight[selfZone]?.includes(otherZone);
    if (selfIsLeftOfOther) {
      return `I need to stay left of the ${otherRoleName}`;
    }
    return `I need to stay right of the ${otherRoleName}`;
  }

  // Different row = front/back constraint
  if (selfInFront) {
    return `I need to stay in front of the ${otherRoleName}`;
  }
  return `I need to stay behind the ${otherRoleName}`;
}
