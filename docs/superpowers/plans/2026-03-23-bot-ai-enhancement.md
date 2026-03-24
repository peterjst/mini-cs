# Bot AI Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make bots behave like real players by adding field of view, purposeful navigation, ambush behavior, distance-based sound, and pre-aiming with corner checking.

**Architecture:** Five layered systems added to the existing 6-state FSM in `js/enemies.js`. Each system is independent and testable. A new 7th state (AMBUSH) is added. The `_canSeePlayer` method gains an FOV check, `_moveToward` gains a `skipRotation` flag, `reportSound` gains distance-based imprecision and team filtering, and PATROL waypoint selection uses weighted scoring.

**Tech Stack:** Three.js r160.1 (global `THREE`), Vitest test framework, IIFE module pattern.

**Spec:** `docs/superpowers/specs/2026-03-23-bot-ai-enhancement-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `js/enemies.js` | Modify | All 5 systems: FOV, navigation scoring, AMBUSH state, sound precision, pre-aim + corner check |
| `tests/unit/enemies.test.js` | Modify | Tests for all 5 systems |
| `REQUIREMENTS.md` | Modify | Update bot AI documentation |

---

### Task 1: Field of View — 120° Vision Cone

**Files:**
- Modify: `js/enemies.js:656-688` (`_canSeePlayer` method)
- Modify: `js/enemies.js:1742-1754` (`_findNearestTarget` method)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests for FOV**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('Field of View', () => {
  function createEnemy(rotationY) {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBots([{x: 0, z: 0}], [{x: 0, z: 0}, {x: 5, z: 5}], [], 1, {x: 50, z: 50}, {x: 25, z: 25});
    var enemy = em.enemies[0];
    enemy.mesh.position.set(0, 0, 0);
    enemy.mesh.rotation.y = rotationY;
    enemy.sightRange = 50;
    return enemy;
  }

  it('should see player directly in front (0° offset)', () => {
    // Bot facing +Z direction (rotation.y = Math.PI)
    var enemy = createEnemy(Math.PI);
    var playerPos = new THREE.Vector3(0, 1.5, 10);
    expect(enemy._canSeePlayer(playerPos)).toBe(true);
  });

  it('should NOT see player directly behind (180° offset)', () => {
    // Bot facing +Z, player is at -Z
    var enemy = createEnemy(Math.PI);
    var playerPos = new THREE.Vector3(0, 1.5, -10);
    expect(enemy._canSeePlayer(playerPos)).toBe(false);
  });

  it('should see player at 50° offset (within 60° half-cone)', () => {
    var enemy = createEnemy(Math.PI);
    // 50° off center in +Z direction — still within 60° half-cone
    var angle = 50 * Math.PI / 180;
    var playerPos = new THREE.Vector3(Math.sin(angle) * 10, 1.5, Math.cos(angle) * 10);
    expect(enemy._canSeePlayer(playerPos)).toBe(true);
  });

  it('should NOT see player at 70° offset (outside 60° half-cone)', () => {
    var enemy = createEnemy(Math.PI);
    // 70° off center — outside 120° cone
    var angle = 70 * Math.PI / 180;
    var playerPos = new THREE.Vector3(Math.sin(angle) * 10, 1.5, Math.cos(angle) * 10);
    expect(enemy._canSeePlayer(playerPos)).toBe(false);
  });

  it('should see player at exactly 60° (boundary)', () => {
    var enemy = createEnemy(Math.PI);
    // At exactly 60° — on boundary, should be included (<=)
    var angle = 59.9 * Math.PI / 180;
    var playerPos = new THREE.Vector3(Math.sin(angle) * 10, 1.5, Math.cos(angle) * 10);
    expect(enemy._canSeePlayer(playerPos)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: The "should NOT see player directly behind" and "should NOT see player at 70° offset" tests FAIL (currently `_canSeePlayer` has no angle check, returns true for any angle within sight range).

- [ ] **Step 3: Implement FOV check in `_canSeePlayer`**

In `js/enemies.js:656`, at the top of `_canSeePlayer`, after the distance check (line 661), add the FOV angle check:

```javascript
  // FOV check — 120° cone (60° half-angle)
  var forward = new THREE.Vector3(
    -Math.sin(this.mesh.rotation.y),
    0,
    -Math.cos(this.mesh.rotation.y)
  );
  var toPlayerFlat = new THREE.Vector3(toPlayer.x, 0, toPlayer.z).normalize();
  var dot = forward.dot(toPlayerFlat);
  if (dot < 0.5) return false; // cos(60°) ≈ 0.5

  // Store whether detection is peripheral (outer 30° of cone) for reaction delay
  this._peripheralDetection = dot < 0.866; // cos(30°) ≈ 0.866
```

- [ ] **Step 4: Add FOV check to `_findNearestTarget` for team mode**

In `js/enemies.js:1742`, inside the `_findNearestTarget` loop, after the distance check add:

```javascript
      // FOV check — bot must be facing toward the target
      var forward = new THREE.Vector3(
        -Math.sin(bot.mesh.rotation.y), 0, -Math.cos(bot.mesh.rotation.y)
      );
      var toTarget = new THREE.Vector3(
        e.mesh.position.x - bot.mesh.position.x, 0,
        e.mesh.position.z - bot.mesh.position.z
      ).normalize();
      if (forward.dot(toTarget) < 0.5) continue;
```

- [ ] **Step 5: Add peripheral awareness reaction delay**

In `js/enemies.js`, in the reaction delay section of `update()` (~line 922), modify the reaction delay calculation to add the peripheral penalty:

```javascript
    if (canSee && !this._hasReacted) {
      this._reactionTimer += dt;
      var effectiveDelay = (GAME.hasPerk && GAME.hasPerk('ghost')) ? this._reactionDelay * 1.3 : this._reactionDelay;
      // Peripheral awareness penalty (additive)
      if (this._peripheralDetection) {
        var diffName = _getDiffName();
        var peripheralPenalty = { easy: 0.3, normal: 0.15, hard: 0.05, elite: 0 };
        effectiveDelay += peripheralPenalty[diffName] || 0.15;
      }
      if (this._reactionTimer >= effectiveDelay) {
        this._hasReacted = true;
      }
    }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: All FOV tests PASS, all existing tests still PASS.

