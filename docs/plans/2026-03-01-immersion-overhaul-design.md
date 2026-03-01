# Immersion Overhaul Design

**Date:** 2026-03-01
**Goal:** Significantly improve game feel and immersion across shooting, movement, visuals, and audio while keeping performance lightweight.
**Approach:** Layered by player exposure frequency — most-felt improvements first.

## Layer 1: Camera Recoil & Screen Punch

The camera itself kicks when the player fires — not just the weapon model. This is the single biggest gap in gun feel.

### Vertical Recoil
Each shot adds upward pitch to the camera. Per-weapon values:
- AWP: ~3.5°
- Shotgun: ~2.5°
- Rifle (AK): ~1.2°
- Pistol: ~0.8°
- SMG: ~0.6°

Recovery pulls pitch back down at ~5°/s so crosshair returns to center naturally.

### Horizontal Drift
Small random horizontal yaw per shot (±0.3° rifle, ±0.15° pistol). Creates natural spray wobble.

### Burst Accumulation
Consecutive shots within 0.3s stack recoil with multiplier `1 + shotIndex * 0.15` (capped). Mimics spray patterns getting worse.

### FOV Punch
Brief 1-2° FOV squeeze on each shot, decays in ~0.1s. Adds percussive snap.

### Screen Shake
Weapon-scaled shake intensity values: pistol 0.01, SMG 0.015, rifle 0.03, shotgun 0.04, AWP 0.06.

### Implementation
Add `_recoilPitch`, `_recoilYaw`, `_fovPunch` accumulators to player update loop. Each weapon definition gets `recoilUp`, `recoilSide`, `fovPunch` constants. Recovery in player update each frame.

**Performance:** Zero — just math on existing camera values.

## Layer 2: Head Bob & Movement Weight

### Head Bob
Sinusoidal vertical camera offset synced to footstep timing:
- Walk: ±0.03 units at ~2.2Hz
- Sprint: ±0.05 at ~3Hz
- Crouch: ±0.015 at ~1.5Hz
- Horizontal sway at half vertical frequency for natural gait
- Smooth transitions between movement states

### Enhanced Landing Impact
Scale with fall distance:
- Short hops: landDip = -0.06
- Medium falls: landDip = -0.15
- Big falls: landDip = -0.25 with brief FOV pulse

### Velocity Smoothing
Acceleration ramp: reach full speed over ~0.1s. Deceleration over ~0.08s. Removes instant start/stop "ice skating" feel while staying responsive.

**Performance:** Few sin() calls per frame — negligible.

## Layer 3: Bullet Impact Effects

### Bullet Hole Decals
On wall hit, spawn dark circular decal (PlaneGeometry ~0.08 units, dark gray/black). Oriented to surface normal (reusing blood decal pattern). Pooled: max 60, oldest recycled. Fade over 15 seconds.

### Impact Dust Puff
3-4 tiny particles (0.02 unit cubes, light gray) burst from impact along surface normal. Gravity + slight spread velocity, fade over 0.3s. Pooled: ~20 particles.

### Surface-Aware Coloring
Hit surface material color determines dust color: brick/stone = tan/brown, metal = brighter sparks, concrete = gray.

**Performance:** Similar to existing blood decal system (80-pool, works fine). Dust particles are tiny and short-lived.

## Layer 4: Spatial Audio

### HRTF Panning
Attach PannerNode to positional sounds with `panningModel: 'HRTF'`, `distanceModel: 'inverse'`, `refDistance: 5`, `maxDistance: 80`, `rolloffFactor: 1.2`.

### Listener Sync
Update `AudioContext.listener` position and orientation each frame from camera.

### Spatial Sound Sources
- Enemy weapon fire
- Grenade explosions and bounces
- Bot footsteps (new)
- Bomb tick
- Player's own sounds remain non-spatial

### Bot Footstep Audio
Bots already track movement. Add timer-based footstep sound for nearby bots (within ~15 units), routed through spatial audio. Uses existing footstep sound at lower gain.

**Performance:** PannerNode with HRTF is moderate cost. Limit concurrent spatial sources and pool nodes.

## Files Affected

| File | Changes |
|------|---------|
| `js/player.js` | Camera recoil accumulators, head bob, velocity smoothing |
| `js/weapons.js` | Per-weapon recoil/shake constants, bullet impact decals + dust |
| `js/main.js` | Impact decal management, audio listener update |
| `js/sound.js` | Spatial audio system, PannerNode pool, bot footstep sound |
| `js/enemies.js` | Bot footstep timer triggering spatial footstep sounds |
| `REQUIREMENTS.md` | Document all new features |

## Not In Scope
- Ambient atmosphere particles (deferred)
- Weather effects
- Surface-dependent footstep sounds (player)
- Grenade danger indicator
- Reverb/convolution
