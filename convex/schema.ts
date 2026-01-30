import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  teams: defineTable({
    name: v.string(),
    slug: v.string(),
    password: v.optional(v.string()),
    archived: v.boolean(),
    roster: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
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
    .searchIndex("search_name", { searchField: "name" }),

  customLayouts: defineTable({
    teamId: v.id("teams"),
    rotation: v.number(), // 1-6
    phase: v.string(), // 'serve', 'receive', 'attack', 'defense'
    positions: v.record(
      v.string(),
      v.object({ x: v.number(), y: v.number() })
    ), // {role: {x, y}}
    flags: v.optional(v.record(v.string(), v.array(v.string()))), // {role: ['attacking-1', ...]}
  })
    .index("by_team", ["teamId"])
    .index("by_team_rotation_phase", ["teamId", "rotation", "phase"]),
});
