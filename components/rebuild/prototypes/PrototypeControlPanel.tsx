'use client'

import type { PrototypeVariantId } from '@/lib/rebuild/prototypeFlow'
import { Concept8FullLedPerimeter } from './Concept8FullLedPerimeter'
import type { PrototypeControlProps } from './types'

interface PrototypeControlPanelProps extends PrototypeControlProps {
  activeVariant: PrototypeVariantId
}

export function PrototypeControlPanel({ activeVariant, ...props }: PrototypeControlPanelProps) {
  return <Concept8FullLedPerimeter {...props} variantId={activeVariant} />
}
