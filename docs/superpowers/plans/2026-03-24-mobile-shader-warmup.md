# Mobile Shader Warm-Up & Tracer Pooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate mobile shader compilation freezes by warming up all shader programs during the buy phase and pooling enemy tracer objects.

**Architecture:** Two changes: (1) a `warmUpShaders()` function in `main.js` that renders one full-pipeline frame with temporary meshes covering all material types, called at the end of `startRound()` during buy phase; (2) a tracer/light object pool in `enemies.js` replacing per-shot allocation in `_showTracer()`.

**Tech Stack:** Three.js r160.1 (global `THREE`), IIFE module pattern, Vitest for tests.

**Spec:** `docs/superpowers/specs/2026-03-24-mobile-shader-warmup-design.md`

---

### Task 1: Add Enemy Tracer Pool — Tests

**Files:**
- Modify: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests for tracer pool initialization**

Add a new `describe('Tracer pool')` block after the existing `EnemyManager` tests:

```js
describe('Tracer pool', () => {
  var mgr, scene;
  beforeAll(() => {
    scene = new THREE.Scene();
    mgr = new GAME.EnemyManager(scene);
  });

  it('should initialize tracer line pool with shared material', () => {
    expect(mgr._tracerPool).toBeDefined();
    expect(mgr._tracerPool.length).toBe(8);
    mgr._tracerPool.forEach(function(line) {
      expect(line).toBeInstanceOf(THREE.Line);
      expect(line.visible).toBe(false);
      expect(line.frustumCulled).toBe(false);
    });
  });

  it('should share a single LineBasicMaterial across all pool tracers', () => {
    var mat = mgr._tracerPool[0].material;
    mgr._tracerPool.forEach(function(line) {
      expect(line.material).toBe(mat);
    });
  });

  it('should initialize muzzle flash light pool', () => {
    expect(mgr._flashPool).toBeDefined();
    expect(mgr._flashPool.length).toBe(4);
    mgr._flashPool.forEach(function(light) {
      expect(light).toBeInstanceOf(THREE.PointLight);
      expect(light.intensity).toBe(0);
    });
  });

  it('should have round-robin indices starting at 0', () => {
    expect(mgr._tracerIdx).toBe(0);
    expect(mgr._flashIdx).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL — `_tracerPool` is not defined on EnemyManager instances.

- [ ] **Step 3: Commit failing tests**

```bash
git add tests/unit/enemies.test.js
git commit -m "test(enemies): add failing tests for tracer/flash pool initialization"
```

---

### Task 2: Implement Enemy Tracer Pool

**Files:**
- Modify: `js/enemies.js` — EnemyManager constructor (~line 1600-1640) and `_showTracer` (line 1641)

- [ ] **Step 1: Add pool initialization in EnemyManager constructor**

In the `EnemyManager` constructor function (find it via `function EnemyManager(scene)`), add pool setup after `this.enemies = []`:

```js
// ── Tracer/flash pool (pre-allocated to avoid shader compilation during gameplay) ──
this._tracerMat = new THREE.LineBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.5 });
this._tracerPool = [];
var dummyPts = [new THREE.Vector3(), new THREE.Vector3()];
for (var tp = 0; tp < 8; tp++) {
  var tGeo = new THREE.BufferGeometry().setFromPoints(dummyPts);
  var tLine = new THREE.Line(tGeo, this._tracerMat);
  tLine.visible = false;
  tLine.frustumCulled = false;
  scene.add(tLine);
  this._tracerPool.push(tLine);
}
this._tracerIdx = 0;

this._flashPool = [];
for (var fp = 0; fp < 4; fp++) {
  var fl = new THREE.PointLight(0xff6600, 0, 5);
  scene.add(fl);
  this._flashPool.push(fl);
}
this._flashIdx = 0;
this._poolTimeouts = [];
```

- [ ] **Step 2: Run tests to verify pool init tests pass**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: All 4 new tracer pool tests PASS. Existing tests still pass.

- [ ] **Step 3: Rewrite `_showTracer` to use pool**

Replace the entire `Enemy.prototype._showTracer` method (lines 1641-1666) with:

```js
Enemy.prototype._showTracer = function(target) {
  var mgr = this._manager;
  var start = this.mesh.position.clone();
  start.y = 1.3;
  var end = target.clone();
  end.x += (Math.random() - 0.5) * 0.2;
  end.y += (Math.random() - 0.5) * 0.15;
  end.z += (Math.random() - 0.5) * 0.2;

  // Grab pooled tracer line (round-robin)
  var line = mgr._tracerPool[mgr._tracerIdx];
  mgr._tracerIdx = (mgr._tracerIdx + 1) % mgr._tracerPool.length;
  line.geometry.setFromPoints([start, end]);
  line.visible = true;

  // Grab pooled muzzle flash light (round-robin)
  var flash = mgr._flashPool[mgr._flashIdx];
  mgr._flashIdx = (mgr._flashIdx + 1) % mgr._flashPool.length;
  flash.position.copy(start);
  flash.intensity = 2;

  var tid = setTimeout(function() {
    line.visible = false;
    flash.intensity = 0;
  }, 60);
  mgr._poolTimeouts.push(tid);
};
```

**Pre-requisite — wire `_manager` reference on each Enemy:**

Each `Enemy` needs a reference to its `EnemyManager` so `_showTracer` can access the pool. The `Enemy` constructor (`js/enemies.js:75`) does not currently have this. Add the wiring post-construction at the three call sites in the spawn methods:

In `spawnBots` (line 1926), after the `new Enemy(...)` push:
```js
this.enemies.push(new Enemy(this.scene, spawn, waypoints, walls, i, roundNum || 1));
this.enemies[this.enemies.length - 1]._manager = this;
```

In `spawnTeamBots` — ally spawn (line 1944):
```js
this.enemies.push(new Enemy(this.scene, { x: ox, z: oz }, waypoints, walls, id++, roundNum || 1, allyTeam));
this.enemies[this.enemies.length - 1]._manager = this;
```

In `spawnTeamBots` — enemy spawn (line 1953):
```js
this.enemies.push(new Enemy(this.scene, { x: ox, z: oz }, waypoints, walls, id++, roundNum || 1, oppTeam));
this.enemies[this.enemies.length - 1]._manager = this;
```

This avoids changing the `Enemy` constructor signature and keeps the change minimal.

- [ ] **Step 4: Add pool timeout cleanup in `clearAll`**

In `EnemyManager.prototype.clearAll` (line 1979), **add** the following lines after the existing `this.enemies = [];` line (do not replace existing code):

```js
  // Cancel any pending tracer/flash timeouts
  for (var t = 0; t < this._poolTimeouts.length; t++) clearTimeout(this._poolTimeouts[t]);
  this._poolTimeouts = [];
