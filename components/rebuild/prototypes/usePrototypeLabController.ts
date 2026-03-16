'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyPointScored,
  canVariantScore,
  type ConnectorStyle,
  getNextByPlay,
  type CorePhase,
  type PointWinner,
  type PrototypeVariantId,
} from '@/lib/rebuild/prototypeFlow'
import type { Rotation } from '@/lib/types'

export function usePrototypeLabController(playAdvanceDelayMs: number) {
  const [activeVariant, setActiveVariant] = useState<PrototypeVariantId>('concept8')
  const [currentRotation, setCurrentRotation] = useState<Rotation>(1)
  const [currentCorePhase, setCurrentCorePhase] = useState<CorePhase>('SERVE')
  const [targetCorePhase, setTargetCorePhase] = useState<CorePhase>('SERVE')
  const [isOurServe, setIsOurServe] = useState(true)
  const [isPhaseTraveling, setIsPhaseTraveling] = useState(false)
  const [isPreviewingMovement, setPreviewingMovement] = useState(false)
  const [playAnimationTrigger, setPlayAnimationTrigger] = useState(0)
  const [isLabTrayOpen, setIsLabTrayOpen] = useState(false)
  const [connectorStyle, setConnectorStyle] = useState<ConnectorStyle>('sweep')

  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phaseCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPlayTimer = useCallback(() => {
    if (!playTimerRef.current) return
    clearTimeout(playTimerRef.current)
    playTimerRef.current = null
  }, [])

  const clearPhaseCommitTimer = useCallback(() => {
    if (!phaseCommitTimerRef.current) return
    clearTimeout(phaseCommitTimerRef.current)
    phaseCommitTimerRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      clearPlayTimer()
      clearPhaseCommitTimer()
    }
  }, [clearPhaseCommitTimer, clearPlayTimer])

  const resetPreview = useCallback(() => {
    clearPlayTimer()
    clearPhaseCommitTimer()
    setPreviewingMovement(false)
    setIsPhaseTraveling(false)
    setTargetCorePhase(currentCorePhase)
  }, [clearPhaseCommitTimer, clearPlayTimer, currentCorePhase])

  const queuePhaseTravel = useCallback(
    (nextPhase: CorePhase, options?: { previewMovement?: boolean; triggerPlayAnimation?: boolean }) => {
      const previewMovement = options?.previewMovement ?? false
      const triggerPlayAnimation = options?.triggerPlayAnimation ?? false
      const shouldStartTravel =
        isPhaseTraveling ||
        isPreviewingMovement ||
        nextPhase !== currentCorePhase

      clearPlayTimer()
      clearPhaseCommitTimer()

      if (!shouldStartTravel) {
        setPreviewingMovement(false)
        setIsPhaseTraveling(false)
        setTargetCorePhase(nextPhase)
        return
      }

      setTargetCorePhase(nextPhase)
      setIsPhaseTraveling(true)
      setPreviewingMovement(previewMovement)

      if (triggerPlayAnimation) {
        setPlayAnimationTrigger((prev) => prev + 1)
      }

      phaseCommitTimerRef.current = setTimeout(() => {
        setCurrentCorePhase(nextPhase)
        setTargetCorePhase(nextPhase)
        setIsPhaseTraveling(false)
        setPreviewingMovement(false)
        phaseCommitTimerRef.current = null
      }, playAdvanceDelayMs)
    },
    [
      clearPhaseCommitTimer,
      clearPlayTimer,
      currentCorePhase,
      isPhaseTraveling,
      isPreviewingMovement,
      playAdvanceDelayMs,
    ]
  )

  const handleRotationSelect = useCallback(
    (rotation: Rotation) => {
      resetPreview()
      setCurrentRotation(rotation)
    },
    [resetPreview]
  )

  const handlePhaseSelect = useCallback(
    (phase: CorePhase) => {
      if (activeVariant === 'concept8') {
        queuePhaseTravel(phase)
        return
      }

      resetPreview()
      setCurrentCorePhase(phase)
      setTargetCorePhase(phase)
    },
    [activeVariant, queuePhaseTravel, resetPreview]
  )

  const handlePlay = useCallback(() => {
    if (isPreviewingMovement) {
      resetPreview()
      return
    }

    const basePhase = activeVariant === 'concept8' && isPhaseTraveling
      ? targetCorePhase
      : currentCorePhase
    const nextPhase = getNextByPlay(basePhase)

    if (activeVariant === 'concept8') {
      queuePhaseTravel(nextPhase, {
        previewMovement: true,
        triggerPlayAnimation: true,
      })
      return
    }

    setPlayAnimationTrigger((prev) => prev + 1)
    setPreviewingMovement(true)
    clearPlayTimer()

    playTimerRef.current = setTimeout(() => {
      setPreviewingMovement(false)
      setCurrentCorePhase(nextPhase)
      setTargetCorePhase(nextPhase)
      playTimerRef.current = null
    }, playAdvanceDelayMs)
  }, [
    activeVariant,
    clearPlayTimer,
    currentCorePhase,
    isPhaseTraveling,
    isPreviewingMovement,
    playAdvanceDelayMs,
    queuePhaseTravel,
    resetPreview,
    targetCorePhase,
  ])

  const handlePoint = useCallback(
    (winner: PointWinner) => {
      if (!canVariantScore(activeVariant)) return
      resetPreview()

      const outcome = applyPointScored(
        {
          currentRotation,
          currentCorePhase,
          isOurServe,
        },
        winner
      )

      setCurrentRotation(outcome.nextRotation)
      setCurrentCorePhase(outcome.nextCorePhase)
      setTargetCorePhase(outcome.nextCorePhase)
      setIsPhaseTraveling(false)
      setIsOurServe(outcome.nextIsOurServe)
    },
    [activeVariant, currentCorePhase, currentRotation, isOurServe, resetPreview]
  )

  const resetToBaseline = useCallback(() => {
    resetPreview()
    setCurrentRotation(1)
    setCurrentCorePhase('SERVE')
    setTargetCorePhase('SERVE')
    setIsPhaseTraveling(false)
    setIsOurServe(true)
  }, [resetPreview])

  return {
    activeVariant,
    setActiveVariant,
    currentRotation,
    currentCorePhase,
    targetCorePhase,
    isOurServe,
    isPhaseTraveling,
    isPreviewingMovement,
    playAnimationTrigger,
    isLabTrayOpen,
    setIsLabTrayOpen,
    connectorStyle,
    setConnectorStyle,
    handleRotationSelect,
    handlePhaseSelect,
    handlePlay,
    handlePoint,
    resetPreview,
    resetToBaseline,
  }
}
