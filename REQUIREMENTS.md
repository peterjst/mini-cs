# Mini CS — Requirements & Feature Spec

## Overview
A browser-based Mini Counter-Strike FPS built with Three.js r160.1 (CDN, global `THREE`). Fully procedural graphics and sound — no external assets. Runs from a single `index.html` entry point.

---

## Core Architecture
- **Module system**: IIFE pattern, all modules attach to `window.GAME`
- **Script files** (loaded in dependency order):
  - `js/map.js` — Map definitions, materials, lighting, build helpers
  - `js/player.js` — First-person controller, collision, movement
  - `js/sound.js` — Procedural Web Audio API sound effects
  - `js/weapons.js` — Weapon definitions, models, shooting, grenades
  - `js/enemies.js` — Bot AI, humanoid models, behavior states
  - `js/main.js` — Game loop, state machine, HUD, buy system
- **Rendering**: Three.js WebGLRenderer with PBR materials, shadows, tone mapping

---

## Renderer & Graphics

### Renderer Setup
- Antialiasing enabled
- Shadow mapping: `PCFSoftShadowMap`
- Tone mapping: `ACESFilmicToneMapping`, exposure 1.2
- Color space: `SRGBColorSpace`
- Pixel ratio capped at 2

### Coherent Noise Engine
- `_hash(ix, iy, seed)` — integer-coordinate hash returning 0–1
- `_valueNoise(x, y, seed)` — bilinear-interpolated lattice noise with smoothstep
- `_fbmNoise(x, y, octaves, lacunarity, gain, seed)` — fractal Brownian motion sum
- Used by all procedural textures for spatially coherent, natural-looking patterns

### Procedural Bump Textures
- Canvas-based bump maps cached and shared across all materials
- `_noiseBump` now uses fbm noise instead of `Math.random()` for coherent patterns
- `_floorBump` — tile grid pattern (128px, 32px tiles, repeat 6×6) for visible grout lines
- `_concBump` — fbm noise (64px, repeat 3×3) for rough concrete grain
- `_plastBump` — fbm noise (64px, repeat 4×4) for subtle plaster texture
- `_woodBump` — fbm noise (64px, repeat 2×2) for wood grain variation
- `_heightToNormal(key, size, drawFn, strength)` — converts height maps to RGB tangent-space normal maps via Sobel filter, seamless-tiling wrap

### Map-Specific Floor Textures (256×256, cached)
- **Dust sand** — normalMap: 4-octave fbm + directional sine wind ripples (strength 1.2, repeat 5×5); roughnessMap: 3-octave fbm (180–230) + wind-polished spots (~140)
- **Office tile** — normalMap: 64px tile grid with 3px recessed grout + per-tile fbm variation (strength 0.8, repeat 4×4); roughnessMap: base 200, grout 240, polished traffic lanes (~150)
- **Warehouse concrete** — normalMap: 5-octave fbm porous concrete + crack polylines (strength 1.5, repeat 4×4); roughnessMap: 4-octave fbm (190–250) + oil patches (~100) + tire-track stripes (~120)

### Materials (all PBR `MeshStandardMaterial`)
- `floorMat` — high roughness (0.92), no metalness, tile bump (0.04) — used for non-floor surfaces, overlays, stains
- `dustFloorMat` — roughness 0.92, sand normalMap (normalScale 0.6) + sand roughnessMap
- `officeTileMat` — roughness 0.85, tile normalMap (normalScale 0.5) + tile roughnessMap
- `warehouseFloorMat` — roughness 0.95, concrete normalMap (normalScale 0.8) + concrete roughnessMap
- `concreteMat` — very rough (0.95), concrete noise bump (0.05)
- `plasterMat` — moderate roughness (0.82), plaster noise bump (0.025)
- `woodMat` — roughness 0.7, wood noise bump (0.03)
- `metalMat` — low roughness (0.35), high metalness (0.65)
- `darkMetalMat` — roughness 0.3, metalness 0.8
- `fabricMat` — very rough (0.95)
- `glassMat` — transparent (opacity 0.3), low roughness
- `crateMat` — optional emissive tint
- `emissiveMat` — configurable emissive glow
- `ceilingMat` — roughness 0.8

### Lighting (per map)
- Hemisphere light (sky + ground bounce, intensity 0.4)
- Ambient fill (0.25)
- Main directional light (warm 0xfff4e5, intensity 0.9) with shadow casting
  - Shadow map: 2048x2048, bias -0.001
  - Shadow camera bounds based on map size
- Fill directional light (cool 0xc8d8f0, intensity 0.3) from opposite side
- Per-map point lights and hanging light fixtures

