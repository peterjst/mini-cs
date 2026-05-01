# Windows Performance — Shader Warmup & Adaptive Robustness Design

## Problem

After the 2026-04-28 round of Windows performance optimizations (powerPreference hint, `markStatic` on map geometry, hoisted per-frame `THREE.*` allocations) shipped, the adaptive quality system on weak Windows desktop hardware still settles at **Very Low** or **Minimal** and stays there for the entire session.

Observed symptoms point to shader compilation, not per-frame work, as the dominant cost:

- The first shot of a session causes a noticeable hitch, then later shots are smooth.
- Quality-tier transitions (e.g., Very Low → Low) cause the same hitch pattern again.
- Mac and Android do not exhibit either pattern.

This signature is consistent with synchronous WebGL shader compilation under Windows ANGLE (WebGL → D3D11 translation), which is 5–10× slower than Mac Metal or Android GLES drivers. Each unique `WebGLProgram` stalls the main thread for 100–500 ms on first use; once cached, subsequent renders are fast.

The existing `_warmUpShaders()` (added in 2026-03-24-mobile-shader-warmup) does compile most gameplay shaders on the first round, but two gaps remain:

1. **Quality-tier permutations are not pre-compiled.** When `applyLevel()` in `quality.js` swaps `shadowMap.type` (PCF ↔ PCFSoft) or toggles `dirLight.castShadow`, every shadow-receiving material is recompiled by Three.js. The current warmup only compiles the initial-tier permutation.
2. **Warmup runs only in competitive mode.** Survival, Gun Game, Deathmatch, and Tour modes never call `_warmUpShaders()`, so their first round pays the full compile cost during gameplay with no buy-phase mask.

Compounding this, the adaptive quality system reads compile-induced hitches as evidence of insufficient hardware:

- The fast-start heuristic samples the first 10 frames of the session and drops directly to Minimal if FPS < 15 — exactly the window when ANGLE is still compiling shaders for menu rendering.
- Once at Very Low, attempting to upgrade to Low triggers a shadow-shader recompile (PCF added). The upgrade-watch logic measures the resulting hitch as regression, marks Low as a ceiling for 60 s, and drops back to Very Low. The cycle repeats forever.

## Goals

- Eliminate shader-compilation hitches at session start, on first weapon fire, and on every adaptive quality transition.
- Make warmup mode-agnostic so all modes benefit from a single canonical call site.
- Prevent the adaptive quality system from misreading transient hitches as steady-state hardware capability.
- No user-visible changes — same materials, same quality ladder, same scene output at every tier.

## Non-Goals

- Changing the LEVELS table or its FPS thresholds.
- Adding instrumentation, profiling overlays, or developer settings.
- Reducing visual fidelity at any tier (e.g., locking shadowMap.type to PCF would weaken Ultra perceptibly).
- Async shader compilation via `compileAsync()` / `KHR_parallel_shader_compile` — kept as a possible future enhancement; current scope uses the synchronous `compile()` path which is universally supported.
- Re-touching the optimizations from the 2026-04-28 spec.

---

## Section 1: Multi-permutation shader warmup

### Current Behavior

`warmUpShaders()` in `js/core/renderer.js:387-418` adds two temporary meshes (a `Line`/`LineBasicMaterial` and a `Mesh`/`MeshBasicMaterial`), runs one `renderWithBloom()` pass, then disposes the temporaries. The render pass exercises every material currently in the scene plus the post-processing chain.

This compiles every shader for **the current quality tier** — at startup that is tier 5 (Ultra: PCFSoft shadows, 2048 shadow map, bloom, sharpen). Materials referencing shadow code are compiled with PCFSoft sampling. When the adaptive system later switches to PCF shadows or no shadows, Three.js recompiles every shadow-receiving material because the program cache key changes.

### Proposed Design

Rewrite `warmUpShaders()` to walk the scene three times, once per shadow-shader permutation. The three permutations are the only ones that change shader programs:

| Permutation | `castShadow` | `shadowMap.type` | Used at tiers |
|---|---|---|---|
| Shadows OFF | `false` | (irrelevant) | Minimal, Very Low |
| Shadows PCF | `true` | `THREE.PCFShadowMap` | Low, Medium |
| Shadows PCFSoft | `true` | `THREE.PCFSoftShadowMap` | High, Ultra |

`pixelRatio` differences only resize the framebuffer; they do not generate new shader programs. Bloom / sharpen / SSAO are post-processing `ShaderMaterial`s that are independent of scene materials and are exercised by the existing pipeline render at the end of the function.

```js
// js/core/renderer.js
var _alreadyWarmed = false;

function warmUpShaders() {
  if (_alreadyWarmed) return;            // session-scoped guard
  _alreadyWarmed = true;

  var dirLight = GAME._dirLight;
  var origCast = dirLight ? dirLight.castShadow : false;
  var origType = renderer.shadowMap.type;

  // Add temporary meshes for material types not guaranteed in scene.
  // Extract the existing inline temp-mesh creation (Line + Mesh) into addWarmupMeshes(),
  // and the existing inline cleanup (remove + dispose geo/mat) into cleanupWarmupMeshes().
  var tmpObjs = addWarmupMeshes();

  // Permutation 1: shadows off
  if (dirLight) dirLight.castShadow = false;
  renderer.compile(scene, camera);

  // Permutation 2: PCF shadows
  if (dirLight) dirLight.castShadow = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.compile(scene, camera);

  // Permutation 3: PCFSoft shadows + full post-fx pipeline
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.compile(scene, camera);
  renderWithBloom();                     // exercises post-processing chain

  // Restore original state
  if (dirLight) dirLight.castShadow = origCast;
  renderer.shadowMap.type = origType;
  cleanupWarmupMeshes(tmpObjs);

  // Signal adaptive quality system that warmup is complete
  if (GAME.quality && GAME.quality.markWarmupComplete) {
    GAME.quality.markWarmupComplete();
  }
}
```

`renderer.compile(scene, camera)` walks the scene, generates `WebGLProgram` instances for the current shadow setup, and returns synchronously. Three sequential calls cache three distinct programs per shadow-receiving material. After warmup, runtime tier transitions only swap the active program — no compilation.

The `_alreadyWarmed` flag is reset inside the existing `webglcontextrestored` handler at `js/core/renderer.js:27-35`, since context loss invalidates all `WebGLProgram` instances.

### Files Changed

- `js/core/renderer.js` — rewrite `warmUpShaders()`; add `_alreadyWarmed` flag; reset it in the `webglcontextrestored` handler.

### Risks

- **`renderer.compile()` may not cover edge cases.** Three.js r160's `compile()` walks lights, processes materials, and forces program creation; this is the documented mechanism. If a material is missed, the existing `renderWithBloom()` final pass catches it for the PCFSoft permutation. PCF and shadows-off permutations rely solely on `compile()`. Mitigation: if a regression appears, swap the `renderer.compile()` calls for `renderWithBloom()` calls (3× cost but guaranteed to compile what renders).
- **State restoration.** Forgetting to restore `dirLight.castShadow` or `shadowMap.type` would change the visible scene. Mitigation: capture original values into locals before mutation; restore unconditionally before the function returns.
- **Cost on Windows.** Three sequential `compile()` calls are ~150–300 ms total on weak Windows hardware. This is a one-time cost masked by the buy-phase menu being on screen.

### Validation

- Manual test on Windows: load the game, enter a round, observe whether the first weapon fire still hitches. Expectation: no hitch.
- Manual test on Windows: play long enough for adaptive to attempt an upgrade or downgrade (or temporarily expose `applyLevel` on `GAME.quality` for ad-hoc console testing). Expectation: tier transitions do not produce a visible hitch.
- Manual test on Mac and Android: confirm no regression — warmup completes invisibly, gameplay is identical.
- Existing test suite (`tests/`) must continue to pass without modification.

---

## Section 2: Mode-agnostic warmup invocation

