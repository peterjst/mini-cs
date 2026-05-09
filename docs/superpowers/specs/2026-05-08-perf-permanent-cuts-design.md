# Permanent Performance Cuts — Across-the-Board Reductions Design

## Problem

After the 2026-04-28, 2026-04-30, and 2026-05-02 optimizations, plus the recent tier-gating work for decorative props/lights, the adaptive quality system on the user's Windows machine still settles at:

| Map | Lands at |
|---|---|
| Dust | High |
| Italy | Very Low |
| Office | Minimal |
| Aztec | Minimal |
| Bloodstrike | Minimal |

Tier-gating decorative content has hit diminishing returns. Aztec already gates 9 prop groups and 8 decorative lights and still drops to Minimal. The remaining cost is *structural*: dynamic lights, fullscreen post passes, pixel ratio, and shadow-caster count.

The user's directive: improve performance **across the board** — remove things that are expensive but not visually load-bearing — so all maps hold at Medium or above on the target Windows machine, and every other machine benefits proportionally. This is not a tier-gating exercise; the cuts are permanent and apply at every quality level including Ultra.

## Goals

- All maps reach **Medium or higher** on the user's Windows machine.
- Every cut is permanent (no per-tier gating); benefits propagate to all hardware at all tiers.
- No item removed should be visually load-bearing during fast-paced FPS play.
- Visual fidelity at **High** and **Ultra** remains acceptable; the High and Ultra tiers retain bloom and full pixelRatio.
- All changes pass `npm test`.

## Non-Goals

- New tier definitions or new quality levels.
- Changing FPS thresholds or hysteresis in the adaptive quality system.
- Touching Office prop density (its cost is geometry/draw-call dominated; addressed indirectly via the shadow-caster audit, revisited only if it still drops post-cuts).
- Touching Dust, Arena, or Warehouse maps.
- Asset baking, texture LOD, instancing refactors, or any new rendering architecture.
- Indoor maps' lighting (Office, Warehouse keep their lights; they're indoor and the lights do perceptible work).

---

## Section 1: Remove All PointLights from Aztec, Italy, Bloodstrike

### Current state

Three outdoor maps carry a combined **39 PointLights**, all decorative:

- **Aztec** (jungle ruins, outdoor): 17 PointLights. `lighting.sunIntensity` 0.7 + `hemiIntensity` 0.45 + `ambientIntensity` 0.3 + `fillIntensity` 0.25 = strong global illumination already covers the scene.
- **Italy** (Mediterranean village, outdoor): 14 PointLights. Sun 0.95 + hemi 0.4 + ambient 0.25 + fill 0.25.
- **Bloodstrike** (outdoor arena): 8 PointLights. Sun 1.0 + hemi 0.4 + ambient 0.3 + fill 0.4.

In Three.js, every dynamic light contributes to the per-fragment shader light loop on every lit surface, regardless of whether it casts shadows. The cost is paid per pixel, every frame. With pixelRatio 1.5 at Medium, that's ~2.25× the screen pixel count, and Aztec's 17 lights run that loop 17 times per fragment.

The sun, hemisphere, and ambient lights together exceed intensity 1.4 on every map, which is enough to fully illuminate outdoor surfaces. The point lights add subtle warm/cyan tint variation that is not perceptible during FPS-pace play (rounds last ~30 s; the player is looking at enemies, not at lighting gradients on a wall).

This mirrors how baked-lit shooters (CS:GO `de_dust2`, `de_inferno`) handle outdoor maps: a single directional sun plus ambient/hemi, no runtime point lights.

### Proposed change

Delete every `addPointLight(...)` call from:
- `js/maps/aztec.js`
- `js/maps/italy.js`
- `js/maps/bloodstrike.js`

Including the calls already wrapped in `tierGatedLight(...)` — the wrapper becomes irrelevant once the lights are gone. Remove the now-unused `addPointLight` and `tierGatedLight` (where present) variable bindings from those files.

