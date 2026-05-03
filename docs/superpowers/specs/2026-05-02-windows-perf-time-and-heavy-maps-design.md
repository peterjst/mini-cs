# Windows Performance — Time Decoupling & Heavy-Map Cuts Design

## Problem

After the 2026-04-28 (powerPreference, markStatic, hoisted allocations) and 2026-04-30 (multi-permutation shader warmup, adaptive robustness) optimizations shipped, weak Windows hardware still struggles on three specific maps: **bloodstrike, aztec, office**. Two maps run well: **dust, arena**.

The user-visible symptom on the heavy maps is unusual: graphics fidelity does *not* drop noticeably, but **in-game time runs slower than wall-clock time** — one in-game second feels longer than one real second.

Root cause for the symptom: `js/core/main.js:1331` clamps frame `dt` to `0.05`:

```js
var dt = Math.min(lastTime ? now - lastTime : 0.016, 0.05);
```

When sustained frame time exceeds 50 ms (i.e. FPS < 20), the simulation only advances by 50 ms per frame while real time advances more. The scene still renders correctly each frame (so quality looks OK to the user), but the world progresses slower than wall time. This is the standard "spiral of death" guard, manifesting on weak Windows hardware as time dilation rather than juddery frames.

Root cause for the heavy-map FPS drop: the three slow maps have higher per-frame render cost than dust/arena. Initial code scan suggests different drivers per map (aztec: 16 lights vs. 1–9 elsewhere; office: many builder calls implying high mesh/draw-call count; bloodstrike: largest map, recently filled with solid interior), but the actual bottleneck on Windows hardware is unverified.

## Goals

- Eliminate the time-dilation symptom: at any frame rate the engine can sustain, **in-game time matches wall-clock time** for HUD timers, mode logic, AI, weapons, and player movement.
- Reduce per-frame cost on bloodstrike, aztec, office on weak Windows hardware enough that the adaptive system settles at a higher tier than today.
- Preserve the visual fidelity of every map at the **High** and **Ultra** quality tiers.
- Keep the three pieces of work independently shippable so each can be measured separately.
- No new player-facing UI or settings.

## Non-Goals

- Re-touching the optimizations from the 2026-04-28 or 2026-04-30 specs.
- Adding instrumentation infrastructure beyond a single one-shot per-map stats dump (gated behind a debug flag, intended to be removed or left dormant after this work).
- Changing the LEVELS table or its FPS thresholds.
- Reducing visual fidelity at High or Ultra tiers.
- Changing the simulation step contract beyond the systems that actually need it (no full fixed-step refactor).
- Async shader compilation (still out of scope as in 2026-04-30).

---

## Section 1: Targeted Substepping for Time-Sensitive Systems

### Current Behavior

The animate loop in `js/core/main.js:1331` produces a `dt` clamped to `0.05` s. That `dt` is passed verbatim to every `update(dt)` call in the loop: `player.update`, `weapons.update`, `enemies.update`, `GAME.particles.update`, `GAME.bomb.update`, mode update functions, HUD timers, screen-shake decay, kill-cam timers, and so on.

When real frame time exceeds 50 ms, every system receives a smaller-than-real `dt` and advances less than real time. The simulation as a whole progresses slower than wall time, producing the time-dilation feel.

Two distinct problems are tangled here:

1. **Time tracking** — round timers, bomb timer, screen-shake decay, etc. must track wall time even when frames are slow.
2. **Numerical stability** — player collision, projectile travel, and AI movement break under arbitrarily large `dt` (tunneling through walls, AI overshooting waypoints, raycasts skipping past colliders).

The current clamp solves problem 2 (capping dt limits the per-frame movement delta) at the cost of problem 1 (everything else falls behind wall time).

### Proposed Design

Decouple the two concerns:

1. **Raise the loop clamp** from `0.05` to `0.25`. This is high enough that any plausible single-frame hitch (tab return, GC, heavy compile) passes through without dilation, but low enough that a truly broken frame (e.g. browser background-throttled to multiple seconds) doesn't propagate as one giant tick.

