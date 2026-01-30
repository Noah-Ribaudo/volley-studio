import { DEFAULT_BASE_ORDER, isInFrontRow, getRoleZone } from "@/lib/rotations";
import type { Rotation, Role } from "@/lib/types";
import type { PlayerId, SimRole, SimRoleCategory, TeamSide } from "@/lib/sim/types";

// ============================================================================
// Hitter Mode Classification
// Based on research: Binary distinction simplifies everything
// - 3-hitter (R1-3): Setter in back row, 3 front-row attackers
// - 2-hitter (R4-6): Setter in front row, only 2 front-row attackers
// ============================================================================

export type HitterMode = "2-hitter" | "3-hitter";

/**
 * Get the hitter mode for a rotation.
 * This is the most important simplification from the research:
 * - When setter is back row (R1-3), team has 3 front-row attackers
 * - When setter is front row (R4-6), team has only 2 front-row attackers
 */
export function getHitterMode(rotation: Rotation, baseOrder: Role[] = DEFAULT_BASE_ORDER): HitterMode {
  const setterInBackRow = !isInFrontRow(rotation, "S", baseOrder);
  return setterInBackRow ? "3-hitter" : "2-hitter";
}

/**
 * Get the count of available front-row attackers.
 */
export function getAvailableAttackerCount(rotation: Rotation, baseOrder: Role[] = DEFAULT_BASE_ORDER): 2 | 3 {
  return getHitterMode(rotation, baseOrder) === "3-hitter" ? 3 : 2;
}

/**
 * Generate a description of the hitter mode for educational thoughts.
 */
export function describeHitterMode(rotation: Rotation, baseOrder: Role[] = DEFAULT_BASE_ORDER): string {
  const mode = getHitterMode(rotation, baseOrder);
  const attackerCount = getAvailableAttackerCount(rotation, baseOrder);

  if (mode === "3-hitter") {
    return `This is a 3-hitter rotation (R${rotation}) - we have all three attack options`;
  }
  return `This is a 2-hitter rotation (R${rotation}) - we have ${attackerCount} front-row attackers`;
}

export type RotationResponsibilities = {
  rotation: Rotation;
  // Declarative responsibilities (no coordinates).
  frontRowPlayers: PlayerId[];
  primaryPassers: PlayerId[];
  eligibleAttackers: PlayerId[];
  activeMiddle: PlayerId | null;
  liberoSubstitution: { active: boolean; liberoId?: PlayerId; replacedRole?: SimRole };
};

const isOutside = (role: SimRole): boolean => role === "OH1" || role === "OH2";

export function buildRotationResponsibilities(params: {
  rotation: Rotation;
  team: TeamSide;
  // Role -> player id mapping for the on-court 6 (or 7 incl libero).
  lineupByRole: Partial<Record<SimRole, PlayerId>>;
  // Optional libero: if present, replaces a back-row middle.
  liberoId?: PlayerId;
  baseOrder?: Role[];
}): RotationResponsibilities {
  const { rotation, lineupByRole, liberoId } = params;
  const baseOrder = params.baseOrder ?? DEFAULT_BASE_ORDER;

  const rolesOnCourt: SimRole[] = ["S", "OH1", "OH2", "MB1", "MB2", "OPP"];

  const frontRowPlayers = rolesOnCourt
    .filter((r) => r !== "L" && isInFrontRow(rotation, r as Role, baseOrder))
    .map((r) => lineupByRole[r])
    .filter((id): id is PlayerId => Boolean(id));

  // Serve receive: outsides + (usually) libero. Opposite "rarely receives", middles "never".
  const primaryPassers: PlayerId[] = rolesOnCourt
    .filter((r) => isOutside(r) || r === "L")
    .map((r) => lineupByRole[r])
    .filter((id): id is PlayerId => Boolean(id));

  // Eligible attackers: all front-row players except back-row; additionally back-row pipe/D can be modeled later.
  const eligibleAttackers = rolesOnCourt
    .filter((r) => r !== "L" && isInFrontRow(rotation, r as Role, baseOrder))
    .map((r) => lineupByRole[r])
    .filter((id): id is PlayerId => Boolean(id));

  const activeMiddleRole =
    (["MB1", "MB2"] as const).find((r) => {
      const id = lineupByRole[r];
      if (!id) return false;
      return isInFrontRow(rotation, r, baseOrder);
    }) ?? null;

  const activeMiddle = activeMiddleRole ? lineupByRole[activeMiddleRole] ?? null : null;

  // Libero substitution: replace a back-row middle (if a libero is present and any middle is back row).
  let liberoSubstitution: RotationResponsibilities["liberoSubstitution"] = { active: false };
  if (liberoId) {
    const backRowMiddleRole =
      (["MB1", "MB2"] as const).find((r) => {
        const id = lineupByRole[r];
        if (!id) return false;
        return !isInFrontRow(rotation, r, baseOrder);
      }) ?? null;

    if (backRowMiddleRole) {
      liberoSubstitution = {
        active: true,
        liberoId,
        replacedRole: backRowMiddleRole,
      };
    }
  }

  return {
    rotation,
    frontRowPlayers,
    primaryPassers,
    eligibleAttackers,
    activeMiddle,
    liberoSubstitution,
  };
}

