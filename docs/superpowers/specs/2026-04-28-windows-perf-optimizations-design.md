# Windows Performance Optimizations Design

## Problem

On weaker Windows desktop hardware running Chrome, the adaptive quality system stabilizes at the **Very Low** tier (DPR 1.0, no shadows, no post-processing). The adaptive system itself works correctly — it downgrades smoothly and the resulting frame rate is playable — but the underlying per-frame baseline is expensive enough that no higher tier is reachable. The same code on macOS and mobile (different hardware) does not exhibit the issue.

The goal is to reduce baseline rendering cost so the adaptive system can settle at a higher visual tier on the same Windows hardware, with **no user-visible changes** to the rendered scene, UI, or quality ladder.

## Goals

- Reduce per-frame CPU and GPU cost on weak Windows hardware
- Preserve identical visual output at every quality tier
- Keep changes independently shippable so each can be measured separately
- No new UI, no settings, no quality-tier redefinitions

## Non-Goals

- Changing the adaptive quality ladder or its thresholds
- Adding manual quality controls
- Persisting quality across sessions
- Reducing visual fidelity at any tier
- Profiling-driven optimization (no instrumentation infrastructure required for this work)

---

## Section 1: Request High-Performance GPU

### Current Behavior

`js/core/renderer.js:10` constructs the `THREE.WebGLRenderer` with only `{ antialias: !GAME.isMobile }`. No `powerPreference` is specified, so Chrome defaults to `"default"`, which on machines with hybrid graphics typically picks the **integrated** GPU. Many Windows laptops and some desktops have both an integrated and a discrete GPU; the integrated path can be 2–5× slower than the discrete one for WebGL workloads.

### Proposed Design

Add `powerPreference: 'high-performance'` to the renderer options:

```js
var renderer = new THREE.WebGLRenderer({
  antialias: !GAME.isMobile,
  powerPreference: 'high-performance'
});
```

The flag is advisory. Browsers may honor or ignore it; on single-GPU machines it is a no-op. There is no failure mode requiring code changes elsewhere.

### Files Changed

- `js/core/renderer.js` — single line addition at renderer construction

### Risks

- **Battery on Windows laptops:** discrete GPU draws more power. Acceptable: this is a 3D shooter; users running it expect GPU-class power draw.
- **Edge case:** a small number of integrated-only systems may take a brief stall on first context creation as the browser tries to honor the hint and falls back. Negligible.

### Validation

- Manual test on the Windows machine: reload, let adaptive settle, read `GAME.quality.name` from the console. Expectation: settles at Low or higher (was Very Low).
- Manual test on Mac: confirm no regression — should still settle at Ultra.
- No automated test possible — this is a browser-level hint with no observable JS side-effect.

---

## Section 2: Disable Matrix Auto-Update for Static Map Geometry

### Current Behavior

By default, every `THREE.Object3D` has `matrixAutoUpdate = true`. On every frame, the renderer walks the scene graph and recomputes each object's local and world matrices via `updateMatrixWorld()`. The maps in `js/maps/*.js` (~5000 LOC across 9 maps) build hundreds of static meshes — walls, floors, props, decoration — that never move after build. Verified by code search: no map uses `setInterval`, `requestAnimationFrame`, `onBeforeRender`, or any per-frame update hook on its geometry. All `rotation.*` assignments in maps are one-shot at build time.

The matrix recompute work for static meshes is wasted CPU on every frame. Individually each is cheap; in aggregate it is meaningful, especially on weaker CPUs which often pair with weaker GPUs on Windows hardware.

### Proposed Design

Introduce a small helper that recursively marks a subtree as static:

```js
GAME.markStatic = function(object3D) {
  object3D.updateMatrix();
  object3D.matrixAutoUpdate = false;
  for (var i = 0; i < object3D.children.length; i++) {
    GAME.markStatic(object3D.children[i]);
  }
};
```

Each map's build function calls `GAME.markStatic(...)` on the top-level group(s) it constructs, after positioning is finalized.

Dynamic objects added later — players, enemies, projectiles, dropped weapons, particles, effects — are added independently and retain the default `matrixAutoUpdate = true`. The helper is only invoked on map content.

### Files Changed

- New helper exposed on `GAME` — placement: `js/core/main.js` (alongside other `GAME.*` utilities) or a new `js/core/util.js` if cleaner. Prefer adding to `main.js` to avoid an extra script tag.
- Each of the 9 map files (`arena.js`, `aztec.js`, `bloodstrike.js`, `dust.js`, `italy.js`, `office.js`, `warehouse.js`, plus `props.js` and `shared.js` if they expose builder functions called by maps): one call to `GAME.markStatic(rootGroup)` at end of build.

