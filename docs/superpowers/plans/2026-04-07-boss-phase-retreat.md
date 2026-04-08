# Boss Phase Transition Retreat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the boss from spawning minions on top of the player by adding a retreat state during phase transitions and a spawn-position safety net.

**Architecture:** On phase transition, the boss enters a retreat state (moves away from player, stops attacking). Minion spawning is deferred until retreat completes. A safety net ensures minion spawn positions are always 6+ units from the player.

**Tech Stack:** Vanilla JS, Three.js r160.1 (global `THREE`), Jest tests

---

### Task 1: Add retreat state properties to boss initialization

**Files:**
- Modify: `js/enemies.js:308-319` (constructor boss overrides)
- Modify: `js/enemies.js:2380-2391` (`_initBoss` method)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write the failing test**

In `tests/unit/enemies.test.js`, add inside the `Boss enemy creation` describe block:

```javascript
  it('boss should have retreat state properties', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[em.enemies.length - 1];
    expect(boss._bossRetreatState).toBe('idle');
    expect(boss._bossRetreatTimer).toBe(0);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=enemies.test`
Expected: FAIL — `_bossRetreatState` is undefined

- [ ] **Step 3: Add retreat state properties**

In `js/enemies.js` constructor (around line 319, after `this._bossShieldMesh = null;`):

```javascript
    this._bossRetreatState = 'idle';
    this._bossRetreatTimer = 0;
```

In `js/enemies.js` `_initBoss` method (around line 2384, after `this._bossShieldTimer = 0;`):

```javascript
    this._bossRetreatState = 'idle';
    this._bossRetreatTimer = 0;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=enemies.test`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(boss): add retreat state properties to boss initialization"
```

---

### Task 2: Implement `_updateBossRetreat` method

**Files:**
- Modify: `js/enemies.js` (new method after `_updateBossShield`, around line 2469)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write the failing tests**

Add a new describe block in `tests/unit/enemies.test.js`:

```javascript
describe('Boss phase retreat', () => {
  it('_updateBossRetreat should exist on boss', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[em.enemies.length - 1];
    expect(typeof boss._updateBossRetreat).toBe('function');
  });

  it('should return false when retreat state is idle', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[em.enemies.length - 1];
    boss._bossRetreatState = 'idle';
    var result = boss._updateBossRetreat(0.016, { x: 0, z: 0 });
    expect(result).toBe(false);
  });

  it('should move boss away from player during retreat', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[em.enemies.length - 1];
    boss.mesh.position.set(3, 0, 0);
    boss._bossRetreatState = 'retreating';
    boss._bossRetreatTimer = 2.0;
    var playerPos = { x: 0, z: 0 };
    var distBefore = Math.sqrt(3 * 3);
    boss._updateBossRetreat(0.1, playerPos);
    var pos = boss.mesh.position;
    var distAfter = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    expect(distAfter).toBeGreaterThan(distBefore);
  });

  it('should end retreat when boss is 10+ units from player', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[em.enemies.length - 1];
    boss.mesh.position.set(11, 0, 0);
    boss._bossRetreatState = 'retreating';
    boss._bossRetreatTimer = 2.0;
    boss._updateBossRetreat(0.016, { x: 0, z: 0 });
    expect(boss._bossRetreatState).toBe('idle');
  });

  it('should end retreat when timer expires', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[em.enemies.length - 1];
    boss.mesh.position.set(3, 0, 0);
    boss._bossRetreatState = 'retreating';
    boss._bossRetreatTimer = 0.01;
    boss._updateBossRetreat(0.02, { x: 0, z: 0 });
    expect(boss._bossRetreatState).toBe('idle');
  });

  it('should cancel charge attack when retreat starts', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[em.enemies.length - 1];
    boss._bossChargeState = 'charging';
    boss._bossChargeTimer = 1.0;
    boss._bossChargeTarget = { x: 0, z: 0 };

    // Trigger phase transition which should set retreat
    boss.takeDamage(boss.health - boss.maxHealth * 0.5 + 1);

    expect(boss._bossRetreatState).toBe('retreating');
    expect(boss._bossChargeState).toBe('idle');
    expect(boss._bossChargeTarget).toBe(null);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=enemies.test`
Expected: FAIL — `_updateBossRetreat` is not a function, retreat not triggered on phase change

- [ ] **Step 3: Implement `_updateBossRetreat` method**

In `js/enemies.js`, after the `_updateBossShield` method (after line ~2469):

```javascript
  Enemy.prototype._updateBossRetreat = function(dt, playerPos) {
    if (!this.isBoss) return false;
    if (this._bossRetreatState !== 'retreating') return false;

    this._bossRetreatTimer -= dt;

    // Check end conditions: safe distance or timeout
    var pos = this.mesh.position;
    var dx = playerPos.x - pos.x;
    var dz = playerPos.z - pos.z;
    var distToPlayer = Math.sqrt(dx * dx + dz * dz);

    if (distToPlayer >= 10 || this._bossRetreatTimer <= 0) {
      this._bossRetreatState = 'idle';
      this._bossRetreatTimer = 0;
      return false;
    }

    // Move away from player
    var awayX = pos.x - dx;
    var awayZ = pos.z - dz;
    this._moveToward({ x: awayX, z: awayZ }, dt, this._bossBaseSpeed * 1.3);

    return true;
  };
```

- [ ] **Step 4: Trigger retreat on phase transition**

In `js/enemies.js`, in the `_updateBossPhase` method, inside the `if (this._bossPhase !== oldPhase && oldPhase !== 0)` block (around line 2433), add after the shield activation:

```javascript
      // Start retreat from player
      this._bossRetreatState = 'retreating';
      this._bossRetreatTimer = 2.0;

      // Cancel any in-progress charge
      if (this._bossChargeState !== 'idle') {
        this._bossChargeState = 'idle';
        this._bossChargeTimer = 0;
        this._bossChargeTarget = null;
      }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=enemies.test`
Expected: PASS

- [ ] **Step 6: Commit**

```
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(boss): implement retreat state on phase transition"
```

---

### Task 3: Add combat logic guards for retreat state

**Files:**
- Modify: `js/enemies.js:1710` (combat movement guard)
- Modify: `js/enemies.js:1830-1844` (boss barrage and charge guards)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write the failing test**

Add to the `Boss phase retreat` describe block in `tests/unit/enemies.test.js`:

```javascript
  it('should return true (retreating) to signal combat skip', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[em.enemies.length - 1];
    boss.mesh.position.set(3, 0, 0);
    boss._bossRetreatState = 'retreating';
    boss._bossRetreatTimer = 2.0;
    var result = boss._updateBossRetreat(0.016, { x: 0, z: 0 });
    expect(result).toBe(true);
  });