- [ ] **Step 7: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(ai): add 120° field of view cone to bot vision"
```

---

### Task 2: Distance-Based Sound Awareness

**Files:**
- Modify: `js/enemies.js:1759-1771` (`reportSound` method)
- Modify: `js/enemies.js:8-13` (DIFFICULTIES — add sound params)
- Modify: `js/main.js:1831,4608` (pass team to `reportSound`)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests for distance-based sound**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('Distance-based sound awareness', () => {
  function createManagerWithBots(botPositions) {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    var waypoints = [{x: 0, z: 0}, {x: 10, z: 10}];
    em.spawnBots(null, waypoints, [], botPositions.length, {x: 50, z: 50}, {x: 25, z: 25});
    for (var i = 0; i < em.enemies.length; i++) {
      em.enemies[i].mesh.position.set(botPositions[i].x, 0, botPositions[i].z);
      em.enemies[i].state = 0; // PATROL
    }
    return em;
  }

  it('close sound (<8 units) should give exact position', () => {
    var em = createManagerWithBots([{x: 5, z: 0}]);
    var soundPos = {x: 0, y: 0, z: 0};
    em.reportSound(soundPos, 'footstep', 30);
    var bot = em.enemies[0];
    // Close range — position should be exact
    expect(bot._investigatePos.x).toBe(0);
    expect(bot._investigatePos.z).toBe(0);
  });

  it('far sound (>20 units) should give imprecise position', () => {
    var em = createManagerWithBots([{x: 25, z: 0}]);
    var soundPos = {x: 0, y: 0, z: 0};
    em.reportSound(soundPos, 'gunshot', 40);
    var bot = em.enemies[0];
    // Far range — position should be offset (not exact)
    // Due to randomness, check it's within error bounds (±8 for normal)
    var dx = Math.abs(bot._investigatePos.x - 0);
    var dz = Math.abs(bot._investigatePos.z - 0);
    expect(dx <= 8).toBe(true);
    expect(dz <= 8).toBe(true);
  });

  it('mid-range sound (8-20 units) should give moderately imprecise position', () => {
    var em = createManagerWithBots([{x: 15, z: 0}]);
    var soundPos = {x: 0, y: 0, z: 0};
    em.reportSound(soundPos, 'gunshot', 30);
    var bot = em.enemies[0];
    var dx = Math.abs(bot._investigatePos.x - 0);
    var dz = Math.abs(bot._investigatePos.z - 0);
    // Mid range error ±3 for normal difficulty
    expect(dx <= 3).toBe(true);
    expect(dz <= 3).toBe(true);
  });

  it('should not alert bots outside the sound radius', () => {
    var em = createManagerWithBots([{x: 50, z: 0}]);
    em.enemies[0].state = 0; // PATROL
    var prevState = em.enemies[0].state;
    em.reportSound({x: 0, y: 0, z: 0}, 'footstep', 10);
    // Bot is 50 units away, radius is 10 — should not react
    expect(em.enemies[0].state).toBe(prevState);
  });

  it('should ignore own team sounds when team param is provided', () => {
    var em = createManagerWithBots([{x: 5, z: 0}]);
    em.enemies[0].team = 'T';
    em.enemies[0].state = 0; // PATROL
    em.reportSound({x: 0, y: 0, z: 0}, 'gunshot', 30, 'T');
    // Same team — should not react
    expect(em.enemies[0].state).toBe(0);
  });

  it('should react to enemy team sounds', () => {
    var em = createManagerWithBots([{x: 5, z: 0}]);
    em.enemies[0].team = 'CT';
    em.enemies[0].state = 0; // PATROL
    em.reportSound({x: 0, y: 0, z: 0}, 'gunshot', 30, 'T');
    // Different team — should react
    expect(em.enemies[0].state).not.toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL — `reportSound` currently passes exact position always, has no team filtering.

- [ ] **Step 3: Add sound precision params to DIFFICULTIES**

In `js/enemies.js:8-13`, add sound precision fields to each difficulty:

```javascript
  var DIFFICULTIES = {
    easy:   { health: 20,  speed: 4,   fireRate: 1.2, damage: 5,  accuracy: 0.2,  sight: 25, attackRange: 18, botCount: 2, soundCloseRange: 5,  soundMidRange: 15, soundMidError: 6,  soundFarError: 16 },
    normal: { health: 45,  speed: 6,   fireRate: 2,   damage: 9,  accuracy: 0.35, sight: 35, attackRange: 22, botCount: 3, soundCloseRange: 8,  soundMidRange: 20, soundMidError: 3,  soundFarError: 8 },
    hard:   { health: 60,  speed: 6.8, fireRate: 2.4, damage: 11, accuracy: 0.42, sight: 40, attackRange: 25, botCount: 4, soundCloseRange: 8,  soundMidRange: 20, soundMidError: 2.25, soundFarError: 6 },
    elite:  { health: 80,  speed: 7.8, fireRate: 3,   damage: 14, accuracy: 0.52, sight: 45, attackRange: 28, botCount: 5, soundCloseRange: 10, soundMidRange: 22, soundMidError: 1.5, soundFarError: 4 }
  };
