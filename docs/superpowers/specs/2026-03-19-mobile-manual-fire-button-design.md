# Mobile Manual Fire Button

## Problem

The current mobile auto-fire system raycasts from screen center every frame and automatically fires when an enemy is under the crosshair. This removes player agency, eliminates trigger discipline, and makes the game too easy — essentially functioning as a built-in aimbot.

## Solution

Replace auto-fire with a manual fire button. Players hold or tap a dedicated fire button to shoot, matching the standard mobile FPS interaction pattern.

## Design

### Fire Button UI

- **Element:** `<div id="touch-fire">` with label `FIRE`
- **Size:** 64x64px circle (larger than existing 44px action buttons since it's the primary combat control)
- **Position:** Right side, inserted as first child of `#touch-action-buttons` (above JMP/CRC/RLD stack)
- **Styling:** Red-tinted border (`rgba(255,80,80,0.4)`) and text color (`rgba(255,80,80,0.7)`) to distinguish from utility buttons. Active state brightens to `rgba(255,80,80,0.5)` background. Must include `touch-action: none; user-select: none;` to prevent browser gesture interference.
- **Z-index:** Inherits from `#touch-action-buttons` (z-index 102), which sits above the look zone. The fire button's `touchstart` calls `e.stopPropagation()` to prevent the look zone from capturing fire touches.
- **Created in:** `createActionButtons()` in `js/touch.js`

### Touch Event Handling

- `touchstart` on fire button → record `e.changedTouches[0].identifier` as `_fireTouchId`, set `GAME.touchFiring = true`, call `e.stopPropagation()` to prevent look zone capture
- `touchend` / `touchcancel` on **document** (not just button) → if touch identifier matches `_fireTouchId`, set `GAME.touchFiring = false` and clear `_fireTouchId`
- All handlers use `{ passive: false }` and call `e.preventDefault()`

Touch ID tracking (matching the joystick pattern) prevents stuck firing when a finger slides off the button.

This integrates with the existing firing check in `main.js`:
```javascript
if ((weapons.mouseDown || GAME.touchFiring) && player.alive) {
```

No changes needed to the weapon system, fire rate logic, or main game loop. The existing `tryFire()` call handles semi-auto vs full-auto rate limiting already.

### Safety Reset

`GAME.touchFiring` is reset to `false` in `touch.update()` when `!GAME.player || !GAME.player.alive`. This prevents a stuck firing state across death, round end, or state transitions. The existing `updateHudMode()`, `updateTouchControlVisibility()`, and `updateWeaponStrip()` calls in `update()` are preserved unchanged.

### Auto-Fire Removal

Delete from `touch.update()`:
- The `autoFireRaycaster` variable and its lazy initialization
- The enemy mesh gathering loop
- The `raycaster.intersectObjects()` call and range check
- The `GAME.touchFiring = true/false` assignments from the raycast logic

### Grenade Changes

Currently, tapping a grenade slot in the weapon strip briefly sets `mouseDown = true` for 100ms to auto-throw. With a fire button available:

- **Remove** the 100ms `mouseDown` timeout hack from weapon strip grenade tap handlers
- Grenade weapon slots now only **switch** to that weapon (like all other slots)
- Player uses the fire button to throw — consistent with all other weapons
- The auto-fire exclusion list for grenades/knife in `touch.update()` is removed along with the rest of the auto-fire code

### What Does NOT Change

- Movement joystick (left side)
- Look/aim zone (right side)
- Jump, crouch, reload buttons (remain in action button stack)
- Weapon strip (top, slot switching only)
- Pause button, scoreboard tap
- Desktop controls (completely unaffected)
- Weapon definitions, fire rates, damage, range values
- `main.js` firing integration (`weapons.mouseDown || GAME.touchFiring`)

## File Changes

| File | Change |
|------|--------|
| `js/touch.js` | Add fire button in `createActionButtons()`, add document-level touchend/touchcancel with ID tracking, add safety reset in `update()`, remove auto-fire raycast from `update()`, remove grenade auto-throw hack |
| `index.html` | Add `#touch-fire` CSS styling (size, color, touch-action, position) |
| `REQUIREMENTS.md` | Update mobile auto-fire section to describe manual fire button; remove `GAME._enemyManager` from touch module exposures if no longer consumed |
| `tests/unit/touch.test.js` | Update/add tests for fire button behavior, remove auto-fire tests |
