// Default 5-1 Volleyball Rotation Positions
// Positions are normalized coordinates (0-1) of court width (x) and height (y)
// Court orientation: Net at top (y=0), baseline at bottom (y=1)
// Left side (x=0) to right side (x=1)

import { Phase, Rotation, Role, ROLES } from './types'

// In 5-1, players rotate through positions:
// Rotation 1: S in zone 1 (back right)
// Rotation 2: S in zone 6 (back center)
// Rotation 3: S in zone 5 (back left)
// Rotation 4: S in zone 4 (front left)
// Rotation 5: S in zone 3 (front center)
// Rotation 6: S in zone 2 (front right)

// Key for position mapping in each rotation:
// The 6 positions on court rotate clockwise
// Zone layout (from server's perspective looking at net):
//   4 --- 3 --- 2  (front row - can attack at net)
//   5 --- 6 --- 1  (back row - can attack from 10ft line)

type RotationPhaseKey = `${Rotation}-${Phase}`

// Default ordering for base rotation (zones 1-6)
export const DEFAULT_BASE_ORDER: Role[] = ['S', 'OH1', 'MB1', 'OPP', 'OH2', 'MB2']

// Normalize a user-provided base order to ensure all roles are present exactly once
export function normalizeBaseOrder(order: Role[]): Role[] {
  const deduped: Role[] = []
  order.forEach(role => {
    if (ROLES.includes(role) && !deduped.includes(role)) {
      deduped.push(role)
    }
  })

  ROLES.forEach(role => {
    if (!deduped.includes(role)) {
      deduped.push(role)
    }
  })

  return deduped.slice(0, ROLES.length)
}



// Get which zone a role is in for a given rotation (base position, not phase-specific)
export function getRoleZone(
  rotation: Rotation,
  role: Role,
  baseOrder: Role[] = DEFAULT_BASE_ORDER
): number {
  const zoneOrder = [1, 6, 5, 4, 3, 2] as const
  const safeOrder = normalizeBaseOrder(baseOrder ?? DEFAULT_BASE_ORDER)

  // Map each role to its starting zone (1-6) based on the base order array
  const baseZones = safeOrder.reduce<Record<Role, number>>((acc, r, idx) => {
    acc[r] = idx + 1
    return acc
  }, {} as Record<Role, number>)

  const baseZone = baseZones[role]
  const baseIndex = zoneOrder.indexOf(baseZone as 1 | 2 | 3 | 4 | 5 | 6)
  const newIndex = baseIndex === -1 ? 0 : (baseIndex + (rotation - 1)) % zoneOrder.length

  return zoneOrder[newIndex as 0 | 1 | 2 | 3 | 4 | 5]
}

// Check if a role is in the front row for a given rotation
export function isInFrontRow(
  rotation: Rotation,
  role: Role,
  baseOrder: Role[] = DEFAULT_BASE_ORDER
): boolean {
  const zone = getRoleZone(rotation, role, baseOrder)
  return zone >= 2 && zone <= 4 // Zones 2, 3, 4 are front row
}

// Check if a role is in the back row for a given rotation
export function isInBackRow(
  rotation: Rotation,
  role: Role,
  baseOrder: Role[] = DEFAULT_BASE_ORDER
): boolean {
  return !isInFrontRow(rotation, role, baseOrder)
}

// Get which middle blocker (MB1 or MB2) is in the back row for a given rotation
// Returns null if neither is in back row (shouldn't happen in standard play)
export function getBackRowMiddle(
  rotation: Rotation,
  baseOrder: Role[] = DEFAULT_BASE_ORDER
): 'MB1' | 'MB2' | null {
  const mb1InBack = isInBackRow(rotation, 'MB1', baseOrder)
  const mb2InBack = isInBackRow(rotation, 'MB2', baseOrder)
  
  // In a standard 5-1 rotation, exactly one MB is in back row at any time
  if (mb1InBack && !mb2InBack) return 'MB1'
  if (mb2InBack && !mb1InBack) return 'MB2'
  
  // Edge case: if both are in back row (shouldn't happen), prefer MB2
  if (mb1InBack && mb2InBack) return 'MB2'
  
  return null
}

// Create a key for rotation-phase combinations
export function createRotationPhaseKey(rotation: Rotation, phase: Phase): RotationPhaseKey {
  return `${rotation}-${phase}`
}

/**
 * Get the active roles for a given rotation considering libero substitution.
 * 
 * When showLibero is true:
 * - The back-row MB (replacedMB) is excluded (substituted off court)
 * - The Libero ('L') is included in their place
 * 
 * When showLibero is false:
 * - The Libero ('L') is excluded
 * - Both MBs are included
 * 
 * @param showLibero Whether the libero is active
 * @param rotation Current rotation (used to determine which MB is in back row)
 * @param baseOrder The base order for rotation calculations
 * @returns Array of roles that should be displayed/active
 */
export function getActiveRoles(
  showLibero: boolean,
  rotation?: Rotation,
  baseOrder: Role[] = DEFAULT_BASE_ORDER
): Role[] {
  const replacedMB = showLibero && rotation ? getBackRowMiddle(rotation, baseOrder) : null
  
  return ROLES.filter(role => {
    // Skip libero if not enabled
    if (role === 'L' && !showLibero) return false
    // Skip the back-row MB when libero is enabled (they're substituted off)
    if (showLibero && role === replacedMB) return false
    return true
  })
}
