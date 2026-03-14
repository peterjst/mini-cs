# Environment Visual Overhaul — Maximum Fidelity Procedural Props & Surfaces

## Overview

Replace all blocky, Minecraft-like environmental geometry across all 7 maps with high-fidelity procedural props and detailed surface treatments. The game's environment objects (trees, rocks, barrels, furniture, etc.) currently use raw `BoxGeometry` and `CylinderGeometry`, resulting in cube-shaped tree foliage, featureless cylinder barrels, and flat box rubble. This overhaul introduces a shared prop library with biome-parameterized generators that produce detailed, organic-looking geometry using advanced Three.js primitives — `IcosahedronGeometry`, `LatheGeometry`, `ConeGeometry`, `TubeGeometry`, `TorusGeometry`, and vertex displacement techniques.

**Scope:**
- All props and environmental objects across all 7 maps (Aztec, Dust, Italy, Office, Warehouse, Bloodstrike, Arena)
- Structural surfaces (walls, floors, ceilings) — selective geometric detail
- Collision volumes updated where new geometry creates meaningful tactical changes
- Visuals-first approach — no performance budget constraint

## New Module: `js/maps/props.js`

A prop library module following the existing IIFE pattern, attaching to `window.GAME._props`. Exports generator functions that return Three.js `Group` objects containing detailed geometry.

### Generator API Pattern

```js
// Non-collidable prop (decoration only):
GAME._props.Flower(scene, x, y, z, { seed: 1234 })

// Collidable prop — pass walls array (matches B() convention):
GAME._props.Tree(scene, walls, x, y, z, {
  style: 'jungle' | 'palm' | 'cypress' | 'oak' | 'pine',
  scale: 1.0,
  seed: 1234
})
```

Generators that produce collidable props take `walls` as the second parameter, matching the existing `B(scene, walls, ...)` convention. The generator pushes simplified collision meshes (box or cylinder approximations of the prop) onto the `walls` array. Decoration-only generators omit the `walls` parameter, matching the `D()` convention.

Each generator:
1. Builds a `THREE.Group` with multiple meshes (trunk, branches, foliage clusters, etc.)
2. Uses a seeded PRNG so the same seed always produces the same result — maps stay deterministic
3. For collidable props, pushes simplified collision meshes onto the `walls` array passed by the map's `build()` function
4. Applies shared PBR materials from a prop-specific material cache
5. Sets shadow cast/receive on all meshes

### Foundation Utilities

**Seeded PRNG:** A simple seeded random function. Each prop call passes its position-derived or explicit seed so maps look identical every load while no two instances look exactly alike.

**Vertex Displacement:** A shared `displaceVertices(geometry, amount, seed, direction)` function that iterates `geometry.attributes.position` and offsets each vertex by a seeded noise value. The `direction` parameter controls displacement mode:
- `'normal'` (default) — displace along vertex normals. Used for organic shapes (rocks, foliage, tree canopies) where vertices should push outward/inward irregularly.
- `'y'` — displace along the Y axis only. Used for floor warping, terrain undulation.
- `'random'` — displace in a random direction per vertex. Used for rubble, debris, chaotic surfaces.

Core technique behind organic-looking rocks, foliage, terrain, and worn surfaces.

**Cleanup:** When maps are rebuilt during map rotation, the existing map teardown clears the scene. Prop geometries and materials are managed through the shared material cache (materials persist across rebuilds to avoid re-creation; geometries are disposed with the scene). Generators should not create unique materials per instance — always use the cache.

## Prop Categories & Generators

### Vegetation

**`Tree({style})` — 5 biome variants:**

| Style | Trunk | Canopy | Extra Detail |
|-------|-------|--------|-------------|
| **jungle** | Tapered cylinder with 2-3 subsidiary branch cylinders splitting off at angles. Buttress roots at base (flared cone segments). | 4-6 overlapping `IcosahedronGeometry` spheres with vertex displacement at varying heights forming a dense layered canopy. | Hanging vines (thin cylinders draped from branches), epiphyte clusters (small sphere clumps on trunk). |
| **palm** | Tall curved trunk using `LatheGeometry` with ring segments for bark texture. Slight lean via rotation. | 6-8 fronds — each a tapered `PlaneGeometry` with vertex-displaced edges for a feathered look, arranged radially from trunk top. | Coconut clusters (small spheres), dead fronds hanging below live ones. |
| **cypress** | Narrow straight cylinder, dark bark material. | Tall narrow `ConeGeometry` (high radial segments) with vertex noise for organic silhouette. | Multiple cones stacked/overlapping for density. |
| **oak** | Thick short trunk splitting into 3-4 branch cylinders. | Large irregular sphere cluster (5-8 displaced icosahedrons) forming broad rounded canopy. | Exposed root geometry at base, knotholes (small indented cylinders on trunk). |
| **pine** | Straight tapered cylinder with horizontal branch stubs. | 3-5 cones stacked vertically, decreasing in radius upward. Each cone gets vertex noise on the rim. | Scattered pine needle ground cover (tiny rotated planes around base). |

