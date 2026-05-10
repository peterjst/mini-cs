# Aztec / Office / Warehouse — Gate Expensive Decoration to High+ Design

## Problem

After the 2026-05-08 permanent perf cuts (39 outdoor lights removed, Medium pixelRatio reduced, bloom moved to High, prop shadow audit), the user's Windows machine still drops Aztec, Office, and Warehouse to **Very Low** during play. The remaining cost is decorative content that renders at every tier from Minimal up.

Tier-gating decorative content has previously been used at lower thresholds (e.g., Office's `decorProps` group is hidden only at Very Low / Minimal). That helped at the bottom of the tier ladder but not at the Medium ceiling — when the adaptive system tries to upgrade Low → Medium, the decoration cost trips the regression watch and the system ceiling-locks Medium for 60 s, then drops back to Low/Very Low.

The fix is to push expensive-but-not-load-bearing decoration into a more aggressive gate: **visible at High and Ultra only (level 4), hidden at Medium and below**. This makes Medium substantially cheaper than today and gives the adaptive system room to hold there. High and Ultra fidelity are unchanged.

## Goals

- Aztec, Office, and Warehouse hold at **Medium or higher** on the user's Windows machine.
- High and Ultra visual fidelity unchanged.
- Reuse the existing `tierGated` / `tierGatedLight` mechanism plus one small new helper (`tierGatedMaterial`) for the Aztec water surface.
- All changes pass `npm test`. New invariants covered by two new test files.

## Non-Goals

- New tier definitions, new quality levels, new FPS thresholds.
- Touching Dust, Italy, Bloodstrike, Arena.
- Changing the existing Office `decorProps` group's threshold (level 2). That decision was made deliberately in a prior spec; not revisited here.
- Removing decoration permanently. Every item touched is still rendered at High and Ultra.
- Renderer-side optimizations (instancing, batching, frustum culling).

---

## Section 1: Tier System Extension — `tierGatedMaterial`

### Current state

`js/maps/shared.js` provides two tier-gating helpers:

- `tierGated(group, minLevel)` — toggles `group.visible`.
- `tierGatedLight(light, minLevel)` — zeros `intensity` and disables `castShadow` below threshold.

Neither swaps materials. The Aztec river uses a transmission-based `glassMat` (transmission 0.85, transparent, IOR 1.5) — one of the most expensive materials in Three.js, paid per fragment over a 40 × 8 surface. Hiding the water entirely at Medium-and-below is visually jarring (the river bed reads as dry); swapping to a cheap opaque tinted material preserves the water read with no transmission cost.

### Proposed change

Add a third helper to `js/maps/shared.js` alongside `tierGated` and `tierGatedLight`:

```js
function tierGatedMaterial(mesh, minLevel, lowTierMaterial) {
  mesh.userData = mesh.userData || {};
  mesh.userData.minQualityLevel = minLevel;
  mesh.userData._origMaterial = mesh.material;
  mesh.userData._lowMaterial = lowTierMaterial;
  mesh.userData._tierMaterialSwap = true;
  applyTierVisibilityMaterial(mesh);
}

function applyTierVisibilityMaterial(mesh) {
  var min = mesh.userData && mesh.userData.minQualityLevel;
  if (min == null) return;
  var cur = (GAME.quality && GAME.quality.level != null) ? GAME.quality.level : 5;
  mesh.material = cur >= min ? mesh.userData._origMaterial : mesh.userData._lowMaterial;
}
```

Extend `GAME._reapplyAllTierVisibility` with a third branch:

```js
GAME._reapplyAllTierVisibility = function() {
  if (!GAME.scene || !GAME.scene.traverse) return;
  GAME.scene.traverse(function(o) {
    if (!o.userData || o.userData.minQualityLevel == null) return;
    if (o.isLight) {
      applyTierVisibilityLight(o);
    } else if (o.userData._tierMaterialSwap) {
      applyTierVisibilityMaterial(o);
    } else {
      applyTierVisibility(o);
    }
  });
};
```

Expose `tierGatedMaterial` via `GAME._mapHelpers`. Used by exactly one mesh in this design (Aztec river water); kept as a general helper because the cost is one small function and future maps may need it.

### Verification

- Toggle quality level via `GAME.quality.update`-driven downgrades and confirm the Aztec water mesh swaps materials in lockstep.
- New unit test asserts `_tierMaterialSwap` flag and material identity on the Aztec water mesh.

---

## Section 2: Aztec — `decorHigh` Group + Water Material Swap

### Current state

`js/maps/aztec.js` has zero tier-gating. All decoration renders at every tier. The most expensive single item is the river water (`glassMat`, transmission 0.85, 40 × 8 surface). The map also has 9 procedural vines, 8 `WallRelief` calls, 2 `FloorDetail` cobblestone calls, 4 corridor glyph insets, 6 step-joint moss / tier-edge trim strips, river algae bands, root tendrils, rope-bridge slats, and assorted soft-vegetation procedurals (`P.Bush`, `P.Grass`, `P.Flower`, `P.MossPatches`).

### Proposed change

Create a `decorHigh` Group inside `build`. Move the items below into it. Add `decorHigh` to `scene` and call `H.tierGated(decorHigh, 4)`.

**Items moved into `decorHigh`** (currently `D(scene, …)`, `WR(scene, …)`, `FD(scene, …)`, or `P.*(scene, …)` calls — change first arg from `scene` to `decorHigh`):

- River wall detail: 3 algae bands + dark patch (lines 165–167) and 4 root tendrils (170–173).
- Rope bridge planks ×4 (179–182) and 2 long rope side-rails (183–184). Plank base box at 178 (`B(scene, walls, …)`) and 4 corner posts (`CylW`, 185–188) stay — collidable.
- Corridor glyph panels ×2 (206–207), glyph face inserts ×4 (209–212), corridor wall-base moss strips ×2 (221–222).
- Temple-tier glyph panels ×4 (255–259), step-joint moss ×3 (261–263), tier-edge trim ×3 (238–240).
- Temple emissive cyan slabs ×2 (160–161).
- All `WallRelief` calls: 6 perimeter stone panels (121–126) + 2 in temple/courtyard (369–370).
- All `FloorDetail` cobblestone: 2 calls (371–372).
- Soft vegetation: `P.Vine` ×9 (137–141, 344–347), `P.Bush` ×3, `P.Grass` ×3, `P.Flower` ×2, `P.MossPatches` ×3.
- Stone path floor decals: 4 thin `D` calls (97–99, 322).
- Perimeter wall-base moss strips ×8 (109–118, 129–134).

**River water — material swap via `tierGatedMaterial`** (line 149):

```js
var waterOrigMat = glassMat(0x1a6a5a);
var waterLowMat = concreteMat(0x2a6a5a);
var water = new THREE.Mesh(new THREE.BoxGeometry(40, 0.15, 8), waterOrigMat);
water.position.set(5, -2, 2);
scene.add(water);
H.tierGatedMaterial(water, 4, waterLowMat);
```

The water mesh is **not** moved into `decorHigh` — it stays visible at every tier; only its material swaps. The `concreteMat` substitute reads as opaque water at a glance (dark teal, matte) and skips Three.js's transmission/transparent passes entirely.

### Stays permanent (not gated)

- Perimeter walls, corridor doors, temple tiers, stairs, ramps, parapets — all collidable via `B(scene, walls, …)` or `CylW(scene, walls, …)`.
- All `P.Tree`, `P.Rock`, `P.RockCluster`, `P.Pillar` — these helpers push to walls and per the `shared.js` warning must not be hidden.
- Big stone cover boxes throughout the map.
- River bed (line 146), river bank walls (152–155), river boulders (156–159).

### Verification

- Visual: at Medium, Aztec reads as a stone temple with dry-looking river-bed and no soft vegetation; at High, the full vines + water + reliefs are back.
- Performance: dramatic reduction at Medium-and-below — transmission pass drops, ~30 small `D`/`WR`/`FD` decorative meshes drop, ~20 procedural vegetation groups drop.
- Tests: see Section 5.

### Risks & Mitigations

- **Risk:** A specific corner of Aztec relies on a `WallRelief` for visual cover read. **Mitigation:** Walk-test the map at Medium. If a structural wall reads as too plain, leave that one `WR` call out of `decorHigh`.
- **Risk:** The opaque-tinted water looks wrong against the surrounding scene. **Mitigation:** Tune the swap color (`0x2a6a5a`) once visually verified. Color is a one-line tweak.

---

## Section 3: Office — `decorHigh` Group + Ceiling-Light Gating

### Current state

`js/maps/office.js` has one existing tier-gated group: `decorProps`, gated at level 2 (hidden only at Very Low / Minimal — commit `b8e142b`). Its threshold is **not** changed by this design.

Outside `decorProps`, the map renders 9 dynamic point lights via `addCeilingLight` (each = 1 emissive bar mesh + 1 `PointLight`) plus an extensive set of small decorative meshes (smoke detectors, vents, sprinklers, wall clock, scuff marks, outlet plates, pen cup, coat hooks, wet floor sign, paper stacks, coffee mugs, trash bins, fire extinguisher) and 4 surface-detail merged-geometry passes (`WR`, `FD`, `CD` × 2).

### Proposed change

**Part A: `decorHigh` group, gated at level 4.** Move into it:

- `CeilingDetail` panels (line 330) and `CeilingDetail` pipes (331).
- `WallRelief` panels ×2 (327–328).
- `FloorDetail` cracked tile (329).
- Smoke detectors ×3 (192–194).
- Air vent grilles ×3 (289–291).
- Sprinkler heads ×3 (314–316).
- Wall clock + 3 hand decals (294–297).
- Floor scuff marks ×3 (304–306).
- Outlet plates ×3 (309–311).
- Pen cup + pencil (319–320).
- Coat hooks ×2 (323–324).
- Wet floor sign (300–301).
- Paper stacks ×3 (266–268).
- Coffee mugs ×2 (271–272).
- Trash bins ×2 (275–276).
- Fire extinguisher + nozzle (279–280).

**Part B: tier-gate the 9 ceiling point lights at level 4.** Modify the inner `addCeilingLight` helper inside `build` to capture and gate the returned `PointLight`:

```js
function addCeilingLight(x, z) {
  D(scene, 1.5, 0.06, 0.15, emissiveMat(0xffffff, 0xeeeeff, 2.0), x, 5.72, z);
  var pl = addPointLight(scene, 0xeeeeff, 1.2, 26, x, 5.6, z);
  H.tierGatedLight(pl, 4);
}
```

The emissive bar mesh stays visible at all tiers — the visible "fluorescent fixture." Only the `PointLight` contribution drops at Medium and below; hemi (0.45) + ambient (0.4) + sun (0.6) carries the indoor scene.

### Stays permanent (not gated)

- Floor, ceiling, perimeter and interior walls, all baseboards.
- All `P.Desk`, `P.Chair`, `P.Shelf`, `P.Couch`, `P.PottedPlant`, `P.Junction` calls.
- Filing cabinets, server rack, water cooler, accent crates — all `B(scene, walls, …)`.
- Central whiteboard mesh (188–189), door frames at central corridor (283–286).
- Existing `decorProps` group (gated at level 2 — unchanged).

### Verification

- Visual: at Medium, office reads as a corporate floor with desks/chairs/computers/walls but flatter lighting and no smoke detectors / vents / clock / etc. At High, full detail returns.
- Performance: 9 dynamic lights = 9 fewer per-fragment shader iterations on every lit surface; merged-geometry surface passes drop; ~25 small decorative meshes drop.
- Tests: see Section 5.

### Risks & Mitigations

- **Risk:** Office at Medium feels too flat without the fluorescent point lights. **Mitigation:** Acceptable per user directive ("remove from medium and lower tiers"). Walk-test; if a specific room reads as too dim, raise the map's `lighting.ambientIntensity` slightly — this is a permanent change that costs nothing.

---

## Section 4: Warehouse — `decorHigh` Group + Fill-Light Gating

### Current state

`js/maps/warehouse.js` has zero tier-gating. The map carries:

- 7 dynamic `addPointLight` calls total (1 in 3rd-floor obs room at line 317, 6 fill lights at 320–327).
- Three shipping containers with extensive surface detail: corrugation strips (32 total), lip edges (12), locking bars/handles/ID plates/rust streaks/stencils.
- Wall panel seams (24 total), 2 cable-tray strips, 24 rivets.
- Tool rack with 8 small decals, forklift detail (mast/forks/wheels), industrial-shelf items.
- A 2×2 transmission glass window in the obs room (line 292).
- Various small decoration: cones, clipboard, rope coil, broken pallet, oil stains, caution tape, safety/fire/exit signs.
- 2 `CeilingDetail` passes (pipes over 20×15, beams in obs room).

### Proposed change

**Part A: `decorHigh` group, gated at level 4.** Move into it:

- Container surface details (NOT container body `B(scene, walls, …)` boxes):
  - Blue: corrugation loop ×12 (140–143), locking bars ×2 (145–146), handle (148), rust streaks ×2 (150–151), ID plate (153), top lip edges ×4 (155–158).
  - Green: corrugation loop ×10 (163–166), locking bars ×2 (167–168), handle (169), rust streak (170), ID plate (171), top lip edges ×4 (173–176).
  - Red: corrugation loop ×10 (180–183), rust streak (184), ID plate (185), top lip edges ×4 (187–190).
  - Container number stencils ×2 (392–393).
- Wall panel seams: 7 north + 7 south (110–113), 5 east + 5 west (115–118), 2 cable-tray strips + 1 lip (120–123), 7+7 horizontal-axis rivets + 5+5 vertical-axis rivets (126–133).
- Floor markings: loading-zone line + 2 cross-stripes (96–98), caution tape ×2 (348–349).
- Safety signs ×2 + danger stripes ×2 (337–341), fire-exit signs ×2 (344–345).
- Tool rack: rack bar + 3 hooks + wrench + hammer head + handle (352–360).
- Forklift detail (NOT body): mast, forks, 2 wheels (208–211).
- Industrial-shelf items ×3 (223–225). Shelf uprights/boards stay (collidable).
- Glass window (line 292) — moved into `decorHigh` (visibility-only; small surface, material-swap not worth it).
- Oil stains ×3 (332–334), traffic cones with bases ×2 (382–385), clipboard + paper (388–389), rope coil + center hole (396–397), broken pallet planks ×3 (374–376).
- `CeilingDetail` pipes over main floor (401), `CeilingDetail` beams in obs room (402).

**Part B: tier-gate all 7 dynamic point lights at level 4.** Wrap each of the `addPointLight` calls (317, 320–322, 324–325, 327) with `H.tierGatedLight(light, 4)`:

```js
H.tierGatedLight(addPointLight(scene, 0xeef2ff, 1.0, 14, 23, F3 + 2.5, 19), 4);
H.tierGatedLight(addPointLight(scene, 0xe8f0ff, 1.4, 40, -10, 4, 0), 4);
// ...etc
```

Hemi (0.4) + ambient (0.3) + sun (0.8) carries the scene at Medium and below. The map will look noticeably flatter under the catwalks but won't be unlit.

### Stays permanent (not gated)

- Ground floor, perimeter walls, container bodies, pallet stacks, oil drums (`P.Barrel`), low concrete barriers.
- 2nd-floor catwalks + railings + support beams.
- 3rd-floor observation room walls/floor/roof.
- Control desk + emissive readouts.
- All stairs, shelf uprights and shelf boards.
- All `P.Pipe`, `P.Duct`, `P.Junction`, `P.Rubble`.

### Verification

- Visual: at Medium, warehouse reads as a 3-floor industrial space with containers (no surface detail), bare walls (no seams/rivets/cable trays), no fill lighting. At High, full detail and lighting return.
- Performance: 7 dynamic lights = 7 fewer per-fragment shader iterations on every lit surface; ~80 small decorative meshes drop.
- Tests: see Section 5.

### Risks & Mitigations

- **Risk:** Containers at Medium look like flat untextured boxes without corrugation/lip edges. **Mitigation:** Acceptable. Container body geometry + crateMat already gives the silhouette and color; surface detail is decorative.
- **Risk:** Warehouse at Medium feels too dark in the catwalk area. **Mitigation:** Walk-test; if needed, raise `lighting.ambientIntensity` slightly (permanent, no cost).

---

## Section 5: Tests

Two new test files in `tests/maps/` plus a small extension to one existing assertion file.

### `tests/maps/tier-gated-decor-high.test.js`

Cross-map invariants for the new `decorHigh` groups:

- For each of Aztec, Office, Warehouse: build the map, find a top-level `Group` child of the scene with `userData.minQualityLevel === 4`. Assert it exists.
- That group contains zero meshes that also appear in the returned `walls[]` array. (Reuses logic from the existing wall-stable cross-map test — gating a wall creates one-way invisible collision.)
- That group is non-empty (sanity: > 5 children).
- For Aztec: locate the river water mesh by `position.y === -2` and `geometry.parameters.width === 40`. Assert `userData._tierMaterialSwap === true`, `userData.minQualityLevel === 4`, and `userData._origMaterial !== userData._lowMaterial`.

### `tests/maps/tier-gated-lights.test.js`

Light-gating invariants for the two indoor maps:

- Office: every `PointLight` in the scene has `userData.minQualityLevel === 4`. (Currently 9 — the ceiling lights.)
- Warehouse: every `PointLight` in the scene has `userData.minQualityLevel === 4`. (Currently 7 — 1 obs-room + 6 fill.)

### Existing tests touched

- `tests/integration/outdoor-maps-no-dynamic-lights.test.js` (commit `41921b3`) — untouched. Aztec adds no new lights.
- The cross-map tier-gating invariants test (commit `1371cca`) — should still pass; new gated groups follow the existing pattern. Verify `walls[].visible` stays `true` regardless of quality level on all 3 maps.
- `tests/setup` mock for `SpotLight`/`PointLight` (commit `b819fe2`) — sufficient for the new light tests. No changes needed.

No existing tests should break.

---

## Order of Implementation

The five sections are best landed in order so each can be verified in isolation:

1. **Section 1** — `tierGatedMaterial` helper. Pure addition to `shared.js`. No callers yet. Tests pass unchanged.
2. **Section 2** — Aztec `decorHigh` + water material swap. First user of `tierGatedMaterial`.
3. **Section 3** — Office `decorHigh` + ceiling-light gating.
4. **Section 4** — Warehouse `decorHigh` + fill-light gating.
5. **Section 5** — Two new test files, landed alongside or just after the relevant map sections.

Each section is its own commit. Each commit runs `npm test` before landing.

## Documentation Updates

- `docs/architecture.md`: no change. Module ownership unchanged.
- `docs/game-design.md`: no change. No mode/balance changes.
- `docs/gotchas.md`: no change. The existing entries on tier-gated walls and outdoor-no-dynamic-lights remain accurate.
- `AGENTS.md`: no change.
