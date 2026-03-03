# Immersion Pass II Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Comprehensive immersion improvements across weapon feel, movement feedback, damage response, and audio depth — 14 features organized by game moment.

**Architecture:** Each layer groups changes by player experience ("I shoot", "I move", "I get hit", "I hear the world"). Features within a layer can share state variables. Most changes touch `weapons.js`, `player.js`, `sound.js`, and `main.js`. CSS overlays in `index.html` handle screen-space effects.

**Tech Stack:** Three.js r160.1 (global `THREE`), Web Audio API, Vitest + jsdom for tests.

---

## Task 1: Enhanced Weapon View Model Sway (1a)

Enhance the existing weapon bob/sway in `weapons.js` with look-lag, sprint tilt, and stronger move bob.

**Files:**
- Modify: `js/weapons.js` — constructor (lines ~770-776), update (lines ~2019-2057)
- Test: `tests/unit/weapons.test.js`

**Step 1: Write the failing tests**

In `tests/unit/weapons.test.js`, add a new `describe('Weapon view model sway')` block:

```js
describe('Weapon view model sway', () => {
  it('should track look sway offset from yaw delta', () => {
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera();
    var ws = new GAME.WeaponSystem(scene, camera);
    ws.equip('rifle');
    // Simulate a yaw change
    ws._lastYaw = 0;
    ws.update(0.016, 0, 0.1); // currentYaw = 0.1
    // swayOffset should be non-zero (opposite direction to look)
    expect(Math.abs(ws._swayOffset)).toBeGreaterThan(0);
  });

  it('should have sprint tilt when sprinting', () => {
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera();
    var ws = new GAME.WeaponSystem(scene, camera);
    ws.equip('rifle');
    ws._moving = true;
    ws._sprinting = true;
    ws.update(0.016, 0, 0);
    ws.update(0.016, 0, 0);
    ws.update(0.016, 0, 0);
    // Gun should tilt and lower during sprint
    expect(ws._sprintBlend).toBeGreaterThan(0);
  });

  it('should have vertical look sway from pitch delta', () => {
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera();
    var ws = new GAME.WeaponSystem(scene, camera);
    ws.equip('rifle');
    ws._lastPitch = 0;
    ws.update(0.016, 0.1, 0); // currentPitch = 0.1
    expect(Math.abs(ws._swayOffsetY)).toBeGreaterThan(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `_swayOffsetY`, `_sprintBlend`, and possibly updated sway behavior not yet implemented.

**Step 3: Implement weapon sway enhancements**

In `js/weapons.js` constructor (near line 770), add new state:

```js
this._swayOffsetY = 0;
this._lastPitch = 0;
this._sprintBlend = 0;
this._sprinting = false;
```

In the `update()` method (near lines 2019-2057), modify the bob/sway block:

```js
// Sprint blend (smooth transition)
var sprintTarget = this._sprinting ? 1 : 0;
this._sprintBlend += (sprintTarget - this._sprintBlend) * 4 * dt;

// Sprint tilt: gun tilts ~15° (0.26 rad) and lowers
var sprintTiltZ = this._sprintBlend * 0.26;
var sprintLowerY = this._sprintBlend * -0.06;
var sprintLowerX = this._sprintBlend * -0.08;

// Vertical look sway (pitch delta)
var deltaPitch = currentPitch - this._lastPitch;
this._lastPitch = currentPitch;
this._swayOffsetY += (deltaPitch * 0.6 - this._swayOffsetY) * 6 * dt;

// Apply position: base + bob + sway + sprint
this.weaponModel.position.x = 0.35 + bobX + this._swayOffset + sprintLowerX;
this.weaponModel.position.y = -0.28 + bobY + this._swayOffsetY + sprintLowerY;

