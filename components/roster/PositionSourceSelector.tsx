'use client'

import { PositionSource, POSITION_SOURCE_INFO } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Layers01Icon, LayoutGridIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

interface PositionSourceSelectorProps {
  value: PositionSource
  onChange: (source: PositionSource) => void
  disabled?: boolean
}

export function PositionSourceSelector({
  value,
  onChange,
  disabled = false,
}: PositionSourceSelectorProps) {
  const currentInfo = POSITION_SOURCE_INFO[value]

  return (
    <div className="flex items-center gap-2">
      <HugeiconsIcon
        icon={currentInfo.isPreset ? LayoutGridIcon : Layers01Icon}
        className="h-4 w-4 text-muted-foreground flex-shrink-0"
      />
      <Select
        value={value}
        onValueChange={(v) => onChange(v as PositionSource)}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 text-xs w-[140px]">
          <SelectValue placeholder="Position source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="custom">
            <div className="flex flex-col items-start">
              <span className="font-medium">{POSITION_SOURCE_INFO['custom'].name}</span>
              <span className="text-xs text-muted-foreground">
                {POSITION_SOURCE_INFO['custom'].description}
              </span>
            </div>
          </SelectItem>
          <SelectItem value="full-5-1">
            <div className="flex flex-col items-start">
              <span className="font-medium">{POSITION_SOURCE_INFO['full-5-1'].name}</span>
              <span className="text-xs text-muted-foreground">
                {POSITION_SOURCE_INFO['full-5-1'].description}
              </span>
            </div>
          </SelectItem>
          <SelectItem value="5-1-libero">
            <div className="flex flex-col items-start">
              <span className="font-medium">{POSITION_SOURCE_INFO['5-1-libero'].name}</span>
              <span className="text-xs text-muted-foreground">
                {POSITION_SOURCE_INFO['5-1-libero'].description}
              </span>
            </div>
          </SelectItem>
          <SelectItem value="6-2">
            <div className="flex flex-col items-start">
              <span className="font-medium">{POSITION_SOURCE_INFO['6-2'].name}</span>
              <span className="text-xs text-muted-foreground">
                {POSITION_SOURCE_INFO['6-2'].description}
              </span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
