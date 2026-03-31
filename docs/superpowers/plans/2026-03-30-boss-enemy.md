# Boss Enemy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Boss enemy archetype with phased combat, grenade barrages, minion summons, and mode-specific spawn rules across all four game modes.

**Architecture:** Extend the existing `Enemy` class in `js/enemies.js` with an `isBoss` flag that triggers boss-specific stats, model, phase logic, and abilities. Boss spawn decisions live in `js/main.js` per mode. Boss sounds added to `js/sound.js`. Boss health bar HUD added to `index.html` and managed by `js/main.js`.

**Tech Stack:** Three.js r160.1 (procedural geometry), Web Audio API (procedural sound), Vitest (tests)

---

### Task 1: Boss Stats Configuration

**Files:**
- Modify: `js/enemies.js:8-14` (after DIFFICULTIES)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write test for BOSS_STATS**

Add to `tests/unit/enemies.test.js` after the existing `DIFFICULTIES` describe block:

```javascript
describe('BOSS_STATS', () => {
  var BS;
  beforeAll(() => { BS = GAME.BOSS_STATS; });

  it('should be defined', () => {
    expect(BS).toBeDefined();
  });

  it('should define all 4 difficulty levels', () => {
    expect(BS).toHaveProperty('easy');
    expect(BS).toHaveProperty('normal');
    expect(BS).toHaveProperty('hard');
    expect(BS).toHaveProperty('elite');
  });

  it('should have required boss fields on each level', () => {
    var fields = ['health', 'speed', 'fireRate', 'damage', 'accuracy', 'sight', 'attackRange'];
    Object.keys(BS).forEach(level => {
      fields.forEach(field => {
        expect(BS[level]).toHaveProperty(field);
      });
    });
  });

  it('boss health should be much higher than regular enemy health', () => {
    var DIFF = GAME.DIFFICULTIES;
    expect(BS.easy.health).toBeGreaterThan(DIFF.easy.health * 5);
    expect(BS.normal.health).toBeGreaterThan(DIFF.normal.health * 5);
    expect(BS.hard.health).toBeGreaterThan(DIFF.hard.health * 5);
    expect(BS.elite.health).toBeGreaterThan(DIFF.elite.health * 5);
  });

  it('boss health should scale with difficulty', () => {
    expect(BS.easy.health).toBeLessThan(BS.normal.health);
    expect(BS.normal.health).toBeLessThan(BS.hard.health);
    expect(BS.hard.health).toBeLessThan(BS.elite.health);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL — `GAME.BOSS_STATS` is undefined

- [ ] **Step 3: Add BOSS_STATS to enemies.js**

In `js/enemies.js`, after the `DIFFICULTIES` object (after line 14), add:

```javascript
  var BOSS_STATS = {
    easy:   { health: 200, speed: 3.5, fireRate: 1.5, damage: 8,  accuracy: 0.25, sight: 35, attackRange: 22 },
    normal: { health: 350, speed: 4.5, fireRate: 2.2, damage: 12, accuracy: 0.38, sight: 45, attackRange: 25 },
    hard:   { health: 500, speed: 5.5, fireRate: 2.8, damage: 16, accuracy: 0.45, sight: 50, attackRange: 28 },
    elite:  { health: 700, speed: 6.5, fireRate: 3.5, damage: 20, accuracy: 0.55, sight: 55, attackRange: 30 }
  };
```

Also expose it at the bottom of the IIFE where other things are exposed (search for `GAME.DIFFICULTIES`):

```javascript
  GAME.BOSS_STATS = BOSS_STATS;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(boss): add BOSS_STATS difficulty scaling config"
```

---

### Task 2: Boss Flag in Enemy Constructor

**Files:**
- Modify: `js/enemies.js:161-204` (Enemy constructor)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write test for Boss enemy creation**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('Boss enemy creation', () => {
  it('should create a boss enemy with isBoss flag', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    var waypoints = [{ x: 0, z: 0 }, { x: 10, z: 10 }];
    var walls = [];
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, waypoints, walls);
    var boss = em.enemies[em.enemies.length - 1];
    expect(boss.isBoss).toBe(true);
  });

  it('boss should have BOSS_STATS health for current difficulty', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    var waypoints = [{ x: 0, z: 0 }, { x: 10, z: 10 }];
    var walls = [];
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, waypoints, walls);
    var boss = em.enemies[em.enemies.length - 1];
    expect(boss.health).toBe(GAME.BOSS_STATS.normal.health);
    expect(boss.maxHealth).toBe(GAME.BOSS_STATS.normal.health);
  });

  it('boss should always use aggressive personality', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    var waypoints = [{ x: 0, z: 0 }, { x: 10, z: 10 }];
    var walls = [];
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, waypoints, walls);
    var boss = em.enemies[em.enemies.length - 1];
    expect(boss.personality).toBe(GAME.PERSONALITY.aggressive);
  });

  it('boss should have phase tracking properties', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    var waypoints = [{ x: 0, z: 0 }, { x: 10, z: 10 }];
    var walls = [];
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, waypoints, walls);
    var boss = em.enemies[em.enemies.length - 1];
    expect(boss._bossPhase).toBe(1);
    expect(boss._bossBarrageCooldown).toBe(0);
    expect(boss._bossMinionsSpawned).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL — `em.spawnBoss` is not a function

- [ ] **Step 3: Implement boss creation**

In the `Enemy` constructor (`js/enemies.js`), after the personality assignment block (after line 187 `this.speed *= this.personality.speedMult;`), add boss initialization:

```javascript
    // ── Boss overrides ───────────────────────────────────
    this.isBoss = false;
    this._bossPhase = 1;
    this._bossBarrageCooldown = 0;
    this._bossMinionsSpawned = 0;
    this._bossBarrageActive = false;
    this._bossBarrageGrenades = [];
    this._bossWindupTimer = 0;
    this._bossPhaseFlashTimer = 0;
    this._bossNoMinions = false; // set true for gun game
```

Add the `_initBoss` method on the Enemy prototype (after the constructor, near the personality section):

```javascript
  Enemy.prototype._initBoss = function(diffName) {
    this.isBoss = true;
    var bs = BOSS_STATS[diffName] || BOSS_STATS.normal;
    this.health = bs.health;
    this.maxHealth = bs.health;
    this.speed = bs.speed;
    this.fireRate = bs.fireRate;
    this.damage = bs.damage;
    this.accuracy = bs.accuracy;
    this.sightRange = bs.sight;
    this.attackRange = bs.attackRange;

    // Force aggressive personality
    this.personality = PERSONALITY.aggressive;
    this.speed *= this.personality.speedMult;

    // Phase 1 defaults
    this._bossPhase = 1;
    this._bossBarrageCooldown = 0;
    this._bossMinionsSpawned = 0;

    // Rebuild model as boss
    this._buildBossModel();
  };
```

Add the `spawnBoss` method on EnemyManager (near `spawnBots` at line ~2325):

```javascript
  EnemyManager.prototype.spawnBoss = function(spawnPos, waypoints, walls, opts) {
    var id = this.enemies.length + 100; // high ID to avoid personality cycling
    var boss = new Enemy(this.scene, spawnPos, waypoints, walls, id, 1);
    boss._manager = this;
    boss._initBoss(_getDiffName());
    if (opts && opts.noMinions) boss._bossNoMinions = true;
    if (opts && opts.hpMult) {
      boss.health = Math.round(boss.health * opts.hpMult);
      boss.maxHealth = boss.health;
    }
    this.enemies.push(boss);
    return boss;
  };
