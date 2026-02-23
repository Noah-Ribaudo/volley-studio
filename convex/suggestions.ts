import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { auth } from "./auth";
import { api, internal } from "./_generated/api";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_SUBMISSIONS = 3;

export const reserveSubmissionSlot = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    clientId: v.optional(v.string()),
    createdAt: v.number(),
    windowStart: v.number(),
    maxSubmissions: v.number(),
    submitterName: v.optional(v.string()),
    submitterEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.userId && !args.clientId) {
      throw new Error("Missing submitter identity.");
    }

    const recentSubmissions = args.userId
      ? await ctx.db
          .query("suggestionSubmissions")
          .withIndex("by_user_createdAt", (q) =>
            q.eq("userId", args.userId!).gte("createdAt", args.windowStart)
          )
          .collect()
      : await ctx.db
          .query("suggestionSubmissions")
          .withIndex("by_client_createdAt", (q) =>
            q.eq("clientId", args.clientId!).gte("createdAt", args.windowStart)
          )
          .collect();

    if (recentSubmissions.length >= args.maxSubmissions) {
      throw new Error("You have reached the suggestion limit. Please try again later.");
    }

    await ctx.db.insert("suggestionSubmissions", {
      userId: args.userId,
      clientId: args.clientId,
      createdAt: args.createdAt,
      submitterName: args.submitterName,
      submitterEmail: args.submitterEmail,
    });
  },
});

export const submitSuggestion = action({
  args: {
    text: v.string(),
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { text } = args;

    if (!text.trim()) {
      throw new Error("Suggestion text cannot be empty");
    }

    const clientId = args.clientId?.trim();
    const userId = await auth.getUserId(ctx);
    if (!userId && !clientId) {
      throw new Error("Could not submit suggestion. Please refresh and try again.");
    }

    const user = userId ? await ctx.runQuery(api.users.viewer, {}) : null;

    const now = Date.now();
    await ctx.runMutation(internal.suggestions.reserveSubmissionSlot, {
      userId: userId ?? undefined,
      clientId: clientId || undefined,
      createdAt: now,
      windowStart: now - RATE_LIMIT_WINDOW_MS,
      maxSubmissions: RATE_LIMIT_MAX_SUBMISSIONS,
      submitterName: user?.name ?? undefined,
      submitterEmail: user?.email ?? undefined,
    });

    const apiKey = process.env.LINEAR_API_KEY;
    if (!apiKey) {
      throw new Error("Linear API key not configured");
    }

    const teamId = process.env.LINEAR_TEAM_ID;
    if (!teamId) {
      throw new Error("Linear team ID not configured");
    }

    // Title: first ~60 chars, truncated at word boundary
    const trimmed = text.trim();
    let title = trimmed.slice(0, 60);
    if (trimmed.length > 60) {
      const lastSpace = title.lastIndexOf(" ");
      if (lastSpace > 30) title = title.slice(0, lastSpace);
      title += "...";
    }

    const submittedAtIso = new Date().toISOString();
    const submitterDetails = [user?.name ? `name: ${user.name}` : null, user?.email ? `email: ${user.email}` : null]
      .filter((detail): detail is string => Boolean(detail))
      .join(", ");
    const submittedByLine = submitterDetails
      ? `Submitted by ${submitterDetails} from Volley Studio on ${submittedAtIso}`
      : `Submitted anonymously from Volley Studio on ${submittedAtIso}`;
    const description = `${trimmed}\n\n---\n${submittedByLine}`;

    const linearHeaders = {
      Authorization: apiKey,
      "Content-Type": "application/json",
    };

    // Look up the "Suggestion" label in the configured team.
    const labelResponse = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: linearHeaders,
      body: JSON.stringify({
        query: `
          query TeamLabels($teamId: String!) {
            team(id: $teamId) {
              labels {
                nodes {
                  id
                  name
                }
              }
            }
          }
        `,
        variables: {
          teamId,
        },
      }),
    });

    const labelData = await labelResponse.json();
    if (!labelResponse.ok || labelData.errors?.length) {
      console.error(
        "Linear API label lookup error:",
        labelResponse.status,
        labelData.errors ?? labelData
      );
      throw new Error("Failed to submit suggestion");
    }

    const labels = labelData.data?.team?.labels?.nodes ?? [];
    const suggestionLabel = labels.find(
      (label: { name?: string }) =>
        label.name?.toLowerCase() === "suggestion"
    );

    const issueCreateInput: {
      teamId: string;
      title: string;
      description: string;
      labelIds?: string[];
    } = {
      teamId,
      title,
      description,
    };

    if (suggestionLabel?.id) {
      issueCreateInput.labelIds = [suggestionLabel.id];
    }

    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: linearHeaders,
      body: JSON.stringify({
        query: `
          mutation CreateIssue($input: IssueCreateInput!) {
            issueCreate(input: $input) {
              success
            }
          }
        `,
        variables: {
          input: issueCreateInput,
        },
      }),
    });

    const responseData = await response.json();

    if (
      !response.ok ||
      responseData.errors?.length ||
      !responseData.data?.issueCreate?.success
    ) {
      console.error(
        "Linear API issue creation error:",
        response.status,
        responseData.errors ?? responseData
      );
      throw new Error("Failed to submit suggestion");
    }

    return { success: true };
  },
});
