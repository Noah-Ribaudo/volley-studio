import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";
import { Scrypt } from "lucia";

// Password hashing using Scrypt (same algorithm used by @convex-dev/auth)
const scrypt = new Scrypt();

// Check if a password string looks like it's already hashed
// Scrypt hashes are formatted as: $scrypt$N=...,r=...,p=...$salt$hash
function isHashed(password: string): boolean {
  return password.startsWith("$scrypt$") || password.length > 80;
}

// Helper to hash a password
async function hashPassword(password: string): Promise<string> {
  return await scrypt.hash(password);
}

// Helper to verify a password against a hash
async function verifyPasswordHash(
  hash: string,
  password: string
): Promise<boolean> {
  return await scrypt.verify(hash, password);
}

// Type for team document from database
type TeamDoc = {
  _id: Id<"teams">;
  _creationTime: number;
  userId?: Id<"users">;
  name: string;
  slug: string;
  password?: string;
  archived: boolean;
  roster: Array<{ id: string; name?: string; number?: number }>;
  lineups: Array<{
    id: string;
    name: string;
    position_assignments: Record<string, string>;
    position_source?: string;
    created_at: string;
  }>;
  activeLineupId?: string;
  positionAssignments: Record<string, string>;
};

const SEEDED_TEAM_SLUGS = new Set(["optimized_5_1_defaults", "beach_boys"]);

function isSeededTeam(team: TeamDoc): boolean {
  return SEEDED_TEAM_SLUGS.has(team.slug);
}

// Helper to sanitize team data - removes password, adds hasPassword boolean
function sanitizeTeam(team: TeamDoc) {
  const { password, ...rest } = team;
  return {
    ...rest,
    hasPassword: Boolean(password && password.trim() !== ""),
  };
}

type TeamCtx = MutationCtx | QueryCtx;

function canAccessTeam(team: TeamDoc, userId: Id<"users">): boolean {
  return team.userId === userId;
}

// Helper to verify the current user owns the team
// Returns the userId and team if authorized
// Throws an error if not authenticated or not the owner
async function assertTeamOwner(ctx: TeamCtx, teamId: Id<"teams">) {
  const userId = await auth.getUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const team = await ctx.db.get(teamId);
  if (!team) {
    throw new Error("Team not found");
  }

  if (!canAccessTeam(team, userId)) {
    throw new Error("Unauthorized: You don't own this team");
  }

  return { userId, team };
}

// Get all non-archived teams (sanitized - no password)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return [];
    }

    const teams = await ctx.db
      .query("teams")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();
    return teams.filter((team) => !isSeededTeam(team)).map(sanitizeTeam);
  },
});

// Get a team by slug (sanitized - no password)
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }

    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!team || !canAccessTeam(team, userId)) return null;
    return sanitizeTeam(team);
  },
});

// Get a team by ID (sanitized - no password)
export const get = query({
  args: { id: v.id("teams") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }

    const team = await ctx.db.get(args.id);
    if (!team || !canAccessTeam(team, userId)) return null;
    return sanitizeTeam(team);
  },
});

// Get a team by slug or ID (sanitized - no password)
export const getBySlugOrId = query({
  args: { identifier: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }

    let team: TeamDoc | null = null;
    try {
      team = await ctx.db.get(args.identifier as Id<"teams">);
    } catch {
      team = null;
    }

    if (!team) {
      team = await ctx.db
        .query("teams")
        .withIndex("by_slug", (q) => q.eq("slug", args.identifier))
        .first();
    }

    if (!team || !canAccessTeam(team, userId)) return null;
    return sanitizeTeam(team);
  },
});

// Search teams by name (sanitized - no password)
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return [];
    }

    let teams;
    if (!args.query.trim()) {
      teams = await ctx.db
        .query("teams")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("archived"), false))
        .collect();
    } else {
      teams = await ctx.db
        .query("teams")
        .withSearchIndex("search_name", (q) => q.search("name", args.query))
        .filter((q) =>
          q.and(
            q.eq(q.field("archived"), false),
            q.eq(q.field("userId"), userId)
          )
        )
        .collect();
    }
    return teams.filter((team) => !isSeededTeam(team)).map(sanitizeTeam);
  },
});

// Get teams owned by the current user (sanitized - no password)
export const listMyTeams = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return [];
    }
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();
    return teams.filter((team) => !isSeededTeam(team)).map(sanitizeTeam);
  },
});

