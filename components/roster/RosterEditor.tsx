'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RosterPlayer } from '@/lib/types'

interface RosterEditorProps {
  roster: RosterPlayer[]
  onChange: (roster: RosterPlayer[]) => void
  isLoading?: boolean
}

export function RosterEditor({ roster, onChange, isLoading }: RosterEditorProps) {
  const [players, setPlayers] = useState<RosterPlayer[]>(roster)
  const [newName, setNewName] = useState('')
  const [newNumber, setNewNumber] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setPlayers(roster)
  }, [roster])

  // Add a new player
  const handleAddPlayer = () => {
    setError('')

    const hasName = newName.trim().length > 0
    const hasNumber = newNumber.trim().length > 0

    if (!hasName && !hasNumber) {
      setError('Please enter a name or jersey number')
      return
    }

    let number: number | undefined
    if (hasNumber) {
      number = parseInt(newNumber)
      if (isNaN(number) || number < 0 || number > 99) {
        setError('Please enter a valid jersey number (0-99)')
        return
      }
      // Check for duplicate number
      if (players.some(p => p.number === number)) {
        setError('This jersey number is already taken')
        return
      }
    }

    const newPlayer: RosterPlayer = {
      id: `player-${Date.now()}`,
      name: hasName ? newName.trim() : undefined,
      number
    }

    const updatedRoster = [...players, newPlayer]
    setPlayers(updatedRoster)
    setNewName('')
    setNewNumber('')

    onChange(updatedRoster)
  }

  // Handle Enter key press in input fields
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddPlayer()
    }
  }

  // Remove a player
  const handleRemovePlayer = (id: string) => {
    const updatedRoster = players.filter(p => p.id !== id)
    setPlayers(updatedRoster)
    onChange(updatedRoster)
  }

  // Update a player
  const handleUpdatePlayer = (id: string, updates: Partial<RosterPlayer>) => {
    // Validate jersey number uniqueness and range when updating number
    if (updates.number !== undefined) {
      const number = updates.number
      if (Number.isNaN(number) || number < 0 || number > 99) {
        setError('Please enter a valid jersey number (0-99)')
        return
      }
      if (players.some(p => p.id !== id && p.number === number)) {
        setError('This jersey number is already taken')
        return
      }
    }

    const updatedRoster = players.map(p =>
      p.id === id ? { ...p, ...updates } : p
    )
    setPlayers(updatedRoster)
    onChange(updatedRoster)
  }

  return (
    <div className="space-y-4">
      {/* Player list */}
      {players.length > 0 && (
        <div className="space-y-2">
          {players
            .sort((a, b) => (a.number ?? 999) - (b.number ?? 999))
            .map(player => (
              <div
                key={player.id}
                className="flex items-center gap-2 p-2 bg-card border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <Input
                    value={player.name ?? ''}
                    onChange={(e) => handleUpdatePlayer(player.id, { name: e.target.value || undefined })}
                    placeholder="Name"
                    className="h-8 text-sm"
                  />
                </div>
                <Input
                  type="number"
                  min={0}
                  max={99}
                  value={player.number ?? ''}
                  onChange={(e) => handleUpdatePlayer(player.id, { number: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="#"
                  className="w-20 h-9 text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePlayer(player.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18"/>
                    <path d="m6 6 12 12"/>
                  </svg>
                </Button>
              </div>
            ))}
        </div>
      )}

      {/* Add player form */}
      <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <Label htmlFor="player-name" className="text-xs">Name</Label>
            <Input
              id="player-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Player name"
              className="h-9"
            />
          </div>
          <div>
            <Label htmlFor="player-number" className="text-xs">#</Label>
            <Input
              id="player-number"
              type="number"
              min={0}
              max={99}
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="00"
              className="h-9"
            />
          </div>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button
          onClick={handleAddPlayer}
          disabled={isLoading}
          size="sm"
          className="w-full"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-1.5"
          >
            <path d="M5 12h14"/>
            <path d="M12 5v14"/>
          </svg>
          Add Player
        </Button>
      </div>

      {players.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {players.length} player{players.length !== 1 ? 's' : ''} on roster
        </p>
      )}
    </div>
  )
}
