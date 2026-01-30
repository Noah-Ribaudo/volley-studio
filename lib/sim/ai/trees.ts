import type { BTNode } from "@/lib/sim/bt";
import {
  Action,
  Condition,
  RequestGoal,
  Selector,
  Sequence,
  YieldToMovementSystem,
} from "@/lib/sim/bt";
import { createGoalIntent } from "@/lib/sim/intent";
import type { GoalType, PlayerState, RequestedGoal } from "@/lib/sim/types";
import {
  canReachBallBeforeOthers,
  isFrontRow,
  isBackRow,
  isPinnedAtNet,
  shouldComeBackToReceive,
  isInSystem,
  shouldSetterBail,
  isMiddleReadyForQuick,
  isBallHighSet,
  isBallHeadedToZone,
  shouldCollapseCoverage,
  countOpponentBlockers,
  isGapInBlock,
  getPlayerZoneType,
} from "@/lib/sim/ai/conditions";
import { buildThoughtContext, buildSetDecisionThought, buildComeBackThought } from "@/lib/sim/ai/thoughtTemplates";

/**
 * Creates serving behavior for any player.
 * - During PRE_SERVE: If I'm the server, go to serving position
 * - During SERVE_IN_AIR: If I just served, transition to defensive position
 */
const createServingBehavior = (): BTNode => {
  const PrepareToServeBehavior: BTNode = Sequence(
    [
      Condition({
        name: "IsPreServePhase",
        description: "Is it before the serve?",
        check: (ctx) => ctx.blackboard.fsm.phase === "PRE_SERVE",
      }),
      Condition({
        name: "IsOurServe",
        description: "Is it our team's turn to serve?",
        check: (ctx) => ctx.blackboard.serving.isOurServe,
      }),
      Condition({
        name: "AmIServer",
        description: "Am I the designated server?",
        check: (ctx) => ctx.blackboard.serving.serverId === ctx.self.id,
      }),
      Action({
        name: "PrepareToServeAction",
        description: "Move to serving position behind baseline",
        fn: (ctx) => ({
          status: "SUCCESS",
          intents: [
            createGoalIntent(
              ctx.self.id,
              "PrepareToServe",
              "I'm the server this rotation. Moving behind the baseline to serve.",
              "AI"
            ),
          ],
          note: "Preparing to serve",
        }),
      }),
    ],
    "PrepareToServeBehavior"
  );

  const TransitionAfterServeBehavior: BTNode = Sequence(
    [
      Condition({
        name: "IsServeInAirOrReceive",
        description: "Has the serve been hit?",
        check: (ctx) =>
          ctx.blackboard.fsm.phase === "SERVE_IN_AIR" ||
          ctx.blackboard.fsm.phase === "SERVE_RECEIVE",
      }),
      Condition({
        name: "IsOurServe",
        description: "Is it our team's turn to serve?",
        check: (ctx) => ctx.blackboard.serving.isOurServe,
      }),
      Condition({
        name: "AmIServer",
        description: "Am I the designated server?",
        check: (ctx) => ctx.blackboard.serving.serverId === ctx.self.id,
      }),
      Action({
        name: "TransitionFromServeAction",
        description: "Run to defensive position after serving",
        fn: (ctx) => ({
          status: "SUCCESS",
          intents: [
            createGoalIntent(
              ctx.self.id,
              "TransitionFromServe",
              "I just served. Running to my defensive position.",
              "AI"
            ),
          ],
          note: "Transitioning from serve",
        }),
      }),
    ],
    "TransitionAfterServeBehavior"
  );

  return Selector([PrepareToServeBehavior, TransitionAfterServeBehavior], "ServingBehavior");
};

const isGoalType = (value: unknown): value is GoalType => {
  if (typeof value !== "string") return false;
  return true;
};

const createHandleOverrideGoal = (): BTNode => {
  return Sequence(
    [
      Condition({
        name: "HasOverride",
        description: "Is there an active manual override?",
        check: (ctx) => ctx.self.override.active || ctx.blackboard.override.active,
      }),
      Action({
        name: "ApplyOverrideGoal",
        description: "Apply the manual override goal",
        fn: (ctx) => {
          const activeOverride = ctx.self.override.active
            ? ctx.self.override
            : ctx.blackboard.override;
          if (!activeOverride.active) {
            return { status: "FAILURE", note: "No active override" };
          }
          const goalType = activeOverride.goal_type;
          const goal: GoalType = isGoalType(goalType)
            ? goalType
            : "MaintainBaseResponsibility";
          return {
            status: "SUCCESS",
            intents: [
              createGoalIntent(
                ctx.self.id,
                goal,
                `Override goal: ${goal}`,
                "AI"
              ),
            ],
            note: `Applied override: ${goal}`,
          };
        },
      }),
      YieldToMovementSystem(),
    ],
    "HandleOverrideGoal"
  );
};

const getOurPlayers = (self: PlayerState, all: PlayerState[]): PlayerState[] => {
  return all.filter((p) => p.team === self.team);
};

const availableFrontRowAttackerGoal = (params: {
  self: PlayerState;
  allPlayers: PlayerState[];
  isMiddlePreferred: boolean;
}): RequestedGoal => {
  const { self, allPlayers, isMiddlePreferred } = params;
  const our = getOurPlayers(self, allPlayers);
  const front = our.filter((p) => p.category !== "LIBERO" && p.id !== self.id);
  const frontRow = front.filter(
    (p) => p.requestedGoal?.type !== "MaintainBaseResponsibility"
  );

  const middle = frontRow.find((p) => p.category === "MIDDLE");
  const outside = frontRow.find((p) => p.category === "OUTSIDE");
  const opp = frontRow.find((p) => p.category === "OPPOSITE");

  if (isMiddlePreferred && middle) return { type: "QuickSetMiddle" };
  if (outside) return { type: "SetToOutside" };
  if (opp) return { type: "SetToOpposite" };
  if (middle) return { type: "QuickSetMiddle" };
  return { type: "HighOutOfSystemSet" };
};