Do **not** remove `addHangingLight` calls if any exist; those are physical hanging-fixture meshes (the emissive geometry is structural, not lighting). Audit each call in the diff to confirm whether it is a light source or a fixture mesh helper.

Do **not** touch the directional sun, hemi, fill, or ambient lights in each map's `lighting` block — those are the global illumination this design relies on.

### Verification

- Visual: load each map, walk the playable area, confirm the scene reads correctly (no pitch-black corners, no broken-looking unlit objects). The directional sun's existing shadow casting plus hemi/ambient should fully cover outdoor surfaces.
- Performance: on the user's Windows machine, confirm Aztec, Italy, Bloodstrike now hold at Medium or higher.
- Tests: existing map tests (`tests/maps/`) pass without modification. Tier-gating tests should still pass since the gated-light count just drops to whatever non-aztec maps register (mostly zero).

### Risks & Mitigations

- **Risk:** A specific architectural feature (e.g., a sunken ruins chamber on Aztec, a covered alcove on Italy) might genuinely need fill light because the sun direction can't reach it.
  **Mitigation:** First-pass implementation removes everything. If a specific area looks broken, add back **at most one** light for that area, justified in the implementation commit message. The default is no point lights.

---

## Section 2: Move Bloom from Medium Tier to High

### Current state

In `js/core/quality.js` the `LEVELS` table enables `bloom: true` starting at Medium:

```
{ name: 'Medium',   pixelRatio: 1.5,  shadows: true, ..., bloom: true,  ... },
{ name: 'High',     pixelRatio: 1.5,  shadows: true, ..., bloom: true,  ... },
{ name: 'Ultra',    pixelRatio: 2.0,  shadows: true, ..., bloom: true,  ... }
```

UnrealBloomPass runs a downsample chain (typically 5 mip levels) plus an additive composite — multiple fullscreen passes per frame. On Mini-CS's mostly-diffuse procedural surfaces, the visible contribution is mild glow around emissive materials.

### Proposed change

Set `bloom: false` for the Medium tier; leave High and Ultra unchanged.

Resulting LEVELS row for Medium:

```
{ name: 'Medium',   pixelRatio: 1.25, shadows: true, shadowType: 'PCF', shadowMapSize: 1024, ssao: false, bloom: false, sharpen: false },
```

(The pixelRatio change is Section 3; bloom change is this section.)

### Verification

- Visual: at Medium, emissive surfaces (weapon muzzle flashes, screen lights) read as bright but without the soft halo. At High, halo is visible as before. The visual delta at Medium vs. Low is now smaller, which is fine — Medium still has shadows, full pixelRatio, and bigger shadow maps.
- Performance: rendering at Medium drops a downsample chain. Expect noticeable FPS gain on weak GPUs.
- Tests: any test asserting `bloom` flag at Medium needs updating; expect 0–1 such tests.

### Risks & Mitigations

- **Risk:** Players who never reach High see a less polished look.
  **Mitigation:** Acceptable. The user's brief is "expensive but not too useful or obvious" — bloom on Medium qualifies. High remains achievable on any machine that holds Medium for `UPGRADE_HOLD_TIME` seconds.

---

## Section 3: Reduce Medium Tier pixelRatio from 1.5 to 1.25

### Current state

Medium: `pixelRatio: 1.5`. On a Windows machine with `devicePixelRatio` ≥ 1.5 (most laptops, many monitors), this means the renderer draws at 1.5× linear resolution = 2.25× pixel count vs. native 1.0.

### Proposed change

Set Medium `pixelRatio: 1.25`. High and Ultra unchanged.

```
{ name: 'Medium',   pixelRatio: 1.25, ..., bloom: false, ... },
```

### Verification

- Visual: 1.25× still supersamples vs. native 1.0; the difference between 1.25 and 1.5 is barely perceptible in motion in an FPS game where the camera is rotating constantly.
- Performance: on a 1.5 DPR display, fragment work drops by ~30% at Medium ((1.5² − 1.25²) / 1.5² = 0.31). Combined with bloom removal, Medium becomes substantially cheaper than today.

### Risks & Mitigations

