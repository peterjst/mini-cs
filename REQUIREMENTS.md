# Mini CS — Requirements & Feature Spec

## Overview
A browser-based Mini Counter-Strike FPS built with Three.js r160.1 (CDN, global `THREE`). Fully procedural graphics and sound — no external assets. Runs from a single `index.html` entry point.

---

## Core Architecture
- **Module system**: IIFE pattern, all modules attach to `window.GAME`
- **Script files** (loaded in dependency order):
  - `js/maps/shared.js` — Shared materials, texture utils, build helpers, map registry (`GAME._maps`, `GAME._mapHelpers`)
  - `js/maps/dust.js` — Dust map (Desert Market)
  - `js/maps/office.js` — Office map (Modern Office Building)
  - `js/maps/warehouse.js` — Warehouse map (Multi-Floor Industrial)
  - `js/maps/bloodstrike.js` — Bloodstrike map (Rectangular Loop Arena)
  - `js/maps/italy.js` — Italy map (Mediterranean Village)
  - `js/maps/aztec.js` — Aztec map (Jungle Temple)
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

### Procedural Texture Infrastructure
- Canvas-based textures cached via `_texCache` and shared across all materials
- `_noiseBump` — fbm noise-based bump maps (legacy, used by `_floorBump` only)
- `_floorBump` — tile grid pattern (128px, 32px tiles, repeat 6×6) for visible grout lines
- `_heightToNormal(key, size, drawFn, strength)` — converts height maps to RGB tangent-space normal maps via Sobel filter, seamless-tiling wrap
- `GAME._texUtil` — exposes noise engine (`hash`, `valueNoise`, `fbmNoise`, `makeCanvas`, `heightToNormal`, `texCache`) for use by other modules (e.g. weapons.js)

### Generic Surface Textures (128px / 64px, cached)
- `_concreteNormal()` — 128px, 5-octave FBM + pitting features (strength 1.0, repeat 3×3)
- `_concreteRough()` — 128px, FBM base (200–250) + polished wear spots (~140)
- `_plasterNormal()` — 128px, 3-octave FBM + faint horizontal joint seam lines (strength 0.8, repeat 4×4)
- `_plasterRough()` — 128px, subtle noise (190–230) + rougher seam areas (230)
- `_woodNormal()` — 128px, asymmetric FBM (2× horiz, 12× vert) for directional grain (strength 1.0, repeat 2×2)
- `_woodRough()` — 128px, grain-aligned roughness variation (150–210)
- `_metalNormal()` — 64px, horizontal sine machining lines + FBM noise (strength 0.6, repeat 2×2)
- `_fabricNormal()` — 64px, perpendicular sine waves for woven pattern (strength 0.8, repeat 4×4)

### Map-Specific Floor Textures (256×256, cached)
- **Dust sand** — normalMap: 4-octave fbm + directional sine wind ripples (strength 1.2, repeat 5×5); roughnessMap: 3-octave fbm (180–230) + wind-polished spots (~140)
- **Office tile** — normalMap: 64px tile grid with 3px recessed grout + per-tile fbm variation (strength 0.8, repeat 4×4); roughnessMap: base 200, grout 240, polished traffic lanes (~150)
- **Warehouse concrete** — normalMap: 5-octave fbm porous concrete + crack polylines (strength 1.5, repeat 4×4); roughnessMap: 4-octave fbm (190–250) + oil patches (~100) + tire-track stripes (~120)

### Gun Texture Generators (64px, cached, in weapons.js)
- `_gunMetalNormal()` — directional machining marks (sine lines + 3-octave FBM) + faint pitting (strength 0.7)
- `_gunMetalRough()` — base roughness (60–100) + shinier wear-polished lines (~30)
- `_gripNormal()` — cross-hatch stipple at +/-45 degrees via two diagonal sine patterns (strength 0.9)
- `_gripRough()` — higher roughness (200–250) in stipple peaks
- `_woodGrainNormal()` — tight directional FBM (2× horiz, 14× vert) for gun stock grain (strength 0.8)

### Materials (PBR, mostly `MeshStandardMaterial`)
- `floorMat` — high roughness (0.92), no metalness, tile bump (0.04) — used for non-floor surfaces, overlays, stains
- `dustFloorMat` — roughness 0.92, sand normalMap (normalScale 0.6) + sand roughnessMap
- `officeTileMat` — roughness 0.85, tile normalMap (normalScale 0.5) + tile roughnessMap
- `warehouseFloorMat` — roughness 0.95, concrete normalMap (normalScale 0.8) + concrete roughnessMap
- `concreteMat` — very rough (0.95), concrete normalMap (normalScale 0.5) + concrete roughnessMap
- `plasterMat` — moderate roughness (0.82), plaster normalMap (normalScale 0.3) + plaster roughnessMap
- `woodMat` — roughness 0.7, wood normalMap (normalScale 0.5) + wood roughnessMap
- `metalMat` — low roughness (0.35), high metalness (0.65), metal normalMap (normalScale 0.2)
- `darkMetalMat` — roughness 0.3, metalness 0.8, metal normalMap (normalScale 0.15)
- `fabricMat` — **MeshPhysicalMaterial**, very rough (0.95), sheen 0.3, fabric normalMap (normalScale 0.3) — micro-fiber light scattering
- `glassMat` — **MeshPhysicalMaterial**, transmission 0.85, IOR 1.5 — physically-based refraction
- `crateMat` — optional emissive tint
- `emissiveMat` — configurable emissive glow
- `ceilingMat` — roughness 0.8, plaster normalMap (normalScale 0.2)

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
- Created in `js/maps/shared.js` per-scene

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
- 7 maps rotated by round: `currentMapIndex = (roundNumber - 1) % GAME.getMapCount()`
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
- Bright daytime palette, blue sky (0x87ceeb), light fog (0xc0d8e8, density 0.002)
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
- **Lighting**: 5 ground-floor hanging lights, 2 second-floor hanging lights, 1 third-floor room light (all cool white 0xf0f4ff). 10 ground-level daylight fill lights (0xe8f0ff, intensity 0.8–1.2, range 25–32), 2 stairwell lights for visibility, 3 second-floor platform fill lights. Bright clear daylight throughout.
- **Environment details**: Oil stains on floor, yellow safety signs with danger stripes, green fire exit signs (emissive), hanging chains with hook, caution tape, tool rack with wrench/hammer, ventilation ducts with joints on ceiling, scattered bolts/debris, broken pallet pieces, electrical junction box, safety cones, clipboard on crate, number stencils on containers, rope coil