### Current Behavior

`GAME._warmUpShaders()` is called only from `js/modes/competitive.js:213`, at the end of `startRound()`. Survival, Gun Game, Deathmatch, and Tour mode startup paths never call it. In those modes, every shader compiles during the first gameplay frames with no buy-phase to mask the freeze.

### Proposed Design

Remove the call from `competitive.js:213`. Add a single call in `js/core/main.js`, immediately after `mapWalls` is handed to player and weapons (around line 992-993):

```js
player.setWalls(mapWalls);
weapons.setWallsRef(mapWalls);
GAME._warmUpShaders();                   // <-- new line
```

This location runs on every map build, in every mode. Combined with the session-scoped `_alreadyWarmed` guard from Section 1, only the first call in a session does any work; subsequent calls return immediately.

### Files Changed

- `js/core/main.js` — add one call after `weapons.setWallsRef(mapWalls)`.
- `js/modes/competitive.js` — remove the call at line 213.

### Risks

- **Invocation ordering.** Warmup must run *after* particle pools are initialized in `js/effects/particles.js` (so the InstancedMesh particle materials are in scene). The chosen call site in `main.js` runs after `GAME.particles.init` has already been called for the session — verified by reading current `main.js` initialization order. Mitigation: the call site is documented inline; if particle init moves, the warmup call moves with it.
- **State at warmup time.** The map must be built and added to `GAME.scene` before `compile()` runs, otherwise PBR map materials will not be walked. The chosen location is after `mapWalls` has been computed (which requires the map to be built), so this is satisfied by construction.

### Validation

- Manual test: start each mode (competitive, survival, gungame, deathmatch, tour) for the first time in a session, fire the first weapon. Expectation: no hitch in any mode.
- Manual test: start a second round / second map within a session. Expectation: no warmup work (silent no-op), no visible cost, no behavioral change.
- Existing test suite must continue to pass.

---

## Section 3: Adaptive robustness — defense in depth

Sections 1 and 2 should eliminate compile hitches under normal play. Section 3 hardens the adaptive quality system so that any hitch that *does* occur — GC pause, alt-tab return, browser background work, future code that introduces new materials — does not cause a runaway downgrade.

### 3a. Delay fast-start heuristic until warmup completes

#### Current Behavior

`js/core/quality.js:147-153` fires the fast-start heuristic at `_frameCount === FAST_START_FRAMES` (10 frames into the session). On weak Windows hardware, those 10 frames overlap with menu rendering against still-compiling shaders — FPS reads as < 15 — and the heuristic drops the level to 1 (Very Low). Subsequent gameplay never recovers because the system is already at the floor and the upgrade-watch logic ceiling-locks higher tiers on the recompile hitch.

#### Proposed Design

Add a `_warmupComplete` flag to `quality.js`, defaulting to `false`. Expose `GAME.quality.markWarmupComplete()` which sets the flag to `true` and resets `_frameCount` and `_frameTimes`. `warmUpShaders()` (Section 1) calls this as its final step.

Gate the fast-start branch on the flag:

```js
// quality.js — new state
var _warmupComplete = false;

function markWarmupComplete() {
  _warmupComplete = true;
  _frameCount = 0;
  _frameTimes = [];
}

// inside update(dt) — replace the existing fast-start condition
if (_frameCount === FAST_START_FRAMES && _currentLevel === 5 && _warmupComplete) {
  // existing drop-to-1 logic unchanged
}

// expose on GAME.quality
GAME.quality = {
  ...,
  markWarmupComplete: markWarmupComplete,
};
```

The fast-start heuristic now measures the first 10 frames *after warmup completed*, when shader compilation can no longer skew the sample.

### 3b. Exclude clamped frames from rolling FPS

#### Current Behavior

`js/core/main.js:1330` computes `dt` as `Math.min(now - lastTime, 0.05)`. Any frame slower than 50 ms (a hitch, a GC pause, a tab-switch return) is clamped to 0.05 s. That clamped value is then pushed into the `_frameTimes` rolling window in `quality.js:126`, dragging `_rollingFps` down and triggering downgrade thresholds (FPS < 25).

