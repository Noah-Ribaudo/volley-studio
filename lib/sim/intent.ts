// Intent Layer - Represents proposed actions before they are committed
// Intents are the output of the Think phase and input to the Commit phase

import type { GoalType, PlayerId, Vec2 } from "@/lib/sim/types";

/**
 * Types of actions that can be proposed as intents
 */
export type IntentAction =
  | { type: "MOVE_TO"; target: Vec2 }
  | { type: "REQUEST_GOAL"; goal: GoalType }
  | { type: "BALL_CONTACT"; contactType: "pass" | "set" | "attack" | "serve" }
  | { type: "STAY_IN_PLACE" };

/**
 * Source of the intent - distinguishes AI decisions from human edits
 */
export type IntentSource = "AI" | "HUMAN";

/**
 * An Intent represents a proposed action by an actor (player or system).
 * Intents are generated during the Think phase and validated/applied during Commit.
 */
export type Intent = {
  /** Unique identifier for this intent */
  id: string;
  /** The player proposing this action */
  actor: PlayerId;
  /** The action being proposed */
  action: IntentAction;
  /** Confidence score 0-1, used for ranking alternatives */
  confidence: number;
  /** Human-readable explanation of why this action was chosen */
  reason: string;
  /** Whether this intent came from AI or human input */
  source: IntentSource;
  /** Optional priority for conflict resolution (lower = higher priority) */
  priority?: number;
};

/**
 * Create a unique intent ID
 */
export const createIntentId = (): string => {
  return `intent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

/**
 * Create a new Intent with default values
 */
export const createIntent = (params: {
  actor: PlayerId;
  action: IntentAction;
  confidence?: number;
  reason?: string;
  source?: IntentSource;
  priority?: number;
}): Intent => {
  return {
    id: createIntentId(),
    actor: params.actor,
    action: params.action,
    confidence: params.confidence ?? 1.0,
    reason: params.reason ?? "",
    source: params.source ?? "AI",
    priority: params.priority,
  };
};

/**
 * Create a move intent
 */
export const createMoveIntent = (
  actor: PlayerId,
  target: Vec2,
  reason: string,
  source: IntentSource = "AI",
  confidence: number = 1.0
): Intent => {
  return createIntent({
    actor,
    action: { type: "MOVE_TO", target },
    confidence,
    reason,
    source,
  });
};

/**
 * Create a goal request intent
 */
export const createGoalIntent = (
  actor: PlayerId,
  goal: GoalType,
  reason: string,
  source: IntentSource = "AI",
  confidence: number = 1.0
): Intent => {
  return createIntent({
    actor,
    action: { type: "REQUEST_GOAL", goal },
    confidence,
    reason,
    source,
  });
};

/**
 * Create a ball contact intent
 */
export const createBallContactIntent = (
  actor: PlayerId,
  contactType: "pass" | "set" | "attack" | "serve",
  reason: string,
  source: IntentSource = "AI",
  confidence: number = 1.0
): Intent => {
  return createIntent({
    actor,
    action: { type: "BALL_CONTACT", contactType },
    confidence,
    reason,
    source,
  });
};

/**
 * Create a stay-in-place intent
 */
export const createStayIntent = (
  actor: PlayerId,
  reason: string,
  source: IntentSource = "AI"
): Intent => {
  return createIntent({
    actor,
    action: { type: "STAY_IN_PLACE" },
    confidence: 1.0,
    reason,
    source,
  });
};

/**
 * Sort intents by confidence (highest first)
 */
export const sortIntentsByConfidence = (intents: Intent[]): Intent[] => {
  return [...intents].sort((a, b) => b.confidence - a.confidence);
};

/**
 * Sort intents by priority (lowest = highest priority)
 */
export const sortIntentsByPriority = (intents: Intent[]): Intent[] => {
  return [...intents].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
};

/**
 * Filter intents by actor
 */
export const getIntentsForActor = (
  intents: Intent[],
  actor: PlayerId
): Intent[] => {
  return intents.filter((i) => i.actor === actor);
};

/**
 * Filter intents by source
 */
export const getIntentsBySource = (
  intents: Intent[],
  source: IntentSource
): Intent[] => {
  return intents.filter((i) => i.source === source);
};

/**
 * Get the highest confidence intent for an actor
 */
export const getBestIntentForActor = (
  intents: Intent[],
  actor: PlayerId
): Intent | null => {
  const actorIntents = getIntentsForActor(intents, actor);
  if (actorIntents.length === 0) return null;
  return sortIntentsByConfidence(actorIntents)[0];
};

/**
 * Merge human intents over AI intents (human always wins for same actor)
 */
export const mergeIntents = (
  aiIntents: Intent[],
  humanIntents: Intent[]
): Intent[] => {
  const humanActors = new Set(humanIntents.map((i) => i.actor));
  const filteredAI = aiIntents.filter((i) => !humanActors.has(i.actor));
  return [...filteredAI, ...humanIntents];
};

/**
 * Check if an intent is a goal request
 */
export const isGoalIntent = (
  intent: Intent
): intent is Intent & { action: { type: "REQUEST_GOAL"; goal: GoalType } } => {
  return intent.action.type === "REQUEST_GOAL";
};

/**
 * Check if an intent is a move intent
 */
export const isMoveIntent = (
  intent: Intent
): intent is Intent & { action: { type: "MOVE_TO"; target: Vec2 } } => {
  return intent.action.type === "MOVE_TO";
};