### Map 4: "Bloodstrike" — Rectangular Loop Arena
- Size: 60x44, wall height 7, ceiling at y=7
- Warm tan/beige palette mimicking CS 1.6 aim_bloodstrike: sandy sky (0xc8a878), warm fog (0xb09070, density 0.006)
- **Layout**: Rectangular loop corridor around a solid central block. Outer rectangle 60x44, inner block 40x24, corridor width ~8 units. Players circulate around the loop
- **Walls**: Outer perimeter walls (tan concrete 0xb8a080) and inner block walls (darker tan 0x9a8060) with **thick horizontal trim bands** (0x7a6850, height 0.35) at y=1.8 and y=4.2, thin middle trim (0x857460) at y=3.0. **Color banding** between trims: darker bottom band (0xa08868) floor-to-1.6, lighter top band (0xc8b898) 4.4-to-ceiling. Baseboards (0x706050) on all walls
- **Brick accents**: Large reddish-brown brick panels (10×2.8 inner, 12×3.2 outer, 0x8b4a3a) with dark border frames (0x5a2a1a) on both inner and outer walls. Positioned in lower-middle band for CS 1.6 authenticity
- **Wall alcoves**: 4 shallow recesses (3 wide × 3.5 tall × 0.5 deep) on inner walls at mid-corridor positions, with darker back walls, breaking up flat wall monotony
- **Corner platforms**: 4 elevated concrete platforms (8x8, y=3) at each corner with **concrete barrier walls** (1.2 high, 0.4 thick) replacing thin railings, trim caps on barriers, support columns underneath, stairs with sandbag cover at top, and crate stacks on platforms for additional cover
- **Short cover walls**: Low tan walls (height 1.4–1.8) scattered along all four corridor segments for tactical cover
- **Crates**: Dense **stacked crate clusters** (large base + smaller crate on top) in corridors — 3 clusters per long corridor, 2 per short corridor. Mix of brown/dark/green crate materials
- **Barrels**: 10 oil barrels in **groups of 2-3** at mid-corridor positions, with 2 tipped/fallen barrel decorations (rotated cylinders). Metal and darkMetal materials
- **Decoration**: Horizontal wall pipes along outer walls, vertical corner pipes, blood splatters/stains on walls and floor, scattered rubble debris, yellow warning stripes near corners
- **Floor details**: Wider worn path markings (2.0 wide), **cross-corridor patches** (6×6) at corner intersections, concrete weathering patches, and **drain grate** decorations (dark rectangles) at corridor midpoints
- **Lighting**: 14 hanging lights (warmer amber 0xffd8a0), 8 fill point lights (warm amber 0xffccaa), 4 corner platform uplights, 12 fluorescent fixtures (emissive 1.5, reduced from 2.0 for softer industrial feel)

### Map 5: "Italy" — Mediterranean Village
- Size: 55x50, wall height 6, mixed indoor/outdoor
- Mediterranean blue sky (0x87ceeb), warm haze fog (0xd4b896, density 0.007)
- Player spawn: x=-24, z=-20 (CT west entry)
- Bot spawns: 6 points in open outdoor areas (north alley entrance, piazza, courtyard, CT area) — never inside enclosed buildings
- Waypoints: 20 points along open outdoor paths, doorway entrances, alleys, and the piazza — all in navigable outdoor space to prevent bots getting trapped inside buildings
- **Central Piazza**: Open square with collidable octagonal fountain (basin rim, central column, upper bowl, spout cap), water surface, cobblestone path markings
- **Building A (North)**: 2-story accessible building (x=-8..4, z=-25..-12). Interior stairs ground-to-upper. Terracotta roof with eave overhang. Shutters, flower boxes on south face. Balcony overlooking south with iron railing. Door lintel over south entry
- **Building B (East, T-side)**: Large 2-story apartment block (x=10..22, z=-20..5). Ground+upper floor with interior stairs. West balcony with iron railing over alley. Shutters on west face. Terracotta roof with eave
- **Building C (South Market)**: Single-story market building (x=-14..-2, z=8..22). Open arch front with stone pillars and lintel. Wooden counter inside. Dual fabric awnings (red + orange)
- **North Alley**: Narrow passage (x=4..10, z=-20..-8) with overhead arch span and hanging laundry (shirts, pants, towels on iron line)
- **West Alley**: N-S passage with east/west walls, terracotta pots with greenery, wall-mounted lanterns, more hanging laundry
- **CT Entry Archway**: Grand double-pillar entrance (x~-15, z=-8..-4) with stone lintels
- **Wine Cellar**: Underground room (y=-2.5, x=-2..10, z=8..20) via descending stairs. Wine barrels (dark wood cylinders), stacked wine crates, dim warm lighting
- **Courtyard (SW)**: Low boundary walls, planter boxes with greenery, stone bench with legs, decorative well with wooden crossbeam frame
- **CT Spawn Area**: Ruined wall segments, stacked wine crates, olive tree stumps, scattered rubble rocks
- **Bell Tower**: Decorative stone column (h=7) near piazza, terracotta cap, rusted bell
- **Market Stalls**: Two stalls east of piazza with wooden tables (4 legs each), iron awning poles, fabric canopies (red + blue), produce boxes (oranges, greens, tomatoes)
- **Environmental Details**: Wall-mounted iron lanterns with emissive glow (0xffcc88), pot shards near fountain, iron railing details, cobblestone markings
- **Lighting**: 16+ point lights — piazza center fill (0xffddaa), building interior hanging lights (0xffcc88), cellar orange glow (0xff8822, 0xff7700), alley lanterns (0xffbb66, 0xffaa44), market hanging light, courtyard fills (0xffd4a0), outdoor fill lights
- **Materials**: Sandy stone walls (0xc8a87c, 0xc4a06a), stone floor (0xa08050), terracotta (0xb85c32), warm plaster (0xd4b896), orange plaster (0xc87840), dark wood shutters/beams (0x6b3a1e), light wood tables (0x8b6020), red fabric awnings (0xc83020), water glass (0x4488cc), rusted iron (0x7a5530, 0x5a4a3a), wine crates (0x5a3010)