2. **Introduce `GAME.subTick(dt, maxStep, fn)`** — a helper that breaks one update into N synchronous calls of `fn(stepDt)`, each with `stepDt <= maxStep`:

    ```js
    GAME.subTick = function(dt, maxStep, fn) {
      if (dt <= maxStep) { fn(dt); return; }
      var steps = Math.ceil(dt / maxStep);
      var MAX_SUBSTEPS = 4;
      if (steps > MAX_SUBSTEPS) steps = MAX_SUBSTEPS;
      var stepDt = dt / steps;
      for (var i = 0; i < steps; i++) fn(stepDt);
    };
    ```

    The `MAX_SUBSTEPS` cap (4) prevents catastrophic spirals when the simulation itself is the cost driver. At cap, the final per-step `dt` may exceed `maxStep` — accepted as graceful degradation.

3. **Apply `subTick` at the call sites whose internal correctness depends on small dt**, leaving raw `dt` for time-tracking call sites. The audit:

    | Call site | Treatment | Reason |
    |---|---|---|
    | `player.update(dt)` | `subTick(dt, 0.025, fn)` | Movement + collision; tunneling risk |
    | `weapons.update(dt, ...)` | `subTick(dt, 0.025, fn)` | Projectile travel, grenade physics |
    | `enemies.update(dt, ...)` | `subTick(dt, 0.033, fn)` | AI movement; tunneling and overshoot risk |
    | `GAME.bomb.update(dt)` | raw `dt` | Pure timer |
    | Round timers, phaseTimer, damageFlashTimer, kill-kick, hitmarker | raw `dt` | Pure timers |
    | `GAME.particles.update(dt)` | raw `dt` | Visual; large dt = particles age faster, acceptable |
    | `GAME.birds.update(dt)` | raw `dt` | Ambient |
    | `weapons.updateDroppedWeapon(dt, ...)` | raw `dt` | Visual bob/animation |
    | Screen shake, bloom boost, flash fade | raw `dt` | Decay timers |

    The `maxStep` per system is chosen against the smallest dt that historically didn't break that system, with margin. Player at `0.025` (~40 Hz min step) is the strictest; enemies at `0.033` (~30 Hz) is acceptable because AI updates are inherently coarser.

4. **`subTick` is non-recursive at the call site.** The implementing functions (`player.update`, `weapons.update`, `enemies.update`) treat the passed `dt` as their full update budget; the substep loop happens externally. No internal `update` function needs to know substepping is happening.

### Files Changed

- `js/core/main.js` — raise clamp constant, add `GAME.subTick` helper, wrap the three target call sites in `subTick(...)`.
- No changes inside `player.js`, `weapons.js`, `enemies.js` are required for Section 1; their `update(dt)` contracts remain unchanged. The wrapping happens at the call site in `main.js`.

### Risks

- **AI per-step cost compounds.** `enemies.update` walks every bot every call. At a sustained 200 ms frame with 8 bots, 4× substeps = 32 bot-updates per render, vs. 8 today. Mitigation: the substep cap of 4 bounds the worst case; the per-bot work is dominated by raycasts and movement math (cheap), not by rendering (paid once per render). Net cost should still be lower than the avoidable bug class.
- **Aliasing across substeps.** If a state mutation in one substep changes inputs to the next substep in a non-obvious way (e.g. enemy A shoots player on substep 1, player dies, substep 2 of enemy AI now sees player.alive = false), behavior shifts subtly relative to today. This is *more* correct than today, but it is a behavior change. Most game logic in this repo already gates on `player.alive` per-frame; spot-check during implementation.
- **Mode timers and round flow.** Round timers will now track wall time correctly — which is a behavior change relative to a clamped-dt session. Specifically, round time will now elapse faster when FPS is low than it does today. This is the intended behavior (the user explicitly does not want time dilation), but it implies that very slow Windows runs may now finish rounds in close to the nominal duration where today they ran longer. Confirm no tests assert dilated timer behavior.
- **Tab return.** When a hidden tab resumes, `now - lastTime` can be many seconds. The 0.25 clamp prevents this from propagating, but a 250 ms first frame after return may still feel like a small hitch. Acceptable; the existing `lastTime = 0` reset in the visibilitychange handler (`main.js:715`) already addresses the tab-return case for normal hitches.

