"use client";

import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
// Note: Using native range input instead of Slider component
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PlaybackMode, VerbosityPreset } from "@/lib/sim/types";

interface DebugPanelProps {
  // Optional external state for simulation-specific controls
  gameSpeed?: number;
  onGameSpeedChange?: (speed: number) => void;
  tickCount?: number;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * DebugPanel - Unified debug controls for both whiteboard and simulation modes.
 * Sections are conditionally shown based on the current playback mode.
 */
export function DebugPanel({
  gameSpeed = 1,
  onGameSpeedChange,
  tickCount = 0,
  isOpen = false,
  onOpenChange,
}: DebugPanelProps) {
  const {
    playbackMode,
    showLibero,
    setShowLibero,
    thoughtVerbosity,
    setThoughtVerbosity,
  } = useAppStore();

  const isLiveMode = playbackMode === "live";
  const isPausedMode = playbackMode === "paused";
  const isReplayMode = playbackMode === "replay" || playbackMode === "replay_paused";

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-[80px]">
          Debug
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ml-1"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Debug Controls</SheetTitle>
          <SheetDescription>
            Configure visualization and simulation options
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Display Section - Always visible */}
          <DebugSection title="Display">
            <DebugToggle
              id="show-libero"
              label="Show Libero"
              description="Display libero substitutions"
              checked={showLibero}
              onCheckedChange={setShowLibero}
            />
          </DebugSection>

          {/* Simulation Section - Only in live/paused modes */}
          {(isLiveMode || isPausedMode) && (
            <DebugSection title="Simulation">
              {onGameSpeedChange && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="game-speed" className="text-sm">
                      Game Speed
                    </Label>
                    <span className="text-xs text-muted-foreground font-mono">
                      {gameSpeed.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    id="game-speed"
                    min={0.25}
                    max={3}
                    step={0.25}
                    value={gameSpeed}
                    onChange={(e) => onGameSpeedChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}
              {tickCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tick Count</span>
                  <span className="font-mono">{tickCount}</span>
                </div>
              )}
            </DebugSection>
          )}

          {/* AI Section - Always visible but more relevant in simulation */}
          <DebugSection title="AI & Thoughts">
            <div className="space-y-2">
              <Label htmlFor="verbosity" className="text-sm">
                Thought Verbosity
              </Label>
              <Select
                value={thoughtVerbosity}
                onValueChange={(val) => setThoughtVerbosity(val as VerbosityPreset)}
              >
                <SelectTrigger id="verbosity">
                  <SelectValue placeholder="Select verbosity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner (Essential only)</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="expert">Expert (Detailed)</SelectItem>
                  <SelectItem value="debug">Debug (All)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DebugSection>

          {/* Replay Section - Only in replay modes */}
          {isReplayMode && (
            <DebugSection title="Replay">
              <p className="text-sm text-muted-foreground">
                Viewing historical rally. Use the timeline to navigate or click LIVE to return.
              </p>
            </DebugSection>
          )}

          {/* Mode Info */}
          <DebugSection title="Current Mode">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-3 h-3 rounded-full",
                  isLiveMode && "bg-green-500 animate-pulse",
                  isPausedMode && "bg-yellow-500",
                  isReplayMode && "bg-blue-500"
                )}
              />
              <span className="text-sm capitalize">
                {playbackMode.replace("_", " ")}
              </span>
            </div>
          </DebugSection>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface DebugSectionProps {
  title: string;
  children: React.ReactNode;
}

function DebugSection({ title, children }: DebugSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-4 pl-1">{children}</div>
    </div>
  );
}

interface DebugToggleProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function DebugToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: DebugToggleProps) {
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
  );
}

export default DebugPanel;
