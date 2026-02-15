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
import { RALLY_PHASE_INFO, RallyPhase } from '@/lib/types'
import { cn } from '@/lib/utils'
import ThemePicker from '@/components/ThemePicker'
import SuggestionBox from '@/components/SuggestionBox'
import { DragDropVerticalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import dynamic from 'next/dynamic'

const DevThemeSection = process.env.NODE_ENV === 'development'
  ? dynamic(() => import('@/components/dev/DevThemeSection'), { ssr: false })
  : () => null

const DevLogoSection = process.env.NODE_ENV === 'development'
  ? dynamic(() => import('@/components/dev/DevLogoSection'), { ssr: false })
  : () => null
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function SettingsPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const { signOut } = useAuthActions()
  const {
    // Display toggles
    showPosition,
    showPlayer,
    setShowPosition,
    setShowPlayer,
    showLibero,
    setShowLibero,
    circleTokens,
    setCircleTokens,
    hideAwayTeam,
    setHideAwayTeam,
    // Phase visibility and order
    visiblePhases,
    togglePhaseVisibility,
    phaseOrder,
    setPhaseOrder,
    // Team (for conditional UI)
    currentTeam,
    // Court view
    awayTeamHidePercent,
    setAwayTeamHidePercent,
    // Debug
    debugHitboxes,
    setDebugHitboxes,
    showPrintFeature,
    setShowPrintFeature,
    sidebarProfileInFooter,
    setSidebarProfileInFooter,
  } = useAppStore()
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : 'skip')
  const [isSigningOut, setIsSigningOut] = useState(false)

  // DnD sensors for phase reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = phaseOrder.indexOf(active.id as RallyPhase)
      const newIndex = phaseOrder.indexOf(over.id as RallyPhase)
      setPhaseOrder(arrayMove(phaseOrder, oldIndex, newIndex))
    }
  }

  const hasTeam = Boolean(currentTeam)
  const [whiteboardPhasesOpen, setWhiteboardPhasesOpen] = useState(false)
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-6 pb-32 max-w-2xl space-y-6">
        {process.env.NODE_ENV === 'development' && <DevThemeSection />}
        {process.env.NODE_ENV === 'development' && <DevLogoSection />}

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
                    if (!checked && !showPlayer) return
                    setShowPosition(checked)
                  }}
                />
                <SettingsToggle
                  id="show-players"
                  label="Show Player Names"
                  description="Display player names on tokens"
                  checked={showPlayer}
                  onCheckedChange={(checked) => {
                    if (!checked && !showPosition) return
                    setShowPlayer(checked)
                  }}
                />
              </>
            )}
            <SettingsToggle
              id="show-libero"
              label="Show Libero"
              description="Display libero substitutions"
              checked={showLibero}
              onCheckedChange={setShowLibero}
            />
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

        {/* Developer Tools - dev only */}
        {process.env.NODE_ENV === 'development' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Developer</CardTitle>
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
            </CardContent>
          </Card>
        )}

        {/* Whiteboard Phases */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Whiteboard Phases</CardTitle>
                <CardDescription>Drag to reorder, toggle to show/hide in the whiteboard cycle</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWhiteboardPhasesOpen((prev) => !prev)}
              >
                {whiteboardPhasesOpen ? 'Hide' : 'Show'}
              </Button>
            </div>
          </CardHeader>
          {whiteboardPhasesOpen && (
            <CardContent>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={phaseOrder} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {phaseOrder.map(phase => {
                      const info = RALLY_PHASE_INFO[phase]
                      const isVisible = visiblePhases.has(phase)
                      return (
                        <SortablePhaseItem
                          key={phase}
                          phase={phase}
                          label={info.name}
                          description={info.description}
                          checked={isVisible}
                          onCheckedChange={() => togglePhaseVisibility(phase)}
                        />
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          )}
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

interface SortablePhaseItemProps {
  phase: RallyPhase
  label: string
  description?: string
  checked: boolean
  onCheckedChange: () => void
}

function SortablePhaseItem({
  phase,
  label,
  description,
  checked,
  onCheckedChange,
}: SortablePhaseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-card",
        isDragging && "opacity-50 shadow-lg z-10"
      )}
    >
      <button
        type="button"
        className="touch-none cursor-grab active:cursor-grabbing p-1 -m-1 text-muted-foreground hover:text-foreground"
        aria-label={`Drag to reorder ${label}`}
        {...attributes}
        {...listeners}
      >
        <HugeiconsIcon icon={DragDropVerticalIcon} className="h-5 w-5" />
      </button>
      <div className="flex-1 space-y-0.5">
        <Label htmlFor={phase} className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch id={phase} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