### Validation

- Existing test suite (`tests/`) must pass without modification.
- Manual test on Mac: full match in each mode, confirm no behavior regressions (movement feel, weapon firing, AI behavior).
- Manual test on Windows on the heavy maps: with FPS sustained <20, confirm in-game timer matches a wall stopwatch over a 30-second window. Today: in-game timer lags. Expected after this change: in-game timer ≈ wall stopwatch.
- Manual test: tab-switch away for 10 seconds, return. Confirm no visible glitch (player flung across map, AI teleporting). The 0.25 clamp is the safety net.
- Tests-after for any regression observed.

---

## Section 2: One-Shot Per-Map Scene Stats

### Current Behavior

There is no per-map cost telemetry. We can hypothesize about what makes aztec/office/bloodstrike heavy (lights, draw calls, mesh count) but cannot confirm without measurement on the affected hardware.

### Proposed Design

After a map's root group finishes building and is marked static, walk the subtree once and emit a single console line. Counts only — no timing, no DOM overlay, no rendering cost.

```js
// js/maps/shared.js — exposed as H.dumpMapStats via GAME._mapHelpers
function dumpMapStats(name, root) {
  if (!GAME._debugMapStats) return;
  var meshes = 0, shadowCasters = 0, lights = 0;
  var materials = new Set(), geometries = new Set();
  root.traverse(function(o) {
    if (o.isMesh) {
      meshes++;
      if (o.castShadow) shadowCasters++;
      if (o.material) materials.add(o.material.uuid || o.material);
      if (o.geometry) geometries.add(o.geometry.uuid || o.geometry);
    } else if (o.isLight) {
      lights++;
    }
  });
  console.log(
    '[map-stats] ' + name +
    '  meshes=' + meshes +
    '  shadowCasters=' + shadowCasters +
    '  lights=' + lights +
    '  materials=' + materials.size +
    '  geometries=' + geometries.size
  );
}
```

The walk is over the map's own root group, so the global directional light (which is added directly to `GAME.scene`, not to map roots) is correctly excluded by construction.

The dump is gated on `GAME._debugMapStats`, defaulting to `false`. The user sets it to `true` from the browser console (or by toggling one constant) before running the heavy maps on Windows, then reports the numbers. After the cuts in Section 3 are validated, the helper can stay (dormant under the flag) or be removed in a follow-up.

Each map's existing build function calls `H.dumpMapStats(name, rootGroup)` immediately after `GAME.markStatic(rootGroup)`.

### Files Changed

- `js/maps/shared.js` — add `dumpMapStats` to the exposed helpers.
- Each of `arena.js`, `aztec.js`, `bloodstrike.js`, `dust.js`, `italy.js`, `office.js`, `warehouse.js` — one line at end of build, after the existing `markStatic` call (per the 2026-04-28 spec).

### Risks

- **Debug flag left on in production.** Mitigation: defaults to `false`; one log line per map build is harmless even if accidentally enabled.
- **Stats reflect post-build state, not runtime state.** Counts are static and won't see dynamic objects (bots, weapons, particles). This is intentional — the goal is to characterize map cost, not the full per-frame scene.

### Validation

- Existing tests must pass.
- Manual: enable the flag, load each map, confirm the line appears once with sensible numbers.
- User runs on Windows for `dust`, `arena`, `bloodstrike`, `aztec`, `office`. Pastes the five lines back. The numbers feed Section 3's cut decisions.

---

## Section 3: Tier-Gated Content Groups on Heavy Maps

### Current Behavior

Every map renders identically at every quality tier. The LEVELS table in `js/core/quality.js:10` only controls renderer-global parameters (pixelRatio, shadow type, shadow map size, post-processing). Per-map content is fixed.

