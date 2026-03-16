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

- **Phase 1 — Hit Jolt (0–0.1s):** Instant recoil in the hit direction. The body shifts slightly backward/sideways from the impact point. Sells the moment of impact.
- **Phase 2 — Gravity Fall (0.1s–0.4s):** Accelerating downward drop using a quadratic ease-in curve (`t * t`) to simulate gravity. Body reaches the ground quickly with no float.

Total Y drop calibrated so the mesh ends at ground level (~-1.0 to -1.2 units depending on variant).

**Total duration:** ~0.4s for most variants, ~0.3s for headshot crumple.

### Variant-Dependent Final Poses

Each of the 5 existing variants gets a redesigned final resting pose:

| Variant | Trigger | Animation | Final Pose | Style |
|---------|---------|-----------|------------|-------|
| 0 — Fall Backward | Front hit | Jolt back, torso tilts back, drops | Lying on back, arms splayed to sides | Flat |
| 1 — Fall Forward | Back hit | Jolt forward, face-plant fall | Face down, one arm tucked, one extended | Flat |
| 2 — Spin & Drop | Side hit | Jolt sideways, twist and collapse | On side, legs bent, top arm draped over | Crumpled |
| 3 — Crumple | Headshot | No jolt, instant leg buckle, fast drop (0.3s) | Knees bent under, torso slumped, arms limp at odd angles | Most crumpled |
| 4 — Stagger & Fall | Default | Small stagger step, tip sideways, drop | On side, one leg straight, one bent | Semi-crumpled |

Key changes from current:
- Final rotations are larger so body actually reaches the ground plane
- Limb positions are deliberate per variant rather than just trailing the torso
- Duration shortened from 0.6-0.8s to 0.3-0.4s

### Body Persistence

- Remove the `setTimeout` mesh cleanup from `die()` — bodies no longer vanish after 2 seconds
- Dead enemies stay in the scene with their final pose until round end
- `clearAll()` (already called on round reset and map change) handles all cleanup
- Dead enemies continue to be skipped for AI updates (`if (!e.alive) continue`) — no performance cost beyond rendering static meshes

## Files Changed

| File | Changes |
|------|---------|
| `js/enemies.js` | Overhaul `die()` function: new easing, jolt phase, pose tuning, remove setTimeout cleanup |
| `js/main.js` | No changes expected — existing `clearAll()` flow already handles round reset cleanup |
| `REQUIREMENTS.md` | Update death animation documentation to reflect new timing, physics, and persistence |
| `tests/` | Update/add tests for new death animation behavior |

## Out of Scope

- Ragdoll physics simulation
- Visual changes to dead bodies (transparency, color shifts)
- Body persistence across rounds
- Switching from setInterval to requestAnimationFrame
