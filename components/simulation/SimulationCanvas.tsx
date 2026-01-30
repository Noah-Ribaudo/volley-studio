"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";

import { VolleyballSimEngine } from "@/lib/sim/engine";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/useAppStore";
import type { PlayerState, RallyPhase } from "@/lib/sim/types";
import type { Intent } from "@/lib/sim/intent";
import type { DecisionTrace } from "@/lib/sim/trace";
import ThoughtStream from "@/components/simulation/ThoughtStream";
import { VolleyballCourt } from "@/components/court/VolleyballCourt";
import type { PositionCoordinates, Role, Rotation } from "@/lib/types";
import { ROLES } from "@/lib/types";
import { generateRallyEndDescription } from "@/lib/sim/rallyEndReasons";

export default function SimulationCanvas() {
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);

  // Initialize engine only on client side to avoid hydration mismatches
  const engineRef = useRef<VolleyballSimEngine | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Initialize engine only after mount (client-side only)
    if (!engineRef.current) {
      engineRef.current = new VolleyballSimEngine();
      setIsMounted(true);
    }
  }, []);

  const engine = engineRef.current;

  const {
    showLibero,
    setShowLibero,
    playbackMode,
    setPlaybackMode,
    contextPlayer,
    setContextPlayer,
    tokenSize,
    setTokenSize,
  } = useAppStore();

  // Derive isRunning from store's playbackMode (unified state)
  const isRunning = playbackMode === 'live';
  const [isSpectating, setIsSpectating] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(0.5);
  const [phase, setPhase] = useState<RallyPhase>("PRE_SERVE");
  const [rotation, setRotation] = useState<Rotation>(1);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [thoughtsVersion, setThoughtsVersion] = useState(0);

  // Track last intents for explainability
  const [lastIntents, setLastIntents] = useState<Intent[]>([]);
  const [lastTraces, setLastTraces] = useState<DecisionTrace[]>([]);

  // Ball position state (needs to be in state to trigger re-renders)
  const [ballPosition, setBallPosition] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.78 });
  const [ballHeight, setBallHeight] = useState(0);
  const [recentContact, setRecentContact] = useState(false);

  const [playerPositions, setPlayerPositions] = useState<PositionCoordinates>({} as PositionCoordinates);
  const [awayPlayerPositions, setAwayPlayerPositions] = useState<PositionCoordinates>({} as PositionCoordinates);

  // Sync showLibero state with engine
  useEffect(() => {
    if (!engine || !isMounted) return;
    engine.setUseLibero(showLibero);
  }, [engine, isMounted, showLibero]);

  // Add error handler to engine
  useEffect(() => {
    if (!engine || !isMounted) return;

    engine.onError = (error: Error) => {
      console.error('Simulation error:', error);
      toast.error('Simulation encountered an error. Pausing simulation.');
      setPlaybackMode('paused');
    };

    return () => {
      if (engine) {
        engine.onError = undefined;
      }
    };
  }, [engine, isMounted]);

  // Initialize positions from engine after mount
  useEffect(() => {
    if (!engine || !isMounted) return;

    const homePos: Partial<PositionCoordinates> = {};
    const awayPos: Partial<PositionCoordinates> = {};
    for (const player of engine.players) {
      const role = player.role as Role;
      if (!ROLES.includes(role) || !player.active) continue;
      if (role === "L" && !showLibero) continue;

      if (player.team === "HOME") {
        homePos[role] = player.position;
      } else {
        awayPos[role] = player.position;
      }
    }
    setPlayerPositions(homePos as PositionCoordinates);
    setAwayPlayerPositions(awayPos as PositionCoordinates);
    setPhase(engine.fsm.phase);
    setRotation(engine.rotation);
    setHomeScore(engine.fsm.homeScore);
    setAwayScore(engine.fsm.awayScore);
    setBallPosition({ ...engine.ball.position });
  }, [engine, isMounted, showLibero]);

  useEffect(() => {
    if (!isMounted) return;

    const tick = (t: number) => {
      const currentEngine = engineRef.current;
      if (!currentEngine) return;

      const now = t / 1000;
      const last = lastRef.current ?? now;
      const delta = Math.min(0.05, Math.max(0, now - last));
      lastRef.current = now;

      const fixed = 1 / 60;
      accumulatorRef.current += isRunning ? delta * gameSpeed : 0;
      while (accumulatorRef.current >= fixed) {
        currentEngine.step(fixed);
        accumulatorRef.current -= fixed;
      }

      setPhase(currentEngine.fsm.phase);
      setRotation(currentEngine.rotation);
      setHomeScore(currentEngine.fsm.homeScore);
      setAwayScore(currentEngine.fsm.awayScore);
      setThoughtsVersion(currentEngine.thoughtsVersion);

      // Track intents and traces for explainability
      setLastIntents(currentEngine.getLastIntents());
      setLastTraces(currentEngine.getLastTraces());

      // Update player positions for HOME team
      const homePos: Partial<PositionCoordinates> = {};
      const awayPos: Partial<PositionCoordinates> = {};
      for (const player of currentEngine.players) {
        const role = player.role as Role;
        if (!ROLES.includes(role) || !player.active) continue;
        if (role === "L" && !showLibero) continue;

        if (player.team === "HOME") {
          homePos[role] = player.position;
        } else {
          awayPos[role] = player.position;
        }
      }
      setPlayerPositions(homePos as PositionCoordinates);
      setAwayPlayerPositions(awayPos as PositionCoordinates);

      // Update ball position and height
      setBallPosition({ ...currentEngine.ball.position });
      setBallHeight(currentEngine.getBallHeight());
      setRecentContact(currentEngine.wasRecentContact(150));

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [isMounted, isRunning, gameSpeed, showLibero]);

  const handlePlayerClick = useCallback((role: Role | null) => {
    if (!engine || !role) return;
    const player = engine.players.find(
      (p) => p.team === "HOME" && p.role === role && p.active
    );
    if (player) {
      setSelectedPlayerId(player.id);
    }
  }, [engine]);

  const selectedPlayer = selectedPlayerId && engine
    ? engine.players.find((p) => p.id === selectedPlayerId) ?? null
    : null;

  const selectedLabel = selectedPlayer
    ? `${selectedPlayer.team === "HOME" ? "Our" : "Their"} ${selectedPlayer.role}`
    : null;

  const selectedThoughts = useMemo(() => {
    if (!selectedPlayerId || !engine) return [];
    return engine.getThoughtsForPlayer(selectedPlayerId);
  }, [engine, selectedPlayerId, thoughtsVersion]);

  // Get the selected player's latest trace for enhanced explainability
  const selectedTrace = useMemo(() => {
    if (!selectedPlayerId) return null;
    return lastTraces.find((t) => t.playerId === selectedPlayerId) ?? null;
  }, [selectedPlayerId, lastTraces]);

  const SPEED_STEPS = [0.25, 0.5, 1, 2, 4];
  const currentSpeedIndex = SPEED_STEPS.indexOf(gameSpeed);

  const handleIncreaseSpeed = useCallback(() => {
    const nextIndex = Math.min(currentSpeedIndex + 1, SPEED_STEPS.length - 1);
    setGameSpeed(SPEED_STEPS[nextIndex]);
  }, [currentSpeedIndex]);

  const handleDecreaseSpeed = useCallback(() => {
    const nextIndex = Math.max(currentSpeedIndex - 1, 0);
    setGameSpeed(SPEED_STEPS[nextIndex]);
  }, [currentSpeedIndex]);

  const handleServe = useCallback(() => {
    if (!engine) return;
    engine.serve();
  }, [engine]);

  const handleReset = useCallback(() => {
    if (!engine) return;
    engine.fsm.homeScore = 0;
    engine.fsm.awayScore = 0;
    engine.homeRotation = 1;
    engine.awayRotation = 1;
    engine.rotation = 1;
    engine.setSpectateMode(false);
    engine.resetPlayers();
    engine.resetRally("HOME");
    lastRef.current = null;
    accumulatorRef.current = 0;
    setHomeScore(0);
    setAwayScore(0);
    setIsSpectating(false);
    setPlaybackMode('paused');
  }, [engine, setPlaybackMode]);

  const handleToggleRunning = useCallback(() => {
    setPlaybackMode(isRunning ? 'paused' : 'live');
  }, [isRunning, setPlaybackMode]);

  const handleToggleSpectate = useCallback(() => {
    if (!engine) return;
    const newSpectating = !isSpectating;
    setIsSpectating(newSpectating);
    engine.setSpectateMode(newSpectating);

    // Auto-start running when entering spectate mode
    if (newSpectating && !isRunning) {
      setPlaybackMode('live');
    }
  }, [engine, isSpectating, isRunning, setPlaybackMode]);

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            Us
          </span>
          <span className="text-sm font-bold tabular-nums min-w-[4.5rem] text-center">
            {homeScore} - {awayScore}
          </span>
          <span className="text-xs font-semibold text-muted-foreground">
            Them
          </span>
          <span className="text-xs font-semibold text-muted-foreground ml-3">
            Phase
          </span>
          <span className="text-sm font-bold min-w-[10rem]">{phase}</span>
          <span className="text-xs font-semibold text-muted-foreground ml-3">
            Rotation
          </span>
          <span className="text-sm font-bold tabular-nums min-w-[1rem] text-center">{rotation}</span>
          <span className="text-xs font-semibold text-muted-foreground ml-3">
            Speed
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-8 w-8 sm:h-6 sm:w-6"
              onClick={handleDecreaseSpeed}
              disabled={currentSpeedIndex === 0}
              aria-label="Decrease game speed"
            >
              <HugeiconsIcon icon={ArrowDown01Icon} className="h-3 w-3" />
            </Button>
            <span className="text-sm font-bold tabular-nums min-w-[3rem] text-center">
              {gameSpeed}×
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-8 w-8 sm:h-6 sm:w-6"
              onClick={handleIncreaseSpeed}
              disabled={currentSpeedIndex === SPEED_STEPS.length - 1}
              aria-label="Increase game speed"
            >
              <HugeiconsIcon icon={ArrowUp01Icon} className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isSpectating ? "default" : "outline"}
            size="sm"
            onClick={handleToggleSpectate}
            aria-label={isSpectating ? "Exit spectate mode" : "Enter spectate mode"}
            className={isSpectating ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {isSpectating ? "Spectating" : "Spectate"}
          </Button>
          <Button
            variant={isRunning ? "secondary" : "default"}
            size="sm"
            className="min-w-[4.5rem]"
            onClick={handleToggleRunning}
            aria-label={isRunning ? "Pause simulation" : "Play simulation"}
            disabled={isSpectating}
          >
            {isRunning ? "Pause" : "Play"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleServe}
            aria-label="Start serve"
            disabled={isSpectating}
          >
            Serve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            aria-label="Reset simulation"
          >
            Reset
          </Button>
          <div className="flex items-center gap-2 ml-2 px-2 border-l">
            <Switch
              id="show-libero"
              checked={showLibero}
              onCheckedChange={setShowLibero}
            />
            <Label
              htmlFor="show-libero"
              className="text-xs font-semibold cursor-pointer"
            >
              Libero
            </Label>
          </div>
          <div className="flex items-center gap-2 ml-2 px-2 border-l">
            <Switch
              id="small-tokens"
              checked={tokenSize === 'small'}
              onCheckedChange={(checked) => setTokenSize(checked ? 'small' : 'big')}
            />
            <Label
              htmlFor="small-tokens"
              className="text-xs font-semibold cursor-pointer"
            >
              Small
            </Label>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div
          className={cn(
            "w-full rounded-lg border bg-card/40 overflow-hidden relative"
          )}
        >
          <VolleyballCourt
            mode="simulation"
            positions={playerPositions}
            awayPositions={awayPlayerPositions}
            rotation={rotation}
            showZones={false}
            editable={false}
            ballPosition={ballPosition}
            ballHeight={ballHeight}
            ballContactFlash={recentContact}
            fsmPhase={phase}
            onRoleClick={handlePlayerClick}
            contextPlayer={contextPlayer}
            onContextPlayerChange={setContextPlayer}
            showLibero={showLibero}
            tokenSize={tokenSize}
            animationMode="raf"
            animationConfig={{
              durationMs: 350,
              easingFn: "cubic",
            }}
          />
        </div>
        <div className="flex flex-col gap-3">
          <ThoughtStream
            title="Player thoughts"
            selectedLabel={selectedLabel}
            messages={selectedThoughts}
          />
          {/* Show intent information when a player is selected */}
          {selectedTrace && (
            <div className="p-3 rounded-lg border bg-card/60">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                Last Decision
              </h4>
              {selectedTrace.selectedIntent && (
                <div className="text-sm">
                  <span className="font-medium">
                    {selectedTrace.selectedIntent.action.type === "REQUEST_GOAL"
                      ? selectedTrace.selectedIntent.action.goal
                      : selectedTrace.selectedIntent.action.type}
                  </span>
                  <p className="text-muted-foreground text-xs mt-1">
                    {selectedTrace.selectedIntent.reason}
                  </p>
                </div>
              )}
              {selectedTrace.alternativeIntents.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {selectedTrace.alternativeIntents.length} alternative(s) considered
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rally end modal - rendered outside overflow:hidden containers for proper fixed positioning */}
      {phase === "BALL_DEAD" && engine && engine.fsm.rallyEndReason && engine.fsm.rallyWinner && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {(() => {
            const description = generateRallyEndDescription({
              reason: engine.fsm.rallyEndReason,
              winner: engine.fsm.rallyWinner,
              lastContact: engine.fsm.lastContact,
              possessionChain: engine.fsm.possessionChain,
            });

            return (
              <div className="mx-2 max-w-2xl">
                <div className="bg-card/95 backdrop-blur-md border-2 border-primary rounded-lg px-4 sm:px-6 py-3 sm:py-4 shadow-lg">
                  <div className="text-center">
                    <div className="text-lg sm:text-2xl font-bold mb-1">{description.title}</div>
                    <div className="text-sm sm:text-base text-muted-foreground mb-2 sm:mb-3">
                      {description.description}
                    </div>
                    <div className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">
                      Us {homeScore} - {awayScore} Them
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center w-full sm:w-auto">
                      <Button
                        size="default"
                        className="w-full sm:w-auto"
                        variant="default"
                        onClick={() => {
                          if (engine) engine.serve();
                        }}
                      >
                        Next Rally
                      </Button>
                      <Button
                        size="default"
                        className="w-full sm:w-auto"
                        variant="outline"
                        onClick={handleReset}
                      >
                        Replay Point
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
