# Aztec / Office / Warehouse — Gate Expensive Decoration to High+ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push expensive-but-not-load-bearing decoration on Aztec, Office, and Warehouse behind a `level 4` (High and Ultra only) tier gate so the adaptive quality system can hold at Medium on weaker hardware.

**Architecture:** Reuse the existing `tierGated` / `tierGatedLight` helpers in `js/maps/shared.js`. Add one new helper, `tierGatedMaterial`, for the Aztec river water (transmission material → cheap opaque tinted material at low tiers; mesh stays visible). Each affected map gains a single `decorHigh` Group; decorative `D` / `WR` / `FD` / `CD` / `P.*` / `Cyl` calls switch their first argument from `scene` to `decorHigh`. Indoor maps' dynamic point lights wrap their `addPointLight(...)` return value with `H.tierGatedLight(light, 4)`.

**Tech Stack:** Three.js r160.1 (global `THREE`), IIFE module pattern attaching to `window.GAME`, vitest with jsdom, custom Three.js mock in `tests/setup.js`.

---

## File Structure

**Modify:**
- `js/maps/shared.js` — add `tierGatedMaterial` helper, extend `_reapplyAllTierVisibility` with material-swap branch, expose helper via `GAME._mapHelpers`.
- `js/maps/aztec.js` — create `decorHigh` group; move ~30 decorative items into it; tier-gate at level 4. Swap the river water mesh's material via `tierGatedMaterial`.
- `js/maps/office.js` — create `decorHigh` group; move ~25 decorative items into it; tier-gate at level 4. Capture the 9 ceiling `PointLight` instances and wrap with `tierGatedLight(light, 4)`.
- `js/maps/warehouse.js` — create `decorHigh` group; move ~80 decorative items into it; tier-gate at level 4. Wrap all 7 `addPointLight(...)` calls with `tierGatedLight(light, 4)`.

**Create:**
- `tests/integration/tier-gated-decor-high.test.js` — cross-map invariants for `decorHigh` groups (exists, level 4, no wall meshes inside).
- `tests/integration/tier-gated-lights.test.js` — every `PointLight` in Office and Warehouse is gated at level 4.

**Existing tests to verify still pass:**
- `tests/integration/tier-gating.test.js` (wall-stable + gated-group toggle invariants).
- `tests/integration/outdoor-maps-no-dynamic-lights.test.js` (Aztec stays at zero `PointLight`s).
- `tests/integration/map-material-validity.test.js` (every mesh has a real material instance — Aztec water swap must produce a real material).

---

## Task 1: Add `tierGatedMaterial` helper to `shared.js`

**Files:**
- Modify: `js/maps/shared.js` (lines around 1093–1142, 1163–1166)

- [ ] **Step 1: Open `js/maps/shared.js` and locate the existing `tierGated` / `tierGatedLight` helpers**

The block starts at line ~1089 (`// ── Tier-gated content ──`) and ends at the close of `GAME._reapplyAllTierVisibility` (~line 1142). The helpers are exposed in `GAME._mapHelpers` at lines ~1163–1166.

- [ ] **Step 2: Add the new helper function below `applyTierVisibilityLight`**

Insert this block immediately after the existing `applyTierVisibilityLight` function (just before `GAME._reapplyAllTierVisibility = function() {`):

```js
  // Material swap variant — for meshes whose material is too expensive to
  // render at low tiers (e.g. transmission-based glass on a 40x8 surface)
  // but where outright hiding the mesh would leave a visual gap. The mesh
  // stays visible at all tiers; only its `.material` swaps.
  function tierGatedMaterial(mesh, minLevel, lowTierMaterial) {
    mesh.userData = mesh.userData || {};
    mesh.userData.minQualityLevel = minLevel;
    mesh.userData._origMaterial = mesh.material;
    mesh.userData._lowMaterial = lowTierMaterial;
    mesh.userData._tierMaterialSwap = true;
    applyTierVisibilityMaterial(mesh);
  }

  function applyTierVisibilityMaterial(mesh) {
    var min = mesh.userData && mesh.userData.minQualityLevel;
    if (min == null) return;
    var current = (GAME.quality && GAME.quality.level != null) ? GAME.quality.level : 5;
    mesh.material = current >= min ? mesh.userData._origMaterial : mesh.userData._lowMaterial;
  }
```

- [ ] **Step 3: Extend `GAME._reapplyAllTierVisibility` with the material branch**

Find the existing implementation:

```js
  GAME._reapplyAllTierVisibility = function() {
    if (!GAME.scene || !GAME.scene.traverse) return;
    GAME.scene.traverse(function(o) {
      if (!o.userData || o.userData.minQualityLevel == null) return;
      if (o.isLight) {
        applyTierVisibilityLight(o);
      } else {
        applyTierVisibility(o);
      }
    });
  };
```

Replace it with:

```js
  GAME._reapplyAllTierVisibility = function() {
    if (!GAME.scene || !GAME.scene.traverse) return;
    GAME.scene.traverse(function(o) {
      if (!o.userData || o.userData.minQualityLevel == null) return;
      if (o.isLight) {
        applyTierVisibilityLight(o);
      } else if (o.userData._tierMaterialSwap) {
        applyTierVisibilityMaterial(o);
      } else {
        applyTierVisibility(o);
      }
    });
  };
```

- [ ] **Step 4: Expose `tierGatedMaterial` via `GAME._mapHelpers`**

Find the `tier-gated content` block in the helpers export (around lines 1163–1166):

```js
    // Tier-gated content
    tierGated: tierGated,
    tierGatedLight: tierGatedLight,
  };
```

Replace with:

```js
    // Tier-gated content
    tierGated: tierGated,
    tierGatedLight: tierGatedLight,
    tierGatedMaterial: tierGatedMaterial,
  };
```

- [ ] **Step 5: Run the existing tier-gating test to confirm no regression**

Run: `npm test -- tests/integration/tier-gating.test.js`
Expected: PASS (the new helper has no callers yet; the extended `_reapplyAllTierVisibility` falls through to the existing branch for everything currently gated).

- [ ] **Step 6: Commit**

```bash
git add js/maps/shared.js
git commit -m "feat(maps/shared): add tierGatedMaterial helper for swap-on-tier-change"
```

---

## Task 2: Aztec — write the failing `decorHigh` test

**Files:**
- Create: `tests/integration/tier-gated-decor-high.test.js`

- [ ] **Step 1: Create the new test file with the cross-map structure**

