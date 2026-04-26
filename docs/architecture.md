# Mini CS — Architecture

How systems are organized, what owns what state, and how they communicate. Read this when a task crosses module boundaries.

## Module ownership

| File | Owns | Exposes on `GAME` |
|---|---|---|
| `js/maps/shared.js` | Shared materials, texture utilities, build helpers, map registry | `_maps`, `_mapHelpers`, `_texUtil` |
| `js/maps/props.js` | Procedural prop generators, seeded PRNG, prop material cache | `_props` |
| `js/maps/<name>.js` | One map definition (geometry, lights, spawn zones) | (pushes onto `GAME._maps`) |
| `js/core/player.js` | First-person controller, movement, collision | player state on `GAME` root |
| `js/core/sound.js` | Procedural Web Audio effects | `playSound`, related |
| `js/core/quality.js` | Adaptive quality system (FPS-based) | `quality` |
| `js/core/fullscreen.js` | Fullscreen + orientation lock | `fullscreen` |
| `js/core/renderer.js` | Three.js setup, post-processing, color grading | `renderer`, `scene`, `camera` |
| `js/core/main.js` | Init, animate loop, state machine, input wiring | orchestrator (sets state on GAME root) |
| `js/effects/particles.js` | Unified particle system (InstancedMesh pools) | `particles` |
| `js/effects/effects.js` | Visual effects (blood, holes, dust, shake, hitmarker) | individual effect functions on `GAME` |
| `js/effects/birds.js` | Ambient bird system | `birds` |
| `js/systems/weapons.js` | Weapon defs, models, shooting, grenades | `weapons` |
| `js/systems/enemies.js` | Bot AI, humanoid models, behavior states | `enemies` |
| `js/systems/progression.js` | XP, ranks, missions, match history | `progression` |
| `js/systems/bomb.js` | Bomb plant/defuse logic and HUD | `bomb` |
| `js/systems/boss.js` | Boss fight state, atmosphere, minions | `boss` |
| `js/ui/touch.js` | Mobile touch controls | `touch*` |
| `js/ui/minimap.js` | Minimap rendering | `minimap` |
| `js/ui/hud.js` | HUD, scoreboard, kill feed, announcements | `hud` |
| `js/ui/buy.js` | Buy menu logic | `buy` |
| `js/ui/menu.js` | Menu flythrough, scene, fade | `menu` |
| `js/modes/competitive.js` | Match orchestration, rounds, map rotation | `modes.competitive` |
| `js/modes/survival.js` | Wave system, kill tracking | `modes.survival` |
| `js/modes/gungame.js` | Weapon ladder, level HUD | `modes.gungame` |
| `js/modes/deathmatch.js` | Kill target, respawns, boss-spawn trigger | `modes.deathmatch` |

## Lifecycle

**Frame (animate loop in `js/core/main.js`):** input → player update → enemies update → mode tick → effects/particles → render.

**Round / match:** the active mode owns its state machine. Modes start, tick, and end via the orchestrator in `main.js`. State lives on `GAME.modes.<mode>`, not on `GAME` root.

**Mode switching:** menu chooses mode → `main.js` calls mode init → mode owns everything until end → return to menu.

## State boundaries

- **`GAME` root** holds shared globals: `scene`, `camera`, `renderer`, `player`, `state`, `isMobile`.
- **`GAME.<system>`** (`bomb`, `boss`, `progression`, `hud`, `buy`, `menu`, etc.) holds system-owned state — modes call into these systems but don't reach into their internals.
- **`GAME.modes.<mode>`** holds mode-local state — match score, wave number, weapon-ladder index, etc. Other modes do not read this.

## Inter-system contracts

- **Modes ↔ bomb:** competitive plant/defuse goes through `GAME.bomb` API. Bomb timer continues even if planter dies.
- **Modes ↔ boss:** Deathmatch triggers boss spawn at a kill threshold. Boss owns its own loop but yields to mode for win/lose conditions.
- **Modes ↔ enemies:** modes spawn bots through `GAME.enemies` factories; respawn must set `_manager` on the bot (see `docs/gotchas.md` #3).
- **Anything ↔ HUD:** desktop and mobile HUDs are parallel trees. Updates must cover both — see `docs/gotchas.md` #4.
- **Weapons ↔ shared PBR cache:** weapon models reuse a cached PBR material set in `js/systems/weapons.js`. Don't create new materials; extend the cache.
- **Maps ↔ build helpers:** map files destructure helpers from `GAME._mapHelpers` and push their map definition onto `GAME._maps`. See `js/maps/dust.js` as the canonical example.
