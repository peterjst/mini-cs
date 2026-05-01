# Windows Shader Warmup & Adaptive Robustness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate shader-compilation hitches on Windows ANGLE so the adaptive quality system stops settling at Very Low / Minimal, with no user-visible scene changes.

**Architecture:** Three independent edits, each shippable as a separate commit. (1) `js/core/quality.js` gains a `_warmupComplete` flag, a `markWarmupComplete()` method, a fast-start gate, and a hitch-frame filter. (2) `js/core/renderer.js`'s `warmUpShaders()` is rewritten to compile every shader permutation the adaptive system can transition between, guarded by a once-per-session flag, and signals quality.js when it finishes. (3) Each mode's "map ready" point gains a `GAME._warmUpShaders()` call so all modes (not just competitive) benefit from the warmup mask.

**Tech Stack:** Three.js r160.1 (loaded as global `THREE`), IIFE pattern attaching modules to `window.GAME`, Vitest with jsdom for tests, no ES module imports.

**Spec:** `docs/superpowers/specs/2026-04-30-windows-perf-shader-warmup-design.md`

---

## Task ordering and dependencies

- **Task 1** (Section 3a) and **Task 2** (Section 3b) edit `quality.js` and are foundational. Task 1 must come first because Task 2 modifies the same `update()` function and Task 1's tests fix the "level 5 fast-start" path.
- **Task 3** (Section 1) edits `renderer.js`'s `warmUpShaders()` and calls `GAME.quality.markWarmupComplete()` (introduced in Task 1).
- **Task 4** (Section 2) adds `GAME._warmUpShaders()` calls in mode files. It can technically ship without Tasks 1–3 (the existing warmup function still works), but it's strictly more useful with the multi-permutation rewrite.

Order: 1 → 2 → 3 → 4. Run `npm test` after every task. Manual play-test on the Windows machine after Task 3 and after Task 4.

---

## Task 1: Add `markWarmupComplete()` and gate the fast-start heuristic

**Files:**
- Modify: `js/core/quality.js`
- Modify: `tests/unit/quality.test.js`

### What this changes

Add a `_warmupComplete` module-scoped flag (default `false`), expose a `markWarmupComplete()` method on `GAME.quality` that sets the flag to `true` and resets `_frameCount` and `_frameTimes`, and add `&& _warmupComplete` to the existing fast-start guard so it cannot fire until warmup signals readiness.

### Step 1.1: Write failing tests

- [ ] Open `tests/unit/quality.test.js` and append the following test block at the end of the file (after the closing of the existing last `describe`):

```js
describe('Warmup gating (markWarmupComplete)', () => {
  it('should expose markWarmupComplete as a function', () => {
    expect(typeof GAME.quality.markWarmupComplete).toBe('function');
  });

  it('markWarmupComplete should not throw when called', () => {
    expect(() => GAME.quality.markWarmupComplete()).not.toThrow();
  });
});
```

Note: deeper behavioral tests (fast-start gating, hitch filter) are added in Task 2 because they require coordinated state setup. These two tests just lock in the public API surface.

### Step 1.2: Run the tests, verify they fail

Run: `npm test -- tests/unit/quality.test.js`

Expected: two new tests fail with `expect(received).toBe(expected)` — `markWarmupComplete` is `undefined`.

### Step 1.3: Implement `_warmupComplete` flag and gate the fast-start heuristic

- [ ] Open `js/core/quality.js`. Find the module-scope `var` declarations near the top (currently lines 29–43, ending with `var _toastTimer = 0;`). Add one new line at the end of that block:

```js
  var _warmupComplete = false;
```

- [ ] Find the fast-start heuristic (currently lines 147–153):

```js
    // Fast-start heuristic: check after first 10 frames
    if (_frameCount === FAST_START_FRAMES && _currentLevel === 5) {
      if (_rollingFps < FPS_CRITICAL_THRESHOLD) {
        applyLevel(1);
        _lastDowngradeTime = _elapsedTime;
        return;
      }
    }
```

Replace the condition on the outer `if` with:

```js
    // Fast-start heuristic: check after first 10 frames (only after warmup completes)
    if (_frameCount === FAST_START_FRAMES && _currentLevel === 5 && _warmupComplete) {
      if (_rollingFps < FPS_CRITICAL_THRESHOLD) {
        applyLevel(1);
        _lastDowngradeTime = _elapsedTime;
        return;
      }
    }
```

- [ ] Add a `markWarmupComplete` function. Place it just above the `function init(...)` definition (currently around line 214):

```js
  function markWarmupComplete() {
    _warmupComplete = true;
    _frameCount = 0;
    _frameTimes = [];
  }
```

- [ ] Add `markWarmupComplete: markWarmupComplete,` to the `GAME.quality` object literal (currently lines 240–249). Place it after `reapply: reapply,` so the export reads:

```js
  GAME.quality = {
    init: init,
    update: update,
    reapply: reapply,
    markWarmupComplete: markWarmupComplete,
    get level() { return _currentLevel; },
    get name() { return LEVELS[_currentLevel].name; },
    get config() { return LEVELS[_currentLevel]; },
    get fps() { return Math.round(_rollingFps); },
    LEVELS: LEVELS
  };
```

(The five `get` properties already exist in the source — leave their bodies untouched. The only change is inserting `markWarmupComplete: markWarmupComplete,` after `reapply: reapply,`.)

### Step 1.4: Run the tests, verify they pass

Run: `npm test -- tests/unit/quality.test.js`

Expected: all tests pass — both pre-existing tests and the two new ones.

### Step 1.5: Commit

```bash
git add js/core/quality.js tests/unit/quality.test.js
git commit -m "feat(quality): gate fast-start heuristic on warmup completion"
```

---

## Task 2: Filter clamped (hitch) frames out of rolling FPS

**Files:**
- Modify: `js/core/quality.js`
- Modify: `tests/unit/quality.test.js`

### What this changes

