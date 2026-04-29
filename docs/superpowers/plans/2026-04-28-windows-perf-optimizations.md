# Windows Performance Optimizations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce per-frame baseline cost on weak Windows hardware so the adaptive quality system can settle at a higher tier, with no user-visible changes.

**Architecture:** Three independent shippable changes, each its own commit: (1) `powerPreference: 'high-performance'` hint in WebGL renderer construction, (2) a `markStatic` helper invoked inside `loadMap` to disable per-frame matrix recompute on map geometry, (3) hoist per-frame `THREE.*` allocations to module-scoped scratch objects in `player.js`, `weapons.js`, `enemies.js`, `main.js`.

**Tech Stack:** Three.js (browser), Vitest (tests), JSDOM-based test mocks in `tests/setup.js`. Code style is non-module IIFE-wrapped scripts attached to `window.GAME`.

**Spec:** `docs/superpowers/specs/2026-04-28-windows-perf-optimizations-design.md`

---

## Task 1: Request High-Performance GPU

**Files:**
- Modify: `js/core/renderer.js:10`

This is a single-line change with no JS-observable effect — it's a hint to the browser's WebGL implementation. Validation is "existing tests still pass" plus manual measurement on the Windows machine.

- [ ] **Step 1: Run all tests to confirm baseline green**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Add `powerPreference: 'high-performance'` to renderer construction**

Modify `js/core/renderer.js:10`:

```js
// Before:
var renderer = new THREE.WebGLRenderer({ antialias: !GAME.isMobile });

// After:
var renderer = new THREE.WebGLRenderer({ antialias: !GAME.isMobile, powerPreference: 'high-performance' });
```

- [ ] **Step 3: Run tests to confirm no regression**

Run: `npm test`
Expected: all tests pass (the test mock for `THREE.WebGLRenderer` ignores its options object, so this is a pure no-op in tests).

- [ ] **Step 4: Commit**

```bash
git add js/core/renderer.js
git commit -m "perf(renderer): request high-performance GPU via powerPreference hint

Helps machines with hybrid graphics (common on Windows laptops/desktops)
select the discrete GPU instead of integrated. No-op on single-GPU systems."
```

---

## Task 2: `markStatic` helper for static map geometry

**Files:**
- Modify: `js/maps/shared.js` — add the helper, call it inside `loadMap` after `def.build(scene)`
- Create: `tests/unit/mark-static.test.js` — unit test for the helper
- Modify: `tests/integration/map-loading.test.js` — assert maps' added geometry has `matrixAutoUpdate === false` after load

### Background