### Map 6: "Aztec" — Jungle Temple Ruins
- Size: 70x60, wall height 8, outdoor jungle/temple theme
- Bright tropical sky (0xa8c8e8), green-tinted fog (0x8aaa8a, density 0.005)
- Player spawn: x=-20, z=20 (CT courtyard, south-west)
- Bot spawns: 3 points in jungle clearing (north side)
- Waypoints: 14 points covering bridge, bombsites, double doors, overpass, river banks, courtyard, T spawn
- **River**: Sunken east-west channel (40 wide, 8 deep, 4 units below ground). Translucent blue-green water plane (glassMat 0x1a6a5a) at y=-2. Stone retaining walls on north/south sides. Boulders in river. Waterfall at east end with emissive blue glow blocks
- **Rope Bridge**: Wooden plank deck (3 wide, collidable) spanning river at x=15. Rope railings (tan 0xc8a860), wooden support posts at ends. Connects T side to Bombsite A
- **Double Doors Corridor**: Stone corridor (x=-13 to -7) with two large door frames (pillars + sandstone lintels). Narrow choke point. Crates inside for limited cover. Connects T spawn area to Bombsite B
- **Bombsite A (Stepped Temple)**: 3-tier stepped pyramid at x=15, z=18 (south-east). Tiers: 14x14 base, 10x10 mid, 6x6 top (each 1.5 high). Corner pillars (dark stone cylinders). Aztec carved face decoration on front. Ruin blocks for cover. Stairs on north face via buildStairs()
- **Bombsite B (Temple Ruins)**: Partially collapsed temple at x=-22, z=8 (west). Broken walls at varying heights, collapsed sections. Stone altar/platform center. Fallen pillar, scattered rubble
- **Overpass/Ramp**: Elevated stone platform (y=3, 10x4) at x=-18, z=-18. Support pillars (4 dark stone cylinders). Low wall railings. Stairs from ground via buildStairs(). Provides height advantage
- **T Spawn (Jungle Clearing)**: North side. Tree trunks (cylinders) with green canopy blobs. Bush clusters and fern patches for atmosphere
- **CT Spawn (Courtyard)**: South-west, stone paved area. Low sandstone walls, stacked crates for cover, stone bench
- **Cover Elements**: Stone blocks scattered across map, fallen column near river, jungle rocks along perimeter
- **Decorative Details**: Moss patches on walls and structures, vine strands on corridor and perimeter, scattered rubble, jungle trees (trunks + canopy) along perimeter, fern/bush clusters at ground level
- **Lighting**: 15 point lights — bright warm torches on temple walls (0xffaa55, 1.1-1.4 intensity), ruins light (0xff9944, 1.0), corridor fill (0xffbb66, 0.9), overpass (0xffcc77, 0.9), cool blue-green river/bridge lights (0x55cccc, 0.6-0.7), waterfall glow (0x44cccc, 0.9), dappled T spawn (0xffddaa, 1.0), CT courtyard (0xffddaa, 1.1), general fills (0xffe0b0, 0.6-0.8, range 25-30)
- **Materials**: Mossy stone (0x8a9a72), dark stone (0x6a7a58), sandstone (0xd0bea0, 0xb8a882), jungle green (0x3d7a2e), moss (0x5a8a4a), dark wood (0x7a5a2a), rope tan (0xd8b870), earth floor (0x7a6a3a), stone path (0x9a9a8a), water glass (0x1a6a5a). Uses jungleFloorMat() helper for earthy ground

### Map 7: "Arena" — Open-Air Combat Arena
- Size: 40x40, wall height 5, open-air (no ceiling)
- Bright daytime palette, blue sky (0x87ceeb), light fog (0xa0c8e8, density 0.005)
- **Layout**: Cross-shaped corridor system around 4 solid inner blocks (8x8 each). Central open area with elevated platform (6x6, y=1.5). Perimeter loop hallway connecting all corridors.
- **Cover**: 8 concrete pillars at corridor entrances, 4 low walls near center, crate clusters in each corridor (stacked large+small), barrel groups in corners
- **Details**: Yellow hazard stripe markings at corridor thresholds, metal grate decoration on central platform
- **Lighting**: Central overhead light (white, 2.0 intensity), 4 bright corner fill lights (0xfff8ee, 1.2), 4 corridor fill lights (white, 1.0). Materials use warm concrete (0xb0a898), lighter metals and wood for daytime visibility
- **Spawns**: Player at (-14, -14), 8 bot spawn points distributed around perimeter and center
- **Waypoints**: 17 points covering perimeter loop, corridor midpoints, and center area

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
| AWP | 115 | 0.75 | 5 | 20 | 3.5s | $4750 | 0.08 / 0.0008 scoped | 1 | 300 | 3 (0.75× dmg) | Bolt-action sniper, two-level scope, one-shot body kill |
| HE Grenade | 98 | 0.8 | 1 | 0 | - | $300 | 0 | 1 | 0 | 0 | Area damage, max 1 carried |

### Weapon Models (PBR, first-person)
- **Material cache**: ~20 shared PBR materials with procedural texture maps:
  - **blued/darkBlued** — gun metal normalMap (machining marks, normalScale 0.4) + roughnessMap (wear-polished lines)
  - **polyGrip** — grip normalMap (cross-hatch stipple, normalScale 0.5) + roughnessMap
  - **polymer** — grip normalMap at lower strength (normalScale 0.2)
  - **wood/woodDark/woodRed** — wood grain normalMap (directional FBM, normalScale 0.5)
  - **aluminum/darkAlum** — gun metal normalMap at low strength (normalScale 0.15/0.12)
  - **chrome** — **MeshPhysicalMaterial** with clearcoat(1.0) + clearcoatRoughness(0.05) + faint normalMap (0.1)
  - **rubber** — grip normalMap (normalScale 0.3)
  - **grenade** — grip normalMap for cast surface texture (normalScale 0.35)
  - **blade/bladeEdge** — gun metal normalMap (normalScale 0.15/0.1)
