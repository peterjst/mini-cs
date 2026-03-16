# Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate per-shot memory allocations, cap particle array growth, and cache raycast targets to improve combat performance across all maps.

**Architecture:** Three independent optimizations: (1) pool enemy tracer/light objects in `enemies.js`, (2) replace unbounded `_particles` push/splice in `weapons.js` with a fixed-size ring buffer, (3) cache the raycast `allObjects` array per-frame in `main.js` with static wall list cached at map load.

**Tech Stack:** Three.js r160.1, vanilla JS (IIFE module pattern), Vitest

**Spec:** `docs/superpowers/specs/2026-03-15-performance-optimization-design.md`

---

## Chunk 1: Enemy Muzzle Flash Pooling

### Task 1: Add manager reference to Enemy and test tracer pool initialization

**Files:**
- Modify: `js/enemies.js` — `Enemy` constructor, `EnemyManager.prototype.spawnBots`, `EnemyManager.prototype.spawnTeamBots`, `EnemyManager` constructor
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests for tracer pool**

Add to the existing enemies test file. Use `new THREE.Scene()` (backed by `createMockScene()` in the test setup) — not `MockScene`. These tests verify that the enemy system creates a pool of reusable tracer objects.

```javascript
describe('Enemy tracer pool', function() {
  it('should initialize tracer pool with 8 lines on EnemyManager creation', function() {
    var scene = new THREE.Scene();
    var mgr = new GAME.EnemyManager(scene);
    expect(mgr._tracerPool).toBeDefined();
    expect(mgr._tracerPool.length).toBe(8);
    expect(mgr._tracerIdx).toBe(0);
  });

  it('should initialize muzzle light pool with 4 lights on EnemyManager creation', function() {
    var scene = new THREE.Scene();
    var mgr = new GAME.EnemyManager(scene);
    expect(mgr._flashLightPool).toBeDefined();
    expect(mgr._flashLightPool.length).toBe(4);
    expect(mgr._flashLightIdx).toBe(0);
  });

  it('should start all pool tracers as invisible', function() {
    var scene = new THREE.Scene();
    var mgr = new GAME.EnemyManager(scene);
    for (var i = 0; i < mgr._tracerPool.length; i++) {
      expect(mgr._tracerPool[i].visible).toBe(false);
    }
  });

  it('should start all pool lights with intensity 0', function() {
    var scene = new THREE.Scene();
    var mgr = new GAME.EnemyManager(scene);
    for (var i = 0; i < mgr._flashLightPool.length; i++) {
      expect(mgr._flashLightPool[i].intensity).toBe(0);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL — `_tracerPool` is undefined

- [ ] **Step 3: Add manager reference to Enemy and implement tracer pool initialization**

**3a. Add `manager` parameter to Enemy constructor.**

In `js/enemies.js`, in the `Enemy` constructor (around line 68), add `manager` as the last parameter and store it:

```javascript
function Enemy(scene, spawnPos, waypoints, walls, id, roundNum, team, manager) {
  // ... existing code ...
  this.manager = manager;
```

**3b. Pass `this` as manager in all `new Enemy(...)` call sites.**

In `EnemyManager.prototype.spawnBots` (around line 1608):
```javascript
var e = new Enemy(this.scene, spawn, waypoints, walls, i, roundNum || 1, undefined, this);
```

In `EnemyManager.prototype.spawnTeamBots` (around lines 1626, 1635 — both CT and T spawn loops):
```javascript
var e = new Enemy(this.scene, spawn, waypoints, walls, idx, roundNum || 1, 'CT', this);
// and
var e = new Enemy(this.scene, spawn, waypoints, walls, idx, roundNum || 1, 'T', this);
```

**3c. Add pool initialization to the `EnemyManager` constructor** (around line 1553):

```javascript
// ── Tracer & muzzle flash pools ──
this._tracerPool = [];
this._tracerIdx = 0;
this._flashLightPool = [];
this._flashLightIdx = 0;
this._tracerTimeouts = [];

var tracerMat = new THREE.LineBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.5 });
for (var i = 0; i < 8; i++) {
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, 0,0,0], 3));
  var line = new THREE.Line(geo, tracerMat);
  line.visible = false;
  line.frustumCulled = false;
  this.scene.add(line);
  this._tracerPool.push(line);
}

