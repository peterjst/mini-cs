# Immersion Pass II Design

**Date:** 2026-03-02
**Goal:** Comprehensive immersion improvements across weapon feel, movement feedback, damage response, and audio depth — building on the Immersion Overhaul (2026-03-01).
**Approach:** Organized by game moment (what the player experiences), so each layer is immediately playtestable.

---

## Layer 1: "I Shoot" — Weapon Model & Firing Feel

### 1a. Weapon View Model Sway

The gun model subtly lags behind camera movement, creating a sense of physical weight.

- **Look sway:** Gun model offsets opposite to mouse delta, lerps back at ~6/s. Max offset ±0.03 units horizontal, ±0.02 vertical.
- **Move bob:** Separate sinusoidal bob on the weapon group, slightly out of phase with camera bob, giving the gun its own momentum.
- **Sprint tilt:** Gun tilts ~15° to the side and lowers slightly when sprinting (carried at hip).

### 1b. Reload Animation Overhaul

Replace the current simple dip with a multi-phase mechanical sequence:

- **Phase 1 (0–0.3s):** Gun tilts ~25°, magazine (small box geometry) drops away with gravity, fades out.
- **Phase 2 (0.3–0.7s):** Hand brings new magazine up from below, gun stays tilted.
- **Phase 3 (0.7–1.0s):** Magazine seats, gun returns to ready position.
- **Audio:** Magazine release click, magazine insert thunk, bolt rack metallic sound (rifles/SMGs).

### 1c. Enhanced Muzzle Flash Dynamic Light

Existing 50ms PointLight muzzle flash gets per-weapon tuning:

- Flash color varies: warm orange (AK), brighter white (AWP), standard yellow (pistol/SMG).
- Light intensity scaled: pistol 0.8, rifle 1.2, AWP 2.0.
- Brief illumination of nearby walls visible in scene.

### 1d. Enhanced Visual Recoil

Weapon model moves independently from camera recoil for parallax effect:

- **Model kick-back:** On fire, gun snaps backward ~0.05 units Z and rotates upward 3–5°, springs back over ~0.15s.
- **Slide/bolt animation:** Brief backward slide on gun's bolt mesh (0.02 units, 80ms) per shot — visible mechanical cycling.
- **Burst drift:** On sustained fire, weapon model gradually drifts upward and sideways (stacking), making spray feel more physical.

---

## Layer 2: "I Move" — Movement Feel & Surface Interaction

### 2a. Surface-Dependent Footsteps

Raycast downward from player to detect floor material, produce matching footstep sound:

- **Concrete/stone:** Current hard step, slightly pitched down with more bass.
- **Metal:** Higher-pitched ringing metallic step with brief resonance tail.
- **Wood:** Softer, warmer thud with slight creak overtone.
- **Sand (Dust map):** Soft muffled shuffling, low-pass filtered.
- Detection uses hit mesh's material reference to determine surface type.
- Applies to both player and bot footsteps.

### 2b. Weapon Pendulum Swing

On direction changes, the weapon group gets a subtle pendulum swing — selling momentum and weight. Complements 1a's look sway with movement-triggered inertia.

### 2c. Footstep Dust Particles

On sand/dirt surfaces, small dust puffs at player's feet when walking/sprinting. Reuses impact dust puff system (tiny cubes, short-lived, pooled). Only on outdoor/sandy maps.

---

## Layer 3: "I Get Hit" — Damage Feedback & Death

### 3a. Directional Damage Indicator

Red arc/wedge on screen pointing toward damage source. Fades over ~1s.

- Rendered as CSS overlay: red gradient arc, rotated to match angle from player to attacker.
- Multiple simultaneous sources show multiple arcs.

### 3b. Screen Blood Splatter

On taking damage, red vignette pulse intensifies (building on existing low-health heartbeat). At high damage (>30 HP), add blood splatter overlay — red splotches on screen edges, fade over 2s. Opacity scales with damage taken.

### 3c. Improved Death Sequence

Enhance current death camera (fall + tilt) with:

- **Color desaturation:** Scene desaturates to near-grayscale over death fall duration (CSS filter).
- **Audio fade:** Ambient sounds go muffled/distant, brief slowing heartbeat.
- **Weapon drop:** Weapon model falls away from camera (drops downward with slight spin).

### 3d. Kill Confirmation Enhancement

- **Confirmed kill sound:** Satisfying short chime distinct from hitmarker (lower pitch, slightly longer).
- **Micro slow-motion:** 50ms of reduced time scale (0.7×) on kill. Only on non-rapid kills to avoid disrupting flow during multi-kills.

---

## Layer 4: "I Hear the World" — Audio Atmosphere

### 4a. Environment Reverb

ConvolverNode with procedurally generated impulse response per map:

- **Indoor (Office, Warehouse):** 0.8–1.2s decay, moderate wet mix.
- **Enclosed (Aztec temple):** 1.5s decay, more pronounced echo.
- **Outdoor (Dust, Bloodstrike):** 0.2–0.3s decay, mostly dry.
- **Mixed (Italy):** 0.5s decay, narrow street feel.
- Impulse response: filtered noise burst shaped by exponential decay, generated procedurally.

### 4b. Distant Gunfire Echo

Enemy shots from >30 units away get a delayed, filtered echo tail:

- Low-pass filter original shot (cut above ~2kHz).
- Delay by `distance / 343` seconds (speed of sound, scaled for game feel).
- Volume reduced with distance squared.
- Creates "crack...thump" distant gunfire effect.

### 4c. Surface-Aware Bullet Impact Sounds

Match audio to impact surface material:

- **Concrete/stone:** Sharp crack, brief.
- **Metal:** Ringing ping with resonance.
- **Wood:** Dull thud with splintering overtone.
- Uses same surface detection as footsteps (material-based).

---

## Files Affected

| File | Changes |
|------|---------|
| `js/weapons.js` | Weapon sway, reload animation, muzzle flash tuning, visual recoil, pendulum swing, impact sounds |
| `js/player.js` | Sway integration, surface detection, death sequence, kill slow-mo |
| `js/sound.js` | Surface footsteps, reload sounds, reverb system, distant echo, impact sounds, kill chime, death audio |
| `js/enemies.js` | Surface-aware bot footsteps |
| `js/main.js` | Damage indicator, blood splatter, death overlay, dust particles, reverb init |
| `index.html` | Damage indicator + blood splatter overlay elements, death desaturation CSS |
| `REQUIREMENTS.md` | Document all 14 features |

## Performance Notes

- All features use existing patterns: pooled particles, short-lived audio nodes, CSS overlays.
- Reverb uses a single shared ConvolverNode — moderate cost, acceptable.
- No new render passes needed.
- Weapon sway and visual recoil are pure math on existing transforms.

## Not In Scope

- Weather effects (rain, snow)
- Environmental particles (dust motes, embers)
- Destructible environments
- Player voice lines / pain sounds
- Grenade danger indicator
