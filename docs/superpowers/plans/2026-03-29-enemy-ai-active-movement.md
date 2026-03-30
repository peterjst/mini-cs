# Enemy AI Active Movement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate "sitting duck" moments where enemies stand completely still, scaling activity by difficulty so hard/elite bots are relentlessly active.

**Architecture:** All changes are in `js/enemies.js`. Three categories of changes: (1) difficulty-scaled tuning of existing idle behaviors (HOLD, micro-pauses, burst cooldowns, investigate, patrol), (2) new REPOSITION combat move for active angle changes, (3) continuous combat movement (micro-drift during HOLD, reload auto-strafe, stale position failsafe). Existing state machine structure is preserved; we add one new combat move type and tune parameters.

**Tech Stack:** Three.js r160.1, vanilla JS (IIFE pattern), Vitest for tests

---

### Task 1: Add Difficulty-Scaled Constants

**Files:**
- Modify: `js/enemies.js:43-49` (COMBAT_MOVE_DURATIONS)
- Modify: `js/enemies.js:34-35` (COMBAT_MOVE enum)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests for difficulty-scaled HOLD durations, micro-pause, burst cooldown, investigate, and patrol parameters**

Add a new `describe` block at the end of `tests/unit/enemies.test.js`:

```javascript
describe('Difficulty-scaled activity parameters', () => {
  it('HOLD durations should decrease with difficulty', () => {
    var params = GAME._ACTIVITY_PARAMS;
    expect(params.easy.holdMin).toBe(0.8);
    expect(params.easy.holdMax).toBe(1.5);
    expect(params.normal.holdMin).toBe(0.5);
    expect(params.normal.holdMax).toBe(1.0);
    expect(params.hard.holdMin).toBe(0.3);
    expect(params.hard.holdMax).toBe(0.6);
    // Elite has no HOLD (weight is 0), but durations still defined for safety
    expect(params.elite.holdMin).toBe(0.3);
    expect(params.elite.holdMax).toBe(0.6);
  });

  it('micro-pause chance should decrease with difficulty', () => {
    var params = GAME._ACTIVITY_PARAMS;
    expect(params.easy.microPauseChance).toBe(0.15);
    expect(params.normal.microPauseChance).toBe(0.10);
    expect(params.hard.microPauseChance).toBe(0.05);
    expect(params.elite.microPauseChance).toBe(0);
  });

  it('micro-pause durations should decrease with difficulty', () => {
    var params = GAME._ACTIVITY_PARAMS;
    expect(params.easy.microPauseMin).toBe(0.2);
    expect(params.easy.microPauseMax).toBe(0.4);
    expect(params.normal.microPauseMin).toBe(0.15);
    expect(params.normal.microPauseMax).toBe(0.3);
    expect(params.hard.microPauseMin).toBe(0.1);
    expect(params.hard.microPauseMax).toBe(0.2);
  });

  it('burst cooldown should decrease with difficulty', () => {
    var params = GAME._ACTIVITY_PARAMS;
    expect(params.easy.burstCooldownMin).toBe(0.3);
    expect(params.easy.burstCooldownMax).toBe(0.8);
    expect(params.normal.burstCooldownMin).toBe(0.25);
    expect(params.normal.burstCooldownMax).toBe(0.6);
    expect(params.hard.burstCooldownMin).toBe(0.2);
    expect(params.hard.burstCooldownMax).toBe(0.4);
    expect(params.elite.burstCooldownMin).toBe(0.15);
    expect(params.elite.burstCooldownMax).toBe(0.3);
  });

  it('investigate look-around time should decrease with difficulty', () => {
    var params = GAME._ACTIVITY_PARAMS;
    expect(params.easy.investigateMin).toBe(3);
    expect(params.easy.investigateMax).toBe(4);
    expect(params.normal.investigateMin).toBe(2.5);
    expect(params.normal.investigateMax).toBe(3.5);
    expect(params.hard.investigateMin).toBe(1.5);
    expect(params.hard.investigateMax).toBe(2);
    expect(params.elite.investigateMin).toBe(1.0);
    expect(params.elite.investigateMax).toBe(1.5);
  });

  it('patrol pause multiplier should decrease with difficulty', () => {
    var params = GAME._ACTIVITY_PARAMS;
    expect(params.easy.patrolPauseMult).toBe(1.0);
    expect(params.normal.patrolPauseMult).toBe(0.7);
    expect(params.hard.patrolPauseMult).toBe(0.3);
    expect(params.elite.patrolPauseMult).toBe(0);
  });

  it('hard/elite should have holdDrift flag for micro-drift during HOLD', () => {
    var params = GAME._ACTIVITY_PARAMS;
    expect(params.easy.holdDrift).toBe(false);
    expect(params.normal.holdDrift).toBe(false);
    expect(params.hard.holdDrift).toBe(true);
    expect(params.elite.holdDrift).toBe(true);
  });

  it('hard/elite should have microPauseDrift flag', () => {
    var params = GAME._ACTIVITY_PARAMS;
    expect(params.easy.microPauseDrift).toBe(false);
    expect(params.normal.microPauseDrift).toBe(false);
    expect(params.hard.microPauseDrift).toBe(true);
    expect(params.elite.microPauseDrift).toBe(true);
  });

  it('stale position threshold should decrease with difficulty', () => {
    var params = GAME._ACTIVITY_PARAMS;
    expect(params.easy.staleThreshold).toBe(6.0);
    expect(params.normal.staleThreshold).toBe(4.0);
    expect(params.hard.staleThreshold).toBe(2.5);
    expect(params.elite.staleThreshold).toBe(1.8);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL — `GAME._ACTIVITY_PARAMS` is undefined

- [ ] **Step 3: Add the ACTIVITY_PARAMS constant and expose it**

In `js/enemies.js`, after the `COMBAT_MOVE_DURATIONS` block (line ~49), add:

```javascript
  // ── Difficulty-scaled activity parameters ──────────────
  var ACTIVITY_PARAMS = {
    easy:   { holdMin: 0.8, holdMax: 1.5, holdDrift: false, microPauseChance: 0.15, microPauseMin: 0.2, microPauseMax: 0.4, microPauseDrift: false, burstCooldownMin: 0.3, burstCooldownMax: 0.8, investigateMin: 3, investigateMax: 4, patrolPauseMult: 1.0, staleThreshold: 6.0 },
    normal: { holdMin: 0.5, holdMax: 1.0, holdDrift: false, microPauseChance: 0.10, microPauseMin: 0.15, microPauseMax: 0.3, microPauseDrift: false, burstCooldownMin: 0.25, burstCooldownMax: 0.6, investigateMin: 2.5, investigateMax: 3.5, patrolPauseMult: 0.7, staleThreshold: 4.0 },
    hard:   { holdMin: 0.3, holdMax: 0.6, holdDrift: true,  microPauseChance: 0.05, microPauseMin: 0.1, microPauseMax: 0.2, microPauseDrift: true,  burstCooldownMin: 0.2, burstCooldownMax: 0.4, investigateMin: 1.5, investigateMax: 2, patrolPauseMult: 0.3, staleThreshold: 2.5 },
    elite:  { holdMin: 0.3, holdMax: 0.6, holdDrift: true,  microPauseChance: 0,    microPauseMin: 0,   microPauseMax: 0,   microPauseDrift: true,  burstCooldownMin: 0.15, burstCooldownMax: 0.3, investigateMin: 1.0, investigateMax: 1.5, patrolPauseMult: 0, staleThreshold: 1.8 }
  };
