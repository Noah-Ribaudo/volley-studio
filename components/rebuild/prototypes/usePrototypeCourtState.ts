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
type SecondaryArrowState = Partial<Record<Rotation, RolePositionMap>>

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
  const [secondaryReceiveArrowsByRotation, setSecondaryReceiveArrowsByRotation] = useState<SecondaryArrowState>({})

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

  const hasFirstAttackTargets = useCallback(
    (rotation: Rotation) => Object.keys(secondaryReceiveArrowsByRotation[rotation] ?? {}).length > 0,
    [secondaryReceiveArrowsByRotation]
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
          labels[role] = formatPrototypePhaseLabel(nextPhase)
        }
      }

      return labels
    },
    [primaryArrowsByPhase]
  )

  const getSecondaryDerivedArrows = useCallback(
    (rotation: Rotation, phase: PrototypePhase): ArrowPositions => {
      if (phase !== 'RECEIVE') {
        return {}
      }

      return secondaryReceiveArrowsByRotation[rotation] ?? {}
    },
    [secondaryReceiveArrowsByRotation]
  )

  const getSecondaryArrowEndpointLabels = useCallback(
    (rotation: Rotation, phase: PrototypePhase): Partial<Record<Role, string>> => {
      if (phase !== 'RECEIVE') {
        return {}
      }

      const labels: Partial<Record<Role, string>> = {}

      for (const role of Object.keys(secondaryReceiveArrowsByRotation[rotation] ?? {}) as Role[]) {
        if (secondaryReceiveArrowsByRotation[rotation]?.[role]) {
          labels[role] = '1st Attack'
        }
      }

      return labels
    },
    [secondaryReceiveArrowsByRotation]
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

      setPositionsByPhase((current) => {
        const key = getPhaseKey(rotation, nextPhase)
        const currentPhasePositions = current[key] ?? {}
        const fallbackPosition = sourcePosition

        if (!position) {
          if (!fallbackPosition) {
            return current
          }

          return {
            ...current,
            [key]: {
              ...currentPhasePositions,
              [role]: fallbackPosition,
            },
          }
        }

        return {
          ...current,
          [key]: {
            ...currentPhasePositions,
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
    },
    [getPositions]
  )

  const updateSecondaryArrowTarget = useCallback(
    (rotation: Rotation, phase: PrototypePhase, role: Role, position: PositionCoordinates[Role] | null) => {
      if (phase !== 'RECEIVE') {
        return
      }

      const fallbackPosition = getPositions(rotation, 'OFFENSE')[role]

      setPositionsByPhase((current) => {
        const key = getPhaseKey(rotation, 'FIRST_ATTACK')
        const currentPhasePositions = current[key] ?? {}

        if (!position) {
          if (!fallbackPosition) {
            return current
          }

          return {
            ...current,
            [key]: {
              ...currentPhasePositions,
              [role]: fallbackPosition,
            },
          }
        }

        return {
          ...current,
          [key]: {
            ...currentPhasePositions,
            [role]: position,
          },
        }
      })

      setSecondaryReceiveArrowsByRotation((current) => {
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
    [getPositions]
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

    setPrimaryArrowsByPhase((current) => {
      const next = { ...current }
      delete next[getPhaseKey(rotation, phase)]
      return next
    })

    if (phase === 'RECEIVE') {
      setSecondaryReceiveArrowsByRotation((current) => {
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
    const nextSecondaryArrows: SecondaryArrowState = {}

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
      const nextFirstAttackArrows: RolePositionMap = {}

      for (const role of ROLES) {
        if (
          hasMeaningfulMovement(receivePositions[role], firstAttackPositions[role]) &&
          hasMeaningfulMovement(firstAttackPositions[role], normalAttackPositions[role])
        ) {
          nextFirstAttackArrows[role] = firstAttackPositions[role]
        }
      }

      if (Object.keys(nextFirstAttackArrows).length > 0) {
        nextSecondaryArrows[rotation] = nextFirstAttackArrows
      }
    }

    setPositionsByPhase(nextPositions)
    setArrowCurvesByPhase(nextCurves)
    setPrimaryArrowsByPhase(nextPrimaryArrows)
    setSecondaryReceiveArrowsByRotation(nextSecondaryArrows)
  }, [])

  return useMemo(
    () => ({
      getPositions,
      getDerivedArrows,
      getArrowCurves,
      getArrowEndpointLabels,
      getSecondaryArrowEndpointLabels,
      getSecondaryDerivedArrows,
      hasFirstAttackTargets,
      updatePosition,
      updateArrowTarget,
      updateSecondaryArrowTarget,
      setArrowCurve,
      resetPhase,
      loadDemoSeeds,
    }),
    [
      getArrowCurves,
      getDerivedArrows,
      getPositions,
      hasFirstAttackTargets,
      getArrowEndpointLabels,
      getSecondaryArrowEndpointLabels,
      getSecondaryDerivedArrows,
      loadDemoSeeds,
      resetPhase,
      setArrowCurve,
      updateArrowTarget,
      updateSecondaryArrowTarget,
      updatePosition,
    ]
  )
}
