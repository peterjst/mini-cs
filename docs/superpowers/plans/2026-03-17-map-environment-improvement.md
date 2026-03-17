# Map Environment Improvement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve all 7 maps for realism (surface detail on flat geometry) and functionality (fix useless stairs/dead-ends).

**Architecture:** Each map file (`js/maps/<name>.js`) is an independent unit of work. Functionality fixes (structural changes to Bloodstrike, Aztec, Italy) come first, then realism passes on all 7 maps. All changes use existing helpers (`B()`, `D()`, `Cyl()`, `WR()`, `P.*`). REQUIREMENTS.md is updated after each map.

**Tech Stack:** Three.js r160.1 (procedural geometry), Vitest + jsdom for tests.

**Spec:** `docs/superpowers/specs/2026-03-16-map-environment-improvement-design.md`

---

## Chunk 1: Functionality Fixes

### Task 1: Bloodstrike — Diagonal Sniper Perches

**Files:**
- Modify: `js/maps/bloodstrike.js` (lines 281-327 corner platforms loop, lines 58-73 waypoints/spawns)
- Test: `tests/unit/maps.test.js` (add Bloodstrike-specific tests)
- Modify: `REQUIREMENTS.md` (lines 416-431 Bloodstrike section)

The current code builds all 4 corner platforms in a single `corners.forEach` loop (lines 285-327). This must be refactored into two separate loops: one for kept platforms (NW, SE) with open sightlines, one for replaced corners (NE, SW) with ground-level cover.

- [ ] **Step 1: Write failing tests for Bloodstrike structural changes**

Add to `tests/unit/maps.test.js` after the existing "Surface detail helpers" describe block (but still inside the file — do NOT create a new test file). These tests should be inside the `describe('Map lighting configs')` beforeAll block that loads all maps, or in a new describe block that uses the same beforeAll:

```js
describe('Bloodstrike structural changes', () => {
  beforeAll(() => {
    // Maps already loaded by prior beforeAll blocks
  });

  it('should build Bloodstrike without throwing', () => {
    var scene = new THREE.Scene();
    var bloodstrike = GAME._maps.find(m => m.name === 'Bloodstrike');
    expect(() => bloodstrike.build(scene)).not.toThrow();
  });

  it('should return walls array with collidable objects', () => {
    var scene = new THREE.Scene();
    var bloodstrike = GAME._maps.find(m => m.name === 'Bloodstrike');
    var walls = bloodstrike.build(scene);
    expect(Array.isArray(walls)).toBe(true);
    expect(walls.length).toBeGreaterThan(0);
  });

  it('should have updated waypoints without NE/SW platform waypoints', () => {
    var bloodstrike = GAME._maps.find(m => m.name === 'Bloodstrike');
    var hasNE = bloodstrike.waypoints.some(w => w.x === 26 && w.z === -18);
    var hasSW = bloodstrike.waypoints.some(w => w.x === -26 && w.z === 18);
    expect(hasNE).toBe(false);
    expect(hasSW).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: The waypoint test should fail (NE/SW waypoints still exist). Build tests may pass since map already builds.

- [ ] **Step 3: Refactor corner platform loop into kept vs removed**

In `js/maps/bloodstrike.js`, replace the single `corners.forEach` loop (lines 284-327) with two separate sections. The current code:

```js
var corners = [
  [-24, -14, 'x+', 'z+'],  // NW corner
  [24, -14, 'x-', 'z+'],   // NE corner
  [24, 14, 'x-', 'z-'],    // SE corner
  [-24, 14, 'x+', 'z-'],   // SW corner
];
```

Replace with:

```js
// ── KEPT corner platforms (NW, SE) — sniper perches with open sightlines ──
var keptCorners = [
  [-24, -14, 'x+', 'z+'],  // NW corner
  [24, 14, 'x-', 'z-'],    // SE corner
];

keptCorners.forEach(function(c) {
  var cx = c[0], cz = c[1];
  // Platform slab
  B(scene, walls, platW, 0.4, platD, platMat, cx, elevH, cz);

  // Only outer-edge barriers (back cover against perimeter walls)
  // Determine which edges face the perimeter (outer) vs corridor (inner)
  var outerZ = cz < 0 ? cz - platD/2 : cz + platD/2; // z edge near perimeter
  var outerX = cx < 0 ? cx - platW/2 : cx + platW/2; // x edge near perimeter
  B(scene, walls, platW, 1.2, 0.4, barrierMat, cx, elevH + 0.8, outerZ);
  D(scene, platW, 0.08, 0.5, trimBand, cx, elevH + 1.44, outerZ);
  B(scene, walls, 0.4, 1.2, platD, barrierMat, outerX, elevH + 0.8, cz);
  D(scene, 0.5, 0.08, platD, trimBand, outerX, elevH + 1.44, cz);

  // Functional sandbag wall at stair top (h=1.0, wider than decorative)
  var sbx = cx + (c[2] === 'x+' ? 3.5 : -3.5);
  var sbz = cz + (c[3] === 'z+' ? -0.5 : 0.5);
  B(scene, walls, 2.5, 1.0, 1.2, sandbagMat, sbx, elevH + 0.7, sbz);

  // Crate stack on platform
  var crateOffX = cx + 2 * Math.sign(cx);
  var crateOffZ = cz + 2 * Math.sign(cz);
  B(scene, walls, 1.5, 1.2, 1.5, crate, crateOffX, elevH + 0.8, crateOffZ);
  B(scene, walls, 1, 0.8, 1, crateDark, crateOffX + 0.2, elevH + 2.0, crateOffZ - 0.1);

  // Support columns under platforms
  var colMat = concreteMat(0x7a6a50);
  D(scene, 0.5, elevH, 0.5, colMat, cx - 3, elevH/2, cz - 3 * Math.sign(cz));
  D(scene, 0.5, elevH, 0.5, colMat, cx + 3, elevH/2, cz - 3 * Math.sign(cz));
  D(scene, 0.5, elevH, 0.5, colMat, cx - 3 * Math.sign(cx), elevH/2, cz - 3);
  D(scene, 0.5, elevH, 0.5, colMat, cx - 3 * Math.sign(cx), elevH/2, cz + 3);

  // Stairs
  buildStairs(scene, walls, cx, cz, 0, elevH, 3, c[2]);
});

// ── REMOVED corner platforms (NE, SW) — replaced with ground-level cover ──
var removedCorners = [
  [24, -14],   // NE corner
  [-24, 14],   // SW corner
];