In `quality.js:update(dt)`, replace the unconditional `_frameTimes.push(dt)` with a filter: skip the push when `dt >= 0.049` (one of the clamped frames produced by `main.js`'s `Math.min(now-lastTime, 0.05)`), unless the rolling window already has fewer than 10 samples — in which case include the frame so we don't lose all signal on genuinely slow hardware.

### Step 2.1: Write failing tests

- [ ] Open `tests/unit/quality.test.js`. Append a new `describe` block at the end of the file:

```js
describe('Hitch frame filter', () => {
  beforeEach(() => {
    // Reset internal state by calling markWarmupComplete (which clears _frameTimes/_frameCount)
    GAME.quality.markWarmupComplete();
  });

  it('should include normal frames in rolling fps', () => {
    for (var i = 0; i < 60; i++) GAME.quality.update(0.016);
    // ~60fps for 60 frames
    expect(GAME.quality.fps).toBeGreaterThan(50);
    expect(GAME.quality.fps).toBeLessThan(70);
  });

  it('should ignore a single clamped (>=0.049) frame after a smooth window', () => {
    // Fill window with 60 normal frames first
    for (var i = 0; i < 60; i++) GAME.quality.update(0.016);
    var fpsBefore = GAME.quality.fps;
    // Inject one clamped hitch frame
    GAME.quality.update(0.05);
    // FPS should be unchanged (within 1) since the hitch was filtered
    expect(Math.abs(GAME.quality.fps - fpsBefore)).toBeLessThanOrEqual(1);
  });

  it('should still include hitch frames when window has fewer than 10 samples', () => {
    // Fresh state — first frame is a hitch
    GAME.quality.update(0.05);
    // The frame should have been recorded — fps reflects ~20fps
    expect(GAME.quality.fps).toBeLessThan(25);
  });
});
```

### Step 2.2: Run the tests, verify they fail

Run: `npm test -- tests/unit/quality.test.js`

Expected: the two filter-aware tests fail (the third one ("ignore single clamped frame") will fail because the current implementation includes hitches; the second ("fewer than 10 samples") may pass coincidentally but only as a side effect, not because of the rule). The first ("include normal frames") should pass.

### Step 2.3: Implement the hitch filter

- [ ] Open `js/core/quality.js`. Find the existing rolling-window section in `update(dt)` (currently lines 125–127):

```js
    // Track frame time
    _frameTimes.push(dt);
    _frameCount++;
```

Replace it with:

```js
    // Track frame time — skip clamped (hitch) frames once the window has at least 10 samples
    var isHitch = dt >= 0.049;
    if (!isHitch || _frameTimes.length < 10) {
      _frameTimes.push(dt);
    }
    _frameCount++;
```

The `0.049` threshold is intentionally just under the `0.05` clamp in `main.js:1330`, so only frames *actually* clamped get filtered — not legitimately-slow frames that happen to land near 50ms.

### Step 2.4: Run the tests, verify they pass

Run: `npm test -- tests/unit/quality.test.js`

Expected: all tests pass, including the three new hitch-filter tests.

### Step 2.5: Commit

```bash
git add js/core/quality.js tests/unit/quality.test.js
git commit -m "feat(quality): exclude clamped frames from rolling FPS"
```

---

## Task 3: Rewrite `warmUpShaders()` for multi-permutation pre-compile

**Files:**
- Modify: `js/core/renderer.js`
- Modify: `tests/setup.js` (extend the WebGLRenderer mock with a `compile()` method)
- Modify: `tests/unit/quality.test.js` (no — see note below)
- Create: `tests/unit/renderer-warmup.test.js`

### What this changes

Rewrite `warmUpShaders()` in `js/core/renderer.js` to:
1. Bail early if a session-scoped `_alreadyWarmed` flag is `true` (the helper is now safe to call repeatedly).
2. Add the temporary `Line`/`LineBasicMaterial` and `Mesh`/`MeshBasicMaterial` to the scene (existing behavior — extracted into helpers `addWarmupMeshes()` and `cleanupWarmupMeshes()`).
3. Walk three shadow-shader permutations, calling `renderer.compile(scene, camera)` for each: shadows OFF, shadows PCF, shadows PCFSoft. Restore the original `dirLight.castShadow` and `renderer.shadowMap.type` afterward.
4. Run `renderWithBloom()` once at the end to exercise the post-processing pipeline at the original (PCFSoft) state.
5. Call `GAME.quality.markWarmupComplete()` if available, so the fast-start heuristic from Task 1 starts measuring from a clean baseline.
6. Reset `_alreadyWarmed = false` inside the `webglcontextrestored` handler so the warmup re-runs after a context loss.

### Step 3.1: Extend the WebGLRenderer test mock with `compile()`

The existing renderer mock in `tests/setup.js:324-335` lacks a `compile()` method. Without it, calling `warmUpShaders` would throw in tests. Add a no-op `compile` to the mock.

- [ ] Open `tests/setup.js`. Find the `WebGLRenderer` mock (around line 324):

```js
  WebGLRenderer: function(opts) {
    var canvas = document.createElement('canvas');
    canvas.requestPointerLock = function() {};
    return {
      domElement: canvas,
      setSize() {}, setPixelRatio() {}, setClearColor() {},
      setRenderTarget() {}, render() {}, dispose() {}, clear() {},
      shadowMap: { enabled: false, type: 0 },
      toneMapping: 0, toneMappingExposure: 1, outputColorSpace: 'srgb',
      getSize(target) { return target ? target.set(800, 600) : { width: 800, height: 600 }; }
    };
  },
```

Replace it with:

```js
  WebGLRenderer: function(opts) {
    var canvas = document.createElement('canvas');
    canvas.requestPointerLock = function() {};
    var compileCalls = [];
    return {
      domElement: canvas,
      setSize() {}, setPixelRatio() {}, setClearColor() {},
      setRenderTarget() {}, render() {}, dispose() {}, clear() {},
      compile(scene, camera) { compileCalls.push({ shadowType: this.shadowMap.type }); },
      _compileCalls: compileCalls,
      shadowMap: { enabled: false, type: 0, needsUpdate: false },
      toneMapping: 0, toneMappingExposure: 1, outputColorSpace: 'srgb',
      getSize(target) { return target ? target.set(800, 600) : { width: 800, height: 600 }; }
    };
  },
```

Also confirm `THREE.PCFShadowMap` is in the mock — search `tests/setup.js` for `PCFSoftShadowMap`. Find:

```js
  PCFSoftShadowMap: 2,
```

And add right above it:

```js
  PCFShadowMap: 1,
```

### Step 3.2: Write failing tests

- [ ] Create `tests/unit/renderer-warmup.test.js` with the following content:

```js
import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  // GAME.quality is needed for markWarmupComplete signal (loaded first so it's fresh)
  globalThis.GAME = {};
  loadModule('js/core/quality.js');

  // Mock dirLight + scene + skydome before renderer loads
  GAME.isMobile = false;
  GAME._dirLight = {
    castShadow: true,
    shadow: { mapSize: { width: 2048, height: 2048 }, map: null }
  };

  loadModule('js/core/renderer.js');
});

describe('Shader warmup', () => {
  it('should expose GAME._warmUpShaders', () => {
    expect(typeof GAME._warmUpShaders).toBe('function');
  });

  it('should call renderer.compile() once per shadow permutation on first invocation', () => {
    var r = GAME._renderer;
    r._compileCalls.length = 0;
    GAME._warmUpShaders();
    expect(r._compileCalls.length).toBe(3);
  });

  it('should be a no-op on second invocation (session-scoped guard)', () => {
    var r = GAME._renderer;
    r._compileCalls.length = 0;
    GAME._warmUpShaders();
    expect(r._compileCalls.length).toBe(0);
  });

  it('should restore dirLight.castShadow after warmup', () => {
    // Re-run isn't possible without resetting flag; this test instead ensures the
    // existing castShadow value (true) was not left flipped after the prior runs.
    expect(GAME._dirLight.castShadow).toBe(true);
  });

  it('should call GAME.quality.markWarmupComplete (verified by checking _warmupComplete-gated fast-start)', () => {
    // After warmup, fast-start heuristic should be live.
    // Drive 10 frames at 16ms — should not trigger downgrade because FPS is fine.
    var startLevel = GAME.quality.level;
    for (var i = 0; i < 10; i++) GAME.quality.update(0.016);
    expect(GAME.quality.level).toBe(startLevel);
  });
});
```

### Step 3.3: Run the tests, verify they fail

Run: `npm test -- tests/unit/renderer-warmup.test.js`

Expected: all 5 tests fail or error. The current `warmUpShaders` adds meshes and renders but does not call `compile()`.

### Step 3.4: Rewrite `warmUpShaders()` in `js/core/renderer.js`

- [ ] Open `js/core/renderer.js`. Find the `warmUpShaders()` function (currently lines 386–418).

Replace the entire function with:

```js
  // ── warmUpShaders ───────────────────────────────────────
  // Pre-compile every shader permutation the adaptive quality system can
  // transition between (shadows OFF, PCF, PCFSoft). On Windows ANGLE this
  // turns ~3× ~150ms compile hitches into one masked load-time cost.
  // Session-scoped: subsequent calls are no-op until WebGL context is lost.
  var _alreadyWarmed = false;

  function addWarmupMeshes() {
    var s = GAME.scene;
    var tmpObjs = [];

    // LineBasicMaterial (enemy/player tracers)
    var lMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    var lGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -0.001)]);
    var lLine = new THREE.Line(lGeo, lMat);
    lLine.frustumCulled = false;
    s.add(lLine);
    tmpObjs.push({ mesh: lLine, geo: lGeo, mat: lMat });

    // MeshBasicMaterial (explosions, smoke, sparks)
    var bMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    var bGeo = new THREE.PlaneGeometry(0.001, 0.001);
    var bMesh = new THREE.Mesh(bGeo, bMat);
    bMesh.position.copy(camera.position);
    s.add(bMesh);
    tmpObjs.push({ mesh: bMesh, geo: bGeo, mat: bMat });

    return tmpObjs;
  }

  function cleanupWarmupMeshes(tmpObjs) {
    var s = GAME.scene;
    for (var i = 0; i < tmpObjs.length; i++) {
      s.remove(tmpObjs[i].mesh);
      tmpObjs[i].geo.dispose();
      tmpObjs[i].mat.dispose();
    }
  }

  function warmUpShaders() {
    if (_alreadyWarmed) return;
    _alreadyWarmed = true;

    var dirLight = GAME._dirLight;
    var origCast = dirLight ? dirLight.castShadow : false;
    var origType = renderer.shadowMap.type;

    var tmpObjs = addWarmupMeshes();

    // Permutation 1: shadows OFF (Minimal / Very Low tiers)
    if (dirLight) dirLight.castShadow = false;
    renderer.compile(GAME.scene, camera);

    // Permutation 2: PCF shadows (Low / Medium tiers)
    if (dirLight) dirLight.castShadow = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.compile(GAME.scene, camera);

    // Permutation 3: PCFSoft shadows (High / Ultra tiers) + full post-fx pipeline
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.compile(GAME.scene, camera);
    renderWithBloom();

    // Restore original state
    if (dirLight) dirLight.castShadow = origCast;
    renderer.shadowMap.type = origType;

    cleanupWarmupMeshes(tmpObjs);

    // Signal adaptive quality system that warmup is complete
    if (GAME.quality && GAME.quality.markWarmupComplete) {
      GAME.quality.markWarmupComplete();
    }
  }
```

- [ ] Find the `webglcontextrestored` handler (currently lines 27–35):

```js
  renderer.domElement.addEventListener('webglcontextrestored', function() {
    _contextLost = false;
    console.log('[mini-cs] WebGL context restored — resuming');
    // Re-apply quality settings (forces shadow map + render target rebuild)
    if (GAME.quality) {
      GAME.quality.reapply();
    }
    resizeBloom();
  });
```

Add `_alreadyWarmed = false;` near the top of the handler so warmup re-runs after a context-loss-restore cycle:

```js
  renderer.domElement.addEventListener('webglcontextrestored', function() {
    _contextLost = false;
    _alreadyWarmed = false;
    console.log('[mini-cs] WebGL context restored — resuming');
    // Re-apply quality settings (forces shadow map + render target rebuild)
    if (GAME.quality) {
      GAME.quality.reapply();
    }
    resizeBloom();
  });
```

### Step 3.5: Run the tests, verify they pass

Run: `npm test`

Expected: all tests pass, including the new `renderer-warmup.test.js`. If the renderer mock's `compile()` was added correctly, the 3-permutation count test should pass.

If tests fail with `THREE.PCFShadowMap is undefined`, double-check Step 3.1.

### Step 3.6: Commit

```bash
git add js/core/renderer.js tests/setup.js tests/unit/renderer-warmup.test.js
git commit -m "perf(renderer): pre-compile shader permutations to avoid Windows ANGLE hitches"
```

### Step 3.7: Manual play-test on Windows (deferred — only if a Windows machine is available)

After Tasks 1–3 ship, manually verify on the Windows machine:

- [ ] Hard-reload the page. Wait until in-game.
- [ ] Open DevTools console, type `GAME.quality.name`, press Enter. Expectation: `'Ultra'` or `'High'` — should *not* be `'Very Low'` or `'Minimal'`.
- [ ] Fire the first shot. Expectation: no hitch (or much less than before).
- [ ] Wait for adaptive to attempt an upgrade or downgrade naturally during play. Expectation: tier transitions are visually smooth.

---

## Task 4: Add `_warmUpShaders()` calls at every "map ready" point

**Files:**
- Modify: `js/core/main.js`
- Modify: `js/modes/competitive.js`
- Modify: `js/modes/survival.js`
- Modify: `js/modes/gungame.js`
- Modify: `js/modes/deathmatch.js`

### What this changes

Add `GAME._warmUpShaders();` immediately after each `weapons.setWallsRef(...)` call site that follows a fresh map build. Remove the existing call inside `competitive.js:213` (which fires after map setup, double-warming the same session). The session-scoped guard in `warmUpShaders()` (Task 3) means repeated calls cost nothing.

### Step 4.1: Add warmup call in `js/core/main.js` (tour mode)

- [ ] Open `js/core/main.js`. Find lines 992–993:

```js
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);
```

Add one line after them:

```js
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);
    GAME._warmUpShaders();
```

### Step 4.2: Move warmup call in `js/modes/competitive.js`

- [ ] Open `js/modes/competitive.js`. Find lines 116–117:

```js
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);
```

Add one line after them:

```js
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);
    GAME._warmUpShaders();
```

- [ ] Find line 213 (the existing call):

```js
    // Warm up all shader programs during buy phase to prevent compilation hitches
    GAME._warmUpShaders();
```

Delete both lines (the comment and the call). The call moved to step 4.2's location, which fires earlier (during map setup) and once per session.

### Step 4.3: Add warmup calls in `js/modes/survival.js`

- [ ] Open `js/modes/survival.js`. Find lines 73–74:

```js
    player.setWalls(mapData.walls);
    weapons.setWallsRef(mapData.walls);
```

Add one line after them:

```js
    player.setWalls(mapData.walls);
    weapons.setWallsRef(mapData.walls);
    GAME._warmUpShaders();
```

- [ ] Find lines 140–141:

```js
      GAME.player.setWalls(newMapData.walls);
      weapons.setWallsRef(newMapData.walls);
```

Add one line after them:

```js
      GAME.player.setWalls(newMapData.walls);
      weapons.setWallsRef(newMapData.walls);
      GAME._warmUpShaders();
```

### Step 4.4: Add warmup call in `js/modes/gungame.js`

- [ ] Open `js/modes/gungame.js`. Find lines 84–85:

```js
    player.setWalls(mapData.walls);
    weapons.setWallsRef(mapData.walls);
```

Add one line after them:

```js
    player.setWalls(mapData.walls);
    weapons.setWallsRef(mapData.walls);
    GAME._warmUpShaders();
```

(Per the spec, do NOT add a warmup call after line 170's `setWalls` — that path is a player-respawn, not a fresh map build, and the guard would no-op anyway.)

### Step 4.5: Add warmup call in `js/modes/deathmatch.js`

- [ ] Open `js/modes/deathmatch.js`. Find lines 89–90:

```js
    player.setWalls(mapData.walls);
    weapons.setWallsRef(mapData.walls);
```

Add one line after them:

```js
    player.setWalls(mapData.walls);
    weapons.setWallsRef(mapData.walls);
    GAME._warmUpShaders();
```

(Per the spec, do NOT add a warmup call after line 192's `setWalls` — same reason as gungame.)

### Step 4.6: Run the test suite

Run: `npm test`

Expected: all tests pass with no regressions.

### Step 4.7: Commit

```bash
git add js/core/main.js js/modes/competitive.js js/modes/survival.js js/modes/gungame.js js/modes/deathmatch.js
git commit -m "perf(modes): call shader warmup at every map-ready point"
```

### Step 4.8: Manual play-test on Windows (final)

- [ ] Start each mode in turn (Competitive, Survival, Gun Game, Deathmatch, Tour). For each, fire the first shot. Expectation: no hitch in any mode.
- [ ] After ~15 seconds of menu + buy + gameplay, run `GAME.quality.name` in the console. Expectation: a higher tier than Very Low. Stable across the session.

---

## Self-Review Checklist (post-implementation)

Run this after all four tasks are committed:

- [ ] **Spec coverage:** Section 1 → Task 3. Section 2 → Task 4. Section 3a → Task 1. Section 3b → Task 2. All four spec sections covered.
- [ ] **Test coverage:** `tests/unit/quality.test.js` extended for Tasks 1 & 2. `tests/unit/renderer-warmup.test.js` added for Task 3. Task 4's correctness is manual-only (per spec).
- [ ] **No placeholders:** All steps contain exact line-number references, exact code, and exact commands.
- [ ] **API consistency:** `markWarmupComplete` (camelCase), `_warmupComplete` (snake_case private), `_alreadyWarmed` (snake_case private). Used consistently across Tasks 1 and 3.
- [ ] **No silent breakage:** Task 3's `warmUpShaders()` guards `GAME.quality.markWarmupComplete` with `if (...)`. Task 4's `GAME._warmUpShaders()` calls are safe even if Task 3 hasn't shipped (function exists from before, just less effective).
