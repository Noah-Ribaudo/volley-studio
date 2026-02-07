# Agent Defaults

## Dev Server Startup (Required)
- Always launch local dev in a persistent `tmux` session so the process stays alive after command completion.
- Default session name: `volley-dev`.
- Always target port `3000` for `next dev`.
- Before starting, clear stale listeners on `3000` (and optionally `3001`/`3002` if they are leftovers from this repo's prior runs).
- Start from repo root with `npm run dev`:

```bash
cd "$(git rev-parse --show-toplevel)"
if tmux has-session -t volley-dev 2>/dev/null; then tmux kill-session -t volley-dev; fi
pids=$(lsof -t -nP -iTCP:3000 -sTCP:LISTEN || true)
if [ -n "$pids" ]; then kill -9 $pids; fi
TMUX='' tmux new-session -d -s volley-dev 'cd "'"$(git rev-parse --show-toplevel)"'" && npm run dev'
```

- Verify startup before reporting success:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
curl -I --max-time 5 http://localhost:3000
tmux capture-pane -pt volley-dev | tail -n 60
```
