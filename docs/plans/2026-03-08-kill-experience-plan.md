# Kill Experience Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make enemy kills feel more impactful through varied death animations, a camera kick on kill, and a bass impact sound layer.

**Architecture:** Three independent changes: (1) Replace `Enemy.prototype.die()` with a directional death animation system using per-body-part rotation offsets, (2) Add a kill camera kick system in main.js alongside existing screen shake, (3) Add `killThump()` and `killThumpHeadshot()` to sound.js using `noiseBurst()` with low-pass filtering.

**Tech Stack:** Three.js (animation via setInterval), Web Audio API (noise burst + oscillator)

---

### Task 1: Death Animation System — Tests

**Files:**
- Modify: `tests/unit/enemies.test.js`

**Step 1: Write failing tests for directional death animations**

Add after the existing `EnemyManager` describe block:

```javascript
describe('Enemy death animations', () => {
  it('die() should accept a hitDirection vector', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    // Should not throw when called with direction
    expect(() => enemy.die(new THREE.Vector3(0, 0, -1))).not.toThrow();
    scene.remove(enemy.mesh);
  });

  it('die() should work without a hitDirection (fallback)', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    expect(() => enemy.die()).not.toThrow();
    scene.remove(enemy.mesh);
  });

  it('die() should set _dying flag', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy.die(new THREE.Vector3(0, 0, -1));
    expect(enemy._dying).toBe(true);
    scene.remove(enemy.mesh);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `die()` doesn't accept direction, no `_dying` flag

**Step 3: Commit**

```
git add tests/unit/enemies.test.js
git commit -m "test: add failing tests for directional death animations"
```

---

### Task 2: Death Animation System — Implementation

**Files:**
- Modify: `js/enemies.js:1386-1399` (replace `Enemy.prototype.die`)

**Step 1: Replace `Enemy.prototype.die` with directional death system**

Replace the existing `die()` method (lines 1386-1399) with:

```javascript
Enemy.prototype.die = function(hitDir) {
  this._dying = true;
  var mesh = this.mesh;
  var scene = this.scene;
  var arms = [this._rightArmGroup, this._leftArmGroup];

  // Determine death variant from hit direction relative to enemy facing
  // 0=backward(front hit), 1=forward(back hit), 2=spin(side), 3=crumple(headshot), 4=stagger(default)
  var variant = 4; // default: stagger & fall
  if (hitDir) {
    // Transform hit direction into enemy local space
    var localDir = hitDir.clone();
    var enemyFwd = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0,1,0), mesh.rotation.y);
    var dot = enemyFwd.dot(new THREE.Vector3(hitDir.x, 0, hitDir.z).normalize());
    var cross = enemyFwd.x * hitDir.z - enemyFwd.z * hitDir.x;
    if (this._headshotKill) {
      variant = 3; // crumple
    } else if (dot > 0.5) {
      variant = 0; // hit from front → fall backward
    } else if (dot < -0.5) {
      variant = 1; // hit from behind → fall forward
    } else {
      variant = 2; // hit from side → spin & drop
    }
  }

  var progress = 0;
  var spinDir = (variant === 2) ? (Math.random() > 0.5 ? 1 : -1) : 0;
  var duration = (variant === 3) ? 0.6 : 0.8; // crumple is faster
  var staggerDone = false;

  var interval = setInterval(function() {
    progress += 0.016 / duration; // normalize to 0-1 over duration
    if (progress > 1) progress = 1;
    var t = progress;
    var ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad

    if (variant === 0) {
      // Fall backward — torso tilts back, knees buckle
      mesh.rotation.x = -ease * Math.PI * 0.45;
      mesh.position.y = -ease * 0.7;
      // Arms trail upward with delay
      var armT = Math.max(0, (t - 0.15) / 0.85);
      for (var i = 0; i < arms.length; i++) {
        if (arms[i]) arms[i].rotation.x = -0.5 + armT * 1.8;
      }
    } else if (variant === 1) {
      // Fall forward — slump, face-plant
      mesh.rotation.x = ease * Math.PI * 0.5;
      mesh.position.y = -ease * 0.5;
      // Arms drop with slight delay
      var armT1 = Math.max(0, (t - 0.1) / 0.9);
      for (var i = 0; i < arms.length; i++) {
        if (arms[i]) arms[i].rotation.x = -0.5 - armT1 * 1.2;
      }
    } else if (variant === 2) {
      // Spin & drop — twist and collapse
      mesh.rotation.y += spinDir * 0.08;
      mesh.rotation.x = ease * Math.PI * 0.35;
      mesh.position.y = -ease * 0.6;
      // Arms fling outward
      if (arms[0]) arms[0].rotation.z = ease * 0.8;
      if (arms[1]) arms[1].rotation.z = -ease * 0.8;
    } else if (variant === 3) {
      // Crumple (headshot) — instant leg collapse, drop straight down
      mesh.position.y = -ease * 0.9;
      // Slight forward tilt as body crumples
      mesh.rotation.x = ease * Math.PI * 0.25;
      // Arms go limp fast
      for (var i = 0; i < arms.length; i++) {
        if (arms[i]) arms[i].rotation.x = -0.5 - ease * 1.5;
      }
    } else {
      // Stagger & fall (default) — step back, tip sideways
      if (t < 0.3 && !staggerDone) {
        mesh.position.z += 0.02; // slight backward stagger
      } else {
        staggerDone = true;
        var fallT = Math.min(1, (t - 0.3) / 0.7);
        var fallEase = fallT * fallT;
        mesh.rotation.z = fallEase * Math.PI * 0.45;
        mesh.position.y = -fallEase * 0.5;
      }
    }

    if (progress >= 1) {
      clearInterval(interval);
      setTimeout(function() { scene.remove(mesh); }, 2000);
    }
  }, 16);
};
```

**Step 2: Update `takeDamage` to track headshot kills and pass hit direction to `die()`**

In `Enemy.prototype.takeDamage` (line 1354), the method currently just calls `this.die()` with no arguments. We need to store headshot info. However, `takeDamage` doesn't know about headshots — that info is in main.js. We need to:

1. Add a `_headshotKill` property that main.js sets before `takeDamage` triggers `die()`
2. Pass hit direction from main.js when calling `die()` — but `die()` is called from within `takeDamage`. So instead, store the hit direction on the enemy before calling `takeDamage`.

Change `takeDamage` (line 1368-1372):
```javascript
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.die(this._lastHitDir);
      return true;
    }