### Post-Processing Bloom
- Multi-pass bloom pipeline in `main.js`:
  - Bright-pass extraction (threshold 0.75, soft knee 0.5) into half-resolution render target
  - 9-tap separable Gaussian blur (horizontal + vertical passes)
  - Composite blend (bloom strength 0.4) onto scene
  - All rendering goes through `renderWithBloom()`
  - Render targets resize with window

### Film Look
- CSS `filter: contrast(1.05) saturate(1.1)` on canvas for subtle color grading
- Gameplay vignette: radial gradient overlay (transparent center to dark edges, opacity 0.25) inside HUD

### Procedural Sky Dome
- Per-map custom `ShaderMaterial` hemisphere dome blending sky color and fog color
- Created in `map.js` per-scene

### PBR Environment Map
- `THREE.PMREMGenerator.fromScene()` generates PMREM-based environment map per scene
- Set as `scene.environment` for realistic PBR reflections on all materials

### Shadow System
- Objects: `castShadow = true` + `receiveShadow = true`
- Floors: `receiveShadow = true`
- Helper functions: `shadow()`, `shadowRecv()`

---

## Maps

### General
- 3 maps rotated by round: `currentMapIndex = (roundNumber - 1) % 3`
- Each map defines: name, size, skyColor, fogColor, fogDensity, playerSpawn, botSpawns, waypoints, build function
- Fog type: `THREE.FogExp2` (exponential squared)
- Build helpers: `B()` (collidable box), `D()` (decoration), `Cyl()` (cylinder), `CylW()` (collidable cylinder), `buildStairs()`, `addHangingLight()`, `addPointLight()`

### Map 1: "Dust" — Desert Market
- Size: 50x50, wall height 6
- Sandy/sandstone color palette, sky blue, desert fog
- **Structures**: Central market building with roof, archway with pillars/lintel
- **Cover**: 2 market stalls with awnings and table legs, sandbag positions (stacked), 10+ crates/cover boxes of varying sizes, stacked small crates
- **Props**: Oil barrels (upright + tipped), destroyed vehicle (body, cabin, 4 wheels), palm trunk stubs
- **Environment details**: Worn path on ground, wall trim/baseboards, scattered rubble/rocks, broken pottery shards + intact pot, clothesline with hanging cloth, tire tracks, wall damage patches, scattered metal debris, additional hanging lights

### Map 2: "Office" — Modern Interior
- Size: 40x40, wall height 6, ceiling at y=6
- Cool gray/blue palette, bright overcast sky (0x90a4ae), light indoor fog (0x889098, density 0.008)
- **Walls**: Perimeter walls, 12 interior walls forming rooms and corridors, baseboards
- **Furniture**: 6 desks with monitors/keyboards/stands, 6 office chairs with wheel bases, filing cabinets, server rack with LED glow, bookshelf with colored books, 2 whiteboards, water cooler, couch with armrests, potted plants
- **Cover**: 5 accent crates (blue/industrial style)
- **Lighting**: 9 fluorescent ceiling lights with point lights (intensity 1.2, range 26, emissive 2.0)
- **Environment details**: Paper stacks and coffee mugs on desks, trash bins, fire extinguisher, door frames, air vent grilles on ceiling, wall clock with hands, wet floor sign, floor scuff marks, electrical outlets, ceiling sprinkler heads, pen cup with pencil, coat hooks

### Map 3: "Warehouse" — Multi-Floor Industrial
- Size: 60x50, wall height 14
- Warm industrial palette, sunset sky (0xd4886a), golden fog (0x9a7060, density 0.004)
- **Ground floor (y=0)**:
  - Shipping containers (blue 12m, green 8m, red 10m) with door ends
  - 3 pallet stacks with crates (1-3 high)
  - Forklift (body, mast, forks, wheels)
  - Industrial shelving rack with uprights, shelves, items
  - 4 oil drums, 2 low concrete barriers
  - Yellow floor markings (loading zone lines)
- **2nd floor (y=4)**:
  - East platform (12x44), north bridge (36x4)
  - 6 support beams, inner railings (top + mid rail)
  - Crates on platforms
  - Stairs from ground floor (z direction, width 4)
- **3rd floor (y=8)**:
  - 10x10 observation room with corrugated metal walls
  - Glass window in south wall
  - Roof slab, control desk with 2 glowing monitors
  - 4 support beams
  - Stairs from 2nd floor (z direction, width 3)
