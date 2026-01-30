// Simulation Parameters System
// Defines all configurable parameters for volleyball simulation behavior
// Based on docs/volleyball-simulation-parameters.md

/**
 * Serve Receive Formation Type
 */
export type ServeReceiveFormationType = "THREE_PERSON" | "TWO_PERSON" | "FOUR_PERSON";

/**
 * Setter Release Timing
 */
export type SetterReleaseTiming = "ON_SERVER_CONTACT" | "AFTER_NET_CROSS" | "ANTICIPATE";

/**
 * Front Row Non-Passer Behavior
 */
export type FrontRowNonPasserBehavior = "LEGAL_THEN_RELEASE" | "NEAR_NET_READY" | "PULL_OFF_FOR_SHORT";

/**
 * Emergency Setter Priority
 */
export type EmergencySetterPriority = "OPPOSITE_PRIORITY" | "NEAREST_PLAYER" | "DESIGNATED_BACKUP";

/**
 * Hitter Approach Trigger
 */
export type HitterApproachTrigger = "ON_SETTER_CONTACT" | "BEFORE_SETTER_CONTACT" | "AFTER_SET_DIRECTION";

/**
 * Set Selection Logic (In-System)
 */
export type InSystemSetLogic = "BALANCED_DISTRIBUTION" | "FAVOR_OUTSIDE" | "FAVOR_MIDDLE" | "ADAPTIVE_TO_DEFENSE";

/**
 * Out-of-System Default Set
 */
export type OutOfSystemDefault = "HIGH_OUTSIDE" | "HIGH_RIGHT" | "NEAREST_HITTER";

/**
 * Available Set Types
 */
export type SetType = "HIGH_OUTSIDE" | "QUICK_MIDDLE" | "BACK_SET" | "SLIDE" | "BACK_ROW_ATTACK";

/**
 * Attack Shot Selection Logic
 */
export type ShotSelectionLogic = "BLOCK_AWARE" | "ALWAYS_POWER" | "ALWAYS_SMART" | "RANDOM";

/**
 * Defensive System Type
 */
export type DefensiveSystemType = "PERIMETER" | "ROTATIONAL" | "MIDDLE_BACK";

/**
 * Blocking Style
 */
export type BlockingStyle = "READ" | "COMMIT" | "STACK";

/**
 * Middle Back Positioning Mode
 */
export type MiddleBackMode = "SHIFT_WITH_SET" | "STAY_DEEP_CENTER" | "SHIFT_WITH_BLOCK";

/**
 * Libero Substitution Pattern
 */
export type LiberoSubstitutionPattern = "FOR_MB1" | "FOR_MB2" | "FOR_WEAKEST_PASSER" | "DISABLED";

/**
 * Serve Receive Parameters
 */
export type ServeReceiveParameters = {
  formationType: ServeReceiveFormationType;
  passerDepth: number; // feet from net (12-22)
  setterReleaseTiming: SetterReleaseTiming;
  frontRowNonPasserBehavior: FrontRowNonPasserBehavior;
  setterStackAggressiveness: number; // 0-1 scale
};

/**
 * Transition to Offense Parameters
 */
export type TransitionParameters = {
  poorPassThreshold: number; // feet from target
  setterBailDistance: number; // feet from target
  emergencySetterPriority: EmergencySetterPriority;
  hitterApproachTrigger: HitterApproachTrigger;
  coverageTightness: number; // 0-1 scale
};

/**
 * Set Phase Parameters
 */
export type SetPhaseParameters = {
  inSystemSetLogic: InSystemSetLogic;
  outOfSystemDefault: OutOfSystemDefault;
  availableSetTypes: SetType[];
  setTypeWeights: {
    highOutside: number;
    quickMiddle: number;
    backSet: number;
    backRow: number;
  };
  setterDumpFrequency: number; // 0-1 scale
};

/**
 * Attack Phase Parameters
 */
export type AttackPhaseParameters = {
  shotSelectionLogic: ShotSelectionLogic;
  offSpeedFrequency: {
    noBlock: number; // 0-1 scale
    singleDouble: number;
    tripleBlock: number;
  };
  toolBlockAggression: number; // 0-1 scale
  coverageResponseTime: number; // seconds
};

/**
 * Defense Phase Parameters
 */
export type DefensePhaseParameters = {
  systemType: DefensiveSystemType;
  blockingStyle: BlockingStyle;
  middleBackMode: MiddleBackMode;
  tipReadAggressiveness: number; // 0-1 scale
  blockPenetration: number; // 0-1 scale
};

