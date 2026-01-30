# Rotation Preset Workflow

This document describes how to create complete rotation presets from the coaching PDF diagrams.

## Phase Mapping

The PDF diagrams show 5 phases. Here's how they map to the app's phase system:

| PDF Phase | App Phase | Description |
|-----------|-----------|-------------|
| **Home** | Pre-Serve (your receive) | Legal starting positions - referees check before serve |
| **Serve** | Pre-Serve (your serve) | Where players stand when YOUR team serves |
| **Serve Receive Primary** | Serve Receive | Default receiving formation |
| **Serve Receive Alternate** | Serve Receive (alt) | Alternative receiving formation |
| **Base** | Defense Phase | Defensive positions (ball on opponent's side) |

### Attack Phase
The Attack Phase isn't explicitly shown in the PDF diagrams, but it's the transitional state between Serve Receive and Base. During Attack Phase:
- Setter has released to target zone
- Hitters are approaching for attack
- Positions are mid-transition

## What Each Phase Needs

### 1. Positions
- **x**: 0 (left sideline) to 1 (right sideline)
- **y**: 0.5 (net) to 1.0 (baseline for home team)
- Each role needs a position: S, OH1, OH2, MB1, MB2, OPP (or RS), L (optional)

### 2. Arrows
Arrows show movement to the NEXT position. The arrow's destination is where the player will be after transitioning.

| Phase | Arrow Destination |
|-------|-------------------|
| Home | → to Serve Receive position |
| Serve | → to Base position |
| Serve Receive Primary | → to Base/Attack position |
| Serve Receive Alternate | → to Base/Attack position |
| Base | Generally no arrows (terminal phase) |

### 3. Tags (Status Flags)
Tags indicate what a player is doing in that phase:

| Tag | When to Use |
|-----|------------|
| `passer` | Player is a primary passer (receive formation) |
| `quick` | Middle blocker ready for quick/1-ball attack |
| `swing` | Outside/opposite in attacking position |
| `pipe` | Back row attack option |
| `here1` | Hitting from unusual spot for first ball (serve receive only) |
| `block` | Primary blocking assignment (defense) |
| `tips` | Covering short balls/tips (defense) |

## Phase-Specific Tag Patterns

### Home / Serve Receive
- **Passers** (usually OH1, OH2, L if present): `passer`
- **Middle at net**: `quick` (ready for quick attack)
- **Setter stacked near target**: No tag, or future tag for "setter ready"
- **Unusual first-ball hitter**: `here1`

### Base / Defense
- **Front row players at net**: `block`
- **Back row players in position**: `tips` (if covering tips) or no tag
- **Back row attack threat**: `pipe` (if applicable)

## Game Flow Cycle

```
┌─────────────────────────────────────────────────────┐
│                    SERVE                            │
│   (Your team serves - opponent receives)            │
└───────────────────────┬─────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│                DEFENSE PHASE                        │
│   (Opponent attacks - your team defends)            │
│   Players at Base positions                         │
└───────────────────────┬─────────────────────────────┘
                        ↓ (if you dig successfully)
┌─────────────────────────────────────────────────────┐
│             TRANSITION TO OFFENSE                   │
│   (Your team attacks - opponent defends)            │
│   Players approach for attack                       │
└───────────────────────┬─────────────────────────────┘
                        ↓ (ball goes over)
┌─────────────────────────────────────────────────────┐
│                DEFENSE PHASE                        │
│   (Loop continues until point scored)              │
└─────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────┐
│                 SERVE RECEIVE                       │
│   (Opponent serves - your team receives)            │
│   Players in receive formation                      │
└───────────────────────┬─────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│             TRANSITION TO OFFENSE                   │
│   (Pass → Set → Attack)                             │
│   Setter releases, hitters approach                 │
└───────────────────────┬─────────────────────────────┘
                        ↓ (ball goes over)
┌─────────────────────────────────────────────────────┐
│                DEFENSE PHASE                        │
│   (Opponent attacks - your team defends)            │
│   Players move to Base positions                    │
└─────────────────────────────────────────────────────┘
```

## Rotation-Specific Notes

### 5-1 System
- **Rotations 1-3**: Setter in back row → 3 front-row attackers
- **Rotations 4-6**: Setter in front row → 2 front-row attackers only
- **Libero**: Replaces back-row middle blocker (MB1 or MB2)

### 6-2 System
- Two setters, each sets from back row only
- **Rotations 1-3**: Setter 1 (S1) sets from back row
- **Rotations 4-6**: Setter 2 (S2) sets from back row
- Always 3 front-row attackers

## Transcription Checklist

For each rotation and phase, capture:

- [ ] **Positions** for all 6-7 players
- [ ] **Arrows** showing movement to next phase (if applicable)
- [ ] **Tags** for player roles:
  - [ ] Passers marked
  - [ ] Quick attack ready
  - [ ] Blocking assignments
  - [ ] Any unusual first-ball hitters (here1)
- [ ] **Verify** visually against PDF diagram

## File Structure

```
lib/rotation-presets/
├── schema.ts           # Type definitions
├── WORKFLOW.md         # This document
├── 5-1/
│   ├── no-libero.ts    # All 6 rotations without libero
│   ├── libero-mb.ts    # All 6 rotations with libero in middle back
│   └── libero-lb.ts    # All 6 rotations with libero in left back
└── 6-2/
    ├── no-libero.ts
    ├── libero-mb.ts
    └── libero-lb.ts
```

Each file exports all rotations for that configuration.