```js
// tests/integration/tier-gated-decor-high.test.js
import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/core/quality.js');
  loadModule('js/maps/shared.js');
  loadModule('js/maps/props.js');
  loadModule('js/maps/aztec.js');
  loadModule('js/maps/office.js');
  loadModule('js/maps/warehouse.js');
});

// The three maps in scope for the 2026-05-10 spec must each declare a top-level
// Group with userData.minQualityLevel === 4 — the "decorHigh" gate that hides
// expensive decoration at Medium and below.
describe('decorHigh tier-gating: Aztec / Office / Warehouse', () => {
  var maps = ['Aztec', 'Office', 'Warehouse'];

  function buildMap(name) {
    var idx = -1;
    for (var i = 0; i < GAME._maps.length; i++) {
      if (GAME._maps[i].name === name) { idx = i; break; }
    }
    expect(idx).toBeGreaterThanOrEqual(0);
    GAME.quality = { level: 5 };
    var scene = new THREE.Scene();
    var origScene = GAME.scene;
    GAME.scene = scene;
    var walls = GAME._maps[idx].build(scene);
    GAME.scene = origScene;
    return { scene: scene, walls: walls };
  }

  function findDecorHighGroups(scene) {
    var found = [];
    scene.traverse(function(o) {
      if (o.userData && o.userData.minQualityLevel === 4 && !o.isLight && !o.userData._tierMaterialSwap) {
        found.push(o);
      }
    });
    return found;
  }

  maps.forEach(function(name) {
    it(name + ': has at least one Group gated at level 4', function() {
      var built = buildMap(name);
      var groups = findDecorHighGroups(built.scene);
      expect(groups.length).toBeGreaterThan(0);
    });

    it(name + ': decorHigh group contains no meshes from the walls[] array', function() {
      var built = buildMap(name);
      var groups = findDecorHighGroups(built.scene);
      var wallSet = new Set(built.walls);
      groups.forEach(function(g) {
        g.traverse(function(o) {
          expect(wallSet.has(o)).toBe(false);
        });
      });
    });

    it(name + ': decorHigh group is non-empty', function() {
      var built = buildMap(name);
      var groups = findDecorHighGroups(built.scene);
      var totalChildren = 0;
      groups.forEach(function(g) { totalChildren += g.children.length; });
      expect(totalChildren).toBeGreaterThan(5);
    });
  });
});
```

- [ ] **Step 2: Run the test and verify it fails for all three maps**

