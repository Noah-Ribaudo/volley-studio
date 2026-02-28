import type { Position, Role, Rotation } from '@/lib/types'
import type { CorePhase } from '@/lib/rebuild/prototypeFlow'

export type RolePositionMap = Partial<Record<Role, Position>>

export interface PhaseSeed {
  positions: RolePositionMap
  arrows: RolePositionMap
}

export type RotationSeed = Partial<Record<CorePhase, PhaseSeed>>

const LIBERO_BENCH: Position = { x: -0.06, y: 0.88 }

function withLibero(data: Omit<PhaseSeed, 'positions' | 'arrows'> & {
  positions: RolePositionMap
  arrows: RolePositionMap
}): PhaseSeed {
  return {
    positions: {
      ...data.positions,
      L: LIBERO_BENCH,
    },
    arrows: {
      ...data.arrows,
      L: data.arrows.L ?? LIBERO_BENCH,
    },
  }
}

export const PROTOTYPE_SEEDS: Partial<Record<Rotation, RotationSeed>> = {
  1: {
    SERVE: withLibero({
      positions: {
        S: { x: 0.86, y: 0.95 },
        OH1: { x: 0.22, y: 0.72 },
        MB1: { x: 0.46, y: 0.67 },
        OPP: { x: 0.82, y: 0.66 },
        OH2: { x: 0.18, y: 0.9 },
        MB2: { x: 0.5, y: 0.9 },
      },
      arrows: {
        S: { x: 0.78, y: 0.86 },
        OH1: { x: 0.24, y: 0.66 },
        MB1: { x: 0.5, y: 0.6 },
        OPP: { x: 0.84, y: 0.62 },
        OH2: { x: 0.2, y: 0.84 },
        MB2: { x: 0.56, y: 0.82 },
      },
    }),
    RECEIVE: withLibero({
      positions: {
        S: { x: 0.74, y: 0.83 },
        OH1: { x: 0.18, y: 0.74 },
        MB1: { x: 0.47, y: 0.7 },
        OPP: { x: 0.83, y: 0.73 },
        OH2: { x: 0.27, y: 0.88 },
        MB2: { x: 0.59, y: 0.86 },
      },
      arrows: {
        S: { x: 0.55, y: 0.76 },
        OH1: { x: 0.17, y: 0.79 },
        MB1: { x: 0.47, y: 0.63 },
        OPP: { x: 0.85, y: 0.66 },
        OH2: { x: 0.3, y: 0.8 },
        MB2: { x: 0.62, y: 0.78 },
      },
    }),
    OFFENSE: withLibero({
      positions: {
        S: { x: 0.56, y: 0.74 },
        OH1: { x: 0.15, y: 0.61 },
        MB1: { x: 0.45, y: 0.58 },
        OPP: { x: 0.83, y: 0.6 },
        OH2: { x: 0.25, y: 0.79 },
        MB2: { x: 0.6, y: 0.81 },
      },
      arrows: {
        S: { x: 0.53, y: 0.69 },
        OH1: { x: 0.12, y: 0.54 },
        OPP: { x: 0.86, y: 0.53 },
      },
    }),
    DEFENSE: withLibero({
      positions: {
        S: { x: 0.58, y: 0.82 },
        OH1: { x: 0.17, y: 0.7 },
        MB1: { x: 0.44, y: 0.69 },
        OPP: { x: 0.79, y: 0.69 },
        OH2: { x: 0.25, y: 0.88 },
        MB2: { x: 0.58, y: 0.89 },
      },
      arrows: {
        S: { x: 0.5, y: 0.85 },
        OH1: { x: 0.2, y: 0.75 },
        OPP: { x: 0.75, y: 0.74 },
      },
    }),
  },
  4: {
    SERVE: withLibero({
      positions: {
        S: { x: 0.22, y: 0.64 },
        OH1: { x: 0.82, y: 0.7 },
        MB1: { x: 0.52, y: 0.61 },
        OPP: { x: 0.18, y: 0.89 },
        OH2: { x: 0.8, y: 0.9 },
        MB2: { x: 0.5, y: 0.88 },
      },
      arrows: {
        S: { x: 0.28, y: 0.74 },
        OH1: { x: 0.84, y: 0.63 },
        MB1: { x: 0.56, y: 0.56 },
        OPP: { x: 0.22, y: 0.8 },
        OH2: { x: 0.76, y: 0.84 },
        MB2: { x: 0.48, y: 0.8 },
      },
    }),
    RECEIVE: withLibero({
      positions: {
        S: { x: 0.27, y: 0.76 },
        OH1: { x: 0.82, y: 0.74 },
        MB1: { x: 0.54, y: 0.66 },
        OPP: { x: 0.18, y: 0.85 },
        OH2: { x: 0.76, y: 0.86 },
        MB2: { x: 0.48, y: 0.88 },
      },
      arrows: {
        S: { x: 0.52, y: 0.74 },
        OH1: { x: 0.86, y: 0.64 },
        MB1: { x: 0.57, y: 0.6 },
        OPP: { x: 0.2, y: 0.79 },
        OH2: { x: 0.71, y: 0.79 },
        MB2: { x: 0.44, y: 0.79 },
      },
    }),
    OFFENSE: withLibero({
      positions: {
        S: { x: 0.55, y: 0.73 },
        OH1: { x: 0.84, y: 0.6 },
        MB1: { x: 0.58, y: 0.58 },
        OPP: { x: 0.16, y: 0.76 },
        OH2: { x: 0.75, y: 0.79 },
        MB2: { x: 0.44, y: 0.8 },
      },
      arrows: {
        S: { x: 0.51, y: 0.66 },
        OH1: { x: 0.87, y: 0.54 },
        MB1: { x: 0.56, y: 0.51 },
      },
    }),
    DEFENSE: withLibero({
      positions: {
        S: { x: 0.45, y: 0.84 },
        OH1: { x: 0.79, y: 0.71 },
        MB1: { x: 0.56, y: 0.69 },
        OPP: { x: 0.21, y: 0.71 },
        OH2: { x: 0.71, y: 0.89 },
        MB2: { x: 0.42, y: 0.88 },
      },
      arrows: {
        S: { x: 0.49, y: 0.86 },
        OH1: { x: 0.75, y: 0.75 },
        OPP: { x: 0.24, y: 0.75 },
      },
    }),
  },
}

export function getPrototypeSeed(rotation: Rotation, corePhase: CorePhase): PhaseSeed | null {
  const byRotation = PROTOTYPE_SEEDS[rotation]
  if (!byRotation) return null
  return byRotation[corePhase] ?? null
}