- **Vertical elements**: Wall-mounted pipes, horizontal pipe
- **Lighting**: 5 ground-floor hanging lights, 2 second-floor hanging lights, 1 third-floor room light (all warm 0xffcc88). 10 ground-level warm fill lights (0xffd8b0, intensity 0.8–1.2, range 25–32), 2 stairwell lights for visibility, 3 second-floor platform fill lights. Sunset bounce lighting throughout.
- **Environment details**: Oil stains on floor, yellow safety signs with danger stripes, green fire exit signs (emissive), hanging chains with hook, caution tape, tool rack with wrench/hammer, ventilation ducts with joints on ceiling, scattered bolts/debris, broken pallet pieces, electrical junction box, safety cones, clipboard on crate, number stencils on containers, rope coil

---

## Player

### Movement
- WASD movement (8-directional)
- Mouse look (pointer lock)
- Sprint (Shift): 1.6x speed multiplier
- Crouch (C): Toggle, 0.5x speed multiplier, eye height 1.0 (vs 1.7 standing)
  - Smooth height interpolation over ~0.1s
  - Headroom check via upward raycast prevents standing under low geometry
  - Cannot sprint while crouching (crouch overrides sprint)
  - Uncrouch on jump
  - Accuracy bonus while crouching (see Weapons → Shooting Mechanics)
- Jump (Space): velocity 7, gravity 20
- Base speed: 6 units/s
- Player height: 1.7, crouch height: 1.0, radius: 0.4

### Sprint FOV Zoom
- Camera FOV smoothly widens from 75 to 82 when sprinting (Shift + moving + not crouching)
- Lerps back to 75 when sprint ends (rate: 6 * dt)
- Calls `camera.updateProjectionMatrix()` each frame

### Landing Camera Dip
- Tracks previous ground state (`_wasOnGround`) and current dip offset (`_landDip`)
- On landing (transition from airborne to grounded), sets `_landDip = -0.12`
- Dip lerps back to 0 at rate `10 * dt`, applied to camera Y position
- Sells the impact of landing from jumps and falls

### Armor Mechanics
- Armor absorbs 50% of incoming damage, capped by remaining armor amount
- Example: 20 damage with 100 armor → 10 absorbed by armor, 10 to health; armor reduced to 90
- Armor is NOT reset between rounds — it persists across rounds
- Purchased via buy menu for $650, sets armor to 100

### Death Camera
- On death, camera falls to ground with gravity and tilts sideways (~80°) with slight downward pitch drift
- Eye height drops to 0.3 (lying on ground), ground-checked via downward raycast
- Animation runs during ROUND_END, SURVIVAL_DEAD, and the death frame in PLAYING/SURVIVAL_WAVE
- Reset on `player.reset()` for next round

### Weapon Drop on Death
- When the player dies, the held weapon detaches from the camera and drops into the world scene
- Weapon is tossed slightly upward (velY=1.5) with random tumble rotation, falls with gravity (18 m/s²)
- Scaled up 1.4x from first-person size, oriented to player's facing direction
- Ground detection via downward raycast against wall colliders; settles flat at ground + 0.05 height
- Dropped weapon persists through death camera view and ROUND_END / SURVIVAL_DEAD states
- Cleaned up on `resetForRound()` before next round starts
- Triggered by both enemy damage and grenade explosion kills

### Collision
- 8-direction horizontal raycasting at 2 Y levels (feet + head)
- Step-up mechanic: if lower ray hits but 0.6m higher is clear, player walks over obstacle
- Ground check: downward raycast, snaps to surface with fallback to y=PLAYER_HEIGHT
- Multi-floor support: relative Y positions for ray origins

---

## Weapons

### Weapon Definitions
| Weapon | Damage | Fire Rate | Mag | Reserve | Reload | Price | Spread | Pellets | Range | Penetration | Notes |
|--------|--------|-----------|-----|---------|--------|-------|--------|---------|-------|-------------|-------|
| Knife | 55 | 1.5 | - | - | - | Free | 0 | 1 | 3 | 0 | Melee range, always owned |
| Pistol (USP) | 28 | 3.5 | 12 | 36 | 1.8s | Free | 0.012 | 1 | 200 | 1 (0.5× dmg) | Always owned, semi-auto |
| Shotgun (Nova) | 18/pellet | 1.2 | 6 | 24 | 2.8s | $1800 | 0.09 | 8 | 30 | 0 | Pump-action, devastating close range |
| Rifle (AK-47) | 36 | 10 | 30 | 90 | 2.5s | $2700 | 0.006 | 1 | 200 | 2 (0.65× dmg) | Full auto, tightest spread |
| HE Grenade | 98 | 0.8 | 1 | 0 | - | $300 | 0 | 1 | 0 | 0 | Area damage, max 1 carried |

