'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTeamStore } from '@/store/useTeamStore'

export default function RosterPage() {
  const router = useRouter()
  const currentTeam = useTeamStore((state) => state.currentTeam)

  useEffect(() => {
    const teamId = currentTeam?._id || currentTeam?.id
    const href = teamId ? `/teams/${encodeURIComponent(teamId)}` : '/teams'
    router.replace(href)
  }, [router, currentTeam?._id, currentTeam?.id])

  return null
}