**`Bush({style})` — 3 styles:**
- **leafy**: 2-3 displaced icosahedrons clustered low to ground, darker green material.
- **flowering**: Same as leafy with small colored sphere clusters (flowers) on surface.
- **hedge**: Stretched box with vertex displacement on top face for trimmed-but-organic look.

**`Grass()`:** Clusters of thin triangular planes (blade shapes) at random rotations and slight height variation. Placed in patches. Each blade is a narrow triangle with slight curve via vertex offset. Material uses `alphaTest: 0.5` (not transparency blending) to avoid depth-sorting artifacts with overlapping blades.

**`Vine()`:** A chain of small cylinders following a catenary curve between two attach points, with small leaf planes sprouting at intervals.

**`PottedPlant()`:** `LatheGeometry` pot with terracotta profile, soil surface (displaced disc), and a small bush or 3-5 leaf planes fanning outward from center.

**`Flower()`:** Thin stem cylinder, 5-6 petal planes arranged radially with slight curl via vertex offset, central sphere (pollen).

### Rocks & Terrain

**`Rock({size, style})` — styles: `'rough'`, `'mossy'`, `'sandstone'`**

Base: `IcosahedronGeometry` (subdivision 2-3) with aggressive vertex displacement (15-30% of radius). `sandstone` uses horizontal displacement for sedimentary erosion look. `mossy` adds green-tinted flat patches on upper-facing surfaces.

**`RockCluster()`:** 3-7 `Rock()` instances at random positions, partially overlapping and embedded in ground. Collision volume is a simplified enclosing box or 2-3 boxes.

**`Rubble()`:** Scattered small displaced icosahedrons, broken slab pieces (thin rotated boxes suggesting fracture), dust mound (flat displaced sphere). Random rotation on all pieces.

**`MossPatches()`:** Flat displaced discs with green material placed on surfaces, slight thickness for visibility.

### Containers

**`Barrel({style})` — styles: `'metal'`, `'wood'`, `'tipped'`**

`LatheGeometry` with proper barrel profile — wider at middle, tapered at top/bottom. Metal: 3 horizontal ridge rings. Wood: vertical stave line strips and metal band rings at top/middle/bottom. `tipped` rotates 80° on X with small puddle disc underneath.

**`Crate({size, style})` — styles: `'wood'`, `'military'`, `'shipping'`**

Base box with: edge trim (thin box strips along all 12 edges), plank line indentations for `wood`, corner L-brackets for `military`, stencil block shapes on sides for `military`/`shipping`.

**`Sack()`:** `SphereGeometry` squashed vertically (0.6 Y scale) with vertex displacement. Gathered top via small cone pinch. Burlap-colored rough material.

**`WineCask()`:** Elongated `LatheGeometry` barrel profile, horizontal orientation. Wooden stave strips, metal bands. Small spigot on one end (cylinder + cone).

**`Pallet()`:** 3 bottom runner boxes, 5-6 top plank boxes with visible gaps between them.

### Furniture

**`Chair({style})` — styles: `'office'`, `'wooden'`, `'folding'`**

- **office**: 5-star base (5 radial cylinder legs), gas cylinder stem, seat box with rounded front edge, curved backrest plane, armrests. Optional caster sphere wheels.
- **wooden**: 4 tapered splayed cylinder legs, plank seat with edge strips, slatted backrest (3-4 thin boxes with gaps).
- **folding**: X-frame crossed thin boxes per side, thin flat seat and back, metal material.

**`Desk({style})` — styles: `'office'`, `'workbench'`**

- **office**: Flat top with edge trim, panel sides with knee-space cutout, drawer bank (3 stacked thin boxes with cylinder handles), monitor stand riser.
- **workbench**: Thick plank top with stave lines, 4 square legs with cross-brace stretchers, mounted vise (box + cylinder screw).