/**
 * Role-Specific Parameters
 */
export type RoleSpecificParameters = {
  setter: {
    decisionSpeed: number; // seconds
  };
  outsideHitter: {
    passingSkillVariance: number; // 0-1 scale
  };
  middleBlocker: {
    quickTimingWindow: number; // seconds
  };
  opposite: {
    emergencySetSkill: number; // 0-1 scale
  };
  libero: {
    substitutionPattern: LiberoSubstitutionPattern;
  };
};

/**
 * Timing Constants
 */
export type TimingParameters = {
  serveFlightTime: { min: number; max: number }; // seconds
  passToSetTime: { min: number; max: number };
  setToAttackTime: {
    quickMiddle: { min: number; max: number };
    highBall: { min: number; max: number };
    outOfSystem: { min: number; max: number };
  };
  hitterApproachDuration: {
    middleQuick: { min: number; max: number };
    outsideStandard: { min: number; max: number };
    backRowAttack: { min: number; max: number };
  };
  setterMovementTime: {
    frontRow: { min: number; max: number };
    backRowStacked: { min: number; max: number };
    backRowPoorStack: { min: number; max: number };
  };
  blockReactionTime: { min: number; max: number };
  digReactionTime: { min: number; max: number };
};

/**
 * Skill Variance Parameters
 */
export type SkillVarianceParameters = {
  passAccuracy: {
    high: { withinTarget: number; targetRadius: number };
    medium: { withinTarget: number; targetRadius: number };
    low: { withinTarget: number; targetRadius: number };
  };
  setAccuracy: {
    high: { locationVariance: number; heightConsistency: number };
    medium: { locationVariance: number; heightConsistency: number };
    low: { locationVariance: number; heightConsistency: number };
  };
  attackKillRate: {
    high: { inSystemKillRate: number; outSystemKillRate: number; errorRate: number };
    medium: { inSystemKillRate: number; outSystemKillRate: number; errorRate: number };
    low: { inSystemKillRate: number; outSystemKillRate: number; errorRate: number };
  };
  serveAccuracy: {
    high: { inRate: number; targetZoneAccuracy: number; serveDifficulty: number };
    medium: { inRate: number; targetZoneAccuracy: number; serveDifficulty: number };
    low: { inRate: number; targetZoneAccuracy: number; serveDifficulty: number };
  };
  blockingEffectiveness: {
    high: { touchRate: number; stuffRate: number; timingConsistency: number };
    medium: { touchRate: number; stuffRate: number; timingConsistency: number };
    low: { touchRate: number; stuffRate: number; timingConsistency: number };
  };
  defensiveReads: {
    high: { positioningAccuracy: number; reactionSpeed: number };
    medium: { positioningAccuracy: number; reactionSpeed: number };
    low: { positioningAccuracy: number; reactionSpeed: number };
  };
};

/**
 * Advanced Parameters (Optional Features)
 */
export type AdvancedParameters = {
  fatigueEnabled: boolean;
  fatigue?: {
    impactOnJumpHeight: number;
    impactOnSpeed: number;
    recoveryRate: number;
  };
  momentumEnabled: boolean;
  momentum?: {
    impactOnSkill: number;
    swingPointValue: number;
  };
  chemistryEnabled: boolean;
  pressureEnabled: boolean;
};

/**
 * Complete Simulation Parameters
 */
export type SimulationParameters = {
  serveReceive: ServeReceiveParameters;
  transition: TransitionParameters;
  setPhase: SetPhaseParameters;
  attackPhase: AttackPhaseParameters;
  defensePhase: DefensePhaseParameters;
  roles: RoleSpecificParameters;
  timing: TimingParameters;
  skillVariance: SkillVarianceParameters;
  advanced: AdvancedParameters;
};

/**
 * Preset Type
 */
export type PresetType = "BEGINNER" | "HIGH_SCHOOL_VARSITY" | "CLUB" | "COLLEGE";
export type PlayStylePreset = "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
export type PacePreset = "SLOW" | "NORMAL" | "FAST";

/**
 * Default Parameters (High School Varsity)
 */
