// Unified Volleyball Simulation - Public API
// This file exports the core modules for the unified simulation architecture

// Core Types
export type { WorldState, CreateWorldStateParams } from "./world";
export {
  createWorldState,
  cloneWorldState,
  serializeWorldState,
  deserializeWorldState,
  getPlayerById,
  getTeamPlayers,
  getActivePlayers,
  updatePlayer,
  updatePlayers,
  updateBall,
  updateFSM,
  advanceTick,
} from "./world";

// Intent Layer
export type { Intent, IntentAction, IntentSource } from "./intent";
export {
  createIntent,
  createIntentId,
  createMoveIntent,
  createGoalIntent,
  createBallContactIntent,
  createStayIntent,
  sortIntentsByConfidence,
  sortIntentsByPriority,
  getIntentsForActor,
  getIntentsBySource,
  getBestIntentForActor,
  mergeIntents,
  isGoalIntent,
  isMoveIntent,
} from "./intent";

// Decision Trace
export type { BTNodeTrace, BTNodeType, DecisionTrace } from "./trace";
export {
  createNodeTrace,
  createSelectorTrace,
  createSequenceTrace,
  createConditionTrace,
  createActionTrace,
  createDecisionTrace,
  flattenTrace,
  findNodesByType,
  findFailedConditions,
  findSuccessfulActions,
  getTraceDepth,
  summarizeTrace,
  traceToSummary,
} from "./trace";

// Tick Pipeline
export type {
  SenseContext,
  ThinkResult,
  ProposeResult,
  TickResult,
  StepTickOptions,
} from "./tick";
export {
  sense,
  think,
  propose,
  commit,
  stepTick,
  dryRunTick,
  simulateUntil,
} from "./tick";

// SimController
export type {
  DryRunResult,
  SimSnapshot,
  SimControllerOptions,
  SimEventCallback,
} from "./controls";
export { SimController, createSimController } from "./controls";

// Behavior Trees
export type { BTStatus, BTResult, BTContext, BTNode, LegacyBTContext, LegacyBTNode } from "./bt";
export {
  Selector,
  Sequence,
  Condition,
  Action,
  RequestGoal,
  YieldToMovementSystem,
  Named,
  Inverter,
  Succeeder,
  adaptLegacyNode,
  toLegacyNode,
} from "./bt";

// FSM
export type { RallyEvent, RallyFSMState } from "./fsm";
export { createInitialFSM, reduceFSM } from "./fsm";

// Goals
export type { GoalResolution } from "./goals";
export { resolveGoalToTarget } from "./goals";

// Movement
export type { MovementConfig } from "./movement";
export { DEFAULT_MOVEMENT_CONFIG, stepMovement } from "./movement";

// Engine (backward compatible)
export { VolleyballSimEngine } from "./engine";

// Whiteboard (backward compatible)
export {
  getWhiteboardPositions,
  getAutoArrows,
  getNextPhaseInFlow,
  getPrevPhaseInFlow,
  getPositionsFromTickPipeline,
} from "./whiteboard";

// Rotation helpers
export {
  buildRotationResponsibilities,
  getZoneForRole,
  getServerRole,
} from "./rotation";
export type { RotationResponsibilities } from "./rotation";

// Ball Flight System
export type { BallFlight, BallContactType, FlightConfig } from "./ball";
export {
  FLIGHT_CONFIGS,
  createBallFlight,
  getBallFlightPosition,
  isBallFlightComplete,
  hasBallCrossedNet,
  calculateContactTarget,
  getServeLandingZone,
  getSettingZone,
  getAttackTarget,
} from "./ball";

// Rally Sequencer
export type { RallyStep, RallyScript, RallyOutcome, RallyProbabilities } from "./rally";
export {
  getTargetForZone,
  addTargetVariance,
  generateRallyScript,
  simulateRallyScript,
  getDefaultRallyProbabilities,
  randomAttackLane,
  getOppositeTeam,
} from "./rally";

// Re-export common types from types.ts
export type {
  TeamSide,
  SimRoleCategory,
  SimRole,
  PlayerId,
  Vec2,
  RallyPhase,
  AttackLane,
  OverrideGoalType,
  OverrideState,
  BallState,
  RotationBlackboard,
  TeamBlackboard,
  Blackboard,
  ThoughtMessage,
  GoalType,
  RequestedGoal,
  PlayerRoleInfo,
  PlayerKinematics,
  PlayerState,
  CourtModel,
} from "./types";
export { vec2, DEFAULT_COURT } from "./types";

