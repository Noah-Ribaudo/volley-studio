// Legality validation based on relative ordering rules
// Uses zone-based relative positioning, not absolute coordinates

import type {
  LegalityRules,
  LegalityViolation,
  NormalizedPosition,
  PlayerRole,
  RotationIndex,
  Zone,
} from './types'
import { DEFAULT_BASE_ORDER } from '../rotations'

// Default legality rules from canonical model
const DEFAULT_LEGALITY_RULES: LegalityRules = {
  horizontal_pairs: [
    ['Z4', 'Z3'],
    ['Z3', 'Z2'],
    ['Z5', 'Z6'],
    ['Z6', 'Z1'],
  ],
  vertical_pairs: [
    ['Z4', 'Z5'],
    ['Z3', 'Z6'],
    ['Z2', 'Z1'],
  ],
}

/**
 * Get which role is in a given zone for a rotation
 * Inverse of getRoleZone - given a zone, find which role occupies it
 */
const getRoleInZone = (
  rotation: RotationIndex,
  zone: Zone,
  baseOrder: PlayerRole[] = DEFAULT_BASE_ORDER
): PlayerRole | null => {
  // Zone numbers: 1-6
  const zoneNum = parseInt(zone.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6
  
  // Zone order for base rotation: [1, 6, 5, 4, 3, 2]
  const zoneOrder = [1, 6, 5, 4, 3, 2] as const
  
  // Find which position in zoneOrder this zone is at for the current rotation
  const currentZoneIndex = zoneOrder.indexOf(zoneNum)
  if (currentZoneIndex === -1) return null
  
  // Rotate backwards to find the base zone index
  // For rotation 2, we need to go back 1 step to find what zone this was in rotation 1
  const baseZoneIndex = (currentZoneIndex - (rotation - 1) + zoneOrder.length) % zoneOrder.length
  const baseZone = zoneOrder[baseZoneIndex]
  
  // Now map baseZone (1-6) to the role index in baseOrder
  // baseZone 1 = baseOrder[0], baseZone 2 = baseOrder[1], etc.
  const roleIndex = baseZone - 1
  
  if (roleIndex < 0 || roleIndex >= baseOrder.length) return null
  
  return baseOrder[roleIndex] || null
}

/**
 * Validate rotation legality based on relative ordering rules
 */
export function validateRotationLegality(
  rotation: RotationIndex,
  positions: Record<PlayerRole, NormalizedPosition>,
  rules: LegalityRules = DEFAULT_LEGALITY_RULES,
  baseOrder: PlayerRole[] = DEFAULT_BASE_ORDER
): LegalityViolation[] {
  const violations: LegalityViolation[] = []

  // Check horizontal pairs: left player must be left of right player
  for (const [leftZone, rightZone] of rules.horizontal_pairs) {
    const leftRole = getRoleInZone(rotation, leftZone, baseOrder)
    const rightRole = getRoleInZone(rotation, rightZone, baseOrder)
    
    if (!leftRole || !rightRole) continue
    
    const leftPos = positions[leftRole]
    const rightPos = positions[rightRole]
    
    if (!leftPos || !rightPos) continue
    
    // Left player must be to the left (lower x) of right player
    if (leftPos.x >= rightPos.x) {
      violations.push({
        type: 'horizontal_overlap',
        zones: [leftZone, rightZone],
        roles: [leftRole, rightRole],
      })
    }
  }

  // Check vertical pairs: front player must be in front (lower y) of back player
  for (const [frontZone, backZone] of rules.vertical_pairs) {
    const frontRole = getRoleInZone(rotation, frontZone, baseOrder)
    const backRole = getRoleInZone(rotation, backZone, baseOrder)
    
    if (!frontRole || !backRole) continue
    
    const frontPos = positions[frontRole]
    const backPos = positions[backRole]
    
    if (!frontPos || !backPos) continue
    
    // Front player must be in front (lower y, since net is at y=0) of back player
    // Note: In normalized coords, y=0 is net, y=1 is baseline
    // So front row has lower y values than back row
    if (frontPos.y >= backPos.y) {
      violations.push({
        type: 'vertical_overlap',
        zones: [frontZone, backZone],
        roles: [frontRole, backRole],
      })
    }
  }

  return violations
}

/**
 * Check if a position update would create a legality violation
 */
export function wouldViolateLegality(
  rotation: RotationIndex,
  role: PlayerRole,
  newPosition: NormalizedPosition,
  currentPositions: Record<PlayerRole, NormalizedPosition>,
  rules: LegalityRules = DEFAULT_LEGALITY_RULES,
  baseOrder: PlayerRole[] = DEFAULT_BASE_ORDER
): LegalityViolation[] {
  const updatedPositions = {
    ...currentPositions,
    [role]: newPosition,
  }
  
  return validateRotationLegality(rotation, updatedPositions, rules, baseOrder)
}

