# main.js Decomposition — Design Spec

## Goal

Split `js/main.js` (5,308 lines) into focused, single-concern modules and reorganize all JS files into a directory structure. This is a pure structural refactor — zero behavior changes. The purpose is to reduce token cost in future conversations and improve maintainability by ensuring each file can be read and understood in isolation.

---

## Directory Structure

```
js/
  core/
    renderer.js       — Three.js setup, post-processing (bloom, SSAO, sharpen), color grading, render loop
    main.js           — game loop, init, state constants, shared state, pointer lock, goToMenu, startTour
    player.js         — first-person controller, collision, movement (existing, moved from js/)
    sound.js          — procedural Web Audio sound effects (existing, moved from js/)
    quality.js        — adaptive quality settings (existing, moved from js/)
    fullscreen.js     — fullscreen toggle (existing, moved from js/)
  maps/
    shared.js         — shared materials, texture utils, build helpers, map registry (existing)
    props.js          — procedural prop generators (existing)
    dust.js           — Dust map (existing)
    office.js         — Office map (existing)
    warehouse.js      — Warehouse map (existing)
    bloodstrike.js    — Bloodstrike map (existing)
    italy.js          — Italy map (existing)
    aztec.js          — Aztec map (existing)
    arena.js          — Arena map (existing)
  modes/
    competitive.js    — startMatch, startRound, endRound, endMatch, round end conditions, map rotation
    survival.js       — startSurvival, startSurvivalWave, endSurvivalWave, endSurvival
    gungame.js        — startGunGame, advanceGunGameLevel, gunGamePlayerDied, respawns, endGunGame
    deathmatch.js     — startDeathmatch, dmPlayerDied, dmPlayerRespawn, respawns, endDeathmatch
  ui/
    hud.js            — updateHUD, updateScoreboard, addKillFeed, addRadioFeed, showAnnouncement, pause hint, radio menu
    buy.js            — tryBuy, updateBuyMenu
    menu.js           — flythrough camera paths + update, _buildMenuScene, quick play logic, menu fade
    minimap.js        — cacheMinimapWalls, updateMinimap
    touch.js          — mobile touch controls (existing, moved from js/)
  effects/
    effects.js        — bullet holes, impact dust, footstep dust, blood splatter, damage indicators, screen shake, kill slow-mo, kill camera kick, hitmarker
    birds.js          — bird creation, spawning, update, kill
    particles.js      — GPU-instanced particle system (existing, moved from js/)
  systems/
    weapons.js        — weapon definitions, models, shooting, grenades (existing, moved from js/)
    enemies.js        — bot AI, humanoid models, behavior states (existing, moved from js/)
    bomb.js           — bomb defusal state, bombsite markers, plant/defuse logic, updateBombLogic
    boss.js           — boss HUD, minion spawning/checking, boss atmosphere, boss grenades, isBossRound
    progression.js    — rank/XP system, mission system, match history, kill streaks, perks
```

---

## Shared State and Inter-Module Communication

All modules communicate through the `GAME.*` namespace — the same pattern existing modules (`enemies.js`, `weapons.js`, etc.) already use. No module imports another directly.

### Shared state exposed on `GAME` (set by `core/main.js`):

Keys marked (existing) are already on `GAME` today. Keys marked (new) will be added by this refactor so extracted modules can access former closure variables.

| Key | Type | Description |
|-----|------|-------------|
| `GAME._gameState` | string | Current game state (existing) |
| `GAME.dom` | object | All DOM element references (new) |
| `GAME.scene` | THREE.Scene | Active Three.js scene (new — set by renderer.js) |
| `GAME.camera` | THREE.PerspectiveCamera | Active camera (new — set by renderer.js) |
| `GAME._renderer` | THREE.WebGLRenderer | Renderer instance (new — set by renderer.js) |
| `GAME.player` | object | Player instance (existing) |
| `GAME.weaponSystem` | object | Weapon system instance (existing) |
| `GAME._enemyManager` | object | Enemy manager instance (existing) |
| `GAME._mapWalls` | array | Current map collision walls (new) |
| `GAME._currentMapIndex` | number | Active map index (new) |
| `GAME._roundTimer` | number | Round countdown timer (new) |
| `GAME._phaseTimer` | number | Phase (buy/round-end) countdown timer (new) |
| `GAME._difficulty` | string | Selected difficulty (new) |
| `GAME._teamMode` | boolean | Team mode active (new) |
| `GAME._teamObjective` | string | 'elimination' or 'bomb' (new) |
| `GAME._playerTeam` | string | 'ct' or 't' (new) |
| `GAME._match` | object | { kills, deaths, headshots, roundsWon, shotsFired, shotsHit, damageDealt, nadesUsed } (new) |
| `GAME._scores` | object | { player, bots, roundNumber, totalRounds } (new) |
| `GAME._buyMenuOpen` | boolean | Whether buy menu is open (new) |

### Module registration pattern:

Each extracted module is an IIFE that attaches its public API to `GAME`:

```js
// Example: js/systems/boss.js
(function() {
  'use strict';
  var boss = {};
  boss.checkMinions = function(dt) { /* reads GAME.state, GAME.scene, GAME.player */ };
  boss.updateHealthBar = function() { /* reads GAME.dom */ };
  boss.isBossRound = function(n) { /* pure function */ };
  GAME.boss = boss;
})();
```

### Game loop dispatch (in `core/main.js`):

