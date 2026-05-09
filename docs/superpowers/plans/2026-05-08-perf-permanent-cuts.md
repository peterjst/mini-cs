# Permanent Performance Cuts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce structural per-frame cost across all quality tiers — specifically by removing 56 dynamic point lights from outdoor maps, dropping bloom from Medium, lowering Medium's pixelRatio, and culling unnecessary shadow casters — so all maps hold at Medium or higher on the user's Windows machine.

**Architecture:** All cuts are **permanent and apply at every quality tier** (no tier-gating). The work decomposes into four independent sections that can ship in any order. Each section is one or more atomic edits with focused verification. The codebase uses an IIFE module pattern with `window.GAME` namespacing, Three.js as a global (`THREE`), and Vitest for tests run via `npm test`.

**Tech Stack:** Three.js r160.1, Web Audio API, Vitest 3.x, jsdom 28.x. No build step. No ES module imports — every JS file is an IIFE attaching to `window.GAME`.

**Pre-flight:** Confirm we are at the head of `main` (or the brainstorming worktree) with no uncommitted changes before starting Task 1.

```bash
git status
git rev-parse --abbrev-ref HEAD
```

Expected: clean working tree, branch is `main` or the brainstorming worktree.

---

## Task 1: Strip the internal PointLight from `addHangingLight`

**Why this task first:** It's the largest single light cut (17 dynamic lights removed across Italy + Bloodstrike), it's a one-helper edit, and it doesn't touch any per-map file. Doing it first means subsequent map edits don't accidentally re-introduce hanging-lamp lights.

**Files:**
- Modify: `js/maps/shared.js:531-539`

**Context for the edit:** The current helper is:

```js
function addHangingLight(scene, x, y, z, color) {
  // Wire
  D(scene, 0.02, 0.5, 0.02, darkMetalMat(0x222222), x, y + 0.25, z);
  // Fixture
  Cyl(scene, 0.15, 0.2, 0.12, 8, metalMat(0x444444), x, y, z);
  // Bulb glow
  D(scene, 0.08, 0.06, 0.08, emissiveMat(0xffffcc, color || 0xffeeaa, 2.0), x, y - 0.06, z);
  addPointLight(scene, color || 0xffeedd, 0.8, 18, x, y - 0.1, z);
}
```

The first three calls draw geometry (cheap). The fourth call creates a runtime point light (expensive — adds to the per-fragment shader light loop on every lit surface for every frame).

- [ ] **Step 1: Edit `js/maps/shared.js:531-539`** — remove the trailing `addPointLight` call only.

After the edit, the function should read:

```js
function addHangingLight(scene, x, y, z, color) {
  // Wire
  D(scene, 0.02, 0.5, 0.02, darkMetalMat(0x222222), x, y + 0.25, z);
  // Fixture
  Cyl(scene, 0.15, 0.2, 0.12, 8, metalMat(0x444444), x, y, z);
  // Bulb glow (emissive — visibly lit without a dynamic point light)
  D(scene, 0.08, 0.06, 0.08, emissiveMat(0xffffcc, color || 0xffeeaa, 2.0), x, y - 0.06, z);
}
```

The `color` parameter is still consumed by the bulb-glow call. The `color || 0xffeeaa` fallback there is unchanged.

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass. There are no tests asserting that `addHangingLight` creates a PointLight; the integration tests in `tests/integration/tier-gating.test.js` and `tests/integration/map-loading.test.js` traverse the scene without counting lights. The `tests/setup.js:299` mock `THREE.PointLight` exists but isn't asserted on by any test that calls `addHangingLight`.

- [ ] **Step 3: Commit**

```bash
git add js/maps/shared.js
git commit -m "perf(maps): drop internal PointLight from addHangingLight helper

Outdoor maps with sun + hemi + ambient illumination already cover the
scene; the per-fragment cost of N dynamic point lights is not justified.
Hanging-lamp geometry (wire, fixture, emissive bulb) is preserved so the
visual presence of the lamp remains. Bloodstrike (14 callers) and Italy
(3 callers) lose 17 dynamic lights from this single change."
```

---

## Task 2: Remove all `addPointLight` calls from Aztec

**Files:**
- Modify: `js/maps/aztec.js`

