'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  formatPrototypePhaseLabel,
  getAdvanceTargetPhase,
  type CorePhase,
  type PrototypePhase,
} from '@/lib/rebuild/prototypeFlow'
import {
  getPrototypeSeed,
  type RoleCurveMap,
  type RolePositionMap,
} from '@/lib/rebuild/prototypeSeeds'
import type { ArrowCurveConfig, ArrowPositions, PositionCoordinates, Role, Rotation } from '@/lib/types'
import { ROLES } from '@/lib/types'

type PositionState = Partial<Record<string, RolePositionMap>>
type CurveState = Partial<Record<string, RoleCurveMap>>
type PrimaryArrowState = Partial<Record<string, RolePositionMap>>
type ChainedAttackState = Partial<Record<Rotation, RolePositionMap>>
type SecondaryCurveState = Partial<Record<Rotation, RoleCurveMap>>

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

function getPrimaryDestinationPhase(phase: PrototypePhase): PrototypePhase | null {
  if (phase === 'RECEIVE') {
    return 'OFFENSE'
  }

  return getAdvanceTargetPhase(phase)
}

function hasMeaningfulMovement(start?: PositionCoordinates[Role], end?: PositionCoordinates[Role]) {
  if (!start || !end) return false
  return Math.hypot(end.x - start.x, end.y - start.y) >= 0.001
}