### Risks

- If any "static" mesh is later mutated (position, rotation, scale) by code outside the map files, that mutation will not propagate visually because the matrix is frozen. Audit each `markStatic` call site to confirm the marked subtree is truly inert post-build.
- If a future feature animates a previously-static object, the developer must remember to either omit it from the static mark or set `matrixAutoUpdate = true` after marking. Document the convention near the helper definition.

### Validation

- Walk through each map at runtime, confirm geometry renders identically (no missing or misplaced objects).
- No automated test possible — this is a CPU-only optimization with no observable behavior change.
- Existing test suite (`tests/`) must continue to pass with no modification.

---

## Section 3: Eliminate Per-Frame `THREE.*` Allocations

### Current Behavior

Code search shows ~130 occurrences of `new THREE.Vector*`, `new THREE.Matrix*`, `new THREE.Quaternion`, `new THREE.Euler`, `new THREE.Color`, and `new THREE.Box*` across the per-frame system files (`js/systems/weapons.js`, `js/systems/enemies.js`, `js/core/player.js`, `js/core/main.js`). Most are setup-time, but a non-trivial subset run inside the per-frame update path — invoked from the game loop directly or transitively (player movement, weapon firing, enemy update, raycast logic).

Each per-frame allocation contributes to GC pressure. On weaker hardware this manifests as periodic stutters (felt as "frame drops") rather than a steady FPS reduction. macOS V8 GC behavior differs from Windows V8, which is one explanation for the platform-specific feel of the issue.

### Proposed Design

Audit the per-frame call paths and hoist hot-path `THREE.*` allocations to module-scoped reusable scratch objects. Pattern:

```js
// At top of file
var _scratchVecA = new THREE.Vector3();
var _scratchVecB = new THREE.Vector3();
var _scratchMat  = new THREE.Matrix4();

// In a per-frame function (replacing `new THREE.Vector3(x, y, z)`)
_scratchVecA.set(x, y, z);
// ... use _scratchVecA synchronously, do not store the reference anywhere
```

**Audit scope, in priority order:**

1. `js/core/player.js` — `update()` and movement helpers (called every frame)
2. `js/systems/weapons.js` — `update()`, `tryFire()`, raycast paths, particle ticks
3. `js/systems/enemies.js` — per-enemy `update()`, AI, aim, firing, tracer logic
4. `js/core/main.js` — game-loop callees (explosion processing, hit detection)

For each file: identify which functions are called per-frame, locate `new THREE.*` inside them, hoist to module scope, replace with `.set()`, `.copy()`, or `.copyFrom...()` calls.

**Naming convention:** scratch variables use `_scratch<Purpose>` prefix (`_scratchAimDir`, `_scratchRayOrigin`, `_scratchMuzzlePos`) so the call site reads with intent. Avoid generic names that invite accidental sharing across helpers.

**Sharing rule:** a scratch object must not be passed to a callee that stores the reference (e.g., into a class field or array). Only synchronous compute-and-discard. When in doubt, allocate a separate scratch for that purpose.

### Files Changed

- `js/core/player.js`
- `js/systems/weapons.js`
- `js/systems/enemies.js`
- `js/core/main.js` (limited — most allocations are setup-time)

This change is per-file and per-call-site. Sub-PRs by file are reasonable for review if total diff is large.

### Risks

- **Aliasing bugs** — if two pieces of logic in the same call stack reuse the same scratch, the second will overwrite the first. Mitigation: name by purpose, not by type; one scratch per distinct usage site.
- **Refactor regressions** — replacing `new THREE.Vector3(x, y, z)` with `_scratch.set(x, y, z)` is mechanical, but the surrounding code must use the variable, not the constructor expression, in any passing/return position.

### Validation

- Existing unit and integration tests in `tests/` must pass without modification.
- Manual play test on Mac: combat against bots, weapon firing, enemy AI behavior — confirm no behavioral regressions.
- On Windows: subjective stutter test. Less periodic micro-stutter is the expected improvement.

---

## Sequencing

The three changes are independent and shippable as separate commits:

1. **Section 1** — ship first. One line, lowest risk, highest expected ROI. Measure on Windows: does the settled tier improve?
2. **Section 2** — ship if Section 1 alone is insufficient. Helper plus mechanical changes per map file.
3. **Section 3** — ship as a final pass if still needed. Most invasive; warrants careful review.

After each step, retest on Windows: read `GAME.quality.name` from the console after adaptive stabilization, compare to baseline. Continue to the next step only if needed.

## Open Questions

None — code-level investigation confirmed maps have no animation hooks (Section 2 is safe), and the per-frame allocation audit (Section 3) is bounded to four files.
