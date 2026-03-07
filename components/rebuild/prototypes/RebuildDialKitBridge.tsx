'use client'

import { useEffect } from 'react'
import type { PrototypeVariantId } from '@/lib/rebuild/prototypeFlow'
import { DEFAULT_TACTILE_TUNING, type TactileTuning } from '@/lib/rebuild/tactileTuning'

interface RebuildDialKitBridgeProps {
  activeVariant: PrototypeVariantId
  onTuningChange: (tuning: TactileTuning) => void
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export function RebuildDialKitBridge({
  activeVariant: _activeVariant,
  onTuningChange,
  position: _position = 'top-right',
}: RebuildDialKitBridgeProps) {
  useEffect(() => {
    onTuningChange(DEFAULT_TACTILE_TUNING)
  }, [onTuningChange])

  return null
}
