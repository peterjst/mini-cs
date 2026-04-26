# Warehouse Map — Enemy Visibility Fix

**Date:** 2026-04-26

## Goal

Make enemies clearly visible on the warehouse map without losing its industrial, gritty identity.

## Problem

Players report the warehouse map reads as too dark — enemy silhouettes blend into the floor and walls. Comparison across maps reveals two compounding causes:

**1. Surface albedo is unusually low.**

| Map | Floor | Walls | Approx reflectance |
|---|---|---|---|
| Warehouse | `0x606060` | `0x6a6a6a` | ~38–42% |
| Dust | `0xd2b48c` sand | `0xb8a68a` sandstone | ~70–76% |
| Italy | `0xa08050` stone | `0xc8a87c` sandstone | ~56–70% |

Warehouse surfaces absorb most incident light. Dark bot models against a 38%-reflectance floor have very little contrast.

**2. Lighting is the weakest of any map.**

| Map | sun | fill | ambient | hemi | Sum |
|---|---|---|---|---|---|
| Warehouse | 0.5 | 0.15 | 0.2 | 0.3 | **1.15** |
| Office | 0.6 | 0.35 | 0.4 | 0.45 | 1.80 |
| Italy | 0.95 | 0.25 | 0.25 | 0.4 | 1.85 |
| Dust | 1.1 | 0.15 | 0.2 | 0.35 | 1.80 |

Warehouse runs at ~64% of peer maps' total light intensity.

**3. Color grading multiplies the darkness.**

- Shadow tint `[0.85, 0.8, 0.75]` darkens already-shadowed areas (under catwalks, inside containers).
- Vignette `0.4` is the highest of any map (others 0.25–0.3), pulling edge brightness down further.

## Goals & Non-Goals

**Goals**
- Bots are clearly visible against floor/walls anywhere on the map.
- Whole map reads as "lit warehouse," not "gloomy warehouse."
- Preserve the warm, industrial, slightly desaturated identity (gray palette, warm tint, some vignette).

**Non-goals**
- No new fixtures, light models, or geometry.
- No changes to bot models or materials.
- No changes to other maps.
- No global renderer/tonemap changes.

## Design

All changes scoped to `js/maps/warehouse.js`. Three coordinated levers — surfaces, lighting, grading — each touched lightly so no single one has to do the heavy lifting alone.

### 1. Surface albedo (biggest impact for enemy contrast)

| Variable | Current | New | Notes |
|---|---|---|---|
| `darkConcrete` (floor) | `0x606060` | `0x808080` | +33% reflectance, still neutral gray |
| `corrMetal` (perimeter walls) | `0x6a6a6a` | `0x808080` | Brighter corrugated metal |
| `conc` (inner concrete) | `0x707070` | `0x858585` | Slightly brighter mid-gray |

`darkConcrete` also passed to `FD(...)` for floor surface detail — single variable, single change.

### 2. Lighting (modest bump, surfaces now help)

| Field | Current | New |
|---|---|---|
| `sunIntensity` | 0.5 | 0.8 |
| `ambientIntensity` | 0.2 | 0.3 |
| `hemiIntensity` | 0.3 | 0.4 |
| `fillIntensity` | 0.15 | 0.25 |

Total ~1.75, in line with peer maps. `sunColor`, `fillColor`, `hemiSkyColor`, `hemiGroundColor`, and `sunPos` unchanged — preserves warm-industrial cast.

### 3. Color grading (stop fighting visibility)

| Field | Current | New |
|---|---|---|
| `shadows` | `[0.85, 0.8, 0.75]` | `[0.95, 0.92, 0.88]` |
| `vignetteStrength` | 0.4 | 0.3 |
| `tint`, `contrast`, `saturation` | unchanged | unchanged |

Vignette still present (just less aggressive); shadow regions still warm-tinted (just less crushed).

## Validation

- Run `npm test` — no test changes expected; existing tests should pass unchanged.
- In-game: load warehouse via competitive or shuffle map mode; walk to typical engagement zones (mid open floor, under east catwalk, behind containers, near bombsites A and B). Bot silhouettes should be readable from spawn-to-spawn distances.
- Visual sanity check: warehouse should still look distinctly different from dust/italy (still gray, still industrial), not be mistaken for a different map.

## Risks & Tradeoffs

- **Risk: warehouse becomes "too generic" if all three levers are pushed too hard.** Mitigation: surface bumps stop at gray (not white), warm tint and vignette retained, contrast/saturation unchanged.
- **Risk: under-catwalk areas now look flat instead of shadowed.** Acceptable — gameplay reads beat atmospheric reads; the existing local point lights already partially fill these areas.
- **Trade: light bump + brighter surfaces will increase apparent overall brightness more than either alone.** Intentional — that combination is the fix.

## Out of Scope (Future Work)

- Localized fill lights for specific dark pockets (deferred unless A-fix is insufficient).
- Adjustments to bot material brightness or rim-lighting for general silhouette readability across all maps.
