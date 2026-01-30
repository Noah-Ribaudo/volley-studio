'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PRESET_SYSTEMS, PRESET_SYSTEM_INFO, type PresetSystem } from '@/lib/database.types'

interface CreateTeamDialogProps {
  onCreateTeam: (name: string, password?: string, presetSystem?: PresetSystem) => Promise<void>
  isLoading?: boolean
}

export function CreateTeamDialog({ onCreateTeam, isLoading }: CreateTeamDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [presetSystem, setPresetSystem] = useState<PresetSystem | 'scratch'>('scratch')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter a team name')
      return
    }

    try {
      const selectedPreset = presetSystem === 'scratch' ? undefined : presetSystem
      await onCreateTeam(name.trim(), password.trim() || undefined, selectedPreset)
      setName('')
      setPassword('')
      setPresetSystem('scratch')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
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
          New Team
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Enter a name for your team. You can add players and customize rotations after creating the team.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Varsity Squad"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password (Optional)</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Optional team password"
              />
              <p className="text-xs text-muted-foreground">
                Add a simple password to protect your team. This is optional.
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Starting Rotations</Label>
              <RadioGroup
                value={presetSystem}
                onValueChange={(value: string) => setPresetSystem(value as PresetSystem | 'scratch')}
                className="grid gap-2"
              >
                <div className="flex items-start space-x-3 rounded-md border p-3">
                  <RadioGroupItem value="scratch" id="preset-scratch" className="mt-0.5" />
                  <div className="grid gap-0.5">
                    <Label htmlFor="preset-scratch" className="font-medium cursor-pointer">
                      Start Fresh
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Begin with default positions and customize from scratch
                    </p>
                  </div>
                </div>
                {PRESET_SYSTEMS.map((system) => (
                  <div key={system} className="flex items-start space-x-3 rounded-md border p-3">
                    <RadioGroupItem value={system} id={`preset-${system}`} className="mt-0.5" />
                    <div className="grid gap-0.5">
                      <Label htmlFor={`preset-${system}`} className="font-medium cursor-pointer">
                        {PRESET_SYSTEM_INFO[system].name}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {PRESET_SYSTEM_INFO[system].description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