### Weapon Models (PBR, first-person)
- **Material cache**: ~20 shared PBR materials (blued steel, polymer, aluminum, wood, chrome, etc.)
- **Knife** (~15 parts): Tapered blade with cutting edge, fuller groove, crossguard, segmented handle, pommel, lanyard hole
- **Pistol** (~30+ parts): Slide with serrations, ejection port, barrel with bushing, frame, accessory rail, trigger guard/trigger, grip panels with texture lines/backstrap, beaver tail, front sight with red dot, rear sight U-shape, hammer, slide stop, mag release
- **Shotgun** (~30+ parts): Long barrel with tube magazine underneath, muzzle ring, pump forend with grip ridges, receiver with ejection port and loading port, trigger guard/trigger, pistol grip with texture, polymer stock with cheek rest and rubber buttpad, bead front sight, safety button, sling mount
- **Rifle** (~40+ parts): Barrel with chrome lining, muzzle brake with ports, gas tube/block, wood handguard with ventilation holes, receiver with dust cover ribs, tangent rear sight, front sight with protectors, ejection port, charging handle, curved AK magazine with ridges, pistol grip with texture, trigger, wooden stock with cheek rest/buttplate, sling mounts, selector lever
- **Grenade**: Olive drab body with fragmentation ridges, spoon, pin

### Shooting Mechanics
- Per-weapon spread: each pellet direction is offset by random angle within spread cone
- Multi-pellet support: shotgun fires 8 pellets per shot, damage aggregated per enemy
- Raycasting against enemy meshes
- Weapon view bob: walk bob (2.2 Hz vertical + 1.1 Hz horizontal), idle breathe (1.5 Hz), mouse yaw sway with smooth decay. Smooth blend between idle and walk intensity.
- Weapon strafe tilt: weapon model tilts slightly on Z-axis when strafing left/right (±0.03 radians max), lerped at 8*dt for smooth transition. Called via `setStrafeDir(-1|0|1)` from game loop.
- Reload weapon dip: during reload, weapon dips downward using `sin(progress * PI) * 0.15` — naturally sinks at reload midpoint and rises back. Uses existing `reloading` and `reloadTimer` state.
- Recoil kick animation on fire (larger for shotgun)
- Shell casing ejection: gold brass casing ejects right+up on fire, falls with gravity, bounces once, despawns after 2s (cached geometry/material)
- Muzzle smoke puff: small gray sphere spawns at muzzle flash position after each shot (not knife), drifts upward, scales 1→3×, fades to transparent over 0.4s. Cached SphereGeometry, per-puff material (for unique opacity). Adds visible barrel smoke to complement the flash light.
- Impact sparks on bullet hit (4 animated spark particles)
- **Headshot detection**: If hit point's local Y (relative to enemy mesh) ≥ 1.85, counts as headshot
- **Headshot damage**: 2.5× damage multiplier applied per pellet
- **Crouch accuracy bonus**: Spread reduced by 40% (multiplied by 0.6) when crouching
- **Wall penetration**: Pistol penetrates 1 wall (0.5× damage per wall), rifle penetrates 2 walls (0.65× damage per wall). Shotgun and knife do not penetrate.
- **Bullet tracers**: Yellow semi-transparent lines from camera to hit point, lasting 150ms, plus spark point light at impact. Enemy tracers are orange.

### Grenade System
- Parabolic throw trajectory with gravity (16)
- Wall bounce via raycasting with face normal reflection (0.45 dampening)
- Ground bounce (0.25 dampening), ceiling bounce
- Fuse time: 1.8 seconds
- Explosion visual FX: fireball core, white-hot inner core, blast wave, dark smoke plume, light smoke, 18 debris particles, ground scorch mark (persists 8s)
- Area damage: linear falloff from center (blast radius 16, CS-realistic)
- Self-damage: 60% multiplier
- Auto-switch back to previous weapon after throw

---

## Difficulty System

### Difficulty Levels
| Difficulty | Health | Speed | Fire Rate | Damage | Accuracy | Sight Range | Attack Range | Bot Count | XP Multiplier |
|------------|--------|-------|-----------|--------|----------|-------------|--------------|-----------|----------------|
| Easy | 20 | 4 | 1.2/s | 5 | 0.2 | 25 | 18 | 2 | 0.5× |
| Normal | 45 | 6 | 2/s | 9 | 0.35 | 35 | 22 | 3 | 1× |
| Hard | 60 | 6.8 | 2.4/s | 11 | 0.42 | 40 | 25 | 4 | 1.5× |
| Elite | 80 | 7.8 | 3/s | 14 | 0.52 | 45 | 28 | 5 | 2.5× |

