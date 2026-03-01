# Immersion Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve game feel and immersion across shooting, movement, visuals, and audio — prioritized by player exposure frequency.

**Architecture:** Four layers of changes: (1) camera recoil on firing, (2) head bob and movement weight, (3) bullet impact decals and dust, (4) spatial audio with HRTF panning. All changes stay within the existing IIFE module pattern. Recoil state lives in player.js, weapon constants in weapons.js, impact effects in main.js, spatial audio in sound.js.

**Tech Stack:** Three.js r160.1 (global `THREE`), Web Audio API, Vitest + JSDOM for tests.

---

### Task 1: Add per-weapon recoil constants to WEAPON_DEFS

**Files:**
- Modify: `js/weapons.js:232-243` (WEAPON_DEFS object)
- Test: `tests/unit/weapons.test.js`

**Step 1: Write the failing test**

Add to `tests/unit/weapons.test.js` inside a new `describe('Recoil constants')` block:

```javascript
describe('Recoil constants', () => {
  var DEFS;
  beforeAll(() => { DEFS = GAME.WEAPON_DEFS; });

  it('every non-grenade weapon should have recoilUp, recoilSide, fovPunch, and screenShake', () => {
    ['knife', 'pistol', 'smg', 'shotgun', 'rifle', 'awp'].forEach(w => {
      expect(DEFS[w].recoilUp).toBeTypeOf('number');
      expect(DEFS[w].recoilSide).toBeTypeOf('number');
      expect(DEFS[w].fovPunch).toBeTypeOf('number');
      expect(DEFS[w].screenShake).toBeTypeOf('number');
    });
  });

  it('AWP should have the highest recoilUp', () => {
    expect(DEFS.awp.recoilUp).toBeGreaterThan(DEFS.rifle.recoilUp);
    expect(DEFS.awp.recoilUp).toBeGreaterThan(DEFS.shotgun.recoilUp);
  });

  it('knife should have zero recoil values', () => {
    expect(DEFS.knife.recoilUp).toBe(0);
    expect(DEFS.knife.recoilSide).toBe(0);
    expect(DEFS.knife.fovPunch).toBe(0);
    expect(DEFS.knife.screenShake).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `recoilUp` is `undefined`

**Step 3: Write minimal implementation**

Add these fields to each weapon in WEAPON_DEFS (values in radians for recoil, degrees for fovPunch):

```javascript
knife:   { ..., recoilUp: 0,     recoilSide: 0,     fovPunch: 0,   screenShake: 0 },
pistol:  { ..., recoilUp: 0.014, recoilSide: 0.003, fovPunch: 1.0, screenShake: 0.01 },
smg:     { ..., recoilUp: 0.010, recoilSide: 0.004, fovPunch: 0.8, screenShake: 0.015 },
shotgun: { ..., recoilUp: 0.044, recoilSide: 0.008, fovPunch: 2.0, screenShake: 0.04 },
rifle:   { ..., recoilUp: 0.021, recoilSide: 0.005, fovPunch: 1.2, screenShake: 0.03 },
awp:     { ..., recoilUp: 0.061, recoilSide: 0.010, fovPunch: 2.5, screenShake: 0.06 },
```

Note: `0.014 rad ≈ 0.8°`, `0.021 rad ≈ 1.2°`, `0.044 rad ≈ 2.5°`, `0.061 rad ≈ 3.5°`

Grenades don't need these fields (they aren't fired like bullets).

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add js/weapons.js tests/unit/weapons.test.js
git commit -m "feat: add per-weapon recoil constants to WEAPON_DEFS"
```

---

### Task 2: Add camera recoil accumulators to player.js

**Files:**
- Modify: `js/player.js` (Player constructor + update loop)
- Modify: `js/weapons.js` (tryFire — apply recoil on shot)
- Test: `tests/unit/player.test.js`

**Step 1: Write the failing test**

Add to `tests/unit/player.test.js`:

```javascript
describe('Camera recoil', () => {
  var player;
  beforeEach(() => {
    player = new GAME.Player(new THREE.PerspectiveCamera(), []);
    player.alive = true;
    player.pitch = 0;
    player.yaw = 0;
  });

  it('should have _recoilPitch and _recoilYaw initialized to 0', () => {
    expect(player._recoilPitch).toBe(0);
    expect(player._recoilYaw).toBe(0);
  });

  it('applyRecoil should add to _recoilPitch and _recoilYaw', () => {
    player.applyRecoil(0.02, 0.005);
    expect(player._recoilPitch).toBeGreaterThan(0);
    expect(Math.abs(player._recoilYaw)).toBeGreaterThanOrEqual(0);
  });

  it('recoil should decay toward zero over updates', () => {
    player.applyRecoil(0.05, 0.01);
    var initialPitch = player._recoilPitch;
    player.update(0.016); // one frame
    expect(Math.abs(player._recoilPitch)).toBeLessThan(Math.abs(initialPitch));
  });

  it('recoil should affect camera pitch', () => {
    var pitchBefore = player.pitch;
    player.applyRecoil(0.05, 0);
    player.update(0.016);
    // pitch should have been modified by recoil (pushed upward = more negative pitch)
    expect(player.pitch).not.toBe(pitchBefore);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `applyRecoil` is not a function

**Step 3: Write minimal implementation**

In `js/player.js` constructor (around line 80), add:

```javascript
this._recoilPitch = 0;
this._recoilYaw = 0;
this._recoilRecoverySpeed = 5; // radians per second
this._burstShotIndex = 0;
this._lastShotTime = 0;
```

Add method after constructor:

```javascript
Player.prototype.applyRecoil = function(recoilUp, recoilSide) {
  var now = performance.now() / 1000;
  // Burst accumulation — consecutive shots within 0.3s stack
  if (now - this._lastShotTime < 0.3) {
    this._burstShotIndex = Math.min(this._burstShotIndex + 1, 8);
  } else {
    this._burstShotIndex = 0;
  }
  this._lastShotTime = now;
  var burstMult = 1 + this._burstShotIndex * 0.15;
  this._recoilPitch += recoilUp * burstMult;
  this._recoilYaw += (Math.random() - 0.5) * 2 * recoilSide * burstMult;
};
```

In `update(dt)`, before the camera rotation is set (before `this.camera.rotation.set(this.pitch, this.yaw, this._strafeTilt)` around line 286), add:

```javascript
// Camera recoil — apply accumulated recoil to pitch/yaw, then decay
if (this._recoilPitch !== 0 || this._recoilYaw !== 0) {
  this.pitch -= this._recoilPitch; // negative pitch = look up
  this.yaw += this._recoilYaw;
  this._recoilPitch = 0;
  this._recoilYaw = 0;
}
```

Wait — the recoil should apply gradually, not instantly. Let me rethink. The recoil accumulates, then is applied as a kick over a couple frames, then recovers. Better approach:

In constructor:
```javascript
this._recoilPitchVel = 0;  // current recoil velocity being applied
this._recoilPitchOffset = 0; // total recoil offset from rest position
```

In `applyRecoil`:
```javascript
Player.prototype.applyRecoil = function(recoilUp, recoilSide) {
  var now = performance.now() / 1000;
  if (now - this._lastShotTime < 0.3) {
    this._burstShotIndex = Math.min(this._burstShotIndex + 1, 8);
  } else {
    this._burstShotIndex = 0;
  }
  this._lastShotTime = now;
  var burstMult = 1 + this._burstShotIndex * 0.15;
  // Immediate kick
  this.pitch -= recoilUp * burstMult;
  this.yaw += (Math.random() - 0.5) * 2 * recoilSide * burstMult;
  // Track offset for recovery
  this._recoilPitchOffset += recoilUp * burstMult;
};
```

In `update(dt)`, add recoil recovery (before camera rotation set):
```javascript
// Recoil recovery — pull pitch back toward pre-recoil position
if (this._recoilPitchOffset > 0.0001) {
  var recovery = this._recoilRecoverySpeed * dt;
  var recoverAmount = Math.min(recovery, this._recoilPitchOffset);
  this.pitch += recoverAmount; // recover downward (positive pitch = down)
  this._recoilPitchOffset -= recoverAmount;
}
```

In `js/weapons.js` `tryFire` (around line 1560, after muzzle flash), add:

```javascript
// Camera recoil
if (GAME._player && def.recoilUp) {
  GAME._player.applyRecoil(def.recoilUp, def.recoilSide);
}
```

Also in `tryFire`, replace the existing fixed screen shake trigger with weapon-scaled:
```javascript
if (def.screenShake) {
  GAME.triggerScreenShake(def.screenShake);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add js/player.js js/weapons.js tests/unit/player.test.js
git commit -m "feat: add camera recoil system with burst accumulation and recovery"
```

---

### Task 3: Add FOV punch on weapon fire

**Files:**
- Modify: `js/weapons.js` (tryFire — trigger FOV punch)
- Modify: `js/player.js` (use weapon's fovPunch value)
- Test: `tests/unit/player.test.js`

**Step 1: Write the failing test**

```javascript
describe('FOV punch on fire', () => {
  it('applyRecoil with fovPunch should set _fovPunch', () => {
    var player = new GAME.Player(new THREE.PerspectiveCamera(), []);
    player._fovPunch = 0;
    player.applyRecoil(0.02, 0.005, 1.5);
    expect(player._fovPunch).toBe(1.5);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — applyRecoil doesn't accept 3rd arg / doesn't set _fovPunch

**Step 3: Write minimal implementation**

Update `applyRecoil` signature to accept `fovPunch`:

```javascript
Player.prototype.applyRecoil = function(recoilUp, recoilSide, fovPunchVal) {
  // ... existing burst logic ...
  this.pitch -= recoilUp * burstMult;
  this.yaw += (Math.random() - 0.5) * 2 * recoilSide * burstMult;
  this._recoilPitchOffset += recoilUp * burstMult;
  if (fovPunchVal) this._fovPunch = fovPunchVal;
};
```

In `js/weapons.js` `tryFire`, update the applyRecoil call:

```javascript
if (GAME._player && def.recoilUp) {
  GAME._player.applyRecoil(def.recoilUp, def.recoilSide, def.fovPunch);
}
```

The existing FOV punch decay code in player.js already handles `_fovPunch` (line ~289-292).

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add js/player.js js/weapons.js tests/unit/player.test.js
git commit -m "feat: add FOV punch per weapon on fire"
```

---

### Task 4: Add head bob to camera

**Files:**
- Modify: `js/player.js` (update loop — add head bob calculation)
- Test: `tests/unit/player.test.js`

**Step 1: Write the failing test**

```javascript
describe('Head bob', () => {
  var player;
  beforeEach(() => {
    player = new GAME.Player(new THREE.PerspectiveCamera(), []);
    player.alive = true;
    player.onGround = true;
    player.position.set(0, 1.7, 0);
  });

  it('should have _headBobPhase initialized to 0', () => {
    expect(player._headBobPhase).toBe(0);
  });

  it('should advance _headBobPhase when walking', () => {
    player.keys.w = true;
    player._dir.set(0, 0, -1);
    player.update(0.016);
    expect(player._headBobPhase).toBeGreaterThan(0);
  });

  it('should not advance _headBobPhase when standing still', () => {
    player.update(0.016);
    expect(player._headBobPhase).toBe(0);
  });

  it('_headBobOffset should be a number after walking', () => {
    player.keys.w = true;
    player._dir.set(0, 0, -1);
    player.update(0.016);
    expect(player._headBobOffset).toBeTypeOf('number');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `_headBobPhase` is undefined

**Step 3: Write minimal implementation**

In Player constructor, add:

```javascript
this._headBobPhase = 0;
this._headBobOffset = 0;
this._headBobSideOffset = 0;
this._headBobIntensity = 0; // smooth blend
```

In `update(dt)`, after footstep logic but before camera position set (before `this.camera.position.copy(this.position)`), add:

```javascript
// Head bob
var isMoving = this.onGround && this._dir.lengthSq() > 0.01 && this.alive;
var isSprinting = this.keys.shift && !this.crouching;
var isCrouching = this.crouching;

var bobFreq, bobAmpY, bobAmpX;
if (isSprinting) {
  bobFreq = 3.0; bobAmpY = 0.05; bobAmpX = 0.025;
} else if (isCrouching) {
  bobFreq = 1.5; bobAmpY = 0.015; bobAmpX = 0.008;
} else {
  bobFreq = 2.2; bobAmpY = 0.03; bobAmpX = 0.015;
}

var targetIntensity = isMoving ? 1 : 0;
this._headBobIntensity += (targetIntensity - this._headBobIntensity) * Math.min(1, 6 * dt);

if (isMoving) {
  this._headBobPhase += bobFreq * Math.PI * 2 * dt;
} else if (this._headBobIntensity < 0.01) {
  this._headBobPhase = 0;
}

this._headBobOffset = Math.sin(this._headBobPhase) * bobAmpY * this._headBobIntensity;
this._headBobSideOffset = Math.sin(this._headBobPhase * 0.5) * bobAmpX * this._headBobIntensity;
```

Then where camera position is set (`this.camera.position.copy(this.position)` line ~275), add:

```javascript
this.camera.position.y += this._headBobOffset + this._landDip;
this.camera.position.x += this._headBobSideOffset;
```

Remove the existing `this.camera.position.y += this._landDip;` line to avoid double-applying.

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add js/player.js tests/unit/player.test.js
git commit -m "feat: add camera head bob synced to movement state"
```

---

### Task 5: Enhanced landing impact scaled to fall distance

**Files:**
- Modify: `js/player.js` (landing logic around line 241–253)
- Test: `tests/unit/player.test.js`

**Step 1: Write the failing test**

```javascript
describe('Enhanced landing impact', () => {
  var player;
  beforeEach(() => {
    player = new GAME.Player(new THREE.PerspectiveCamera(), []);
    player.alive = true;
  });

  it('short fall should produce small land dip', () => {
    player._wasFalling = true;
    player._fallStartY = 2.5;
    player.position.y = 1.7; // fallDist = 0.8
    player.onGround = true;
    player._wasOnGround = false;
    player.velocity.y = 0;
    player.update(0.016);
    expect(player._landDip).toBeGreaterThan(-0.10);
  });

  it('big fall should produce large land dip', () => {
    player._wasFalling = true;
    player._fallStartY = 8.0;
    player.position.y = 1.7; // fallDist = 6.3
    player.onGround = true;
    player._wasOnGround = false;
    player.velocity.y = 0;
    player.update(0.016);
    expect(player._landDip).toBeLessThan(-0.15);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — short falls currently always produce -0.12

**Step 3: Write minimal implementation**

Replace the landing logic (around lines 241–253) with:

```javascript
if (this.onGround && !this._wasOnGround && this.velocity.y <= 0) {
  var fallDist = 0;
  if (this._wasFalling) {
    fallDist = this._fallStartY - this.position.y;
    this._wasFalling = false;
  }
  // Scale land dip by fall distance
  if (fallDist > 4) {
    this._landDip = -0.25;
    this._fovPunch = 8;
  } else if (fallDist > 1.5) {
    this._landDip = -0.15;
    this._fovPunch = 5;
  } else {
    this._landDip = -0.06;
  }
  if (GAME.Sound) GAME.Sound.landingThud();
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add js/player.js tests/unit/player.test.js
git commit -m "feat: scale landing impact with fall distance"
```

---

### Task 6: Add velocity smoothing (acceleration/deceleration)

**Files:**
- Modify: `js/player.js` (movement velocity calculation, around lines 190-227)
- Test: `tests/unit/player.test.js`

**Step 1: Write the failing test**

```javascript
describe('Velocity smoothing', () => {
  var player;
  beforeEach(() => {
    player = new GAME.Player(new THREE.PerspectiveCamera(), []);
    player.alive = true;
    player.onGround = true;
    player.position.set(0, 1.7, 0);
  });

  it('should not reach full speed instantly when starting to move', () => {
    player.keys.w = true;
    player.update(0.016); // single frame
    var speed = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.z * player.velocity.z);
    expect(speed).toBeLessThan(6); // MOVE_SPEED = 6
    expect(speed).toBeGreaterThan(0);
  });

  it('should reach near full speed after several frames', () => {
    player.keys.w = true;
    for (var i = 0; i < 20; i++) player.update(0.016);
    var speed = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.z * player.velocity.z);
    expect(speed).toBeGreaterThan(5.5);
  });

  it('should decelerate when stopping', () => {
    player.keys.w = true;
    for (var i = 0; i < 20; i++) player.update(0.016);
    player.keys.w = false;
    player.update(0.016); // single frame after stopping
    var speed = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.z * player.velocity.z);
    expect(speed).toBeGreaterThan(0);
    expect(speed).toBeLessThan(6);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — velocity currently snaps to full speed instantly

**Step 3: Write minimal implementation**

In Player constructor, add:

```javascript
this._smoothVelX = 0;
this._smoothVelZ = 0;
```

Replace the instant velocity assignment (around line 220-222):

```javascript
// Old:
// this.velocity.x = this._dir.x * speed;
// this.velocity.z = this._dir.z * speed;

// New — smooth acceleration/deceleration
var targetVx = this._dir.x * speed;
var targetVz = this._dir.z * speed;
var accelRate = (this._dir.lengthSq() > 0.01) ? 15 : 20; // accel slower than decel
this._smoothVelX += (targetVx - this._smoothVelX) * Math.min(1, accelRate * dt);
this._smoothVelZ += (targetVz - this._smoothVelZ) * Math.min(1, accelRate * dt);
this.velocity.x = this._smoothVelX;
this.velocity.z = this._smoothVelZ;
```

Rate of 15 means ~0.07s to reach ~65% of target (1/15). Rate of 20 for decel means ~0.05s. Both feel snappy but not instant.

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add js/player.js tests/unit/player.test.js
git commit -m "feat: add velocity smoothing for natural acceleration/deceleration"
```

---

### Task 7: Add bullet hole decals on wall hits

**Files:**
- Modify: `js/main.js` (add bullet hole decal system near blood decal system)
- Modify: `js/weapons.js` (report wall hit position and normal to main.js)
- Test: `tests/unit/main.test.js` (or new file `tests/unit/impact.test.js`)

**Step 1: Write the failing test**

Create or add to a test file:

```javascript
describe('Bullet impact decals', () => {
  it('GAME.spawnBulletHole should be a function', () => {
    expect(typeof GAME.spawnBulletHole).toBe('function');
  });

  it('should track bullet holes in GAME._bulletHoles array', () => {
    expect(Array.isArray(GAME._bulletHoles)).toBe(true);
  });

  it('should cap bullet holes at MAX_BULLET_HOLES', () => {
    expect(typeof GAME.MAX_BULLET_HOLES).toBe('number');
    expect(GAME.MAX_BULLET_HOLES).toBe(60);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `spawnBulletHole` is not defined

**Step 3: Write minimal implementation**

In `js/main.js`, near the blood decal system (around line 568), add:

```javascript
// Bullet hole decals
var _bulletHoleGeo = null;
var bulletHoles = [];
var MAX_BULLET_HOLES = 60;

function spawnBulletHole(point, normal) {
  if (!_bulletHoleGeo) {
    _bulletHoleGeo = new THREE.PlaneGeometry(0.08, 0.08);
  }
  var mat = new THREE.MeshBasicMaterial({
    color: 0x222222,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1
  });
  var decal = new THREE.Mesh(_bulletHoleGeo, mat);
  decal.position.copy(point);
  // Offset slightly from surface to avoid z-fighting
  decal.position.add(normal.clone().multiplyScalar(0.005));
  // Orient to face along the surface normal
  decal.lookAt(point.x + normal.x, point.y + normal.y, point.z + normal.z);
  // Random rotation around normal axis
  decal.rotateZ(Math.random() * Math.PI * 2);
  // Random size variation
  var s = 0.7 + Math.random() * 0.6;
  decal.scale.set(s, s, 1);
  scene.add(decal);

  bulletHoles.push({ mesh: decal, mat: mat, age: 0 });

  // Recycle oldest if over limit
  if (bulletHoles.length > MAX_BULLET_HOLES) {
    var old = bulletHoles.shift();
    scene.remove(old.mesh);
    old.mat.dispose();
  }
}

GAME.spawnBulletHole = spawnBulletHole;
GAME._bulletHoles = bulletHoles;
GAME.MAX_BULLET_HOLES = MAX_BULLET_HOLES;
```

Add fade logic in the game loop (near `updateBloodParticles`):

```javascript
function updateBulletHoles(dt) {
  for (var i = bulletHoles.length - 1; i >= 0; i--) {
    var bh = bulletHoles[i];
    bh.age += dt;
    if (bh.age > 12) { // start fading at 12s
      bh.mat.opacity = Math.max(0, 0.8 - (bh.age - 12) * (0.8 / 3)); // fade over 3s
      if (bh.mat.opacity <= 0) {
        scene.remove(bh.mesh);
        bh.mat.dispose();
        bulletHoles.splice(i, 1);
      }
    }
  }
}
```

Call `updateBulletHoles(dt)` in the game loop alongside `updateBloodParticles(dt)`.

In `js/weapons.js`, in the `tryFire` raycasting loop, when a wall hit occurs (around line 1674 where `wallsPenetrated` is incremented), add:

```javascript
// Spawn bullet hole decal at wall impact point
if (GAME.spawnBulletHole && hit.face) {
  var worldNormal = hit.face.normal.clone();
  worldNormal.transformDirection(hit.object.matrixWorld);
  GAME.spawnBulletHole(hit.point.clone(), worldNormal);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add js/main.js js/weapons.js tests/unit/main.test.js
git commit -m "feat: add bullet hole decals on wall hits"
```

---

### Task 8: Add impact dust puff particles

**Files:**
- Modify: `js/main.js` (dust puff system alongside bullet holes)
- Test: `tests/unit/main.test.js`

**Step 1: Write the failing test**

```javascript
describe('Impact dust puff', () => {
  it('GAME.spawnImpactDust should be a function', () => {
    expect(typeof GAME.spawnImpactDust).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL

**Step 3: Write minimal implementation**

In `js/main.js`, near the bullet hole code:

```javascript
// Impact dust particles
var _dustGeo = new THREE.BoxGeometry(0.02, 0.02, 0.02);
var _dustPool = [];
var _dustPoolSize = 20;
var _dustParticles = [];

function _initDustPool() {
  for (var i = 0; i < _dustPoolSize; i++) {
    var mat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0 });
    var m = new THREE.Mesh(_dustGeo, mat);
    m.visible = false;
    scene.add(m);
    _dustPool.push({ mesh: m, mat: mat });
  }
}

var _dustIdx = 0;

function spawnImpactDust(point, normal, surfaceColor) {
  if (_dustPool.length === 0) _initDustPool();
  var dustColor = surfaceColor || 0xaaaaaa;
  var count = 3 + Math.floor(Math.random() * 2); // 3-4 particles
  for (var i = 0; i < count; i++) {
    var d = _dustPool[_dustIdx];
    _dustIdx = (_dustIdx + 1) % _dustPoolSize;
    d.mat.color.setHex(dustColor);
    d.mat.opacity = 0.6;
    d.mesh.visible = true;
    d.mesh.position.copy(point);
    var spread = 0.5;
    var vx = normal.x * 2 + (Math.random() - 0.5) * spread;
    var vy = normal.y * 2 + Math.random() * 1.5;
    var vz = normal.z * 2 + (Math.random() - 0.5) * spread;
    _dustParticles.push({
      pool: d, vx: vx, vy: vy, vz: vz, age: 0, maxLife: 0.3
    });
  }
}

function updateImpactDust(dt) {
  for (var i = _dustParticles.length - 1; i >= 0; i--) {
    var p = _dustParticles[i];
    p.age += dt;
    if (p.age >= p.maxLife) {
      p.pool.mesh.visible = false;
      p.pool.mat.opacity = 0;
      _dustParticles.splice(i, 1);
      continue;
    }
    p.vy -= 9.8 * dt; // gravity
    p.pool.mesh.position.x += p.vx * dt;
    p.pool.mesh.position.y += p.vy * dt;
    p.pool.mesh.position.z += p.vz * dt;
    p.pool.mat.opacity = 0.6 * (1 - p.age / p.maxLife);
  }
}

GAME.spawnImpactDust = spawnImpactDust;
```

Call `updateImpactDust(dt)` in the game loop.

In `js/weapons.js`, alongside the `spawnBulletHole` call in tryFire, add:

```javascript
if (GAME.spawnImpactDust && hit.face) {
  // Determine dust color from hit surface material
  var dustCol = 0xaaaaaa; // default gray
  if (hit.object.material && hit.object.material.color) {
    var c = hit.object.material.color;
    var lum = c.r * 0.3 + c.g * 0.3 + c.b * 0.3;
    dustCol = new THREE.Color(c.r * 0.8 + 0.2, c.g * 0.8 + 0.2, c.b * 0.8 + 0.2).getHex();
  }
  GAME.spawnImpactDust(hit.point.clone(), worldNormal, dustCol);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add js/main.js js/weapons.js tests/unit/main.test.js
git commit -m "feat: add impact dust puff particles on wall hits"
```

---

### Task 9: Add spatial audio system to sound.js

**Files:**
- Modify: `js/sound.js` (add PannerNode pool, listener update, spatial play function)
- Test: `tests/unit/sound.test.js`

**Step 1: Write the failing test**

```javascript
describe('Spatial audio', () => {
  it('GAME.Sound.updateListener should be a function', () => {
    expect(typeof GAME.Sound.updateListener).toBe('function');
  });

  it('GAME.Sound.playSpatial should be a function', () => {
    expect(typeof GAME.Sound.playSpatial).toBe('function');
  });

  it('GAME.Sound.enemyShotSpatial should be a function', () => {
    expect(typeof GAME.Sound.enemyShotSpatial).toBe('function');
  });

  it('GAME.Sound.botFootstep should be a function', () => {
    expect(typeof GAME.Sound.botFootstep).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL

**Step 3: Write minimal implementation**

In `js/sound.js`, add the spatial audio system:

```javascript
// Spatial audio — update AudioContext listener from camera
updateListener: function(camera) {
  var c = ensureCtx();
  var listener = c.listener;
  if (listener.positionX) {
    // Modern API
    listener.positionX.value = camera.position.x;
    listener.positionY.value = camera.position.y;
    listener.positionZ.value = camera.position.z;
    var fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    var up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    listener.forwardX.value = fwd.x;
    listener.forwardY.value = fwd.y;
    listener.forwardZ.value = fwd.z;
    listener.upX.value = up.x;
    listener.upY.value = up.y;
    listener.upZ.value = up.z;
  } else if (listener.setPosition) {
    // Legacy API
    var fwd2 = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    var up2 = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    listener.setPosition(camera.position.x, camera.position.y, camera.position.z);
    listener.setOrientation(fwd2.x, fwd2.y, fwd2.z, up2.x, up2.y, up2.z);
  }
},

// Create a PannerNode for spatial positioning
_createPanner: function(x, y, z) {
  var c = ensureCtx();
  var panner = c.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = 5;
  panner.maxDistance = 80;
  panner.rolloffFactor = 1.2;
  panner.setPosition(x, y, z);
  return panner;
},

// Play a spatial enemy shot at a world position
enemyShotSpatial: function(x, y, z) {
  var panner = this._createPanner(x, y, z);
  panner.connect(masterGain);
  // Same layers as enemyShot but routed through panner instead of masterGain
  noiseBurst({ duration: 0.008, gain: 0.25, freq: 2000, Q: 0.5,
    filterType: 'highpass', distortion: 15, destination: panner });
  noiseBurst({ duration: 0.06, gain: 0.18, freq: 800, freqEnd: 200, Q: 0.7,
    destination: panner });
  resTone({ freq: 350, freqEnd: 80, duration: 0.05, gain: 0.12,
    type: 'sawtooth', filterFreq: 1500, filterEnd: 300, destination: panner });
  noiseBurst({ duration: 0.1, gain: 0.04, freq: 500, freqEnd: 200,
    Q: 0.4, delay: 0.01, attack: 0.008, destination: panner });
},

// Play a spatial bot footstep at a world position
botFootstep: function(x, y, z) {
  var panner = this._createPanner(x, y, z);
  panner.connect(masterGain);
  noiseBurst({ freq: 400, duration: 0.04, gain: 0.05, filterType: 'bandpass',
    destination: panner });
},
```

**Important:** The `noiseBurst` and `resTone` helpers currently route directly to `masterGain`. To support spatial audio, modify them to accept an optional `destination` parameter in their options. If `opts.destination` is provided, route through that instead of `masterGain`. Update `noiseBurst` (around line 94) and `resTone` (around line 133):

```javascript
// In noiseBurst, change the final connection:
var dest = opts.destination || masterGain;
g.connect(dest);

// In resTone, same change:
var dest = opts.destination || masterGain;
g.connect(dest);
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add js/sound.js tests/unit/sound.test.js
git commit -m "feat: add spatial audio system with HRTF panning"
```

---

### Task 10: Integrate spatial audio — listener update + enemy shots

**Files:**
- Modify: `js/main.js` (update listener each frame in game loop)
- Modify: `js/enemies.js` (use spatial enemy shot sound)

**Step 1: Write the failing test**

```javascript
describe('Spatial audio integration', () => {
  it('enemy fire should call enemyShotSpatial when available', () => {
    // This is an integration test — verify GAME.Sound.enemyShotSpatial exists
    expect(typeof GAME.Sound.enemyShotSpatial).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: should PASS (function already exists from Task 9)

**Step 3: Write minimal implementation**

In `js/main.js` game loop, after `player.update(dt)` call, add:

```javascript
// Update spatial audio listener position
if (GAME.Sound && GAME.Sound.updateListener) {
  GAME.Sound.updateListener(camera);
}
```

In `js/enemies.js`, in the enemy fire logic (where `GAME.Sound.enemyShot()` is called), replace with:

```javascript
if (GAME.Sound) {
  if (GAME.Sound.enemyShotSpatial) {
    var pos = this.mesh.position;
    GAME.Sound.enemyShotSpatial(pos.x, pos.y + 1.5, pos.z);
  } else {
    GAME.Sound.enemyShot();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add js/main.js js/enemies.js tests/unit/sound.test.js
git commit -m "feat: integrate spatial audio listener and spatial enemy shots"
```

---

### Task 11: Add bot footstep sounds

**Files:**
- Modify: `js/enemies.js` (add footstep timer to bots, trigger spatial footstep)
- Test: `tests/unit/enemies.test.js`

**Step 1: Write the failing test**

```javascript
describe('Bot footsteps', () => {
  it('enemy should have _footstepTimer initialized', () => {
    var enemy = new GAME.Enemy(/* minimal args */);
    expect(enemy._footstepTimer).toBe(0);
  });

  it('enemy should have _footstepInterval', () => {
    var enemy = new GAME.Enemy(/* minimal args */);
    expect(enemy._footstepInterval).toBeTypeOf('number');
    expect(enemy._footstepInterval).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `_footstepTimer` is undefined

**Step 3: Write minimal implementation**

In `js/enemies.js` Enemy constructor, add:

```javascript
this._footstepTimer = 0;
this._footstepInterval = 0.45;
```

In `Enemy.prototype.update`, in the movement section (when `_moveToward` is called and returns false = still moving), add:

```javascript
// Bot footstep sounds
if (this._currentSpeed > 1) {
  this._footstepTimer += dt;
  if (this._footstepTimer >= this._footstepInterval) {
    this._footstepTimer = 0;
    // Only play if bot is within audible range (~15 units)
    if (GAME.Sound && GAME.Sound.botFootstep && GAME._player) {
      var dx = this.mesh.position.x - GAME._player.position.x;
      var dz = this.mesh.position.z - GAME._player.position.z;
      var distSq = dx * dx + dz * dz;
      if (distSq < 225) { // 15^2
        var p = this.mesh.position;
        GAME.Sound.botFootstep(p.x, 0, p.z);
      }
    }
  }
} else {
  this._footstepTimer = 0;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat: add spatial bot footstep sounds"
```

---

### Task 12: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

**Step 1: No test needed for docs**

**Step 2: Update REQUIREMENTS.md**

Add/update sections documenting:
- Camera recoil system (per-weapon values, burst accumulation, recovery)
- FOV punch on fire
- Head bob (walk/sprint/crouch frequencies and amplitudes)
- Enhanced landing impact (fall-distance scaling)
- Velocity smoothing (acceleration/deceleration rates)
- Bullet hole decals (pool size, fade timing, surface orientation)
- Impact dust puff particles (pool size, lifetime, surface-aware coloring)
- Spatial audio system (HRTF panning, listener sync, which sounds are spatial)
- Bot footstep sounds (trigger distance, spatial positioning)

Look for existing sections on weapon effects, player movement, sound, and visual effects — add the new features to the appropriate existing sections rather than creating all-new sections.

**Step 3: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: update REQUIREMENTS.md with immersion overhaul features"
```

---

### Task 13: Final integration test and polish

**Files:**
- All modified files
- Test: run full test suite

**Step 1: Run full test suite**

Run: `npm test`
Expected: all tests PASS

**Step 2: Manual verification checklist**

Open the game in a browser and verify:
- Firing each weapon produces visible camera kick (upward + slight horizontal wobble)
- Holding down auto-fire (rifle/SMG) makes recoil accumulate and get worse
- Camera recovers to original position after stopping fire
- Walking produces subtle camera bob
- Sprinting produces more pronounced bob
- Jumping off a ledge produces impact scaled to height
- Bullet holes appear on walls where shots land
- Small dust particles puff on wall impacts
- Enemy gunfire sounds directional (left/right ear difference)
- Bot footsteps are audible when nearby

**Step 3: Fix any issues found**

**Step 4: Final commit**

```bash
git add -A
git commit -m "polish: final integration tweaks for immersion overhaul"
```
