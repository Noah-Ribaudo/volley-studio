# Volley Studio — Claude Instructions

## After Pushing to GitHub

After every `git push`, automatically fetch and share the Vercel preview URL. Do this without being asked:

1. Wait ~15 seconds for Vercel to start the build
2. Get the repo's owner/name from `git remote get-url origin`
3. Use `gh api /repos/Noah-Ribaudo/volley-studio/deployments` to find the latest Preview deployment
4. Fetch its statuses URL to get the `target_url` — that's the Vercel preview link
5. Share it with Noah plainly: "Preview is live: [url]"

If the GitHub API approach fails, fall back to `vercel ls` to get the latest deployment URL.

Don't wait for Noah to ask. Don't explain the process — just surface the link.
