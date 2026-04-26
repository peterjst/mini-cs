# Warehouse Map Visibility Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make enemies clearly visible on the warehouse map by raising surface albedo, lighting intensity, and easing color grading — without losing the map's industrial identity.

**Architecture:** All edits scoped to `js/maps/warehouse.js`. Three coordinated tuning changes — surface colors, lighting intensities, and color grading — each in its own task and commit so any one can be reverted independently. No new files, no test changes (existing structural tests in `tests/unit/maps.test.js` already validate the shape of `lighting` and `colorGrade`).

**Tech Stack:** Three.js r160.1 (global `THREE`), vanilla JS IIFE modules on `window.GAME`, vitest + jsdom for tests.

**Spec:** `docs/superpowers/specs/2026-04-26-warehouse-visibility-design.md`

**Testing strategy:** This is a visual-tuning task. Per `AGENTS.md`, tests-after applies to visuals. Existing `tests/unit/maps.test.js` covers structural invariants (every map has `lighting` and `colorGrade` with the right field types). Manual in-browser verification is the primary check.

---

## Task 1: Brighten warehouse surface materials

**Why:** Floor and wall surfaces at ~38–42% reflectance are the biggest contributor to enemies blending in. Bumping them to ~50% gives bot silhouettes contrast against the floor.

**Files:**
- Modify: `js/maps/warehouse.js:74-76` (the three surface variable declarations inside `build`)

- [ ] **Step 1: Edit `darkConcrete`, `conc`, `corrMetal` color literals**

In `js/maps/warehouse.js`, locate this block (line ~74):

```js
var darkConcrete = warehouseFloorMat(0x606060);
var conc = concreteMat(0x707070);
var corrMetal = metalMat(0x6a6a6a);
```

Change to:

```js
var darkConcrete = warehouseFloorMat(0x808080);
var conc = concreteMat(0x858585);
var corrMetal = metalMat(0x808080);
```

Leave all other material declarations (`metalFloor`, `metalRail`, `metalDark`, etc.) and all hard-coded `metalMat(...)` / `darkMetalMat(...)` calls in the seam/rivet/lip details unchanged — those are decorative accents and should remain darker than the base surfaces for visual contrast.

- [ ] **Step 2: Run the test suite**

Run: `npm test`
Expected: all tests pass. The map-loading test (`tests/integration/map-loading.test.js`) and structural tests in `tests/unit/maps.test.js` should still pass — surface colors do not affect the `lighting`/`colorGrade` shape.

- [ ] **Step 3: Manual visual check**

Open `index.html` in a browser, start a Competitive or Shuffle Map match, force or rotate to the Warehouse map. Walk to:
- mid open floor (around 0,0)
- east side under the second-floor catwalk (around x=22, z=0)
- behind the blue container (around x=-8, z=-8)

Floor and walls should now read as medium gray rather than dark gray. Bot silhouettes should be more readable. Map should still feel industrial.

- [ ] **Step 4: Commit**

```bash
git add js/maps/warehouse.js
git commit -m "feat(warehouse): raise floor/wall albedo for enemy contrast"
```

---

## Task 2: Raise warehouse lighting intensities

**Why:** Warehouse total light intensity (1.15) was the lowest of any map (peers 1.80–1.85). Bringing it to ~1.75 puts it in line, and combined with the now-brighter surfaces from Task 1, the whole space reads as lit rather than gloomy.

**Files:**
- Modify: `js/maps/warehouse.js:19-30` (the `lighting:` block)

- [ ] **Step 1: Edit four lighting intensity values**

In `js/maps/warehouse.js`, locate the `lighting:` block:

```js
lighting: {
  sunColor: 0xfff4e5,
  sunIntensity: 0.5,
  sunPos: [12, 20, 10],
  fillColor: 0xa09880,
  fillIntensity: 0.15,
  ambientIntensity: 0.2,
  hemiSkyColor: 0x909090,
  hemiGroundColor: 0x605040,
  hemiIntensity: 0.3,
  shadowFrustumPadding: 5
},
```

Change four intensity fields only (preserve all colors and `sunPos` to keep the warm-industrial cast):

```js
lighting: {
  sunColor: 0xfff4e5,
  sunIntensity: 0.8,
  sunPos: [12, 20, 10],
  fillColor: 0xa09880,
  fillIntensity: 0.25,
  ambientIntensity: 0.3,
  hemiSkyColor: 0x909090,
  hemiGroundColor: 0x605040,
  hemiIntensity: 0.4,
  shadowFrustumPadding: 5
},
```

