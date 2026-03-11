# Visual Overhaul Design

Holistic visual upgrade to align with modern FPS standards. Performance-first: 60fps on mid-range hardware, SSAO toggleable.

## 1. Post-Processing Pipeline

Replace the current bloom-only pipeline with a unified multi-pass chain.

**Render order:**

1. **Scene render** → full-res `sceneRT` with `THREE.DepthTexture` attached (provides both color and depth in one pass)
2. **SSAO** → half-res render target. Hemisphere sampling (8 samples, radius 0.5 units, bias 0.025, falloff 2.0). Separable bilateral blur (2-pass, 5-tap kernel) to clean noise. Output multiplied onto scene color. Toggleable via quality setting.
3. **Bloom** → existing bright-extract (luminance > 0.75) into `brightRT` + 9-tap Gaussian blur (`blurHRT`, `blurVRT`), unchanged logic
4. **Composite + Color Grade + Vignette** → single shader pass:
   - Blends bloom onto scene (`scene + bloom * 0.4`)
   - Per-map color grading (tint, shadow color shift, contrast, saturation as uniforms)
   - Vignette (radial darkening via `smoothstep`)
   - Death desaturation: `uDesaturate` uniform (0.0–1.0), lerped in JS same as current CSS approach
   - Replaces current CSS `contrast(1.05) saturate(1.1)` filter entirely
5. **Sharpen** → unsharp mask (strength 0.3, radius 1 texel)

**Render targets:** 6 total — `sceneRT` (with DepthTexture), `ssaoRT` (half-res), `brightRT`, `blurHRT`, `blurVRT`, plus final output to screen. Currently 4 RTs, so 2 more.

**Per-map color grading uniforms** (added to map definition):

```
colorGrade: {
  tint: [r, g, b],
  shadows: [r, g, b],
  contrast: 1.05,
  saturation: 1.1,
  vignetteStrength: 0.3
}
```

## 2. Particle System

New file `js/particles.js`. Single unified system using InstancedMesh per particle type. Pool-based FIFO recycling (oldest particle replaced when pool is full). One `updateParticles(dt)` call per frame. Managed in `particles.js`, exposed via `GAME.particles`.

### Particle Types

| Type | Geometry | Pool | Lifetime | Notes |
|------|----------|------|----------|-------|
| Bullet tracer | Stretched cube 0.02×0.02×0.5 | 10 | 0.1s | Emissive yellow, every 3rd shot |
| Shell casing | Cylinder 0.01×0.025 | 20 | 2s | Brass, simplified bounce (see below) |
| Wall dust | Sphere 0.03 | 30 | 0.4s | Color matched to surface, expand+fade |
| Wall spark | Cube 0.01 | 20 | 0.2s | Emissive orange, metal surfaces only |
| Bullet hole | Plane 0.08 | 50 | Persistent (FIFO) | Dark circle, oriented to surface normal. Oldest recycled when pool full. |
| Muzzle flash | 2 crossing planes 0.15 | 2 | 0.05s | Emissive, random rotation per shot |
| Smoke wisp | Sphere 0.1 | 15 | 0.6s | Semi-transparent, drift up, expand |
| Blood spray | Cubes (existing) | 30 | 0.5s | Directional velocity, size variation |
| Blood mist | Sphere 0.15 | 5 | 0.3s | Translucent red cloud, headshot only |
| HE debris | Small boxes | 20 | 1s | Fly outward from explosion |
| HE fireball | Sphere 0.5→2.0 | 1 | 0.4s | Expand+fade, emissive orange→black |
| Shockwave ring | Torus | 1 | 0.3s | Transparent, rapid scale-up |
| Smoke grenade | Sphere cluster | 30 | 15s (matches smoke duration) | Alpha-blended (not additive), opacity 0.3–0.5, spawn 1 sphere every 200ms, each drifts XZ ±0.5 m/s + slight upward Y, fade out over last 3s |

~10 InstancedMeshes total, ~200 max active particles.

### Shell Casing Bounce

No physics engine — simplified simulation:
1. Eject right+up from weapon with random velocity (2–4 m/s right, 1–2 m/s up)
2. Apply gravity each frame (−9.8 m/s²)
3. Raycast down each frame; on floor collision, reflect Y velocity with 0.3 damping
4. Max 2 bounces, then slide to rest
5. Spin: random rotation velocity on all axes, damped per bounce
6. Trigger shell clink sound on first bounce

### Sound Integration

- **Shell casing clink:** High-frequency metallic tap on first bounce (procedural: short sine burst 4000–6000 Hz with fast decay, randomized pitch). Triggered by particle system on bounce event.
- **Wall impact sounds:** Brief thud (concrete/wood) or ping (metal) on bullet hit. Triggered alongside `spawnWallImpact()`. Already partially exists in sound.js — extend with material-specific variants.

### Integration Points

