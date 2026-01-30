import { mutation } from "./_generated/server";

// Migration script to seed data from Supabase export
export const seedFromSupabase = mutation({
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
      password: "montrose",
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
        flags: { OPP: ["cannot-block", "back-row-hit"] },
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
        flags: { OPP: ["cannot-block", "back-row-hit"] },
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
