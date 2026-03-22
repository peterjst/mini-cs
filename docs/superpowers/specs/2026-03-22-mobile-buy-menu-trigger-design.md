# Mobile Buy Menu Trigger Improvements

## Problem

Mobile players cannot access the buy menu in deathmatch mode — there is no equivalent of the desktop `B` key. Additionally, in all modes with buy phases (standard rounds, survival, touring), if a mobile player accidentally closes the buy menu, they cannot reopen it.

## Solution

Two changes:

### 1. Persistent Buy Button in Top-Right HUD

**Layout:** `[$800] [BUY] [⏸]` — money display on the left, buy button in the middle, pause button on the right.

**Money display:**
- Always visible during gameplay (even when $0), not limited to buy phases
- Positioned immediately left of the buy button

**Buy button:**
- Visible whenever buying is allowed: `BUY_PHASE`, `SURVIVAL_BUY`, `DEATHMATCH_ACTIVE`, `TOURING`
- In deathmatch, visible and functional whether the player is alive or dead (tapping while dead before the 1s auto-open fires lets the player open the menu early)
- Tapping toggles the existing touch buy grid (`showBuyCarousel` / `hideBuyCarousel`)
- Styled consistently with existing touch UI (similar sizing to the pause button)

### 2. Auto-Open Buy Menu on Deathmatch Death

**Timing within the existing 3-second respawn delay (`DEATHMATCH_PLAYER_RESPAWN_DELAY`):**

| Time after death | What happens |
|---|---|
| 0–1s | Death camera — player sees who killed them, no buy menu |
| 1–3s | Buy menu auto-opens over the death camera, player can shop |
| 3s | Player respawns, buy menu auto-closes |

**Implementation approach:**
- Use existing `dmPlayerDeadTimer` countdown — when timer crosses from above 2.0 to at or below 2.0 (i.e., 1 second has elapsed since death), trigger buy menu open on mobile via `GAME.touch._showBuyCarousel()`
- On respawn (`dmPlayerRespawn`), auto-close the buy menu via `GAME.touch._hideBuyCarousel()`

## Affected Files

| File | Changes |
|---|---|
| `js/touch.js` | Create buy button element, position money display, toggle logic |
| `js/main.js` | Auto-open buy menu during deathmatch death timer, auto-close on respawn, expose buy state for touch module |
| `index.html` | CSS for buy button and repositioned money display in top-right bar |

## Scope

- Mobile only — desktop buy menu behavior is unchanged
- No changes to buy menu content, pricing, or the buy grid itself
- No changes to respawn timing (stays at 3 seconds)
