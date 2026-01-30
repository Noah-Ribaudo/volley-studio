// Decision Trace - Provides explainability for AI decision making
// Traces record the BT evaluation path and alternative options considered

import type { PlayerId, RallyPhase } from "@/lib/sim/types";
import type { BTStatus } from "@/lib/sim/bt";
import type { Intent } from "@/lib/sim/intent";

/**
 * Types of BT nodes that can be traced
 */
export type BTNodeType = "Selector" | "Sequence" | "Condition" | "Action" | "Decorator";

/**
 * Trace of a single BT node evaluation
 */
export type BTNodeTrace = {
  /** Type of the BT node */
  nodeType: BTNodeType;
  /** Optional human-readable name for the node */
  nodeName?: string;
  /** Short description for tooltips */
  description?: string;
  /** Result status of the node evaluation */
  status: BTStatus;
  /** Optional explanation or note about the evaluation */
  note?: string;
  /** Score or weight if applicable */
  score?: number;
  /** Child node traces (for composite nodes) */
  children?: BTNodeTrace[];
  /** Time taken to evaluate this node (ms) */
  durationMs?: number;
};

/**
 * Complete decision trace for a single player in a single tick
 */
export type DecisionTrace = {
  /** Player who made the decision */
  playerId: PlayerId;
  /** Tick number when the decision was made */
  tick: number;
  /** Timestamp in simulation time */
  timeMs: number;
  /** The rally phase during which the decision was made */
  phase: RallyPhase;
  /** Root of the BT evaluation trace */
  rootTrace: BTNodeTrace;
  /** The intent that was selected */
  selectedIntent: Intent | null;
  /** Alternative intents that were considered but not selected */
  alternativeIntents: Intent[];
  /** Total time to evaluate the decision (ms) */
  totalDurationMs?: number;
};

/**
 * Create a new BTNodeTrace
 */
export const createNodeTrace = (params: {
  nodeType: BTNodeType;
  nodeName?: string;
  status: BTStatus;
  note?: string;
  score?: number;
  children?: BTNodeTrace[];
}): BTNodeTrace => {
  return {
    nodeType: params.nodeType,
    nodeName: params.nodeName,
    status: params.status,
    note: params.note,
    score: params.score,
    children: params.children,
  };
};

/**
 * Create a Selector node trace
 */
export const createSelectorTrace = (
  name: string | undefined,
  status: BTStatus,
  children: BTNodeTrace[],
  note?: string
): BTNodeTrace => {
  return createNodeTrace({
    nodeType: "Selector",
    nodeName: name,
    status,
    note,
    children,
  });
};

/**
 * Create a Sequence node trace
 */
export const createSequenceTrace = (
  name: string | undefined,
  status: BTStatus,
  children: BTNodeTrace[],
  note?: string
): BTNodeTrace => {
  return createNodeTrace({
    nodeType: "Sequence",
    nodeName: name,
    status,
    note,
    children,
  });
};

/**
 * Create a Condition node trace
 */
export const createConditionTrace = (
  name: string | undefined,
  status: BTStatus,
  note?: string
): BTNodeTrace => {
  return createNodeTrace({
    nodeType: "Condition",
    nodeName: name,
    status,
    note,
  });
};

/**
 * Create an Action node trace
 */
export const createActionTrace = (
  name: string | undefined,
  status: BTStatus,
  note?: string,
  score?: number
): BTNodeTrace => {
  return createNodeTrace({
    nodeType: "Action",
    nodeName: name,
    status,
    note,
    score,
  });
};

/**
 * Create a complete DecisionTrace
 */
export const createDecisionTrace = (params: {
  playerId: PlayerId;
  tick: number;
  timeMs: number;
  phase: RallyPhase;
  rootTrace: BTNodeTrace;
  selectedIntent: Intent | null;
  alternativeIntents?: Intent[];
  totalDurationMs?: number;
}): DecisionTrace => {
  return {
    playerId: params.playerId,
    tick: params.tick,
    timeMs: params.timeMs,
    phase: params.phase,
    rootTrace: params.rootTrace,
    selectedIntent: params.selectedIntent,
    alternativeIntents: params.alternativeIntents ?? [],
    totalDurationMs: params.totalDurationMs,
  };
};

/**
 * Flatten a trace tree into an array of nodes (depth-first)
 */
export const flattenTrace = (trace: BTNodeTrace): BTNodeTrace[] => {
  const result: BTNodeTrace[] = [trace];
  if (trace.children) {
    for (const child of trace.children) {
      result.push(...flattenTrace(child));
    }
  }
  return result;
};

/**
 * Find all nodes of a specific type in a trace
 */
export const findNodesByType = (
  trace: BTNodeTrace,
  nodeType: BTNodeType
): BTNodeTrace[] => {
  return flattenTrace(trace).filter((n) => n.nodeType === nodeType);
};

/**
 * Find all failed conditions in a trace
 */
export const findFailedConditions = (trace: BTNodeTrace): BTNodeTrace[] => {
  return flattenTrace(trace).filter(
    (n) => n.nodeType === "Condition" && n.status === "FAILURE"
  );
};

/**
 * Find all successful actions in a trace
 */
export const findSuccessfulActions = (trace: BTNodeTrace): BTNodeTrace[] => {
  return flattenTrace(trace).filter(
    (n) => n.nodeType === "Action" && n.status === "SUCCESS"
  );
};

/**
 * Get the depth of a trace tree
 */
export const getTraceDepth = (trace: BTNodeTrace): number => {
  if (!trace.children || trace.children.length === 0) {
    return 1;
  }
  return 1 + Math.max(...trace.children.map(getTraceDepth));
};

/**
 * Summarize a trace into a human-readable string
 */
export const summarizeTrace = (trace: BTNodeTrace): string => {
  const successfulActions = findSuccessfulActions(trace);
  if (successfulActions.length === 0) {
    return "No actions taken";
  }

  const actionNames = successfulActions
    .filter((a) => a.nodeName)
    .map((a) => a.nodeName);

  if (actionNames.length === 0) {
    return `${successfulActions.length} action(s) executed`;
  }

  return actionNames.join(", ");
};

/**
 * Convert a DecisionTrace to a simplified object for logging/display
 */
export const traceToSummary = (
  trace: DecisionTrace
): {
  playerId: PlayerId;
  tick: number;
  phase: RallyPhase;
  selectedAction: string | null;
  alternatives: number;
  summary: string;
} => {
  return {
    playerId: trace.playerId,
    tick: trace.tick,
    phase: trace.phase,
    selectedAction: trace.selectedIntent?.action.type ?? null,
    alternatives: trace.alternativeIntents.length,
    summary: summarizeTrace(trace.rootTrace),
  };
};

