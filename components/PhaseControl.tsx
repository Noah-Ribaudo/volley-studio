"use client";

import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RALLY_PHASES, RALLY_PHASE_INFO, RallyPhase } from "@/lib/types";
import { PHASE_COLORS } from "@/lib/phaseIcons";

interface PhaseControlProps {
  /** Current phase to display */
  currentPhase?: RallyPhase;
  /** Whether the control is in manual (interactive) or auto (display-only) mode */
  mode?: "manual" | "auto";
  /** Callback when phase changes (only in manual mode) */
  onPhaseChange?: (phase: RallyPhase) => void;
  /** Additional class names */
  className?: string;
}

/**
 * PhaseControl - Unified phase display/selector for whiteboard and simulation modes.
 *
 * In manual mode (paused/whiteboard): Shows a dropdown to select phases
 * In auto mode (live simulation): Shows current phase as display-only
 */
export function PhaseControl({
  currentPhase: propPhase,
  mode: propMode,
  onPhaseChange: propOnPhaseChange,
  className,
}: PhaseControlProps) {
  const {
    currentPhase: storePhase,
    setPhase,
    visiblePhases,
  } = useAppStore();

  // Use prop values or fall back to store
  const currentPhase = (propPhase ?? storePhase) as RallyPhase;
  const isManual = propMode === "manual" || propMode === undefined; // Always manual in whiteboard-only mode
  const onPhaseChange = propOnPhaseChange ?? ((phase: RallyPhase) => setPhase(phase));

  // Get phase info for display
  const phaseInfo = RALLY_PHASE_INFO[currentPhase];
  const phaseLabel = phaseInfo?.name ?? currentPhase;
  // Create short label by abbreviating (e.g., "Serve Receive" -> "S.Recv")
  const phaseShortLabel = phaseLabel.split(" ").map(w => w.slice(0, 4)).join(" ");

  // Filter to only visible phases
  const availablePhases = RALLY_PHASES.filter((p) => visiblePhases.has(p));

  if (isManual) {
    // Interactive dropdown mode
    return (
      <Select value={currentPhase} onValueChange={(v) => onPhaseChange(v as RallyPhase)}>
        <SelectTrigger className={cn("w-[180px]", className)}>
          <SelectValue placeholder="Select phase">
            <PhaseDisplay phase={currentPhase} showLabel />
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availablePhases.map((phase) => (
            <SelectItem key={phase} value={phase}>
              <PhaseDisplay phase={phase} showLabel />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Display-only mode with visual indicator
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-md",
        "bg-muted/50 border border-border",
        className
      )}
    >
      <PhaseIndicator phase={currentPhase} />
      <span className="text-sm font-medium">{phaseShortLabel}</span>
    </div>
  );
}

interface PhaseDisplayProps {
  phase: RallyPhase;
  showLabel?: boolean;
}

function PhaseDisplay({ phase, showLabel = true }: PhaseDisplayProps) {
  const phaseInfo = RALLY_PHASE_INFO[phase];
  const name = phaseInfo?.name ?? phase;
  const label = showLabel ? name.split(" ").map(w => w.slice(0, 4)).join(" ") : "";

  return (
    <div className="flex items-center gap-2">
      <PhaseIndicator phase={phase} />
      {label && <span>{label}</span>}
    </div>
  );
}

interface PhaseIndicatorProps {
  phase: RallyPhase;
}

function PhaseIndicator({ phase }: PhaseIndicatorProps) {
  // Use shared phase colors
  const colorClass = PHASE_COLORS[phase] || "bg-gray-400";
  return <span className={cn("w-2 h-2 rounded-full", colorClass)} />;
}

export default PhaseControl;
