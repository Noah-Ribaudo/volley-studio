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

    const description = `${trimmed}\n\n---\nSubmitted from Volley Studio on ${new Date().toISOString()}`;

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

    /*
    GitHub fallback:

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GitHub token not configured");
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
    */

    return { success: true };
  },
});
