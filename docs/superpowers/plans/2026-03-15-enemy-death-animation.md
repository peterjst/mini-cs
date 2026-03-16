# Enemy Death Animation Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make enemy deaths feel weighted and impactful with cinematic hit-jolt + gravity-fall physics, variant-specific resting poses, and body persistence until round end.

**Architecture:** Overhaul `Enemy.prototype.die()` in `js/enemies.js` with two-phase animation (0.1s jolt + 0.3s gravity fall), store interval handle on instance for cleanup, remove setTimeout body removal. No new files needed.

**Tech Stack:** Three.js (procedural meshes), vanilla JS IIFE modules

---

## Chunk 1: Interval Cleanup & Body Persistence

### Task 1: Store death interval on instance, clean up in destroy(), persist bodies

**Files:**
- Modify: `js/enemies.js:1396-1499` (die + destroy methods)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests**

Add to the `Enemy death animations` describe block in `tests/unit/enemies.test.js`:

```javascript
it('die() should store interval handle on _deathInterval', () => {
  var scene = new THREE.Scene();
  var em = new GAME.EnemyManager(scene);
  em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
  var enemy = em.enemies[0];
  enemy.die(new THREE.Vector3(0, 0, -1));
  expect(enemy._deathInterval).toBeDefined();
  expect(typeof enemy._deathInterval).toBe('number');
  scene.remove(enemy.mesh);
  clearInterval(enemy._deathInterval);
});

it('destroy() should clear death interval if running', () => {
  var scene = new THREE.Scene();
  var em = new GAME.EnemyManager(scene);
  em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
  var enemy = em.enemies[0];
  enemy.die(new THREE.Vector3(0, 0, -1));
  enemy.destroy();
  expect(enemy._deathInterval).toBeNull();
});

it('dead enemy mesh should remain in scene after animation completes (no auto-removal)', () => {
  vi.useFakeTimers();
  var scene = new THREE.Scene();
  var em = new GAME.EnemyManager(scene);
  em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
  var enemy = em.enemies[0];
  enemy.die(new THREE.Vector3(0, 0, -1));

  // Advance past animation duration and old 2s removal delay
  vi.advanceTimersByTime(3000);

  // Body should still be in scene
  expect(enemy.mesh.parent).not.toBeNull();

  scene.remove(enemy.mesh);
  vi.useRealTimers();
});

it('clearAll() should remove dead enemy meshes from scene', () => {
  vi.useFakeTimers();
  var scene = new THREE.Scene();
  var em = new GAME.EnemyManager(scene);
  em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
  var enemy = em.enemies[0];
  var mesh = enemy.mesh;
  enemy.die(new THREE.Vector3(0, 0, -1));

  vi.advanceTimersByTime(1000);
  expect(mesh.parent).not.toBeNull();

  em.clearAll();
  expect(mesh.parent).toBeNull();

  vi.useRealTimers();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: First two tests FAIL — `_deathInterval` is `undefined` and `destroy()` doesn't clear it.

- [ ] **Step 3: Store interval handle on enemy instance**

In `js/enemies.js`, in the `die()` function, change line 1429 from:

```javascript
    var interval = setInterval(function() {
```

to:

```javascript
    var self = this;
    this._deathInterval = setInterval(function() {
```

And in the completion block (around line 1490-1492), change from:

```javascript
      if (progress >= 1) {
        clearInterval(interval);
        setTimeout(function() { scene.remove(mesh); }, 2000);
      }
```

to:

```javascript
      if (progress >= 1) {
        clearInterval(self._deathInterval);
        self._deathInterval = null;
      }
```

This removes the setTimeout body cleanup — bodies now persist.

- [ ] **Step 4: Update destroy() to clear interval**

In `js/enemies.js`, change `destroy()` (line 1497-1499) from:

```javascript
  Enemy.prototype.destroy = function() {
    if (this.mesh.parent) this.scene.remove(this.mesh);
  };
```

to:

```javascript
  Enemy.prototype.destroy = function() {
    if (this._deathInterval) {
      clearInterval(this._deathInterval);
      this._deathInterval = null;
    }
    if (this.mesh.parent) this.scene.remove(this.mesh);
  };
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS including the four new ones.

- [ ] **Step 6: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "fix: store death interval on instance, clear in destroy(), remove body auto-removal"
```

---

## Chunk 2: Death Animation Overhaul

### Task 2: Rewrite die() with two-phase animation and new poses

**Files:**
- Modify: `js/enemies.js:1396-1495` (die function)
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write failing tests for new animation physics**

Add tests that verify the new timing, easing, and pose behavior:

```javascript
it('death animation should complete in ~0.4s (not 0.8s) for non-headshot variants', () => {
  vi.useFakeTimers();
  var scene = new THREE.Scene();
  var em = new GAME.EnemyManager(scene);
  em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
  var enemy = em.enemies[0];
  enemy.die(new THREE.Vector3(0, 0, -1));

  // After 0.5s the interval should be cleared (animation done)
  vi.advanceTimersByTime(500);
  expect(enemy._deathInterval).toBeNull();

  scene.remove(enemy.mesh);
  vi.useRealTimers();
});

it('headshot death animation should complete in ~0.3s', () => {
  vi.useFakeTimers();
  var scene = new THREE.Scene();
  var em = new GAME.EnemyManager(scene);
  em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
  var enemy = em.enemies[0];
  enemy._headshotKill = true;
  enemy.die(new THREE.Vector3(0, 0, -1));

  // After 0.35s the interval should be cleared
  vi.advanceTimersByTime(350);
  expect(enemy._deathInterval).toBeNull();

  scene.remove(enemy.mesh);
  vi.useRealTimers();
});

it('death animation should drop body to ground level (Y offset <= -0.9)', () => {
  vi.useFakeTimers();
  var scene = new THREE.Scene();
  var em = new GAME.EnemyManager(scene);
  em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
  var enemy = em.enemies[0];
  var startY = enemy.mesh.position.y;
  enemy.die(new THREE.Vector3(0, 0, -1));

  // Advance past animation
  vi.advanceTimersByTime(500);

  // Body should have dropped significantly (relative to start)
  expect(enemy.mesh.position.y).toBeLessThanOrEqual(startY - 0.9);

  scene.remove(enemy.mesh);
  vi.useRealTimers();
});

it('hit jolt should displace body position in first 0.1s', () => {
  vi.useFakeTimers();
  var scene = new THREE.Scene();
  var em = new GAME.EnemyManager(scene);
  em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
  var enemy = em.enemies[0];
  var startX = enemy.mesh.position.x;
  var startZ = enemy.mesh.position.z;
  // Hit from front (positive Z direction)
  enemy.die(new THREE.Vector3(0, 0, 1));

  // After jolt phase (~100ms), position should have shifted
  vi.advanceTimersByTime(112); // 7 frames at 16ms
  var dx = enemy.mesh.position.x - startX;
  var dz = enemy.mesh.position.z - startZ;
  var displacement = Math.sqrt(dx * dx + dz * dz);
  expect(displacement).toBeGreaterThan(0);

  clearInterval(enemy._deathInterval);
  scene.remove(enemy.mesh);
  vi.useRealTimers();
});

it('headshot crumple (variant 3) should skip jolt phase', () => {
  vi.useFakeTimers();
  var scene = new THREE.Scene();
  var em = new GAME.EnemyManager(scene);
  em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
  var enemy = em.enemies[0];
  enemy._headshotKill = true;
  var startX = enemy.mesh.position.x;
  var startZ = enemy.mesh.position.z;
  var startY = enemy.mesh.position.y;
  enemy.die(new THREE.Vector3(0, 0, -1));

  // After first frame, no horizontal displacement (no jolt)
  vi.advanceTimersByTime(16);
  expect(enemy.mesh.position.x).toBe(startX);
  expect(enemy.mesh.position.z).toBe(startZ);

  // But Y should already be dropping (relative check)
  expect(enemy.mesh.position.y).toBeLessThan(startY);

  clearInterval(enemy._deathInterval);
  scene.remove(enemy.mesh);
  vi.useRealTimers();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — current animation uses 0.8s duration and smoothstep easing, no jolt phase.

- [ ] **Step 3: Rewrite die() with two-phase animation**

Replace the entire `die()` function body in `js/enemies.js` (lines 1396-1495) with:

```javascript
  Enemy.prototype.die = function(hitDir) {
    this._dying = true;
    var mesh = this.mesh;
    var arms = [this._rightArmGroup, this._leftArmGroup];

    // Determine death variant from hit direction relative to enemy facing
    // 0=backward(front hit), 1=forward(back hit), 2=spin(side), 3=crumple(headshot), 4=stagger(default)
    var variant = 4;
    var enemyFwd = null;
    if (hitDir) {
      enemyFwd = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0,1,0), mesh.rotation.y);
      var dot = enemyFwd.dot(new THREE.Vector3(hitDir.x, 0, hitDir.z).normalize());
      if (this._headshotKill) {
        variant = 3;
      } else if (dot > 0.5) {
        variant = 0;
      } else if (dot < -0.5) {
        variant = 1;
      } else {
        variant = 2;
      }
    }

    // Spin direction for side hits
    var spinDir = 0;
    if (variant === 2 && hitDir && enemyFwd) {
      var cross = enemyFwd.x * hitDir.z - enemyFwd.z * hitDir.x;
      spinDir = cross >= 0 ? 1 : -1;
    }

    // Jolt target (recoil in hit direction, XZ only)
    var joltTargetX = 0, joltTargetZ = 0;
    if (hitDir && variant !== 3) { // No jolt for headshot crumple
      var hitXZ = new THREE.Vector3(hitDir.x, 0, hitDir.z).normalize();
      joltTargetX = hitXZ.x * 0.07;
      joltTargetZ = hitXZ.z * 0.07;
    }

    // Timing
    var JOLT_DURATION = (variant === 3) ? 0 : 0.1;
    var FALL_DURATION = 0.3;
    var TOTAL_DURATION = JOLT_DURATION + FALL_DURATION;

    // Per-variant final Y drop
    var finalY = [-1.0, -0.9, -1.0, -1.1, -0.9][variant];

    var elapsed = 0;
    var startX = mesh.position.x;
    var startY = mesh.position.y;
    var startZ = mesh.position.z;
    var self = this;

    this._deathInterval = setInterval(function() {
      elapsed += 0.016;
      if (elapsed > TOTAL_DURATION) elapsed = TOTAL_DURATION;

      // ── Phase 1: Hit Jolt (0 to JOLT_DURATION) ──
      if (JOLT_DURATION > 0 && elapsed <= JOLT_DURATION) {
        // Ease-out jolt: fast snap then settle, interpolate to target
        var joltT = elapsed / JOLT_DURATION;
        var joltEase = 1 - (1 - joltT) * (1 - joltT); // ease-out quadratic
        mesh.position.x = startX + joltTargetX * joltEase;
        mesh.position.z = startZ + joltTargetZ * joltEase;
      }

      // ── Phase 2: Gravity Fall (JOLT_DURATION to TOTAL_DURATION) ──
      if (elapsed > JOLT_DURATION) {
        var fallElapsed = elapsed - JOLT_DURATION;
        var fallT = Math.min(1, fallElapsed / FALL_DURATION);
        // Quadratic ease-in (gravity acceleration)
        var fallEase = fallT * fallT;

        // Per-variant rotations, Y drop, and arm poses
        if (variant === 0) {
          // Fall backward — flat on back, arms splayed
          mesh.position.y = startY + fallEase * finalY;
          mesh.rotation.x = -fallEase * Math.PI * 0.5;
          var armT = Math.max(0, (fallT - 0.1) / 0.9);
          for (var i = 0; i < arms.length; i++) {
            if (arms[i]) {
              arms[i].rotation.x = -0.5 + armT * 2.0;
              arms[i].rotation.z = (i === 0 ? 1 : -1) * armT * 0.6;
            }
          }
        } else if (variant === 1) {
          // Fall forward — face down, one arm tucked, one extended
          mesh.position.y = startY + fallEase * finalY;
          mesh.rotation.x = fallEase * Math.PI * 0.55;
          var armT1 = Math.max(0, (fallT - 0.1) / 0.9);
          if (arms[0]) { arms[0].rotation.x = -0.5 - armT1 * 1.8; } // tucked
          if (arms[1]) { arms[1].rotation.x = -0.5 + armT1 * 0.5; arms[1].rotation.z = -armT1 * 0.3; } // extended
        } else if (variant === 2) {
          // Spin & drop — on side, legs bent, top arm draped
          mesh.position.y = startY + fallEase * finalY;
          mesh.rotation.y += spinDir * 0.1;
          mesh.rotation.x = fallEase * Math.PI * 0.4;
          mesh.rotation.z = fallEase * spinDir * Math.PI * 0.15;
          var armR2 = Math.max(0, (fallT - 0.05) / 0.95);
          var armL2 = Math.max(0, (fallT - 0.15) / 0.85);
          if (arms[0]) { arms[0].rotation.z = armR2 * 1.0; arms[0].rotation.x = -armR2 * 0.4; }
          if (arms[1]) { arms[1].rotation.z = -armL2 * 0.5; arms[1].rotation.x = -0.5 - armL2 * 0.6; }
        } else if (variant === 3) {
          // Crumple (headshot) — knees buckled, torso slumped, arms limp at odd angles
          mesh.position.y = startY + fallEase * finalY;
          var tiltT = Math.max(0, (fallT - 0.05) / 0.95);
          mesh.rotation.x = tiltT * Math.PI * 0.35;
          mesh.rotation.z = tiltT * Math.PI * 0.12;
          var armR3 = Math.max(0, (fallT - 0.03) / 0.97);
          var armL3 = Math.max(0, (fallT - 0.1) / 0.9);
          if (arms[0]) { arms[0].rotation.x = -0.5 - armR3 * 2.0; arms[0].rotation.z = armR3 * 0.4; }
          if (arms[1]) { arms[1].rotation.x = -0.5 - armL3 * 1.2; arms[1].rotation.z = -armL3 * 0.7; }
        } else {
          // Stagger & fall — direction-aware stagger, tip sideways
          if (fallT < 0.25) {
            // Stagger in hit direction (incremental, small per-frame shift)
            mesh.position.x += joltTargetX * 0.15;
            mesh.position.z += joltTargetZ * 0.15;
          } else {
            var tipT = Math.min(1, (fallT - 0.25) / 0.75);
            var tipEase = tipT * tipT;
            mesh.rotation.z = tipEase * Math.PI * 0.5;
            mesh.position.y = startY + tipEase * finalY;
            // One leg straight, one bent
            var armT4 = Math.max(0, (tipT - 0.1) / 0.9);
            if (arms[0]) { arms[0].rotation.z = armT4 * 0.8; }
            if (arms[1]) { arms[1].rotation.x = -0.5 - armT4 * 0.9; arms[1].rotation.z = -armT4 * 0.3; }
          }
        }
      }

      // Animation complete
      if (elapsed >= TOTAL_DURATION) {
        clearInterval(self._deathInterval);
        self._deathInterval = null;
      }
    }, 16);
  };
```

Key fixes vs. initial draft:
- `var enemyFwd = null;` declared properly (avoids strict-mode ReferenceError)
- Jolt uses absolute position interpolation (`mesh.position.x = startX + target * ease`) instead of incremental `+=` (frame-rate independent)
- Captures `startX`, `startZ` before interval for jolt interpolation
- Variant 4 (stagger) handles Y drop only in its own block (no double-set from general code)
- Each variant sets its own `mesh.position.y` explicitly

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat: overhaul death animation with hit jolt + gravity fall physics"
```

---

## Chunk 3: Verification & Documentation

### Task 3: Verify Gun Game / Deathmatch destroy() interaction

**Files:**
- Test: `tests/unit/enemies.test.js`

- [ ] **Step 1: Write test for destroy() during active death animation**

This verifies the Gun Game / Deathmatch path where `destroy()` is called immediately after kill while the death animation interval is still running:

```javascript
it('destroy() during active death animation should clean up properly', () => {
  vi.useFakeTimers();
  var scene = new THREE.Scene();
  var em = new GAME.EnemyManager(scene);
  em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
  var enemy = em.enemies[0];
  enemy.die(new THREE.Vector3(0, 0, -1));

  // Destroy immediately (simulates Gun Game / Deathmatch respawn)
  expect(enemy._deathInterval).not.toBeNull();
  enemy.destroy();

  // Interval should be cleared and mesh removed
  expect(enemy._deathInterval).toBeNull();
  expect(enemy.mesh.parent).toBeNull();

  // Advancing time should not throw (interval was cleared)
  vi.advanceTimersByTime(1000);

  vi.useRealTimers();
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — Task 1's `destroy()` changes already handle this.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/enemies.test.js
git commit -m "test: verify destroy() during active death animation (Gun Game/Deathmatch path)"
```

---

### Task 4: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Update the death animation section in REQUIREMENTS.md**

Find the existing death animation documentation (around line 832) and replace it with:

```markdown
- **Death animation**: Two-phase cinematic death with 5 directional variants based on hit direction relative to enemy facing. `_dying` flag set on death. Variant selection uses dot product of enemy forward vector and hit direction: (0) fall backward from front hit, (1) fall forward from back hit, (2) spin & drop from side hit, (3) crumple from headshot, (4) stagger & fall default.
  - **Phase 1 — Hit Jolt (0–0.1s):** Instant ease-out recoil (~0.07 units) opposite to hit direction (XZ plane). Interpolates to target position (frame-rate independent). Displacement maintained into Phase 2. Skipped for variant 3 (headshot).
  - **Phase 2 — Gravity Fall:** Quadratic ease-in (`t*t`) downward drop simulating gravity. Duration 0.3s for all variants (0.3s total for headshot since no jolt, 0.4s total for others).
  - **Final Y offsets:** -1.0 (backward), -0.9 (forward), -1.0 (spin), -1.1 (crumple), -0.9 (stagger).
  - **Final poses:** Variant-dependent — flat (backward: on back arms splayed; forward: face down one arm tucked), crumpled (spin: on side legs bent; crumple: knees buckled torso slumped), semi-crumpled (stagger: on side one leg bent).
  - Arms animate per variant with staggered timing offsets.
  - `takeDamage` passes `_lastHitDir` to `die()`.
  - **Body persistence:** Dead enemy meshes remain in scene until round reset (`clearAll()`). No auto-removal timer. In Gun Game/Deathmatch, `destroy()` removes mesh immediately on respawn.
  - **Interval cleanup:** Death animation interval stored as `_deathInterval` on enemy instance. `destroy()` calls `clearInterval()` before removing mesh.
```

- [ ] **Step 2: Run tests to confirm nothing broke**

Run: `npm test`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: update REQUIREMENTS.md with new death animation spec"
```