- **Knife** (~15 parts): Tapered blade with cutting edge, fuller groove, crossguard, segmented handle, pommel, lanyard hole
- **Pistol** (~30+ parts): Slide with serrations, ejection port, barrel with bushing, frame, accessory rail, trigger guard/trigger, grip panels with texture lines/backstrap, beaver tail, front sight with red dot, rear sight U-shape, hammer, slide stop, mag release
- **Shotgun** (~30+ parts): Long barrel with tube magazine underneath, muzzle ring, pump forend with grip ridges, receiver with ejection port and loading port, trigger guard/trigger, pistol grip with texture, polymer stock with cheek rest and rubber buttpad, bead front sight, safety button, sling mount
- **Rifle** (~40+ parts): Barrel with chrome lining, muzzle brake with ports, gas tube/block, wood handguard with ventilation holes, receiver with dust cover ribs, tangent rear sight, front sight with protectors, ejection port, charging handle, curved AK magazine with ridges, pistol grip with texture, trigger, wooden stock with cheek rest/buttplate, sling mounts, selector lever
- **AWP** (~40+ parts): Long fluted barrel with muzzle brake, receiver with picatinny rail and bolt handle, scope (mount rings, tube, front lens with blue tint, rear eyepiece, adjustment turrets), 5-round box magazine, trigger guard/trigger, polymer pistol grip, dark wood stock with cheek riser and rubber buttplate, folded bipod, sling mounts
- **Grenade**: Olive drab body with fragmentation ridges, spoon, pin

### Shooting Mechanics
- Per-weapon spread: each pellet direction is offset by random angle within spread cone
- Multi-pellet support: shotgun fires 8 pellets per shot, damage aggregated per enemy
- Raycasting against enemy meshes
- Weapon view bob: walk bob (2.2 Hz vertical + 1.1 Hz horizontal), idle breathe (1.5 Hz), mouse yaw sway with smooth decay. Smooth blend between idle and walk intensity.
- Weapon strafe tilt: weapon model tilts slightly on Z-axis when strafing left/right (±0.03 radians max), lerped at 8*dt for smooth transition. Called via `setStrafeDir(-1|0|1)` from game loop.
- Reload weapon dip: during reload, weapon dips downward using `sin(progress * PI) * 0.15` — naturally sinks at reload midpoint and rises back. Uses existing `reloading` and `reloadTimer` state.
- Recoil kick animation on fire (larger for shotgun)
- Shell casing ejection: gold brass casing ejects right+up on fire, falls with gravity, bounces once, despawns after 1s. Uses object pool (10 pre-allocated meshes, shared geometry/material).
- Muzzle smoke puff: small gray sphere spawns at muzzle flash position after each shot (not knife), drifts upward, scales 1→3×, fades to transparent over 0.4s. Uses object pool (2 pre-allocated meshes, shared material).
- Muzzle flash: single reusable PointLight repositioned each shot (50ms lifetime).
- Impact sparks on bullet hit (4 animated spark particles per impact, 5 pre-allocated sets of 4, shared geometry/material)
- **Headshot detection**: If hit point's local Y (relative to enemy mesh) ≥ 1.85, counts as headshot
- **Headshot damage**: 2.5× damage multiplier applied per pellet
- **Crouch accuracy bonus**: Spread reduced by 40% (multiplied by 0.6) when crouching
- **Wall penetration**: Pistol penetrates 1 wall (0.5× damage per wall), rifle penetrates 2 walls (0.65× damage per wall), AWP penetrates 3 walls (0.75× damage per wall). Shotgun and knife do not penetrate.
- **Bullet tracers**: Yellow semi-transparent lines from camera to hit point, lasting 150ms. Uses object pool (5 pre-allocated Line objects with reusable BufferGeometry). No per-impact PointLight (sparks provide sufficient feedback). Enemy tracers are orange.
- **Weapon effect performance**: All visual effects (muzzle flash, smoke puffs, shell casings, tracers, impact sparks) use a centralized particle update loop ticked in `WeaponSystem.update(dt)` — no `setInterval` timers. All effect objects are pre-allocated in pools and reused via visibility toggling.

### Scope System (AWP)
- Toggle scope via **F key** or **right-click (mouse button 2)**
- Three-state cycle: unscoped → zoom 1 (30 FOV) → zoom 2 (15 FOV) → unscoped
- Guards: must have sniper equipped, not reloading, not bolt-cycling
- When scoped: weapon model hidden, scope overlay shown (circular vignette + crosshair lines + center dot), normal crosshair hidden
- Spread uses `spreadScoped` (0.0008) when fired while scoped — near-perfect accuracy
- Unscoped spread is 0.08 — worst of any weapon, encouraging scope use
- FOV transition: smooth lerp at 8×dt for snappy scope-in/out
- Unscope triggers: fire shot (auto-unscope), switch weapon, reload, death, round reset

### Bolt-Action Mechanics (AWP)
- After firing, player is locked out of firing for `boltCycleTime` (1.0s)
- Firing auto-unscopes before bolt cycle begins
- Bolt cycle sound plays 200ms after shot
- Bolt state (`_boltCycling`, `_boltTimer`) ticked down each frame
- HUD shows "(Cycling...)" during bolt cycle
- Reload cancels bolt cycle

### Movement Speed Modifiers (AWP)
- `movementMult: 0.7` — 30% slower when carrying AWP unscoped
- `scopedMoveMult: 0.4` — 60% slower when scoped
- Applied via `GAME._weaponMoveMult` in player.js speed calculation

### Grenade System
- Parabolic throw trajectory with gravity (16)
- Wall bounce via raycasting with face normal reflection (0.45 dampening)
- Ground bounce (0.25 dampening), ceiling bounce
- Fuse time: 1.8 seconds
- Explosion visual FX: fireball core, white-hot inner core, blast wave, dark smoke plume, light smoke, 18 debris particles (cached shared geometries), ground scorch mark (persists 8s)
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
- Selected per-mode from expanded mode card via 4 styled buttons (EASY / NORMAL / HARD / ELITE)
- Default: Normal
- Persisted in `localStorage('miniCS_difficulty')`
- Affects bot count per round, bot stats, and XP multiplier
- Bot spawn algorithm: picks a random waypoint in the far half of the map (away from player spawn, using dot-product check), then offsets 1–4 units in a random direction. Each candidate position is validated with 8-directional raycasts (`_isSpawnClear`) to ensure it's not inside walls. Tries 20 attempts. Falls back to predefined `botSpawns` array (cycled with modulo) if no valid position found. This waypoint-based approach guarantees bots spawn in navigable corridor space rather than inside enclosed geometry.

### API
- `GAME.DIFFICULTIES` — config object with all difficulty presets
- `GAME.setDifficulty(name)` — switch difficulty
- `GAME.getDifficulty()` — get current difficulty stats object

---

## Enemies (Bots)

