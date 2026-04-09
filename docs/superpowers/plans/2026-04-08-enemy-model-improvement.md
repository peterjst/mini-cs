# Enemy & Boss Model Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace remaining blocky BoxGeometry parts on enemies/boss with organic shapes, improve head shape, smooth shoulder-arm connection, and add procedural walk/idle animation.

**Architecture:** All changes are in `js/enemies.js` (geometry cache, `_buildModel`, `_buildBossModel`, `Enemy` constructor, `update` method). Tests in `tests/unit/enemies.test.js`. The enemy model is built from shared geometry and material caches, assembled in `_buildModel` (regular) and `_buildBossModel` (boss). Animation state is per-enemy, applied each frame in `update()`.

**Tech Stack:** Three.js r160.1 (global `THREE`), Vitest

---

## File Structure

| File | Changes |
|------|---------|
| `js/enemies.js` | Modify geometry cache, `_buildModel`, `_buildBossModel`, `Enemy` constructor, `update` method |
| `tests/unit/enemies.test.js` | Add tests for new animation properties and leg groups |
| `REQUIREMENTS.md` | Update enemy/boss model descriptions |

---

### Task 1: Replace Head Geometry — Stretched Sphere

**Files:**
- Modify: `js/enemies.js:438` (head in `_geoCache`)
- Modify: `js/enemies.js:692-727` (head placement in `_buildModel`)
- Modify: `js/enemies.js:2917-2919` (head in `_buildBossModel`)

- [ ] **Step 1: Write failing test — head should be a sphere with scale applied**

Add to `tests/unit/enemies.test.js`:

```js
describe('Enemy model geometry improvements', () => {
  var scene, em, enemy;
  beforeAll(() => {
    scene = new THREE.Scene();
    em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    enemy = em.enemies[0];
  });

  it('head mesh should have non-uniform scale (egg shape)', () => {
    // Find the head mesh — it's a sphere with skin material at y~2.12
    var headFound = false;
    enemy.mesh.children.forEach(child => {
      if (child.position && Math.abs(child.position.y - 2.12) < 0.1 &&
          child.geometry && child.geometry.type === 'SphereGeometry' &&
          child.scale && child.scale.y > 1.1) {
        headFound = true;
        expect(child.scale.y).toBeCloseTo(1.2, 1);
        expect(child.scale.z).toBeCloseTo(0.95, 1);
      }
    });
    expect(headFound).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: FAIL — head scale is uniform (1,1,1)

- [ ] **Step 3: Update geometry cache — replace head SphereGeometry**

In `js/enemies.js`, in `_ensureGeoCache()`, change the head geometry (line ~438):

```js
      // Head — stretched sphere (egg shape, taller than wide)
      head: new THREE.SphereGeometry(0.24, 14, 12),
```

Note: The scale `(1.0, 1.2, 0.95)` will be applied in `_buildModel` and `_buildBossModel`.

- [ ] **Step 4: Update `_buildModel` — apply head scale and reposition face parts**

In `_buildModel` (line ~692), replace the head placement and face detail section:

```js
    // ── Head — stretched sphere at 2.12 ─────────────────
    var head = shadow(new THREE.Mesh(G.head, pal.skin));
    head.position.y = 2.12;
    head.scale.set(1.0, 1.2, 0.95);
    m.add(head);

    // ── Face details ────────────────────────────────────
    var brow = new THREE.Mesh(G.brow, pal.skin);
    brow.position.set(0, 2.22, -0.22);
    m.add(brow);
    var nose = new THREE.Mesh(G.nose, pal.skin);
    nose.position.set(0, 2.08, -0.24);
    nose.rotation.x = -0.3;
    m.add(nose);
    var jaw = new THREE.Mesh(G.jaw, pal.skin);
    jaw.position.set(0, 1.98, -0.04);
    jaw.scale.set(1, 0.7, 0.9);
    m.add(jaw);
    var leftEar = new THREE.Mesh(G.ear, pal.skin);
    leftEar.position.set(-0.24, 2.12, 0);
    leftEar.scale.set(0.4, 1.1, 0.7);
    m.add(leftEar);
    var rightEar = new THREE.Mesh(G.ear, pal.skin);
    rightEar.position.set(0.24, 2.12, 0);
    rightEar.scale.set(0.4, 1.1, 0.7);
    m.add(rightEar);
    var leftEyeball = new THREE.Mesh(G.eyeball, S.eyeWhite);
    leftEyeball.position.set(-0.10, 2.16, -0.21);
    m.add(leftEyeball);
    var rightEyeball = new THREE.Mesh(G.eyeball, S.eyeWhite);
    rightEyeball.position.set(0.10, 2.16, -0.21);
    m.add(rightEyeball);
    var leftPupil = new THREE.Mesh(G.pupil, S.pupil);
    leftPupil.position.set(-0.10, 2.16, -0.24);
    m.add(leftPupil);
    var rightPupil = new THREE.Mesh(G.pupil, S.pupil);
    rightPupil.position.set(0.10, 2.16, -0.24);
    m.add(rightPupil);
