# Radial Menu for Player Tokens (Mobile)

A GTA-style hold-and-drag radial menu for interacting with player tokens on mobile. Single continuous gesture for most actions.

---

## Core Gesture

**Hold** token (~250ms) → menu appears → **drag** toward segment → **release** to confirm

Dragging to center or outside the menu cancels.

---

## Menu Layout

```
            Draw Path / Clear Path
                     ↑

      Tags ←         ●         → Assign Player

                     ↓
                 Highlight
```

Four segments, evenly spaced. Icons only (no text in segments). Current segment name shown in tooltip near top of screen.

---

## Segment Behaviors

### ↑ Draw Path / Clear Path (Contextual)

**If no path exists:** "Draw Path"
- Release enters **drawing mode**
- Token shows visual indicator (pulse, glow, "ready" state)
- User touches and drags to draw bezier path from token
- Release saves path, exits drawing mode
- Tap elsewhere (without drag) cancels drawing mode

**If path exists:** "Clear Path"
- Release immediately deletes the path
- Returns to idle

Path editing after drawing uses existing functionality (drag control point handle).

---

### → Assign Player

Assigns a different player to this position (e.g., "put Mike in at MB2").

- Release opens player picker
- Shows roster/bench — players not currently on court
- Tap a player → they are assigned to this position
- Previous player (if any) returns to bench
- Tap elsewhere to cancel

---

### ↓ Highlight

Toggles highlight state on this token.

- Release toggles highlight on/off
- Highlighted tokens have visual treatment (glow, ring, color shift — TBD)
- **Persistence:** Highlight remains until:
  - Manually toggled off via this menu
  - A new team is loaded
- Use case: Coaching emphasis, marking key players during explanation

---

### ← Tags

Opens submenu for assigning tags to this token. Supports **multiple tags** per token.

**Submenu behavior:**
- When drag enters Tags segment, submenu fans out further left
- User continues dragging to reach tag options
- Release on a tag toggles it (add if missing, remove if present)

**Submenu layout:**

```
    ┌─────────────┐
    │   Blocker   │←──┐
    │   Target    │←──┼── Tags ←    ●
    │   Decoy     │←──┤
    │   Server    │←──┘
    └─────────────┘
```

- Tags that are already applied show a checkmark or filled state
- Releasing before reaching submenu (on Tags segment itself) could:
  - Cancel (safest)
  - Or open a full-screen tag manager (alternative)

**Tag display on token:**
- Small icons, dots, or badges on/near the token
- May need refinement if tokens have many tags — "can be messy, massage later"

---

## Visual Design

### Menu Appearance
- **Diameter:** ~280-320px (thumb-friendly)
- **Dead zone:** Center ~40px radius (cancel area)
- **Position:** Appears centered on token, or offset upward so finger doesn't obscure it

### Segment States
- **Default:** Muted icon
- **Highlighted (drag hover):** Scales up slightly, color accent, maybe haptic tick
- **Disabled:** Dimmed (e.g., "Clear Path" when no path exists — though we're using contextual label instead)

### Drawing Mode Indicator
- Token pulses gently or has animated ring
- Optional tooltip: "Drag to draw path"

---

## State Machine

```
IDLE
  │
  ├─ tap → SELECT token (existing behavior)
  │
  └─ hold 250ms → MENU_OPEN
                    │
                    ├─ drag ↑ + release →
                    │     ├─ (no path) → DRAWING_MODE
                    │     │                 ├─ touch + drag + release → save path → IDLE
                    │     │                 └─ tap elsewhere → cancel → IDLE
                    │     │
                    │     └─ (has path) → delete path → IDLE
                    │
                    ├─ drag → + release → PLAYER_PICKER
                    │                       ├─ tap player → assign → IDLE
                    │                       └─ tap elsewhere → cancel → IDLE
                    │
                    ├─ drag ↓ + release → toggle highlight → IDLE
                    │
                    ├─ drag ← → TAGS_SUBMENU
                    │            ├─ continue drag to tag + release → toggle tag → IDLE
                    │            └─ release on Tags segment (not submenu) → cancel → IDLE
                    │
                    └─ drag to center / away + release → cancel → IDLE
```

---

## Edge Cases

### Token near screen edge
Menu clips. Solutions:
- Offset menu toward center of screen
- Use half-radial (only show segments that fit)

### Multiple tokens overlapping
Topmost token (or most recently interacted) receives the hold gesture.

### Quick tap vs. hold
- Tap (<250ms): Select token (existing behavior)
- Hold (≥250ms): Open radial menu

### Drawing mode interrupted
If user switches apps or gesture is interrupted during drawing mode, cancel and return to idle.

---

## No Undo

Actions are immediate and not undoable via gesture. User must:
- Re-draw a cleared path
- Re-assign a player
- Toggle highlight again
- Remove tags manually

---

## Files Likely Affected

| File | Changes |
|------|---------|
| `components/court/PlayerToken.tsx` | Hold gesture detection, drawing mode state |
| `components/court/RadialMenu.tsx` | New component for menu rendering and hit detection |
| `components/court/TagsSubmenu.tsx` | New component for tags fan-out |
| `components/court/PlayerPicker.tsx` | New or modified component for player assignment |
| `components/court/VolleyballCourt.tsx` | Orchestration, state management for modes |
| `lib/types.ts` | Tag types, highlight state on tokens |

---

## Open Design Questions (for later)

1. **Tag icons:** What icons/symbols for each tag type?
2. **Highlight style:** Glow, ring, color, or animation?
3. **Multi-tag display:** How to show many tags without clutter?
4. **Custom tags:** Allow user-defined tags, or fixed set only?
5. **Haptics:** Which moments get haptic feedback?
