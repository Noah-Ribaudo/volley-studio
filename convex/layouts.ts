import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";

function buildLayoutKey(teamId: Id<"teams">, rotation: number, phase: string): string {
  return `${teamId}:${rotation}:${phase}`;
}

function pickMostRecentLayout<
  T extends {
    _creationTime: number;
  }
>(layouts: T[]): T {
  let mostRecent = layouts[0];
  for (const layout of layouts) {
    if (layout._creationTime > mostRecent._creationTime) {
      mostRecent = layout;
    }
  }
  return mostRecent;
}

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

    const layouts = await ctx.db
      .query("customLayouts")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    if (layouts.length <= 1) {
      return layouts;
    }

    // Defensive dedupe: always return at most one document per team+rotation+phase.
    const deduped = new Map<string, (typeof layouts)[number]>();
    for (const layout of layouts) {
      const key = buildLayoutKey(layout.teamId, layout.rotation, layout.phase);
      const existing = deduped.get(key);
      if (!existing || layout._creationTime > existing._creationTime) {
        deduped.set(key, layout);
      }
    }

    return Array.from(deduped.values());
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

    const matches = await ctx.db
      .query("customLayouts")
      .withIndex("by_team_rotation_phase", (q) =>
        q.eq("teamId", args.teamId).eq("rotation", args.rotation).eq("phase", args.phase)
      )
      .collect();

    if (matches.length === 0) {
      return null;
    }

    return pickMostRecentLayout(matches);
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

    // Check if layout already exists. We collect defensively to recover from
    // any historical duplicates, then keep only the most recent document.
    const existingLayouts = await ctx.db
      .query("customLayouts")
      .withIndex("by_team_rotation_phase", (q) =>
        q.eq("teamId", args.teamId).eq("rotation", args.rotation).eq("phase", args.phase)
      )
      .collect();

    if (existingLayouts.length > 0) {
      const mostRecent = pickMostRecentLayout(existingLayouts);

      // Update the canonical layout document.
      await ctx.db.patch(mostRecent._id, {
        positions: args.positions,
        flags: args.flags,
      });

      // Remove duplicates for the same key so each rotation/phase maps to one row.
      for (const layout of existingLayouts) {
        if (layout._id !== mostRecent._id) {
          await ctx.db.delete(layout._id);
        }
      }

      return mostRecent._id;
    }

    // Insert new layout
    return await ctx.db.insert("customLayouts", {
      teamId: args.teamId,
      rotation: args.rotation,
      phase: args.phase,
      positions: args.positions,
      flags: args.flags,
    });
  },
});

// Repair utility: remove duplicate layout documents for a team so each
// team+rotation+phase combination maps to exactly one row.
export const dedupeTeamLayouts = mutation({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    await assertTeamOwnerForLayout(ctx, args.teamId);

    const layouts = await ctx.db
      .query("customLayouts")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const grouped = new Map<string, (typeof layouts)>();
    for (const layout of layouts) {
      const key = buildLayoutKey(layout.teamId, layout.rotation, layout.phase);
      const existing = grouped.get(key);
      if (existing) {
        existing.push(layout);
      } else {
        grouped.set(key, [layout]);
      }
    }

    let removed = 0;
    for (const group of grouped.values()) {
      if (group.length <= 1) continue;

      const mostRecent = pickMostRecentLayout(group);
      for (const layout of group) {
        if (layout._id !== mostRecent._id) {
          await ctx.db.delete(layout._id);
          removed++;
        }
      }
    }

    return {
      total: layouts.length,
      removed,
      remaining: layouts.length - removed,
    };
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