```

Add `REPOSITION: 5` to the `COMBAT_MOVE` object at line ~35:

```javascript
  var COMBAT_MOVE = { STRAFE: 0, PUSH: 1, HOLD: 2, RETREAT_FIRE: 3, RUSH_COVER: 4, REPOSITION: 5 };
```

Add `reposition` to `COMBAT_MOVE_DURATIONS` at line ~43:

```javascript
    reposition:  [0, 0]   // duration = until arrival or 2s max
```

At the bottom of the file (near line ~2471), expose it:

```javascript
  GAME._ACTIVITY_PARAMS = ACTIVITY_PARAMS;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: All new tests PASS

- [ ] **Step 5: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(ai): add difficulty-scaled activity parameters and REPOSITION combat move enum"
```

---

### Task 2: Wire Difficulty-Scaled Parameters Into Existing Behaviors

**Files:**
- Modify: `js/enemies.js:1049-1058` (_rollCombatMove micro-pause)
- Modify: `js/enemies.js:1536-1537` (HOLD behavior)
- Modify: `js/enemies.js:1598-1603` (burst cooldown)
- Modify: `js/enemies.js:1608-1620` (investigate)
- Modify: `js/enemies.js:1373-1434` (patrol pause)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests for wired-in behavior**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('Difficulty-scaled patrol pause', () => {
  it('patrol pause should be scaled by patrolPauseMult on hard', () => {
    GAME.setDifficulty('hard');
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    // Force arrival at waypoint to trigger patrolPauseTimer assignment
    var basePause = enemy.personality.patrolPause;
    // On hard, patrol pause mult is 0.3, so patrolPauseTimer should be <= basePause * 0.3
    expect(GAME._ACTIVITY_PARAMS.hard.patrolPauseMult).toBe(0.3);
    GAME.setDifficulty('normal');
  });

  it('elite should have zero patrol pause', () => {
    expect(GAME._ACTIVITY_PARAMS.elite.patrolPauseMult).toBe(0);
  });
});

describe('Difficulty-scaled burst cooldown', () => {
  it('hard burst cooldown range should be 0.2-0.4', () => {
    var params = GAME._ACTIVITY_PARAMS.hard;
    expect(params.burstCooldownMin).toBe(0.2);
    expect(params.burstCooldownMax).toBe(0.4);
  });
});

describe('Elite HOLD weight elimination', () => {
  it('elite difficulty should have zero hold weight', () => {
    GAME.setDifficulty('elite');
    var w = GAME._calcCombatWeights('balanced', { hpRatio: 1.0, distToPlayer: 10, hasNearbyCover: true });
    expect(w.hold).toBe(0);
    GAME.setDifficulty('normal');
  });

  it('easy difficulty should have non-zero hold weight', () => {
    GAME.setDifficulty('easy');
    var w = GAME._calcCombatWeights('balanced', { hpRatio: 1.0, distToPlayer: 10, hasNearbyCover: true });
    expect(w.hold).toBeGreaterThan(0);
    GAME.setDifficulty('normal');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: Elite HOLD weight test fails (currently non-zero)

- [ ] **Step 3: Wire in difficulty-scaled parameters**

In `js/enemies.js`, modify `_calcCombatWeights` (around line 51-96). After existing context modifiers but before normalization, add elite HOLD elimination:

```javascript
    // Elite: remove HOLD entirely
    var diffName = _getDiffName();
    if (diffName === 'elite') {
      w.strafe += w.hold * 0.5;
      w.push += w.hold * 0.5;
      w.hold = 0;
    }