**Context:** Aztec contains 17 `addPointLight` calls — 14 are direct, 3 are wrapped in `tierGatedLight(...)`. All three of `tierGatedLight`, `addPointLight`, and `tierGatedLight` (variable binding at line 9) become unused after this task.

- [ ] **Step 1: Delete every `addPointLight(...)` and `tierGatedLight(addPointLight(...), N)` line in `js/maps/aztec.js`.**

The lines to delete (verify line numbers with `git diff`; lines may shift as you edit):

- Line 219: `tierGatedLight(addPointLight(scene, 0xff8833, 0.4, 6, -12.5, 4.2, -5), 3);      // torch glow`
- Line 222: `tierGatedLight(addPointLight(scene, 0xff8833, 0.4, 6, -7.5, 4.2, -11), 3);`
- Lines 381–394: the block of 14 lights (mix of plain `addPointLight` and `tierGatedLight(addPointLight(...), 3)`).

Use this command to confirm zero remaining calls after editing:

```bash
grep -nE "addPointLight|tierGatedLight" js/maps/aztec.js
```

Expected output (only the variable bindings, which we delete next):

```
8:  var addPointLight = H.addPointLight;
9:  var tierGatedLight = H.tierGatedLight;
```

- [ ] **Step 2: Delete the unused variable bindings** at `js/maps/aztec.js:8-9`.

Remove these two lines:

```js
var addPointLight = H.addPointLight;
var tierGatedLight = H.tierGatedLight;
```

Confirm zero remaining references:

```bash
grep -nE "addPointLight|tierGatedLight" js/maps/aztec.js
```

Expected: empty output.

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests pass. The `tests/integration/tier-gating.test.js` test for Aztec at line 53 (`if (gatedGroups.length === 0 && gatedLights.length === 0) return;`) handles the no-gated-lights case gracefully. Aztec retains 9 tier-gated decorative *prop groups* (commit `1f475ba`/`ec71a41`), so other tier-gating coverage still exercises Aztec.

- [ ] **Step 4: Smoke test in browser** (manual, time-permitting — optional but recommended).

Open `index.html` in a browser, switch to Aztec, walk the map. Confirm:
- No pitch-black or obviously broken-looking areas.
- Sun shadows still render correctly.
- Decorative props (torches, etc.) still look fine without the warm glow pools — the emissive materials on torches/props remain visible.

- [ ] **Step 5: Commit**

```bash
git add js/maps/aztec.js
git commit -m "perf(maps/aztec): remove all 17 dynamic point lights

Aztec is an outdoor jungle-temple map with sun (0.7) + hemi (0.45) +
ambient (0.3) + fill (0.25) global illumination — strong enough to cover
all surfaces. The 17 decorative point lights (warm-fill + cyan accent)
contribute glow that is not perceptible at FPS pace, while paying
per-fragment shader cost on every lit surface every frame."
```

---

## Task 3: Remove all `addPointLight` calls from Italy

**Files:**
- Modify: `js/maps/italy.js`

**Context:** Italy contains 14 `addPointLight` calls. The 3 `addHangingLight` calls remain — they now produce only fixture geometry (Task 1). The variable binding `addPointLight` at line 8 becomes unused; the `addHangingLight` binding stays in use.

- [ ] **Step 1: Delete every `addPointLight(...)` line in `js/maps/italy.js`.**

The 14 lines to delete are at approximately lines 486, 488, 490–496, 498–501. They are interleaved with `addHangingLight` calls (which we keep). Use this confirmation check after editing:

```bash
grep -nE "addPointLight" js/maps/italy.js
```

Expected output (only the variable binding, which we delete next):

```
8:  var addHangingLight = H.addHangingLight, addPointLight = H.addPointLight;
```

- [ ] **Step 2: Update the unused variable binding** at `js/maps/italy.js:8`.

Change this line:

```js
var addHangingLight = H.addHangingLight, addPointLight = H.addPointLight;
```

To:

```js
var addHangingLight = H.addHangingLight;
```

Confirm:

```bash
grep -nE "addPointLight" js/maps/italy.js
```

Expected: empty output.

```bash
grep -nE "addHangingLight" js/maps/italy.js
```

