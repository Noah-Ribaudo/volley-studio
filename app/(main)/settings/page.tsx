'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ThemePicker from '@/components/ThemePicker'
import SuggestionBox from '@/components/SuggestionBox'

export default function SettingsPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const { signOut } = useAuthActions()
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : 'skip')
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      await signOut()
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6 pb-32 max-w-2xl space-y-6">
        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>Sign in to sync teams and settings across devices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {authLoading ? (
              <div className="h-10 rounded-md bg-muted animate-pulse" />
            ) : isAuthenticated ? (
              <>
                <div className="text-sm text-muted-foreground">
                  Signed in as{' '}
                  <span className="font-medium text-foreground">
                    {viewer?.email || viewer?.name || 'your account'}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? 'Signing out...' : 'Sign out'}
                </Button>
              </>
            ) : (
              <Button asChild className="w-full">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Theme</Label>
                <p className="text-xs text-muted-foreground">Choose light, dark, or follow your device setting</p>
              </div>
              <ThemePicker />
            </div>
          </CardContent>
        </Card>

        {/* Suggestion Box */}
        <SuggestionBox />

      </div>
    </div>
  )
}