### Proposed Design

Add a tier-gating mechanism so heavy maps can opt decorative subgroups out of rendering at lower quality tiers, while preserving the High and Ultra look exactly.

#### Mechanism

```js
// js/maps/shared.js — exposed as H.tierGated via GAME._mapHelpers
function tierGated(group, minLevel) {
  group.userData.minQualityLevel = minLevel;
  applyTierVisibility(group);
}

function applyTierVisibility(group) {
  var min = group.userData.minQualityLevel;
  if (min == null) return;
  var current = (GAME.quality && GAME.quality.level != null) ? GAME.quality.level : 5;
  group.visible = current >= min;
}

// Top-level on GAME — called from quality.js on tier change
GAME._reapplyAllTierVisibility = function() {
  if (!GAME.scene) return;
  GAME.scene.traverse(function(o) {
    if (o.userData && o.userData.minQualityLevel != null) {
      applyTierVisibility(o);
    }
  });
};
```

Maps register a tagged group via `H.tierGated(group, minLevel)`. The internal `applyTierVisibility` is the per-group apply; `GAME._reapplyAllTierVisibility` is the global sweep called by the quality system on tier change.

`quality.js` calls `GAME._reapplyAllTierVisibility()` from `applyLevel()` after the existing renderer-state changes. The call is cheap (single traverse, only objects with `userData.minQualityLevel` do work).

#### Why visibility (not removal)

Toggling `Object3D.visible = false` skips rendering but keeps the object in the scene graph. Crucially:

- **Mesh visibility** — Three.js skips rendering invisible meshes; no shader recompile, no draw call. Free.
- **Light visibility** — Setting `Light.visible = false` keeps the light in the scene's light list but skips its contribution. The Three.js r160 light-uniform packing **does** depend on the count of *visible* lights of each type — toggling visibility may shift uniform counts and cause shader recompile for shadow-receiving materials.

  We resolve the light case in two steps:
  1. **Implementation default** — for tier-gated lights, set `light.intensity = 0` rather than `light.visible = false`. The light remains in the count, no shader recompile, but contributes no light. Cost is the per-pixel attenuation/shadow math against zero, which is small for non-shadow-casting lights.
  2. **Stronger cut for shadow-casting lights** — if a tier-gated light casts shadow, also set `light.castShadow = false` at the cut. Shadow casters are the expensive case; disabling shadow casting at low tiers is a real cost reduction. This may recompile shaders the first time the cut applies; the multi-permutation warmup from 2026-04-30 already compiles shadow-on and shadow-off permutations, so this is a no-op compile in practice.

  We confirm this behavior empirically during implementation: log a warning if a tier transition causes a noticeable hitch on the test machine.

#### Per-map cuts (placeholders — finalized after Section 2 stats arrive)

These are starting hypotheses. Section 2's data may refute or refine them.

- **aztec** — half the decorative torch / pillar lights gated to `minLevel: 3` (Medium+). Structural/path lights stay at all tiers.
- **office** — small decorative props (desk surface clutter, ceiling-tile detail meshes, wall-vent grills, window-frame trim) gated to `minLevel: 2` (Low+). Wall, floor, ceiling, doors, and main desks stay.
- **bloodstrike** — interior decorative fill (the recently-added solid-fill clusters, if they include decorative sub-meshes) gated to `minLevel: 3`. Structural geometry and gameplay-relevant cover stay at all tiers.

The exact cut list, the `minLevel` per group, and the grouping boundaries are determined by reading Section 2's numbers and walking each map's build code with cuts in mind.

#### Adaptive interaction

- At map build, the current quality level is read once and groups apply visibility immediately. No flicker.
- On `applyLevel(newLevel)` mid-map, the reapply walks the scene and updates visibility. Mesh-visibility changes are free; light-castShadow changes hit the warmup-cached permutation. No new hitches expected.
- Cuts are *additive only* on downgrade and *subtractive only* on upgrade. A tier-gated group at `minLevel: 3` is hidden at levels 0–2, visible at 3–5. There is no per-tier separate config table.

