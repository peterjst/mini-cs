# Map Environment Improvement — Design Spec

**Date**: 2026-03-16
**Goal**: Improve all 7 maps for (1) realism — eliminate flat/solid-color surfaces with full surface detail, and (2) functionality — fix useless stairs and dead-end geometry so every climbable structure has tactical purpose.

---

## Scope

Two workstreams across all 7 maps:

1. **Realism**: Add corrugation, panel lines, window frames, shutters, pipes, signs, weathering, and props to break up every monotone surface.
2. **Functionality**: Restructure dead-end elevated geometry — keep/enhance what can be made tactical, remove/replace what cannot.

---

## Workstream 1: Functionality Fixes

### Bloodstrike — Diagonal Sniper Perches

**Keep NW (-24,-14) and SE (24,14) corner platforms. Remove NE (24,-14) and SW (-24,14).**

Kept platforms (NW, SE):
- Remove inner-edge barrier walls (the `barrierMat` walls facing the corridor) to open sightlines down north/south corridors
- Keep outer-edge barriers (against perimeter walls) as back cover
- Replace the decorative sandbag at stair-top with a functional low sandbag wall (h~1.0) for entry cover
- Keep existing crate stacks on platforms

Removed platforms (NE, SW) — replace each with:
- Concrete jersey barrier cluster (2-3 low walls, h~1.2) for ground-level cover at the corner junction
- Crate stack (2-3 crates) for height variation
- Barrel group (2 barrels) for visual interest

Waypoint updates: Remove waypoints near deleted platforms. Ensure remaining waypoints route bots through ground-level cover at NE/SW corners.

### Aztec — Overpass Extension

Extend the existing walkway at (-18, -18, y=3) eastward to connect to the double-door corridor:
- Add a bridge/ramp segment from the overpass east end (~x=-13) to the top of one corridor wall
- The corridor walls (x=-13 and x=-7, height 5, base y=0) have tops at y=5 — add a narrow walkable platform (width ~1.5) on top running the corridor length
- Add low stone parapets (h~0.8) on both sides for cover
- Result: elevated flanking route from T-spawn area (up overpass stairs) → across bridge → along corridor top → drop down near bombsite B

Waypoint updates: Add waypoints along the elevated route (bridge midpoint, corridor wall top, drop-down point).

### Aztec — Temple Top Tier Expansion

Expand the top tier from 6×6 to 8×8:
- Widen the top `B()` from `(6, 1.5, 6)` to `(8, 1.5, 8)`
- Add a central stone altar block (~2×1.5×2) as primary cover
- Add 2 stone pillar fragments (~0.8×1.2×0.8) at opposite corners for secondary cover
- Add carved relief decoration (WR with stone style) on altar and tier edges

Waypoint updates: Add a waypoint on the expanded top tier.

### Italy — Furnished 2nd Floors

**Building A** (north, CT-side, 12×13 floor at y=3.5):
- 2 desks with monitors near the south-facing edge (overlooking piazza/north alley)
- Filing cabinet cluster against the back (north) wall
- Low bookshelf as interior cover
- Window position in the south wall gap: add a low wall (h~1.0) across the existing gap as a window sill — players crouch behind it and peek over
- Second window cutout in the east wall (x=4) facing the alley between A and B

**Building B** (east, T-side, 12×25 floor at y=3.5):
- Partition wall (~6 long, h~3) to create two rooms
- Front room (south): table with chairs, crate stack for cover, window position overlooking market stalls and piazza
- Back room (north): shelving against wall, desk near a window overlooking bombsite A area
- Window openings: low-wall window positions in the west wall (x=10) at 2-3 locations
- Existing iron railing balcony stays, add cover furniture beside it

Both floors: Floor material patches (carpet or wood planking via `D()`) to differentiate from ground floor.

Waypoint updates: Add waypoints on both 2nd floors for bot navigation.

---

## Workstream 2: Realism — Full Surface Detail

### Dust

Market building interior walls:
- Window cutout frames (thin `D()` rectangles) on back and side walls
- Wooden shutters flanking each window
- Plaster crack WR overlay on interior surfaces
- Counter/shelf inside with goods (pots, sacks)

