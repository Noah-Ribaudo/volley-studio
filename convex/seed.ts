import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal admin/migration functions
 * These are NOT callable from the client - only from:
 * - Convex Dashboard
 * - Other server functions
 * - Scheduled jobs
 */

// Migration to assign unowned teams to a specific user by email
// Run this from the Convex Dashboard with: { "email": "coach@example.com" }
export const assignUnownedTeamsToUser = internalMutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the user by email
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) {
      throw new Error(`User with email ${args.email} not found`);
    }

    // Find all teams without an owner
    const allTeams = await ctx.db.query("teams").collect();
    const unownedTeams = allTeams.filter((team) => !team.userId);

    // Assign each unowned team to the user
    let assignedCount = 0;
    for (const team of unownedTeams) {
      await ctx.db.patch(team._id, { userId: user._id });
      assignedCount++;
    }

    return {
      message: `Assigned ${assignedCount} unowned teams to user ${args.email}`,
      userId: user._id,
      teamsAssigned: unownedTeams.map((t) => ({ id: t._id, name: t.name })),
    };
  },
});

// Clear all data (for development re-seeding)
export const clearAllData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Delete all layouts first (foreign key reference)
    const layouts = await ctx.db.query("customLayouts").collect();
    for (const layout of layouts) {
      await ctx.db.delete(layout._id);
    }

    // Delete all teams
    const teams = await ctx.db.query("teams").collect();
    for (const team of teams) {
      await ctx.db.delete(team._id);
    }

    return { message: `Cleared ${teams.length} teams and ${layouts.length} layouts` };
  },
});

// Migration to fix old-format flags (convert {role: [...]} to {statusFlags: {role: [...]}})
export const migrateLayoutFlags = internalMutation({
  args: {},
  handler: async (ctx) => {
    const layouts = await ctx.db.query("customLayouts").collect();
    let migrated = 0;

    for (const layout of layouts) {
      // Check if flags exists and is in the old format
      // Old format: { OPP: ["cannot-block", ...] }
      // New format: { statusFlags: { OPP: ["cannot-block", ...] } }
      if (layout.flags && !('statusFlags' in layout.flags) && !('arrows' in layout.flags)) {
        // This is the old format - convert it
        const oldFlags = layout.flags as unknown as Record<string, string[]>;
        const newFlags = { statusFlags: oldFlags };
        await ctx.db.patch(layout._id, { flags: newFlags });
        migrated++;
      }
    }

    return { message: `Migrated ${migrated} layouts` };
  },
});

