# Knife UX Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the knife feel responsive and usable — visible swing animation, wide-cone hit detection, and heavy hit feedback.

**Architecture:** Add knife swing state machine to WeaponSystem (alternating L/R slashes), replace single raycast with 9-ray 45° cone in fire(), add `knifeHit()` sound to Sound module, and wire up screen shake / FOV punch / view-model lunge on hit.

**Tech Stack:** Three.js r160.1 (procedural geometry), Web Audio API (procedural sound), Vitest (tests)

---

### Task 1: Update Knife Weapon Definition

**Files:**
- Modify: `js/weapons.js:234` (knife definition)
- Modify: `tests/unit/weapons.test.js:28,96-104` (update expected values)
- Modify: `REQUIREMENTS.md` (weapon table)

**Step 1: Write the failing test**

In `tests/unit/weapons.test.js`, update the knife expectations:

```javascript
// In the 'should have correct damage values' test:
expect(DEFS.knife.damage).toBe(55); // unchanged

// In the recoil values test, update knife expectations:
expect(DEFS.knife.range).toBe(5);
expect(DEFS.knife.fovPunch).toBe(1.5);
expect(DEFS.knife.screenShake).toBe(0.04);
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — knife range is 3, fovPunch is 0, screenShake is 0

**Step 3: Update the weapon definition**

In `js/weapons.js:234`, change the knife definition:

```javascript
knife:   { name: 'Knife',           damage: 55,  fireRate: 1.5, magSize: Infinity, reserveAmmo: Infinity, reloadTime: 0,   price: 0,    range: 5,   auto: false, isKnife: true,  isGrenade: false, spread: 0,    pellets: 1, penetration: 0, penDmgMult: 0, recoilUp: 0, recoilSide: 0, fovPunch: 1.5, screenShake: 0.04, flashColor: 0, flashIntensity: 0 },
```

Changes: `range: 3→5`, `fovPunch: 0→1.5`, `screenShake: 0→0.04`

**Step 4: Update REQUIREMENTS.md**

Update the weapon table row for knife: range 3→5, fovPunch 0→1.5, screenShake 0→0.04. Add notes about cone detection and swing animation.

**Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 6: Commit**

```
git commit -m "feat: update knife stats — range 5, add fovPunch and screenShake"
```

---

### Task 2: Add Knife Swing Animation

**Files:**
- Modify: `js/weapons.js:793-804` (add swing state vars to constructor)
- Modify: `js/weapons.js:1575` (trigger swing in fire())
- Modify: `js/weapons.js:2084-2086` (animate swing in update())
- Modify: `js/weapons.js:2350-2352` (remove early return for knife in _applyVisualRecoil or add separate knife visual recoil)

**Step 1: Add knife swing state variables**

After line 804 in `js/weapons.js` (after pendulum state), add:

```javascript
// Knife swing animation state
this._knifeSwinging = false;
this._knifeSwingTime = 0;
this._knifeSwingDuration = 0.25; // 250ms total swing
this._knifeSwingDir = 1; // 1 = right-to-left, -1 = left-to-right (alternates)
this._knifeHitConnect = false; // true if this swing hit an enemy
this._knifeLungeTime = 0; // forward lunge on hit
```

**Step 2: Trigger swing on fire**

In the `fire()` method, after `this.lastFireTime = now;` (line 1575), add knife swing trigger:

```javascript
// Trigger knife swing animation
if (def.isKnife) {
  this._knifeSwinging = true;
  this._knifeSwingTime = 0;
  this._knifeSwingDir *= -1; // alternate direction each swing
  this._knifeHitConnect = false;
  this._knifeLungeTime = 0;
}
```

**Step 3: Animate swing in update()**

In the `update()` method, after the weapon bob return section (around line 2086 where `weaponModel.rotation.x` recovery happens), add knife swing animation before the position assignment at line 2154:

```javascript
// Knife swing animation
if (this._knifeSwinging) {
  this._knifeSwingTime += dt;
  var progress = this._knifeSwingTime / this._knifeSwingDuration;
  if (progress >= 1) {
    this._knifeSwinging = false;
    progress = 1;
  }
  // Ease-out curve: fast start, smooth deceleration
  var eased = 1 - (1 - progress) * (1 - progress);
  // Rotate ~90° (1.57 rad) across screen horizontally
  var swingAngle = eased * 1.57 * this._knifeSwingDir;
  this.weaponModel.rotation.z += swingAngle;
  // Slight forward thrust during swing
  this.weaponModel.position.z += Math.sin(eased * Math.PI) * -0.08;
  // Slight upward arc
  this.weaponModel.position.y += Math.sin(eased * Math.PI) * 0.03;
}

