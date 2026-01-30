# User Journeys

## Journey 1: Coach tracks a game (GameTime)

**Context:** Coach Casey is at a tournament. Her team is about to play their second match.

### Steps:

1. **Open app** → Sees quick access to GameTime (prominent, not buried)
2. **Start game** → Picks her saved team "Beach Boys" (or quick-starts without a team)
3. **Set starting rotation** → Taps "R3" (they're starting in rotation 3 today)
4. **Set who serves** → Taps "They serve"
5. **Game begins** → Sees rotation 3 layout with player positions
6. **Point scored** → Opponent scores. Taps "They scored." Display stays on R3 (no rotation on opponent point when they're serving)
7. **Point scored** → Her team scores. Taps "We scored." They now serve. Display still R3.
8. **Point scored** → Her team scores again. Taps "We scored." They rotate to R4. Display updates.
9. **Mistake** → She tapped wrong. Hits "Undo." Back to R3.
10. **Timeout** → Glances at phone. Confirms rotation. Calls out positions to players.
11. **Substitution** → Taps "Subs" → Swaps a player → Court display updates
12. **Set ends** → Score resets, rotation stays or she adjusts for set 2
13. **Match ends** → Game saved to history

### Key UX requirements:
- Two giant buttons (we scored / they scored) always visible
- Current rotation always visible at a glance
- Undo is accessible but not in the way
- Works with one hand, glanceable
- No accidental navigation away from game screen

---

## Journey 2: Coach plans rotations (Whiteboard)

**Context:** Coach Casey is at home preparing for tomorrow's match. She wants to review her team's rotation system and make a small adjustment.

### Steps:

1. **Open app** → Goes to Whiteboard
2. **Load team** → Selects "Beach Boys" so she sees player names on tokens
3. **Browse rotations** → Swipes through R1 → R2 → R3 viewing base positions
4. **Focus on R4** → This is where they struggle. Stops here.
5. **Step through phases** → Pre-serve → Serve receive → Transition → Attack
6. **Spot issue** → OH2 is in a bad spot during serve receive
7. **Adjust position** → Drags OH2 to a better location
8. **Save** → Layout saves automatically or with confirmation
9. **Review other rotations** → Continues browsing, makes no other changes
10. **Share** → Sends link to assistant coach

### Key UX requirements:
- Easy rotation switching (swipe or tap)
- Phase stepping is clear and linear
- Drag-drop feels responsive
- Saves don't require extra steps
- Team context persists across sessions

---

## Journey 3: Player learns rotations (Whiteboard)

**Context:** Pat just moved from middle blocker to outside hitter. She wants to understand her new position's movement patterns.

### Steps:

1. **Open app** → Goes to Whiteboard
2. **No team selected** → Sees generic position labels (OH1, OH2, MB1, etc.) - that's fine for learning
3. **Highlight OH1** → Taps OH1 token or a "highlight role" control
4. **OH1 is now emphasized** → Other positions fade slightly
5. **Browse rotations** → Swipes R1 → R2 → R3... sees OH1's court position change
6. **Step through phases** → Watches OH1 move from base to serve receive to attack approach
7. **Understand pattern** → "Oh, in R1 I'm front row, by R4 I'm back row serving"
8. **Clear highlight** → Taps again to see full team
9. **Try another role** → Highlights setter to understand their movement

### Key UX requirements:
- Works without a saved team (generic labels are meaningful)
- Role highlighting is obvious and togglable
- Phase progression is learnable (coach might not be there to explain)
- Visual design helps convey "you are here" vs "others"

---

## Journey 4: First-time setup

**Context:** Coach Casey just downloaded the app before a tournament.

### Steps:

1. **Open app** → Sees a clear starting point (not a wall of features)
2. **Quick option** → Can jump straight to GameTime without setup
3. **Or setup team** → Creates "Beach Boys", adds 8 players with numbers
4. **Assign positions** → Drags players to OH1, OH2, MB1, MB2, S, OPP, L, L2
5. **Done** → Team is saved, she's ready for the tournament
6. **Next time** → Opens app, team is remembered, GameTime is one tap away

### Key UX requirements:
- Not blocked by setup if user just wants to try it
- Team creation is fast (name + players, minimal required fields)
- Position assignment is visual, not a form
- App remembers state between sessions