### Files Changed

- `js/maps/shared.js` — add `tierGated` (exposed via `_mapHelpers` as `H.tierGated`); add the `GAME._reapplyAllTierVisibility` top-level.
- `js/core/quality.js` — call `GAME._reapplyAllTierVisibility()` at the end of `applyLevel()`.
- `js/maps/aztec.js` — group decorative lights, tag with `H.tierGated(group, 3)`.
- `js/maps/office.js` — group decorative props, tag with `H.tierGated(group, 2)`.
- `js/maps/bloodstrike.js` — group decorative interior fill, tag with `H.tierGated(group, 3)`.

### Risks

- **Shader recompile on tier change for lights.** Mitigated by intensity-zero pattern for non-shadow-casting cuts and by the existing multi-permutation warmup for shadow-casting cuts. If empirically we still see hitches, the fallback is to extend Section 1 of the 2026-04-30 spec to also pre-compile a "lights-zeroed" permutation per map; tracked but not blocking.
- **Map looks subtly different at Ultra mid-session if adaptive briefly downgrades.** When adaptive returns to Ultra, the cut groups become visible again. There is a one-frame moment where decoration "pops in." Acceptable: adaptive transitions are rare after warmup, and the alternative (rebuild the map on tier change) is far worse.
- **Bot pathing through "gated" geometry.** If a tagged group contains anything with collision (a wall, a crate the wall validator considers cover), hiding it at low tiers would break gameplay. Rule: **only purely decorative subgroups are tier-gated.** Anything in the walls collision set or the spawn-zone validator stays at all tiers. Audit each tagged group against the wall list during implementation.
- **Static-mark interaction.** `GAME.markStatic` from the 2026-04-28 spec freezes matrices. Tier-gated groups still need their matrices fresh at build time. The visibility toggle does not require matrix updates, so this is fine.

### Validation

- Existing tests must pass without modification.
- Add a test: `tests/integration/tier-gating.test.js` that loads each tagged map, sets quality to each level 0–5, and asserts (a) gated groups have correct `.visible`, (b) ungated structural geometry stays visible always, (c) wall collision set is identical at every tier (no gameplay-affecting geometry hidden).
- Manual on Mac at Ultra: confirm aztec, office, bloodstrike look identical to today.
- Manual on Mac, force `applyLevel(0..5)` from console: confirm each tier's expected cuts apply, no errors, no flicker beyond the tier transition itself.
- Manual on Windows: confirm adaptive system settles at a higher tier than today on the three heavy maps. Read `GAME.quality.name` after 30 seconds of gameplay on each.

---

## Sequencing

The three sections are independent and shippable as separate commits:

1. **Section 2 first** — stats dump (~30 LOC). Lowest risk, highest information value. User runs on Windows, reports numbers, the data informs Section 3's cut list. Section 1 does not depend on this.
2. **Section 1 in parallel with 2** — substep helper and call-site wrapping. Self-contained; no dependency on the others. Ship when audit and validation pass.
3. **Section 3 after Section 2's data is in.** Ship per-map: aztec first (most lights, easiest cuts), office next, bloodstrike last (largest map, most interaction with the existing collision/spawn system to audit).

After each section, retest on Windows: read `GAME.quality.name` after 30 seconds, compare in-game round timer to a wall stopwatch over 30 seconds. Both should improve at each step; the combination of Section 1 + Section 3 is what eliminates the time-dilation feel.

## Open Questions

- **Whether `light.intensity = 0` or `light.visible = false` is the correct cut for non-shadow-casting decorative lights.** Resolved during Section 3 implementation by empirical test on Windows; the design above defaults to `intensity = 0`.
- **Whether bloodstrike's recently-added interior fill contains decorative sub-meshes that are safe to gate, or whether it is structural-only.** Resolved by reading the relevant build code in Section 3 implementation; if structural-only, bloodstrike's cuts target other decoration, or bloodstrike is dropped from Section 3 and addressed via Section 1 + future work.