Expected: 4 lines — 1 variable binding + 3 callers (around lines 487, 489, 497).

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add js/maps/italy.js
git commit -m "perf(maps/italy): remove all 14 dynamic point lights

Italy is an outdoor Mediterranean village with sun (0.95) + hemi (0.4)
+ ambient (0.25) + fill (0.25) — strongest global illumination of the
heavy maps. Hanging-lamp fixtures retained (Task 1 already stripped
their internal lights)."
```

---

## Task 4: Remove all `addPointLight` calls from Bloodstrike

**Files:**
- Modify: `js/maps/bloodstrike.js`

**Context:** Bloodstrike contains 8 `addPointLight` calls (lines 510–517) and 14 `addHangingLight` calls (lines 494–507). The hanging-light callers stay. After Task 1, Bloodstrike has lost 14 dynamic lights from the helper change; this task removes the remaining 8.

- [ ] **Step 1: Delete the 8 `addPointLight(...)` lines** at `js/maps/bloodstrike.js:510-517`.

Verify:

```bash
grep -nE "addPointLight" js/maps/bloodstrike.js
```

Expected output (only the variable binding):

```
8:  var addHangingLight = H.addHangingLight, addPointLight = H.addPointLight;
```

- [ ] **Step 2: Update the unused variable binding** at `js/maps/bloodstrike.js:8`.

Change:

```js
var addHangingLight = H.addHangingLight, addPointLight = H.addPointLight;
```

To:

```js
var addHangingLight = H.addHangingLight;
```

Confirm:

```bash
grep -nE "addPointLight" js/maps/bloodstrike.js
```

Expected: empty output.

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add js/maps/bloodstrike.js
git commit -m "perf(maps/bloodstrike): remove all 8 dynamic point lights

Bloodstrike is an outdoor arena with sun (1.0) + hemi (0.4) + ambient
(0.3) + fill (0.4). Combined with Task 1 (addHangingLight helper now
fixture-only), Bloodstrike loses 22 dynamic point lights total."
```

---

## Task 5: Add a regression test asserting outdoor maps have zero PointLights

**Why:** The user's standing feedback (`memory/feedback_test_coverage_class.md`) is to test the *whole pattern*, not just the instance. Future contributors might add `addPointLight` calls to these maps without realizing the design constraint. A test pins the behavior.

**Files:**
- Create: `tests/integration/outdoor-maps-no-dynamic-lights.test.js`

- [ ] **Step 1: Write the new test file**

```js
// tests/integration/outdoor-maps-no-dynamic-lights.test.js
import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/core/quality.js');
  loadModule('js/maps/shared.js');
  loadModule('js/maps/props.js');
  loadModule('js/maps/aztec.js');
  loadModule('js/maps/italy.js');
  loadModule('js/maps/bloodstrike.js');
});

describe('outdoor maps must not add dynamic point lights', () => {
  // Aztec, Italy, Bloodstrike are outdoor maps. Their sun + hemi + ambient
  // global illumination is sufficient; dynamic point lights cost per-fragment
  // shader work on every lit surface for negligible visible benefit.
  // See: docs/superpowers/specs/2026-05-08-perf-permanent-cuts-design.md
  var outdoorMaps = ['Aztec', 'Italy', 'Bloodstrike'];

  outdoorMaps.forEach(function(name) {
    it(name + ' has no PointLights in its built scene', function() {
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

      var pointLightCount = 0;
      scene.traverse(function(o) {
        // The mock THREE.PointLight in tests/setup.js sets .isLight = true and
        // identifies the light type via constructor; we count by checking that
        // the object is a light AND has a distance property (only PointLight
        // and SpotLight expose distance; outdoor maps shouldn't add either).
        if (o.isLight && typeof o.distance === 'number') {
          pointLightCount++;
        }
      });

      expect(pointLightCount).toBe(0);
    });
  });
});
```

- [ ] **Step 2: Sanity-check the mock**

The test's traversal predicate (`o.isLight && typeof o.distance === 'number'`) relies on the mock at `tests/setup.js:299-308` setting `distance`. Confirm the existing mock already does:

```bash
grep -A 8 "PointLight: function" tests/setup.js
```

