"use client";

import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Rally } from "@/lib/sim/types";

/**
 * RallyTimeline - Shows a horizontal timeline of rallies in the current game.
 * Users can click on past rallies to replay them, or click "LIVE" to return to current state.
 */
export function RallyTimeline() {
  const {
    game,
    replayRallyIndex,
    playbackMode,
    selectReplayRally,
    returnToLive,
  } = useAppStore();

  if (!game) return null;
  if (game.rallies.length === 0) return null;

  const isReplaying = replayRallyIndex !== null;
  const isLive = playbackMode === "live" || playbackMode === "paused";

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 overflow-x-auto py-2 px-1">
        {/* Rally markers */}
        {game.rallies.map((rally, index) => (
          <RallyMarker
            key={rally.id}
            rally={rally}
            index={index}
            isSelected={replayRallyIndex === index}
            isCurrentRally={index === game.currentRallyIndex && !isReplaying}
            onClick={() => selectReplayRally(index)}
          />
        ))}

        {/* LIVE button - return to current state */}
        {isReplaying && (
          <Button
            variant="default"
            size="sm"
            className="ml-2 bg-red-500 hover:bg-red-600 text-white animate-pulse"
            onClick={returnToLive}
          >
            LIVE
          </Button>
        )}

        {/* Score display */}
        <div className="ml-auto flex items-center gap-2 text-sm font-mono">
          <span className="text-muted-foreground">Us</span>
          <span className="font-bold">{game.homeScore}</span>
          <span className="text-muted-foreground">-</span>
          <span className="font-bold">{game.awayScore}</span>
          <span className="text-muted-foreground">Them</span>
        </div>
      </div>
    </TooltipProvider>
  );
}

interface RallyMarkerProps {
  rally: Rally;
  index: number;
  isSelected: boolean;
  isCurrentRally: boolean;
  onClick: () => void;
}

function RallyMarker({ rally, index, isSelected, isCurrentRally, onClick }: RallyMarkerProps) {
  const isComplete = rally.endTick !== null;
  const homeWon = rally.winner === "HOME";
  const awayWon = rally.winner === "AWAY";

  // Determine marker style based on state
  const getMarkerStyle = () => {
    if (isSelected) {
      return "ring-2 ring-primary ring-offset-2";
    }
    if (isCurrentRally) {
      return "ring-2 ring-orange-500 ring-offset-1";
    }
    return "";
  };

  const getMarkerColor = () => {
    if (!isComplete) {
      return "bg-orange-500"; // In progress
    }
    if (homeWon) {
      return "bg-green-500"; // We won
    }
    if (awayWon) {
      return "bg-blue-500"; // They won
    }
    return "bg-gray-400"; // Unknown/error
  };

  const getTooltipContent = () => {
    if (!isComplete) {
      return `Rally ${rally.index} - In Progress`;
    }
    const winnerText = homeWon ? "We won" : "They won";
    const reasonText = rally.reason ? ` (${rally.reason})` : "";
    return `Rally ${rally.index} - ${winnerText}${reasonText}`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all",
            "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
            getMarkerColor(),
            getMarkerStyle()
          )}
        >
          {rally.index}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getTooltipContent()}</p>
        <p className="text-xs text-muted-foreground">
          {rally.serving === "HOME" ? "We served" : "They served"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export default RallyTimeline;
