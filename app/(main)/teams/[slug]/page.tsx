'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { SafeAreaHeader } from '@/components/ui/SafeAreaHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'

interface TeamPageProps {
  params: Promise<{ slug: string }>
}

export default function TeamEditPage({ params }: TeamPageProps) {
  const { slug } = use(params)
  const router = useRouter()

  // Fetch team data
  const team = useQuery(api.teams.getBySlug, { slug })
  const updateTeam = useMutation(api.teams.update)
  const updateRoster = useMutation(api.teams.updateRoster)
  const deleteTeam = useMutation(api.teams.remove)

  // Local state for editing
  const [teamName, setTeamName] = useState('')
  const [isNameDirty, setIsNameDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Player editing state
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerNumber, setNewPlayerNumber] = useState('')

  // Initialize team name when data loads
  if (team && !isNameDirty && teamName !== team.name) {
    setTeamName(team.name)
  }

  if (team === undefined) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <SafeAreaHeader>
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <Link href="/teams">
                <Button variant="ghost" size="sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                  Back
                </Button>
              </Link>
              <h1 className="text-xl font-bold">Loading...</h1>
            </div>
          </div>
        </SafeAreaHeader>
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        </div>
      </main>
    )
  }

  if (team === null) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <SafeAreaHeader>
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <Link href="/teams">
                <Button variant="ghost" size="sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                  Back
                </Button>
              </Link>
              <h1 className="text-xl font-bold">Team Not Found</h1>
            </div>
          </div>
        </SafeAreaHeader>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">This team doesn't exist or has been deleted.</p>
        </div>
      </main>
    )
  }

  const handleSaveName = async () => {
    if (!teamName.trim() || teamName === team.name) return
    setIsSaving(true)
    try {
      await updateTeam({ id: team._id, name: teamName.trim() })
      setIsNameDirty(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return
    const newPlayer = {
      id: `player-${Date.now()}`,
      name: newPlayerName.trim(),
      number: newPlayerNumber ? parseInt(newPlayerNumber, 10) : undefined,
    }
    await updateRoster({
      id: team._id,
      roster: [...team.roster, newPlayer],
    })
    setNewPlayerName('')
    setNewPlayerNumber('')
  }

  const handleRemovePlayer = async (playerId: string) => {
    await updateRoster({
      id: team._id,
      roster: team.roster.filter(p => p.id !== playerId),
    })
  }

  const handleDeleteTeam = async () => {
    setIsDeleting(true)
    try {
      await deleteTeam({ id: team._id })
      router.push('/teams')
    } catch {
      setIsDeleting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <SafeAreaHeader>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/teams">
                <Button variant="ghost" size="sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                  Back
                </Button>
              </Link>
              <h1 className="text-xl font-bold">Edit Team</h1>
            </div>
            <Link href={`/?team=${slug}`}>
              <Button size="sm">Open Whiteboard</Button>
            </Link>
          </div>
        </div>
      </SafeAreaHeader>

      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Team Name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team Name</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={teamName}
                onChange={(e) => {
                  setTeamName(e.target.value)
                  setIsNameDirty(true)
                }}
                placeholder="Team name"
                className="flex-1"
              />
              <Button
                onClick={handleSaveName}
                disabled={!isNameDirty || isSaving || !teamName.trim() || teamName === team.name}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Roster */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Roster</CardTitle>
            <CardDescription>{team.roster.length} player{team.roster.length !== 1 ? 's' : ''}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add player form */}
            <div className="flex gap-2">
              <Input
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Player name"
                className="flex-1"
              />
              <Input
                value={newPlayerNumber}
                onChange={(e) => setNewPlayerNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="#"
                className="w-16"
                maxLength={2}
              />
              <Button onClick={handleAddPlayer} disabled={!newPlayerName.trim()}>
                Add
              </Button>
            </div>

            {/* Player list */}
            {team.roster.length > 0 ? (
              <div className="space-y-2">
                {team.roster.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      {player.number !== undefined && (
                        <span className="text-sm font-mono text-muted-foreground">
                          #{player.number}
                        </span>
                      )}
                      <span className="font-medium">{player.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePlayer(player.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No players yet. Add players above.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            {showDeleteConfirm ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  This will permanently delete <strong>{team.name}</strong> and all its data. This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteTeam}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Team
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
