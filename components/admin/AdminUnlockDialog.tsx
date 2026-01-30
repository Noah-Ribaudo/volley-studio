'use client'

import { useState } from 'react'
import { useAdminStore } from '@/store/useAdminStore'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'

export function AdminUnlockDialog() {
  const { showUnlockDialog, closeUnlockDialog, unlockAdmin } = useAdminStore()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password.trim()) {
      setError('Please enter the admin password')
      return
    }

    const success = unlockAdmin(password.trim())
    if (success) {
      setPassword('')
    } else {
      setError('Incorrect password')
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeUnlockDialog()
      setPassword('')
      setError('')
    }
  }

  return (
    <Dialog open={showUnlockDialog} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Admin Mode</DialogTitle>
            <DialogDescription>
              Enter the admin password to edit default rotation presets.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="admin-password">Password</Label>
              <PasswordInput
                id="admin-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Unlock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