**`Shelf({style})` — styles: `'bookcase'`, `'industrial'`, `'wall_mounted'`**

- **bookcase**: Side panels, horizontal shelves, packed book blocks (varying height/width/color boxes, some tilted).
- **industrial**: Thin cylinder metal frame, flat shelf surfaces, random stored items.
- **wall_mounted**: L-bracket geometry supporting single plank shelf with decorative items.

**`Couch()`:** Low base frame, thick seat cushion with vertex-displaced top, 2-3 back cushions with rounded top edges, tapered armrest boxes. Fabric material.

### Industrial

**`Pipe({path, radius})`:** `TubeGeometry` following a `CatmullRomCurve3` constructed from an array of `Vector3` points. The `path` parameter is a point array that the generator wraps in the curve internally. Supports straight runs and 90° elbow bends. Flange rings (short wider cylinders) at connections. Optional valve wheels (flat disc + cross spokes).

**`Duct()`:** Rectangular tube from 4 elongated planes with seam line strips and small rivet cylinders along edges.

**`Junction()`:** Wall-mounted box with raised panel door (offset front face), conduit pipe cylinders entering top and bottom, warning stripe on door.

### Architectural

**`Pillar({style})` — styles: `'greek'`, `'stone'`, `'modern'`**

- **greek**: Fluted cylinder (vertical groove indentations), wider capital box with scroll cylinders, base plinth cylinder.
- **stone**: `LatheGeometry` with slight taper and vertex displacement for worn surface.
- **modern**: Clean smooth cylinder or rectangular column, concrete material.

**`Fountain()`:** Multi-tiered `LatheGeometry` basins. Central tapered cylinder pedestal. Water surface discs with emissive blue transparent material at each level. Decorative torus ring at basin lips.

**`Lantern()`:** Wall bracket (thin box arm), `LatheGeometry` glass housing, conical top cap, emissive orange sphere flame inside. Adds warm `PointLight` with short range.

**`Archway()`:** Two pillar bases with semicircular arch span (half `TorusGeometry`, arc = π). Keystone block at apex.

## Surface Detail Systems

Added to `js/maps/shared.js` as new helpers.

### `WallRelief(scene, w, h, d, mat, x, y, z, {style})`

| Style | Technique |
|-------|-----------|
| **brick** | Grid of slightly protruding thin boxes (individual bricks) with recessed mortar gaps. Subtle random depth variation (±5%) per brick. Corner bricks alternate header/stretcher. |
| **stone** | Irregular-sized boxes in coursed rubble pattern — varying widths, staggered joints. Each stone gets front-face vertex displacement for rough-hewn look. Deeper mortar gaps than brick. |
| **plaster_crack** | Smooth base with crack ridges (thin raised boxes) in branching patterns. Exposed underlying material patches (recessed different-colored boxes) near cracks. Water stain patches (darker material) below cracks. |
| **panel** | Rectangular panel insets divided by thin border strips creating wainscoting. Each panel slightly recessed from frame. Upper wall smooth, lower wall paneled. |

### `FloorDetail(scene, w, d, mat, x, z, {style})`

| Style | Technique |
|-------|-----------|
| **cracked_tile** | Grid of individual tile boxes with gap lines. 2-3 random tiles split diagonally (triangular prisms) with slight vertical offset. Missing tiles reveal darker sub-floor. |
| **worn_plank** | Individual plank boxes with gaps. Random planks get top-face vertex displacement for warping. Nail head cylinders at plank ends. Some planks in different wood shade. |
| **cobblestone** | Rounded-top boxes (convex vertex displacement) in non-uniform grid. Varying sizes. Deep recessed gaps with darker material. Occasional puddle (flat transparent disc). |

### `CeilingDetail(scene, w, d, x, y, z, {style})`

| Style | Technique |
|-------|-----------|
| **beams** | Thick rectangular boxes at regular intervals with perpendicular cross-beams. Wood material. Small metal L-bracket joist hangers at connections. |
| **pipes** | `TubeGeometry` pipe network with elbows, T-junctions, valve wheels, flange rings. Mixed diameters. Some insulation wrapping (wider cylinder segments). |
| **panels** | Thin metal strip grid with inset rectangular panel boxes. Occasional missing panel revealing ductwork (thin cylinders in dark void). Emissive fluorescent light boxes in some panels. |

