# Bloodstrike Tour Description Refresh

## Problem

The Bloodstrike entry in the tour map-select grid (`index.html:2068`) describes a map that no longer exists. The current copy reads:

> Classic aim arena — blood-red enclosed arena, catwalks, symmetric layout

Three of four claims are wrong against the current `js/maps/bloodstrike.js`:

- **"blood-red"** — the map uses warm tan concrete (`0xb8a080` walls, `0x9e8a6e` floor) with reddish-brown brick accents and a sandy sky (`0xc8a878`). No red.
- **"enclosed arena"** — the map is a 60×44 rectangular loop with corridors circling a sealed inner block (40×24). The file's own header calls it "Rectangular Loop Arena."
- **"catwalks"** — single-floor map. No catwalks exist.

Only "symmetric layout" is still accurate.

## Goal

Replace the description with copy that matches the current map. Players reading the tour menu should form an accurate expectation of what they're about to play.

## Non-Goals

- Renaming the map. "Bloodstrike" stays as a legacy identity name (treated like "Dust" — the name is not a literal visual descriptor).
- Updating the other six map descriptions. They are out of scope for this change; if any are also stale, that is a separate task.
- Any code, geometry, lighting, or material changes to the map itself.
- Tests. This is static UI copy with no behavioral spec to assert.

## Change

One-line edit in `index.html:2068`:

**Before:**
```html
<div class="tour-map-desc">Classic aim arena &mdash; blood-red enclosed arena, catwalks, symmetric layout</div>
```

**After:**
```html
<div class="tour-map-desc">Loop arena &mdash; corridors circle a sealed inner block, tan concrete, brick trim</div>
```

## Why this wording

- **"Loop arena"** — names the layout's distinguishing feature (the corridor loop) rather than a gameplay framing the map no longer supports. Aim-duel framing fit the original enclosed-arena design; the loop is tactically different.
- **"corridors circle a sealed inner block"** — describes what the player will actually experience navigating the map, including why there is no traversable center.
- **"tan concrete, brick trim"** — accurate visual cue, matched to the actual palette.
- Length and `theme — features` shape match peer entries in the same grid (Dust, Office, Italy, etc.).

## Verification

Manual:

1. Open `index.html` in a browser, open the tour map-select screen, confirm the new copy renders in the Bloodstrike tile.
2. Confirm it does not overflow the tile at desktop width and at the mobile single-column breakpoint (`@media` rule at `index.html:1004`).

No automated test. Per `AGENTS.md`, tests are reserved for behavior with a clear spec; UI copy has none.

## Risk

Minimal. Static text change in a single tile of a menu. No code paths or game state affected. Reversible by reverting the one line.
