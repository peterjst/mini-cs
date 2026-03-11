# Visual Overhaul Design

Holistic visual upgrade to align with modern FPS standards. Performance-first: 60fps on mid-range hardware, SSAO toggleable.

## 1. Post-Processing Pipeline

Replace the current bloom-only pipeline with a unified multi-pass chain.

**Render order:**

1. **Scene render** → full-res `sceneRT` (color) + `depthRT` (depth texture for SSAO)
2. **SSAO** → half-res, 8-sample kernel, bilateral blur. Darkens corners/crevices. Multiplied onto scene color. Toggleable via quality setting.
3. **Bloom** → existing bright-extract (luminance > 0.75) + 9-tap Gaussian blur, unchanged logic
4. **Composite + Color Grade + Vignette** → single shader pass:
   - Blends bloom onto scene (`scene + bloom * 0.4`)
   - Per-map color grading (tint, shadow color shift, contrast, saturation as uniforms)
   - Vignette (radial darkening via `smoothstep`)
   - Replaces current CSS `contrast(1.05) saturate(1.1)` filter
5. **Sharpen** → unsharp mask on final output

**Render targets:** 5 total (scene, depth, SSAO half-res, bloom H-blur, bloom V-blur) — 1 more than current.

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

New file `js/particles.js`. Single unified system using InstancedMesh per particle type. Pool-based recycling. One `updateParticles(dt)` call per frame.

### Particle Types

| Type | Geometry | Pool | Lifetime | Notes |
|------|----------|------|----------|-------|
| Bullet tracer | Stretched cube 0.02×0.02×0.5 | 10 | 0.1s | Emissive yellow, every 3rd shot |
| Shell casing | Cylinder 0.01×0.025 | 20 | 2s | Brass, physics bounce, eject right+up |
| Wall dust | Sphere 0.03 | 30 | 0.4s | Color matched to surface, expand+fade |
| Wall spark | Cube 0.01 | 20 | 0.2s | Emissive orange, metal surfaces only |
| Bullet hole | Plane 0.08 | 50 | Permanent | Dark circle, oriented to surface normal |
| Muzzle flash | 2 crossing planes 0.15 | 2 | 0.05s | Emissive, random rotation per shot |
| Smoke wisp | Sphere 0.1 | 15 | 0.6s | Semi-transparent, drift up, expand |
| Blood spray | Cubes (existing) | 30 | 0.5s | Directional velocity, size variation |
| Blood mist | Sphere 0.15 | 5 | 0.3s | Translucent red cloud, headshot only |
| HE debris | Small boxes | 20 | 1s | Fly outward from explosion |
| HE fireball | Sphere 0.5→2.0 | 1 | 0.4s | Expand+fade, emissive orange→black |
| Shockwave ring | Torus | 1 | 0.3s | Transparent, rapid scale-up |
| Smoke grenade | Sphere cluster | 30 | Full duration | Opacity layers, slow drift |

~10 InstancedMeshes total, ~200 max active particles.

### Integration Points

- `weapons.js` → `spawnTracer()`, `spawnCasing()`, `spawnMuzzleFlash()` on fire
- `weapons.js` → `spawnWallImpact(pos, normal, materialType)` on bullet hit
- `enemies.js` → `spawnBlood(pos, dir, isHeadshot)` on enemy hit
- `main.js` → `updateParticles(dt)` each frame

## 3. Lighting Overhaul

### Per-Map Lighting Moods

Extend map definitions with a `lighting` config object read by `setupLighting()`:

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

- Pool of 3 reusable PointLights for muzzle flash and explosions
- Muzzle flash: intensity 8-15 (weapon-dependent), correct color, quadratic decay over 60ms
- Explosions: intensity 20, distance 15, decay over 300ms

## 4. Enhanced Hit Feedback

- **Directional blood:** particles inherit bullet direction vector
- **Headshot distinction:** 2x particle count, blood mist sphere, brief white screen-edge flash (50ms), crosshair expand-contract
- **Hit confirmation:** crosshair lines spread 2px outward, return over 100ms
- **Kill confirmation:** crosshair flashes red for 200ms
- CSS animations for crosshair effects (no rendering cost)

## 5. Grenade Visual Effects

| Grenade | Effect |
|---------|--------|
| HE | Expanding fireball (emissive orange→red→black, 0.4s) + shockwave torus + 20 debris chunks + PointLight flash + ground scorch decal |
| Smoke | 20-30 overlapping spheres (opacity 0.3-0.5), random XZ drift ±0.5 m/s, new spheres every 200ms, old fade out |
| Flashbang | Existing white overlay + 2 crossing emissive planes (lens flare) + bloom strength temporarily boosted to 1.0 for 200ms |

## Files

| Status | File | Changes |
|--------|------|---------|
| NEW | js/particles.js | Unified particle system |
| MOD | js/main.js | Post-processing pipeline, particle update loop |
| MOD | js/maps/shared.js | Per-map lighting configs, color grade params, setupLighting changes |
| MOD | js/maps/dust.js | Add lighting + colorGrade config |
| MOD | js/maps/office.js | Add lighting + colorGrade config |
| MOD | js/maps/warehouse.js | Add lighting + colorGrade config |
| MOD | js/maps/bloodstrike.js | Add lighting + colorGrade config |
| MOD | js/maps/italy.js | Add lighting + colorGrade config |
| MOD | js/maps/aztec.js | Add lighting + colorGrade config |
| MOD | js/weapons.js | Spawn particles on fire/hit, muzzle flash rework |
| MOD | js/enemies.js | Spawn blood on hit with direction |
| MOD | js/sound.js | Shell casing clink, impact sounds |
| MOD | index.html | Load particles.js, crosshair CSS animations |
