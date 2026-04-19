# Shuffle Map Mode — Design

**Date:** 2026-04-18
**Status:** Approved (pending user spec review)

## Summary

Replace the existing **Rotate** map-mode option with **Shuffle**. Shuffle differs from Rotate in two ways:

1. It does **not** let the user pick a starting map. The map grid is disabled (dimmed) when Shuffle is selected, and round 1 uses the first map of the shuffled deck.
2. It guarantees no map is reused until all maps have been played — a playlist-style shuffle (deal through all 7 maps, then reshuffle).

This applies to all four modes that use Map Mode: Competitive, Survival, Gun Game, Deathmatch.

## Motivation

Rotate's current behavior (random map each rotation, no consecutive repeat) produces streaks where the same 2–3 maps can dominate even with 7 available. Users who enable variety expect all maps to show up before any repeat. Additionally, letting the user pick a starting map under Rotate is inconsistent — "I want variety" and "start me here specifically" contradict each other. Shuffle removes that contradiction.

## UX

### Button label and values

- Rename the button `ROTATE` → `SHUFFLE` in all four mode config panels.
- `data-map-mode="rotate"` → `data-map-mode="shuffle"`.
- localStorage key `miniCS_mapMode` value `'rotate'` → `'shuffle'`. Any stored `'rotate'` migrates to `'shuffle'` on load.

### Map grid disabled state

When Map Mode is Shuffle:
- The corresponding map grid (e.g. `#comp-map-grid`) gets a `shuffle-disabled` class.
- CSS: `opacity: 0.4`, `pointer-events: none`, cursor default.
- A small caption overlay — `"Shuffle active — maps chosen randomly"` — appears centered over the grid.
- Grid height is preserved (no layout shift).
- Switching back to Fixed removes the class and re-enables interaction.

### Starting map