```

No other changes needed in `takeDamage` — main.js will set `enemy._lastHitDir` and `enemy._headshotKill` before calling `takeDamage`.

**Step 3: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

**Step 4: Commit**

```
git add js/enemies.js
git commit -m "feat: add 5 directional death animation variants"
```

---

### Task 3: Wire Hit Direction in main.js

**Files:**
- Modify: `js/main.js:3693-3700` (shooting kill path)
- Modify: `js/main.js:3587-3589` (grenade kill path)

**Step 1: Set `_lastHitDir` and `_headshotKill` on enemy before `takeDamage` in shooting path**

At `js/main.js:3693`, before `result.enemy.takeDamage(result.damage)`, add:

```javascript
        // Store hit info for death animation
        var shootDir = new THREE.Vector3();
        shootDir.subVectors(result.point, player.position).normalize();
        result.enemy._lastHitDir = shootDir;
        result.enemy._headshotKill = result.headshot;
```

**Step 2: Set `_lastHitDir` on enemy before `takeDamage` in grenade path**

At `js/main.js:3586`, before `enemy.takeDamage(dmg)`, add:

```javascript
            var nadeDir = new THREE.Vector3();
            nadeDir.subVectors(enemy.mesh.position, pos).normalize();
            enemy._lastHitDir = nadeDir;
            enemy._headshotKill = false;
