'use client'

import { useState } from 'react'
import { useConvexAuth } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { PresetSystem } from '@/lib/presetTypes'

interface CreateTeamDialogProps {
  onCreateTeam: (name: string, password?: string, presetSystem?: PresetSystem) => Promise<void>
  onCreateLocalTeam?: (name: string, presetSystem?: PresetSystem) => void
  isLoading?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
  triggerLabel?: string
}

function SignInPrompt({ onContinueWithoutAccount }: { onContinueWithoutAccount: () => void }) {
  const { signIn } = useAuthActions()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signUp')

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      await signIn('google')
    } catch (error) {
      console.error('Sign in error:', error)
      setIsGoogleLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPasswordLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      await signIn('password', { email, password, flow: mode })
    } catch (err) {
      console.error('Sign in error:', err)
      setError(
        mode === 'signIn'
          ? 'Invalid email or password'
          : 'Could not create account. Email may already be in use.'
      )
      setIsPasswordLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Quick sign-in to save your team and settings</DialogTitle>
        <DialogDescription className="space-y-2 pt-2">
          <span className="block">
            This is <strong>only</strong> so your teams and settings persist across devices.
            I don't want your data for anything else — no tracking, no marketing, no selling to anyone.
          </span>
          <span className="block text-xs">
            Don't want to sign in? That's fine — you can still use the whiteboard and all
            the visualization tools without an account.
          </span>
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 py-2">
        {/* Google sign-in */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-secondary border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-foreground font-medium">
            {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
          </span>
        </button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or use email</span>
          </div>
        </div>

        {/* Email/password form */}
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <input
            type="email"
            name="email"
            aria-label="Email"
            placeholder="Email"
            required
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <input
            type="password"
            name="password"
            aria-label="Password"
            placeholder="Password (8+ characters)"
            required
            minLength={8}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={isPasswordLoading}
            className="w-full px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isPasswordLoading
              ? mode === 'signIn'
                ? 'Signing in...'
                : 'Creating account...'
              : mode === 'signIn'
                ? 'Sign in'
                : 'Create account'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signIn' ? 'signUp' : 'signIn')
              setError(null)
            }}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === 'signIn'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>

      <DialogFooter className="flex-col sm:flex-col gap-2">
        <div className="relative w-full">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={onContinueWithoutAccount} className="w-full">
          Continue without an account
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Without sign-in, teams and settings stay on this device only
        </p>
        <Link href="/privacy" className="text-xs text-center text-muted-foreground hover:text-foreground">
          Privacy policy (it's short, I promise)
        </Link>
      </DialogFooter>
    </div>
  )
}

function CreateTeamForm({
  onCreateTeam,
  isLoading,
  onClose,
  localOnly,
}: {
  onCreateTeam: (name: string, password?: string, presetSystem?: PresetSystem) => Promise<void>
  isLoading?: boolean
  onClose: () => void
  localOnly?: boolean
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter a team name')
      return
    }

    try {
      await onCreateTeam(name.trim(), undefined, undefined)
      setName('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Create New Team</DialogTitle>
        <DialogDescription>
          {localOnly
            ? 'This team will be saved on this device only. Sign in later to sync it across devices.'
            : 'Enter a name for your team. You can add players and customize rotations after creating the team.'}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Team Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.form?.requestSubmit()
              }
            }}
            placeholder="e.g., Varsity Squad"
            autoFocus
          />
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Team'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function CreateTeamDialog({
  onCreateTeam,
  onCreateLocalTeam,
  isLoading,
  open,
  onOpenChange,
  hideTrigger = false,
  triggerLabel = 'New Team',
}: CreateTeamDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [showLocalForm, setShowLocalForm] = useState(false)
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const isControlled = open !== undefined
  const dialogOpen = isControlled ? open : internalOpen

  const setDialogOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }

  const handleOpenChange = (isOpen: boolean) => {
    setDialogOpen(isOpen)
    if (!isOpen) setShowLocalForm(false)
  }

  const handleLocalCreate = async (name: string, _password?: string, presetSystem?: PresetSystem) => {
    onCreateLocalTeam?.(name, presetSystem)
    setDialogOpen(false)
    setShowLocalForm(false)
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
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
            {triggerLabel}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        {authLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          </div>
        ) : isAuthenticated ? (
          <CreateTeamForm
            onCreateTeam={onCreateTeam}
            isLoading={isLoading}
            onClose={() => handleOpenChange(false)}
          />
        ) : showLocalForm ? (
          <CreateTeamForm
            onCreateTeam={handleLocalCreate}
            isLoading={false}
            onClose={() => handleOpenChange(false)}
            localOnly
          />
        ) : (
          <SignInPrompt
            onContinueWithoutAccount={() => setShowLocalForm(true)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