removedCorners.forEach(function(c) {
  var cx = c[0], cz = c[1];
  // Jersey barriers (2-3 low walls)
  B(scene, walls, 3, 1.2, 0.5, barrierMat, cx, 0.6, cz);
  B(scene, walls, 0.5, 1.2, 3, barrierMat, cx + 2 * Math.sign(cx), 0.6, cz);
  B(scene, walls, 2.5, 1.0, 0.5, barrierMat, cx - 1.5 * Math.sign(cx), 0.5, cz + 2 * Math.sign(cz));

  // Crate stack
  B(scene, walls, 1.5, 1.2, 1.5, crate, cx + 1.5 * Math.sign(cx), 0.6, cz - 1.5 * Math.sign(cz));
  B(scene, walls, 1, 0.8, 1, crateDark, cx + 1.5 * Math.sign(cx), 1.6, cz - 1.5 * Math.sign(cz));

  // Barrel group
  P.Barrel(scene, walls, cx - 2 * Math.sign(cx), 0, cz + 2.5 * Math.sign(cz), { style: 'rusty', seed: 100 + cx });
  P.Barrel(scene, walls, cx - 3 * Math.sign(cx), 0, cz + 2 * Math.sign(cz), { style: 'metal', seed: 101 + cx });
});
```

- [ ] **Step 4: Update Bloodstrike waypoints and spawns**

In the same file, update the `waypoints` array — remove NE/SW elevated waypoints and add ground-level ones. Replace the waypoints array:

```js
waypoints: [
  // North corridor
  { x: -14, z: -14 }, { x: 0, z: -14 }, { x: 14, z: -14 },
  // North corridor outer lane
  { x: -20, z: -18 }, { x: 20, z: -18 },
  // NW corner (kept platform)
  { x: -26, z: -18 },
  // NE corner (ground-level cover, was platform)
  { x: 24, z: -16 },
  // SE corner (kept platform)
  { x: 26, z: 18 },
  // SW corner (ground-level cover, was platform)
  { x: -24, z: 16 },
  // East corridor
  { x: 26, z: -8 }, { x: 26, z: 0 }, { x: 26, z: 8 },
  // South corridor
  { x: -14, z: 14 }, { x: 0, z: 14 }, { x: 14, z: 14 },
  // South corridor outer lane
  { x: -20, z: 18 }, { x: 20, z: 18 },
  // West corridor
  { x: -26, z: 8 }, { x: -26, z: 0 }, { x: -26, z: -8 },
],
```

Update `botSpawns` — adjust NE/SW entries to avoid spawning inside replacement cover geometry. The original has `{ x: 26, z: -18 }` (NE) and `{ x: -26, z: 18 }` (SW) which now have jersey barriers:

```js
botSpawns: [
  { x: 24, z: 18 },
  { x: 22, z: -16 },   // was { x: 26, z: -18 } — moved away from NE cover
  { x: -22, z: 16 },   // was { x: -26, z: 18 } — moved away from SW cover
],
```

Keep `tSpawns` unchanged — all 5 entries are near the SE kept platform and are valid:

```js
tSpawns: [
  { x: 24, z: 18 }, { x: 22, z: 18 }, { x: 26, z: 16 },
  { x: 20, z: 18 }, { x: 26, z: 18 }
],
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- --reporter=verbose 2>&1 | tail -30`
Expected: All tests PASS including the new Bloodstrike structural tests.

- [ ] **Step 6: Update REQUIREMENTS.md**

In `REQUIREMENTS.md`, replace the Bloodstrike corner platforms description (line 423) with:

```
- **Corner platforms**: NW and SE corners have elevated concrete platforms (8x8, y=3) as sniper perches — inner-edge barriers removed for open sightlines down corridors, outer-edge barriers kept as back cover, functional sandbag wall (h=1.0) at stair top, crate stacks for additional cover, support columns underneath. NE and SW corners have ground-level cover: concrete jersey barriers (h=1.2), crate stacks, and barrel groups replacing the former elevated platforms
```

- [ ] **Step 7: Commit**

```bash
git add js/maps/bloodstrike.js tests/unit/maps.test.js REQUIREMENTS.md
git commit -m "feat(bloodstrike): replace NE/SW platforms with ground cover, open NW/SE sightlines"
```

---

### Task 2: Aztec — Overpass Extension + Temple Expansion

**Files:**
- Modify: `js/maps/aztec.js` (lines 160-175 temple, lines 192-201 overpass, lines 58-64 waypoints)
- Test: `tests/unit/maps.test.js` (add Aztec-specific tests)
- Modify: `REQUIREMENTS.md` (lines 458-476 Aztec section)

- [ ] **Step 1: Write failing tests for Aztec structural changes**

Add to `tests/unit/maps.test.js`:

```js
describe('Aztec structural changes', () => {
  it('should build Aztec without throwing', () => {
    var scene = new THREE.Scene();
    var aztec = GAME._maps.find(m => m.name === 'Aztec');
    expect(() => aztec.build(scene)).not.toThrow();
  });

  it('should return walls with overpass bridge collidables', () => {
    var scene = new THREE.Scene();
    var aztec = GAME._maps.find(m => m.name === 'Aztec');
    var walls = aztec.build(scene);
    expect(Array.isArray(walls)).toBe(true);
    // More walls than before due to bridge walkway, parapets, ramp, drop-down
    expect(walls.length).toBeGreaterThan(30);
  });

  it('should have waypoints for elevated route', () => {
    var aztec = GAME._maps.find(m => m.name === 'Aztec');
    // Should have more waypoints than the original 14
    expect(aztec.waypoints.length).toBeGreaterThan(14);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: Waypoint count test fails (currently 14).

- [ ] **Step 3: Expand temple top tier**

In `js/maps/aztec.js`, find the temple tier lines (162-164). Change the top tier and add cover:

Replace:
```js
B(scene, walls, 6, 1.5, 6, sandstone, 15, 3.75, 18);
```

With:
```js
B(scene, walls, 8, 1.5, 8, sandstone, 15, 3.75, 18);
// Temple top cover: central altar
B(scene, walls, 2, 1.5, 2, mossStone, 15, 5.25, 18);
// Pillar fragments at opposite corners
B(scene, walls, 0.8, 1.2, 0.8, darkStone, 12, 5.1, 15.5);
B(scene, walls, 0.8, 1.2, 0.8, darkStone, 18, 5.1, 20.5);
// Carved relief on altar
WR(scene, 2, 1.5, 0.3, mossStone, 15, 5.25, 17, { style: 'stone' });
// Tier edge trim (darker stone band on each tier riser)
D(scene, 14.5, 0.15, 0.15, darkStone, 15, 0.08, 11);  // base tier front
D(scene, 10.5, 0.15, 0.15, darkStone, 15, 1.58, 13);   // mid tier front
D(scene, 8.5, 0.15, 0.15, darkStone, 15, 3.08, 14);     // top tier front
```

- [ ] **Step 4: Build overpass extension**

In `js/maps/aztec.js`, after the existing overpass section (after line 201), add the bridge/ramp and corridor-top walkway:

```js
// ── Overpass extension: ramp up to corridor wall top ──
// Ramp from overpass level (y=3) up to corridor wall top (y=5)
// Stairs start at the overpass east edge (x=-13), going eastward
buildStairs(scene, walls, -13, -18, 3, 5, 2, 'x+');

// Walkable platform on top of west corridor wall (x=-13, z=-15 to z=-1)
B(scene, walls, 1.5, 0.3, 14, darkStone, -13, 5.15, -8);

// Stone parapets along the walkway
B(scene, walls, 0.3, 0.8, 14, mossStone, -13.6, 5.7, -8);  // west parapet
B(scene, walls, 0.3, 0.8, 14, mossStone, -12.4, 5.7, -8);  // east parapet

// Drop-down ledges at south end (z=-1) — gradual descent
B(scene, walls, 1.5, 0.3, 1.5, darkStone, -13, 4, -0.5);   // intermediate step
B(scene, walls, 1.5, 0.3, 1.5, darkStone, -13, 2.5, 0.5);  // lower step
B(scene, walls, 1.5, 0.3, 1.5, darkStone, -13, 1.2, 1.5);  // near ground
```

- [ ] **Step 5: Update Aztec waypoints**

Update the waypoints array to include the elevated route and expanded temple top:

```js
waypoints: [
  { x: 0, z: 0 }, { x: 15, z: 0 }, { x: -15, z: 0 },
  { x: 15, z: -15 }, { x: -10, z: -15 }, { x: 0, z: -25 },
  { x: 20, z: -10 }, { x: -20, z: 10 }, { x: -10, z: 20 },
  { x: 15, z: 15 }, { x: 0, z: 20 }, { x: -20, z: -5 },
  { x: 10, z: 10 }, { x: -5, z: -10 },
  // Elevated route waypoints
  { x: -13, z: -15 },  // corridor wall top north end
  { x: -13, z: -8 },   // corridor wall top midpoint
  { x: -13, z: -1 },   // corridor wall top south / drop-down
  // Expanded temple top
  { x: 15, z: 18 },    // temple top tier
],
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- --reporter=verbose 2>&1 | tail -30`
Expected: All tests PASS.

- [ ] **Step 7: Update REQUIREMENTS.md**

Update the Aztec overpass description (line 469):
```
- **Overpass/Ramp**: Elevated stone platform (y=3, 10x4) at x=-18, z=-18 with stairs from ground. Extended eastward via ramp (y=3→5) connecting to a walkable platform on top of the west corridor wall (x=-13, z=-15 to z=-1) with stone parapets for cover. Drop-down ledges at south end. Creates elevated flanking route from T-spawn through to bombsite B area
```

Update the temple description (line 467):
```
- **Bombsite A (Stepped Temple)**: 3-tier stepped pyramid at x=15, z=18 (south-east). Tiers: 14x14 base, 10x10 mid, 8x8 top (each 1.5 high). Central stone altar (2x1.5x2) and pillar fragments at opposite corners provide cover on top tier. Carved stone relief on altar. Darker stone trim bands on each tier riser. Corner pillars (dark stone cylinders). Stairs on north face via buildStairs()
```

- [ ] **Step 8: Commit**

```bash
git add js/maps/aztec.js tests/unit/maps.test.js REQUIREMENTS.md
git commit -m "feat(aztec): extend overpass to corridor wall, expand temple top with cover"
```

---

### Task 3: Italy — Furnished 2nd Floors

**Files:**
- Modify: `js/maps/italy.js` (after line 167 Building B 2F, after line 144 Building A 2F, lines 62-72 waypoints)
- Test: `tests/unit/maps.test.js` (add Italy-specific tests)
- Modify: `REQUIREMENTS.md` (lines 433-456 Italy section)

- [ ] **Step 1: Write failing tests for Italy 2nd floor furnishing**

Add to `tests/unit/maps.test.js`:

```js
describe('Italy structural changes', () => {
  it('should build Italy without throwing', () => {
    var scene = new THREE.Scene();
    var italy = GAME._maps.find(m => m.name === 'Italy');
    expect(() => italy.build(scene)).not.toThrow();
  });

  it('should return walls with 2nd floor furniture collidables', () => {
    var scene = new THREE.Scene();
    var italy = GAME._maps.find(m => m.name === 'Italy');
    var walls = italy.build(scene);
    expect(Array.isArray(walls)).toBe(true);
    // More walls than before due to furniture, window sills, partition
    expect(walls.length).toBeGreaterThan(40);
  });

  it('should have waypoints on 2nd floors', () => {
    var italy = GAME._maps.find(m => m.name === 'Italy');
    // Should have more waypoints than original 20
    expect(italy.waypoints.length).toBeGreaterThan(20);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: Waypoint count and wall count tests fail.

- [ ] **Step 3: Furnish Building A 2nd floor**

In `js/maps/italy.js`, after the Building A section (after line 144, before Building B), add 2nd floor furniture. The 2F floor slab is at y=3.5, center (-2, 3.5, -18.5), size 12×13. Furniture sits on y=3.65 (top of 0.3-thick slab):

```js
// ── Building A: 2nd Floor Furnishings ──
var f2y = 3.65; // furniture base (top of floor slab)

// Floor material patch (wood planking)
D(scene, 10, 0.02, 11, woodMat(0x8b6020), -2, 3.52, -18.5);

// Window sill in south wall gap (between the two 4.5-wide wall segments)
// Gap is at x=-3.25 to x=-0.75 (between walls ending at x=-3.25 and x=-0.75)
B(scene, walls, 3, 1.0, 0.4, sandStoneDk, -2, f2y + 0.5, -12);

// Window cutout in east wall (x=4) — low wall as sill
B(scene, walls, 0.4, 1.0, 2, sandStoneDk, 4, f2y + 0.5, -16);

// Desk 1 near south edge (overlooking piazza)
P.Desk(scene, walls, -4, f2y, -13, { style: 'office', seed: 80 });

// Desk 2 near south edge
P.Desk(scene, walls, 0, f2y, -13, { style: 'office', seed: 81 });

// Filing cabinet cluster against north wall (z=-25)
B(scene, walls, 0.6, 1.5, 0.5, metalMat(0x777777), -5, f2y + 0.75, -24);
B(scene, walls, 0.6, 1.5, 0.5, metalMat(0x777777), -4.2, f2y + 0.75, -24);
B(scene, walls, 0.6, 1.5, 0.5, metalMat(0x888888), -3.4, f2y + 0.75, -24);

// Low bookshelf (interior cover)
B(scene, walls, 2.5, 1.2, 0.6, darkWood, -2, f2y + 0.6, -18);
```

- [ ] **Step 4: Furnish Building B 2nd floor**

In `js/maps/italy.js`, after the Building B section (after line 167), add 2nd floor furniture. Floor at y=3.5, center (16, 3.5, -7.5), size 12×25:

```js
// ── Building B: 2nd Floor Furnishings ──
var f2yB = 3.65;

// Floor material patch
D(scene, 10, 0.02, 23, woodMat(0x7a5020), 16, 3.52, -7.5);

// Partition wall dividing into two rooms (h=3, touching ceiling at 6.5)
B(scene, walls, 10, 3, 0.4, sandStone, 16, f2yB + 1.5, -7.5);

// -- Front room (south, z=-7.5 to z=5) --

// Window sill in south wall (z=5) — overlooking piazza/market
B(scene, walls, 3, 1.0, 0.4, sandStoneDk, 14, f2yB + 0.5, 5);
B(scene, walls, 3, 1.0, 0.4, sandStoneDk, 18, f2yB + 0.5, 5);

// Table with chairs
B(scene, walls, 2, 0.8, 1.2, lightWood, 14, f2yB + 0.4, 0);
P.Chair(scene, walls, 13, f2yB, -0.5, { style: 'office', seed: 82 });
P.Chair(scene, walls, 15.5, f2yB, -0.5, { style: 'office', seed: 83 });

// Crate stack for cover
B(scene, walls, 1.2, 1.2, 1.2, wineCrate, 19, f2yB + 0.6, 1);
B(scene, walls, 1.0, 1.0, 1.0, wineCrate, 19, f2yB + 1.6, 1);

// Cover furniture beside existing iron railing balcony (west side, x=10)
B(scene, walls, 1.2, 1.0, 1.2, wineCrate, 11, f2yB + 0.5, -3);

// West wall window sills (x=10, facing alley) — 2 positions
B(scene, walls, 0.4, 1.0, 2, sandStoneDk, 10, f2yB + 0.5, -2);
B(scene, walls, 0.4, 1.0, 2, sandStoneDk, 10, f2yB + 0.5, 2);

// -- Back room (north, z=-7.5 to z=-20) --

// Shelf against east wall
P.Shelf(scene, walls, 21, f2yB, -14, { style: 'bookcase', seed: 84 });

// Desk near north window
P.Desk(scene, walls, 16, f2yB, -18, { style: 'office', seed: 85 });

// Window sill in north wall overlooking bombsite A
B(scene, walls, 3, 1.0, 0.4, sandStoneDk, 16, f2yB + 0.5, -20);

// West wall window sill (x=10, alley)
B(scene, walls, 0.4, 1.0, 2, sandStoneDk, 10, f2yB + 0.5, -14);
```

- [ ] **Step 5: Update Italy waypoints**

Add 2nd floor waypoints:

```js
waypoints: [
  { x: 0, z: -2 }, { x: 3, z: 3 }, { x: -3, z: 3 },
  { x: -16, z: -6 }, { x: -20, z: -15 }, { x: -20, z: 0 },
  { x: -12.5, z: -2 }, { x: -12.5, z: 5 },
  { x: -2, z: -10 }, { x: 5, z: -10 },
  { x: 7, z: -10 }, { x: 7, z: -20 },
  { x: 9, z: -6 }, { x: 14, z: 6 },
  { x: -8, z: 7 }, { x: -8, z: 14 },
  { x: -20, z: 10 }, { x: -14, z: 16 },
  { x: 14, z: 10 }, { x: 22, z: 10 },
  // Building A 2nd floor
  { x: -2, z: -18 },
  // Building B 2nd floor (front room)
  { x: 16, z: 0 },
  // Building B 2nd floor (back room)
  { x: 16, z: -14 },
],
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- --reporter=verbose 2>&1 | tail -30`
Expected: All tests PASS.

- [ ] **Step 7: Update REQUIREMENTS.md**

Update Building A description (line 440):
```
- **Building A (North)**: 2-story accessible building (x=-8..4, z=-25..-12). Interior stairs ground-to-upper. Terracotta roof with eave overhang. Shutters, flower boxes on south face. Balcony overlooking south with iron railing. Door lintel over south entry. **2nd floor (y=3.5)**: Wood plank flooring, 2 desks with monitors overlooking piazza, filing cabinet cluster against north wall, low bookshelf for interior cover, window sill (h=1.0) in south wall gap, window cutout in east wall facing alley
```

Update Building B description (line 441):
```
- **Building B (East, T-side)**: Large 2-story apartment block (x=10..22, z=-20..5). Ground+upper floor with interior stairs. West balcony with iron railing over alley. Shutters on west face. Terracotta roof with eave. **2nd floor (y=3.5)**: Wood plank flooring, partition wall (h=3) dividing into front/back rooms. Front room: table with chairs, crate stack cover, window sills in south wall overlooking piazza, west wall windows facing alley, cover crate beside balcony railing. Back room: bookcase shelf, desk near north window overlooking bombsite A, west wall window facing alley
```

- [ ] **Step 8: Commit**

```bash
git add js/maps/italy.js tests/unit/maps.test.js REQUIREMENTS.md
git commit -m "feat(italy): furnish 2nd floors with cover, windows, and furniture"
```

---

## Chunk 2: Realism — Dust, Warehouse, Arena, Bloodstrike

### Task 4: Dust — Market Building + Crate Detail

**Files:**
- Modify: `js/maps/dust.js` (lines 98-104 market building, lines 147-161 crates, lines 86-91 perimeter)
- Modify: `REQUIREMENTS.md` (lines 371-378 Dust section)

- [ ] **Step 1: Run existing tests to confirm baseline passes**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: All PASS.

- [ ] **Step 2: Add market building interior detail**

In `js/maps/dust.js`, after the market building roof slab (line 103), add window frames, shutters, and interior counter:

```js
// ── Market building detail ──
// Window frame on back wall (z=-5 face)
D(scene, 1.5, 1.2, 0.1, sandstoneDark, -1.5, 2.5, -4.65);  // frame recess
D(scene, 1.6, 0.1, 0.12, woodDark, -1.5, 3.15, -4.6);       // top frame
D(scene, 1.6, 0.1, 0.12, woodDark, -1.5, 1.85, -4.6);       // bottom frame
D(scene, 0.1, 1.3, 0.12, woodDark, -2.3, 2.5, -4.6);        // left frame
D(scene, 0.1, 1.3, 0.12, woodDark, -0.7, 2.5, -4.6);        // right frame
// Shutters
D(scene, 0.4, 1.2, 0.08, wood, -2.7, 2.5, -4.6);            // left shutter
D(scene, 0.4, 1.2, 0.08, wood, -0.3, 2.5, -4.6);            // right shutter

// Window on left wall (x=-4 face)
D(scene, 0.1, 1.0, 1.2, sandstoneDark, -3.65, 2.5, -3);     // recess
D(scene, 0.12, 0.1, 1.3, woodDark, -3.6, 3.05, -3);         // top frame
D(scene, 0.12, 0.1, 1.3, woodDark, -3.6, 1.95, -3);         // bottom frame
D(scene, 0.12, 1.1, 0.1, woodDark, -3.6, 2.5, -3.6);        // top/bottom
D(scene, 0.12, 1.1, 0.1, woodDark, -3.6, 2.5, -2.4);

// Interior counter with goods
B(scene, walls, 3.5, 0.15, 0.8, wood, 0, 1.0, -3);           // counter surface
D(scene, 0.15, 1.0, 0.15, woodDark, -1.6, 0.5, -3);          // counter legs
D(scene, 0.15, 1.0, 0.15, woodDark, 1.6, 0.5, -3);
P.Sack(scene, -0.5, 1.1, -3, { seed: 35 });                  // goods on counter
Cyl(scene, 0.15, 0.2, 0.35, 6, concreteMat(0xb5651d), 0.5, 1.3, -3); // pot on counter

// Plaster crack overlay on interior
WR(scene, 6, 3, 0.3, sandstone, 0, 2.5, -2, { style: 'plaster_crack' });
```

- [ ] **Step 3: Add crate surface detail**

After the crate/cover section (after line 161), add banding and brackets to the larger crates:

```js
// ── Crate surface detail (banding + brackets on large crates) ──
// Central large crate (4x3x4 at 0,1.5,0)
D(scene, 4.05, 0.1, 0.05, metalMat(0x444444), 0, 0.8, 2.01);   // horizontal band front
D(scene, 4.05, 0.1, 0.05, metalMat(0x444444), 0, 2.2, 2.01);   // upper band front
D(scene, 0.05, 0.1, 4.05, metalMat(0x444444), 2.01, 0.8, 0);   // band side
D(scene, 0.05, 0.1, 4.05, metalMat(0x444444), 2.01, 2.2, 0);
// Corner brackets
D(scene, 0.15, 0.4, 0.05, metalMat(0x333333), 1.95, 0.2, 2.01);
D(scene, 0.15, 0.4, 0.05, metalMat(0x333333), -1.95, 0.2, 2.01);
// Stencil marking
D(scene, 0.6, 0.4, 0.02, concreteMat(0xeeeecc), 0, 1.5, 2.02);

// Tall crate (2x4x6 at 12,2,0)
D(scene, 0.05, 0.1, 6.05, metalMat(0x444444), 13.01, 1.2, 0);
D(scene, 0.05, 0.1, 6.05, metalMat(0x444444), 13.01, 2.8, 0);
D(scene, 0.15, 0.4, 0.05, metalMat(0x333333), 13.01, 0.2, 2.95);
D(scene, 0.15, 0.4, 0.05, metalMat(0x333333), 13.01, 0.2, -2.95);
```

- [ ] **Step 4: Add perimeter wall detail**

After the existing wall damage patches (after line 210), add window-like recesses:

```js
// ── Perimeter wall window recesses ──
// North wall
D(scene, 1.8, 1.5, 0.3, concreteMat(0x6a5a3a), 10, 3, -25.1);  // dark recess
D(scene, 1.9, 0.1, 0.15, sandstoneDark, 10, 3.8, -25.05);       // lintel
D(scene, 1.9, 0.1, 0.15, sandstoneDark, 10, 2.2, -25.05);       // sill
// West wall
D(scene, 0.3, 1.5, 1.8, concreteMat(0x6a5a3a), -25.1, 3.5, -10); // dark recess
D(scene, 0.15, 0.1, 1.9, sandstoneDark, -25.05, 4.3, -10);       // lintel
D(scene, 0.15, 0.1, 1.9, sandstoneDark, -25.05, 2.7, -10);       // sill
// South wall
D(scene, 1.8, 1.5, 0.3, concreteMat(0x6a5a3a), -8, 3, 25.1);
D(scene, 1.9, 0.1, 0.15, sandstoneDark, -8, 3.8, 25.05);
D(scene, 1.9, 0.1, 0.15, sandstoneDark, -8, 2.2, 25.05);

// Additional wall damage patches for variation
WR(scene, 5, 2, 0.3, sandstone, -15, 2.5, -25.05, { style: 'plaster_crack' });
WR(scene, 4, 1.5, 0.3, sandstone, 18, 3, 25.05, { style: 'plaster_crack' });
```

- [ ] **Step 5: Run tests**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: All PASS.

- [ ] **Step 6: Update REQUIREMENTS.md**

Update Dust section (lines 374-378) to document new market windows/shutters/counter, crate banding/brackets, perimeter wall window recesses, and wall damage patches.

- [ ] **Step 7: Commit**

```bash
git add js/maps/dust.js REQUIREMENTS.md
git commit -m "feat(dust): add market windows/shutters, crate banding, wall recesses"
```

---

### Task 5: Warehouse — Container + Wall Detail

**Files:**
- Modify: `js/maps/warehouse.js` (lines 104-111 containers, lines 96-101 perimeter)
- Modify: `REQUIREMENTS.md` (lines 390-414 Warehouse section)

- [ ] **Step 1: Add shipping container corrugation and door detail**

In `js/maps/warehouse.js`, after each container `B()` call, add corrugation ridges, door details, rust streaks, and ID plates. After the blue container (line 106):

```js
// Blue container corrugation (horizontal ridges on long faces, z=-8 ± 1.5)
for (var ci = 0; ci < 6; ci++) {
  D(scene, 12.05, 0.08, 0.02, metalMat(0x1255a0), -8, 0.5 + ci * 0.5, -6.48);
  D(scene, 12.05, 0.08, 0.02, metalMat(0x1255a0), -8, 0.5 + ci * 0.5, -9.52);
}
// Door end locking bars (at x=-14 end)
D(scene, 0.06, 2.8, 0.08, darkMetalMat(0x333333), -14.06, 1.75, -7.3);
D(scene, 0.06, 2.8, 0.08, darkMetalMat(0x333333), -14.06, 1.75, -8.7);
// Door handle
D(scene, 0.15, 0.15, 0.08, metalMat(0x555555), -14.06, 1.75, -8);
// Rust streaks
D(scene, 0.15, 1.5, 0.02, crateMat(0x8b4513), -6, 2.5, -6.48);
D(scene, 0.1, 1.8, 0.02, crateMat(0x7a3a0a), -10, 2.8, -9.52);
// ID plate
D(scene, 0.8, 0.4, 0.02, plasterMat(0xdddddd), -5, 3.0, -6.48);
// Raised lip on top
D(scene, 12.1, 0.06, 0.06, metalMat(0x1050a0), -8, 3.53, -6.47);
D(scene, 12.1, 0.06, 0.06, metalMat(0x1050a0), -8, 3.53, -9.53);
D(scene, 0.06, 0.06, 3.06, metalMat(0x1050a0), -14.03, 3.53, -8);
D(scene, 0.06, 0.06, 3.06, metalMat(0x1050a0), -1.97, 3.53, -8);
```

Add similar detail for the green container (after line 108) and red container (after line 111). Use the same pattern but adjusted positions and colors:

```js
// Green container corrugation
for (var ci2 = 0; ci2 < 5; ci2++) {
  D(scene, 8.05, 0.08, 0.02, metalMat(0x276d2a), 10, 0.4 + ci2 * 0.5, 10.48);
  D(scene, 8.05, 0.08, 0.02, metalMat(0x276d2a), 10, 0.4 + ci2 * 0.5, 13.52);
}
D(scene, 0.06, 2.3, 0.08, darkMetalMat(0x333333), 14.06, 1.5, 11.3);
D(scene, 0.06, 2.3, 0.08, darkMetalMat(0x333333), 14.06, 1.5, 12.7);
D(scene, 0.15, 0.15, 0.08, metalMat(0x555555), 14.06, 1.5, 12);
D(scene, 0.15, 1.2, 0.02, crateMat(0x7a3a0a), 8, 2.2, 10.48);
D(scene, 0.8, 0.4, 0.02, plasterMat(0xdddddd), 12, 2.5, 10.48);
// Green container top lip edges
D(scene, 8.1, 0.06, 0.06, metalMat(0x206a28), 10, 3.03, 10.47);
D(scene, 8.1, 0.06, 0.06, metalMat(0x206a28), 10, 3.03, 13.53);
D(scene, 0.06, 0.06, 3.06, metalMat(0x206a28), 14.03, 3.03, 12);
D(scene, 0.06, 0.06, 3.06, metalMat(0x206a28), 5.97, 3.03, 12);

// Red container corrugation
for (var ci3 = 0; ci3 < 5; ci3++) {
  D(scene, 10.05, 0.08, 0.02, metalMat(0xc83a12), -15, 0.4 + ci3 * 0.5, 8.48);
  D(scene, 10.05, 0.08, 0.02, metalMat(0xc83a12), -15, 0.4 + ci3 * 0.5, 11.52);
}
D(scene, 0.15, 1.5, 0.02, crateMat(0x7a3a0a), -12, 2.3, 8.48);
D(scene, 0.8, 0.4, 0.02, plasterMat(0xdddddd), -18, 2.5, 11.52);
// Red container top lip edges
D(scene, 10.1, 0.06, 0.06, metalMat(0xb83010), -15, 3.03, 8.47);
D(scene, 10.1, 0.06, 0.06, metalMat(0xb83010), -15, 3.03, 11.53);
D(scene, 0.06, 0.06, 3.06, metalMat(0xb83010), -20.03, 3.03, 10);
D(scene, 0.06, 0.06, 3.06, metalMat(0xb83010), -9.97, 3.03, 10);
```

- [ ] **Step 2: Add perimeter wall panel seams and cable trays**

After the perimeter walls section (after line 101):

```js
// ── Perimeter wall panel seams ──
// Vertical seam lines every ~8 units on north/south walls
for (var si = -3; si <= 3; si++) {
  D(scene, 0.04, wallH, 0.1, darkMetalMat(0x444444), si * 8, wallH/2, -25.2);
  D(scene, 0.04, wallH, 0.1, darkMetalMat(0x444444), si * 8, wallH/2, 25.2);
}
// East/west walls
for (var si2 = -2; si2 <= 2; si2++) {
  D(scene, 0.1, wallH, 0.04, darkMetalMat(0x444444), -30.2, wallH/2, si2 * 8);
  D(scene, 0.1, wallH, 0.04, darkMetalMat(0x444444), 30.2, wallH/2, si2 * 8);
}
// Horizontal cable tray on west wall
D(scene, 0.15, 0.08, 30, metalMat(0x5a5a5a), -29.8, 5, 0);
D(scene, 0.04, 0.15, 30, metalMat(0x4a4a4a), -29.8, 5.07, 0); // tray lip
// Cable tray on east wall
D(scene, 0.15, 0.08, 30, metalMat(0x5a5a5a), 29.8, 5, 0);

// Rivet dots at seam intersections (where vertical seams meet horizontal cable trays)
for (var ri = -3; ri <= 3; ri++) {
  D(scene, 0.08, 0.08, 0.12, metalMat(0x666666), ri * 8, 5, -25.22);
  D(scene, 0.08, 0.08, 0.12, metalMat(0x666666), ri * 8, 5, 25.22);
}
for (var ri2 = -2; ri2 <= 2; ri2++) {
  D(scene, 0.12, 0.08, 0.08, metalMat(0x666666), -30.22, 5, ri2 * 8);
  D(scene, 0.12, 0.08, 0.08, metalMat(0x666666), 30.22, 5, ri2 * 8);
}
```

- [ ] **Step 3: Run tests**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: All PASS.

- [ ] **Step 4: Update REQUIREMENTS.md**

Update Warehouse container descriptions to include corrugation ridges, locking bars, door handles, rust streaks, ID plates, and top lip edges. Add panel seams and cable trays to perimeter wall description.

- [ ] **Step 5: Commit**

```bash
git add js/maps/warehouse.js REQUIREMENTS.md
git commit -m "feat(warehouse): add container corrugation/doors/rust, wall panel seams"
```

---

### Task 6: Arena — Inner Block + Wall Detail

**Files:**
- Modify: `js/maps/arena.js` (lines 98-101 inner blocks, lines 88-91 perimeter, lines 93-96 central platform)
- Modify: `REQUIREMENTS.md` (lines 478-488 Arena section)

- [ ] **Step 1: Add inner block panel grids, vents, conduits, and hazard stripes**

In `js/maps/arena.js`, after the inner blocks (after line 101):

```js
// ── Inner block detail ──
var blockPositions = [[-10, -10], [10, -10], [-10, 10], [10, 10]];
var ventMat = H.darkMetalMat(0x333333);
var seamMat = H.metalMat(0x777777);
// Reuse existing hazardMat (defined earlier in build function at line 146)

blockPositions.forEach(function(bp, idx) {
  var bx = bp[0], bz = bp[1];

  // Panel seams: horizontal at mid-height, vertical at center of each face
  // X-facing faces (at bx±4)
  D(scene, 0.04, WH, 0.04, seamMat, bx + 4.01, WH/2, bz);       // east face vertical
  D(scene, 0.04, WH, 0.04, seamMat, bx - 4.01, WH/2, bz);       // west face vertical
  D(scene, 0.04, 0.04, 8.05, seamMat, bx + 4.01, WH/2, bz);     // east face horizontal
  D(scene, 0.04, 0.04, 8.05, seamMat, bx - 4.01, WH/2, bz);     // west face horizontal
  // Z-facing faces (at bz±4)
  D(scene, 0.04, WH, 0.04, seamMat, bx, WH/2, bz + 4.01);
  D(scene, 0.04, WH, 0.04, seamMat, bx, WH/2, bz - 4.01);
  D(scene, 8.05, 0.04, 0.04, seamMat, bx, WH/2, bz + 4.01);
  D(scene, 8.05, 0.04, 0.04, seamMat, bx, WH/2, bz - 4.01);

  // Vent grates (2 per block, on corridor-facing sides)
  var ventFaceX = bx < 0 ? bx + 4.02 : bx - 4.02;
  var ventFaceZ = bz < 0 ? bz + 4.02 : bz - 4.02;
  D(scene, 0.02, 0.6, 1.0, ventMat, ventFaceX, 1.5, bz + 1);
  D(scene, 1.0, 0.6, 0.02, ventMat, bx - 1, 1.5, ventFaceZ);

  // Conduit pipe along vertical edge (corridor-facing corner)
  Cyl(scene, 0.04, 0.04, WH, 6, darkMetalMat, ventFaceX - 0.1 * Math.sign(bx), WH/2, ventFaceZ - 0.1 * Math.sign(bz));

  // Hazard stripe at base of corridor-facing sides
  D(scene, 0.02, 0.15, 2, hazardMat, ventFaceX, 0.08, bz);
  D(scene, 2, 0.15, 0.02, hazardMat, bx, 0.08, ventFaceZ);
});
```

- [ ] **Step 2: Add perimeter wall seams, graffiti patches, and weathering**

After perimeter walls (after line 91):

```js
// ── Perimeter wall detail ──
// Structural seam lines
D(scene, 0.04, WH, 0.04, seamMat, -10, WH/2, -S + 0.01);
D(scene, 0.04, WH, 0.04, seamMat, 0, WH/2, -S + 0.01);
D(scene, 0.04, WH, 0.04, seamMat, 10, WH/2, -S + 0.01);
D(scene, 0.04, WH, 0.04, seamMat, -10, WH/2, S - 0.01);
D(scene, 0.04, WH, 0.04, seamMat, 0, WH/2, S - 0.01);
D(scene, 0.04, WH, 0.04, seamMat, 10, WH/2, S - 0.01);
D(scene, 0.04, WH, 0.04, seamMat, S - 0.01, WH/2, -8);
D(scene, 0.04, WH, 0.04, seamMat, S - 0.01, WH/2, 8);
D(scene, 0.04, WH, 0.04, seamMat, -S + 0.01, WH/2, -8);
D(scene, 0.04, WH, 0.04, seamMat, -S + 0.01, WH/2, 8);

// Graffiti patches (abstract colored rectangles)
var graffitiColors = [0x4466aa, 0xaa4444, 0x44aa66, 0xaaaa44, 0x8844aa, 0xaa6622];
D(scene, 2.5, 1.5, 0.02, H.concreteMat(graffitiColors[0]), -7, 2.5, -S + 0.02);
D(scene, 1.8, 2.0, 0.02, H.concreteMat(graffitiColors[1]), 12, 3, -S + 0.02);
D(scene, 0.02, 1.5, 2.0, H.concreteMat(graffitiColors[2]), S - 0.02, 2, -5);
D(scene, 0.02, 2.5, 1.5, H.concreteMat(graffitiColors[3]), S - 0.02, 3, 8);
D(scene, 2.0, 1.2, 0.02, H.concreteMat(graffitiColors[4]), 5, 2, S - 0.02);
D(scene, 0.02, 1.8, 2.5, H.concreteMat(graffitiColors[5]), -S + 0.02, 2.5, 5);

// Weathering drip stains below seams
var stainMat = H.concreteMat(0x808070);
D(scene, 0.12, 1.0, 0.02, stainMat, -10, 1.5, -S + 0.02);
D(scene, 0.12, 0.8, 0.02, stainMat, 0, 1.8, -S + 0.02);
D(scene, 0.12, 1.2, 0.02, stainMat, 10, 1.3, S - 0.02);
D(scene, 0.02, 0.9, 0.12, stainMat, S - 0.02, 1.6, -8);
D(scene, 0.02, 1.1, 0.12, stainMat, -S + 0.02, 1.4, 8);
```

- [ ] **Step 3: Add central platform edge trim and markings**

After the central platform (after line 96):

```js
// Central platform edge trim
D(scene, 6.1, 0.08, 0.08, seamMat, 0, 1.54, -3.01);
D(scene, 6.1, 0.08, 0.08, seamMat, 0, 1.54, 3.01);
D(scene, 0.08, 0.08, 6.1, seamMat, -3.01, 1.54, 0);
D(scene, 0.08, 0.08, 6.1, seamMat, 3.01, 1.54, 0);
// Cross marking on platform top
D(scene, 4, 0.02, 0.15, hazardMat, 0, 1.53, 0);
D(scene, 0.15, 0.02, 4, hazardMat, 0, 1.53, 0);
```

- [ ] **Step 4: Run tests**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: All PASS.

- [ ] **Step 5: Update REQUIREMENTS.md**

Update Arena section to document inner block panel grids, vent grates, conduit pipes, hazard stripes, perimeter wall seams, graffiti patches, weathering stains, and central platform edge trim with cross marking.

- [ ] **Step 6: Commit**

```bash
git add js/maps/arena.js REQUIREMENTS.md
git commit -m "feat(arena): add block panel grids, vents, conduits, wall graffiti/seams"
```

---

### Task 7: Bloodstrike — Realism Pass

> **Dependency:** Task 7 Step 3 (platform column detail) requires Task 1's structural refactor to be in place — the `keptCorners.forEach` loop must exist before adding column detail to it. Execute Task 1 before Task 7.

**Files:**
- Modify: `js/maps/bloodstrike.js` (inner/outer wall gaps, platform columns)
- Modify: `REQUIREMENTS.md` (Bloodstrike section)

- [ ] **Step 1: Add inner wall gap detail**

In `js/maps/bloodstrike.js`, after the wall alcoves section (after line 391), add detail between brick panels on inner walls:

```js
// ── Inner wall gap detail (between brick panels) ──
// Junction boxes on inner walls
P.Junction(scene, -(ibx + 0.1), 3.5, -5, { seed: 40 });
P.Junction(scene, ibx + 0.1, 3.5, 5, { seed: 41 });

// Mounted pipe runs (horizontal, at ~5m height)
Cyl(scene, 0.05, 0.05, innerW - 2, 6, darkMetal, 0, 5.2, -(ibz + 0.15));
Cyl(scene, 0.05, 0.05, innerW - 2, 6, darkMetal, 0, 5.2, ibz + 0.15);

// Faded poster/sign patches on inner walls
D(scene, 1.5, 1.0, 0.05, concreteMat(0x8a7a5a), 5, 3.0, -(ibz + 0.12));    // faded poster
D(scene, 1.2, 0.8, 0.05, concreteMat(0x7a8a6a), -5, 2.8, ibz + 0.12);      // another
D(scene, 0.05, 1.0, 1.2, concreteMat(0x8a7a6a), -(ibx + 0.12), 3.2, -4);   // side wall

// Water stain drips below pipes
D(scene, 0.1, 0.8, 0.04, concreteMat(0x6a6050), 3, 4.5, -(ibz + 0.1));
D(scene, 0.1, 0.6, 0.04, concreteMat(0x6a6050), -7, 4.6, -(ibz + 0.1));
D(scene, 0.1, 0.7, 0.04, concreteMat(0x6a6050), 8, 4.4, ibz + 0.1);
```

- [ ] **Step 2: Add outer wall gap detail**

After the outer wall brick panels (after line 279):

```js
// ── Outer wall gap detail ──
// Ventilation grates
D(scene, 1.2, 0.8, 0.1, concreteMat(0x3a3a3a), 0, 5.0, -(outerD/2 - 0.15));
D(scene, 1.2, 0.8, 0.1, concreteMat(0x3a3a3a), 0, 5.0, outerD/2 - 0.15);
D(scene, 0.1, 0.8, 1.2, concreteMat(0x3a3a3a), -(outerW/2 - 0.15), 5.0, 0);
D(scene, 0.1, 0.8, 1.2, concreteMat(0x3a3a3a), outerW/2 - 0.15, 5.0, 0);

// Metal bracket strips
D(scene, 0.08, 0.08, 6, darkMetal, 0, 5.5, -(outerD/2 - 0.12));
D(scene, 0.08, 0.08, 6, darkMetal, 0, 5.5, outerD/2 - 0.12);

// Paint fade patches (subtle color variation)
D(scene, 4, 2, 0.06, concreteMat(0xc0a880), -5, 4, -(outerD/2 - 0.08));
D(scene, 3.5, 1.8, 0.06, concreteMat(0xb8a070), 8, 4.5, outerD/2 - 0.08);
D(scene, 0.06, 2, 4, concreteMat(0xc0a880), -(outerW/2 - 0.08), 4, -3);
D(scene, 0.06, 1.8, 3.5, concreteMat(0xb8a070), outerW/2 - 0.08, 4.5, 4);
```

- [ ] **Step 3: Add kept platform column detail**

In the `keptCorners.forEach` loop (from Task 1), after the support columns, add:

```js
// Bolted base plates on columns
D(scene, 0.7, 0.05, 0.7, darkMetal, cx - 3, 0.025, cz - 3 * Math.sign(cz));
D(scene, 0.7, 0.05, 0.7, darkMetal, cx + 3, 0.025, cz - 3 * Math.sign(cz));
// Pipe clamps on columns (mid-height)
D(scene, 0.65, 0.1, 0.65, metal, cx - 3, elevH * 0.6, cz - 3 * Math.sign(cz));
D(scene, 0.65, 0.1, 0.65, metal, cx + 3, elevH * 0.6, cz - 3 * Math.sign(cz));
```

- [ ] **Step 4: Run tests**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: All PASS.

- [ ] **Step 5: Update REQUIREMENTS.md**

Add to Bloodstrike decoration description: junction boxes on inner walls, horizontal pipe runs, faded poster patches, water stain drips, vent grates on outer walls, metal bracket strips, paint fade patches, bolted base plates and pipe clamps on platform columns.

- [ ] **Step 6: Commit**

```bash
git add js/maps/bloodstrike.js REQUIREMENTS.md
git commit -m "feat(bloodstrike): add wall gap detail — junctions, pipes, vents, stains"
```

---

## Chunk 3: Realism — Office, Italy, Aztec

### Task 8: Office — Interior Wall Detail

**Files:**
- Modify: `js/maps/office.js` (lines 110-124 interior walls)
- Test: `tests/unit/maps.test.js` (add Office build test)
- Modify: `REQUIREMENTS.md` (lines 380-388 Office section)

- [ ] **Step 1: Add Office build test**

Add to `tests/unit/maps.test.js`:

```js
describe('Office realism', () => {
  it('should build Office without throwing after realism additions', () => {
    var scene = new THREE.Scene();
    var office = GAME._maps.find(m => m.name === 'Office');
    expect(() => office.build(scene)).not.toThrow();
  });
});
```

- [ ] **Step 2: Add glass panels, door frames, and wall fixtures**

In `js/maps/office.js`, after the interior walls section (after line 124):

```js
// ── Interior wall detail ──
var glassMat = H.glassMat;
var woodDk = woodDark;

// Glass panel inserts on selected walls
// Wall at (-8, wH/2, -8) x=12 — conference room divider
D(scene, 4, 2, 0.08, glassMat(0x88bbdd), -6, 3.5, -7.7);
D(scene, 4.1, 0.06, 0.1, darkMetal, -6, 4.53, -7.7);       // top frame
D(scene, 4.1, 0.06, 0.1, darkMetal, -6, 2.47, -7.7);       // bottom frame
D(scene, 0.06, 2.06, 0.1, darkMetal, -8, 3.5, -7.7);       // left frame
D(scene, 0.06, 2.06, 0.1, darkMetal, -4, 3.5, -7.7);       // right frame

// Wall at (8, wH/2, -8) x=12
D(scene, 4, 2, 0.08, glassMat(0x88bbdd), 10, 3.5, -7.7);
D(scene, 4.1, 0.06, 0.1, darkMetal, 10, 4.53, -7.7);
D(scene, 4.1, 0.06, 0.1, darkMetal, 10, 2.47, -7.7);
D(scene, 0.06, 2.06, 0.1, darkMetal, 8, 3.5, -7.7);
D(scene, 0.06, 2.06, 0.1, darkMetal, 12, 3.5, -7.7);

// Wall at (-8, wH/2, 8) x=12
D(scene, 4, 2, 0.08, glassMat(0x88bbdd), -6, 3.5, 8.3);
D(scene, 4.1, 0.06, 0.1, darkMetal, -6, 4.53, 8.3);
D(scene, 4.1, 0.06, 0.1, darkMetal, -6, 2.47, 8.3);

// Wall at (8, wH/2, 8) x=12
D(scene, 4, 2, 0.08, glassMat(0x88bbdd), 10, 3.5, 8.3);
D(scene, 4.1, 0.06, 0.1, darkMetal, 10, 4.53, 8.3);
D(scene, 4.1, 0.06, 0.1, darkMetal, 10, 2.47, 8.3);

// Additional door frames on wall openings (supplement existing 4)
// Gap between walls at x=-8, z=-8 and z=8 (left side corridor)
D(scene, 0.12, wH, 0.12, woodDk, -8, wH/2, -5.5);
D(scene, 0.12, wH, 0.12, woodDk, -8, wH/2, 5.5);
// Gap in z-direction walls
D(scene, 0.12, wH, 0.12, woodDk, -5, wH/2, 0);
D(scene, 0.12, wH, 0.12, woodDk, 5, wH/2, 0);

// Bulletin board
D(scene, 1.5, 1.0, 0.06, H.fabricMat(0x8b6e4e), -8.1, 3.5, 5);   // cork board
D(scene, 0.3, 0.22, 0.02, plasterMat(0xf5f5f0), -8.5, 3.8, 4.96); // pinned paper
D(scene, 0.25, 0.18, 0.02, plasterMat(0xffffcc), -7.8, 3.6, 4.96); // sticky note
D(scene, 0.28, 0.2, 0.02, plasterMat(0xccddff), -8.2, 3.3, 4.96);  // blue note

// Wall-mounted TV/display
D(scene, 1.8, 1.0, 0.06, darkMetal, 8.1, 3.5, -3);                 // TV body
D(scene, 1.6, 0.85, 0.04, H.emissiveMat(0x111122, 0x2244aa, 0.3), 8.12, 3.5, -3); // screen

// Interior baseboards
D(scene, 12, 0.12, 0.06, woodDk, -8, 0.06, -7.7);
D(scene, 12, 0.12, 0.06, woodDk, 8, 0.06, -7.7);
D(scene, 12, 0.12, 0.06, woodDk, -8, 0.06, 8.3);
D(scene, 12, 0.12, 0.06, woodDk, 8, 0.06, 8.3);
D(scene, 0.06, 0.12, 12, woodDk, -7.7, 0.06, -12);
D(scene, 0.06, 0.12, 12, woodDk, 8.3, 0.06, -12);
D(scene, 0.06, 0.12, 12, woodDk, -7.7, 0.06, 12);
D(scene, 0.06, 0.12, 12, woodDk, 8.3, 0.06, 12);

// Additional whiteboard
D(scene, 2, 1.2, 0.06, plasterMat(0xfafafa), 3.3, 3, 0.3);
D(scene, 2.05, 1.25, 0.04, metal, 3.35, 3, 0.3);

// Smoke detectors on ceiling
Cyl(scene, 0.06, 0.06, 0.03, 8, plasterMat(0xfafafa), -5, 5.72, -5);
Cyl(scene, 0.06, 0.06, 0.03, 8, plasterMat(0xfafafa), 5, 5.72, 5);
Cyl(scene, 0.06, 0.06, 0.03, 8, plasterMat(0xfafafa), -12, 5.72, 12);
```

- [ ] **Step 3: Run tests**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: All PASS.

- [ ] **Step 4: Update REQUIREMENTS.md**

Update Office section to document: glass panel inserts on 4 conference room walls with metal frames, additional door frames on all wall openings, bulletin board with pinned papers, wall-mounted TV display, interior baseboards on all partition walls, additional whiteboard, ceiling smoke detectors.

- [ ] **Step 5: Commit**

```bash
git add js/maps/office.js tests/unit/maps.test.js REQUIREMENTS.md
git commit -m "feat(office): add glass panels, door frames, bulletin board, TV, baseboards"
```

---

### Task 9: Italy — Perimeter Wall Facades

**Files:**
- Modify: `js/maps/italy.js` (lines 104-108 perimeter walls)
- Test: `tests/unit/maps.test.js` (add Italy build test)
- Modify: `REQUIREMENTS.md` (Italy section)

- [ ] **Step 1: Add Italy realism build test**

Add to `tests/unit/maps.test.js`:

```js
describe('Italy realism', () => {
  it('should build Italy without throwing after facade additions', () => {
    var scene = new THREE.Scene();
    var italy = GAME._maps.find(m => m.name === 'Italy');
    expect(() => italy.build(scene)).not.toThrow();
  });
});
```

- [ ] **Step 2: Add window frames with shutters and facade detail**

In `js/maps/italy.js`, after the perimeter walls (after line 108):

```js
// ── Perimeter wall facade detail ──
var shutterGreen = fabricMat(0x3a6630);
var shutterBlue = fabricMat(0x3a4a6a);
var shutterTerracotta = fabricMat(0x9a4a28);
var windowRecess = concreteMat(0x5a4a3a);
var flowerGreen = concreteMat(0x4a8a3a);

// North wall (z=-25) — 3 window sets
[[-15, shutterGreen], [-5, shutterBlue], [8, shutterTerracotta]].forEach(function(w) {
  var wx = w[0], shutterMat = w[1];
  D(scene, 1.5, 1.8, 0.2, windowRecess, wx, 3, -24.7);         // recess
  D(scene, 1.6, 0.1, 0.15, sandStoneDk, wx, 3.95, -24.65);     // lintel
  D(scene, 1.6, 0.1, 0.15, sandStoneDk, wx, 2.05, -24.65);     // sill
  D(scene, 0.35, 1.7, 0.08, shutterMat, wx - 1.1, 3, -24.6);   // left shutter
  D(scene, 0.35, 1.7, 0.08, shutterMat, wx + 1.1, 3, -24.6);   // right shutter
});

// South wall (z=25) — 3 window sets
[[15, shutterTerracotta], [5, shutterGreen], [-10, shutterBlue]].forEach(function(w) {
  var wx = w[0], shutterMat = w[1];
  D(scene, 1.5, 1.8, 0.2, windowRecess, wx, 3, 24.7);
  D(scene, 1.6, 0.1, 0.15, sandStoneDk, wx, 3.95, 24.65);
  D(scene, 1.6, 0.1, 0.15, sandStoneDk, wx, 2.05, 24.65);
  D(scene, 0.35, 1.7, 0.08, shutterMat, wx - 1.1, 3, 24.6);
  D(scene, 0.35, 1.7, 0.08, shutterMat, wx + 1.1, 3, 24.6);
});

// East wall (x=27.5) — 2 window sets
[[-12, shutterGreen], [8, shutterTerracotta]].forEach(function(w) {
  var wz = w[0], shutterMat = w[1];
  D(scene, 0.2, 1.8, 1.5, windowRecess, 27.2, 3, wz);
  D(scene, 0.15, 0.1, 1.6, sandStoneDk, 27.15, 3.95, wz);
  D(scene, 0.15, 0.1, 1.6, sandStoneDk, 27.15, 2.05, wz);
  D(scene, 0.08, 1.7, 0.35, shutterMat, 27.1, 3, wz - 1.1);
  D(scene, 0.08, 1.7, 0.35, shutterMat, 27.1, 3, wz + 1.1);
});

// West wall (x=-27.5) — 2 window sets
[[-5, shutterBlue], [15, shutterGreen]].forEach(function(w) {
  var wz = w[0], shutterMat = w[1];
  D(scene, 0.2, 1.8, 1.5, windowRecess, -27.2, 3, wz);
  D(scene, 0.15, 0.1, 1.6, sandStoneDk, -27.15, 3.95, wz);
  D(scene, 0.15, 0.1, 1.6, sandStoneDk, -27.15, 2.05, wz);
  D(scene, 0.08, 1.7, 0.35, shutterMat, -27.1, 3, wz - 1.1);
  D(scene, 0.08, 1.7, 0.35, shutterMat, -27.1, 3, wz + 1.1);
});

// Flower box ledges under select windows
D(scene, 1.4, 0.2, 0.3, sandStoneDk, -15, 1.95, -24.55);      // box
D(scene, 1.2, 0.15, 0.2, flowerGreen, -15, 2.15, -24.5);       // greenery
D(scene, 1.4, 0.2, 0.3, sandStoneDk, 5, 1.95, 24.55);
D(scene, 1.2, 0.15, 0.2, flowerGreen, 5, 2.15, 24.5);
D(scene, 0.3, 0.2, 1.4, sandStoneDk, 27.15, 1.95, -12);
D(scene, 0.2, 0.15, 1.2, flowerGreen, 27.1, 2.15, -12);

// Facade color variation (plaster patches simulating different buildings)
D(scene, 10, 5.5, 0.08, plasterMat(0xd4a070), -18, 3, -24.85);   // warm orange section
D(scene, 8, 5.5, 0.08, plasterMat(0xddc8a8), 18, 3, -24.85);     // cream section
D(scene, 12, 5.5, 0.08, plasterMat(0xd8a888), -8, 3, 24.85);     // pink section
D(scene, 0.08, 5.5, 12, plasterMat(0xd4a070), 27.35, 3, -5);     // east warm
D(scene, 0.08, 5.5, 10, plasterMat(0xddc8a8), -27.35, 3, 10);    // west cream

// Clothesline between buildings (between Building A east wall and Building B west wall)
D(scene, 0.02, 0.02, 12, ironMat, 7, 4.5, -14);
D(scene, 0.5, 0.5, 0.04, whiteFabric, 7, 4.2, -10);
D(scene, 0.4, 0.6, 0.04, fabricMat(0x8899aa), 7, 4.15, -8);
```

- [ ] **Step 3: Run tests**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: All PASS.

- [ ] **Step 4: Update REQUIREMENTS.md**

Update Italy section to document: perimeter wall window frames with colored shutters (green/blue/terracotta), flower box ledges with greenery, facade color variation patches (orange/cream/pink), additional clothesline with laundry.

- [ ] **Step 5: Commit**

```bash
git add js/maps/italy.js tests/unit/maps.test.js REQUIREMENTS.md
git commit -m "feat(italy): add perimeter wall windows, shutters, flower boxes, facades"
```

---

### Task 10: Aztec — Realism Pass

**Files:**
- Modify: `js/maps/aztec.js` (perimeter walls, corridor walls, temple tiers, river)
- Test: `tests/unit/maps.test.js` (add Aztec build test)
- Modify: `REQUIREMENTS.md` (Aztec section)

- [ ] **Step 1: Add Aztec realism build test**

Add to `tests/unit/maps.test.js`:

```js
describe('Aztec realism', () => {
  it('should build Aztec without throwing after realism additions', () => {
    var scene = new THREE.Scene();
    var aztec = GAME._maps.find(m => m.name === 'Aztec');
    expect(() => aztec.build(scene)).not.toThrow();
  });
});
```

- [ ] **Step 3: Add perimeter wall carved reliefs, moss, and vines**

In `js/maps/aztec.js`, after the perimeter wall vines (after line 108):

```js
// ── Perimeter wall carved relief blocks ──
WR(scene, 8, 4, 0.5, mossStone, -20, 3, -30, { style: 'stone' });
WR(scene, 8, 4, 0.5, mossStone, 10, 3, -30, { style: 'stone' });
WR(scene, 8, 4, 0.5, mossStone, -15, 3, 30, { style: 'stone' });
WR(scene, 8, 4, 0.5, mossStone, 20, 3, 30, { style: 'stone' });
WR(scene, 0.5, 4, 8, mossStone, -35, 3, -10, { style: 'stone' });
WR(scene, 0.5, 4, 8, mossStone, 35, 3, 10, { style: 'stone' });

// Moss patches at perimeter wall bases
D(scene, 6, 0.6, 0.15, moss, -10, 0.3, -29.8);
D(scene, 5, 0.5, 0.15, moss, 15, 0.25, -29.8);
D(scene, 0.15, 0.5, 5, moss, -34.8, 0.25, 5);
D(scene, 0.15, 0.6, 6, moss, 34.8, 0.3, -15);
D(scene, 7, 0.5, 0.15, moss, -5, 0.25, 29.8);
D(scene, 0.15, 0.5, 4, moss, -34.8, 0.25, -20);

// Additional vines on perimeter
P.Vine(scene, 15, 6, -30, 15, 1, -30, { seed: 24 });
P.Vine(scene, -25, 7, -30, -25, 2, -30, { seed: 25 });
P.Vine(scene, 35, 6, 5, 35, 1, 5, { seed: 26 });
P.Vine(scene, -35, 7, -8, -35, 1.5, -8, { seed: 27 });
P.Vine(scene, 10, 6, 30, 10, 1.5, 30, { seed: 28 });
```

- [ ] **Step 4: Add corridor wall glyph panels, torches, and moss**

After the double-door corridor section (after line 158):

```js
// ── Corridor wall detail ──
// Carved glyph panels (contrasting stone rectangles)
D(scene, 0.15, 2.0, 2.5, sandstoneDark, -13.1, 2.5, -8);   // left wall glyph
D(scene, 0.15, 2.0, 2.5, sandstoneDark, -6.9, 2.5, -8);    // right wall glyph
// Glyph face detail (small contrasting insets)
D(scene, 0.05, 0.5, 0.5, darkStone, -13.15, 3.0, -7.5);
D(scene, 0.05, 0.5, 0.5, darkStone, -13.15, 3.0, -8.5);
D(scene, 0.05, 0.5, 0.5, darkStone, -6.85, 3.0, -7.5);
D(scene, 0.05, 0.5, 0.5, darkStone, -6.85, 3.0, -8.5);

// Torch holders with emissive glow
D(scene, 0.15, 0.3, 0.15, darkStone, -13.05, 3.5, -5);      // bracket
D(scene, 0.08, 0.4, 0.08, darkWood, -13.05, 3.9, -5); // torch shaft
addPointLight(scene, 0xff8833, 0.4, 6, -12.5, 4.2, -5);      // torch glow
D(scene, 0.15, 0.3, 0.15, darkStone, -6.95, 3.5, -11);
D(scene, 0.08, 0.4, 0.08, darkWood, -6.95, 3.9, -11);
addPointLight(scene, 0xff8833, 0.4, 6, -7.5, 4.2, -11);

// Moss at corridor wall bases
D(scene, 0.15, 0.4, 12, moss, -13.05, 0.2, -8);
D(scene, 0.15, 0.4, 12, moss, -6.95, 0.2, -8);
```

- [ ] **Step 5: Add temple tier trim and river moss**

After the temple section and before T Spawn (find the appropriate location), add tier trim. Also add river wall detail after the river section (after line 128):

```js
// ── Temple tier glyph panels on riser faces ──
// Base tier front riser (z=11, facing north)
D(scene, 2, 1.0, 0.1, sandstoneDark, 13, 0.75, 10.95);
D(scene, 2, 1.0, 0.1, sandstoneDark, 17, 0.75, 10.95);
// Mid tier front riser
D(scene, 1.5, 1.0, 0.1, sandstoneDark, 14, 2.25, 12.95);
D(scene, 1.5, 1.0, 0.1, sandstoneDark, 16, 2.25, 12.95);
// Moss in step joints
D(scene, 12, 0.08, 0.3, moss, 15, 1.52, 11.2);
D(scene, 8, 0.08, 0.3, moss, 15, 3.02, 13.2);
D(scene, 6, 0.08, 0.3, moss, 15, 4.52, 14.2);
```

River wall moss/algae and roots (add after river boulders, ~line 128):

```js
// ── River wall detail ──
// Moss/algae at water line
D(scene, 35, 0.4, 0.15, concreteMat(0x4a7a3a), 5, -1.8, -2.1);  // north bank algae
D(scene, 35, 0.4, 0.15, concreteMat(0x4a7a3a), 5, -1.8, 6.1);   // south bank algae
D(scene, 20, 0.3, 0.1, concreteMat(0x3a6a2a), 5, -1.5, -2.2);   // darker patches

// Root tendrils over edges
D(scene, 0.08, 1.5, 0.08, woodMat(0x5a4020), -10, -0.5, -2.3);
D(scene, 0.06, 1.8, 0.06, woodMat(0x5a4020), 0, -0.3, -2.3);
D(scene, 0.08, 1.2, 0.08, woodMat(0x5a4020), 12, -0.6, 6.3);
D(scene, 0.06, 1.5, 0.06, woodMat(0x5a4020), 20, -0.4, 6.3);
```

- [ ] **Step 6: Run tests**

Run: `npm test -- --reporter=verbose 2>&1 | tail -20`
Expected: All PASS.

- [ ] **Step 7: Update REQUIREMENTS.md**

Update Aztec section to document: perimeter carved stone relief blocks, moss patches at wall bases, 5 additional vines, corridor glyph panels with carved insets, torch holders with emissive glow lights, corridor moss, temple tier glyph panels and moss in step joints, river bank algae/moss and root tendrils.

- [ ] **Step 8: Commit**

```bash
git add js/maps/aztec.js tests/unit/maps.test.js REQUIREMENTS.md
git commit -m "feat(aztec): add wall carvings, torches, moss, river algae, temple glyphs"
```

---

### Task 11: Final Verification

**Files:**
- All map files, REQUIREMENTS.md, test files

- [ ] **Step 1: Run full test suite**

Run: `npm test -- --reporter=verbose 2>&1`
Expected: All tests PASS. No regressions.

- [ ] **Step 2: Visual smoke test**

Open `index.html` in a browser. Tour each map and verify:
- Bloodstrike: NW/SE platforms have open sightlines, NE/SW have ground cover
- Aztec: Overpass connects to corridor wall top, temple top has altar/pillars
- Italy: Both 2nd floors have furniture and windows
- All maps: No z-fighting, no floating geometry, surface detail is visible

- [ ] **Step 3: Final commit if any adjustments needed**

```bash
git add -A
git commit -m "fix: final adjustments from visual smoke test"
```
