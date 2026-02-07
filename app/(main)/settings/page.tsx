'use client'

import { useAppStore } from '@/store/useAppStore'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RALLY_PHASE_INFO, RallyPhase } from '@/lib/types'
import type { LearningPanelPosition } from '@/lib/learning/types'
import { cn } from '@/lib/utils'
import ThemePicker from '@/components/ThemePicker'
import { DragDropVerticalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import dynamic from 'next/dynamic'

const DevThemeSection = process.env.NODE_ENV === 'development'
  ? dynamic(() => import('@/components/dev/DevThemeSection'), { ssr: false })
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
    fullStatusLabels,
    setFullStatusLabels,
    showLearnTab,
    setShowLearnTab,
    // Phase visibility and order
    visiblePhases,
    togglePhaseVisibility,
    phaseOrder,
    setPhaseOrder,
    // Team (for conditional UI)
    currentTeam,
    // Learning
    learningPanelPosition,
    setLearningPanelPosition,
    // Court view
    awayTeamHidePercent,
    setAwayTeamHidePercent,
    // Debug
    debugHitboxes,
    setDebugHitboxes,
  } = useAppStore()

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-6 pb-32 max-w-2xl space-y-6">
        {process.env.NODE_ENV === 'development' && <DevThemeSection />}

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
                <p className="text-xs text-muted-foreground">Choose light or dark</p>
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
              id="full-status-labels"
              label="Full Status Labels"
              description="Show full words (Pass, Block, etc.) instead of single letters"
              checked={fullStatusLabels}
              onCheckedChange={setFullStatusLabels}
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
            <SettingsToggle
              id="show-learn-tab"
              label="Show Learn Tab"
              description="Show the Learn tab in the bottom navigation"
              checked={showLearnTab}
              onCheckedChange={setShowLearnTab}
            />
            <SettingsToggle
              id="debug-hitboxes"
              label="Show Touch Targets"
              description="Display green overlay on interactive touch areas"
              checked={debugHitboxes}
              onCheckedChange={setDebugHitboxes}
            />
          </CardContent>
        </Card>

        {/* Whiteboard Phases */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Whiteboard Phases</CardTitle>
            <CardDescription>Drag to reorder, toggle to show/hide in the whiteboard cycle</CardDescription>
          </CardHeader>
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
        </Card>

        {/* Learning */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Learning Mode</CardTitle>
            <CardDescription>Configure how lessons are displayed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="panel-position" className="text-sm font-medium">
                Panel Position
              </Label>
              <p className="text-xs text-muted-foreground">
                Choose where the learning content appears relative to the court
              </p>
              <Select
                value={learningPanelPosition}
                onValueChange={(val) => setLearningPanelPosition(val as LearningPanelPosition)}
              >
                <SelectTrigger id="panel-position" className="mt-2">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="floating">Floating Card (top-left)</SelectItem>
                  <SelectItem value="bottom">Bottom Drawer</SelectItem>
                  <SelectItem value="side">Side Panel (left)</SelectItem>
                  <SelectItem value="inline">Inline (bottom bar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

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
