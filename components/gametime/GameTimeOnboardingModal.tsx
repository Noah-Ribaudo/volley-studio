'use client'

import { useHintStore } from '@/store/useHintStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Timer, RotateCcw, Shield } from 'lucide-react'

export function GameTimeOnboardingModal() {
  const hasSeen = useHintStore((s) => s.hasSeenGameTimeOnboarding)
  const markSeen = useHintStore((s) => s.markGameTimeOnboardingSeen)

  if (hasSeen) return null

  return (
    <Dialog open={!hasSeen} onOpenChange={() => markSeen()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Welcome to GameTime</DialogTitle>
          <DialogDescription>
            Your live game companion — track everything while you coach.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-green-600/20 flex items-center justify-center">
              <Timer className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="font-medium text-sm">Live Scoring</p>
              <p className="text-sm text-muted-foreground">
                Tap to score each rally. Tracks timeouts, serve, and point history.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="font-medium text-sm">Auto Rotations</p>
              <p className="text-sm text-muted-foreground">
                Rotations advance automatically when you win serve back. Always know who&apos;s where.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-600/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="font-medium text-sm">Libero Tracking</p>
              <p className="text-sm text-muted-foreground">
                Reminders for when the libero goes in and out based on your rotation.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => markSeen()}
          className="w-full bg-primary hover:bg-primary/90 active:bg-primary/80 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          Get Started
        </button>
      </DialogContent>
    </Dialog>
  )
}
