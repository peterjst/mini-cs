# Enemy & Boss Model Improvement Design

**Date:** 2026-04-08
**Goal:** Replace remaining blocky (BoxGeometry) parts with organic shapes and add procedural walk/idle animation to enemies and boss.
**Style:** Low-Poly Tactical — keep CS military identity (helmets, balaclavas, vests) while eliminating the "lego" appearance.

## 1. Head Shape

Replace the current perfect sphere head with a stretched sphere (egg shape):

- **Current:** `SphereGeometry(0.28, 14, 10)` — perfect ball
- **Proposed:** `SphereGeometry(0.24, 14, 12)` scaled `(1.0, 1.2, 0.95)` — taller than wide, slightly flattened front-to-back
- Add a separate jaw sphere underneath: `SphereGeometry(0.16, 10, 8)` scaled `(1.0, 0.6, 0.85)` — provides chin/jawline definition
- Reposition existing headgear (CT helmet dome, T beanie, balaclava mask) to fit the new head proportions
- Same treatment for the boss head

## 2. Box-to-Organic Geometry Replacements

### Boots
- **Current:** `BoxGeometry(0.22, 0.22, 0.35)` + `BoxGeometry(0.24, 0.04, 0.37)` sole + half-cylinder toe
- **Proposed:** LatheGeometry boot profile (rounded ankle-to-calf shape) + `SphereGeometry` toe cap (half-sphere, scaled for boot shape) + `CylinderGeometry` sole

### Hands
- **Current:** `BoxGeometry(0.08, 0.04, 0.10)` palm + `BoxGeometry(0.07, 0.03, 0.06)` fingers + cylinder thumb (3 pieces)
- **Proposed:** Single `SphereGeometry(0.06, 8, 6)` mitt scaled `(1.2, 0.8, 1.4)` — reads as a closed fist/grip at game distance, far less blocky

### Brow Ridge
- **Current:** `BoxGeometry(0.24, 0.04, 0.08)` — flat box across face
- **Proposed:** `TorusGeometry` arc — curved ridge above eyes

### Face Mask (T side)
- **Current:** `BoxGeometry(0.30, 0.14, 0.16)` — flat box over lower face
- **Proposed:** Partial `SphereGeometry` using phi/theta start/length parameters — wraps the lower face organically

### Floating Marker
- **Current:** `BoxGeometry(0.3, 0.3, 0.3)` — cube
- **Proposed:** `OctahedronGeometry` or `SphereGeometry` — diamond or sphere shape

### Boss Helmet
- **Current:** `BoxGeometry(0.32, 0.18, 0.32)` — flat box on head
- **Proposed:** LatheGeometry dome profile — rounded helmet shape that covers the skull

### Boss Shoulder Pads
- **Current:** `BoxGeometry(0.22, 0.12, 0.18)` — flat boxes
- **Proposed:** Half-sphere `SphereGeometry(0.14, 10, 8, 0, PI*2, 0, PI*0.5)` — curved armor pads

### Boss Visor
- **Current:** `BoxGeometry(0.28, 0.08, 0.02)` — flat strip
- **Proposed:** `TorusGeometry` curved strip — follows the helmet curvature

## 3. Shoulder-Arm Connection

Replace the current separate shoulder sphere + bicep lathe with one continuous upper arm LatheGeometry:

```
Profile (bottom to top):
[0, 0.07]      — elbow end (narrow)
[0.08, 0.085]  — above elbow
[0.20, 0.10]   — mid bicep
[0.32, 0.11]   — upper bicep
[0.40, 0.13]   — deltoid bulge (shoulder cap)
[0.46, 0.12]   — shoulder top (sinks into trunk)
```

The top of this profile overlaps with the trunk geometry, creating a smooth shoulder-to-arm silhouette without a visible seam. The separate `shoulder` SphereGeometry in the geo cache is no longer needed for the arm connection.

## 4. Procedural Animation System

Add per-frame procedural animation driven by movement state. No skeleton/bones needed — animate existing Three.js Groups directly.

### New State on Each Enemy
- `_walkPhase` (float) — current phase of walk cycle, advances with movement
- `_idleTimer` (float) — clock for idle breathing/sway
- `_leftLegGroup`, `_rightLegGroup` — new Groups wrapping each leg's thigh+knee+calf+boot meshes so they can be rotated as a unit

### Leg Groups (new)
Currently, leg parts (thigh, knee, calf, boot) are added directly to the enemy mesh. Wrap each leg's parts in a `THREE.Group` pivoting at hip height (~1.0) so the entire leg can swing forward/back.

### Walk Cycle (when `speed > 0`)
- `_walkPhase += speed * dt * 4.0` (frequency scales with movement speed)
- Left leg rotation.x = `sin(walkPhase) * 0.4` (±23° swing)
- Right leg rotation.x = `sin(walkPhase + PI) * 0.4` (opposite phase)
- Left arm rotation.x base offset + `sin(walkPhase + PI) * 0.25` (arms opposite to legs)
- Right arm rotation.x base offset + `sin(walkPhase) * 0.25`
- Head bob: `mesh.children[headIndex].position.y += sin(walkPhase * 2) * 0.01`
- Slight torso lean: `trunk.rotation.x = sin(walkPhase) * 0.03`

### Idle (when stationary)
- `_idleTimer += dt`
- Breathing: trunk Y-scale oscillates `1.0 + sin(idleTimer * 3.0) * 0.005`
- Weight shift: mesh lateral sway `sin(idleTimer * 0.7) * 0.01`

### Attack Pose (when firing)
- Right arm already points toward target — keep existing behavior
- Add slight upper body forward lean: `trunk.rotation.x = -0.05`

### Boss Animation
Same system but tuned for the boss's larger, heavier presence:
- Walk frequency multiplier: `0.7` (slower stride)
- Leg swing amplitude: `0.3` (less range but more weight)
- No idle weight shift (boss stands firm)
- Breathing amplitude: `0.008` (bigger chest movement)

## 5. What Stays the Same

- All existing LatheGeometry parts: trunk, vest, thighs, calves, biceps, forearms
- Knee and elbow sphere joints
- Eye, nose, ear geometry and positioning (adjusted for new head position)
- Material palettes (CT navy/blue, T tan/brown, skin tones)
- Collision radius (`ENEMY_RADIUS`) and hitbox/raycast logic
- All AI states, combat behavior, pathfinding
- Weapon group positioning and muzzle flash
- Death animation system

## 6. Files Modified

- `js/enemies.js` — geometry cache, `_buildModel`, `Boss._buildModel`, animation in `_update`
- `REQUIREMENTS.md` — update enemy/boss model descriptions

## 7. Risks & Mitigations

- **Visual regression:** Animation values tuned in this spec need playtesting. Start conservative (small amplitudes) and adjust.
- **Performance:** Leg groups add 2 Groups per enemy. With max 5 enemies + 1 boss, this is negligible.
- **Collision:** No changes to collision radius or raycast targets. Model is purely visual.
- **Existing tests:** Model building is not currently unit-tested. Animation state variables need to be initialized in the constructor to avoid test failures.