export const createSetterTree = (): BTNode => {
  const HandleOverrideGoal = createHandleOverrideGoal();
  const ServingBehavior = createServingBehavior();

  const EmergencyBallControl: BTNode = Sequence(
    [
      Condition({
        name: "BallOnOurSide",
        description: "Is the ball on our side of the court?",
        check: (ctx) => ctx.blackboard.ball.on_our_side,
      }),
      Condition({
        name: "TouchCount1",
        description: "Is this our second touch?",
        check: (ctx) => ctx.blackboard.ball.touch_count === 1,
      }),
      Condition({
        name: "CanReachBallFirst",
        description: "Can I get to the ball before anyone else?",
        check: (ctx) =>
          canReachBallBeforeOthers({
            bb: ctx.blackboard,
            self: ctx.self,
            allPlayers: ctx.allPlayers,
            priorityBias: -5,
          }),
      }),
      Selector(
        [
          Sequence(
            [
              Condition({
                name: "IsFrontRow",
                description: "Am I in the front row?",
                check: (ctx) => isFrontRow(ctx.blackboard, ctx.self),
              }),
              Action({
                name: "SetterDumpAction",
                description: "Attack the ball over the net as a surprise",
                fn: (ctx) => ({
                  status: "SUCCESS",
                  intents: [
                    createGoalIntent(
                      ctx.self.id,
                      "SetterDump",
                      "I'm dumping because I'm front row and it's our second contact.",
                      "AI"
                    ),
                  ],
                  note: "Setter dump",
                }),
              }),
            ],
            "FrontRowDump"
          ),
          Action({
            name: "EmergencySetAction",
            description: "Set the ball when I get to it first",
            fn: (ctx) => ({
              status: "SUCCESS",
              intents: [
                createGoalIntent(
                  ctx.self.id,
                  "EmergencySet",
                  "I'm setting because it's our second contact and I can get there first.",
                  "AI"
                ),
              ],
              note: "Emergency set",
            }),
          }),
        ],
        "DumpOrSet"
      ),
    ],
    "EmergencyBallControl"
  );

  const PreServeBehavior: BTNode = Sequence(
    [
      Condition({
        name: "IsPreServe",
        description: "Is it before the serve?",
        check: (ctx) => ctx.blackboard.fsm.phase === "PRE_SERVE",
      }),
      Action({
        name: "LegalStackAction",
        description: "Line up in legal position before the serve",
        fn: (ctx) => ({
          status: "SUCCESS",
          intents: [
            createGoalIntent(
              ctx.self.id,
              "ParticipateInLegalStack",
              "I'm aligning for a legal stack because the rally hasn't started yet.",
              "AI"
            ),
          ],
          note: "Legal stack",
        }),
      }),
    ],
    "PreServeBehavior"
  );

  const ServeReceiveBehavior: BTNode = Selector(
    [
      // Setter release on server contact (SERVE_IN_AIR phase)
      // Based on reference doc: "Setter releases on server contact"
      Sequence(
        [
          Condition({
            name: "IsServeInAir",
            description: "Is the serve currently in the air?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SERVE_IN_AIR",
          }),
          Condition({
            name: "IsReceivingServe",
            description: "Is our team receiving the serve?",
            check: (ctx) => !ctx.blackboard.serving.isOurServe,
          }),
          Action({
            name: "SetterReleaseAction",
            description: "Sprint to setting zone as soon as serve is hit",
            fn: (ctx) => ({
              status: "SUCCESS",
              intents: [
                createGoalIntent(
                  ctx.self.id,
                  "MoveTowardSettingZone",
                  "Server made contact - releasing to setting zone immediately.",
                  "AI"
                ),
              ],
              note: "Setter release on server contact",
            }),
          }),
        ],
        "SetterRelease"
      ),
      // When front row (R4-6): Stack left with hitters, stay out of passers' way
      Sequence(
        [
          Condition({
            name: "IsServeReceive",
            description: "Are we receiving the serve?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SERVE_RECEIVE",
          }),
          Condition({
            name: "NoTouch",
            description: "Has nobody touched the ball yet?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 0,
          }),
          Condition({
            name: "IsFrontRow",
            description: "Am I in the front row?",
            check: (ctx) => isFrontRow(ctx.blackboard, ctx.self),
          }),
          Action({
            name: "FrontRowStackLeftAction",
            description: "Stack left to stay out of passers' way",
            fn: (ctx) => ({
              status: "SUCCESS",
              intents: [
                createGoalIntent(
                  ctx.self.id,
                  "StackLeftReceivePosition",
                  "I'm front row (R4-6), stacking left and staying out of passers' way.",
                  "AI"
                ),
              ],
              note: "Front row stack left",
            }),
          }),
        ],
        "FrontRowStackLeft"
      ),
      // When back row (R1-3): Hide behind passers, don't receive
      Sequence(
        [
          Condition({
            name: "IsServeReceive",
            description: "Are we receiving the serve?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SERVE_RECEIVE",
          }),
          Condition({
            name: "NoTouch",
            description: "Has nobody touched the ball yet?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 0,
          }),
          Condition({
            name: "IsBackRow",
            description: "Am I in the back row?",
            check: (ctx) => isBackRow(ctx.blackboard, ctx.self),
          }),
          Action({
            name: "HideAction",
            description: "Hide behind passers to avoid passing",
            fn: (ctx) => ({
              status: "SUCCESS",
              intents: [
                createGoalIntent(
                  ctx.self.id,
                  "HideBehindPrimaryPasser",
                  "I'm hiding because in serve receive I should not be a primary passer.",
                  "AI"
                ),
              ],
              note: "Hide behind passer",
            }),
          }),
        ],
        "BackRowHide"
      ),
      // After pass (touch_count === 1): move to setting zone
      Sequence(
        [
          Condition({
            name: "IsServeReceive",
            description: "Are we receiving the serve?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SERVE_RECEIVE",
          }),
          Condition({
            name: "OneTouch",
            description: "Has the ball been passed?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 1,
          }),
          Action({
            name: "MoveToSettingZoneAction",
            description: "Run to setting zone to take second contact",
            fn: (ctx) => ({
              status: "SUCCESS",
              intents: [
                createGoalIntent(
                  ctx.self.id,
                  "MoveTowardSettingZone",
                  "I'm moving to the setting zone because we just passed and I'm taking second contact.",
                  "AI"
                ),
              ],
              note: "Move to setting zone",
            }),
          }),
        ],
        "MoveToSetAfterPass"
      ),
    ],
    "ServeReceiveBehavior"
  );

  const SetPhaseBehavior: BTNode = Selector(
    [
      // Emergency: Pass is way off target, send freeball over
      Sequence(
        [
          Condition({
            name: "IsOffensePhase",
            description: "Are we transitioning to or in the attack?",
            check: (ctx) => ctx.blackboard.fsm.phase === "TRANSITION_TO_OFFENSE" || ctx.blackboard.fsm.phase === "SET_PHASE",
          }),
          Condition({
            name: "OneOrTwoTouches",
            description: "Have we had one or two touches?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 1 || ctx.blackboard.ball.touch_count === 2,
          }),
          Condition({
            name: "ShouldBail",
            description: "Is the pass too far off to run a real play?",
            check: (ctx) => shouldSetterBail(ctx.blackboard, ctx.self),
          }),
          Action({
            name: "FreeBallBailAction",
            description: "Send a freeball over when pass is way off",
            fn: (ctx) => ({
              status: "SUCCESS",
              intents: [
                createGoalIntent(
                  ctx.self.id,
                  "FreeBallToTarget",
                  "Pass is way off target - sending freeball over on second contact.",
                  "AI"
                ),
              ],
              note: "Freeball bail",
            }),
          }),
        ],
        "FreeBallBail"
      ),
      // In-system with middle ready: Quick set to middle (fastest attack)
      Sequence(
        [
          Condition({
            name: "IsSetPhase",
            description: "Is it time to set the ball?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SET_PHASE",
          }),
          Condition({
            name: "TwoTouches",
            description: "Have we had two touches?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 2,
          }),
          Condition({
            name: "IsInSystem",
            description: "Is the pass good enough to run any play?",
            check: (ctx) => isInSystem(ctx.blackboard, ctx.self),
          }),
          Condition({
            name: "MiddleReadyForQuick",
            description: "Is the middle blocker ready for a quick set?",
            check: (ctx) => isMiddleReadyForQuick({
              bb: ctx.blackboard,
              self: ctx.self,
              allPlayers: ctx.allPlayers,
            }),
          }),
          Action({
            name: "QuickSetMiddleAction",
            description: "Set a fast tempo ball to the middle",
            fn: (ctx) => {
              const context = buildThoughtContext(ctx.blackboard, ctx.self);
              const thought = buildSetDecisionThought("quick", context);
              return {
                status: "SUCCESS",
                intents: [
                  createGoalIntent(
                    ctx.self.id,
                    "QuickSetMiddle",
                    thought,
                    "AI"
                  ),
                ],
                note: "Quick set to middle",
              };
            },
          }),
        ],
        "QuickSetMiddle"
      ),
      // In-system with weak block on right: Back set to opposite
      Sequence(
        [
          Condition({
            name: "IsSetPhase",
            description: "Is it time to set the ball?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SET_PHASE",
          }),
          Condition({
            name: "TwoTouches",
            description: "Have we had two touches?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 2,
          }),
          Condition({
            name: "IsInSystem",
            description: "Is the pass good enough to run any play?",
            check: (ctx) => isInSystem(ctx.blackboard, ctx.self),
          }),
          Condition({
            name: "WeakBlockRight",
            description: "Is the opponent's block weak on the right side?",
            check: (ctx) => {
              const blockerCount = countOpponentBlockers({
                bb: ctx.blackboard,
                self: ctx.self,
                allPlayers: ctx.allPlayers,
              });
              const gapOnRight = isGapInBlock({
                bb: ctx.blackboard,
                self: ctx.self,
                allPlayers: ctx.allPlayers,
                side: "right",
              });
              return blockerCount <= 1 || gapOnRight;
            },
          }),
          Action({
            name: "BackSetOppositeAction",
            description: "Back set to the opposite hitter",
            fn: (ctx) => {
              const context = buildThoughtContext(ctx.blackboard, ctx.self);
              const thought = buildSetDecisionThought("back_set", context);
              return {
                status: "SUCCESS",
                intents: [
                  createGoalIntent(
                    ctx.self.id,
                    "SetToOpposite",
                    thought,
                    "AI"
                  ),
                ],
                note: "Back set to opposite",
              };
            },
          }),
        ],
        "BackSetOpposite"
      ),
      // In-system default: High ball to outside (reliable option)
      Sequence(
        [
          Condition({
            name: "IsSetPhase",
            description: "Is it time to set the ball?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SET_PHASE",
          }),
          Condition({
            name: "TwoTouches",
            description: "Have we had two touches?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 2,
          }),
          Condition({
            name: "IsInSystem",
            description: "Is the pass good enough to run any play?",
            check: (ctx) => isInSystem(ctx.blackboard, ctx.self),
          }),
          Action({
            name: "InSystemOutsideAction",
            description: "Set a high ball to the outside hitter",
            fn: (ctx) => {
              const context = buildThoughtContext(ctx.blackboard, ctx.self);
              const thought = buildSetDecisionThought("high_outside", context);
              return {
                status: "SUCCESS",
                intents: [
                  createGoalIntent(
                    ctx.self.id,
                    "SetToOutside",
                    thought,
                    "AI"
                  ),
                ],
                note: "In-system high outside",
              };
            },
          }),
        ],
        "InSystemOutside"
      ),
      // Out-of-system: Default to high ball to outside (safest option)
      Sequence(
        [
          Condition({
            name: "IsSetPhase",
            description: "Is it time to set the ball?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SET_PHASE",
          }),
          Condition({
            name: "TwoTouches",
            description: "Have we had two touches?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 2,
          }),
          Action({
            name: "OutOfSystemSetAction",
            description: "Set a high safe ball when out of system",
            fn: (ctx) => {
              // Out-of-system always uses high_outside but with hitter mode context
              const hitterMode = ctx.blackboard.rotation.hitterMode;
              const thought = `Out-of-system pass - going with high ball to outside for safety. (${hitterMode} rotation)`;
              return {
                status: "SUCCESS",
                intents: [
                  createGoalIntent(
                    ctx.self.id,
                    "HighOutOfSystemSet",
                    thought,
                    "AI"
                  ),
                ],
                note: "Out-of-system high ball",
              };
            },
          }),
        ],
        "OutOfSystemSet"
      ),
    ],
    "SetPhaseBehavior"
  );

  const DefenseBehavior: BTNode = Sequence(
    [
      Condition({
        name: "IsDefensePhase",
        description: "Is the opponent attacking?",
        check: (ctx) => ctx.blackboard.fsm.phase === "DEFENSE_PHASE",
      }),
      Selector(
        [
          Sequence(
            [
              Condition({
                name: "IsFrontRow",
                description: "Am I in the front row?",
                check: (ctx) => isFrontRow(ctx.blackboard, ctx.self),
              }),
              Action({
                name: "FrontRowDefenseAction",
                description: "Block or cover tips based on attack direction",
                fn: (ctx) => {
                  const attackLane = ctx.blackboard.opponent.attack_lane;
                  const shouldBlock = attackLane === "right";

                  if (shouldBlock) {
                    return {
                      status: "SUCCESS",
                      intents: [
                        createGoalIntent(
                          ctx.self.id,
                          "BlockRightSide",
                          "I'm blocking right side - attack is coming from their left outside.",
                          "AI"
                        ),
                      ],
                      note: "Block right side",
                    };
                  } else {
                    return {
                      status: "SUCCESS",
                      intents: [
                        createGoalIntent(
                          ctx.self.id,
                          "CoverTips",
                          `I'm covering tips - attack is ${attackLane}, I'll be ready for deflections.`,
                          "AI"
                        ),
                      ],
                      note: "Cover tips",
                    };
                  }
                },
              }),
            ],
            "FrontRowDefense"
          ),
          Action({
            name: "BackRowDefenseAction",
            description: "Defend from the back row",
            fn: (ctx) => ({
              status: "SUCCESS",
              intents: [
                createGoalIntent(
                  ctx.self.id,
                  "DefendZoneBiasRightBack",
                  "I'm defending deep because I'm back row in defense.",
                  "AI"
                ),
              ],
              note: "Back row defense",
            }),
          }),
        ],
        "DefenseSelector"
      ),
    ],
    "DefenseBehavior"
  );

  // After setting, setter should collapse for coverage
  const SetterCoverageBehavior: BTNode = Sequence(
    [
      Condition({
        name: "IsAttackPhase",
        description: "Is our team attacking?",
        check: (ctx) => ctx.blackboard.fsm.phase === "ATTACK_PHASE",
      }),
      Condition({
        name: "BallOnOurSide",
        description: "Is the ball on our side?",
        check: (ctx) => ctx.blackboard.ball.on_our_side,
      }),
      Action({
        name: "SetterCoverageAction",
        description: "Move to cover the hitter in case of a block",
        fn: (ctx) => ({
          status: "SUCCESS",
          intents: [
            createGoalIntent(
              ctx.self.id,
              "CoverHitter",
              "After setting, moving to coverage position.",
              "AI"
            ),
          ],
          note: "Setter coverage",
        }),
      }),
    ],
    "SetterCoverageBehavior"
  );

  const PhaseSpecificBehavior: BTNode = Selector(
    [PreServeBehavior, ServeReceiveBehavior, SetPhaseBehavior, SetterCoverageBehavior, DefenseBehavior],
    "PhaseSpecificBehavior"
  );

  const MaintainBaseResponsibility: BTNode = Sequence(
    [
      Condition({
        name: "Always",
        description: "Always true - fallback behavior",
        check: () => true,
      }),
      Action({
        name: "BaseResponsibilityAction",
        description: "Return to base position when nothing else to do",
        fn: (ctx) => ({
          status: "SUCCESS",
          intents: [
            createGoalIntent(
              ctx.self.id,
              "MaintainBaseResponsibility",
              "I'm resetting to my base responsibility until a higher-priority situation appears.",
              "AI"
            ),
          ],
          note: "Base responsibility",
        }),
      }),
    ],
    "MaintainBaseResponsibility"
  );

  return Selector(
    [
      HandleOverrideGoal,
      ServingBehavior,
      EmergencyBallControl,
      PhaseSpecificBehavior,
      MaintainBaseResponsibility,
    ],
    "SetterTree"
  );
};

