# Mobile Phone Support Design

**Date:** 2026-03-17
**Status:** Approved

## Overview

Add mobile phone support to Mini CS so the game is fully playable on smartphones. Desktop/laptop experience remains completely untouched — all mobile behavior is gated behind a `GAME.isMobile` flag. The approach uses an integrated touch translation layer that converts touch inputs into the same signals the existing game logic already consumes.

## Target

- Phone-only (portrait smartphones in landscape orientation)
- All game modes: Competitive, Deathmatch, Gun Game, Survival, Tour (full parity with desktop)

## Architecture

### New File: `js/touch.js`

Single new IIFE module attached to `window.GAME`. Responsibilities:

1. **Detection** — Sets `GAME.isMobile` at startup via `'ontouchstart' in window && navigator.maxTouchPoints > 0`. If false, the module does nothing.

2. **Touch controls** — Injects DOM overlay elements (joystick, buttons, weapon strip) and translates touch events into existing game signals:
   - Joystick drag → sets `GAME.player.keys` (same `{w,a,s,d}` flags `player.js` reads)
   - Look swipe → calls `GAME.player.rotate(dx, dy)` (same as mouse `movementX/Y`)
   - Buttons → trigger existing functions (`GAME.player.jump()`, crouch toggle, `GAME.weapons.reload()`)
   - Weapon strip taps → call existing weapon switch logic

3. **Auto-fire** — Each frame, raycasts from crosshair. If it hits an enemy hitbox, triggers `GAME.weapons.shoot()`. Hooks into game loop via `GAME.touch.update()`.

### Changes to Existing Files

| File | Change | Impact |
|------|--------|--------|
| `js/player.js` | Expose `rotate(dx, dy)` method (extract from mousemove handler) | Tiny refactor, no behavior change |
| `js/player.js` | Skip `pointerLock` requests when `GAME.isMobile` | 2-3 line guard |
| `js/main.js` | Call `GAME.touch.update()` in game loop if mobile | 1 line |
| `js/main.js` | Skip pointer lock logic when mobile | Small guards |
| `js/main.js` | Auto-open buy menu on buy phase start, auto-close on end (both platforms) | State transition change |
| `js/weapons.js` | No changes | None |
| `js/enemies.js` | No changes | None |
| `js/sound.js` | No changes (touchstart resume already exists) | None |
| `index.html` | Load `js/touch.js`, responsive CSS, orientation overlay, mobile buy carousel, pause button | CSS + DOM additions |
| Map files | No changes | None |

### Key Principle

Desktop code path is never altered. Every mobile-specific branch is gated behind `GAME.isMobile`. If that flag is false, the game runs exactly as it does today.

## Control Scheme

### Layout (Landscape Orientation)

- **Left side (bottom 65%):** Floating joystick zone — joystick spawns wherever left thumb touches
- **Right side (bottom 65%):** Look/aim zone — swipe to rotate camera. Auto-fires when crosshair overlaps enemy.
- **Right edge:** Jump button (bottom), Crouch button (above jump), Reload button (left of crouch) — all 44px circular buttons
- **Bottom center:** Weapon strip — horizontal row of weapon icons, tap to switch, active weapon highlighted

### Movement Joystick

- Floating style: appears where the thumb first touches within the left zone
- Outer ring (90px) defines max range, inner thumb (40px) shows current direction
- Maps to the same `{w, a, s, d}` key flags that `player.js` already reads
- Disappears when thumb lifts

### Look/Aim

- Swiping on the right zone rotates the camera
- Calls `GAME.player.rotate(dx, dy)` — same effect as mouse movement
- Sensitivity scaled appropriately for touch (tunable constant)

### Auto-Fire System

Each frame during `GAME.touch.update()`:
1. Cast a ray from camera through screen center (crosshair)
2. Test against all live enemy meshes via `THREE.Raycaster`
3. If ray hits an enemy within weapon's effective range → call `GAME.weapons.shoot()`
4. Respects existing weapon state (won't fire during reload, empty mag, fire rate cooldown)
5. Instant fire — no lock-on delay
6. Grenades excluded — grenade throw is triggered by tapping grenade in weapon strip (select + throw)

## HUD — Context-Adaptive

### Active Gameplay (Essentials Mode)
- Health + armor bar: top-left, compact
- Ammo count: top-right, compact
- Crosshair: center
- Kill feed: top-center, fades after 3 seconds
- Round timer: top-center, small
- Money: hidden
- Minimap: hidden

### Buy Phase / Round Transitions (Full Mode)
- All HUD elements visible
- Money shown prominently
- Minimap visible
- Round score / team info displayed

The switch is driven by game state — `touch.js` listens to existing state transitions (`BUY_PHASE`, `PLAYING`, `ROUND_END`, etc.) and toggles CSS classes.

## Buy Menu — Swipe Carousel

Mobile-specific buy menu (separate DOM structure from desktop, toggled by `GAME.isMobile`):
- Full-screen overlay with category tabs at top (Pistols, Rifles, SMGs, Grenades)
- Swipe horizontally through weapons within a category
- Each weapon card shows: name, price, key stats (damage, fire rate)
- Tap to buy, greyed out if insufficient funds
- Close button to exit early
- **Auto-open/close on both platforms:** Buy menu opens automatically when buy phase starts, closes automatically when buy phase ends. Players can close early if done shopping. This applies to both desktop and mobile.

## Mobile Detection & Orientation

### Detection
`GAME.isMobile` set once at startup:
```
'ontouchstart' in window && navigator.maxTouchPoints > 0
```

### Landscape Enforcement
When mobile and portrait orientation detected:
- Full-screen overlay: "Rotate your phone to play" with procedural CSS rotating phone animation
- Game loop pauses
- Dismisses automatically on landscape detection via `matchMedia` / `orientationchange`
- Game resumes

### Pointer Lock
- Skip all `requestPointerLock()` calls on mobile
- Skip "click to play" pointer lock prompt
- Touch controls handle input directly

### Screen Resize
- Three.js renderer/camera aspect update (existing handler)
- Touch overlay repositions (uses `vh`/`vw` units)
- Joystick zone boundaries recalculate

## Menu & Non-Gameplay Screens

### Main Menu
- Same structure, larger tap targets (minimum 44px)
- Responsive font sizes and spacing via CSS
- Existing click handlers work with touch natively

### Pause
- Desktop: `Escape` key
- Mobile: pause button in top-right corner during gameplay
- Same pause overlay, touch-friendly button sizes

### Scoreboard
- Desktop: `Tab` hold
- Mobile: tap round timer / score area to toggle
- Same content, responsive sizing

### Round End / Match End
- Existing DOM overlays work with CSS sizing adjustments
- Larger tap targets on action buttons

## Performance Considerations
- Auto-fire raycasting against ~5-10 enemies per frame: negligible cost
- Touch event processing: lightweight DOM event handlers
- No additional draw calls — controls are DOM overlays, not rendered in Three.js
- Existing SSAO/bloom post-processing may need to be evaluated on lower-end phones (out of scope for this spec — can be addressed as a follow-up)