for (var i = 0; i < 4; i++) {
  var light = new THREE.PointLight(0xff6600, 0, 5);
  this.scene.add(light);
  this._flashLightPool.push(light);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat: add enemy tracer and muzzle flash light pools"
```

---

### Task 2: Test and implement pool-based _showTracer

**Files:**
- Modify: `js/enemies.js` — `_showTracer` method (lines 1335-1360)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests for pool-based tracer firing**

Use `mgr.spawnBots(...)` to create enemies (the established test pattern), then access `mgr.enemies[0]`. Since Task 1 added the `manager` parameter to the `Enemy` constructor and the `spawnBots` call sites now pass `this`, spawned enemies will have `this.manager` set.

```javascript
describe('Enemy tracer pool firing', function() {
  var scene, mgr, spawns, waypoints, walls;
  beforeEach(function() {
    scene = new THREE.Scene();
    mgr = new GAME.EnemyManager(scene);
    // Minimal spawn data — adapt to match existing test setup
    spawns = [new THREE.Vector3(0, 0, 0)];
    waypoints = [new THREE.Vector3(5, 0, 5)];
    walls = [];
    mgr.spawnBots(1, spawns, waypoints, walls);
  });

  it('should make a tracer visible when _showTracer is called', function() {
    mgr.enemies[0]._showTracer(new THREE.Vector3(5, 1.3, 5));
    expect(mgr._tracerPool[0].visible).toBe(true);
  });

  it('should advance tracer index round-robin', function() {
    mgr.enemies[0]._showTracer(new THREE.Vector3(5, 1.3, 5));
    expect(mgr._tracerIdx).toBe(1);
    mgr.enemies[0]._showTracer(new THREE.Vector3(5, 1.3, 5));
    expect(mgr._tracerIdx).toBe(2);
  });

  it('should wrap tracer index after pool size', function() {
    for (var i = 0; i < 8; i++) {
      mgr.enemies[0]._showTracer(new THREE.Vector3(5, 1.3, 5));
    }
    expect(mgr._tracerIdx).toBe(0);
  });

  it('should set flash light intensity to 2 when firing', function() {
    mgr.enemies[0]._showTracer(new THREE.Vector3(5, 1.3, 5));
    expect(mgr._flashLightPool[0].intensity).toBe(2);
  });

  it('should not create new geometry objects on fire', function() {
    var addCount = scene.children.length;
    mgr.enemies[0]._showTracer(new THREE.Vector3(5, 1.3, 5));
    expect(scene.children.length).toBe(addCount);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL

- [ ] **Step 3: Rewrite _showTracer to use pool**

Replace `Enemy.prototype._showTracer` (lines 1335-1360) with:

```javascript
Enemy.prototype._showTracer = function(target) {
  var mgr = this.manager;
  var start = this.mesh.position.clone();
  start.y = 1.3;
  var end = target.clone();
  end.x += (Math.random() - 0.5) * 0.2;
  end.y += (Math.random() - 0.5) * 0.15;
  end.z += (Math.random() - 0.5) * 0.2;

  // Grab tracer from pool (round-robin)
  var line = mgr._tracerPool[mgr._tracerIdx];
  mgr._tracerIdx = (mgr._tracerIdx + 1) % mgr._tracerPool.length;
  var posAttr = line.geometry.getAttribute('position');
  posAttr.setXYZ(0, start.x, start.y, start.z);
  posAttr.setXYZ(1, end.x, end.y, end.z);
  posAttr.needsUpdate = true;
  line.visible = true;

  // Grab light from pool (round-robin)
  var flash = mgr._flashLightPool[mgr._flashLightIdx];
  mgr._flashLightIdx = (mgr._flashLightIdx + 1) % mgr._flashLightPool.length;
  flash.position.copy(start);
  flash.intensity = 2;

  // Return to pool after 60ms — track timeout for cleanup
  var tid = setTimeout(function() {
    line.visible = false;
    flash.intensity = 0;
  }, 60);
  mgr._tracerTimeouts.push(tid);
};
```

Also ensure `Enemy` constructor stores a reference to its manager:
- Check that `this.manager = manager` is set when enemies are created (if not already present, add it to the Enemy constructor)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat: rewrite _showTracer to use pooled tracers and lights"
```

---

### Task 3: Test and implement pool cleanup on clearAll

**Files:**
- Modify: `js/enemies.js` — `clearAll` method (lines 1661-1664) and `destroy`/cleanup paths
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests for pool cleanup**

```javascript
describe('Enemy tracer pool cleanup', function() {
  var scene, mgr;
  beforeEach(function() {
    scene = new THREE.Scene();
    mgr = new GAME.EnemyManager(scene);
    mgr.spawnBots(1, [new THREE.Vector3(0,0,0)], [new THREE.Vector3(5,0,5)], []);
  });

  it('should cancel in-flight timeouts on clearAll', function() {
    mgr.enemies[0]._showTracer(new THREE.Vector3(5, 1.3, 5));
    mgr.enemies[0]._showTracer(new THREE.Vector3(5, 1.3, 5));
    expect(mgr._tracerTimeouts.length).toBe(2);
    mgr.clearAll();
    expect(mgr._tracerTimeouts.length).toBe(0);
  });

  it('should reset all pool tracers to invisible on clearAll', function() {
    mgr.enemies[0]._showTracer(new THREE.Vector3(5, 1.3, 5));
    mgr.clearAll();
    for (var i = 0; i < mgr._tracerPool.length; i++) {
      expect(mgr._tracerPool[i].visible).toBe(false);
    }
  });

  it('should reset all pool lights to intensity 0 on clearAll', function() {
    mgr.enemies[0]._showTracer(new THREE.Vector3(5, 1.3, 5));
    mgr.clearAll();
    for (var i = 0; i < mgr._flashLightPool.length; i++) {
      expect(mgr._flashLightPool[i].intensity).toBe(0);
    }
  });

  it('should reset pool indices on clearAll', function() {
    mgr.enemies[0]._showTracer(new THREE.Vector3(5, 1.3, 5));
    mgr.clearAll();
    expect(mgr._tracerIdx).toBe(0);
    expect(mgr._flashLightIdx).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL

- [ ] **Step 3: Update clearAll to clean up pools**

In `js/enemies.js`, modify `EnemyManager.prototype.clearAll` (lines 1661-1664):

```javascript
EnemyManager.prototype.clearAll = function() {
  for (var i = 0; i < this.enemies.length; i++) this.enemies[i].destroy();
  this.enemies = [];

  // Cancel in-flight tracer timeouts
  for (var i = 0; i < this._tracerTimeouts.length; i++) {
    clearTimeout(this._tracerTimeouts[i]);
  }
  this._tracerTimeouts = [];

  // Reset tracer pool
  for (var i = 0; i < this._tracerPool.length; i++) {
    this._tracerPool[i].visible = false;
  }
  this._tracerIdx = 0;

  // Reset light pool
  for (var i = 0; i < this._flashLightPool.length; i++) {
    this._flashLightPool[i].intensity = 0;
  }
  this._flashLightIdx = 0;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat: clean up tracer/light pools on clearAll"
```

---

## Chunk 2: Weapon Particle Ring Buffer

### Task 4: Test ring buffer initialization

**Files:**
- Modify: `js/weapons.js` — `_particles` array and `_tickParticles`
- Test: `tests/unit/weapons.test.js`

- [ ] **Step 1: Write failing tests for ring buffer init**

```javascript
describe('Weapon particle ring buffer', function() {
  it('should initialize _particles as fixed-size array of 64 slots', function() {
    // After WeaponSystem init, _particles should be pre-allocated
    expect(weapons._particles.length).toBe(64);
  });

  it('should start all particle slots as inactive', function() {
    for (var i = 0; i < weapons._particles.length; i++) {
      expect(weapons._particles[i].active).toBe(false);
    }
  });

  it('should initialize _particleIdx to 0', function() {
    expect(weapons._particleIdx).toBe(0);
  });
});
```

Note: Adapt the test setup to match the existing pattern in `tests/unit/weapons.test.js` — check how `weapons` is instantiated in that file.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/weapons.test.js`
Expected: FAIL — `_particles.length` is 0 (empty array), not 64

- [ ] **Step 3: Implement ring buffer initialization**

In `js/weapons.js`, replace `this._particles = [];` (line 833) with:

Pre-allocate all known fields to maintain a stable V8 hidden class (avoids shape transitions when different particle types reuse slots):

```javascript
this._particles = [];
this._particleIdx = 0;
for (var i = 0; i < 64; i++) {
  this._particles.push({
    active: false, elapsed: 0, maxLife: 0,
    mesh: null, line: null, update: null, onExpire: null,
    sparkSet: null, sparkVels: null,
    vx: 0, vy: 0, vz: 0, spinX: 0, spinZ: 0, bounced: false
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/weapons.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add js/weapons.js tests/unit/weapons.test.js
git commit -m "feat: pre-allocate 64-slot particle ring buffer"
```

---

### Task 5: Test and implement ring buffer particle insertion

**Files:**
- Modify: `js/weapons.js` — all `this._particles.push(...)` call sites
- Test: `tests/unit/weapons.test.js`

- [ ] **Step 1: Write failing tests for ring buffer insertion**

```javascript
describe('Weapon particle ring buffer insertion', function() {
  it('should activate a slot when adding a particle', function() {
    weapons._addParticle({ mesh: mockMesh, maxLife: 1.0, update: function(){}, onExpire: function(){} });
    expect(weapons._particles[0].active).toBe(true);
    expect(weapons._particles[0].maxLife).toBe(1.0);
  });

  it('should advance _particleIdx after insertion', function() {
    var startIdx = weapons._particleIdx;
    weapons._addParticle({ mesh: mockMesh, maxLife: 1.0, update: function(){}, onExpire: function(){} });
    expect(weapons._particleIdx).toBe(startIdx + 1);
  });

  it('should wrap _particleIdx at 64', function() {
    weapons._particleIdx = 63;
    weapons._addParticle({ mesh: mockMesh, maxLife: 1.0, update: function(){}, onExpire: function(){} });
    expect(weapons._particleIdx).toBe(0);
  });

  it('should call onExpire on existing active slot before reuse', function() {
    var expired = false;
    weapons._particleIdx = 0;
    weapons._particles[0].active = true;
    weapons._particles[0].onExpire = function() { expired = true; };
    weapons._addParticle({ mesh: mockMesh, maxLife: 1.0, update: function(){}, onExpire: function(){} });
    expect(expired).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/weapons.test.js`
Expected: FAIL — `_addParticle` is undefined

- [ ] **Step 3: Implement _addParticle and replace push calls**

Add a new method to `WeaponSystem.prototype`:

```javascript
WeaponSystem.prototype._addParticle = function(opts) {
  var slot = this._particles[this._particleIdx];
  // If slot is still active, expire it early
  if (slot.active && slot.onExpire) slot.onExpire();
  slot.active = true;
  slot.elapsed = 0;
  slot.maxLife = opts.maxLife;
  slot.mesh = opts.mesh || null;
  slot.line = opts.line || null;
  slot.update = opts.update;
  slot.onExpire = opts.onExpire;
  // Copy any extra physics properties
  var keys = Object.keys(opts);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (k !== 'active' && k !== 'elapsed' && k !== 'maxLife' && k !== 'mesh' && k !== 'line' && k !== 'update' && k !== 'onExpire') {
      slot[k] = opts[k];
    }
  }
  this._particleIdx = (this._particleIdx + 1) % this._particles.length;
};
```

Then replace all `this._particles.push({...})` call sites with `this._addParticle({...})`. The argument objects stay the same — just change `push` to `_addParticle`. Search for `this._particles.push(` to find all sites (around lines 2057, 2089, 2140 and similar).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/weapons.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add js/weapons.js tests/unit/weapons.test.js
git commit -m "feat: add _addParticle ring buffer method, replace push calls"
```

---

### Task 6: Test and implement ring buffer _tickParticles

**Files:**
- Modify: `js/weapons.js` — `_tickParticles` method (lines 1998-2010)
- Test: `tests/unit/weapons.test.js`

- [ ] **Step 1: Write failing tests for ring buffer tick**

```javascript
describe('Weapon particle ring buffer tick', function() {
  it('should call update on active particles', function() {
    var updated = false;
    weapons._particles[0].active = true;
    weapons._particles[0].elapsed = 0;
    weapons._particles[0].maxLife = 1.0;
    weapons._particles[0].update = function() { updated = true; };
    weapons._particles[0].onExpire = function() {};
    weapons._tickParticles(0.016);
    expect(updated).toBe(true);
  });

  it('should skip inactive particles', function() {
    var updated = false;
    weapons._particles[0].active = false;
    weapons._particles[0].update = function() { updated = true; };
    weapons._tickParticles(0.016);
    expect(updated).toBe(false);
  });

  it('should deactivate and call onExpire when elapsed >= maxLife', function() {
    var expired = false;
    weapons._particles[0].active = true;
    weapons._particles[0].elapsed = 0.99;
    weapons._particles[0].maxLife = 1.0;
    weapons._particles[0].update = function() {};
    weapons._particles[0].onExpire = function() { expired = true; };
    weapons._tickParticles(0.016); // 0.99 + 0.016 > 1.0
    expect(expired).toBe(true);
    expect(weapons._particles[0].active).toBe(false);
  });

  it('should not splice the array (length stays 64)', function() {
    weapons._particles[0].active = true;
    weapons._particles[0].elapsed = 0.99;
    weapons._particles[0].maxLife = 1.0;
    weapons._particles[0].update = function() {};
    weapons._particles[0].onExpire = function() {};
    weapons._tickParticles(0.016);
    expect(weapons._particles.length).toBe(64);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/weapons.test.js`
Expected: FAIL — current `_tickParticles` uses splice and expects old array format

- [ ] **Step 3: Rewrite _tickParticles for ring buffer**

Replace `WeaponSystem.prototype._tickParticles` (lines 1998-2010) with:

```javascript
WeaponSystem.prototype._tickParticles = function(dt) {
  var ps = this._particles;
  for (var i = 0; i < ps.length; i++) {
    var p = ps[i];
    if (!p.active) continue;
    p.elapsed += dt;
    if (p.elapsed >= p.maxLife) {
      p.onExpire();
      p.active = false;
    } else {
      p.update(dt);
    }
  }
};
```

- [ ] **Step 4: Run all tests to verify nothing is broken**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```
git add js/weapons.js tests/unit/weapons.test.js
git commit -m "feat: rewrite _tickParticles for ring buffer (no splice)"
```

---

## Chunk 3: Raycast Object Caching

### Task 7: Test and implement static wall cache

**Files:**
- Modify: `js/main.js` — `startRound` function (around line 2494)
- Modify: `js/weapons.js` — `tryFire` method
- Test: `tests/unit/weapons.test.js`

- [ ] **Step 1: Write failing tests for wall cache**

```javascript
describe('Raycast wall cache', function() {
  it('should store collidable walls on GAME._collidableWalls at map load', function() {
    // After startRound/map setup, GAME._collidableWalls should be set
    expect(GAME._collidableWalls).toBeDefined();
    expect(Array.isArray(GAME._collidableWalls)).toBe(true);
  });

  it('should use GAME._collidableWalls when set instead of this._wallsRef', function() {
    // Set up cached walls
    var cachedWalls = [{ type: 'wall' }];
    GAME._collidableWalls = cachedWalls;
    // tryFire should use the cached version
    // Verify by checking that allObjects includes the cached walls
    // (Exact assertion depends on tryFire internals — test that the walls used match the cache)
  });
});
```

Note: Adapt these tests to fit the existing test infrastructure. The key assertion is that `GAME._collidableWalls` is populated at map load and used by `tryFire`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/weapons.test.js`
Expected: FAIL — `GAME._collidableWalls` is undefined

- [ ] **Step 3: Implement wall cache inside setWallsRef**

There are **six** map-loading paths that call `weapons.setWallsRef(mapWalls)` (startRound, Gun Game, Survival, Deathmatch, Tour start, Tour rotation). Rather than adding the cache line to all six sites, set it inside `setWallsRef` itself.

In `js/weapons.js`, modify `WeaponSystem.prototype.setWallsRef`:

```javascript
WeaponSystem.prototype.setWallsRef = function(walls) {
  this._wallsRef = walls;
  GAME._collidableWalls = walls.slice(); // Static copy — walls don't change during round
};
```

This ensures the cache is always up-to-date regardless of which game mode loads the map.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/weapons.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add js/main.js tests/unit/weapons.test.js
git commit -m "feat: cache collidable walls at map load in GAME._collidableWalls"
```

---

### Task 8: Test and implement per-frame raycast target cache

**Files:**
- Modify: `js/main.js` — game loop (around line 4440)
- Modify: `js/weapons.js` — `tryFire` method (lines 1652-1659)
- Test: `tests/unit/weapons.test.js`

- [ ] **Step 1: Write failing tests for per-frame cache**

```javascript
describe('Raycast per-frame target cache', function() {
  it('should have GAME._raycastTargets after frame update', function() {
    expect(GAME._raycastTargets).toBeDefined();
    expect(Array.isArray(GAME._raycastTargets)).toBe(true);
  });

  it('should include alive enemy meshes in _raycastTargets', function() {
    var mockEnemy = { alive: true, mesh: { type: 'enemy' } };
    GAME._collidableWalls = [];
    // Simulate building frame targets with one alive enemy
    GAME._buildFrameTargets([mockEnemy], []);
    expect(GAME._raycastTargets).toContainEqual(mockEnemy.mesh);
  });

  it('should exclude dead enemies from _raycastTargets', function() {
    var mockEnemy = { alive: false, mesh: { type: 'enemy' } };
    GAME._collidableWalls = [];
    GAME._buildFrameTargets([mockEnemy], []);
    expect(GAME._raycastTargets).not.toContainEqual(mockEnemy.mesh);
  });

  it('should include alive bird meshes in _raycastTargets', function() {
    var mockBird = { alive: true, mesh: { type: 'bird' } };
    GAME._collidableWalls = [];
    GAME._buildFrameTargets([], [mockBird]);
    expect(GAME._raycastTargets).toContainEqual(mockBird.mesh);
  });

  it('should include cached walls in _raycastTargets', function() {
    var wall = { type: 'wall' };
    GAME._collidableWalls = [wall];
    GAME._buildFrameTargets([], []);
    expect(GAME._raycastTargets).toContainEqual(wall);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/weapons.test.js`
Expected: FAIL — `GAME._buildFrameTargets` is undefined

- [ ] **Step 3: Implement per-frame target builder and integrate into game loop**

In `js/main.js`, add a helper function (near the top of the game state section):

```javascript
GAME._raycastTargets = [];
GAME._buildFrameTargets = function(enemies, birds) {
  var targets = [];
  for (var i = 0; i < enemies.length; i++) {
    if (enemies[i].alive && enemies[i].mesh) targets.push(enemies[i].mesh);
  }
  for (var i = 0; i < birds.length; i++) {
    if (birds[i].alive && birds[i].mesh) targets.push(birds[i].mesh);
  }
  if (GAME._collidableWalls) {
    for (var i = 0; i < GAME._collidableWalls.length; i++) {
      targets.push(GAME._collidableWalls[i]);
    }
  }
  GAME._raycastTargets = targets;
};
```

Then in the game loop, call this before weapon fire in each game state that calls `tryFire`:

**For PLAYING, SURVIVAL_WAVE, GUNGAME_ACTIVE, DEATHMATCH_ACTIVE** (the main combat block around line 4440):
```javascript
GAME._buildFrameTargets(enemyManager.enemies, birds || []);
```

**For TOURING** (around line 4312) — pass `[]` for enemies to match the existing `tryFire(now, [])` semantics (Tour mode has no combat enemies):
```javascript
GAME._buildFrameTargets([], birds || []);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/weapons.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add js/main.js tests/unit/weapons.test.js
git commit -m "feat: build per-frame raycast target cache in game loop"
```

---

### Task 9: Replace allObjects construction in tryFire with cache

**Files:**
- Modify: `js/weapons.js` — `tryFire` method (lines 1652-1659)
- Test: `tests/unit/weapons.test.js`

- [ ] **Step 1: Write failing test for cache usage in tryFire**

```javascript
describe('tryFire uses raycast cache', function() {
  it('should use GAME._raycastTargets instead of building allObjects', function() {
    // Set up GAME._raycastTargets with known objects
    var wall = { isWall: true };
    GAME._raycastTargets = [wall];
    // Call tryFire — it should use the cache
    // Verify by ensuring no new array is built from enemies iteration
    // (Test by passing empty enemies array but having cache populated)
    var result = weapons.tryFire(performance.now(), []);
    // The raycast should still check against the cached wall
    // (Exact assertion depends on whether a shot was fired and hit detection)
  });
});
```

Note: This test may need adaptation based on the existing test harness — the key is verifying `tryFire` reads from `GAME._raycastTargets`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/weapons.test.js`
Expected: FAIL

- [ ] **Step 3: Replace allObjects construction with cache lookup**

In `js/weapons.js`, replace the `allObjects` construction block (lines 1650-1659). Remove the now-dead `var birds` line and the manual array building:

```javascript
// OLD (remove all of this):
// var birds = this._birdsRef || [];
// var allObjects = [];
// for (var i = 0; i < enemies.length; i++) {
//   if (enemies[i].alive && enemies[i].mesh) allObjects.push(enemies[i].mesh);
// }
// for (var i = 0; i < birds.length; i++) {
//   if (birds[i].alive && birds[i].mesh) allObjects.push(birds[i].mesh);
// }
// allObjects = allObjects.concat(this._wallsRef);

// NEW:
var allObjects = GAME._raycastTargets || this._wallsRef;
```

The fallback `this._wallsRef` ensures safety if the cache hasn't been built yet (e.g., edge case during init). Note: `GAME._raycastTargets` is initialized to `[]` in Task 8, so this fallback only triggers before the very first frame. The `var birds` line is removed since birds are now included via `_buildFrameTargets`.

- [ ] **Step 4: Run all tests to verify nothing is broken**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```
git add js/weapons.js tests/unit/weapons.test.js
git commit -m "feat: use per-frame raycast cache in tryFire"
```

---

## Chunk 4: Final Integration & REQUIREMENTS.md

### Task 10: Run full test suite and update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 2: Manual smoke test**

Open `index.html` in browser. Play on Aztec map with 4+ bots on hard difficulty. Verify:
- Enemy tracers look the same as before (orange lines, 60ms flash)
- Muzzle flash lights appear on enemy fire
- Shell casings eject and tumble normally
- Smoke puffs appear on fire
- Shotgun hit detection works correctly
- No visual glitches during sustained firefights

- [ ] **Step 3: Update REQUIREMENTS.md**

Add a section documenting the performance optimization internals under the relevant section (likely near the weapons or enemies documentation):

```markdown
### Performance: Object Pooling

- **Enemy tracer pool**: 8 pre-allocated `THREE.Line` objects with shared material, reused round-robin. Muzzle flash light pool: 4 pre-allocated `THREE.PointLight` objects. Both reset on `clearAll()`.
- **Weapon particle ring buffer**: 64 fixed-size slots, ring-buffer insertion replaces unbounded `push()`/`splice()`. Oldest particles recycled early if buffer is full.
- **Raycast target cache**: Collidable walls cached once at map load (`GAME._collidableWalls`). Per-frame target list (`GAME._raycastTargets`) built once per frame combining walls, alive enemies, and alive birds.
```

- [ ] **Step 4: Commit**

```
git add REQUIREMENTS.md
git commit -m "docs: add performance pooling/caching internals to REQUIREMENTS.md"
```