// Migration script to seed data from Supabase export
export const seedFromSupabase = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if data already exists
    const existingTeams = await ctx.db.query("teams").collect();
    if (existingTeams.length > 0) {
      return { message: "Data already exists, skipping seed" };
    }

    // Beach Boys team
    const beachBoysId = await ctx.db.insert("teams", {
      name: "Beach Boys",
      slug: "beach_boys",
      archived: false,
      roster: [
        { id: "player-1765461077045", name: "Noah", number: 3 },
        { id: "player-1765461085891", name: "Lindy", number: 4 },
        { id: "player-1765464030840", name: "Hector", number: 5 },
        { id: "player-1765464021810", name: "Christian", number: 7 },
        { id: "player-1765464082172", name: "Paco", number: 8 },
        { id: "player-1765464036629", name: "Sandeep", number: 10 },
        { id: "player-1765463983679", name: "Glenn", number: 32 },
        { id: "player-1765464015316", name: "Adolfo", number: 90 },
      ],
      lineups: [
        {
          id: "94fa517a-11d1-4fa3-8a60-c3f485ad6b91",
          name: "Big Boys",
          created_at: "2026-01-19T17:13:27.421Z",
          position_assignments: {
            S: "player-1765464030840",
            MB1: "player-1765464021810",
            MB2: "player-1765464015316",
            OH1: "player-1765464082172",
            OH2: "player-1765464036629",
            OPP: "player-1765463983679",
          },
        },
        {
          id: "867a32de-7016-440c-b42a-5afc3678ac13",
          name: "Classic",
          created_at: "2026-01-19T17:15:13.579Z",
          position_assignments: {
            S: "player-1765464021810",
            MB1: "player-1765463983679",
            MB2: "player-1765464015316",
            OH1: "player-1765464036629",
            OH2: "player-1765464082172",
            OPP: "player-1765461077045",
          },
        },
      ],
      activeLineupId: "867a32de-7016-440c-b42a-5afc3678ac13",
      positionAssignments: {
        S: "player-1765464021810",
        MB1: "player-1765463983679",
        MB2: "player-1765464015316",
        OH1: "player-1765464036629",
        OH2: "player-1765464082172",
        OPP: "player-1765461077045",
      },
    });

    // Beach Boys layouts (coordinates are in 0-100, convert to 0-1)
    const beachBoysLayouts = [
      {
        rotation: 1,
        phase: "serve",
        positions: {
          S: { x: 0.85, y: 0.85 },
          MB1: { x: 0.50, y: 0.25 },
          MB2: { x: 0.50, y: 0.75 },
          OH1: { x: 0.75, y: 0.25 },
          OH2: { x: 0.187, y: 0.49 },
          OPP: { x: 0.196, y: 0.234 },
        },
        flags: { statusFlags: { OPP: ["cannot-block", "back-row-hit"] } },
      },
      {
        rotation: 2,
        phase: "serve",
        positions: {
          S: { x: 0.50, y: 0.85 },
          MB1: { x: 0.75, y: 0.448 },
          MB2: { x: 0.25, y: 0.75 },
          OH1: { x: 0.85, y: 0.85 },
          OH2: { x: 0.262, y: 0.472 },
          OPP: { x: 0.50, y: 0.459 },
        },
        flags: { statusFlags: { OPP: ["cannot-block", "back-row-hit"] } },
      },
    ];

    for (const layout of beachBoysLayouts) {
      await ctx.db.insert("customLayouts", {
        teamId: beachBoysId,
        rotation: layout.rotation,
        phase: layout.phase,
        positions: layout.positions,
        flags: layout.flags,
      });
    }

    // 5-1 Optimized Defaults team
    const defaultsId = await ctx.db.insert("teams", {
      name: "5-1 Optimized Defaults",
      slug: "optimized_5_1_defaults",
      archived: false,
      roster: [
        { id: "player-s", name: "Setter", number: 2 },
        { id: "player-oh1", name: "Outside 1", number: 7 },
        { id: "player-oh2", name: "Outside 2", number: 9 },
        { id: "player-mb1", name: "Middle 1", number: 5 },
        { id: "player-mb2", name: "Middle 2", number: 12 },
        { id: "player-opp", name: "Opposite", number: 11 },
      ],
      lineups: [],
      positionAssignments: {
        S: "player-s",
        MB1: "player-mb1",
        MB2: "player-mb2",
        OH1: "player-oh1",
        OH2: "player-oh2",
        OPP: "player-opp",
      },
    });

    // 5-1 Defaults layouts (convert 0-100 to 0-1)
    const defaultsLayouts = [
      { rotation: 1, phase: "serve", positions: { S: { x: 0.88, y: 0.92 }, MB1: { x: 0.52, y: 0.22 }, MB2: { x: 0.52, y: 0.78 }, OH1: { x: 0.78, y: 0.22 }, OH2: { x: 0.22, y: 0.78 }, OPP: { x: 0.24, y: 0.22 } } },
      { rotation: 1, phase: "receive", positions: { S: { x: 0.68, y: 0.56 }, MB1: { x: 0.52, y: 0.28 }, MB2: { x: 0.54, y: 0.72 }, OH1: { x: 0.78, y: 0.34 }, OH2: { x: 0.26, y: 0.68 }, OPP: { x: 0.24, y: 0.32 } } },
      { rotation: 1, phase: "attack", positions: { S: { x: 0.70, y: 0.36 }, MB1: { x: 0.50, y: 0.16 }, MB2: { x: 0.52, y: 0.64 }, OH1: { x: 0.80, y: 0.16 }, OH2: { x: 0.26, y: 0.60 }, OPP: { x: 0.22, y: 0.16 } } },
      { rotation: 1, phase: "defense", positions: { S: { x: 0.84, y: 0.84 }, MB1: { x: 0.50, y: 0.12 }, MB2: { x: 0.52, y: 0.74 }, OH1: { x: 0.76, y: 0.12 }, OH2: { x: 0.20, y: 0.78 }, OPP: { x: 0.24, y: 0.12 } } },
      { rotation: 2, phase: "serve", positions: { S: { x: 0.60, y: 0.84 }, MB1: { x: 0.78, y: 0.22 }, MB2: { x: 0.24, y: 0.78 }, OH1: { x: 0.88, y: 0.92 }, OH2: { x: 0.24, y: 0.22 }, OPP: { x: 0.52, y: 0.22 } } },
      { rotation: 2, phase: "receive", positions: { S: { x: 0.64, y: 0.56 }, MB1: { x: 0.78, y: 0.30 }, MB2: { x: 0.30, y: 0.72 }, OH1: { x: 0.82, y: 0.72 }, OH2: { x: 0.24, y: 0.34 }, OPP: { x: 0.52, y: 0.30 } } },
      { rotation: 2, phase: "attack", positions: { S: { x: 0.70, y: 0.36 }, MB1: { x: 0.78, y: 0.16 }, MB2: { x: 0.28, y: 0.64 }, OH1: { x: 0.82, y: 0.64 }, OH2: { x: 0.24, y: 0.18 }, OPP: { x: 0.52, y: 0.18 } } },
      { rotation: 2, phase: "defense", positions: { S: { x: 0.60, y: 0.82 }, MB1: { x: 0.78, y: 0.12 }, MB2: { x: 0.26, y: 0.78 }, OH1: { x: 0.82, y: 0.82 }, OH2: { x: 0.24, y: 0.12 }, OPP: { x: 0.52, y: 0.12 } } },
      { rotation: 3, phase: "serve", positions: { S: { x: 0.20, y: 0.84 }, MB1: { x: 0.88, y: 0.92 }, MB2: { x: 0.26, y: 0.22 }, OH1: { x: 0.52, y: 0.84 }, OH2: { x: 0.52, y: 0.22 }, OPP: { x: 0.78, y: 0.22 } } },
      { rotation: 3, phase: "receive", positions: { S: { x: 0.22, y: 0.60 }, MB1: { x: 0.82, y: 0.72 }, MB2: { x: 0.26, y: 0.32 }, OH1: { x: 0.52, y: 0.70 }, OH2: { x: 0.50, y: 0.32 }, OPP: { x: 0.78, y: 0.32 } } },
      { rotation: 3, phase: "attack", positions: { S: { x: 0.70, y: 0.36 }, MB1: { x: 0.82, y: 0.64 }, MB2: { x: 0.24, y: 0.18 }, OH1: { x: 0.52, y: 0.64 }, OH2: { x: 0.52, y: 0.16 }, OPP: { x: 0.78, y: 0.18 } } },
      { rotation: 3, phase: "defense", positions: { S: { x: 0.22, y: 0.80 }, MB1: { x: 0.84, y: 0.82 }, MB2: { x: 0.26, y: 0.12 }, OH1: { x: 0.52, y: 0.78 }, OH2: { x: 0.52, y: 0.12 }, OPP: { x: 0.78, y: 0.12 } } },
      { rotation: 4, phase: "serve", positions: { S: { x: 0.24, y: 0.20 }, MB1: { x: 0.52, y: 0.78 }, MB2: { x: 0.52, y: 0.20 }, OH1: { x: 0.22, y: 0.78 }, OH2: { x: 0.78, y: 0.20 }, OPP: { x: 0.88, y: 0.92 } } },
      { rotation: 4, phase: "receive", positions: { S: { x: 0.18, y: 0.32 }, MB1: { x: 0.52, y: 0.72 }, MB2: { x: 0.54, y: 0.26 }, OH1: { x: 0.22, y: 0.74 }, OH2: { x: 0.78, y: 0.30 }, OPP: { x: 0.82, y: 0.78 } } },
      { rotation: 4, phase: "attack", positions: { S: { x: 0.72, y: 0.28 }, MB1: { x: 0.52, y: 0.64 }, MB2: { x: 0.52, y: 0.14 }, OH1: { x: 0.24, y: 0.64 }, OH2: { x: 0.80, y: 0.16 }, OPP: { x: 0.84, y: 0.66 } } },
      { rotation: 4, phase: "defense", positions: { S: { x: 0.74, y: 0.12 }, MB1: { x: 0.52, y: 0.76 }, MB2: { x: 0.52, y: 0.12 }, OH1: { x: 0.22, y: 0.80 }, OH2: { x: 0.78, y: 0.12 }, OPP: { x: 0.84, y: 0.82 } } },
      { rotation: 5, phase: "serve", positions: { S: { x: 0.52, y: 0.20 }, MB1: { x: 0.22, y: 0.80 }, MB2: { x: 0.78, y: 0.20 }, OH1: { x: 0.24, y: 0.20 }, OH2: { x: 0.88, y: 0.92 }, OPP: { x: 0.52, y: 0.84 } } },
      { rotation: 5, phase: "receive", positions: { S: { x: 0.60, y: 0.32 }, MB1: { x: 0.22, y: 0.72 }, MB2: { x: 0.78, y: 0.28 }, OH1: { x: 0.26, y: 0.30 }, OH2: { x: 0.82, y: 0.72 }, OPP: { x: 0.52, y: 0.72 } } },
      { rotation: 5, phase: "attack", positions: { S: { x: 0.68, y: 0.28 }, MB1: { x: 0.26, y: 0.64 }, MB2: { x: 0.78, y: 0.14 }, OH1: { x: 0.24, y: 0.16 }, OH2: { x: 0.82, y: 0.66 }, OPP: { x: 0.52, y: 0.64 } } },
      { rotation: 5, phase: "defense", positions: { S: { x: 0.64, y: 0.12 }, MB1: { x: 0.22, y: 0.80 }, MB2: { x: 0.78, y: 0.12 }, OH1: { x: 0.24, y: 0.12 }, OH2: { x: 0.84, y: 0.82 }, OPP: { x: 0.52, y: 0.76 } } },
      { rotation: 6, phase: "serve", positions: { S: { x: 0.78, y: 0.20 }, MB1: { x: 0.24, y: 0.20 }, MB2: { x: 0.88, y: 0.92 }, OH1: { x: 0.52, y: 0.20 }, OH2: { x: 0.52, y: 0.82 }, OPP: { x: 0.22, y: 0.80 } } },
      { rotation: 6, phase: "receive", positions: { S: { x: 0.74, y: 0.30 }, MB1: { x: 0.26, y: 0.30 }, MB2: { x: 0.82, y: 0.74 }, OH1: { x: 0.52, y: 0.28 }, OH2: { x: 0.52, y: 0.72 }, OPP: { x: 0.22, y: 0.74 } } },
      { rotation: 6, phase: "attack", positions: { S: { x: 0.74, y: 0.28 }, MB1: { x: 0.24, y: 0.16 }, MB2: { x: 0.82, y: 0.66 }, OH1: { x: 0.52, y: 0.16 }, OH2: { x: 0.52, y: 0.64 }, OPP: { x: 0.22, y: 0.66 } } },
      { rotation: 6, phase: "defense", positions: { S: { x: 0.76, y: 0.12 }, MB1: { x: 0.24, y: 0.12 }, MB2: { x: 0.84, y: 0.82 }, OH1: { x: 0.52, y: 0.12 }, OH2: { x: 0.52, y: 0.78 }, OPP: { x: 0.22, y: 0.80 } } },
    ];

    for (const layout of defaultsLayouts) {
      await ctx.db.insert("customLayouts", {
        teamId: defaultsId,
        rotation: layout.rotation,
        phase: layout.phase,
        positions: layout.positions,
      });
    }

    return {
      message: "Successfully seeded data",
      beachBoysId,
      defaultsId,
    };
  },
});

