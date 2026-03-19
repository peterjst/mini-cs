# Adaptive Quality System — Design Spec

## Problem

The game is unplayable on mobile devices (~1-5 FPS) because all devices render at identical desktop-quality settings: full post-processing (SSAO, bloom, sharpen), 2048x2048 shadow maps, PCFSoft shadows, and high pixel ratios.

## Solution

An adaptive quality system that monitors FPS and automatically adjusts rendering quality to maintain playable frame rates. Device-agnostic — works on any device regardless of whether it's mobile or desktop.

## Goals

- Maintain 30 FPS on the widest range of hardware possible
- Desktop users who can already hold 30+ FPS see zero changes
- No manual settings UI — fully automatic
- Fast recovery when performance drops, cautious about restoring quality

## Quality Levels

Six discrete levels, each a complete rendering configuration:

| Level | Name | Pixel Ratio | Shadows | Shadow Map | SSAO | Bloom | Sharpen | Antialias |
|-------|------|-------------|---------|------------|------|-------|---------|-----------|
| 5 | Ultra | min(dpr, 2) | PCFSoft | 2048 | On | On | On | On |
| 4 | High | min(dpr, 1.5) | PCFSoft | 1024 | On | On | Off | On |
| 3 | Medium | min(dpr, 1.5) | PCF | 1024 | Off | On | Off | On |
| 2 | Low | min(dpr, 1.0) | PCF | 512 | Off | Off | Off | Off |
| 1 | Very Low | min(dpr, 1.0) | Off | — | Off | Off | Off | Off |
| 0 | Minimal | min(dpr, 0.75) | Off | — | Off | Off | Off | Off |

Level 5 is today's default. Level 0 is the absolute floor.

## Adaptive Controller

### FPS Measurement

- Track frame times over a rolling 2-second window
- Compute average FPS from the window each second

### Downgrade (Aggressive)

- If average FPS < 25 for 1 second: drop one level
- If average FPS < 15: drop two levels at once
- No cooldown on downgrades — keep dropping until FPS stabilizes

### Upgrade (Conservative)

- If average FPS > 35 for 8 seconds: upgrade one level
- After upgrading, reset the 8-second timer before considering next upgrade
- If upgrading causes FPS to drop below 25 within 3 seconds, immediately downgrade and mark that level as a "ceiling" — don't attempt to upgrade past it again for the rest of the session

### Startup

- Start at Level 5 (max quality)
- System self-corrects within a few seconds on weak devices

## Applying Quality Changes

### What changes at runtime

- **Pixel ratio**: `renderer.setPixelRatio()` + resize all render targets (bloom, SSAO, sharpen)
- **Shadows**: `renderer.shadowMap.enabled` toggle + mark materials needing update
- **Shadow map type**: `renderer.shadowMap.type` (PCFSoftShadowMap vs PCFShadowMap)
- **Shadow map size**: Update directional light shadow map dimensions
- **Post-processing**: Skip SSAO/bloom/sharpen passes in `renderWithBloom()` based on current level config

### What stays the same

- Scene geometry, lights, materials — no mesh removal or light culling
- Particle system (already instanced and capped at 236)
- Game logic, physics, AI

## Architecture

### New file: `js/quality.js`

- Quality level definitions (the table above as data)
- FPS tracker (rolling 2-second window)
- Adaptive controller (downgrade/upgrade logic, ceiling tracking)
- `applyLevel(level)` function that updates renderer, shadow, and post-processing config
- Exposes `GAME.quality` with current level number, level name, and config object

### Changes to `js/main.js`

- Load `js/quality.js` in script tags
- `renderWithBloom()` reads `GAME.quality` config to decide which passes to execute
- Renderer setup defers shadow/pixel ratio settings to quality module
- Game loop calls `GAME.quality.update(dt)` each frame

### Changes to `index.html`

- Add `<script>` tag for `js/quality.js`
- Add a toast element for the quality indicator HUD

## HUD Indicator

- When quality drops below Level 5, show a brief toast in the corner: "Quality: [level name]"
- Toast fades after 2 seconds
- On upgrade, no indicator — silently improve
- No persistent UI element

## What This Does NOT Include

- Manual quality settings UI
- Per-feature granular controls
- Geometry LOD or mesh culling
- Light culling or reduction
- Particle count reduction
- Any changes to game logic or AI
