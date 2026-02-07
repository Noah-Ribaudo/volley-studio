# Whiteboard Animation Reimplementation Plan

## Branch
- Working branch: `codex/animation_reimplementation`

## What Exists Today (Audit)
- Main runtime whiteboard animation lives in `components/court/VolleyballCourt.tsx`.
- It currently mixes three different movement systems:
  - CSS transition movement (`animationMode === 'css'`, token group transform transitions).
  - Motion spring interpolation (`animate(... type: 'spring')`) for non-play changes.
  - RAF-based play loop for path travel.
- A prototype rebuild also exists in `components/court/VolleyballCourtRebuild.tsx` and is exposed at `/canvas-rebuild`.

## Root Problems Observed
1. Competing animation authorities
- Position rendering can come from `collisionFreePositions`, `animatedPositions`, or `playedPositions`.
- Animation sources are switched by flags (`isBezierAnimating`, `isPreviewingMovement`, `animationMode`) rather than a single explicit state machine.
- CSS and JS motion can both influence rendered transforms in nearby code paths.

2. Path/token coupling
- Arrow geometry is derived from display state in render (`displayPositions`) and only partially overridden by locked play paths.
- This creates coupling between the moving token position and arrow/path rendering in some transitions.

3. Play state model is implicit
- `triggerPlayAnimation()` increments a counter and a `useEffect` infers play start.
- `isPreviewingMovement` doubles as both UX mode and simulation lifecycle control.

4. “Speed-based” is only partial
- Play loop is distance-integrated, but other movement flows are still time/spring driven.
- Human-like acceleration/deceleration is not modeled as a consistent kinematic profile across all play movement.

5. Curvature/corner handling is heuristic
- There is corner slowdown logic, but it is not based on a stable physical constraint model (lateral acceleration limit).

6. Collision behavior is heuristic and entangled with render state
- Avoidance and yielding logic is embedded directly in component effects.
- No dedicated deterministic simulation module with isolated tests.

## Target Architecture

### 1. Single Motion Authority During Play
- One engine owns token positions for the entire play session.
- Renderer is passive: it draws engine snapshots only.
- No CSS transform transitions for play-driven token movement.

### 2. Clear State Machine
- Introduce explicit states:
  - `IDLE`
  - `ARMED` (play pressed, paths frozen)
  - `PLAYING`
  - `COMPLETE`
  - `CANCELLED` (reset)
- `Play` creates a `PlaySession` snapshot from current token positions + current arrows + current control points.

### 3. Engine/Renderer Split
- New pure simulation module (no React, no DOM):
  - Suggested path: `lib/whiteboard-motion/engine.ts`
- Component adapter:
  - Suggested path: `components/court/useWhiteboardPlayEngine.ts`
- `VolleyballCourt` reads immutable path definitions and per-frame `agentStates` from the adapter.

### 4. Arc-Length Path Following
- Precompute each role path as a sampled curve with arc-length lookup table:
  - `positionAtS(s)`
  - `tangentAtS(s)`
  - `curvatureAtS(s)`
- Advance by distance each frame: `s += v * dt`.
- This guarantees travel along the intended path.

### 5. Human-Like Speed Profile
- Use speed/acceleration limits, not duration interpolation:
  - `v_target`
  - `a_max_accel`
  - `a_max_brake`
  - optional jerk cap for smoother onset
- Replace generic easing with physically constrained acceleration behavior.

### 6. Corner Deceleration Model
- Compute corner speed cap from curvature:
  - `v_corner_max = sqrt(a_lateral_max / max(curvature, eps))`
- Actual target speed is the minimum of:
  - cruising speed
  - corner speed cap
  - collision/priority constraints
  - end-of-path stopping constraint

### 7. Collision Avoidance Model
- Deterministic per-tick priority order using `ROLE_PRIORITY`.
- Look-ahead prediction window by speed (e.g. 0.3s to 0.6s).
- Separate constraints:
  - hard personal-space radius
  - soft influence radius
  - yield/priority factor
- Lateral deflection only as a bounded offset corridor around the locked path.
- Path anchor points never mutate during play.

## Library Options

### Option A: Hand-rolled engine + tiny math helper (recommended)
- Keep RAF + pure TS simulation.
- Optionally add `bezier-js` for robust arc-length and curvature calculations.
- Pros:
  - deterministic
  - easy to test
  - full control over collision and sports-specific rules
- Cons:
  - more code ownership

### Option B: GSAP MotionPath / similar
- Good for path following visuals.
- Weak fit for multi-agent collision + right-of-way logic.
- Pros:
  - easy single-object path animation
- Cons:
  - collision/priority becomes custom anyway, often harder to keep deterministic

### Option C: Physics engine
- Overkill for 7 controlled agents on prescribed paths.
- Harder to enforce tactical right-of-way semantics.

Recommendation: Option A.

## Implementation Plan (Phased)

### Phase 0: Stabilize interfaces
- Keep existing token and arrow visual components.
- Add `PlaySession` type and adapter seam without changing behavior yet.

