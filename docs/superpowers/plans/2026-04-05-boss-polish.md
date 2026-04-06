# Boss Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the boss encounter into a full climactic arc with atmospheric escalation, charge attack, adaptive AI, spectacular kill payoff, and stronger shield.

**Architecture:** Five independent feature areas layered onto existing boss systems in `enemies.js`, `main.js`, `sound.js`, and `index.html`. Each task is self-contained and testable. Atmosphere and kill payoff are driven from the game loop in `main.js`. Charge attack and adaptive tactics extend the enemy update in `enemies.js`. New sounds in `sound.js`.

**Tech Stack:** Three.js r160.1 (global `THREE`), Web Audio API, IIFE module pattern on `window.GAME`

---

### Task 1: Shield Buff

**Files:**
- Modify: `js/enemies.js:2150-2153` (takeDamage), `js/enemies.js:2397-2398` (_updateBossPhase shield timer)
- Modify: `tests/integration/combat.test.js` (shield tests)
- Modify: `REQUIREMENTS.md` (shield section)

- [ ] **Step 1: Update shield test expectations**

In `tests/integration/combat.test.js`, find the test `'boss shield should reduce damage'` and update:

```js
    boss._bossShieldTimer = 6.0;
    var hpBefore = boss.health;
    boss.takeDamage(100);
    // Should only take 2% = 2 damage
    expect(boss.health).toBe(hpBefore - 2);
```

Find the test `'boss HP should floor at 1 during shield'` and update `boss._bossShieldTimer = 6.0;`.

Find the test for phase transition shield timer and update the expected value to `toBeCloseTo(6.0, 1)`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: shield-related tests fail with mismatched values

- [ ] **Step 3: Update shield values in enemies.js**

In `js/enemies.js:2150-2153`, change:
```js
    // Boss shield: reduce damage by 98% and floor HP at 1
    if (this.isBoss && this._bossShieldActive) {
      amount = Math.round(amount * 0.02);
```

