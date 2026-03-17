'use client'

import { useCallback, useMemo, useState } from 'react'
import type { CorePhase, PrototypePhase } from '@/lib/rebuild/prototypeFlow'
import {
  EMPTY_PROTOTYPE_COURT_STATE,
  createPrototypeSecondaryArrowTarget,
  getPrototypeArrowEndpointLabels,
  getPrototypePositions,
  getPrototypePrimaryArrows,
  getPrototypePrimaryArrowCurves,
  getPrototypeSecondaryArrowCurves,
  getPrototypeSecondaryArrows,
  getPrototypeSecondaryArrowEndpointLabels,
  hasFirstAttackTargetsForRotation,
  loadPrototypeSeedState,
  resetPrototypePhase,
  setPrototypePrimaryArrowCurve,
  setPrototypeSecondaryArrowCurve,
  type PrototypeCourtStateResolver,
  updatePrototypeArrowTarget,
  updatePrototypePosition,
  updatePrototypeSecondaryArrowTarget,
} from '@/lib/rebuild/prototypeCourtStateModel'
import type { ArrowCurveConfig, PositionCoordinates, Role, Rotation } from '@/lib/types'

export function usePrototypeCourtState({
  getFallbackPositions,
}: {
  getFallbackPositions: (rotation: Rotation, phase: CorePhase) => PositionCoordinates
}) {
  const [stateData, setStateData] = useState(EMPTY_PROTOTYPE_COURT_STATE)

  const resolver = useMemo<PrototypeCourtStateResolver>(
    () => ({ getFallbackPositions }),
    [getFallbackPositions]
  )

  const getPositions = useCallback(
    (rotation: Rotation, phase: PrototypePhase) =>
      getPrototypePositions(stateData, resolver, rotation, phase),
    [resolver, stateData]
  )

  const getDerivedArrows = useCallback(
    (rotation: Rotation, phase: PrototypePhase) =>
      getPrototypePrimaryArrows(stateData, resolver, rotation, phase),
    [resolver, stateData]
  )

  const getArrowCurves = useCallback(
    (rotation: Rotation, phase: PrototypePhase) =>
      getPrototypePrimaryArrowCurves(stateData, rotation, phase),
    [stateData]
  )

  const getSecondaryArrowCurves = useCallback(
    (rotation: Rotation, phase: PrototypePhase) =>
      getPrototypeSecondaryArrowCurves(stateData, rotation, phase),
    [stateData]
  )

  const getArrowEndpointLabels = useCallback(
    (rotation: Rotation, phase: PrototypePhase) =>
      getPrototypeArrowEndpointLabels(stateData, resolver, rotation, phase),
    [resolver, stateData]
  )

  const getSecondaryDerivedArrows = useCallback(
    (rotation: Rotation, phase: PrototypePhase) =>
      getPrototypeSecondaryArrows(stateData, resolver, rotation, phase),
    [resolver, stateData]
  )

  const getSecondaryArrowEndpointLabels = useCallback(
    (rotation: Rotation, phase: PrototypePhase) =>
      getPrototypeSecondaryArrowEndpointLabels(stateData, resolver, rotation, phase),
    [resolver, stateData]
  )

  const hasFirstAttackTargets = useCallback(
    (rotation: Rotation) => hasFirstAttackTargetsForRotation(stateData, rotation),
    [stateData]
  )

  const updatePosition = useCallback(
    (rotation: Rotation, phase: PrototypePhase, role: Role, position: PositionCoordinates[Role]) => {
      if (!position) return

      setStateData((current) =>
        updatePrototypePosition(current, resolver, rotation, phase, role, position)
      )
    },
    [resolver]
  )

  const updateArrowTarget = useCallback(
    (rotation: Rotation, phase: PrototypePhase, role: Role, position: PositionCoordinates[Role] | null) => {
      setStateData((current) =>
        updatePrototypeArrowTarget(current, resolver, rotation, phase, role, position ?? null)
      )
    },
    [resolver]
  )

  const updateSecondaryArrowTarget = useCallback(
    (rotation: Rotation, phase: PrototypePhase, role: Role, position: PositionCoordinates[Role] | null) => {
      if (phase !== 'RECEIVE') {
        return
      }

      setStateData((current) =>
        updatePrototypeSecondaryArrowTarget(current, resolver, rotation, role, position ?? null)
      )
    },
    [resolver]
  )

  const createSecondaryArrowTarget = useCallback(
    (rotation: Rotation, phase: PrototypePhase, role: Role) => {
      if (phase !== 'RECEIVE') {
        return
      }

      setStateData((current) =>
        createPrototypeSecondaryArrowTarget(current, resolver, rotation, role)
      )
    },
    [resolver]
  )

  const setArrowCurve = useCallback(
    (rotation: Rotation, phase: PrototypePhase, role: Role, curve: ArrowCurveConfig | null) => {
      setStateData((current) =>
        setPrototypePrimaryArrowCurve(current, rotation, phase, role, curve)
      )
    },
    []
  )

  const setSecondaryArrowCurve = useCallback(
    (rotation: Rotation, phase: PrototypePhase, role: Role, curve: ArrowCurveConfig | null) => {
      if (phase !== 'RECEIVE') {
        return
      }

      setStateData((current) =>
        setPrototypeSecondaryArrowCurve(current, rotation, role, curve)
      )
    },
    []
  )

  const resetPhase = useCallback((rotation: Rotation, phase: PrototypePhase) => {
    setStateData((current) => resetPrototypePhase(current, rotation, phase))
  }, [])

  const loadDemoSeeds = useCallback((rotations: Rotation[]) => {
    setStateData(loadPrototypeSeedState(rotations))
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
      createSecondaryArrowTarget,
      getArrowCurves,
      getArrowEndpointLabels,
      getDerivedArrows,
      getPositions,
      getSecondaryArrowCurves,
      getSecondaryArrowEndpointLabels,
      getSecondaryDerivedArrows,
      hasFirstAttackTargets,
      loadDemoSeeds,
      resetPhase,
      setArrowCurve,
      setSecondaryArrowCurve,
      updateArrowTarget,
      updatePosition,
      updateSecondaryArrowTarget,
    ]
  )
}
