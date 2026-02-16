# Minimal Mode Implementation Plan

## Branch
- Working branch: `Noah-Ribaudo/minimal-mode-mvp`
- Base branch: local `development`
- Base commit: `9918b73`

## Goal
Build a focused whiteboard experience at `/minimal` that keeps core coaching interactions intact while presenting a text-first, grayscale-first interface with restrained accent usage.

## Non-Negotiables
- One-page workflow with no sidebar, no bottom nav, and no extra chrome.
- Existing whiteboard interactions remain functional: drag, arrows, phase/rotation, token labels, assignments.
- Visual language is black/white/grayscale first.
- Accent color is optional and used only for critical state.
- Layout remains stable with no jump/reflow caused by controls appearing/disappearing.

## Implementation Phases

## Phase 1: Route + Entry
- Add a development-only entry in the sidebar developer section: `Open Minimal Mode`.
- Route target: `/minimal`.
- Create a dedicated minimal page shell that does not use the main navigation layout.
- Add an `Exit Minimal Mode` action inside minimal mode that returns to `/`.

## Phase 2: Persisted Preferences
- Extend app preferences with:
- `uiMode: 'normal' | 'minimal'`
- `minimalContrast: 'soft' | 'high'`
- `minimalAllowAccent: boolean`
- `minimalDenseLayout: boolean` (optional)
- Add setters, persistence, and safe rehydration defaults for existing users.
- Keep normal mode behavior unchanged when these values are absent or defaulted.

## Phase 3: Shared Whiteboard Workspace Wiring
- Extract shared whiteboard state wiring from the main whiteboard page into reusable logic so `/` and `/minimal` use the same core behavior.
- Reuse existing court rendering and interactions rather than creating a second interaction model.
- Keep team loading, lineup selection, phase/rotation state, token label state, and assignment updates sourced from the same store/actions.

## Phase 4: Minimal Page Information Architecture
- Build `/minimal` with three fixed regions:
- Header strip (team, lineup, rotation, phase, save state).
- Whiteboard canvas (existing court component).
- Utility module area (wrapping text cards).
- Implement utility modules as text-first cards:
- Phase + rotation controls.
- Token label toggles.
- Role-to-player assignment quick list.
- Minimal settings card (contrast, accent allowance, dense layout, exit).
- Responsive behavior:
- Desktop: canvas + right rail.
- Tablet: canvas followed by 2-column card wrap.
- Mobile: single-column stacked cards below canvas.

## Phase 5: Minimal Visual System
- Add a minimal-mode style scope (for example, `data-mode="minimal"` on the page container).
- Define grayscale-first tokens for backgrounds, surfaces, borders, and typography.
- Support two contrast levels (`soft`, `high`) via token overrides.
- Gate accent usage behind `minimalAllowAccent`.
- Restrict accent to:
- Active phase indicator.
- Unsaved/saving state indicator.
- Keyboard focus visibility.
- Remove decorative treatments in minimal mode: gradients, glass effects, prominent shadows.

## Phase 6: Stability + QA
- Reserve space for any stateful labels in the header (save indicator, phase chip) to prevent horizontal shifts.
- Use fixed card header heights and predictable spacing so card wrapping does not cause interaction jank.
- Confirm no controls appear/disappear in ways that change layout height unexpectedly.
- Validate behavior across desktop, tablet, and mobile breakpoints.
- Run verification:
- `npm run lint`
- `npm run build` (non-blocking known sandbox caveats accepted per repo guidance)
- Add/update Playwright coverage for:
- Developer entry navigation to `/minimal`.
- Core whiteboard interactions on minimal page.
- Responsive module wrapping without layout jumps.

## Acceptance Checklist
- Development sidebar includes `Open Minimal Mode`.
- `/minimal` loads as a single-page focused shell with no main navigation chrome.
- Whiteboard interactions still work in minimal mode.
- Minimal settings card exists on-page and includes exit + preference toggles.
- Grayscale-first look is applied, with accent usage constrained to critical state.
- No visible layout jumps during common interactions and control changes.

## Risks and Mitigations
- Risk: logic drift between `/` and `/minimal`.
- Mitigation: shared workspace/state wiring and shared court integration.
- Risk: accidental accent leakage from existing themed controls.
- Mitigation: minimal-mode token scope + explicit accent guards on critical elements only.
- Risk: responsive wrap causing vertical jumpiness.
- Mitigation: reserved card structure, consistent module heights, and breakpoint-specific layout tests.

## Suggested Build Order
1. Route + developer entry.
2. Store preferences + migration defaults.
3. Shared whiteboard wiring extraction.
4. Minimal page layout and modules.
5. Minimal visual token scope and contrast/accent behavior.
6. QA pass, responsive checks, and tests.