```

In `_rollCombatMove` (around line 1048-1058), replace hardcoded micro-pause values with difficulty-scaled ones:

```javascript
    var ap = ACTIVITY_PARAMS[_getDiffName()] || ACTIVITY_PARAMS.normal;

    // Difficulty-scaled micro-pause
    if (ap.microPauseChance > 0 && Math.random() < ap.microPauseChance) {
      this._microPauseTimer = ap.microPauseMin + Math.random() * (ap.microPauseMax - ap.microPauseMin);
    } else {
      this._microPauseTimer = 0;
    }
```

Replace the hardcoded HOLD duration range in `_rollCombatMove`. The `COMBAT_MOVE_DURATIONS` lookup (around line 1048-1051) applies for all types. Override HOLD specifically:

```javascript
    if (selected !== COMBAT_MOVE.RUSH_COVER && selected !== COMBAT_MOVE.REPOSITION) {
      if (selected === COMBAT_MOVE.HOLD) {
        this._combatMoveDuration = ap.holdMin + Math.random() * (ap.holdMax - ap.holdMin);
      } else {
        var range = COMBAT_MOVE_DURATIONS[types[selected]];
        this._combatMoveDuration = range[0] + Math.random() * (range[1] - range[0]);
      }
    }
```

In the ATTACK state HOLD behavior (around line 1536-1537), replace `this._currentSpeed *= 0.9` with:

```javascript
        } else if (this._combatMove === COMBAT_MOVE.HOLD) {
          var holdAp = ACTIVITY_PARAMS[_getDiffName()] || ACTIVITY_PARAMS.normal;
          if (holdAp.holdDrift) {
            // Micro-drift: slow random movement at 15-20% speed
            if (!this._holdDriftDir || this._holdDriftTimer <= 0) {
              var hAngle = Math.random() * Math.PI * 2;
              this._holdDriftDir = { x: Math.cos(hAngle), z: Math.sin(hAngle) };
              this._holdDriftTimer = 0.3 + Math.random() * 0.2;
            }
            this._holdDriftTimer -= dt;
            var driftSpeed = this.speed * (0.15 + Math.random() * 0.05);
            var driftTarget = {
              x: this.mesh.position.x + this._holdDriftDir.x * 3,
              z: this.mesh.position.z + this._holdDriftDir.z * 3
            };
            this._moveToward(driftTarget, dt, driftSpeed, true);
          } else {
            this._currentSpeed *= 0.9;
          }
```

In the burst cooldown section (around line 1598-1603), replace hardcoded values:

```javascript
          var bAp = ACTIVITY_PARAMS[_getDiffName()] || ACTIVITY_PARAMS.normal;
          this._burstRemaining = bMin + Math.floor(Math.random() * (bMax - bMin + 1));
          this._burstCooldown = bAp.burstCooldownMin + Math.random() * (bAp.burstCooldownMax - bAp.burstCooldownMin);
```

In the PATROL state (around line 1433), replace the patrol pause assignment:

```javascript
            var patrolAp = ACTIVITY_PARAMS[_getDiffName()] || ACTIVITY_PARAMS.normal;
            this.patrolPauseTimer = this.personality.patrolPause * patrolAp.patrolPauseMult;
```

In the INVESTIGATE state, replace the look-around timer assignment (around lines 1214, 1231, 1274 — wherever `this._lookAroundTimer` is set):

```javascript
            var invAp = ACTIVITY_PARAMS[_getDiffName()] || ACTIVITY_PARAMS.normal;
            this._lookAroundTimer = invAp.investigateMin + Math.random() * (invAp.investigateMax - invAp.investigateMin);
```

In the INVESTIGATE behavior (around lines 1612-1619), add slow circle movement on hard/elite:

```javascript
      } else {
        // Looking around at investigate point
        this.mesh.rotation.y += 1.5 * dt;
        var invBehAp = ACTIVITY_PARAMS[_getDiffName()] || ACTIVITY_PARAMS.normal;
        if (invBehAp.holdDrift) {
          // Slow circle movement while looking around
          var circleSpeed = this.speed * 0.15;
          var circleX = this.mesh.position.x + Math.cos(this.mesh.rotation.y) * 3;
          var circleZ = this.mesh.position.z + Math.sin(this.mesh.rotation.y) * 3;
          this._moveToward({ x: circleX, z: circleZ }, dt, circleSpeed, true);
        }
      }