// Apply sprint tilt rotation on Z (additive with strafe tilt)
this.weaponModel.rotation.z = this._strafeTilt + sprintTiltZ;
```

Add a `setSprinting` method:

```js
WeaponSystem.prototype.setSprinting = function(val) {
    this._sprinting = val;
};
```

In `js/player.js`, call `setSprinting` from the update loop where sprint state is determined (near line 211):

```js
if (GAME._weapons) GAME._weapons.setSprinting(this.keys.shift && !this.crouching && this._dir.lengthSq() > 0.01);
```

Also update the `update()` method signature to pass `currentPitch`:

```js
weapons.update(dt, player.pitch, player.yaw);
```

This requires updating `main.js` where `weapons.update` is called (near line 3623) to pass both pitch and yaw.

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All new tests PASS.

**Step 5: Update REQUIREMENTS.md**

Add under a new "Weapon View Model Sway" section describing look sway, vertical sway, sprint tilt, and move bob enhancements.

**Step 6: Commit**

```
git add js/weapons.js js/player.js js/main.js tests/unit/weapons.test.js REQUIREMENTS.md
git commit -m "Add weapon view model sway with look-lag, vertical sway, and sprint tilt"
```

---

## Task 2: Multi-Phase Reload Animation (1b)

Replace the simple reload dip with a multi-phase sequence: magazine drop, new magazine insert, bolt rack.

**Files:**
- Modify: `js/weapons.js` — reload block (lines ~2039-2043), `startReload` (lines ~1460-1472)
- Modify: `js/sound.js` — add `reloadMagOut()`, `reloadMagIn()`, `reloadBoltRack()`
- Test: `tests/unit/weapons.test.js`, `tests/unit/sound.test.js`

**Step 1: Write the failing tests**

```js
describe('Multi-phase reload animation', () => {
  it('should track reload phase during reload', () => {
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera();
    var ws = new GAME.WeaponSystem(scene, camera);
    ws.equip('rifle');
    ws.ammo.rifle = 0;
    ws.reserve.rifle = 30;
    ws.startReload();
    expect(ws.reloading).toBe(true);
    expect(ws._reloadPhase).toBe(0); // phase 0: magazine out
  });

  it('should progress through reload phases over time', () => {
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera();
    var ws = new GAME.WeaponSystem(scene, camera);
    ws.equip('rifle');
    ws.ammo.rifle = 0;
    ws.reserve.rifle = 30;
    ws.startReload();
    // Advance past phase 0 (0-30% of reload time)
    var reloadTime = 2.5; // rifle reload time
    for (var i = 0; i < 30; i++) ws.update(reloadTime * 0.012, 0, 0);
    expect(ws._reloadPhase).toBeGreaterThanOrEqual(1);
  });

  it('should spawn magazine drop mesh during phase 0', () => {
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera();
    var ws = new GAME.WeaponSystem(scene, camera);
    ws.equip('rifle');
    ws.ammo.rifle = 0;
    ws.reserve.rifle = 30;
    ws.startReload();
    expect(ws._magDropMesh).toBeDefined();
  });
});
```

In `tests/unit/sound.test.js`:

```js
describe('Reload phase sounds', () => {
  it('should have reloadMagOut function', () => {
    expect(typeof GAME.Sound.reloadMagOut).toBe('function');
  });

  it('should have reloadMagIn function', () => {
    expect(typeof GAME.Sound.reloadMagIn).toBe('function');
  });

  it('should have reloadBoltRack function', () => {
    expect(typeof GAME.Sound.reloadBoltRack).toBe('function');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `_reloadPhase`, `_magDropMesh`, new sound functions don't exist.

**Step 3: Implement reload sounds in sound.js**

Add three new functions to the `Sound` object:

```js
reloadMagOut: function() {
    // Metallic click + slide sound
    metallicClick(800, 0.12);
    noiseBurst({ freq: 1200, duration: 0.04, gain: 0.08, filterType: 'bandpass', delay: 0.02 });
},
reloadMagIn: function() {
    // Thunk of magazine seating
    noiseBurst({ freq: 300, duration: 0.06, gain: 0.15, filterType: 'lowpass' });
    metallicClick(600, 0.1);
},
reloadBoltRack: function() {
    // Metallic rack: two clicks with slide noise between
    metallicClick(1000, 0.15);
    noiseBurst({ freq: 2000, duration: 0.06, gain: 0.06, filterType: 'highpass', delay: 0.04 });
    metallicClick(800, 0.12, 0.08);
},
```

**Step 4: Implement multi-phase reload in weapons.js**

In the constructor, add:

```js
this._reloadPhase = -1; // -1 = not reloading phases
this._magDropMesh = null;
this._magDropVel = new THREE.Vector3();
```

Modify `startReload()` to initialize phases:

```js
WeaponSystem.prototype.startReload = function() {
    // ... existing guard checks ...
    this.reloading = true;
    this.reloadTimer = def.reloadTime;
    this._reloadPhase = 0;
    // Spawn mag drop mesh
    this._spawnMagDrop();
    if (GAME.Sound) GAME.Sound.reloadMagOut();
};
```

Add `_spawnMagDrop()`:

```js
WeaponSystem.prototype._spawnMagDrop = function() {
    var mag = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.06, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 })
    );
    mag.position.copy(this.camera.position);
    var fwd = new THREE.Vector3(0.2, -0.3, -0.4).applyQuaternion(this.camera.quaternion);
    mag.position.add(fwd);
    this._magDropVel.set(0, -2, 0);
    this.scene.add(mag);
    this._magDropMesh = mag;
};
```

Replace the reload dip block (lines ~2039-2043) with a multi-phase system:

```js
if (this.reloading) {
    var rp = 1 - (this.reloadTimer / WEAPON_DEFS[this.current].reloadTime);
    if (rp < 0.3) {
        // Phase 0: tilt gun, mag drops away
        this._reloadPhase = 0;
        var p0 = rp / 0.3;
        bobY -= p0 * 0.12;
        this.weaponModel.rotation.x = p0 * 0.4; // tilt ~23°
    } else if (rp < 0.7) {
        // Phase 1: new mag coming up
        if (this._reloadPhase === 0) {
            this._reloadPhase = 1;
            if (GAME.Sound) GAME.Sound.reloadMagIn();
        }
        var p1 = (rp - 0.3) / 0.4;
        bobY -= 0.12 * (1 - p1 * 0.5); // gradually rise
        this.weaponModel.rotation.x = 0.4 * (1 - p1);
    } else {
        // Phase 2: gun returns to ready
        if (this._reloadPhase === 1) {
            this._reloadPhase = 2;
            var isAutoWeapon = (this.current === 'rifle' || this.current === 'smg');
            if (GAME.Sound && isAutoWeapon) GAME.Sound.reloadBoltRack();
        }
        var p2 = (rp - 0.7) / 0.3;
        bobY -= 0.06 * (1 - p2);
        this.weaponModel.rotation.x = 0; // back to normal
    }
}
```

Update the magazine drop mesh each frame in the particles/update area:

```js
if (this._magDropMesh) {
    this._magDropVel.y -= 9.8 * dt;
    this._magDropMesh.position.addScaledVector(this._magDropVel, dt);
    this._magDropMesh.rotation.x += 3 * dt;
    this._magDropMesh.material.opacity -= dt * 1.5;
    if (this._magDropMesh.material.opacity <= 0) {
        this.scene.remove(this._magDropMesh);
        this._magDropMesh = null;
    }
}
```

**Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS.

**Step 6: Update REQUIREMENTS.md**

Add "Multi-Phase Reload Animation" section with phase timings and magazine drop details.

**Step 7: Commit**

```
git add js/weapons.js js/sound.js tests/unit/weapons.test.js tests/unit/sound.test.js REQUIREMENTS.md
git commit -m "Add multi-phase reload animation with magazine drop and phased sounds"
```

---

## Task 3: Enhanced Muzzle Flash Dynamic Light (1c)

Add per-weapon flash color and intensity to the existing muzzle flash PointLight.

**Files:**
- Modify: `js/weapons.js` — `_showMuzzleFlash` (lines ~1842-1879), WEAPON_DEFS (lines ~234-242)
- Test: `tests/unit/weapons.test.js`

**Step 1: Write the failing tests**

```js
describe('Per-weapon muzzle flash', () => {
  it('should define flashColor per weapon in WEAPON_DEFS', () => {
    var defs = GAME.WeaponSystem.WEAPON_DEFS || GAME.WEAPON_DEFS;
    expect(defs.rifle.flashColor).toBeDefined();
    expect(defs.awp.flashColor).toBeDefined();
    expect(defs.pistol.flashColor).toBeDefined();
  });

  it('should define flashIntensity per weapon in WEAPON_DEFS', () => {
    var defs = GAME.WeaponSystem.WEAPON_DEFS || GAME.WEAPON_DEFS;
    expect(defs.rifle.flashIntensity).toBeGreaterThan(0);
    expect(defs.awp.flashIntensity).toBeGreaterThan(defs.pistol.flashIntensity);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `flashColor` and `flashIntensity` not in WEAPON_DEFS.

**Step 3: Implement per-weapon muzzle flash**

Add to each weapon in WEAPON_DEFS:

```js
pistol:  { ..., flashColor: 0xffaa33, flashIntensity: 2.5 },
smg:     { ..., flashColor: 0xffbb44, flashIntensity: 3.0 },
rifle:   { ..., flashColor: 0xff8822, flashIntensity: 4.0 },
shotgun: { ..., flashColor: 0xffcc55, flashIntensity: 5.0 },
awp:     { ..., flashColor: 0xffeedd, flashIntensity: 6.0 },
knife:   { ..., flashColor: 0, flashIntensity: 0 },
```

In `_showMuzzleFlash()`, replace the hardcoded color/intensity:

```js
var def = WEAPON_DEFS[this.current];
fl.color.setHex(def.flashColor || 0xffaa00);
fl.intensity = def.flashIntensity || 4;
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

**Step 5: Update REQUIREMENTS.md**

Add per-weapon flash color and intensity values.

**Step 6: Commit**

```
git add js/weapons.js tests/unit/weapons.test.js REQUIREMENTS.md
git commit -m "Add per-weapon muzzle flash color and intensity"
```

---

## Task 4: Enhanced Visual Recoil (1d)

Add weapon model kick-back, bolt/slide animation, and burst drift to the weapon model.

**Files:**
- Modify: `js/weapons.js` — `tryFire` (lines ~1530-1574), update (lines ~2019-2022)
- Test: `tests/unit/weapons.test.js`

**Step 1: Write the failing tests**

```js
describe('Enhanced visual recoil', () => {
  it('should kick weapon model back on fire', () => {
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera();
    var ws = new GAME.WeaponSystem(scene, camera);
    ws.equip('rifle');
    var restZ = ws.weaponModel.position.z;
    // Simulate fire by applying recoil kick
    ws._applyVisualRecoil();
    expect(ws.weaponModel.position.z).toBeGreaterThan(restZ);
  });

  it('should accumulate burst drift over sustained fire', () => {
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera();
    var ws = new GAME.WeaponSystem(scene, camera);
    ws.equip('rifle');
    ws._burstDriftY = 0;
    ws._applyVisualRecoil();
    ws._applyVisualRecoil();
    ws._applyVisualRecoil();
    expect(ws._burstDriftY).toBeGreaterThan(0);
  });

  it('should recover burst drift over time', () => {
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera();
    var ws = new GAME.WeaponSystem(scene, camera);
    ws.equip('rifle');
    ws._burstDriftY = 0.05;
    ws.update(0.1, 0, 0);
    expect(ws._burstDriftY).toBeLessThan(0.05);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `_applyVisualRecoil`, `_burstDriftY` don't exist.

**Step 3: Implement enhanced visual recoil**

In the constructor, add:

```js
this._burstDriftY = 0;
this._burstDriftX = 0;
this._visualRecoilZ = 0;
this._visualRecoilRotX = 0;
this._lastFireTimeVisual = 0;
this._consecutiveShots = 0;
```

Add the `_applyVisualRecoil` method:

```js
WeaponSystem.prototype._applyVisualRecoil = function() {
    var def = WEAPON_DEFS[this.current];
    if (def.isKnife) return;

    // Kick-back: snap Z forward (toward player) and rotate upward
    var kickZ = def.isAwp ? 0.08 : (def.isShotgun ? 0.07 : 0.05);
    var kickRotX = def.isAwp ? -0.09 : (def.isShotgun ? -0.08 : -0.05);
    this.weaponModel.position.z += kickZ;
    this.weaponModel.rotation.x += kickRotX;

    // Track consecutive shots for burst drift
    var now = performance.now() / 1000;
    if (now - this._lastFireTimeVisual < 0.3) {
        this._consecutiveShots++;
    } else {
        this._consecutiveShots = 1;
    }
    this._lastFireTimeVisual = now;

    // Burst drift accumulates
    this._burstDriftY += 0.004 * this._consecutiveShots;
    this._burstDriftX += (Math.random() - 0.5) * 0.003 * this._consecutiveShots;
};
```

In `tryFire()`, replace the existing view model kick lines with a call to `_applyVisualRecoil()`:

```js
// Replace:
//   this.weaponModel.position.z += recoilZ;
//   this.weaponModel.rotation.x += recoilX;
// With:
this._applyVisualRecoil();
```

In the `update()` recoil recovery block (lines ~2021-2022), add burst drift recovery:

```js
// Burst drift recovery
this._burstDriftY += (0 - this._burstDriftY) * 4 * dt;
this._burstDriftX += (0 - this._burstDriftX) * 4 * dt;

// Apply burst drift to weapon position
this.weaponModel.position.y += this._burstDriftY;
this.weaponModel.position.x += this._burstDriftX;
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

**Step 5: Update REQUIREMENTS.md**

Add "Enhanced Visual Recoil" section.

**Step 6: Commit**

```
git add js/weapons.js tests/unit/weapons.test.js REQUIREMENTS.md
git commit -m "Add enhanced visual recoil with model kick-back and burst drift"
```

---

## Task 5: Surface-Dependent Footsteps (2a)

Detect floor material via downward raycast and play matching footstep sounds.

**Files:**
- Modify: `js/player.js` — footstep block (lines ~280-298)
- Modify: `js/sound.js` — add surface-specific footstep functions
- Modify: `js/enemies.js` — bot footstep block (lines ~1264-1281)
- Test: `tests/unit/player.test.js`, `tests/unit/sound.test.js`

**Step 1: Write the failing tests**

In `tests/unit/player.test.js`:

```js
describe('Surface-dependent footsteps', () => {
  it('should detect floor surface type from material', () => {
    var player = new GAME.Player(new THREE.PerspectiveCamera(), []);
    // _detectSurface should exist
    expect(typeof player._detectSurface).toBe('function');
  });

  it('should return concrete for default surfaces', () => {
    var player = new GAME.Player(new THREE.PerspectiveCamera(), []);
    expect(player._detectSurface()).toBe('concrete');
  });
});
```

In `tests/unit/sound.test.js`:

```js
describe('Surface footstep sounds', () => {
  it('should have footstepMetal function', () => {
    expect(typeof GAME.Sound.footstepMetal).toBe('function');
  });
  it('should have footstepWood function', () => {
    expect(typeof GAME.Sound.footstepWood).toBe('function');
  });
  it('should have footstepSand function', () => {
    expect(typeof GAME.Sound.footstepSand).toBe('function');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL.

**Step 3: Implement surface detection in player.js**

Add a `_detectSurface` method that raycasts downward and checks material:

```js
Player.prototype._detectSurface = function() {
    this._surfaceRc.set(this.position, new THREE.Vector3(0, -1, 0));
    this._surfaceRc.far = 3;
    var hits = this._surfaceRc.intersectObjects(this.walls, false);
    if (hits.length === 0) return 'concrete';
    var mat = hits[0].object.material;
    if (!mat) return 'concrete';
    // Check material name or reference for surface type
    var name = mat._surfaceType || '';
    if (name) return name;
    // Heuristic: check metalness and roughness
    if (mat.metalness > 0.5) return 'metal';
    if (mat.roughness > 0.9 && mat.color) {
        var c = mat.color;
        if (c.r > 0.6 && c.g > 0.5 && c.b < 0.4) return 'sand';
    }
    if (mat.roughness < 0.8) return 'wood';
    return 'concrete';
};
```

In the constructor, add: `this._surfaceRc = new THREE.Raycaster();`

Modify the footstep trigger block to use surface type:

```js
if (this._footstepTimer >= this._footstepInterval) {
    this._footstepTimer = 0;
    if (GAME.Sound) {
        var surface = this._detectSurface();
        if (isSprinting) {
            GAME.Sound.footstepSprint(surface);
        } else if (isCrouching) {
            GAME.Sound.footstepCrouch(surface);
        } else {
            GAME.Sound.footstepWalk(surface);
        }
    }
    // ... existing reportPlayerSound ...
}
```

**Step 4: Implement surface footstep sounds in sound.js**

Add surface-specific sound functions and modify existing footstep functions to accept a surface parameter:

```js
footstepMetal: function() {
    metallicClick(1200, 0.1);
    noiseBurst({ freq: 3000, duration: 0.03, gain: 0.05, filterType: 'highpass' });
},
footstepWood: function() {
    noiseBurst({ freq: 350, duration: 0.06, gain: 0.1, filterType: 'lowpass' });
    noiseBurst({ freq: 1800, duration: 0.02, gain: 0.03, filterType: 'bandpass', delay: 0.01 });
},
footstepSand: function() {
    noiseBurst({ freq: 300, duration: 0.08, gain: 0.06, filterType: 'lowpass' });
},
```

Update `footstepWalk`, `footstepSprint`, `footstepCrouch` to accept a `surface` parameter and dispatch:

```js
footstepWalk: function(surface) {
    if (surface === 'metal') { this.footstepMetal(); return; }
    if (surface === 'wood') { this.footstepWood(); return; }
    if (surface === 'sand') { this.footstepSand(); return; }
    noiseBurst({ freq: 500, duration: 0.05, gain: 0.08, filterType: 'bandpass' });
},
```

Similarly for sprint (louder versions) and crouch (quieter versions).

**Step 5: Update bot footsteps in enemies.js**

Modify bot footstep to also detect surface. Since bots don't have wall references, add a simple surface parameter to `botFootstep`:

```js
botFootstep: function(x, y, z, surface) {
    var panner = this._createPanner(x, y, z);
    panner.connect(masterGain);
    var freq = surface === 'metal' ? 1200 : (surface === 'wood' ? 350 : (surface === 'sand' ? 300 : 400));
    noiseBurst({ freq: freq, duration: 0.04, gain: 0.05, filterType: 'bandpass', destination: panner });
},
```

**Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

**Step 7: Update REQUIREMENTS.md**

Add "Surface-Dependent Footsteps" section.

**Step 8: Commit**

```
git add js/player.js js/sound.js js/enemies.js tests/unit/player.test.js tests/unit/sound.test.js REQUIREMENTS.md
git commit -m "Add surface-dependent footsteps for player and bots"
```

---

## Task 6: Weapon Pendulum Swing (2b)

Add inertia-based pendulum swing to weapon model when changing movement direction.

**Files:**
- Modify: `js/weapons.js` — update method
- Test: `tests/unit/weapons.test.js`

**Step 1: Write the failing tests**

```js
describe('Weapon pendulum swing', () => {
  it('should track velocity for pendulum calculation', () => {
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera();
    var ws = new GAME.WeaponSystem(scene, camera);
    ws.equip('rifle');
    expect(ws._pendulumVelX).toBeDefined();
    expect(ws._pendulumVelZ).toBeDefined();
  });

  it('should swing when velocity changes', () => {
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera();
    var ws = new GAME.WeaponSystem(scene, camera);
    ws.equip('rifle');
    ws.setVelocity(5, 0); // moving right
    ws.update(0.016, 0, 0);
    ws.setVelocity(-5, 0); // sudden direction change
    ws.update(0.016, 0, 0);
    expect(Math.abs(ws._pendulumSwing)).toBeGreaterThan(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL.

**Step 3: Implement pendulum swing**

In constructor:

```js
this._pendulumVelX = 0;
this._pendulumVelZ = 0;
this._pendulumSwing = 0;
this._pendulumVel = 0;
```

Add setter:

```js
WeaponSystem.prototype.setVelocity = function(vx, vz) {
    this._pendulumVelX = vx;
    this._pendulumVelZ = vz;
};
```

In `update()`, add pendulum physics:

```js
// Pendulum: weapon swings based on acceleration (velocity change)
var accelX = this._pendulumVelX - (this._prevVelX || 0);
this._prevVelX = this._pendulumVelX;
this._pendulumVel += accelX * 0.003; // acceleration drives swing
this._pendulumVel *= 0.92; // damping
this._pendulumSwing += this._pendulumVel;
this._pendulumSwing *= 0.95; // return to center

this.weaponModel.position.x += this._pendulumSwing;
```

In `js/player.js` update, call `setVelocity` after velocity smoothing:

```js
if (GAME._weapons) GAME._weapons.setVelocity(this._smoothVelX, this._smoothVelZ);
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

**Step 5: Update REQUIREMENTS.md**

**Step 6: Commit**

```
git add js/weapons.js js/player.js tests/unit/weapons.test.js REQUIREMENTS.md
git commit -m "Add weapon pendulum swing on direction changes"
```

---

## Task 7: Footstep Dust Particles (2c)

Spawn small dust puffs at player feet on sand/dirt surfaces.

**Files:**
- Modify: `js/main.js` — add footstep dust spawner near impact dust system
- Modify: `js/player.js` — emit event on footstep
- Test: `tests/unit/main.test.js`

**Step 1: Write the failing tests**

```js
describe('Footstep dust particles', () => {
  it('should have spawnFootstepDust function on GAME', () => {
    expect(typeof GAME.spawnFootstepDust).toBe('function');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL.

**Step 3: Implement footstep dust in main.js**

Add a pooled particle system similar to `spawnImpactDust`:

```js
var footDustPool = [];
var FOOT_DUST_MAX = 12;
// Initialize pool of small cube meshes

GAME.spawnFootstepDust = function(position) {
    // Spawn 2-3 tiny tan cubes at position, slight upward velocity, fade over 0.4s
    for (var i = 0; i < 3; i++) {
        var p = footDustPool[footDustIdx];
        footDustIdx = (footDustIdx + 1) % FOOT_DUST_MAX;
        p.position.set(
            position.x + (Math.random() - 0.5) * 0.3,
            position.y + 0.05,
            position.z + (Math.random() - 0.5) * 0.3
        );
        p.velocity.set((Math.random() - 0.5) * 0.5, 0.5 + Math.random() * 0.3, (Math.random() - 0.5) * 0.5);
        p.life = 0;
        p.maxLife = 0.4;
        p.visible = true;
    }
};
```

In `js/player.js`, trigger dust on footstep if surface is sand:

```js
if (surface === 'sand' && GAME.spawnFootstepDust) {
    GAME.spawnFootstepDust(this.position);
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

**Step 5: Update REQUIREMENTS.md**

**Step 6: Commit**

```
git add js/main.js js/player.js tests/unit/main.test.js REQUIREMENTS.md
git commit -m "Add footstep dust particles on sand surfaces"
```

---

## Task 8: Directional Damage Indicator (3a)

Show red arc on screen pointing toward damage source.

**Files:**
- Modify: `index.html` — add damage indicator container div
- Modify: `js/main.js` — create/update damage indicator arcs
- Test: `tests/unit/main.test.js`

**Step 1: Write the failing tests**

```js
describe('Directional damage indicator', () => {
  it('should have showDamageIndicator function on GAME', () => {
    expect(typeof GAME.showDamageIndicator).toBe('function');
  });

  it('should calculate angle from player to attacker', () => {
    // showDamageIndicator should accept attacker position
    GAME.showDamageIndicator({ x: 10, y: 0, z: 0 });
    var container = document.getElementById('damage-indicators');
    expect(container).toBeTruthy();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL.

**Step 3: Add HTML elements in index.html**

Inside the HUD container, add:

```html
<div id="damage-indicators"></div>
```

Add CSS:

```css
#damage-indicators {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 50;
}
.damage-arc {
    position: absolute; top: 50%; left: 50%;
    width: 80px; height: 120px;
    margin-left: -40px; margin-top: -180px;
    background: radial-gradient(ellipse at center bottom, rgba(255,0,0,0.7) 0%, transparent 70%);
    transform-origin: center 220px;
    opacity: 1;
    transition: opacity 0.3s;
}
```

**Step 4: Implement damage indicator in main.js**

```js
var damageIndicators = [];

GAME.showDamageIndicator = function(attackerPos) {
    if (!player || !player.alive) return;
    // Calculate angle from player facing to attacker
    var dx = attackerPos.x - player.position.x;
    var dz = attackerPos.z - player.position.z;
    var angleToAttacker = Math.atan2(dx, -dz);
    var relativeAngle = angleToAttacker - player.yaw;
    // Normalize to -PI..PI
    while (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
    while (relativeAngle < -Math.PI) relativeAngle += Math.PI * 2;

    var arc = document.createElement('div');
    arc.className = 'damage-arc';
    arc.style.transform = 'rotate(' + (relativeAngle * 180 / Math.PI) + 'deg)';
    dom.damageIndicators.appendChild(arc);
    damageIndicators.push({ el: arc, timer: 1.0 });
};

// In game loop, update indicators:
function updateDamageIndicators(dt) {
    for (var i = damageIndicators.length - 1; i >= 0; i--) {
        var ind = damageIndicators[i];
        ind.timer -= dt;
        ind.el.style.opacity = Math.max(0, ind.timer);
        if (ind.timer <= 0) {
            ind.el.remove();
            damageIndicators.splice(i, 1);
        }
    }
}
```

Call `GAME.showDamageIndicator` from the enemy damage handler. In `enemies.js`, modify the `update` return to include attacker position, or in `main.js` where damage is applied, pass the nearest enemy position.

**Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

**Step 6: Update REQUIREMENTS.md**

**Step 7: Commit**

```
git add index.html js/main.js js/enemies.js tests/unit/main.test.js REQUIREMENTS.md
git commit -m "Add directional damage indicator with red arc overlay"
```

---

## Task 9: Screen Blood Splatter (3b)

Show blood splotches on screen edges when taking high damage.

**Files:**
- Modify: `index.html` — add blood splatter overlay
- Modify: `js/main.js` — trigger splatter on high damage
- Test: `tests/unit/main.test.js`

**Step 1: Write the failing tests**

```js
describe('Screen blood splatter', () => {
  it('should have triggerBloodSplatter function on GAME', () => {
    expect(typeof GAME.triggerBloodSplatter).toBe('function');
  });

  it('should scale opacity with damage amount', () => {
    GAME.triggerBloodSplatter(50);
    var overlay = document.getElementById('blood-splatter');
    expect(overlay).toBeTruthy();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL.

**Step 3: Add HTML/CSS in index.html**

```html
<div id="blood-splatter"></div>
```

CSS:

```css
#blood-splatter {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 49; opacity: 0;
    background: radial-gradient(ellipse at 15% 20%, rgba(139,0,0,0.6) 0%, transparent 40%),
                radial-gradient(ellipse at 85% 30%, rgba(120,0,0,0.5) 0%, transparent 35%),
                radial-gradient(ellipse at 20% 80%, rgba(100,0,0,0.4) 0%, transparent 30%),
                radial-gradient(ellipse at 80% 75%, rgba(130,0,0,0.5) 0%, transparent 35%);
    transition: opacity 0.1s;
}
```

**Step 4: Implement blood splatter in main.js**

```js
var bloodSplatterTimer = 0;

GAME.triggerBloodSplatter = function(damage) {
    if (damage < 30) return;
    var intensity = Math.min(1, damage / 80);
    dom.bloodSplatter.style.opacity = intensity * 0.8;
    bloodSplatterTimer = 2.0;
};
```

In the game loop, fade the splatter:

```js
if (bloodSplatterTimer > 0) {
    bloodSplatterTimer -= dt;
    if (bloodSplatterTimer < 1.0) {
        dom.bloodSplatter.style.opacity = bloodSplatterTimer * 0.8;
    }
    if (bloodSplatterTimer <= 0) {
        dom.bloodSplatter.style.opacity = 0;
    }
}
```

Call `GAME.triggerBloodSplatter(dmg)` in the damage handler (lines ~3664-3671):

```js
if (dmg > 0 && player.alive) {
    // ... existing code ...
    if (GAME.triggerBloodSplatter) GAME.triggerBloodSplatter(dmg);
}
```

**Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

**Step 6: Update REQUIREMENTS.md**

**Step 7: Commit**

```
git add index.html js/main.js tests/unit/main.test.js REQUIREMENTS.md
git commit -m "Add screen blood splatter overlay on high damage"
```

---

## Task 10: Improved Death Sequence (3c)

Add color desaturation, audio fade, and weapon drop to the death sequence.

**Files:**
- Modify: `js/player.js` — `updateDeath` (lines ~360-389)
- Modify: `js/main.js` — death overlay, canvas filter
- Modify: `js/sound.js` — add `fadeToMuffled()`, `restoreAudio()`
- Modify: `index.html` — death overlay element
- Test: `tests/unit/player.test.js`, `tests/unit/sound.test.js`

**Step 1: Write the failing tests**

```js
// player.test.js
describe('Improved death sequence', () => {
  it('should track death desaturation progress', () => {
    var player = new GAME.Player(new THREE.PerspectiveCamera(), []);
    player.alive = false;
    player.updateDeath(0.1);
    expect(player._deathDesaturation).toBeGreaterThan(0);
  });
});

// sound.test.js
describe('Death audio fade', () => {
  it('should have fadeToMuffled function', () => {
    expect(typeof GAME.Sound.fadeToMuffled).toBe('function');
  });
  it('should have restoreAudio function', () => {
    expect(typeof GAME.Sound.restoreAudio).toBe('function');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL.

**Step 3: Implement death desaturation in player.js**

In constructor, add: `this._deathDesaturation = 0;`

In `updateDeath()`:

```js
// Desaturation: ramp 0→1 over death fall
this._deathDesaturation = Math.min(1, this._deathTime * 2); // full gray in 0.5s

// Trigger audio fade on first death frame
if (this._deathTime < dt * 2) {
    if (GAME.Sound && GAME.Sound.fadeToMuffled) GAME.Sound.fadeToMuffled();
}
```

**Step 4: Implement audio fade in sound.js**

```js
fadeToMuffled: function() {
    var c = ensureCtx();
    if (!this._deathFilter) {
        this._deathFilter = c.createBiquadFilter();
        this._deathFilter.type = 'lowpass';
        this._deathFilter.frequency.value = 20000;
    }
    // Insert filter before compressor
    masterGain.disconnect();
    masterGain.connect(this._deathFilter);
    this._deathFilter.connect(compressor);
    // Ramp down
    this._deathFilter.frequency.linearRampToValueAtTime(400, c.currentTime + 0.8);
    masterGain.gain.linearRampToValueAtTime(0.15, c.currentTime + 1.0);
},
restoreAudio: function() {
    var c = ensureCtx();
    if (this._deathFilter) {
        this._deathFilter.frequency.linearRampToValueAtTime(20000, c.currentTime + 0.3);
    }
    masterGain.gain.linearRampToValueAtTime(0.5, c.currentTime + 0.3);
    // Reconnect after fade
    setTimeout(function() {
        masterGain.disconnect();
        masterGain.connect(compressor);
    }, 400);
},
```

**Step 5: Apply desaturation in main.js**

In the game loop where `player.updateDeath(dt)` is called:

```js
if (!player.alive) {
    player.updateDeath(dt);
    var sat = 1 - player._deathDesaturation;
    renderer.domElement.style.filter = 'saturate(' + sat + ') contrast(' + (1.05 - player._deathDesaturation * 0.2) + ')';
}
```

On respawn/round start, reset: `renderer.domElement.style.filter = 'contrast(1.05) saturate(1.1)';`

Call `GAME.Sound.restoreAudio()` on respawn.

**Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

**Step 7: Update REQUIREMENTS.md**

**Step 8: Commit**

```
git add js/player.js js/main.js js/sound.js index.html tests/unit/player.test.js tests/unit/sound.test.js REQUIREMENTS.md
git commit -m "Add improved death sequence with desaturation and audio fade"
```

---

## Task 11: Kill Confirmation Enhancement (3d)

Add a distinct kill chime and micro slow-motion on kills.

**Files:**
- Modify: `js/sound.js` — add `killConfirm()` sound
- Modify: `js/main.js` — trigger on kill, apply time scale
- Test: `tests/unit/sound.test.js`, `tests/unit/main.test.js`

**Step 1: Write the failing tests**

```js
// sound.test.js
describe('Kill confirmation sound', () => {
  it('should have killConfirm function', () => {
    expect(typeof GAME.Sound.killConfirm).toBe('function');
  });
});

// main.test.js
describe('Kill micro slow-motion', () => {
  it('should have GAME.killSlowMo state', () => {
    expect(GAME.killSlowMo).toBeDefined();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL.

**Step 3: Implement kill confirm sound**

```js
killConfirm: function() {
    var c = ensureCtx();
    var t = c.currentTime;
    // Satisfying two-tone chime: lower and longer than hitmarker
    var o1 = c.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = 880;
    var g1 = c.createGain();
    g1.gain.setValueAtTime(0.15, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o1.connect(g1); g1.connect(masterGain);
    o1.start(t); o1.stop(t + 0.25);

    var o2 = c.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 1320;
    var g2 = c.createGain();
    g2.gain.setValueAtTime(0.1, t + 0.05);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o2.connect(g2); g2.connect(masterGain);
    o2.start(t + 0.05); o2.stop(t + 0.3);
},
```

**Step 4: Implement micro slow-mo in main.js**

```js
GAME.killSlowMo = { active: false, timer: 0, scale: 1.0 };

function triggerKillSlowMo() {
    // Only if no rapid kills (>2 kills in last second)
    if (killStreakTimer > 0 && killStreakCount >= 2) return;
    GAME.killSlowMo.active = true;
    GAME.killSlowMo.timer = 0.05; // 50ms
    GAME.killSlowMo.scale = 0.7;
}
```

In the game loop dt calculation:

```js
if (GAME.killSlowMo.active) {
    dt *= GAME.killSlowMo.scale;
    GAME.killSlowMo.timer -= realDt;
    if (GAME.killSlowMo.timer <= 0) {
        GAME.killSlowMo.active = false;
        GAME.killSlowMo.scale = 1.0;
    }
}
```

In the kill handler (where kill feed entries are added), add:

```js
if (GAME.Sound && GAME.Sound.killConfirm) GAME.Sound.killConfirm();
triggerKillSlowMo();
```

**Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

**Step 6: Update REQUIREMENTS.md**

**Step 7: Commit**

```
git add js/sound.js js/main.js tests/unit/sound.test.js tests/unit/main.test.js REQUIREMENTS.md
git commit -m "Add kill confirmation chime and micro slow-motion"
```

---

## Task 12: Environment Reverb (4a)

Add per-map reverb via ConvolverNode with procedurally generated impulse responses.

**Files:**
- Modify: `js/sound.js` — reverb system, impulse response generation, per-map config
- Modify: `js/main.js` — initialize reverb on map load
- Test: `tests/unit/sound.test.js`

**Step 1: Write the failing tests**

```js
describe('Environment reverb', () => {
  it('should have initReverb function', () => {
    expect(typeof GAME.Sound.initReverb).toBe('function');
  });

  it('should accept map name parameter', () => {
    // Should not throw
    GAME.Sound.initReverb('dust');
  });

  it('should have different decay times per map type', () => {
    expect(typeof GAME.Sound._getReverbConfig).toBe('function');
    var dustConfig = GAME.Sound._getReverbConfig('dust');
    var officeConfig = GAME.Sound._getReverbConfig('office');
    expect(dustConfig.decay).toBeLessThan(officeConfig.decay);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL.

**Step 3: Implement reverb system**

```js
_getReverbConfig: function(mapName) {
    var configs = {
        dust:       { decay: 0.25, wet: 0.15 },  // outdoor, dry
        bloodstrike:{ decay: 0.3,  wet: 0.15 },  // outdoor arena
        italy:      { decay: 0.5,  wet: 0.25 },  // narrow streets
        office:     { decay: 1.0,  wet: 0.35 },  // indoor rooms
        warehouse:  { decay: 1.2,  wet: 0.4  },  // large indoor
        aztec:      { decay: 1.5,  wet: 0.45 },  // enclosed temple
    };
    return configs[mapName] || configs.dust;
},

_generateImpulse: function(decay, sampleRate) {
    var length = Math.floor(sampleRate * decay);
    var buffer = ctx.createBuffer(2, length, sampleRate);
    for (var ch = 0; ch < 2; ch++) {
        var data = buffer.getChannelData(ch);
        for (var i = 0; i < length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * i / length);
        }
    }
    return buffer;
},

initReverb: function(mapName) {
    var c = ensureCtx();
    var config = this._getReverbConfig(mapName);

    if (this._reverbNode) {
        this._reverbNode.disconnect();
        this._reverbWet.disconnect();
    }

    this._reverbNode = c.createConvolver();
    this._reverbNode.buffer = this._generateImpulse(config.decay, c.sampleRate);

    this._reverbWet = c.createGain();
    this._reverbWet.gain.value = config.wet;

    // Parallel wet path: masterGain → convolver → wetGain → compressor
    masterGain.connect(this._reverbNode);
    this._reverbNode.connect(this._reverbWet);
    this._reverbWet.connect(compressor);
    // Dry path remains: masterGain → compressor (already connected)
},
```

In `js/main.js`, call `GAME.Sound.initReverb(mapName)` when a map is loaded (in the map initialization function, after `startAmbient`).

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

**Step 5: Update REQUIREMENTS.md**

**Step 6: Commit**

```
git add js/sound.js js/main.js tests/unit/sound.test.js REQUIREMENTS.md
git commit -m "Add per-map environment reverb with procedural impulse responses"
```

---

## Task 13: Distant Gunfire Echo (4b)

Enemy shots from far away get a delayed, filtered echo.

**Files:**
- Modify: `js/sound.js` — enhance `enemyShotSpatial` with distance-based echo
- Test: `tests/unit/sound.test.js`

**Step 1: Write the failing tests**

```js
describe('Distant gunfire echo', () => {
  it('should have enemyShotWithEcho function or enhanced enemyShotSpatial', () => {
    // enemyShotSpatial should accept distance or player position for echo calculation
    expect(typeof GAME.Sound.enemyShotSpatial).toBe('function');
  });

  it('should have _createDistantEcho helper', () => {
    expect(typeof GAME.Sound._createDistantEcho).toBe('function');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `_createDistantEcho` doesn't exist.

**Step 3: Implement distant echo**

Add a `_createDistantEcho` helper:

```js
_createDistantEcho: function(x, y, z, distance) {
    if (distance < 30) return; // no echo for close shots
    var c = ensureCtx();
    var t = c.currentTime;
    var delay = Math.min(0.4, distance / 343); // speed of sound, capped
    var echoGain = Math.max(0.02, 0.15 - distance * 0.002);

    var panner = this._createPanner(x, y, z);
    panner.connect(masterGain);

    // Delayed, filtered noise burst = echo
    var delayNode = c.createDelay(0.5);
    delayNode.delayTime.value = delay;

    var filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800; // muffled

    noiseBurst({
        freq: 400, duration: 0.12, gain: echoGain,
        filterType: 'lowpass', filterFreq: 1800,
        delay: delay,
        destination: panner
    });
},
```

Modify `enemyShotSpatial` to also trigger the echo:

```js
enemyShotSpatial: function(x, y, z, playerPos) {
    // Existing spatial shot code...
    var panner = this._createPanner(x, y, z);
    panner.connect(masterGain);
    // ... existing shot layers through panner ...

    // Add distant echo if player position provided
    if (playerPos) {
        var dx = x - playerPos.x;
        var dy = y - playerPos.y;
        var dz = z - playerPos.z;
        var dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        this._createDistantEcho(x, y, z, dist);
    }
},
```

Update callers in `enemies.js` to pass player position:

```js
GAME.Sound.enemyShotSpatial(pos.x, pos.y + 1.5, pos.z, playerPos);
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

**Step 5: Update REQUIREMENTS.md**

**Step 6: Commit**

```
git add js/sound.js js/enemies.js tests/unit/sound.test.js REQUIREMENTS.md
git commit -m "Add distant gunfire echo with filtered delay"
```

---

## Task 14: Surface-Aware Bullet Impact Sounds (4c)

Different impact sounds when bullets hit different surfaces.

**Files:**
- Modify: `js/sound.js` — add `impactConcrete()`, `impactMetal()`, `impactWood()`
- Modify: `js/weapons.js` — detect surface material at impact point, call matching sound
- Test: `tests/unit/sound.test.js`

**Step 1: Write the failing tests**

```js
describe('Surface impact sounds', () => {
  it('should have impactConcrete function', () => {
    expect(typeof GAME.Sound.impactConcrete).toBe('function');
  });
  it('should have impactMetal function', () => {
    expect(typeof GAME.Sound.impactMetal).toBe('function');
  });
  it('should have impactWood function', () => {
    expect(typeof GAME.Sound.impactWood).toBe('function');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL.

**Step 3: Implement impact sounds**

```js
impactConcrete: function(x, y, z) {
    var panner = this._createPanner(x, y, z);
    panner.connect(masterGain);
    // Sharp crack
    noiseBurst({ freq: 2000, duration: 0.03, gain: 0.08, filterType: 'highpass', destination: panner });
    noiseBurst({ freq: 500, duration: 0.02, gain: 0.05, filterType: 'bandpass', destination: panner });
},
impactMetal: function(x, y, z) {
    var panner = this._createPanner(x, y, z);
    panner.connect(masterGain);
    // Ringing ping
    var c = ensureCtx();
    var t = c.currentTime;
    var o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = 3200 + Math.random() * 800;
    var g = c.createGain();
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g); g.connect(panner);
    o.start(t); o.stop(t + 0.2);
    noiseBurst({ freq: 4000, duration: 0.02, gain: 0.06, filterType: 'highpass', destination: panner });
},
impactWood: function(x, y, z) {
    var panner = this._createPanner(x, y, z);
    panner.connect(masterGain);
    // Dull thud + splinter
    noiseBurst({ freq: 300, duration: 0.05, gain: 0.1, filterType: 'lowpass', destination: panner });
    noiseBurst({ freq: 2500, duration: 0.02, gain: 0.04, filterType: 'bandpass', delay: 0.01, destination: panner });
},
```

**Step 4: Hook into weapons.js impact handling**

In the wall hit block (lines ~1683-1703), detect surface and play matching sound:

```js
// After spawning bullet hole and dust
if (GAME.Sound) {
    var surfaceType = 'concrete';
    if (hit.object.material) {
        if (hit.object.material.metalness > 0.5) surfaceType = 'metal';
        else if (hit.object.material.roughness < 0.8) surfaceType = 'wood';
    }
    var hp = hit.point;
    if (surfaceType === 'metal' && GAME.Sound.impactMetal) {
        GAME.Sound.impactMetal(hp.x, hp.y, hp.z);
    } else if (surfaceType === 'wood' && GAME.Sound.impactWood) {
        GAME.Sound.impactWood(hp.x, hp.y, hp.z);
    } else if (GAME.Sound.impactConcrete) {
        GAME.Sound.impactConcrete(hp.x, hp.y, hp.z);
    }
}
```

**Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

**Step 6: Update REQUIREMENTS.md**

**Step 7: Commit**

```
git add js/sound.js js/weapons.js tests/unit/sound.test.js REQUIREMENTS.md
git commit -m "Add surface-aware bullet impact sounds"
```

---

## Task 15: Final Integration Test & Polish

Run the full game, verify all 14 features work together, fix any issues.

**Files:**
- All modified files
- Test: All test files

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests PASS.

**Step 2: Manual play-test checklist**

Open `index.html` in browser and verify:
- [ ] Weapon sway follows mouse movement and bobs during walk/sprint
- [ ] Sprint tilts the gun to the side
- [ ] Reload shows multi-phase animation with magazine drop
- [ ] Muzzle flash color/intensity varies per weapon
- [ ] Visual recoil kicks gun model back, burst drift accumulates
- [ ] Footsteps sound different on metal/wood/sand surfaces
- [ ] Weapon swings with pendulum inertia on direction change
- [ ] Dust puffs at feet on sand maps
- [ ] Red damage indicator arc points toward attacker
- [ ] Blood splatter on screen for high damage
- [ ] Death: desaturation, audio muffles, weapon drops
- [ ] Kill chime plays, brief slow-mo on kill
- [ ] Reverb differs between indoor/outdoor maps
- [ ] Distant shots have filtered echo

**Step 3: Fix any issues found**

**Step 4: Final commit**

```
git add -A
git commit -m "Polish and fix integration issues for Immersion Pass II"
```