// Knife hit lunge (forward push on hit)
if (this._knifeLungeTime > 0) {
  this._knifeLungeTime -= dt;
  if (this._knifeLungeTime < 0) this._knifeLungeTime = 0;
  var lungeProgress = this._knifeLungeTime / 0.1; // 100ms total
  this.weaponModel.position.z += -0.1 * lungeProgress;
}
```

**Step 4: Enable visual feedback for knife swings**

In `_applyVisualRecoil()` at line 2352, change the early return to allow camera feedback:

```javascript
WeaponSystem.prototype._applyVisualRecoil = function() {
  var def = WEAPON_DEFS[this.current];
  if (def.isKnife) return; // Keep returning — knife uses its own swing system
```

Instead, enable the camera recoil in `fire()` for knife. At lines 1601-1604, change:

```javascript
// Camera recoil
if (GAME._player && (def.recoilUp || def.fovPunch)) {
  GAME._player.applyRecoil(def.recoilUp, def.recoilSide, def.fovPunch);
}
```

And at lines 1606-1609, change:

```javascript
if (def.screenShake && GAME.triggerScreenShake) {
```

This already works since `def.screenShake` is now 0.04 (truthy). No change needed here.

**Step 5: Run tests**

Run: `npm test`
Expected: PASS

**Step 6: Commit**

```
git commit -m "feat: add knife swing animation — alternating horizontal slashes with lunge"
```

---

### Task 3: Add Cone Hit Detection for Knife

**Files:**
- Modify: `js/weapons.js:1649-1766` (fire() raycast loop)
- Create test: `tests/unit/knife-cone.test.js`

**Step 1: Write the failing test**

Create `tests/unit/knife-cone.test.js`:

```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/weapons.js');
});

