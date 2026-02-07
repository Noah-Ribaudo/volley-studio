import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

const RALLY_PHASES = [
  "PRE_SERVE",
  "SERVE_IN_AIR",
  "SERVE_RECEIVE",
  "TRANSITION_TO_OFFENSE",
  "SET_PHASE",
  "ATTACK_PHASE",
  "TRANSITION_TO_DEFENSE",
  "DEFENSE_PHASE",
  "BALL_DEAD",
] as const;

const ROLES = ["S", "OH1", "OH2", "MB1", "MB2", "OPP", "L"] as const;

function normalizePhases(phases: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const phase of phases) {
    if (!RALLY_PHASES.includes(phase as (typeof RALLY_PHASES)[number])) {
      continue;
    }
    if (seen.has(phase)) {
      continue;
    }
    seen.add(phase);
    next.push(phase);
  }
  return next;
}

function normalizePhaseOrder(order: string[]): string[] {
  const next = normalizePhases(order);
  for (const phase of RALLY_PHASES) {
    if (!next.includes(phase)) {
      next.push(phase);
    }
  }
  return next;
}

function normalizeHighlightedRole(role: string | undefined) {
  if (!role) {
    return undefined;
  }
  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    return undefined;
  }
  return role;
}

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }

    const doc = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!doc) {
      return null;
    }

    return {
      showPosition: doc.showPosition,
      showPlayer: doc.showPlayer,
      showLibero: doc.showLibero,
      circleTokens: doc.circleTokens,
      hideAwayTeam: doc.hideAwayTeam,
      fullStatusLabels: doc.fullStatusLabels,
      showLearnTab: doc.showLearnTab,
      debugHitboxes: doc.debugHitboxes,
      isReceivingContext: doc.isReceivingContext,
      tokenSize: doc.tokenSize,
      navMode: doc.navMode,
      backgroundShader: doc.backgroundShader,
      backgroundOpacity: doc.backgroundOpacity,
      awayTeamHidePercent: doc.awayTeamHidePercent,
      visiblePhases: doc.visiblePhases,
      phaseOrder: doc.phaseOrder,
      highlightedRole: doc.highlightedRole,
      learningPanelPosition: doc.learningPanelPosition,
      updatedAt: doc.updatedAt,
    };
  },
});

export const upsertMine = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const normalizedVisiblePhases = normalizePhases(args.visiblePhases);
    const normalizedPhaseOrder = normalizePhaseOrder(args.phaseOrder);
    const normalizedHighlightedRole = normalizeHighlightedRole(args.highlightedRole);
    const clampedOpacity = Math.max(50, Math.min(100, args.backgroundOpacity));
    const clampedAwayTeamHidePercent = Math.max(20, Math.min(50, args.awayTeamHidePercent));

    const payload = {
      showPosition: args.showPosition,
      showPlayer: args.showPlayer,
      showLibero: args.showLibero,
      circleTokens: args.circleTokens,
      hideAwayTeam: args.hideAwayTeam,
      fullStatusLabels: args.fullStatusLabels,
      showLearnTab: args.showLearnTab,
      debugHitboxes: args.debugHitboxes,
      isReceivingContext: args.isReceivingContext,
      tokenSize: args.tokenSize,
      navMode: args.navMode,
      backgroundShader: args.backgroundShader,
      backgroundOpacity: clampedOpacity,
      awayTeamHidePercent: clampedAwayTeamHidePercent,
      visiblePhases: normalizedVisiblePhases,
      phaseOrder: normalizedPhaseOrder,
      highlightedRole: normalizedHighlightedRole,
      learningPanelPosition: args.learningPanelPosition,
      updatedAt: now,
    };

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("userSettings", {
      userId,
      createdAt: now,
      ...payload,
    });
  },
});
