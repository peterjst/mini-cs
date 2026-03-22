# Mobile Fire Button Design Spec

**Date:** 2026-03-20
**Status:** Approved

## Problem

On mobile, the AK-47 (and other full-auto weapons) cannot deliver controlled bursts. The current look-zone gesture system offers only two firing modes: a quick tap (single shot) or hold-still (full spray). There is no way to intentionally fire 3-5 rounds in a controlled burst because dragging to aim interferes with the fire gesture.

## Solution

Add a large, floating FIRE button on the right side of the mobile HUD. This button coexists with the existing look-zone tap-to-fire and hold-to-fire gestures — it is an additional fire input, not a replacement.

## Behavior

- **Tap** the button: fires a single shot (for semi-auto weapons) or 1-2 rounds (for full-auto weapons, depending on fire rate)
- **Hold** the button: continuous fire for the duration of the hold — the player controls burst length by timing the press duration
- This mirrors desktop mouse behavior exactly (click = single, hold = continuous)

### Touch Mechanics

- `touchstart` on the fire button → sets `GAME.touchFiring = true`
- `touchend` / `touchcancel` → sets `GAME.touchFiring = false`
- Track the touch ID to prevent interference with other touch controls
- Touches that originate on the look zone and swipe over the fire button do NOT trigger firing — only touches that **start** on the fire button activate it (standard touch ID isolation pattern already used by all other touch controls)

## Visual Design

| Property | Value |
|----------|-------|
| Size | ~72x72px (larger than 48px action buttons for easy thumb access) |
| Shape | Circular, matching existing `.touch-btn` aesthetic |
| Background | Semi-transparent dark (`rgba(0,0,0,0.5)`) |
| Border | Red-tinted (`rgba(255,80,80,0.35)`) to visually distinguish as fire control |
| Text/Icon | Red-tinted label (e.g., crosshair icon or "FIRE" text) |
| Active state | Brighter border + lighter background on press |

## Placement

- Fixed position on the right side of the screen
- Vertically positioned in the lower-right area, in natural right-thumb range
- Separate from the action button cluster (Jump/Crouch/Reload) — positioned to the left of or below them to avoid overlap
- z-index: 102 (same as other touch controls)

## Coexistence with Existing Controls

- **Look-zone gestures unchanged**: tap-to-fire and hold-to-fire on the look zone continue to work as before
- **No changes to fire logic**: `tryFire()` and the main game loop already check `GAME.touchFiring` — no modifications needed
- **Touch isolation**: each control claims a touch by ID on `touchstart`; touches that originated elsewhere are ignored. The fire button follows this existing pattern.

## Files to Modify

| File | Changes |
|------|---------|
| `index.html` | Add `#touch-fire` CSS styles; add to desktop-hide media query |
| `js/touch.js` | Add fire button element creation, `touchstart`/`touchend`/`touchcancel` handlers with touch ID tracking |
| `REQUIREMENTS.md` | Document the fire button in mobile controls section |

## Out of Scope

- Burst fire modes (fixed N-round bursts per press)
- Changes to weapon fire rates or recoil
- Changes to desktop controls
- Removing or modifying look-zone gesture firing
