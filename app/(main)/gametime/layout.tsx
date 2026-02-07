import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GameTime - Live Game Tracker',
  description: 'Track your volleyball game in real-time',
}

export default function GameTimeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
