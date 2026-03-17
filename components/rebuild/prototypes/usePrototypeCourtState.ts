'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  getLinkedTargetPhase,
  type CorePhase,
  type PrototypePhase,
} from '@/lib/rebuild/prototypeFlow'
import {
  getPrototypeSeed,
  type ReceiveFirstAttackMap,
  type RoleCurveMap,
  type RolePositionMap,
} from '@/lib/rebuild/prototypeSeeds'
import type { ArrowCurveConfig, ArrowPositions, PositionCoordinates, Role, Rotation } from '@/lib/types'

type PositionState = Partial<Record<string, RolePositionMap>>
type CurveState = Partial<Record<string, RoleCurveMap>>
type ReceiveState = Partial<Record<Rotation, ReceiveFirstAttackMap>>

function getPhaseKey(rotation: Rotation, phase: PrototypePhase) {
  return `${rotation}:${phase}`
}

function mergePositions(base: PositionCoordinates, override?: RolePositionMap): PositionCoordinates {
  return {
    ...base,
    ...(override ?? {}),
  }
}

function clonePositions(source: PositionCoordinates): PositionCoordinates {
  return { ...source }
}

export function usePrototypeCourtState({
  getFallbackPositions,
}: {
  getFallbackPositions: (rotation: Rotation, phase: CorePhase) => PositionCoordinates
}) {
  const [positionsByPhase, setPositionsByPhase] = useState<PositionState>({})
  const [arrowCurvesByPhase, setArrowCurvesByPhase] = useState<CurveState>({})
  const [receiveFirstAttackByRotation, setReceiveFirstAttackByRotation] = useState<ReceiveState>({})

  const getBasePositions = useCallback(
    (rotation: Rotation, phase: PrototypePhase): PositionCoordinates => {
      if (phase === 'FIRST_ATTACK') {
        return clonePositions(getFallbackPositions(rotation, 'OFFENSE'))
      }

      return clonePositions(getFallbackPositions(rotation, phase))
    },
    [getFallbackPositions]
  )

  const getPositions = useCallback(
    (rotation: Rotation, phase: PrototypePhase): PositionCoordinates => {
      const key = getPhaseKey(rotation, phase)
      return mergePositions(getBasePositions(rotation, phase), positionsByPhase[key])
    },
    [getBasePositions, positionsByPhase]
  )

  const getArrowCurves = useCallback(
    (rotation: Rotation, phase: PrototypePhase): Partial<Record<Role, ArrowCurveConfig>> => {
      return arrowCurvesByPhase[getPhaseKey(rotation, phase)] ?? {}
    },
    [arrowCurvesByPhase]
  )

  const getReceiveFirstAttackMap = useCallback(
    (rotation: Rotation): ReceiveFirstAttackMap => receiveFirstAttackByRotation[rotation] ?? {},
    [receiveFirstAttackByRotation]
  )

  const hasFirstAttackTargets = useCallback(
    (rotation: Rotation) => Object.values(getReceiveFirstAttackMap(rotation)).some(Boolean),
    [getReceiveFirstAttackMap]
  )

  const getDerivedArrows = useCallback(
    (rotation: Rotation, phase: PrototypePhase): ArrowPositions => {
      const currentPositions = getPositions(rotation, phase)
      const receiveMap = getReceiveFirstAttackMap(rotation)
      const arrows: ArrowPositions = {}

      for (const role of Object.keys(currentPositions) as Role[]) {
        const nextPhase =
          phase === 'RECEIVE'
            ? getLinkedTargetPhase(phase, { hasFirstAttack: Boolean(receiveMap[role]) })
            : getLinkedTargetPhase(phase)
        const endPosition = getPositions(rotation, nextPhase)[role]
        const startPosition = currentPositions[role]

        if (!startPosition || !endPosition) {
          continue
        }

        const distance = Math.hypot(endPosition.x - startPosition.x, endPosition.y - startPosition.y)
        if (distance < 0.001) {
          continue
        }

        arrows[role] = endPosition
      }

      return arrows
    },
    [getPositions, getReceiveFirstAttackMap]
  )

  const updatePosition = useCallback(
    (rotation: Rotation, phase: PrototypePhase, role: Role, position: PositionCoordinates[Role]) => {
      setPositionsByPhase((current) => {
        const key = getPhaseKey(rotation, phase)
        return {
          ...current,
          [key]: {
            ...(current[key] ?? {}),
            [role]: position,
          },
        }
      })
    },
    []
  )

  const setArrowCurve = useCallback(
    (rotation: Rotation, phase: PrototypePhase, role: Role, curve: ArrowCurveConfig | null) => {
      setArrowCurvesByPhase((current) => {
        const key = getPhaseKey(rotation, phase)
        const next = {
          ...(current[key] ?? {}),
        }

        if (curve) {
          next[role] = curve
        } else {
          delete next[role]
        }

        return {
          ...current,
          [key]: next,
        }
      })
    },
    []
  )

  const resetPhase = useCallback((rotation: Rotation, phase: PrototypePhase) => {
    setPositionsByPhase((current) => {
      const next = { ...current }
      delete next[getPhaseKey(rotation, phase)]
      return next
    })

    setArrowCurvesByPhase((current) => {
      const next = { ...current }
      delete next[getPhaseKey(rotation, phase)]
      return next
    })
  }, [])

  const toggleReceiveFirstAttack = useCallback((rotation: Rotation, role: Role) => {
    setReceiveFirstAttackByRotation((current) => {
      const existing = current[rotation] ?? {}
      return {
        ...current,
        [rotation]: {
          ...existing,
          [role]: !existing[role],
        },
      }
    })
  }, [])

  const setReceiveFirstAttack = useCallback((rotation: Rotation, role: Role, enabled: boolean) => {
    setReceiveFirstAttackByRotation((current) => ({
      ...current,
      [rotation]: {
        ...(current[rotation] ?? {}),
        [role]: enabled,
      },
    }))
  }, [])

  const loadDemoSeeds = useCallback((rotations: Rotation[]) => {
    const nextPositions: PositionState = {}
    const nextCurves: CurveState = {}
    const nextReceive: ReceiveState = {}

    for (const rotation of rotations) {
      const seed = getPrototypeSeed(rotation)
      if (!seed) {
        continue
      }

      nextReceive[rotation] = { ...(seed.receiveFirstAttack ?? {}) }

      for (const [phase, phaseSeed] of Object.entries(seed.phases) as Array<[PrototypePhase, { positions: RolePositionMap; curves?: RoleCurveMap }]>) {
        nextPositions[getPhaseKey(rotation, phase)] = { ...phaseSeed.positions }
        if (phaseSeed.curves) {
          nextCurves[getPhaseKey(rotation, phase)] = { ...phaseSeed.curves }
        }
      }
    }

    setPositionsByPhase(nextPositions)
    setArrowCurvesByPhase(nextCurves)
    setReceiveFirstAttackByRotation(nextReceive)
  }, [])

  return useMemo(
    () => ({
      getPositions,
      getDerivedArrows,
      getArrowCurves,
      getReceiveFirstAttackMap,
      hasFirstAttackTargets,
      updatePosition,
      setArrowCurve,
      resetPhase,
      toggleReceiveFirstAttack,
      setReceiveFirstAttack,
      loadDemoSeeds,
    }),
    [
      getArrowCurves,
      getDerivedArrows,
      getPositions,
      getReceiveFirstAttackMap,
      hasFirstAttackTargets,
      loadDemoSeeds,
      resetPhase,
      setArrowCurve,
      setReceiveFirstAttack,
      toggleReceiveFirstAttack,
      updatePosition,
    ]
  )
}