export const createOutsideTree = (params: { side: "left" | "right" }): BTNode => {
  const HandleOverrideGoal = createHandleOverrideGoal();
  const ServingBehavior = createServingBehavior();

  // Serve receive behavior for Outside/Hitter (per 5-1 Paper):
  // - R1: Front-row OH is pinned at net (stack right), hits right side
  // - R2: Front-row OH comes back to receive (stack middle)
  // - R3+: Front-row stacks left with setter
  // - Back row: Primary passer
  const ServeReceiveBehavior: BTNode = Selector(
    [
      // R1: Front-row OH is pinned at net (stack right)
      Sequence(
        [
          Condition({
            name: "IsServeReceive",
            description: "Are we receiving the serve?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SERVE_RECEIVE",
          }),
          Condition({
            name: "NoTouch",
            description: "Has nobody touched the ball yet?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 0,
          }),
          Condition({
            name: "IsPinnedAtNet",
            description: "Am I stuck at the net due to overlap rules?",
            check: (ctx) => isPinnedAtNet(ctx.blackboard, ctx.self),
          }),
          Action({
            name: "PinnedAtNetAction",
            description: "Stay at net when pinned by overlap rules",
            fn: (ctx) => {
              const zoneType = getPlayerZoneType(ctx.blackboard, ctx.self);
              const rotation = ctx.blackboard.rotation.index;
              const thought = `As the outside hitter, I'm pinned at net (R${rotation}). I'm in an ${zoneType} relationship with players behind me - I need to stay in front until serve contact. Will hit right side after.`;
              return {
                status: "SUCCESS",
                intents: [
                  createGoalIntent(
                    ctx.self.id,
                    "PinnedAtNet",
                    thought,
                    "AI"
                  ),
                ],
                note: "Pinned at net R1",
              };
            },
          }),
        ],
        "PinnedAtNet"
      ),
      // R2: Front-row OH comes back to receive
      Sequence(
        [
          Condition({
            name: "IsServeReceive",
            description: "Are we receiving the serve?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SERVE_RECEIVE",
          }),
          Condition({
            name: "NoTouch",
            description: "Has nobody touched the ball yet?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 0,
          }),
          Condition({
            name: "ShouldComeBack",
            description: "Should I drop back to help receive?",
            check: (ctx) => shouldComeBackToReceive(ctx.blackboard, ctx.self),
          }),
          Action({
            name: "ComeBackToReceiveAction",
            description: "Drop back from front row to help receive",
            fn: (ctx) => {
              const context = buildThoughtContext(ctx.blackboard, ctx.self);
              const thought = buildComeBackThought(context);
              return {
                status: "SUCCESS",
                intents: [
                  createGoalIntent(
                    ctx.self.id,
                    "ComeBackToReceive",
                    thought,
                    "AI"
                  ),
                ],
                note: "Come back to receive",
              };
            },
          }),
        ],
        "ComeBackToReceive"
      ),
      // R3+: Front-row stacks left with setter
      Sequence(
        [
          Condition({
            name: "IsServeReceive",
            description: "Are we receiving the serve?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SERVE_RECEIVE",
          }),
          Condition({
            name: "NoTouch",
            description: "Has nobody touched the ball yet?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 0,
          }),
          Condition({
            name: "IsFrontRow",
            description: "Am I in the front row?",
            check: (ctx) => isFrontRow(ctx.blackboard, ctx.self),
          }),
          Action({
            name: "StackLeftAction",
            description: "Stack left with setter before serve",
            fn: (ctx) => ({
              status: "SUCCESS",
              intents: [
                createGoalIntent(
                  ctx.self.id,
                  "StackLeftReceivePosition",
                  "Front row, stacking left with setter.",
                  "AI"
                ),
              ],
              note: "Stack left front row",
            }),
          }),
        ],
        "FrontRowStackLeft"
      ),
      // Back row: Primary passer - receive if can reach first
      Sequence(
        [
          Condition({
            name: "IsServeReceive",
            description: "Are we receiving the serve?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SERVE_RECEIVE",
          }),
          Condition({
            name: "NoTouch",
            description: "Has nobody touched the ball yet?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 0,
          }),
          Condition({
            name: "IsBackRow",
            description: "Am I in the back row?",
            check: (ctx) => isBackRow(ctx.blackboard, ctx.self),
          }),
          Condition({
            name: "CanReachFirst",
            description: "Can I get to the ball before anyone else?",
            check: (ctx) =>
              canReachBallBeforeOthers({
                bb: ctx.blackboard,
                self: ctx.self,
                allPlayers: ctx.allPlayers,
                priorityBias: 0,
              }),
          }),
          Action({
            name: "ReceiveServeAction",
            description: "Pass the serve",
            fn: (ctx) => ({
              status: "SUCCESS",
              intents: [
                createGoalIntent(
                  ctx.self.id,
                  "ReceiveServe",
                  "I'm passing because it's serve receive and I can reach the ball first.",
                  "AI"
                ),
              ],
              note: "Receive serve",
            }),
          }),
        ],
        "BackRowReceive"
      ),
      // Back row fallback: maintain base
      Sequence(
        [
          Condition({
            name: "IsServeReceive",
            description: "Are we receiving the serve?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SERVE_RECEIVE",
          }),
          Condition({
            name: "NoTouch",
            description: "Has nobody touched the ball yet?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 0,
          }),
          Condition({
            name: "IsBackRow",
            description: "Am I in the back row?",
            check: (ctx) => isBackRow(ctx.blackboard, ctx.self),
          }),
          Action({
            name: "BackRowBaseAction",
            description: "Hold receive position in back row",
            fn: (ctx) => ({
              status: "SUCCESS",
              intents: [
                createGoalIntent(
                  ctx.self.id,
                  "MaintainBaseResponsibility",
                  "I'm back row, holding receive position.",
                  "AI"
                ),
              ],
              note: "Back row base",
            }),
          }),
        ],
        "BackRowBase"
      ),
      // After pass (touch_count === 1): approach to attack if front row
      Sequence(
        [
          Condition({
            name: "IsServeReceive",
            description: "Are we receiving the serve?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SERVE_RECEIVE",
          }),
          Condition({
            name: "OneTouch",
            description: "Has the ball been passed?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 1,
          }),
          Condition({
            name: "IsFrontRow",
            description: "Am I in the front row?",
            check: (ctx) => isFrontRow(ctx.blackboard, ctx.self),
          }),
          Action({
            name: "ApproachAfterPassAction",
            description: "Start approach to attack after pass",
            fn: (ctx) => {
              const goal: GoalType =
                params.side === "right" ? "ApproachAttackRight" : "ApproachAttackLeft";
              return {
                status: "SUCCESS",
                intents: [
                  createGoalIntent(
                    ctx.self.id,
                    goal,
                    `Pass is up, approaching to hit ${params.side} side.`,
                    "AI"
                  ),
                ],
                note: `Approach ${params.side} after pass`,
              };
            },
          }),
        ],
        "ApproachAfterPass"
      ),
    ],
    "ServeReceiveBehavior"
  );

  const SetPhaseAttack: BTNode = Sequence(
    [
      Condition({
        name: "IsSetPhase",
        description: "Is it time to set the ball?",
        check: (ctx) => ctx.blackboard.fsm.phase === "SET_PHASE",
      }),
      Condition({
        name: "IsFrontRow",
        description: "Am I in the front row?",
        check: (ctx) => isFrontRow(ctx.blackboard, ctx.self),
      }),
      Action({
        name: "ApproachAttackAction",
        description: "Approach the net to attack",
        fn: (ctx) => {
          const goal: GoalType =
            params.side === "right" ? "ApproachAttackRight" : "ApproachAttackLeft";
          return {
            status: "SUCCESS",
            intents: [
              createGoalIntent(
                ctx.self.id,
                goal,
                `I'm approaching to hit because it's set phase and I'm front row (${params.side} pin).`,
                "AI"
              ),
            ],
            note: `Approach ${params.side}`,
          };
        },
      }),
    ],
    "SetPhaseAttack"
  );

  // Coverage behavior: Non-attacking players collapse for coverage during attack
  const AttackCoverageBehavior: BTNode = Sequence(
    [
      Condition({
        name: "IsAttackPhase",
        description: "Is our team attacking?",
        check: (ctx) => ctx.blackboard.fsm.phase === "ATTACK_PHASE",
      }),
      Condition({
        name: "BallOnOurSide",
        description: "Is the ball on our side?",
        check: (ctx) => ctx.blackboard.ball.on_our_side,
      }),
      Condition({
        name: "ShouldCollapse",
        description: "Should I move in for hitter coverage?",
        check: (ctx) => shouldCollapseCoverage({ bb: ctx.blackboard, self: ctx.self }),
      }),
      Action({
        name: "CoverageAction",
        description: "Collapse for hitter coverage",
        fn: (ctx) => ({
          status: "SUCCESS",
          intents: [
            createGoalIntent(
              ctx.self.id,
              "CoverHitter",
              "Collapsing for coverage - ready for blocked ball.",
              "AI"
            ),
          ],
          note: "Hitter coverage",
        }),
      }),
    ],
    "AttackCoverageBehavior"
  );

  const DefenseBehavior: BTNode = Sequence(
    [
      Condition({
        name: "IsDefensePhase",
        description: "Is the opponent attacking?",
        check: (ctx) => ctx.blackboard.fsm.phase === "DEFENSE_PHASE",
      }),
      Selector(
        [
          Sequence(
            [
              Condition({
                name: "IsFrontRow",
                description: "Am I in the front row?",
                check: (ctx) => isFrontRow(ctx.blackboard, ctx.self),
              }),
              Action({
                name: "FrontRowDefenseAction",
                description: "Block or cover tips based on attack direction",
                fn: (ctx) => {
                  const attackLane = ctx.blackboard.opponent.attack_lane;
                  const mySide = params.side;

                  const shouldBlock =
                    (mySide === "left" && attackLane === "left") ||
                    (mySide === "right" && attackLane === "right");

                  if (shouldBlock) {
                    const blockGoal: GoalType =
                      mySide === "left" ? "BlockLeftSide" : "BlockRightSide";
                    return {
                      status: "SUCCESS",
                      intents: [
                        createGoalIntent(
                          ctx.self.id,
                          blockGoal,
                          `I'm blocking ${mySide} side - attack is coming ${attackLane}.`,
                          "AI"
                        ),
                      ],
                      note: `Block ${mySide}`,
                    };
                  } else {
                    return {
                      status: "SUCCESS",
                      intents: [
                        createGoalIntent(
                          ctx.self.id,
                          "CoverTips",
                          `I'm covering tips - attack is ${attackLane}, not my blocking assignment.`,
                          "AI"
                        ),
                      ],
                      note: "Cover tips",
                    };
                  }
                },
              }),
            ],
            "FrontRowDefense"
          ),
          Action({
            name: "BackRowDefenseAction",
            description: "Defend from the back row based on position",
            fn: (ctx) => {
              const attackLane = ctx.blackboard.opponent.attack_lane;
              const mySide = params.side;

              // Per 5-1 Paper: Line player (same side as attack) covers tips
              // Cross-court player digs deep
              const isLinePlayer =
                (mySide === "left" && attackLane === "left") ||
                (mySide === "right" && attackLane === "right");

              if (isLinePlayer) {
                return {
                  status: "SUCCESS",
                  intents: [
                    createGoalIntent(
                      ctx.self.id,
                      "CoverTips",
                      `I'm the line player - covering tips on ${mySide} side.`,
                      "AI"
                    ),
                  ],
                  note: "Line player tip coverage",
                };
              }

              // Cross-court player defends deep
              const defenseGoal: GoalType =
                mySide === "left"
                  ? "DefendZoneBiasLeftBack"
                  : "DefendZoneBiasRightBack";
              return {
                status: "SUCCESS",
                intents: [
                  createGoalIntent(
                    ctx.self.id,
                    defenseGoal,
                    `I'm the cross-court defender - digging deep ${mySide}-back.`,
                    "AI"
                  ),
                ],
                note: `Defend ${mySide} back`,
              };
            },
          }),
        ],
        "DefenseSelector"
      ),
    ],
    "DefenseBehavior"
  );

  const MaintainBaseResponsibility: BTNode = Sequence(
    [
      Condition({
        name: "Always",
        description: "Always true - fallback behavior",
        check: () => true,
      }),
      Action({
        name: "BaseResponsibilityAction",
        description: "Return to base position when nothing else to do",
        fn: (ctx) => ({
          status: "SUCCESS",
          intents: [
            createGoalIntent(
              ctx.self.id,
              "MaintainBaseResponsibility",
              "I'm holding base until I need to pass, attack, or defend.",
              "AI"
            ),
          ],
          note: "Base responsibility",
        }),
      }),
    ],
    "MaintainBaseResponsibility"
  );

  return Selector(
    [
      HandleOverrideGoal,
      ServingBehavior,
      ServeReceiveBehavior,
      SetPhaseAttack,
      AttackCoverageBehavior,
      DefenseBehavior,
      MaintainBaseResponsibility,
    ],
    `OutsideTree(${params.side})`
  );
};

