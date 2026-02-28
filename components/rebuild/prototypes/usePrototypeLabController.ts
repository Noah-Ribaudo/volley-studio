'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyPointScored,
  canVariantScore,
  getNextByPlay,
  type CorePhase,
  type PointWinner,
  type PrototypeVariantId,
} from '@/lib/rebuild/prototypeFlow'
import type { Rotation } from '@/lib/types'

const PLAY_ADVANCE_DELAY_MS = 1050

function wrapRotation(rotation: Rotation, delta: -1 | 1): Rotation {
  if (delta === 1) {
    return rotation === 6 ? 1 : ((rotation + 1) as Rotation)
  }
  return rotation === 1 ? 6 : ((rotation - 1) as Rotation)
}

export function usePrototypeLabController() {
  const [activeVariant, setActiveVariant] = useState<PrototypeVariantId>('concept4')
  const [currentRotation, setCurrentRotation] = useState<Rotation>(1)
  const [currentCorePhase, setCurrentCorePhase] = useState<CorePhase>('SERVE')
  const [isOurServe, setIsOurServe] = useState(true)
  const [isPreviewingMovement, setPreviewingMovement] = useState(false)
  const [playAnimationTrigger, setPlayAnimationTrigger] = useState(0)

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

  const handleRotationStep = useCallback(
    (delta: -1 | 1) => {
      resetPreview()
      setCurrentRotation((prev) => wrapRotation(prev, delta))
    },
    [resetPreview]
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
    }, PLAY_ADVANCE_DELAY_MS)
  }, [clearPlayTimer, currentCorePhase, isPreviewingMovement, resetPreview])

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
    handleRotationStep,
    handleRotationSelect,
    handlePhaseSelect,
    handlePlay,
    handlePoint,
    resetPreview,
    resetToBaseline,
  }
}