The game loop calls into each module's update function:

```js
GAME.effects.update(dt);
GAME.birds.update(dt);
GAME.hud.update();
if (GAME.boss.active) GAME.boss.updateHealthBar();
GAME.minimap.update();
GAME.renderFrame(); // calls renderWithBloom
```

---

## Script Loading Order in index.html

Modules load in dependency order — providers before consumers:

```html
<!-- Maps -->
<script src="js/maps/shared.js"></script>
<script src="js/maps/props.js"></script>
<script src="js/maps/dust.js"></script>
<script src="js/maps/office.js"></script>
<script src="js/maps/warehouse.js"></script>
<script src="js/maps/bloodstrike.js"></script>
<script src="js/maps/italy.js"></script>
<script src="js/maps/aztec.js"></script>
<script src="js/maps/arena.js"></script>

<!-- Core -->
<script src="js/core/player.js"></script>
<script src="js/core/sound.js"></script>
<script src="js/systems/weapons.js"></script>
<script src="js/systems/enemies.js"></script>
<script src="js/effects/particles.js"></script>
<script src="js/core/renderer.js"></script>

<!-- Effects (need scene) -->
<script src="js/effects/effects.js"></script>
<script src="js/effects/birds.js"></script>

<!-- UI -->
<script src="js/ui/minimap.js"></script>
<script src="js/ui/hud.js"></script>
<script src="js/ui/buy.js"></script>

<!-- Systems -->
<script src="js/systems/progression.js"></script>
<script src="js/systems/bomb.js"></script>
<script src="js/systems/boss.js"></script>

<!-- Game Modes -->
<script src="js/modes/competitive.js"></script>
<script src="js/modes/survival.js"></script>
<script src="js/modes/gungame.js"></script>
<script src="js/modes/deathmatch.js"></script>

<!-- Menu (needs renderer + scene) -->
<script src="js/ui/menu.js"></script>

<!-- Main (orchestrator — last before utilities) -->
<script src="js/core/main.js"></script>

<!-- Utilities -->
<script src="js/core/quality.js"></script>
<script src="js/core/fullscreen.js"></script>
<script src="js/ui/touch.js"></script>
```

---

## Migration Strategy

### Approach: one module at a time, test after each step

Each extraction is a small, testable change. Run `npm test` and verify the game in browser after each step.

### Extraction order (least-coupled to most-coupled):

1. `core/renderer.js` — Three.js setup, post-processing. No game logic dependencies.
2. `effects/effects.js` + `effects/birds.js` — only need scene for mesh pools.
3. `ui/minimap.js` — self-contained canvas drawing.
4. `systems/progression.js` — only localStorage + DOM.
5. `ui/hud.js` — reads state, writes DOM.
6. `ui/buy.js` — reads state, writes DOM.
7. `systems/bomb.js` — reads/writes game state.
8. `systems/boss.js` — reads/writes game state.
9. `modes/competitive.js` — most coupled, depends on many systems.
10. `modes/survival.js`
11. `modes/gungame.js`
12. `modes/deathmatch.js`
13. `ui/menu.js` — needs renderer + scene for flythrough.
14. Slim down `core/main.js` to game loop + init (~400 lines).
15. Move existing files into directories (path-only changes).

### After each extraction step:
- Run `npm test` — fix any failures
- Open game in browser — verify golden path works
- Commit

---

## Test Impact

### Path updates for existing tests:

Tests use `loadModule('js/weapons.js')` style paths. After files move, these paths update (e.g. `loadModule('js/systems/weapons.js')`). Affected test files:

- `tests/unit/weapons.test.js`
- `tests/unit/enemies.test.js`
- `tests/unit/player.test.js`
- `tests/unit/sound.test.js`
- `tests/unit/particles.test.js`
- `tests/unit/quality.test.js`
- `tests/unit/fullscreen.test.js`
- `tests/unit/touch.test.js`
- `tests/unit/main.test.js`
- `tests/unit/maps.test.js`
- `tests/unit/props.test.js`
- `tests/integration/*.test.js`
- `tests/setup.js`

### `tests/unit/main.test.js` changes:

The `beforeAll` block must load all new extracted files in the correct order before `js/core/main.js`.

### New test files for extracted modules:

Each extracted module gets its own test file so it can be tested without loading the entire game:

- `tests/unit/renderer.test.js`
- `tests/unit/effects.test.js`
- `tests/unit/birds.test.js`
- `tests/unit/minimap.test.js`
- `tests/unit/hud.test.js`
- `tests/unit/buy.test.js`
- `tests/unit/bomb.test.js`
- `tests/unit/boss.test.js`
- `tests/unit/progression.test.js`
- `tests/unit/competitive.test.js`
- `tests/unit/survival.test.js`
- `tests/unit/gungame.test.js`
- `tests/unit/deathmatch.test.js`
- `tests/unit/menu.test.js`

### No test logic changes:

Existing test assertions stay exactly the same. Only `loadModule()` paths change.

---

## Constraints

- **Pure structural refactor** — zero behavior changes. No bug fixes, no improvements, no "while we're here" cleanups.
- **All modules use IIFE pattern** — attach to `window.GAME`, same as existing code.
- **No ES module imports** — Three.js is a CDN global, all inter-module communication goes through `GAME.*`.
- **REQUIREMENTS.md update** — update the architecture section to reflect the new directory structure. No other REQUIREMENTS.md changes since behavior is unchanged.