- `weapons.js` → `spawnTracer()`, `spawnCasing()`, `spawnMuzzleFlash()` on fire
- `weapons.js` → `spawnWallImpact(pos, normal, materialType)` on bullet hit
- `enemies.js` → `spawnBlood(pos, dir, isHeadshot)` on enemy hit
- `main.js` → `updateParticles(dt)` each frame

## 3. Lighting Overhaul

### Per-Map Lighting Moods

Extend map definitions with a `lighting` config object. The existing lighting code in `GAME.buildMap()` (shared.js lines 608–637) is modified to read these per-map values instead of hardcoded defaults:

```
lighting: {
  sunColor, sunIntensity, sunPos,
  fillColor, fillIntensity,
  ambientIntensity,
  hemiSkyColor, hemiGroundColor, hemiIntensity,
  shadowMapSize, shadowFrustumPadding
}
```

| Map | Character | Key Settings |
|-----|-----------|-------------|
| Dust | Harsh desert noon | Warm sun 0xfff0d0, intensity 1.1, strong shadows, minimal fill 0.15 |
| Office | Cool fluorescent | Blue-white 0xe8eef8, intensity 0.6, high ambient 0.4, soft shadows |
| Warehouse | Moody industrial | Dim sun 0.5, warm tungsten points, high contrast |
| Bloodstrike | Arena floodlit | Neutral bright 1.0, even fill 0.4, crisp shadows |
| Italy | Warm Mediterranean | Golden 0xffe8c0, angled low, warm fill |
| Aztec | Dappled jungle | Green hemi 0x88aa70, filtered sun 0.7, high ground bounce |

### Shadow Quality

- Tighter shadow camera frustum per map via `shadowFrustumPadding`
- Per-map shadow bias tuned to light angle

### Dynamic Combat Lighting

Pool of 3 reusable PointLights managed in `js/particles.js` (co-located with other visual effects). Replaces the existing single muzzle flash PointLight in weapons.js.

- Muzzle flash: intensity 8–15 (weapon-dependent), correct color, quadratic decay over 60ms
- Explosions: intensity 20, distance 15, decay over 300ms
- `weapons.js` calls `GAME.particles.spawnCombatLight(pos, color, intensity, decayMs)` instead of managing its own PointLight

## 4. Enhanced Hit Feedback

- **Directional blood:** particles inherit bullet direction vector
- **Headshot distinction:** 2x particle count, blood mist sphere, brief white screen-edge flash (50ms), crosshair expand-contract
- **Hit confirmation:** JS-driven crosshair scale (not CSS animation — avoids conflict with existing JS crosshair positioning). Scale crosshair gap outward by 2px, lerp back over 100ms.
- **Kill confirmation:** JS-driven crosshair color override to red for 200ms, lerp back
- Both effects driven from the same JS code that already manages crosshair spread

## 5. Grenade Visual Effects

| Grenade | Effect |
|---------|--------|
| HE | Expanding fireball (emissive orange→red→black, 0.4s) + shockwave torus + 20 debris chunks + PointLight flash via combat light pool + ground scorch decal |
| Smoke | 20–30 alpha-blended spheres (opacity 0.3–0.5), random XZ drift ±0.5 m/s, spawn 1 every 200ms for 15s duration, old spheres fade over last 3s of their life |
| Flashbang | Existing white overlay + 2 crossing emissive planes (lens flare) + bloom strength temporarily boosted to 1.0 for 200ms |

## 6. Performance & Degradation

**Performance budget:** All effects combined should add no more than 3ms to frame time on mid-range hardware (integrated GPU).

**Degradation priority** (first to disable when FPS drops below 55):
1. SSAO — toggleable, biggest single cost (~1.5ms)
2. Sharpen pass — remove if needed (~0.2ms)
3. Particle pool sizes halved — reduce visual density
4. Bloom blur at quarter-res instead of half-res

No automatic quality scaling — manual toggle in settings. Default: SSAO on.

## Files

| Status | File | Changes |
|--------|------|---------|
| NEW | js/particles.js | Unified particle system + combat light pool |
| MOD | js/main.js | Post-processing pipeline, particle update loop, death desaturation uniform |
| MOD | js/maps/shared.js | Per-map lighting/colorGrade configs, buildMap reads lighting config |
| MOD | js/maps/dust.js | Add lighting + colorGrade config |
| MOD | js/maps/office.js | Add lighting + colorGrade config |
| MOD | js/maps/warehouse.js | Add lighting + colorGrade config |
| MOD | js/maps/bloodstrike.js | Add lighting + colorGrade config |
| MOD | js/maps/italy.js | Add lighting + colorGrade config |
| MOD | js/maps/aztec.js | Add lighting + colorGrade config |
| MOD | js/weapons.js | Spawn particles on fire/hit, replace muzzle flash light with combat light pool |
| MOD | js/enemies.js | Spawn blood on hit with direction |
| MOD | js/sound.js | Shell casing clink, material-specific impact sounds |
| MOD | index.html | Load particles.js |
