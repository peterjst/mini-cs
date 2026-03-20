# Fullscreen Mode — Design Spec

## Overview

Add fullscreen support for both desktop and mobile. Desktop uses F11 keybind and a menu button. Mobile combines fullscreen with landscape orientation lock, auto-entering on game start, with back-button exit support.

## Module: `js/fullscreen.js`

New IIFE module following the project's pattern. Attaches to `GAME.fullscreen`.

### Public API

- **`init()`** — called once during game initialization. Sets up F11 listener, `fullscreenchange` event handler, and mobile `popstate` listener.
- **`toggle()`** — enters fullscreen if not active, exits if active. On mobile, also locks/unlocks landscape orientation.
- **`isActive()`** — returns `!!document.fullscreenElement` (with `webkitFullscreenElement` fallback for iOS Safari).

### Internal behavior

- Vendor-prefix fallbacks: `webkitRequestFullscreen`, `webkitExitFullscreen`, `webkitFullscreenElement`, `webkitfullscreenchange` for Safari/iOS compatibility.
- Listens for `fullscreenchange` / `webkitfullscreenchange` to keep button visuals in sync (expand vs collapse icon).
- Internal `_exitingProgrammatically` guard flag to prevent re-entrant loops between `fullscreenchange` and `popstate` handlers (see History state management below).

### Script load order

`fullscreen.js` must load **after** `touch.js` (needs `GAME.isMobile`) and **before** `main.js` (which calls `GAME.fullscreen.init()`). The fullscreen module wires its own HUD button — it does not depend on touch.js for button wiring.

## Desktop behavior

### F11 keybind
- `keydown` listener on `document` listens for F11 and calls `GAME.fullscreen.toggle()`.
- **Note:** Most browsers (Chrome, Firefox, Edge) do not allow `preventDefault()` on F11 — the native fullscreen toggle fires regardless. Since the native F11 also enters fullscreen, the net effect is acceptable: F11 enters/exits fullscreen. The `keydown` handler calls `toggle()` as a best-effort supplement to ensure orientation lock and history state are managed on mobile. On desktop, native F11 behavior is sufficient and the handler simply keeps internal state in sync via the `fullscreenchange` event.

### Menu button
- Small button in the top-right corner of the main menu.
- CSS-only icon using four absolutely-positioned corner borders (forming an expand/outward-arrows shape). In fullscreen, borders flip inward (collapse shape).
- Calls `GAME.fullscreen.toggle()` on click.
- Placed inside `#menu-screen` markup so it is automatically hidden when the menu is hidden during gameplay.
- Icon updates on `fullscreenchange` to reflect current state.

## Mobile behavior

### Auto-enter on game start
- When the player starts a game, the start-game click/tap handler calls `GAME.fullscreen.toggle()` directly and synchronously from the user gesture event — no setTimeout, animation callback, or promise chain between the tap and the `requestFullscreen()` call. Browsers require a direct user gesture for fullscreen requests.
- `toggle()` enters fullscreen on `document.documentElement` AND calls `screen.orientation.lock('landscape')`.
- This replaces any existing orientation lock logic in touch.js.
- A history state is pushed via `history.pushState()` to enable back-button exit.

### HUD button
- Small fullscreen toggle button with id `touch-fullscreen`.
- Positioned near the existing pause button (top-right area of game HUD).
- Visible only on mobile (`GAME.isMobile`).
- Tapping calls `GAME.fullscreen.toggle()`.
- Must be added to the `controlIds` array in `updateTouchControlVisibility()` in `touch.js` so it is hidden on menu/end screens and only shown during gameplay.

### Back button exit
- On entering fullscreen, push a history entry: `history.pushState({ fullscreen: true }, '')`.
- Listen for `popstate` event: if fullscreen is active, exit fullscreen + unlock orientation instead of navigating away.

