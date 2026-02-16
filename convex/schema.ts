import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  teams: defineTable({
    userId: v.optional(v.id("users")), // Owner of the team
    name: v.string(),
    slug: v.string(),
    password: v.optional(v.string()),
    archived: v.boolean(),
    roster: v.array(
      v.object({
        id: v.string(),
        name: v.optional(v.string()),
        number: v.optional(v.number()),
      })
    ),
    lineups: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        position_assignments: v.record(v.string(), v.string()),
        position_source: v.optional(v.string()),
        created_at: v.string(),
      })
    ),
    activeLineupId: v.optional(v.string()),
    // Deprecated but kept for backward compatibility
    positionAssignments: v.record(v.string(), v.string()), // {role: playerId}
  })
    .index("by_slug", ["slug"])
    .index("by_archived", ["archived"])
    .index("by_user", ["userId"])
    .searchIndex("search_name", { searchField: "name" }),

  customLayouts: defineTable({
    teamId: v.id("teams"),
    rotation: v.number(), // 1-6
    phase: v.string(), // 'PRE_SERVE', 'SERVE_RECEIVE', etc.
    positions: v.record(
      v.string(),
      v.object({ x: v.number(), y: v.number() })
    ), // {role: {x, y}}
    // Extended data (arrows, status tags, curves, attack ball)
    flags: v.optional(
      v.object({
        arrows: v.optional(
          v.record(v.string(), v.union(v.object({ x: v.number(), y: v.number() }), v.null()))
        ),
        arrowFlips: v.optional(v.record(v.string(), v.boolean())),
        arrowCurves: v.optional(
          v.record(v.string(), v.object({ x: v.number(), y: v.number() }))
        ),
        statusFlags: v.optional(v.record(v.string(), v.array(v.string()))),
        tagFlags: v.optional(v.record(v.string(), v.array(v.string()))),
        attackBallPosition: v.optional(
          v.union(v.object({ x: v.number(), y: v.number() }), v.null())
        ),
      })
    ),
  })
    .index("by_team", ["teamId"])
    .index("by_team_rotation_phase", ["teamId", "rotation", "phase"]),

  userSettings: defineTable({
    userId: v.id("users"),
    themePreference: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("auto"))),
    showPosition: v.boolean(),
    showPlayer: v.boolean(),
    showLibero: v.boolean(),
    circleTokens: v.boolean(),
    hideAwayTeam: v.boolean(),
    fullStatusLabels: v.boolean(),
    showLearnTab: v.boolean(),
    debugHitboxes: v.boolean(),
    isReceivingContext: v.boolean(),
    tokenSize: v.union(v.literal("big"), v.literal("small")),
    navMode: v.union(v.literal("sidebar"), v.literal("header")),
    backgroundShader: v.string(),
    backgroundOpacity: v.number(),
    awayTeamHidePercent: v.number(),
    visiblePhases: v.array(v.string()),
    phaseOrder: v.array(v.string()),
    highlightedRole: v.optional(v.string()),
    learningPanelPosition: v.string(),
    updatedAt: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  suggestionSubmissions: defineTable({
    userId: v.id("users"),
    submitterName: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user_createdAt", ["userId", "createdAt"]),
});