`loadMap` in `js/maps/shared.js` calls `def.build(scene)` at line 735 which adds many objects to the scene directly. We want to mark *only those new additions* as static (so we don't accidentally freeze the sky dome, which the renderer animates by copying camera position).

The strategy: snapshot `scene.children` before and after `def.build`, then recursively mark every newly added subtree as static.

### Test setup notes

- The existing test mock (`tests/setup.js:52-74`) creates mesh objects without `matrixAutoUpdate` or `updateMatrix`. The unit test should construct plain JS objects to exercise the helper's logic directly — not rely on the mock.
- The integration test uses `THREE.Scene()` (mocked) and calls `GAME._maps[i].build(scene)`. To assert `matrixAutoUpdate` after load, we'll go through `loadMap` (which calls `markStatic` after build).

### Steps

- [ ] **Step 1: Write failing unit test for `markStatic`**

Create `tests/unit/mark-static.test.js`:

```js
import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
});

describe('GAME.markStatic', () => {
  function makeNode() {
    var calls = 0;
    return {
      matrixAutoUpdate: true,
      updateMatrix: function() { calls++; this._updateCalls = calls; },
      children: []
    };
  }

  it('exists on GAME namespace', () => {
    expect(typeof GAME.markStatic).toBe('function');
  });

  it('sets matrixAutoUpdate=false on the root node', () => {
    var root = makeNode();
    GAME.markStatic(root);
    expect(root.matrixAutoUpdate).toBe(false);
  });

  it('calls updateMatrix() once on the root node', () => {
    var root = makeNode();
    GAME.markStatic(root);
    expect(root._updateCalls).toBe(1);
  });

  it('recurses through children', () => {
    var root = makeNode();
    var child = makeNode();
    var grandchild = makeNode();
    child.children.push(grandchild);
    root.children.push(child);

    GAME.markStatic(root);

    expect(child.matrixAutoUpdate).toBe(false);
    expect(grandchild.matrixAutoUpdate).toBe(false);
    expect(child._updateCalls).toBe(1);
    expect(grandchild._updateCalls).toBe(1);
  });

  it('handles nodes with no children', () => {
    var leaf = makeNode();
    expect(() => GAME.markStatic(leaf)).not.toThrow();
    expect(leaf.matrixAutoUpdate).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/mark-static.test.js`
Expected: FAIL with `expected 'undefined' to be 'function'` (or similar — `GAME.markStatic` not defined yet).

- [ ] **Step 3: Implement `markStatic` in `js/maps/shared.js`**

Add the helper definition near the top of the IIFE in `js/maps/shared.js`, after the `'use strict'` line. Find the line `'use strict';` near the top of the file and add immediately after:

```js
  // Recursively mark a subtree as static: matrices computed once, never
  // updated again. Use only for geometry that does not move after build.
  function markStatic(object3D) {
    object3D.updateMatrix();
    object3D.matrixAutoUpdate = false;
    for (var i = 0; i < object3D.children.length; i++) {
      markStatic(object3D.children[i]);
    }
  }
  GAME.markStatic = markStatic;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/mark-static.test.js`
Expected: all 5 tests pass.

- [ ] **Step 5: Wire `markStatic` into `loadMap`**

Modify `js/maps/shared.js` around line 735. Find:

```js
    var walls = def.build(scene);

    return {
```

Replace with:

```js
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

    return {
```

- [ ] **Step 6: Update test mock so `updateMatrix` exists**

The mock mesh in `tests/setup.js` does not currently expose `updateMatrix`. Add it to `createMockMesh` so map-loading tests don't throw when `markStatic` walks the tree.

In `tests/setup.js`, find `createMockMesh` (line 52) and add `updateMatrix() {}` to the returned object. Locate this line:

```js
    updateMatrixWorld() {},
```

Add immediately after:

```js
    updateMatrix() {},
    matrixAutoUpdate: true,
```

- [ ] **Step 7: Add integration assertion**

Modify `tests/integration/map-loading.test.js`. After the existing `it('should add objects to the scene', ...)` test (around line 41-45 in the file), add:

```js
      it('should mark added geometry as static after loadMap', () => {
        var scene = new THREE.Scene();
        // Pre-populate scene with one node to simulate skydome/pre-existing children.
        var preExisting = { matrixAutoUpdate: true, updateMatrix: function(){}, children: [] };
        scene.add(preExisting);

        // Snapshot, build, mark — mirrors loadMap's behavior.
        var pre = scene.children.slice();
        GAME._maps[index].build(scene);
        for (var ci = 0; ci < scene.children.length; ci++) {
          if (pre.indexOf(scene.children[ci]) === -1) {
            GAME.markStatic(scene.children[ci]);
          }
        }

        // Pre-existing node must remain auto-updating.
        expect(preExisting.matrixAutoUpdate).toBe(true);

        // At least one newly-added child must now be marked static.
        var staticCount = 0;
        for (var i = 0; i < scene.children.length; i++) {
          if (pre.indexOf(scene.children[i]) === -1 && scene.children[i].matrixAutoUpdate === false) {
            staticCount++;
          }
        }
        expect(staticCount).toBeGreaterThan(0);
      });
```

- [ ] **Step 8: Run all tests**

Run: `npm test`
Expected: all tests pass, including the new `mark-static.test.js` and the new per-map assertion.

- [ ] **Step 9: Commit**

```bash
git add js/maps/shared.js tests/unit/mark-static.test.js tests/integration/map-loading.test.js tests/setup.js
git commit -m "perf(maps): disable matrixAutoUpdate on static map geometry

Adds GAME.markStatic helper that recursively freezes matrices on a
subtree. loadMap snapshots scene.children before def.build and marks
only newly-added subtrees, leaving the skydome (animated to follow the
camera) untouched."
```

---

## Task 3: Hoist per-frame allocations in `player.js`

**Files:**
- Modify: `js/core/player.js` — identify per-frame functions, hoist `new THREE.*` allocations to module scope

Tests for player exist at `tests/unit/player.test.js`. Behavior must not change.

- [ ] **Step 1: Run player tests to confirm baseline**

Run: `npx vitest run tests/unit/player.test.js`
Expected: all pass.

- [ ] **Step 2: Identify per-frame allocations**

Open `js/core/player.js`. The per-frame entry points are `update()` and `updateDeath()` (called from `main.js`'s game loop). Search for `new THREE.` within those functions and any helpers they call inside the same file.

Run this to enumerate candidates:

```bash
grep -n "new THREE\." js/core/player.js
```

For each result, determine if it's inside a per-frame call path (visit the surrounding function; trace up to see if it's reached from `update`/`updateDeath`/`updateMenuFlythrough`). Setup-time allocations (called from constructor or init) stay as-is.

- [ ] **Step 3: Hoist allocations to module scope**

For each per-frame allocation, add a `var _scratch<Purpose> = new THREE.<Type>();` near the top of the IIFE in `js/core/player.js`, then replace the per-call `new` with `.set(...)`, `.copy(...)`, or `.subVectors(...)` etc.

Example transformation:

```js
// Before, inside update():
var moveDir = new THREE.Vector3(this.keys.d ? 1 : this.keys.a ? -1 : 0, 0, this.keys.s ? 1 : this.keys.w ? -1 : 0);

// After:
// At top of file, alongside other scratch decls:
var _scratchMoveDir = new THREE.Vector3();

// Inside update():
_scratchMoveDir.set(this.keys.d ? 1 : this.keys.a ? -1 : 0, 0, this.keys.s ? 1 : this.keys.w ? -1 : 0);
var moveDir = _scratchMoveDir;
```

**Naming rule:** `_scratch<Purpose>` (e.g., `_scratchMoveDir`, `_scratchAimRay`). One scratch per distinct usage site. Do not share scratches across functions unless you've verified there's no nested call where both are live simultaneously.

**Sharing rule:** a scratch must not be returned from the function or stored in `this`/`GAME`/array. Synchronous compute-and-discard only.

- [ ] **Step 4: Run player tests after each scratch is added**

Run: `npx vitest run tests/unit/player.test.js`
Expected: all pass after each change.

If a test fails, the most likely cause is aliasing — two scratches share a name, or a scratch is used in a callee that also wants it. Diagnose by reading the failing test's assertion path.

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add js/core/player.js
git commit -m "perf(player): hoist per-frame THREE.* allocations to module scope

Reduces GC pressure in the player update path by reusing scratch
Vector3/Matrix4/etc. objects instead of allocating per frame."
```

---

## Task 4: Hoist per-frame allocations in `weapons.js`

**Files:**
- Modify: `js/systems/weapons.js`

Same pattern as Task 3, applied to `js/systems/weapons.js`. The per-frame entry points include `update()`, `tryFire()`, the inner update functions for projectiles/grenades (around lines 1913, 1946, 1997 in `weapons.js`), and `_tickParticles`.

Tests at `tests/unit/weapons.test.js` and `tests/integration/combat.test.js`.

- [ ] **Step 1: Run weapons + combat tests for baseline**

Run: `npx vitest run tests/unit/weapons.test.js tests/integration/combat.test.js`
Expected: all pass.

- [ ] **Step 2: Identify per-frame allocations**

Run:

```bash
grep -n "new THREE\." js/systems/weapons.js
```

Trace each result up to its containing function. Per-frame paths to focus on:
- `update(dt, ...)` (the public weapons system update)
- `tryFire(now, raycastTargets)` (called every frame the player is firing)
- The grenade/throwable `update: function(dt) {...}` blocks at lines 1913, 1946, 1997
- `_tickParticles(dt)` (called every frame from main.js)

Setup-time allocations in init/constructor blocks stay.

- [ ] **Step 3: Hoist allocations**

Same naming/sharing rules as Task 3. Add `var _scratchX = new THREE.<Type>();` near top of IIFE in `weapons.js`. Replace per-call `new` with `.set(...)`/`.copy(...)`.

For each scratch added, run weapons tests immediately to catch issues fast:

Run: `npx vitest run tests/unit/weapons.test.js`
Expected: pass.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add js/systems/weapons.js
git commit -m "perf(weapons): hoist per-frame THREE.* allocations to module scope

Reduces GC pressure in the weapons update, fire, and projectile-tick
paths by reusing scratch objects."
```

---

## Task 5: Hoist per-frame allocations in `enemies.js`

**Files:**
- Modify: `js/systems/enemies.js`

Per-frame entry points: each enemy's `update(dt, targetPos, targetAlive, now)` (called from the enemies-system update at lines 3312, 3340, 3354 in `enemies.js`), boss barrage update around line 2064, aim update around line 1535.

Tests at `tests/unit/enemies.test.js` and `tests/integration/combat.test.js`.

- [ ] **Step 1: Run enemies + combat tests for baseline**

Run: `npx vitest run tests/unit/enemies.test.js tests/integration/combat.test.js`
Expected: all pass.

- [ ] **Step 2: Identify per-frame allocations**

Run:

```bash
grep -n "new THREE\." js/systems/enemies.js
```

Trace to per-frame paths. Pay particular attention to AI/aim/firing logic which runs per-frame per-enemy (multiple times per game frame in larger battles).

- [ ] **Step 3: Hoist allocations**

Same naming/sharing rules. After each scratch, run:

Run: `npx vitest run tests/unit/enemies.test.js`
Expected: pass.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add js/systems/enemies.js
git commit -m "perf(enemies): hoist per-frame THREE.* allocations to module scope

Reduces GC pressure in per-enemy update, AI, aim, and firing paths."
```

---

## Task 6: Hoist per-frame allocations in `main.js` (if any)

**Files:**
- Modify: `js/core/main.js` (only if audit finds per-frame allocations)

`main.js` is mostly setup, dispatch, and game-loop wiring. The hot per-frame work is delegated to player/weapons/enemies. But `main.js` does have local logic (explosion processing, hit detection helpers) that may allocate.

- [ ] **Step 1: Run all main-relevant tests for baseline**

Run: `npx vitest run tests/unit/main.test.js tests/integration/combat.test.js`
Expected: all pass.

- [ ] **Step 2: Audit main.js per-frame paths**

Run:

```bash
grep -n "new THREE\." js/core/main.js
```

The game-loop function is `gameLoop(timestamp)` starting at line 1323. Trace each `new THREE.*` occurrence to determine if its containing function is reachable from `gameLoop`. Most are likely in init code; if so, this task is a no-op.

If no per-frame allocations are found, skip to Step 5 and document the finding in the commit message.

- [ ] **Step 3: Hoist any found per-frame allocations**

Same naming/sharing rules.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

If hoisting was needed:

```bash
git add js/core/main.js
git commit -m "perf(main): hoist per-frame THREE.* allocations to module scope"
```

If audit found no per-frame allocations (no diff to commit), simply note the conclusion in your handoff. No commit is needed.

---

## Validation after each task

After every task is committed:

1. Local: `npm test` — all green.
2. Manual play test on Mac: load each map, fire weapons, kill bots, complete a round. Confirm no behavioral or visual regression.
3. Manual measurement on Windows: reload, let adaptive system stabilize for ~30 seconds, read `GAME.quality.name` from DevTools console. Compare to pre-change baseline (Very Low). The goal is for it to settle at Low or higher.

You may stop after any task if Windows performance is satisfactory. Each commit stands alone.

---

## Self-Review Notes

Spec coverage:
- Section 1 of spec → Task 1 ✓
- Section 2 of spec → Task 2 ✓
- Section 3 of spec → Tasks 3–6 (one per file) ✓
- "No user-visible changes" goal → enforced via existing test suite + manual check ✓
- "Independently shippable" → each task is its own commit ✓

Type/name consistency:
- `GAME.markStatic` named consistently across spec, helper definition, unit test, integration test ✓
- `_scratch<Purpose>` naming convention stated once and referenced in Tasks 3/4/5/6 ✓

No placeholders — every step has concrete code or a concrete command.
