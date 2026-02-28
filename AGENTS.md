# Volley Studio — Agent Instructions

Volley Studio is a volleyball coaching whiteboard app. Coaches use it to plan player positions, movement arrows, and formations across all 6 rotations and multiple rally phases. Think of it as a digital clipboard for volleyball strategy.

## Tech Stack

- **Framework**: Next.js 15 with React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Convex (backend-as-a-service) — all server logic lives in `convex/`
- **Auth**: @convex-dev/auth with Google OAuth and password sign-in
- **State**: Zustand stores with localStorage persistence (`store/`)
- **UI primitives**: Radix UI + custom components in `components/ui/`
- **Testing**: Playwright (e2e tests in `tests/`)

## Project Structure

```
app/(main)/          → Main app routes (dashboard, teams, settings, gametime)
app/sign-in/         → Auth pages
components/court/    → SVG volleyball court (draggable tokens, arrows, status badges)
components/gametime/ → Live game tracking UI
components/team/     → Team management (roster, lineups)
components/ui/       → Reusable UI primitives (buttons, dialogs, etc.)
convex/              → Backend: schema, mutations, queries, actions
hooks/               → Custom React hooks (dragging, mobile detection, sync)
lib/                 → Utilities, types, theme logic, animation helpers
lib/types.ts         → Core domain types (Role, Phase, Position, etc.)
store/               → Zustand stores (theme, app state, game time, hints)
```

## Domain Concepts

- **Roles**: S (Setter), OH1/OH2 (Outside Hitters), MB1/MB2 (Middle Blockers), OPP (Opposite), L (Libero)
- **Rotations**: 1-6 (standard volleyball rotations)
- **Phases**: 9 rally phases from PRE_SERVE through BALL_DEAD. Default visible: Pre-Serve, Serve Receive, Attack, Defense
- **Court positions**: Normalized 0-1 coordinates on an SVG court
- **Arrows**: Movement paths between positions with Bezier curve support
- **Status flags**: Per-player badges (passer, quick, swing, pipe, block, tips)
- **Lineups**: Named configurations mapping roles to roster players

## Key Patterns

**Court visualization** is SVG-based. Player tokens are draggable circles. Arrows show movement paths with optional curve handles. All coordinates are normalized 0-1.

**Data flow**: Convex stores teams, layouts, and settings server-side. Zustand manages client-side UI state. Changes sync to Convex via mutations.

**Theme system**: Light/dark with auto mode (resolves by timezone). Applied via `data-theme` attribute on `<html>`. Colors use oklch format with CSS custom properties.

**Reduced motion**: Animations wrap in `animateIfAllowed()` from `lib/motion-utils.ts` which respects `prefers-reduced-motion`.

## Scripts

```bash
npm run dev          # Start Next.js + Convex dev servers
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Playwright e2e tests
```

## Rules

- Use RallyPhase (not legacy Phase) in new code
- Role colors come from CSS custom properties (e.g., `var(--c-setter)`)
- Court coordinates are always normalized 0-1
- Convex functions go in `convex/`, never call external APIs from client code
- Keep the UI stable — no layout jumps or reflows from user actions
- Test with `npm run build` before submitting changes

## Dev Server Startup

Launch local dev in a persistent `tmux` session:

```bash
cd "$(git rev-parse --show-toplevel)"
if tmux has-session -t volley-dev 2>/dev/null; then tmux kill-session -t volley-dev; fi
pids=$(lsof -t -nP -iTCP:3000 -sTCP:LISTEN || true)
if [ -n "$pids" ]; then kill -9 $pids; fi
TMUX='' tmux new-session -d -s volley-dev 'cd "'"$(git rev-parse --show-toplevel)"'" && npm run dev'
```

Verify startup:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
curl -I --max-time 5 http://localhost:3000
tmux capture-pane -pt volley-dev | tail -n 60
```

## Pull Requests (Required)

Every completed task **must** result in a real GitHub PR. Do not rely on internal metadata tools alone.

1. **Branch naming**: Use a descriptive branch name based on the task (e.g., `fix/play-reset-width-jitter`), not generic names like `work`.
2. **Push the branch**: `git push -u origin <branch>`
3. **Create the PR**: Use `gh pr create --base main --head <branch> --title "..." --body-file /tmp/pr_body.md`
   - Always use `--body-file` with a temp file instead of inline `--body` to avoid shell escaping issues with markdown.
4. **Return the PR URL**: Always include the live GitHub PR link in your final response.
5. **If PR creation fails**: Report the exact command and error output, then retry with corrected flags.

## Verification

- Always run `npm run lint` before committing.
- `npm run build` and `npm run dev` may fail in the Codex sandbox (Google Fonts blocked, Convex login prompt). This is expected — don't treat these as blockers.
- Before final handoff, verify a local dev server is running and the changed page/flow is reachable.
- Final handoff must include preview availability status, not just a completion note and PR link.