### Phase 1: Build simulation core
- Create pure engine module with:
  - path preprocessing
  - per-role motion state
  - per-tick stepping
  - collision constraints
- Add unit tests for:
  - path adherence
  - corner slowdown
  - stopping distance
  - priority yielding
  - no-penetration guarantees

### Phase 2: Integrate behind feature flag
- Add `animationEngine: 'legacy' | 'reimplementation'` switch.
- Route `Play` to new engine only when enabled.
- Keep reset semantics and existing UI controls.

### Phase 3: Replace legacy play pipeline
- Remove play-trigger counter pattern.
- Move to explicit play session lifecycle actions.
- Remove legacy mixed play logic from `VolleyballCourt.tsx`.

### Phase 4: Cleanup and tune
- Remove dead code paths (`animationMode` branches not needed for play).
- Expose tuning knobs in one config object.
- Add telemetry/debug overlay for:
  - role speed
  - role acceleration
  - current spacing minimum
  - collision-yield reason

## Acceptance Criteria (Mapped to Your Requirements)
1. No CSS-vs-JS fighting
- During play, token movement source is engine snapshots only.

2. Tokens follow full path geometry
- Travel parameter is arc length along locked path.

3. Path and token are decoupled
- Path start/end/control locked in `PlaySession`; token motion never mutates them.

4. Collision avoidance supported
- Deterministic spacing constraints with look-ahead and priority yielding.

5. Speed-based system
- All play movement driven by speed/acceleration integration, not duration interpolation.

6. Human-like accel/decel
- Accel/brake limits with optional jerk smoothing.

7. Corner deceleration
- Curvature-based corner speed cap using lateral acceleration constraints.

## Testing Strategy
- Unit:
  - deterministic engine step snapshots with fixed dt.
- Integration:
  - `VolleyballCourt` renders stable path geometry while tokens move.
- E2E (Playwright):
  - Press play with crossing routes.
  - Verify spacing never drops below threshold.
  - Verify lower-priority role yields first.
  - Verify reset returns to editable base state.

## Proposed File Changes (High Level)
- New:
  - `lib/whiteboard-motion/types.ts`
  - `lib/whiteboard-motion/path.ts`
  - `lib/whiteboard-motion/engine.ts`
  - `lib/whiteboard-motion/config.ts`
  - `components/court/useWhiteboardPlayEngine.ts`
  - `tests/engine/whiteboard-motion/*.test.ts` (or equivalent local test harness)
- Updated:
  - `components/court/VolleyballCourt.tsx`
  - `store/useAppStore.ts` (explicit play session lifecycle actions)

## Open Questions For Product/Behavior Lock-In
1. Should higher-priority roles ever be forced to yield, or are they absolute right-of-way?
2. For equal priority, do you want symmetric yielding or role-based tie-breakers?
3. If two paths are guaranteed to intersect, do you prefer:
   - speed reduction only,
   - lateral sidestep only,
   - or a blend?
4. Should agents be allowed to temporarily leave court bounds to avoid collisions?
5. What is the desired minimum spacing (in token radii) at closest approach?
6. Do all roles share the same cruising speed, or should each role have its own speed profile?
7. Should acceleration/deceleration vary by phase (e.g., attack vs defense)?
8. For sharp corners, should slowdown be aggressive (realistic) or moderated (snappier UX)?
9. Is slight path deviation acceptable if it avoids hard stops, or must path adherence be nearly strict?
10. Should the arrow/path remain fully visible during play, fade as traveled, or only show remaining segment?
11. After play completes, should final positions snap exactly to arrow endpoints or stay at collision-resolved offsets?
12. Do you want pause/resume and scrub controls in this phase, or only play/reset?
13. Should “Play” always run all active arrows simultaneously, or support stagger/delay sequencing later?
14. Is reduced-motion mode expected to disable travel animation and jump directly to completed positions?
15. Do you want deterministic replay across devices/frame rates (same outcome at 60Hz vs 120Hz)?

## Decisions (Captured)
1. Priority handling: absolute right-of-way for higher-priority roles.
2. Collision style: balanced slowdown + sidestep, tunable in a debug panel.
3. Closest spacing target: `1` token radius (exposed as tunable spacing in panel).
4. Role kinematics: start with shared speed/accel across roles, tunable.
5. End state: keep collision-induced offsets at completion (do not snap to path endpoint).
6. Controls scope: `Play` and `Reset` only for v1.
7. Reduced motion: jump to final simulated positions immediately.
8. Determinism: required across frame rates/devices.

## Implementation Progress
- Added pure motion modules under `lib/whiteboard-motion/`:
  - deterministic fixed-step engine
  - arc-length path sampling
  - curvature-aware corner speed limits
  - priority-aware look-ahead collision logic
  - tunable motion config
- Replaced legacy play loop in `components/court/VolleyballCourt.tsx` with the new engine.
- Added an interactive tuning panel in the debug overlay for live parameter changes.
- Hooked debug overlay availability to existing debug toggle on main whiteboard pages.