### Stats (configured by difficulty system)
- Health, speed, fire rate, damage, accuracy, sight range, attack range all set per-difficulty
- See Difficulty System table above for values per level

### AI States (6-state FSM)
1. **PATROL**: Navigate between waypoints with line-of-sight validation (only picks waypoints reachable without crossing walls), personality-scaled pauses. Stuck detection teleports bots to a reachable waypoint if they haven't moved >1 unit in 4 seconds
2. **CHASE**: Spotted player, move toward them, 30% chance of sprint bursts at 1.5x speed
3. **ATTACK**: Burst-fire at player + strafe/jiggle-peek side-to-side
4. **INVESTIGATE**: Move to last-known player position when LOS lost, look around 3–4s before resuming patrol. Also triggered by sound awareness
5. **RETREAT**: When HP drops below personality threshold (15–50% of engagement HP), flee to distant waypoint (with line-of-sight validation) at 1.3x speed
6. **TAKE_COVER**: Seek nearby wall cover via 8-direction raycast, hide behind it, peek out to fire bursts, duck back. Used during reload or when hurt

### Aim Humanization
- **Reaction delay**: 0.15–0.8s (scaled by difficulty + personality) before firing after first spotting the player
- **Smooth aim tracking**: Lerp-based aim toward player (2.0–10.0 lerp/sec by difficulty), not instant snap
- **Aim error**: Random offset refreshed every 0.3–1.2s, creating micro-corrections. Magnitude 0.3–2.5 by difficulty
- **Distance falloff**: Aim error increases with range (factor: 1.0 + max(0, dist-10) × 0.03)
- **Emergent accuracy**: Hits determined by whether `_aimCurrent` is within 0.6 unit player hitbox radius — no flat random roll
- **Spray penalty**: Each shot in a burst adds 15% more error
- **Hit flinch**: Taking damage offsets aim by random 4 units and interrupts current burst

### Burst Firing
- Fire in 2–5 shot bursts (personality-scaled) with 0.3–0.8s pauses between bursts
- Spray penalty: accuracy degrades within a burst (each shot adds 15% more error)
- Between bursts, a 0.3–0.5s cooldown resets spray

### Bot Weapon System
- Bots assigned weapons from `WEAPON_DEFS` (pistol/rifle/shotgun/awp) based on round number
  - Rounds 1–2: pistol only
  - Rounds 3–4: 50% rifle, 50% pistol
  - Round 5+: 45% rifle, 30% shotgun, 13% AWP, 12% pistol