Surface details are applied selectively per map, not to every surface. Each map specifies which walls/floors/ceilings get treatment to avoid visual monotony and focus detail where it has the most impact. Surface detail geometry is decoration-only (no collision) — the underlying wall/floor `B()` mesh retains its collision role.

## Material Cache

The prop library maintains its own PBR material cache organized by category:

| Category | Materials | Key Properties |
|----------|-----------|----------------|
| **Wood** | bark_dark, bark_light, plank_oak, plank_pine, plank_weathered | Roughness 0.8-0.95, brown tones |
| **Foliage** | leaf_dark, leaf_mid, leaf_light, leaf_tropical, leaf_dry | Roughness 0.5-0.7, greens/yellows, partial transparency on planes |
| **Stone** | stone_grey, stone_mossy, sandstone, temple_stone, cobble | Roughness 0.85-1.0 |
| **Metal** | metal_rusted, metal_painted, metal_clean, iron_band | Roughness 0.3-0.6, metalness 0.7-0.9 |
| **Fabric** | burlap, canvas_market, cushion | Roughness 0.9+, no metalness |
| **Ceramic** | terracotta, tile_white, tile_broken | Roughness 0.5-0.7 |
| **Water** | water_surface, puddle | Roughness 0.1, high transparency, emissive tint |

Materials are created once and shared across all prop instances. Maps continue using their existing material variables (from `shared.js` factories like `woodMat()`, `metalMat()`) for structural surfaces. The prop material cache is separate from the shared.js material factories — props use their own cache because they need finer-grained material variants (e.g., bark_dark vs bark_light vs plank_oak) that don't exist in the shared factories. Props should never duplicate a shared material that already exists; if a shared material fits, use it directly.

## Map-by-Map Application

### Aztec (Jungle Temple)
- **Trees**: `jungle` style with buttress roots, hanging vines, epiphyte clusters. Thicker trunks provide meaningful cover.
- **Ground**: `Grass()` patches throughout, `MossPatches()` on temple surfaces, tropical `Flower()` clusters.
- **Rocks**: `mossy` rock clusters near river banks, creating new low-cover tactical positions.
- **Temple walls**: `stone` wall relief on all temple surfaces.
- **Temple floors**: `cobblestone` on temple platforms.
- **River banks**: `RockCluster()` formations along edges.
- **Rope bridge**: Keep existing structure, add `Vine()` draped along railings.
- **New additions**: Fallen log (horizontal jungle tree trunk, no canopy), `Pillar({style:'stone'})` flanking shrine entrances.

### Dust (Desert Market)
- **Trees**: `palm` style replacing trunk stubs — tall with fronds and coconut clusters.
- **Market**: `Crate({style:'wood'})` and `Sack()` piles around stalls.
- **Barrels**: `Barrel({style:'metal'})` and `Barrel({style:'tipped'})` replacing plain cylinders.
- **Rubble**: `Rubble()` clusters replacing flat box debris, `Rock({style:'sandstone'})` formations.
- **Walls**: `plaster_crack` on building exteriors, `brick` exposed at damaged sections.
- **Floors**: `cobblestone` in market area, `cracked_tile` in building interiors.
- **Vehicle area**: Keep existing vehicle, add `Barrel()` and `Crate()` around it for better cover cluster.

### Italy (Mediterranean Village)
- **Trees**: `cypress` lining pathways, `oak` in courtyard.
- **Plants**: `PottedPlant()` replacing cylinder pots, `Flower()` window boxes.
- **Fountain**: Full `Fountain()` replacement with tiered basins and water.
- **Wine**: `WineCask()` in cellar/market areas.
- **Lighting**: `Lantern()` with warm point lights on building walls.
- **Architecture**: `Archway()` at passage entrances.
- **Walls**: `plaster_crack` upper, `stone` lower on buildings.
- **Floors**: `cobblestone` on streets, `worn_plank` inside buildings.

### Office (Modern Office Building)
- **Furniture**: `Desk({style:'office'})`, `Chair({style:'office'})`, `Couch()`, `Shelf({style:'bookcase'})`.
- **Plants**: `PottedPlant()` in lobbies and corners.
- **Walls**: `panel` wainscoting in conference rooms, `plaster_crack` in maintenance areas.
- **Floors**: `cracked_tile` in restrooms/kitchen.
- **Ceilings**: `panels` drop ceiling throughout with fluorescent fixtures, `pipes` in maintenance/server room.
- **Industrial**: `Junction()` on walls, upgraded fire extinguisher (`LatheGeometry` body with nozzle).

