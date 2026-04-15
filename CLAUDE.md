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
- **Always run `npm test` after making product code changes** (any change to files in `js/` or `index.html`). Fix any test failures before committing.
- **Always add or update tests when adding or changing functionality.** Write tests based on the requirements and expected behavior (from REQUIREMENTS.md), not based on the product code implementation. Tests should verify *what* the code should do, not mirror *how* it does it.
- **Always create a git commit after finishing any bug fix or development task.**
- Avoid using `$()` command substitution in shell commands unless absolutely needed. Prefer passing arguments directly (e.g. `git commit -m "message"`).

## Architecture
| File | Role |
|------|------|
| `index.html` | Entry point, HUD/UI markup, CSS, loads scripts |
| `js/maps/shared.js` | Shared materials, texture utils, build helpers, map registry (`GAME._maps`) |
| `js/maps/dust.js` | Dust map (Desert Market) |
| `js/maps/office.js` | Office map (Modern Office Building) |
| `js/maps/warehouse.js` | Warehouse map (Multi-Floor Industrial) |
| `js/maps/bloodstrike.js` | Bloodstrike map (Rectangular Loop Arena) |
| `js/maps/italy.js` | Italy map (Mediterranean Village) |
| `js/maps/aztec.js` | Aztec map (Jungle Temple) |
| `js/maps/arena.js` | Arena map (Cross-corridor Center Platform) |
| `js/maps/props.js` | Shared map prop builders (vehicles, crates, etc.) |
| `js/core/player.js` | First-person controller, WASD + mouse, collision |
| `js/core/sound.js` | Procedural Web Audio sound effects |
| `js/core/quality.js` | Adaptive quality system (FPS-based settings) |
| `js/core/fullscreen.js` | Fullscreen toggle with orientation lock |
| `js/core/renderer.js` | Three.js setup, post-processing (bloom, sharpen, SSAO), color grading |
| `js/core/main.js` | Game init, loop, state machine, rounds, input wiring |
| `js/effects/particles.js` | Unified particle system (smoke, dust, blood, sparks) |
| `js/effects/effects.js` | Visual effects (blood, bullet holes, dust, screen shake, hitmarker, etc.) |
| `js/effects/birds.js` | Ambient bird system (spawning, flight animation, kill/feather effects) |
| `js/systems/weapons.js` | Weapon definitions, models, shooting, grenades |
| `js/systems/enemies.js` | Bot AI, humanoid models, behavior states |
| `js/systems/progression.js` | XP, ranks, missions, match history (`GAME.progression`) |
| `js/systems/bomb.js` | Bomb defusal system: plant/defuse, bomb HUD (`GAME.bomb`) |
| `js/systems/boss.js` | Boss fight system: health bar, atmosphere, heartbeat, minions (`GAME.boss`) |
| `js/ui/touch.js` | Mobile touch controls |
| `js/ui/minimap.js` | Minimap rendering |
| `js/ui/hud.js` | HUD rendering, scoreboard, kill feed, announcements, pause hint |
| `js/ui/buy.js` | Buy system: weapon/armor/utility purchases, buy menu UI updates (`GAME.buy`) |
| `js/ui/menu.js` | Menu flythrough camera, menu scene, quick play, fade (`GAME.menu`) |
| `js/modes/competitive.js` | Competitive mode: matches, rounds, map rotation (`GAME.modes.competitive`) |
| `js/modes/survival.js` | Survival mode: waves, kills, end screen (`GAME.modes.survival`) |
| `js/modes/gungame.js` | Gun Game mode: weapon ladder, level HUD (`GAME.modes.gungame`) |
| `js/modes/deathmatch.js` | Deathmatch mode: kill target, respawns, boss spawn (`GAME.modes.deathmatch`) |

## Code Patterns
- Build helpers in `js/maps/shared.js`, exposed via `GAME._mapHelpers`: `B()` (collidable box), `D()` (decoration), `Cyl()` (cylinder), `CylW()` (collidable cylinder), `buildStairs()`, `addHangingLight()`, `addPointLight()`
- Individual map files destructure helpers from `GAME._mapHelpers` and push their map definition to `GAME._maps`
- Shadow helpers: `shadow(mesh)` sets castShadow+receiveShadow, `shadowRecv(mesh)` sets receiveShadow only
- Materials are cached and shared — reuse existing material variables rather than creating new ones
- Weapons use a shared PBR material cache (~20 materials)
- **Menu click handlers**: `.config-diff-row` and `.config-diff-btn` classes are shared across different option types (difficulty, map mode, etc.). Every delegated click handler on these shared classes MUST guard with a data-attribute check (e.g. `if (!btn.dataset.diff) return`) to avoid cross-handler interference. When adding new menu options, either use specific DOM element references or add explicit attribute guards.