export const createOppositeTree = (): BTNode => {
  const HandleOverrideGoal = createHandleOverrideGoal();
  const ServingBehavior = createServingBehavior();

  // Serve receive behavior for Opposite (per 5-1 Paper):
  // - R1: Front row, comes back to receive (slightly in front of back-row H)
  // - R2: Front row, pinned at net (stack middle)
  // - R3: Front row, comes back to receive (slightly in front of back-row M)
  // - R4-6: Back row, normal receive position
  const ServeReceiveBehavior: BTNode = Selector(
    [
      // R2: Pinned at net (stack middle)
      Sequence(
        [
          Condition({
            name: "IsServeReceive",
            description: "Are we receiving the serve?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SERVE_RECEIVE",
          }),
          Condition({
            name: "NoTouch",
            description: "Has nobody touched the ball yet?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 0,
          }),
          Condition({
            name: "IsPinnedAtNet",
            description: "Am I stuck at the net due to overlap rules?",
            check: (ctx) => isPinnedAtNet(ctx.blackboard, ctx.self),
          }),
          Action({
            name: "PinnedAtNetAction",
            description: "Stay at net when pinned by overlap rules",
            fn: (ctx) => ({
              status: "SUCCESS",
              intents: [
                createGoalIntent(
                  ctx.self.id,
                  "PinnedAtNet",
                  "R2: I'm pinned at net in stack-middle formation.",
                  "AI"
                ),
              ],
              note: "Pinned at net R2",
            }),
          }),
        ],
        "PinnedAtNet"
      ),
      // R1, R3: Come back to receive (front row)
      Sequence(
        [
          Condition({
            name: "IsServeReceive",
            description: "Are we receiving the serve?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SERVE_RECEIVE",
          }),
          Condition({
            name: "NoTouch",
            description: "Has nobody touched the ball yet?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 0,
          }),
          Condition({
            name: "ShouldComeBack",
            description: "Should I drop back to help receive?",
            check: (ctx) => shouldComeBackToReceive(ctx.blackboard, ctx.self),
          }),
          Action({
            name: "ComeBackToReceiveAction",
            description: "Drop back from front row to help receive",
            fn: (ctx) => ({
              status: "SUCCESS",
              intents: [
                createGoalIntent(
                  ctx.self.id,
                  "ComeBackToReceive",
                  "I'm coming back to help receive as front-row opposite.",
                  "AI"
                ),
              ],
              note: "Come back to receive",
            }),
          }),
        ],
        "ComeBackToReceive"
      ),
      // R4-6: Back row, hold base receive position
      Sequence(
        [
          Condition({
            name: "IsServeReceive",
            description: "Are we receiving the serve?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SERVE_RECEIVE",
          }),
          Condition({
            name: "NoTouch",
            description: "Has nobody touched the ball yet?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 0,
          }),
          Condition({
            name: "IsBackRow",
            description: "Am I in the back row?",
            check: (ctx) => isBackRow(ctx.blackboard, ctx.self),
          }),
          Action({
            name: "BackRowReceiveAction",
            description: "Hold receive position in back row",
            fn: (ctx) => ({
              status: "SUCCESS",
              intents: [
                createGoalIntent(
                  ctx.self.id,
                  "MaintainBaseResponsibility",
                  "I'm back row, holding my receive position.",
                  "AI"
                ),
              ],
              note: "Back row receive position",
            }),
          }),
        ],
        "BackRowReceive"
      ),
      // After pass: move to attack position if front row
      Sequence(
        [
          Condition({
            name: "IsServeReceive",
            description: "Are we receiving the serve?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SERVE_RECEIVE",
          }),
          Condition({
            name: "OneTouch",
            description: "Has the ball been passed?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 1,
          }),
          Condition({
            name: "IsFrontRow",
            description: "Am I in the front row?",
            check: (ctx) => isFrontRow(ctx.blackboard, ctx.self),
          }),
          Action({
            name: "ApproachAfterPassAction",
            description: "Start approach to attack after pass",
            fn: (ctx) => ({
              status: "SUCCESS",
              intents: [
                createGoalIntent(
                  ctx.self.id,
                  "ApproachAttackRight",
                  "Pass is up, I'm front row opposite, approaching to attack right side.",
                  "AI"
                ),
              ],
              note: "Approach after pass",
            }),
          }),
        ],
        "ApproachAfterPass"
      ),
    ],
    "ServeReceiveBehavior"
  );

  const SetPhaseAttack: BTNode = Sequence(
    [
      Condition({
        name: "IsSetPhase",
        description: "Is it time to set the ball?",
        check: (ctx) => ctx.blackboard.fsm.phase === "SET_PHASE",
      }),
      Condition({
        name: "IsFrontRow",
        description: "Am I in the front row?",
        check: (ctx) => isFrontRow(ctx.blackboard, ctx.self),
      }),
      Action({
        name: "ApproachAttackAction",
        description: "Approach the net to attack right side",
        fn: (ctx) => ({
          status: "SUCCESS",
          intents: [
            createGoalIntent(
              ctx.self.id,
              "ApproachAttackRight",
              "I'm approaching right-side because it's set phase and I'm front row.",
              "AI"
            ),
          ],
          note: "Approach right",
        }),
      }),
    ],
    "SetPhaseAttack"
  );

  const DefenseBehavior: BTNode = Sequence(
    [
      Condition({
        name: "IsDefensePhase",
        description: "Is the opponent attacking?",
        check: (ctx) => ctx.blackboard.fsm.phase === "DEFENSE_PHASE",
      }),
      Selector(
        [
          Sequence(
            [
              Condition({
                name: "IsFrontRow",
                description: "Am I in the front row?",
                check: (ctx) => isFrontRow(ctx.blackboard, ctx.self),
              }),
              Action({
                name: "FrontRowDefenseAction",
                description: "Block or cover tips based on attack direction",
                fn: (ctx) => {
                  const attackLane = ctx.blackboard.opponent.attack_lane;
                  const shouldBlock = attackLane === "right";

                  if (shouldBlock) {
                    return {
                      status: "SUCCESS",
                      intents: [
                        createGoalIntent(
                          ctx.self.id,
                          "BlockRightSide",
                          "I'm blocking right side - attack is coming from their left outside.",
                          "AI"
                        ),
                      ],
                      note: "Block right",
                    };
                  } else {
                    return {
                      status: "SUCCESS",
                      intents: [
                        createGoalIntent(
                          ctx.self.id,
                          "CoverTips",
                          `I'm covering tips - attack is ${attackLane}, not my blocking assignment.`,
                          "AI"
                        ),
                      ],
                      note: "Cover tips",
                    };
                  }
                },
              }),
            ],
            "FrontRowDefense"
          ),
          Action({
            name: "BackRowDefenseAction",
            description: "Defend from the back row",
            fn: (ctx) => ({
              status: "SUCCESS",
              intents: [
                createGoalIntent(
                  ctx.self.id,
                  "DefendZoneBiasRightBack",
                  "I'm defending right-back because I'm back row in defense.",
                  "AI"
                ),
              ],
              note: "Defend right back",
            }),
          }),
        ],
        "DefenseSelector"
      ),
    ],
    "DefenseBehavior"
  );

  const MaintainBaseResponsibility: BTNode = Sequence(
    [
      Condition({
        name: "Always",
        description: "Always true - fallback behavior",
        check: () => true,
      }),
      Action({
        name: "BaseResponsibilityAction",
        description: "Return to base position when nothing else to do",
        fn: (ctx) => ({
          status: "SUCCESS",
          intents: [
            createGoalIntent(
              ctx.self.id,
              "MaintainBaseResponsibility",
              "I'm holding base until I'm needed to block or attack.",
              "AI"
            ),
          ],
          note: "Base responsibility",
        }),
      }),
    ],
    "MaintainBaseResponsibility"
  );

  return Selector(
    [
      HandleOverrideGoal,
      ServingBehavior,
      ServeReceiveBehavior,
      SetPhaseAttack,
      DefenseBehavior,
      MaintainBaseResponsibility,
    ],
    "OppositeTree"
  );
};

