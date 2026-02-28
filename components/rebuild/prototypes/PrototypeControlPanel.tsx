'use client'

import type { PrototypeVariantId } from '@/lib/rebuild/prototypeFlow'
import { Concept1WorkbookStateGraph } from './Concept1WorkbookStateGraph'
import { Concept2DualPlayLanes } from './Concept2DualPlayLanes'
import { Concept3BigFoundations } from './Concept3BigFoundations'
import { Concept4RulesTableRouter } from './Concept4RulesTableRouter'
import { Concept5RotationHubRallyMap } from './Concept5RotationHubRallyMap'
import { Concept6LiveMatchConsole } from './Concept6LiveMatchConsole'
import type { PrototypeControlProps } from './types'

interface PrototypeControlPanelProps extends PrototypeControlProps {
  activeVariant: PrototypeVariantId
}

export function PrototypeControlPanel({ activeVariant, ...props }: PrototypeControlPanelProps) {
  switch (activeVariant) {
    case 'concept1':
      return <Concept1WorkbookStateGraph {...props} />
    case 'concept2':
      return <Concept2DualPlayLanes {...props} />
    case 'concept3':
      return <Concept3BigFoundations {...props} />
    case 'concept4':
      return <Concept4RulesTableRouter {...props} />
    case 'concept5':
      return <Concept5RotationHubRallyMap {...props} />
    case 'concept6':
      return <Concept6LiveMatchConsole {...props} />
    default:
      return <Concept1WorkbookStateGraph {...props} />
  }
}