Crate covers (large cover blocks):
- Horizontal banding strips (darker wood `D()` across faces)
- Metal corner brackets
- Stenciled marking patches (small contrasting rectangles)

Perimeter walls:
- 2-3 window-like recessed frames with dark backing
- Additional wall damage patches for variation

### Warehouse

Shipping containers:
- Corrugation ridges: series of thin horizontal `D()` strips, alternating slight color offset along each face
- Door-end details: vertical locking bars (`D()` strips), handle block
- Rust streak overlays: long thin dark-orange `D()` drips on sides
- ID plates: small light rectangle near top of each container

Perimeter walls:
- Vertical panel seam lines (thin `D()` every ~8 units)
- Rivet dots at seam intersections
- Wall-mounted cable trays running horizontally

Container tops:
- Thin raised lip edges

### Arena

Inner blocks (4 × 8×5×8):
- Panel grid on each face: horizontal + vertical seam lines creating 2×2 pattern
- Vent grates: dark recessed rectangles (2 per block)
- Conduit pipe runs: thin `Cyl` along block edges
- Hazard stripe patches near ground level

Perimeter walls:
- Structural seam lines
- Graffiti-like colored patches (2-3 per wall, abstract colored rectangles at various heights)
- Weathering stain drips below seams

Central platform:
- Edge trim strips
- Marking pattern on top surface

### Bloodstrike

Inner wall gaps (between brick panels):
- Electrical junction boxes (`P.Junction`)
- Mounted pipe runs (horizontal `Cyl` at ~5m)
- Faded poster/sign rectangles (colored `D()` patches)
- Water stain drips below pipes

Outer wall gaps (between brick panels):
- Ventilation grates (dark recessed rectangles)
- Metal bracket strips
- Paint fade patches (subtle color variation overlays)

Kept corner platform columns:
- Bolted base plates and pipe clamps

### Office

Interior walls:
- Glass panel inserts on 4-5 walls: thin `glassMat` rectangles with dark metal frames
- Door frames (wood `D()` surrounds) on all wall openings (currently only 4, should cover every passage)
- Bulletin boards (cork-colored rectangles with pinned paper scraps)
- More whiteboards
- Wall-mounted TV/display screen (dark rectangle with faint emissive)
- Baseboard trim on interior walls (currently only perimeter has them)
- Ceiling-mounted smoke detectors (small `Cyl` discs)

### Italy

Perimeter walls:
- Window frames with shutters: pairs of thin colored rectangles (terracotta/green/blue) flanking dark recessed window openings, spaced every ~8 units
- Flower box ledges below select windows (small planter boxes with green tufts)
- Facade color variation: overlay rectangular plaster patches in different warm tones (orange, cream, pink) to simulate different building facades
- Clotheslines between facing walls

### Aztec

Perimeter walls:
- Carved stone relief blocks (thick `D()` panels with WR stone style)
- Moss patch overlays at base and along cracks
- Additional vines: 4-5 more `P.Vine` calls beyond the existing 4

Double-door corridor walls:
- Carved glyph panels (contrasting stone rectangles)
- Torch holder brackets (small `D()` + emissive spot)
- Moss at wall bases

Temple tiers:
- Carved border trim on each tier edge (thin darker stone band)
- Glyph panels on riser faces
- Moss growing in step joints

River walls:
- Moss/algae patches (green-tinted overlays) near water line
- Exposed root tendrils hanging over edges

---

## Implementation Approach

- Use existing helpers and material factories — no new infrastructure needed
- Primarily `D()` decorative overlays, `WR()` wall relief, `P.*` props, thin `Cyl` geometry
- Reuse cached materials (`concreteMat`, `metalMat`, `woodMat`, `glassMat`, etc.)
- Each map is an independent unit of work
- Update waypoints for any structural changes (Bloodstrike, Aztec, Italy)
- Update REQUIREMENTS.md for all changes
- Run `npm test` after each map change

## Performance Considerations

- Most additions are small decorative geometry (thin strips, small rectangles) — low mesh cost
- Reuse shared materials rather than creating new ones to keep material count stable
- For repetitive detail (corrugation, panel seams), keep individual meshes simple (BoxGeometry)
- No new texture generation needed — existing procedural texture system is sufficient
