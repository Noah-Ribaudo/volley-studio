'use client'

import type { PrototypeVariantId } from '@/lib/rebuild/prototypeFlow'
import { Concept4ReferenceLayout } from './Concept4ReferenceLayout'
import { Concept7EdgeLitPhasePad } from './Concept7EdgeLitPhasePad'
import { Concept8FullLedPerimeter } from './Concept8FullLedPerimeter'
import type { PrototypeControlProps } from './types'

interface PrototypeControlPanelProps extends PrototypeControlProps {
  activeVariant: PrototypeVariantId
}

export function PrototypeControlPanel({ activeVariant, ...props }: PrototypeControlPanelProps) {
  switch (activeVariant) {
    case 'concept4':
      return <Concept4ReferenceLayout {...props} />
    case 'concept7':
      return <Concept7EdgeLitPhasePad {...props} />
    case 'concept8':
      return <Concept8FullLedPerimeter {...props} />
    default:
      return <Concept4ReferenceLayout {...props} />
  }
}
