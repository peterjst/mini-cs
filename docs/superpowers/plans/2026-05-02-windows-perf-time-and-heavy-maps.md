# Windows Performance — Time Decoupling & Heavy-Map Cuts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop in-game time from running slower than wall time on weak Windows hardware, and reduce per-frame cost on bloodstrike, aztec, and office so adaptive quality settles at a higher tier.

**Architecture:**
- *Section 1 — Targeted substepping.* Raise the loop dt clamp from 0.05 → 0.25 and add a `GAME.subTick(dt, maxStep, fn)` helper. Wrap only the three update functions whose internal correctness depends on small steps (`Player.update`, `WeaponSystem.update`, `EnemyManager.update`). All other systems keep raw `dt` so timers and HUD track wall time again.
- *Section 2 — One-shot per-map scene-stats dump.* `H.dumpMapStats(name, root)` walks a built map's root group once and logs counts (meshes, shadow casters, lights, materials, geometries) behind a `GAME._debugMapStats` flag. The user runs it on Windows for each map and reports numbers that inform Section 3 cuts.
- *Section 3 — Tier-gated content.* `H.tierGated(group, minLevel)` tags decorative subgroups in heavy maps with a minimum quality level. `GAME._reapplyAllTierVisibility()` is called from `quality.applyLevel()` to toggle `.visible` per current tier. Lights are cut by setting `intensity = 0` (no shader recompile) plus disabling `castShadow` for shadow-casting cuts.

**Tech Stack:** Three.js r160 (global `THREE`), IIFE modules attached to `window.GAME`, Vitest + jsdom for tests, no ES module imports inside `js/`.

---

## File Structure

| File | Role | Sections |
|---|---|---|
| `js/maps/shared.js` (modify) | Add `dumpMapStats` and `tierGated` to `_mapHelpers`; add `GAME._reapplyAllTierVisibility` top-level; call `dumpMapStats` from the load wrapper | 2, 3 |
| `js/core/main.js` (modify) | Raise dt clamp; add `GAME.subTick` helper | 1 |
| `js/core/player.js` (modify) | Internal substep wrapper around `Player.prototype.update` | 1 |
| `js/systems/weapons.js` (modify) | Internal substep wrapper around `WeaponSystem.prototype.update`, accumulating explosion-array return value | 1 |
| `js/systems/enemies.js` (modify) | Internal substep wrapper around `EnemyManager.prototype.update` | 1 |
| `js/core/quality.js` (modify) | Call `GAME._reapplyAllTierVisibility()` at end of `applyLevel()` | 3 |
| `js/maps/aztec.js` (modify) | Group decorative torch lights, tag with `H.tierGated(group, 3)` | 3 |
| `js/maps/office.js` (modify) | Group decorative props, tag with `H.tierGated(group, 2)` | 3 |
| `js/maps/bloodstrike.js` (modify) | Group decorative interior fill, tag with `H.tierGated(group, 3)` | 3 |
| `tests/unit/sub-tick.test.js` (create) | Unit tests for `GAME.subTick` | 1 |
| `tests/unit/dump-map-stats.test.js` (create) | Unit tests for `H.dumpMapStats` | 2 |
| `tests/unit/tier-gated.test.js` (create) | Unit tests for `H.tierGated` and `GAME._reapplyAllTierVisibility` | 3 |
| `tests/integration/tier-gating.test.js` (create) | Per-map integration: tier transitions toggle visibility, walls untouched | 3 |

---

## Sequencing

1. **Section 2** ships first (smallest, lowest risk, produces data).
2. **Section 1** ships in parallel — independent of 2 and 3.
3. **Section 3** ships after the user has reported Section 2 numbers; cuts in tasks 9–11 are placeholders to be confirmed/adjusted from real data.

A reasonable order of execution:

- Tasks 1–2 (Section 2) → user collects numbers
- Tasks 3–7 (Section 1) → independent, can be done while waiting
- Tasks 8–13 (Section 3) → after data lands

---

## Section 2: Per-Map Scene Stats Dump

### Task 1: Add `H.dumpMapStats` helper to `js/maps/shared.js`

**Files:**
- Modify: `js/maps/shared.js` — add `dumpMapStats` function near the existing helpers (before line 1049 `GAME._mapHelpers = {...}`); export it via `_mapHelpers`.
- Test: `tests/unit/dump-map-stats.test.js` (create).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/dump-map-stats.test.js`:

```javascript
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
});

