import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_SUBMISSIONS = 3;

export const reserveSubmissionSlot = internalMutation({
  args: {
    userId: v.id("users"),
    createdAt: v.number(),
    windowStart: v.number(),
    maxSubmissions: v.number(),
  },
  handler: async (ctx, args) => {
    const recentSubmissions = await ctx.db
      .query("suggestionSubmissions")
      .withIndex("by_user_createdAt", (q) =>
        q.eq("userId", args.userId).gte("createdAt", args.windowStart)
      )
      .collect();

    if (recentSubmissions.length >= args.maxSubmissions) {
      throw new Error("You have reached the suggestion limit. Please try again later.");
    }

    await ctx.db.insert("suggestionSubmissions", {
      userId: args.userId,
      createdAt: args.createdAt,
    });
  },
});

export const submitSuggestion = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const { text } = args;

    if (!text.trim()) {
      throw new Error("Suggestion text cannot be empty");
    }

    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to submit suggestions.");
    }

    const now = Date.now();
    await ctx.runMutation(internal.suggestions.reserveSubmissionSlot, {
      userId,
      createdAt: now,
      windowStart: now - RATE_LIMIT_WINDOW_MS,
      maxSubmissions: RATE_LIMIT_MAX_SUBMISSIONS,
    });

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GitHub token not configured");
    }

    // Title: first ~60 chars, truncated at word boundary
    const trimmed = text.trim();
    let title = trimmed.slice(0, 60);
    if (trimmed.length > 60) {
      const lastSpace = title.lastIndexOf(" ");
      if (lastSpace > 30) title = title.slice(0, lastSpace);
      title += "...";
    }

    const body = `${trimmed}\n\n---\n*Submitted from Volley Studio on ${new Date().toISOString()}*`;

    const response = await fetch(
      "https://api.github.com/repos/Noah-Ribaudo/volley-studio/issues",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          body,
          labels: ["suggestion"],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("GitHub API error:", response.status, error);
      throw new Error("Failed to submit suggestion");
    }

    return { success: true };
  },
});
