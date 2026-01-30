"use client";

import SimulationCanvas from "@/components/simulation/SimulationCanvas";

export default function FullGamePage() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b bg-slate-900/50">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-slate-100">Full Game</h1>
          <p className="text-sm text-slate-400">
            Goal-driven volleyball AI simulation
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-4">
          <SimulationCanvas />
          <p className="text-xs text-muted-foreground">
            This is an early tech slice: BTs request goals, movement resolves them, and the rally FSM advances on events.
          </p>
        </div>
      </div>
    </div>
  );
}
