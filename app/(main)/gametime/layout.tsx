import { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'GameTime - Live Game Tracker',
  description: 'Track your volleyball game in real-time',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function GameTimeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div data-mode="gametime" className="min-h-[100dvh] bg-background text-foreground">
      {children}
    </div>
  )
}
