# Collision Avoidance Improvements

Three improvements to port from the Motion Path Playground to Volley Studio's whiteboard mode.

---

## 1. Look-Ahead Collision Detection

### Current behavior
Players only react to where other players are *right now*. This causes last-second stops and near-misses.

### Desired behavior
Each player should look ahead on their path (0.3-0.5 seconds at current speed) and begin slowing down if that future position would collide with another player. This creates smoother, more anticipatory movement — like a person who sees someone coming and adjusts their pace early.

### Implementation

In `lib/animation.ts`, modify `computeSteering()` or create a new function:

```typescript
function getLookAheadPosition(agent: Agent, lookAheadTime: number): Position {
  // Calculate where this agent will be in `lookAheadTime` seconds
  // Based on their current position, target, and speed
  const direction = vecNormalize(vecSub(agent.target, agent.position))
  const lookAheadDist = agent.speed * lookAheadTime
  return vecAdd(agent.position, vecScale(direction, lookAheadDist))
}

// In collision check:
const futurePos = getLookAheadPosition(agent, 0.4)
const futureDist = vecLength(vecSub(futurePos, other.position))

if (futureDist < collisionRadius * 1.5) {
  // Start slowing down before we get there
  const urgency = 1 - (futureDist / (collisionRadius * 1.5))
  // Reduce target speed proportionally
}
```

For bezier path animation in `VolleyballCourt.tsx`, look ahead along the curve:

```typescript
// Current progress is `t`, look ahead to `t + delta`
const lookAheadT = Math.min(t + 0.1, 1) // ~10% ahead on path
const futurePos = interpolateBezier(start, end, control, lookAheadT)
```

---

## 2. Speed-Based Animation Model

### Current behavior
Animation uses spring physics or fixed duration. Players interpolate from A to B over a set time, regardless of distance. Speed is implicit, not explicit.

### Desired behavior
Players have a target **speed** (court units per second) they try to maintain. When avoiding collisions, they slow down. When clear, they accelerate back up. This is more physically intuitive and gives consistent movement feel regardless of path length.

### Implementation

Add speed tracking to the animation state:

```typescript
interface AnimationState {
  currentSpeed: number      // Current speed (units/sec)
  targetSpeed: number       // Desired cruising speed
  acceleration: number      // How fast speed changes (units/sec²)
  distanceTraveled: number  // Progress measured in distance, not time
  pathLength: number        // Total path length
}
```

Replace time-based interpolation with distance-based:

```typescript
// Instead of:
const t = elapsed / duration
const pos = interpolateBezier(start, end, control, t)

// Use:
const progress = state.distanceTraveled / state.pathLength
const pos = interpolateBezier(start, end, control, Math.min(progress, 1))

// Each frame, update distance based on current speed:
state.distanceTraveled += state.currentSpeed * deltaTime
```

Smooth speed changes with acceleration:

```typescript
const speedDiff = state.targetSpeed - state.currentSpeed
const maxChange = state.acceleration * deltaTime

if (Math.abs(speedDiff) <= maxChange) {
  state.currentSpeed = state.targetSpeed
} else {
  state.currentSpeed += Math.sign(speedDiff) * maxChange
}
```

Add configurable parameters (could be in animation config or UI):

```typescript
const MOVEMENT_CONFIG = {
  cruisingSpeed: 0.8,    // court units per second
  acceleration: 2.0,      // units/sec² — how snappy vs floaty
}
```

---

## 3. Sequential Priority Processing

### Current behavior
All players are processed in parallel, then collision resolution runs 8 iterations to reach equilibrium. The order of processing within each iteration can cause subtle artifacts.

### Desired behavior
Process players in strict priority order (Setter first, then Opposite, etc.). After each player moves, their new position is immediately visible to all lower-priority players. This eliminates ordering artifacts and makes the priority system more deterministic.

### Implementation

In the animation loop in `VolleyballCourt.tsx`:

```typescript
// Sort agents by priority (lower number = higher priority = processed first)
const sortedAgents = [...agents].sort((a, b) =>
  (ROLE_PRIORITY[a.role] ?? 99) - (ROLE_PRIORITY[b.role] ?? 99)
)

// Process sequentially, updating positions immediately
for (const agent of sortedAgents) {
  // Check collisions against already-updated higher-priority agents
  // AND not-yet-updated lower-priority agents (using their current positions)

  const steering = computeSteering(agent, agents, params)

  // Apply movement immediately
  agent.position = newPosition

  // This agent's new position is now visible to subsequent agents
}
```

Key change: instead of computing all steering vectors first and then applying them all, compute and apply one at a time in priority order.

This also simplifies collision resolution — you may be able to reduce or eliminate the 8-iteration relaxation loop since higher-priority players are already in their final positions when lower-priority players process.

---

## Files to Modify

| File | Changes |
|------|---------|
| `lib/types.ts` | Add `AnimationState` interface if using speed-based model |
| `lib/animation.ts` | Add look-ahead logic, modify `computeSteering()` |
| `components/court/VolleyballCourt.tsx` | Sequential processing in animation loop, speed-based interpolation |
| `lib/motion-utils.ts` | May need to adjust or bypass spring animation for speed-based approach |

---

## Testing

1. Create a scenario where two players' paths cross
2. Verify the lower-priority player begins slowing *before* reaching the intersection
3. Verify consistent movement speed regardless of path length
4. Verify higher-priority players are never affected by lower-priority ones
