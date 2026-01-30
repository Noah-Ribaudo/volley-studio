import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

// Create a new team
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if slug already exists
    const existing = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new Error("A team with this slug already exists");
    }

    return await ctx.db.insert("teams", {
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
