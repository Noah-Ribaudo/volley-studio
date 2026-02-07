'use client'

import { useGameTimeStore } from '@/store/useGameTimeStore'
import { SetupScreen } from '@/components/gametime/SetupScreen'
import { GameScreen } from '@/components/gametime/GameScreen'
import { GameTimeOnboardingModal } from '@/components/gametime/GameTimeOnboardingModal'

export default function GameTimePage() {
  const phase = useGameTimeStore((s) => s.phase)

  if (phase === 'setup') {
    return (
      <>
        <GameTimeOnboardingModal />
        <SetupScreen />
      </>
    )
  }

  return <GameScreen />
}
