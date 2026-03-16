# Performance Optimization Design

## Problem

Map performance degrades during combat, especially on geometry-heavy maps like Aztec (15 point lights, complex vegetation) and Warehouse (8 point lights, multi-floor). The primary bottleneck is per-shot object allocation in the enemy firing path, compounded by unbounded particle array growth and redundant raycast array construction.

## Goals

- Eliminate per-shot memory allocation in enemy firing code
- Cap and recycle the particle system instead of unbounded growth
- Cache raycast target arrays to avoid redundant rebuilding
- Preserve all existing visual effects — no fidelity reduction

## Non-Goals

- Spatial partitioning / acceleration structures (overkill for current map sizes)
- Reducing map geometry or light counts
- Changing visual appearance of any effect

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

**Cleanup:** Pool objects are disposed when enemies system is torn down (map change/round end).

### Files Changed

- `js/enemies.js`: Replace `_showTracer` allocation with pool grab/return

---

## Section 2: Particle Array Recycling

### Current Behavior

`weapons.js` pushes new particle objects onto the `_particles` array for shell casings, smoke puffs, and sparks. The array grows without bound during firefights. `_tickParticles()` iterates the full array every frame, splicing dead particles (which shifts all subsequent elements).

### Proposed Design

**Fixed-size ring buffer (capacity: 64):**
- Pre-allocate array of 64 particle slots at init
- Each slot is an object with an `active` flag and reusable properties
- New particles claim the next slot in ring-buffer order
- If the next slot is still active, its mesh is hidden and the slot is recycled early (the particle is nearly invisible at end-of-life anyway)
- `_tickParticles()` iterates all 64 slots but skips inactive ones (no array mutation)

**Mesh reuse:**
- Shell casing, smoke puff, and spark meshes are already drawn from pools — no change there
- The particle *wrapper object* (position, velocity, lifetime, mesh reference) is what gets recycled via the ring buffer

### Files Changed

- `js/weapons.js`: Replace `_particles` push/splice with ring buffer
- `js/particles.js`: Minor changes if particle spawn functions need to return to a slot instead of creating a new wrapper

---

## Section 3: Raycast Object Caching

### Current Behavior

Every shot in `weapons.js` rebuilds an `allObjects` array by iterating all enemies (alive check + mesh push) and concatenating wall colliders. Shotgun fires 10 pellets, each repeating this process. The wall/collider list never changes during a round.

### Proposed Design

**Static wall cache (built once per map load):**
- When a map is loaded, collect all collidable wall meshes into `GAME._collidableWalls`
- This array persists for the entire round — walls don't move or spawn
- Rebuilt on map change or new round

**Per-frame enemy mesh cache:**
- Once per frame in the game loop (`main.js`), build the alive-enemy mesh list and store as `GAME._aliveEnemyMeshes`
- Only refreshed once per frame, not per shot

**Combined raycast target array:**
- `GAME._raycastTargets` = `GAME._collidableWalls` concatenated with `GAME._aliveEnemyMeshes`
- Rebuilt once per frame
- All shots and pellets within that frame reference this single array

**Shotgun sharing:**
- All 10 pellets in a shotgun blast use the same `GAME._raycastTargets` — zero per-pellet overhead

### Files Changed

- `js/weapons.js`: Replace per-shot `allObjects` construction with `GAME._raycastTargets` reference
- `js/main.js`: Add per-frame cache rebuild in game loop (after enemy updates, before weapon updates)

---

## Testing Strategy

- Verify enemy tracer visuals are identical (pool grab produces same visual as fresh allocation)
- Verify particle effects look the same under sustained fire
- Verify shotgun hit detection is unchanged (same raycast results with cached array)
- Performance: compare frame times on Aztec with 4 enemies firing, before and after
- Existing tests must continue to pass (`npm test`)

## Risk Assessment

- **Low risk:** All changes are internal — no API changes, no visual changes, no gameplay changes
- **Pool sizing:** 8 tracers and 4 lights should cover worst case (4 enemies, 2-3 shots/sec, 60ms lifetime). If insufficient, round-robin reuse handles overflow gracefully.
- **Ring buffer capacity:** 64 particle slots is generous for typical combat. Early recycling of nearly-dead particles is visually imperceptible.