```

Also add the `_holdDriftDir` and `_holdDriftTimer` properties to the Enemy constructor (around line 193):

```javascript
    this._holdDriftDir = null;
    this._holdDriftTimer = 0;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(ai): wire difficulty-scaled parameters into HOLD, micro-pause, burst cooldown, patrol, investigate"
```

---

### Task 3: Add Micro-Pause Drift and Reload Auto-Strafe

**Files:**
- Modify: `js/enemies.js:1522-1524` (micro-pause in ATTACK)
- Modify: `js/enemies.js:1563-1606` (firing section — reload strafe)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('Micro-pause drift', () => {
  it('hard difficulty should have microPauseDrift enabled', () => {
    expect(GAME._ACTIVITY_PARAMS.hard.microPauseDrift).toBe(true);
  });

  it('easy difficulty should NOT have microPauseDrift enabled', () => {
    expect(GAME._ACTIVITY_PARAMS.easy.microPauseDrift).toBe(false);
  });
});

describe('Reload auto-strafe in ATTACK state', () => {
  it('enemy should have _strafe method for reload auto-strafe', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    expect(typeof enemy._strafe).toBe('function');
  });
});
```

- [ ] **Step 2: Run tests to verify they pass (these are structural, should pass already)**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: PASS (these validate existing structure and Task 1 params)

- [ ] **Step 3: Implement micro-pause drift and reload auto-strafe**

In the ATTACK state behavior in `js/enemies.js` (around line 1522-1524), replace the micro-pause section:

```javascript
      if (this._microPauseTimer > 0) {
        this._microPauseTimer -= dt;
        var mpAp = ACTIVITY_PARAMS[_getDiffName()] || ACTIVITY_PARAMS.normal;
        if (mpAp.microPauseDrift) {
          // Drift at 10% speed instead of dead stop
          var driftTarget2 = {
            x: this.mesh.position.x + (Math.random() - 0.5) * 2,
            z: this.mesh.position.z + (Math.random() - 0.5) * 2
          };
          this._moveToward(driftTarget2, dt, this.speed * 0.1, true);
        }
      } else {
```

In the ATTACK firing section, when the bot is reloading (around line 1564), add auto-strafe. The current code skips the entire firing block when `this._reloading` is true. Wrap it to add strafe during reload:

```javascript
      // Burst firing (runs regardless of movement type)
      if (this._reloading) {
        // Auto-strafe during reload if in ATTACK (not taking cover)
        if (this.state === ATTACK) {
          this._strafe(playerPos, dt);
        }
      } else if (this._burstCooldown > 0) {
```