export const createMiddleTree = (): BTNode => {
  const HandleOverrideGoal = createHandleOverrideGoal();
  const ServingBehavior = createServingBehavior();

  // Serve receive behavior for Middle (per 5-1 Paper):
  // - Front row: Crouch or slide near the stack to stay out of passers' way
  // - Back row: In 5-1, middle is typically replaced by libero when back row
  const ServeReceiveBehavior: BTNode = Selector(
    [
      // Front row: Hide near the stack (crouch or slide to edge)
      Sequence(
        [
          Condition({
            name: "IsServeReceive",
            description: "Are we receiving the serve?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SERVE_RECEIVE",
          }),
          Condition({
            name: "NoTouch",
            description: "Has nobody touched the ball yet?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 0,
          }),
          Condition({
            name: "IsFrontRow",
            description: "Am I in the front row?",
            check: (ctx) => isFrontRow(ctx.blackboard, ctx.self),
          }),
          Action({
            name: "HideNearStackAction",
            description: "Stay low near stack to avoid getting in passers' way",
            fn: (ctx) => ({
              status: "SUCCESS",
              intents: [
                createGoalIntent(
                  ctx.self.id,
                  "FrontRowMiddleHideReceive",
                  "I'm crouching/sliding near the stack to stay out of passers' way.",
                  "AI"
                ),
              ],
              note: "Hide near stack",
            }),
          }),
        ],
        "FrontRowHide"
      ),
      // Back row: Maintain base (typically libero replaces middle back row)
      Sequence(
        [
          Condition({
            name: "IsServeReceive",
            description: "Are we receiving the serve?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SERVE_RECEIVE",
          }),
          Condition({
            name: "NoTouch",
            description: "Has nobody touched the ball yet?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 0,
          }),
          Condition({
            name: "IsBackRow",
            description: "Am I in the back row?",
            check: (ctx) => isBackRow(ctx.blackboard, ctx.self),
          }),
          Action({
            name: "BackRowBaseAction",
            description: "Hold base position (usually replaced by libero)",
            fn: (ctx) => ({
              status: "SUCCESS",
              intents: [
                createGoalIntent(
                  ctx.self.id,
                  "MaintainBaseResponsibility",
                  "I'm back row middle (should be replaced by libero in 5-1).",
                  "AI"
                ),
              ],
              note: "Back row base",
            }),
          }),
        ],
        "BackRowBase"
      ),
      // After pass: approach for quick if front row
      Sequence(
        [
          Condition({
            name: "IsServeReceive",
            description: "Are we receiving the serve?",
            check: (ctx) => ctx.blackboard.fsm.phase === "SERVE_RECEIVE",
          }),
          Condition({
            name: "OneTouch",
            description: "Has the ball been passed?",
            check: (ctx) => ctx.blackboard.ball.touch_count === 1,
          }),
          Condition({
            name: "IsFrontRow",
            description: "Am I in the front row?",
            check: (ctx) => isFrontRow(ctx.blackboard, ctx.self),
          }),
          Action({
            name: "ApproachForQuickAction",
            description: "Start quick attack approach",
            fn: (ctx) => ({
              status: "SUCCESS",
              intents: [
                createGoalIntent(
                  ctx.self.id,
                  "ApproachAttackMiddle",
                  "Pass is up, I'm front row middle, approaching for a quick.",
                  "AI"
                ),
              ],
              note: "Approach for quick",
            }),
          }),
        ],
        "ApproachForQuick"
      ),
    ],
    "ServeReceiveBehavior"
  );

  const SetPhaseAttack: BTNode = Sequence(
    [
      Condition({
        name: "IsSetPhase",
        description: "Is it time to set the ball?",
        check: (ctx) => ctx.blackboard.fsm.phase === "SET_PHASE",
      }),
      Condition({
        name: "IsFrontRow",
        description: "Am I in the front row?",
        check: (ctx) => isFrontRow(ctx.blackboard, ctx.self),
      }),
      Action({
        name: "ApproachAttackAction",
        description: "Approach for a quick attack in the middle",
        fn: (ctx) => ({
          status: "SUCCESS",
          intents: [
            createGoalIntent(
              ctx.self.id,
              "ApproachAttackMiddle",
              "I'm approaching middle for a quick because it's set phase and I'm front row.",
              "AI"
            ),
          ],
          note: "Approach middle",
        }),
      }),
    ],
    "SetPhaseAttack"
  );

  const DefenseBehavior: BTNode = Sequence(
    [
      Condition({
        name: "IsDefensePhase",
        description: "Is the opponent attacking?",
        check: (ctx) => ctx.blackboard.fsm.phase === "DEFENSE_PHASE",
      }),
      Selector(
        [
          // Front row middle: Read blocking - move to where ball is set
          Sequence(
            [
              Condition({
                name: "IsFrontRow",
                description: "Am I in the front row?",
                check: (ctx) => isFrontRow(ctx.blackboard, ctx.self),
              }),
              Action({
                name: "ReadBlockAction",
                description: "Read the set and slide to close the block",
                fn: (ctx) => {
                  const attackLane = ctx.blackboard.opponent.attack_lane;
                  const isQuickSet = !isBallHighSet(ctx.blackboard);

                  // Determine blocking goal based on where ball is going
                  let blockGoal: GoalType;
                  let reason: string;

                  if (isBallHeadedToZone(ctx.blackboard, "left")) {
                    blockGoal = "BlockLeftSide";
                    reason = "Reading set to left side - sliding left to close the block.";
                  } else if (isBallHeadedToZone(ctx.blackboard, "right")) {
                    blockGoal = "BlockRightSide";
                    reason = "Reading set to right side - sliding right to close the block.";
                  } else {
                    blockGoal = "BlockMiddle";
                    reason = isQuickSet
                      ? "Quick set middle - jumping with the hitter!"
                      : "Reading middle attack - positioning to block.";
                  }

                  return {
                    status: "SUCCESS",
                    intents: [
                      createGoalIntent(
                        ctx.self.id,
                        blockGoal,
                        reason,
                        "AI"
                      ),
                    ],
                    note: `Block ${attackLane}`,
                  };
                },
              }),
            ],
            "FrontRowReadBlock"
          ),
          // Back row: Transition off net to approach for quick if ball is on our side
          Sequence(
            [
              Condition({
                name: "IsBackRow",
                description: "Am I in the back row?",
                check: (ctx) => isBackRow(ctx.blackboard, ctx.self),
              }),
              Condition({
                name: "BallOnOurSideWithTouch",
                description: "Is the ball on our side and has been touched?",
                check: (ctx) => ctx.blackboard.ball.on_our_side && ctx.blackboard.ball.touch_count >= 1,
              }),
              Action({
                name: "TransitionOffNetAction",
                description: "Move off net to prepare for transition play",
                fn: (ctx) => ({
                  status: "SUCCESS",
                  intents: [
                    createGoalIntent(
                      ctx.self.id,
                      "MaintainBaseResponsibility",
                      "Back row middle - transitioning off net for possible quick approach.",
                      "AI"
                    ),
                  ],
                  note: "Transition off net",
                }),
              }),
            ],
            "BackRowTransition"
          ),
          Action({
            name: "BackRowBaseAction",
            description: "Hold back row defensive position",
            fn: (ctx) => ({
              status: "SUCCESS",
              intents: [
                createGoalIntent(
                  ctx.self.id,
                  "MaintainBaseResponsibility",
                  "I'm off the net in defense because I'm not front row.",
                  "AI"
                ),
              ],
              note: "Back row base",
            }),
          }),
        ],
        "DefenseSelector"
      ),
    ],
    "DefenseBehavior"
  );

  const MaintainBaseResponsibility: BTNode = Sequence(
    [
      Condition({
        name: "Always",
        description: "Always true - fallback behavior",
        check: () => true,
      }),
      Action({
        name: "BaseResponsibilityAction",
        description: "Return to base position when nothing else to do",
        fn: (ctx) => ({
          status: "SUCCESS",
          intents: [
            createGoalIntent(
              ctx.self.id,
              "MaintainBaseResponsibility",
              "I'm resetting to base until I'm needed for a quick or a block.",
              "AI"
            ),
          ],
          note: "Base responsibility",
        }),
      }),
    ],
    "MaintainBaseResponsibility"
  );

  return Selector(
    [
      HandleOverrideGoal,
      ServingBehavior,
      ServeReceiveBehavior,
      SetPhaseAttack,
      DefenseBehavior,
      MaintainBaseResponsibility,
    ],
    "MiddleTree"
  );
};