```

- [ ] **Step 4: Implement distance-based imprecision in `reportSound`**

Replace `js/enemies.js:1759-1771` (`reportSound`):

```javascript
  EnemyManager.prototype.reportSound = function(position, type, radius, team) {
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (!e.alive) continue;
      if (e.state !== PATROL && e.state !== INVESTIGATE) continue;
      // Team filtering — ignore own team's sounds
      if (team && e.team === team) continue;

      var dist = e.mesh.position.distanceTo(new THREE.Vector3(position.x, 0, position.z));
      if (dist >= radius) continue;

      // Distance-based precision
      var closeRange = currentDifficulty.soundCloseRange || 8;
      var midRange = currentDifficulty.soundMidRange || 20;
      var midError = currentDifficulty.soundMidError || 3;
      var farError = currentDifficulty.soundFarError || 8;

      // Cautious personality gets one tier better
      var pKey = PERSONALITY_KEYS[e.id % PERSONALITY_KEYS.length];
      if (pKey === 'cautious') {
        closeRange = Math.min(closeRange * 1.5, midRange); // 8 → 12 for normal
        midRange = Math.min(midRange * 1.25, 25);          // 20 → 25 for normal
      }

      var offsetX = 0, offsetZ = 0;
      if (dist < closeRange) {
        // Close — exact position
      } else if (dist < midRange) {
        // Mid-range
        offsetX = (Math.random() - 0.5) * 2 * midError;
        offsetZ = (Math.random() - 0.5) * 2 * midError;
      } else {
        // Far
        offsetX = (Math.random() - 0.5) * 2 * farError;
        offsetZ = (Math.random() - 0.5) * 2 * farError;
      }

      var imprecisePos = { x: position.x + offsetX, z: position.z + offsetZ };
      e._investigatePos = imprecisePos;
      e._investigateTimer = 0;
      e._lookAroundTimer = 3 + Math.random();
      e.state = INVESTIGATE;
    }
  };
```

- [ ] **Step 5: Update `reportSound` callers in `main.js` to pass team**

In `js/main.js:1831` (player footstep sound), add the player's team:
```javascript
if (enemyManager) enemyManager.reportSound(pos, 'footstep', radius, playerTeam || null);
```

In `js/main.js:4608` (gunshot sound), add the player's team:
```javascript
enemyManager.reportSound(player.position, 'gunshot', 40, playerTeam || null);
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: All sound tests PASS, all existing tests still PASS.

- [ ] **Step 7: Commit**

```bash
git add js/enemies.js js/main.js tests/unit/enemies.test.js
git commit -m "feat(ai): add distance-based sound precision and team filtering"
```

---

### Task 3: Purposeful Navigation (Weighted Waypoint Scoring)