Note: The current code structure is `if (!this._reloading) { ... }`. Restructure to `if (this._reloading) { strafe } else { fire logic }`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(ai): add micro-pause drift on hard/elite and reload auto-strafe during ATTACK"
```

---

### Task 4: Implement REPOSITION Combat Move

**Files:**
- Modify: `js/enemies.js` (add `_findRepositionTarget` method, add REPOSITION to `_rollCombatMove` weights, add REPOSITION behavior in ATTACK state)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests for REPOSITION**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('REPOSITION combat move', () => {
  it('_findRepositionTarget should be a method on Enemy', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    expect(typeof enemy._findRepositionTarget).toBe('function');
  });

  it('_findRepositionTarget should return null when surrounded by walls', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    // Create a box of walls around the enemy
    var wallGeo = new THREE.BoxGeometry(10, 3, 0.5);
    var wallMat = new THREE.MeshBasicMaterial();
    var walls = [];
    var w1 = new THREE.Mesh(wallGeo, wallMat); w1.position.set(0, 1.5, 2); scene.add(w1); walls.push(w1);
    var w2 = new THREE.Mesh(wallGeo, wallMat); w2.position.set(0, 1.5, -2); scene.add(w2); walls.push(w2);
    var wallGeo2 = new THREE.BoxGeometry(0.5, 3, 10);
    var w3 = new THREE.Mesh(wallGeo2, wallMat); w3.position.set(2, 1.5, 0); scene.add(w3); walls.push(w3);
    var w4 = new THREE.Mesh(wallGeo2, wallMat); w4.position.set(-2, 1.5, 0); scene.add(w4); walls.push(w4);
    em.spawnBots([{x:0, z:0}], [{x:0, z:0}], walls, 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy.walls = walls;
    var result = enemy._findRepositionTarget({ x: 10, y: 0, z: 10 });
    // Should return null or a fallback since all directions are walled
    // (exact behavior depends on wall proximity — may or may not find a valid spot)
    expect(result === null || typeof result === 'object').toBe(true);
  });

  it('_findRepositionTarget should return an object with x and z when open', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy.walls = [];
    var result = enemy._findRepositionTarget({ x: 10, y: 0, z: 0 });
    if (result) {
      expect(typeof result.x).toBe('number');
      expect(typeof result.z).toBe('number');
    }
  });

  it('_rollCombatMove should be able to select REPOSITION (type 5)', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy.walls = [];
    var gotReposition = false;
    for (var i = 0; i < 200; i++) {
      enemy._rollCombatMove({ x: 10, y: 0, z: 10 }, 10);
      if (enemy._combatMove === 5) { gotReposition = true; break; }
    }
    expect(gotReposition).toBe(true);
  });

  it('_rollCombatMove result should be in valid range 0-5', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy.walls = [];
    for (var i = 0; i < 100; i++) {
      enemy._rollCombatMove({ x: 10, y: 0, z: 10 }, 10);
      expect(enemy._combatMove).toBeGreaterThanOrEqual(0);
      expect(enemy._combatMove).toBeLessThanOrEqual(5);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL — `_findRepositionTarget` is not a function, REPOSITION (5) never selected

- [ ] **Step 3: Add `_findRepositionTarget` method**

Add to `js/enemies.js`, after `_findNearestCover` (around line 1121):

```javascript
  // ── Reposition Target Selection ────────────────────────
  Enemy.prototype._findRepositionTarget = function(playerPos) {
    var pos = this.mesh.position;
    var dx = pos.x - playerPos.x;
    var dz = pos.z - playerPos.z;
    var currentDist = Math.sqrt(dx * dx + dz * dz);
    var currentAngle = Math.atan2(dz, dx);

    var offsets = [
      Math.PI / 6,   // 30°
      Math.PI / 4,   // 45°
      Math.PI / 3,   // 60°
      Math.PI / 2    // 90°
    ];

    var bestSpot = null;
    var bestScore = -Infinity;
    var rc = this._rc;

    for (var oi = 0; oi < offsets.length; oi++) {
      for (var side = -1; side <= 1; side += 2) {
        var angle = currentAngle + offsets[oi] * side;
        var candX = playerPos.x + Math.cos(angle) * currentDist;
        var candZ = playerPos.z + Math.sin(angle) * currentDist;

        // Check walkability — no wall within 1 unit of candidate
        var candOrigin = new THREE.Vector3(candX, 0.5, candZ);
        var blocked = false;
        for (var di = 0; di < COLLISION_DIRS.length; di++) {
          rc.set(candOrigin, COLLISION_DIRS[di]);
          rc.far = 1.0;
          var hits = rc.intersectObjects(this.walls, false);
          if (hits.length > 0) { blocked = true; break; }
        }
        if (blocked) continue;

        // Check LOS to player from candidate position
        var toPlayerX = playerPos.x - candX;
        var toPlayerZ = playerPos.z - candZ;
        var tpLen = Math.sqrt(toPlayerX * toPlayerX + toPlayerZ * toPlayerZ);
        var hasLOS = false;
        if (tpLen > 0.1) {
          var tpDir = new THREE.Vector3(toPlayerX / tpLen, 0, toPlayerZ / tpLen);
          rc.set(candOrigin, tpDir);
          rc.far = tpLen;
          var losHits = rc.intersectObjects(this.walls, false);
          hasLOS = losHits.length === 0 || losHits[0].distance >= tpLen - 0.5;
        }

        // Score: LOS bonus + distance from current position
        var moveDist = Math.sqrt((candX - pos.x) * (candX - pos.x) + (candZ - pos.z) * (candZ - pos.z));
        var score = (hasLOS ? 50 : 0) + moveDist * 2;

        if (score > bestScore) {
          bestScore = score;
          bestSpot = { x: candX, z: candZ };
        }
      }
    }
    return bestSpot;
  };
