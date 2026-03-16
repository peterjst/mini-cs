# Enemy Death Animation Overhaul

## Problem

The current enemy death animation feels floaty and balloon-like. Bodies fall too slowly (0.6-0.8s with smoothstep easing), don't reach convincing resting poses, and disappear after 2 seconds. This breaks immersion.

## Goals

1. Deaths feel weighted and impactful — cinematic style with hit jolt then gravity fall
2. Final resting poses look natural and vary by death variant (flat vs crumpled)
3. Bodies persist on the ground until round end (cleared on round reset or map change)
4. No visual change to dead bodies (pose alone communicates death)

## Design

### Hit Jolt + Gravity Fall Physics

Replace the current smoothstep easing with a two-phase animation:

- **Phase 1 — Hit Jolt (0–0.1s):** Instant recoil opposite to hit direction. Uses the existing `_lastHitDir` vector. Applies ~0.05–0.08 units of positional displacement (position, not rotation) with ease-out (fast snap, slight settle). The jolt displacement is maintained — Phase 2 adds on top of it, no blend-back.
- **Phase 2 — Gravity Fall (0.1s–0.4s):** Accelerating downward drop using a quadratic ease-in curve (`t * t`) to simulate gravity. Rotations and limb animations happen during this phase. Body reaches the ground quickly with no float.

**Variant 3 (headshot crumple) skips Phase 1 entirely** — goes straight to gravity fall for 0.3s total.

Final Y positions per variant:
| Variant | Final Y offset | Rationale |
|---------|---------------|-----------|
| 0 — Backward | -1.0 | Flat on back, full body length on ground |
| 1 — Forward | -0.9 | Face down, slight torso curl |
| 2 — Spin & Drop | -1.0 | On side, full drop |
| 3 — Crumple | -1.1 | Knees buckled under, deepest drop |
| 4 — Stagger & Fall | -0.9 | On side, partial curl |

**Total duration:** ~0.4s for most variants, ~0.3s for headshot crumple.

**Known limitation:** The `setInterval(fn, 16)` approach is retained (out of scope to change). At high refresh rates the animation may look slightly choppy relative to gameplay motion, but for 0.3-0.4s this is acceptable.

### Variant-Dependent Final Poses

Each of the 5 existing variants gets a redesigned final resting pose:

| Variant | Trigger | Animation | Final Pose | Style |
|---------|---------|-----------|------------|-------|
| 0 — Fall Backward | Front hit | Jolt back, torso tilts back, drops | Lying on back, arms splayed to sides | Flat |
| 1 — Fall Forward | Back hit | Jolt forward, face-plant fall | Face down, one arm tucked, one extended | Flat |
| 2 — Spin & Drop | Side hit | Jolt sideways, twist and collapse | On side, legs bent, top arm draped over | Crumpled |
| 3 — Crumple | Headshot | No jolt, instant leg buckle, fast drop (0.3s) | Knees bent under, torso slumped, arms limp at odd angles | Most crumpled |
| 4 — Stagger & Fall | Default | Direction-aware stagger using hitDir (not arbitrary local Z), tip sideways, drop | On side, one leg straight, one bent | Semi-crumpled |

Key changes from current:
- Final rotations are larger so body actually reaches the ground plane
- Limb positions are deliberate per variant rather than just trailing the torso
- Duration shortened from 0.6-0.8s to 0.3-0.4s
- Variant 4 stagger direction is now based on hit direction rather than arbitrary local Z

### Body Persistence

- Remove the `setTimeout` mesh cleanup from `die()` — bodies no longer vanish after 2 seconds
- Dead enemies stay in the scene with their final pose until round end
- `clearAll()` (already called on round reset and map change) handles all cleanup
- Dead enemies continue to be skipped for AI updates (`if (!e.alive) continue`) — no performance cost beyond rendering static meshes

**Interval cleanup:** Store the `setInterval` handle on the enemy instance as `this._deathInterval`. The `destroy()` method must call `clearInterval(this._deathInterval)` before removing the mesh. This fixes a pre-existing bug where `destroy()` during animation (common in Gun Game/Deathmatch) leaves an orphaned interval.

**Gun Game / Deathmatch modes:** These modes call `destroy()` immediately on kill to respawn a new bot. Body persistence (keeping the mesh in scene) does NOT apply in these modes — `destroy()` continues to remove the mesh as before. The improvement is that the death animation plays correctly until `destroy()` is called, and the interval is properly cleaned up. In Competitive/Survival modes where `destroy()` is not called on kill, bodies persist until `clearAll()`.

**Body count cap:** Not needed. Even Survival mode has bounded wave sizes, and round resets clear all bodies. Dozens of static meshes are negligible for Three.js rendering.

## Files Changed

| File | Changes |
|------|---------|
| `js/enemies.js` | Overhaul `die()`: new easing, jolt phase, pose tuning, store interval on instance, remove setTimeout. Update `destroy()`: clear death interval. |
| `js/main.js` | Verify Gun Game/Deathmatch kill paths work correctly with new animation — may need minor adjustments if `destroy()` timing interacts with jolt phase |
| `REQUIREMENTS.md` | Update death animation documentation to reflect new timing, physics, and persistence |
| `tests/` | Update/add tests for new death animation behavior |

## Out of Scope

- Ragdoll physics simulation
- Visual changes to dead bodies (transparency, color shifts)
- Body persistence across rounds
- Switching from setInterval to requestAnimationFrame
