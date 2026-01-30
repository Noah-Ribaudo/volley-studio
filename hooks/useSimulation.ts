"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { VolleyballSimEngine } from "@/lib/sim/engine";
import type { PlayerState, RallyPhase } from "@/lib/sim/types";
import type { ContactRecord } from "@/lib/sim/fsm";
import type { PositionCoordinates, Role, Rotation } from "@/lib/types";
import { ROLES } from "@/lib/types";

export interface SimulationState {
  // Positions
  playerPositions: PositionCoordinates;
  awayPlayerPositions: PositionCoordinates;

  // Ball
  ballPosition: { x: number; y: number };
  ballHeight: number;
  recentContact: boolean;

  // Game state
  phase: RallyPhase;
  rotation: Rotation;
  homeScore: number;
  awayScore: number;

  // Rally end info
  rallyEndReason: string | null;
  rallyWinner: "HOME" | "AWAY" | null;
  lastContact: ContactRecord | null;
  possessionChain: ContactRecord[];

  // Engine ready state
  isReady: boolean;
}

export interface SimulationControls {
  serve: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  setSpectateMode: (enabled: boolean) => void;
  currentSpeed: number;
  isSpectating: boolean;
}

interface UseSimulationOptions {
  isRunning: boolean;
  showLibero: boolean;
  initialSpeed?: number;
  onError?: (error: Error) => void;
}

export function useSimulation(options: UseSimulationOptions): [SimulationState, SimulationControls] {
  const { isRunning, showLibero, initialSpeed = 0.5, onError } = options;

  // Refs for RAF loop
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);
  const engineRef = useRef<VolleyballSimEngine | null>(null);

  // State
  const [isMounted, setIsMounted] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(initialSpeed);
  const [isSpectating, setIsSpectating] = useState(false);

  // Simulation state
  const [state, setState] = useState<SimulationState>({
    playerPositions: {} as PositionCoordinates,
    awayPlayerPositions: {} as PositionCoordinates,
    ballPosition: { x: 0.5, y: 0.78 },
    ballHeight: 0,
    recentContact: false,
    phase: "PRE_SERVE",
    rotation: 1,
    homeScore: 0,
    awayScore: 0,
    rallyEndReason: null,
    rallyWinner: null,
    lastContact: null,
    possessionChain: [],
    isReady: false,
  });

  // Initialize engine on mount
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new VolleyballSimEngine();
      setIsMounted(true);
    }
  }, []);

  // Sync showLibero with engine
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !isMounted) return;
    engine.setUseLibero(showLibero);
  }, [isMounted, showLibero]);

  // Set up error handler
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !isMounted) return;

    engine.onError = (error: Error) => {
      console.error('Simulation error:', error);
      onError?.(error);
    };

    return () => {
      if (engine) {
        engine.onError = undefined;
      }
    };
  }, [isMounted, onError]);

  // Initialize positions from engine after mount
  useEffect(() => {
    const engine = engineRef.current;
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

    setState(prev => ({
      ...prev,
      playerPositions: homePos as PositionCoordinates,
      awayPlayerPositions: awayPos as PositionCoordinates,
      phase: engine.fsm.phase,
      rotation: engine.rotation,
      homeScore: engine.fsm.homeScore,
      awayScore: engine.fsm.awayScore,
      ballPosition: { ...engine.ball.position },
      isReady: true,
    }));
  }, [isMounted, showLibero]);

  // RAF loop
  useEffect(() => {
    if (!isMounted) return;

    const tick = (t: number) => {
      const engine = engineRef.current;
      if (!engine) return;

      const now = t / 1000;
      const last = lastRef.current ?? now;
      const delta = Math.min(0.05, Math.max(0, now - last));
      lastRef.current = now;

      const fixed = 1 / 60;
      accumulatorRef.current += isRunning ? delta * gameSpeed : 0;

      while (accumulatorRef.current >= fixed) {
        engine.step(fixed);
        accumulatorRef.current -= fixed;
      }

      // Update state from engine
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

      setState({
        playerPositions: homePos as PositionCoordinates,
        awayPlayerPositions: awayPos as PositionCoordinates,
        ballPosition: { ...engine.ball.position },
        ballHeight: engine.getBallHeight(),
        recentContact: engine.wasRecentContact(150),
        phase: engine.fsm.phase,
        rotation: engine.rotation as Rotation,
        homeScore: engine.fsm.homeScore,
        awayScore: engine.fsm.awayScore,
        rallyEndReason: engine.fsm.rallyEndReason,
        rallyWinner: engine.fsm.rallyWinner,
        lastContact: engine.fsm.lastContact,
        possessionChain: engine.fsm.possessionChain,
        isReady: true,
      });

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isMounted, isRunning, gameSpeed, showLibero]);

  // Controls
  const serve = useCallback(() => {
    const engine = engineRef.current;
    if (engine) {
      engine.serve();
    }
  }, []);

  const reset = useCallback(() => {
    const engine = engineRef.current;
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
    setIsSpectating(false);
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setGameSpeed(speed);
  }, []);

  const setSpectateMode = useCallback((enabled: boolean) => {
    const engine = engineRef.current;
    if (!engine) return;

    setIsSpectating(enabled);
    engine.setSpectateMode(enabled);
  }, []);

  const controls: SimulationControls = {
    serve,
    reset,
    setSpeed,
    setSpectateMode,
    currentSpeed: gameSpeed,
    isSpectating,
  };

  return [state, controls];
}