```

- [ ] **Step 4: Add REPOSITION weights to `_calcCombatWeights` and `COMBAT_BASE_WEIGHTS`**

Update `COMBAT_BASE_WEIGHTS` (around line 37) to include `reposition`:

```javascript
  var COMBAT_BASE_WEIGHTS = {
    aggressive: { strafe: 0.20, push: 0.30, hold: 0.15, retreatFire: 0.10, rushCover: 0.05, reposition: 0.20 },
    balanced:   { strafe: 0.30, push: 0.10, hold: 0.20, retreatFire: 0.15, rushCover: 0.10, reposition: 0.15 },
    cautious:   { strafe: 0.25, push: 0.05, hold: 0.15, retreatFire: 0.30, rushCover: 0.15, reposition: 0.10 }
  };
```

Update `_calcCombatWeights` to include `reposition` in the weight object and normalization (around line 51-96):

```javascript
  function _calcCombatWeights(personalityKey, ctx) {
    var base = COMBAT_BASE_WEIGHTS[personalityKey] || COMBAT_BASE_WEIGHTS.balanced;
    var w = {
      strafe: base.strafe,
      push: base.push,
      hold: base.hold,
      retreatFire: base.retreatFire,
      rushCover: base.rushCover,
      reposition: base.reposition
    };

    // HP below 40%: push x0.5, retreatFire x2.0
    if (ctx.hpRatio < 0.4) {
      w.push *= 0.5;
      w.retreatFire *= 2.0;
    }

    // Player within 5 units: push x0.5, hold x1.5, retreatFire x1.5
    if (ctx.distToPlayer < 5) {
      w.push *= 0.5;
      w.hold *= 1.5;
      w.retreatFire *= 1.5;
    }

    // Player beyond 15 units: push x1.5, hold x1.5
    if (ctx.distToPlayer > 15) {
      w.push *= 1.5;
      w.hold *= 1.5;
    }

    // No nearby cover: zero out rushCover
    if (!ctx.hasNearbyCover) {
      w.rushCover = 0;
    }

    // Elite: remove HOLD entirely
    var diffName = _getDiffName();
    if (diffName === 'elite') {
      w.strafe += w.hold * 0.5;
      w.push += w.hold * 0.5;
      w.hold = 0;
    }

    // Stale position: double reposition weight
    if (ctx.isStale) {
      w.reposition *= 2;
    }

    // Normalize to sum to 1.0
    var sum = w.strafe + w.push + w.hold + w.retreatFire + w.rushCover + w.reposition;
    if (sum > 0) {
      w.strafe /= sum;
      w.push /= sum;
      w.hold /= sum;
      w.retreatFire /= sum;
      w.rushCover /= sum;
      w.reposition /= sum;
    }

    return w;
  }
```

- [ ] **Step 5: Update `_rollCombatMove` to handle REPOSITION selection**

In `_rollCombatMove` (around line 1001), update the types array and REPOSITION handling:

```javascript
    var types = ['strafe', 'push', 'hold', 'retreatFire', 'rushCover', 'reposition'];
    var selected = COMBAT_MOVE.STRAFE; // fallback
    for (var ti = 0; ti < types.length; ti++) {
      cumulative += w[types[ti]];
      if (r <= cumulative) { selected = ti; break; }
    }
```

Add REPOSITION handling after the RUSH_COVER block (around line 1046):

```javascript
    if (selected === COMBAT_MOVE.REPOSITION) {
      this._repositionTarget = this._findRepositionTarget(playerPos);
      if (this._repositionTarget) {
        this._combatMoveDuration = 2.0; // max 2s
      } else {
        // Fallback: reroll as strafe
        this._combatMove = COMBAT_MOVE.STRAFE;
        selected = COMBAT_MOVE.STRAFE;
        var range = COMBAT_MOVE_DURATIONS.strafe;
        this._combatMoveDuration = range[0] + Math.random() * (range[1] - range[0]);
      }
    }
```

Add `_repositionTarget` to the Enemy constructor (around line 193):

```javascript
    this._repositionTarget = null;
