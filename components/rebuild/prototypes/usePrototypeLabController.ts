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
  const [isOurServe, setIsOurServe] = useState(true)
  const [isPreviewingMovement, setPreviewingMovement] = useState(false)
  const [playAnimationTrigger, setPlayAnimationTrigger] = useState(0)
  const [isLabTrayOpen, setIsLabTrayOpen] = useState(false)
  const [connectorStyle, setConnectorStyle] = useState<ConnectorStyle>('sweep')

  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPlayTimer = useCallback(() => {
    if (!playTimerRef.current) return
    clearTimeout(playTimerRef.current)
    playTimerRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      clearPlayTimer()
    }
  }, [clearPlayTimer])

  const resetPreview = useCallback(() => {
    clearPlayTimer()
    setPreviewingMovement(false)
  }, [clearPlayTimer])

  const handleRotationSelect = useCallback(
    (rotation: Rotation) => {
      resetPreview()
      setCurrentRotation(rotation)
    },
    [resetPreview]
  )

  const handlePhaseSelect = useCallback(
    (phase: CorePhase) => {
      resetPreview()
      setCurrentCorePhase(phase)
    },
    [resetPreview]
  )

  const handlePlay = useCallback(() => {
    if (isPreviewingMovement) {
      resetPreview()
      return
    }

    const nextPhase = getNextByPlay(currentCorePhase)
    setPlayAnimationTrigger((prev) => prev + 1)
    setPreviewingMovement(true)
    clearPlayTimer()

    playTimerRef.current = setTimeout(() => {
      setPreviewingMovement(false)
      setCurrentCorePhase(nextPhase)
      playTimerRef.current = null
    }, playAdvanceDelayMs)
  }, [clearPlayTimer, currentCorePhase, isPreviewingMovement, playAdvanceDelayMs, resetPreview])

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
      setIsOurServe(outcome.nextIsOurServe)
    },
    [activeVariant, currentCorePhase, currentRotation, isOurServe, resetPreview]
  )

  const resetToBaseline = useCallback(() => {
    resetPreview()
    setCurrentRotation(1)
    setCurrentCorePhase('SERVE')
    setIsOurServe(true)
  }, [resetPreview])

  return {
    activeVariant,
    setActiveVariant,
    currentRotation,
    currentCorePhase,
    isOurServe,
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
