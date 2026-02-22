# volley.studio

Volleyball play design and visualization tool.

## Preview Workflow

This project uses a `dev` branch for preview deployments:
- Changes pushed to `dev` automatically deploy to Vercel preview URL
- Review changes on mobile/desktop
- Merge to `main` when ready for production

## Quality Gates

- `npm run lint` runs static linting checks.
- `npm run typecheck` runs TypeScript checks (`tsc --noEmit`).
- `npm run test:blocking` runs the strict blocking browser journeys.

See `docs/testing-gates.md` for CI + branch protection setup.
