import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all layouts for a team
export const listByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customLayouts")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

// Get a specific layout by team, rotation, and phase
export const getLayout = query({
  args: {
    teamId: v.id("teams"),
    rotation: v.number(),
    phase: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customLayouts")
      .withIndex("by_team_rotation_phase", (q) =>
        q.eq("teamId", args.teamId).eq("rotation", args.rotation).eq("phase", args.phase)
      )
      .first();
  },
});

// Create or update a layout (upsert)
export const upsert = mutation({
  args: {
    teamId: v.id("teams"),
    rotation: v.number(),
    phase: v.string(),
    positions: v.record(
      v.string(),
      v.object({ x: v.number(), y: v.number() })
    ),
    flags: v.optional(v.record(v.string(), v.array(v.string()))),
  },
  handler: async (ctx, args) => {
    // Check if layout exists
    const existing = await ctx.db
      .query("customLayouts")
      .withIndex("by_team_rotation_phase", (q) =>
        q.eq("teamId", args.teamId).eq("rotation", args.rotation).eq("phase", args.phase)
      )
      .first();

    if (existing) {
      // Update existing layout
      await ctx.db.patch(existing._id, {
        positions: args.positions,
        flags: args.flags,
      });
      return existing._id;
    } else {
      // Create new layout
      return await ctx.db.insert("customLayouts", {
        teamId: args.teamId,
        rotation: args.rotation,
        phase: args.phase,
        positions: args.positions,
        flags: args.flags,
      });
    }
  },
});

// Delete a specific layout
export const remove = mutation({
  args: { id: v.id("customLayouts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Delete all layouts for a team (used when deleting a team)
export const removeAllForTeam = mutation({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const layouts = await ctx.db
      .query("customLayouts")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    for (const layout of layouts) {
      await ctx.db.delete(layout._id);
    }
  },
});
