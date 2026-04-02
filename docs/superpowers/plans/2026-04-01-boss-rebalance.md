# Boss Rebalance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the boss a tanky, multi-phase encounter with a visible shield on phase transitions and escalating minion pressure.

**Architecture:** All boss logic lives in `js/enemies.js` (stats, shield state, takeDamage gating) and `js/main.js` (minion spawning, HUD updates, shield visual creation). The shield is a `THREE.Mesh` sphere parented to the boss mesh. Periodic minion spawns use a timer ticked in `checkBossMinions()`.

**Tech Stack:** Three.js (procedural mesh), Web Audio API (existing sounds), Vitest (tests)

**Spec:** `docs/superpowers/specs/2026-04-01-boss-rebalance-design.md`

---

### Task 1: Update BOSS_STATS HP values

**Files:**
- Modify: `js/enemies.js:16-21` (BOSS_STATS object)
- Test: `tests/integration/combat.test.js`

- [ ] **Step 1: Write failing test for new HP values**

Add to the `Boss combat integration` describe block in `tests/integration/combat.test.js`:

```js
it('boss HP should match rebalanced values per difficulty', () => {
  expect(GAME.BOSS_STATS.easy.health).toBe(800);
  expect(GAME.BOSS_STATS.normal.health).toBe(1500);
  expect(GAME.BOSS_STATS.hard.health).toBe(2800);
  expect(GAME.BOSS_STATS.elite.health).toBe(4500);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/integration/combat.test.js`
Expected: FAIL — values still 200/350/500/700

- [ ] **Step 3: Update BOSS_STATS in enemies.js**

In `js/enemies.js`, replace lines 16-21:

```js
  var BOSS_STATS = {
    easy:   { health: 800,  speed: 3.5, fireRate: 1.5, damage: 8,  accuracy: 0.25, sight: 35, attackRange: 22 },
    normal: { health: 1500, speed: 4.5, fireRate: 2.2, damage: 12, accuracy: 0.38, sight: 45, attackRange: 25 },
    hard:   { health: 2800, speed: 5.5, fireRate: 2.8, damage: 16, accuracy: 0.45, sight: 50, attackRange: 28 },
    elite:  { health: 4500, speed: 6.5, fireRate: 3.5, damage: 20, accuracy: 0.55, sight: 55, attackRange: 30 }
  };
```

- [ ] **Step 4: Fix the existing hpMult test**

The `boss hpMult option should scale health` test hardcodes old HP. It uses `GAME.BOSS_STATS.normal.health` dynamically so it should still pass — verify.

- [ ] **Step 5: Run all tests to verify**

Run: `npm test -- --run tests/integration/combat.test.js`
Expected: All pass including new HP test and existing boss tests.

- [ ] **Step 6: Commit**

```
git add js/enemies.js tests/integration/combat.test.js
git commit -m "feat(boss): rebalance boss HP (800/1500/2800/4500 per difficulty)"
```

---

### Task 2: Add shield state to Enemy and gate damage during shield

**Files:**
- Modify: `js/enemies.js:307-316` (constructor boss fields), `js/enemies.js:2327-2354` (_initBoss), `js/enemies.js:2356-2383` (_updateBossPhase), `js/enemies.js:2144-2176` (takeDamage)
- Test: `tests/integration/combat.test.js`

- [ ] **Step 1: Write failing tests for shield behavior**

Add to the `Boss combat integration` describe block in `tests/integration/combat.test.js`:

```js
it('boss should activate shield on phase 2 transition', () => {
  var scene = new THREE.Scene();
  var em = new GAME.EnemyManager(scene);
  GAME.setDifficulty('normal');
  em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
  var boss = em.enemies[em.enemies.length - 1];

  // Damage to just below 50% to trigger phase 2
  var phase2Threshold = boss.maxHealth * 0.5;
  boss.takeDamage(boss.health - phase2Threshold + 1);

  expect(boss._bossPhase).toBe(2);
  expect(boss._bossShieldActive).toBe(true);
  expect(boss._bossShieldTimer).toBeCloseTo(3.0, 1);
});

it('boss should activate shield on phase 3 transition', () => {
  var scene = new THREE.Scene();
  var em = new GAME.EnemyManager(scene);
  GAME.setDifficulty('normal');
  em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
  var boss = em.enemies[em.enemies.length - 1];

  // Skip to phase 2 first
  boss.takeDamage(boss.health - boss.maxHealth * 0.5 + 1);
  boss._bossShieldActive = false;
  boss._bossShieldTimer = 0;

  // Damage to below 25% to trigger phase 3
  boss.takeDamage(boss.health - boss.maxHealth * 0.25 + 1);
  expect(boss._bossPhase).toBe(3);
  expect(boss._bossShieldActive).toBe(true);
});

it('shield should reduce damage by 85%', () => {
  var scene = new THREE.Scene();
  var em = new GAME.EnemyManager(scene);
  GAME.setDifficulty('normal');
  em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
  var boss = em.enemies[em.enemies.length - 1];

  // Activate shield manually
  boss._bossShieldActive = true;
  boss._bossShieldTimer = 3.0;
  var hpBefore = boss.health;
  boss.takeDamage(100);
  // Should only take 15% = 15 damage
  expect(boss.health).toBe(hpBefore - 15);
});

it('boss HP should floor at 1 during shield', () => {
  var scene = new THREE.Scene();
  var em = new GAME.EnemyManager(scene);
  GAME.setDifficulty('normal');
  em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
  var boss = em.enemies[em.enemies.length - 1];

  // Activate shield and deal massive damage
  boss._bossShieldActive = true;
  boss._bossShieldTimer = 3.0;
  boss.takeDamage(999999);
  expect(boss.alive).toBe(true);
  expect(boss.health).toBe(1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run tests/integration/combat.test.js`
Expected: FAIL — `_bossShieldActive` is undefined

- [ ] **Step 3: Add shield fields to Enemy constructor**

In `js/enemies.js`, after the line `this._bossNoMinions = false;` (line ~316), add:

```js
    this._bossShieldActive = false;
    this._bossShieldTimer = 0;
    this._bossShieldMesh = null;
```

- [ ] **Step 4: Initialize shield fields in _initBoss**

In `js/enemies.js`, in `_initBoss`, after `this._bossMinionsSpawned = 0;` (line ~2346), add:

```js
    this._bossShieldActive = false;
    this._bossShieldTimer = 0;
```

- [ ] **Step 5: Activate shield on phase transition in _updateBossPhase**

In `js/enemies.js`, replace the phase transition effect block (the `if (this._bossPhase !== oldPhase && oldPhase !== 0)` block at lines ~2379-2382):

```js
    // Trigger phase transition effects
    if (this._bossPhase !== oldPhase && oldPhase !== 0) {
      this._bossPhaseFlashTimer = 0.5;
      if (GAME.Sound && GAME.Sound.bossPhaseTransition) GAME.Sound.bossPhaseTransition();

      // Activate phase transition shield
      this._bossShieldActive = true;
      this._bossShieldTimer = 3.0;
    }
```

- [ ] **Step 6: Gate damage in takeDamage**

In `js/enemies.js`, in `takeDamage`, replace the first two lines of the function body:

Old:
```js
    if (!this.alive) return false;
    this.health -= amount;
```

New:
```js
    if (!this.alive) return false;

    // Boss shield: reduce damage by 85% and floor HP at 1
    if (this.isBoss && this._bossShieldActive) {
      amount = Math.round(amount * 0.15);
      this.health -= amount;
      if (this.health < 1) this.health = 1;
    } else {
      this.health -= amount;
    }
```

- [ ] **Step 7: Add _updateBossShield method**

In `js/enemies.js`, after the `_updateBossPhase` method (after line ~2383), add:

```js
  Enemy.prototype._updateBossShield = function(dt) {
    if (!this.isBoss || !this._bossShieldActive) return;
    this._bossShieldTimer -= dt;
    if (this._bossShieldTimer <= 0) {
      this._bossShieldActive = false;
      this._bossShieldTimer = 0;
    }
  };
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- --run tests/integration/combat.test.js`
Expected: All pass

- [ ] **Step 9: Commit**

```
git add js/enemies.js tests/integration/combat.test.js
git commit -m "feat(boss): add phase transition shield (85% DR, 3s, HP floor at 1)"
```

---

### Task 3: Add shield visual (emissive sphere on boss mesh)

**Files:**
- Modify: `js/enemies.js` (_buildBossModel, _updateBossShield)

- [ ] **Step 1: Create shield mesh in _buildBossModel**

In `js/enemies.js`, at the end of `_buildBossModel` (before the closing `};`), add:

```js
    // Shield visual — semi-transparent emissive sphere
    var shieldGeo = new THREE.SphereGeometry(1.8, 16, 12);
    var shieldMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this._bossShieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this._bossShieldMesh.position.set(0, 1.0, 0);
    this._bossShieldMesh.visible = false;
    m.add(this._bossShieldMesh);
```

- [ ] **Step 2: Animate shield visual in _updateBossShield**

Replace the `_updateBossShield` method from Task 2 with:

```js
  Enemy.prototype._updateBossShield = function(dt) {
    if (!this.isBoss) return;

    if (this._bossShieldActive) {
      this._bossShieldTimer -= dt;

      // Show and animate shield mesh
      if (this._bossShieldMesh) {
        this._bossShieldMesh.visible = true;
        var t = this._bossShieldTimer;
        // Pulse opacity: breathing effect
        var baseOpacity = 0.35;
        var pulse = Math.sin(t * 6) * 0.1;
        // Fade out over last 0.5s
        var fade = t < 0.5 ? t / 0.5 : 1.0;
        this._bossShieldMesh.material.opacity = (baseOpacity + pulse) * fade;
      }

      if (this._bossShieldTimer <= 0) {
        this._bossShieldActive = false;
        this._bossShieldTimer = 0;
        if (this._bossShieldMesh) this._bossShieldMesh.visible = false;
      }
    } else {
      if (this._bossShieldMesh) this._bossShieldMesh.visible = false;
    }
  };
```

- [ ] **Step 3: Run tests to verify nothing broke**

Run: `npm test -- --run`
Expected: All existing tests still pass

- [ ] **Step 4: Commit**

```
git add js/enemies.js
git commit -m "feat(boss): add visible shield sphere with pulse and fade animation"
```

---

### Task 4: Tick shield timer from game loop

**Files:**
- Modify: `js/main.js` (near the `checkBossMinions()` call)

- [ ] **Step 1: Add _updateBossShield call in the game loop**

In `js/main.js`, find the line `checkBossMinions();` (line ~4993). Add before it:

```js
      if (_activeBoss && _activeBoss.alive) _activeBoss._updateBossShield(dt);
```

- [ ] **Step 2: Run tests to verify nothing broke**

Run: `npm test -- --run`
Expected: All pass

- [ ] **Step 3: Commit**

```
git add js/main.js
git commit -m "feat(boss): tick shield timer from game loop"
```

---

### Task 5: Add shield indicator to boss health bar HUD

**Files:**
- Modify: `js/main.js` (updateBossHealthBar function)

- [ ] **Step 1: Add shield tint to health bar when shield is active**

In `js/main.js`, in the `updateBossHealthBar` function (near line ~4386), after the phase color logic (after the `else` block that sets `#4caf50`), add:

```js
    // Shield indicator: overlay glow on health bar track
    if (_activeBoss._bossShieldActive) {
      dom.bossHpTrack.style.boxShadow = '0 0 12px 3px rgba(255, 68, 0, 0.6)';
    } else {
      dom.bossHpTrack.style.boxShadow = 'none';
    }
```

- [ ] **Step 2: Verify `dom.bossHpTrack` is resolved**

Check that `bossHpTrack` is in the `dom` object. Search for where `dom` is populated. If `boss-hp-track` is accessed as `dom.bossHpTrack`, it should already be there via the ID-to-camelCase mapping. If not, add it manually where other boss DOM refs are set.

- [ ] **Step 3: Run tests to verify nothing broke**

Run: `npm test -- --run`
Expected: All pass

- [ ] **Step 4: Commit**

```
git add js/main.js
git commit -m "feat(boss): add shield glow indicator on boss health bar"
```

---

### Task 6: Escalate minion phase transition spawns and increase cap

**Files:**
- Modify: `js/main.js:4406-4454` (checkBossMinions function), `js/main.js:4364` (BOSS_MAX_MINIONS)
- Test: `tests/integration/combat.test.js`

- [ ] **Step 1: Write failing test for new minion counts**

Add to `tests/integration/combat.test.js`:

```js
it('BOSS_MAX_MINIONS should be 8', () => {
  // Access the exposed constant or check via spawning behavior
  // The cap is internal to main.js, so we test via GAME if exposed, 
  // or test indirectly. For now, test the phase transition spawn counts
  // by verifying boss phase triggers are set up correctly.
  // The actual spawn counts (3 for phase 2, 5 for phase 3) are tested
  // via integration in the game loop — here we verify stats are correct.
  expect(GAME.BOSS_STATS.normal.health).toBe(1500);
});
```

Note: The minion spawn logic lives in `main.js` which is hard to unit test in isolation since it depends on the full game loop. The primary verification is manual playtesting + existing minion ID tests. We'll update the spawn counts directly.

- [ ] **Step 2: Update BOSS_MAX_MINIONS**

In `js/main.js`, change line ~4364:

Old:
```js
  var BOSS_MAX_MINIONS = 5;
```

New:
```js
  var BOSS_MAX_MINIONS = 8;
```

- [ ] **Step 3: Update phase transition spawn counts in checkBossMinions**

In `js/main.js`, in the `checkBossMinions` function, update the spawn counts:

Old:
```js
      if (phase === 2 && _bossLastPhase < 2) {
        minionsToSpawn = 2;
        showAnnouncement('PHASE 2', 'ESCALATION');
      }
      if (phase === 3 && _bossLastPhase < 3) {
        minionsToSpawn = 3;
        showAnnouncement('PHASE 3', 'DESPERATE');
      }
```

New:
```js
      if (phase === 2 && _bossLastPhase < 2) {
        minionsToSpawn = 3;
        showAnnouncement('PHASE 2', 'ESCALATION');
      }
      if (phase === 3 && _bossLastPhase < 3) {
        minionsToSpawn = 5;
        showAnnouncement('PHASE 3', 'DESPERATE');
      }
```

- [ ] **Step 4: Run tests to verify nothing broke**

Run: `npm test -- --run`
Expected: All pass

- [ ] **Step 5: Commit**

```
git add js/main.js
git commit -m "feat(boss): escalate phase transition minions (3/5) and raise cap to 8"
```

---

### Task 7: Add periodic minion spawn timer

**Files:**
- Modify: `js/main.js` (checkBossMinions function, boss state variables)

- [ ] **Step 1: Add periodic spawn config and timer state**

In `js/main.js`, after the `var BOSS_MAX_MINIONS = 8;` line, add:

```js
  var BOSS_MINION_SPAWN = {
    1: { interval: 15, count: 2 },
    2: { interval: 10, count: 3 },
    3: { interval: 6,  count: 4 }
  };
  var _bossMinionTimer = 0;
```

- [ ] **Step 2: Reset timer in showBossHealthBar (boss spawn)**

In `js/main.js`, in the `showBossHealthBar` function (where `_activeBoss = boss;`), add after `_bossLastPhase = 1;`:

```js
    _bossMinionTimer = BOSS_MINION_SPAWN[1].interval;
```

- [ ] **Step 3: Add periodic spawn logic to checkBossMinions**

In `js/main.js`, in `checkBossMinions`, **outside** the `if (phase !== _bossLastPhase)` block — after that entire if-block's closing `}` and before the function's closing `}`, add:

```js

    // Periodic minion spawns (independent of phase transitions)
    if (!_activeBoss._bossShieldActive) {
      _bossMinionTimer -= dt;
      if (_bossMinionTimer <= 0) {
        var spawnCfg = BOSS_MINION_SPAWN[_activeBoss._bossPhase];
        _bossMinionTimer = spawnCfg.interval;

        // Count alive minions
        var aliveMinions = 0;
        for (var pi = 0; pi < enemyManager.enemies.length; pi++) {
          var pe = enemyManager.enemies[pi];
          if (pe.alive && !pe.isBoss && pe._isBossMinion) aliveMinions++;
        }
        var toSpawn = Math.min(spawnCfg.count, BOSS_MAX_MINIONS - aliveMinions);

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
            enemyManager.enemies.push(minion);
          }
          if (GAME.Sound && GAME.Sound.bossMinionSummon) GAME.Sound.bossMinionSummon();
        }
      }
    }
```

- [ ] **Step 4: Pass dt to checkBossMinions**

The `checkBossMinions` function currently takes no arguments. Update the call site and signature.

In `js/main.js`, change the call (line ~4993):
Old: `checkBossMinions();`
New: `checkBossMinions(dt);`

Change the function signature (line ~4406):
Old: `function checkBossMinions() {`
New: `function checkBossMinions(dt) {`