```

Note: The pool objects themselves (tracer lines, flash lights) are not disposed here — they persist in the scene across rounds. They are only fully disposed when the EnemyManager is reconstructed for a new scene (which happens in `startRound` when `scene = new THREE.Scene()` is created, orphaning the old objects for GC).

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add js/enemies.js
git commit -m "feat(enemies): pool tracer lines and muzzle flash lights to avoid per-shot allocation"
```

---

### Task 3: Add Shader Warm-Up — Tests

**Files:**
- Modify: `tests/unit/main.test.js`

- [ ] **Step 1: Write failing test for warmUpShaders exposure**

Add a new `describe('warmUpShaders')` block:

```js
describe('warmUpShaders', () => {
  it('should expose GAME._warmUpShaders as a function', () => {
    expect(typeof GAME._warmUpShaders).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/main.test.js`
Expected: FAIL — `GAME._warmUpShaders` is not defined.

- [ ] **Step 3: Commit failing test**

```bash
git add tests/unit/main.test.js
git commit -m "test(main): add failing test for shader warm-up function exposure"
```

---

### Task 4: Implement Shader Warm-Up Function

**Files:**
- Modify: `js/main.js` — add `warmUpShaders()` function and call it from `startRound()`

- [ ] **Step 1: Add the `warmUpShaders` function**

Add this function near the other utility functions in `main.js` (after `applyColorGrade` around line 520, before `renderWithBloom`):

```js
function warmUpShaders() {
  // Force GPU to compile all shader programs during buy phase.
  // Temporary meshes cover material types not guaranteed in the scene.
  var tmpObjs = [];

  // LineBasicMaterial (enemy/player tracers)
  var lMat = new THREE.LineBasicMaterial({ color: 0xffffff });
  var lGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -0.001)]);
  var lLine = new THREE.Line(lGeo, lMat);
  lLine.frustumCulled = false;
  scene.add(lLine);
  tmpObjs.push({ mesh: lLine, geo: lGeo, mat: lMat });

  // MeshBasicMaterial (explosions, smoke, sparks)
  var bMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  var bGeo = new THREE.PlaneGeometry(0.001, 0.001);
  var bMesh = new THREE.Mesh(bGeo, bMat);
  bMesh.position.copy(camera.position);
  scene.add(bMesh);
  tmpObjs.push({ mesh: bMesh, geo: bGeo, mat: bMat });

  // Render one full frame through the post-processing pipeline
  renderWithBloom();

  // Clean up temporary objects
  for (var i = 0; i < tmpObjs.length; i++) {
    scene.remove(tmpObjs[i].mesh);
    tmpObjs[i].geo.dispose();
    tmpObjs[i].mat.dispose();
  }
}
GAME._warmUpShaders = warmUpShaders;
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- tests/unit/main.test.js`
Expected: PASS — `GAME._warmUpShaders` is now defined.

- [ ] **Step 3: Call `warmUpShaders()` at the end of `startRound()`**

In `startRound()`, add the call right before the closing brace (after the `GAME.Sound` lines at ~line 2715):

```js
    // Warm up all shader programs during buy phase to prevent compilation hitches
    warmUpShaders();
  }
```

This replaces the existing closing `}` of `startRound()`.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add js/main.js
git commit -m "feat(main): add shader warm-up during buy phase to eliminate mobile compilation freezes"
```

---

### Task 5: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Add shader warm-up documentation**

Find the Performance section in `REQUIREMENTS.md` and add documentation for the new features:

Under the performance/optimization section, add:

```markdown
### Shader Warm-Up
- `warmUpShaders()` called at end of `startRound()` during buy phase
- Creates temporary `LineBasicMaterial` line and `MeshBasicMaterial` mesh
- Renders one full frame through the post-processing pipeline to force GPU shader compilation
- Removes temporary objects after the warm-up render
- Eliminates 1-2 second freeze on first round of a new map on mobile devices

### Enemy Tracer Object Pool
- 8 pre-allocated `THREE.Line` objects with shared `LineBasicMaterial` (color: 0xff6600)
- 4 pre-allocated `THREE.PointLight` objects for muzzle flashes
- Round-robin allocation in `_showTracer()` — no per-shot object creation
- All pool tracers set `frustumCulled = false` to prevent culling of long-distance tracers
- Pending timeouts cancelled on `clearAll()` to prevent stale callbacks
```

- [ ] **Step 2: Run tests to make sure nothing broke**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: add shader warm-up and tracer pooling to REQUIREMENTS.md"
```
