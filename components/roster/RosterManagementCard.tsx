'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/useAppStore'

export function RosterManagementCard() {
  const router = useRouter()
  const currentTeam = useAppStore((state) => state.currentTeam)
  const activeContext = useAppStore((state) => state.activeContext)

  const modeLabel = activeContext.mode === 'savedCloud'
    ? 'Saved (Cloud)'
    : activeContext.mode === 'unsavedLocal'
      ? 'Unsaved (Local)'
      : 'Practice (No Team)'

  const teamEditorHref = currentTeam
    ? `/teams/${encodeURIComponent(currentTeam._id || currentTeam.id)}`
    : '/teams'

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Team Quick Actions</CardTitle>
        <CardDescription>{modeLabel}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {currentTeam ? (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
            <p className="text-sm font-medium">{currentTeam.name}</p>
            <p className="text-xs text-muted-foreground">
              {currentTeam.roster.length} players • {currentTeam.lineups.length} lineups
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
            <p className="text-sm font-medium">No team selected</p>
            <p className="text-xs text-muted-foreground">
              The whiteboard stays editable right away. Use Save as Team to keep this setup.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Link href={teamEditorHref} className="block w-full">
            <Button variant="outline" size="sm" className="w-full text-xs">
              {currentTeam ? 'Open Team Editor' : 'Open Teams'}
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => router.push('/teams')}
          >
            Browse Teams
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