// Create a new team (password is hashed before storing)
// Requires authentication - no anonymous teams allowed
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    password: v.optional(v.string()),
    presetSystem: v.optional(v.union(
      v.literal("full-5-1"),
      v.literal("5-1-libero"),
      v.literal("6-2")
    )),
  },
  handler: async (ctx, args) => {
    // Require authentication to create teams
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Sign in required to create a team");
    }

    // Check if slug already exists
    const existing = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new Error("A team with this slug already exists");
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (args.password && args.password.trim() !== "") {
      hashedPassword = await hashPassword(args.password);
    }

    const now = new Date().toISOString();
    const initialLineupId = crypto.randomUUID();

    return await ctx.db.insert("teams", {
      userId,
      name: args.name,
      slug: args.slug,
      password: hashedPassword,
      archived: false,
      roster: [],
      lineups: [{
        id: initialLineupId,
        name: "Lineup 1",
        position_assignments: {},
        position_source: args.presetSystem,
        created_at: now,
      }],
      activeLineupId: initialLineupId,
      positionAssignments: {},
    });
  },
});

// Update team details (password is hashed if being changed)
export const update = mutation({
  args: {
    id: v.id("teams"),
    name: v.optional(v.string()),
    password: v.optional(v.union(v.string(), v.null())),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await assertTeamOwner(ctx, args.id);

    const { id, password, ...otherUpdates } = args;

    // Build updates object, excluding undefined values
    const updates: Record<string, unknown> = {};

    if (otherUpdates.name !== undefined) {
      updates.name = otherUpdates.name;
    }
    if (otherUpdates.archived !== undefined) {
      updates.archived = otherUpdates.archived;
    }

    // Handle password update
    if (password !== undefined) {
      if (password === null || password === "") {
        // Remove password
        updates.password = undefined;
      } else {
        // Hash new password
        updates.password = await hashPassword(password);
      }
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(id, updates);
    }
  },
});

// Update team roster
export const updateRoster = mutation({
  args: {
    id: v.id("teams"),
    roster: v.array(
      v.object({
        id: v.string(),
        name: v.optional(v.string()),
        number: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await assertTeamOwner(ctx, args.id);
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
    await assertTeamOwner(ctx, args.id);
    await ctx.db.patch(args.id, {
      positionAssignments: args.positionAssignments,
    });
  },
});

// Update lineups and active lineup in one mutation
export const updateLineups = mutation({
  args: {
    id: v.id("teams"),
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
    positionAssignments: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    await assertTeamOwner(ctx, args.id);
    const activeLineupId = args.activeLineupId &&
      args.lineups.some((lineup) => lineup.id === args.activeLineupId)
      ? args.activeLineupId
      : args.lineups[0]?.id;

    const activeLineup = activeLineupId
      ? args.lineups.find((lineup) => lineup.id === activeLineupId)
      : null;

    await ctx.db.patch(args.id, {
      lineups: args.lineups,
      activeLineupId,
      // Keep backward-compatible assignments in sync with the active lineup.
      positionAssignments: activeLineup?.position_assignments ?? args.positionAssignments,
    });
  },
});

// Delete a team
export const remove = mutation({
  args: { id: v.id("teams") },
  handler: async (ctx, args) => {
    await assertTeamOwner(ctx, args.id);

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

// Verify team password (mutation to prevent timing attacks)
// Also handles migration of unhashed passwords
export const verifyPassword = mutation({
  args: {
    id: v.id("teams"),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const { team } = await assertTeamOwner(ctx, args.id);

    // No password set means access is granted
    if (!team.password || team.password.trim() === "") {
      return true;
    }

    // Check if password is already hashed
    if (isHashed(team.password)) {
      // Verify against hash
      return await verifyPasswordHash(team.password, args.password);
    }

    // Legacy: password is stored in plain text
    // Compare directly, then migrate to hashed version on success
    const matches = team.password === args.password;
    if (matches) {
      // Migrate: hash the password for future security
      const hashedPassword = await hashPassword(args.password);
      await ctx.db.patch(args.id, { password: hashedPassword });
    }
    return matches;
  },
});

// Clone a team by ID (for importing via team code)
// Note: password is NOT copied to cloned team
// Requires authentication - no anonymous teams allowed
export const clone = mutation({
  args: {
    id: v.id("teams"),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require authentication to import teams
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Sign in required to import a team");
    }

    const original = await ctx.db.get(args.id);
    if (!original) {
      throw new Error("Team not found");
    }

    if (original.password && original.password.trim() !== "") {
      const providedPassword = args.password?.trim();
      if (!providedPassword) {
        throw new Error("Team password required");
      }

      let isValidPassword = false;
      if (isHashed(original.password)) {
        isValidPassword = await verifyPasswordHash(
          original.password,
          providedPassword
        );
      } else {
        isValidPassword = original.password === providedPassword;
        if (isValidPassword) {
          await ctx.db.patch(args.id, {
            password: await hashPassword(providedPassword),
          });
        }
      }

      if (!isValidPassword) {
        throw new Error("Invalid team password");
      }
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
    // Note: password is intentionally NOT copied
    const newTeamId = await ctx.db.insert("teams", {
      userId,
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