A single hitch in a 2-second window has negligible effect (~60 fps → ~58 fps). But a sustained patch of 10+ clamped frames pulls rolling FPS below 25 and triggers downgrade.

#### Proposed Design

In `quality.js:update()`, skip pushing `dt` into `_frameTimes` when `dt >= 0.049` (just below the clamp), with a fallback so genuinely slow steady-state hardware is not silently masked:

```js
// inside update(dt), replace the existing single push line
var isHitch = dt >= 0.049;
if (!isHitch || _frameTimes.length < 10) {
  _frameTimes.push(dt);
}
_frameCount++;
```

If the filtered window has at least 10 samples, hitch frames are excluded. If the window has fewer than 10 samples (e.g., right after a window flush, or on truly slow hardware where most frames are at the clamp), hitch frames are included to preserve signal.

The threshold `0.049` is intentionally just under the `0.05` clamp value, so we exclude only frames actually clamped — not legitimately-slow frames that happen to be near 50 ms.

### Files Changed

- `js/core/quality.js` — add `_warmupComplete` flag and `markWarmupComplete()` function; gate fast-start on flag; add hitch filter to `update()`.

### Risks

- **Hitch filter masks real degradation.** If hardware is genuinely struggling, every frame is ~50 ms and we want to downgrade. The "fallback when window has <10 samples" rule guarantees we still act on sustained slowness. Edge case: bursty hitches where the window stays full but has many hitches — they get filtered, masking real slowness. Mitigation: this is acceptable because such bursty patterns *are* hitches by definition; sustained slowness fills the window with non-hitch slow frames (e.g., 30–40 ms) which pass the filter.
- **`markWarmupComplete()` not called.** If `warmUpShaders()` throws before its final step, the flag stays false and fast-start never fires. Mitigation: this only suppresses *one* downgrade path; the regular per-second downgrade logic (line 176-185) still works. The system degrades gracefully — slower to react, but never wrong.
- **Order of dependency.** Section 3a depends on Section 1 calling `markWarmupComplete()`. If Section 1 ships without Section 3a, the new function does not exist and the call is a no-op (the `if (GAME.quality.markWarmupComplete)` guard in Section 1's design covers this). If Section 3a ships without Section 1 calling it, fast-start never fires (system relies on regular downgrade only). Both partial states are safe; combined behavior requires both.

### Validation

- Manual test on Windows: from a clean reload, observe `GAME.quality.name` after ~15 seconds. Expectation: stays at Ultra (or settles at the highest stable tier the hardware supports, not Minimal/Very Low).
- Manual test: induce a hitch (e.g., open DevTools, run heavy `for` loop in console, or alt-tab away and back). Expectation: brief frame drop, but no quality downgrade — system recognizes the spike as transient.
- Manual test on Mac: confirm no regression. Should still settle at Ultra.
- Existing test suite must continue to pass.

---

## Sequencing

The three sections have well-defined dependencies and can be split into three commits:

1. **Section 1** — rewrite `warmUpShaders()` with multi-permutation compile. Self-contained. Does not break anything if shipped alone (calls `GAME.quality.markWarmupComplete` only if it exists).
2. **Section 2** — move warmup invocation to `main.js` and remove from `competitive.js`. Self-contained. Order with Section 1 does not matter.
3. **Section 3** — adaptive robustness in `quality.js`. Self-contained. Without Section 1's `markWarmupComplete()` call, fast-start is permanently disabled (which is safe — regular downgrade logic still works).

After each section, manually retest on the Windows machine and read `GAME.quality.name` from the console after 15 seconds of menu + buy-phase + gameplay. Expectation: improvement at each step, with the highest stable tier reached after Section 1+3 are both shipped.

## Open Questions

None. The mechanism is established (synchronous `renderer.compile()` per shadow permutation), the call sites are identified, and the adaptive heuristic changes are bounded to two specific lines in `quality.js`.
