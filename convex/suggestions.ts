import { v } from "convex/values";
import { action } from "./_generated/server";

export const submitSuggestion = action({
  args: {
    text: v.string(),
  },
  handler: async (_ctx, args) => {
    const { text } = args;

    if (!text.trim()) {
      throw new Error("Suggestion text cannot be empty");
    }

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
