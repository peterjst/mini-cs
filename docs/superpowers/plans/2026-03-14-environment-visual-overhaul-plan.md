# Environment Visual Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all blocky Minecraft-like environmental geometry across all 7 maps with high-fidelity procedural props and detailed surface treatments.

**Architecture:** New `js/maps/props.js` module exposes `GAME._props` with biome-parameterized generator functions (Tree, Rock, Barrel, etc.) that produce detailed Three.js Groups. Maps call generators instead of raw `D()`/`Cyl()` calls. Surface detail helpers added to `shared.js`.

**Tech Stack:** Three.js r160.1 (global `THREE`), IIFE module pattern, Vitest tests

**Spec:** `docs/superpowers/specs/2026-03-13-environment-visual-overhaul-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `js/maps/props.js` | Create | Prop generator library — PRNG, vertex displacement, material cache, all generators |
| `js/maps/shared.js` | Modify | Add `WallRelief()`, `FloorDetail()`, `CeilingDetail()` surface helpers |
| `js/maps/aztec.js` | Modify | Replace blocky props with generator calls, add surface detail |
| `js/maps/dust.js` | Modify | Replace blocky props with generator calls, add surface detail |
| `js/maps/italy.js` | Modify | Replace blocky props with generator calls, add surface detail |
| `js/maps/office.js` | Modify | Replace blocky props with generator calls, add surface detail |
| `js/maps/warehouse.js` | Modify | Replace blocky props with generator calls, add surface detail |
| `js/maps/bloodstrike.js` | Modify | Replace blocky props with generator calls, add surface detail |
| `js/maps/arena.js` | Modify | Replace blocky props with generator calls, add surface detail |
| `index.html` | Modify | Add `<script src="js/maps/props.js">` after shared.js |
| `tests/unit/props.test.js` | Create | Unit tests for props module — utilities, generators, material cache |
| `tests/integration/map-loading.test.js` | Modify | Add props.js to load chain |
| `REQUIREMENTS.md` | Modify | Document prop library and all generator types |

---

**Standing rule for all tasks:** Per CLAUDE.md, update `REQUIREMENTS.md` in every commit that changes product code. Document new generators, their signatures, styles, and materials. This applies to every task below — include `REQUIREMENTS.md` in every `git add` command.

---

## Chunk 1: Foundation & Vegetation

### Task 1: Props Module Foundation

**Files:**
- Create: `js/maps/props.js`
- Modify: `index.html:1758-1759` (add script tag)
- Create: `tests/unit/props.test.js`

- [ ] **Step 1: Write failing tests for foundation utilities**

```js
// tests/unit/props.test.js
import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/maps/props.js');
});