### Warehouse (Multi-Floor Industrial)
- **Containers**: `Crate({style:'shipping'})` and `Crate({style:'military'})` replacing plain boxes.
- **Barrels**: `Barrel({style:'metal'})` with ridges, some `tipped`.
- **Pallets**: `Pallet()` with actual plank gaps.
- **Industrial**: `Pipe()` networks on walls, `Duct()` runs, `Junction()` boxes.
- **Furniture**: `Desk({style:'workbench'})` in foreman area, `Shelf({style:'industrial'})` along walls.
- **Floors**: `worn_plank` on upper levels, concrete with `Rubble()` patches on ground floor.
- **Ceilings**: `pipes` with insulation wrapping, `beams` on upper levels.

### Bloodstrike (Rectangular Loop Arena)
- **Crates**: `Crate({style:'military'})` with edge trim and corner brackets.
- **Barrels**: `Barrel({style:'metal'})` mix with some `tipped`.
- **Rocks**: `rough` rock clusters in corners for new cover options.
- **Rubble**: `Rubble()` scattered in combat zones.
- **Walls**: `brick` relief on perimeter, `panel` on interior accent walls.
- **Floors**: `cracked_tile` with battle damage feel.
- **New additions**: `Pillar({style:'modern'})` at arena entrances.

### Arena (Open-Air Combat Arena)
- **Crates**: `Crate({style:'military'})` replacing plain boxes.
- **Barrels**: `Barrel({style:'metal'})` replacing plain cylinders, some `tipped`.
- **Platform**: Central platform gets `stone` wall relief on sides.
- **Walls**: `brick` relief on perimeter walls, hazard stripe geometry on pillars.
- **Floors**: `cracked_tile` on platform surfaces.
- **New additions**: `Rubble()` scattered in combat zones, `RockCluster()` at map edges for additional cover.

## Script Loading Order

`props.js` must be loaded in `index.html` after `shared.js` (it uses shared utilities like `shadow()`) and before all individual map files (maps call its generators). The load order in `index.html`:

```
js/maps/shared.js
js/maps/props.js    ← new
js/maps/dust.js
js/maps/office.js
...etc
```

## Replacing Existing Geometry

When updating maps, each existing `D()` or `Cyl()` call that creates a prop (tree, rock, barrel, potted plant, etc.) is **deleted** and replaced with the corresponding `GAME._props` generator call. Existing `B()` calls for collidable props (e.g., crates used as cover) are also replaced with collidable generator calls. Structural geometry — walls, floors, ceilings, stairs, platforms, ramps created with `B()` — is **kept as-is**. Surface detail helpers are added on top of existing structural surfaces, not replacing them.

## Completion Criteria

The overhaul is complete when:
- Every `D()` and `Cyl()` call in map files that creates a tree, rock, barrel, potted plant, bush, crate, sack, furniture item, or other environmental prop has been replaced with the corresponding `GAME._props` generator call.
- Every map has surface detail (`WallRelief`, `FloorDetail`, and/or `CeilingDetail`) applied to the surfaces specified in its map-by-map section above.
- All prop generators produce visually detailed geometry using advanced primitives (no plain box foliage, no featureless cylinder barrels).
- Collision volumes are registered for props that serve as player cover.
- All tests pass (`npm test`).

## Implementation Order

1. **`props.js` foundation** — module scaffold, material cache, PRNG, vertex displacement utility, collision registration helper
2. **Vegetation generators** — `Tree()` (all 5 styles), `Bush()`, `Grass()`, `Vine()`, `PottedPlant()`, `Flower()`
3. **Rock & terrain generators** — `Rock()`, `RockCluster()`, `Rubble()`, `MossPatches()`
4. **Container generators** — `Barrel()`, `Crate()`, `Sack()`, `WineCask()`, `Pallet()`
5. **Furniture generators** — `Chair()`, `Desk()`, `Shelf()`, `Couch()`
6. **Industrial generators** — `Pipe()`, `Duct()`, `Junction()`
7. **Architectural generators** — `Pillar()`, `Fountain()`, `Lantern()`, `Archway()`
8. **Surface helpers** — `WallRelief()`, `FloorDetail()`, `CeilingDetail()` added to `shared.js`
9. **Map updates** — Replace blocky geometry in all 7 maps with prop library calls
10. **Collision & gameplay tuning** — Adjust collision volumes where new geometry changes tactical options
