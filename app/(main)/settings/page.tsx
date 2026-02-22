'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useAppStore } from '@/store/useAppStore'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ThemePicker from '@/components/ThemePicker'
import SuggestionBox from '@/components/SuggestionBox'

export default function SettingsPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const { signOut } = useAuthActions()
  const {
    // Display toggles
    showPosition,
    showPlayer,
    showNumber,
    setShowPosition,
    setShowPlayer,
    setShowNumber,
    circleTokens,
    setCircleTokens,
    hideAwayTeam,
    setHideAwayTeam,
    // Team (for conditional UI)
    currentTeam,
    // Court view
    awayTeamHidePercent,
    setAwayTeamHidePercent,
  } = useAppStore()
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : 'skip')
  const [isSigningOut, setIsSigningOut] = useState(false)

  const hasTeam = Boolean(currentTeam)
  const enabledDisplayCount = Number(showPosition) + Number(showPlayer) + Number(showNumber)
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

        {/* Display Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Display</CardTitle>
            <CardDescription>Control what is visible on the court</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasTeam && (
              <>
                <SettingsToggle
                  id="show-positions"
                  label="Show Positions"
                  description="Display position labels on players"
                  checked={showPosition}
                  onCheckedChange={(checked) => {
                    if (!checked && enabledDisplayCount <= 1) return
                    setShowPosition(checked)
                  }}
                />
                <SettingsToggle
                  id="show-players"
                  label="Show Player Names"
                  description="Display player names on tokens"
                  checked={showPlayer}
                  onCheckedChange={(checked) => {
                    if (!checked && enabledDisplayCount <= 1) return
                    setShowPlayer(checked)
                  }}
                />
                <SettingsToggle
                  id="show-numbers"
                  label="Show Player Numbers"
                  description="Display player numbers on tokens"
                  checked={showNumber}
                  onCheckedChange={(checked) => {
                    if (!checked && enabledDisplayCount <= 1) return
                    setShowNumber(checked)
                  }}
                />
              </>
            )}
            <SettingsToggle
              id="circle-tokens"
              label="Circle Tokens"
              description="Use circular tokens instead of rounded rectangles"
              checked={circleTokens}
              onCheckedChange={setCircleTokens}
            />
            <SettingsToggle
              id="hide-away-team"
              label="Hide Away Team"
              description="Show only your team on the whiteboard"
              checked={hideAwayTeam}
              onCheckedChange={setHideAwayTeam}
            />
            {hideAwayTeam && (
              <div className="space-y-2 pl-4 border-l-2 border-muted">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">How much to hide</Label>
                  <span className="text-sm text-muted-foreground">{awayTeamHidePercent}%</span>
                </div>
                <Slider
                  value={[awayTeamHidePercent]}
                  onValueChange={([val]) => setAwayTeamHidePercent(val)}
                  min={20}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Lower values show more of the court including the net
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suggestion Box */}
        <SuggestionBox />

      </div>
    </div>
  )
}

interface SettingsToggleProps {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function SettingsToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: SettingsToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