```

- [ ] **Step 5: Update `_buildBossModel` — apply head scale**

In `_buildBossModel` (line ~2917), change:

```js
    var head = shadow(new THREE.Mesh(G.head, bossSkin));
    head.position.y = 2.12;
    head.scale.set(1.0, 1.2, 0.95);
    m.add(head);
```

- [ ] **Step 6: Update jaw geometry in cache**

In `_ensureGeoCache()`, change the jaw (line ~443):

```js
      jaw: new THREE.SphereGeometry(0.16, 10, 8),
```

This is slightly smaller to fit the new head proportions. The scale `(1.0, 0.6, 0.85)` applied in `_buildModel` stays the same.

- [ ] **Step 7: Run tests**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: All PASS

- [ ] **Step 8: Commit**

```
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(enemies): replace sphere head with stretched egg shape"
```

---

### Task 2: Replace Box Brow with Torus Arc

**Files:**
- Modify: `js/enemies.js:442` (brow in `_geoCache`)
- Modify: `js/enemies.js` (`_buildModel` brow placement)

- [ ] **Step 1: Write failing test — brow should be TorusGeometry**

Add to the `Enemy model geometry improvements` describe block in `tests/unit/enemies.test.js`:

```js
  it('should not have any BoxGeometry brow on the model', () => {
    var hasBrowBox = false;
    enemy.mesh.children.forEach(child => {
      if (child.geometry && child.geometry.type === 'BoxGeometry' &&
          child.position && Math.abs(child.position.y - 2.22) < 0.1) {
        hasBrowBox = true;
      }
    });
    expect(hasBrowBox).toBe(false);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: FAIL — brow is still BoxGeometry

- [ ] **Step 3: Replace brow geometry in cache**

In `_ensureGeoCache()`, replace the brow line:

```js
      brow: new THREE.TorusGeometry(0.14, 0.025, 6, 12, Math.PI),
```

- [ ] **Step 4: Update brow placement in `_buildModel`**

Replace the brow placement (set in Task 1 step 4):

```js
    var brow = new THREE.Mesh(G.brow, pal.skin);
    brow.position.set(0, 2.22, -0.19);
    brow.rotation.x = 0.2;
    m.add(brow);
```

- [ ] **Step 5: Run tests**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: All PASS

- [ ] **Step 6: Commit**

```
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(enemies): replace box brow with torus arc"
```

---

### Task 3: Replace Box Face Mask with Partial Sphere

**Files:**
- Modify: `js/enemies.js:471` (faceMask in `_geoCache`)
- Modify: `js/enemies.js:733-735` (mask placement in `_buildModel`)

- [ ] **Step 1: Write failing test — face mask should not be BoxGeometry**

Add to the `Enemy model geometry improvements` describe block:

```js
  it('face mask should not be BoxGeometry', () => {
    var hasBoxMask = false;
    enemy.mesh.children.forEach(child => {
      if (child.geometry && child.geometry.type === 'BoxGeometry' &&
          child.position && Math.abs(child.position.y - 2.02) < 0.15 &&
          Math.abs(child.position.z - (-0.20)) < 0.1) {
        hasBoxMask = true;
      }
    });
    expect(hasBoxMask).toBe(false);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: FAIL

- [ ] **Step 3: Replace face mask geometry in cache**

In `_ensureGeoCache()`, replace:

```js
      faceMask: new THREE.SphereGeometry(0.22, 10, 8, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.35)
```

This creates a partial sphere band covering the lower face.

- [ ] **Step 4: Update face mask placement in `_buildModel`**

Replace the mask placement:

```js
    var maskMesh = new THREE.Mesh(G.faceMask, S.maskMat);
    maskMesh.position.set(0, 2.08, -0.02);
    maskMesh.scale.set(1.0, 1.1, 0.9);
    m.add(maskMesh);
```

- [ ] **Step 5: Run tests**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: All PASS

- [ ] **Step 6: Commit**

```
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(enemies): replace box face mask with partial sphere"
```

---

### Task 4: Replace Box Boots with Organic Shape

**Files:**
- Modify: `js/enemies.js:456-458` (boot geometries in `_geoCache`)
- Modify: `js/enemies.js:574-594` (boot placement in `_buildModel`)
- Modify: `js/enemies.js:2807-2826` (boot placement in `_buildBossModel`)

- [ ] **Step 1: Write failing test — boots should not be BoxGeometry**

Add to the `Enemy model geometry improvements` describe block:

```js
  it('boots should not be BoxGeometry', () => {
    var hasBoxBoot = false;
    enemy.mesh.children.forEach(child => {
      if (child.geometry && child.geometry.type === 'BoxGeometry' &&
          child.position && child.position.y < 0.25 && child.position.y > 0.0) {
        hasBoxBoot = true;
      }
    });
    expect(hasBoxBoot).toBe(false);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: FAIL

- [ ] **Step 3: Replace boot geometries in cache**

In `_ensureGeoCache()`, replace the boot section:

```js
      // Boots — rounded tactical boot
      boot: lathe([
        [0, 0.08],
        [0.04, 0.125],
        [0.10, 0.13],
        [0.18, 0.12],
        [0.24, 0.13]
      ], 10),
      bootSole: new THREE.CylinderGeometry(0.12, 0.13, 0.03, 10),
      bootToe: new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5),
```

- [ ] **Step 4: Update boot placement in `_buildModel`**

Replace the boot section in `_buildModel` (lines ~574-594):

```js
    // ── Boots (organic — rounded tactical boots) ────────
    var leftBoot = shadow(new THREE.Mesh(G.boot, S.boot));
    leftBoot.position.set(-0.15, 0.0, 0);
    m.add(leftBoot);
    var rightBoot = shadow(new THREE.Mesh(G.boot, S.boot));
    rightBoot.position.set(0.15, 0.0, 0);
    m.add(rightBoot);
    var leftSole = shadow(new THREE.Mesh(G.bootSole, S.sole));
    leftSole.position.set(-0.15, 0.015, 0);
    m.add(leftSole);
    var rightSole = shadow(new THREE.Mesh(G.bootSole, S.sole));
    rightSole.position.set(0.15, 0.015, 0);
    m.add(rightSole);
    var leftToe = shadow(new THREE.Mesh(G.bootToe, S.boot));
    leftToe.rotation.x = Math.PI / 2;
    leftToe.position.set(-0.15, 0.06, -0.08);
    leftToe.scale.set(1, 0.8, 0.6);
    m.add(leftToe);
    var rightToe = shadow(new THREE.Mesh(G.bootToe, S.boot));
    rightToe.rotation.x = Math.PI / 2;
    rightToe.position.set(0.15, 0.06, -0.08);
    rightToe.scale.set(1, 0.8, 0.6);
    m.add(rightToe);
```

- [ ] **Step 5: Apply same boot changes in `_buildBossModel`**

Replace the boot section in `_buildBossModel` (lines ~2807-2826) with the identical code but using `bossCrimson` material references don't apply to boots — boots use `S.boot` and `S.sole` for both enemy and boss. Copy the exact same boot code from Step 4.

- [ ] **Step 6: Run tests**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: All PASS

- [ ] **Step 7: Commit**

```
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(enemies): replace box boots with organic lathe shape"
```

---

### Task 5: Replace Box Hands with Mitt Spheres

**Files:**
- Modify: `js/enemies.js:433-435` (hand geometries in `_geoCache`)
- Modify: `js/enemies.js:650-660` (right hand in `_buildModel`)
- Modify: `js/enemies.js:678-687` (left hand in `_buildModel`)
- Modify: `js/enemies.js:2875-2884` (right hand in `_buildBossModel`)
- Modify: `js/enemies.js:2905-2912` (left hand in `_buildBossModel`)

- [ ] **Step 1: Write failing test — hands should be a single mitt, not box parts**

Add to the `Enemy model geometry improvements` describe block:

```js
  it('hands should be sphere mitts, not box geometry', () => {
    // Check inside arm groups for hand geometry
    var armGroups = [enemy._rightArmGroup, enemy._leftArmGroup];
    armGroups.forEach(ag => {
      var hasBoxHand = false;
      ag.children.forEach(child => {
        if (child.geometry && child.geometry.type === 'BoxGeometry') {
          hasBoxHand = true;
        }
      });
      expect(hasBoxHand).toBe(false);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: FAIL — arm groups contain BoxGeometry (palm, fingers)

- [ ] **Step 3: Replace hand geometries in cache**

In `_ensureGeoCache()`, replace the hand section:

```js
      // Hand — single mitt (sphere scaled to fist shape)
      mitt: new THREE.SphereGeometry(0.06, 8, 6),
```

Remove `palm`, `fingers`, and `thumb` from the cache. Keep the `thumb` CylinderGeometry if any other code references it — but search first. If only used in `_buildModel` and `_buildBossModel`, safe to remove.

- [ ] **Step 4: Update right hand in `_buildModel`**

Replace the 3-piece hand (palm+fingers+thumb) for the right arm with:

```js
    var rMitt = shadow(new THREE.Mesh(G.mitt, pal.skin));
    rMitt.position.set(0, -0.55, -0.30);
    rMitt.scale.set(1.2, 0.8, 1.4);
    this._rightArmGroup.add(rMitt);
```

Remove the `rPalm`, `rFingers`, `rThumb` lines.

- [ ] **Step 5: Update left hand in `_buildModel`**

Same for left arm:

```js
    var lMitt = shadow(new THREE.Mesh(G.mitt, pal.skin));
    lMitt.position.set(0, -0.51, -0.42);
    lMitt.scale.set(1.2, 0.8, 1.4);
    this._leftArmGroup.add(lMitt);
```

Remove the `lPalm`, `lFingers`, `lThumb` lines.

- [ ] **Step 6: Apply same hand changes in `_buildBossModel`**

Replace right hand in `_buildBossModel`:

```js
    var rMitt = shadow(new THREE.Mesh(G.mitt, bossSkin));
    rMitt.position.set(0, -0.55, -0.30);
    rMitt.scale.set(1.2, 0.8, 1.4);
    this._rightArmGroup.add(rMitt);
```

Replace left hand in `_buildBossModel`:

```js
    var lMitt = shadow(new THREE.Mesh(G.mitt, bossSkin));
    lMitt.position.set(0, -0.51, -0.42);
    lMitt.scale.set(1.2, 0.8, 1.4);
    this._leftArmGroup.add(lMitt);
```

Remove boss `rPalm`, `rFingers`, `rThumb`, `lPalm`, `lFingers`, `lThumb` lines.

- [ ] **Step 7: Run tests**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: All PASS

- [ ] **Step 8: Commit**

```
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(enemies): replace box hands with sphere mitt"
```

---

### Task 6: Replace Box Marker with Octahedron

**Files:**
- Modify: `js/enemies.js:467` (marker in `_geoCache`)

- [ ] **Step 1: Replace marker geometry in cache**

In `_ensureGeoCache()`, replace:

```js
      marker: new THREE.OctahedronGeometry(0.18),
```

No other changes needed — the marker placement code is unchanged.

- [ ] **Step 2: Run tests**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: All PASS

- [ ] **Step 3: Commit**

```
git add js/enemies.js
git commit -m "feat(enemies): replace box marker with octahedron diamond"
```

---

### Task 7: Smooth Shoulder-Arm Connection

**Files:**
- Modify: `js/enemies.js:412-419` (upperArm in `_geoCache`)
- Modify: `js/enemies.js:453` (shoulder in `_geoCache`)
- Modify: `js/enemies.js:637-662` (right arm group in `_buildModel`)
- Modify: `js/enemies.js:664-689` (left arm group in `_buildModel`)
- Modify: `js/enemies.js:2863-2887` (right arm in `_buildBossModel`)
- Modify: `js/enemies.js:2890-2913` (left arm in `_buildBossModel`)

- [ ] **Step 1: Replace upperArm geometry in cache**

In `_ensureGeoCache()`, replace the upperArm lathe profile:

```js
      // UPPER ARM — continuous shoulder-to-elbow with deltoid bulge
      upperArm: lathe([
        [0, 0.07],        // elbow end (narrow)
        [0.08, 0.085],
        [0.20, 0.10],     // mid bicep
        [0.32, 0.11],     // upper bicep
        [0.40, 0.13],     // deltoid bulge (shoulder cap)
        [0.46, 0.12]      // shoulder top (sinks into trunk)
      ], 10),
```

The separate `shoulder` geometry (`SphereGeometry(0.13, 8, 8)`) can stay in the cache (it's harmless), but remove its usage from `_buildModel` if it was placed on the mesh. Check: the current `_buildModel` does NOT place shoulder spheres (they're in the cache but unused for regular enemies). For the boss, shoulder pads are separate (Task 8). No removal needed.

- [ ] **Step 2: Adjust arm group position in `_buildModel`**

In `_buildModel`, adjust the right arm group position and bicep placement:

```js
    this._rightArmGroup = new THREE.Group();
    this._rightArmGroup.position.set(0.38, 1.75, 0);
    var rBicep = shadow(new THREE.Mesh(G.upperArm, pal.cloth));
    rBicep.position.set(0, -0.40, 0);
    this._rightArmGroup.add(rBicep);
```

And left arm group:

```js
    this._leftArmGroup = new THREE.Group();
    this._leftArmGroup.position.set(-0.38, 1.75, 0);
    var lBicep = shadow(new THREE.Mesh(G.upperArm, pal.cloth));
    lBicep.position.set(0, -0.40, 0);
    this._leftArmGroup.add(lBicep);
```

Adjust elbow position to match new bicep length: elbow at `y = -0.42` (was `-0.32`).

- [ ] **Step 3: Apply same arm changes in `_buildBossModel`**

Same position adjustments for boss arm groups — `0.38` x-offset, bicep at `-0.40`, elbow at `-0.42`.

- [ ] **Step 4: Run tests**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: All PASS

- [ ] **Step 5: Commit**

```
git add js/enemies.js
git commit -m "feat(enemies): smooth shoulder-arm connection with deltoid profile"
```

---

### Task 8: Replace Boss Box Geometries (Helmet, Shoulders, Visor)

**Files:**
- Modify: `js/enemies.js:2921-2940` (boss helmet/visor/shoulders in `_buildBossModel`)

- [ ] **Step 1: Write failing test — boss should not have BoxGeometry on unique parts**

Add to `tests/unit/enemies.test.js`:

```js
describe('Boss model geometry improvements', () => {
  it('boss unique parts should not be BoxGeometry', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    // Make it a boss
    if (typeof enemy._initBoss === 'function') {
      enemy._initBoss('normal');
    }
    // Check children added after boss init for BoxGeometry
    // Boss helmet, visor, shoulder pads should not be box
    var boxCount = 0;
    enemy.mesh.children.forEach(child => {
      if (child.geometry && child.geometry.type === 'BoxGeometry' &&
          child.position && child.position.y > 1.4) {
        boxCount++;
      }
    });
    expect(boxCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: FAIL

- [ ] **Step 3: Replace boss helmet, visor, and shoulder pads**

In `_buildBossModel`, replace the boss-unique section (lines ~2921-2940):

```js
    // ── Boss-unique: helmet dome ──────────────────────────
    var helmetDomeGeo = lathe([
      [0, 0.14],
      [0.04, 0.24],
      [0.10, 0.30],
      [0.18, 0.30],
      [0.24, 0.27],
      [0.26, 0.26]
    ], 14);
    var helmet = shadow(new THREE.Mesh(helmetDomeGeo, bossBlack));
    helmet.position.set(0, 2.08, 0);
    m.add(helmet);

    // ── Boss-unique: curved visor ─────────────────────────
    var visorGeo = new THREE.TorusGeometry(0.22, 0.04, 6, 16, Math.PI);
    var visor = shadow(new THREE.Mesh(visorGeo, bossVisor));
    visor.position.set(0, 2.14, -0.12);
    visor.rotation.x = Math.PI * 0.55;
    visor.rotation.y = Math.PI;
    m.add(visor);

    // ── Boss-unique: shoulder pads (half spheres) ─────────
    var shoulderPadGeo = new THREE.SphereGeometry(0.14, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    var leftShoulder = shadow(new THREE.Mesh(shoulderPadGeo, bossBlack));
    leftShoulder.position.set(-0.34, 1.58, 0);
    leftShoulder.rotation.z = 0.3;
    m.add(leftShoulder);
    var rightShoulder = shadow(new THREE.Mesh(shoulderPadGeo, bossBlack));
    rightShoulder.position.set(0.34, 1.58, 0);
    rightShoulder.rotation.z = -0.3;
    m.add(rightShoulder);
```

Note: The `lathe` function is defined inside `_ensureGeoCache`. Since `_buildBossModel` is called after geo cache init, you need to either: (a) add the boss helmet geo to the cache, or (b) define a local `lathe` function in `_buildBossModel`. Option (a) is cleaner — add to `_geoCache`:

```js
      // Boss helmet dome
      bossHelmet: lathe([
        [0, 0.14], [0.04, 0.24], [0.10, 0.30],
        [0.18, 0.30], [0.24, 0.27], [0.26, 0.26]
      ], 14),
```

Then use `G.bossHelmet` in `_buildBossModel`.

- [ ] **Step 4: Run tests**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: All PASS

- [ ] **Step 5: Commit**

```
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(enemies): replace boss box helmet/visor/shoulders with organic shapes"
```

---

### Task 9: Add Leg Groups for Animation

**Files:**
- Modify: `js/enemies.js:557-618` (leg placement in `_buildModel`)
- Modify: `js/enemies.js:2828-2850` (leg placement in `_buildBossModel`)
- Modify: `js/enemies.js:174-345` (Enemy constructor — add animation state)

- [ ] **Step 1: Write failing test — enemy should have leg groups**

Add to `tests/unit/enemies.test.js`:

```js
describe('Enemy animation system', () => {
  var scene, em, enemy;
  beforeAll(() => {
    scene = new THREE.Scene();
    em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    enemy = em.enemies[0];
  });

  it('should have left and right leg groups', () => {
    expect(enemy._leftLegGroup).toBeDefined();
    expect(enemy._rightLegGroup).toBeDefined();
  });

  it('leg groups should be THREE.Group instances', () => {
    expect(enemy._leftLegGroup.isGroup || enemy._leftLegGroup.children).toBeTruthy();
    expect(enemy._rightLegGroup.isGroup || enemy._rightLegGroup.children).toBeTruthy();
  });

  it('should have animation state properties', () => {
    expect(typeof enemy._walkPhase).toBe('number');
    expect(typeof enemy._idleTimer).toBe('number');
    expect(enemy._walkPhase).toBe(0);
    expect(enemy._idleTimer).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: FAIL — `_leftLegGroup` is undefined

- [ ] **Step 3: Add animation state to Enemy constructor**

In the Enemy constructor (around line ~296, after footstep properties), add:

```js
    // ── Animation state ──────────────────────────────────
    this._walkPhase = 0;
    this._idleTimer = 0;
    this._leftLegGroup = null;   // set in _buildModel
    this._rightLegGroup = null;  // set in _buildModel
```

- [ ] **Step 4: Wrap legs in groups in `_buildModel`**

Replace the leg section in `_buildModel` (calves, knees, thighs, boots for each side). Wrap each leg's parts in a group pivoting at hip height:

```js
    // ── Left Leg Group (pivot at hip ~1.0) ──────────────
    this._leftLegGroup = new THREE.Group();
    this._leftLegGroup.position.set(-0.15, 1.0, 0);

    var leftBoot = shadow(new THREE.Mesh(G.boot, S.boot));
    leftBoot.position.set(0, -1.0, 0);
    this._leftLegGroup.add(leftBoot);
    var leftSole = shadow(new THREE.Mesh(G.bootSole, S.sole));
    leftSole.position.set(0, -0.985, 0);
    this._leftLegGroup.add(leftSole);
    var leftToe = shadow(new THREE.Mesh(G.bootToe, S.boot));
    leftToe.rotation.x = Math.PI / 2;
    leftToe.position.set(0, -0.94, -0.08);
    leftToe.scale.set(1, 0.8, 0.6);
    this._leftLegGroup.add(leftToe);
    var leftCalf = shadow(new THREE.Mesh(G.lowerLeg, pal.cloth));
    leftCalf.position.set(0, -0.83, 0);
    this._leftLegGroup.add(leftCalf);
    var leftKnee = shadow(new THREE.Mesh(G.knee, pal.cloth));
    leftKnee.position.set(0, -0.43, 0);
    this._leftLegGroup.add(leftKnee);
    var leftThigh = shadow(new THREE.Mesh(G.upperLeg, pal.cloth));
    leftThigh.position.set(0, -0.47, 0);
    this._leftLegGroup.add(leftThigh);
    m.add(this._leftLegGroup);

    // ── Right Leg Group (pivot at hip ~1.0) ─────────────
    this._rightLegGroup = new THREE.Group();
    this._rightLegGroup.position.set(0.15, 1.0, 0);

    var rightBoot = shadow(new THREE.Mesh(G.boot, S.boot));
    rightBoot.position.set(0, -1.0, 0);
    this._rightLegGroup.add(rightBoot);
    var rightSole = shadow(new THREE.Mesh(G.bootSole, S.sole));
    rightSole.position.set(0, -0.985, 0);
    this._rightLegGroup.add(rightSole);
    var rightToe = shadow(new THREE.Mesh(G.bootToe, S.boot));
    rightToe.rotation.x = Math.PI / 2;
    rightToe.position.set(0, -0.94, -0.08);
    rightToe.scale.set(1, 0.8, 0.6);
    this._rightLegGroup.add(rightToe);
    var rightCalf = shadow(new THREE.Mesh(G.lowerLeg, pal.cloth));
    rightCalf.position.set(0, -0.83, 0);
    this._rightLegGroup.add(rightCalf);
    var rightKnee = shadow(new THREE.Mesh(G.knee, pal.cloth));
    rightKnee.position.set(0, -0.43, 0);
    this._rightLegGroup.add(rightKnee);
    var rightThigh = shadow(new THREE.Mesh(G.upperLeg, pal.cloth));
    rightThigh.position.set(0, -0.47, 0);
    this._rightLegGroup.add(rightThigh);
    m.add(this._rightLegGroup);
```

Note: All y-positions are relative to the group pivot at y=1.0. Original boot y=0.0 becomes -1.0 relative to the group, calf y=0.17 becomes -0.83, etc.

- [ ] **Step 5: Apply same leg group wrapping in `_buildBossModel`**

Same structure in `_buildBossModel`, using `bossCrimson`/`bossBlack` materials instead of `pal.cloth`. Boss legs use the same geometry and same relative positions.

- [ ] **Step 6: Run tests**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: All PASS

- [ ] **Step 7: Commit**

```
git add js/enemies.js tests/unit/enemies.test.js
git commit -m "feat(enemies): wrap legs in groups for animation pivot"
```

---

### Task 10: Implement Walk and Idle Animation

**Files:**
- Modify: `js/enemies.js:1265+` (add animation logic at end of `update` method)

- [ ] **Step 1: Write failing test — walk phase should advance when moving**

Add to the `Enemy animation system` describe block:

```js
  it('_walkPhase should be a number initialized to 0', () => {
    expect(enemy._walkPhase).toBe(0);
  });

  it('_idleTimer should be a number initialized to 0', () => {
    expect(enemy._idleTimer).toBe(0);
  });
```

- [ ] **Step 2: Run tests to verify they pass (properties added in Task 9)**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: PASS (already added in Task 9)

- [ ] **Step 3: Add `_animateModel` method**

Add a new method to `Enemy.prototype` after the `update` method:

```js
  Enemy.prototype._animateModel = function(dt) {
    if (!this.alive || this._dying) return;

    var isMoving = this._currentSpeed > 0.5;

    if (isMoving) {
      // Walk cycle
      var freq = this.isBoss ? 2.8 : 4.0;
      this._walkPhase += this._currentSpeed * dt * freq;

      var legSwing = this.isBoss ? 0.3 : 0.4;
      var armSwing = this.isBoss ? 0.15 : 0.25;

      // Leg swing
      if (this._leftLegGroup) {
        this._leftLegGroup.rotation.x = Math.sin(this._walkPhase) * legSwing;
      }
      if (this._rightLegGroup) {
        this._rightLegGroup.rotation.x = Math.sin(this._walkPhase + Math.PI) * legSwing;
      }

      // Arm counter-swing (opposite phase to legs)
      if (this._leftArmGroup) {
        this._leftArmGroup.rotation.x = -0.75 + Math.sin(this._walkPhase) * armSwing;
      }
      if (this._rightArmGroup) {
        this._rightArmGroup.rotation.x = -0.5 + Math.sin(this._walkPhase + Math.PI) * armSwing;
      }

      // Reset idle timer
      this._idleTimer = 0;
    } else {
      // Idle animation
      this._idleTimer += dt;

      // Reset leg rotation smoothly
      if (this._leftLegGroup && Math.abs(this._leftLegGroup.rotation.x) > 0.01) {
        this._leftLegGroup.rotation.x *= 0.9;
      }
      if (this._rightLegGroup && Math.abs(this._rightLegGroup.rotation.x) > 0.01) {
        this._rightLegGroup.rotation.x *= 0.9;
      }

      // Breathing — subtle scale pulse
      // (Applied to first trunk-like child; trunk is one of the first children added)

      // Weight shift — subtle lateral sway (not for boss)
      if (!this.isBoss) {
        this.mesh.position.x += Math.sin(this._idleTimer * 0.7) * 0.0002;
      }

      // Reset arm to rest pose smoothly
      if (this._leftArmGroup) {
        this._leftArmGroup.rotation.x += (-0.75 - this._leftArmGroup.rotation.x) * Math.min(1, 3 * dt);
      }
      if (this._rightArmGroup) {
        this._rightArmGroup.rotation.x += (-0.5 - this._rightArmGroup.rotation.x) * Math.min(1, 3 * dt);
      }
    }
  };
```

- [ ] **Step 4: Call `_animateModel` from `update`**

In `Enemy.prototype.update`, add the animation call just before the marker bob (line ~1283):

```js
    // Animate model (walk/idle)
    this._animateModel(dt);
```

Place it right after the boss phase flash effect block (after line ~1281) and before the marker bob.

- [ ] **Step 5: Run tests**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: All PASS

- [ ] **Step 6: Manually verify in browser**

Open `index.html` in browser. Start a round. Verify:
- Enemies swing legs when walking
- Arms counter-swing opposite to legs
- Enemies settle to idle pose when stationary
- Boss has slower, heavier walk cycle
- Death animations still work correctly
- No visual glitches at leg pivot points

- [ ] **Step 7: Commit**

```
git add js/enemies.js
git commit -m "feat(enemies): add procedural walk and idle animation"
```

---

### Task 11: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Update enemy model section in REQUIREMENTS.md**

Find the sections describing enemy and boss models. Update to reflect:
- Head is a stretched sphere (egg shape) instead of perfect sphere
- Brow is a torus arc instead of box
- Face mask is a partial sphere instead of box
- Boots are lathe profile + sphere toe instead of boxes
- Hands are sphere mitts instead of box palm+fingers+thumb
- Marker is an octahedron instead of box cube
- Upper arm has continuous deltoid-to-elbow profile
- Boss helmet is a lathe dome instead of box
- Boss shoulder pads are half-spheres instead of boxes
- Boss visor is a torus curve instead of box
- Enemies have procedural walk animation (leg swing, arm counter-swing)
- Enemies have idle breathing/sway when stationary
- Boss has slower, heavier animation

- [ ] **Step 2: Run tests**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: All PASS (no code changes, just docs)

- [ ] **Step 3: Commit**

```
git add REQUIREMENTS.md
git commit -m "docs: update REQUIREMENTS.md with improved enemy model descriptions"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npm test -- --reporter=verbose 2>&1 | tail -40`
Expected: All PASS

- [ ] **Step 2: Visual playtest**

Open `index.html` in browser. Play through at least one full round verifying:
- Regular enemies: egg head, organic boots, mitt hands, smooth shoulders, walk animation
- Boss: dome helmet, curved visor, half-sphere shoulder pads, heavy walk animation
- Death animations still work (arms and legs animate correctly during fall)
- No collision issues (enemies still navigate and don't clip through walls)
- Performance is acceptable (no frame drops)

- [ ] **Step 3: Final commit if any tweaks needed**

If any animation values need tuning from playtest, adjust and commit:

```
git add js/enemies.js
git commit -m "fix(enemies): tune animation parameters from playtest"
```
