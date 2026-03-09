# Knife UX Overhaul — Design

## Problem
The knife has no swing animation (all recoil values are zero), uses a single pixel-thin raycast for hit detection, and provides no visual feedback on hit. It's effectively unusable.

## Changes

### 1. Swing Animation — Alternating Horizontal Slashes
- Left-click alternates between right-to-left and left-to-right slashes
- The knife model rotates ~90° across the screen over ~250ms with an ease-out curve
- Slight FOV punch (inward) on each swing for weight
- Small screen shake on swing to sell the motion

### 2. Hit Detection — 45° Cone Sweep
- Replace single raycast with multiple raycasts fanned across a 45° horizontal cone
- Cast ~7-9 rays spread evenly across the cone
- First enemy hit by any ray takes damage (no double-hitting same enemy per swing)
- Keep vertical detection as-is (single height level from camera)

### 3. Range Increase — 3 → 5 Units
- Increases effective melee reach to make knife viable for aggressive play
- Pairs with the wide cone for a reliable melee experience

### 4. Hit Feedback — Heavy
- **On swing (always):** FOV punch + light screen shake
- **On hit:** Camera kick, forward view-model lunge (~0.1 units toward target over 100ms then snap back), meaty thud/impact sound (low-frequency punch layered with a sharp crack)
- **On kill:** Existing kill camera kick system applies

### 5. Impact Sound — New `knifeHit()` Procedural Sound
- Layered: low thud (80Hz sine, short decay) + sharp transient (noise burst, high-pass filtered) + optional wet slap texture
- Distinct from the swing whoosh — only plays when connecting with an enemy

## What's NOT Changing
- Damage stays at 55 (2-hit kill body, 1-hit headshot with perks)
- Fire rate stays at 1.5/sec
- No primary/secondary attack distinction
- Knife model geometry stays the same
- `knifeSlash()` whoosh sound stays as the swing sound
