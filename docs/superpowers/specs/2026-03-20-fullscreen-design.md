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

## Desktop behavior

### F11 keybind
- `keydown` listener on `document` intercepts F11.
- Calls `e.preventDefault()` to suppress native browser fullscreen.
- Calls `GAME.fullscreen.toggle()`.
- Works anytime (menu or in-game).

### Menu button
- Small button in the top-right corner of the main menu.
- CSS-only expand/collapse icon (no images, consistent with procedural-only approach).
- Calls `GAME.fullscreen.toggle()` on click.
- Hidden during gameplay (F11 is sufficient for desktop).
- Icon updates on `fullscreenchange` to reflect current state.

## Mobile behavior

### Auto-enter on game start
- When the player starts a game, the start-game handler calls `GAME.fullscreen.toggle()`.
- `toggle()` enters fullscreen on `document.documentElement` AND calls `screen.orientation.lock('landscape')`.
- This replaces any existing orientation lock logic.
- A history state is pushed via `history.pushState()` to enable back-button exit.

### HUD button
- Small fullscreen toggle button positioned near the existing pause button.
- Visible only on mobile (`GAME.isMobile`).
- Tapping calls `GAME.fullscreen.toggle()`.

### Back button exit
- On entering fullscreen, push a history entry: `history.pushState({ fullscreen: true }, '')`.
- Listen for `popstate` event: if fullscreen is active, exit fullscreen + unlock orientation instead of navigating away.
- Clean up: if fullscreen is exited by other means (HUD button, returning to menu), remove the extra history entry via `history.back()` or avoid double-pop.

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
- Icon: CSS-drawn expand icon (e.g., four outward-pointing corner arrows). Switches to collapse icon (inward-pointing) when fullscreen is active.
- Style: semi-transparent background, matches existing menu aesthetic. Small and unobtrusive.

### HUD button (mobile)
- Position: near the existing pause button (top-right area of game HUD).
- Icon: same expand/collapse CSS icon as menu button.
- Size: touch-friendly (minimum 44x44px tap target).
- Only visible when `GAME.isMobile` is true.

## Integration points

### `index.html`
- Add `<script src="js/fullscreen.js"></script>` before `js/main.js`.
- Add menu button markup in the menu section.
- Add mobile HUD button markup in the HUD section.
- Add CSS for the fullscreen buttons and icons.

### `js/main.js`
- Call `GAME.fullscreen.init()` during game initialization.
- Call `GAME.fullscreen.toggle()` on mobile game start (in the start-game flow).
- Call exit fullscreen on return-to-menu flow (if active).

### `js/touch.js`
- Remove any existing orientation lock logic that this feature replaces.
- Wire the mobile HUD button to `GAME.fullscreen.toggle()`.

## Testing

Tests should verify:
- `toggle()` calls `requestFullscreen` / `exitFullscreen` appropriately.
- `isActive()` returns correct state based on `document.fullscreenElement`.
- F11 keydown is intercepted and triggers toggle.
- Mobile: `popstate` handler exits fullscreen when active.
- Mobile: orientation lock/unlock is called on enter/exit.
- Button visibility: menu button shown on menu, HUD button shown only on mobile.
- History state management: push on enter, clean up on exit.

## Error handling

- Fullscreen API calls wrapped in `.catch()` — some browsers reject fullscreen requests outside user gestures. Fail silently.
- `screen.orientation.lock()` wrapped in try/catch — not universally supported. Fail silently.
- If Fullscreen API is completely unsupported, `toggle()` is a no-op and buttons are hidden.

## Scope exclusions

- No settings UI for fullscreen preferences.
- No localStorage persistence.
- No custom fullscreen for embedded iframes.
