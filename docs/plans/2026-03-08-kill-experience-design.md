# Kill Experience Overhaul — Design

## Goal
Improve the feel of killing enemies across three areas: death animations, visual feedback (camera kick), and audio impact.

## 1. Death Animations

Replace the single rigid forward-roll animation with 5 directional collapse variants, chosen based on where the killing shot came from relative to the enemy's facing.

| Variant | Trigger | Animation |
|---------|---------|-----------|
| Fall backward | Shot from front | Torso tilts back, knees buckle, arms trail upward, lands on back |
| Fall forward | Shot from behind | Slumps forward, arms drop, face-plants |
| Spin & drop | Shot from left/right | Torso twists toward shot direction, legs give out, spirals down |
| Crumple | Headshot | Instant leg collapse, body drops straight down, head leads |
| Stagger & fall | Default/fallback | Steps back once (slight position shift), then tips and falls to side |

- Body parts (head, torso, arms, legs) animate on staggered timings (50-150ms offsets) for organic feel.
- Total animation duration: 0.6-0.8s.
- Corpse lingers 2s before removal (unchanged).

## 2. Camera Kick

On the killing blow only (not regular hits):

- Direction: Small sharp pitch kick upward.
- Magnitude: ~0.015 radians (~0.85 degrees). Headshot: 1.5x (~0.023 rad).
- Timing: Snap up over ~50ms, ease-back over ~150ms.
- No stacking: skip if a kick is already animating.
- Implemented as a temporary pitch offset on player camera, separate from weapon recoil.

## 3. Audio — Bass Impact Layer

Add a low-end thump underneath existing kill dink sounds (not replacing them):

- Body kill thump: Noise burst through low-pass filter (~150Hz cutoff), 0.1s duration, gain ~0.25.
- Headshot thump: Louder (gain ~0.3), sharper attack, plus sub-bass sine at ~60Hz.
- Envelope: 5ms attack, fast exponential decay. Single punchy "thud", not a rumble.
- Layered on top of existing killDink/killDinkHeadshot/killConfirm sounds.