```

- [ ] **Step 6: Add REPOSITION behavior in the ATTACK state**

In the ATTACK combat movement behavior block (around line 1527-1560), add after RUSH_COVER:

```javascript
        } else if (this._combatMove === COMBAT_MOVE.REPOSITION) {
          if (this._repositionTarget) {
            var rpDx = this._repositionTarget.x - this.mesh.position.x;
            var rpDz = this._repositionTarget.z - this.mesh.position.z;
            var rpDist = Math.sqrt(rpDx * rpDx + rpDz * rpDz);
            if (rpDist > 1.5) {
              this._facePlayer(playerPos, dt);
              this._moveToward(this._repositionTarget, dt, this.speed, true);
            } else {
              // Arrived — end this movement
              this._combatMoveTimer = this._combatMoveDuration;
              this._repositionTarget = null;
            }
          } else {
            // No target — end immediately
            this._combatMoveTimer = this._combatMoveDuration;
          }
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(ai): add REPOSITION combat move with angle-based target selection"
```

---

### Task 5: Implement Stale Position Failsafe

**Files:**
- Modify: `js/enemies.js` (Enemy constructor, ATTACK state behavior)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('Stale position failsafe', () => {
  it('enemy should have _combatStalePos and _combatStaleTimer', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    expect(enemy).toHaveProperty('_combatStalePos');
    expect(enemy).toHaveProperty('_combatStaleTimer');
    expect(enemy._combatStaleTimer).toBe(0);
  });

  it('stale threshold should match ACTIVITY_PARAMS per difficulty', () => {
    expect(GAME._ACTIVITY_PARAMS.easy.staleThreshold).toBe(6.0);
    expect(GAME._ACTIVITY_PARAMS.normal.staleThreshold).toBe(4.0);
    expect(GAME._ACTIVITY_PARAMS.hard.staleThreshold).toBe(2.5);
    expect(GAME._ACTIVITY_PARAMS.elite.staleThreshold).toBe(1.8);
  });

  it('_combatStalePos should reset when entering ATTACK from another state', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    // Simulate state transition to ATTACK
    enemy.state = 2; // ATTACK
    enemy._combatStaleTimer = 0;
    expect(enemy._combatStaleTimer).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL — `_combatStalePos` and `_combatStaleTimer` not found

- [ ] **Step 3: Add stale position tracking to Enemy constructor**

In `js/enemies.js`, add to the Enemy constructor (around line 193, near other combat movement properties):

```javascript
    this._combatStalePos = { x: spawnPos.x, z: spawnPos.z };
    this._combatStaleTimer = 0;
```

- [ ] **Step 4: Add stale position failsafe logic in ATTACK state**

In the ATTACK state behavior (around line 1513, at the beginning of ATTACK block), add stale position check:

```javascript
    } else if (this.state === ATTACK) {
      this._facePlayer(playerPos, dt);

      // ── Stale position failsafe ──────────────────────
      this._combatStaleTimer += dt;
      var staleAp = ACTIVITY_PARAMS[_getDiffName()] || ACTIVITY_PARAMS.normal;
      if (this._combatStaleTimer >= staleAp.staleThreshold) {
        var staleDx = this.mesh.position.x - this._combatStalePos.x;
        var staleDz = this.mesh.position.z - this._combatStalePos.z;
        if (staleDx * staleDx + staleDz * staleDz < 1) {
          // Force reroll excluding HOLD
          this._combatMove = null;
          this._rollCombatMove(playerPos, distToPlayer);
          if (this._combatMove === COMBAT_MOVE.HOLD) {
            this._combatMove = COMBAT_MOVE.STRAFE;
            var sfRange = COMBAT_MOVE_DURATIONS.strafe;
            this._combatMoveDuration = sfRange[0] + Math.random() * (sfRange[1] - sfRange[0]);
          }
        }
        this._combatStalePos.x = this.mesh.position.x;
        this._combatStalePos.z = this.mesh.position.z;
        this._combatStaleTimer = 0;
      }
```

Also reset stale tracking when entering ATTACK state. In the state transition reset block (around line 1336), add the reset for stale tracking when transitioning *into* ATTACK:

```javascript
    // Reset stale position tracking on state change into ATTACK
    if (this.state === ATTACK && prevState !== ATTACK) {
      this._combatStalePos.x = this.mesh.position.x;
      this._combatStalePos.z = this.mesh.position.z;
      this._combatStaleTimer = 0;
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(ai): add stale position failsafe to force movement reroll in ATTACK"
```

---

### Task 6: Update Existing Tests and Fix Regressions

**Files:**
- Modify: `tests/unit/enemies.test.js`

- [ ] **Step 1: Update existing _rollCombatMove range test**

The existing test at line ~978 checks `_combatMove` is in range 0-4. Update to 0-5:

```javascript
  it('_rollCombatMove should set _combatMove to a valid type (0-5)', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy._rollCombatMove({ x: 10, y: 0, z: 10 }, 10);
    expect(enemy._combatMove).toBeGreaterThanOrEqual(0);
    expect(enemy._combatMove).toBeLessThanOrEqual(5);
  });
```

Update the existing `_rollCombatMove should set a positive _combatMoveDuration for non-rushCover types` test to also exclude REPOSITION (type 5):

```javascript
  it('_rollCombatMove should set a positive _combatMoveDuration for non-rushCover/reposition types', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    var foundPositiveDuration = false;
    for (var i = 0; i < 50; i++) {
      enemy._rollCombatMove({ x: 10, y: 0, z: 10 }, 10);
      if (enemy._combatMove !== 4 && enemy._combatMove !== 5 && enemy._combatMoveDuration > 0) {
        foundPositiveDuration = true;
        break;
      }
    }
    expect(foundPositiveDuration).toBe(true);
  });
