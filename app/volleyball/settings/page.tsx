'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useAppStore } from '@/store/useAppStore'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ROLES, ROLE_INFO, RALLY_PHASE_INFO, RallyPhase } from '@/lib/types'
import { cn, getTextColorForOklch } from '@/lib/utils'
import ThemePicker from '@/components/ThemePicker'
import { SHADER_OPTIONS, type ShaderId } from '@/lib/shaders'
import dynamic from 'next/dynamic'

const DevThemeSection = process.env.NODE_ENV === 'development'
  ? dynamic(() => import('@/components/dev/DevThemeSection'), { ssr: false })
  : () => null

const DevLogoSection = process.env.NODE_ENV === 'development'
  ? dynamic(() => import('@/components/dev/DevLogoSection'), { ssr: false })
  : () => null
import SuggestionBox from '@/components/SuggestionBox'
import { DragDropVerticalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
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
    // Role highlight
    highlightedRole,
    setHighlightedRole,
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
    sidebarProfileInFooter,
    setSidebarProfileInFooter,
    // Background shader
    backgroundShader,
    setBackgroundShader,
    backgroundOpacity,
    setBackgroundOpacity,
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
                <p className="text-xs text-muted-foreground">Choose light, dark, or auto daylight mode</p>
              </div>
              <ThemePicker />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shader-select" className="text-sm font-medium">
                Background Shader
              </Label>
              <p className="text-xs text-muted-foreground">
                Pick the ambient background effect used on wide screens
              </p>
              <Select
                value={backgroundShader}
                onValueChange={(value) => setBackgroundShader(value as ShaderId)}
              >
                <SelectTrigger id="shader-select" className="mt-2">
                  <SelectValue placeholder="Select shader" />
                </SelectTrigger>
                <SelectContent>
                  {SHADER_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      <span className="flex items-center justify-between w-full gap-3">
                        <span>{option.label}</span>
                        {option.cost > 0 && (
                          <span className={cn(
                            'text-[10px] tabular-nums shrink-0',
                            option.cost <= 3 ? 'text-muted-foreground' :
                            option.cost <= 5 ? 'text-yellow-500' :
                            'text-orange-500'
                          )}>
                            {option.cost}/10
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Shader Visibility</Label>
                <span className="text-xs text-muted-foreground tabular-nums">{100 - backgroundOpacity}%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                How much the shader shows through the content area
              </p>
              <Slider
                value={[100 - backgroundOpacity]}
                onValueChange={([v]) => setBackgroundOpacity(100 - v)}
                min={0}
                max={50}
                step={1}
                className="mt-2"
              />
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

        {/* Role Highlights */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Highlight Role</CardTitle>
            <CardDescription>Focus on a specific position across rotations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {ROLES.map(role => {
                const info = ROLE_INFO[role]
                const isSelected = highlightedRole === role
                return (
                  <Button
                    key={role}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHighlightedRole(isSelected ? null : role)}
                    className={cn(
                      "h-10 px-4 transition-all border-2 font-bold",
                      isSelected
                        ? "shadow-lg border-primary/60 ring-2 ring-primary/40"
                        : "border-transparent opacity-80 hover:opacity-100"
                    )}
                    style={{
                      backgroundColor: isSelected ? info.color : undefined,
                      color: isSelected ? getTextColorForOklch(info.color) : info.color,
                      borderColor: isSelected ? info.color : undefined,
                    }}
                  >
                    {role}
                  </Button>
                )
              })}
            </div>
            {highlightedRole && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHighlightedRole(null)}
                className="mt-3 text-xs text-muted-foreground"
              >
                Clear highlight
              </Button>
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