Expected: line 304 reads `l.distance = distance || 0;`. AmbientLight and DirectionalLight mocks do **not** set `distance`, so the predicate cleanly identifies only PointLights. No mock edit needed; this step is just verification.

- [ ] **Step 3: Run the new test**

```bash
npm test -- tests/integration/outdoor-maps-no-dynamic-lights.test.js
```

Expected: all 3 cases pass (Aztec, Italy, Bloodstrike each with `pointLightCount === 0`).

- [ ] **Step 4: Run the full test suite**

```bash
npm test
```

Expected: full suite passes including the new test.

- [ ] **Step 5: Commit**

```bash
git add tests/integration/outdoor-maps-no-dynamic-lights.test.js
git commit -m "test(maps): outdoor maps must not add dynamic point lights

Pins the design constraint from the 2026-05-08 perf-cuts spec:
Aztec/Italy/Bloodstrike rely on sun + hemi + ambient global
illumination. Adding any new addPointLight call (or addHangingLight
that re-introduces an internal PointLight) will fail this test."
```

---

## Task 6: Move bloom from Medium tier to High

**Files:**
- Modify: `js/core/quality.js:14`
- Modify: `tests/unit/quality.test.js:58-63`

**Context:** The `LEVELS` table at `js/core/quality.js:10-17` controls per-tier rendering features. Currently bloom is on at levels 3 (Medium), 4 (High), and 5 (Ultra). After this change, bloom is on only at levels 4 and 5.

- [ ] **Step 1: Update the failing test first** (TDD).

Replace `tests/unit/quality.test.js:58-63`:

```js
  it('should have bloom enabled at levels 3-5', () => {
    for (var i = 3; i <= 5; i++) {
      expect(GAME.quality.LEVELS[i].bloom).toBe(true);
    }
    expect(GAME.quality.LEVELS[2].bloom).toBe(false);
  });
```

With:

```js
  it('should have bloom enabled at levels 4-5 only', () => {
    for (var i = 4; i <= 5; i++) {
      expect(GAME.quality.LEVELS[i].bloom).toBe(true);
    }
    for (var i = 0; i <= 3; i++) {
      expect(GAME.quality.LEVELS[i].bloom).toBe(false);
    }
  });
```

- [ ] **Step 2: Run the test, expect it to fail**

```bash
npm test -- tests/unit/quality.test.js
```

Expected: the new test fails with `expected true to be false` on level 3 (Medium still has bloom: true).

- [ ] **Step 3: Edit `js/core/quality.js:14`** to flip Medium's bloom flag.

Change:

```js
{ name: 'Medium',   pixelRatio: 1.5,  shadows: true,  shadowType: 'PCF', shadowMapSize: 1024, ssao: false, bloom: true,  sharpen: false },
```

To:

```js
{ name: 'Medium',   pixelRatio: 1.5,  shadows: true,  shadowType: 'PCF', shadowMapSize: 1024, ssao: false, bloom: false, sharpen: false },
```

(Note: pixelRatio stays 1.5 in this task; Task 7 changes it.)

- [ ] **Step 4: Run the test, expect it to pass**

```bash
npm test -- tests/unit/quality.test.js
```

Expected: the updated test passes.

- [ ] **Step 5: Run the full test suite**

```bash
npm test
```

Expected: all tests pass. No other test should reference bloom at level 3 specifically.

- [ ] **Step 6: Commit**

```bash
git add js/core/quality.js tests/unit/quality.test.js
git commit -m "perf(quality): move bloom from Medium tier to High

UnrealBloom runs a multi-mip downsample chain plus an additive
composite — multiple fullscreen passes per frame. On procedural diffuse
scenes the visible contribution at Medium is mild glow around emissive
materials. Players who hold Medium for the upgrade hold-time still
reach High and get bloom there."
```

---

## Task 7: Reduce Medium tier pixelRatio from 1.5 to 1.25

**Files:**
- Modify: `js/core/quality.js:14`

**Context:** Medium currently uses `pixelRatio: 1.5`. On a 1.5–2.0 DPR Windows display, the rendered pixel count is ~2.25× native. Dropping to 1.25 reduces fragment work by ~30% at that tier (`(1.5² − 1.25²) / 1.5²`).