### History state management
- **Guard flag:** An internal `_exitingProgrammatically` boolean prevents re-entrant loops. When exiting fullscreen programmatically (via HUD button or return-to-menu), set the flag to `true` before calling `history.back()`. The `popstate` handler checks this flag — if true, it clears the flag and does nothing (the fullscreen exit is already handled). If false (meaning the user pressed the back button), it calls `document.exitFullscreen()`.
- **On `fullscreenchange` (exit):** If `_exitingProgrammatically` is false and there is a pushed history state, call `history.back()` with the guard flag set to clean up the dangling history entry.

### Return to menu
- Exiting to the main menu calls `GAME.fullscreen.toggle()` (if active) to exit fullscreen and unlock orientation.
- Menu is viewable in any orientation (portrait or landscape).

## Orientation lock details

- Use `screen.orientation.lock('landscape')` when entering fullscreen on mobile.
- Use `screen.orientation.unlock()` when exiting fullscreen on mobile.
- Wrap in try/catch — not all browsers support the Screen Orientation API, and it may throw if not in fullscreen context. Fail silently.

## State persistence

- No localStorage persistence. Fullscreen is not remembered across sessions.
- Each visit starts windowed; player toggles via F11, menu button, or mobile auto-enter.

## UI details

### Menu button (desktop)
- Position: top-right corner of main menu, absolute positioned.
- Icon: CSS-only using four `<span>` elements absolutely positioned in the corners of a square container (~28x28px). Each span has two borders (forming an L-shape) pointing outward. In fullscreen, a `.fs-active` class flips them inward. This creates a recognizable expand/collapse icon with no images.
- Style: semi-transparent background (`rgba(0,0,0,0.4)`), matches existing menu aesthetic. Small and unobtrusive.

### HUD button (mobile)
- ID: `touch-fullscreen`.
- Position: near the existing pause button (top-right area of game HUD).
- Icon: same expand/collapse CSS icon as menu button.
- Size: touch-friendly (minimum 44x44px tap target).
- Only visible when `GAME.isMobile` is true.

## Integration points

### `index.html`
- Add `<script src="js/fullscreen.js"></script>` after `js/touch.js` and before `js/main.js`.
- Add menu button markup inside `#menu-screen`.
- Add mobile HUD button markup in the HUD section.
- Add CSS for the fullscreen buttons and icons.

### `js/main.js`
- Call `GAME.fullscreen.init()` during game initialization.
- Call `GAME.fullscreen.toggle()` synchronously from the mobile game-start click handler.
- Call exit fullscreen on return-to-menu flow (if active).

### `js/touch.js`
- Remove any existing orientation lock logic that this feature replaces.
- Add `'touch-fullscreen'` to the `controlIds` array in `updateTouchControlVisibility()`.

### `REQUIREMENTS.md`
- Add a new "Fullscreen Mode" section documenting desktop keybind (F11), menu button, mobile auto-enter with orientation lock, HUD button, back-button exit, and no persistence.

## Testing

Tests should verify:
- `toggle()` calls `requestFullscreen` / `exitFullscreen` appropriately.
- `isActive()` returns correct state based on `document.fullscreenElement`.
- F11 keydown triggers toggle.
- Mobile: `popstate` handler exits fullscreen when active.
- Mobile: `popstate` handler is a no-op when `_exitingProgrammatically` guard is set.
- Mobile: orientation lock/unlock is called on enter/exit.
- Button visibility: menu button inside `#menu-screen`, HUD button shown only on mobile during gameplay.
- History state management: push on enter, clean up on exit without re-entrant loops.
- Unsupported browser fallback: when `requestFullscreen` is undefined, `toggle()` is a no-op and buttons are hidden.

## Error handling

- Fullscreen API calls wrapped in `.catch()` — some browsers reject fullscreen requests outside user gestures. Fail silently.
- `screen.orientation.lock()` wrapped in try/catch — not universally supported. Fail silently.
- If Fullscreen API is completely unsupported, `toggle()` is a no-op and buttons are hidden.

## Scope exclusions

- No settings UI for fullscreen preferences.
- No localStorage persistence.
- No custom fullscreen for embedded iframes.
