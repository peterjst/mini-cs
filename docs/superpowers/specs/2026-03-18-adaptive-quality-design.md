# Adaptive Quality System — Design Spec

## Problem

The game is unplayable on mobile devices (~1-5 FPS) because all devices render at identical desktop-quality settings: full post-processing (bloom, sharpen), 2048x2048 shadow maps, PCFSoft shadows, and high pixel ratios.

## Solution

An adaptive quality system that monitors FPS and automatically adjusts rendering quality to maintain playable frame rates. Device-agnostic — works on any device regardless of whether it's mobile or desktop.

## Goals

- Maintain 30 FPS on the widest range of hardware possible
- Desktop users who can already hold 30+ FPS see zero changes
- No manual settings UI — fully automatic
- Fast recovery when performance drops, cautious about restoring quality

## Quality Levels

Six discrete levels, each a complete rendering configuration. Antialias is excluded because it is a WebGL context creation parameter and cannot be toggled at runtime without destroying and recreating the renderer.

| Level | Name | Pixel Ratio | Shadows | Shadow Map | SSAO | Bloom | Sharpen |
|-------|------|-------------|---------|------------|------|-------|---------|
| 5 | Ultra | min(dpr, 2) | PCFSoft | 2048 | Off | On | On |
| 4 | High | min(dpr, 1.5) | PCFSoft | 1024 | Off | On | Off |
| 3 | Medium | min(dpr, 1.5) | PCF | 1024 | Off | On | Off |
| 2 | Low | min(dpr, 1.0) | PCF | 512 | Off | Off | Off |
| 1 | Very Low | min(dpr, 1.0) | Off | — | Off | Off | Off |
| 0 | Minimal | min(dpr, 0.75) | Off | — | Off | Off | Off |

Level 5 matches today's defaults (SSAO is currently disabled in the codebase). Level 0 is the absolute floor.

## Adaptive Controller

### FPS Measurement

- Maintain a rolling 2-second window of frame times
- Recompute average FPS every frame from the rolling window
- Downgrade decisions use the current rolling average
- Upgrade timer counts consecutive seconds where the rolling average exceeds 35 FPS

### Downgrade (Aggressive)

- If rolling average FPS < 25: drop one level
- If rolling average FPS < 15: drop two levels at once
- No cooldown on downgrades — keep dropping until FPS stabilizes
- Minimum 1-second interval between downgrade evaluations to allow changes to take effect

### Upgrade (Conservative)

- If rolling average FPS > 35 for 8 consecutive seconds: upgrade one level
- After upgrading, reset the 8-second timer before considering next upgrade
- If upgrading causes rolling average FPS to drop below 25 within 3 seconds, immediately downgrade and mark that level as a "ceiling" — don't attempt to upgrade past it again for 60 seconds (not permanent, to avoid transient events like grenade explosions permanently locking a level)

### Startup — Fast Start Heuristic

- Start at Level 5 (max quality)
- If the average of the first 10 frames is below 15 FPS, jump directly to Level 1 instead of stepping down incrementally
- This avoids 2-3 seconds of slideshow on weak devices

### Tab Visibility

- Pause the adaptive controller when `document.hidden` is true (Page Visibility API)
- Discard any frame time samples from the backgrounded period
- This prevents false downgrades when the browser throttles background tabs

## Applying Quality Changes

### What changes at runtime

- **Pixel ratio**: `renderer.setPixelRatio()` + resize all render targets. `resizeBloom()` must be updated to read `renderer.getPixelRatio()` instead of hardcoding `Math.min(window.devicePixelRatio, 2)`.
- **Shadows — disabling**: Set `light.castShadow = false` on the directional light rather than toggling `renderer.shadowMap.enabled`. This avoids shader recompilation on every material in the scene (which causes a noticeable frame hitch). The directional light reference must be stored as `GAME._dirLight` so the quality module can access it.
- **Shadow map type**: `renderer.shadowMap.type` (PCFSoftShadowMap vs PCFShadowMap). Requires `renderer.shadowMap.needsUpdate = true`.
- **Shadow map size**: Update `light.shadow.mapSize`, then dispose the existing shadow map (`light.shadow.map.dispose(); light.shadow.map = null`) so Three.js reallocates at the new size on the next render.
- **Post-processing — direct render fast path**: When bloom, SSAO, and sharpen are ALL off (levels 0-1), bypass the entire post-processing pipeline and render directly to the default framebuffer (`renderer.setRenderTarget(null)`). This avoids the wasted bandwidth of rendering to an offscreen RT and compositing. This is the single biggest win for the lowest quality levels.
- **Post-processing — partial**: When only some effects are on, skip disabled passes. For bloom specifically: set `bloomStrength` uniform to 0.0 and skip the bloom passes (bright extract, blur H, blur V). The stale `blurVRT` texture is multiplied by zero in the composite, so the output is visually correct.

### What stays the same

- Scene geometry, lights, materials — no mesh removal or light culling
- Particle system (already instanced and capped at 236)
- Game logic, physics, AI

### Prerequisite code change

The directional light created in `GAME._mapHelpers` (`js/maps/shared.js`) must be stored as `GAME._dirLight` so the quality module can modify shadow settings. Currently there is no accessible reference to it.

## Architecture

### New file: `js/quality.js`

- Quality level definitions (the table above as data)
- FPS tracker (rolling 2-second window)
- Adaptive controller (downgrade/upgrade logic, ceiling tracking, fast-start, visibility pause)
- `applyLevel(level)` function that updates renderer, shadow, and post-processing config
- Exposes `GAME.quality` with current level number, level name, and config object
- Exposes `GAME.quality.init(renderer, config)` called by main.js after renderer and post-processing setup

### Script load order

`quality.js` loads **before** `main.js` in `index.html`. It defines the quality level data and controller logic. `main.js` calls `GAME.quality.init()` after creating the renderer and post-processing pipeline, passing the references the quality module needs.

### Changes to `js/main.js`

- `renderWithBloom()` reads `GAME.quality` config to decide which passes to execute, including the direct-render fast path for levels 0-1
- `resizeBloom()` reads `renderer.getPixelRatio()` instead of hardcoding pixel ratio
- Game loop calls `GAME.quality.update(dt)` at the **start** of each frame, before any rendering, so quality changes apply cleanly to the current frame's render passes

### Changes to `js/maps/shared.js`

- Store the directional light as `GAME._dirLight` when created

### Changes to `index.html`

- Add `<script>` tag for `js/quality.js` before `js/main.js`
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
- Antialias toggling (not possible at runtime in Three.js)