In `js/enemies.js:2397-2398`, change:
```js
      this._bossShieldActive = true;
      this._bossShieldTimer = 6.0;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all shield tests pass

- [ ] **Step 5: Update REQUIREMENTS.md**

Update the Phase Transition Shield section:
```
- Duration: 6 seconds (`_bossShieldTimer = 6.0`)
- Reduces incoming damage by 98% (`amount = Math.round(amount * 0.02)`)
```

- [ ] **Step 6: Commit**

```bash
git add js/enemies.js tests/integration/combat.test.js REQUIREMENTS.md
git commit -m "buff(boss): strengthen shield to 98% DR and 6s duration"
```

---

### Task 2: Boss Heartbeat Sound

**Files:**
- Modify: `js/sound.js` (add `bossHeartbeat` method)
- Modify: `js/main.js` (heartbeat tick timer in boss update section)
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Write test for bossHeartbeat sound existence**

In `tests/unit/sound.test.js` (or create if needed), add:

```js
it('should have bossHeartbeat sound method', () => {
  expect(typeof GAME.Sound.bossHeartbeat).toBe('function');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `bossHeartbeat` is not defined

- [ ] **Step 3: Add bossHeartbeat sound to sound.js**

In `js/sound.js`, after the `bossDeath` function (around line 2073), add:

```js
    bossHeartbeat: function(gain) {
      var c = ensureCtx();
      var now = c.currentTime;
      var g = gain || 0.15;

      // First thump (low "lub")
      var osc1 = c.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(45, now);
      osc1.frequency.exponentialRampToValueAtTime(30, now + 0.1);
      var g1 = c.createGain();
      g1.gain.setValueAtTime(g, now);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(g1);
      g1.connect(masterGain);
      osc1.onended = function() {
        try { osc1.disconnect(); } catch(e) {}
        try { g1.disconnect(); } catch(e) {}
      };
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Second thump (higher "dub"), 0.15s after first
      var osc2 = c.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(55, now + 0.15);
      osc2.frequency.exponentialRampToValueAtTime(35, now + 0.25);
      var g2 = c.createGain();
      g2.gain.setValueAtTime(0.001, now);
      g2.gain.setValueAtTime(g * 0.7, now + 0.15);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc2.connect(g2);
      g2.connect(masterGain);
      osc2.onended = function() {
        try { osc2.disconnect(); } catch(e) {}
        try { g2.disconnect(); } catch(e) {}
      };
      osc2.start(now);
      osc2.stop(now + 0.3);
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Add heartbeat tick timer in main.js**

In `js/main.js`, near the boss state variables (around where `_activeBoss` is declared), add:

```js
  var _bossHeartbeatTimer = 0;
  var _bossHeartbeatBPM = 60;
  var _bossHeartbeatGain = 0.15;
```

In the game loop boss update section (around line 5062, after `_activeBoss._updateBossShield(dt)`), add:

```js
      if (_activeBoss && _activeBoss.alive) {
        // Heartbeat — lerp BPM and gain toward phase target
        var phase = _activeBoss._bossPhase;
        var targetBPM = phase === 3 ? 120 : phase === 2 ? 90 : 60;
        var targetGain = phase === 3 ? 0.35 : phase === 2 ? 0.25 : 0.15;
        _bossHeartbeatBPM += (targetBPM - _bossHeartbeatBPM) * Math.min(1, dt);
        _bossHeartbeatGain += (targetGain - _bossHeartbeatGain) * Math.min(1, dt);
        _bossHeartbeatTimer -= dt;
        if (_bossHeartbeatTimer <= 0) {
          if (GAME.Sound && GAME.Sound.bossHeartbeat) GAME.Sound.bossHeartbeat(_bossHeartbeatGain);
          _bossHeartbeatTimer = 60 / _bossHeartbeatBPM;
        }
      }
```

Reset `_bossHeartbeatTimer = 0; _bossHeartbeatBPM = 60; _bossHeartbeatGain = 0.15;` wherever boss is spawned (search for `showBossHealthBar` calls).

- [ ] **Step 6: Update REQUIREMENTS.md**

Add a new subsection under Boss Enemy:

```
#### Boss Heartbeat
- Procedural two-thump heartbeat (`Sound.bossHeartbeat(gain)`) plays on a frame-based interval while boss is alive
- Phase 1: 60 BPM, gain 0.15; Phase 2: 90 BPM, gain 0.25; Phase 3: 120 BPM, gain 0.35
- BPM and gain lerp smoothly toward phase targets (lerpSpeed = 1.0/s)
- Timer ticked from game loop alongside `_updateBossShield`
- Stops when boss dies (timer not ticked when `_activeBoss` is null or dead)
```

- [ ] **Step 7: Commit**

```bash
git add js/sound.js js/main.js REQUIREMENTS.md
git commit -m "feat(boss): add escalating heartbeat sound during boss fight"
```

---

### Task 3: Atmosphere Color Grading

**Files:**
- Modify: `js/main.js` (boss atmosphere state, lerp in game loop, reset on death)
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Write test for atmosphere state**

In an appropriate test file, add:

```js
it('should expose _bossAtmosphere object on GAME', () => {
  expect(GAME._bossAtmosphere).toBeDefined();
  expect(GAME._bossAtmosphere.redMult).toBe(1.0);
  expect(GAME._bossAtmosphere.vignetteAdd).toBe(0);
  expect(GAME._bossAtmosphere.contrast).toBe(0);
  expect(GAME._bossAtmosphere.saturation).toBe(1.0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `_bossAtmosphere` is undefined

- [ ] **Step 3: Add boss atmosphere state and lerp logic**

In `js/main.js`, near the boss state variables, add:

```js
  GAME._bossAtmosphere = {
    active: false,
    redMult: 1.0,       // current
    vignetteAdd: 0,
    contrast: 0,         // additive on top of map base
    saturation: 1.0,
    targetRedMult: 1.0,  // target
    targetVignetteAdd: 0,
    targetContrast: 0,
    targetSaturation: 1.0,
    flashVignette: 0     // phase transition flash overlay
  };
```

Add a function `updateBossAtmosphere(dt)`:

```js
  function updateBossAtmosphere(dt) {
    var atm = GAME._bossAtmosphere;
    if (!atm.active && atm.redMult === 1.0 && atm.vignetteAdd === 0) return;

    var lerpSpeed = atm.active ? 1.0 : 0.7; // faster reset on death
    var t = Math.min(1, lerpSpeed * dt);
    atm.redMult += (atm.targetRedMult - atm.redMult) * t;
    atm.vignetteAdd += (atm.targetVignetteAdd - atm.vignetteAdd) * t;
    atm.contrast += (atm.targetContrast - atm.contrast) * t;
    atm.saturation += (atm.targetSaturation - atm.saturation) * t;

    // Phase transition vignette flash decay
    if (atm.flashVignette > 0) {
      atm.flashVignette -= dt * 2; // decays over ~0.5s
      if (atm.flashVignette < 0) atm.flashVignette = 0;
    }

    // Apply to post-processing
    if (GAME._postProcess && GAME._postProcess.colorGrade && GAME._currentColorGrade) {
      var cg = GAME._currentColorGrade;
      var pp = GAME._postProcess.colorGrade;
      pp.tint.value.set(cg.tint[0] * atm.redMult, cg.tint[1], cg.tint[2]);
      pp.vignetteStrength.value = cg.vignetteStrength + atm.vignetteAdd + atm.flashVignette;
      pp.contrast.value = cg.contrast + atm.contrast;
      pp.saturation.value = cg.saturation * atm.saturation;
    }
  }
```

In the game loop, call `updateBossAtmosphere(dt)` after the boss heartbeat section.

When boss phase changes are detected in `checkBossMinions` (where phase announcements happen), set targets:

```js
    // Set atmosphere targets for new phase
    var atm = GAME._bossAtmosphere;
    if (phase === 2) {
      atm.targetRedMult = 1.08;
      atm.targetVignetteAdd = 0.2;
      atm.targetContrast = 0.05;
      atm.targetSaturation = 1.0;
      atm.flashVignette = 0.5;
    } else if (phase === 3) {
      atm.targetRedMult = 1.15;
      atm.targetVignetteAdd = 0.35;
      atm.targetContrast = 0.1;
      atm.targetSaturation = 0.85;
      atm.flashVignette = 0.5;
    }
```

On boss spawn, activate atmosphere with Phase 1 values:

```js
    GAME._bossAtmosphere.active = true;
    GAME._bossAtmosphere.targetRedMult = 1.0;
    GAME._bossAtmosphere.targetVignetteAdd = 0.1;
    GAME._bossAtmosphere.targetContrast = 0;
    GAME._bossAtmosphere.targetSaturation = 1.0;
```

On boss death, reset:

```js
    GAME._bossAtmosphere.active = false;
    GAME._bossAtmosphere.targetRedMult = 1.0;
    GAME._bossAtmosphere.targetVignetteAdd = 0;
    GAME._bossAtmosphere.targetContrast = 0;
    GAME._bossAtmosphere.targetSaturation = 1.0;
```

- [ ] **Step 4: Add phase transition screen shake**

In `checkBossMinions`, where phase transitions trigger announcements (around line 4442-4446), add after each announcement:

```js
      triggerScreenShake(0.15);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Update REQUIREMENTS.md**

Add a new subsection:

```
#### Boss Atmosphere
- `GAME._bossAtmosphere` — state object controlling color grading overlay during boss fight
- Phase 1: subtle vignette (+0.1); Phase 2: red tint (R×1.08), vignette +0.2, contrast +0.05; Phase 3: red tint (R×1.15), vignette +0.35, contrast +0.1, saturation 0.85
- All values lerp smoothly each frame (lerpSpeed = 1.0/s when active, 0.7/s on reset)
- Phase transition flash: vignette spikes +0.5, decays over 0.5s
- Phase transition screen shake: intensity 0.15
- On boss death: all values lerp back to map defaults
- `updateBossAtmosphere(dt)` called each frame from game loop
```

- [ ] **Step 7: Commit**

```bash
git add js/main.js REQUIREMENTS.md
git commit -m "feat(boss): add atmosphere color grading escalation across phases"
```

---

### Task 4: Charge Attack

**Files:**
- Modify: `js/enemies.js` (charge state fields in `_initBoss`, charge evaluation, wind-up, execution, recovery in update loop)
- Modify: `js/sound.js` (`bossChargeWindup`, `bossChargeMelee`)
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Write tests for charge attack**

In `tests/integration/combat.test.js`, add:

```js
describe('Boss charge attack', () => {
  it('should initialize charge state fields on boss', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[0];
    expect(boss._bossChargeState).toBe('idle');
    expect(boss._bossChargeEvalTimer).toBeGreaterThan(0);
    expect(boss._bossChargeCooldown).toBe(0);
    expect(boss._bossChargeTarget).toBe(null);
  });

  it('should not charge when player is too close', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[0];
    boss._bossChargeEvalTimer = 0; // force eval
    boss._bossShieldActive = false;
    boss._bossBarrageActive = false;
    boss._bossWindupTimer = 0;
    // Player right next to boss — too close (< 8 units)
    var canCharge = boss._evaluateBossCharge({ x: 6, z: 5 });
    expect(canCharge).toBe(false);
  });

  it('should not charge when player is too far', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[0];
    boss._bossChargeEvalTimer = 0;
    boss._bossShieldActive = false;
    boss._bossBarrageActive = false;
    boss._bossWindupTimer = 0;
    // Player 50 units away — too far (> 25 units)
    var canCharge = boss._evaluateBossCharge({ x: 55, z: 5 });
    expect(canCharge).toBe(false);
  });

  it('should set charge state to windup when charge starts', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[0];
    boss._startBossCharge({ x: 20, z: 5 });
    expect(boss._bossChargeState).toBe('windup');
    expect(boss._bossChargeTimer).toBeCloseTo(0.8, 1);
    expect(boss._bossChargeTarget).toEqual({ x: 20, z: 5 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — charge methods and fields don't exist

- [ ] **Step 3: Add charge sounds to sound.js**

In `js/sound.js`, after `bossHeartbeat`, add:

```js
    bossChargeWindup: function() {
      var c = ensureCtx();
      var now = c.currentTime;
      // Rising growl
      var osc = c.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.8);
      var dist = c.createWaveShaper();
      dist.curve = getDistortionCurve(40);
      var gain = c.createGain();
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.6);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.8);
      osc.connect(dist);
      dist.connect(gain);
      gain.connect(masterGain);
      osc.onended = function() {
        try { osc.disconnect(); } catch(e) {}
        try { dist.disconnect(); } catch(e) {}
        try { gain.disconnect(); } catch(e) {}
      };
      osc.start(now);
      osc.stop(now + 0.8);
      // Scrape noise layer
      var noise = c.createBufferSource();
      noise.buffer = getNoiseBuffer(0.8);
      var bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(300, now);
      bp.Q.value = 2;
      var nGain = c.createGain();
      nGain.gain.setValueAtTime(0.0, now);
      nGain.gain.linearRampToValueAtTime(0.15, now + 0.6);
      nGain.gain.linearRampToValueAtTime(0.0, now + 0.8);
      noise.connect(bp);
      bp.connect(nGain);
      nGain.connect(masterGain);
      noise.onended = function() {
        try { noise.disconnect(); } catch(e) {}
        try { bp.disconnect(); } catch(e) {}
        try { nGain.disconnect(); } catch(e) {}
      };
      noise.start(now);
      noise.stop(now + 0.8);
    },

    bossChargeMelee: function() {
      var c = ensureCtx();
      var now = c.currentTime;
      // Heavy impact thud
      var osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.3);
      var gain = c.createGain();
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.onended = function() {
        try { osc.disconnect(); } catch(e) {}
        try { gain.disconnect(); } catch(e) {}
      };
      osc.start(now);
      osc.stop(now + 0.3);
      // Impact noise burst
      var noise = c.createBufferSource();
      noise.buffer = getNoiseBuffer(0.15);
      var lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(800, now);
      lp.frequency.exponentialRampToValueAtTime(100, now + 0.15);
      var nGain = c.createGain();
      nGain.gain.setValueAtTime(0.4, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      noise.connect(lp);
      lp.connect(nGain);
      nGain.connect(masterGain);
      noise.onended = function() {
        try { noise.disconnect(); } catch(e) {}
        try { lp.disconnect(); } catch(e) {}
        try { nGain.disconnect(); } catch(e) {}
      };
      noise.start(now);
      noise.stop(now + 0.15);
    },
```

- [ ] **Step 4: Add charge state fields to _initBoss in enemies.js**

In `js/enemies.js`, in `_initBoss` after the shield timer reset (line ~2359), add:

```js
    // Charge attack state
    this._bossChargeState = 'idle';     // idle | windup | charging | recovery
    this._bossChargeTimer = 0;
    this._bossChargeEvalTimer = 10;     // first eval after 10s
    this._bossChargeCooldown = 0;
    this._bossChargeTarget = null;
    this._bossChargeBaseEmissive = null; // stored for glow ramp
```

- [ ] **Step 5: Add charge evaluation and execution methods**

In `js/enemies.js`, after `_updateBossShield`, add:

```js
  var BOSS_CHARGE = {
    evalInterval: 10,
    windupTime: 0.8,
    chargeSpeedMult: 2.5,
    chargeDuration: 1.5,
    recoveryTime: 0.5,
    hitRange: 2,
    hitDamage: { easy: 25, normal: 40, hard: 55, elite: 70 },
    minRange: 8,
    maxRange: 25,
    chanceByPhase: { 1: 0.2, 2: 0.4, 3: 0.6 },
    cooldownByPhase: { 1: 12, 2: 10, 3: 7 }
  };

  Enemy.prototype._evaluateBossCharge = function(playerPos) {
    if (!this.isBoss || this._bossChargeState !== 'idle') return false;
    if (this._bossShieldActive || this._bossBarrageActive || this._bossWindupTimer > 0) return false;
    if (this._bossChargeCooldown > 0) return false;

    var pos = this.mesh.position;
    var dx = playerPos.x - pos.x;
    var dz = playerPos.z - pos.z;
    var dist = Math.sqrt(dx * dx + dz * dz);

    var minRange = this._bossAdaptiveMinChargeRange || BOSS_CHARGE.minRange;
    if (dist < minRange || dist > BOSS_CHARGE.maxRange) return false;

    // LOS check
    var dir = new THREE.Vector3(dx, 0, dz).normalize();
    this._rc.set(new THREE.Vector3(pos.x, 0.5, pos.z), dir);
    this._rc.far = dist;
    var hits = this._rc.intersectObjects(this.walls, false);
    if (hits.length > 0 && hits[0].distance < dist - 1) return false;

    var chance = this._bossAdaptiveChargeChance || BOSS_CHARGE.chanceByPhase[this._bossPhase] || 0.2;
    return Math.random() < chance;
  };

  Enemy.prototype._startBossCharge = function(playerPos) {
    this._bossChargeState = 'windup';
    this._bossChargeTimer = BOSS_CHARGE.windupTime;
    this._bossChargeTarget = { x: playerPos.x, z: playerPos.z };
    if (GAME.Sound && GAME.Sound.bossChargeWindup) GAME.Sound.bossChargeWindup();
  };

  Enemy.prototype._updateBossCharge = function(dt, playerPos) {
    if (!this.isBoss) return 0;

    // Tick eval timer
    if (this._bossChargeCooldown > 0) this._bossChargeCooldown -= dt;
    if (this._bossChargeState === 'idle') {
      this._bossChargeEvalTimer -= dt;
      if (this._bossChargeEvalTimer <= 0) {
        this._bossChargeEvalTimer = BOSS_CHARGE.evalInterval;
        if (this._evaluateBossCharge(playerPos)) {
          this._startBossCharge(playerPos);
        }
      }
      return 0;
    }

    var damageToPlayer = 0;
    this._bossChargeTimer -= dt;

    if (this._bossChargeState === 'windup') {
      // Face player during windup
      var pos = this.mesh.position;
      var dx = this._bossChargeTarget.x - pos.x;
      var dz = this._bossChargeTarget.z - pos.z;
      var targetRot = Math.atan2(dx, dz) + Math.PI;
      this._faceDirection(targetRot, dt, 12);

      // Ramp emissive glow
      var progress = 1 - (this._bossChargeTimer / BOSS_CHARGE.windupTime);
      this._setBossEmissiveIntensity(0.3 + progress * 0.7);

      if (this._bossChargeTimer <= 0) {
        this._bossChargeState = 'charging';
        this._bossChargeTimer = BOSS_CHARGE.chargeDuration;
      }
    } else if (this._bossChargeState === 'charging') {
      var pos2 = this.mesh.position;
      var tx = this._bossChargeTarget.x;
      var tz = this._bossChargeTarget.z;
      var cdx = tx - pos2.x;
      var cdz = tz - pos2.z;
      var cdist = Math.sqrt(cdx * cdx + cdz * cdz);

      if (cdist < BOSS_CHARGE.hitRange) {
        // Check if player is near the target
        var pdx = playerPos.x - pos2.x;
        var pdz = playerPos.z - pos2.z;
        var pdist = Math.sqrt(pdx * pdx + pdz * pdz);
        if (pdist < BOSS_CHARGE.hitRange) {
          // Hit player
          var diffName = _getDiffName();
          damageToPlayer = BOSS_CHARGE.hitDamage[diffName] || BOSS_CHARGE.hitDamage.normal;
          if (GAME.Sound && GAME.Sound.bossChargeMelee) GAME.Sound.bossChargeMelee();
          if (GAME.triggerScreenShake) GAME.triggerScreenShake(0.2);
        }
        this._bossChargeState = 'recovery';
        this._bossChargeTimer = BOSS_CHARGE.recoveryTime;
        this._setBossEmissiveIntensity(0.3);
      } else if (this._bossChargeTimer <= 0) {
        // Time expired — missed
        this._bossChargeState = 'recovery';
        this._bossChargeTimer = BOSS_CHARGE.recoveryTime;
        this._setBossEmissiveIntensity(0.3);
      } else {
        // Sprint toward target
        var chargeSpeed = this._bossBaseSpeed * BOSS_CHARGE.chargeSpeedMult;
        this._moveToward(this._bossChargeTarget, dt, chargeSpeed);
      }
    } else if (this._bossChargeState === 'recovery') {
      // Stand still during recovery (vulnerable)
      if (this._bossChargeTimer <= 0) {
        this._bossChargeState = 'idle';
        this._bossChargeCooldown = BOSS_CHARGE.cooldownByPhase[this._bossPhase] || 12;
        this._bossChargeTarget = null;
      }
    }

    return damageToPlayer;
  };

  Enemy.prototype._setBossEmissiveIntensity = function(intensity) {
    if (!this.isBoss || !this.mesh) return;
    this.mesh.traverse(function(child) {
      if (child.isMesh && child.material && child.material.emissive) {
        child.material.emissiveIntensity = intensity;
      }
    });
  };
```

- [ ] **Step 6: Integrate charge into enemy update loop**

In `js/enemies.js`, in the `update` method, find the boss barrage section (around line 1814-1824). After the barrage block, add:

```js
      // Boss charge attack
      if (this.isBoss && this.state === ATTACK) {
        var chargeDmg = this._updateBossCharge(dt, playerPos);
        if (chargeDmg > 0) damageToPlayer += chargeDmg;
      }
```

Also make sure the charge blocks normal combat movement: in the movement sections of the ATTACK state, guard with:

```js
      if (this.isBoss && this._bossChargeState !== 'idle') {
        // Skip normal combat movement during charge
      } else {
        // ... existing combat movement code
      }
```

- [ ] **Step 7: Run all tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 8: Update REQUIREMENTS.md**

Add a new subsection:

```
#### Boss Charge Attack
- `BOSS_CHARGE` config: evalInterval 10s, windupTime 0.8s, chargeSpeedMult 2.5×, chargeDuration 1.5s, recoveryTime 0.5s, hitRange 2 units
- Hit damage by difficulty: easy 25, normal 40, hard 55, elite 70
- Evaluation: every ~10s when in ATTACK state, idle charge, no active shield/barrage
- Range check: player must be 8–25 units away (minRange adjustable by adaptive AI)
- LOS check: raycast to player must be clear
- Phase-based chance: Phase 1 20%, Phase 2 40%, Phase 3 60% (adjustable by adaptive AI)
- Cooldown after charge: Phase 1 12s, Phase 2 10s, Phase 3 7s
- Telegraph: 0.8s wind-up — boss faces player, emissive glow ramps from 0.3 to 1.0, `bossChargeWindup` sound
- Charge: boss sprints at 2.5× base speed toward snapshotted player position (not tracking)
- Hit: if player within 2 units of boss at target, deals difficulty-scaled damage, `bossChargeMelee` sound, screen shake 0.2
- Miss: 0.5s recovery stun, boss stands still and is vulnerable
- Charge state fields: `_bossChargeState` (idle/windup/charging/recovery), `_bossChargeTimer`, `_bossChargeEvalTimer`, `_bossChargeCooldown`, `_bossChargeTarget`
- Normal combat movement skipped while charge state is not idle
- Sounds: `bossChargeWindup` (rising sawtooth growl + bandpass noise, 0.8s), `bossChargeMelee` (heavy sine thud + lowpass noise burst)
```

- [ ] **Step 9: Commit**

```bash
git add js/enemies.js js/sound.js REQUIREMENTS.md
git commit -m "feat(boss): add charge attack with telegraph, sprint, and melee hit"
```

---

### Task 5: Adaptive Tactics

**Files:**
- Modify: `js/enemies.js` (tracking fields in `_initBoss`, tracking update, response application)
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Write tests for adaptive behavior tracking**

In `tests/integration/combat.test.js`, add:

```js
describe('Boss adaptive tactics', () => {
  it('should initialize adaptive tracking fields', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[0];
    expect(boss._bossPlayerCampScore).toBe(0);
    expect(boss._bossPlayerAggroScore).toBe(0);
    expect(boss._bossPlayerTrackPos).toEqual({ x: 0, z: 0 });
    expect(boss._bossAdaptiveEvalTimer).toBeGreaterThan(0);
  });

  it('should increase camp score when player stays still', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 20, z: 20 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[0];
    var playerPos = { x: 5, z: 5 };
    boss._bossPlayerTrackPos = { x: 5, z: 5 };
    // Simulate several frames of stationary player
    for (var i = 0; i < 60; i++) {
      boss._updateBossAdaptive(0.016, playerPos);
    }
    expect(boss._bossPlayerCampScore).toBeGreaterThan(0.3);
  });

  it('should increase aggro score when player approaches boss', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 20, z: 20 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[0];
    boss._bossPlayerTrackPos = { x: 5, z: 5 };
    // Simulate player rushing toward boss
    for (var i = 0; i < 60; i++) {
      var px = 5 + i * 0.2;
      var pz = 5 + i * 0.2;
      boss._updateBossAdaptive(0.016, { x: px, z: pz });
    }
    expect(boss._bossPlayerAggroScore).toBeGreaterThan(0.3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — adaptive fields and methods don't exist

- [ ] **Step 3: Add adaptive tracking fields to _initBoss**

In `js/enemies.js`, in `_initBoss`, after the charge state fields, add:

```js
    // Adaptive tactics state
    this._bossPlayerCampScore = 0;
    this._bossPlayerAggroScore = 0;
    this._bossPlayerTrackPos = { x: 0, z: 0 };
    this._bossAdaptiveEvalTimer = 3;
    this._bossAdaptiveChargeChance = null; // null = use default
    this._bossAdaptiveMinChargeRange = null;
```

- [ ] **Step 4: Add adaptive tracking update method**

In `js/enemies.js`, after the charge attack methods, add:

```js
  Enemy.prototype._updateBossAdaptive = function(dt, playerPos) {
    if (!this.isBoss) return;

    var px = playerPos.x || 0;
    var pz = playerPos.z || 0;
    var dx = px - this._bossPlayerTrackPos.x;
    var dz = pz - this._bossPlayerTrackPos.z;
    var moved = Math.sqrt(dx * dx + dz * dz);

    // Update camping score: accumulate when player barely moves
    if (moved < 0.5 * dt * 60) { // less than ~0.5 units per second
      this._bossPlayerCampScore = Math.min(1, this._bossPlayerCampScore + dt * 0.15);
    } else {
      this._bossPlayerCampScore = Math.max(0, this._bossPlayerCampScore - dt * 0.1);
    }

    // Update aggro score: accumulate when player closes distance to boss
    var bx = this.mesh.position.x;
    var bz = this.mesh.position.z;
    var oldDist = Math.sqrt(
      (this._bossPlayerTrackPos.x - bx) * (this._bossPlayerTrackPos.x - bx) +
      (this._bossPlayerTrackPos.z - bz) * (this._bossPlayerTrackPos.z - bz)
    );
    var newDist = Math.sqrt((px - bx) * (px - bx) + (pz - bz) * (pz - bz));
    if (newDist < oldDist - 0.1) {
      this._bossPlayerAggroScore = Math.min(1, this._bossPlayerAggroScore + dt * 0.15);
    } else {
      this._bossPlayerAggroScore = Math.max(0, this._bossPlayerAggroScore - dt * 0.1);
    }

    this._bossPlayerTrackPos.x = px;
    this._bossPlayerTrackPos.z = pz;

    // Evaluate responses every ~3s
    this._bossAdaptiveEvalTimer -= dt;
    if (this._bossAdaptiveEvalTimer <= 0) {
      this._bossAdaptiveEvalTimer = 3;
      this._applyBossAdaptiveResponse();
    }
  };

  Enemy.prototype._applyBossAdaptiveResponse = function() {
    var camping = this._bossPlayerCampScore > 0.6;
    var rushing = this._bossPlayerAggroScore > 0.6;

    if (camping) {
      // Reduce barrage cooldown by 30%
      this._bossAdaptiveBarrageMult = 0.7;
      // Double charge chance (capped at 0.8)
      var baseChance = BOSS_CHARGE.chanceByPhase[this._bossPhase] || 0.2;
      this._bossAdaptiveChargeChance = Math.min(0.8, baseChance * 2);
      this._bossAdaptiveMinChargeRange = null; // default
    } else if (rushing) {
      this._bossAdaptiveBarrageMult = 1.0;
      this._bossAdaptiveChargeChance = null; // default
      this._bossAdaptiveMinChargeRange = 4; // reduced from 8
      // Accuracy bonus +10%
      this.accuracy = Math.min(1.0, this._bossBaseAccuracy * 1.1);
    } else {
      // Neutral — reset
      this._bossAdaptiveBarrageMult = 1.0;
      this._bossAdaptiveChargeChance = null;
      this._bossAdaptiveMinChargeRange = null;
      this.accuracy = this._bossBaseAccuracy;
    }
  };
```

Also in `_initBoss`, after setting `this.accuracy`, store the base value:

```js
    this._bossBaseAccuracy = this.accuracy;
    this._bossAdaptiveBarrageMult = 1.0;
```

- [ ] **Step 5: Integrate adaptive tracking into update loop**

In `js/enemies.js`, in the `update` method, after the boss barrage section (around line 2011), add:

```js
    // Boss adaptive tactics update
    if (this.isBoss) this._updateBossAdaptive(dt, playerPos);
```

- [ ] **Step 6: Wire adaptive barrage multiplier into barrage cooldown**

In `_startBossBarrage` (around line 2430), where barrage cooldown is set, apply the multiplier. Find where `this._bossBarrageCooldown` is assigned in `_updateBossBarrage` and multiply:

```js
      this._bossBarrageCooldown = cfg.cooldown * (this._bossAdaptiveBarrageMult || 1.0);
```

- [ ] **Step 7: Wire adaptive combat move bias for camping/rushing**

In the combat move selection (around line 1078 in `_selectCombatMove`), after `_calcCombatWeights` returns `w`, add boss adaptive bias:

```js
    // Boss adaptive tactics bias
    if (this.isBoss) {
      if (this._bossPlayerCampScore > 0.6) {
        // Camping: favor push, reduce hold
        w.push *= 2.0;
        w.hold *= 0.3;
      } else if (this._bossPlayerAggroScore > 0.6) {
        // Rushing: favor hold and retreatFire
        w.hold *= 2.0;
        w.retreatFire *= 1.5;
        w.push *= 0.5;
      }
    }
```

- [ ] **Step 8: Run all tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 9: Update REQUIREMENTS.md**

Add a new subsection:

```
#### Boss Adaptive Tactics
- Boss tracks rolling player behavior via `_updateBossAdaptive(dt, playerPos)` called each frame
- `_bossPlayerCampScore` (0–1): increments when player moves < 0.5 units/s, decays otherwise
- `_bossPlayerAggroScore` (0–1): increments when player closes distance to boss, decays otherwise
- `_bossPlayerTrackPos`: last-known player position for delta tracking
- Responses evaluated every ~3s (`_bossAdaptiveEvalTimer`):
  - **Camping** (campScore > 0.6): barrage cooldown ×0.7, charge chance doubled (cap 0.8), boss favors push combat moves
  - **Rushing** (aggroScore > 0.6): charge min range reduced to 4 units, accuracy +10%, boss favors hold/retreatFire
  - **Neutral**: all modifiers reset to defaults
- `_bossBaseAccuracy` stored in `_initBoss` for reset reference
- `_bossAdaptiveBarrageMult` applied to barrage cooldown in `_updateBossBarrage`
- Combat move weights biased in `_selectCombatMove` based on camp/aggro scores
```

- [ ] **Step 10: Commit**

```bash
git add js/enemies.js REQUIREMENTS.md
git commit -m "feat(boss): add adaptive tactics responding to player camping/rushing"
```

---

### Task 6: Boss Kill Payoff — Slow-Mo, Flash, Shake

**Files:**
- Modify: `js/main.js` (enhanced boss kill sequence in `onEnemyKilled`)
- Modify: `index.html` (`#boss-flash` div, `.boss-eliminated` CSS)
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Write test for boss kill flash element**

```js
it('should have boss-flash overlay element', () => {
  var el = document.getElementById('boss-flash');
  expect(el).not.toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — element doesn't exist

- [ ] **Step 3: Add boss-flash div and CSS to index.html**

In `index.html`, add CSS:

```css
  #boss-flash {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: white; opacity: 0; pointer-events: none;
    z-index: 999; transition: opacity 0.5s ease-out;
  }
  #announcement.boss-eliminated {
    color: #ffd700;
    text-shadow: 0 0 15px rgba(255, 215, 0, 0.8), 0 0 30px rgba(255, 165, 0, 0.4);
  }
```

In the HTML body, before the announcement div, add:

```html
  <div id="boss-flash"></div>
```

- [ ] **Step 4: Enhance boss kill sequence in main.js**

In `js/main.js`, find the boss kill block (around line 4229-4238). Replace it with:

```js
    if (enemy.isBoss) {
      player.money = Math.min(16000, player.money + 5000);
      _bossXPBonus += 40;
      trackMissionEvent('boss_kills', 1);
      hideBossHealthBar();
      addKillFeed('You', 'BOSS', true);
      if (GAME.Sound && GAME.Sound.bossDeath) GAME.Sound.bossDeath();

      // Enhanced slow-mo (overrides normal kill slow-mo)
      GAME.killSlowMo.active = true;
      GAME.killSlowMo.timer = 0.4;
      GAME.killSlowMo.scale = 0.3;

      // Heavy screen shake
      triggerScreenShake(0.3);

      // Screen flash
      var flashEl = document.getElementById('boss-flash');
      if (flashEl) {
        flashEl.style.transition = 'none';
        flashEl.style.opacity = '0.6';
        setTimeout(function() {
          flashEl.style.transition = 'opacity 0.5s ease-out';
          flashEl.style.opacity = '0';
        }, 16);
      }

      // Gold announcement
      showAnnouncement('BOSS ELIMINATED', '+$5000');
      dom.announcement.classList.add('boss-eliminated');
      setTimeout(function() {
        dom.announcement.classList.remove('boss-eliminated');
      }, 2500);

      // Reset boss atmosphere
      GAME._bossAtmosphere.active = false;
      GAME._bossAtmosphere.targetRedMult = 1.0;
      GAME._bossAtmosphere.targetVignetteAdd = 0;
      GAME._bossAtmosphere.targetContrast = 0;
      GAME._bossAtmosphere.targetSaturation = 1.0;
    }
```

Also add a DOM reference: `bossFlash: document.getElementById('boss-flash')` in the dom object.

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Update REQUIREMENTS.md**

Add/update the Boss Kill section:

```
#### Boss Kill Payoff
- Extended slow-mo: 0.4s at 0.3× speed (overrides normal kill slow-mo of 0.05s at 0.7×)
- Heavy screen shake: intensity 0.3, ~0.5s duration
- Screen flash: `#boss-flash` full-screen white overlay, starts at opacity 0.6, CSS transition fades to 0 over 0.5s
- Gold announcement: "BOSS ELIMINATED" with `.boss-eliminated` CSS class — gold color (#ffd700) with gold text-shadow glow
- Boss atmosphere resets on death (lerps back to map defaults)
```

- [ ] **Step 7: Commit**

```bash
git add js/main.js index.html REQUIREMENTS.md
git commit -m "feat(boss): add enhanced kill payoff with slow-mo, flash, and gold announcement"
```

---

### Task 7: Boss Kill Payoff — Explosion Particles and Minion Chain-Death

**Files:**
- Modify: `js/particles.js` (add `spawnBossExplosion`)
- Modify: `js/main.js` (minion chain-death on boss kill)
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Write test for spawnBossExplosion**

```js
it('should have spawnBossExplosion method on GAME.particles', () => {
  expect(typeof GAME.particles.spawnBossExplosion).toBe('function');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: Add spawnBossExplosion to particles.js**

In `js/particles.js`, after `spawnExplosion` (around line 490), add:

```js
  function spawnBossExplosion(pos) {
    // Large fireball
    var fb = pools.fireball.spawn();
    fb.pos.copy(pos);
    fb.maxLife = 0.6;

    // Shockwave
    var sw = pools.shockwave.spawn();
    sw.pos.copy(pos);
    sw.maxLife = 0.5;
    sw.rotation.x = Math.PI / 2;

    // Sparks — orange/yellow, fast outward
    for (var i = 0; i < 25; i++) {
      var sp = pools.debris.spawn();
      sp.pos.copy(pos);
      var angle = Math.random() * Math.PI * 2;
      var speed = 8 + Math.random() * 12;
      sp.vel.set(
        Math.cos(angle) * speed,
        Math.random() * 10 + 3,
        Math.sin(angle) * speed
      );
      sp.maxLife = 0.8;
      sp.rotVel.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      );
    }

    // Debris chunks — slower, heavier
    for (var j = 0; j < 12; j++) {
      var dp = pools.debris.spawn();
      dp.pos.copy(pos);
      dp.vel.set(
        (Math.random() - 0.5) * 8,
        Math.random() * 6 + 2,
        (Math.random() - 0.5) * 8
      );
      dp.maxLife = 1.2;
      dp.rotVel.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );
    }

    // Bright combat light
    spawnCombatLight(pos, 0xff4400, 30, 0.5);
  }
```

Add to the exports object:

```js
    spawnBossExplosion: spawnBossExplosion,
```

- [ ] **Step 4: Add boss explosion and minion chain-death to boss kill in main.js**

In `js/main.js`, in the boss kill block (after the screen flash code from Task 6), add:

```js
      // Boss explosion particles
      if (GAME.particles) {
        GAME.particles.spawnBossExplosion(enemy.mesh.position);
      }

      // Minion chain-death — all boss minions die 0.3s after boss
      setTimeout(function() {
        for (var mi = enemyManager.enemies.length - 1; mi >= 0; mi--) {
          var minion = enemyManager.enemies[mi];
          if (minion.alive && minion._isBossMinion) {
            minion.takeDamage(99999);
            if (GAME.particles) {
              GAME.particles.spawnExplosion(minion.mesh.position);
            }
          }
        }
      }, 300);
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Update REQUIREMENTS.md**

```
#### Boss Explosion Particles
- `GAME.particles.spawnBossExplosion(pos)` — large fireball (0.6s life), shockwave (0.5s), 25 fast spark debris, 12 heavy debris chunks, bright combat light (0xff4400, range 30, 0.5s)
- Called on boss kill from `onEnemyKilled`

#### Minion Chain-Death
- All enemies with `_isBossMinion = true` killed 0.3s after boss death via `setTimeout`
- Each dead minion spawns a standard explosion particle effect
- Creates cascade effect across the map
```

- [ ] **Step 7: Commit**

```bash
git add js/particles.js js/main.js REQUIREMENTS.md
git commit -m "feat(boss): add boss explosion particles and minion chain-death"
```

---

### Task 8: Victory Stinger Sound

**Files:**
- Modify: `js/sound.js` (add `bossVictory`)
- Modify: `js/main.js` (play on boss kill)
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Write test for bossVictory sound**

```js
it('should have bossVictory sound method', () => {
  expect(typeof GAME.Sound.bossVictory).toBe('function');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: Add bossVictory sound to sound.js**

In `js/sound.js`, after `bossChargeMelee`, add:

```js
    bossVictory: function() {
      var c = ensureCtx();
      var now = c.currentTime;

      // Sub-bass boom
      var sub = c.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(40, now);
      sub.frequency.exponentialRampToValueAtTime(20, now + 1.5);
      var subGain = c.createGain();
      subGain.gain.setValueAtTime(0.5, now);
      subGain.gain.linearRampToValueAtTime(0.0, now + 1.5);
      sub.connect(subGain);
      subGain.connect(masterGain);
      sub.onended = function() {
        try { sub.disconnect(); } catch(e) {}
        try { subGain.disconnect(); } catch(e) {}
      };
      sub.start(now);
      sub.stop(now + 1.5);

      // Major triad chord (brass-like sawtooth)
      var notes = [261.6, 329.6, 392.0]; // C4, E4, G4
      for (var i = 0; i < notes.length; i++) {
        var osc = c.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(notes[i], now);
        var lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(2000, now);
        lp.frequency.exponentialRampToValueAtTime(400, now + 2.0);
        var gain = c.createGain();
        gain.gain.setValueAtTime(0.0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gain.gain.setValueAtTime(0.15, now + 0.8);
        gain.gain.linearRampToValueAtTime(0.0, now + 2.0);
        osc.connect(lp);
        lp.connect(gain);
        gain.connect(masterGain);
        (function(o, f, g) {
          o.onended = function() {
            try { o.disconnect(); } catch(e) {}
            try { f.disconnect(); } catch(e) {}
            try { g.disconnect(); } catch(e) {}
          };
        })(osc, lp, gain);
        osc.start(now);
        osc.stop(now + 2.0);
      }
    },
```

- [ ] **Step 4: Play bossVictory on boss kill in main.js**

In the boss kill block, after `GAME.Sound.bossDeath()`, add:

```js
      if (GAME.Sound && GAME.Sound.bossVictory) GAME.Sound.bossVictory();
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Update REQUIREMENTS.md**

```
- `bossVictory` — triumphant major chord (C4-E4-G4 sawtooth oscillators through lowpass, 2s decay) layered over sub-bass boom (40→20 Hz sine, 1.5s); plays alongside `bossDeath` on boss kill
```

- [ ] **Step 7: Commit**

```bash
git add js/sound.js js/main.js REQUIREMENTS.md
git commit -m "feat(boss): add victory stinger sound on boss kill"
```

---

### Task 9: Final Integration Test and Polish

**Files:**
- Modify: `tests/integration/combat.test.js` (integration test for full boss fight arc)
- Modify: `REQUIREMENTS.md` (final review pass)

- [ ] **Step 1: Write integration test for boss kill payoff**

```js
describe('Boss kill payoff', () => {
  it('should trigger enhanced slow-mo on boss kill', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[0];
    // Reduce HP to 1 so next hit kills
    boss.health = 1;
    boss._bossShieldActive = false;
    boss.takeDamage(10);
    expect(boss.alive).toBe(false);
  });

  it('should have atmosphere state reset targets on boss death path', () => {
    expect(GAME._bossAtmosphere).toBeDefined();
    // After boss death, targets should be default
    GAME._bossAtmosphere.active = false;
    GAME._bossAtmosphere.targetRedMult = 1.0;
    expect(GAME._bossAtmosphere.targetRedMult).toBe(1.0);
    expect(GAME._bossAtmosphere.targetVignetteAdd).toBe(0);
  });
});
```

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 3: Final REQUIREMENTS.md review**

Read through the full boss section in REQUIREMENTS.md. Ensure all new features are documented: heartbeat, atmosphere, charge attack, adaptive tactics, kill payoff (slow-mo, flash, shake, explosion, minion chain-death, victory stinger, gold announcement), and shield buff.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/combat.test.js REQUIREMENTS.md
git commit -m "test(boss): add integration tests for boss polish features"
```