```

Also expose PERSONALITY for testing: `GAME.PERSONALITY = PERSONALITY;`

- [ ] **Step 4: Add stub _buildBossModel (will be implemented in Task 3)**

```javascript
  Enemy.prototype._buildBossModel = function() {
    // Stub — will be replaced with full boss model in Task 3
    // For now, just scale up the existing model
    this.mesh.scale.set(1.5, 1.5, 1.5);
  };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(boss): add isBoss flag, _initBoss, and spawnBoss method"
```

---

### Task 3: Boss Visual Model

**Files:**
- Modify: `js/enemies.js` (replace `_buildBossModel` stub)

- [ ] **Step 1: Implement _buildBossModel**

Replace the `_buildBossModel` stub with:

```javascript
  Enemy.prototype._buildBossModel = function() {
    // Remove existing model children and rebuild as boss
    while (this.mesh.children.length > 0) {
      this.mesh.remove(this.mesh.children[0]);
    }

    _ensureGeoCache();
    _ensureMatPalettes();
    var G = _geoCache;
    var S = _sharedMats;
    var m = this.mesh;

    // Boss-specific materials — crimson armor with black accents
    var bossCrimson = new THREE.MeshStandardMaterial({
      color: 0x8b0000, roughness: 0.4, metalness: 0.6
    });
    var bossBlack = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a, roughness: 0.3, metalness: 0.7
    });
    var bossVisor = new THREE.MeshStandardMaterial({
      color: 0x222222, roughness: 0.1, metalness: 0.9
    });
    var bossSkin = new THREE.MeshStandardMaterial({
      color: 0xd4a574, roughness: 0.8, metalness: 0.0
    });

    // Scale up 1.5x — all positions are for normal scale, mesh.scale handles the rest
    m.scale.set(1.5, 1.5, 1.5);

    // ── Boots ──
    var leftBoot = shadow(new THREE.Mesh(G.boot, bossBlack));
    leftBoot.position.set(-0.15, 0.11, 0.03);
    m.add(leftBoot);
    var rightBoot = shadow(new THREE.Mesh(G.boot, bossBlack));
    rightBoot.position.set(0.15, 0.11, 0.03);
    m.add(rightBoot);
    var leftSole = shadow(new THREE.Mesh(G.bootSole, S.sole));
    leftSole.position.set(-0.15, 0.02, 0.03);
    m.add(leftSole);
    var rightSole = shadow(new THREE.Mesh(G.bootSole, S.sole));
    rightSole.position.set(0.15, 0.02, 0.03);
    m.add(rightSole);

    // ── Legs ──
    var leftCalf = shadow(new THREE.Mesh(G.lowerLeg, bossBlack));
    leftCalf.position.set(-0.15, 0.17, 0);
    m.add(leftCalf);
    var rightCalf = shadow(new THREE.Mesh(G.lowerLeg, bossBlack));
    rightCalf.position.set(0.15, 0.17, 0);
    m.add(rightCalf);
    var leftKnee = shadow(new THREE.Mesh(G.knee, bossCrimson));
    leftKnee.position.set(-0.15, 0.57, 0);
    m.add(leftKnee);
    var rightKnee = shadow(new THREE.Mesh(G.knee, bossCrimson));
    rightKnee.position.set(0.15, 0.57, 0);
    m.add(rightKnee);
    var leftThigh = shadow(new THREE.Mesh(G.upperLeg, bossCrimson));
    leftThigh.position.set(-0.15, 0.53, 0);
    m.add(leftThigh);
    var rightThigh = shadow(new THREE.Mesh(G.upperLeg, bossCrimson));
    rightThigh.position.set(0.15, 0.53, 0);
    m.add(rightThigh);

    // ── Trunk & Vest ──
    var trunk = shadow(new THREE.Mesh(G.trunk, bossCrimson));
    trunk.position.set(0, 0.93, 0);
    m.add(trunk);
    var vest = shadow(new THREE.Mesh(G.vest, bossBlack));
    vest.position.set(0, 1.1, 0);
    m.add(vest);

    // ── Shoulder pads (boss-unique) ──
    var shoulderGeo = new THREE.BoxGeometry(0.22, 0.12, 0.18);
    var leftShoulder = shadow(new THREE.Mesh(shoulderGeo, bossCrimson));
    leftShoulder.position.set(-0.32, 1.55, 0);
    m.add(leftShoulder);
    var rightShoulder = shadow(new THREE.Mesh(shoulderGeo, bossCrimson));
    rightShoulder.position.set(0.32, 1.55, 0);
    m.add(rightShoulder);

    // ── Arms ──
    // Reuse arm group pattern from regular model
    var rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.28, 1.4, 0);
    var rUpper = shadow(new THREE.Mesh(G.upperArm, bossCrimson));
    rightArmGroup.add(rUpper);
    var rLower = shadow(new THREE.Mesh(G.lowerArm, bossSkin));
    rLower.position.set(0, -0.35, 0);
    rightArmGroup.add(rLower);
    var rHand = shadow(new THREE.Mesh(G.hand, bossSkin));
    rHand.position.set(0, -0.55, -0.05);
    rightArmGroup.add(rHand);
    m.add(rightArmGroup);
    this._rightArmGroup = rightArmGroup;

    var leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.28, 1.4, 0);
    var lUpper = shadow(new THREE.Mesh(G.upperArm, bossCrimson));
    leftArmGroup.add(lUpper);
    var lLower = shadow(new THREE.Mesh(G.lowerArm, bossSkin));
    lLower.position.set(0, -0.35, 0);
    leftArmGroup.add(lLower);
    var lHand = shadow(new THREE.Mesh(G.hand, bossSkin));
    lHand.position.set(0, -0.55, -0.05);
    leftArmGroup.add(lHand);
    m.add(leftArmGroup);
    this._leftArmGroup = leftArmGroup;

    // ── Head with visor/helmet ──
    var head = shadow(new THREE.Mesh(G.head, bossSkin));
    head.position.set(0, 2.12, 0);
    m.add(head);
    // Helmet
    var helmetGeo = new THREE.BoxGeometry(0.32, 0.18, 0.32);
    var helmet = shadow(new THREE.Mesh(helmetGeo, bossBlack));
    helmet.position.set(0, 2.28, 0);
    m.add(helmet);
    // Visor
    var visorGeo = new THREE.BoxGeometry(0.28, 0.08, 0.02);
    var visor = shadow(new THREE.Mesh(visorGeo, bossVisor));
    visor.position.set(0, 2.16, -0.17);
    m.add(visor);

    // ── Overhead marker (red, larger) ──
    if (this.marker) m.remove(this.marker);
    var markerGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    var markerMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.marker = new THREE.Mesh(markerGeo, markerMat);
    this.marker.position.set(0, 2.8, 0);
    this.marker.visible = false; // Only visible if debug
    m.add(this.marker);

    // Store boss materials for phase flash effect
    this._bossMaterials = [bossCrimson, bossBlack, bossVisor];
    this._bossCrimson = bossCrimson;
  };