export function usePrototypeCourtState({
  getFallbackPositions,
}: {
  getFallbackPositions: (rotation: Rotation, phase: CorePhase) => PositionCoordinates
}) {
  const [positionsByPhase, setPositionsByPhase] = useState<PositionState>({})
  const [arrowCurvesByPhase, setArrowCurvesByPhase] = useState<CurveState>({})
  const [primaryArrowsByPhase, setPrimaryArrowsByPhase] = useState<PrimaryArrowState>({})
  const [chainedAttackTargetsByRotation, setChainedAttackTargetsByRotation] = useState<ChainedAttackState>({})
  const [secondaryArrowCurvesByRotation, setSecondaryArrowCurvesByRotation] = useState<SecondaryCurveState>({})

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

  const getSecondaryArrowCurves = useCallback(
    (rotation: Rotation, phase: PrototypePhase): Partial<Record<Role, ArrowCurveConfig>> => {
      if (phase !== 'RECEIVE') {
        return {}
      }

      return secondaryArrowCurvesByRotation[rotation] ?? {}
    },
    [secondaryArrowCurvesByRotation]
  )

  const hasFirstAttackTargets = useCallback(
    (rotation: Rotation) => Object.keys(chainedAttackTargetsByRotation[rotation] ?? {}).length > 0,
    [chainedAttackTargetsByRotation]
  )

  const getDerivedArrows = useCallback(
    (rotation: Rotation, phase: PrototypePhase): ArrowPositions => {
      return primaryArrowsByPhase[getPhaseKey(rotation, phase)] ?? {}
    },
    [primaryArrowsByPhase]
  )

  const getArrowEndpointLabels = useCallback(
    (rotation: Rotation, phase: PrototypePhase): Partial<Record<Role, string>> => {
      const labels: Partial<Record<Role, string>> = {}
      const arrows = primaryArrowsByPhase[getPhaseKey(rotation, phase)] ?? {}
      const nextPhase = getPrimaryDestinationPhase(phase)
      if (!nextPhase) {
        return labels
      }

      for (const role of Object.keys(arrows) as Role[]) {
        if (arrows[role]) {
          if (phase === 'RECEIVE' && chainedAttackTargetsByRotation[rotation]?.[role]) {
            labels[role] = '1st Attack'
          } else {
            labels[role] = formatPrototypePhaseLabel(nextPhase)
          }
        }
      }

      return labels
    },
    [chainedAttackTargetsByRotation, primaryArrowsByPhase]
  )

  const getSecondaryDerivedArrows = useCallback(
    (rotation: Rotation, phase: PrototypePhase): ArrowPositions => {
      if (phase !== 'RECEIVE') {
        return {}
      }

      return chainedAttackTargetsByRotation[rotation] ?? {}
    },
    [chainedAttackTargetsByRotation]
  )

  const getSecondaryArrowEndpointLabels = useCallback(
    (rotation: Rotation, phase: PrototypePhase): Partial<Record<Role, string>> => {
      if (phase !== 'RECEIVE') {
        return {}
      }

      const labels: Partial<Record<Role, string>> = {}

      for (const role of Object.keys(chainedAttackTargetsByRotation[rotation] ?? {}) as Role[]) {
        if (chainedAttackTargetsByRotation[rotation]?.[role]) {
          labels[role] = 'Attack'
        }
      }

      return labels
    },
    [chainedAttackTargetsByRotation]
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

  const updateArrowTarget = useCallback(
    (rotation: Rotation, phase: PrototypePhase, role: Role, position: PositionCoordinates[Role] | null) => {
      const nextPhase = getPrimaryDestinationPhase(phase)
      if (!nextPhase) {
        return
      }

      const sourcePosition = getPositions(rotation, phase)[role]
      const chainedTarget = phase === 'RECEIVE' ? chainedAttackTargetsByRotation[rotation]?.[role] : null

      setPositionsByPhase((current) => {
        const fallbackPosition = sourcePosition

        if (!position) {
          if (!fallbackPosition) {
            return current
          }

          const nextState = { ...current }

          if (phase === 'RECEIVE') {
            nextState[getPhaseKey(rotation, 'FIRST_ATTACK')] = {
              ...(current[getPhaseKey(rotation, 'FIRST_ATTACK')] ?? {}),
              [role]: fallbackPosition,
            }
          }

          return {
            ...nextState,
            [getPhaseKey(rotation, nextPhase)]: {
              ...(current[getPhaseKey(rotation, nextPhase)] ?? {}),
              [role]: fallbackPosition,
            },
          }
        }

        if (phase === 'RECEIVE' && chainedTarget) {
          return {
            ...current,
            [getPhaseKey(rotation, 'FIRST_ATTACK')]: {
              ...(current[getPhaseKey(rotation, 'FIRST_ATTACK')] ?? {}),
              [role]: position,
            },
          }
        }

        return {
          ...current,
          [getPhaseKey(rotation, nextPhase)]: {
            ...(current[getPhaseKey(rotation, nextPhase)] ?? {}),
            [role]: position,
          },
        }
      })

      setPrimaryArrowsByPhase((current) => {
        const key = getPhaseKey(rotation, phase)
        const currentPhaseArrows = current[key] ?? {}

        if (!position) {
          if (!(role in currentPhaseArrows)) {
            return current
          }

          const nextPhaseArrows = { ...currentPhaseArrows }
          delete nextPhaseArrows[role]

          if (Object.keys(nextPhaseArrows).length === 0) {
            const nextState = { ...current }
            delete nextState[key]
            return nextState
          }

          return {
            ...current,
            [key]: nextPhaseArrows,
          }
        }

        return {
          ...current,
          [key]: {
            ...currentPhaseArrows,
            [role]: position,
          },
        }
      })

      if (phase === 'RECEIVE' && chainedTarget) {
        setChainedAttackTargetsByRotation((current) => {
          if (!current[rotation]?.[role] && position) {
            return current
          }

          if (!position) {
            const nextRotationTargets = { ...(current[rotation] ?? {}) }
            delete nextRotationTargets[role]

            if (Object.keys(nextRotationTargets).length === 0) {
              const nextState = { ...current }
              delete nextState[rotation]
              return nextState
            }

            return {
              ...current,
              [rotation]: nextRotationTargets,
            }
          }

          return current
        })
      }
    },
    [chainedAttackTargetsByRotation, getPositions]
  )

  const updateSecondaryArrowTarget = useCallback(
    (rotation: Rotation, phase: PrototypePhase, role: Role, position: PositionCoordinates[Role] | null) => {
      if (phase !== 'RECEIVE') {
        return
      }

      const firstAttackPosition = primaryArrowsByPhase[getPhaseKey(rotation, 'RECEIVE')]?.[role] ?? getPositions(rotation, 'OFFENSE')[role]

      setPositionsByPhase((current) => {
        if (!position) {
          if (!firstAttackPosition) {
            return current
          }

          return {
            ...current,
            [getPhaseKey(rotation, 'FIRST_ATTACK')]: {
              ...(current[getPhaseKey(rotation, 'FIRST_ATTACK')] ?? {}),
              [role]: firstAttackPosition,
            },
            [getPhaseKey(rotation, 'OFFENSE')]: {
              ...(current[getPhaseKey(rotation, 'OFFENSE')] ?? {}),
              [role]: firstAttackPosition,
            },
          }
        }

        return {
          ...current,
          [getPhaseKey(rotation, 'FIRST_ATTACK')]: {
            ...(current[getPhaseKey(rotation, 'FIRST_ATTACK')] ?? {}),
              [role]: firstAttackPosition,
          },
          [getPhaseKey(rotation, 'OFFENSE')]: {
            ...(current[getPhaseKey(rotation, 'OFFENSE')] ?? {}),
            [role]: position,
          },
        }
      })

      setChainedAttackTargetsByRotation((current) => {
        const currentRotationArrows = current[rotation] ?? {}

        if (!position) {
          if (!(role in currentRotationArrows)) {
            return current
          }

          const nextRotationArrows = { ...currentRotationArrows }
          delete nextRotationArrows[role]

          if (Object.keys(nextRotationArrows).length === 0) {
            const nextState = { ...current }
            delete nextState[rotation]
            return nextState
          }

          return {
            ...current,
            [rotation]: nextRotationArrows,
          }
        }

        return {
          ...current,
          [rotation]: {
            ...currentRotationArrows,
            [role]: position,
          },
        }
      })
    },
    [getPositions, primaryArrowsByPhase]
  )

  const createSecondaryArrowTarget = useCallback(
    (rotation: Rotation, phase: PrototypePhase, role: Role) => {
      if (phase !== 'RECEIVE') {
        return
      }

      const existingPrimaryTarget =
        primaryArrowsByPhase[getPhaseKey(rotation, 'RECEIVE')]?.[role] ??
        getPositions(rotation, 'OFFENSE')[role]

      if (!existingPrimaryTarget || chainedAttackTargetsByRotation[rotation]?.[role]) {
        return
      }

      const nextAttackTarget = {
        x: Math.max(0.08, Math.min(0.92, existingPrimaryTarget.x + (existingPrimaryTarget.x > 0.5 ? -0.08 : 0.08))),
        y: Math.max(0.08, Math.min(0.92, existingPrimaryTarget.y - 0.06)),
      }

      updateSecondaryArrowTarget(rotation, phase, role, nextAttackTarget)
    },
    [chainedAttackTargetsByRotation, getPositions, primaryArrowsByPhase, updateSecondaryArrowTarget]
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

  const setSecondaryArrowCurve = useCallback(
    (rotation: Rotation, phase: PrototypePhase, role: Role, curve: ArrowCurveConfig | null) => {
      if (phase !== 'RECEIVE') {
        return
      }

      setSecondaryArrowCurvesByRotation((current) => {
        const nextRotationCurves = {
          ...(current[rotation] ?? {}),
        }

        if (curve) {
          nextRotationCurves[role] = curve
        } else {
          delete nextRotationCurves[role]
        }

        if (Object.keys(nextRotationCurves).length === 0) {
          const nextState = { ...current }
          delete nextState[rotation]
          return nextState
        }

        return {
          ...current,
          [rotation]: nextRotationCurves,
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

    setPrimaryArrowsByPhase((current) => {
      const next = { ...current }
      delete next[getPhaseKey(rotation, phase)]
      return next
    })

    if (phase === 'RECEIVE') {
      setChainedAttackTargetsByRotation((current) => {
        const next = { ...current }
        delete next[rotation]
        return next
      })
      setSecondaryArrowCurvesByRotation((current) => {
        const next = { ...current }
        delete next[rotation]
        return next
      })
    }
  }, [])

  const loadDemoSeeds = useCallback((rotations: Rotation[]) => {
    const nextPositions: PositionState = {}
    const nextCurves: CurveState = {}
    const nextPrimaryArrows: PrimaryArrowState = {}
    const nextChainedTargets: ChainedAttackState = {}

    for (const rotation of rotations) {
      const seed = getPrototypeSeed(rotation)
      if (!seed) {
        continue
      }

      for (const [phase, phaseSeed] of Object.entries(seed.phases) as Array<[PrototypePhase, { positions: RolePositionMap; curves?: RoleCurveMap }]>) {
        nextPositions[getPhaseKey(rotation, phase)] = { ...phaseSeed.positions }
        if (phaseSeed.curves) {
          nextCurves[getPhaseKey(rotation, phase)] = { ...phaseSeed.curves }
        }
      }

      for (const phase of ['SERVE', 'RECEIVE', 'FIRST_ATTACK', 'OFFENSE', 'DEFENSE'] as PrototypePhase[]) {
        const sourcePositions = nextPositions[getPhaseKey(rotation, phase)] ?? {}
        const primaryDestinationPhase = getPrimaryDestinationPhase(phase)

        if (primaryDestinationPhase) {
          const destinationPositions = nextPositions[getPhaseKey(rotation, primaryDestinationPhase)] ?? {}
          const nextArrows: RolePositionMap = {}

          for (const role of ROLES) {
            if (hasMeaningfulMovement(sourcePositions[role], destinationPositions[role])) {
              nextArrows[role] = destinationPositions[role]
            }
          }

          if (Object.keys(nextArrows).length > 0) {
            nextPrimaryArrows[getPhaseKey(rotation, phase)] = nextArrows
          }
        }
      }

      const receivePositions = nextPositions[getPhaseKey(rotation, 'RECEIVE')] ?? {}
      const firstAttackPositions = nextPositions[getPhaseKey(rotation, 'FIRST_ATTACK')] ?? {}
      const normalAttackPositions = nextPositions[getPhaseKey(rotation, 'OFFENSE')] ?? {}
      const nextChainedTargetsForRotation: RolePositionMap = {}

      for (const role of ROLES) {
        if (
          hasMeaningfulMovement(receivePositions[role], firstAttackPositions[role]) &&
          hasMeaningfulMovement(firstAttackPositions[role], normalAttackPositions[role])
        ) {
          nextPrimaryArrows[getPhaseKey(rotation, 'RECEIVE')] = {
            ...(nextPrimaryArrows[getPhaseKey(rotation, 'RECEIVE')] ?? {}),
            [role]: firstAttackPositions[role],
          }
          nextChainedTargetsForRotation[role] = normalAttackPositions[role]
        }
      }

      if (Object.keys(nextChainedTargetsForRotation).length > 0) {
        nextChainedTargets[rotation] = nextChainedTargetsForRotation
      }
    }

    setPositionsByPhase(nextPositions)
    setArrowCurvesByPhase(nextCurves)
    setPrimaryArrowsByPhase(nextPrimaryArrows)
    setChainedAttackTargetsByRotation(nextChainedTargets)
  }, [])

  return useMemo(
    () => ({
      getPositions,
      getDerivedArrows,
      getArrowCurves,
      getSecondaryArrowCurves,
      getArrowEndpointLabels,
      getSecondaryArrowEndpointLabels,
      getSecondaryDerivedArrows,
      hasFirstAttackTargets,
      updatePosition,
      updateArrowTarget,
      updateSecondaryArrowTarget,
      createSecondaryArrowTarget,
      setArrowCurve,
      setSecondaryArrowCurve,
      resetPhase,
      loadDemoSeeds,
    }),
    [
      getArrowCurves,
      getDerivedArrows,
      getPositions,
      hasFirstAttackTargets,
      getSecondaryArrowCurves,
      getArrowEndpointLabels,
      getSecondaryArrowEndpointLabels,
      getSecondaryDerivedArrows,
      loadDemoSeeds,
      resetPhase,
      setArrowCurve,
      updateArrowTarget,
      updateSecondaryArrowTarget,
      createSecondaryArrowTarget,
      updatePosition,
      setSecondaryArrowCurve,
    ]
  )
}