There is no test asserting Medium's pixelRatio specifically. The existing `tests/unit/quality.test.js:35-40` only asserts that pixel ratios are non-decreasing across the LEVELS array, which 1.25 still satisfies (Low is 1.0, High is 1.5).

- [ ] **Step 1: Edit `js/core/quality.js:14`**

After Task 6, the Medium row reads:

```js
{ name: 'Medium',   pixelRatio: 1.5,  shadows: true,  shadowType: 'PCF', shadowMapSize: 1024, ssao: false, bloom: false, sharpen: false },
```

Change to:

```js
{ name: 'Medium',   pixelRatio: 1.25, shadows: true,  shadowType: 'PCF', shadowMapSize: 1024, ssao: false, bloom: false, sharpen: false },
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass. The non-decreasing-pixelRatio test (1.0 ≤ 1.25 ≤ 1.5) still holds.

- [ ] **Step 3: Commit**

```bash
git add js/core/quality.js
git commit -m "perf(quality): reduce Medium pixelRatio from 1.5 to 1.25

On 1.5+ DPR displays this drops fragment work by ~30% at Medium tier.
Combined with the Medium bloom removal (prior commit), Medium becomes
substantially cheaper while retaining shadows and a 1024 shadow map."
```

---

## Task 8: Audit and trim `castShadow` flags in `js/maps/props.js`

**Files:**
- Modify: `js/maps/props.js`

**Context:** `props.js` is 1338 lines and contains many small decorative meshes that set `castShadow = true`. Each shadow-caster is rendered into the shadow map every frame for every shadow-casting light. Small props (bottles, papers, mugs, books, controllers, trim, brackets, baseboards) produce shadows at or below one shadow-map texel — invisible at runtime but real CPU/GPU work. Large structural props (crates, barrels, large furniture, vehicles) keep `castShadow` because their silhouette on the floor is gameplay-visible.

`receiveShadow` is much cheaper (a per-fragment lookup vs. a render pass per light) and we leave those flags alone.

This is the largest diff of the plan. Approach it as a single pass: scroll the file, decide each `castShadow = true` keeper-or-dropper based on the criteria below, and commit the result as one diff.

**Criteria** (from spec, restated for readability):

- **Keep `castShadow = true`** on:
  - Crates, barrels, dumpsters, vehicles
  - Large furniture (desks, chairs, couches, bookshelves, lockers)
  - Pillars, columns, statues, signage > 1m
  - Anything > ~1m in any dimension that occupies open space
  - Anything whose floor-shadow silhouette is a gameplay tell (a crate the player ducks behind)

- **Remove `castShadow`** (let it default to `false`) on:
  - Bottles, cans, mugs, cups, papers, books, magazines, pens
  - Controllers, phones, small electronics
  - Trim, banding, brackets, baseboards, decorative cylinders/spheres < 0.5m
  - Anything resting on top of another shadow-caster (e.g., papers on a desk that already casts a shadow)
  - Decorative cables, wires, switches

When in doubt, **keep** `castShadow = true`. The audit favors caution.

- [ ] **Step 1: Inventory the current state**

```bash
grep -nE "castShadow\s*=\s*true" js/maps/props.js | wc -l
grep -nE "castShadow\s*=\s*true" js/maps/props.js
```

Note the count and the line numbers. This list defines the audit surface.

- [ ] **Step 2: Walk the file and trim**

Open `js/maps/props.js`. For each `castShadow = true` line in the inventory, locate the surrounding function (often a top-level `function name(...)` block in the IIFE). Read the function name and the mesh dimensions to classify the prop.

For each match, either:
- **Keep** the line as-is (the prop is large/structural).
- **Delete** the entire `someMesh.castShadow = true;` line (no replacement — the default is already `false`).

Do **not** convert `castShadow = true` to `castShadow = false`. Deleting the line is cleaner; the default suffices.

Do **not** modify any `receiveShadow` line.

If a prop function sets `castShadow` on a shared/parent group (rare; typical pattern in this file is per-mesh), be cautious — those flags propagate to children at render time in Three.js. Keep parent-group flags unless the entire group is small.

- [ ] **Step 3: Confirm changes with diff inspection**

```bash
git diff --stat js/maps/props.js
git diff js/maps/props.js | grep -E "^[-+]" | head -60
```

Expected: a series of `-  someMesh.castShadow = true;` lines, no `+` additions (you should not be *adding* shadow casters in this task).

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all tests pass. The relevant integration test is `tests/integration/map-material-validity.test.js` which checks materials, not shadow flags. `tests/unit/props.test.js` exercises prop functions; review its assertions — if any test asserts `castShadow === true` on a small prop you trimmed, update the test to match the new behavior (and prefer removing the assertion entirely if it doesn't carry design intent).

- [ ] **Step 5: Smoke test in browser** (manual, time-permitting — optional but recommended).

Open `index.html`, visit Office (heaviest prop density). Walk near desks, chairs, prop clusters. Confirm:
- Large props (crates, dumpsters, big furniture) still cast shadows.
- Small props (bottles, papers, etc.) no longer cast shadows — and you cannot tell from gameplay distance.
- No prop appears "floating" because of a missing shadow contact.

If a specific prop reads as floating, restore its `castShadow = true` in a follow-up edit before committing.

- [ ] **Step 6: Commit**

```bash
git add js/maps/props.js
# Plus tests/unit/props.test.js if you adjusted assertions in step 4.
git commit -m "perf(maps/props): drop castShadow on small decorative meshes

