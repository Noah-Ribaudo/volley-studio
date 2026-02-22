'use client'

import { useUIPrefsStore } from '@/store/useUIPrefsStore'
import { useSettingsStoresHydrated } from '@/store/hydration'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function DeveloperSettingsPage() {
  const isHydrated = useSettingsStoresHydrated()
  const debugHitboxes = useUIPrefsStore((s) => s.debugHitboxes)
  const setDebugHitboxes = useUIPrefsStore((s) => s.setDebugHitboxes)
  const showPrintFeature = useUIPrefsStore((s) => s.showPrintFeature)
  const setShowPrintFeature = useUIPrefsStore((s) => s.setShowPrintFeature)
  const sidebarProfileInFooter = useUIPrefsStore((s) => s.sidebarProfileInFooter)
  const setSidebarProfileInFooter = useUIPrefsStore((s) => s.setSidebarProfileInFooter)
  const courtSetupSurfaceVariant = useUIPrefsStore((s) => s.courtSetupSurfaceVariant)
  const setCourtSetupSurfaceVariant = useUIPrefsStore((s) => s.setCourtSetupSurfaceVariant)
  const useUnifiedTeamAssignment = useUIPrefsStore((s) => s.useUnifiedTeamAssignment)
  const setUseUnifiedTeamAssignment = useUIPrefsStore((s) => s.setUseUnifiedTeamAssignment)

  if (!isHydrated) {
    return null
  }

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-6 pb-32 max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Developer Settings</CardTitle>
            <CardDescription>Tools for development and debugging</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingsToggle
              id="debug-hitboxes"
              label="Show Touch Targets"
              description="Display green overlay on interactive touch areas"
              checked={debugHitboxes}
              onCheckedChange={setDebugHitboxes}
            />
            <SettingsToggle
              id="show-print"
              label="Print Feature"
              description="Enable the print rotations feature"
              checked={showPrintFeature}
              onCheckedChange={setShowPrintFeature}
            />
            <SettingsToggle
              id="sidebar-profile-footer"
              label="Sidebar Footer Profile"
              description="Move the account control to the bottom of the desktop sidebar"
              checked={sidebarProfileInFooter}
              onCheckedChange={setSidebarProfileInFooter}
            />
            <SettingsToggle
              id="unified-team-assignment"
              label="Unified Team Assignment"
              description="New court + roster UI with drag-and-drop for assigning players"
              checked={useUnifiedTeamAssignment}
              onCheckedChange={setUseUnifiedTeamAssignment}
            />
            <div className="space-y-2">
              <Label htmlFor="court-setup-surface" className="text-sm font-medium">
                Court Setup Surface
              </Label>
              <p className="text-xs text-muted-foreground">
                Choose which desktop court setup UI to evaluate.
              </p>
              <Select
                value={courtSetupSurfaceVariant}
                onValueChange={(value) => setCourtSetupSurfaceVariant(value as 'popover' | 'panel')}
              >
                <SelectTrigger id="court-setup-surface" className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popover">Popover</SelectItem>
                  <SelectItem value="panel">Right Panel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
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
