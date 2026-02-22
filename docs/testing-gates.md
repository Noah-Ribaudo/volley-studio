# Strict Blocking Quality Gates

## What is now enforced in CI

The `strict-blocking` workflow runs on:
- pushes to `dev`
- pull requests targeting `main` or `dev`

It has two required jobs:
- `quality`: lint, typecheck, build
- `e2e-blocking`: blocking Playwright journeys (`npm run test:blocking`)

## Blocking browser journeys

The strict suite lives in `tests/e2e/blocking` and covers:
- auth access + sign-in/out via dev admin
- local team/player/lineup CRUD end-to-end
- whiteboard core interactions (sidebar state, court setup, phase/rotation controls, play/reset)

## Required repository settings

To make this truly blocking in GitHub:
1. Add repository secret `NEXT_PUBLIC_CONVEX_URL`.
2. Enable branch protection on `main`.
3. Require status checks:
   - `quality`
   - `e2e-blocking`
4. Enable "Require branches to be up to date before merging" (strict mode).

Without these branch protection settings, the workflow will run but not block merges.