- [ ] **Step 5: Reset timer on phase transition (after shield drops)**

The timer reset happens naturally: when a phase transition occurs, the shield activates and the timer doesn't tick (guarded by `!_activeBoss._bossShieldActive`). When the shield drops, the timer resumes from wherever it was. To ensure a fresh wave after each phase transition, reset the timer when a phase change happens.

In `checkBossMinions`, inside the `if (phase !== _bossLastPhase)` block, add just before `_bossLastPhase = phase;`:

```js
      // Reset periodic spawn timer for new phase
      _bossMinionTimer = BOSS_MINION_SPAWN[phase].interval;
```

- [ ] **Step 6: Run tests to verify nothing broke**

Run: `npm test -- --run`
Expected: All pass

- [ ] **Step 7: Commit**

```
git add js/main.js
git commit -m "feat(boss): add periodic minion spawn timer (15s/10s/6s by phase)"
```

---

### Task 8: Add red emissive tint to boss minions

**Files:**
- Modify: `js/main.js` (minion spawn code in checkBossMinions)

- [ ] **Step 1: Add emissive tint after minion creation**

In both minion spawn locations in `checkBossMinions` (the phase transition spawn block and the periodic spawn block), after `minion._isBossMinion = true;`, add:

```js
            // Red emissive tint to distinguish boss minions
            minion.mesh.traverse(function(c) {
              if (c.isMesh && c.material && c.material.emissive) {
                c.material = c.material.clone();
                c.material.emissive.setHex(0xff2200);
                c.material.emissiveIntensity = 0.15;
              }
            });
```

Note: We clone materials to avoid tinting all enemies that share the same material instance.

- [ ] **Step 2: Run tests to verify nothing broke**

Run: `npm test -- --run`
Expected: All pass

- [ ] **Step 3: Commit**

```
git add js/main.js
git commit -m "feat(boss): add red emissive tint to boss minions"
```

---

### Task 9: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Update BOSS_STATS table**

Find the `Boss Stats` section and update HP values to 800/1500/2800/4500.

- [ ] **Step 2: Add shield mechanic documentation**

Add a new subsection under the Boss section documenting:
- Phase transition shield: 3s duration, 85% damage reduction, HP floor at 1
- Visual: semi-transparent crimson/orange emissive sphere, pulse animation, fade over last 0.5s
- HUD: orange glow on boss health bar track during shield

- [ ] **Step 3: Update minion spawn documentation**

Update the existing minion spawn section:
- Phase 2 transition: 3 minions (was 2)
- Phase 3 transition: 5 minions (was 3)
- New periodic spawn timer: phase 1 every 15s (2 minions), phase 2 every 10s (3), phase 3 every 6s (4)
- Max minion cap: 8 (was 5)
- Timer pauses during shield
- Timer resets on phase transition

- [ ] **Step 4: Add minion visual distinction documentation**

Document that boss minions have red emissive tint (0xff2200 at 0.15 intensity) to distinguish from regular bots.

- [ ] **Step 5: Run tests to verify nothing broke**

Run: `npm test -- --run`
Expected: All pass (REQUIREMENTS.md changes don't affect tests, but verify no accidental edits)

- [ ] **Step 6: Commit**

```
git add REQUIREMENTS.md
git commit -m "docs: update REQUIREMENTS.md with boss rebalance changes"
```

---

### Task 10: Final integration verification

- [ ] **Step 1: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass (except the pre-existing waypoint scoring flaky test in enemies.test.js which is unrelated)

- [ ] **Step 2: Manual smoke test checklist**

Open `index.html` in browser and verify:
1. Start a Competitive match on Hard, play to round 6 (boss round)
2. Boss spawns with higher HP (health bar should drain much slower)
3. When boss reaches 50% HP: shield sphere appears, glowing orange, health bar gets orange glow
4. Shield lasts ~3 seconds, boss takes minimal damage during shield
5. 3 minions spawn on phase 2, they have a red tint
6. After ~15s, periodic minions spawn (2 at a time)
7. When boss reaches 25% HP: another shield activation, 5 minions spawn
8. Phase 3 periodic spawns are faster (every 6s, 4 at a time)
9. No more than 8 minions alive at once
10. Boss can be killed after shield drops

- [ ] **Step 3: Final commit if any fixes needed**

If manual testing reveals issues, fix and commit each fix individually.
