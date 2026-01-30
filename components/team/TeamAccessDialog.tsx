'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Team } from '@/lib/types'

interface TeamAccessDialogProps {
  team: Team
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TeamAccessDialog({ team, open, onOpenChange }: TeamAccessDialogProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  
  const handleViewOnly = () => {
    router.push(`/volleyball/teams/${team.slug}?viewOnly=true`)
    onOpenChange(false)
  }
  
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!password.trim()) {
      setError('Please enter a password')
      return
    }
    
    setIsVerifying(true)
    
    // Simple password check (compare directly since it's stored as plain text)
    if (password.trim() === team.password) {
      router.push(`/volleyball/teams/${team.slug}?edit=true`)
      onOpenChange(false)
      setPassword('')
    } else {
      setError('Incorrect password')
      setIsVerifying(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Team Access</DialogTitle>
          <DialogDescription>
            This team is password protected. Choose how you want to access it.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* View Only Option - Primary */}
          <div className="space-y-2">
            <Button
              onClick={handleViewOnly}
              className="w-full"
              size="lg"
            >
              View Only
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              View the team without making changes
            </p>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>
          
          {/* Password Entry */}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Enter Password to Edit</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                placeholder="Enter team password"
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={isVerifying}
            >
              {isVerifying ? 'Verifying...' : 'Enter Password'}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}