export function getZoneForRole(rotation: Rotation, role: Role, baseOrder?: Role[]): number {
  return getRoleZone(rotation, role, baseOrder ?? DEFAULT_BASE_ORDER);
}

/**
 * Get which role is in zone 1 (back right / server position) for a given rotation.
 */
export function getServerRole(rotation: Rotation, baseOrder: Role[] = DEFAULT_BASE_ORDER): Role {
  // Zone 1 is the serving position (back right)
  // Find which role is in zone 1 for this rotation
  for (const role of baseOrder) {
    if (getRoleZone(rotation, role, baseOrder) === 1) {
      return role;
    }
  }
  // Fallback - should never happen with valid rotation
  return baseOrder[0];
}

/**
 * Advance rotation to the next position (clockwise rotation).
 * Based on reference doc: Team rotates after winning serve or side-out.
 */
export function advanceRotation(currentRotation: Rotation): Rotation {
  // Rotation advances clockwise: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 1
  const next = ((currentRotation % 6) + 1) as Rotation;
  return next;
}

/**
 * Determine if libero should be on court based on rotation.
 * Based on reference doc: Libero subs in when middle blocker rotates to back row,
 * comes out when that MB rotates back to front row.
 */
export function shouldLiberoBeOnCourt(params: {
  rotation: Rotation;
  liberoTracksRole: "MB1" | "MB2";
  baseOrder?: Role[];
}): boolean {
  const { rotation, liberoTracksRole, baseOrder = DEFAULT_BASE_ORDER } = params;

  // Libero is on court when the tracked middle blocker is in back row
  const isTrackedMBInBackRow = !isInFrontRow(rotation, liberoTracksRole, baseOrder);

  return isTrackedMBInBackRow;
}

/**
 * Get which middle blocker the libero is currently replacing (if any).
 */
export function getLiberoReplacedRole(params: {
  rotation: Rotation;
  liberoTracksRole: "MB1" | "MB2";
  baseOrder?: Role[];
}): "MB1" | "MB2" | null {
  const { rotation, liberoTracksRole, baseOrder = DEFAULT_BASE_ORDER } = params;

  const shouldBeOnCourt = shouldLiberoBeOnCourt({ rotation, liberoTracksRole, baseOrder });

  return shouldBeOnCourt ? liberoTracksRole : null;
}

/**
 * Get the category for a SimRole
 * Maps specific roles to general categories for behavior tree logic
 */
export function getRoleCategory(role: SimRole): SimRoleCategory {
  switch (role) {
    case "S":
      return "SETTER";
    case "OH1":
    case "OH2":
      return "OUTSIDE";
    case "MB1":
    case "MB2":
      return "MIDDLE";
    case "OPP":
      return "OPPOSITE";
    case "L":
      return "LIBERO";
    default:
      return "OUTSIDE"; // Fallback
  }
}

