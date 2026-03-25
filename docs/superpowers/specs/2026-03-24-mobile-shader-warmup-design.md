# Mobile Shader Warm-Up & Tracer Pooling — Design Spec

## Problem

On mobile devices, the game freezes for 1-2 seconds at the start of the first round on a new map, and briefly freezes on the first shot fired. Both are caused by synchronous WebGL shader compilation — the GPU compiles each unique shader program on first use, blocking the main thread. Once compiled, programs are cached for the session, so subsequent rounds and shots are smooth.

## Goals

- Eliminate all perceptible shader compilation hitches during gameplay
- Leverage the existing 10-second buy phase as the warm-up window
- Pool enemy tracer objects to remove per-shot allocations entirely
- No visual changes — same graphics, same quality levels

## Non-Goals

- Reducing map geometry or light counts
- Adding a loading screen or progress bar
- Changing the adaptive quality system behavior
- Pooling grenade explosion materials (unnecessary — warm-up frame covers the shader programs)

---

## Section 1: Buy-Phase Shader Warm-Up

### Current Behavior

`startRound()` builds the map, spawns bots, enters `BUY_PHASE`, and opens the buy menu. The first render frame after this compiles all shader programs for materials in the scene (PBR, sky dome ShaderMaterial, post-processing passes). On mobile GPUs, this compilation blocks for 1-2 seconds, causing a visible freeze.

### Proposed Design

Add a `warmUpShaders()` function called at the end of `startRound()`, after `gameState = BUY_PHASE`. This function forces the GPU to compile every shader program the game will use, while the buy menu is visible and masking any frame hitch.

**Steps:**

1. Create temporary tiny meshes for material types not already guaranteed in the scene:
   - One `THREE.Line` with `LineBasicMaterial` (covers enemy tracers, weapon tracers)
   - One `THREE.Mesh` with `MeshBasicMaterial` (covers explosion effects, smoke puffs, sparks)
   - Both placed at camera position, scale 0.001 — invisible to the player but triggers GPU shader compilation
2. Add them to the scene
3. Render one full frame through the complete post-processing pipeline (bloom, sharpen, composite) — this compiles all post-processing ShaderMaterials as well as all scene materials
4. Remove the temporary meshes from the scene and dispose their geometries

**PBR materials** (MeshStandardMaterial) and the **sky dome ShaderMaterial** are already in the scene from map construction — the warm-up render covers them automatically.

**Cost:** One extra render call, approximately 16ms on mobile. This is fully masked by the buy menu appearing in the same frame.

### Files Changed

- `js/main.js`: Add `warmUpShaders()` function, call at end of `startRound()`

---

## Section 2: Enemy Tracer Pooling

### Current Behavior

`Enemy.prototype._showTracer()` in `enemies.js` allocates per shot:
- 1 `THREE.BufferGeometry`
- 1 `THREE.LineBasicMaterial`
- 1 `THREE.Line`
- 1 `THREE.PointLight`

These are added to the scene, then disposed 60ms later via `setTimeout`. The first shot in a session triggers shader compilation for `LineBasicMaterial`, causing a brief freeze. Even after compilation, the per-shot allocation/disposal cycle is wasteful.

### Proposed Design

Pre-allocate a pool of reusable tracer and muzzle flash objects, initialized once during enemy system setup. This follows the same pattern already used by the weapon system's tracer pool (`weapons.js:1968-1980`).

**Tracer line pool (size: 8):**
- 8 `THREE.Line` objects, each with a pre-allocated `BufferGeometry` (2-point)
- Shared single `THREE.LineBasicMaterial` instance (color: 0xff6600, transparent, opacity: 0.5)
- All added to scene at init with `visible = false` and `frustumCulled = false` (tracers spanning large distances can be incorrectly culled)
- On fire: grab next tracer (round-robin index), update buffer positions via `setFromPoints()`, set `visible = true`
- After 60ms: set `visible = false`
- If pool exhausted: reuse oldest active tracer

**Muzzle flash light pool (size: 4):**
- 4 `THREE.PointLight` objects (color: 0xff6600, intensity: 0, distance: 5)
- All added to scene at init with `intensity = 0`
- On fire: grab next light (round-robin), set position and intensity to 2
- After 60ms: set intensity to 0

**Timeout tracking:**
- Store timeout IDs in an array alongside the pool
- On round reset or map change, cancel all pending timeouts via `clearTimeout()`
- This prevents stale callbacks from referencing removed scene objects

**Disposal:**
- On scene teardown, dispose all pool geometries and the shared material
- Remove all pool objects from the scene

### Files Changed

- `js/enemies.js`: Add pool initialization, rewrite `_showTracer()` to use pool, add cleanup on teardown

---

## Section 3: Warm-Up Coverage Matrix

| Shader Program | Source | Warm-Up Method |
|---|---|---|
| MeshStandardMaterial (PBR) | Map geometry, weapons | Already in scene — warm-up render covers it |
| Sky dome ShaderMaterial | `shared.js` buildMap | Already in scene — warm-up render covers it |
| Bloom bright-pass ShaderMaterial | `main.js` post-processing | Warm-up render through pipeline covers it |
| Bloom blur H/V ShaderMaterial | `main.js` post-processing | Warm-up render through pipeline covers it |
| Composite ShaderMaterial | `main.js` post-processing | Warm-up render through pipeline covers it |
| Sharpen ShaderMaterial | `main.js` post-processing | Warm-up render through pipeline covers it |
| LineBasicMaterial | Enemy tracers, weapon tracers | Temporary warm-up mesh + tracer pool pre-allocation |
| MeshBasicMaterial | Explosions, smoke, sparks | Temporary warm-up mesh |
| SSAO ShaderMaterial | `main.js` post-processing | Out of scope — SSAO is disabled at all quality levels. If enabled in the future, its shaders will compile on first activation; this can be addressed then |

After the warm-up frame, every shader program the game uses is compiled and cached. No further compilation occurs during gameplay.

**Note on PointLights:** Enemy muzzle flash PointLights do not cast shadows (`castShadow` defaults to `false`), so they introduce no unique shader program. The only shadow-casting light is the directional light, which is already in the scene and compiled by the warm-up render.

---

## Files Changed Summary

| File | Change |
|---|---|
| `js/main.js` | Add `warmUpShaders()` function, call at end of `startRound()` |
| `js/enemies.js` | Add tracer/light pool init, rewrite `_showTracer()` to use pool, add cleanup |
