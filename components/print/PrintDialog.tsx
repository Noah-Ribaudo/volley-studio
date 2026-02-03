"use client";

import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PrintableRotationCard, PrintConfig, DEFAULT_PRINT_CONFIG } from "./PrintableRotationCard";
import {
  Role,
  ROLES,
  PositionCoordinates,
  RosterPlayer,
  PositionAssignments,
  Rotation,
  ROTATIONS,
  RallyPhase,
  Phase,
  DEFAULT_VISIBLE_PHASES,
  isRallyPhase,
} from "@/lib/types";
import { Printer, FileText, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRotation: Rotation;
  currentPhase: Phase;
  getPositionsForRotation: (rotation: Rotation, phase: Phase) => PositionCoordinates;
  roster?: RosterPlayer[];
  assignments?: PositionAssignments;
  baseOrder?: Role[];
  teamName?: string;
  visiblePhases?: RallyPhase[];
}

type PrintMode = "pretty" | "plain";
type PrintScope = "current" | "all-rotations" | "all-phases";

export function PrintDialog({
  open,
  onOpenChange,
  currentRotation,
  currentPhase,
  getPositionsForRotation,
  roster,
  assignments,
  baseOrder,
  teamName,
  visiblePhases = DEFAULT_VISIBLE_PHASES,
}: PrintDialogProps) {
  const [mode, setMode] = useState<PrintMode>("pretty");
  const [scope, setScope] = useState<PrintScope>("current");
  const [config, setConfig] = useState<PrintConfig>({
    ...DEFAULT_PRINT_CONFIG,
    showZoneNumbers: false, // Will be set based on mode
  });
  const printRef = useRef<HTMLDivElement>(null);

  // Update zone numbers default when mode changes
  useEffect(() => {
    setConfig(prev => ({
      ...prev,
      showZoneNumbers: mode === "plain",
    }));
  }, [mode]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: teamName ? `${teamName} - Rotations` : "Volleyball Rotations",
  });

  const renderContent = () => {
    if (scope === "current") {
      return (
        <PrintableRotationCard
          rotation={currentRotation}
          phase={currentPhase}
          positions={getPositionsForRotation(currentRotation, currentPhase)}
          roster={roster}
          assignments={assignments}
          baseOrder={baseOrder}
          teamName={teamName}
          mode={mode}
          config={config}
        />
      );
    }

    if (scope === "all-rotations") {
      return (
        <div className="grid grid-cols-2 gap-4 print:grid-cols-3 print:gap-2">
          {ROTATIONS.map((rotation) => (
            <PrintableRotationCard
              key={rotation}
              rotation={rotation}
              phase={currentPhase}
              positions={getPositionsForRotation(rotation, currentPhase)}
              roster={roster}
              assignments={assignments}
              baseOrder={baseOrder}
              teamName={teamName}
              mode={mode}
              showPhase={false}
              config={config}
            />
          ))}
        </div>
      );
    }

    // all-phases
    return (
      <div className="space-y-6">
        {visiblePhases.map((phase) => (
          <div key={phase}>
            <h3 className="text-sm font-medium text-gray-700 mb-2 print:text-black">
              {phase.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
            </h3>
            <div className="grid grid-cols-2 gap-4 print:grid-cols-3 print:gap-2">
              {ROTATIONS.map((rotation) => (
                <PrintableRotationCard
                  key={`${rotation}-${phase}`}
                  rotation={rotation}
                  phase={phase}
                  positions={getPositionsForRotation(rotation, phase)}
                  roster={roster}
                  assignments={assignments}
                  baseOrder={baseOrder}
                  teamName={teamName}
                  mode={mode}
                  showPhase={false}
                  config={config}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Print Rotations
          </DialogTitle>
          <DialogDescription>
            Choose a style and what to print, then click Print.
          </DialogDescription>
        </DialogHeader>

        {/* Options */}
        <div className="flex flex-wrap gap-4 py-4 border-b">
          {/* Style selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Style</label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("pretty")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
                  mode === "pretty"
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <Palette className="w-4 h-4" />
                <span className="text-sm">Pretty</span>
              </button>
              <button
                onClick={() => setMode("plain")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
                  mode === "plain"
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm">Plain B&W</span>
              </button>
            </div>
          </div>

          {/* Scope selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">What to print</label>
            <div className="flex gap-2">
              <button
                onClick={() => setScope("current")}
                className={cn(
                  "px-3 py-2 rounded-lg border text-sm transition-colors",
                  scope === "current"
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                Current
              </button>
              <button
                onClick={() => setScope("all-rotations")}
                className={cn(
                  "px-3 py-2 rounded-lg border text-sm transition-colors",
                  scope === "all-rotations"
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                All 6 Rotations
              </button>
              <button
                onClick={() => setScope("all-phases")}
                className={cn(
                  "px-3 py-2 rounded-lg border text-sm transition-colors",
                  scope === "all-phases"
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                All Phases
              </button>
            </div>
          </div>
        </div>

        {/* Configuration toggles */}
        <div className="flex flex-wrap gap-4 py-3 border-b">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={config.showNumbersOnTokens}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, showNumbersOnTokens: checked }))}
            />
            <span className="text-gray-700">Numbers on tokens</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={config.showNamesOnCourt}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, showNamesOnCourt: checked }))}
            />
            <span className="text-gray-700">Names on court</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={config.showRosterLegend}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, showRosterLegend: checked }))}
            />
            <span className="text-gray-700">Roster legend</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={config.showZoneNumbers}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, showZoneNumbers: checked }))}
            />
            <span className="text-gray-700">Zone numbers</span>
          </label>
        </div>

        {/* Preview */}
        <div className="py-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
          <div
            ref={printRef}
            className={cn(
              "p-4 rounded-lg",
              mode === "pretty" ? "bg-gray-50" : "bg-white border border-gray-200"
            )}
          >
            {renderContent()}
          </div>
        </div>

        {/* Print button */}
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={() => handlePrint()}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
