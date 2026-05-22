# Mini CS — Gotchas

Cross-cutting traps that aren't derivable from any single file. Read before risky work; consult after a confusing bug.

**Growth rule:** after fixing a bug whose root cause crossed files or was non-obvious from local context, add an entry here. Single-file bugs go in tests, not gotchas.

## 1. Menu click-handler delegation needs data-attribute guards

The classes `.config-diff-row` and `.config-diff-btn` are reused across difficulty selection, map mode selection, and other menu controls. Every delegated click handler on these classes must guard with a data-attribute check or use a specific element reference.

```js
// Wrong — fires on every config-diff-btn click anywhere in the menu
btn.addEventListener('click', e => { /* handle difficulty */ });

// Right — guard so this handler only acts on its own buttons
if (!btn.dataset.diff) return;
```

When adding new menu options that reuse these classes, either use specific DOM element references or add an explicit `dataset` guard.

## 2. Spawn placement must validate against geometry

Multiple bug fixes (commits `f421747`, `9857703`, `16be46c`, `2e42088`, `a33dadb`, `4d2793a`) shared one root cause: bots, minions, or players placed at coordinates that intersect walls or sit inside enclosed structures.

**Rule:** any code that places a bot/minion/player must run a wall/enclosure check before committing the position. New spawn-zone logic *and* new map geometry both need to verify reachability. When adding a map, walk every spawn point through the validator before merging.

## 3. State must reset on init / respawn / round-start

The most common AI/mode bug class in this repo: stale state surviving a transition that should have cleared it. Examples (commits `f9fc5bc`, `64f3780`, `352cd28`, `9a09297`, `f99924b`):

- Boss fight kept pending minions from a prior fight.
- Respawned bots missing their `_manager`.
- Combat movement state retained on ATTACK exit.
- `_peripheralDetection` flag never reset.
- Deathmatch buy-menu auto-open flag persisted across deaths.

**Rule:** when adding mutable state to a system, identify its lifecycle (per-match / per-round / per-respawn / per-state-transition) and add an explicit reset at every boundary it crosses. State without an explicit reset is a future bug.

## 4. HUD changes must handle desktop and mobile in parallel

Touch and desktop HUDs have parallel element trees. For example, money is `#money-display` on desktop and `#touch-money` on mobile. Visibility toggles, content updates, and state-transition cleanups must consider both.

```js
if (GAME.isMobile) {
  // update touch HUD element
} else {
  // update desktop HUD element
}
```

Recent fix commits in this category: `5a55109`, `0de627d`, `09e6e8c`, `2bc01d6`, `64d4707`, `e5f619e`, `736a9a0`. When in doubt, grep for both element IDs and verify both paths are covered.

## 5. Audio nodes need explicit lifecycle

Web Audio nodes don't garbage-collect while connected. Per-event sound handlers must disconnect/stop their nodes when the sound ends; long-running modulation chains (death rattle, boss heartbeat, ambient drones) must be torn down when the originating state ends.

Symptom of getting this wrong: sounds drift, accumulate, or echo across rounds. Reference: commit `2ab4e3b`.

## 6. DOM element creators must be idempotent

Functions that build DOM elements may run on mode switches, respawns, or HUD rebuilds — not only on first init. Each creator must check for an existing element and skip or replace it, rather than appending duplicates.

```js
function createBuyButton() {
  if (document.getElementById('touch-buy-btn')) return;
  // ... build element
}
```

Reference: commit `72f15b4` (`createBuyButton` was producing duplicates on touch).

## 7. Material helpers in `js/maps/shared.js` are factories — call them

`H.concreteMat`, `H.metalMat`, `H.darkMetalMat`, `H.woodMat`, `H.plasterMat`, `H.floorMat`, `H.ceilingMat` are **factory functions**, not material instances. You must invoke them:

```js
// Wrong — passes the factory function as material
new THREE.Mesh(geo, H.darkMetalMat);
var fallback = mat || ceilingMat;        // also wrong inside a helper

// Right — call to get a material instance
new THREE.Mesh(geo, H.darkMetalMat());
var fallback = mat || ceilingMat();
```

A function silently passes Three.js's truthy `if (material)` check during `scene.traverse`, then crashes inside `renderer.compile` with one of:
- `TypeError: s.customProgramCacheKey is not a function`
- `TypeError: Invalid value used as weak map key`

Warmup now runs at every map load (per-map shader pre-compile for Windows ANGLE — see `renderer.js:warmUpShaders`), so a bad material in any map will crash whenever that map loads. The earlier "click START, camera keeps flying, click START again and it works" symptom no longer applies — a failure now blocks every load of the affected map, not just the first.

A common related typo is dropping a `CylW`/`Cyl` argument. Both signatures take `rT, rB, h, seg, mat, x, y, z` — leaving out `rB` shifts every following argument left and ends up passing a *number* as `mat`, which trips the same compile path.

Tested by `tests/integration/map-material-validity.test.js` — every Mesh produced by every map's build must have a `.material` whose `type` is a string. Reference: this gotcha plus commit fixing nail/pipe/patch helpers in `shared.js` and pillar `CylW` calls in `arena.js`.

## 8. Outdoor maps: no dynamic point lights

Aztec, Italy, and Bloodstrike are outdoor maps. They rely entirely on the directional sun + hemisphere + ambient lights configured in each map's `lighting` block. They do **not** call `addPointLight` or `addHangingLight` to emit a runtime `PointLight`. (The `addHangingLight` helper still draws the lamp fixture geometry — the mesh is visible — it just no longer adds a `PointLight` to the scene.)

Adding a dynamic point light to an outdoor map re-introduces per-fragment shader cost on every lit surface in the light's radius. On maps with high surface counts this is measurable. The constraint is enforced by `tests/integration/outdoor-maps-no-dynamic-lights.test.js`, which asserts zero `PointLight` instances in the scenes for all three outdoor maps.

If you need extra fill in a specific area, raise `fillIntensity` or `hemiIntensity` in the map's `lighting` block instead of adding a runtime light.

Indoor maps may continue to use point lights, but see #9 — intensity-based gating is not a perf win on Windows ANGLE.

## 9. `tierGatedLight` (intensity=0) does NOT reclaim shader cost

`tierGatedLight` in `maps/shared.js` sets `intensity = 0` at low quality tiers but leaves the `PointLight` in the scene. This was intended to make extra lights "free" below High. It does **not** work that way on Windows ANGLE.

Three.js bakes `NUM_POINT_LIGHTS` as a `#define` into every lit material's fragment program. The per-fragment loop still runs the position-diff, length, and distance-attenuation math for every light at every fragment — the only thing `intensity=0` skips is the BRDF call via the `directLight.visible` check. On ANGLE (Chrome/Edge on Windows, which translates GLSL→HLSL→D3D11), the residual per-fragment setup × N lights × every lit pixel is still significant on integrated GPUs.

Office originally had 9 ceiling `PointLight`s gated to level 4. On a Windows integrated-GPU machine the map ran at 11–18 fps even after the quality system downgraded all the way to Very Low — because the lights were still in the scene at intensity=0. Removing them entirely (emissive-only ceiling fixtures) fixed the perf cliff.

**Rule:** if you add a dynamic light, assume its cost is permanent at all tiers. If you want to truly remove the cost at low tiers, you must `scene.remove()` the light (changing `NUM_POINT_LIGHTS`) AND extend shader warmup to pre-compile both light-count permutations, otherwise the tier transition will hitch on first render with the new light count. Tested for Office (zero `PointLight`s) in `tests/integration/tier-gated-lights.test.js`.
