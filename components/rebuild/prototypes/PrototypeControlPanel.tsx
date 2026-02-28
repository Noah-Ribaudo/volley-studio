'use client'

import type { PrototypeVariantId } from '@/lib/rebuild/prototypeFlow'
import { Concept3BigFoundations } from './Concept3BigFoundations'
import { Concept4ReferenceLayout } from './Concept4ReferenceLayout'
import { Concept5RotationHubRallyMap } from './Concept5RotationHubRallyMap'
import { Concept6LiveMatchConsole } from './Concept6LiveMatchConsole'
import type { PrototypeControlProps } from './types'

interface PrototypeControlPanelProps extends PrototypeControlProps {
  activeVariant: PrototypeVariantId
}

export function PrototypeControlPanel({ activeVariant, ...props }: PrototypeControlPanelProps) {
  switch (activeVariant) {
    case 'concept3':
      return <Concept3BigFoundations {...props} />
    case 'concept4':
      return <Concept4ReferenceLayout {...props} />
    case 'concept5':
      return <Concept5RotationHubRallyMap {...props} />
    case 'concept6':
      return <Concept6LiveMatchConsole {...props} />
    default:
      return <Concept3BigFoundations {...props} />
  }
}
