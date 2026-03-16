# Performance Optimization Design

## Problem

Map performance degrades during combat, especially on geometry-heavy maps like Aztec (15 point lights, complex vegetation) and Warehouse (8 point lights, multi-floor). The primary bottleneck is per-shot object allocation in the enemy firing path, compounded by unbounded particle array growth and redundant raycast array construction.

## Goals

- Eliminate per-shot memory allocation in enemy firing code
- Cap and recycle the weapon particle system instead of unbounded growth
- Cache raycast target arrays to avoid redundant rebuilding per-shot
- Preserve all existing visual effects — no fidelity reduction

## Non-Goals

- Spatial partitioning / acceleration structures (overkill for current map sizes)
- Reducing map geometry or light counts
- Changing visual appearance of any effect
- Consolidating `main.js` push/splice arrays (bullet holes, impact dust) — these are lower-volume and can be follow-up work

---

## Section 1: Enemy Muzzle Flash Pooling

### Current Behavior

Every enemy shot (`_showTracer` in `enemies.js`) allocates:
- 1 `THREE.BufferGeometry`
- 1 `THREE.LineBasicMaterial`
- 1 `THREE.Line`
- 1 `THREE.PointLight`

These are added to the scene, then disposed and removed 60ms later via `setTimeout`. With 3-4 enemies firing at 2-3 rounds/sec, this creates 6-12 allocation+disposal cycles per second.

### Proposed Design

Pre-allocate a pool of reusable tracer and light objects, initialized once during enemy system setup.

**Tracer pool (size: 8):**
- 8 `THREE.Line` objects, each with a pre-allocated `BufferGeometry` and shared `LineBasicMaterial`
- All added to scene at init with `visible = false`
- On fire: grab next available tracer (round-robin), update buffer positions, set `visible = true`
- After 60ms: set `visible = false`, return to pool
- If pool exhausted: reuse oldest active tracer (it's nearly done anyway)

**Muzzle flash light pool (size: 4):**
- 4 `THREE.PointLight` objects (color: 0xff6600, intensity: 0, range: 5)
- All added to scene at init with `intensity = 0`
- On fire: grab next light, set position and intensity to 2
- After 60ms: set intensity to 0, return to pool
- Round-robin allocation, same as tracers

**Cleanup:** On map change or round reset, cancel any in-flight `setTimeout` callbacks by tracking timeout IDs in the pool. All pool objects are disposed when the enemies system is torn down. This prevents stale callbacks from referencing removed scene objects.

### Files Changed

- `js/enemies.js`: Replace `_showTracer` allocation with pool grab/return

---

## Section 2: Weapon Particle Array Recycling

### Current Behavior

`weapons.js` maintains its own `_particles` array (separate from `GAME.particles` in `particles.js`) for shell casings, smoke puffs, and sparks. This array grows without bound via `push()` during firefights. `_tickParticles()` iterates the full array every frame, splicing dead particles (which shifts all subsequent elements).

Note: `js/particles.js` already implements a proper pool-based instanced-mesh particle system (`GAME.particles`) with fixed-size pools and FIFO recycling. The `_particles` array in `weapons.js` is a separate, older system that does not use pooling for its wrapper objects.

### Proposed Design

**Fixed-size ring buffer (capacity: 64) in `weapons.js`:**
- Pre-allocate array of 64 particle slots at init
- Each slot is an object with an `active` flag and reusable properties
- New particles claim the next slot in ring-buffer order
- If the next slot is still active, its mesh is hidden and the slot is recycled early (the particle is nearly invisible at end-of-life anyway)
- `_tickParticles()` iterates all 64 slots but skips inactive ones (no array mutation, no splice)

**Mesh reuse:**
- Shell casing, smoke puff, and spark meshes are already drawn from `_initEffectPools` — no change there
- The particle *wrapper object* (position, velocity, lifetime, mesh reference) is what gets recycled via the ring buffer

**Why not consolidate into `particles.js`?** The `particles.js` system uses instanced meshes and is designed for high-volume simple particles (dust, blood, sparks). The `weapons.js` particles are individual meshes with per-object physics (shell casings tumble, smoke puffs drift). Consolidating would require rearchitecting one or both systems — out of scope for this performance pass. The ring buffer approach eliminates the unbounded growth and splice overhead with minimal code change.

### Files Changed

- `js/weapons.js`: Replace `_particles` push/splice with ring buffer

---

## Section 3: Raycast Object Caching

### Current Behavior

Each `tryFire` call in `weapons.js` rebuilds an `allObjects` array by iterating all enemies (alive check + mesh push), birds, and wall colliders. The array is shared across pellets within a single `tryFire` call, but rebuilt on every `tryFire` invocation. With auto-fire weapons at 10-12 rounds/sec, this means 10-12 array rebuilds per second. The wall/collider list never changes during a round.

### Proposed Design

**Static wall cache (built once per map load):**
- When a map is loaded, collect all collidable wall meshes into `GAME._collidableWalls`
- This array persists for the entire round — walls don't move or spawn
- Rebuilt on map change or new round

**Per-frame target mesh cache:**
- Once per frame in the game loop (`main.js`), build the alive-target mesh list and store as `GAME._frameTargetMeshes`
- Includes alive enemy meshes (both hostile and friendly bots — the hit handler determines friend/foe), plus alive bird meshes
- Only refreshed once per frame, not per shot
- Built in all active game states that call `tryFire` (PLAYING, SURVIVAL_WAVE, GUNGAME_ACTIVE, DEATHMATCH_ACTIVE, TOURING)

**Combined raycast target array:**
- `GAME._raycastTargets` = `GAME._collidableWalls` concatenated with `GAME._frameTargetMeshes`
- Rebuilt once per frame
- All `tryFire` calls within that frame reference this single array

**Edge case — mid-frame kills:** If an enemy dies during a frame (e.g., first pellet kills, second pellet hits dead enemy), the dead enemy's mesh remains in the cached array for that frame. This is safe because the existing hit-handling code already checks `alive` status before applying damage. No behavioral change.

### Files Changed

- `js/weapons.js`: Replace per-`tryFire` `allObjects` construction with `GAME._raycastTargets` reference
- `js/main.js`: Add per-frame cache rebuild in game loop (after enemy updates, before weapon updates)

---

## Testing Strategy

- Verify enemy tracer visuals are identical (pool grab produces same visual as fresh allocation)
- Verify particle effects look the same under sustained fire
- Verify hit detection is unchanged (same raycast results with cached array)
- Verify enemy pool cleanup works correctly during map change / round reset (no stale callbacks)
- Performance: compare frame times on Aztec with 4 enemies firing, before and after
- Existing tests must continue to pass (`npm test`)

## Risk Assessment

- **Low risk:** All changes are internal — no API changes, no visual changes, no gameplay changes
- **Pool sizing:** 8 tracers and 4 lights should cover worst case (5 enemies on elite, 3 shots/sec, 60ms lifetime = ~0.9 concurrent tracers average). Round-robin handles bursts gracefully.
- **Ring buffer capacity:** 64 particle slots is generous. At full-auto AK (10 rps), ~10 shells + ~4 puffs active simultaneously. Early recycling of nearly-dead particles is visually imperceptible.
- **Stale timeout callbacks:** Addressed by tracking timeout IDs and cancelling on cleanup.
- **Mid-frame kill edge case:** Existing alive-check in hit handler covers this — no behavioral change.