Small props (bottles, papers, trim, brackets, etc.) cast shadows that
are at or below one shadow-map texel — invisible at runtime, real cost
to render every frame. Large structural props (crates, barrels, big
furniture, vehicles) keep castShadow because their silhouette is
gameplay-visible. receiveShadow flags are unchanged."
```

---

## Task 9: Update `docs/gotchas.md`

**Files:**
- Modify: `docs/gotchas.md`

**Context:** The spec calls for a gotcha note documenting that outdoor maps in this codebase don't use dynamic point lights — they rely on directional sun + hemisphere + ambient. Future contributors should follow the pattern.

- [ ] **Step 1: Read the existing gotchas file** to match style and section conventions.

```bash
cat docs/gotchas.md | head -40
```

Note the heading style and the level of detail used in existing entries.

- [ ] **Step 2: Append a new gotcha entry** that matches the existing style.

The entry's substance (adapt to whatever style the file uses):

> **Outdoor maps: no dynamic point lights**
>
> Aztec, Italy, and Bloodstrike are outdoor maps. They rely on the directional sun + hemisphere + ambient lights configured in each map's `lighting` block; they do **not** call `addPointLight` or `addHangingLight` (the helper still draws the lamp fixture but no longer adds a runtime PointLight). Adding dynamic point lights to these maps re-introduces per-fragment shader cost on every lit surface and is enforced against by `tests/integration/outdoor-maps-no-dynamic-lights.test.js`. If you genuinely need extra fill light in a specific area, raise the map's `fillIntensity` or `hemiIntensity` instead of adding a runtime light.
>
> Indoor maps (Office, Warehouse) may continue to use point lights where they do perceptible work.

- [ ] **Step 3: Commit**

```bash
git add docs/gotchas.md
git commit -m "docs(gotchas): outdoor maps don't use dynamic point lights"
```

---

## Final Verification

After all tasks complete, run the full suite once more and check the diff summary:

```bash
npm test
git log --oneline main..HEAD  # or origin/main..HEAD if appropriate
git diff --stat main..HEAD
```

Expected:
- All tests pass.
- 8–9 commits (one per task; Task 5's `tests/setup.js` edit may merge into Task 5's commit).
- Diff touches: `js/maps/shared.js`, `js/maps/aztec.js`, `js/maps/italy.js`, `js/maps/bloodstrike.js`, `js/core/quality.js`, `js/maps/props.js`, `tests/unit/quality.test.js`, `tests/integration/outdoor-maps-no-dynamic-lights.test.js`, possibly `tests/setup.js`, possibly `tests/unit/props.test.js`, `docs/gotchas.md`.

Manual perf check (the actual goal):
- Open `index.html` on the user's Windows machine.
- Cycle through Dust, Office, Warehouse, Aztec, Italy, Bloodstrike, Arena.
- Watch the quality tier toast in the corner for each map.
- Expected: every map settles at Medium or higher. If any map still drops to Low or below, the spec's "Out of Scope — Office prop-density follow-up" applies; file a follow-up.
