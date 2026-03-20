# Mobile Manual Fire Button

## Problem

The current mobile auto-fire system raycasts from screen center every frame and automatically fires when an enemy is under the crosshair. This removes player agency, eliminates trigger discipline, and makes the game too easy — essentially functioning as a built-in aimbot.

## Solution

Replace auto-fire with a manual fire button. Players hold or tap a dedicated fire button to shoot, matching the standard mobile FPS interaction pattern.

## Design

### Fire Button UI

- **Element:** `<div id="touch-fire">` with crosshair symbol text (`+` or `✛`)
- **Size:** 64x64px circle (larger than existing 44px action buttons since it's the primary combat control)
- **Position:** Right side, below the look zone, above the existing action button stack (JMP/CRC/RLD). The action buttons container shifts down to make room, or the fire button is placed outside/above the container.
- **Styling:** Red-tinted border (`rgba(255,80,80,0.4)`) and text color (`rgba(255,80,80,0.7)`) to distinguish from utility buttons. Active state brightens to `rgba(255,80,80,0.5)` background.
- **Created in:** `createActionButtons()` in `js/touch.js`, inserted as the first child of `#touch-action-buttons`

### Touch Event Handling

- `touchstart` → `GAME.touchFiring = true`
- `touchend` / `touchcancel` → `GAME.touchFiring = false`
- Both use `{ passive: false }` and call `e.preventDefault()`

This integrates with the existing firing check in `main.js`:
```javascript
if ((weapons.mouseDown || GAME.touchFiring) && player.alive) {
```

No changes needed to the weapon system, fire rate logic, or main game loop. The existing `tryFire()` call handles semi-auto vs full-auto rate limiting already.

### Auto-Fire Removal

Delete from `touch.update()`:
- The `autoFireRaycaster` variable and its lazy initialization
- The enemy mesh gathering loop
- The `raycaster.intersectObjects()` call and range check
- The `GAME.touchFiring = true` assignment inside the raycast hit block

The `GAME.touchFiring = false` reset at the top of `touch.update()` is also removed — the flag is now controlled entirely by touch events on the fire button.

### Grenade and Knife Changes

Currently, tapping a grenade slot in the weapon strip briefly sets `mouseDown = true` for 100ms to auto-throw. With a fire button available:

- **Remove** the 100ms `mouseDown` timeout hack from weapon strip grenade tap handlers
- Grenade/knife weapon slots now only **switch** to that weapon (like all other slots)
- Player uses the fire button to throw/swing — consistent with all other weapons
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
| `js/touch.js` | Add fire button in `createActionButtons()`, remove auto-fire raycast from `update()`, remove grenade auto-throw hack |
| `index.html` | Add `#touch-fire` CSS styling (size, color, position) |
| `REQUIREMENTS.md` | Update mobile auto-fire section to describe manual fire button |
| `tests/unit/touch.test.js` | Update/add tests for fire button behavior, remove auto-fire tests |
