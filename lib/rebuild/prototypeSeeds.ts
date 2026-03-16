import type { PrototypePhase } from '@/lib/rebuild/prototypeFlow'
import type { ArrowCurveConfig, Position, Role, Rotation } from '@/lib/types'

export type RolePositionMap = Partial<Record<Role, Position>>
export type RoleCurveMap = Partial<Record<Role, ArrowCurveConfig>>
export type ReceiveFirstAttackMap = Partial<Record<Role, boolean>>

export interface PrototypePhaseSeed {
  positions: RolePositionMap
  curves?: RoleCurveMap
}

export interface PrototypeRotationSeed {
  phases: Partial<Record<PrototypePhase, PrototypePhaseSeed>>
  receiveFirstAttack?: ReceiveFirstAttackMap
}

const LIBERO_BENCH: Position = { x: -0.06, y: 0.88 }

function withLibero(positions: RolePositionMap): RolePositionMap {
  return {
    ...positions,
    L: LIBERO_BENCH,
  }
}

const R1_DEFENSE_POSITIONS: RolePositionMap = withLibero({
  S: { x: 0.78, y: 0.86 },
  OH1: { x: 0.24, y: 0.66 },
  MB1: { x: 0.5, y: 0.6 },
  OPP: { x: 0.84, y: 0.62 },
  OH2: { x: 0.2, y: 0.84 },
  MB2: { x: 0.56, y: 0.82 },
})

const R1_FIRST_ATTACK_POSITIONS: RolePositionMap = withLibero({
  S: { x: 0.66, y: 0.8 },
  OH1: { x: 0.16, y: 0.74 },
  MB1: { x: 0.45, y: 0.61 },
  OPP: { x: 0.83, y: 0.66 },
  OH2: { x: 0.24, y: 0.86 },
  MB2: { x: 0.58, y: 0.79 },
})

const R1_OFFENSE_POSITIONS: RolePositionMap = withLibero({
  S: { x: 0.55, y: 0.76 },
  OH1: { x: 0.17, y: 0.79 },
  MB1: { x: 0.47, y: 0.63 },
  OPP: { x: 0.85, y: 0.66 },
  OH2: { x: 0.3, y: 0.8 },
  MB2: { x: 0.62, y: 0.78 },
})

const R4_DEFENSE_POSITIONS: RolePositionMap = withLibero({
  S: { x: 0.28, y: 0.74 },
  OH1: { x: 0.84, y: 0.63 },
  MB1: { x: 0.56, y: 0.56 },
  OPP: { x: 0.22, y: 0.8 },
  OH2: { x: 0.76, y: 0.84 },
  MB2: { x: 0.48, y: 0.8 },
})

const R4_FIRST_ATTACK_POSITIONS: RolePositionMap = withLibero({
  S: { x: 0.37, y: 0.72 },
  OH1: { x: 0.84, y: 0.66 },
  MB1: { x: 0.56, y: 0.58 },
  OPP: { x: 0.18, y: 0.82 },
  OH2: { x: 0.71, y: 0.83 },
  MB2: { x: 0.45, y: 0.8 },
})

const R4_OFFENSE_POSITIONS: RolePositionMap = withLibero({
  S: { x: 0.52, y: 0.74 },
  OH1: { x: 0.86, y: 0.64 },
  MB1: { x: 0.57, y: 0.6 },
  OPP: { x: 0.2, y: 0.79 },
  OH2: { x: 0.71, y: 0.79 },
  MB2: { x: 0.44, y: 0.79 },
})

export const PROTOTYPE_SEEDS: Partial<Record<Rotation, PrototypeRotationSeed>> = {
  1: {
    receiveFirstAttack: {
      OH1: true,
      MB1: true,
    },
    phases: {
      SERVE: {
        positions: withLibero({
          S: { x: 0.86, y: 0.95 },
          OH1: { x: 0.22, y: 0.72 },
          MB1: { x: 0.46, y: 0.67 },
          OPP: { x: 0.82, y: 0.66 },
          OH2: { x: 0.18, y: 0.9 },
          MB2: { x: 0.5, y: 0.9 },
        }),
      },
      RECEIVE: {
        positions: withLibero({
          S: { x: 0.74, y: 0.83 },
          OH1: { x: 0.18, y: 0.74 },
          MB1: { x: 0.47, y: 0.7 },
          OPP: { x: 0.83, y: 0.73 },
          OH2: { x: 0.27, y: 0.88 },
          MB2: { x: 0.59, y: 0.86 },
        }),
      },
      FIRST_ATTACK: {
        positions: R1_FIRST_ATTACK_POSITIONS,
      },
      OFFENSE: {
        positions: R1_OFFENSE_POSITIONS,
      },
      DEFENSE: {
        positions: R1_DEFENSE_POSITIONS,
      },
    },
  },
  4: {
    receiveFirstAttack: {
      OPP: true,
      OH1: true,
    },
    phases: {
      SERVE: {
        positions: withLibero({
          S: { x: 0.22, y: 0.64 },
          OH1: { x: 0.82, y: 0.7 },
          MB1: { x: 0.52, y: 0.61 },
          OPP: { x: 0.18, y: 0.89 },
          OH2: { x: 0.8, y: 0.9 },
          MB2: { x: 0.5, y: 0.88 },
        }),
      },
      RECEIVE: {
        positions: withLibero({
          S: { x: 0.27, y: 0.76 },
          OH1: { x: 0.82, y: 0.74 },
          MB1: { x: 0.54, y: 0.66 },
          OPP: { x: 0.18, y: 0.85 },
          OH2: { x: 0.76, y: 0.86 },
          MB2: { x: 0.48, y: 0.88 },
        }),
      },
      FIRST_ATTACK: {
        positions: R4_FIRST_ATTACK_POSITIONS,
      },
      OFFENSE: {
        positions: R4_OFFENSE_POSITIONS,
      },
      DEFENSE: {
        positions: R4_DEFENSE_POSITIONS,
      },
    },
  },
}

export function getPrototypeSeed(rotation: Rotation): PrototypeRotationSeed | null {
  return PROTOTYPE_SEEDS[rotation] ?? null
}