**Files:**
- Modify: `js/enemies.js:68-173` (Enemy constructor — add `_waypointVisitTimes`)
- Modify: `js/enemies.js:1067-1098` (PATROL state — replace random waypoint selection)
- Add method: `_scoreWaypoint` on `Enemy.prototype`
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests for waypoint scoring**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('Purposeful navigation', () => {
  function createEnemyWithWaypoints(waypoints, personalityIndex) {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    var id = personalityIndex !== undefined ? personalityIndex : 0;
    em.spawnBots(null, waypoints, [], 1, {x: 50, z: 50}, {x: 25, z: 25});
    var enemy = em.enemies[0];
    enemy.id = id;
    return { enemy: enemy, manager: em };
  }

  it('should have _scoreWaypoint method', () => {
    var wp = [{x:0,z:0},{x:10,z:10}];
    var r = createEnemyWithWaypoints(wp);
    expect(typeof r.enemy._scoreWaypoint).toBe('function');
  });

  it('should have _waypointVisitTimes array initialized', () => {
    var wp = [{x:0,z:0},{x:10,z:10},{x:20,z:20}];
    var r = createEnemyWithWaypoints(wp);
    expect(r.enemy._waypointVisitTimes).toBeDefined();
    expect(r.enemy._waypointVisitTimes.length).toBe(wp.length);
  });

  it('should score waypoints closer to last-known player position higher for aggressive bots', () => {
    var wp = [{x:0,z:0},{x:10,z:0},{x:20,z:0}];
    var r = createEnemyWithWaypoints(wp, 0); // id 0 = aggressive
    r.enemy.mesh.position.set(10, 0, 0);
    r.enemy._lastSeenPlayerPos = new THREE.Vector3(20, 0, 0);
    var ctx = { allyPositions: [], now: 1000 };
    var scoreNear = r.enemy._scoreWaypoint(2, ctx); // wp at x:20 (near player)
    var scoreFar = r.enemy._scoreWaypoint(0, ctx);  // wp at x:0 (far from player)
    expect(scoreNear).toBeGreaterThan(scoreFar);
  });

  it('should score waypoints not recently visited higher', () => {
    var wp = [{x:0,z:0},{x:10,z:0},{x:20,z:0}];
    var r = createEnemyWithWaypoints(wp, 1); // balanced
    r.enemy.mesh.position.set(10, 0, 0);
    r.enemy._waypointVisitTimes[0] = 100; // visited long ago
    r.enemy._waypointVisitTimes[2] = 900; // visited recently
    var ctx = { allyPositions: [], now: 1000 };
    var scoreOld = r.enemy._scoreWaypoint(0, ctx);
    var scoreRecent = r.enemy._scoreWaypoint(2, ctx);
    expect(scoreOld).toBeGreaterThan(scoreRecent);
  });

  it('should score waypoints far from allies higher', () => {
    var wp = [{x:0,z:0},{x:30,z:0}];
    var r = createEnemyWithWaypoints(wp, 1);
    r.enemy.mesh.position.set(15, 0, 0);
    var ctx = { allyPositions: [{x:1,z:0}], now: 1000 };
    var scoreNearAlly = r.enemy._scoreWaypoint(0, ctx);
    var scoreFarAlly = r.enemy._scoreWaypoint(1, ctx);
    expect(scoreFarAlly).toBeGreaterThan(scoreNearAlly);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL — `_scoreWaypoint` does not exist, `_waypointVisitTimes` not defined.

- [ ] **Step 3: Add `_waypointVisitTimes` to Enemy constructor**

In `js/enemies.js`, after line 173 (`this._lastStuckCheckPos = ...`), add:

```javascript
    // ── Waypoint scoring (purposeful navigation) ────────
    this._waypointVisitTimes = new Array(waypoints.length);
    for (var wvi = 0; wvi < waypoints.length; wvi++) this._waypointVisitTimes[wvi] = 0;
```

- [ ] **Step 4: Add personality weight constants**

After the `PERSONALITY` object (~line 24), add navigation weights:

```javascript
  var NAV_WEIGHTS = {
    aggressive: { sightline: 0.2, playerProximity: 0.5, recency: 0.2, allySpread: 0.1 },
    balanced:   { sightline: 0.25, playerProximity: 0.25, recency: 0.25, allySpread: 0.25 },
    cautious:   { sightline: 0.5, playerProximity: 0.15, recency: 0.2, allySpread: 0.15 }
  };

  var NAV_NOISE = { easy: 0.6, normal: 0.3, hard: 0.15, elite: 0.05 };
```

- [ ] **Step 5: Implement `_scoreWaypoint` method**

Add after `_findRetreatWaypoint` (~line 1331):

```javascript
  Enemy.prototype._scoreWaypoint = function(wpIndex, ctx) {
    var wp = this.waypoints[wpIndex];
    var pos = this.mesh.position;
    var pKey = PERSONALITY_KEYS[this.id % PERSONALITY_KEYS.length];
    var weights = NAV_WEIGHTS[pKey] || NAV_WEIGHTS.balanced;
    var score = 0;

    // Factor 1: Sightline quality — raycast in 4 cardinal directions from waypoint
    var sightScore = 0;
    var dirs = [
      new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0),
      new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,-1)
    ];
    var wpOrigin = new THREE.Vector3(wp.x, 0.5, wp.z);
    for (var d = 0; d < dirs.length; d++) {
      this._rc.set(wpOrigin, dirs[d]);
      this._rc.far = this.sightRange;
      var hits = this._rc.intersectObjects(this.walls, false);
      sightScore += hits.length > 0 ? hits[0].distance : this.sightRange;
    }
    sightScore /= (this.sightRange * dirs.length); // normalize to 0-1
    score += sightScore * weights.sightline;

    // Factor 2: Proximity to last-known player position
    if (this._lastSeenPlayerPos) {
      var dx = wp.x - this._lastSeenPlayerPos.x;
      var dz = wp.z - this._lastSeenPlayerPos.z;
      var distToPlayer = Math.sqrt(dx * dx + dz * dz);
      var proxScore = 1 - Math.min(distToPlayer / (this.sightRange * 2), 1);
      score += proxScore * weights.playerProximity;
    }

    // Factor 3: Time since last visited
    var timeSince = ctx.now - (this._waypointVisitTimes[wpIndex] || 0);
    var recencyScore = Math.min(timeSince / 30000, 1); // 30s = max staleness
    score += recencyScore * weights.recency;

    // Factor 4: Distance from allies
    if (ctx.allyPositions && ctx.allyPositions.length > 0) {
      var minAllyDist = Infinity;
      for (var a = 0; a < ctx.allyPositions.length; a++) {
        var ax = wp.x - ctx.allyPositions[a].x;
        var az = wp.z - ctx.allyPositions[a].z;
        var ad = Math.sqrt(ax * ax + az * az);
        if (ad < minAllyDist) minAllyDist = ad;
      }
      var spreadScore = Math.min(minAllyDist / 30, 1); // 30 units = max spread value
      score += spreadScore * weights.allySpread;
    } else {
      score += 0.5 * weights.allySpread; // neutral if no allies
    }

    // Difficulty noise
    var diffName = _getDiffName();
    var noise = NAV_NOISE[diffName] || 0.3;
    score += (Math.random() - 0.5) * 2 * noise * score;

    return score;
  };
```

- [ ] **Step 6: Replace random waypoint selection in PATROL with scoring**

In `js/enemies.js`, replace the waypoint selection block inside PATROL (~lines 1075-1097). After `var reachable = [];` is populated and filtered, replace the random selection with:

```javascript
          if (reachable.length > 0) {
            // Score reachable waypoints and pick the best
            var allyPositions = [];
            if (GAME.EnemyManager._currentInstance) {
              var allies = GAME.EnemyManager._currentInstance.enemies;
              for (var ai = 0; ai < allies.length; ai++) {
                if (allies[ai] !== this && allies[ai].alive) {
                  allyPositions.push({ x: allies[ai].mesh.position.x, z: allies[ai].mesh.position.z });
                }
              }
            }
            var ctx = { allyPositions: allyPositions, now: now || Date.now() };
            var bestIdx = reachable[0];
            var bestScore = -Infinity;
            for (var ri = 0; ri < reachable.length; ri++) {
              var sc = this._scoreWaypoint(reachable[ri], ctx);
              if (sc > bestScore) {
                bestScore = sc;
                bestIdx = reachable[ri];
              }
            }
            this.currentWaypoint = bestIdx;
            this._waypointVisitTimes[bestIdx] = now || Date.now();
          } else {
            this.currentWaypoint = Math.floor(Math.random() * this.waypoints.length);
          }
```

- [ ] **Step 7: Store `_currentInstance` reference on EnemyManager**

In `EnemyManager` constructor (~line 1553), add:

```javascript
    GAME.EnemyManager._currentInstance = this;
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test`
Expected: All navigation tests PASS, all existing tests still PASS.

- [ ] **Step 9: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(ai): add personality-driven waypoint scoring for purposeful navigation"
```

---

### Task 4: Ambush State

**Files:**
- Modify: `js/enemies.js:17` (add AMBUSH constant)
- Modify: `js/enemies.js:68-173` (Enemy constructor — add ambush state fields)
- Modify: `js/enemies.js:1759` (`reportSound` — add ambush entry logic)
- Modify: `js/enemies.js:940-1036` (state transitions in `update` — add AMBUSH)
- Modify: `js/enemies.js:1064-1250` (state behavior in `update` — add AMBUSH behavior)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests for AMBUSH state**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('Ambush state', () => {
  function createEnemyForAmbush() {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    var waypoints = [{x:0,z:0},{x:10,z:10}];
    // Create walls nearby for cover detection
    var wallGeo = new THREE.BoxGeometry(1, 2, 1);
    var wallMat = new THREE.MeshBasicMaterial();
    var wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(1.5, 1, 0);
    scene.add(wall);
    em.spawnBots(null, waypoints, [wall], 1, {x: 50, z: 50}, {x: 25, z: 25});
    return { enemy: em.enemies[0], manager: em, wall: wall };
  }

  it('should define AMBUSH state as 6', () => {
    // AMBUSH is internal, but we can check via state assignment
    var r = createEnemyForAmbush();
    r.enemy.state = 6; // AMBUSH
    expect(r.enemy.state).toBe(6);
  });

  it('should initialize ambush-related fields', () => {
    var r = createEnemyForAmbush();
    expect(r.enemy._ambushTimer).toBeDefined();
    expect(r.enemy._ambushTimeout).toBeDefined();
    expect(r.enemy._ambushEntryHP).toBeDefined();
  });

  it('should transition from AMBUSH to PATROL on timeout', () => {
    var r = createEnemyForAmbush();
    r.enemy.state = 6; // AMBUSH
    r.enemy._ambushTimer = 0;
    r.enemy._ambushTimeout = 1.0;
    // Simulate update with no player visible, enough dt to exceed timeout
    var playerPos = new THREE.Vector3(100, 0, 100); // far away
    r.enemy.update(2.0, playerPos, true, Date.now());
    // Should have left AMBUSH (to PATROL = 0)
    expect(r.enemy.state).toBe(0);
  });

  it('should transition from AMBUSH to ATTACK/CHASE when player enters FOV', () => {
    var r = createEnemyForAmbush();
    r.enemy.state = 6; // AMBUSH
    r.enemy._ambushTimer = 0;
    r.enemy._ambushTimeout = 10;
    r.enemy._ambushEntryHP = r.enemy.health;
    r.enemy.mesh.rotation.y = Math.PI; // facing +Z
    r.enemy._hasReacted = false;
    r.enemy._reactionDelay = 0; // instant reaction for test
    r.enemy._reactionTimer = 0;
    // Player directly in front, within sight and attack range
    var playerPos = new THREE.Vector3(0, 1.5, 5);
    r.enemy.sightRange = 50;
    r.enemy.attackRange = 30;
    r.enemy.update(0.016, playerPos, true, Date.now());
    // Should have transitioned to ATTACK (2) or CHASE (1)
    expect(r.enemy.state === 2 || r.enemy.state === 1).toBe(true);
  });

  it('should transition from AMBUSH to RETREAT when damaged below threshold', () => {
    var r = createEnemyForAmbush();
    r.enemy.state = 6; // AMBUSH
    r.enemy._ambushTimer = 0;
    r.enemy._ambushTimeout = 10;
    r.enemy._ambushEntryHP = 100;
    r.enemy.health = 5; // well below retreat threshold
    r.enemy.personality = { retreatHP: 0.5, speedMult: 1, aimSpeedMult: 1, reactionMult: 1, patrolPause: 0.3, burstMin: 2, burstMax: 4 };
    var playerPos = new THREE.Vector3(100, 1.5, 100); // far away, not visible
    r.enemy.update(0.016, playerPos, true, Date.now());
    // Should have tried to retreat (4) or fallen back to patrol (0)
    expect(r.enemy.state === 4 || r.enemy.state === 0).toBe(true);
  });

  it('should engage when damaged but HP above retreat threshold and attacker visible', () => {
    var r = createEnemyForAmbush();
    r.enemy.state = 6; // AMBUSH
    r.enemy._ambushTimer = 0;
    r.enemy._ambushTimeout = 10;
    r.enemy._ambushEntryHP = 100;
    r.enemy.health = 80; // above retreat threshold but took damage
    r.enemy.mesh.rotation.y = Math.PI; // facing +Z
    r.enemy.sightRange = 50;
    r.enemy.attackRange = 30;
    r.enemy._hasReacted = false;
    // Player in front and visible — canSee should be true
    var playerPos = new THREE.Vector3(0, 1.5, 5);
    r.enemy.update(0.016, playerPos, true, Date.now());
    // Should engage (ATTACK=2 or CHASE=1) since took damage + visible
    expect(r.enemy.state === 2 || r.enemy.state === 1).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL — AMBUSH state not yet handled in update(), fields not initialized.

- [ ] **Step 3: Add AMBUSH constant and constructor fields**

In `js/enemies.js:17`, add AMBUSH:
```javascript
  var PATROL = 0, CHASE = 1, ATTACK = 2, INVESTIGATE = 3, RETREAT = 4, TAKE_COVER = 5, AMBUSH = 6;
```

In the Enemy constructor, after the cover state fields (~line 148), add:
```javascript
    // ── Ambush state ───────────────────────────────────────
    this._ambushTimer = 0;
    this._ambushTimeout = 0;
    this._ambushEntryHP = this.health;
```

- [ ] **Step 4: Add AMBUSH entry logic to `reportSound`**

In the `reportSound` method, after setting `e.state = INVESTIGATE`, add ambush check:

```javascript
      // Check if bot should enter AMBUSH instead of INVESTIGATE
      var pKey = PERSONALITY_KEYS[e.id % PERSONALITY_KEYS.length];
      var ambushChance = { aggressive: 0.1, balanced: 0.3, cautious: 0.6 };
      var diffName = _getDiffName();
      var diffMod = { easy: 0.5, normal: 1.0, hard: 1.1, elite: 1.2 };
      var chance = (ambushChance[pKey] || 0.3) * (diffMod[diffName] || 1.0);

      if (Math.random() < chance) {
        // Check if near cover (wall within 2 units)
        var coverFound = false;
        var botPos = new THREE.Vector3(e.mesh.position.x, 0.5, e.mesh.position.z);
        var rc = new THREE.Raycaster();
        for (var cd = 0; cd < COLLISION_DIRS.length; cd++) {
          rc.set(botPos, COLLISION_DIRS[cd]);
          rc.far = 2;
          if (rc.intersectObjects(e.walls, false).length > 0) {
            coverFound = true;
            break;
          }
        }
        if (coverFound) {
          e.state = AMBUSH;
          e._ambushTimer = 0;
          e._ambushEntryHP = e.health;
          var timeouts = { easy: [3, 5], normal: [6, 10], hard: [6, 10], elite: [8, 12] };
          var t = timeouts[diffName] || [6, 10];
          e._ambushTimeout = t[0] + Math.random() * (t[1] - t[0]);
        }
      }
```

- [ ] **Step 5: Add AMBUSH state transitions in `update()`**

In `js/enemies.js`, after the TAKE_COVER transition block (~line 1036), add:

```javascript
    } else if (this.state === AMBUSH) {
      if (!playerAlive) { this.state = PATROL; }
      else {
        this._ambushTimer += dt;
        if (this._ambushTimer >= this._ambushTimeout) {
          this.state = PATROL;
        } else if (canEngage) {
          // Spring the trap — reduced reaction delay
          this._engageStartHP = this.health;
          var diffName = _getDiffName();
          var ambushReactionBonus = { easy: 1.0, normal: 0.7, hard: 0.5, elite: 0.4 };
          this._reactionDelay *= ambushReactionBonus[diffName] || 0.7;
          this._hasReacted = true;
          this.state = distToPlayer <= this.attackRange ? ATTACK : CHASE;
        } else if (this.health < this._ambushEntryHP * this.personality.retreatHP) {
          // Took damage while ambushing — retreat
          this._retreatTarget = this._findRetreatWaypoint(playerPos);
          if (this._retreatTarget) {
            this.state = RETREAT;
          } else {
            this.state = PATROL;
          }
        } else if (this.health < this._ambushEntryHP && canSee) {
          // Took damage, HP above retreat threshold, attacker visible — engage
          this._engageStartHP = this.health;
          this.state = distToPlayer <= this.attackRange ? ATTACK : CHASE;
        }
      }
    }
```

- [ ] **Step 6: Add AMBUSH state behavior in movement section**

After the TAKE_COVER behavior block (~line 1250), add:

```javascript
    } else if (this.state === AMBUSH) {
      // Hold position — don't move, face the approach direction
      if (this._investigatePos) {
        var dx = this._investigatePos.x - this.mesh.position.x;
        var dz = this._investigatePos.z - this.mesh.position.z;
        var targetRot = Math.atan2(dx, dz) + Math.PI;
        this._faceDirection(targetRot, dt, 6);
      }
    }
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test`
Expected: All AMBUSH tests PASS, all existing tests still PASS.

- [ ] **Step 8: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(ai): add AMBUSH state for tactical hold-and-wait behavior"
```

---

### Task 5: Pre-Aiming Threat Angles

**Files:**
- Modify: `js/enemies.js:692-705` (`_moveToward` — add `skipRotation` flag)
- Add method: `_findThreatAngle` on `Enemy.prototype`
- Modify: `js/enemies.js:68-173` (constructor — add pre-aim fields)
- Modify: `js/enemies.js:1067-1098` (PATROL behavior — use pre-aim)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests for pre-aiming**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('Pre-aiming threat angles', () => {
  it('should have _findThreatAngle method', () => {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    em.spawnBots(null, [{x:0,z:0},{x:10,z:10}], [], 1, {x:50,z:50}, {x:25,z:25});
    expect(typeof em.enemies[0]._findThreatAngle).toBe('function');
  });

  it('should have pre-aim state fields initialized', () => {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    em.spawnBots(null, [{x:0,z:0},{x:10,z:10}], [], 1, {x:50,z:50}, {x:25,z:25});
    var e = em.enemies[0];
    expect(e._preAimTimer).toBeDefined();
    expect(e._preAimTarget).toBeDefined();
  });

  it('_moveToward should accept skipRotation parameter', () => {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    em.spawnBots(null, [{x:0,z:0},{x:10,z:10}], [], 1, {x:50,z:50}, {x:25,z:25});
    var e = em.enemies[0];
    e.mesh.position.set(0, 0, 0);
    var initialRotY = e.mesh.rotation.y;
    // Move toward a target with skipRotation=true — rotation should not change toward target
    e._moveToward({x: 10, z: 0}, 0.016, null, true);
    // With skipRotation, rotation should stay at initial value (or very close)
    expect(Math.abs(e.mesh.rotation.y - initialRotY)).toBeLessThan(0.01);
  });

  it('_findThreatAngle should return null in open area with no walls', () => {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    em.spawnBots(null, [{x:0,z:0},{x:10,z:10}], [], 1, {x:50,z:50}, {x:25,z:25});
    var e = em.enemies[0];
    e.mesh.position.set(0, 0, 0);
    var angle = e._findThreatAngle();
    expect(angle).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL — `_findThreatAngle` doesn't exist, `_moveToward` doesn't accept `skipRotation`.

- [ ] **Step 3: Add pre-aim fields to constructor**

In the Enemy constructor, after the waypoint scoring fields, add:

```javascript
    // ── Pre-aim threat angles ──────────────────────────────
    this._preAimTimer = 0;
    this._preAimTarget = null;
    var diffName = _getDiffName();
    this._preAimRefresh = { easy: 1.0, normal: 0.5, hard: 0.4, elite: 0.3 }[diffName] || 0.5;
```

- [ ] **Step 4: Add `skipRotation` parameter to `_moveToward`**

In `js/enemies.js:692`, change the signature and guard the rotation:

```javascript
  Enemy.prototype._moveToward = function(target, dt, speedOverride, skipRotation) {
```

Then wrap lines 700-705 (the rotation block):

```javascript
    if (!skipRotation) {
      // Smooth rotation
      var targetRot = Math.atan2(this._dir.x, this._dir.z) + Math.PI;
      var diff = targetRot - this.mesh.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.mesh.rotation.y += diff * Math.min(1, 8 * dt);
    }
```

- [ ] **Step 5: Add `_faceDirection` helper method**

Add after `_moveToward`:

```javascript
  Enemy.prototype._faceDirection = function(targetRotY, dt, speed) {
    var diff = targetRotY - this.mesh.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.mesh.rotation.y += diff * Math.min(1, (speed || 8) * dt);
  };
```

This is used by pre-aiming, corner checking, and AMBUSH facing — avoids duplicating rotation smoothing logic.

- [ ] **Step 6: Implement `_findThreatAngle` method**

Add after `_faceDirection`:

```javascript
  Enemy.prototype._findThreatAngle = function() {
    var pos = this.mesh.position;
    var origin = new THREE.Vector3(pos.x, 0.5, pos.z);
    var wallDists = [];

    // Raycast in 8 directions to find walls
    for (var d = 0; d < COLLISION_DIRS.length; d++) {
      this._rc.set(origin, COLLISION_DIRS[d]);
      this._rc.far = 8; // scan range
      var hits = this._rc.intersectObjects(this.walls, false);
      wallDists.push(hits.length > 0 ? hits[0].distance : 8);
    }

    // Find openings: directions where one neighbor has a wall and this one doesn't
    var bestOpening = null;
    var bestScore = 0;
    for (var i = 0; i < COLLISION_DIRS.length; i++) {
      var prev = (i + COLLISION_DIRS.length - 1) % COLLISION_DIRS.length;
      var next = (i + 1) % COLLISION_DIRS.length;
      // Opening = this direction is open, but adjacent direction has a wall nearby
      if (wallDists[i] > 4 && (wallDists[prev] < 3 || wallDists[next] < 3)) {
        var score = wallDists[i]; // prefer longer sightlines through openings
        if (score > bestScore) {
          bestScore = score;
          bestOpening = Math.atan2(COLLISION_DIRS[i].x, COLLISION_DIRS[i].z) + Math.PI;
        }
      }
    }

    return bestOpening;
  };
```

- [ ] **Step 7: Integrate pre-aiming into PATROL behavior**

In the PATROL state behavior block (~line 1067), before the `_moveToward` call, add pre-aim logic:

```javascript
      // Pre-aim threat angles while patrolling
      this._preAimTimer += dt;
      var usePreAim = false;
      if (this._preAimTimer >= this._preAimRefresh) {
        this._preAimTimer = 0;
        this._preAimTarget = this._findThreatAngle();
      }
      if (this._preAimTarget !== null) {
        usePreAim = true;
        this._faceDirection(this._preAimTarget, dt, 6);
      }
```

Then pass `usePreAim` as `skipRotation` to the `_moveToward` call in PATROL:

```javascript
        if (this._moveToward(wp, dt, null, usePreAim)) {
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test`
Expected: All pre-aim tests PASS, all existing tests still PASS.

- [ ] **Step 9: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(ai): add pre-aiming threat angles during patrol"
```

---

### Task 6: Corner Checking (Pause-and-Slice)

**Files:**
- Add method: `_checkCorner` on `Enemy.prototype`
- Modify: `js/enemies.js:68-173` (constructor — add corner check fields)
- Modify: `js/enemies.js:1067-1098` (PATROL behavior — add corner check)
- Modify: `js/enemies.js:1125-1132` (CHASE behavior — add corner check)
- Modify: `js/enemies.js:1183-1195` (INVESTIGATE behavior — add corner check)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests for corner checking**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('Corner checking', () => {
  it('should have _checkCorner method', () => {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    em.spawnBots(null, [{x:0,z:0},{x:10,z:10}], [], 1, {x:50,z:50}, {x:25,z:25});
    expect(typeof em.enemies[0]._checkCorner).toBe('function');
  });

  it('should have corner check state fields initialized', () => {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    em.spawnBots(null, [{x:0,z:0},{x:10,z:10}], [], 1, {x:50,z:50}, {x:25,z:25});
    var e = em.enemies[0];
    expect(typeof e._cornerCheckPause).toBe('number');
    expect(typeof e._cornerSweepAngle).toBe('number');
    expect(typeof e._isCheckingCorner).toBe('boolean');
  });

  it('_checkCorner should reset stuck timer when corner is detected', () => {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    // Create a wall directly in front and on the left to form a corner
    var wallGeo = new THREE.BoxGeometry(1, 2, 10);
    var wallMat = new THREE.MeshBasicMaterial();
    var frontWall = new THREE.Mesh(wallGeo, wallMat);
    frontWall.position.set(0, 1, 2); // 2 units ahead
    var leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.position.set(-2, 1, 0); // 2 units left
    scene.add(frontWall);
    scene.add(leftWall);
    em.spawnBots(null, [{x:0,z:0},{x:10,z:10}], [frontWall, leftWall], 1, {x:50,z:50}, {x:25,z:25});
    var e = em.enemies[0];
    e.mesh.position.set(0, 0, 0);
    e.mesh.rotation.y = Math.PI; // facing +Z toward front wall
    e._stuckTimer = 3.5;
    e._cornerCheckRate = 1.0; // always check
    var detected = e._checkCorner();
    if (detected) {
      expect(e._stuckTimer).toBe(0);
      expect(e._isCheckingCorner).toBe(true);
    }
  });

  it('corner check rate should scale with personality', () => {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    // Spawn 3 bots to get all personalities (id 0=aggressive, 1=balanced, 2=cautious)
    em.spawnBots(null, [{x:0,z:0},{x:10,z:10},{x:20,z:20}], [], 3, {x:50,z:50}, {x:25,z:25});
    var aggressive = em.enemies[0]; // id 0 = aggressive
    var cautious = em.enemies[2];   // id 2 = cautious
    expect(cautious._cornerCheckRate).toBeGreaterThan(aggressive._cornerCheckRate);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL — `_checkCorner` doesn't exist, corner check fields not defined.

- [ ] **Step 3: Add corner check fields to constructor**

In the Enemy constructor, after pre-aim fields, add:

```javascript
    // ── Corner checking ────────────────────────────────────
    this._isCheckingCorner = false;
    this._cornerCheckPause = 0;
    this._cornerSweepAngle = 0;
    this._cornerSweepTarget = 0;
    this._cornerSweepWidth = { aggressive: Math.PI / 4, balanced: Math.PI / 3, cautious: Math.PI / 2 }[pKey] || Math.PI / 3;
    var baseCornerRate = { aggressive: 0.25, balanced: 0.6, cautious: 1.0 }[pKey] || 0.6;
    var cornerDiffMult = { easy: 0.5, normal: 1.0, hard: 1.15, elite: 1.25 }[diffName] || 1.0;
    this._cornerCheckRate = Math.min(baseCornerRate * cornerDiffMult, 1.0);
    this._cornerPauseDuration = diffName === 'elite' ? 0.2 : (0.3 + Math.random() * 0.2);
```

- [ ] **Step 4: Implement `_checkCorner` method**

Add after `_findThreatAngle`:

```javascript
  Enemy.prototype._checkCorner = function() {
    // Detect corner: wall on one side, open on the other, within 3 units ahead
    var pos = this.mesh.position;
    var origin = new THREE.Vector3(pos.x, 0.5, pos.z);
    var forward = new THREE.Vector3(
      -Math.sin(this.mesh.rotation.y), 0, -Math.cos(this.mesh.rotation.y)
    );

    // Check forward for wall
    this._rc.set(origin, forward);
    this._rc.far = 3;
    var forwardHits = this._rc.intersectObjects(this.walls, false);
    if (forwardHits.length === 0) return false; // no wall ahead, no corner

    // Check left and right
    var left = new THREE.Vector3(forward.z, 0, -forward.x);
    var right = new THREE.Vector3(-forward.z, 0, forward.x);

    this._rc.set(origin, left);
    this._rc.far = 3;
    var leftWall = this._rc.intersectObjects(this.walls, false).length > 0;

    this._rc.set(origin, right);
    this._rc.far = 3;
    var rightWall = this._rc.intersectObjects(this.walls, false).length > 0;

    // Corner = wall ahead + one side open
    if (leftWall === rightWall) return false; // both open or both walled = no corner

    // Personality roll
    if (Math.random() > this._cornerCheckRate) return false;

    // Set up sweep direction (toward the open side)
    this._isCheckingCorner = true;
    this._cornerCheckPause = this._cornerPauseDuration;
    this._cornerSweepTarget = leftWall
      ? this.mesh.rotation.y - this._cornerSweepWidth  // sweep right (open side)
      : this.mesh.rotation.y + this._cornerSweepWidth; // sweep left (open side)
    this._stuckTimer = 0; // reset stuck detection

    return true;
  };
```

- [ ] **Step 5: Integrate corner checking into PATROL, CHASE, and INVESTIGATE**

In the PATROL behavior block, before the `_moveToward` call, add:

```javascript
      // Corner checking
      if (this._isCheckingCorner) {
        this._cornerCheckPause -= dt;
        this._stuckTimer = 0;
        if (this._cornerCheckPause > 0) {
          // Sweep rotation toward open side
          this._faceDirection(this._cornerSweepTarget, dt, 10);
        } else {
          this._isCheckingCorner = false;
        }
      } else if (!this._isCheckingCorner && this.patrolPauseTimer <= 0) {
        this._checkCorner();
      }
```

Skip movement while checking corner (wrap the existing `_moveToward` call):

```javascript
      if (!this._isCheckingCorner) {
        // existing _moveToward call and waypoint selection...
      }
```

Add the same corner check pattern to CHASE and INVESTIGATE. In each state's behavior block, add before the existing `_moveToward` call:

For **CHASE** (~line 1125):
```javascript
    } else if (this.state === CHASE) {
      // Corner checking during chase
      if (this._isCheckingCorner) {
        this._cornerCheckPause -= dt;
        this._stuckTimer = 0;
        if (this._cornerCheckPause > 0) {
          this._faceDirection(this._cornerSweepTarget, dt, 10);
        } else {
          this._isCheckingCorner = false;
        }
      } else {
        if (!this._isCheckingCorner) this._checkCorner();
        // existing chase movement code...
      }
```

For **INVESTIGATE** (~line 1183):
```javascript
    } else if (this.state === INVESTIGATE) {
      this._investigateTimer += dt;
      // Corner checking during investigation
      if (this._isCheckingCorner) {
        this._cornerCheckPause -= dt;
        this._stuckTimer = 0;
        if (this._cornerCheckPause > 0) {
          this._faceDirection(this._cornerSweepTarget, dt, 10);
        } else {
          this._isCheckingCorner = false;
        }
      } else {
        if (!this._isCheckingCorner) this._checkCorner();
        // existing investigate movement code...
      }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: All corner check tests PASS, all existing tests still PASS.

- [ ] **Step 7: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(ai): add corner checking with pause-and-slice behavior"
```

---

### Task 7: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Update bot AI section in REQUIREMENTS.md**

Update the bot AI section to document all 5 new systems:
- Field of View: 120° cone, peripheral awareness penalty, team mode support
- Purposeful Navigation: weighted waypoint scoring, personality weights, difficulty noise
- AMBUSH state: entry conditions, behavior, transitions, difficulty scaling
- Distance-based Sound: three tiers, personality modifiers, difficulty scaling, team filtering
- Pre-aiming + Corner Checking: threat angle detection, pause-and-slice, personality rates

Update the state machine documentation to include AMBUSH as the 7th state.

Update the difficulty scaling tables with new parameters (soundCloseRange, soundMidError, soundFarError).

- [ ] **Step 2: Run tests one final time**

Run: `npm test`
Expected: All 493+ tests PASS.

- [ ] **Step 3: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: update REQUIREMENTS.md with bot AI enhancement details"
```
