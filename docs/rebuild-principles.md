# Rebuild Principles

## 1) Fixed Viewport, Zero Page Scroll

The app frame must always fit the viewport, and the page itself must never scroll.

- The overall page does not scroll, in any screen.
- Scrolling is allowed only inside explicit internal regions (lists, panels, drawers, sheets).
- Interactions (dragging, selecting, opening tools) must not change page width/height.
- Layout stays stable as state changes. No reflow jumps, no sudden page growth.