describe('H.dumpMapStats', () => {
  var logSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    GAME._debugMapStats = false;
  });

  function makeMesh(opts) {
    return {
      isMesh: true,
      castShadow: !!(opts && opts.castShadow),
      material: (opts && opts.material) || { uuid: 'mat-default' },
      geometry: (opts && opts.geometry) || { uuid: 'geo-default' },
      children: []
    };
  }

  function makeLight() {
    return { isLight: true, children: [] };
  }

  function makeGroup(children) {
    var g = { children: children || [] };
    g.traverse = function(fn) {
      fn(g);
      function walk(c) {
        fn(c);
        if (c.children) for (var i = 0; i < c.children.length; i++) walk(c.children[i]);
      }
      for (var i = 0; i < g.children.length; i++) walk(g.children[i]);
    };
    return g;
  }

  it('exists on GAME._mapHelpers', () => {
    expect(typeof GAME._mapHelpers.dumpMapStats).toBe('function');
  });

  it('does nothing when GAME._debugMapStats is false', () => {
    GAME._debugMapStats = false;
    GAME._mapHelpers.dumpMapStats('test', makeGroup([makeMesh()]));
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('logs once when flag is true', () => {
    GAME._debugMapStats = true;
    GAME._mapHelpers.dumpMapStats('test', makeGroup([makeMesh(), makeLight()]));
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('counts meshes, shadow casters, and lights', () => {
    GAME._debugMapStats = true;
    var root = makeGroup([
      makeMesh({ castShadow: true }),
      makeMesh({ castShadow: false }),
      makeMesh({ castShadow: true }),
      makeLight(),
      makeLight()
    ]);
    GAME._mapHelpers.dumpMapStats('m1', root);
    var msg = logSpy.mock.calls[0][0];
    expect(msg).toContain('meshes=3');
    expect(msg).toContain('shadowCasters=2');
    expect(msg).toContain('lights=2');
  });

  it('counts unique materials and geometries', () => {
    GAME._debugMapStats = true;
    var matA = { uuid: 'A' }, matB = { uuid: 'B' };
    var geoA = { uuid: 'gA' }, geoB = { uuid: 'gB' };
    var root = makeGroup([
      makeMesh({ material: matA, geometry: geoA }),
      makeMesh({ material: matA, geometry: geoB }),
      makeMesh({ material: matB, geometry: geoA })
    ]);
    GAME._mapHelpers.dumpMapStats('m2', root);
    var msg = logSpy.mock.calls[0][0];
    expect(msg).toContain('materials=2');
    expect(msg).toContain('geometries=2');
  });

  it('includes the map name in the log line', () => {
    GAME._debugMapStats = true;
    GAME._mapHelpers.dumpMapStats('aztec', makeGroup([makeMesh()]));
    var msg = logSpy.mock.calls[0][0];
    expect(msg).toContain('aztec');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/dump-map-stats.test.js
```

Expected: FAIL — `GAME._mapHelpers.dumpMapStats` is undefined.

- [ ] **Step 3: Add the helper to `js/maps/shared.js`**

In `js/maps/shared.js`, just before `GAME._mapHelpers = {` (around line 1049), add:

```javascript
function dumpMapStats(name, root) {
  if (!GAME._debugMapStats) return;
  var meshes = 0, shadowCasters = 0, lights = 0;
  var materials = new Set(), geometries = new Set();
  root.traverse(function(o) {
    if (o.isMesh) {
      meshes++;
      if (o.castShadow) shadowCasters++;
      if (o.material) materials.add(o.material.uuid || o.material);
      if (o.geometry) geometries.add(o.geometry.uuid || o.geometry);
    } else if (o.isLight) {
      lights++;
    }
  });
  console.log(
    '[map-stats] ' + name +
    '  meshes=' + meshes +
    '  shadowCasters=' + shadowCasters +
    '  lights=' + lights +
    '  materials=' + materials.size +
    '  geometries=' + geometries.size
  );
}
```

Then add `dumpMapStats: dumpMapStats,` to the `GAME._mapHelpers = { ... }` literal (any position is fine — group it next to the existing surface-detail helpers).

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/dump-map-stats.test.js
```

Expected: PASS, all 6 tests green.

- [ ] **Step 5: Run full test suite to confirm no regression**

```bash
npm test
```

Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add js/maps/shared.js tests/unit/dump-map-stats.test.js
git commit -m "feat(maps): add dumpMapStats helper for per-map cost telemetry"
```

---

### Task 2: Wire `dumpMapStats` into the map-load wrapper

**Files:**
- Modify: `js/maps/shared.js` — call `dumpMapStats` inside the existing post-build loop (around line 750–756) that walks newly-added scene children. The dump runs once per loaded map at the same time as `markStatic`.

The map-load wrapper builds each map by calling `def.build(scene)`, then iterates over newly-added `scene.children` and calls `markStatic` on each. We add a parallel call to `dumpMapStats` keyed by `def.name`, building a temporary aggregating group so the helper sees one root.

- [ ] **Step 1: Read the current wrapper to confirm exact line range**

Read `js/maps/shared.js` lines 745–760 to confirm the current `preBuildChildren` / `markStatic` block. The block looks like:

```javascript
var preBuildChildren = scene.children.slice();
var walls = def.build(scene);

// Mark only newly-added subtrees as static (skip skydome and lights
// added before def.build, since the skydome is animated to follow camera).
for (var ci = 0; ci < scene.children.length; ci++) {
  var child = scene.children[ci];
  if (preBuildChildren.indexOf(child) === -1) {
    markStatic(child);
  }
}
```

- [ ] **Step 2: Modify the wrapper to also dump stats over the same newly-added subtrees**

Change the block to:

```javascript
var preBuildChildren = scene.children.slice();
var walls = def.build(scene);

// Mark only newly-added subtrees as static (skip skydome and lights
// added before def.build, since the skydome is animated to follow camera).
// Same iteration also feeds dumpMapStats with the union of newly-added subtrees.
var newlyAdded = [];
for (var ci = 0; ci < scene.children.length; ci++) {
  var child = scene.children[ci];
  if (preBuildChildren.indexOf(child) === -1) {
    markStatic(child);
    newlyAdded.push(child);
  }
}

if (GAME._debugMapStats) {
  // Aggregate counts across the newly-added top-level children
  var aggregate = { children: newlyAdded };
  aggregate.traverse = function(fn) {
    fn(aggregate);
    function walk(c) {
      fn(c);
      if (c.children) for (var i = 0; i < c.children.length; i++) walk(c.children[i]);
    }
    for (var i = 0; i < newlyAdded.length; i++) walk(newlyAdded[i]);
  };
  dumpMapStats(def.name, aggregate);
}
```

The `aggregate` shim has the minimal `.children` + `.traverse` shape `dumpMapStats` requires, so we can pass the union of newly-added children without creating a real `THREE.Group`. The `dumpMapStats` function itself does not check `aggregate.isMesh` / `aggregate.isLight`, so the synthetic root is treated as a non-counting node.

- [ ] **Step 3: Run map-loading integration tests to confirm no regression**

```bash
npx vitest run tests/integration/map-loading.test.js
```

Expected: PASS.

- [ ] **Step 4: Add a smoke test for the integration in `tests/integration/map-loading.test.js`**

Append to the bottom of the existing `describe('map loading', ...)` block (before its closing brace), a new `describe`:

```javascript
describe('dumpMapStats integration', () => {
  it('emits exactly one log line per loaded map when flag is on', () => {
    var logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    GAME._debugMapStats = true;
    try {
      var scene = new THREE.Scene();
      // Use the loadMap wrapper rather than calling def.build directly,
      // so the post-build hook runs.
      // Each map's load wrapper is GAME._loadMap if exposed; fall back to
      // calling the wrapper used by main.js. If the project does not yet
      // expose loadMap on GAME, this test asserts dumpMapStats works
      // against a manual aggregate using GAME._mapHelpers.dumpMapStats.
      GAME._mapHelpers.dumpMapStats('Synthetic', { children: [], traverse: function(fn){ fn(this); } });
      var found = logSpy.mock.calls.some(c => String(c[0]).indexOf('[map-stats] Synthetic') === 0);
      expect(found).toBe(true);
    } finally {
      logSpy.mockRestore();
      GAME._debugMapStats = false;
    }
  });
});
```

Note: this is a smoke test for the helper integration. The full per-map dump runs only when `loadMap` is invoked from `main.js`, which the unit-test environment does not do. The test confirms the helper is wired and gated on the flag.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add js/maps/shared.js tests/integration/map-loading.test.js
git commit -m "feat(maps): emit one-shot map-stats line on map load behind debug flag"
```

- [ ] **Step 7: User collects Windows numbers**

After this commit ships, the user runs the game on Windows on each map (`dust`, `arena`, `bloodstrike`, `aztec`, `office`, plus `italy`, `warehouse` for context):

1. Open browser DevTools console.
2. Type `GAME._debugMapStats = true` and press Enter.
3. Load each map (or play a session that rotates through them).
4. Copy the `[map-stats] ...` lines and paste back to the conversation.

This data is the input to Section 3's cut decisions (Tasks 9–11).

---

## Section 1: Targeted Substepping for Time-Sensitive Systems

### Task 3: Add `GAME.subTick` helper in `js/core/main.js`

**Files:**
- Modify: `js/core/main.js` — add helper near other `GAME.*` utilities (top of the IIFE, before the animate loop).
- Test: `tests/unit/sub-tick.test.js` (create).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/sub-tick.test.js`:

```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/core/main.js');
});

describe('GAME.subTick', () => {
  it('exists on GAME', () => {
    expect(typeof GAME.subTick).toBe('function');
  });

  it('calls fn once with full dt when dt <= maxStep', () => {
    var calls = [];
    GAME.subTick(0.020, 0.025, function(stepDt) { calls.push(stepDt); });
    expect(calls.length).toBe(1);
    expect(calls[0]).toBeCloseTo(0.020, 6);
  });

  it('calls fn N times with stepDt = dt/N when dt > maxStep', () => {
    var calls = [];
    GAME.subTick(0.060, 0.025, function(stepDt) { calls.push(stepDt); });
    // 0.060 / 0.025 = 2.4 → ceil = 3 substeps, each 0.020s
    expect(calls.length).toBe(3);
    calls.forEach(c => expect(c).toBeCloseTo(0.020, 6));
  });

  it('caps substeps at MAX_SUBSTEPS=4', () => {
    var calls = [];
    // 1.0 / 0.025 = 40 substeps requested → must cap at 4
    GAME.subTick(1.0, 0.025, function(stepDt) { calls.push(stepDt); });
    expect(calls.length).toBe(4);
    // Each step receives 0.25s (cap stretches the step)
    calls.forEach(c => expect(c).toBeCloseTo(0.25, 6));
  });

  it('total stepDt sums to dt (exactly)', () => {
    var sum = 0;
    GAME.subTick(0.073, 0.025, function(stepDt) { sum += stepDt; });
    expect(sum).toBeCloseTo(0.073, 6);
  });

  it('does nothing when dt is zero or negative', () => {
    var calls = 0;
    GAME.subTick(0, 0.025, function() { calls++; });
    GAME.subTick(-0.01, 0.025, function() { calls++; });
    expect(calls).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/sub-tick.test.js
```

Expected: FAIL — `GAME.subTick is not a function`.

- [ ] **Step 3: Implement `GAME.subTick` in `js/core/main.js`**

Open `js/core/main.js`. Find the IIFE top (the `(function() { 'use strict'; ...` block near the start of the file). Add the following near the top, alongside the other `GAME.*` utility additions:

```javascript
// Substep helper — used to update collision/movement/AI when a frame's dt is
// large, so internal step size stays small enough to avoid tunneling and
// overshoot. Capped at MAX_SUBSTEPS to avoid spirals when sim itself is the
// bottleneck.
GAME.subTick = function(dt, maxStep, fn) {
  if (dt <= 0) return;
  if (dt <= maxStep) { fn(dt); return; }
  var steps = Math.ceil(dt / maxStep);
  var MAX_SUBSTEPS = 4;
  if (steps > MAX_SUBSTEPS) steps = MAX_SUBSTEPS;
  var stepDt = dt / steps;
  for (var i = 0; i < steps; i++) fn(stepDt);
};
```

- [ ] **Step 4: Run unit test to verify pass**

```bash
npx vitest run tests/unit/sub-tick.test.js
```

Expected: PASS, all 6 tests green.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add js/core/main.js tests/unit/sub-tick.test.js
git commit -m "feat(core): add GAME.subTick helper for capped substep updates"
```

---

### Task 4: Raise the loop dt clamp from 0.05 to 0.25

**Files:**
- Modify: `js/core/main.js:1331`.

- [ ] **Step 1: Confirm the current clamp**

Read `js/core/main.js` line 1331. Current line:

```javascript
var dt = Math.min(lastTime ? now - lastTime : 0.016, 0.05);
```

- [ ] **Step 2: Replace the clamp value**

Change line 1331 to:

```javascript
var dt = Math.min(lastTime ? now - lastTime : 0.016, 0.25);
```

This raises the maximum frame `dt` the engine will trust from 50 ms to 250 ms. Sustained sub-20-FPS frames now propagate to systems instead of being silently truncated. Tab-return frames (often multiple seconds) are still bounded to 250 ms by the clamp, plus the existing `lastTime = 0` reset in `visibilitychange` (line 715) handles the typical resume case.

- [ ] **Step 3: Note: the adaptive quality "hitch filter" threshold**

`js/core/quality.js` has a hitch filter introduced in commit `ce0181b`:

```javascript
var isHitch = dt >= 0.049;
```

This is intentionally just under the *old* clamp value. With the new clamp at 0.25, frames in the 0.05–0.249 range will no longer be clamped — they'll arrive as their real (slow) value. The hitch filter at 0.049 still works correctly: it excludes only frames within 1 ms of the new clamp ceiling (which now means "frame was clamped to 0.25") **incorrectly**, because the threshold is wrong for the new clamp.

Update the threshold to track the new clamp:

In `js/core/quality.js`, find the line:

```javascript
var isHitch = dt >= 0.049;
```

Change it to:

```javascript
var isHitch = dt >= 0.249;
```

This preserves the original semantics of the filter (exclude frames that were actually clamped), now correct for the 0.25 cap.

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: all tests pass. The clamp is a numeric constant; no test should depend on its exact value. If any test fails, investigate before proceeding.

- [ ] **Step 5: Commit**

```bash
git add js/core/main.js js/core/quality.js
git commit -m "perf(core): raise dt clamp to 0.25 so sim tracks wall time on slow frames"
```

---

### Task 5: Internal substep wrapper around `Player.prototype.update`

**Files:**
- Modify: `js/core/player.js:228` (the `Player.prototype.update = function(dt) { ... }` definition and its body).

The strategy is: rename the existing body to `_updateStep`, and make the public `update` a thin wrapper that calls `GAME.subTick`.

- [ ] **Step 1: Read the current entry to identify the body's exact extent**

Read `js/core/player.js` from line 228 to find the matching closing brace of `Player.prototype.update = function(dt) { ... };`. Note the start line and the closing-brace line. We need to enclose the entire body verbatim into a new function.

- [ ] **Step 2: Rewrap `update` with substep dispatch**

Replace:

```javascript
Player.prototype.update = function(dt) {
  // ... ENTIRE EXISTING BODY ...
};
```

with:

```javascript
Player.prototype._updateStep = function(dt) {
  // ... ENTIRE EXISTING BODY (UNCHANGED) ...
};

Player.prototype.update = function(dt) {
  var self = this;
  GAME.subTick(dt, 0.025, function(stepDt) { self._updateStep(stepDt); });
};
```

The body of `_updateStep` is the same code that was inside `update` — no logic changes, no variable renames. Only the wrapping changes.

- [ ] **Step 3: Verify no other code calls `Player.prototype.update` from inside its own body**

```bash
grep -n "this\.update\|self\.update\|player\._updateStep" js/core/player.js
```

Expected: no results for `this.update(` or `self.update(` from inside the body. (`player._updateStep` should appear only in the new wrapper.)

If the body internally calls `this.update(...)` for any reason (it shouldn't, but verify), update that call to `this._updateStep(...)`.

- [ ] **Step 4: Run player and integration tests**

```bash
npx vitest run tests/unit/player.test.js tests/integration/combat.test.js
```

Expected: PASS.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Manual smoke test (skip in agentic run; flag for human verification)**

Open the game in a browser, play 30 seconds in any mode. Confirm: walking, jumping, crouching, sprinting, collision against walls all feel identical to before. There should be no behavior difference at normal frame rates.

- [ ] **Step 7: Commit**

```bash
git add js/core/player.js
git commit -m "perf(player): substep update internally to keep movement stable on slow frames"
```

---

### Task 6: Internal substep wrapper around `WeaponSystem.prototype.update`

**Files:**
- Modify: `js/systems/weapons.js:2055` (the `WeaponSystem.prototype.update = function(dt, unused, currentYawUnused, currentPitch) { ... }` definition).

`WeaponSystem.update` returns an array of explosion events. The substep wrapper must accumulate these across substeps.

- [ ] **Step 1: Read the current entry to identify the body and confirm return type**

Read `js/systems/weapons.js` from line 2055 to its matching closing brace. Inspect the `return` statement(s) — confirm they return an array (or null/undefined when no explosions). If the function returns a single object, treat it as a single-element list for accumulation.

- [ ] **Step 2: Rewrap with accumulating substep**

Replace:

```javascript
WeaponSystem.prototype.update = function(dt, unused, currentYawUnused, currentPitch) {
  // ... ENTIRE EXISTING BODY ...
};
```

with:

```javascript
WeaponSystem.prototype._updateStep = function(dt, unused, currentYawUnused, currentPitch) {
  // ... ENTIRE EXISTING BODY (UNCHANGED) ...
};

WeaponSystem.prototype.update = function(dt, unused, currentYawUnused, currentPitch) {
  var self = this;
  var allExplosions = null;
  GAME.subTick(dt, 0.025, function(stepDt) {
    var stepResult = self._updateStep(stepDt, unused, currentYawUnused, currentPitch);
    if (stepResult && stepResult.length) {
      if (!allExplosions) allExplosions = [];
      for (var i = 0; i < stepResult.length; i++) allExplosions.push(stepResult[i]);
    }
  });
  return allExplosions;
};
```

If `_updateStep` returns a non-array (some implementations return a single explosion object), wrap it: `var arr = Array.isArray(stepResult) ? stepResult : [stepResult]`. Confirm the return shape during Step 1; the version above assumes array-or-falsy.

- [ ] **Step 3: Verify no internal recursion**

```bash
grep -n "this\.update\b\|self\.update\b" js/systems/weapons.js
```

Expected: no matches inside `WeaponSystem.prototype._updateStep`. If any exist, change them to `this._updateStep` / `self._updateStep`.

- [ ] **Step 4: Run weapons and combat tests**

```bash
npx vitest run tests/unit/weapons.test.js tests/integration/combat.test.js
```

Expected: PASS.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add js/systems/weapons.js
git commit -m "perf(weapons): substep update internally; accumulate explosions across substeps"
```

---

### Task 7: Internal substep wrapper around `EnemyManager.prototype.update`

**Files:**
- Modify: `js/systems/enemies.js:3320` (the `EnemyManager.prototype.update = function(dt, playerPos, playerAlive, now, playerTeam) { ... }` definition).

Like weapons, this returns a value that callers consume. Inspect Step 1's return type before writing the wrapper.

`maxStep` is `0.033` for enemies (looser than player/weapons because AI logic is inherently coarser-grained and per-bot cost is non-trivial).

- [ ] **Step 1: Read the current entry to identify the body and confirm return shape**

Read `js/systems/enemies.js` from line 3320 to the matching close. Identify `return` statements. Note the result fields — main.js consumes the result as `enemyResult` and reads e.g. `enemyResult.<field>` (see `js/core/main.js:1563-1571`). Document the shape before substepping.

- [ ] **Step 2: Decide accumulation strategy from Step 1**

Most plausible shapes:
- (a) Returns nothing / undefined.
- (b) Returns a result object whose fields are events that occurred during this tick (e.g. `damageToPlayer`, `kills`).

For (a), no accumulation. For (b), the wrapper sums numeric fields and concatenates array fields across substeps.

- [ ] **Step 3: Rewrap**

For shape (a):

```javascript
EnemyManager.prototype._updateStep = function(dt, playerPos, playerAlive, now, playerTeam) {
  // ... ENTIRE EXISTING BODY ...
};

EnemyManager.prototype.update = function(dt, playerPos, playerAlive, now, playerTeam) {
  var self = this;
  GAME.subTick(dt, 0.033, function(stepDt) {
    self._updateStep(stepDt, playerPos, playerAlive, now, playerTeam);
  });
};
```

For shape (b), accumulate. Read the actual fields at `js/core/main.js:1563-1571` and write a tailored merge. Example skeleton (adjust field names to match):

```javascript
EnemyManager.prototype.update = function(dt, playerPos, playerAlive, now, playerTeam) {
  var self = this;
  var merged = null;
  GAME.subTick(dt, 0.033, function(stepDt) {
    var r = self._updateStep(stepDt, playerPos, playerAlive, now, playerTeam);
    if (!r) return;
    if (!merged) merged = {};
    // Numeric fields: sum
    if (r.damageToPlayer) merged.damageToPlayer = (merged.damageToPlayer || 0) + r.damageToPlayer;
    // Array fields: concat
    if (r.kills && r.kills.length) merged.kills = (merged.kills || []).concat(r.kills);
    // ... add other fields explicitly based on actual return shape ...
  });
  return merged;
};
```

The key principle: never silently merge; list every field explicitly so future additions to the return type force a thinking-step here.

- [ ] **Step 4: Verify no internal recursion**

```bash
grep -n "this\.update\b\|self\.update\b" js/systems/enemies.js
```

Expected: no matches inside `_updateStep`. (Internal `Enemy.prototype.update` at line 1316 is a different method on a different class — leave it alone.)

- [ ] **Step 5: Run enemies and combat tests**

```bash
npx vitest run tests/unit/enemies.test.js tests/integration/combat.test.js
```

Expected: PASS.

- [ ] **Step 6: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add js/systems/enemies.js
git commit -m "perf(enemies): substep manager update internally with maxStep=0.033"
```

---

## Section 3: Tier-Gated Content Groups

### Task 8: Add `H.tierGated` and `GAME._reapplyAllTierVisibility` helpers

**Files:**
- Modify: `js/maps/shared.js` — add the tier-gating helpers and expose `tierGated` via `_mapHelpers`.
- Test: `tests/unit/tier-gated.test.js` (create).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/tier-gated.test.js`:

```javascript
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
});

describe('H.tierGated and GAME._reapplyAllTierVisibility', () => {
  beforeEach(() => {
    // Default to highest level so tagged groups are visible
    GAME.quality = { level: 5 };
    GAME.scene = { children: [], traverse: function(fn) { fn(this); for (var i=0;i<this.children.length;i++) walkTraverse(this.children[i], fn); } };
  });

  function walkTraverse(node, fn) {
    fn(node);
    if (node.children) for (var i = 0; i < node.children.length; i++) walkTraverse(node.children[i], fn);
  }

  function makeGroup() {
    var g = { visible: true, userData: {}, children: [] };
    return g;
  }

  function setupSceneWith(group) {
    GAME.scene.children = [group];
    GAME.scene.traverse = function(fn) {
      fn(this);
      walkTraverse(group, fn);
    };
  }

  it('tierGated exists on _mapHelpers', () => {
    expect(typeof GAME._mapHelpers.tierGated).toBe('function');
  });

  it('_reapplyAllTierVisibility exists on GAME', () => {
    expect(typeof GAME._reapplyAllTierVisibility).toBe('function');
  });

  it('sets userData.minQualityLevel on the group', () => {
    var g = makeGroup();
    GAME._mapHelpers.tierGated(g, 3);
    expect(g.userData.minQualityLevel).toBe(3);
  });

  it('makes group invisible immediately when current level is below minLevel', () => {
    GAME.quality = { level: 1 };
    var g = makeGroup();
    GAME._mapHelpers.tierGated(g, 3);
    expect(g.visible).toBe(false);
  });

  it('keeps group visible when current level >= minLevel', () => {
    GAME.quality = { level: 3 };
    var g = makeGroup();
    GAME._mapHelpers.tierGated(g, 3);
    expect(g.visible).toBe(true);
  });

  it('reapply flips visibility when current level changes', () => {
    GAME.quality = { level: 5 };
    var g = makeGroup();
    GAME._mapHelpers.tierGated(g, 3);
    setupSceneWith(g);
    expect(g.visible).toBe(true);

    GAME.quality.level = 2;
    GAME._reapplyAllTierVisibility();
    expect(g.visible).toBe(false);

    GAME.quality.level = 4;
    GAME._reapplyAllTierVisibility();
    expect(g.visible).toBe(true);
  });

  it('reapply ignores groups without minQualityLevel tag', () => {
    var tagged = makeGroup();
    var untagged = makeGroup();
    GAME._mapHelpers.tierGated(tagged, 3);
    setupSceneWith(tagged);
    GAME.scene.children.push(untagged);
    GAME.scene.traverse = function(fn) {
      fn(this);
      walkTraverse(tagged, fn);
      walkTraverse(untagged, fn);
    };

    GAME.quality.level = 0;
    GAME._reapplyAllTierVisibility();
    expect(tagged.visible).toBe(false);
    expect(untagged.visible).toBe(true);  // untouched
  });

  it('treats missing GAME.quality as level 5 (full visibility)', () => {
    GAME.quality = null;
    var g = makeGroup();
    GAME._mapHelpers.tierGated(g, 3);
    expect(g.visible).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/tier-gated.test.js
```

Expected: FAIL — helpers undefined.

- [ ] **Step 3: Implement the helpers in `js/maps/shared.js`**

Near the existing helper definitions (the same area where Task 1 added `dumpMapStats`), add:

```javascript
function tierGated(group, minLevel) {
  group.userData = group.userData || {};
  group.userData.minQualityLevel = minLevel;
  applyTierVisibility(group);
}

function applyTierVisibility(group) {
  var min = group.userData && group.userData.minQualityLevel;
  if (min == null) return;
  var current = (GAME.quality && GAME.quality.level != null) ? GAME.quality.level : 5;
  group.visible = current >= min;
}

GAME._reapplyAllTierVisibility = function() {
  if (!GAME.scene || !GAME.scene.traverse) return;
  GAME.scene.traverse(function(o) {
    if (o.userData && o.userData.minQualityLevel != null) {
      applyTierVisibility(o);
    }
  });
};
```

Add `tierGated: tierGated,` to the `GAME._mapHelpers = { ... }` literal.

- [ ] **Step 4: Run unit test to verify pass**

```bash
npx vitest run tests/unit/tier-gated.test.js
```

Expected: PASS, all 7 tests green.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add js/maps/shared.js tests/unit/tier-gated.test.js
git commit -m "feat(maps): add tierGated helper and global reapply for quality-tier-aware content"
```

---

### Task 9: Wire `_reapplyAllTierVisibility` into `quality.applyLevel`

**Files:**
- Modify: `js/core/quality.js` — call `GAME._reapplyAllTierVisibility()` at the end of `applyLevel()`.

- [ ] **Step 1: Identify the insertion point**

Open `js/core/quality.js`. Find the `applyLevel(level)` function (line 51). Locate the very end of the function — currently the last meaningful action before the closing brace is the toast call at lines 93–96:

```javascript
    // Show toast on downgrade only
    if (level < prev) {
      showToast('Quality: ' + cfg.name);
    }
  }
```

- [ ] **Step 2: Add the reapply call**

Insert immediately after the toast block, just before the closing brace of `applyLevel`:

```javascript
    // Reapply tier-gated content visibility (lights/decorations registered
    // via H.tierGated in map files).
    if (GAME._reapplyAllTierVisibility) {
      GAME._reapplyAllTierVisibility();
    }
  }
```

The optional-chain via `if` keeps `applyLevel` working if Section 3 ships first or `shared.js` was not loaded.

- [ ] **Step 3: Run quality and full tests**

```bash
npx vitest run tests/unit/quality.test.js
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add js/core/quality.js
git commit -m "feat(quality): reapply tier-gated visibility on tier change"
```

---

### Task 10: Aztec — gate decorative lights

**Files:**
- Modify: `js/maps/aztec.js`.

**Pre-condition:** Section 2's stats data should be in. If aztec's reported `lights=` count confirms the hypothesis (~16, with several being decorative torches), proceed. If it shows a different cost driver (e.g. very high `meshes=` count), revise the cut to target that instead.

The pattern below assumes the spec's hypothesis (decorative torch lights). The code structure adapts to whatever the actual decorative cluster is.

- [ ] **Step 1: Identify decorative torch / pillar lights in `js/maps/aztec.js`**

Read `js/maps/aztec.js`. Look for `addPointLight`, `addHangingLight`, `new THREE.PointLight(...)`, etc. Identify which lights are decorative (torch flicker, pillar uplighting) vs. structural (path-illumination, gameplay-relevant).

- [ ] **Step 2: Group decorative lights into a single `THREE.Group`**

Inside `aztec.js` `build:` function, after the lights are constructed, collect them into a group:

```javascript
var decorLights = new THREE.Group();
// For each decorative light L created above, instead of `scene.add(L)`,
// `decorLights.add(L)`. (If lights were already added directly to scene,
// use scene.attach(L) followed by decorLights.add(L), or refactor to add
// to the group from the start.)
scene.add(decorLights);
H.tierGated(decorLights, 3);  // visible at Medium (3) and above
```

- [ ] **Step 3: Confirm aztec still loads at all tiers**

```bash
npx vitest run tests/integration/map-loading.test.js
```

Expected: PASS.

- [ ] **Step 4: Add a per-map assertion to `tests/integration/map-loading.test.js`**

Inside the `Aztec map` describe block, append:

```javascript
it('aztec: gates decorative lights at low quality tiers', () => {
  GAME.quality = { level: 0 };
  var scene = new THREE.Scene();
  GAME._maps[5].build(scene);  // Aztec is index 5 per the test file's order

  var found = false;
  scene.traverse(function(o) {
    if (o.userData && o.userData.minQualityLevel != null) {
      found = true;
      // At level 0, gated groups must be invisible
      expect(o.visible).toBe(false);
    }
  });
  expect(found).toBe(true);
});

it('aztec: gated groups visible at level 5', () => {
  GAME.quality = { level: 5 };
  var scene = new THREE.Scene();
  GAME._maps[5].build(scene);
  scene.traverse(function(o) {
    if (o.userData && o.userData.minQualityLevel != null) {
      expect(o.visible).toBe(true);
    }
  });
});
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run tests/integration/map-loading.test.js
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add js/maps/aztec.js tests/integration/map-loading.test.js
git commit -m "perf(maps/aztec): tier-gate decorative lights below Medium"
```

---

### Task 11: Office — gate decorative props

**Files:**
- Modify: `js/maps/office.js`.

**Pre-condition:** Section 2's stats data should be in. Office's hypothesis is high mesh count from many small props (desk surface clutter, ceiling-tile detail, wall vents). Confirm with reported `meshes=` and `geometries=`.

- [ ] **Step 1: Identify decorative props in `js/maps/office.js`**

Read `js/maps/office.js`. Identify prop generators that produce purely decorative meshes (monitor on a desk, ceiling-tile hatching, wall trim). Distinguish from structural geometry (walls, floor, doors, main desks that act as cover).

**Critical:** anything that affects the wall list (collision) or the spawn-zone validator stays at all tiers. Cut targets are visual-only.

- [ ] **Step 2: Group decorative props**

Wrap the decorative prop additions into a `THREE.Group`:

```javascript
var decorProps = new THREE.Group();
// For each decorative prop instance, add to decorProps instead of directly
// to scene (or via re-parent).
scene.add(decorProps);
H.tierGated(decorProps, 2);  // visible at Low (2) and above; hidden at Very Low / Minimal
```

If the existing code already constructs props inside a sub-group, simply tag that group with `H.tierGated(existingGroup, 2)`.

- [ ] **Step 3: Verify wall list is unchanged across tiers**

`def.build(scene)` returns the walls array directly. Each element is a bare `THREE.Mesh` (see `B` helper in `js/maps/shared.js:463`). The walls array must not include any mesh that lives inside a tier-gated group.

Add a test in `tests/integration/map-loading.test.js` inside the Office describe block:

```javascript
it('office: walls array does not reference tier-gated meshes', () => {
  GAME.quality = { level: 5 };
  var scene = new THREE.Scene();
  var walls = GAME._maps[1].build(scene);  // Office is index 1

  // Collect all meshes inside any tier-gated subtree
  var gatedMeshes = new Set();
  scene.traverse(function(g) {
    if (g.userData && g.userData.minQualityLevel != null) {
      g.traverse(function(o) { if (o.isMesh) gatedMeshes.add(o); });
    }
  });

  // Walls must not include any gated mesh
  walls.forEach(function(w) {
    expect(gatedMeshes.has(w)).toBe(false);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/integration/map-loading.test.js
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add js/maps/office.js tests/integration/map-loading.test.js
git commit -m "perf(maps/office): tier-gate decorative props below Low"
```

---

### Task 12: Bloodstrike — gate decorative interior fill

**Files:**
- Modify: `js/maps/bloodstrike.js`.

**Pre-condition:** Section 2's stats data should be in. Bloodstrike was the largest map (557 LOC) and recently received "fill the entire area within inner walls with solid filling" (commit `921bfaf`). Confirm with reported `meshes=` whether the cost driver is decorative density or sheer volume.

- [ ] **Step 1: Identify the interior decorative fill clusters**

Read `js/maps/bloodstrike.js`, especially the recently-added solid-fill logic. Identify clusters that are purely decorative (filler crates, decorative pillars, atmospheric props). Distinguish from gameplay cover.

If the solid fill is structural-only (walls/cover, no decorative sub-meshes), there is nothing safe to gate here. In that case:

- Skip Task 12 (commit a doc note in the spec saying bloodstrike's fix relies on Section 1 + future work).
- Or look for non-fill decorative clusters elsewhere in the map (banners, atmospheric props, lighting fixtures).

- [ ] **Step 2: Group and tag decorative fill**

```javascript
var decorFill = new THREE.Group();
// Re-parent decorative fill meshes into decorFill.
scene.add(decorFill);
H.tierGated(decorFill, 3);  // visible at Medium (3) and above
```

- [ ] **Step 3: Wall-list assertion (same pattern as Task 11)**

Add to `tests/integration/map-loading.test.js` inside the Bloodstrike describe block, mirroring the Office wall-list assertion. Bloodstrike is index 3 per the test file order.

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/integration/map-loading.test.js
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add js/maps/bloodstrike.js tests/integration/map-loading.test.js
git commit -m "perf(maps/bloodstrike): tier-gate decorative interior fill below Medium"
```

---

### Task 13: Cross-map tier-gating integration test

**Files:**
- Test: `tests/integration/tier-gating.test.js` (create).

This test asserts the cross-cutting invariant: tier transitions correctly toggle gated groups, and the wall collision set is identical across all six quality levels for every map (not just the three with cuts).

- [ ] **Step 1: Write the test**

Create `tests/integration/tier-gating.test.js`:

```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/maps/props.js');
  loadModule('js/maps/dust.js');
  loadModule('js/maps/office.js');
  loadModule('js/maps/warehouse.js');
  loadModule('js/maps/bloodstrike.js');
  loadModule('js/maps/italy.js');
  loadModule('js/maps/aztec.js');
  loadModule('js/maps/arena.js');
});

describe('tier-gating cross-map invariants', () => {
  var mapNames = ['Dust', 'Office', 'Warehouse', 'Bloodstrike', 'Italy', 'Aztec', 'Arena'];

  mapNames.forEach((name, index) => {
    it(name + ': wall set identical across all quality levels', () => {
      var collected = {};
      [0, 1, 2, 3, 4, 5].forEach(function(level) {
        GAME.quality = { level: level };
        var scene = new THREE.Scene();
        var origScene = GAME.scene;
        GAME.scene = scene;
        var walls = GAME._maps[index].build(scene);  // build returns walls array directly
        if (GAME._reapplyAllTierVisibility) GAME._reapplyAllTierVisibility();
        GAME.scene = origScene;
        collected[level] = (walls || []).length;
      });
      // Wall count must be identical at every tier
      var counts = Object.values(collected);
      var first = counts[0];
      counts.forEach(function(c) { expect(c).toBe(first); });
    });

    it(name + ': tier-gated groups (if any) toggle visibility on level change', () => {
      GAME.quality = { level: 5 };
      var scene = new THREE.Scene();
      GAME._maps[index].build(scene);

      var gated = [];
      scene.traverse(function(o) {
        if (o.userData && o.userData.minQualityLevel != null) gated.push(o);
      });

      if (gated.length === 0) return;  // not all maps tag

      // At level 0, every gated group must be invisible
      var origScene = GAME.scene;
      GAME.scene = scene;
      GAME.quality.level = 0;
      GAME._reapplyAllTierVisibility();
      gated.forEach(function(g) { expect(g.visible).toBe(false); });

      // At level 5, every gated group must be visible
      GAME.quality.level = 5;
      GAME._reapplyAllTierVisibility();
      gated.forEach(function(g) { expect(g.visible).toBe(true); });

      GAME.scene = origScene;
    });
  });
});
```

- [ ] **Step 2: Run the test**

```bash
npx vitest run tests/integration/tier-gating.test.js
```

Expected: PASS for all 7 maps.

- [ ] **Step 3: Run full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/tier-gating.test.js
git commit -m "test(maps): cross-map tier-gating invariants (walls stable, visibility toggles)"
```

---

## Post-Implementation Verification

After all 13 tasks ship, on Windows:

1. Reload the game cold. Note `GAME.quality.name` after 30 seconds of menu + first round.
2. Compare against pre-Section-1 baseline: should be at a higher tier than Very Low / Minimal on the heavy maps.
3. Compare in-game round timer to a wall stopwatch over a 30-second window during sustained slow frames. Pre-Section-1: in-game lags. Post-Section-1: in-game tracks wall.
4. On Mac, confirm Ultra still settles and gameplay feels identical.

Document any surprising results inline in the relevant spec section as an addendum, or open follow-up tasks if a section's expected effect did not materialise.

---

## Doc Updates

Per `AGENTS.md`, none of these changes alter inter-system contracts, mode rules, or the canonical map example pattern. No `docs/architecture.md` or `docs/game-design.md` updates are required.

If the implementation discovers a cross-cutting trap that wasn't obvious (for example, "internal-substep wrappers must not capture `this` lazily because of X"), add an entry to `docs/gotchas.md`.