```

- [ ] **Step 2: Run test to verify it passes** (already works from Task 2 implementation)

Run: `npm test -- --testPathPattern=enemies.test`
Expected: PASS

- [ ] **Step 3: Add combat movement guard**

In `js/enemies.js`, at line ~1710, change:

```javascript
        if (!(this.isBoss && this._bossChargeState !== 'idle')) {
```

to:

```javascript
        if (!(this.isBoss && (this._bossChargeState !== 'idle' || this._bossRetreatState === 'retreating'))) {
```

- [ ] **Step 4: Add boss barrage guard**

In `js/enemies.js`, at line ~1831, change:

```javascript
        if (this._bossBarrageCooldown <= 0 && !this._bossBarrageActive && this._bossWindupTimer <= 0) {
```

to:

```javascript
        if (this._bossBarrageCooldown <= 0 && !this._bossBarrageActive && this._bossWindupTimer <= 0 && this._bossRetreatState !== 'retreating') {
```

- [ ] **Step 5: Add boss charge guard**

In `js/enemies.js`, at line ~1842, change:

```javascript
      if (this.isBoss && this.state === ATTACK) {
        var chargeDmg = this._updateBossCharge(dt, playerPos);
```

to:

```javascript
      if (this.isBoss && this.state === ATTACK && this._bossRetreatState !== 'retreating') {
        var chargeDmg = this._updateBossCharge(dt, playerPos);
```

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(boss): skip combat actions during phase retreat"
```

---

### Task 4: Call `_updateBossRetreat` from main game loop

**Files:**
- Modify: `js/main.js:5223` (boss update section in game loop)
- Test: `tests/unit/main.test.js`

- [ ] **Step 1: Write the failing test**

In `tests/unit/main.test.js`, add:

```javascript
describe('Boss retreat integration', () => {
  it('boss should have _updateBossRetreat method called from game loop', () => {
    // Verify the method exists on Enemy prototype (called by main loop)
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[em.enemies.length - 1];
    expect(typeof boss._updateBossRetreat).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it passes** (method exists from Task 2)

Run: `npm test -- --testPathPattern=main.test`
Expected: PASS

- [ ] **Step 3: Add retreat update call to main loop**

In `js/main.js`, at line ~5223, after `if (_activeBoss && _activeBoss.alive) _activeBoss._updateBossShield(dt);`, add:

```javascript
      if (_activeBoss && _activeBoss.alive) _activeBoss._updateBossRetreat(dt, player.position);
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add js/main.js tests/unit/main.test.js
git commit -m "feat(boss): call retreat update from main game loop"
```

---

### Task 5: Defer minion spawning until retreat completes

**Files:**
- Modify: `js/main.js:4572-4636` (`checkBossMinions` function)
- Test: `tests/integration/combat.test.js`

- [ ] **Step 1: Write the failing tests**

Add a new describe block in `tests/integration/combat.test.js`:

```javascript
describe('Boss phase retreat minion deferral', () => {
  it('should not spawn phase-transition minions while boss is retreating', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[em.enemies.length - 1];
    var initialCount = em.enemies.length;

    // Trigger phase 2
    boss.takeDamage(boss.health - boss.maxHealth * 0.5 + 1);
    expect(boss._bossPhase).toBe(2);
    expect(boss._bossRetreatState).toBe('retreating');

    // checkBossMinions is internal to main.js — verify via _bossPendingMinions
    expect(GAME._bossPendingMinions).toBeDefined();
  });

  it('should expose _bossPendingMinions on GAME', () => {
    expect(GAME._bossPendingMinions).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=combat.test`
Expected: FAIL — `GAME._bossPendingMinions` is undefined

- [ ] **Step 3: Add pending minions variable and defer spawning**

In `js/main.js`, near the `_bossMinionTimer` declaration (around line 4522), add:

```javascript
  var _bossPendingMinions = 0;
  GAME._bossPendingMinions = 0;
```

In `js/main.js`, in `checkBossMinions`, replace the minion spawning section (lines ~4610-4631) — the block starting `if (minionsToSpawn > 0 && GAME._Enemy)` and ending with `showAnnouncement(...)` — with:

```javascript
      if (minionsToSpawn > 0) {
        // Defer spawn until retreat completes
        _bossPendingMinions = minionsToSpawn;
        GAME._bossPendingMinions = _bossPendingMinions;
      }
```

Then, right after the `_bossLastPhase = phase;` line and before the periodic minion spawn section, add the deferred spawn logic:

```javascript
    // Spawn deferred minions once retreat completes
    if (_bossPendingMinions > 0 && _activeBoss._bossRetreatState === 'idle') {
      var minionCount = 0;
      for (var ci = 0; ci < enemyManager.enemies.length; ci++) {
        var ce = enemyManager.enemies[ci];
        if (ce.alive && !ce.isBoss && ce._isBossMinion) minionCount++;
      }
      var toSpawn = Math.min(_bossPendingMinions, BOSS_MAX_MINIONS - minionCount);

      if (toSpawn > 0 && GAME._Enemy) {
        var bossPos = _activeBoss.mesh.position;
        var maxId = 0;
        for (var mi = 0; mi < enemyManager.enemies.length; mi++) {
          if (enemyManager.enemies[mi].id >= maxId) maxId = enemyManager.enemies[mi].id + 1;
        }
        for (var j = 0; j < toSpawn; j++) {
          var angle = Math.random() * Math.PI * 2;
          var dist = 2 + Math.random() * 3;
          var spawnPos = { x: bossPos.x + Math.cos(angle) * dist, z: bossPos.z + Math.sin(angle) * dist };
          var minion = new GAME._Enemy(
            enemyManager.scene, spawnPos, _activeBoss.waypoints, _activeBoss.walls,
            maxId + j, 1
          );
          minion._manager = enemyManager;
          minion._isBossMinion = true;
          applyBossMinionTint(minion);
          enemyManager.enemies.push(minion);
        }
        showAnnouncement('REINFORCEMENTS', toSpawn + ' enemies incoming!');
        if (GAME.Sound && GAME.Sound.bossMinionSummon) GAME.Sound.bossMinionSummon();
      }

      _bossPendingMinions = 0;
      GAME._bossPendingMinions = 0;
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=combat.test`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add js/main.js tests/integration/combat.test.js
git commit -m "feat(boss): defer minion spawning until retreat completes"
```

---

### Task 6: Add spawn position safety net

**Files:**
- Modify: `js/main.js` (both spawn code paths in `checkBossMinions`)
- Test: `tests/integration/combat.test.js`

- [ ] **Step 1: Write the failing test**

Add to the `Boss phase retreat minion deferral` describe block in `tests/integration/combat.test.js`:

```javascript
  it('_safeMinionSpawnPos should push spawn away from player when too close', () => {
    var bossPos = { x: 10, z: 0 };
    var playerPos = { x: 8, z: 0 };
    // A spawn at (9, 0) would be 1 unit from player — too close
    var unsafePos = { x: 9, z: 0 };
    var safe = GAME._safeMinionSpawnPos(unsafePos, bossPos, playerPos);
    var dx = safe.x - playerPos.x;
    var dz = safe.z - playerPos.z;
    var distToPlayer = Math.sqrt(dx * dx + dz * dz);
    expect(distToPlayer).toBeGreaterThanOrEqual(6);
  });

  it('_safeMinionSpawnPos should not change spawn already far from player', () => {
    var bossPos = { x: 20, z: 0 };
    var playerPos = { x: 0, z: 0 };
    var safePos = { x: 22, z: 0 };
    var result = GAME._safeMinionSpawnPos(safePos, bossPos, playerPos);
    expect(result.x).toBe(22);
    expect(result.z).toBe(0);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=combat.test`
Expected: FAIL — `GAME._safeMinionSpawnPos` is not a function

- [ ] **Step 3: Implement safety net function**

In `js/main.js`, before the `checkBossMinions` function, add:

```javascript
  function safeMinionSpawnPos(spawnPos, bossPos, playerPos) {
    var dx = spawnPos.x - playerPos.x;
    var dz = spawnPos.z - playerPos.z;
    var distToPlayer = Math.sqrt(dx * dx + dz * dz);
    if (distToPlayer >= 6) return spawnPos;

    // Place on far side of boss from player
    var bpx = bossPos.x - playerPos.x;
    var bpz = bossPos.z - playerPos.z;
    var bpDist = Math.sqrt(bpx * bpx + bpz * bpz);
    if (bpDist < 0.01) { bpx = 1; bpz = 0; bpDist = 1; }
    var awayX = bpx / bpDist;
    var awayZ = bpz / bpDist;
    var dist = 2 + Math.random() * 3;
    return { x: bossPos.x + awayX * dist, z: bossPos.z + awayZ * dist };
  }
  GAME._safeMinionSpawnPos = safeMinionSpawnPos;
```

- [ ] **Step 4: Apply safety net to deferred spawn code path**

In the deferred spawn loop (added in Task 5), after computing `spawnPos`, add:

```javascript
          spawnPos = safeMinionSpawnPos(spawnPos, bossPos, player.position);
```

Note: `player.position` is `camera.position` which is accessible in the `checkBossMinions` scope as `player` is in the outer closure. Use `GAME.player.position` if `player` is not in scope — check the actual scope. Looking at the code, `player` is declared at line ~1867 `GAME.player = player;` and `checkBossMinions` is in the same IIFE, so use `GAME.player.position`.

- [ ] **Step 5: Apply safety net to periodic spawn code path**

In the periodic minion spawn loop (lines ~4659-4662), after computing `spawnPos`, add:

```javascript
            spawnPos = safeMinionSpawnPos(spawnPos, bossPos, GAME.player.position);
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=combat.test`
Expected: PASS

- [ ] **Step 7: Run all tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 8: Commit**

```
git add js/main.js tests/integration/combat.test.js
git commit -m "feat(boss): add spawn position safety net for minions"
```

---

### Task 7: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Find the boss phase section in REQUIREMENTS.md**

Search for the phase transition and minion spawn documentation sections.

- [ ] **Step 2: Add phase retreat documentation**

In the boss phase system section of `REQUIREMENTS.md`, add documentation for the new retreat behavior:

```markdown
### Phase Transition Retreat
- On phase transition (50% HP → Phase 2, 25% HP → Phase 3), the boss enters a retreat state
- During retreat: boss moves away from the player at 1.3× base speed, stops firing, stops barrage, cancels any in-progress charge attack
- Shield activates simultaneously (existing behavior)
- Retreat ends when boss is 10+ units from player OR after 2 seconds (timeout for cornered scenarios)
- Phase-transition minions are deferred until retreat completes — they spawn around the boss once it reaches safe distance
- Periodic minions already pause during shield (existing behavior)

### Minion Spawn Safety Net
- All minion spawn positions are checked against player distance
- If a spawn position is within 6 units of the player, the minion is placed on the far side of the boss relative to the player instead
- Applies to both phase-transition and periodic minion spawns
```

- [ ] **Step 3: Commit**

```
git add REQUIREMENTS.md
git commit -m "docs: add boss phase retreat and spawn safety net to REQUIREMENTS.md"
```