- [ ] **Step 2: Run the test suite**

Run: `npm test`
Expected: all tests pass. `tests/unit/maps.test.js` "every map should have a lighting config" should still pass — the field set is unchanged.

- [ ] **Step 3: Manual visual check**

Reload the warehouse map in the browser. The whole map should be visibly brighter. Direct sunlight on the floor should be more pronounced. Areas previously in deep shadow (under the east catwalk, inside containers) should still be shadowed but no longer near-black.

- [ ] **Step 4: Commit**

```bash
git add js/maps/warehouse.js
git commit -m "feat(warehouse): raise sun/ambient/hemi/fill intensities to peer levels"
```

---

## Task 3: Ease color grading shadows and vignette

**Why:** Even with brighter lights and surfaces, the grade was darkening already-shadowed areas (`shadows: [0.85, 0.8, 0.75]`) and pulling edge brightness down (`vignetteStrength: 0.4`, the highest of any map). Easing both stops the grade from fighting visibility while keeping the warm tint and some vignette for atmosphere.

**Files:**
- Modify: `js/maps/warehouse.js:31-37` (the `colorGrade:` block)

- [ ] **Step 1: Edit `shadows` and `vignetteStrength` only**

In `js/maps/warehouse.js`, locate the `colorGrade:` block:

```js
colorGrade: {
  tint: [1.0, 0.97, 0.92],
  shadows: [0.85, 0.8, 0.75],
  contrast: 1.1,
  saturation: 0.9,
  vignetteStrength: 0.4
},
```

Change to:

```js
colorGrade: {
  tint: [1.0, 0.97, 0.92],
  shadows: [0.95, 0.92, 0.88],
  contrast: 1.1,
  saturation: 0.9,
  vignetteStrength: 0.3
},
```

Leave `tint`, `contrast`, and `saturation` unchanged — those define the warehouse's warm desaturated identity.

- [ ] **Step 2: Run the test suite**

Run: `npm test`
Expected: all tests pass. `tests/unit/maps.test.js` "every map should have a colorGrade config" should still pass — the field set is unchanged.

- [ ] **Step 3: Manual visual check**

Reload the warehouse map in the browser. Walk to the perimeter (corners of the map) — the vignette should be less heavy. Walk into shadowed zones (under catwalk, near containers) — shadows should still be warm-tinted but not crushed dark.

- [ ] **Step 4: Commit**

```bash
git add js/maps/warehouse.js
git commit -m "feat(warehouse): lift shadow tint and reduce vignette for visibility"
```

---

## Task 4: End-to-end validation

**Why:** Confirm that the three coordinated changes together solve the original problem and that nothing regressed.

**Files:** none (validation only)

- [ ] **Step 1: Run the full test suite once more**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Full warehouse playthrough**

Load Warehouse via Competitive (or any mode that supports it) and verify all of the following:
- From CT spawn (-22, -18), bots at mid (0, 0) are clearly visible.
- From T spawn (18, 12), bots at mid are clearly visible.
- Under the east catwalk (around x=22, z=0), enemies are readable.
- Behind the blue shipping container (x=-8, z=-8), enemies are readable.
- At bombsite A (12, -8) and bombsite B (-8, 12), enemies are readable.
- The map still looks distinctly industrial: gray palette, warm tint, some vignette, visible shadows. It should not be mistaken for dust or italy.

- [ ] **Step 3: Diff against `main`**

Run: `git log --oneline main..HEAD`
Expected: three commits — one per task, all touching only `js/maps/warehouse.js`.

Run: `git diff main -- js/maps/warehouse.js`
Expected: exactly the changes specified in Tasks 1–3 (3 surface color literals, 4 lighting intensities, 1 shadows tuple, 1 vignetteStrength). No unintended edits.

- [ ] **Step 4: If issues are found**

If enemy visibility is still inadequate, surface the problem area to the user before making further changes — a fourth lever (localized point lights for specific dark pockets) is listed as "Out of Scope (Future Work)" in the spec and would need a follow-up.

If the map now feels generic / lost its identity, propose narrowing the changes (e.g., revert Task 3, keep Tasks 1+2) rather than adding new offsetting tweaks.
