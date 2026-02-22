'use client'

import { RosterPlayer, PositionAssignments, Rotation } from '@/lib/types'
import { PositionCourt, UnifiedTeamAssignment } from '@/components/team'
import { useUIPrefsStore } from '@/store/useUIPrefsStore'

interface PositionAssignerProps {
  roster: RosterPlayer[]
  assignments: PositionAssignments
  onChange: (assignments: PositionAssignments) => void
  isLoading?: boolean
  showLibero?: boolean
  rotation?: Rotation
  onRotationChange?: (rotation: Rotation) => void
}

export function PositionAssigner({
  roster,
  assignments,
  onChange,
  isLoading,
  showLibero = false,
  rotation = 1,
  onRotationChange,
}: PositionAssignerProps) {
  const useUnified = useUIPrefsStore((s) => s.useUnifiedTeamAssignment)

  const Component = useUnified ? UnifiedTeamAssignment : PositionCourt

  return (
    <Component
      roster={roster}
      assignments={assignments}
      onChange={onChange}
      showLibero={showLibero}
      rotation={rotation}
      onRotationChange={onRotationChange}
      isLoading={isLoading}
    />
  )
}
