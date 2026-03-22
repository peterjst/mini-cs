# Tour Mode Mobile Fixes

## Problem

Two issues with Tour mode on mobile:

1. **Tour panel buttons overflow in portrait** — The `#tour-panel` map grid uses a fixed `width: 600px` with 2-column layout. On mobile in portrait mode, buttons don't fit on screen.
2. **No auto-rotate on tour start** — Other game modes enter fullscreen and lock to landscape via `_fadeMenuAndStart()` calling `GAME.fullscreen.toggle()`. Tour mode bypasses this, calling `startTour()` directly.

## Solution

### (A) Responsive Tour Panel

Make the tour map grid responsive so it works on both mobile and desktop.

**Changes to `index.html` CSS:**

- Replace fixed `width: 600px` on `.tour-maps` with `max-width: 600px; width: 90vw`
- Add responsive rules for small screens: reduce to single column, smaller font sizes and padding
- The panel container already has `overflow-y: auto` for scrolling if needed

**Key CSS adjustments:**
- `.tour-maps`: `max-width: 600px; width: 90vw` (instead of `width: 600px`)
- Media query for small viewports: single-column grid, reduced `font-size` on `.tour-map-name` and `.tour-map-desc`, reduced padding on `.tour-map-btn`
- `#tour-panel h2`: reduce `font-size` and `margin-bottom` on small screens

### (B) Auto-Rotate on Tour Start

Route tour start through the same fullscreen/landscape workflow as other modes.

**Changes to `js/main.js`:**

Currently the tour map button click handler (around line 2320) calls `startTour(mapIndex)` directly. Change this to call `_fadeMenuAndStart(function() { startTour(mapIndex); })` instead. This triggers `GAME.fullscreen.toggle()` on mobile, which requests fullscreen and locks to landscape — identical to how Competitive, Deathmatch, Gun Game, and Survival modes start.

No changes needed to `fullscreen.js` or `touch.js` — `TOURING` is already in the landscape-required states list.

## Files Modified

| File | Change |
|------|--------|
| `index.html` | Responsive CSS for `.tour-maps`, `.tour-map-btn`, `#tour-panel h2` |
| `js/main.js` | Route tour start through `_fadeMenuAndStart()` |

## Testing

- Verify tour panel fits on mobile portrait screens (various sizes)
- Verify tour panel still looks good on desktop
- Verify entering tour mode on mobile triggers fullscreen + landscape lock
- Verify exiting tour mode exits fullscreen
- Run `npm test` to confirm no regressions
