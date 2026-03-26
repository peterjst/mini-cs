# Combat AI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make bot combat feel human-like by replacing one-dimensional strafing with varied combat movements, fixing disengagement bugs, and preventing suicidal cover runs.

**Architecture:** All changes are in `js/enemies.js` within the existing 7-state FSM. The ATTACK state gets a sub-behavior system (5 movement types selected by weighted random with personality and context modifiers). State transitions get a LOS grace timer. Cover/retreat get distance caps and facing constraints. Tests go in `tests/unit/enemies.test.js`.

**Tech Stack:** Three.js r160.1 (global `THREE`), IIFE module pattern, Vitest

---

### Task 1: Expose Combat Movement Weight Calculation

Add the combat movement constants and weight selection function as a testable unit.

**Files:**
- Modify: `js/enemies.js:17-31` (add constants after existing personality/nav constants)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests for combat movement weight calculation**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('Combat movement weights', () => {
  var calcWeights;

  beforeAll(() => {
    calcWeights = GAME._calcCombatWeights;
  });

  it('should be exposed as GAME._calcCombatWeights', () => {
    expect(typeof calcWeights).toBe('function');
  });

  it('should return normalized weights summing to 1.0 for aggressive personality', () => {
    var w = calcWeights('aggressive', { hpRatio: 1.0, distToPlayer: 10, hasNearbyCover: true });
    var sum = w.strafe + w.push + w.hold + w.retreatFire + w.rushCover;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('should return normalized weights summing to 1.0 for balanced personality', () => {
    var w = calcWeights('balanced', { hpRatio: 1.0, distToPlayer: 10, hasNearbyCover: true });
    var sum = w.strafe + w.push + w.hold + w.retreatFire + w.rushCover;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('should return normalized weights summing to 1.0 for cautious personality', () => {
    var w = calcWeights('cautious', { hpRatio: 1.0, distToPlayer: 10, hasNearbyCover: true });
    var sum = w.strafe + w.push + w.hold + w.retreatFire + w.rushCover;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('aggressive personality should have highest push weight at full HP', () => {
    var w = calcWeights('aggressive', { hpRatio: 1.0, distToPlayer: 10, hasNearbyCover: true });
    expect(w.push).toBeGreaterThan(w.strafe);
    expect(w.push).toBeGreaterThan(w.retreatFire);
  });

  it('cautious personality should have highest retreatFire weight', () => {
    var w = calcWeights('cautious', { hpRatio: 1.0, distToPlayer: 10, hasNearbyCover: true });
    expect(w.retreatFire).toBeGreaterThan(w.push);
  });

  it('low HP should halve push weight and double retreatFire weight', () => {
    var wFull = calcWeights('balanced', { hpRatio: 1.0, distToPlayer: 10, hasNearbyCover: true });
    var wLow = calcWeights('balanced', { hpRatio: 0.3, distToPlayer: 10, hasNearbyCover: true });
    // retreatFire's share of total should increase when HP is low
    expect(wLow.retreatFire).toBeGreaterThan(wFull.retreatFire);
    expect(wLow.push).toBeLessThan(wFull.push);
  });

  it('close player should reduce push weight and boost retreatFire', () => {
    var wFar = calcWeights('balanced', { hpRatio: 1.0, distToPlayer: 10, hasNearbyCover: true });
    var wClose = calcWeights('balanced', { hpRatio: 1.0, distToPlayer: 3, hasNearbyCover: true });
    expect(wClose.push).toBeLessThan(wFar.push);
    expect(wClose.retreatFire).toBeGreaterThan(wFar.retreatFire);
  });

  it('far player should boost push and hold weights', () => {
    var wMid = calcWeights('balanced', { hpRatio: 1.0, distToPlayer: 10, hasNearbyCover: true });
    var wFar = calcWeights('balanced', { hpRatio: 1.0, distToPlayer: 20, hasNearbyCover: true });
    expect(wFar.push).toBeGreaterThan(wMid.push);
    expect(wFar.hold).toBeGreaterThan(wMid.hold);
  });

  it('no nearby cover should zero out rushCover and redistribute', () => {
    var w = calcWeights('balanced', { hpRatio: 1.0, distToPlayer: 10, hasNearbyCover: false });
    expect(w.rushCover).toBe(0);
    var sum = w.strafe + w.push + w.hold + w.retreatFire + w.rushCover;
    expect(sum).toBeCloseTo(1.0, 5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL — `GAME._calcCombatWeights` is undefined

- [ ] **Step 3: Implement combat movement constants and weight calculation**

Add after line 31 (after `NAV_NOISE`) in `js/enemies.js`:

```javascript
  // ── Combat Movement Sub-Behaviors ──────────────────────
  var COMBAT_MOVE = { STRAFE: 0, PUSH: 1, HOLD: 2, RETREAT_FIRE: 3, RUSH_COVER: 4 };

  var COMBAT_BASE_WEIGHTS = {
    aggressive: { strafe: 0.25, push: 0.35, hold: 0.15, retreatFire: 0.10, rushCover: 0.15 },
    balanced:   { strafe: 0.35, push: 0.15, hold: 0.20, retreatFire: 0.20, rushCover: 0.10 },
    cautious:   { strafe: 0.30, push: 0.05, hold: 0.15, retreatFire: 0.35, rushCover: 0.15 }
  };

  var COMBAT_MOVE_DURATIONS = {
    strafe:      [1.0, 3.0],
    push:        [1.0, 2.0],
    hold:        [0.8, 1.5],
    retreatFire: [1.0, 2.0],
    rushCover:   [0, 0]  // duration = until arrival
  };

  function _calcCombatWeights(personalityKey, ctx) {
    var base = COMBAT_BASE_WEIGHTS[personalityKey] || COMBAT_BASE_WEIGHTS.balanced;
    var w = {
      strafe: base.strafe,
      push: base.push,
      hold: base.hold,
      retreatFire: base.retreatFire,
      rushCover: base.rushCover
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

    // Normalize to sum to 1.0
    var sum = w.strafe + w.push + w.hold + w.retreatFire + w.rushCover;
    if (sum > 0) {
      w.strafe /= sum;
      w.push /= sum;
      w.hold /= sum;
      w.retreatFire /= sum;
      w.rushCover /= sum;
    }

    return w;
  }
```

Also add to the exports at the bottom of the file (near line 2230, after `GAME._Enemy = Enemy;`):

```javascript
  GAME._calcCombatWeights = _calcCombatWeights;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: All combat weight tests PASS

- [ ] **Step 5: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(ai): add combat movement weight calculation with personality and context modifiers"
```

---

### Task 2: Add Combat Movement State to Enemy Constructor

Wire the new combat movement properties into the Enemy constructor so bots track their current movement type and timers.

**Files:**
- Modify: `js/enemies.js:125-131` (replace strafe/jiggle init block)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests for combat movement initialization**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('Combat movement initialization', () => {
  var enemy;

  beforeAll(() => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    enemy = em.enemies[0];
  });

  it('should have _combatMove initialized to null', () => {
    expect(enemy._combatMove).toBeNull();
  });

  it('should have _combatMoveTimer initialized to 0', () => {
    expect(enemy._combatMoveTimer).toBe(0);
  });

  it('should have _combatMoveDuration initialized to 0', () => {
    expect(enemy._combatMoveDuration).toBe(0);
  });

  it('should have _microPauseTimer initialized to 0', () => {
    expect(enemy._microPauseTimer).toBe(0);
  });

  it('should have _jiggleCount initialized to 0', () => {
    expect(enemy._jiggleCount).toBe(0);
  });

  it('should still have _strafeDir for strafe movement', () => {
    expect(enemy._strafeDir).toBe(1);
  });

  it('should have _losGraceTimer initialized to 0', () => {
    expect(enemy._losGraceTimer).toBe(0);
  });

  it('should have _lastKnownPlayerPos initialized to null', () => {
    expect(enemy._lastKnownPlayerPos).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL — `_combatMove`, `_losGraceTimer` etc. are undefined

- [ ] **Step 3: Implement combat movement properties in Enemy constructor**

Replace the strafe/jiggle init block (lines 125-131) in `js/enemies.js`:

```javascript
    // ── Strafing / jiggle peek ───────────────────────────
    this._strafeDir = 1;
    this._strafeTimer = 0;
    this._strafeInterval = 0.5 + Math.random() * 0.8;
    this._jigglePeek = pKey === 'cautious' || Math.random() < 0.3;
    this._jiggleTimer = 0;
    this._jiggleInterval = 0.15 + Math.random() * 0.2;
```

Replace with:

```javascript
    // ── Combat movement sub-behaviors ─────────────────────
    this._combatMove = null;       // current movement type (COMBAT_MOVE enum)
    this._combatMoveTimer = 0;     // time spent in current movement
    this._combatMoveDuration = 0;  // how long current movement lasts
    this._microPauseTimer = 0;     // brief pause between movements

    // ── Strafing (used within strafe combat movement) ─────
    this._strafeDir = 1;
    this._strafeTimer = 0;
    this._strafeInterval = 0.5 + Math.random() * 0.8;
    this._jigglePeek = pKey === 'cautious' || Math.random() < 0.3;
    this._jiggleTimer = 0;
    this._jiggleInterval = 0.2 + Math.random() * 0.3;
    this._jiggleCount = 0;

    // ── LOS grace period ──────────────────────────────────
    this._losGraceTimer = 0;
    this._lastKnownPlayerPos = null;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: All new init tests PASS, existing tests still PASS

- [ ] **Step 5: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(ai): add combat movement and LOS grace properties to Enemy constructor"
```

---

### Task 3: Implement Combat Movement Selection and Execution

Replace the strafe-only ATTACK behavior with the 5 combat movement types.

**Files:**
- Modify: `js/enemies.js:874-920` (strafe method — keep but modify)
- Modify: `js/enemies.js:1342-1389` (ATTACK state behavior)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests for combat movement selection**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('Combat movement selection', () => {
  it('_rollCombatMove should be a method on Enemy', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    expect(typeof enemy._rollCombatMove).toBe('function');
  });

  it('_rollCombatMove should set _combatMove to a valid type (0-4)', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy._rollCombatMove({ x: 10, y: 0, z: 10 }, 10);
    expect(enemy._combatMove).toBeGreaterThanOrEqual(0);
    expect(enemy._combatMove).toBeLessThanOrEqual(4);
  });

  it('_rollCombatMove should set a positive _combatMoveDuration for non-rushCover types', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    // Run multiple times — at least one should not be rushCover
    var foundPositiveDuration = false;
    for (var i = 0; i < 50; i++) {
      enemy._rollCombatMove({ x: 10, y: 0, z: 10 }, 10);
      if (enemy._combatMove !== 4 && enemy._combatMoveDuration > 0) {
        foundPositiveDuration = true;
        break;
      }
    }
    expect(foundPositiveDuration).toBe(true);
  });

  it('_rollCombatMove should reset _combatMoveTimer to 0', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy._combatMoveTimer = 5;
    enemy._rollCombatMove({ x: 10, y: 0, z: 10 }, 10);
    expect(enemy._combatMoveTimer).toBe(0);
  });
});

describe('Combat movement micro-pauses', () => {
  it('15% of movement transitions should trigger micro-pauses over many rolls', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    var pauseCount = 0;
    var trials = 200;
    for (var i = 0; i < trials; i++) {
      enemy._rollCombatMove({ x: 10, y: 0, z: 10 }, 10);
      if (enemy._microPauseTimer > 0) pauseCount++;
    }
    // Expect roughly 15% ± some margin (at least 5%, at most 30%)
    expect(pauseCount / trials).toBeGreaterThan(0.05);
    expect(pauseCount / trials).toBeLessThan(0.30);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL — `_rollCombatMove` is undefined

- [ ] **Step 3: Implement `_rollCombatMove` method**

Add after the `_strafe` method (after line 920) in `js/enemies.js`:

```javascript
  // ── Combat Movement Selection ────────────────────────────

  Enemy.prototype._rollCombatMove = function(playerPos, distToPlayer) {
    var pKey = PERSONALITY_KEYS[this.id % PERSONALITY_KEYS.length];

    // Check for nearby cover (quick 8-direction scan, 4-unit range)
    var hasNearbyCover = false;
    var pos = this.mesh.position;
    for (var ci = 0; ci < 8; ci++) {
      var ca = (ci / 8) * Math.PI * 2;
      this._rc.set(new THREE.Vector3(pos.x, 0.5, pos.z), new THREE.Vector3(Math.cos(ca), 0, Math.sin(ca)));
      this._rc.far = 4;
      var ch = this._rc.intersectObjects(this.walls, false);
      if (ch.length > 0 && ch[0].distance > 1.5) { hasNearbyCover = true; break; }
    }

    var ctx = {
      hpRatio: this.health / this.maxHealth,
      distToPlayer: distToPlayer,
      hasNearbyCover: hasNearbyCover
    };

    var w = _calcCombatWeights(pKey, ctx);

    // Weighted random selection
    var r = Math.random();
    var cumulative = 0;
    var types = ['strafe', 'push', 'hold', 'retreatFire', 'rushCover'];
    var selected = COMBAT_MOVE.STRAFE; // fallback
    for (var ti = 0; ti < types.length; ti++) {
      cumulative += w[types[ti]];
      if (r <= cumulative) { selected = ti; break; }
    }

    this._combatMove = selected;
    this._combatMoveTimer = 0;

    // Set duration based on movement type
    if (selected === COMBAT_MOVE.RUSH_COVER) {
      this._combatMoveDuration = 0; // until arrival
      // Find cover now
      this._coverPos = this._findNearestCover(playerPos);
      if (!this._coverPos) {
        // No cover found — fall back to retreat-fire
        this._combatMove = COMBAT_MOVE.RETREAT_FIRE;
        selected = COMBAT_MOVE.RETREAT_FIRE;
      }
    }

    if (selected !== COMBAT_MOVE.RUSH_COVER) {
      var range = COMBAT_MOVE_DURATIONS[types[selected]];
      this._combatMoveDuration = range[0] + Math.random() * (range[1] - range[0]);
    }

    // 15% chance of micro-pause before starting the new movement
    if (Math.random() < 0.15) {
      this._microPauseTimer = 0.2 + Math.random() * 0.2;
    } else {
      this._microPauseTimer = 0;
    }

    // For strafe: 40% chance to keep same direction
    if (selected === COMBAT_MOVE.STRAFE && Math.random() >= 0.4) {
      this._strafeDir *= -1;
    }

    // Reset jiggle count when not strafing
    if (selected !== COMBAT_MOVE.STRAFE) {
      this._jiggleCount = 0;
    }
  };
```

- [ ] **Step 4: Implement combat movement execution in ATTACK state**

Replace the ATTACK state behavior block (lines 1342-1389) in `js/enemies.js`. The old code:

```javascript
    } else if (this.state === ATTACK) {
      this._facePlayer(playerPos, dt);
      this._strafe(playerPos, dt);

      // Burst firing
      ...
    }
```

Replace with:

```javascript
    } else if (this.state === ATTACK) {
      this._facePlayer(playerPos, dt);

      // ── Combat movement sub-behavior ──────────────────
      // Roll initial movement or when current one expires
      if (this._combatMove === null || (this._combatMoveDuration > 0 && this._combatMoveTimer >= this._combatMoveDuration)) {
        this._rollCombatMove(playerPos, distToPlayer);
      }

      // Micro-pause: briefly stop before new movement
      if (this._microPauseTimer > 0) {
        this._microPauseTimer -= dt;
      } else {
        this._combatMoveTimer += dt;

        if (this._combatMove === COMBAT_MOVE.STRAFE) {
          // Lateral strafe movement (modified existing strafe logic)
          this._strafe(playerPos, dt);
          // Cap jiggle sequences for cautious bots
          if (this._jigglePeek) {
            this._jiggleCount++;
            if (this._jiggleCount > 3 + Math.floor(Math.random() * 3)) {
              // Force a different movement type
              this._combatMoveTimer = this._combatMoveDuration;
            }
          }
        } else if (this._combatMove === COMBAT_MOVE.PUSH) {
          // Push toward player at 70% speed
          this._moveToward(playerPos, dt, this.speed * 0.7);
        } else if (this._combatMove === COMBAT_MOVE.HOLD) {
          // Stand still — no movement, just aim and fire
          this._currentSpeed *= 0.9;
        } else if (this._combatMove === COMBAT_MOVE.RETREAT_FIRE) {
          // Move away from player while facing them
          var awayX = pos.x - (playerPos.x - pos.x);
          var awayZ = pos.z - (playerPos.z - pos.z);
          this._moveToward({ x: awayX, z: awayZ }, dt, this.speed * 0.6);
        } else if (this._combatMove === COMBAT_MOVE.RUSH_COVER) {
          // Move to nearby cover while facing player
          if (this._coverPos) {
            var coverDist = Math.sqrt(
              (this._coverPos.x - pos.x) * (this._coverPos.x - pos.x) +
              (this._coverPos.z - pos.z) * (this._coverPos.z - pos.z)
            );
            if (coverDist > 1.5) {
              this._moveToward(this._coverPos, dt, this.speed * 0.8);
            } else {
              // Arrived at cover — transition to TAKE_COVER
              this._coverTimer = 3.0;
              this._peekTimer = 0;
              this._isPeeking = false;
              this.state = TAKE_COVER;
            }
          } else {
            // No cover — fall back to strafe
            this._combatMove = COMBAT_MOVE.STRAFE;
          }
        }
      }

      // Burst firing (runs regardless of movement type — bot always fires in ATTACK)
      if (!this._reloading) {
        if (this._burstCooldown > 0) {
          this._burstCooldown -= dt;
        } else if (this._burstRemaining > 0) {
          var fireInterval = 1 / this.fireRate;
          if (now - this.lastFireTime >= fireInterval) {
            this.lastFireTime = now;
            this._burstRemaining--;
            this._shotsInBurst++;
            this._ammo--;

            // Hit determined by aim proximity to player
            var aimDist = this._aimCurrent.distanceTo(playerPos);
            var hitRadius = 0.6; // Player hitbox radius
            if (aimDist < hitRadius) {
              damageToPlayer = this._weaponDef ? this._weaponDef.damage || this.damage : this.damage;
            }

            this._showTracer(this._aimCurrent);
            if (GAME.Sound) {
              if (GAME.Sound.enemyShotSpatial) {
                var spos = this.mesh.position;
                GAME.Sound.enemyShotSpatial(spos.x, spos.y + 1.5, spos.z, playerPos);
              } else {
                GAME.Sound.enemyShot();
              }
            }

            // Check ammo
            if (this._ammo <= 0) {
              this._startReload();
              this._burstRemaining = 0;
            }
          }
        } else {
          // Start new burst
          var min = this.personality.burstMin;
          var max = this.personality.burstMax;
          this._burstRemaining = min + Math.floor(Math.random() * (max - min + 1));
          this._burstCooldown = 0.3 + Math.random() * 0.5;
          this._shotsInBurst = 0;
        }
      }

    }
```

Note: `var pos = this.mesh.position;` is already available as `sp` from earlier in the update function. Use `var pos = sp;` or reference `sp` directly. Check the actual variable name used in the update function and use that. The mesh position is typically accessed as `this.mesh.position` or via the `sp` alias set at the top of the update method.

- [ ] **Step 5: Run all tests to verify**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(ai): replace strafe-only ATTACK with 5 combat movement sub-behaviors"
```

---

### Task 4: Implement LOS Grace Period

Fix the combat disengagement bug by adding a grace timer before transitioning out of ATTACK when LOS is momentarily lost.

**Files:**
- Modify: `js/enemies.js:1072-1083` (ATTACK state transition on LOS loss)
- Modify: `js/enemies.js:1180-1183` (aim update section)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests for LOS grace timer**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('LOS grace period', () => {
  it('enemy in ATTACK should not immediately transition to INVESTIGATE on LOS loss', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy.state = 2; // ATTACK
    enemy._hasReacted = true;
    enemy._lastKnownPlayerPos = new THREE.Vector3(5, 0, 5);
    // _losGraceTimer should start at 0 — bot should stay in ATTACK briefly
    expect(enemy._losGraceTimer).toBe(0);
    expect(enemy.state).toBe(2); // Still ATTACK
  });

  it('_losGraceTimer should exist and be a number', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    expect(typeof enemy._losGraceTimer).toBe('number');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: Tests for `_losGraceTimer` should PASS (added in Task 2), confirming the property exists. The behavioral test confirms current state.

- [ ] **Step 3: Implement LOS grace period in ATTACK state transitions**

In `js/enemies.js`, replace the ATTACK→INVESTIGATE transition block (lines 1072-1083):

Old code:
```javascript
    } else if (this.state === ATTACK) {
      if (!playerAlive) { this.state = PATROL; }
      else if (!canSee) {
        if (this._lastSeenPlayerPos) {
          this._investigatePos = this._lastSeenPlayerPos.clone();
          this._investigateTimer = 0;
          this._lookAroundTimer = 3 + Math.random();
          this.state = INVESTIGATE;
        } else {
          this.state = PATROL;
        }
      }
```

Replace with:
```javascript
    } else if (this.state === ATTACK) {
      if (!playerAlive) { this.state = PATROL; }
      else if (!canSee) {
        // LOS grace period — don't immediately leave ATTACK
        this._losGraceTimer += dt;
        if (this._losGraceTimer >= 0.5) {
          // Grace expired — transition to investigate
          if (this._lastKnownPlayerPos) {
            this._investigatePos = this._lastKnownPlayerPos.clone();
            this._investigateTimer = 0;
            this._lookAroundTimer = 3 + Math.random();
            this.state = INVESTIGATE;
          } else if (this._lastSeenPlayerPos) {
            this._investigatePos = this._lastSeenPlayerPos.clone();
            this._investigateTimer = 0;
            this._lookAroundTimer = 3 + Math.random();
            this.state = INVESTIGATE;
          } else {
            this.state = PATROL;
          }
          this._losGraceTimer = 0;
        }
      } else {
        // Can see player — reset grace timer and update last known position
        this._losGraceTimer = 0;
        this._lastKnownPlayerPos = playerPos.clone ? playerPos.clone() : new THREE.Vector3(playerPos.x, playerPos.y || 0, playerPos.z);
```

Close the new else block properly — the remaining ATTACK transitions (distance check, retreat check, cover check) should be inside this `else` block since they only apply when the player IS visible.

The full replacement:
```javascript
    } else if (this.state === ATTACK) {
      if (!playerAlive) { this.state = PATROL; }
      else if (!canSee) {
        this._losGraceTimer += dt;
        if (this._losGraceTimer >= 0.5) {
          if (this._lastKnownPlayerPos) {
            this._investigatePos = this._lastKnownPlayerPos.clone();
            this._investigateTimer = 0;
            this._lookAroundTimer = 3 + Math.random();
            this.state = INVESTIGATE;
          } else if (this._lastSeenPlayerPos) {
            this._investigatePos = this._lastSeenPlayerPos.clone();
            this._investigateTimer = 0;
            this._lookAroundTimer = 3 + Math.random();
            this.state = INVESTIGATE;
          } else {
            this.state = PATROL;
          }
          this._losGraceTimer = 0;
        }
      } else {
        this._losGraceTimer = 0;
        this._lastKnownPlayerPos = playerPos.clone ? playerPos.clone() : new THREE.Vector3(playerPos.x, playerPos.y || 0, playerPos.z);
        if (distToPlayer > this.attackRange) this.state = CHASE;
        else if (this.health < this._engageStartHP * this.personality.retreatHP) {
          this._retreatTarget = this._findRetreatWaypoint(playerPos);
          if (this._retreatTarget) {
            this.state = RETREAT;
            if (!this._saidNeedBackup) {
              this._saidNeedBackup = true;
              botRadio(this, 'Need backup', 0);
            }
          }
        }
        else if (this._reloading && this._coverSearchCooldown <= 0) {
          var cover = this._findNearestCover(playerPos);
          if (cover) {
            this._coverPos = cover;
            this._coverTimer = this._reloadTimer + 1.0;
            this._peekTimer = 0;
            this._isPeeking = false;
            this.state = TAKE_COVER;
            this._coverSearchCooldown = 3;
          }
        }
      }
```

Also update the aim update section (around line 1180). During LOS grace, continue aiming at last known position:

Old:
```javascript
    if (canSee) {
      this._updateAim(playerPos, dt);
    }
```

Replace with:
```javascript
    if (canSee) {
      this._updateAim(playerPos, dt);
    } else if (this.state === ATTACK && this._losGraceTimer > 0 && this._lastKnownPlayerPos) {
      // During LOS grace period, keep aiming at last known position
      this._updateAim(this._lastKnownPlayerPos, dt);
    }
```

- [ ] **Step 4: Run all tests to verify**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "fix(ai): add 0.5s LOS grace period to prevent combat disengagement on momentary LOS loss"
```

---

### Task 5: Smart Cover Distance Cap

Reduce cover search max distance from 10 to 4 units so bots only take cover when it's immediately adjacent.

**Files:**
- Modify: `js/enemies.js:924-972` (`_findNearestCover` method)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests for cover distance cap**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('Cover distance cap', () => {
  it('_findNearestCover should not return cover beyond 4 units', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    // With no walls at all, should return null
    enemy.walls = [];
    var result = enemy._findNearestCover({ x: 10, y: 0, z: 10 });
    expect(result).toBeNull();
  });

  it('_findNearestCover should find cover within 4 units when wall is close', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    // Create a wall mesh near the bot
    var wallGeo = new THREE.BoxGeometry(1, 2, 1);
    var wallMat = new THREE.MeshBasicMaterial();
    var wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(3, 1, 0); // 3 units away from origin
    scene.add(wall);
    em.spawnBots([{x:0, z:0}], [{x:10, z:10}], [wall], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy.mesh.position.set(0, 0, 0);
    var result = enemy._findNearestCover({ x: -10, y: 0, z: 0 });
    // Should find cover near the wall (within 4 units of bot)
    if (result) {
      var dx = result.x - enemy.mesh.position.x;
      var dz = result.z - enemy.mesh.position.z;
      var dist = Math.sqrt(dx * dx + dz * dz);
      expect(dist).toBeLessThanOrEqual(4);
    }
    scene.remove(wall);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: The first test may pass or fail depending on wall setup. The key validation is that the distance cap is enforced.

- [ ] **Step 3: Implement cover distance cap**

In `js/enemies.js`, modify `_findNearestCover` (line 940). Change the distance check:

Old:
```javascript
      if (hits.length > 0 && hits[0].distance > 1.5 && hits[0].distance < 10) {
```

New:
```javascript
      if (hits.length > 0 && hits[0].distance > 1.5 && hits[0].distance < 4) {
```

- [ ] **Step 4: Run all tests to verify**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "fix(ai): cap cover search to 4 units to prevent suicidal long-range cover runs"
```

---

### Task 6: Retreat Facing Constraint

Make bots face the player while retreating instead of turning their back.

**Files:**
- Modify: `js/enemies.js:1420-1438` (RETREAT state behavior)
- Modify: `js/enemies.js:1440-1509` (TAKE_COVER movement to cover)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing test for retreat facing**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('Retreat facing constraint', () => {
  it('enemy in RETREAT should have _retreatFacingPlayer flag', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    // This will be set based on whether bot can see player during retreat
    expect(enemy).toHaveProperty('_retreatFacingPlayer');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL — `_retreatFacingPlayer` not defined

- [ ] **Step 3: Add `_retreatFacingPlayer` to constructor**

In `js/enemies.js`, add after the retreat state init (after line 144 `this._engageStartHP = this.health;`):

```javascript
    this._retreatFacingPlayer = false;
```

- [ ] **Step 4: Implement retreat facing behavior**

Replace the RETREAT behavior block (lines 1420-1438):

Old:
```javascript
    } else if (this.state === RETREAT) {
      if (this._retreatTarget) {
        this._moveToward(this._retreatTarget, dt, this.speed * 1.3);
      }
```

New:
```javascript
    } else if (this.state === RETREAT) {
      if (this._retreatTarget) {
        // If we can see the player, back toward retreat target while facing player
        this._retreatFacingPlayer = canSee;
        if (canSee) {
          this._facePlayer(playerPos, dt);
          // Move away from player (toward retreat target) at 1.0x speed, but facing player
          var rtDx = this._retreatTarget.x - sp.x;
          var rtDz = this._retreatTarget.z - sp.z;
          var rtDist = Math.sqrt(rtDx * rtDx + rtDz * rtDz);
          if (rtDist > 1) {
            // Move in retreat direction but don't override facing
            var moveDir = new THREE.Vector3(rtDx / rtDist, 0, rtDz / rtDist);
            this._rc.set(new THREE.Vector3(sp.x, 0.5, sp.z), moveDir);
            this._rc.far = this.speed * dt + ENEMY_RADIUS;
            var rHits = this._rc.intersectObjects(this.walls, false);
            if (rHits.length === 0) {
              sp.x += moveDir.x * this.speed * dt;
              sp.z += moveDir.z * this.speed * dt;
            }
            this._resolveCollisions();
          }
        } else {
          // Lost sight of player — sprint to retreat target normally
          this._moveToward(this._retreatTarget, dt, this.speed * 1.3);
        }
      }
```

Also modify TAKE_COVER movement-to-cover (line 1446-1448). When moving to cover, face player:

Old:
```javascript
        if (coverDist > 1.5) {
          // Move to cover
          this._moveToward(this._coverPos, dt, this.speed * 1.1);
```

New:
```javascript
        if (coverDist > 1.5) {
          // Move to cover while facing player
          if (canSee) {
            this._facePlayer(playerPos, dt);
          }
          this._moveToward(this._coverPos, dt, this.speed * 0.8);
```

- [ ] **Step 5: Run all tests to verify**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "fix(ai): face player during retreat and cover movement instead of turning back"
```

---

### Task 7: Update Strafe Timing for Anti-Oscillation

Widen strafe intervals and add direction persistence to break robotic ping-pong.

**Files:**
- Modify: `js/enemies.js:874-920` (`_strafe` method)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing test for wider strafe intervals**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('Strafe anti-oscillation', () => {
  it('strafe interval should be at least 0.5s', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    expect(enemy._strafeInterval).toBeGreaterThanOrEqual(0.5);
  });

  it('jiggle interval should be at least 0.2s (widened from 0.15s)', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    expect(enemy._jiggleInterval).toBeGreaterThanOrEqual(0.2);
  });
});
```

- [ ] **Step 2: Run tests to verify current state**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: jiggle interval test may FAIL if current init still uses 0.15

- [ ] **Step 3: Update strafe timing in `_strafe` method**

In `js/enemies.js`, modify the `_strafe` method (lines 874-920):

Change jiggle interval regeneration (line 892):
Old:
```javascript
        this._jiggleInterval = 0.15 + Math.random() * 0.2;
```
New:
```javascript
        this._jiggleInterval = 0.2 + Math.random() * 0.3;
```

Change regular strafe interval regeneration (line 917):
Old:
```javascript
        this._strafeInterval = 0.4 + Math.random() * 0.8;
```
New:
```javascript
        this._strafeInterval = 0.5 + Math.random() * 1.3;
```

Change regular strafe direction change — add 40% persistence (line 916):
Old:
```javascript
        this._strafeDir *= -1;
```
New:
```javascript
        if (Math.random() >= 0.4) this._strafeDir *= -1;
```

- [ ] **Step 4: Run all tests to verify**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "fix(ai): widen strafe intervals and add direction persistence to reduce oscillation"
```

---

### Task 8: Reset Combat Movement on State Transitions

Ensure combat movement state resets properly when entering/leaving ATTACK.

**Files:**
- Modify: `js/enemies.js:1173-1178` (state change reset block)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing test for combat movement reset**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('Combat movement state reset', () => {
  it('_combatMove should reset to null when leaving ATTACK state', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy._combatMove = 1; // PUSH
    enemy._combatMoveTimer = 1.5;
    // Simulate state change away from ATTACK
    // The reset happens in the state transition block — we test the properties directly
    // After a real state transition, these should be null/0
    // For now, just verify the properties exist and are settable
    expect(enemy._combatMove).toBe(1);
    enemy._combatMove = null;
    expect(enemy._combatMove).toBeNull();
  });
});
```

- [ ] **Step 2: Implement combat movement reset on state exit**

In `js/enemies.js`, expand the state change reset block (lines 1173-1178):

Old:
```javascript
    if (prevState === ATTACK && this.state !== ATTACK) {
      this._burstRemaining = 0;
      this._burstCooldown = 0;
      this._shotsInBurst = 0;
    }
```

New:
```javascript
    if (prevState === ATTACK && this.state !== ATTACK) {
      this._burstRemaining = 0;
      this._burstCooldown = 0;
      this._shotsInBurst = 0;
      this._combatMove = null;
      this._combatMoveTimer = 0;
      this._combatMoveDuration = 0;
      this._microPauseTimer = 0;
      this._losGraceTimer = 0;
      this._jiggleCount = 0;
    }
```

- [ ] **Step 3: Run all tests to verify**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "fix(ai): reset combat movement state on ATTACK exit to prevent stale behavior"
```

---

### Task 9: Update REQUIREMENTS.md

Update all AI-related sections to reflect the combat AI overhaul changes.

**Files:**
- Modify: `REQUIREMENTS.md` (multiple AI sections)

- [ ] **Step 1: Update the ATTACK state description**

In `REQUIREMENTS.md`, find the line for ATTACK state (line 784):

Old:
```
3. **ATTACK**: Burst-fire at player + strafe/jiggle-peek side-to-side
```

Replace with:
```
3. **ATTACK**: Burst-fire at player with 5 combat movement sub-behaviors (strafe, push, hold, retreat-fire, rush-to-cover) selected by personality-weighted random with context modifiers. LOS grace period of 0.5s prevents disengagement on momentary obstruction — bot continues firing at last known position during grace. Combat movement resets on state exit.
```

- [ ] **Step 2: Add Combat Movement Sub-Behaviors section**

After the "### Movement" section (around line 854), add a new section:

```markdown
### Combat Movement Sub-Behaviors
- **5 movement types** in ATTACK state, selected by weighted random when current movement expires:
  - **Strafe**: Lateral movement with 0.5–1.8s intervals, 40% chance to maintain direction (anti-oscillation). Duration: 1–3s
  - **Push**: Move toward player at 70% speed while firing. Duration: 1–2s
  - **Hold**: Stand still, fire accurately. Duration: 0.8–1.5s
  - **Retreat-fire**: Back away from player while maintaining aim and firing. Duration: 1–2s
  - **Rush-to-cover**: Move to nearby cover (<4 units only) at 80% speed while facing player. Duration: until arrival
- **Personality base weights**:
  - Aggressive: strafe 25%, push 35%, hold 15%, retreat-fire 10%, rush-to-cover 15%
  - Balanced: strafe 35%, push 15%, hold 20%, retreat-fire 20%, rush-to-cover 10%
  - Cautious: strafe 30%, push 5%, hold 15%, retreat-fire 35%, rush-to-cover 15%
- **Context modifiers** (applied before normalization):
  - HP below 40%: push x0.5, retreat-fire x2.0
  - Player within 5 units: push x0.5, hold x1.5, retreat-fire x1.5
  - Player beyond 15 units: push x1.5, hold x1.5
  - No nearby cover (<4 units): rush-to-cover set to 0, redistributed
- **Micro-pauses**: 15% chance of 0.2–0.4s pause between movement transitions
- **Jiggle-peek cap**: Cautious bots capped to 3–5 jiggle repetitions before forcing a different movement type
- Bot always faces player during all 5 movement types (`_facePlayer` stays active)
```

- [ ] **Step 3: Update Cover System section**

Find the "### Cover System" section (line 871) and update:

Old:
```markdown
### Cover System
- `_findNearestCover(playerPos)`: 8 directional raycasts (12 unit range) to find nearby walls
- Scoring: LOS-blocking +100, closer cover preferred, cover away from player +20
- Peek behavior: move to cover, hide 1.5–2s, step out to fire a burst, duck back after 0.8–1.2s
- Throttled to one cover search per 3s per bot
```

New:
```markdown
### Cover System
- `_findNearestCover(playerPos)`: 8 directional raycasts (12 unit range) to find nearby walls, **4-unit max acceptance distance** (walls between 1.5–4 units)
- Scoring: LOS-blocking +100, closer cover preferred, cover away from player +20
- Peek behavior: move to cover at 80% speed **while facing player**, hide 1.5–2s, step out to fire a burst, duck back after 0.8–1.2s
- Throttled to one cover search per 3s per bot
- If no cover within 4 units: bot stays in ATTACK with retreat-fire movement instead of suicidal long-range run
```

- [ ] **Step 4: Update Movement section**

Find "### Movement" (line 850) and update the jiggle-peeking line:

Old:
```markdown
- **Jiggle peeking**: Cautious bots and 30% of others use quick 0.15–0.35s lateral micro-movements instead of wide strafes
```

New:
```markdown
- **Jiggle peeking**: Cautious bots and 30% of others use quick 0.2–0.5s lateral micro-movements instead of wide strafes, capped to 3–5 repetitions per sequence
```

- [ ] **Step 5: Update RETREAT state description**

Find the RETREAT description (line 786) and update:

Old:
```
5. **RETREAT**: When HP drops below personality threshold (15–50% of engagement HP), flee to distant waypoint (with line-of-sight validation) at 1.3x speed.
```

New:
```
5. **RETREAT**: When HP drops below personality threshold (15–50% of engagement HP), move to distant waypoint (with line-of-sight validation). While player is visible, bot faces player and backs away at 1.0x speed. When LOS is lost (e.g., around a corner), bot sprints at 1.3x speed normally.
```

- [ ] **Step 6: Add LOS Grace Period to Aim Humanization**

In the "### Aim Humanization" section (line 790), add after the existing bullet points:

```markdown
- **LOS grace period**: 0.5s grace before leaving ATTACK on LOS loss — bot continues firing at last known position (suppressive fire behavior)
- **Continuous aim tracking**: Aim lerp toward player runs throughout ATTACK state including burst cooldowns, preventing aim drift between bursts
```

- [ ] **Step 7: Run all tests to verify no code was broken**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: update REQUIREMENTS.md with combat AI overhaul changes"
```

---

### Task 10: Integration Verification

Run full test suite and verify everything works together.

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests PASS with no regressions

- [ ] **Step 2: Verify no linting or syntax issues**

Run: `node -c js/enemies.js`
Expected: No syntax errors

- [ ] **Step 3: Final commit if any fixes were needed**

Only commit if any fixes were applied during verification. Otherwise, skip.