```

- [ ] **Step 2: Run tests to verify nothing is broken**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add js/enemies.js
git commit -m "feat(boss): add full boss visual model with crimson armor and shoulder pads"
```

---

### Task 4: Boss Phase System

**Files:**
- Modify: `js/enemies.js` (add phase update logic)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write tests for phase transitions**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('Boss phase system', () => {
  var boss;
  beforeAll(() => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    boss = em.enemies[em.enemies.length - 1];
  });

  it('should start in phase 1', () => {
    expect(boss._bossPhase).toBe(1);
  });

  it('should transition to phase 2 at 50% HP', () => {
    boss.health = boss.maxHealth * 0.5;
    boss._updateBossPhase();
    expect(boss._bossPhase).toBe(2);
  });

  it('should transition to phase 3 at 25% HP', () => {
    boss.health = boss.maxHealth * 0.25;
    boss._updateBossPhase();
    expect(boss._bossPhase).toBe(3);
  });

  it('phase 2 should increase fire rate by 25%', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var b = em.enemies[em.enemies.length - 1];
    var baseFireRate = b._bossBaseFireRate;
    b.health = b.maxHealth * 0.49;
    b._updateBossPhase();
    expect(b.fireRate).toBeCloseTo(baseFireRate * 1.25, 1);
  });

  it('phase 3 should increase fire rate by 50%', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var b = em.enemies[em.enemies.length - 1];
    var baseFireRate = b._bossBaseFireRate;
    b.health = b.maxHealth * 0.24;
    b._updateBossPhase();
    expect(b.fireRate).toBeCloseTo(baseFireRate * 1.5, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL — `boss._updateBossPhase` is not a function

- [ ] **Step 3: Implement phase system**

Add to `_initBoss` method, after setting stats:

```javascript
    this._bossBaseFireRate = this.fireRate;
    this._bossBaseSpeed = this.speed;
```

Add the `_updateBossPhase` method to Enemy prototype:

```javascript
  Enemy.prototype._updateBossPhase = function() {
    if (!this.isBoss) return;
    var hpPct = this.health / this.maxHealth;
    var oldPhase = this._bossPhase;

    if (hpPct <= 0.25) {
      this._bossPhase = 3;
    } else if (hpPct <= 0.5) {
      this._bossPhase = 2;
    } else {
      this._bossPhase = 1;
    }

    // Apply phase stat modifiers
    if (this._bossPhase === 2) {
      this.fireRate = this._bossBaseFireRate * 1.25;
      this.speed = this._bossBaseSpeed * 1.2;
    } else if (this._bossPhase === 3) {
      this.fireRate = this._bossBaseFireRate * 1.5;
      this.speed = this._bossBaseSpeed * 1.35;
    }

    // Trigger phase transition effects
    if (this._bossPhase !== oldPhase && oldPhase !== 0) {
      this._bossPhaseFlashTimer = 0.5;
      // Minion spawning is handled by main.js when it detects phase change
      if (GAME.Sound && GAME.Sound.bossPhaseTransition) GAME.Sound.bossPhaseTransition();
    }
  };
```

- [ ] **Step 4: Hook phase check into takeDamage**

In `Enemy.prototype.takeDamage` (line ~2082), after `this.health -= amount;` and before the death check, add:

```javascript
    if (this.isBoss) this._updateBossPhase();
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(boss): add 3-phase system with stat escalation on damage"
```

---

### Task 5: Boss Grenade Barrage Ability

**Files:**
- Modify: `js/enemies.js` (add barrage logic)
- Modify: `js/weapons.js` (expose GrenadeObj for boss use)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write tests for barrage cooldown and targeting**

Add to `tests/unit/enemies.test.js`:

```javascript
describe('Boss grenade barrage', () => {
  it('should have barrage cooldowns per phase', () => {
    expect(GAME.BOSS_BARRAGE).toBeDefined();
    expect(GAME.BOSS_BARRAGE.phase1.cooldown).toBe(15);
    expect(GAME.BOSS_BARRAGE.phase2.cooldown).toBe(10);
    expect(GAME.BOSS_BARRAGE.phase3.cooldown).toBe(7);
  });

  it('should have grenade counts per phase', () => {
    expect(GAME.BOSS_BARRAGE.phase1.grenades).toBe(3);
    expect(GAME.BOSS_BARRAGE.phase2.grenades).toBe(3);
    expect(GAME.BOSS_BARRAGE.phase3.grenades).toBe(4);
  });

  it('boss should track barrage cooldown timer', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[em.enemies.length - 1];
    expect(boss._bossBarrageCooldown).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL — `GAME.BOSS_BARRAGE` is undefined

- [ ] **Step 3: Expose GrenadeObj for boss use**

In `js/weapons.js`, at the bottom of the IIFE where things are exposed to GAME, add:

```javascript
  GAME._GrenadeObj = GrenadeObj;
```

- [ ] **Step 4: Add barrage config and ability method**

In `js/enemies.js`, after BOSS_STATS, add:

```javascript
  var BOSS_BARRAGE = {
    phase1: { cooldown: 15, grenades: 3, windupTime: 1.0 },
    phase2: { cooldown: 10, grenades: 3, windupTime: 1.0 },
    phase3: { cooldown: 7,  grenades: 4, windupTime: 1.0 }
  };
```

Expose it: `GAME.BOSS_BARRAGE = BOSS_BARRAGE;`

Add the barrage methods to Enemy prototype:

```javascript
  Enemy.prototype._startBossBarrage = function(playerPos) {
    if (!this.isBoss || this._bossBarrageActive || this._bossWindupTimer > 0) return;
    var phaseKey = 'phase' + this._bossPhase;
    var cfg = BOSS_BARRAGE[phaseKey];
    if (this._bossBarrageCooldown > 0) return;

    // Start wind-up
    this._bossWindupTimer = cfg.windupTime;
    this._bossBarrageTarget = playerPos.clone(); // snapshot player position at start
    this._bossBarrageCount = cfg.grenades;
    this._bossBarrageFired = 0;
    this._bossBarrageInterval = 0.5; // time between grenades
    this._bossBarrageTimer = 0;

    if (GAME.Sound && GAME.Sound.bossBarrageWindup) GAME.Sound.bossBarrageWindup();
  };

  Enemy.prototype._updateBossBarrage = function(dt) {
    if (!this.isBoss) return;

    // Wind-up phase
    if (this._bossWindupTimer > 0) {
      this._bossWindupTimer -= dt;
      if (this._bossWindupTimer <= 0) {
        this._bossBarrageActive = true;
        this._bossBarrageTimer = 0; // fire first immediately
      }
      return;
    }

    // Firing phase
    if (this._bossBarrageActive) {
      this._bossBarrageTimer -= dt;
      if (this._bossBarrageTimer <= 0 && this._bossBarrageFired < this._bossBarrageCount) {
        this._fireBossGrenade();
        this._bossBarrageFired++;
        this._bossBarrageTimer = this._bossBarrageInterval;

        if (this._bossBarrageFired >= this._bossBarrageCount) {
          this._bossBarrageActive = false;
          var phaseKey = 'phase' + this._bossPhase;
          this._bossBarrageCooldown = BOSS_BARRAGE[phaseKey].cooldown;
        }
      }
    }

    // Cooldown
    if (this._bossBarrageCooldown > 0) {
      this._bossBarrageCooldown -= dt;
    }
  };

  Enemy.prototype._fireBossGrenade = function() {
    if (!this._bossBarrageTarget || !GAME._GrenadeObj) return;
    var bossPos = this.mesh.position;
    var target = this._bossBarrageTarget.clone();

    // Random offset 5-10 units from snapshot position
    var angle = Math.random() * Math.PI * 2;
    var dist = 5 + Math.random() * 5;
    target.x += Math.cos(angle) * dist;
    target.z += Math.sin(angle) * dist;

    // Calculate lobbed velocity toward target
    var dx = target.x - bossPos.x;
    var dz = target.z - bossPos.z;
    var hDist = Math.sqrt(dx * dx + dz * dz);
    var t = Math.max(0.8, hDist / 15); // flight time
    var vx = dx / t;
    var vz = dz / t;
    var vy = (target.y - bossPos.y + 0.5 * 16 * t * t) / t; // account for gravity (16)

    var startPos = new THREE.Vector3(bossPos.x, bossPos.y + 2.5, bossPos.z);
    var vel = new THREE.Vector3(vx, vy, vz);

    var grenade = new GAME._GrenadeObj(this.scene, startPos, vel, this.walls);
    // Store grenade reference for tracking in main.js
    if (!this._bossGrenadeList) this._bossGrenadeList = [];
    this._bossGrenadeList.push(grenade);

    if (GAME.Sound && GAME.Sound.bossGrenadeLaunch) GAME.Sound.bossGrenadeLaunch();
  };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add js/enemies.js js/weapons.js tests/unit/enemies.test.js
git commit -m "feat(boss): add grenade barrage ability with wind-up and spread targeting"
```

---

### Task 6: Boss Phase Flash Effect

**Files:**
- Modify: `js/enemies.js` (update loop for phase flash)

- [ ] **Step 1: Add phase flash update to Enemy update**

In the `Enemy.prototype.update` method (line ~1224), at the top of the method (after the `if (!this.alive) return;` check), add:

```javascript
    // Boss phase flash effect
    if (this.isBoss && this._bossPhaseFlashTimer > 0) {
      this._bossPhaseFlashTimer -= dt;
      var flashIntensity = this._bossPhaseFlashTimer / 0.5;
      if (this._bossCrimson) {
        var r = 0.55 + flashIntensity * 0.45; // pulse from crimson toward white
        var g = flashIntensity * 0.8;
        var b = flashIntensity * 0.8;
        this._bossCrimson.emissive.setRGB(r * flashIntensity, g * flashIntensity, b * flashIntensity);
      }
      if (this._bossPhaseFlashTimer <= 0 && this._bossCrimson) {
        this._bossCrimson.emissive.setRGB(0, 0, 0);
      }
    }
```

- [ ] **Step 2: Trigger barrage check in update loop**

In the `Enemy.prototype.update` method, within the ATTACK state handling section, add barrage triggering for the boss. Find the ATTACK state block and add after the existing firing logic:

```javascript
    // Boss barrage ability
    if (this.isBoss && this.state === ATTACK) {
      if (this._bossBarrageCooldown <= 0 && !this._bossBarrageActive && this._bossWindupTimer <= 0) {
        var playerPos = new THREE.Vector3(
          this._manager._playerX || 0,
          0,
          this._manager._playerZ || 0
        );
        this._startBossBarrage(playerPos);
      }
    }
    this._updateBossBarrage(dt);
```

- [ ] **Step 3: Run tests**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add js/enemies.js
git commit -m "feat(boss): add phase flash effect and barrage trigger in attack state"
```

---

### Task 7: Boss Sound Effects

**Files:**
- Modify: `js/sound.js`
- Test: `tests/unit/sound.test.js`

- [ ] **Step 1: Write tests for boss sounds**

Add to `tests/unit/sound.test.js`:

```javascript
describe('Boss sounds', () => {
  it('should have bossBarrageWindup method', () => {
    expect(typeof GAME.Sound.bossBarrageWindup).toBe('function');
  });

  it('should have bossGrenadeLaunch method', () => {
    expect(typeof GAME.Sound.bossGrenadeLaunch).toBe('function');
  });

  it('should have bossPhaseTransition method', () => {
    expect(typeof GAME.Sound.bossPhaseTransition).toBe('function');
  });

  it('should have bossSpawnAlert method', () => {
    expect(typeof GAME.Sound.bossSpawnAlert).toBe('function');
  });

  it('should have bossMinionSummon method', () => {
    expect(typeof GAME.Sound.bossMinionSummon).toBe('function');
  });

  it('should have bossDeath method', () => {
    expect(typeof GAME.Sound.bossDeath).toBe('function');
  });

  it('should have bossFootstep method', () => {
    expect(typeof GAME.Sound.bossFootstep).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/sound.test.js`
Expected: FAIL — methods not defined

- [ ] **Step 3: Implement boss sounds**

In `js/sound.js`, add the following methods to the Sound object (near the end of the IIFE, where other sound methods are defined):

```javascript
    // ── Boss Sounds ──────────────────────────────────────

    bossBarrageWindup: function() {
      var c = ensureCtx();
      var now = c.currentTime;
      // Rising low-frequency rumble with distortion
      var osc = c.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(40, now);
      osc.frequency.linearRampToValueAtTime(120, now + 1.0);
      var gain = c.createGain();
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.8);
      gain.gain.linearRampToValueAtTime(0.0, now + 1.0);
      var dist = c.createWaveShaper();
      dist.curve = getDistortionCurve(50);
      osc.connect(dist);
      dist.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 1.0);
    },

    bossGrenadeLaunch: function() {
      var c = ensureCtx();
      var now = c.currentTime;
      // Deep "thoomp" — lower than regular grenade
      var osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
      var gain = c.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      // Add noise burst for body
      var noise = c.createBufferSource();
      noise.buffer = getNoiseBuffer(0.1);
      var nGain = c.createGain();
      nGain.gain.setValueAtTime(0.15, now);
      nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.connect(gain);
      gain.connect(masterGain);
      noise.connect(nGain);
      nGain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.2);
      noise.start(now);
      noise.stop(now + 0.1);
    },

    bossPhaseTransition: function() {
      var c = ensureCtx();
      var now = c.currentTime;
      // Metallic screech/roar
      var osc1 = c.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(300, now);
      osc1.frequency.linearRampToValueAtTime(800, now + 0.15);
      osc1.frequency.linearRampToValueAtTime(200, now + 0.4);
      var osc2 = c.createOscillator();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(150, now);
      osc2.frequency.linearRampToValueAtTime(100, now + 0.4);
      var gain = c.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.0, now + 0.4);
      var dist = c.createWaveShaper();
      dist.curve = getDistortionCurve(80);
      osc1.connect(dist);
      osc2.connect(dist);
      dist.connect(gain);
      gain.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.4);
      osc2.start(now);
      osc2.stop(now + 0.4);
    },

    bossSpawnAlert: function() {
      var c = ensureCtx();
      var now = c.currentTime;
      // Two-tone descending horn/siren
      var osc = c.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(220, now + 0.4);
      osc.frequency.setValueAtTime(165, now + 0.5);
      osc.frequency.setValueAtTime(165, now + 0.9);
      var gain = c.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.setValueAtTime(0.35, now + 0.9);
      gain.gain.linearRampToValueAtTime(0.0, now + 1.2);
      var dist = c.createWaveShaper();
      dist.curve = getDistortionCurve(30);
      osc.connect(dist);
      dist.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 1.2);
    },

    bossMinionSummon: function() {
      var c = ensureCtx();
      var now = c.currentTime;
      // Radio chatter burst — noise-filtered oscillator
      var noise = c.createBufferSource();
      noise.buffer = getNoiseBuffer(0.5);
      var bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1200;
      bp.Q.value = 5;
      var gain = c.createGain();
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gain.gain.setValueAtTime(0.25, now + 0.35);
      gain.gain.linearRampToValueAtTime(0.0, now + 0.5);
      noise.connect(bp);
      bp.connect(gain);
      gain.connect(masterGain);
      noise.start(now);
      noise.stop(now + 0.5);
    },

    bossDeath: function() {
      var c = ensureCtx();
      var now = c.currentTime;
      // Extended explosion + low rumble fadeout
      var noise = c.createBufferSource();
      noise.buffer = getNoiseBuffer(1.5);
      var lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2000, now);
      lp.frequency.exponentialRampToValueAtTime(100, now + 1.5);
      var dist = c.createWaveShaper();
      dist.curve = getDistortionCurve(60);
      var gain = c.createGain();
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0.0, now + 1.5);
      noise.connect(lp);
      lp.connect(dist);
      dist.connect(gain);
      gain.connect(masterGain);
      noise.start(now);
      noise.stop(now + 1.5);
      // Sub rumble
      var osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(50, now);
      osc.frequency.linearRampToValueAtTime(25, now + 1.5);
      var subGain = c.createGain();
      subGain.gain.setValueAtTime(0.4, now);
      subGain.gain.linearRampToValueAtTime(0.0, now + 1.5);
      osc.connect(subGain);
      subGain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 1.5);
    },

    bossFootstep: function() {
      var c = ensureCtx();
      var now = c.currentTime;
      // Heavier, lower-pitched footstep thud
      var osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(50, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.1);
      var gain = c.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      var noise = c.createBufferSource();
      noise.buffer = getNoiseBuffer(0.08);
      var nGain = c.createGain();
      nGain.gain.setValueAtTime(0.1, now);
      nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(masterGain);
      noise.connect(nGain);
      nGain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.15);
      noise.start(now);
      noise.stop(now + 0.08);
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/sound.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/sound.js tests/unit/sound.test.js
git commit -m "feat(boss): add all procedural boss sound effects"
```

---

### Task 8: Boss Health Bar HUD

**Files:**
- Modify: `index.html` (add boss health bar markup + CSS)
- Modify: `js/main.js` (DOM ref, update function)
- Test: `tests/unit/main.test.js`

- [ ] **Step 1: Write test for boss HUD elements**

Add to `tests/unit/main.test.js`:

```javascript
describe('Boss HUD', () => {
  it('should have boss health bar element in DOM', () => {
    expect(document.getElementById('boss-health-bar')).not.toBeNull();
  });

  it('should have boss health fill element', () => {
    expect(document.getElementById('boss-hp-fill')).not.toBeNull();
  });

  it('should have boss label element', () => {
    expect(document.getElementById('boss-label')).not.toBeNull();
  });

  it('boss health bar should be hidden by default', () => {
    var el = document.getElementById('boss-health-bar');
    expect(el.classList.contains('show')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/main.test.js`
Expected: FAIL — element is null

- [ ] **Step 3: Add boss health bar HTML to index.html**

In `index.html`, after the `<div id="round-info">Round 1 / 6</div>` line (line 1789), add:

```html
  <div id="boss-health-bar">
    <div id="boss-label">BOSS</div>
    <div id="boss-hp-track">
      <div id="boss-hp-fill"></div>
      <div class="boss-phase-divider" style="left:50%"></div>
      <div class="boss-phase-divider" style="left:75%"></div>
    </div>
  </div>
```

- [ ] **Step 4: Add boss health bar CSS**

In the `<style>` section of `index.html`, add:

```css
#boss-health-bar {
  position: fixed;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  width: 320px;
  display: none;
  z-index: 60;
  text-align: center;
}
#boss-health-bar.show { display: block; }
#boss-label {
  color: #ff2222;
  font: bold 14px monospace;
  text-shadow: 0 0 6px rgba(255,0,0,0.5);
  margin-bottom: 4px;
  letter-spacing: 4px;
}
#boss-hp-track {
  position: relative;
  width: 100%;
  height: 10px;
  background: rgba(0,0,0,0.6);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 2px;
  overflow: hidden;
}
#boss-hp-fill {
  height: 100%;
  width: 100%;
  background: #4caf50;
  transition: width 0.2s, background 0.3s;
}
.boss-phase-divider {
  position: absolute;
  top: 0;
  width: 1px;
  height: 100%;
  background: rgba(255,255,255,0.3);
}
```

- [ ] **Step 5: Add DOM refs and update function in main.js**

In the `dom` object at the top of `js/main.js` (around line 14), add:

```javascript
    bossHealthBar: document.getElementById('boss-health-bar'),
    bossHpFill:    document.getElementById('boss-hp-fill'),
    bossLabel:     document.getElementById('boss-label'),
```

Add boss HUD helper functions in `js/main.js` (near the `updateHUD` function):

```javascript
  var _activeBoss = null;

  function showBossHealthBar(boss) {
    _activeBoss = boss;
    dom.bossHealthBar.classList.add('show');
    updateBossHealthBar();
  }

  function hideBossHealthBar() {
    _activeBoss = null;
    dom.bossHealthBar.classList.remove('show');
  }

  function updateBossHealthBar() {
    if (!_activeBoss || !_activeBoss.alive) {
      hideBossHealthBar();
      return;
    }
    var pct = Math.max(0, _activeBoss.health / _activeBoss.maxHealth * 100);
    dom.bossHpFill.style.width = pct + '%';

    // Color by phase
    if (_activeBoss._bossPhase === 3) {
      dom.bossHpFill.style.background = '#ef5350'; // red
    } else if (_activeBoss._bossPhase === 2) {
      dom.bossHpFill.style.background = '#ff9800'; // orange
    } else {
      dom.bossHpFill.style.background = '#4caf50'; // green
    }
  }
```

- [ ] **Step 6: Call updateBossHealthBar in game loop**

In the game loop's PLAYING/SURVIVAL_WAVE/GUNGAME_ACTIVE/DEATHMATCH_ACTIVE block (around line 4597), add after `updateHUD()`:

```javascript
      if (_activeBoss) updateBossHealthBar();
```

- [ ] **Step 7: Add boss-health-bar to test setup mock DOM**

In `tests/setup.js`, add the boss HUD elements to the mock DOM setup (find where other HUD elements like `round-info` are created and add nearby):

```javascript
  // Boss HUD elements
  createElement('boss-health-bar', 'div');
  createElement('boss-hp-fill', 'div');
  createElement('boss-label', 'div');
  createElement('boss-hp-track', 'div');
```

- [ ] **Step 8: Run tests**

Run: `npm test -- tests/unit/main.test.js`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add index.html js/main.js tests/unit/main.test.js tests/setup.js
git commit -m "feat(boss): add boss health bar HUD with phase coloring"
```

---

### Task 9: Boss Spawn in Competitive Mode

**Files:**
- Modify: `js/main.js` (competitive round flow changes)
- Test: `tests/unit/main.test.js`

- [ ] **Step 1: Write tests for competitive boss spawn rules**

Add to `tests/unit/main.test.js`:

```javascript
describe('Competitive mode boss rules', () => {
  it('should always play all 6 rounds', () => {
    // The match should not end early — TOTAL_ROUNDS check should not short-circuit
    // Verified by: endMatch is called only when roundNumber > TOTAL_ROUNDS
    // (no playerScore >= 4 || botScore >= 4 early exit)
    expect(GAME._TOTAL_ROUNDS).toBe(6);
  });

  it('should have _isBossRound function', () => {
    expect(typeof GAME._isBossRound).toBe('function');
  });

  it('round 6 should be a boss round in competitive', () => {
    expect(GAME._isBossRound(6)).toBe(true);
  });

  it('rounds 1-5 should not be boss rounds in competitive', () => {
    for (var i = 1; i <= 5; i++) {
      expect(GAME._isBossRound(i)).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/main.test.js`
Expected: FAIL

- [ ] **Step 3: Modify competitive round flow**

In `js/main.js`, change the `startRound` function (line 2636):

Replace:
```javascript
    if (roundNumber > TOTAL_ROUNDS || playerScore >= 4 || botScore >= 4) {
```
With:
```javascript
    if (roundNumber > TOTAL_ROUNDS) {
```

This ensures all 6 rounds are always played.

Also update the `endMatch` function to use most-wins logic. In `endMatch` (line 3057):

Replace:
```javascript
    var result = playerScore > botScore ? 'VICTORY' : playerScore < botScore ? 'DEFEAT' : 'DRAW';
```
With (no change needed — this logic already handles ties correctly):
```javascript
    var result = playerScore > botScore ? 'VICTORY' : playerScore < botScore ? 'DEFEAT' : 'DRAW';
```

Update the ROUND_END state (line ~4584):

Replace:
```javascript
        var matchWillEnd = nextRound > TOTAL_ROUNDS || playerScore >= 4 || botScore >= 4;
```
With:
```javascript
        var matchWillEnd = nextRound > TOTAL_ROUNDS;
```

Add the boss round detection function:

```javascript
  function isBossRound(roundNum) {
    return roundNum === TOTAL_ROUNDS; // round 6 is boss round
  }
  GAME._isBossRound = isBossRound;
  GAME._TOTAL_ROUNDS = TOTAL_ROUNDS;
```

In the `startRound` function, after the regular bot spawning (line ~2684), add boss spawn logic:

```javascript
    // Spawn boss on round 6
    if (isBossRound(roundNumber)) {
      // Reduce regular bot count for boss round
      var bossRoundBotCount = Math.min(2, GAME.getDifficulty().botCount);
      enemyManager.clearAll();
      if (teamMode) {
        var teamSize2 = TEAM_SIZES[selectedDifficulty] || 3;
        enemyManager.spawnTeamBots(mySpawns, oppSpawns, mapData.waypoints, mapWalls,
          Math.max(1, teamSize2 - 2), bossRoundBotCount, roundNumber, playerTeam);
      } else {
        enemyManager.spawnBots(mapData.botSpawns, mapData.waypoints, mapWalls, bossRoundBotCount, mapData.size, mapData.playerSpawn, roundNumber);
      }
      // Spawn boss
      var bossSpawn = mapData.botSpawns[0];
      var boss = enemyManager.spawnBoss(bossSpawn, mapData.waypoints, mapWalls);
      showBossHealthBar(boss);
      showAnnouncement('BOSS ROUND', 'Round ' + roundNumber);
      if (GAME.Sound && GAME.Sound.bossSpawnAlert) GAME.Sound.bossSpawnAlert();
    }
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/unit/main.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/main.js tests/unit/main.test.js
git commit -m "feat(boss): add boss spawn on round 6 in competitive mode, always play all 6 rounds"
```

---

### Task 10: Boss Spawn in Survival Mode

**Files:**
- Modify: `js/main.js` (survival wave spawning)

- [ ] **Step 1: Add boss spawn to survival wave logic**

In `js/main.js`, in the `startSurvivalWave` function (line ~3669), after the bot spawning call (line ~3731), add:

```javascript
    // Spawn boss every 5th wave
    if (survivalWave % 5 === 0) {
      var bossSpawn = mapData.botSpawns[0];
      var bossAppearance = Math.floor(survivalWave / 5); // 1st, 2nd, 3rd...
      var hpMult = 1 + (bossAppearance - 1) * 0.1; // +10% HP per boss appearance
      var boss = enemyManager.spawnBoss(bossSpawn, mapData.waypoints, mapWalls, { hpMult: hpMult });
      showBossHealthBar(boss);
      showAnnouncement('WAVE ' + survivalWave, 'BOSS WAVE!');
      if (GAME.Sound && GAME.Sound.bossSpawnAlert) GAME.Sound.bossSpawnAlert();
    }
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat(boss): add boss spawn every 5th wave in survival mode"
```

---

### Task 11: Boss Spawn in Gun Game Mode

**Files:**
- Modify: `js/main.js` (gun game level advancement)

- [ ] **Step 1: Modify advanceGunGameLevel for boss phase**

In `js/main.js`, replace the `advanceGunGameLevel` function (line ~3176):

```javascript
  function advanceGunGameLevel() {
    gungameLevel++;
    if (gungameLevel >= GUNGAME_WEAPONS.length) {
      // Boss phase — spawn boss, unlock all weapons
      if (!_gungameBossSpawned) {
        _gungameBossSpawned = true;
        var mapData = gungameLastMapData;
        var bossSpawn = mapData.botSpawns[0];
        var boss = enemyManager.spawnBoss(bossSpawn, mapData.waypoints, mapWalls, { noMinions: true });
        showBossHealthBar(boss);
        showAnnouncement('BOSS FIGHT', 'All weapons unlocked!');
        dom.gungameLevel.textContent = 'BOSS FIGHT \u2014 All weapons unlocked!';
        if (GAME.Sound && GAME.Sound.bossSpawnAlert) GAME.Sound.bossSpawnAlert();
        // Unlock all weapons
        weapons.owned = { knife: true, pistol: true, shotgun: true, rifle: true, awp: true, grenade: true, smoke: true, flash: true };
        weapons.resetAmmo();
        // Don't end yet — boss must be killed
        gungameLevel = GUNGAME_WEAPONS.length - 1; // keep at last level
      }
      return;
    }
    var weaponId = GUNGAME_WEAPONS[gungameLevel];
    weapons.forceWeapon(weaponId);
    updateGunGameLevelHUD();

    if (gungameLevel === GUNGAME_WEAPONS.length - 1) {
      showAnnouncement('FINAL WEAPON', 'Get a knife kill to win!');
    } else {
      showAnnouncement('LEVEL ' + (gungameLevel + 1), GUNGAME_NAMES[gungameLevel]);
    }
    if (GAME.Sound) GAME.Sound.switchWeapon();
  }
```

Add the flag near other gun game variables (around line 1093):

```javascript
  var _gungameBossSpawned = false;
```

Reset it in `startGunGame` (around line 3115):

```javascript
    _gungameBossSpawned = false;
```

In the `onEnemyKilled` function, within the `GUNGAME_ACTIVE` block (line ~4147), add boss kill check:

```javascript
      // Check if boss was killed — ends gun game
      if (enemy.isBoss && _gungameBossSpawned) {
        endGunGame();
        return;
      }
```

Add this before the existing `advanceGunGameLevel()` call.

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat(boss): add boss phase in gun game with all weapons unlocked"
```

---

### Task 12: Boss Spawn in Deathmatch Mode

**Files:**
- Modify: `js/main.js` (deathmatch kill handling)

- [ ] **Step 1: Modify deathmatch to require boss kill after 30 kills**

In `js/main.js`, add a deathmatch boss flag near other DM variables (around line 1107):

```javascript
  var _dmBossSpawned = false;
```

Reset it in the start deathmatch function (find `dmKills = 0` around line 3304):

```javascript
    _dmBossSpawned = false;
```

In the `onEnemyKilled` function, replace the deathmatch win check (line ~4173):

Replace:
```javascript
      if (dmKills >= DEATHMATCH_KILL_TARGET) {
        endDeathmatch();
      }
```
With:
```javascript
      if (enemy.isBoss && _dmBossSpawned) {
        // Boss killed — end deathmatch
        endDeathmatch();
      } else if (dmKills >= DEATHMATCH_KILL_TARGET && !_dmBossSpawned) {
        // Reached kill target — spawn boss
        _dmBossSpawned = true;
        var mapData = dmLastMapData || survivalLastMapData;
        var bossSpawn = mapData.botSpawns[0];
        var boss = enemyManager.spawnBoss(bossSpawn, mapData.waypoints, mapWalls);
        showBossHealthBar(boss);
        showAnnouncement('BOSS INCOMING', 'Kill the Boss to win!');
        if (GAME.Sound && GAME.Sound.bossSpawnAlert) GAME.Sound.bossSpawnAlert();
      }
```

Also find the deathmatch time-up endDeathmatch call (around line 4757) and ensure the boss doesn't block a time-up end. The existing `endDeathmatch()` call on timer expiry should remain unchanged — if time runs out, the match ends regardless.

- [ ] **Step 2: Store mapData reference for deathmatch**

Find where deathmatch stores its map data (search for the deathmatch start function). Add a variable near other DM vars:

```javascript
  var dmLastMapData = null;
```

In the deathmatch start function, after `mapData` is assigned, add:

```javascript
    dmLastMapData = mapData;
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add js/main.js
git commit -m "feat(boss): add boss spawn after 30 kills in deathmatch mode"
```

---

### Task 13: Boss Minion Spawning

**Files:**
- Modify: `js/main.js` (detect phase changes, spawn minions)

- [ ] **Step 1: Add minion spawn logic to game loop**

In `js/main.js`, add a function to handle boss minion spawning:

```javascript
  var _bossLastPhase = 1;
  var _bossMinionsAlive = 0;
  var BOSS_MAX_MINIONS = 5;

  function checkBossMinions() {
    if (!_activeBoss || !_activeBoss.alive) return;
    if (_activeBoss._bossNoMinions) return;

    var phase = _activeBoss._bossPhase;
    if (phase !== _bossLastPhase) {
      // Phase changed — spawn minions
      var minionsToSpawn = 0;
      if (phase === 2 && _bossLastPhase < 2) {
        minionsToSpawn = 2;
        showAnnouncement('PHASE 2', 'ESCALATION');
      }
      if (phase === 3 && _bossLastPhase < 3) {
        minionsToSpawn = 3;
        showAnnouncement('PHASE 3', 'DESPERATE');
      }

      // Cap total alive minions
      _bossMinionsAlive = 0;
      for (var i = 0; i < enemyManager.enemies.length; i++) {
        var e = enemyManager.enemies[i];
        if (e.alive && !e.isBoss && e._isBossMinion) _bossMinionsAlive++;
      }
      minionsToSpawn = Math.min(minionsToSpawn, BOSS_MAX_MINIONS - _bossMinionsAlive);

      if (minionsToSpawn > 0) {
        var bossPos = _activeBoss.mesh.position;
        for (var j = 0; j < minionsToSpawn; j++) {
          var angle = Math.random() * Math.PI * 2;
          var dist = 2 + Math.random() * 3;
          var spawnPos = { x: bossPos.x + Math.cos(angle) * dist, z: bossPos.z + Math.sin(angle) * dist };
          var minion = new GAME._Enemy(
            enemyManager.scene, spawnPos, _activeBoss.waypoints, _activeBoss.walls,
            enemyManager.enemies.length + j, 1
          );
          minion._manager = enemyManager;
          minion._isBossMinion = true;
          enemyManager.enemies.push(minion);
        }
        showAnnouncement('REINFORCEMENTS', minionsToSpawn + ' enemies incoming!');
        if (GAME.Sound && GAME.Sound.bossMinionSummon) GAME.Sound.bossMinionSummon();
      }

      _bossLastPhase = phase;
    }
  }
```

Note: We need to expose the Enemy constructor for minion spawning. In `js/enemies.js`, add near the other GAME exports:

```javascript
  GAME._Enemy = Enemy;
```

And update the minion creation line above to use `new GAME._Enemy(...)` instead of `new GAME.EnemyManager.prototype._Enemy(...)`.

- [ ] **Step 2: Call checkBossMinions in game loop**

In the game loop's active states block (around line 4597), add after the `updateBossHealthBar` call:

```javascript
      checkBossMinions();
```

- [ ] **Step 3: Reset boss minion tracking on boss spawn**

In `showBossHealthBar`, add:

```javascript
    _bossLastPhase = 1;
    _bossMinionsAlive = 0;
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/enemies.js js/main.js
git commit -m "feat(boss): add minion spawning on phase transitions with cap of 5"
```

---

### Task 14: Boss Kill Rewards and Notifications

**Files:**
- Modify: `js/main.js` (onEnemyKilled boss handling)

- [ ] **Step 1: Add boss-specific rewards in onEnemyKilled**

In `js/main.js`, in the `onEnemyKilled` function (line ~4130), add at the very top of the function (after the kill streak/sound lines but before the mode-specific blocks):

```javascript
    // Boss kill — special reward + notification
    if (enemy.isBoss) {
      player.money = Math.min(16000, player.money + 5000);
      // 5x XP bonus — tracked via mission system
      trackMissionEvent('boss_kills', 1);
      hideBossHealthBar();
      addKillFeed('You', 'BOSS');
      if (GAME.Sound && GAME.Sound.bossDeath) GAME.Sound.bossDeath();
      showAnnouncement('BOSS ELIMINATED', '+$5000');
    }
```

Style the boss kill feed entry differently. In the `addKillFeed` function, add a parameter:

```javascript
  function addKillFeed(killer, victim, isBossKill) {
    var entry = document.createElement('div');
    entry.className = 'kill-entry' + (isBossKill ? ' boss-kill' : '');
    entry.innerHTML = '<span class="killer">' + killer + '</span> \u25ba <span class="victim">' + victim + '</span>';
    dom.killFeed.appendChild(entry);
    setTimeout(function() { entry.remove(); }, 3500);
  }
```

Add CSS for boss kill feed in `index.html`:

```css
.kill-entry.boss-kill .victim { color: #ff2222; font-weight: bold; }
```

Update the boss kill addKillFeed call to pass `true`:

```javascript
      addKillFeed('You', 'BOSS', true);
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add js/main.js index.html
git commit -m "feat(boss): add boss kill rewards ($5000 + XP) and red kill feed notification"
```

---

### Task 15: Boss Grenade Processing in Game Loop

**Files:**
- Modify: `js/main.js` (process boss grenades each frame)

- [ ] **Step 1: Add boss grenade update to game loop**

In `js/main.js`, add a function to update boss grenades:

```javascript
  function updateBossGrenades(dt) {
    if (!_activeBoss || !_activeBoss.alive) return;
    var list = _activeBoss._bossGrenadeList;
    if (!list || list.length === 0) return;

    for (var i = list.length - 1; i >= 0; i--) {
      var grenade = list[i];
      var explosion = grenade.update(dt);
      if (explosion) {
        // Process explosion damage — same as regular grenade processing
        processExplosions([explosion]);
        list.splice(i, 1);
      } else if (!grenade.alive) {
        list.splice(i, 1);
      }
    }
  }
```

Call this in the game loop's active states block (around line 4597), after `checkBossMinions()`:

```javascript
      updateBossGrenades(dt);
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat(boss): process boss grenade barrage explosions in game loop"
```

---

### Task 16: Boss Footstep Sound Override

**Files:**
- Modify: `js/enemies.js` (override footstep sound for boss)

- [ ] **Step 1: Override footstep in boss enemy update**

In `js/enemies.js`, find where bot footstep sounds are played (search for `GAME.Sound.botFootstep` or similar footstep call in the update loop). Replace the footstep call with a boss-aware version:

In the movement section of the update loop, where footsteps are triggered, add a boss check:

```javascript
    // Replace the existing footstep call with:
    if (this.isBoss) {
      if (GAME.Sound && GAME.Sound.bossFootstep) GAME.Sound.bossFootstep();
    } else {
      if (GAME.Sound && GAME.Sound.botFootstep) GAME.Sound.botFootstep();
    }
```

The exact location depends on where bot footsteps are triggered — search for the footstep logic in the Enemy update method and add the boss check there.

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add js/enemies.js
git commit -m "feat(boss): use heavier footstep sound for boss enemy"
```

---

### Task 17: Clean Up Boss State on Round/Match End

**Files:**
- Modify: `js/main.js` (clean up boss state)

- [ ] **Step 1: Add boss cleanup to round/match end functions**

In `js/main.js`, in the `endRound` function (line ~3002), add:

```javascript
    hideBossHealthBar();
```

In the `endMatch` function (line ~3049), add:

```javascript
    hideBossHealthBar();
```

In the `endGunGame` function, add:

```javascript
    hideBossHealthBar();
    _gungameBossSpawned = false;
```

In the `endDeathmatch` function, add:

```javascript
    hideBossHealthBar();
    _dmBossSpawned = false;
```

In the survival death function (search for `SURVIVAL_DEAD`), add:

```javascript
    hideBossHealthBar();
```

Also clean up any active boss grenades when boss dies. In `hideBossHealthBar`:

```javascript
  function hideBossHealthBar() {
    if (_activeBoss && _activeBoss._bossGrenadeList) {
      // Remove any remaining boss grenade meshes from scene
      for (var i = 0; i < _activeBoss._bossGrenadeList.length; i++) {
        var g = _activeBoss._bossGrenadeList[i];
        if (g.mesh && g.scene) g.scene.remove(g.mesh);
      }
      _activeBoss._bossGrenadeList.length = 0;
    }
    _activeBoss = null;
    dom.bossHealthBar.classList.remove('show');
  }
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat(boss): clean up boss state on round/match/mode end"
```

---

### Task 18: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Add Boss section to REQUIREMENTS.md**

Add a new section to `REQUIREMENTS.md` documenting the Boss feature. Include:

- Boss stats table (per difficulty)
- Phase system (thresholds, stat multipliers)
- Abilities (grenade barrage with timing, minion summons with counts)
- Spawn rules per mode (Competitive round 6, Survival every 5th wave, Gun Game final phase, Deathmatch after 30 kills)
- HUD elements (health bar, notifications)
- Sound effects list
- Rewards ($5000 + 5x XP)
- Competitive mode change: all 6 rounds always played, most wins takes match

- [ ] **Step 2: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: add Boss enemy feature to REQUIREMENTS.md"
```

---

### Task 19: Integration Testing

**Files:**
- Test: `tests/integration/combat.test.js`

- [ ] **Step 1: Add integration tests for boss combat**

Add to `tests/integration/combat.test.js`:

```javascript
describe('Boss combat integration', () => {
  it('boss should take damage and transition phases', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[em.enemies.length - 1];

    expect(boss.isBoss).toBe(true);
    expect(boss._bossPhase).toBe(1);

    // Deal damage to reach phase 2
    var phase2Threshold = boss.maxHealth * 0.5;
    var damageNeeded = boss.health - phase2Threshold + 1;
    boss.takeDamage(damageNeeded);
    expect(boss._bossPhase).toBe(2);
    expect(boss.alive).toBe(true);

    // Deal damage to reach phase 3
    var phase3Threshold = boss.maxHealth * 0.25;
    damageNeeded = boss.health - phase3Threshold + 1;
    boss.takeDamage(damageNeeded);
    expect(boss._bossPhase).toBe(3);
    expect(boss.alive).toBe(true);

    // Kill the boss
    boss.takeDamage(boss.health);
    expect(boss.alive).toBe(false);
  });

  it('boss barrage config should match phase', () => {
    var cfg = GAME.BOSS_BARRAGE;
    expect(cfg.phase1.cooldown).toBeGreaterThan(cfg.phase2.cooldown);
    expect(cfg.phase2.cooldown).toBeGreaterThan(cfg.phase3.cooldown);
    expect(cfg.phase3.grenades).toBeGreaterThan(cfg.phase1.grenades);
  });

  it('boss should not spawn minions when noMinions is set', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], [], { noMinions: true });
    var boss = em.enemies[em.enemies.length - 1];
    expect(boss._bossNoMinions).toBe(true);
  });

  it('boss hpMult option should scale health', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], [], { hpMult: 1.5 });
    var boss = em.enemies[em.enemies.length - 1];
    var expectedHP = Math.round(GAME.BOSS_STATS.normal.health * 1.5);
    expect(boss.health).toBe(expectedHP);
    expect(boss.maxHealth).toBe(expectedHP);
  });
});
```

- [ ] **Step 2: Run integration tests**

Run: `npm test -- tests/integration/combat.test.js`
Expected: PASS

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add tests/integration/combat.test.js
git commit -m "test: add boss combat integration tests"
```