- Magazine ammo — bots reload when empty (uses weapon's `reloadTime`)
- Bots seek cover while reloading (TAKE_COVER state), creating vulnerability windows
- `enemyReload()` procedural sound plays on reload start

### Personality System
Three personality types assigned per bot (cycled by ID):
- **Aggressive**: +15% speed, 1.2x aim speed, 0.7x reaction time, retreats at 15% HP, short patrol pauses, 3–5 shot bursts. Marker: orange-red (0xff4500)
- **Balanced**: Default multipliers, retreats at 30% HP, 2–4 shot bursts. Marker: red (0xff0000)
- **Cautious**: -15% speed, 0.9x aim speed, 1.3x reaction time, retreats at 50% HP, longer patrol pauses, 2–3 shot bursts, prefers jiggle-peeking. Marker: dark red (0xcc0000)

### Sound Awareness
- `EnemyManager.reportSound(position, type, radius)` — called from main.js when player fires (radius 40)
- Patrolling/investigating bots within radius enter INVESTIGATE toward sound source
- Creates tactical tension: shooting reveals your position

### Bot Callouts
- Once per second, bots that see the player alert nearby bots (within 20 units) in PATROL state
- Alerted bots switch to INVESTIGATE toward the spotted position

### Movement
- **Acceleration**: Bots lerp toward target speed (factor 5×dt) instead of instant velocity
- **Smooth rotation**: Rotation lerps toward target (factor 8×dt for movement, 10×dt for facing player)
- **Jiggle peeking**: Cautious bots and 30% of others use quick 0.15–0.35s lateral micro-movements instead of wide strafes
- **Wall collision**: 8-direction pushback raycasting (ENEMY_RADIUS=0.6) runs after every movement and strafe, preventing bots from clipping through walls. Slide movement is also collision-checked before applying.

### Cover System
- `_findNearestCover(playerPos)`: 8 directional raycasts (12 unit range) to find nearby walls
- Scoring: LOS-blocking +100, closer cover preferred, cover away from player +20
- Peek behavior: move to cover, hide 1.5–2s, step out to fire a burst, duck back after 0.8–1.2s
- Throttled to one cover search per 3s per bot

### Tracer Fix
- Tracers fire toward `_aimCurrent` (where bot is actually aiming) with small random spread
- Misses visually track near the player and correct over time, showing realistic near-miss behavior

### Hit & Death Visuals
- **Hit flash**: `mesh.traverse()` flashes all nested meshes (including arm sub-groups) white for 100ms when taking damage
- **Hit flinch**: Aim disrupted by random offset, current burst interrupted
- **Death animation**: Bot tips forward (X-axis rotation) and sinks over ~320ms, mesh removed after 2 seconds
- **Hit detection**: Parent-chain walk (`while (p = p.parent)`) in weapons.js to detect hits on deeply nested meshes inside arm/hand sub-groups

### Bot Model (PBR humanoid — terrorist appearance)
Uses `LatheGeometry` anatomical profiles for organic body shapes, with shared geometry/material caches for performance. Enemies are styled as terrorists (dark civilian clothes, balaclava head gear, no military helmet or shoulder pads).

**Geometry & Material Caching**:
- `_geoCache`: All geometry (LatheGeometry, SphereGeometry, BoxGeometry, etc.) built once on first enemy spawn, shared across all enemies
- `_matPalettes`: 5 skin/cloth/vest/beanie color variants; cloth = dark civilian (near-black, dark brown, dark grey); beanie = near-black
- `_sharedMats`: Boot, sole, gun, stock, belt, rim, eye, maskMat (face covering) materials shared across all enemies
- Reduces ~80 per-enemy materials to ~30 shared materials total

**Body Parts**:
- **Head**: `SphereGeometry(0.28, 14, 10)` — high-segment smooth sphere, skin colored
- **Face**: Brow ridge (box), cone nose (angled forward-down), jaw (scaled sphere 1/0.7/0.9), flattened sphere ears (scale 0.4/1/0.7), sphere eyeballs (r=0.04, white) + inset sphere pupils (r=0.025, dark) — ~8 face meshes
- **Balaclava**: Near-black hemisphere dome `SphereGeometry(0.31, 10, 7, ...)` over top of head (knit cap), + dark `BoxGeometry(0.30, 0.14, 0.16)` face mask covering mouth/nose — leaves eyes exposed for balaclava look
- **Trunk**: Single continuous `LatheGeometry` from pelvis to neck base — pelvis (r=0.25) → hips (r=0.28) → waist (r=0.22) → ribs (r=0.27) → chest (r=0.30) → shoulders (r=0.22) → neck (r=0.11), 12 segments
- **Vest**: `LatheGeometry` shell overlaying chest portion of trunk (no chest plate, no shoulder pads)
- **Arms**: `LatheGeometry` bicep + forearm profiles in pivoted groups (`_rightArmGroup`, `_leftArmGroup`). Idle: right -0.5 rad, left -0.75 rad X rotation. Aiming: arms raise smoothly toward -1.25 rad / -1.20 rad
- **Hands**: Palm (box 0.08×0.04×0.10) + fingers (box, slightly curled) + thumb (cylinder) — 3 meshes per hand
- **Legs**: `LatheGeometry` thigh + calf profiles. Knee spheres at joints. Spread 0.15 apart
- **Boots**: Angular `BoxGeometry(0.22, 0.22, 0.35)` + thin sole + half-cylinder toe cap at front
- **Weapon** (`_weaponGroup`): Cylinder barrel, box receiver, box magazine, box stock. Idle position y=1.25 (hip level); raised to y≈1.67 (eye level) when in ATTACK or TAKE_COVER+peeking state via smooth `_aimBlend` lerp (rate 8×dt)
- **Marker**: Personality-tinted color (orange-red / red / dark-red)
- ~40 meshes per bot (no shoulder pads, no helmet rim, no chest plate vs previous model)
- 5 varied skin/dark-clothing/vest/beanie color combinations

**Gun Raise Animation**:
- `_aimBlend` (0=idle, 1=aiming) lerps at 8×dt toward target
- Active when `state === ATTACK` or `state === TAKE_COVER && _isPeeking`
- Weapon Y: `1.25 + aimBlend × 0.42` (raises ~0.42 units to eye level)
- Weapon Z: `−0.45 − aimBlend × 0.05` (pulls slightly closer)
- Right arm X rotation: `−0.5 − aimBlend × 0.75`
- Left arm X rotation: `−0.75 − aimBlend × 0.45`

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
| `awpShot` | 10-layer realistic .338 Lapua: extreme supersonic crack (80× distortion), massive muzzle blast, low-freq boom, muzzle brake side-blast, deep report tone, sub-bass pressure wave (35→12Hz), high-freq scatter, extended reverb tail, distance echo, ultra-low rumble |
| `boltCycle` | 4-part metallic sequence over ~420ms: bolt lift clunk, pull-back scrape noise, push-forward noise, lock-down clunk |
| `scopeZoom` | Soft metallic click (3kHz) + subtle lens tone (1200→800Hz, 50ms) |
| `enemyShot` | 4-layer distant/muffled: soft crack, muffled blast, quiet report tone, distant reverb |
| `enemyReload` | Distant mag change: muffled metallic click, high-pass noise slide, mag insertion click, bolt rack |
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
  ├─> BUY_PHASE (10s countdown, B opens buy menu, F1 to skip)
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
  └─> DEATHMATCH_ACTIVE (fight bots, buy anytime)
        ├─> DEATHMATCH_ACTIVE (player dies → 3s respawn → continue)
        └─> DEATHMATCH_END (30 kills or timer up)
              └─> MENU (via MAIN MENU) or DEATHMATCH_ACTIVE (via PLAY AGAIN)

Any active state ──ESC/P──> PAUSED (freeze game, release pointer lock, show overlay)
  ├──ESC/P or RESUME btn──> (return to previous state)
  └──MAIN MENU btn──> MENU
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

## Deathmatch Mode

### Overview
- Free-for-all mode: player vs continuously respawning bots
- Win condition: first to 30 kills OR most kills when 5-minute timer expires
- No rounds — continuous gameplay with buy menu available anytime
- Menu entry: Deathmatch mode card in menu grid → expands with difficulty + map selection → START

### Game States
- **DEATHMATCH_ACTIVE**: Main gameplay. Bots respawn 3s after death. Buy menu (B key) works anytime. Timer counts down from 5:00.
- **DEATHMATCH_END**: Final scoreboard with kills, deaths, K/D, headshots, XP earned. PLAY AGAIN / MAIN MENU buttons.

### State Transitions
```
MENU → DEATHMATCH_ACTIVE (via Deathmatch mode card + map select + START)
DEATHMATCH_ACTIVE → DEATHMATCH_END (30 kills reached OR timer expires)
DEATHMATCH_END → MENU or DEATHMATCH_ACTIVE (restart)
```

### Player Respawn
- On death: 3s death camera, then auto-respawn
- Respawn point: furthest spawn from nearest enemy
- HP reset to 100, weapons and money persist
- 1.5s spawn protection (invulnerability with blue pulse visual)
- Kill streak resets on death

### Bot Respawn
- Bots respawn 3s after death at waypoint far from player
- Constant bot count maintained (difficulty-based: Easy=2, Normal=3, Hard=4, Elite=5)
- Bot weapon tier based on elapsed time: 0-60s = pistol, 60-120s = mixed, 120s+ = full distribution

### Economy
- Starting money: $800
- Kill reward: $300 ($450 with Scavenger perk)
- Buy menu (B key): available during DEATHMATCH_ACTIVE (not restricted to buy phase)
- Same items as competitive mode
- Money persists across deaths

### Scoring & HUD
- Kill counter: "KILLS: X / 30 | M:SS" displayed top-center
- Deaths tracked, shown on end screen
- Timer counts down from 5:00
- Respawn timer: large centered "RESPAWN IN X" during death

### End Screen
- Kills, deaths, K/D ratio, headshots
- XP calculation: (kills×10 + headshots×5 + K/D bonus) × diffMult × 0.7
- Best scores saved per map in localStorage

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
| AWP | 5 | $4750 | Can only own one, bolt-action sniper with scope |
| HE Grenade | 6 | $300 | Max 1 carried |
| Kevlar + Helmet | 7 | $650 | Sets armor to 100 |

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
- **Scope overlay**: Full-screen overlay when AWP is scoped — circular vignette (radial-gradient: transparent center→black at 34%), thin black crosshair lines (horizontal + vertical), 4px center dot. Crosshair hidden when scoped.

### Screens
- **Menu screen**:
  - Dark radial gradient background with scan line overlay and vignette
  - 30 floating dust particles (CSS animated, blue-tinted, rising)
  - Horizontal light sweep animation (8s cycle)
  - Crosshair emblem icon (ring + crosshairs + center dot)
  - Title "MINI CS" — large (72px), metallic gradient text, pulsing glow
  - Subtitle "Counter-Strike" flanked by line accents
  - Compact rank display below subtitle
  - 2x2 mode card grid: Competitive (blue accent/primary), Survival, Gun Game, Deathmatch
    - Each card shows mode name + 1-line description
    - Clicking a card expands it inline (other cards fade out) showing:
      - Difficulty selector (EASY / NORMAL / HARD / ELITE)
      - Map selector (buttons for all maps, populated dynamically)
      - START button
    - "back to modes" link collapses back to grid
  - Footer links: Missions, History, Tour Maps, Controls — each opens a separate overlay
  - Version tag bottom-right
  - Fade-in + slide-up entrance animation
- **Controls overlay**: Full-screen overlay (z-index 30) with 3-column keybindings grid, Close button, ESC to close
- **Missions overlay**: Full-screen overlay (z-index 30) with daily missions (3) + weekly mission cards, Close button, ESC to close
- **Match end screen**: VICTORY/DEFEAT/DRAW, final score, XP breakdown, rank progress, PLAY AGAIN + MAIN MENU buttons
- **Survival end screen**: Waves survived, kill count, XP breakdown, high score indicator, RETRY + MAIN MENU buttons
- **Tour map selection** (full-screen overlay, z-index 30):
  - 7 map buttons (Dust, Office, Warehouse, Bloodstrike, Italy, Aztec, Arena) with name + description
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
- Gravity (12 m/s²), **physics-based collision**: particles raycast along velocity against map walls/objects
- On hitting a wall, object, or ground (y≤0.01), particles **stick** in place and spawn a blood decal on the surface
- Blood decals: PlaneGeometry (0.15×0.15), oriented to surface normal via short-range 6-direction raycast, random size (0.8–1.4×), random rotation, dark red color variations (0x880000–0xaa0000)
- Decals persist for 8s then fade out over ~2s; max 80 decals (oldest removed when exceeded)
- Stuck particles removed after 0.15s; free-flying particles timeout at 1.5s
- Cached BoxGeometry + MeshBasicMaterial (color 0xcc0000); shared PlaneGeometry for decals
- All blood particles and decals cleaned up on scene reset (round/mode transitions)

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

## Mission / Challenge System

### Overview
- 3 daily missions + 1 weekly mission, shown on main menu
- Missions refresh automatically: dailies every 24h, weekly every 7 days
- Completing a mission awards bonus XP and shows "MISSION COMPLETE" announcement
- Progress persists in `localStorage('miniCS_missions')`

### Mission Pool (14 missions)

**Daily pool (randomly pick 3)**:
| ID | Description | Target | Tracker | XP Reward |
|----|-------------|--------|---------|-----------|
| headshots_5 | Get 5 headshots | 5 | headshots | 75 |
| kills_10 | Get 10 kills | 10 | kills | 80 |
| triple_kill | Get a Triple Kill | 1 | triple_kill | 100 |
| pistol_round | Win a round using only pistol | 1 | pistol_win | 120 |
| knife_kill | Get a knife kill | 1 | knife_kills | 150 |
| crouch_kills_3 | Kill 3 enemies while crouching | 3 | crouch_kills | 90 |
| no_damage_round | Win a round without taking damage | 1 | no_damage_win | 150 |
| survival_wave_5 | Reach wave 5 in Survival | 5 | survival_wave | 100 |
| survival_dust | Reach wave 5 on Dust (Survival) | 5 | survival_dust | 120 |
| earn_5000 | Earn $5000 in a single match | 5000 | money_earned | 100 |
| rampage | Get a Rampage (5 kill streak) | 1 | rampage | 150 |

**Weekly pool (randomly pick 1)**:
| ID | Description | Target | XP Reward |
|----|-------------|--------|-----------|
| weekly_wins_3 | Win 3 competitive matches | 3 | 300 |
| weekly_headshots_25 | Get 25 headshots (any mode) | 25 | 350 |
| weekly_survival_wave_10 | Reach wave 10 in Survival | 10 | 500 |

### Tracking Hooks
- `onEnemyKilled()`: kills, headshots, weekly_headshots, crouch_kills, knife_kills
- `checkKillStreak()`: triple_kill (streak=3), rampage (streak=5)
- `endRound()`: pistol_win (no shotgun/rifle owned), no_damage_win (health=100)
- `endMatch()`: weekly_wins, money_earned
- `endSurvivalWave()`: survival_wave, weekly_survival, map-specific trackers

### UI
- Missions overlay (opened from menu footer link): daily list (3 cards) + weekly card
- Each card shows: description, progress (e.g. "3/5"), reward (+XP) or checkmark if completed
- Completed missions: strikethrough, green border, 50% opacity
- Mid-game announcement on completion via `showAnnouncement()`

---

## Round Perk System

### Overview
- After winning a competitive round, player picks 1 of 3 random perks
- Perks stack across rounds within a match, reset on new match
- Losing rounds gives no perk selection
- Already-picked perks are excluded from future offerings

### Perk Pool (11 perks)
| Perk | ID | Effect | Integration |
|------|----|--------|-------------|
| Stopping Power | stopping_power | +25% weapon damage | weapons.js damage calc |
| Quick Hands | quick_hands | 30% faster reload | weapons.js reload timer ×1.3 |
| Fleet Foot | fleet_foot | +20% move speed | player.js MOVE_SPEED ×1.2 |
| Thick Skin | thick_skin | +25 HP at round start | main.js startRound |
| Scavenger | scavenger | +$150 per kill ($450 total) | main.js onEnemyKilled |
| Marksman | marksman | Headshot multiplier 3× (vs 2.5×) | weapons.js HS calc |
| Steady Aim | steady_aim | 30% tighter spread | weapons.js spread ×0.7 |
| Iron Lungs | iron_lungs | Crouch accuracy 60% (vs 40%) | weapons.js crouch spread ×0.4 |
| Blast Radius | blast_radius | Grenade radius +30% | weapons.js grenade explosion |
| Ghost | ghost | Enemy reaction +30% slower | enemies.js reaction delay ×1.3 |
| Juggernaut | juggernaut | Take 15% less damage | player.js takeDamage ×0.85 |

### Flow
1. Player wins round → `endRound()` sets `lastRoundWon = true`
2. ROUND_END timer expires → `offerPerkChoice()` shows perk screen instead of `startRound()` (guarded by `perkScreenOpen` flag to prevent repeated calls)
3. Player clicks a perk card → `selectPerk()` adds perk, clears `perkScreenOpen`, hides screen, calls `startRound()`
4. `startMatch()` calls `clearPerks()` to reset for new match (also resets `perkScreenOpen`)

### UI
- **Perk selection screen**: Full-screen overlay (z-index 25), dark background, 3 perk cards
- **Perk cards**: 220px wide, min-height 180px, flexbox column layout, blue border, hover lift animation (translateY -4px + glow)
- **Each card**: emoji icon (48px), perk name (blue), description (muted)
- **Active perks HUD**: Top-left (below minimap), small pills with icon + name, stacked vertically

### Cross-Module Access
- `GAME.hasPerk(id)` exposed from main.js for weapons.js, player.js, enemies.js to check

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
- Enemies spawn far from player: waypoints sorted by distance from player, top 50% (farthest) used as spawn candidates, with a minimum 15-unit distance enforced

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
- Per-map high scores stored in `localStorage('miniCS_survivalBest')` as JSON object `{ dust: N, office: N, warehouse: N, bloodstrike: N }`
- "BEST: Wave X" shown on survival map selection

### XP
- Survival XP formula: `(kills × 10 + headshots × 5 + waves × 15) × 0.7`
- Does not use difficulty multiplier — always 0.7× flat
- XP breakdown shown on death screen (kills, headshots, waves, multiplier)

### UI
- Survival mode card in 2x2 mode grid on main menu (expands to show difficulty + map selection)
- Wave counter displayed top-center during gameplay
- Death screen: waves survived, kills, XP earned, high score indicator, RETRY / MAIN MENU buttons

---

## Gun Game (Arms Race) Mode

### Overview
- Player progresses through 6 weapon levels by getting kills
- No economy, no buy menu — weapon determined by current level
- Continuous gameplay: player respawns instantly on death, bots respawn after ~3s delay
- Dying does NOT lose progress (current weapon level preserved)
- Game ends when player gets a kill with every weapon (6 levels, ending with knife)
- Available on all maps via Gun Game mode card in menu grid

### Weapon Progression (6 Levels)
| Level | Weapon | Notes |
|-------|--------|-------|
| 1 | Knife | Hardest first — forces aggressive play |
| 2 | Pistol (USP) | Basic ranged weapon |
| 3 | Shotgun (Nova) | Close-range power |
| 4 | Rifle (AK-47) | Versatile mid-range |
| 5 | AWP | Long-range precision |
| 6 | Knife (Final) | Classic Arms Race finale — knife kill to win |

### Game States
- `GUNGAME_ACTIVE` — main gameplay (continuous, no rounds)
- `GUNGAME_END` — victory screen with stats

### Player Respawn
- Instant respawn at map's player spawn point on death
- Current weapon level preserved
- Health reset to 100, no armor
- Kill streak resets on death

### Bot Respawn
- 4 bots maintained at all times
- On bot death: removed from enemies array, queued for respawn after 3s delay
- Respawn at farthest waypoint from player with random offset
- New `Enemy` instance created on respawn
- Bots use difficulty setting (easy/normal/hard/elite) — no wave scaling

### Weapon Forcing (`weapons.forceWeapon(weaponId)`)
- Clears all owned weapons
- Sets only the target weapon as owned with full ammo
- Unscopes, cancels reload/bolt cycle
- Rebuilds weapon model

### HUD Changes During Gun Game
- Money display hidden (`dom.moneyDisplay.style.display = 'none'`)
- Level indicator shown: "LEVEL 3/6 — SHOTGUN" (in `#gungame-level` element)
- Round timer shows elapsed time (counting up) in orange
- Round info shows "GUN GAME"
- Weapon switching keys (1-6) blocked — weapon forced by level
- Buy menu disabled

### Announcements
- Level up: `showAnnouncement('LEVEL N', weaponName)` + switch weapon sound
- Final level: `showAnnouncement('FINAL WEAPON', 'Get a knife kill to win!')`
- Victory: `showAnnouncement('GUN GAME COMPLETE', timeString)`

### XP Award
- Formula: `(kills × 10 + headshots × 5 + max(0, 6 - deaths) × 10 + timeBonus) × diffMult × 0.8`
- Time bonus: +50 XP if completed under 3 minutes
- Difficulty multiplier: easy 0.5, normal 1.0, hard 1.5, elite 2.5
- Gun Game multiplier: 0.8× (between survival 0.7× and match 1.0×)

### Persistence
- Best time per map stored in `localStorage('miniCS_gungameBest')` as JSON: `{ dust: seconds, office: seconds, ... }`
- Shown on Gun Game map selection panel as formatted times

### Missions
- `gungame_complete`: Complete a Gun Game (target: 1, reward: 100 XP)
- `gungame_fast`: Complete Gun Game under 3 minutes (target: 1, reward: 150 XP)

### UI
- Gun Game mode card in menu grid (expands to show difficulty + map selection)
- End screen (`#gungame-end`): completion time, kills/deaths/headshots, XP breakdown, RETRY/MAIN MENU buttons
- Level indicator (`#gungame-level`): shows current weapon and level during gameplay

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
| F1 | Skip buy phase (competitive mode only) |
| G | Switch to Grenade (if owned) |
| Tab | Hold for Scoreboard |
| ESC | Pause / Resume game (closes overlays in menu) |
| P | Pause / Resume game (alias) |

---

## Technical Constraints
- No external assets — all graphics procedural (Three.js geometry), all sounds procedural (Web Audio API)
- Single-page app, no build step, no bundler
- Three.js r160.1 loaded from CDN as global `THREE`
- IIFE module pattern with `window.GAME` namespace
- All PBR materials (`MeshStandardMaterial`) with roughness/metalness
- Shared material caches to avoid duplicate allocations