```

**Step 3: Run tests**

Run: `npm test`
Expected: All tests PASS

**Step 4: Commit**

```
git add js/main.js
git commit -m "feat: pass hit direction to enemy death animations"
```

---

### Task 4: Kill Camera Kick — Tests

**Files:**
- Modify: `tests/unit/main.test.js`

**Step 1: Write failing tests for kill camera kick**

```javascript
describe('Kill camera kick', () => {
  it('should expose triggerKillKick function', () => {
    expect(typeof GAME.triggerKillKick).toBe('function');
  });

  it('should expose killKick state object', () => {
    expect(GAME.killKick).toBeDefined();
    expect(GAME.killKick).toHaveProperty('active');
    expect(GAME.killKick).toHaveProperty('timer');
    expect(GAME.killKick).toHaveProperty('magnitude');
  });

  it('triggerKillKick should activate the kick', () => {
    GAME.killKick.active = false;
    GAME.triggerKillKick(false);
    expect(GAME.killKick.active).toBe(true);
  });

  it('headshot kick should have larger magnitude', () => {
    GAME.triggerKillKick(false);
    var normalMag = GAME.killKick.magnitude;
    GAME.triggerKillKick(true);
    var hsMag = GAME.killKick.magnitude;
    expect(hsMag).toBeGreaterThan(normalMag);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL

**Step 3: Commit**

```
git add tests/unit/main.test.js
git commit -m "test: add failing tests for kill camera kick"
```

---

### Task 5: Kill Camera Kick — Implementation

**Files:**
- Modify: `js/main.js` (near `triggerKillSlowMo` at line ~1108)
- Modify: `js/main.js` (in `onEnemyKilled` at line ~3628)
- Modify: `js/main.js` (in game loop where `applyScreenShake` is called)

**Step 1: Add kill kick state and function near the kill slow-mo code (after line 1116)**

```javascript
// ── Kill Camera Kick ─────────────────────────────────────
GAME.killKick = { active: false, timer: 0, magnitude: 0, phase: 'snap' };

function triggerKillKick(isHeadshot) {
  GAME.killKick.active = true;
  GAME.killKick.timer = 0;
  GAME.killKick.magnitude = isHeadshot ? 0.023 : 0.015;
  GAME.killKick.phase = 'snap';
}
GAME.triggerKillKick = triggerKillKick;

function applyKillKick(dt) {
  var k = GAME.killKick;
  if (!k.active) return;
  k.timer += dt;
  if (k.phase === 'snap') {
    // Snap up over 0.05s
    var snapT = Math.min(1, k.timer / 0.05);
    player.pitch -= k.magnitude * snapT * dt * 20;
    if (k.timer >= 0.05) {
      k.phase = 'ease';
      k.timer = 0;
    }
  } else {
    // Ease back over 0.15s
    var easeT = Math.min(1, k.timer / 0.15);
    player.pitch += k.magnitude * (1 - easeT) * dt * 10;
    if (k.timer >= 0.15) {
      k.active = false;
    }
  }
}
```

**Step 2: Call `triggerKillKick` in `onEnemyKilled` (after `triggerKillSlowMo()` on line 3628)**

```javascript
    triggerKillKick(isHeadshot);
```

**Step 3: Call `applyKillKick(dt)` in the game loop where `applyScreenShake(dt)` is called**

Find where `applyScreenShake(dt)` is called in the active game states and add `applyKillKick(dt)` right after it. (Search for `applyScreenShake` calls in the game loop.)

**Step 4: Skip kick if one is already active (no stacking)**

The `triggerKillKick` function already resets state each call. Add a guard:

```javascript
function triggerKillKick(isHeadshot) {
  if (GAME.killKick.active) return; // no stacking
  // ... rest of function
}
```

**Step 5: Run tests**

Run: `npm test`
Expected: All tests PASS

**Step 6: Commit**

```
git add js/main.js
git commit -m "feat: add kill camera kick effect"
```

---

### Task 6: Bass Impact Sound — Tests

**Files:**
- Modify: `tests/unit/sound.test.js`

**Step 1: Write failing tests for bass impact sounds**

Add in the "Kill confirmation sound" describe block:

```javascript
describe('Kill bass impact sounds', () => {
  it('should have killThump function', () => {
    expect(typeof GAME.Sound.killThump).toBe('function');
  });

  it('should have killThumpHeadshot function', () => {
    expect(typeof GAME.Sound.killThumpHeadshot).toBe('function');
  });

  it('killThump should not throw when called', () => {
    expect(() => GAME.Sound.killThump()).not.toThrow();
  });

  it('killThumpHeadshot should not throw when called', () => {
    expect(() => GAME.Sound.killThumpHeadshot()).not.toThrow();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL

**Step 3: Commit**

```
git add tests/unit/sound.test.js
git commit -m "test: add failing tests for kill bass impact sounds"
```

---

### Task 7: Bass Impact Sound — Implementation

**Files:**
- Modify: `js/sound.js` (after `killDinkHeadshot` at line ~1108)

**Step 1: Add `killThump` and `killThumpHeadshot` to the Sound object**

After `killDinkHeadshot` (line 1108), add:

```javascript
    killThump: function() {
      noiseBurst({ freq: 150, freqEnd: 60, duration: 0.1, gain: 0.25,
        filterType: 'lowpass', Q: 0.8, attack: 0.005 });
    },
    killThumpHeadshot: function() {
      noiseBurst({ freq: 150, freqEnd: 50, duration: 0.12, gain: 0.3,
        filterType: 'lowpass', Q: 0.8, attack: 0.005 });
      // Sub-bass sine for extra weight
      var c = ensureCtx();
      var t = c.currentTime;
      var osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, t);
      var g = c.createGain();
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(g); g.connect(masterGain);
      osc.start(t); osc.stop(t + 0.12);
    },
```

**Step 2: Wire the thumps into `onEnemyKilled` in main.js**

In `onEnemyKilled` (at line ~3623), modify the sound block:

```javascript
    if (GAME.Sound) {
      if (isHeadshot) { GAME.Sound.killDinkHeadshot(); GAME.Sound.killThumpHeadshot(); }
      else { GAME.Sound.killDink(); GAME.Sound.killThump(); }
      if (GAME.Sound.killConfirm) GAME.Sound.killConfirm();
    }
```

**Step 3: Run tests**

Run: `npm test`
Expected: All tests PASS

**Step 4: Commit**

```
git add js/sound.js js/main.js
git commit -m "feat: add bass impact layer to kill sounds"
```

---

### Task 8: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

**Step 1: Add/update death animation and kill feedback documentation**

Find the bot/enemy section and add:

```markdown
### Enemy Death Animations
- 5 directional variants based on hit direction relative to enemy facing:
  - **Fall backward** (shot from front): torso tilts back, arms trail up
  - **Fall forward** (shot from behind): slumps forward, face-plants
  - **Spin & drop** (shot from side): twists toward shot, legs collapse
  - **Crumple** (headshot): instant leg collapse, drops straight down
  - **Stagger & fall** (default): steps back, tips sideways
- Body parts animate on staggered timings (50-150ms offsets)
- Animation duration: 0.6s (crumple) to 0.8s (others)
- Corpse lingers 2s before removal

### Kill Camera Kick
- Upward pitch kick on killing blow only (not regular hits)
- Body kill: 0.015 rad magnitude, headshot: 0.023 rad
- Snap up over 50ms, ease back over 150ms
- No stacking — skipped if kick already active

### Kill Bass Impact
- Body kill: noise burst through low-pass filter (150→60Hz), 0.1s, gain 0.25
- Headshot: louder (gain 0.3) + sub-bass sine at 60Hz for extra weight
- Layered on top of existing kill dink and confirm sounds
```

**Step 2: Commit**

```
git add REQUIREMENTS.md
git commit -m "docs: update REQUIREMENTS.md with kill experience changes"
```

---

### Task 9: Final Verification

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests PASS

**Step 2: Manual playtest checklist**

- [ ] Kill enemy from front → falls backward
- [ ] Kill enemy from behind → falls forward
- [ ] Kill enemy from side → spins and drops
- [ ] Headshot kill → crumples down fast
- [ ] Kill with grenade → death animation plays with correct direction
- [ ] Camera kicks upward on kill, recovers smoothly
- [ ] Headshot camera kick is noticeably stronger
- [ ] Rapid kills don't stack camera kicks
- [ ] Bass thump audible on body kill
- [ ] Headshot thump is deeper/louder with sub-bass
- [ ] Existing kill dink and confirm sounds still play
