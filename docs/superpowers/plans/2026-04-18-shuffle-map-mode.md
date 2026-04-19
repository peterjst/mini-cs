# Shuffle Map Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Rotate" map mode with "Shuffle" — a playlist-style cycle that guarantees no map is reused until all maps have been played, and disallows the user from picking a starting map.

**Architecture:** Introduce a per-mode shuffle deck held in session memory on `GAME._shuffleDecks`, exposed via `GAME.shuffle.nextShuffleMap(modeKey)` and `GAME.shuffle.startingShuffleMap(modeKey)`. Replace `_maybeRotateMap(currentIndex)` with `_maybeShuffleNextMap(modeKey, currentIndex)` so callers are mode-aware. Disable the map grid (dim + pointer-events:none + caption) when Shuffle is active. Migrate any existing `'rotate'` localStorage value to `'shuffle'` on load.

**Tech Stack:** Vanilla JS IIFE modules attaching to `window.GAME`, Three.js r160.1 (unchanged), Vitest for unit tests, HTML/CSS in `index.html`.

**Spec:** `docs/superpowers/specs/2026-04-18-shuffle-map-mode-design.md`

---

## File Structure

**New:**
- `js/systems/shuffle.js` — shuffle deck module exposing `GAME.shuffle.nextShuffleMap(modeKey)` and `GAME.shuffle.startingShuffleMap(modeKey)`. Holds `GAME._shuffleDecks`. Loaded in `index.html` before `js/modes/*`.
- `tests/unit/shuffle.test.js` — unit tests for the deck helpers.

**Modified:**
- `index.html` — rename `ROTATE` → `SHUFFLE` button in 4 panels, add caption DOM under each map grid, add CSS for `.map-grid.shuffle-disabled`, add `<script>` tag for `shuffle.js`.
- `js/core/main.js` — localStorage migration, Map Mode click handler toggles `shuffle-disabled` class, initial UI state, START button handlers use deck starting map when Shuffle, Play Again handlers pass modeKey.
- `js/ui/menu.js` — `_getQuickPlaySettings` uses deck starting map when Shuffle.
- `js/modes/competitive.js` — rename `maybeRotateMap(idx)` → `maybeShuffleNextMap(modeKey, idx)`, swap rotation logic to deck-backed. Update internal callsite. Update alias `GAME._maybeRotateMap` → `GAME._maybeShuffleNextMap` (remove old name).
- `js/modes/survival.js` — update call to `GAME._maybeShuffleNextMap('survival', survivalMapIndex)`.
- `tests/unit/main.test.js` — rewrite the existing `maybeRotateMap` describe block as `maybeShuffleNextMap` with updated semantics.
- `REQUIREMENTS.md` — update Map Mode sections to describe Shuffle.

---

## Task 1: Shuffle deck module (TDD)

**Files:**
- Create: `js/systems/shuffle.js`
- Create: `tests/unit/shuffle.test.js`

- [ ] **Step 1.1: Write the failing test file**

Create `tests/unit/shuffle.test.js`:

```javascript
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  // Load only what shuffle.js needs: GAME namespace + getMapCount
  loadModule('js/maps/shared.js');
  loadModule('js/maps/props.js');
  loadModule('js/maps/dust.js');
  loadModule('js/maps/office.js');
  loadModule('js/maps/warehouse.js');
  loadModule('js/maps/bloodstrike.js');
  loadModule('js/maps/italy.js');
  loadModule('js/maps/aztec.js');
  loadModule('js/maps/arena.js');
  loadModule('js/systems/shuffle.js');
});

beforeEach(() => {
  // Reset decks before each test so tests are independent
  GAME._shuffleDecks = {};
});

describe('GAME.shuffle.nextShuffleMap', () => {
  it('returns an integer in [0, mapCount) on first call', () => {
    var idx = GAME.shuffle.nextShuffleMap('competitive');
    expect(Number.isInteger(idx)).toBe(true);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(GAME.getMapCount());
  });

  it('returns every map index exactly once across one deck', () => {
    var mapCount = GAME.getMapCount();
    var seen = {};
    for (var i = 0; i < mapCount; i++) {
      var idx = GAME.shuffle.nextShuffleMap('competitive');
      seen[idx] = (seen[idx] || 0) + 1;
    }
    for (var k = 0; k < mapCount; k++) {
      expect(seen[k]).toBe(1);
    }
  });

  it('reshuffles after deck exhaustion (pos wraps, valid index)', () => {
    var mapCount = GAME.getMapCount();
    for (var i = 0; i < mapCount; i++) GAME.shuffle.nextShuffleMap('competitive');
    var next = GAME.shuffle.nextShuffleMap('competitive');
    expect(next).toBeGreaterThanOrEqual(0);
    expect(next).toBeLessThan(mapCount);
  });

  it('never repeats across the reshuffle boundary', () => {
    // Run many reshuffles; the first pick of any new deck must not equal
    // the last pick of the previous deck.
    var mapCount = GAME.getMapCount();
    var prev = null;
    for (var cycle = 0; cycle < 50; cycle++) {
      for (var i = 0; i < mapCount; i++) {
        var idx = GAME.shuffle.nextShuffleMap('competitive');
        if (prev !== null && i === 0) {
          expect(idx).not.toBe(prev);
        }
        if (i === mapCount - 1) prev = idx;
      }
    }
  });

  it('maintains independent decks per modeKey', () => {
    var compIdx = GAME.shuffle.nextShuffleMap('competitive');
    var dmIdx = GAME.shuffle.nextShuffleMap('deathmatch');
    // Advance competitive further; deathmatch's deck pos should stay at 1
    GAME.shuffle.nextShuffleMap('competitive');
    GAME.shuffle.nextShuffleMap('competitive');
    expect(GAME._shuffleDecks.deathmatch.pos).toBe(1);
    expect(GAME._shuffleDecks.competitive.pos).toBe(3);
    // Sanity: first picks were valid
    expect(compIdx).toBeGreaterThanOrEqual(0);
    expect(dmIdx).toBeGreaterThanOrEqual(0);
  });

  it('returns the single map when mapCount === 1', () => {
    var original = GAME._maps.slice();
    GAME._maps.length = 1;
    try {
      GAME._shuffleDecks = {};
      expect(GAME.shuffle.nextShuffleMap('competitive')).toBe(0);
      expect(GAME.shuffle.nextShuffleMap('competitive')).toBe(0);
    } finally {
      GAME._maps.length = 0;
      for (var i = 0; i < original.length; i++) GAME._maps.push(original[i]);
    }
  });
});

describe('GAME.shuffle.startingShuffleMap', () => {
  it('advances the deck by one (same as nextShuffleMap)', () => {
    var idx = GAME.shuffle.startingShuffleMap('gungame');
    expect(Number.isInteger(idx)).toBe(true);
    expect(GAME._shuffleDecks.gungame.pos).toBe(1);
  });

  it('does not reset an existing deck', () => {
    GAME.shuffle.nextShuffleMap('gungame'); // pos=1
    GAME.shuffle.nextShuffleMap('gungame'); // pos=2
    var startIdx = GAME.shuffle.startingShuffleMap('gungame');
    // pos advanced to 3, not back to 1
    expect(GAME._shuffleDecks.gungame.pos).toBe(3);
    expect(startIdx).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 1.2: Run test to confirm it fails**

Run: `npm test -- shuffle.test.js`
Expected: FAIL — cannot load `js/systems/shuffle.js` (file does not exist yet).

- [ ] **Step 1.3: Create the shuffle module**

Create `js/systems/shuffle.js`:

```javascript
// js/systems/shuffle.js — Per-mode shuffled map deck
// Exposes GAME.shuffle.nextShuffleMap(modeKey) and GAME.shuffle.startingShuffleMap(modeKey).
// Decks persist for the browser session on GAME._shuffleDecks, per-mode.
(function() {
  'use strict';

  GAME._shuffleDecks = GAME._shuffleDecks || {};

  function shuffleArray(arr) {
    // Fisher–Yates
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function buildDeck(lastPicked) {
    var mapCount = GAME.getMapCount();
    var order = [];
    for (var i = 0; i < mapCount; i++) order.push(i);
    shuffleArray(order);
    // Boundary swap: if the first entry equals the previous deck's last pick,
    // swap it with the next slot so we don't repeat across the reshuffle.
    if (lastPicked !== null && lastPicked !== undefined &&
        order.length > 1 && order[0] === lastPicked) {
      var tmp = order[0]; order[0] = order[1]; order[1] = tmp;
    }
    return { order: order, pos: 0, lastPicked: lastPicked };
  }

  function nextShuffleMap(modeKey) {
    var mapCount = GAME.getMapCount();
    if (mapCount <= 1) return 0;
    var deck = GAME._shuffleDecks[modeKey];
    if (!deck || deck.pos >= deck.order.length) {
      deck = buildDeck(deck ? deck.lastPicked : null);
      GAME._shuffleDecks[modeKey] = deck;
    }
    var idx = deck.order[deck.pos];
    deck.pos++;
    deck.lastPicked = idx;
    return idx;
  }

  function startingShuffleMap(modeKey) {
    return nextShuffleMap(modeKey);
  }

  GAME.shuffle = {
    nextShuffleMap: nextShuffleMap,
    startingShuffleMap: startingShuffleMap
  };
})();
```

- [ ] **Step 1.4: Run tests to confirm they pass**

Run: `npm test -- shuffle.test.js`
Expected: all tests pass.

- [ ] **Step 1.5: Commit**

```bash
git add js/systems/shuffle.js tests/unit/shuffle.test.js
git commit -m "feat: add per-mode shuffle deck for map selection

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Load shuffle.js and add caption CSS in index.html

**Files:**
- Modify: `index.html` (script tag + CSS + caption DOM)

- [ ] **Step 2.1: Add shuffle.js `<script>` tag**

In `index.html`, add after `<script src="js/systems/boss.js"></script>` (around line 2167):

```html
<script src="js/systems/shuffle.js"></script>
```

- [ ] **Step 2.2: Add CSS for disabled map grid**

In `index.html`, inside the `<style>` block (find an existing `.config-map-grid` rule and add near it):

```css
.config-map-grid.shuffle-disabled {
  opacity: 0.4;
  pointer-events: none;
  position: relative;
}
.config-map-grid.shuffle-disabled .config-map-btn {
  cursor: default;
}
.map-shuffle-caption {
  display: none;
  color: #aaa;
  font: 11px monospace;
  text-align: center;
  margin: 4px 0 8px 0;
  letter-spacing: 1px;
}
.config-map-grid.shuffle-disabled + .map-shuffle-caption {
  display: block;
}
```

- [ ] **Step 2.3: Add caption DOM under each mode's map grid**

In `index.html`, after each of the four `<div class="config-map-grid" id="...">` elements (lines ~1711, ~1733, ~1754, ~1775), add a caption sibling immediately after the closing `</div>`:

For `#comp-map-grid`:
```html
<div class="config-map-grid" id="comp-map-grid"></div>
<div class="map-shuffle-caption">SHUFFLE ACTIVE — MAPS CHOSEN RANDOMLY</div>
```

Repeat identical caption insertion for `#surv-map-grid`, `#gg-map-grid`, `#dm-config-map-grid`.

- [ ] **Step 2.4: Rename ROTATE → SHUFFLE in the 4 Map Mode button rows**

Find each occurrence (lines ~1715, ~1737, ~1758, ~1779). Change:
```html
<button class="config-diff-btn" data-map-mode="rotate">ROTATE</button>
```
to:
```html
<button class="config-diff-btn" data-map-mode="shuffle">SHUFFLE</button>
```

- [ ] **Step 2.5: Smoke-test the menu in a browser**

Open `index.html` (or run the project's dev server if one exists — check `package.json` scripts first). Verify:
- The mode config panels show "SHUFFLE" instead of "ROTATE".
- The Map Mode buttons are clickable (no JS errors in console).
- The map grid still displays.

Note: the disabled-state visual effect won't work yet — that's wired up in Task 4.

- [ ] **Step 2.6: Commit**

```bash
git add index.html
git commit -m "feat: rename ROTATE→SHUFFLE buttons and add shuffle caption markup

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Replace maybeRotateMap with maybeShuffleNextMap (deck-backed)

**Files:**
- Modify: `js/modes/competitive.js:9-16, 90, 352, 358`
- Modify: `js/modes/survival.js:113`
- Modify: `js/core/main.js:855, 866, 876, 887-889`
- Modify: `tests/unit/main.test.js:361-399`

- [ ] **Step 3.1: Update the failing test for `maybeShuffleNextMap`**

In `tests/unit/main.test.js`, replace the entire `describe('maybeRotateMap', ...)` block (lines 361–399) with:

```javascript
describe('maybeShuffleNextMap', () => {
  beforeEach(() => {
    GAME._shuffleDecks = {};
  });

  it('returns the same index when map mode is fixed', () => {
    GAME._setMapModeForMatch('fixed');
    expect(GAME._maybeShuffleNextMap('competitive', 0)).toBe(0);
    expect(GAME._maybeShuffleNextMap('competitive', 3)).toBe(3);
  });

  it('returns a different index when map mode is shuffle (multi-map)', () => {
    GAME._setMapModeForMatch('shuffle');
    // Advance the deck a few times; every returned index should be valid
    for (var i = 0; i < 20; i++) {
      var result = GAME._maybeShuffleNextMap('competitive', 2);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(GAME.getMapCount());
    }
  });

  it('cycles through every map exactly once per deck under shuffle', () => {
    GAME._setMapModeForMatch('shuffle');
    var mapCount = GAME.getMapCount();
    var seen = {};
    for (var i = 0; i < mapCount; i++) {
      seen[GAME._maybeShuffleNextMap('competitive', 0)] = true;
    }
    expect(Object.keys(seen).length).toBe(mapCount);
  });

  it('never repeats across the reshuffle boundary under shuffle', () => {
    GAME._setMapModeForMatch('shuffle');
    var mapCount = GAME.getMapCount();
    for (var i = 0; i < mapCount - 1; i++) GAME._maybeShuffleNextMap('competitive', 0);
    var last = GAME._maybeShuffleNextMap('competitive', 0); // final of deck
    var first = GAME._maybeShuffleNextMap('competitive', 0); // first of new deck
    expect(first).not.toBe(last);
  });

  it('returns same index when only one map exists (shuffle mode)', () => {
    var originalMaps = GAME._maps.slice();
    GAME._maps.length = 1;
    try {
      GAME._setMapModeForMatch('shuffle');
      GAME._shuffleDecks = {};
      expect(GAME._maybeShuffleNextMap('competitive', 0)).toBe(0);
    } finally {
      GAME._maps.length = 0;
      for (var i = 0; i < originalMaps.length; i++) GAME._maps.push(originalMaps[i]);
    }
  });
});
```

Also add the `beforeEach` import if not already present at the top of the file:

```javascript
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
```

(Check the existing import line and merge — only add `beforeEach` if missing.)

- [ ] **Step 3.2: Update main.test.js beforeAll to load shuffle.js**

In `tests/unit/main.test.js`, inside the `beforeAll` block, add a `loadModule('js/systems/shuffle.js')` line before `loadModule('js/modes/competitive.js')`:

```javascript
loadModule('js/systems/bomb.js');
loadModule('js/systems/boss.js');
loadModule('js/systems/shuffle.js');
loadModule('js/modes/competitive.js');
```

- [ ] **Step 3.3: Run the test to verify it fails**

Run: `npm test -- main.test.js`
Expected: FAIL — `GAME._maybeShuffleNextMap is not a function` (still only exposes `_maybeRotateMap`).

- [ ] **Step 3.4: Refactor `js/modes/competitive.js`**

Replace the existing `maybeRotateMap` function (lines ~8–16) and its exports:

Old (lines 8–16):
```javascript
  // ── Map Rotation Helper ──────────────────────────────────
  function maybeRotateMap(currentIndex) {
    if (GAME._selectedMapModeForMatch !== 'rotate') return currentIndex;
    var mapCount = GAME.getMapCount();
    if (mapCount <= 1) return currentIndex;
    var newMap;
    do { newMap = Math.floor(Math.random() * mapCount); } while (newMap === currentIndex);
    return newMap;
  }
```

New:
```javascript
  // ── Map Shuffle Helper ───────────────────────────────────
  function maybeShuffleNextMap(modeKey, currentIndex) {
    if (GAME._selectedMapModeForMatch !== 'shuffle') return currentIndex;
    var mapCount = GAME.getMapCount();
    if (mapCount <= 1) return currentIndex;
    return GAME.shuffle.nextShuffleMap(modeKey);
  }
```

Update the internal callsite (line ~90, inside `startRound`):

Old:
```javascript
    if (roundNumber > 1) GAME._currentMapIndex = maybeRotateMap(GAME._currentMapIndex);
```

New:
```javascript
    if (roundNumber > 1) GAME._currentMapIndex = maybeShuffleNextMap('competitive', GAME._currentMapIndex);
```

Update the module exports at the bottom of the file (line ~352). Old:
```javascript
    maybeRotateMap: maybeRotateMap
```

New:
```javascript
    maybeShuffleNextMap: maybeShuffleNextMap
```

Update the global exposure (line ~358):

Old:
```javascript
  GAME._maybeRotateMap = maybeRotateMap;
```

New:
```javascript
  GAME._maybeShuffleNextMap = maybeShuffleNextMap;
```

(Leave `GAME._setMapModeForMatch` on line 359 unchanged.)

- [ ] **Step 3.5: Update `js/modes/survival.js` callsite**

Find line ~113:

Old:
```javascript
    var newMapIndex = GAME._maybeRotateMap(survivalMapIndex);
```

New:
```javascript
    var newMapIndex = GAME._maybeShuffleNextMap('survival', survivalMapIndex);
```

- [ ] **Step 3.6: Update `js/core/main.js` callsites and alias**

Find line ~855 (Survival Play Again):

Old:
```javascript
      GAME.modes.survival.start(GAME._maybeRotateMap(GAME.modes.survival.getMapIndex()));
```

New:
```javascript
      GAME.modes.survival.start(GAME._maybeShuffleNextMap('survival', GAME.modes.survival.getMapIndex()));
```

Find line ~866 (Gun Game Play Again):

Old:
```javascript
      GAME.modes.gungame.start(GAME._maybeRotateMap(GAME.modes.gungame.getMapIndex()));
```

New:
```javascript
      GAME.modes.gungame.start(GAME._maybeShuffleNextMap('gungame', GAME.modes.gungame.getMapIndex()));
```

Find line ~876 (Deathmatch Play Again):

Old:
```javascript
      GAME.modes.deathmatch.start(GAME._maybeRotateMap(GAME.modes.deathmatch.getMapIndex()));
```

New:
```javascript
      GAME.modes.deathmatch.start(GAME._maybeShuffleNextMap('deathmatch', GAME.modes.deathmatch.getMapIndex()));
```

Find the alias block at lines ~887–889:

Old:
```javascript
  // maybeRotateMap moved to js/modes/competitive.js
  // Local alias for use by other mode functions still in main.js
  function maybeRotateMap(idx) { return GAME._maybeRotateMap(idx); }
```

New:
```javascript
  // maybeShuffleNextMap moved to js/modes/competitive.js
  // Local alias for use by other mode functions still in main.js
  function maybeShuffleNextMap(modeKey, idx) { return GAME._maybeShuffleNextMap(modeKey, idx); }
```

- [ ] **Step 3.7: Search for any remaining `maybeRotateMap` references**

Run a grep to find stragglers:

Run: `grep -rn "maybeRotateMap\|_maybeRotateMap" js/ tests/`
Expected: no matches. If any remain, update them to `maybeShuffleNextMap`/`_maybeShuffleNextMap`, passing the right modeKey.

- [ ] **Step 3.8: Run the tests**

Run: `npm test -- main.test.js shuffle.test.js`
Expected: all tests pass.

- [ ] **Step 3.9: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3.10: Commit**

```bash
git add js/modes/competitive.js js/modes/survival.js js/core/main.js tests/unit/main.test.js
git commit -m "refactor: replace maybeRotateMap with deck-backed maybeShuffleNextMap

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Wire up `shuffle-disabled` class on map grids

**Files:**
- Modify: `js/core/main.js:406–414, 443–454`
- Modify: `tests/unit/main.test.js` (add describe block)

- [ ] **Step 4.1: Write failing test for grid disabled state**

Add to `tests/unit/main.test.js` (place near the `maybeShuffleNextMap` describe):

```javascript
describe('Map Mode grid disabled state', () => {
  beforeEach(() => {
    // Reset the document structure: ensure the grid exists for the test
    if (!document.getElementById('comp-map-grid')) {
      var g = document.createElement('div');
      g.id = 'comp-map-grid';
      g.className = 'config-map-grid';
      document.body.appendChild(g);
    } else {
      document.getElementById('comp-map-grid').classList.remove('shuffle-disabled');
    }
  });

  it('adds shuffle-disabled class when GAME.applyMapModeUI is called with shuffle', () => {
    GAME.applyMapModeUI('shuffle');
    var grid = document.getElementById('comp-map-grid');
    expect(grid.classList.contains('shuffle-disabled')).toBe(true);
  });

  it('removes shuffle-disabled class when applied with fixed', () => {
    GAME.applyMapModeUI('shuffle');
    GAME.applyMapModeUI('fixed');
    var grid = document.getElementById('comp-map-grid');
    expect(grid.classList.contains('shuffle-disabled')).toBe(false);
  });
});
```

- [ ] **Step 4.2: Run test to confirm it fails**

Run: `npm test -- main.test.js`
Expected: FAIL — `GAME.applyMapModeUI is not a function`.

- [ ] **Step 4.3: Define `applyMapModeUI` at the IIFE top level in `js/core/main.js`**

The helper must be exposed on `GAME` at module load so tests (and the existing menu setup function) can call it. Place the definition near the other `GAME.*` exposures (e.g. just after the `Object.defineProperty(GAME, '_selectedMapModeForMatch', ...)` block around line 276). It reads only the DOM and its argument — it does not depend on any menu-setup-local variables:

```javascript
  function applyMapModeUI(mode) {
    var gridIds = ['comp-map-grid', 'surv-map-grid', 'gg-map-grid', 'dm-config-map-grid'];
    for (var i = 0; i < gridIds.length; i++) {
      var grid = document.getElementById(gridIds[i]);
      if (!grid) continue;
      grid.classList.toggle('shuffle-disabled', mode === 'shuffle');
    }
  }
  GAME.applyMapModeUI = applyMapModeUI;
```

- [ ] **Step 4.4: Call `applyMapModeUI` from `updateCompModeUI`**

In the `updateCompModeUI` function (around lines 406–414), after the existing Map Mode button-sync `forEach` block, add a call so menu toggles propagate to the grid state:

```javascript
      // Map mode buttons (sync all mode panels)
      var mapModeRows = [dom.compMapModeRow, dom.survMapModeRow, dom.ggMapModeRow, dom.dmMapModeRow];
      mapModeRows.forEach(function(row) {
        if (!row) return;
        row.querySelectorAll('.config-diff-btn').forEach(function(b) {
          b.classList.toggle('selected', b.dataset.mapMode === selectedMapMode);
        });
      });
      GAME.applyMapModeUI(selectedMapMode);
    }
```

The final `updateCompModeUI();` call (line ~456) remains and triggers initial state on menu setup.

- [ ] **Step 4.5: Run test to verify it passes**

Run: `npm test -- main.test.js`
Expected: pass.

- [ ] **Step 4.6: Manual smoke test in browser**

Open `index.html`, expand any mode card:
- When Map Mode is **Fixed**, the map grid is fully visible and clickable.
- Clicking **Shuffle** dims the grid to 40% opacity, disables pointer events, and shows "SHUFFLE ACTIVE — MAPS CHOSEN RANDOMLY" beneath it.
- Clicking **Fixed** again restores the grid.
- The state syncs across all four mode panels (Competitive, Survival, Gun Game, Deathmatch).

- [ ] **Step 4.7: Commit**

```bash
git add js/core/main.js tests/unit/main.test.js
git commit -m "feat: dim map grid and show caption when Shuffle is active

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: START button handlers use deck for starting map

**Files:**
- Modify: `js/core/main.js:477–525`

- [ ] **Step 5.1: Write failing test**

Add to `tests/unit/main.test.js`:

```javascript
describe('Start handlers honor shuffle starting map', () => {
  beforeEach(() => {
    GAME._shuffleDecks = {};
  });

  it('GAME.resolveStartingMap returns the grid index under fixed', () => {
    var idx = GAME.resolveStartingMap('competitive', 'fixed', 3);
    expect(idx).toBe(3);
  });

  it('GAME.resolveStartingMap ignores the grid index under shuffle and advances the deck', () => {
    var idx = GAME.resolveStartingMap('competitive', 'shuffle', 3);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(GAME.getMapCount());
    expect(GAME._shuffleDecks.competitive.pos).toBe(1);
  });
});
```

- [ ] **Step 5.2: Run test to verify it fails**

Run: `npm test -- main.test.js`
Expected: FAIL — `GAME.resolveStartingMap is not a function`.

- [ ] **Step 5.3: Add `resolveStartingMap` helper to `js/core/main.js`**

Near the top of the outer IIFE in `main.js` (somewhere alongside other `GAME.*` exposures, e.g. just after the `_selectedMapMode` Object.defineProperty block around line 276), add:

```javascript
  function resolveStartingMap(modeKey, mapMode, gridSelectedIndex) {
    if (mapMode === 'shuffle') return GAME.shuffle.startingShuffleMap(modeKey);
    return gridSelectedIndex;
  }
  GAME.resolveStartingMap = resolveStartingMap;
```

- [ ] **Step 5.4: Use `resolveStartingMap` in the four START handlers**

Update `js/core/main.js` lines ~477–525. Each handler currently reads `mapIdx` from the grid. Wrap with `resolveStartingMap`:

Competitive START (around line 477):

Old:
```javascript
    dom.compStartBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuStartClick();
      var mapEl = document.querySelector('#comp-map-grid .config-map-btn.selected');
      var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
```

New:
```javascript
    dom.compStartBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuStartClick();
      var mapEl = document.querySelector('#comp-map-grid .config-map-btn.selected');
      var gridIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
      var mapIdx = GAME.resolveStartingMap('competitive', selectedMapMode, gridIdx);
```

Apply the same pattern to:
- `dom.compBossBtn` handler (around line 491): same change, modeKey `'competitive'`.
- `dom.survStartBtn` handler (around line 506): modeKey `'survival'`.
- `dom.ggStartBtn` handler (around line 513): modeKey `'gungame'`.
- `dom.dmStartBtn2` handler (around line 520): modeKey `'deathmatch'`.

- [ ] **Step 5.5: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5.6: Manual smoke test**

Open `index.html`, select Shuffle in Competitive, pick any map in the grid (though it's dimmed — it won't update selection — but an existing `data-map` may already be `selected` from prior state), click START:
- The game should start on a random map (not necessarily the one highlighted).
- Round 1 displays some map; round 2 rotates to a different map and does not repeat until all 7 have played.

- [ ] **Step 5.7: Commit**

```bash
git add js/core/main.js tests/unit/main.test.js
git commit -m "feat: START handlers draw starting map from shuffle deck

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: Quick Play honors shuffle

**Files:**
- Modify: `js/ui/menu.js:163–177`
- Modify: `tests/unit/main.test.js` or new `tests/unit/menu.test.js`

- [ ] **Step 6.1: Add failing test**

Add to `tests/unit/main.test.js` (quick-play settings are exposed via `GAME.getQuickPlaySettings`):

```javascript
describe('Quick Play honors shuffle map mode', () => {
  beforeEach(() => {
    GAME._shuffleDecks = {};
    localStorage.setItem('miniCS_lastMode', 'competitive');
  });

  it('overrides the stored map index with a deck draw under shuffle', () => {
    localStorage.setItem('miniCS_mapMode', 'shuffle');
    localStorage.setItem('miniCS_lastMap_comp-map-grid', '4');
    var s = GAME.getQuickPlaySettings();
    expect(s.mapMode).toBe('shuffle');
    expect(GAME._shuffleDecks.competitive.pos).toBe(1);
    expect(s.mapIndex).toBeGreaterThanOrEqual(0);
    expect(s.mapIndex).toBeLessThan(GAME.getMapCount());
  });

  it('uses the stored map index under fixed', () => {
    localStorage.setItem('miniCS_mapMode', 'fixed');
    localStorage.setItem('miniCS_lastMap_comp-map-grid', '4');
    var s = GAME.getQuickPlaySettings();
    expect(s.mapMode).toBe('fixed');
    expect(s.mapIndex).toBe(4);
  });
});
```

- [ ] **Step 6.2: Run test to verify it fails**

Run: `npm test -- main.test.js`
Expected: FAIL — under shuffle, `s.mapIndex` is still `4`.

- [ ] **Step 6.3: Update `_getQuickPlaySettings` in `js/ui/menu.js`**

Replace the body of `_getQuickPlaySettings` (lines ~163–177):

Old:
```javascript
  function _getQuickPlaySettings() {
    var mode = localStorage.getItem('miniCS_lastMode') || 'competitive';
    var difficulty = localStorage.getItem('miniCS_difficulty') || 'normal';
    var mapMode = localStorage.getItem('miniCS_mapMode') || 'fixed';
    var gridId = _qpGridIds[mode] || 'comp-map-grid';
    var mapIndex = parseInt(localStorage.getItem('miniCS_lastMap_' + gridId)) || 0;
    if (mapIndex >= GAME.getMapCount()) mapIndex = 0;

    // First-time fallback: random map
    if (!localStorage.getItem('miniCS_lastMode')) {
      mapIndex = Math.floor(Math.random() * GAME.getMapCount());
    }

    return { mode: mode, difficulty: difficulty, mapMode: mapMode, mapIndex: mapIndex };
  }
```

New:
```javascript
  function _getQuickPlaySettings() {
    var mode = localStorage.getItem('miniCS_lastMode') || 'competitive';
    var difficulty = localStorage.getItem('miniCS_difficulty') || 'normal';
    var mapMode = localStorage.getItem('miniCS_mapMode') || 'fixed';
    var gridId = _qpGridIds[mode] || 'comp-map-grid';
    var mapIndex = parseInt(localStorage.getItem('miniCS_lastMap_' + gridId)) || 0;
    if (mapIndex >= GAME.getMapCount()) mapIndex = 0;

    // First-time fallback: random map
    if (!localStorage.getItem('miniCS_lastMode')) {
      mapIndex = Math.floor(Math.random() * GAME.getMapCount());
    }

    // Shuffle mode: draw the starting map from the deck, ignoring the stored index.
    if (mapMode === 'shuffle' && GAME.shuffle) {
      mapIndex = GAME.shuffle.startingShuffleMap(mode);
    }

    return { mode: mode, difficulty: difficulty, mapMode: mapMode, mapIndex: mapIndex };
  }
```

- [ ] **Step 6.4: Run the test**

Run: `npm test -- main.test.js`
Expected: pass.

- [ ] **Step 6.5: Commit**

```bash
git add js/ui/menu.js tests/unit/main.test.js
git commit -m "feat: Quick Play draws starting map from shuffle deck

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: localStorage migration from 'rotate' to 'shuffle'

**Files:**
- Modify: `js/core/main.js:198–200`
- Modify: `tests/unit/main.test.js`

- [ ] **Step 7.1: Add failing test**

Add to `tests/unit/main.test.js`:

```javascript
describe('localStorage migration', () => {
  it('migrates miniCS_mapMode=rotate to shuffle via GAME.migrateMapMode', () => {
    localStorage.setItem('miniCS_mapMode', 'rotate');
    var mode = GAME.migrateMapMode();
    expect(mode).toBe('shuffle');
    expect(localStorage.getItem('miniCS_mapMode')).toBe('shuffle');
  });

  it('leaves miniCS_mapMode=fixed untouched', () => {
    localStorage.setItem('miniCS_mapMode', 'fixed');
    var mode = GAME.migrateMapMode();
    expect(mode).toBe('fixed');
    expect(localStorage.getItem('miniCS_mapMode')).toBe('fixed');
  });

  it('leaves miniCS_mapMode=shuffle untouched', () => {
    localStorage.setItem('miniCS_mapMode', 'shuffle');
    var mode = GAME.migrateMapMode();
    expect(mode).toBe('shuffle');
    expect(localStorage.getItem('miniCS_mapMode')).toBe('shuffle');
  });

  it('defaults to fixed when unset', () => {
    localStorage.removeItem('miniCS_mapMode');
    var mode = GAME.migrateMapMode();
    expect(mode).toBe('fixed');
  });
});
```

- [ ] **Step 7.2: Run test to verify it fails**

Run: `npm test -- main.test.js`
Expected: FAIL — `GAME.migrateMapMode is not a function`.

- [ ] **Step 7.3: Add the migration helper in `js/core/main.js`**

Replace lines ~198–200:

Old:
```javascript
  // ── Map Mode (fixed / rotate) ────────────────────────
  var selectedMapMode = localStorage.getItem('miniCS_mapMode') || 'fixed';
  var selectedMapModeForMatch = 'fixed';
```

New:
```javascript
  // ── Map Mode (fixed / shuffle) ───────────────────────
  function migrateMapMode() {
    var stored = localStorage.getItem('miniCS_mapMode');
    if (stored === 'rotate') {
      localStorage.setItem('miniCS_mapMode', 'shuffle');
      return 'shuffle';
    }
    return stored || 'fixed';
  }
  GAME.migrateMapMode = migrateMapMode;
  var selectedMapMode = migrateMapMode();
  var selectedMapModeForMatch = 'fixed';
```

- [ ] **Step 7.4: Run the test**

Run: `npm test -- main.test.js`
Expected: pass.

- [ ] **Step 7.5: Commit**

```bash
git add js/core/main.js tests/unit/main.test.js
git commit -m "feat: migrate miniCS_mapMode from 'rotate' to 'shuffle' on load

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md` (sections around lines 376–385, 1360–1361, 1615)

- [ ] **Step 8.1: Replace the Map Mode overview section**

Find the block around lines 376–385 that describes Fixed/Rotate. Replace with content describing Fixed/Shuffle. Specifically:

- Line 376: change "Fixed / Rotate" → "Fixed / Shuffle".
- Lines 378–382: replace the "Rotate" bullet and sub-bullets with:

```markdown
- **Shuffle**: picks maps from a per-mode shuffled deck (random permutation of all 7 maps). Guarantees every map is played before any repeats. When the deck is exhausted, a fresh deck is drawn; the first entry of the new deck is guaranteed not to equal the last pick of the previous deck.
  - **Competitive**: first round draws from the deck; subsequent rounds continue drawing. Play Again draws the next map from the deck.
  - **Deathmatch**: draws from the deck on start and on Play Again.
  - **Gun Game**: draws from the deck on start and on Play Again.
  - **Survival**: draws between waves (full scene rebuild with player state preserved) and on Play Again.
- Shuffle decks are per-mode and persist for the browser session. Each mode has an independent sequence.
- When Shuffle is selected, the map grid in the config panel is dimmed (40% opacity, pointer-events: none) with a caption "SHUFFLE ACTIVE — MAPS CHOSEN RANDOMLY" — the user cannot designate a starting map.
- Legacy `miniCS_mapMode = 'rotate'` values are migrated to `'shuffle'` on load.
```

- Line 383: update "Fixed / Rotate" → "Fixed / Shuffle".
- Line 385: replace `maybeRotateMap` → `maybeShuffleNextMap(modeKey, currentIndex)` and note the deck-backed implementation in `js/systems/shuffle.js`.

- [ ] **Step 8.2: Update the Competitive-specific mentions**

Lines ~1360–1361: replace with:

```markdown
- **Map Mode = Shuffle**: Round 1 draws the starting map from the competitive shuffle deck (ignoring any grid selection); subsequent rounds continue drawing from the deck. Guarantees no repeats until all 7 maps have been played.
- **Map Mode = Fixed**: Map stays on the selected map for the entire match (default)
```

- [ ] **Step 8.3: Update the menu-description mention**

Line ~1615: change `FIXED / ROTATE` → `FIXED / SHUFFLE`. Add a sentence noting the dimmed map grid under Shuffle.

- [ ] **Step 8.4: Search for any remaining "rotate" / "rotation" references under Map Mode**

Run: `grep -n "rotate\|rotation\|Rotate\|Rotation\|ROTATE" REQUIREMENTS.md`

For each match:
- If the match refers to map rotation, update it to describe shuffle.
- If the match is about something else (prop rotation, minimap rotation, geometry rotation), leave it alone.

- [ ] **Step 8.5: Run the test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 8.6: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: document Shuffle map mode behavior in REQUIREMENTS

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: Final verification

**Files:** none (verification only)

- [ ] **Step 9.1: Full test suite**

Run: `npm test`
Expected: all tests pass with no failures.

- [ ] **Step 9.2: Grep for any lingering `rotate` references in product code**

Run: `grep -rn "maybeRotateMap\|data-map-mode=\"rotate\"\|map-mode.*rotate\|ROTATE" js/ index.html`

Expected: no matches in product code (only unrelated transform/CSS `rotate()` usages in `index.html` or `js/` for non-map-mode contexts are acceptable — visually inspect each hit).

- [ ] **Step 9.3: Manual smoke test**

Open `index.html` and exercise each mode with **Shuffle** selected:

1. Fresh page load, clear localStorage first (`localStorage.clear()` in devtools).
2. Competitive → SHUFFLE → START. Round 1 map displays; note it. Finish round (kill everyone). Round 2 map differs from round 1. Continue for 7 rounds and confirm all 7 maps appear exactly once, then round 8 repeats some map but never round 7's map.
3. Back to menu. Deathmatch → SHUFFLE → START. Map loads. Play Again — map changes. Repeat 7 times — each map different until the deck exhausts.
4. Back to menu. Gun Game → SHUFFLE → START. Same as DM: Play Again walks through deck.
5. Back to menu. Survival → SHUFFLE → START. Wave 1 map displays. Wave 2 rotates to a different map. Repeat.
6. Set `miniCS_mapMode` to `'rotate'` in devtools, reload. Verify on load: `localStorage.getItem('miniCS_mapMode') === 'shuffle'` and the SHUFFLE button is selected in all panels.
7. Toggle between FIXED and SHUFFLE in each panel — the map grid dims/undims and the caption appears/disappears.

- [ ] **Step 9.4: No commit needed if everything passes**

If any manual check fails, diagnose and fix with a dedicated commit per issue.

---

## Risk Review

- **`applyMapModeUI` hoisting** (Task 4): if the helper cannot be exposed on `GAME` at module load (because it currently lives inside `setupMenu`'s DOM-ready scope), the Task 4 tests will fail. Solution: move just the function + `GAME.applyMapModeUI` assignment out of `setupMenu` into the outer `main.js` IIFE scope. The function doesn't close over `setupMenu`-local state (only reads DOM and the `selectedMapMode` argument).
- **`resolveStartingMap` called before `GAME.shuffle` loads**: mitigated by `index.html` script order (Task 2 Step 2.1 inserts `shuffle.js` before `main.js`). Test loads also cover this in Task 1 Step 1.3 / Task 3 Step 3.2.
- **Deck reshuffles during a Competitive match with 12 rounds**: the deck exhausts at round 7; round 8 rebuilds with the boundary-swap rule, so round 8 ≠ round 7. Verified by Task 1 test "never repeats across the reshuffle boundary".
- **Legacy `miniCS_mapMode='rotate'` in the wild**: migration in Task 7 rewrites on first load. No further action.