export const DEFAULT_SIMULATION_PARAMETERS: SimulationParameters = {
  serveReceive: {
    formationType: "THREE_PERSON",
    passerDepth: 17.5,
    setterReleaseTiming: "ON_SERVER_CONTACT",
    frontRowNonPasserBehavior: "LEGAL_THEN_RELEASE",
    setterStackAggressiveness: 0.8,
  },
  transition: {
    poorPassThreshold: 10,
    setterBailDistance: 20,
    emergencySetterPriority: "OPPOSITE_PRIORITY",
    hitterApproachTrigger: "ON_SETTER_CONTACT",
    coverageTightness: 0.7,
  },
  setPhase: {
    inSystemSetLogic: "BALANCED_DISTRIBUTION",
    outOfSystemDefault: "HIGH_OUTSIDE",
    availableSetTypes: ["HIGH_OUTSIDE", "QUICK_MIDDLE", "BACK_SET", "BACK_ROW_ATTACK"],
    setTypeWeights: {
      highOutside: 0.5,
      quickMiddle: 0.25,
      backSet: 0.2,
      backRow: 0.05,
    },
    setterDumpFrequency: 0.03,
  },
  attackPhase: {
    shotSelectionLogic: "BLOCK_AWARE",
    offSpeedFrequency: {
      noBlock: 0.1,
      singleDouble: 0.3,
      tripleBlock: 0.7,
    },
    toolBlockAggression: 0.4,
    coverageResponseTime: 0.25,
  },
  defensePhase: {
    systemType: "PERIMETER",
    blockingStyle: "READ",
    middleBackMode: "SHIFT_WITH_SET",
    tipReadAggressiveness: 0.6,
    blockPenetration: 0.7,
  },
  roles: {
    setter: {
      decisionSpeed: 0.1,
    },
    outsideHitter: {
      passingSkillVariance: 0.3,
    },
    middleBlocker: {
      quickTimingWindow: 0.1,
    },
    opposite: {
      emergencySetSkill: 0.6,
    },
    libero: {
      substitutionPattern: "FOR_MB1",
    },
  },
  timing: {
    serveFlightTime: { min: 1.0, max: 1.5 },
    passToSetTime: { min: 0.5, max: 1.0 },
    setToAttackTime: {
      quickMiddle: { min: 0.3, max: 0.5 },
      highBall: { min: 1.0, max: 1.5 },
      outOfSystem: { min: 1.5, max: 2.0 },
    },
    hitterApproachDuration: {
      middleQuick: { min: 0.4, max: 0.6 },
      outsideStandard: { min: 0.8, max: 1.2 },
      backRowAttack: { min: 1.0, max: 1.5 },
    },
    setterMovementTime: {
      frontRow: { min: 0.2, max: 0.4 },
      backRowStacked: { min: 0.4, max: 0.6 },
      backRowPoorStack: { min: 0.8, max: 1.2 },
    },
    blockReactionTime: { min: 0.3, max: 0.5 },
    digReactionTime: { min: 0.2, max: 0.4 },
  },
  skillVariance: {
    passAccuracy: {
      high: { withinTarget: 0.8, targetRadius: 3.0 },
      medium: { withinTarget: 0.65, targetRadius: 5.0 },
      low: { withinTarget: 0.45, targetRadius: 8.0 },
    },
    setAccuracy: {
      high: { locationVariance: 1.5, heightConsistency: 0.9 },
      medium: { locationVariance: 3.5, heightConsistency: 0.7 },
      low: { locationVariance: 5.5, heightConsistency: 0.5 },
    },
    attackKillRate: {
      high: { inSystemKillRate: 0.55, outSystemKillRate: 0.35, errorRate: 0.08 },
      medium: { inSystemKillRate: 0.35, outSystemKillRate: 0.2, errorRate: 0.15 },
      low: { inSystemKillRate: 0.2, outSystemKillRate: 0.1, errorRate: 0.25 },
    },
    serveAccuracy: {
      high: { inRate: 0.92, targetZoneAccuracy: 0.7, serveDifficulty: 0.8 },
      medium: { inRate: 0.83, targetZoneAccuracy: 0.4, serveDifficulty: 0.5 },
      low: { inRate: 0.73, targetZoneAccuracy: 0.2, serveDifficulty: 0.3 },
    },
    blockingEffectiveness: {
      high: { touchRate: 0.25, stuffRate: 0.08, timingConsistency: 0.9 },
      medium: { touchRate: 0.15, stuffRate: 0.04, timingConsistency: 0.6 },
      low: { touchRate: 0.08, stuffRate: 0.01, timingConsistency: 0.3 },
    },
    defensiveReads: {
      high: { positioningAccuracy: 0.85, reactionSpeed: 0.9 },
      medium: { positioningAccuracy: 0.65, reactionSpeed: 0.7 },
      low: { positioningAccuracy: 0.45, reactionSpeed: 0.5 },
    },
  },
  advanced: {
    fatigueEnabled: false,
    momentumEnabled: false,
    chemistryEnabled: false,
    pressureEnabled: false,
  },
};

