import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

// Get all non-archived teams
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("teams")
      .withIndex("by_archived", (q) => q.eq("archived", false))
      .collect();
  },
});

// Get a team by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Get a team by ID
export const get = query({
  args: { id: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Search teams by name
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    if (!args.query.trim()) {
      // Return all non-archived teams if no query
      return await ctx.db
        .query("teams")
        .withIndex("by_archived", (q) => q.eq("archived", false))
        .collect();
    }
    // Use search index for name matching
    const results = await ctx.db
      .query("teams")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();
    return results;
  },
});

// Get teams owned by the current user
export const listMyTeams = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return [];
    }
    return await ctx.db
      .query("teams")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();
  },
});

// Create a new team
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the current user (if signed in)
    const userId = await auth.getUserId(ctx);

    // Check if slug already exists
    const existing = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new Error("A team with this slug already exists");
    }

    return await ctx.db.insert("teams", {
      userId: userId ?? undefined,
      name: args.name,
      slug: args.slug,
      password: args.password,
      archived: false,
      roster: [],
      lineups: [],
      activeLineupId: undefined,
      positionAssignments: {},
    });
  },
});

// Update team details
export const update = mutation({
  args: {
    id: v.id("teams"),
    name: v.optional(v.string()),
    password: v.optional(v.string()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filteredUpdates);
  },
});

// Update team roster
export const updateRoster = mutation({
  args: {
    id: v.id("teams"),
    roster: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        number: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { roster: args.roster });
  },
});

// Update position assignments
export const updatePositionAssignments = mutation({
  args: {
    id: v.id("teams"),
    positionAssignments: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      positionAssignments: args.positionAssignments,
    });
  },
});

// Delete a team
export const remove = mutation({
  args: { id: v.id("teams") },
  handler: async (ctx, args) => {
    // Delete all custom layouts for this team first
    const layouts = await ctx.db
      .query("customLayouts")
      .withIndex("by_team", (q) => q.eq("teamId", args.id))
      .collect();

    for (const layout of layouts) {
      await ctx.db.delete(layout._id);
    }

    await ctx.db.delete(args.id);
  },
});

// Verify team password
export const verifyPassword = query({
  args: {
    id: v.id("teams"),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.id);
    if (!team) return false;
    if (!team.password) return true; // No password set
    return team.password === args.password;
  },
});

// Clone a team by ID (for importing via team code)
export const clone = mutation({
  args: { id: v.id("teams") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    const original = await ctx.db.get(args.id);
    if (!original) {
      throw new Error("Team not found");
    }

    // Generate a unique slug for the copy
    const baseSlug = `${original.slug}_copy`;
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await ctx.db
        .query("teams")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!existing) break;
      slug = `${baseSlug}_${counter}`;
      counter++;
    }

    // Create the copy with a new name, owned by current user
    const newTeamId = await ctx.db.insert("teams", {
      userId: userId ?? undefined,
      name: `${original.name} (Copy)`,
      slug,
      archived: false,
      roster: original.roster,
      lineups: original.lineups,
      activeLineupId: original.activeLineupId,
      positionAssignments: original.positionAssignments,
    });

    // Also copy custom layouts if any exist
    const layouts = await ctx.db
      .query("customLayouts")
      .withIndex("by_team", (q) => q.eq("teamId", args.id))
      .collect();

    for (const layout of layouts) {
      await ctx.db.insert("customLayouts", {
        teamId: newTeamId,
        rotation: layout.rotation,
        phase: layout.phase,
        positions: layout.positions,
        flags: layout.flags,
      });
    }

    return newTeamId;
  },
});

// Debug query - lists all teams without any index
export const debugList = query({
  args: {},
  handler: async (ctx) => {
    const allTeams = await ctx.db.query("teams").collect();
    return {
      count: allTeams.length,
      teams: allTeams,
    };
  },
});