describe('props module foundation', () => {
  it('GAME._props should exist', () => {
    expect(GAME._props).toBeDefined();
  });

  it('seeded PRNG should be deterministic', () => {
    var rng1 = GAME._props._test.seededRng(42);
    var rng2 = GAME._props._test.seededRng(42);
    var a = [rng1(), rng1(), rng1()];
    var b = [rng2(), rng2(), rng2()];
    expect(a).toEqual(b);
  });

  it('seeded PRNG should produce values in [0, 1)', () => {
    var rng = GAME._props._test.seededRng(123);
    for (var i = 0; i < 100; i++) {
      var v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds should produce different sequences', () => {
    var rng1 = GAME._props._test.seededRng(1);
    var rng2 = GAME._props._test.seededRng(2);
    var same = true;
    for (var i = 0; i < 10; i++) {
      if (rng1() !== rng2()) same = false;
    }
    expect(same).toBe(false);
  });

  it('displaceVertices should modify geometry positions', () => {
    var geo = new THREE.IcosahedronGeometry(1, 2);
    var originalPositions = new Float32Array(geo.attributes.position.array);
    GAME._props._test.displaceVertices(geo, 0.3, 42, 'normal');
    var changed = false;
    for (var i = 0; i < originalPositions.length; i++) {
      if (originalPositions[i] !== geo.attributes.position.array[i]) {
        changed = true;
        break;
      }
    }
    expect(changed).toBe(true);
  });

  it('displaceVertices should be deterministic with same seed', () => {
    var geo1 = new THREE.IcosahedronGeometry(1, 2);
    var geo2 = new THREE.IcosahedronGeometry(1, 2);
    GAME._props._test.displaceVertices(geo1, 0.3, 42, 'normal');
    GAME._props._test.displaceVertices(geo2, 0.3, 42, 'normal');
    for (var i = 0; i < geo1.attributes.position.array.length; i++) {
      expect(geo1.attributes.position.array[i]).toBe(geo2.attributes.position.array[i]);
    }
  });

  it('material cache should return same material for same key', () => {
    var cache = GAME._props._test.matCache;
    var m1 = cache.get('bark_dark');
    var m2 = cache.get('bark_dark');
    expect(m1).toBe(m2);
  });

  it('material cache should have all expected categories', () => {
    var cache = GAME._props._test.matCache;
    // Spot-check a few materials from different categories
    expect(cache.get('bark_dark')).toBeDefined();
    expect(cache.get('leaf_dark')).toBeDefined();
    expect(cache.get('stone_grey')).toBeDefined();
    expect(cache.get('metal_rusted')).toBeDefined();
    expect(cache.get('burlap')).toBeDefined();
    expect(cache.get('terracotta')).toBeDefined();
    expect(cache.get('water_surface')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/props.test.js`
Expected: FAIL — `js/maps/props.js` does not exist

- [ ] **Step 3: Write props.js foundation — IIFE scaffold, PRNG, vertex displacement, material cache**

```js
// js/maps/props.js
(function() {
  'use strict';
  if (!window.GAME) window.GAME = {};
  var H = GAME._mapHelpers;
  var shadow = H.shadow || function(m) { m.castShadow = true; m.receiveShadow = true; return m; };

  // ── Seeded PRNG (mulberry32) ──────────────────────────────
  function seededRng(seed) {
    var s = seed | 0;
    return function() {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── Vertex Displacement ───────────────────────────────────
  function displaceVertices(geometry, amount, seed, direction) {
    direction = direction || 'normal';
    var pos = geometry.attributes.position;
    var nor = geometry.attributes.normal;
    if (direction === 'normal' && !nor) {
      geometry.computeVertexNormals();
      nor = geometry.attributes.normal;
    }
    var rng = seededRng(seed);
    for (var i = 0; i < pos.count; i++) {
      var d = (rng() - 0.5) * 2 * amount;
      if (direction === 'normal') {
        pos.setX(i, pos.getX(i) + nor.getX(i) * d);
        pos.setY(i, pos.getY(i) + nor.getY(i) * d);
        pos.setZ(i, pos.getZ(i) + nor.getZ(i) * d);
      } else if (direction === 'y') {
        pos.setY(i, pos.getY(i) + d);
      } else if (direction === 'random') {
        pos.setX(i, pos.getX(i) + (rng() - 0.5) * 2 * amount);
        pos.setY(i, pos.getY(i) + (rng() - 0.5) * 2 * amount);
        pos.setZ(i, pos.getZ(i) + (rng() - 0.5) * 2 * amount);
      }
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }

  // ── Material Cache ────────────────────────────────────────
  var _materials = {};
  var matDefs = {
    // Wood
    bark_dark:      function() { return new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.92, metalness: 0 }); },
    bark_light:     function() { return new THREE.MeshStandardMaterial({ color: 0x5a4a2a, roughness: 0.88, metalness: 0 }); },
    plank_oak:      function() { return new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.82, metalness: 0 }); },
    plank_pine:     function() { return new THREE.MeshStandardMaterial({ color: 0xb08850, roughness: 0.80, metalness: 0 }); },
    plank_weathered:function() { return new THREE.MeshStandardMaterial({ color: 0x7a7a6a, roughness: 0.95, metalness: 0 }); },
    // Foliage
    leaf_dark:      function() { return new THREE.MeshStandardMaterial({ color: 0x2a5a1a, roughness: 0.65, metalness: 0 }); },
    leaf_mid:       function() { return new THREE.MeshStandardMaterial({ color: 0x3d7a2e, roughness: 0.60, metalness: 0 }); },
    leaf_light:     function() { return new THREE.MeshStandardMaterial({ color: 0x5a9a3a, roughness: 0.55, metalness: 0 }); },
    leaf_tropical:  function() { return new THREE.MeshStandardMaterial({ color: 0x2a8a1a, roughness: 0.50, metalness: 0 }); },
    leaf_dry:       function() { return new THREE.MeshStandardMaterial({ color: 0x8a7a2a, roughness: 0.70, metalness: 0 }); },
    // Stone
    stone_grey:     function() { return new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.90, metalness: 0 }); },
    stone_mossy:    function() { return new THREE.MeshStandardMaterial({ color: 0x6a7a5a, roughness: 0.92, metalness: 0 }); },
    sandstone:      function() { return new THREE.MeshStandardMaterial({ color: 0xc0aa80, roughness: 0.88, metalness: 0 }); },
    temple_stone:   function() { return new THREE.MeshStandardMaterial({ color: 0x8a9a72, roughness: 0.95, metalness: 0 }); },
    cobble:         function() { return new THREE.MeshStandardMaterial({ color: 0x6a6a6a, roughness: 1.0, metalness: 0 }); },
    // Metal
    metal_rusted:   function() { return new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.55, metalness: 0.75 }); },
    metal_painted:  function() { return new THREE.MeshStandardMaterial({ color: 0x4a6a4a, roughness: 0.45, metalness: 0.70 }); },
    metal_clean:    function() { return new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.30, metalness: 0.90 }); },
    iron_band:      function() { return new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.40, metalness: 0.85 }); },
    // Fabric
    burlap:         function() { return new THREE.MeshStandardMaterial({ color: 0xb09a6a, roughness: 0.95, metalness: 0 }); },
    canvas_market:  function() { return new THREE.MeshStandardMaterial({ color: 0xd0c0a0, roughness: 0.92, metalness: 0 }); },
    cushion:        function() { return new THREE.MeshStandardMaterial({ color: 0x5a5a8a, roughness: 0.90, metalness: 0 }); },
    // Ceramic
    terracotta:     function() { return new THREE.MeshStandardMaterial({ color: 0xc07040, roughness: 0.60, metalness: 0 }); },
    tile_white:     function() { return new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.55, metalness: 0 }); },
    tile_broken:    function() { return new THREE.MeshStandardMaterial({ color: 0xc0b8a8, roughness: 0.70, metalness: 0 }); },
    // Water
    water_surface:  function() { return new THREE.MeshStandardMaterial({ color: 0x3a7aaa, roughness: 0.10, metalness: 0.2, transparent: true, opacity: 0.7 }); },
    puddle:         function() { return new THREE.MeshStandardMaterial({ color: 0x4a6a7a, roughness: 0.10, metalness: 0.1, transparent: true, opacity: 0.5 }); },
  };
  var matCache = {
    get: function(key) {
      if (!_materials[key]) {
        if (!matDefs[key]) return null;
        _materials[key] = matDefs[key]();
      }
      return _materials[key];
    }
  };

  // ── Petal materials (cached, not per-instance) ─────────────
  matDefs.petal_pink   = function() { return new THREE.MeshStandardMaterial({ color: 0xffaacc, roughness: 0.5, metalness: 0, side: THREE.DoubleSide }); };
  matDefs.petal_yellow = function() { return new THREE.MeshStandardMaterial({ color: 0xffdd66, roughness: 0.5, metalness: 0, side: THREE.DoubleSide }); };
  matDefs.petal_white  = function() { return new THREE.MeshStandardMaterial({ color: 0xfff5ee, roughness: 0.5, metalness: 0, side: THREE.DoubleSide }); };
  matDefs.petal_purple = function() { return new THREE.MeshStandardMaterial({ color: 0xcc88ff, roughness: 0.5, metalness: 0, side: THREE.DoubleSide }); };

  // ── Public API ────────────────────────────────────────────
  GAME._props = {
    // Generators will be added in subsequent tasks
    // displaceVertices exposed as public API for use by shared.js surface helpers
    displaceVertices: displaceVertices,
    _test: { seededRng: seededRng, displaceVertices: displaceVertices, matCache: matCache }
  };
})();
```

- [ ] **Step 4: Add script tag to index.html after shared.js**

In `index.html`, after line 1758 (`<script src="js/maps/shared.js"></script>`), add:
```html
<script src="js/maps/props.js"></script>
```

- [ ] **Step 5: Update integration test to load props.js**

In `tests/integration/map-loading.test.js`, add after the `loadModule('js/maps/shared.js')` line:
```js
loadModule('js/maps/props.js');
```

Also add `loadModule('js/maps/arena.js')` after `aztec.js`, add `'Arena'` to the `mapNames` array, and change the expected count from 6 to 7:
```js
it('should register 7 maps', () => {
  expect(GAME._maps.length).toBe(7);
});
var mapNames = ['Dust', 'Office', 'Warehouse', 'Bloodstrike', 'Italy', 'Aztec', 'Arena'];
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- tests/unit/props.test.js`
Expected: All PASS

- [ ] **Step 7: Run full test suite**

Run: `npm test`
Expected: All pass (existing tests unaffected, integration test now covers 7 maps)

- [ ] **Step 8: Update REQUIREMENTS.md**

Add a new section after the Build Helpers section documenting the props module:
- `js/maps/props.js` — Procedural prop generator library (`GAME._props`)
- Foundation utilities: seeded PRNG, `displaceVertices(geometry, amount, seed, direction)`, material cache
- List all generator function signatures (will be populated as generators are added in subsequent tasks)

- [ ] **Step 9: Commit**

```bash
git add js/maps/props.js tests/unit/props.test.js tests/integration/map-loading.test.js index.html REQUIREMENTS.md
git commit -m "feat: add props.js foundation — PRNG, vertex displacement, material cache"
```

---

### Task 2: Tree Generator

**Files:**
- Modify: `js/maps/props.js` (add Tree generator)
- Modify: `tests/unit/props.test.js` (add Tree tests)

- [ ] **Step 1: Write failing tests for Tree generator**

Add to `tests/unit/props.test.js`:

```js
describe('Tree generator', () => {
  it('GAME._props.Tree should be a function', () => {
    expect(typeof GAME._props.Tree).toBe('function');
  });

  it('Tree should add objects to scene', () => {
    var scene = new THREE.Scene();
    var walls = [];
    GAME._props.Tree(scene, walls, 0, 0, 0, { style: 'jungle', seed: 1 });
    expect(scene.children.length).toBeGreaterThan(0);
  });

  it('Tree should push collision mesh to walls array', () => {
    var scene = new THREE.Scene();
    var walls = [];
    GAME._props.Tree(scene, walls, 0, 0, 0, { style: 'jungle', seed: 1 });
    expect(walls.length).toBeGreaterThan(0);
  });

  it('Tree should be deterministic with same seed', () => {
    var scene1 = new THREE.Scene();
    var scene2 = new THREE.Scene();
    GAME._props.Tree(scene1, [], 5, 0, 5, { style: 'oak', seed: 42 });
    GAME._props.Tree(scene2, [], 5, 0, 5, { style: 'oak', seed: 42 });
    expect(scene1.children.length).toBe(scene2.children.length);
  });

  it('Tree should support all 5 styles without throwing', () => {
    var styles = ['jungle', 'palm', 'cypress', 'oak', 'pine'];
    styles.forEach(function(style) {
      var scene = new THREE.Scene();
      expect(function() {
        GAME._props.Tree(scene, [], 0, 0, 0, { style: style, seed: 1 });
      }).not.toThrow();
    });
  });

  it('Tree trunk should use cylinder-like geometry, not box', () => {
    var scene = new THREE.Scene();
    GAME._props.Tree(scene, [], 0, 0, 0, { style: 'jungle', seed: 1 });
    // The group should contain at least one mesh that is NOT a BoxGeometry
    var group = scene.children[0];
    var hasNonBox = false;
    group.traverse(function(child) {
      if (child.isMesh && !(child.geometry instanceof THREE.BoxGeometry)) {
        hasNonBox = true;
      }
    });
    expect(hasNonBox).toBe(true);
  });

  it('Tree canopy should NOT be a plain box', () => {
    var scene = new THREE.Scene();
    GAME._props.Tree(scene, [], 0, 0, 0, { style: 'jungle', seed: 1 });
    var group = scene.children[0];
    var allBoxes = true;
    var meshCount = 0;
    group.traverse(function(child) {
      if (child.isMesh) {
        meshCount++;
        if (!(child.geometry instanceof THREE.BoxGeometry)) allBoxes = false;
      }
    });
    // With detailed geometry, not everything should be a box
    expect(meshCount).toBeGreaterThan(2);
    expect(allBoxes).toBe(false);
  });

  it('scale option should affect tree size', () => {
    var scene1 = new THREE.Scene();
    var scene2 = new THREE.Scene();
    GAME._props.Tree(scene1, [], 0, 0, 0, { style: 'pine', seed: 1, scale: 1.0 });
    GAME._props.Tree(scene2, [], 0, 0, 0, { style: 'pine', seed: 1, scale: 2.0 });
    var group1 = scene1.children[0];
    var group2 = scene2.children[0];
    // Scaled tree group should have different scale
    expect(group2.scale.x).toBeGreaterThan(group1.scale.x);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/props.test.js`
Expected: FAIL — `GAME._props.Tree` is not a function

- [ ] **Step 3: Implement Tree generator with all 5 styles**

Add to `js/maps/props.js` inside the IIFE, before the `GAME._props` assignment. The Tree generator creates a `THREE.Group` with detailed geometry per style:

- **jungle**: Tapered `CylinderGeometry` trunk with 2-3 branch cylinders at random angles (seeded). Buttress roots as flared cone segments at base. Canopy: 4-6 `IcosahedronGeometry(1.5, 2)` spheres with `displaceVertices(geo, 0.3, seed, 'normal')`, positioned at varying heights. Vine cylinders hanging from branches. Epiphyte sphere clumps on trunk.
- **palm**: `LatheGeometry` trunk from profile points (slight curve, ring segments). 6-8 frond `PlaneGeometry(3, 0.5, 8, 1)` with vertex displacement on edges, arranged radially at top. Coconut spheres.
- **cypress**: Narrow `CylinderGeometry` trunk. 2-3 stacked `ConeGeometry` with vertex noise via `displaceVertices`.
- **oak**: Thick short trunk splitting into 3-4 branch cylinders. 5-8 displaced icosahedron canopy cluster. Root geometry at base.
- **pine**: Straight tapered cylinder with branch stubs. 3-5 stacked cones decreasing in radius upward, vertex noise on rims. Pine needle planes at base.

Collision: Push a simplified `CylinderGeometry` mesh (invisible, matching trunk radius) onto `walls`.

Function signature:
```js
function Tree(scene, walls, x, y, z, opts) {
  opts = opts || {};
  var style = opts.style || 'oak';
  var scale = opts.scale || 1.0;
  var seed = opts.seed || (x * 1000 + z);
  var rng = seededRng(seed);
  var group = new THREE.Group();
  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  // ... build tree based on style ...
  scene.add(group);
  // collision
  var collider = new THREE.Mesh(
    new THREE.CylinderGeometry(trunkRadius * scale, trunkRadius * scale, trunkHeight * scale, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  collider.position.set(x, y + trunkHeight * scale / 2, z);
  scene.add(collider);
  walls.push(collider);
  return group;
}
```

Implementation note: Each style has its own internal builder function (`buildJungle`, `buildPalm`, etc.) that adds meshes to the group. Use `matCache.get()` for all materials. Apply `shadow()` to each mesh.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/props.test.js`
Expected: All PASS

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add js/maps/props.js tests/unit/props.test.js
git commit -m "feat: add Tree generator with 5 biome styles"
```

---

### Task 3: Bush, Grass, Vine, PottedPlant, Flower Generators

**Files:**
- Modify: `js/maps/props.js`
- Modify: `tests/unit/props.test.js`

- [ ] **Step 1: Write failing tests for remaining vegetation generators**

Add to `tests/unit/props.test.js`:

```js
describe('Vegetation generators', () => {
  var generatorTests = [
    { name: 'Bush', collidable: false, styles: ['leafy', 'flowering', 'hedge'] },
    { name: 'Grass', collidable: false, styles: null },
    { name: 'Vine', collidable: false, styles: null },
    { name: 'PottedPlant', collidable: false, styles: null },
    { name: 'Flower', collidable: false, styles: null },
  ];

  generatorTests.forEach(function(gen) {
    describe(gen.name + ' generator', () => {
      it('should be a function', () => {
        expect(typeof GAME._props[gen.name]).toBe('function');
      });

      it('should add objects to scene without throwing', () => {
        var scene = new THREE.Scene();
        expect(function() {
          if (gen.name === 'Vine') {
            GAME._props.Vine(scene, 0, 5, 0, 3, 3, 0, { seed: 1 });
          } else {
            GAME._props[gen.name](scene, 0, 0, 0, { seed: 1 });
          }
        }).not.toThrow();
        expect(scene.children.length).toBeGreaterThan(0);
      });

      if (gen.styles) {
        it('should support all styles', () => {
          gen.styles.forEach(function(style) {
            var scene = new THREE.Scene();
            expect(function() {
              GAME._props[gen.name](scene, 0, 0, 0, { style: style, seed: 1 });
            }).not.toThrow();
          });
        });
      }

      it('should use non-box geometry for organic shapes', () => {
        var scene = new THREE.Scene();
        if (gen.name === 'Vine') {
          GAME._props.Vine(scene, 0, 5, 0, 3, 3, 0, { seed: 1 });
        } else {
          GAME._props[gen.name](scene, 0, 0, 0, { seed: 1 });
        }
        var hasNonBox = false;
        scene.traverse(function(child) {
          if (child.isMesh && !(child.geometry instanceof THREE.BoxGeometry)) {
            hasNonBox = true;
          }
        });
        expect(hasNonBox).toBe(true);
      });
    });
  });

  it('Grass material should use alphaTest not transparency blending', () => {
    var scene = new THREE.Scene();
    GAME._props.Grass(scene, 0, 0, 0, { seed: 1 });
    var hasAlphaTest = false;
    scene.traverse(function(child) {
      if (child.isMesh && child.material.alphaTest >= 0.5) {
        hasAlphaTest = true;
      }
    });
    expect(hasAlphaTest).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/props.test.js`
Expected: FAIL

- [ ] **Step 3: Implement all 5 vegetation generators**

Add to `js/maps/props.js`:

- **Bush(scene, x, y, z, opts)**: `opts.style` = `'leafy'|'flowering'|'hedge'`. Leafy: 2-3 `IcosahedronGeometry(0.8, 2)` with `displaceVertices(geo, 0.15, seed, 'normal')`, clustered at ground level using `leaf_dark` material. Flowering: same + small `SphereGeometry(0.08)` colored spheres scattered on surfaces. Hedge: `BoxGeometry` — do NOT use the shared `displaceVertices` function. Instead, manually iterate `geometry.attributes.position` and displace only vertices where `getY(i) > 0` by `(rng() - 0.5) * 0.15` along Y. This creates an organic top edge while keeping the sides clean. Material: `leaf_mid`.

- **Grass(scene, x, y, z, opts)**: Creates a group of 15-25 blade triangles. Each blade: `BufferGeometry` with 3 vertices forming a narrow triangle (width ~0.05, height ~0.3-0.5 random). Random Y rotation per blade. Slight curve via middle vertex offset. Material: `leaf_mid` with `alphaTest: 0.5`, `side: THREE.DoubleSide`.

- **Vine(scene, x1, y1, z1, x2, y2, z2, opts)**: Chain of 8-12 small `CylinderGeometry(0.02, 0.02, segLen, 4)` segments following a catenary curve between (x1,y1,z1) and (x2,y2,z2). Small leaf `PlaneGeometry(0.15, 0.1)` at every 3rd segment. Material: `bark_light` for vine, `leaf_dark` for leaves.

- **PottedPlant(scene, x, y, z, opts)**: Pot: `LatheGeometry` from profile `[Vector2(0,0), Vector2(0.25,0), Vector2(0.3,0.05), Vector2(0.2,0.3), Vector2(0.22,0.32)]`. Soil: `CircleGeometry(0.18)` with `displaceVertices(geo, 0.02, seed, 'y')`, brown material, rotated flat at pot top. Foliage: 4-6 `PlaneGeometry(0.3, 0.15)` angled outward from center, `leaf_mid`, `side: DoubleSide`.

- **Flower(scene, x, y, z, opts)**: Stem: `CylinderGeometry(0.02, 0.02, 0.4, 4)`, `leaf_dark`. 5-6 petal `PlaneGeometry(0.1, 0.06)` arranged radially, tilted outward. Petal color selected from cached materials (`petal_pink`, `petal_yellow`, `petal_white`, `petal_purple`) using seeded RNG — never create per-instance materials. Center: `SphereGeometry(0.03)`, yellow emissive.

None of these push to `walls` — all decoration only.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/props.test.js`
Expected: All PASS

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add js/maps/props.js tests/unit/props.test.js
git commit -m "feat: add Bush, Grass, Vine, PottedPlant, Flower generators"
```

---

## Chunk 2: Rocks, Containers, Furniture

### Task 4: Rock & Terrain Generators

**Files:**
- Modify: `js/maps/props.js`
- Modify: `tests/unit/props.test.js`

- [ ] **Step 1: Write failing tests for rock generators**

Add to `tests/unit/props.test.js`:

```js
describe('Rock & terrain generators', () => {
  describe('Rock generator', () => {
    it('should be a function', () => {
      expect(typeof GAME._props.Rock).toBe('function');
    });

    it('should add to scene and walls when collidable', () => {
      var scene = new THREE.Scene();
      var walls = [];
      GAME._props.Rock(scene, walls, 0, 0, 0, { style: 'rough', seed: 1 });
      expect(scene.children.length).toBeGreaterThan(0);
      expect(walls.length).toBeGreaterThan(0);
    });

    it('should support all 3 styles', () => {
      ['rough', 'mossy', 'sandstone'].forEach(function(style) {
        var scene = new THREE.Scene();
        expect(function() {
          GAME._props.Rock(scene, [], 0, 0, 0, { style: style, seed: 1 });
        }).not.toThrow();
      });
    });

    it('should use IcosahedronGeometry not BoxGeometry', () => {
      var scene = new THREE.Scene();
      GAME._props.Rock(scene, [], 0, 0, 0, { style: 'rough', seed: 1 });
      var hasIco = false;
      scene.traverse(function(child) {
        if (child.isMesh && child.geometry instanceof THREE.IcosahedronGeometry) {
          hasIco = true;
        }
      });
      expect(hasIco).toBe(true);
    });
  });

  describe('RockCluster generator', () => {
    it('should be a function', () => {
      expect(typeof GAME._props.RockCluster).toBe('function');
    });

    it('should create multiple rocks', () => {
      var scene = new THREE.Scene();
      var walls = [];
      GAME._props.RockCluster(scene, walls, 0, 0, 0, { seed: 1 });
      // Should have at least 3 visible meshes
      var meshCount = 0;
      scene.traverse(function(child) {
        if (child.isMesh && child.material.visible !== false) meshCount++;
      });
      expect(meshCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Rubble generator', () => {
    it('should be a function', () => {
      expect(typeof GAME._props.Rubble).toBe('function');
    });

    it('should add debris to scene', () => {
      var scene = new THREE.Scene();
      GAME._props.Rubble(scene, 0, 0, 0, { seed: 1 });
      expect(scene.children.length).toBeGreaterThan(0);
    });
  });

  describe('MossPatches generator', () => {
    it('should be a function', () => {
      expect(typeof GAME._props.MossPatches).toBe('function');
    });

    it('should add patches to scene', () => {
      var scene = new THREE.Scene();
      GAME._props.MossPatches(scene, 0, 0, 0, { seed: 1 });
      expect(scene.children.length).toBeGreaterThan(0);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/props.test.js`
Expected: FAIL

- [ ] **Step 3: Implement Rock, RockCluster, Rubble, MossPatches**

Add to `js/maps/props.js`:

- **Rock(scene, walls, x, y, z, opts)**: `IcosahedronGeometry(size, 2)` where `size` = `opts.size || 1.0`. Apply `displaceVertices(geo, size * 0.25, seed, 'normal')` for rough. For sandstone: use `displaceVertices` with a custom loop that scales displacement by `(1.0 - abs(normalY))` to create horizontal layering. For mossy: after creating the rock mesh, add 2-3 small `CircleGeometry(0.3)` patches with `stone_mossy` material on upward-facing areas. Collision: push invisible box mesh wrapping the rock. Material: `stone_grey`, `sandstone`, or `stone_mossy` per style.

- **RockCluster(scene, walls, x, y, z, opts)**: Use seeded RNG to place 3-7 `Rock()` calls at random offsets (±2 units XZ, slight Y offset to embed in ground). Varying sizes (0.5-1.5). Single collision box enclosing the cluster pushed to `walls`.

- **Rubble(scene, x, y, z, opts)**: Decoration only (no walls). 5-10 small displaced icosahedrons (size 0.1-0.3) at random positions. 2-3 thin box "slab" pieces rotated at angles. 1 flat displaced `SphereGeometry(0.5, 8, 4)` squashed to 0.1 Y as dust mound.

- **MossPatches(scene, x, y, z, opts)**: 3-6 `CircleGeometry(0.3-0.6)` with slight `displaceVertices(geo, 0.02, seed, 'y')`, `leaf_dark` material, rotated to lie flat (rotation.x = -PI/2), positioned at ground level with tiny Y offset (0.01) to avoid z-fighting.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/props.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add js/maps/props.js tests/unit/props.test.js
git commit -m "feat: add Rock, RockCluster, Rubble, MossPatches generators"
```

---

### Task 5: Container Generators

**Files:**
- Modify: `js/maps/props.js`
- Modify: `tests/unit/props.test.js`

- [ ] **Step 1: Write failing tests**

```js
describe('Container generators', () => {
  // Collidable containers (provide cover)
  ['Barrel', 'Crate'].forEach(function(name) {
    describe(name + ' generator (collidable)', () => {
      it('should be a function', () => {
        expect(typeof GAME._props[name]).toBe('function');
      });

      it('should add objects to scene', () => {
        var scene = new THREE.Scene();
        var walls = [];
        GAME._props[name](scene, walls, 0, 0, 0, { seed: 1 });
        expect(scene.children.length).toBeGreaterThan(0);
      });

      it('should add collision mesh to walls', () => {
        var scene = new THREE.Scene();
        var walls = [];
        GAME._props[name](scene, walls, 0, 0, 0, { seed: 1 });
        expect(walls.length).toBeGreaterThan(0);
      });
    });
  });

  // Decoration-only containers (too small for meaningful cover)
  ['Sack', 'WineCask', 'Pallet'].forEach(function(name) {
    describe(name + ' generator (decoration)', () => {
      it('should be a function', () => {
        expect(typeof GAME._props[name]).toBe('function');
      });

      it('should add objects to scene', () => {
        var scene = new THREE.Scene();
        GAME._props[name](scene, 0, 0, 0, { seed: 1 });
        expect(scene.children.length).toBeGreaterThan(0);
      });
    });
  });

  it('Barrel should support metal, wood, tipped styles', () => {
    ['metal', 'wood', 'tipped'].forEach(function(style) {
      var scene = new THREE.Scene();
      expect(function() {
        GAME._props.Barrel(scene, [], 0, 0, 0, { style: style, seed: 1 });
      }).not.toThrow();
    });
  });

  it('Barrel should use LatheGeometry not plain CylinderGeometry', () => {
    var scene = new THREE.Scene();
    GAME._props.Barrel(scene, [], 0, 0, 0, { style: 'metal', seed: 1 });
    var hasLathe = false;
    scene.traverse(function(child) {
      if (child.isMesh && child.geometry instanceof THREE.LatheGeometry) {
        hasLathe = true;
      }
    });
    expect(hasLathe).toBe(true);
  });

  it('Crate should support wood, military, shipping styles', () => {
    ['wood', 'military', 'shipping'].forEach(function(style) {
      var scene = new THREE.Scene();
      expect(function() {
        GAME._props.Crate(scene, [], 0, 0, 0, { style: style, seed: 1 });
      }).not.toThrow();
    });
  });

  it('Crate should have more than 1 mesh (edge trim detail)', () => {
    var scene = new THREE.Scene();
    GAME._props.Crate(scene, [], 0, 0, 0, { style: 'wood', seed: 1 });
    var meshCount = 0;
    scene.traverse(function(child) {
      if (child.isMesh && child.material.visible !== false) meshCount++;
    });
    expect(meshCount).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/props.test.js`
Expected: FAIL

- [ ] **Step 3: Implement Barrel, Crate, Sack, WineCask, Pallet**

Add to `js/maps/props.js`:

- **Barrel(scene, walls, x, y, z, opts)**: Profile points for `LatheGeometry`: `[V2(0,0), V2(0.35,0), V2(0.38,0.1), V2(0.42,0.3), V2(0.43,0.5), V2(0.42,0.7), V2(0.38,0.9), V2(0.35,1.0), V2(0,1.0)]` (32 segments). Metal: add 3 `TorusGeometry(0.42, 0.015, 4, 16)` at y=0.15, 0.5, 0.85 as ridge rings. Wood: add 6 thin `BoxGeometry(0.01, 1.0, 0.03)` as stave lines positioned around circumference, plus `TorusGeometry` iron bands. Tipped: rotate group 80° on X, add `CircleGeometry(0.3)` puddle with `puddle` material beneath. Collision: invisible cylinder pushed to walls.

- **Crate(scene, walls, x, y, z, opts)**: Size from `opts.size || 1.0`. Core `BoxGeometry(s, s, s)` with `plank_oak`/`plank_pine`. 12 edge trim strips: `BoxGeometry(s+0.04, 0.04, 0.04)` etc along each edge. Wood: 3 thin indented `BoxGeometry` strips across front/back faces. Military: 8 corner L-bracket `BoxGeometry` pieces with `iron_band`. Shipping: flat `BoxGeometry` stencil blocks on two sides. Collision: invisible box pushed to walls.

- **Sack(scene, x, y, z, opts)**: Decoration only (no walls). `SphereGeometry(0.4, 12, 8)` with scale (1, 0.6, 1), `displaceVertices(geo, 0.08, seed, 'normal')`. Small `ConeGeometry(0.08, 0.15, 6)` gathered top. Material: `burlap`.

- **WineCask(scene, x, y, z, opts)**: Decoration only (no walls). Elongated barrel `LatheGeometry` profile (1.5x length). Rotate 90° on Z for horizontal. Stave strips and iron bands like wood Barrel. Spigot: `CylinderGeometry(0.03, 0.03, 0.1, 6)` + `ConeGeometry(0.04, 0.06, 6)` on end.

- **Pallet(scene, x, y, z, opts)**: Decoration only (no walls). 3 bottom runners: `BoxGeometry(0.1, 0.1, 1.2)` spaced across width. 5-6 top planks: `BoxGeometry(1.0, 0.05, 0.15)` with 0.03 gaps. Material: `plank_weathered`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/props.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add js/maps/props.js tests/unit/props.test.js
git commit -m "feat: add Barrel, Crate, Sack, WineCask, Pallet generators"
```

---

### Task 6: Furniture Generators

**Files:**
- Modify: `js/maps/props.js`
- Modify: `tests/unit/props.test.js`

- [ ] **Step 1: Write failing tests**

```js
describe('Furniture generators', () => {
  ['Chair', 'Desk', 'Shelf', 'Couch'].forEach(function(name) {
    describe(name + ' generator', () => {
      it('should be a function', () => {
        expect(typeof GAME._props[name]).toBe('function');
      });

      it('should add objects to scene', () => {
        var scene = new THREE.Scene();
        var walls = [];
        GAME._props[name](scene, walls, 0, 0, 0, { seed: 1 });
        expect(scene.children.length).toBeGreaterThan(0);
      });

      it('should push collision mesh to walls', () => {
        var scene = new THREE.Scene();
        var walls = [];
        GAME._props[name](scene, walls, 0, 0, 0, { seed: 1 });
        expect(walls.length).toBeGreaterThan(0);
      });

      it('should produce multi-mesh detailed geometry', () => {
        var scene = new THREE.Scene();
        GAME._props[name](scene, [], 0, 0, 0, { seed: 1 });
        var meshCount = 0;
        scene.traverse(function(child) {
          if (child.isMesh && child.material.visible !== false) meshCount++;
        });
        expect(meshCount).toBeGreaterThan(2);
      });
    });
  });

  it('Chair should support office, wooden, folding styles', () => {
    ['office', 'wooden', 'folding'].forEach(function(style) {
      var scene = new THREE.Scene();
      expect(function() {
        GAME._props.Chair(scene, [], 0, 0, 0, { style: style, seed: 1 });
      }).not.toThrow();
    });
  });

  it('Desk should support office, workbench styles', () => {
    ['office', 'workbench'].forEach(function(style) {
      var scene = new THREE.Scene();
      expect(function() {
        GAME._props.Desk(scene, [], 0, 0, 0, { style: style, seed: 1 });
      }).not.toThrow();
    });
  });

  it('Shelf should support bookcase, industrial, wall_mounted styles', () => {
    ['bookcase', 'industrial', 'wall_mounted'].forEach(function(style) {
      var scene = new THREE.Scene();
      expect(function() {
        GAME._props.Shelf(scene, [], 0, 0, 0, { style: style, seed: 1 });
      }).not.toThrow();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/props.test.js`
Expected: FAIL

- [ ] **Step 3: Implement Chair, Desk, Shelf, Couch**

Add to `js/maps/props.js`. Each creates a `THREE.Group` with detailed sub-meshes:

- **Chair(scene, walls, x, y, z, opts)**: Office: 5 radial `CylinderGeometry(0.02, 0.02, 0.3, 4)` legs from center, `SphereGeometry(0.04)` casters, central stem `CylinderGeometry(0.03, 0.03, 0.4, 6)`, seat `BoxGeometry(0.45, 0.05, 0.45)` with front edge bevel, backrest curved `PlaneGeometry(0.45, 0.4, 1, 4)` with vertex displacement, armrests `BoxGeometry(0.04, 0.04, 0.35)`. Wooden: 4 `CylinderGeometry(0.03, 0.025, 0.45, 6)` legs with splay, plank seat, 3-4 slat backrest boxes. Folding: X-frame legs, thin flat seat/back.

- **Desk(scene, walls, x, y, z, opts)**: Office: flat top `BoxGeometry(1.2, 0.04, 0.6)` with edge trim strip, panel sides, knee cutout, drawer bank (3 thin boxes with `CylinderGeometry(0.015, 0.015, 0.08, 4)` handles), monitor riser box. Workbench: thick plank top with stave lines, 4 square `BoxGeometry(0.08, 0.7, 0.08)` legs, stretcher cross-braces, vise (box + cylinder).

- **Shelf(scene, walls, x, y, z, opts)**: Bookcase: side panels, 4-5 shelf surfaces, packed book blocks (10-20 `BoxGeometry` of varying h/w/color, some tilted via rotation). Industrial: `CylinderGeometry` frame, shelf surfaces, random small item boxes. Wall mounted: L-bracket geometry + plank + items.

- **Couch(scene, walls, x, y, z, opts)**: Base frame box, seat cushion `BoxGeometry(1.6, 0.2, 0.6)` with `displaceVertices` on top face, 2-3 back cushion boxes with rounded tops, tapered armrest boxes. Material: `cushion`.

All push invisible box collider to walls.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/props.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add js/maps/props.js tests/unit/props.test.js
git commit -m "feat: add Chair, Desk, Shelf, Couch furniture generators"
```

---

## Chunk 3: Industrial, Architectural & Surface Systems

### Task 7: Industrial Generators (Pipe, Duct, Junction)

**Files:**
- Modify: `js/maps/props.js`
- Modify: `tests/unit/props.test.js`

- [ ] **Step 1: Write failing tests**

```js
describe('Industrial generators', () => {
  describe('Pipe generator', () => {
    it('should be a function', () => {
      expect(typeof GAME._props.Pipe).toBe('function');
    });

    it('should create TubeGeometry from path points', () => {
      var scene = new THREE.Scene();
      var path = [
        new THREE.Vector3(0, 2, 0),
        new THREE.Vector3(3, 2, 0),
        new THREE.Vector3(3, 2, 3)
      ];
      GAME._props.Pipe(scene, 0, 0, 0, { path: path, radius: 0.05, seed: 1 });
      var hasTube = false;
      scene.traverse(function(child) {
        if (child.isMesh && child.geometry instanceof THREE.TubeGeometry) {
          hasTube = true;
        }
      });
      expect(hasTube).toBe(true);
    });
  });

  describe('Duct generator', () => {
    it('should be a function', () => {
      expect(typeof GAME._props.Duct).toBe('function');
    });

    it('should add objects to scene', () => {
      var scene = new THREE.Scene();
      GAME._props.Duct(scene, 0, 3, 0, { length: 5, seed: 1 });
      expect(scene.children.length).toBeGreaterThan(0);
    });
  });

  describe('Junction generator', () => {
    it('should be a function', () => {
      expect(typeof GAME._props.Junction).toBe('function');
    });

    it('should add objects to scene', () => {
      var scene = new THREE.Scene();
      GAME._props.Junction(scene, 0, 2, 0, { seed: 1 });
      expect(scene.children.length).toBeGreaterThan(0);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/props.test.js`
Expected: FAIL

- [ ] **Step 3: Implement Pipe, Duct, Junction**

- **Pipe(scene, x, y, z, opts)**: Build `CatmullRomCurve3` from `opts.path` (array of Vector3). Create `TubeGeometry(curve, 64, opts.radius || 0.05, 8, false)`. Material: `metal_clean`. Add flange rings: `TorusGeometry(radius * 2, radius * 0.3, 4, 16)` at start/end points. Optional valve wheel if `opts.valve`: flat `CylinderGeometry(radius*4, radius*4, 0.01, 16)` + 4 cross-spoke boxes.

- **Duct(scene, x, y, z, opts)**: Rectangular tube — 4 `PlaneGeometry(opts.length, opts.height || 0.4)` forming a channel (top, bottom, left, right). Seam lines: thin `BoxGeometry` strips along edges. 4-6 small `CylinderGeometry(0.01, 0.01, 0.01, 4)` rivets along seams. Material: `metal_painted`.

- **Junction(scene, x, y, z, opts)**: Main box `BoxGeometry(0.4, 0.5, 0.12)`, `metal_painted`. Door panel: `BoxGeometry(0.32, 0.42, 0.02)` offset slightly forward. 2 conduit cylinders `CylinderGeometry(0.025, 0.025, 0.3, 6)` entering top and bottom. Warning stripe: thin `BoxGeometry` with alternating yellow/black material on door.

All decoration only (no walls).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/props.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add js/maps/props.js tests/unit/props.test.js
git commit -m "feat: add Pipe, Duct, Junction industrial generators"
```

---

### Task 8: Architectural Generators (Pillar, Fountain, Lantern, Archway)

**Files:**
- Modify: `js/maps/props.js`
- Modify: `tests/unit/props.test.js`

- [ ] **Step 1: Write failing tests**

```js
describe('Architectural generators', () => {
  describe('Pillar generator', () => {
    it('should be a function', () => {
      expect(typeof GAME._props.Pillar).toBe('function');
    });

    it('should support greek, stone, modern styles', () => {
      ['greek', 'stone', 'modern'].forEach(function(style) {
        var scene = new THREE.Scene();
        var walls = [];
        expect(function() {
          GAME._props.Pillar(scene, walls, 0, 0, 0, { style: style, seed: 1 });
        }).not.toThrow();
        expect(walls.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Fountain generator', () => {
    it('should be a function', () => {
      expect(typeof GAME._props.Fountain).toBe('function');
    });

    it('should create multi-tiered structure with LatheGeometry', () => {
      var scene = new THREE.Scene();
      var walls = [];
      GAME._props.Fountain(scene, walls, 0, 0, 0, { seed: 1 });
      var hasLathe = false;
      scene.traverse(function(child) {
        if (child.isMesh && child.geometry instanceof THREE.LatheGeometry) {
          hasLathe = true;
        }
      });
      expect(hasLathe).toBe(true);
      expect(walls.length).toBeGreaterThan(0);
    });
  });

  describe('Lantern generator', () => {
    it('should be a function', () => {
      expect(typeof GAME._props.Lantern).toBe('function');
    });

    it('should add a point light to scene', () => {
      var scene = new THREE.Scene();
      GAME._props.Lantern(scene, 0, 3, 0, { seed: 1 });
      var hasLight = false;
      scene.traverse(function(child) {
        if (child instanceof THREE.PointLight) hasLight = true;
      });
      expect(hasLight).toBe(true);
    });
  });

  describe('Archway generator', () => {
    it('should be a function', () => {
      expect(typeof GAME._props.Archway).toBe('function');
    });

    it('should create arch with TorusGeometry', () => {
      var scene = new THREE.Scene();
      var walls = [];
      GAME._props.Archway(scene, walls, 0, 0, 0, { seed: 1 });
      var hasTorus = false;
      scene.traverse(function(child) {
        if (child.isMesh && child.geometry instanceof THREE.TorusGeometry) {
          hasTorus = true;
        }
      });
      expect(hasTorus).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/props.test.js`
Expected: FAIL

- [ ] **Step 3: Implement Pillar, Fountain, Lantern, Archway**

- **Pillar(scene, walls, x, y, z, opts)**: Height from `opts.height || 4`. Greek: main column `CylinderGeometry(0.3, 0.35, height, 16)` with 8 vertical groove indentations (modify vertices to push inward at regular angular intervals). Capital: wider `BoxGeometry(0.9, 0.2, 0.9)` + 2 small scroll `CylinderGeometry(0.1, 0.1, 0.15, 8)` on front. Base plinth: `CylinderGeometry(0.45, 0.45, 0.2, 16)`. Stone: `LatheGeometry` from tapered profile with `displaceVertices`. Modern: clean `CylinderGeometry` or `BoxGeometry(0.4, height, 0.4)`. Collision: invisible cylinder pushed to walls.

- **Fountain(scene, walls, x, y, z, opts)**: Base pool: `LatheGeometry` wide bowl profile (radius ~2, height ~0.5). Water disc: `CircleGeometry(1.8)` at water level with `water_surface` material. Pedestal: `CylinderGeometry(0.2, 0.25, 1.5, 12)`. Upper basin: smaller `LatheGeometry` bowl (radius ~0.6). Upper water disc. Rim detail: `TorusGeometry(2, 0.05, 4, 32)` at pool lip. Material: `stone_grey`. Collision: invisible cylinder for pool base.

- **Lantern(scene, x, y, z, opts)**: Wall bracket: `BoxGeometry(0.03, 0.03, 0.2)`. Housing: `LatheGeometry` from hexagonal-ish profile (6-sided with slight bulge). Cap: `ConeGeometry(0.1, 0.08, 6)`. Flame: `SphereGeometry(0.03)` with emissive orange material. Light: `new THREE.PointLight(0xffaa44, 0.8, 8)`. Decoration only.

- **Archway(scene, walls, x, y, z, opts)**: Width from `opts.width || 3`, height from `opts.height || 3.5`. Two pillar bases: `BoxGeometry(0.5, height-1, 0.5)` on each side. Arch span: `TorusGeometry((width-0.5)/2, 0.25, 8, 16, Math.PI)` positioned at top. Keystone: `BoxGeometry(0.35, 0.35, 0.5)` at apex. Material: `stone_grey` or per `opts.style`. Collision: pillar boxes pushed to walls.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/props.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add js/maps/props.js tests/unit/props.test.js
git commit -m "feat: add Pillar, Fountain, Lantern, Archway architectural generators"
```

---

### Task 9: Surface Detail Helpers

**Files:**
- Modify: `js/maps/shared.js`
- Modify: `tests/unit/maps.test.js`

- [ ] **Step 1: Write failing tests**

Add to `tests/unit/maps.test.js`:

```js
describe('Surface detail helpers', () => {
  describe('WallRelief', () => {
    it('should be a function on _mapHelpers', () => {
      expect(typeof GAME._mapHelpers.WallRelief).toBe('function');
    });

    it('should add geometry to scene for all styles', () => {
      ['brick', 'stone', 'plaster_crack', 'panel'].forEach(function(style) {
        var scene = new THREE.Scene();
        var before = scene.children.length;
        GAME._mapHelpers.WallRelief(scene, 4, 3, 0.5, {}, 0, 1.5, 0, { style: style });
        expect(scene.children.length).toBeGreaterThan(before);
      });
    });
  });

  describe('FloorDetail', () => {
    it('should be a function on _mapHelpers', () => {
      expect(typeof GAME._mapHelpers.FloorDetail).toBe('function');
    });

    it('should add geometry to scene for all styles', () => {
      ['cracked_tile', 'worn_plank', 'cobblestone'].forEach(function(style) {
        var scene = new THREE.Scene();
        var before = scene.children.length;
        GAME._mapHelpers.FloorDetail(scene, 4, 4, {}, 0, 0, 0, { style: style });
        expect(scene.children.length).toBeGreaterThan(before);
      });
    });

    it('should support elevated y position for upper floors', () => {
      var scene = new THREE.Scene();
      GAME._mapHelpers.FloorDetail(scene, 4, 4, {}, 0, 5, 0, { style: 'worn_plank' });
      expect(scene.children.length).toBeGreaterThan(0);
    });
  });

  describe('CeilingDetail', () => {
    it('should be a function on _mapHelpers', () => {
      expect(typeof GAME._mapHelpers.CeilingDetail).toBe('function');
    });

    it('should add geometry to scene for all styles', () => {
      ['beams', 'pipes', 'panels'].forEach(function(style) {
        var scene = new THREE.Scene();
        var before = scene.children.length;
        GAME._mapHelpers.CeilingDetail(scene, 4, 4, {}, 0, 3, 0, { style: style });  // mat={}, x=0, y=3, z=0
        expect(scene.children.length).toBeGreaterThan(before);
      });
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/maps.test.js`
Expected: FAIL — helpers not defined

- [ ] **Step 3: Implement WallRelief, FloorDetail, CeilingDetail in shared.js**

Add to `js/maps/shared.js` inside the IIFE, after the existing build helpers and before the `GAME._mapHelpers` export. Also add them to the exported `GAME._mapHelpers` object.

Signatures: `WallRelief(scene, w, h, d, mat, x, y, z, opts)`, `FloorDetail(scene, w, d, mat, x, y, z, opts)` (y param allows elevated floors like warehouse upper levels), `CeilingDetail(scene, w, d, mat, x, y, z, opts)` (mat for base tint consistency). All decoration only — no collision.

Use `GAME._props.displaceVertices` (public API) for cobblestone and worn_plank displacement — do NOT access `_test` internals from production code.

- **WallRelief(scene, w, h, d, mat, x, y, z, opts)**: Decoration only. Brick: compute grid of bricks (each ~0.24×0.12) with thin mortar gaps. Create individual `BoxGeometry(brickW, brickH, 0.03)` slightly protruding from wall face. Random depth variation ±5% via seeded random. Stone: similar but with irregular widths (0.2-0.5) and deeper mortar. Plaster_crack: 3-5 thin `BoxGeometry(crackLen, 0.01, 0.01)` ridges at random positions/angles. 1-2 exposed patches as recessed different-color boxes. Panel: divide lower half into 2-3 rectangular panels with thin border strip boxes.

- **FloorDetail(scene, w, d, mat, x, z, opts)**: Y position computed at ground level (y=0.01 offset). Cracked_tile: grid of `BoxGeometry(tileW, 0.02, tileD)` tiles with gaps. 2-3 random tiles split into triangular prisms via `BufferGeometry`. Worn_plank: parallel plank boxes with gaps, `CylinderGeometry(0.01, 0.01, 0.005, 4)` nail heads. Cobblestone: non-uniform grid of `BoxGeometry` with convex top via `GAME._props.displaceVertices` (public API).

- **CeilingDetail(scene, w, d, x, y, z, opts)**: Beams: parallel `BoxGeometry(0.15, 0.2, d)` at intervals, cross-beams perpendicular, small L-bracket boxes at intersections. Pipes: 3-5 `TubeGeometry` pipe runs across ceiling using `CatmullRomCurve3`, varying radii. Panels: grid of thin frame strips with inset panel boxes, 1-2 missing panels (dark void), emissive fluorescent boxes in some panels.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/maps.test.js`
Expected: All PASS

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add js/maps/shared.js tests/unit/maps.test.js
git commit -m "feat: add WallRelief, FloorDetail, CeilingDetail surface helpers"
```

---

## Chunk 4: Map Updates (Aztec, Dust, Italy)

**Ordering:** Task 10 must run first (it removes the integration test infrastructure fix step from being needed later). Tasks 11-12 can run in any order after Task 10.

### Task 10: Update Aztec Map

**Files:**
- Modify: `js/maps/aztec.js`

Note: The integration test was already updated in Task 1 (Step 5) to load `props.js` and `arena.js` and expect 7 maps.

- [ ] **Step 1: Replace Aztec tree props**

In `js/maps/aztec.js`, find all tree-building code (trunk `Cyl()` + canopy `D()` pairs) and replace with:
```js
var P = GAME._props;
P.Tree(scene, walls, 20, 0, -25, { style: 'jungle', seed: 1 });
// ... repeat for each tree position
```

Delete the corresponding `Cyl()` + `D()` calls for each tree. Keep the exact x/z positions from the original calls.

- [ ] **Step 3: Replace remaining Aztec props**

Replace other blocky props:
- Moss/vegetation flat boxes → `P.MossPatches(scene, x, 0, z, { seed: N })` and `P.Grass(scene, x, 0, z, { seed: N })`
- Scattered rocks (small `D()` boxes) → `P.Rock(scene, walls, x, 0, z, { style: 'mossy', seed: N })`
- Add `P.Flower(scene, x, 0, z, { seed: N })` for tropical clusters
- Add `P.Vine(scene, x1, y1, z1, x2, y2, z2, { seed: N })` on rope bridge railings

Keep all structural geometry (`B()` calls for walls, floors, platforms, stairs) unchanged.

- [ ] **Step 4: Add surface detail to Aztec**

Add after structural geometry:
```js
var WR = GAME._mapHelpers.WallRelief;
var FD = GAME._mapHelpers.FloorDetail;
// Temple walls: stone relief
WR(scene, wallW, wallH, 0.5, mossStone, x, y, z, { style: 'stone' });
// Temple floors: cobblestone
FD(scene, floorW, floorD, sandstone, x, 0, z, { style: 'cobblestone' });
```

Apply to temple surfaces and platforms as specified in the design spec.

- [ ] **Step 5: Add new Aztec props**

Per spec:
- Fallen log: `P.Tree(scene, walls, x, 0, z, { style: 'jungle', seed: N })` placed horizontally (rotate the group 90° on Z after creation, or add a `fallen: true` option)
- Stone pillars flanking shrine: `P.Pillar(scene, walls, x, 0, z, { style: 'stone', seed: N })`
- Rock clusters at river banks: `P.RockCluster(scene, walls, x, 0, z, { seed: N })`

- [ ] **Step 6: Run full test suite**

Run: `npm test`
Expected: All pass — map still builds without throwing, returns walls array

- [ ] **Step 7: Commit**

```bash
git add js/maps/aztec.js tests/integration/map-loading.test.js
git commit -m "feat: overhaul Aztec map with high-fidelity procedural props and surface detail"
```

---

### Task 11: Update Dust Map

**Files:**
- Modify: `js/maps/dust.js`

- [ ] **Step 1: Replace Dust tree/barrel/rubble props**

In `js/maps/dust.js`:
- Palm trunk stubs (`Cyl()` calls) → `P.Tree(scene, walls, x, 0, z, { style: 'palm', seed: N })`
- Oil barrel cylinders → `P.Barrel(scene, walls, x, 0, z, { style: 'metal', seed: N })` and `P.Barrel(scene, walls, x, 0, z, { style: 'tipped', seed: N })`
- Flat rubble/debris boxes → `P.Rubble(scene, x, 0, z, { seed: N })`
- Crate boxes → `P.Crate(scene, walls, x, 0, z, { style: 'wood', seed: N })`

Keep structural walls, floors, market stall frames, vehicle unchanged.

- [ ] **Step 2: Add new Dust props**

- `P.Sack(scene, x, 0, z, { seed: N })` piles around market stalls
- `P.Rock(scene, walls, x, 0, z, { style: 'sandstone', seed: N })` formations
- `P.Crate(scene, walls, x, 0, z, { style: 'wood', seed: N })` around vehicle

- [ ] **Step 3: Add Dust surface detail**

```js
WR(scene, w, h, d, mat, x, y, z, { style: 'plaster_crack' }); // building exteriors
WR(scene, w, h, d, mat, x, y, z, { style: 'brick' });         // damaged sections
FD(scene, w, d, mat, x, 0, z, { style: 'cobblestone' });          // market area
FD(scene, w, d, mat, x, 0, z, { style: 'cracked_tile' });         // building interiors
```

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add js/maps/dust.js
git commit -m "feat: overhaul Dust map with high-fidelity procedural props and surface detail"
```

---

### Task 12: Update Italy Map

**Files:**
- Modify: `js/maps/italy.js`

- [ ] **Step 1: Replace Italy props**

- Potted plant cylinders → `P.PottedPlant(scene, x, y, z, { seed: N })`
- Wine cask cylinders → `P.WineCask(scene, walls, x, y, z, { seed: N })`
- Fountain cylinders → `P.Fountain(scene, walls, x, 0, z, { seed: N })`
- Add `P.Tree(scene, walls, x, 0, z, { style: 'cypress', seed: N })` along pathways
- Add `P.Tree(scene, walls, x, 0, z, { style: 'oak', seed: N })` in courtyard
- Add `P.Flower(scene, x, y, z, { seed: N })` window boxes
- Add `P.Lantern(scene, x, y, z, { seed: N })` on building walls
- Add `P.Archway(scene, walls, x, 0, z, { seed: N })` at passage entrances

- [ ] **Step 2: Add Italy surface detail**

```js
WR(scene, w, h, d, mat, x, y, z, { style: 'plaster_crack' }); // upper walls
WR(scene, w, h, d, mat, x, y, z, { style: 'stone' });         // lower walls
FD(scene, w, d, mat, x, 0, z, { style: 'cobblestone' });          // streets
FD(scene, w, d, mat, x, y, z, { style: 'worn_plank' });           // building interiors
```

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add js/maps/italy.js
git commit -m "feat: overhaul Italy map with high-fidelity procedural props and surface detail"
```

---

## Chunk 5: Map Updates (Office, Warehouse, Bloodstrike, Arena) & Finalization

**Ordering:** Tasks 13-16 can run in any order (each modifies a different map file). Task 17 must run last.

### Task 13: Update Office Map

**Files:**
- Modify: `js/maps/office.js`

- [ ] **Step 1: Replace Office furniture and plant props**

- Potted plant cylinders → `P.PottedPlant(scene, x, y, z, { seed: N })`
- Desk/chair/couch inline geometry → `P.Desk(scene, walls, x, 0, z, { style: 'office', seed: N })`, `P.Chair(scene, walls, x, 0, z, { style: 'office', seed: N })`, `P.Couch(scene, walls, x, 0, z, { seed: N })`
- Bookshelf inline geometry → `P.Shelf(scene, walls, x, 0, z, { style: 'bookcase', seed: N })`
- Fire extinguisher cylinder → Build inline with `LatheGeometry` body + nozzle cylinder
- Add `P.Junction(scene, x, y, z, { seed: N })` on maintenance walls

Keep structural walls, corridors, room dividers unchanged.

- [ ] **Step 2: Add Office surface detail**

```js
WR(scene, w, h, d, mat, x, y, z, { style: 'panel' });         // conference rooms
WR(scene, w, h, d, mat, x, y, z, { style: 'plaster_crack' }); // maintenance areas
FD(scene, w, d, mat, x, 0, z, { style: 'cracked_tile' });         // restrooms/kitchen
var CD = GAME._mapHelpers.CeilingDetail;
CD(scene, w, d, mat, x, ceilingY, z, { style: 'panels' });          // throughout
CD(scene, w, d, mat, x, ceilingY, z, { style: 'pipes' });           // server room
```

- [ ] **Step 3: Run full test suite and commit**

Run: `npm test`

```bash
git add js/maps/office.js
git commit -m "feat: overhaul Office map with high-fidelity procedural props and surface detail"
```

---

### Task 14: Update Warehouse Map

**Files:**
- Modify: `js/maps/warehouse.js`

- [ ] **Step 1: Replace Warehouse props**

- Crate boxes → `P.Crate(scene, walls, x, y, z, { style: 'shipping'|'military', seed: N })`
- Oil drum cylinders → `P.Barrel(scene, walls, x, 0, z, { style: 'metal', seed: N })`
- Pallet boxes → `P.Pallet(scene, walls, x, 0, z, { seed: N })`
- Shelf inline geometry → `P.Shelf(scene, walls, x, 0, z, { style: 'industrial', seed: N })`
- Workbench area → `P.Desk(scene, walls, x, 0, z, { style: 'workbench', seed: N })`
- Add `P.Pipe(scene, x, y, z, { path: [...], radius: 0.04, seed: N })` on walls
- Add `P.Duct(scene, x, y, z, { length: L, seed: N })` runs
- Add `P.Junction(scene, x, y, z, { seed: N })` boxes

- [ ] **Step 2: Add Warehouse surface detail**

```js
FD(scene, w, d, mat, x, y, z, { style: 'worn_plank' });   // upper levels
P.Rubble(scene, x, 0, z, { seed: N });                  // ground floor patches
CD(scene, w, d, mat, x, y, z, { style: 'pipes' });           // lower levels
CD(scene, w, d, mat, x, y, z, { style: 'beams' });           // upper levels
```

- [ ] **Step 3: Run full test suite and commit**

Run: `npm test`

```bash
git add js/maps/warehouse.js
git commit -m "feat: overhaul Warehouse map with high-fidelity procedural props and surface detail"
```

---

### Task 15: Update Bloodstrike Map

**Files:**
- Modify: `js/maps/bloodstrike.js`

- [ ] **Step 1: Replace Bloodstrike props**

- Crate boxes → `P.Crate(scene, walls, x, y, z, { style: 'military', seed: N })`
- Barrel cylinders → `P.Barrel(scene, walls, x, 0, z, { style: 'metal', seed: N })`, some tipped
- Add `P.RockCluster(scene, walls, x, 0, z, { style: 'rough', seed: N })` in corners
- Add `P.Rubble(scene, x, 0, z, { seed: N })` in combat zones
- Add `P.Pillar(scene, walls, x, 0, z, { style: 'modern', seed: N })` at entrances

- [ ] **Step 2: Add Bloodstrike surface detail**

```js
WR(scene, w, h, d, mat, x, y, z, { style: 'brick' });  // perimeter
WR(scene, w, h, d, mat, x, y, z, { style: 'panel' });   // interior accent walls
FD(scene, w, d, mat, x, 0, z, { style: 'cracked_tile' });   // floors
```

- [ ] **Step 3: Run full test suite and commit**

Run: `npm test`

```bash
git add js/maps/bloodstrike.js
git commit -m "feat: overhaul Bloodstrike map with high-fidelity procedural props and surface detail"
```

---

### Task 16: Update Arena Map

**Files:**
- Modify: `js/maps/arena.js`

- [ ] **Step 1: Replace Arena props**

- Crate boxes → `P.Crate(scene, walls, x, y, z, { style: 'military', seed: N })`
- Barrel cylinders → `P.Barrel(scene, walls, x, 0, z, { style: 'metal', seed: N })`, some tipped
- Add `P.Rubble(scene, x, 0, z, { seed: N })` in combat zones
- Add `P.RockCluster(scene, walls, x, 0, z, { seed: N })` at map edges
- Add hazard stripe geometry on pillars: alternating yellow (`0xffcc00`) and black (`0x222222`) thin `BoxGeometry` strips wrapped around pillar surfaces

- [ ] **Step 2: Add Arena surface detail**

```js
WR(scene, w, h, d, mat, x, y, z, { style: 'brick' });      // perimeter walls
FD(scene, w, d, mat, x, 0, z, { style: 'cracked_tile' });       // platform surfaces
// Stone relief on central platform sides
WR(scene, w, h, d, mat, x, y, z, { style: 'stone' });
```

- [ ] **Step 3: Run full test suite and commit**

Run: `npm test`

```bash
git add js/maps/arena.js
git commit -m "feat: overhaul Arena map with high-fidelity procedural props and surface detail"
```

---

### Task 17: Update REQUIREMENTS.md and Final Integration

**Files:**
- Modify: `REQUIREMENTS.md`
- Modify: `tests/integration/map-loading.test.js`

- [ ] **Step 1: Update REQUIREMENTS.md**

Add a new section documenting the prop library:
- List all generator functions with their signatures and styles
- Document the material cache categories
- Document the surface detail helpers
- Update each map's description to reference the new prop types used
- Update the build helpers listing to include `WallRelief`, `FloorDetail`, `CeilingDetail`

- [ ] **Step 2: Verify integration test covers props loading**

Ensure `tests/integration/map-loading.test.js` loads `js/maps/props.js` after `shared.js` and before map files. Verify all 7 maps still build and return walls arrays.

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add REQUIREMENTS.md tests/integration/map-loading.test.js
git commit -m "docs: update REQUIREMENTS.md with prop library and surface detail documentation"
```

- [ ] **Step 5: Final verification — visual smoke test**

Open `index.html` in a browser. Cycle through all 7 maps verifying:
- Trees have organic canopy shapes (no green cubes)
- Rocks are irregular (no flat boxes)
- Barrels have proper profiles with ridges
- Furniture has multi-part detail
- Surface detail visible on walls/floors
- No visual artifacts (z-fighting, missing textures, grass sorting)
- Game still plays normally — movement, shooting, bot AI all functional