/**
 * Apply a preset to parameters
 */
export function applyPreset(
  preset: PresetType,
  baseParams: SimulationParameters = DEFAULT_SIMULATION_PARAMETERS
): SimulationParameters {
  const params = { ...baseParams };

  switch (preset) {
    case "BEGINNER":
      // Conservative play, simple sets, low skill variance
      params.setPhase.inSystemSetLogic = "FAVOR_OUTSIDE";
      params.setPhase.setterDumpFrequency = 0.01;
      params.attackPhase.shotSelectionLogic = "ALWAYS_SMART";
      params.attackPhase.offSpeedFrequency = { noBlock: 0.2, singleDouble: 0.5, tripleBlock: 0.8 };
      break;

    case "CLUB":
      // More aggressive, better skills, faster pace
      params.setPhase.inSystemSetLogic = "ADAPTIVE_TO_DEFENSE";
      params.setPhase.setterDumpFrequency = 0.05;
      params.attackPhase.toolBlockAggression = 0.6;
      params.defensePhase.tipReadAggressiveness = 0.75;
      break;

    case "COLLEGE":
      // Advanced plays, high skill consistency
      params.setPhase.availableSetTypes = ["HIGH_OUTSIDE", "QUICK_MIDDLE", "BACK_SET", "SLIDE", "BACK_ROW_ATTACK"];
      params.setPhase.setterDumpFrequency = 0.07;
      params.attackPhase.toolBlockAggression = 0.7;
      params.defensePhase.blockingStyle = "COMMIT";
      break;

    case "HIGH_SCHOOL_VARSITY":
    default:
      // Use defaults
      break;
  }

  return params;
}

/**
 * Apply play style preset
 */
export function applyPlayStyle(
  playStyle: PlayStylePreset,
  baseParams: SimulationParameters = DEFAULT_SIMULATION_PARAMETERS
): SimulationParameters {
  const params = { ...baseParams };

  switch (playStyle) {
    case "CONSERVATIVE":
      params.setPhase.setTypeWeights = { highOutside: 0.7, quickMiddle: 0.15, backSet: 0.1, backRow: 0.05 };
      params.setPhase.setterDumpFrequency = 0.01;
      params.attackPhase.offSpeedFrequency = { noBlock: 0.15, singleDouble: 0.4, tripleBlock: 0.8 };
      break;

    case "AGGRESSIVE":
      params.setPhase.setTypeWeights = { highOutside: 0.35, quickMiddle: 0.4, backSet: 0.2, backRow: 0.05 };
      params.setPhase.setterDumpFrequency = 0.08;
      params.attackPhase.offSpeedFrequency = { noBlock: 0.05, singleDouble: 0.2, tripleBlock: 0.6 };
      params.defensePhase.blockingStyle = "COMMIT";
      break;

    case "BALANCED":
    default:
      // Use defaults
      break;
  }

  return params;
}

/**
 * Apply pace preset
 */
export function applyPace(
  pace: PacePreset,
  baseParams: SimulationParameters = DEFAULT_SIMULATION_PARAMETERS
): SimulationParameters {
  const params = { ...baseParams };

  const scaleFactor = pace === "SLOW" ? 1.2 : pace === "FAST" ? 0.85 : 1.0;

  // Scale all timing parameters
  params.timing.serveFlightTime.min *= scaleFactor;
  params.timing.serveFlightTime.max *= scaleFactor;
  params.timing.passToSetTime.min *= scaleFactor;
  params.timing.passToSetTime.max *= scaleFactor;
  params.timing.setToAttackTime.quickMiddle.min *= scaleFactor;
  params.timing.setToAttackTime.quickMiddle.max *= scaleFactor;
  params.timing.setToAttackTime.highBall.min *= scaleFactor;
  params.timing.setToAttackTime.highBall.max *= scaleFactor;
  params.timing.setToAttackTime.outOfSystem.min *= scaleFactor;
  params.timing.setToAttackTime.outOfSystem.max *= scaleFactor;

  return params;
}
