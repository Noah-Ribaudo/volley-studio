'use client'

import { RosterPlayer, PositionAssignments } from '@/lib/types'
import { PositionCourt } from '@/components/team'

interface PositionAssignerProps {
  roster: RosterPlayer[]
  assignments: PositionAssignments
  onChange: (assignments: PositionAssignments) => void
  isLoading?: boolean
  showLibero?: boolean
}

export function PositionAssigner({
  roster,
  assignments,
  onChange,
  isLoading,
  showLibero = false
}: PositionAssignerProps) {
  return (
    <PositionCourt
      roster={roster}
      assignments={assignments}
      onChange={onChange}
      showLibero={showLibero}
      isLoading={isLoading}
    />
  )
}