- **Fixed**: starting map is the grid-selected map (today's behavior).
- **Shuffle**: starting map is the next entry drawn from the active mode's shuffle deck (building the deck if needed). The stored `miniCS_lastMap_<gridId>` value is ignored.

## Shuffle deck algorithm

### Data

- `GAME._shuffleDecks` — a plain object keyed by mode name (`competitive`, `survival`, `gungame`, `deathmatch`). Each entry is `{ order: number[], pos: number, lastPicked: number|null }`.
- Held in session memory only (no localStorage persistence). A page reload starts with fresh decks. **Deck state persists across matches within a session.**

### Operations

- `nextShuffleMap(modeKey)` — returns the next map index for the given mode, advancing the deck.
  1. If the deck is missing or `pos >= order.length`, (re)build it:
     - `order` = random permutation of `[0, 1, ..., mapCount-1]` (Fisher–Yates).
     - If the deck's `lastPicked` is set and equals `order[0]`, swap `order[0]` with `order[1]` (or the nearest differing slot) so the first pick never repeats the previous deck's last pick.
     - `pos = 0`.
  2. Let `idx = order[pos]`; increment `pos`; set `lastPicked = idx`; return `idx`.
- `startingShuffleMap(modeKey)` — called at match start when Map Mode is Shuffle. Returns `nextShuffleMap(modeKey)` (i.e. consumes the next deck entry). Does **not** reset the deck.
  - Consequence: successive matches in Gun Game / Deathmatch walk through the deck on each Play Again, guaranteeing all 7 maps are played before any repeats. In Competitive / Survival, subsequent matches pick up where the previous match's deck left off.

### Why session-persistent

Session-persistent decks honor the "no repeat until deck exhausted" semantic uniformly across all four modes. Without persistence, Gun Game and Deathmatch — which rotate only on Play Again — would reduce to random-with-no-consecutive-repeat, breaking the Shuffle promise. Per-mode isolation (each mode has its own deck) preserves natural variety when the user bounces between modes, and keeps each mode's rotation cadence self-contained. Decks reset cleanly on page reload, which is a reasonable boundary for "fresh shuffle".

### Rotation points (unchanged from Rotate)

- Competitive: between rounds (except round 1, which is the deck's starting map).
- Survival: between waves.
- Gun Game: on Play Again (restart).
- Deathmatch: on Play Again (restart).

## Code changes

### `index.html`

- Four instances: change `data-map-mode="rotate"` → `data-map-mode="shuffle"`, label `ROTATE` → `SHUFFLE`.
- Add CSS rule `.map-grid.shuffle-disabled { opacity: 0.4; pointer-events: none; position: relative; }` and an overlay caption style.
- Each map grid gets a sibling caption element (or a pseudo-element) that's visible only when the grid has `shuffle-disabled`.

### `js/modes/competitive.js`

- Rename `maybeRotateMap(currentIndex)` → `maybeShuffleNextMap(currentIndex)`.
- Implementation reads `GAME._selectedMapModeForMatch === 'shuffle'` and calls the shared deck helper.

### `js/core/main.js`

- Migration: after reading `miniCS_mapMode`, if value is `'rotate'`, rewrite to `'shuffle'` and update localStorage.
- When the user clicks a Map Mode button (`selectedMapMode = btn.dataset.mapMode`), also toggle the `shuffle-disabled` class on the matching map grid.
- On initial menu render, apply `shuffle-disabled` if the persisted mode is `'shuffle'`.
- On match start (competitive/survival/gungame/deathmatch), if `selectedMapMode === 'shuffle'`, use `startingShuffleMap(modeKey)` instead of the grid selection for `startingMapIdx`. The starting-map call advances the deck; subsequent in-match rotations call `nextShuffleMap(modeKey)` to continue through the deck.

### `js/ui/menu.js`

- `_getQuickPlaySettings`: if `mapMode === 'shuffle'`, override `mapIndex` with `startingShuffleMap(mode)` (which advances the deck). Still return `mapMode` so downstream code knows to use shuffle rotation.

### Shuffle helper module

- New module `js/systems/shuffle.js` exposing `nextShuffleMap(modeKey)` and `startingShuffleMap(modeKey)`. Deck state lives on `GAME._shuffleDecks`; `lastPicked` is tracked internally so callers don't need to pass a previous index. Keeps deck logic in one place and keeps `competitive.js` small.
- Attach to `window.GAME.shuffle` per project conventions.
- Loaded in `index.html` before the mode modules.

## Tests

Add or update in `tests/unit/` (new file `shuffle.test.js` for deck helper; extend existing main/menu tests for migration and UI state):

1. **Migration** — given `localStorage.miniCS_mapMode === 'rotate'`, loading the game rewrites it to `'shuffle'` and the Shuffle button becomes selected.
2. **Deck coverage** — calling `nextShuffleMap('competitive')` 7 times returns every map index exactly once.
3. **Deck reshuffles** — the 8th call produces a valid map index and starts a fresh deck (pos wraps).
4. **Boundary no-repeat** — across a reshuffle, the first pick of the new deck is never equal to the last pick of the previous deck.
5. **Per-mode isolation** — advancing `competitive`'s deck does not affect `deathmatch`'s deck.
6. **Starting map ignores selection** — when `miniCS_mapMode === 'shuffle'` and `miniCS_lastMap_comp-map-grid === '3'`, starting map comes from the deck, not index 3.
7. **UI disabled state** — selecting Shuffle adds `shuffle-disabled` to the map grid; selecting Fixed removes it.
8. **Fixed unchanged** — Fixed mode still honors the selected starting map and never advances the deck.
9. **Cross-match deck persistence** — simulating two consecutive Gun Game matches under Shuffle advances the same deck (second match's starting map is `deck[1]` of the original deck, not a fresh one).

Tests verify *what* the system should do per requirements (test against behavior, not implementation internals), per project conventions.

## REQUIREMENTS.md updates

Update the following sections:

- Lines ~376–385 (Map Mode overview): replace "Rotate" description with "Shuffle". Document deck semantics (per-mode, session-persistent, Fisher–Yates permutation, reshuffle on exhaustion with boundary-swap rule) and note that the starting map comes from the deck.
- Lines ~1360–1361 (Competitive Map Mode): describe Shuffle behavior for Competitive.
- Lines ~1615 (menu Map Mode toggle): `FIXED / SHUFFLE`, note the grid-disabled UI.
- Any remaining references to "Rotate"/"rotation" under Map Mode should be rewritten or removed.

## Non-goals

- No localStorage persistence of deck state. Decks reset on page reload.
- No UI to preview the upcoming map order.
- No change to the Fixed mode's behavior.
- No change to the rotation *points* (when rotation fires) — only the map-selection algorithm changes.

## Risks and mitigations

- **Risk:** Stale `miniCS_lastMap_*` localStorage entries could confuse debugging. *Mitigation:* leave them alone; they're ignored when Shuffle is active and remain valid for Fixed.
- **Risk:** Shared `.config-diff-btn` click handler — per CLAUDE.md, handlers must guard on `data-*` attributes. The existing Map Mode handler already checks `btn.dataset.mapMode`; we're preserving that guard.
- **Risk:** Reshuffle boundary swap could degenerate when `mapCount === 1`. *Mitigation:* early-return from `nextShuffleMap` if `mapCount <= 1` (return current index unchanged, matching current Rotate guard).