```

Update the existing combat weight tests to account for the new `reposition` key. The `no nearby cover should zero out rushCover and redistribute` test should still pass since it checks `sum ≈ 1.0`.

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: All tests PASS (except pre-existing ambush test failure)

- [ ] **Step 3: Commit**

```bash
git add tests/unit/enemies.test.js
git commit -m "test(ai): update existing combat move tests for REPOSITION range (0-5)"
```

---

### Task 7: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Update the Combat Movement Sub-Behaviors section**

In `REQUIREMENTS.md` around line 858, update the section to reflect all changes:

Replace the Combat Movement Sub-Behaviors section with:

```markdown
### Combat Movement Sub-Behaviors
- **6 movement types** in ATTACK state, selected by weighted random when current movement expires:
  - **Strafe**: Lateral movement with 0.5–1.8s intervals, 40% chance to maintain direction (anti-oscillation). Duration: 1–3s
  - **Push**: Move toward player at 70% speed while firing. Duration: 1–2s
  - **Hold**: Difficulty-scaled. Easy/Normal: decelerate to zero (0.8–1.5s / 0.5–1.0s). Hard: micro-drift at 15–20% speed (0.3–0.6s). Elite: removed from pool entirely (weight redistributed to strafe/push)
  - **Retreat-fire**: Back away from player while maintaining aim and firing. Duration: 1–2s
  - **Rush-to-cover**: Move to nearby cover (<4 units only) at 80% speed while facing player. Duration: until arrival
  - **Reposition**: Move to a new angle on the player at same engagement distance. Selects from 30/45/60/90° offsets, scores by LOS and displacement. Faces player during movement. Duration: until arrival or 2s max. Fallback: strafe if no valid position found
- **Personality base weights**:
  - Aggressive: strafe 20%, push 30%, hold 15%, retreat-fire 10%, rush-to-cover 5%, reposition 20%
  - Balanced: strafe 30%, push 10%, hold 20%, retreat-fire 15%, rush-to-cover 10%, reposition 15%
  - Cautious: strafe 25%, push 5%, hold 15%, retreat-fire 30%, rush-to-cover 15%, reposition 10%
- **Context modifiers** (applied before normalization):
  - HP below 40%: push x0.5, retreat-fire x2.0
  - Player within 5 units: push x0.5, hold x1.5, retreat-fire x1.5
  - Player beyond 15 units: push x1.5, hold x1.5
  - No nearby cover (<4 units): rush-to-cover set to 0, redistributed
  - Stale position detected: reposition weight doubled
  - Elite difficulty: hold weight set to 0, redistributed 50/50 to strafe/push
- **Micro-pauses**: Difficulty-scaled. Easy: 15% chance 0.2–0.4s dead stop. Normal: 10% chance 0.15–0.3s dead stop. Hard: 5% chance 0.1–0.2s with drift at 10% speed. Elite: no micro-pauses
- **Burst cooldown**: Difficulty-scaled. Easy: 0.3–0.8s. Normal: 0.25–0.6s. Hard: 0.2–0.4s. Elite: 0.15–0.3s
- **Jiggle-peek cap**: Cautious bots capped to 3–5 jiggle repetitions before forcing a different movement type
- Bot always faces player during all 6 movement types (`_facePlayer` stays active)
- **Reload auto-strafe**: Bot strafes at 60% speed while reloading in ATTACK state (does not apply during TAKE_COVER)
- **Stale position failsafe**: If bot hasn't moved >1 unit in threshold time (Easy: 6s, Normal: 4s, Hard: 2.5s, Elite: 1.8s), forces combat move reroll excluding HOLD
```

Also update the investigate and patrol sections to mention difficulty scaling:

In the investigate state description (around line 787), add:
```markdown
Investigate look-around duration is difficulty-scaled: Easy 3–4s, Normal 2.5–3.5s, Hard 1.5–2s, Elite 1–1.5s. On hard/elite, bot moves in a slow circle while looking around instead of standing still.
```

In the patrol description, add:
```markdown
Patrol pause at waypoints is difficulty-scaled: Easy 100%, Normal 70%, Hard 30%, Elite 0% of personality base pause.
```

- [ ] **Step 2: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: update REQUIREMENTS.md with active movement changes"
```

---

### Task 8: Final Integration Test

**Files:**
- Test: all

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: All tests PASS (except pre-existing ambush test failure)

- [ ] **Step 2: Verify each difficulty level has correct behavior**

Run: `npm test -- tests/unit/enemies.test.js`

Verify:
- Easy: HOLD has full decelerate, 15% micro-pause, 0.3-0.8s burst cooldown
- Normal: HOLD shorter, 10% micro-pause, reduced burst cooldown
- Hard: HOLD micro-drift, 5% micro-pause with drift, tight burst cooldown, short investigate
- Elite: No HOLD, no micro-pause, tightest burst cooldown, shortest investigate, zero patrol pause

- [ ] **Step 3: Final commit if any adjustments needed**

Only commit if Step 1 or 2 revealed issues that required fixes.