- **Risk:** Static UI elements (HUD) look slightly less crisp at Medium.
  **Mitigation:** HUD is a separate DOM/CSS layer and is not affected by renderer pixelRatio. Only the WebGL canvas is.

---

## Section 4: Shadow-Caster Audit on `js/maps/props.js`

### Current state

`props.js` (1338 lines, 175 mesh creations) is the prop library used by all maps. Many prop functions set `castShadow = true` on small decorative meshes — bottles, papers, cans, trim, brackets. Each shadow-casting mesh is rendered once per shadow-casting light into the shadow map.

The shadow map is rendered every frame at the current `shadowMapSize` resolution. Shadow casts on small props produce shadows that are at or below one shadow-map texel — invisible — while still costing draw calls and vertex transforms.

### Proposed change

Audit every `castShadow = true` assignment in `js/maps/props.js`. Keep `castShadow` only on:
- Large structural meshes (crates, barrels, large furniture, vehicles, bigger-than-1m decorative elements).
- Meshes whose silhouette read on the floor is gameplay-relevant (e.g., cover crates).

Remove `castShadow = true` on:
- Small props (bottles, papers, cans, mugs, books, controllers, small electronics).
- Trim, banding, brackets, baseboards, decorative cylinders/spheres < 0.5m.
- Anything always touching another shadow-caster (a stack of papers on a desk that already casts a shadow).

Set explicit `castShadow = false` only when the prop's parent or default state would otherwise be `true`; otherwise rely on the Three.js default of `false`.

`receiveShadow` is much cheaper than `castShadow` (a per-fragment lookup vs. a separate render pass per light) — leave `receiveShadow` flags alone unless trivially unneeded.

### Verification

- Visual: walk each map at Medium and High. Confirm large props still cast shadows (crates, barrels, large furniture). Confirm small props look correct without shadows — the receiver shadow they fall in absorbs them.
- Performance: shadow map render time drops proportional to vertex count removed from the shadow render pass. Largest gain on Office (heaviest prop density).
- Tests: existing prop tests in `tests/maps/` should pass unchanged; if any test asserts `castShadow` on a small prop it must be updated to match the new behavior.

### Risks & Mitigations

- **Risk:** Removing `castShadow` from a prop the user actually expects to cast a shadow makes a noticeable visual gap.
  **Mitigation:** When in doubt, keep `castShadow`. The audit is "remove only when clearly invisible," not "remove aggressively."

---

## Out of Scope

- Office prop-density reduction. Office's cost is geometry/draw-call density, not lights. Section 4's shadow-caster audit will help indirectly. If Office still drops after these cuts, a follow-up spec addresses prop density specifically.
- Tier-gating new content. The existing `tierGated` / `tierGatedLight` helpers continue to work for any future map but this design adds no new gated groups.
- Bloodstrike interior trim. The 2026-05-02 spec already addressed structural trim there.
- Italy decorative-prop gating. Italy never received a gating pass; this design instead removes its 14 lights, which is the dominant cost. Prop gating on Italy is a possible follow-up.
- Renderer-side optimizations (frustum culling, draw-call batching, instancing).

## Order of Implementation

The four sections are independent and can ship in any order. Suggested order by leverage:

1. **Section 1** (remove 39 lights) — biggest single win, no test impact.
2. **Section 3** (Medium pixelRatio 1.5 → 1.25) — one-line change, large GPU win.
3. **Section 2** (bloom Medium → High) — one-line change, large GPU win, possibly test update.
4. **Section 4** (shadow-caster audit) — largest diff, most careful work, smallest individual cost cut per item but adds up.

Each section is its own commit. Each commit runs `npm test` before landing.

## Documentation Updates

- `docs/architecture.md`: no change. Module ownership unchanged.
- `docs/game-design.md`: no change. No mode/balance changes.
- `docs/gotchas.md`: add a note that outdoor maps in this codebase **do not** use dynamic point lights — they rely on directional sun + hemisphere + ambient. Future map authors should follow this pattern.
- `AGENTS.md`: no change.