Run: `npm test -- tests/integration/tier-gated-decor-high.test.js`
Expected: FAIL — all three maps fail the "has at least one Group gated at level 4" assertion (no `decorHigh` groups exist yet).

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/integration/tier-gated-decor-high.test.js
git commit -m "test(maps): failing tier-gated-decor-high cross-map invariants"
```

---

## Task 3: Aztec — create `decorHigh` group, move decoration into it

**Files:**
- Modify: `js/maps/aztec.js`

The list of items to move below is in spec Section 2. Each item is a `D(scene, …)`, `WR(scene, …)`, `FD(scene, …)`, or `P.*(scene, …)` call where the first argument changes from `scene` to `decorHigh`. Several items are referenced by line number; the line numbers below match the file as of commit `eb3a7f1`. If any drift is observed, find the call by code shape rather than line number.

- [ ] **Step 1: Declare `decorHigh` near the top of `build`**

Find the existing line in `build`:

```js
build: function(scene) {
  var walls = [];

  // ── Materials ──
```

Insert after `var walls = [];`:

```js
      var decorHigh = new THREE.Group();
```

- [ ] **Step 2: Move perimeter wall-base moss/jungle-green strips into `decorHigh`**

Change the 6 vertical jungle-green vine-trim `D` calls (currently lines ~113–118) and the 6 moss decals at perimeter wall bases (currently lines ~129–134) from `D(scene, …)` to `D(decorHigh, …)`. Concretely:

```js
      D(decorHigh, 0.15, 5,   0.1, jungleGreen, -35, 4,   -15);
      D(decorHigh, 0.15, 6,   0.1, jungleGreen, -35, 4,    10);
      D(decorHigh, 0.15, 4,   0.1, jungleGreen,  35, 4.5,  -8);
      D(decorHigh, 0.15, 5.5, 0.1, jungleGreen,  35, 4,    18);
      D(decorHigh, 0.1,  4.5, 0.15, jungleGreen, 10, 4.5, -30);
      D(decorHigh, 0.1,  5,   0.15, jungleGreen, -20, 4,  -30);
```

```js
      D(decorHigh, 6,    0.6, 0.15,  moss, -10,  0.3,  -29.8);
      D(decorHigh, 5,    0.5, 0.15,  moss,  15,  0.25, -29.8);
      D(decorHigh, 0.15, 0.5, 5,     moss, -34.8, 0.25, 5);
      D(decorHigh, 0.15, 0.6, 6,     moss,  34.8, 0.3, -15);
      D(decorHigh, 7,    0.5, 0.15,  moss,  -5,   0.25, 29.8);
      D(decorHigh, 0.15, 0.5, 4,     moss, -34.8, 0.25,-20);
```

The leading `D(scene, 72, 0.8, 0.1, …)` perimeter base bands (lines ~109–112) stay as `scene` — those are continuous wall-trim that the player sees through every gap; not moving them.

- [ ] **Step 3: Move `WallRelief` perimeter calls into `decorHigh`**

Change the 6 perimeter `WR(scene, …)` calls (lines ~121–126) to `WR(decorHigh, …)`:

```js
      WR(decorHigh, 8,   4, 0.5, mossStone, -20, 3, -30, { style: 'stone' });
      WR(decorHigh, 8,   4, 0.5, mossStone,  10, 3, -30, { style: 'stone' });
      WR(decorHigh, 8,   4, 0.5, mossStone, -15, 3,  30, { style: 'stone' });
      WR(decorHigh, 8,   4, 0.5, mossStone,  20, 3,  30, { style: 'stone' });
      WR(decorHigh, 0.5, 4, 8,   mossStone, -35, 3, -10, { style: 'stone' });
      WR(decorHigh, 0.5, 4, 8,   mossStone,  35, 3,  10, { style: 'stone' });
```

- [ ] **Step 4: Move perimeter vines into `decorHigh`**

Change the 5 `P.Vine(scene, …)` calls at lines ~137–141:

```js
      P.Vine(decorHigh,  15, 6, -30,  15, 1,  -30, { seed: 24 });
      P.Vine(decorHigh, -25, 7, -30, -25, 2,  -30, { seed: 25 });
      P.Vine(decorHigh,  35, 6,   5,  35, 1,    5, { seed: 26 });
      P.Vine(decorHigh, -35, 7,  -8, -35, 1.5, -8, { seed: 27 });
      P.Vine(decorHigh,  10, 6,  30,  10, 1.5, 30, { seed: 28 });
```

- [ ] **Step 5: Move river-edge algae bands and root tendrils into `decorHigh`**

The two emissive cyan slabs (lines ~160–161), 3 algae bands (165–167), and 4 root tendrils (170–173):

```js
      D(decorHigh, 2,   3.5, 0.3, emissiveMat(0x2a6a6a, 0x1a8a8a, 0.8), 24,   -1.5, 2);
      D(decorHigh, 1.5, 3,   0.2, emissiveMat(0x3a7a7a, 0x2a9a9a, 0.6), 24.5, -1.8, 2);
```

```js
      D(decorHigh, 35, 0.4, 0.15, concreteMat(0x4a7a3a), 5, -1.8, -2.1);
      D(decorHigh, 35, 0.4, 0.15, concreteMat(0x4a7a3a), 5, -1.8,  6.1);
      D(decorHigh, 20, 0.3, 0.1,  concreteMat(0x3a6a2a), 5, -1.5, -2.2);
```

```js
      D(decorHigh, 0.08, 1.5, 0.08, woodMat(0x5a4020), -10, -0.5, -2.3);
      D(decorHigh, 0.06, 1.8, 0.06, woodMat(0x5a4020),   0, -0.3, -2.3);
      D(decorHigh, 0.08, 1.2, 0.08, woodMat(0x5a4020),  12, -0.6,  6.3);
      D(decorHigh, 0.06, 1.5, 0.06, woodMat(0x5a4020),  20, -0.4,  6.3);
```

- [ ] **Step 6: Move rope bridge planks and rope side-rails into `decorHigh`**

The 4 plank slats (lines ~179–182) and 2 long rope rails (183–184):

```js
      D(decorHigh, 3, 0.05, 0.15, woodMat(0x7a5a2a), 15, 0.02, -1);
      D(decorHigh, 3, 0.05, 0.15, woodMat(0x7a5a2a), 15, 0.02,  1);
      D(decorHigh, 3, 0.05, 0.15, woodMat(0x7a5a2a), 15, 0.02,  3);
      D(decorHigh, 3, 0.05, 0.15, woodMat(0x7a5a2a), 15, 0.02,  5);
      D(decorHigh, 0.08, 1.0, 10, ropeMat, 13.3, 0.5, 2);
      D(decorHigh, 0.08, 1.0, 10, ropeMat, 16.7, 0.5, 2);
```

The base box `B(scene, walls, 3, 0.3, 10, …)` at line 178 and the 4 `CylW` corner posts (185–188) stay — collidable.

- [ ] **Step 7: Move corridor glyph panels and inserts into `decorHigh`**

The 2 glyph panels (lines ~206–207), 4 inset blocks (209–212), and 2 corridor wall-base moss strips (221–222):

```js
      D(decorHigh, 0.15, 2.0, 2.5, sandstoneDark, -13.1, 2.5, -8);
      D(decorHigh, 0.15, 2.0, 2.5, sandstoneDark,  -6.9, 2.5, -8);

      D(decorHigh, 0.05, 0.5, 0.5, darkStone, -13.15, 3.0, -7.5);
      D(decorHigh, 0.05, 0.5, 0.5, darkStone, -13.15, 3.0, -8.5);
      D(decorHigh, 0.05, 0.5, 0.5, darkStone,  -6.85, 3.0, -7.5);
      D(decorHigh, 0.05, 0.5, 0.5, darkStone,  -6.85, 3.0, -8.5);
```

```js
      D(decorHigh, 0.15, 0.4, 12, moss, -13.05, 0.2, -8);
      D(decorHigh, 0.15, 0.4, 12, moss,  -6.95, 0.2, -8);
```

The torch holders + shafts (215–218) stay on `scene` — small, only 4 meshes.

- [ ] **Step 8: Move temple riser glyphs, step-joint moss, and tier-edge trim into `decorHigh`**

Tier-edge trim (lines ~238–240), riser glyph panels (255–259), step-joint moss (261–263):

```js
      D(decorHigh, 14.5, 0.15, 0.15, darkStone, 15, 0.08, 11);
      D(decorHigh, 10.5, 0.15, 0.15, darkStone, 15, 1.58, 13);
      D(decorHigh, 8.5,  0.15, 0.15, darkStone, 15, 3.08, 14);
```

```js
      D(decorHigh, 2,   1.0, 0.1, sandstoneDark, 13, 0.75, 10.95);
      D(decorHigh, 2,   1.0, 0.1, sandstoneDark, 17, 0.75, 10.95);
      D(decorHigh, 1.5, 1.0, 0.1, sandstoneDark, 14, 2.25, 12.95);
      D(decorHigh, 1.5, 1.0, 0.1, sandstoneDark, 16, 2.25, 12.95);
```

```js
      D(decorHigh, 12, 0.08, 0.3, moss, 15, 1.52, 11.2);
      D(decorHigh,  8, 0.08, 0.3, moss, 15, 3.02, 13.2);
      D(decorHigh,  6, 0.08, 0.3, moss, 15, 4.52, 14.2);
```

- [ ] **Step 9: Move soft vegetation and stone-path floor decals into `decorHigh`**

Stone path decals (lines ~97–99):

```js
      D(decorHigh,  3, 0.02, 30, stonePath, -10, 0.01, -5);
      D(decorHigh, 20, 0.02,  3, stonePath,   5, 0.01,  0);
      D(decorHigh,  3, 0.02, 20, stonePath,  15, 0.01, 10);
```

CT spawn courtyard stone path (line ~322):

```js
      D(decorHigh, 12, 0.05, 10, stonePath, -20, 0.03, 20);
```

Vines / bushes / grass / moss patches around T-spawn and the rest of the map (lines ~313–318, 344–347, 355–363):

```js
      P.Bush(decorHigh, 12, 0, -20, { style: 'tropical', seed: 10 });
      P.MossPatches(decorHigh, 18, 0, -18, { seed: 11 });
      P.Bush(decorHigh, 5, 0, -22, { style: 'tropical', seed: 12 });
      P.Grass(decorHigh, 22, 0, -27, { seed: 13 });
      P.Grass(decorHigh, 14, 0, -26, { seed: 14 });
```

```js
      P.Vine(decorHigh, -22, 4,  5, -22, 1,    5, { seed: 20 });
      P.Vine(decorHigh, -26, 4,  8, -26, 1,    8, { seed: 21 });
      P.Vine(decorHigh, -13, 5,-10, -13, 1.5,-10, { seed: 22 });
      P.Vine(decorHigh,  -7, 5, -5,  -7, 2,   -5, { seed: 23 });
```

```js
      P.MossPatches(decorHigh, -28, 0,  0, { seed: 30 });
      P.MossPatches(decorHigh,  28, 0, -5, { seed: 31 });
      P.Bush(decorHigh, -5, 0, 25, { style: 'tropical', seed: 32 });
      P.Grass(decorHigh, 10, 0, -18, { seed: 33 });
```

```js
      P.Flower(decorHigh,  16, 0, -20, { seed: 60 });
      P.Flower(decorHigh, -28, 0,  -5, { seed: 61 });
```

`P.Tree(scene, walls, …)`, `P.Rock(scene, walls, …)`, `P.RockCluster(scene, walls, …)`, `P.Pillar(scene, walls, …)` calls (310–312, 348–354, 361–366) STAY on `scene` — they push to `walls[]`.

- [ ] **Step 10: Move the temple/courtyard wall reliefs and floor details into `decorHigh`**

Lines ~369–372:

```js
      WR(decorHigh, 14, 4, 0.5, mossStone,  15, 2, 18, { style: 'stone' });
      WR(decorHigh,  8, 4, 0.5, darkStone, -22, 2,  5, { style: 'stone' });
      FD(decorHigh, 14, 14, sandstone,  15, 1.5, 18, { style: 'cobblestone' });
      FD(decorHigh, 10,  4, darkStone, -18, 3,  -18, { style: 'cobblestone' });
```

- [ ] **Step 11: Add `decorHigh` to scene and tier-gate it**

Just before `return walls;` at the end of `build`:

```js
      scene.add(decorHigh);
      H.tierGated(decorHigh, 4);

      return walls;
```

- [ ] **Step 12: Run the new test for Aztec**

Run: `npm test -- tests/integration/tier-gated-decor-high.test.js`
Expected: Aztec passes all 3 assertions; Office and Warehouse still fail.

- [ ] **Step 13: Run the existing tier-gating cross-map test**

Run: `npm test -- tests/integration/tier-gating.test.js`
Expected: PASS — wall counts identical across all levels for Aztec, gated group toggles visibility correctly.

- [ ] **Step 14: Commit**

```bash
git add js/maps/aztec.js tests/integration/tier-gated-decor-high.test.js
git commit -m "perf(maps/aztec): gate decorative geometry to High+ via decorHigh group"
```

---

## Task 4: Aztec — water material swap

**Files:**
- Modify: `js/maps/aztec.js` (water mesh creation around lines 89, 149)

- [ ] **Step 1: Add a small assertion to `tier-gated-decor-high.test.js` for the water swap**

Append a new `describe` block to the file created in Task 2:

```js
describe('Aztec river water uses tierGatedMaterial', () => {
  it('water mesh has _tierMaterialSwap set, gated at level 4, with distinct origin/low materials', () => {
    var idx = -1;
    for (var i = 0; i < GAME._maps.length; i++) {
      if (GAME._maps[i].name === 'Aztec') { idx = i; break; }
    }
    expect(idx).toBeGreaterThanOrEqual(0);

    GAME.quality = { level: 5 };
    var scene = new THREE.Scene();
    var origScene = GAME.scene;
    GAME.scene = scene;
    GAME._maps[idx].build(scene);
    GAME.scene = origScene;

    var water = null;
    scene.traverse(function(o) {
      if (o.userData && o.userData._tierMaterialSwap) water = o;
    });

    expect(water).not.toBeNull();
    expect(water.userData.minQualityLevel).toBe(4);
    expect(water.userData._origMaterial).not.toBe(water.userData._lowMaterial);
    expect(water.userData._origMaterial).toBeTruthy();
    expect(water.userData._lowMaterial).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/integration/tier-gated-decor-high.test.js`
Expected: the new "Aztec river water uses tierGatedMaterial" test FAILS — no mesh in the scene has `_tierMaterialSwap`.

- [ ] **Step 3: Modify the water mesh in `aztec.js` to use `tierGatedMaterial`**

In `js/maps/aztec.js`, find the existing material declaration:

```js
      var waterMat = glassMat(0x1a6a5a);
```

Leave that line as `waterOrigMat` for clarity:

```js
      var waterOrigMat = glassMat(0x1a6a5a);
      var waterLowMat = concreteMat(0x2a6a5a);
```

Find the water mesh creation (around line 149):

```js
      var water = new THREE.Mesh(new THREE.BoxGeometry(40, 0.15, 8), waterMat);
      water.position.set(5, -2, 2);
      scene.add(water);
```

Replace with:

```js
      var water = new THREE.Mesh(new THREE.BoxGeometry(40, 0.15, 8), waterOrigMat);
      water.position.set(5, -2, 2);
      scene.add(water);
      H.tierGatedMaterial(water, 4, waterLowMat);
```

(The original `var waterMat = glassMat(0x1a6a5a);` line is replaced by the two `waterOrigMat` / `waterLowMat` declarations above; `waterMat` no longer appears in the file.)

- [ ] **Step 4: Run the new test to verify it passes**

Run: `npm test -- tests/integration/tier-gated-decor-high.test.js`
Expected: the new "Aztec river water uses tierGatedMaterial" test PASSES.

- [ ] **Step 5: Run map-material-validity test (water swap must produce a real material instance)**

Run: `npm test -- tests/integration/map-material-validity.test.js`
Expected: PASS — both the original `glassMat` and the `concreteMat` substitute are real `THREE.MeshStandard/PhysicalMaterial` instances.

- [ ] **Step 6: Run outdoor-no-dynamic-lights test (Aztec must still have zero PointLights)**

Run: `npm test -- tests/integration/outdoor-maps-no-dynamic-lights.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add js/maps/aztec.js tests/integration/tier-gated-decor-high.test.js
git commit -m "perf(maps/aztec): swap river water glass material to opaque at <High"
```

---

## Task 5: Office — create `decorHigh` group, move decoration into it

**Files:**
- Modify: `js/maps/office.js`

The existing `decorProps` group (gated at level 2) is **not** changed. A second, independent `decorHigh` group is added.

- [ ] **Step 1: Declare `decorHigh` near the top of `build`**

Find the existing block in `build`:

```js
build: function(scene) {
  var walls = [];
  var decorProps = new THREE.Group();
  var grayFloor = officeTileMat(0x707070);
```

Insert after the `decorProps` line:

```js
      var decorHigh = new THREE.Group();
```

- [ ] **Step 2: Move smoke detectors into `decorHigh`**

Lines ~192–194 — change from `Cyl(scene, …)` to `Cyl(decorHigh, …)`:

```js
      Cyl(decorHigh, 0.06, 0.06, 0.03, 8, plasterMat(0xfafafa),  -5, 5.72, -5);
      Cyl(decorHigh, 0.06, 0.06, 0.03, 8, plasterMat(0xfafafa),   5, 5.72,  5);
      Cyl(decorHigh, 0.06, 0.06, 0.03, 8, plasterMat(0xfafafa), -12, 5.72, 12);
```

- [ ] **Step 3: Move paper stacks and coffee mugs into `decorHigh`**

Lines ~266–272:

```js
      D(decorHigh, 0.3, 0.04, 0.22, plasterMat(0xf5f5f0), -13.5, 0.81, -13.6);
      D(decorHigh, 0.28, 0.03, 0.2, plasterMat(0xf0eed8), -13.5, 0.84, -13.6);
      D(decorHigh, 0.3, 0.04, 0.22, plasterMat(0xf5f5f0), 14.3, 0.81, -14.3);

      Cyl(decorHigh, 0.04, 0.04, 0.1, 8, plasterMat(0xffffff), -10.6, 0.84, -13.7);
      Cyl(decorHigh, 0.04, 0.04, 0.1, 8, plasterMat(0xc62828),  14.4, 0.84,  13.7);
```

- [ ] **Step 4: Move trash bins and fire extinguisher into `decorHigh`**

Lines ~275–280:

```js
      Cyl(decorHigh, 0.2, 0.18, 0.4, 8, metalMat(0x555555), -16, 0.2, -15);
      Cyl(decorHigh, 0.2, 0.18, 0.4, 8, metalMat(0x555555),  16, 0.2,  15);

      Cyl(decorHigh, 0.08, 0.08, 0.35, 8, fabricMat(0xd32f2f), -19.6, 1.2, -5);
      D(decorHigh, 0.12, 0.18, 0.06, metalMat(0x222222), -19.6, 1.5, -5);
```

- [ ] **Step 5: Move air vent grilles into `decorHigh`**

Lines ~289–291:

```js
      D(decorHigh, 0.8, 0.03, 0.5, metalMat(0x666666), -5, 5.73, -5);
      D(decorHigh, 0.8, 0.03, 0.5, metalMat(0x666666),  5, 5.73,  5);
      D(decorHigh, 0.8, 0.03, 0.5, metalMat(0x666666), 15, 5.73,-15);
```

- [ ] **Step 6: Move wall clock + hands into `decorHigh`**

Lines ~294–297:

```js
      Cyl(decorHigh, 0.25, 0.25, 0.04, 16, plasterMat(0xfafafa), 0, 4.0, -19.9);
      Cyl(decorHigh, 0.02, 0.02, 0.03, 4, darkMetal,             0, 4.0, -19.85);
      D(decorHigh, 0.01, 0.1, 0.02, darkMetal, 0,    4.05, -19.85);
      D(decorHigh, 0.08, 0.01, 0.02, darkMetal, 0.04, 4.0, -19.85);
```

- [ ] **Step 7: Move wet floor sign into `decorHigh`**

Lines ~300–301:

```js
      D(decorHigh, 0.4, 0.6, 0.02, emissiveMat(0xffeb3b, 0xffff00, 0.3), 3, 0.3, -3);
      D(decorHigh, 0.35, 0.02, 0.2, metalMat(0x333333), 3, 0.01, -3);
```

- [ ] **Step 8: Move floor scuff marks and outlet plates into `decorHigh`**

Lines ~304–311:

```js
      D(decorHigh, 2.0, 0.005, 0.3, floorMat(0x555555),  -8, 0.006,   0);
      D(decorHigh, 0.3, 0.005, 1.5, floorMat(0x555555),   5, 0.006, -15);
      D(decorHigh, 1.8, 0.005, 0.25, floorMat(0x555555), 12, 0.006,   8);

      D(decorHigh, 0.08, 0.12, 0.02, plasterMat(0xe0e0e0), -19.8, 0.4, -12);
      D(decorHigh, 0.08, 0.12, 0.02, plasterMat(0xe0e0e0),  19.8, 0.4,  12);
      D(decorHigh, 0.08, 0.12, 0.02, plasterMat(0xe0e0e0), -19.8, 0.4,   8);
```

- [ ] **Step 9: Move sprinkler heads into `decorHigh`**

Lines ~314–316:

```js
      Cyl(decorHigh, 0.03, 0.05, 0.06, 6, metalMat(0xcccccc), -10, 5.7,  0);
      Cyl(decorHigh, 0.03, 0.05, 0.06, 6, metalMat(0xcccccc),  10, 5.7,  0);
      Cyl(decorHigh, 0.03, 0.05, 0.06, 6, metalMat(0xcccccc),   0, 5.7, 10);
```

- [ ] **Step 10: Move pen cup + pencil and coat hooks into `decorHigh`**

Lines ~319–324:

```js
      Cyl(decorHigh, 0.04, 0.04, 0.1, 6, metalMat(0x333333), -14.2, 0.84, -13.5);
      D(decorHigh, 0.01, 0.06, 0.01, woodMat(0xdaa520), -14.2, 0.92, -13.5);

      D(decorHigh, 0.04, 0.04, 0.08, metalMat(0x888888), -19.7, 1.8, 5);
      D(decorHigh, 0.04, 0.04, 0.08, metalMat(0x888888), -19.7, 1.8, 6);
```

- [ ] **Step 11: Move wall reliefs, floor detail, and ceiling detail into `decorHigh`**

Lines ~327–331:

```js
      WR(decorHigh, 12, 6, 0.5, plaster, -8, 3, -8, { style: 'panel' });
      WR(decorHigh,  8, 6, 0.5, plaster, 12, 3,  0, { style: 'panel' });
      FD(decorHigh,  6, 6, grayFloor, 0, 0, -15, { style: 'cracked_tile' });
      CD(decorHigh, 10, 10, grayFloor, 0, 5.7,   0, { style: 'panels' });
      CD(decorHigh,  6,  6, grayFloor, 15, 5.7, -15, { style: 'pipes' });
```

- [ ] **Step 12: Add `decorHigh` to scene and tier-gate it**

After the existing `scene.add(decorProps);` and `H.tierGated(decorProps, 2);` lines at the end of `build`, before `return walls;`:

```js
      scene.add(decorHigh);
      H.tierGated(decorHigh, 4);

      return walls;
```

- [ ] **Step 13: Run the decor-high test for Office**

Run: `npm test -- tests/integration/tier-gated-decor-high.test.js`
Expected: Office now passes all 3 assertions; Warehouse still fails.

- [ ] **Step 14: Run the existing tier-gating cross-map test**

Run: `npm test -- tests/integration/tier-gating.test.js`
Expected: PASS — Office wall counts identical across levels, both `decorProps` (level 2) and `decorHigh` (level 4) toggle correctly.

- [ ] **Step 15: Commit**

```bash
git add js/maps/office.js
git commit -m "perf(maps/office): gate decorative geometry to High+ via decorHigh group"
```

---

## Task 6: Office — gate ceiling point lights at level 4

**Files:**
- Modify: `js/maps/office.js` (the inner `addCeilingLight` function around lines 249–252)

- [ ] **Step 1: Create `tests/integration/tier-gated-lights.test.js` with failing assertions**

```js
// tests/integration/tier-gated-lights.test.js
import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/core/quality.js');
  loadModule('js/maps/shared.js');
  loadModule('js/maps/props.js');
  loadModule('js/maps/office.js');
  loadModule('js/maps/warehouse.js');
});

// Indoor maps may use dynamic point lights (per docs/gotchas.md #8), but the
// 2026-05-10 spec gates every Office and Warehouse PointLight to level 4 so
// that Medium-and-below loses the per-fragment light-loop cost.
describe('indoor map dynamic point lights are tier-gated at level 4', () => {
  ['Office', 'Warehouse'].forEach(function(name) {
    it(name + ': every PointLight has userData.minQualityLevel === 4', function() {
      var idx = -1;
      for (var i = 0; i < GAME._maps.length; i++) {
        if (GAME._maps[i].name === name) { idx = i; break; }
      }
      expect(idx).toBeGreaterThanOrEqual(0);

      GAME.quality = { level: 5 };
      var scene = new THREE.Scene();
      var origScene = GAME.scene;
      GAME.scene = scene;
      GAME._maps[idx].build(scene);
      GAME.scene = origScene;

      var pointLights = [];
      scene.traverse(function(o) {
        if (o.isLight && typeof o.distance === 'number') {
          pointLights.push(o);
        }
      });

      expect(pointLights.length).toBeGreaterThan(0);
      pointLights.forEach(function(pl) {
        expect(pl.userData && pl.userData.minQualityLevel).toBe(4);
      });
    });
  });
});
```

- [ ] **Step 2: Run the test and verify it fails for Office and Warehouse**

Run: `npm test -- tests/integration/tier-gated-lights.test.js`
Expected: Both FAIL — current `PointLight`s have no `userData.minQualityLevel`.

- [ ] **Step 3: Modify the inner `addCeilingLight` helper in `office.js`**

Find the helper (lines ~249–252):

```js
      function addCeilingLight(x, z) {
        D(scene, 1.5, 0.06, 0.15, emissiveMat(0xffffff, 0xeeeeff, 2.0), x, 5.72, z);
        addPointLight(scene, 0xeeeeff, 1.2, 26, x, 5.6, z);
      }
```

Replace with:

```js
      function addCeilingLight(x, z) {
        D(scene, 1.5, 0.06, 0.15, emissiveMat(0xffffff, 0xeeeeff, 2.0), x, 5.72, z);
        var pl = addPointLight(scene, 0xeeeeff, 1.2, 26, x, 5.6, z);
        H.tierGatedLight(pl, 4);
      }
```

(The 9 calls to `addCeilingLight(x, z)` below this helper need no change — they pick up the gating automatically.)

- [ ] **Step 4: Run the lights test for Office**

Run: `npm test -- tests/integration/tier-gated-lights.test.js`
Expected: Office PASSES; Warehouse still FAILS.

- [ ] **Step 5: Run the existing tier-gating cross-map test**

Run: `npm test -- tests/integration/tier-gating.test.js`
Expected: PASS — Office's gated lights toggle intensity 0/orig correctly when level changes.

- [ ] **Step 6: Commit**

```bash
git add js/maps/office.js tests/integration/tier-gated-lights.test.js
git commit -m "perf(maps/office): tier-gate 9 fluorescent ceiling lights to High+"
```

---

## Task 7: Warehouse — create `decorHigh` group, move decoration into it

**Files:**
- Modify: `js/maps/warehouse.js`

- [ ] **Step 1: Declare `decorHigh` near the top of `build`**

Find the existing block at the start of `build`:

```js
build: function(scene) {
  var walls = [];
  var darkConcrete = warehouseFloorMat(0x808080);
```

Insert after `var walls = [];`:

```js
      var decorHigh = new THREE.Group();
```

- [ ] **Step 2: Move floor markings (loading-zone lines) into `decorHigh`**

Lines ~96–98:

```js
      D(decorHigh, 8,    0.02, 0.15, emissiveMat(0xcccc00, 0xffff00, 0.3), -20, 0.01,  0);
      D(decorHigh, 0.15, 0.02, 12,   emissiveMat(0xcccc00, 0xffff00, 0.3), -24, 0.01,  0);
      D(decorHigh, 0.15, 0.02, 12,   emissiveMat(0xcccc00, 0xffff00, 0.3), -16, 0.01,  0);
```

- [ ] **Step 3: Move wall panel seams, cable trays, and rivet dots into `decorHigh`**

Lines ~110–133. The `for` loops change `D(scene, …)` → `D(decorHigh, …)`:

```js
      for (var si = -3; si <= 3; si++) {
        D(decorHigh, 0.04, wallH, 0.1, darkMetalMat(0x444444), si * 8, wallH/2, -25.2);
        D(decorHigh, 0.04, wallH, 0.1, darkMetalMat(0x444444), si * 8, wallH/2,  25.2);
      }
      for (var si2 = -2; si2 <= 2; si2++) {
        D(decorHigh, 0.1, wallH, 0.04, darkMetalMat(0x444444), -30.2, wallH/2, si2 * 8);
        D(decorHigh, 0.1, wallH, 0.04, darkMetalMat(0x444444),  30.2, wallH/2, si2 * 8);
      }
      D(decorHigh, 0.15, 0.08, 30, metalMat(0x5a5a5a), -29.8, 5,    0);
      D(decorHigh, 0.04, 0.15, 30, metalMat(0x4a4a4a), -29.8, 5.07, 0);
      D(decorHigh, 0.15, 0.08, 30, metalMat(0x5a5a5a),  29.8, 5,    0);

      for (var ri = -3; ri <= 3; ri++) {
        D(decorHigh, 0.08, 0.08, 0.12, metalMat(0x666666), ri * 8, 5, -25.22);
        D(decorHigh, 0.08, 0.08, 0.12, metalMat(0x666666), ri * 8, 5,  25.22);
      }
      for (var ri2 = -2; ri2 <= 2; ri2++) {
        D(decorHigh, 0.12, 0.08, 0.08, metalMat(0x666666), -30.22, 5, ri2 * 8);
        D(decorHigh, 0.12, 0.08, 0.08, metalMat(0x666666),  30.22, 5, ri2 * 8);
      }
```

- [ ] **Step 4: Move blue container surface details into `decorHigh`**

Lines ~140–158 (NOT line 137, the body `B(scene, walls, …)` stays):

```js
      D(decorHigh, 0.1, 3.3, 2.8, metalDark, -14, 1.75, -8);
      for (var ci = 0; ci < 6; ci++) {
        D(decorHigh, 12.05, 0.08, 0.02, metalMat(0x1255a0), -8, 0.5 + ci * 0.5, -6.48);
        D(decorHigh, 12.05, 0.08, 0.02, metalMat(0x1255a0), -8, 0.5 + ci * 0.5, -9.52);
      }
      D(decorHigh, 0.06, 2.8, 0.08, darkMetalMat(0x333333), -14.06, 1.75, -7.3);
      D(decorHigh, 0.06, 2.8, 0.08, darkMetalMat(0x333333), -14.06, 1.75, -8.7);
      D(decorHigh, 0.15, 0.15, 0.08, metalMat(0x555555), -14.06, 1.75, -8);
      D(decorHigh, 0.15, 1.5, 0.02, crateMat(0x8b4513),  -6, 2.5, -6.48);
      D(decorHigh, 0.1,  1.8, 0.02, crateMat(0x7a3a0a), -10, 2.8, -9.52);
      D(decorHigh, 0.8,  0.4, 0.02, plasterMat(0xdddddd), -5, 3.0, -6.48);
      D(decorHigh, 12.1, 0.06, 0.06, metalMat(0x1050a0), -8,    3.53, -6.47);
      D(decorHigh, 12.1, 0.06, 0.06, metalMat(0x1050a0), -8,    3.53, -9.53);
      D(decorHigh, 0.06, 0.06, 3.06, metalMat(0x1050a0), -14.03, 3.53, -8);
      D(decorHigh, 0.06, 0.06, 3.06, metalMat(0x1050a0),  -1.97, 3.53, -8);
```

- [ ] **Step 5: Move green container surface details into `decorHigh`**

Lines ~161–176 (NOT line 160, the body stays):

```js
      D(decorHigh, 0.1, 2.8, 2.8, metalDark, 14, 1.5, 12);
      for (var ci2 = 0; ci2 < 5; ci2++) {
        D(decorHigh, 8.05, 0.08, 0.02, metalMat(0x276d2a), 10, 0.4 + ci2 * 0.5, 10.48);
        D(decorHigh, 8.05, 0.08, 0.02, metalMat(0x276d2a), 10, 0.4 + ci2 * 0.5, 13.52);
      }
      D(decorHigh, 0.06, 2.3, 0.08, darkMetalMat(0x333333), 14.06, 1.5, 11.3);
      D(decorHigh, 0.06, 2.3, 0.08, darkMetalMat(0x333333), 14.06, 1.5, 12.7);
      D(decorHigh, 0.15, 0.15, 0.08, metalMat(0x555555),    14.06, 1.5, 12);
      D(decorHigh, 0.15, 1.2, 0.02, crateMat(0x7a3a0a),  8, 2.2, 10.48);
      D(decorHigh, 0.8,  0.4, 0.02, plasterMat(0xdddddd), 12, 2.5, 10.48);
      D(decorHigh, 8.1,  0.06, 0.06, metalMat(0x206a28), 10,    3.03, 10.47);
      D(decorHigh, 8.1,  0.06, 0.06, metalMat(0x206a28), 10,    3.03, 13.53);
      D(decorHigh, 0.06, 0.06, 3.06, metalMat(0x206a28), 14.03, 3.03, 12);
      D(decorHigh, 0.06, 0.06, 3.06, metalMat(0x206a28),  5.97, 3.03, 12);
```

- [ ] **Step 6: Move red container surface details into `decorHigh`**

Lines ~179–190 (NOT line 178, the body stays):

```js
      for (var ci3 = 0; ci3 < 5; ci3++) {
        D(decorHigh, 10.05, 0.08, 0.02, metalMat(0xc83a12), -15, 0.4 + ci3 * 0.5,  8.48);
        D(decorHigh, 10.05, 0.08, 0.02, metalMat(0xc83a12), -15, 0.4 + ci3 * 0.5, 11.52);
      }
      D(decorHigh, 0.15, 1.5, 0.02, crateMat(0x7a3a0a),    -12, 2.3,  8.48);
      D(decorHigh, 0.8,  0.4, 0.02, plasterMat(0xdddddd),  -18, 2.5, 11.52);
      D(decorHigh, 10.1, 0.06, 0.06, metalMat(0xb83010), -15,    3.03,  8.47);
      D(decorHigh, 10.1, 0.06, 0.06, metalMat(0xb83010), -15,    3.03, 11.53);
      D(decorHigh, 0.06, 0.06, 3.06, metalMat(0xb83010), -20.03, 3.03, 10);
      D(decorHigh, 0.06, 0.06, 3.06, metalMat(0xb83010),  -9.97, 3.03, 10);
```

- [ ] **Step 7: Move forklift detail (NOT body) and shelf items into `decorHigh`**

Lines ~208–211 (forklift detail, NOT line 207 body):

```js
      D(decorHigh, 1.0, 2.0, 0.15, metalMat(0x333333), -20, 1.5, -16.2);
      D(decorHigh, 1.2, 0.1, 1.5, metalMat(0x555555),  -20, 0.6, -13.5);
      D(decorHigh, 0.5, 0.5, 0.15, metalMat(0x222222), -20.6, 0.3, -15.8);
      D(decorHigh, 0.5, 0.5, 0.15, metalMat(0x222222), -19.4, 0.3, -15.8);
```

Lines ~223–225 (shelf items, NOT lines 216–221 uprights/boards):

```js
      D(decorHigh, 0.5, 0.4, 0.5, rustOrange,           -27, 1.74, -9);
      D(decorHigh, 0.5, 0.5, 0.5, crateMat(0xe65100),   -27, 1.79, -7);
      D(decorHigh, 0.5, 0.3, 0.5, shippingBlue,         -27, 1.69, -4);
```

- [ ] **Step 8: Move the 3rd-floor glass window into `decorHigh`**

Line ~292:

```js
      D(decorHigh, 2, 2, 0.08, glassMat(0x88ccff), 23, F3 + 1.5, 14.15);
```

- [ ] **Step 9: Move oil stains, safety signs, fire-exit signs, and caution tape into `decorHigh`**

Lines ~332–349:

```js
      D(decorHigh, 2.5, 0.005, 1.8, floorMat(0x2a2a2a), -20, 0.003, -12);
      D(decorHigh, 1.5, 0.005, 2.0, floorMat(0x333333),   5, 0.003,   5);
      D(decorHigh, 1.0, 0.005, 1.2, floorMat(0x2e2e2e),  -8, 0.003,  15);

      D(decorHigh, 0.8, 0.6,  0.05, emissiveMat(0xffeb3b, 0xffff00, 0.2), -30.2, 3.5, -15);
      D(decorHigh, 0.8, 0.6,  0.05, emissiveMat(0xffeb3b, 0xffff00, 0.2),  30.2, 3.5,  10);
      D(decorHigh, 0.8, 0.08, 0.06, fabricMat(0x222222), -30.2, 3.2, -15);
      D(decorHigh, 0.8, 0.08, 0.06, fabricMat(0x222222),  30.2, 3.2,  10);

      D(decorHigh, 0.6, 0.3, 0.05, emissiveMat(0x2e7d32, 0x00ff44, 0.8), -30.2, 5.5, 0);
      D(decorHigh, 0.6, 0.3, 0.05, emissiveMat(0x2e7d32, 0x00ff44, 0.8),   0,  wallH - 2, -25.2);

      D(decorHigh, 8, 0.01, 0.12, emissiveMat(0xffeb3b, 0xffff00, 0.3), -20, 0.007, -6);
      D(decorHigh, 8, 0.01, 0.12, emissiveMat(0xffeb3b, 0xffff00, 0.3), -20, 0.007,  6);
```

- [ ] **Step 10: Move tool rack into `decorHigh`**

Lines ~352–360:

```js
      D(decorHigh, 2.0, 0.08, 0.15, metalMat(0x666666), -29.5, 2.5, 8);
      D(decorHigh, 0.05, 0.2, 0.08, metalMat(0x999999), -29.5, 2.3, 7.3);
      D(decorHigh, 0.05, 0.2, 0.08, metalMat(0x999999), -29.5, 2.3, 8.0);
      D(decorHigh, 0.05, 0.2, 0.08, metalMat(0x999999), -29.5, 2.3, 8.7);
      D(decorHigh, 0.04, 0.25, 0.02, metalMat(0x888888), -29.5, 2.05, 7.3);
      D(decorHigh, 0.03, 0.3,  0.03, woodMat(0x8b6914), -29.5, 2.0, 8.0);
      D(decorHigh, 0.08, 0.06, 0.03, metalMat(0x555555), -29.5, 1.85, 8.0);
```

- [ ] **Step 11: Move broken pallet, cones, clipboard, rope coil, and stencils into `decorHigh`**

Broken pallet (lines ~374–376):

```js
      D(decorHigh, 1.5, 0.05, 0.15, palletMat, 15,   0.025, -20);
      D(decorHigh, 1.2, 0.05, 0.15, palletMat, 15.3, 0.025, -19.5);
      D(decorHigh, 0.8, 0.05, 0.15, palletMat, 14.8, 0.025, -19);
```

Cones (lines ~382–385):

```js
      Cyl(decorHigh, 0.02, 0.18, 0.5, 8, fabricMat(0xff6600), -24, 0.25, -8);
      Cyl(decorHigh, 0.2,  0.2, 0.03, 8, metalMat(0x333333),  -24, 0.015, -8);
      Cyl(decorHigh, 0.02, 0.18, 0.5, 8, fabricMat(0xff6600), -16, 0.25, -8);
      Cyl(decorHigh, 0.2,  0.2, 0.03, 8, metalMat(0x333333),  -16, 0.015, -8);
```

Clipboard, number stencils, rope coil (lines ~388–397):

```js
      D(decorHigh, 0.2,  0.3, 0.02, woodMat(0xb08850),  0.4, 2.6, 0.6);
      D(decorHigh, 0.16, 0.22, 0.01, plasterMat(0xf5f5f0), 0.4, 2.62, 0.59);

      D(decorHigh, 0.6, 0.3, 0.02, plasterMat(0xdddddd), -8, 2.5, -6.48);
      D(decorHigh, 0.6, 0.3, 0.02, plasterMat(0xdddddd), 10, 2.2, 10.48);

      Cyl(decorHigh, 0.3,  0.3, 0.08, 12, woodMat(0xb8860b), 25, 0.04, 10);
      Cyl(decorHigh, 0.15, 0.15, 0.1, 12, floorMat(0x404040), 25, 0.05, 10);
```

- [ ] **Step 12: Move ceiling details (pipes + obs-room beams) into `decorHigh`**

Lines ~401–402:

```js
      CD(decorHigh, 20, 15, conc, -5, wallH - 0.5, 0,  { style: 'pipes' });
      CD(decorHigh, 10, 10, conc, 23, F3 + 2.8,    19, { style: 'beams' });
```

(`FD(scene, 12, 12, darkConcrete, 22, F2, -8, { style: 'worn_plank' });` at line 400 STAYS on `scene` — it sits on the 2nd-floor catwalk surface and reads as the catwalk floor pattern, structurally important.)

- [ ] **Step 13: Add `decorHigh` to scene and tier-gate it**

Just before `return walls;` at the end of `build`:

```js
      scene.add(decorHigh);
      H.tierGated(decorHigh, 4);

      return walls;
```

- [ ] **Step 14: Run the decor-high test for Warehouse**

Run: `npm test -- tests/integration/tier-gated-decor-high.test.js`
Expected: All three maps now PASS.

- [ ] **Step 15: Run the existing tier-gating cross-map test**

Run: `npm test -- tests/integration/tier-gating.test.js`
Expected: PASS — Warehouse wall counts identical across all levels.

- [ ] **Step 16: Commit**

```bash
git add js/maps/warehouse.js
git commit -m "perf(maps/warehouse): gate decorative geometry to High+ via decorHigh group"
```

---

## Task 8: Warehouse — gate fill point lights at level 4

**Files:**
- Modify: `js/maps/warehouse.js` (around lines 317–327)

- [ ] **Step 1: Wrap each `addPointLight` call with `H.tierGatedLight(…, 4)`**

Find the existing block (lines ~317–327):

```js
      // 3rd floor room light
      addPointLight(scene, 0xeef2ff, 1.0, 14, 23, F3 + 2.5, 19);

      // Ground-level fill lights — bright daylight bounce (consolidated)
      addPointLight(scene, 0xe8f0ff, 1.4, 40, -10, 4, 0);
      addPointLight(scene, 0xe8f0ff, 1.4, 40, 10, 4, -10);
      addPointLight(scene, 0xe8f0ff, 1.2, 35, -15, 4, 12);
      // Under east platform + stairwell (consolidated)
      addPointLight(scene, 0xe8f0ff, 1.0, 28, 22, 2, -8);
      addPointLight(scene, 0xeef2ff, 0.8, 15, 25, F2 + 2, 9);
      // 2nd floor platform lighting (consolidated)
      addPointLight(scene, 0xe8f0ff, 1.0, 25, 10, F2 + 2, 0);
```

Replace with:

```js
      // 3rd floor room light
      H.tierGatedLight(addPointLight(scene, 0xeef2ff, 1.0, 14, 23, F3 + 2.5, 19), 4);

      // Ground-level fill lights — bright daylight bounce (consolidated)
      H.tierGatedLight(addPointLight(scene, 0xe8f0ff, 1.4, 40, -10, 4,   0), 4);
      H.tierGatedLight(addPointLight(scene, 0xe8f0ff, 1.4, 40,  10, 4, -10), 4);
      H.tierGatedLight(addPointLight(scene, 0xe8f0ff, 1.2, 35, -15, 4,  12), 4);
      // Under east platform + stairwell (consolidated)
      H.tierGatedLight(addPointLight(scene, 0xe8f0ff, 1.0, 28, 22, 2,    -8), 4);
      H.tierGatedLight(addPointLight(scene, 0xeef2ff, 0.8, 15, 25, F2 + 2, 9), 4);
      // 2nd floor platform lighting (consolidated)
      H.tierGatedLight(addPointLight(scene, 0xe8f0ff, 1.0, 25, 10, F2 + 2, 0), 4);
```

- [ ] **Step 2: Run the lights test**

Run: `npm test -- tests/integration/tier-gated-lights.test.js`
Expected: Both Office and Warehouse PASS.

- [ ] **Step 3: Run the existing tier-gating cross-map test**

Run: `npm test -- tests/integration/tier-gating.test.js`
Expected: PASS — Warehouse's gated lights toggle intensity 0/orig correctly.

- [ ] **Step 4: Commit**

```bash
git add js/maps/warehouse.js
git commit -m "perf(maps/warehouse): tier-gate 7 dynamic point lights to High+"
```

---

## Task 9: Run full test suite and visual sanity check

**Files:** none modified.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: All tests PASS — including the new `tier-gated-decor-high.test.js`, new `tier-gated-lights.test.js`, existing `tier-gating.test.js`, `outdoor-maps-no-dynamic-lights.test.js`, `map-material-validity.test.js`, and `map-loading.test.js`.

- [ ] **Step 2: Visual sanity check at Medium tier**

Open `index.html` in a browser. Start a match. In the dev console, force the renderer to Medium and reapply tier visibility:

```js
GAME.quality.update = function(){};             // disable adaptive updates
var ml = 3;                                      // Medium is index 3 in LEVELS
GAME.quality.LEVELS[ml];                         // sanity-check it says Medium
GAME.quality._currentLevel = ml;                 // (private — read-only via getter, set directly)
GAME._reapplyAllTierVisibility();                // applies the new gates
GAME._dirLight && (GAME._dirLight.castShadow = GAME.quality.LEVELS[ml].shadows);
```

If `GAME.quality._currentLevel` is not directly settable from the console (it's a closure-scoped `var`), instead temporarily change `_currentLevel = 5;` to `_currentLevel = 3;` at the top of `init` in `js/core/quality.js`, reload, walk the maps, then revert the file.

Walk each of Aztec, Office, and Warehouse at Medium. Confirm:
- **Aztec:** river still reads as water (opaque tinted, no refraction); no soft vegetation; perimeter walls bare of moss/vines/reliefs; rope bridge planks gone (base box still walkable). Trees, rocks, pillars, temple structure, corridor doors, courtyard walls all visible as expected.
- **Office:** desks/chairs/walls/cabinets all present; floor flat (no scuffs/cracked tile); ceiling bare (no smoke detectors / vents / sprinklers / panels / pipes); flatter lit interior (point lights off); existing decorProps content visible (since gated at level 2, not 4).
- **Warehouse:** containers visible as solid colored boxes (no corrugation/lip edges); walls bare (no seams/rivets/cable trays); no fill lighting (relying on hemi+ambient+sun); catwalks/stairs/obs room all walkable; pallets/barrels/forklift body/shelves all present; obs room window gap visible without glass.

- [ ] **Step 3: Visual sanity check at High tier**

Force the renderer to High (level 4) and walk the same three maps. Confirm full decoration is back: Aztec vines/water/reliefs, Office detector/vents/clock/lights, Warehouse container detail/seams/lights.

If any visual breaks (e.g., a wall reads as too plain at Medium and needs a `WR` call moved back out of `decorHigh`), revise the relevant Task and re-run that task's tests + the cross-map invariants.

- [ ] **Step 4: Final commit if any tweaks were needed in Step 2 or 3**

If no tweaks needed, no commit. Otherwise:

```bash
git add js/maps/<file>.js
git commit -m "tweak(maps/<map>): keep <item> permanent after visual review"
```
