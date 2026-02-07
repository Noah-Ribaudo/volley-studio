import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";

// Helper to verify the current user owns the team
async function assertTeamOwnerForLayout(
  ctx: MutationCtx | QueryCtx,
  teamId: Id<"teams">
) {
  const userId = await auth.getUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const team = await ctx.db.get(teamId);
  if (!team) {
    throw new Error("Team not found");
  }

  if (team.userId !== userId) {
    throw new Error("Unauthorized: You don't own this team");
  }

  return { userId, team };
}

// Get all layouts for a team
export const getByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    try {
      await assertTeamOwnerForLayout(ctx, args.teamId);
    } catch {
      return [];
    }

    return await ctx.db
      .query("customLayouts")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

// Get a specific layout by team, rotation, and phase
export const getByRotationPhase = query({
  args: {
    teamId: v.id("teams"),
    rotation: v.number(),
    phase: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      await assertTeamOwnerForLayout(ctx, args.teamId);
    } catch {
      return null;
    }

    return await ctx.db
      .query("customLayouts")
      .withIndex("by_team_rotation_phase", (q) =>
        q.eq("teamId", args.teamId).eq("rotation", args.rotation).eq("phase", args.phase)
      )
      .first();
  },
});

// Upsert a layout (insert or update)
export const save = mutation({
  args: {
    teamId: v.id("teams"),
    rotation: v.number(),
    phase: v.string(),
    positions: v.record(
      v.string(),
      v.object({ x: v.number(), y: v.number() })
    ),
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
  },
  handler: async (ctx, args) => {
    // Verify user owns this team
    await assertTeamOwnerForLayout(ctx, args.teamId);

    // Check if layout already exists
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
      // Insert new layout
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
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const layout = await ctx.db.get(args.id);
    if (!layout) {
      throw new Error("Layout not found");
    }

    const team = await ctx.db.get(layout.teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    if (team.userId !== userId) {
      throw new Error("Unauthorized: You don't own this team");
    }

    await ctx.db.delete(args.id);
  },
});

// Delete all layouts for a team
export const removeAllForTeam = mutation({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    // Verify user owns this team
    await assertTeamOwnerForLayout(ctx, args.teamId);

    const layouts = await ctx.db
      .query("customLayouts")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    for (const layout of layouts) {
      await ctx.db.delete(layout._id);
    }
  },
});