export const createLiberoTree = (): BTNode => {
  const HandleOverrideGoal = createHandleOverrideGoal();

  const EmergencyBallControl: BTNode = Sequence(
    [
      Condition({
        name: "BallOnOurSide",
        description: "Is the ball on our side of the court?",
        check: (ctx) => ctx.blackboard.ball.on_our_side,
      }),
      Condition({
        name: "NoTouch",
        description: "Has nobody touched the ball yet?",
        check: (ctx) => ctx.blackboard.ball.touch_count === 0,
      }),
      Condition({
        name: "CanReachFirst",
        description: "Can I get to the ball before anyone else?",
        check: (ctx) =>
          canReachBallBeforeOthers({
            bb: ctx.blackboard,
            self: ctx.self,
            allPlayers: ctx.allPlayers,
            priorityBias: -2,
          }),
      }),
      Action({
        name: "ReceiveServeAction",
        description: "Pass the serve as primary passer",
        fn: (ctx) => ({
          status: "SUCCESS",
          intents: [
            createGoalIntent(
              ctx.self.id,
              "ReceiveServe",
              "I'm passing because I'm the primary passer and I can reach the serve first.",
              "AI"
            ),
          ],
          note: "Receive serve",
        }),
      }),
    ],
    "EmergencyBallControl"
  );

  const ServeReceiveBehavior: BTNode = Sequence(
    [
      Condition({
        name: "IsServeReceive",
        description: "Are we receiving the serve?",
        check: (ctx) => ctx.blackboard.fsm.phase === "SERVE_RECEIVE",
      }),
      Selector(
        [EmergencyBallControl, RequestGoal({ type: "MaintainBaseResponsibility" })],
        "ReceiveOrBase"
      ),
    ],
    "ServeReceiveBehavior"
  );

  // Defense behavior for Libero (per 5-1 Paper):
  // - Covers middle-back, but shifts with ball position
  // - "covers the back line from pin to pin"
  // - Reads hitter's approach and shoulder angle
  const DefenseBehavior: BTNode = Sequence(
    [
      Condition({
        name: "IsDefensePhase",
        description: "Is the opponent attacking?",
        check: (ctx) => ctx.blackboard.fsm.phase === "DEFENSE_PHASE",
      }),
      Action({
        name: "DefendWithBiasAction",
        description: "Defend back row, shifting based on attack direction",
        fn: (ctx) => {
          // Libero covers middle-back, shifts with ball/attack position
          const ballX = ctx.blackboard.ball.position.x;
          const attackLane = ctx.blackboard.opponent.attack_lane;
          const isHighSet = isBallHighSet(ctx.blackboard);

          // Determine defense bias based on attack lane and ball position
          let biasedGoal: GoalType;
          let reason: string;

          // For high sets, we have more time to read and position
          // For quick sets, stay more central
          if (!isHighSet) {
            biasedGoal = "DefendZoneBiasMiddleBack";
            reason = "Quick attack incoming - staying central to react either way.";
          } else if (attackLane === "left" || ballX < 0.35) {
            biasedGoal = "DefendZoneBiasLeftBack";
            reason = "High ball to left side - shifting left to cover cross-court.";
          } else if (attackLane === "right" || ballX > 0.65) {
            biasedGoal = "DefendZoneBiasRightBack";
            reason = "High ball to right side - shifting right to cover cross-court.";
          } else {
            biasedGoal = "DefendZoneBiasMiddleBack";
            reason = "I'm anchoring middle-back to cover the floor.";
          }

          return {
            status: "SUCCESS",
            intents: [
              createGoalIntent(
                ctx.self.id,
                biasedGoal,
                reason,
                "AI"
              ),
            ],
            note: `Defend ${biasedGoal.replace("DefendZoneBias", "").toLowerCase()}`,
          };
        },
      }),
    ],
    "DefenseBehavior"
  );

  const MaintainBaseResponsibility: BTNode = Sequence(
    [
      Condition({
        name: "Always",
        description: "Always true - fallback behavior",
        check: () => true,
      }),
      Action({
        name: "BaseResponsibilityAction",
        description: "Return to base position when nothing else to do",
        fn: (ctx) => ({
          status: "SUCCESS",
          intents: [
            createGoalIntent(
              ctx.self.id,
              "MaintainBaseResponsibility",
              "I'm holding base until I need to dig or pass.",
              "AI"
            ),
          ],
          note: "Base responsibility",
        }),
      }),
    ],
    "MaintainBaseResponsibility"
  );

  return Selector(
    [
      HandleOverrideGoal,
      ServeReceiveBehavior,
      DefenseBehavior,
      MaintainBaseResponsibility,
    ],
    "LiberoTree"
  );
};
