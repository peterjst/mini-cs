# Mini CS — Project Instructions

## What This Is
A browser-based Mini Counter-Strike FPS built entirely with procedural graphics (Three.js r160.1) and procedural audio (Web Audio API). No external assets. Runs from `index.html` with JS modules in `js/`.

## User's Goal
Build a polished, playable FPS that captures the feel of Counter-Strike — competitive round-based gameplay, realistic weapon handling, smart bot enemies, and detailed map environments — all generated procedurally in the browser.

## Standing Instructions
- **CRITICAL: Keep `REQUIREMENTS.md` in sync with EVERY code change.** This is a mandatory step — not optional. Whenever you add, modify, remove, or refactor any game feature, mechanic, constant, UI element, sound, or behavior, you MUST update the corresponding section(s) in REQUIREMENTS.md in the same response. This includes but is not limited to: changing numeric values (damage, speed, timers, colors, etc.), adding/removing features, altering game states, modifying UI text/layout, changing sound effects, or adjusting algorithms. If in doubt, update REQUIREMENTS.md.
- All graphics must be procedural (Three.js geometry + PBR materials). No image files.
- All sounds must be procedural (Web Audio API). No audio files.
- Use the IIFE module pattern. All modules attach to `window.GAME`.
- Three.js is loaded from CDN as global `THREE` — do not use ES module imports.

## Architecture
| File | Role |
|------|------|
| `index.html` | Entry point, HUD/UI markup, CSS, loads scripts |
| `js/map.js` | 3 maps (Dust, Office, Warehouse), materials, lighting, spawns |
| `js/player.js` | First-person controller, WASD + mouse, collision |
| `js/sound.js` | Procedural Web Audio sound effects |
| `js/weapons.js` | Weapon definitions, models, shooting, grenades |
| `js/enemies.js` | Bot AI, humanoid models, behavior states |
| `js/main.js` | Game loop, state machine, HUD updates, buy system |

## Code Patterns
- Build helpers in map.js: `B()` (collidable box), `D()` (decoration), `Cyl()` (cylinder), `CylW()` (collidable cylinder), `buildStairs()`, `addHangingLight()`, `addPointLight()`
- Shadow helpers: `shadow(mesh)` sets castShadow+receiveShadow, `shadowRecv(mesh)` sets receiveShadow only
- Materials are cached and shared — reuse existing material variables rather than creating new ones
- Weapons use a shared PBR material cache (~20 materials)