describe('Knife cone detection', () => {
  it('knife should have isKnife flag and range of 5', () => {
    var def = GAME.WEAPON_DEFS.knife;
    expect(def.isKnife).toBe(true);
    expect(def.range).toBe(5);
  });

  it('knife should define cone angle of 45 degrees', () => {
    // KNIFE_CONE_ANGLE should be ~0.785 radians (45°)
    expect(GAME.KNIFE_CONE_ANGLE).toBeCloseTo(Math.PI / 4, 2);
  });

  it('knife should use 9 rays for cone sweep', () => {
    expect(GAME.KNIFE_CONE_RAYS).toBe(9);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — KNIFE_CONE_ANGLE and KNIFE_CONE_RAYS undefined

**Step 3: Add cone constants and rewrite knife hit detection**

Near the top of `js/weapons.js` (after WEAPON_DEFS), add exported constants:

```javascript
var KNIFE_CONE_ANGLE = Math.PI / 4; // 45 degrees
var KNIFE_CONE_RAYS = 9;
GAME.KNIFE_CONE_ANGLE = KNIFE_CONE_ANGLE;
GAME.KNIFE_CONE_RAYS = KNIFE_CONE_RAYS;
```

In `fire()`, replace the pellet loop (lines 1649-1766) with a knife-specific branch. Before the existing `for (var p = 0; p < pelletCount; p++)` loop, add:

```javascript
// ── Knife cone sweep ──
if (def.isKnife) {
  var knifeHitEnemies = {};
  for (var r = 0; r < KNIFE_CONE_RAYS; r++) {
    // Fan rays across horizontal cone: -halfAngle to +halfAngle
    var halfAngle = KNIFE_CONE_ANGLE / 2;
    var angleFraction = (KNIFE_CONE_RAYS === 1) ? 0 : (r / (KNIFE_CONE_RAYS - 1)) * 2 - 1;
    var rayAngle = angleFraction * halfAngle;

    // Rotate forward direction around up axis by rayAngle
    var dir = fwd.clone();
    dir.applyAxisAngle(up, rayAngle);
    dir.normalize();

    this._rc.set(this.camera.position, dir);
    this._rc.far = def.range;
    var hits = this._rc.intersectObjects(allObjects, true);

    for (var h = 0; h < hits.length; h++) {
      var hit = hits[h];

      // Check enemy
      var hitEnemy = null;
      for (var j = 0; j < enemies.length; j++) {
        var enemy = enemies[j];
        if (!enemy.alive) continue;
        if (enemy.mesh) {
          var pp = hit.object;
          while (pp) {
            if (pp === enemy.mesh) { hitEnemy = enemy; break; }
            pp = pp.parent;
          }
          if (hitEnemy) break;
        }
      }
      if (hitEnemy) {
        var eid = hitEnemy.id;
        if (!knifeHitEnemies[eid]) {
          var localY = hit.point.y - hitEnemy.mesh.position.y;
          var isHeadshot = (localY >= 1.85);
          var hsMult = (GAME.hasPerk && GAME.hasPerk('marksman')) ? 3.0 : 2.5;
          var baseDmg = (GAME.hasPerk && GAME.hasPerk('stopping_power')) ? def.damage * 1.25 : def.damage;
          var pelletDmg = isHeadshot ? baseDmg * hsMult : baseDmg;
          enemyDmg[eid] = pelletDmg;
          if (isHeadshot) enemyHeadshot[eid] = true;
          if (!enemyHitPoints[eid]) enemyHitPoints[eid] = hit.point;
          knifeHitEnemies[eid] = true;
          anyHit = true;
        }
        break; // This ray found an enemy, move to next ray
      }

      // Check bird
      var hitBird = null;
      for (var b = 0; b < birds.length; b++) {
        var bird = birds[b];
        if (!bird.alive) continue;
        if (bird.mesh) {
          var pb = hit.object;
          while (pb) {
            if (pb === bird.mesh) { hitBird = bird; break; }
            pb = pb.parent;
          }
          if (hitBird) break;
        }
      }
      if (hitBird) {
        birdHits[hitBird.id] = true;
        if (!birdHitPoints[hitBird.id]) birdHitPoints[hitBird.id] = hit.point;
        anyHit = true;
        break; // Move to next ray
      }

      // Hit wall — stop this ray (knife doesn't penetrate)
      break;
    }
  }
} else {
  // ── Existing gun pellet loop (unchanged) ──
```

Close the else block after the existing pellet loop ends (after line 1766).

**Step 4: Trigger hit lunge and sound on knife hit**

After the cone sweep block, before the results-building section, add:

```javascript
// Knife hit feedback
if (def.isKnife && anyHit) {
  this._knifeHitConnect = true;
  this._knifeLungeTime = 0.1; // 100ms forward lunge
  if (GAME.Sound && GAME.Sound.knifeHit) GAME.Sound.knifeHit();
}
```

**Step 5: Run tests**

Run: `npm test`
Expected: PASS

**Step 6: Commit**

```
git commit -m "feat: add 45-degree cone hit detection for knife with 9 rays"
```

---

### Task 4: Add knifeHit() Procedural Sound

**Files:**
- Modify: `js/sound.js:556` (add knifeHit after knifeSlash)
- Create test: Add to `tests/unit/sound.test.js`

**Step 1: Write the failing test**

In `tests/unit/sound.test.js`, add:

```javascript
it('should have knifeHit method', () => {
  expect(typeof GAME.Sound.knifeHit).toBe('function');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — knifeHit is not a function

**Step 3: Implement knifeHit sound**

After `knifeSlash` in `js/sound.js` (after line 556), add:

```javascript
knifeHit: function() {
  var c = ensureCtx();
  var t = c.currentTime;
  // Low thud — 80Hz sine, short decay
  var thud = c.createOscillator();
  var thudGain = c.createGain();
  thud.type = 'sine';
  thud.frequency.value = 80;
  thudGain.gain.setValueAtTime(0.4, t);
  thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  thud.connect(thudGain);
  thudGain.connect(masterGain);
  thud.start(t);
  thud.stop(t + 0.13);
  // Sharp transient — noise burst, high-pass
  var buf = getNoiseBuffer(0.06);
  var snap = c.createBufferSource();
  snap.buffer = buf;
  var snapFilter = c.createBiquadFilter();
  snapFilter.type = 'highpass';
  snapFilter.frequency.value = 2000;
  var snapGain = c.createGain();
  snapGain.gain.setValueAtTime(0.35, t);
  snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  snap.connect(snapFilter);
  snapFilter.connect(snapGain);
  snapGain.connect(masterGain);
  snap.start(t);
  snap.stop(t + 0.07);
  // Wet slap texture — mid-frequency noise
  var buf2 = getNoiseBuffer(0.1);
  var slap = c.createBufferSource();
  slap.buffer = buf2;
  var slapFilter = c.createBiquadFilter();
  slapFilter.type = 'bandpass';
  slapFilter.frequency.value = 600;
  slapFilter.Q.value = 3;
  var slapGain = c.createGain();
  slapGain.gain.setValueAtTime(0.2, t + 0.01);
  slapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  slap.connect(slapFilter);
  slapFilter.connect(slapGain);
  slapGain.connect(masterGain);
  slap.start(t);
  slap.stop(t + 0.11);
},
```

**Step 4: Run tests**

Run: `npm test`
Expected: PASS

**Step 5: Update REQUIREMENTS.md**

Add `knifeHit` to the sound effects table: `| knifeHit | Low thud + sharp transient + wet slap |`

**Step 6: Commit**

```
git commit -m "feat: add knifeHit procedural impact sound — thud, snap, and slap layers"
```

---

### Task 5: Wire Up Screen Shake and Camera Kick on Knife Hit

**Files:**
- Modify: `js/weapons.js:1601-1608` (enable camera feedback for knife)

**Step 1: Verify camera recoil condition**

At line 1601-1604, the condition is `if (GAME._player && def.recoilUp)`. Since knife `recoilUp` is 0, the FOV punch won't fire even though `fovPunch` is now 1.5. Fix this:

```javascript
// Camera recoil
if (GAME._player && (def.recoilUp || def.fovPunch)) {
  GAME._player.applyRecoil(def.recoilUp, def.recoilSide, def.fovPunch);
}
```

**Step 2: Verify screen shake fires**

`def.screenShake` is now 0.04 (truthy), so the existing condition at line 1606 already works. No change needed.

**Step 3: Run tests**

Run: `npm test`
Expected: PASS

**Step 4: Commit**

```
git commit -m "fix: enable FOV punch for knife by checking fovPunch in recoil condition"
```

---

### Task 6: Update REQUIREMENTS.md Fully

**Files:**
- Modify: `REQUIREMENTS.md`

**Step 1: Update all knife-related sections**

Update these sections in REQUIREMENTS.md:
- **Weapon definition table**: range 3→5, fovPunch 0→1.5, screenShake 0→0.04
- **Recoil constants table**: fovPunch 0→1.5, screenShake 0→0.04
- **Knife model description**: Add note about swing animation
- **Sound effects table**: Add `knifeHit` entry
- **Add new section** for knife mechanics:
  - Swing animation: alternating horizontal slashes, 250ms duration, ease-out
  - Hit detection: 45° cone, 9 rays, first-hit-per-enemy dedup
  - Hit feedback: camera kick, forward lunge (0.1 units, 100ms), knifeHit sound
  - Range: 5 units

**Step 2: Commit**

```
git commit -m "docs: update REQUIREMENTS.md with knife UX overhaul details"
```

---

### Task 7: Integration Test and Polish

**Files:**
- All modified files

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests PASS

**Step 2: Manual play-test checklist**

- [ ] Press 1 to switch to knife — model appears normally
- [ ] Click to swing — knife rotates horizontally with alternating L/R direction
- [ ] Swing has visible FOV punch and screen shake
- [ ] Walk up to enemy and swing — hit connects at reasonable distance
- [ ] Hit produces meaty thud sound (distinct from swing whoosh)
- [ ] View model lunges forward on hit
- [ ] Kill triggers existing kill camera kick
- [ ] Gun Game level 1 (knife) works correctly
- [ ] Knife works during sprint (stops sprinting on attack)

**Step 3: Fix any issues found during testing**

**Step 4: Final commit**

```
git commit -m "feat: knife UX overhaul complete — swing animation, cone detection, hit feedback"
```