### Behavior
- Selected from menu screen via 4 styled buttons (EASY / NORMAL / HARD / ELITE)
- Default: Normal
- Persisted in `localStorage('miniCS_difficulty')`
- Affects bot count per round, bot stats, and XP multiplier
- Bot spawn algorithm: attempts 30 random positions in the far half of the map (away from player spawn, using dot-product check). Falls back to predefined `botSpawns` array (cycled with modulo) if no valid random position found.

### API
- `GAME.DIFFICULTIES` — config object with all difficulty presets
- `GAME.setDifficulty(name)` — switch difficulty
- `GAME.getDifficulty()` — get current difficulty stats object

---

## Enemies (Bots)

### Stats (configured by difficulty system)
- Health, speed, fire rate, damage, accuracy, sight range, attack range all set per-difficulty
- See Difficulty System table above for values per level

### AI States
1. **PATROL**: Navigate between waypoints, brief pauses
2. **CHASE**: Spotted player, move toward them, 30% chance of sprint bursts at 1.5x speed
3. **ATTACK**: Fire at player + strafe side-to-side (don't stand still)

### Hit & Death Visuals
- **Hit flash**: All mesh children flash white for 100ms when taking damage (but surviving)
- **Death animation**: Bot tips forward (X-axis rotation) and sinks over ~320ms, mesh removed after 2 seconds

### Bot Model (PBR humanoid)
- Full body: boots, legs, belt, torso/vest, arms, hands, neck, head with eyes, helmet
- 5 varied skin/clothing/vest/helmet color combinations
- Red floating marker above head for visibility
- Holds weapon model

---

## Birds

### Overview
- 5 birds fly in the sky per map, passive (don't attack player)
- Can be shot and killed — one-hit kill with any weapon
- Drop $200 on kill, shown in kill feed
- Respawn after 15-25 seconds at a random position

### Bird Model (procedural)
- Body: dark elongated sphere, head sphere, yellow cone beak
- Two wings on pivots with flapping animation
- Tail feathers

### Flight Behavior
- Circular flight paths at y=10-20 (above buildings)
- Radius 5-17 units, varying speeds
- Gentle vertical bobbing and banking
- Wing flap speed 6-10 Hz

### Death Effect
- 6 feather particles burst from hit point
- Feathers tumble with gravity, despawn after 1.5s
- Bird becomes invisible, respawns after timer

---

## Sound System

### Architecture
- Procedural Web Audio API — no audio files
- Master chain: source -> masterGain (0.5) -> DynamicsCompressor (threshold -24, ratio 4) -> destination
- Waveshaper distortion curves (cached) for realistic gunshot clipping/saturation
- `noiseBurst()` helper: shaped noise with filter, optional distortion, delayed scheduling
- `resTone()` helper: resonant oscillator tone for barrel/chamber character

### Sound Effects
| Sound | Description |
|-------|-------------|
| `pistolShot` | 8-layer realistic 9mm: distorted crack impulse, muzzle blast body, low blast, barrel resonance tone, high-freq snap, sub-bass thump, delayed slide cycling, room reflection tail |
| `rifleShot` | 9-layer realistic 7.62mm: hard distorted crack, muzzle bark, low-mid body, gas port hiss, deep report tone, muzzle brake crack, sub-bass concussion, bolt carrier cycling, extended reverb tail |
| `shotgunShot` | 10-layer realistic 12-gauge: massive distorted blast, low-freq boom, mid blast body, high-freq pellet scatter, deep barrel resonance, sub-bass pressure wave, chamber ring, pump action rack (two-part delayed), heavy reverb tail, ultra-low rumble |
| `enemyShot` | 4-layer distant/muffled: soft crack, muffled blast, quiet report tone, distant reverb |
| `knifeSlash` | Swept noise + swoosh |
| `reload` | 4-stage mechanical sequence |
| `playerHurt` | Thud + ear ringing |
| `hitMarker` | Double ding |
| `kill` | Ascending triple tone |
| `footstep` | Filtered noise burst (defined but not currently called) |
| `grenadeThrow` | Rising swept noise + effort grunt + pin pull click |
| `grenadeBounce` | Double metallic clink |
| `grenadeExplode` | 6-layer: bass boom, mid crunch, noise burst, sub-bass pressure wave, debris rattle tail, ear ring/tinnitus |
| `headshotDink` | Metallic dink: sine 1800→1200Hz sweep (30ms) through bandpass + distortion, secondary 2400Hz ring |
| `hitmarkerTick` | Very short (15ms) high-pass filtered noise burst, quiet |
| `killStreak(tier)` | Escalating chord: base frequency 600 + tier×100, multiple harmonics |
| `roundStart` | Rising 4-note tones (G4, C5, E5, G5) |
| `roundWin` | Victory fanfare — 4 ascending notes (C5, E5, G5, C6) with harmony layer |
| `roundLose` | Descending defeat — 3 notes (A4, F#4, D4) with dissonant layer |
| `buy` | Metallic click + two ascending tones |
| `switchWeapon` | Two metallic clicks (weapon draw) |
| `empty` | Dry click for empty magazine |
| `rankUp` | 5-note ascending arpeggio (523, 659, 784, 1047, 1319 Hz) with harmony |

---

## Game State Machine

```
MENU
  ├─> BUY_PHASE (10s countdown, B opens buy menu)
  │     └─> PLAYING (90s round timer)
  │           ├─> ROUND_END (5s, all enemies killed or timer expires)
  │           │     └─> BUY_PHASE (next round)
  │           └─> MATCH_END (after 6 rounds or 4 round wins by either side)
  ├─> TOURING (free exploration, no enemies, no damage)
  │     └─> MENU (via EXIT button)
  └─> SURVIVAL_BUY (8s buy phase between waves)
        └─> SURVIVAL_WAVE (fight bots, wave counter increments)
              ├─> SURVIVAL_BUY (all bots killed, next wave)
              └─> SURVIVAL_DEAD (player dies, show results)
                    └─> MENU (via MAIN MENU) or SURVIVAL_BUY (via RETRY)

Any active state ──P──> PAUSED (freeze game, release pointer lock, show overlay)
  └──P or RESUME btn──> (return to previous state)
```

### Match Flow
- 6 rounds per match, best of 4 wins
- Maps rotate each round: `mapIndex = (roundNumber - 1) % 3`
- Scene rebuilt from scratch each round (new `THREE.Scene()`)
- Player HP reset to 100 each round (armor persists between rounds)
- Match end: VICTORY (player wins 4+), DEFEAT (bots win 4+), or DRAW (tied after 6 rounds)
- PLAY AGAIN restarts match, MAIN MENU returns to menu
- Match history saved on endMatch with result, scores, rounds, kills, deaths

---

## Economy / Buy System

### Money
- Starting money: $800
- Round win bonus: +$3000
- Round loss bonus: +$1400
- Kill bonus: +$300 per kill
- Money cap: $16,000

### Buy Menu (B key, during BUY_PHASE)
| Item | Key | Price | Notes |
|------|-----|-------|-------|
| Shotgun (Nova) | 3 | $1800 | Can only own one, 8 pellets per shot |
| Rifle (AK-47) | 4 | $2700 | Can only own one |
| HE Grenade | 5 | $300 | Max 1 carried |
| Kevlar + Helmet | 6 | $650 | Sets armor to 100 |

---

## HUD / UI

### In-Game HUD
- **Crosshair**: 4-line gap style (CSS custom properties, green lines). Gap and length dynamically reflect current weapon's spread value (formula: gap = spread*280+3, len = spread*120+10). Smooth CSS transition (0.15s). Shotgun = very wide, rifle = tight, pistol = medium.
- **Health bar**: Bottom-left, red gradient fill, numeric value
- **Armor bar**: Bottom-left below health, blue gradient fill, numeric value
- **Ammo display**: Bottom-right, weapon name + magazine/reserve counts
- **Grenade count**: Above ammo, green text, shown when owned
- **Money**: Top-right, green text
- **Round timer**: Top-center, countdown MM:SS
- **Round info**: Below timer, "Round X / 6"
- **Kill feed**: Top-right below money, fading entries with killer/victim colors
- **Damage flash**: Red vignette overlay on taking damage
- **Low health heartbeat pulse**: Red vignette that pulses with a heartbeat rhythm when health ≤25. Uses CSS `@keyframes healthPulse` (opacity 0→0.3→0, 1s cycle). At ≤15 HP, `.critical` class speeds animation to 0.7s. Hidden when health >25 or player dead.
- **Announcement**: Center screen, large text for round events
- **Scoreboard**: Tab-hold overlay with player/bot scores and map name
- **Hitmarker**: White X overlay at crosshair, yellow for headshots (see Hit Feedback System)
- **Damage numbers**: Floating numbers at hit location (see Hit Feedback System)
- **Kill streak announcement**: Large center-screen text for multi-kills
- **Minimap/Radar**: Top-left 180×180 canvas (see Minimap / Radar)
- **Crouch indicator**: Small "CROUCHING" text bottom-left when crouching
- **Wave counter**: Top-center display during survival mode showing current wave

### Screens
- **Menu screen**:
  - Dark radial gradient background with scan line overlay and vignette
  - 30 floating dust particles (CSS animated, blue-tinted, rising)
  - Horizontal light sweep animation (8s cycle)
  - Crosshair emblem icon (ring + crosshairs + center dot)
  - Title "MINI CS" — large (72px), metallic gradient text, pulsing glow
  - Subtitle "Counter-Strike" flanked by line accents
  - Difficulty selector: 4 styled buttons (EASY / NORMAL / HARD / ELITE)
  - PLAY button with hover light sweep, pulse ring animation
  - SURVIVAL MODE button
  - TOUR MAPS button — opens map selection panel
  - Rank display: current rank name + colored badge + XP progress bar
  - Controls grid (3-column layout with styled key badges)
  - Version tag bottom-right
  - Fade-in + slide-up entrance animation
- **Match end screen**: VICTORY/DEFEAT/DRAW, final score, XP breakdown, rank progress, PLAY AGAIN + MAIN MENU buttons
- **Survival map selection**: Full-screen overlay with 3 map buttons showing per-map high scores
- **Survival end screen**: Waves survived, kill count, XP breakdown, high score indicator, RETRY + MAIN MENU buttons
- **Tour map selection** (full-screen overlay, z-index 30):
  - 3 map buttons (Dust, Office, Warehouse) with name + description
  - Hover highlight effect, Cancel button
  - Clicking a map starts tour mode on that map
- **Tour mode HUD**:
  - Crosshair only (health, armor, ammo, timer, scores all hidden via CSS)
  - "EXIT TOUR" button — red, fixed top-right, exits to menu
  - Map label — centered top, shows "Tour: MapName"
  - No enemies spawn, player cannot die, all weapons available (except grenades)
  - Birds still fly and can be shot
- **Match History panel** (full-screen overlay, z-index 30):
  - Stats summary: matches played, W/L/D, win rate, headshot %
  - Scrollable match list with result color, score, K/D, difficulty, date
  - Close button; opened via "Match History" button in menu
  - Persisted in `localStorage('miniCS_history')`, max 50 entries
  - Tracks `matchKills`, `matchDeaths`, `headshots`, `difficulty`, `xpEarned` per match

---

## Hit Feedback System

### Hitmarker
- White X-shape overlay (4 rotated lines), centered on screen
- Appears for 150ms on any enemy hit, fades out
- Headshot variant: yellow color, slightly larger

### Damage Numbers
- DOM-based floating numbers at screen-projected position of hit point
- Red for body shots, yellow for headshots
- CSS animation: float upward 40px over 0.8s, fade out
- Auto-removed after animation completes

### Kill Streaks
| Kills | Announcement |
|-------|-------------|
| 2 | DOUBLE KILL |
| 3 | TRIPLE KILL |
| 4 | QUAD KILL |
| 5 | RAMPAGE |
| 8 | UNSTOPPABLE |
| 12 | GODLIKE |

- Kill streak counter resets on player death or round end
- Each tier plays escalating chord sound
- Large center-screen announcement text, fades after 2s

### Blood Particles
- Red particle burst at hit point on enemy damage (6 particles body, 10 headshot)
- Particles fly outward with random velocity (headshots: faster, upward bias)
- Gravity (12 m/s²), despawn after 0.5s
- Cached BoxGeometry + MeshBasicMaterial (color 0xcc0000)

### Screen Shake
- Triggered on taking damage and grenade explosions
- Random camera offset scaled by intensity (0.02–0.03 for damage, 0.08 for grenades), multiplicative decay (×0.9 per frame) over 150ms
- Subtle effect for impact feel

---

## Persistent Rank System

### Rank Tiers (18 ranks)
| Rank | XP Required | Color |
|------|-------------|-------|
| Silver I | 0 | #8a8a8a |
| Silver II | 100 | #9a9a9a |
| Silver III | 250 | #aaaaaa |
| Silver IV | 500 | #b0b0b0 |
| Silver Elite | 800 | #c0c0c0 |
| Silver Elite Master | 1200 | #d0d0d0 |
| Gold Nova I | 1700 | #c8a832 |
| Gold Nova II | 2300 | #d4b440 |
| Gold Nova III | 3000 | #e0c050 |
| Gold Nova Master | 4000 | #ecd060 |
| Master Guardian I | 5200 | #4fc3f7 |
| Master Guardian II | 6600 | #29b6f6 |
| Master Guardian Elite | 8200 | #039be5 |
| Distinguished MG | 10000 | #0288d1 |
| Legendary Eagle | 12500 | #ab47bc |
| Legendary Eagle Master | 15500 | #8e24aa |
| Supreme Master | 19000 | #ff7043 |
| Global Elite | 23000 | #ffd740 |

### XP Calculation (per match)
```
baseXP = (kills × 10) + (headshots × 5) + (roundsWon × 20) + (matchWin ? 50 : 0)
finalXP = baseXP × difficultyMultiplier
```
- Difficulty multipliers: Easy 0.5×, Normal 1×, Hard 1.5×, Elite 2.5×
- Survival mode: 0.7× multiplier on earned XP

### Persistence
- `localStorage('miniCS_xp')` — total accumulated XP
- Rank computed from XP thresholds on load
- Match history entries include `xpEarned` field

### UI
- Menu screen: rank name + colored badge + XP progress bar to next rank
- Match end: XP earned breakdown (kills, headshots, rounds, win bonus, difficulty multiplier)
- Rank-up: gold flash overlay + ascending arpeggio sound

---

## Minimap / Radar

### Rendering
- 180×180 `<canvas>` element, positioned top-left of HUD
- Semi-transparent dark background with circular clip-path
- Redrawn every 3rd frame (~20fps) for performance

### Elements
- **Map walls**: Wall bounding boxes projected to 2D top-down, drawn as gray filled rectangles (`fillRect`). Filtered to ground-floor walls only (y ≤ 6). Cached on map load.
- **Player**: Green triangle at center, rotated to match yaw
- **Enemies**: Red dots, visible when:
  - Enemy fired weapon in last 2 seconds (tracked via `lastFireTime`), OR
  - Enemy is not in PATROL state (chasing or attacking)

### Behavior
- Map rotates with player (player always faces "up") — standard FPS radar
- Scale: map fits within canvas with padding
- Simple canvas 2D drawing (lineTo, arc) — no Three.js overhead

---

## Survival / Horde Mode

### Overview
- Endless wave-based mode, separate from competitive match
- Player selects map before starting
- Waves of increasingly difficult bots
- Buy phase between waves
- Game ends on player death

### Wave Scaling
```
botCount = min(8, 1 + floor(wave × 0.7))
health = 20 + wave × 12
speed = min(14, 5 + wave × 0.5)
accuracy = min(0.9, 0.25 + wave × 0.04)
damage = 8 + wave × 2
fireRate = min(5, 1.5 + wave × 0.3)
```

### Economy
- Start with $800, pistol only
- Earn $300 per kill (standard kill bonus) + wave completion bonus ($200 + wave × 50, no specific cap — global $16,000 money cap applies)
- Buy phase: 8 seconds between waves, standard buy menu
- +60 HP restored between waves, capped at 100

### Persistence
- Per-map high scores stored in `localStorage('miniCS_survivalBest')` as JSON object `{ dust: N, office: N, warehouse: N }`
- "BEST: Wave X" shown on survival map selection

### XP
- Survival XP formula: `(kills × 10 + headshots × 5 + waves × 15) × 0.7`
- Does not use difficulty multiplier — always 0.7× flat
- XP breakdown shown on death screen (kills, headshots, waves, multiplier)

### UI
- "Survival Mode" button on main menu
- Map selection panel with high score display per map
- Wave counter displayed top-center during gameplay
- Death screen: waves survived, kills, XP earned, high score indicator, RETRY / MAIN MENU buttons

---

## Controls

| Input | Action |
|-------|--------|
| WASD | Move |
| Mouse | Look |
| Left Click | Shoot / Throw grenade |
| Space | Jump |
| Shift | Sprint |
| C | Toggle Crouch |
| 1 | Switch to Knife |
| 2 | Switch to Pistol |
| 3 | Switch to Shotgun (if owned) / Buy shotgun (in buy menu) |
| 4 | Switch to Rifle (if owned) / Buy rifle (in buy menu) |
| 5 | Switch to Grenade (if owned) / Buy grenade (in buy menu) |
| 6 | Buy armor (in buy menu) |
| R | Reload |
| B | Open/close Buy Menu (during buy phase) |
| G | Switch to Grenade (if owned) |
| Tab | Hold for Scoreboard |
| P | Pause / Resume game |

---

## Technical Constraints
- No external assets — all graphics procedural (Three.js geometry), all sounds procedural (Web Audio API)
- Single-page app, no build step, no bundler
- Three.js r160.1 loaded from CDN as global `THREE`
- IIFE module pattern with `window.GAME` namespace
- All PBR materials (`MeshStandardMaterial`) with roughness/metalness
- Shared material caches to avoid duplicate allocations