// Seed diverse test teams for a specific user (by email)
// Run from Convex Dashboard: { "email": "your@email.com" }
export const seedTestTeams = internalMutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) {
      throw new Error(`User with email ${args.email} not found`);
    }

    const now = new Date().toISOString();
    const created: string[] = [];

    // ─── Team 1: Full roster, 3 lineups (tests multi-lineup picker) ───
    await ctx.db.insert("teams", {
      userId: user._id,
      name: "Northside VBC",
      slug: "northside_vbc_test",
      archived: false,
      roster: [
        { id: "ns-p1", name: "Marcus", number: 1 },
        { id: "ns-p2", name: "Jordan", number: 4 },
        { id: "ns-p3", name: "Eli", number: 6 },
        { id: "ns-p4", name: "Darius", number: 8 },
        { id: "ns-p5", name: "Kai", number: 10 },
        { id: "ns-p6", name: "Devon", number: 12 },
        { id: "ns-p7", name: "Ty", number: 14 },
        { id: "ns-p8", name: "Andre", number: 15 },
        { id: "ns-p9", name: "Jalen", number: 17 },
        { id: "ns-p10", name: "Ricky", number: 22 },
      ],
      lineups: [
        {
          id: "ns-lineup-1",
          name: "Starting 6",
          position_assignments: {
            S: "ns-p1",
            OH1: "ns-p2",
            OH2: "ns-p3",
            MB1: "ns-p4",
            MB2: "ns-p5",
            OPP: "ns-p6",
            L: "ns-p7",
          },
          position_source: "full-5-1",
          starting_rotation: 1,
          created_at: now,
        },
        {
          id: "ns-lineup-2",
          name: "Bench Rotation",
          position_assignments: {
            S: "ns-p8",
            OH1: "ns-p9",
            OH2: "ns-p3",
            MB1: "ns-p10",
            MB2: "ns-p5",
            OPP: "ns-p2",
            L: "ns-p7",
          },
          position_source: "full-5-1",
          starting_rotation: 3,
          created_at: now,
        },
        {
          id: "ns-lineup-3",
          name: "Set 3 Closer",
          position_assignments: {
            S: "ns-p1",
            OH1: "ns-p9",
            OH2: "ns-p2",
            MB1: "ns-p4",
            MB2: "ns-p10",
            OPP: "ns-p6",
            L: "ns-p7",
          },
          position_source: "full-5-1",
          starting_rotation: 5,
          created_at: now,
        },
      ],
      activeLineupId: "ns-lineup-1",
      positionAssignments: {},
    });
    created.push("Northside VBC (10 players, 3 lineups)");

    // ─── Team 2: Big roster, 1 lineup (should skip picker) ───
    await ctx.db.insert("teams", {
      userId: user._id,
      name: "Eastside Heat",
      slug: "eastside_heat_test",
      archived: false,
      roster: [
        { id: "eh-p1", name: "Leo", number: 2 },
        { id: "eh-p2", name: "Sam", number: 5 },
        { id: "eh-p3", name: "Omar", number: 7 },
        { id: "eh-p4", name: "Trey", number: 9 },
        { id: "eh-p5", name: "Miles", number: 11 },
        { id: "eh-p6", name: "Blake", number: 13 },
        { id: "eh-p7", name: "Milo", number: 16 },
        { id: "eh-p8", name: "Finn", number: 18 },
        { id: "eh-p9", name: "Chase", number: 20 },
        { id: "eh-p10", name: "Zane", number: 24 },
        { id: "eh-p11", name: "Mateo", number: 25 },
        { id: "eh-p12", name: "Rowan", number: 30 },
      ],
      lineups: [
        {
          id: "eh-lineup-1",
          name: "Lineup 1",
          position_assignments: {
            S: "eh-p1",
            OH1: "eh-p2",
            OH2: "eh-p3",
            MB1: "eh-p4",
            MB2: "eh-p5",
            OPP: "eh-p6",
            L: "eh-p7",
          },
          position_source: "full-5-1",
          starting_rotation: 1,
          created_at: now,
        },
      ],
      activeLineupId: "eh-lineup-1",
      positionAssignments: {},
    });
    created.push("Eastside Heat (12 players, 1 lineup)");

    // ─── Team 3: Roster but NO lineups (tests legacy position_assignments fallback) ───
    await ctx.db.insert("teams", {
      userId: user._id,
      name: "Westview Wolves",
      slug: "westview_wolves_test",
      archived: false,
      roster: [
        { id: "ww-p1", name: "Nico", number: 3 },
        { id: "ww-p2", name: "Caleb", number: 6 },
        { id: "ww-p3", name: "Jamal", number: 8 },
        { id: "ww-p4", name: "Reese", number: 10 },
        { id: "ww-p5", name: "Luca", number: 14 },
        { id: "ww-p6", name: "Dante", number: 19 },
        { id: "ww-p7", name: "Isaiah", number: 21 },
      ],
      lineups: [],
      positionAssignments: {
        S: "ww-p1",
        OH1: "ww-p2",
        OH2: "ww-p3",
        MB1: "ww-p4",
        MB2: "ww-p5",
        OPP: "ww-p6",
      },
    });
    created.push("Westview Wolves (7 players, 0 lineups — legacy assignments)");

    // ─── Team 4: Roster only, no lineups, no position assignments (blank slate) ───
    await ctx.db.insert("teams", {
      userId: user._id,
      name: "Southbay Setters",
      slug: "southbay_setters_test",
      archived: false,
      roster: [
        { id: "ss-p1", name: "Emilio", number: 1 },
        { id: "ss-p2", name: "Xavier", number: 4 },
        { id: "ss-p3", name: "Keith", number: 7 },
        { id: "ss-p4", name: "Roman", number: 11 },
        { id: "ss-p5", name: "Nash", number: 15 },
        { id: "ss-p6", name: "Colton", number: 23 },
      ],
      lineups: [],
      positionAssignments: {},
    });
    created.push("Southbay Setters (6 players, 0 lineups, no assignments — blank slate)");

    // ─── Team 5: Small roster, 2 lineups (tests lineup picker with minimal bench) ───
    await ctx.db.insert("teams", {
      userId: user._id,
      name: "Downtown 6",
      slug: "downtown_6_test",
      archived: false,
      roster: [
        { id: "d6-p1", name: "Ace", number: 1 },
        { id: "d6-p2", name: "Banks", number: 2 },
        { id: "d6-p3", name: "Cruz", number: 3 },
        { id: "d6-p4", name: "Duke", number: 4 },
        { id: "d6-p5", name: "Ellis", number: 5 },
        { id: "d6-p6", name: "Fox", number: 6 },
      ],
      lineups: [
        {
          id: "d6-lineup-1",
          name: "Standard",
          position_assignments: {
            S: "d6-p1",
            OH1: "d6-p2",
            OH2: "d6-p3",
            MB1: "d6-p4",
            MB2: "d6-p5",
            OPP: "d6-p6",
          },
          starting_rotation: 1,
          created_at: now,
        },
        {
          id: "d6-lineup-2",
          name: "Scramble",
          position_assignments: {
            S: "d6-p6",
            OH1: "d6-p5",
            OH2: "d6-p4",
            MB1: "d6-p3",
            MB2: "d6-p2",
            OPP: "d6-p1",
          },
          starting_rotation: 4,
          created_at: now,
        },
      ],
      activeLineupId: "d6-lineup-2",
      positionAssignments: {},
    });
    created.push("Downtown 6 (6 players, 2 lineups — no bench)");

    // ─── Team 6: Empty roster (edge case) ───
    await ctx.db.insert("teams", {
      userId: user._id,
      name: "Ghost Squad",
      slug: "ghost_squad_test",
      archived: false,
      roster: [],
      lineups: [],
      positionAssignments: {},
    });
    created.push("Ghost Squad (0 players, 0 lineups — empty team)");

    return {
      message: `Created ${created.length} test teams for ${args.email}`,
      teams: created,
    };
  },
});
