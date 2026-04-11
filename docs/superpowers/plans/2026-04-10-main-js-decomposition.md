# main.js Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `js/main.js` (5,308 lines) into 13 focused modules across 5 directories, then reorganize all existing JS files into the same directory structure.

**Architecture:** Each extracted module is an IIFE attaching its API to `window.GAME`. Modules communicate only through `GAME.*` — no direct cross-module references. The game loop in `core/main.js` orchestrates by calling into each module's update functions.

**Tech Stack:** Three.js r160.1 (CDN global), Web Audio API, vanilla JS with IIFE module pattern, Vitest for testing.

**Spec:** `docs/superpowers/specs/2026-04-10-main-js-decomposition-design.md`

---

## File Structure

### New files to create (extracted from main.js):
- `js/core/renderer.js` — Three.js setup, post-processing (bloom, SSAO, sharpen), color grading, renderWithBloom, resizeBloom
- `js/effects/effects.js` — bullet holes, impact dust, footstep dust, blood splatter, damage indicators, screen shake, kill slow-mo, kill camera kick, hitmarker
- `js/effects/birds.js` — bird creation, spawning, update, kill
- `js/ui/minimap.js` — cacheMinimapWalls, updateMinimap
- `js/systems/progression.js` — rank/XP system, mission system, match history, kill streaks, perks
- `js/ui/hud.js` — updateHUD, updateScoreboard, addKillFeed, addRadioFeed, showAnnouncement, pause hint
- `js/ui/buy.js` — tryBuy, updateBuyMenu
- `js/systems/bomb.js` — bomb defusal state, bombsite markers, plant/defuse logic, updateBombLogic
- `js/systems/boss.js` — boss HUD, minion spawning/checking, boss atmosphere, boss grenades, isBossRound
- `js/modes/competitive.js` — startMatch, startRound, endRound, endMatch, map rotation
- `js/modes/survival.js` — startSurvival, startSurvivalWave, endSurvivalWave, endSurvival
- `js/modes/gungame.js` — startGunGame, advanceGunGameLevel, gunGamePlayerDied, respawns, endGunGame
- `js/modes/deathmatch.js` — startDeathmatch, dmPlayerDied, dmPlayerRespawn, respawns, endDeathmatch
- `js/ui/menu.js` — flythrough camera, _buildMenuScene, quick play, menu fade

### Existing files to move:
- `js/player.js` → `js/core/player.js`
- `js/sound.js` → `js/core/sound.js`
- `js/quality.js` → `js/core/quality.js`
- `js/fullscreen.js` → `js/core/fullscreen.js`
- `js/weapons.js` → `js/systems/weapons.js`
- `js/enemies.js` → `js/systems/enemies.js`
- `js/particles.js` → `js/effects/particles.js`
- `js/touch.js` → `js/ui/touch.js`
- `js/main.js` → `js/core/main.js`

### Test files to update:
- All `tests/unit/*.test.js` and `tests/integration/*.test.js` — update `loadModule()` paths
- `tests/setup.js` — update any module paths
- `tests/unit/main.test.js` — add loading of all new extracted modules before main.js

### Other files to update:
- `index.html` — update all `<script src>` paths
- `REQUIREMENTS.md` — update architecture section with new directory structure
- `CLAUDE.md` — update architecture table with new file paths

---

## Important: Extraction Pattern

Every extraction task follows the same pattern. The implementation agent should understand this upfront:

1. **Create the new file** as an IIFE that reads/writes through `GAME.*`
2. **Expose shared state on `GAME`** that the extracted module needs — add these assignments in `main.js` before the new script loads
3. **Remove the extracted code from `main.js`** — delete the functions and variables that moved
4. **Replace calls in `main.js`** — where `main.js` previously called a local function like `updateBirds(dt)`, it now calls `GAME.birds.update(dt)`
5. **Add the `<script>` tag** in `index.html` in the correct position (before main.js, after its dependencies)
6. **Run `npm test`** — fix any failures
7. **Commit**

For each task below, the agent must read the relevant sections of `main.js` at the specified line ranges to understand the exact code to extract. Line numbers are approximate and will shift as earlier tasks remove code.

---

### Task 1: Extract renderer.js

**Files:**
- Create: `js/core/renderer.js`
- Modify: `js/main.js`
- Modify: `index.html`

This is the largest single extraction (~530 lines). Extract all Three.js setup and post-processing from main.js.

- [ ] **Step 1: Read the renderer code in main.js**

Read `js/main.js` lines 140-680 to understand the full renderer section: Three.js setup (lines 140-176), post-processing bloom (lines 178-303), sharpen pass (lines 305-335), SSAO pass (lines 337-472), touch tap state (lines 474-484), post-process config exposure (lines 486-515), applyColorGrade (lines 517-525), warmUpShaders (lines 527-558), renderWithBloom (lines 560-660), resizeBloom (lines 662-679).

- [ ] **Step 2: Create js/core/renderer.js**

Create the directory `js/core/` and write `js/core/renderer.js` as an IIFE containing all the code from Step 1. The module should:

- Create `renderer`, `camera`, `scene` and expose them as `GAME._renderer`, `GAME.camera`, `GAME.scene`
- Keep all post-processing state (render targets, shader materials, bloom/SSAO/sharpen passes) as closure variables
- Expose `GAME.renderFrame` (the `renderWithBloom` function)
- Expose `GAME.resizeBloom` (so quality.js can call it)
- Expose `GAME._postProcess` (already done in current code)
- Expose `GAME.setSharpen`, `GAME.setSSAO` (already done)
- Expose `GAME._warmUpShaders` (already done)
- Expose `GAME.applyColorGrade` (new — currently closure function)
- Expose `GAME._contextLost` as a getter so game loop can check it
- The `renderWithBloom` function references `player` — change to read `GAME.player`
- The resize handler calls `resizeBloom` — this stays internal to the closure
- The context restored handler calls `GAME.quality.reapply()` and `resizeBloom()` — both work

Also move the touch tap state (`GAME.touchFiring`, `GAME.touchTap`, `GAME.touchFireButton`, `consumeTouchTap`) into this file since it was defined in this section, or leave it in main.js. Best to leave `consumeTouchTap` in main.js since it's called from the game loop and move only the GAME.touch* flags.

- [ ] **Step 3: Update main.js**

Remove lines 140-680 from main.js. Keep `consumeTouchTap` in main.js (it's called from the game loop). Replace local references:
- `renderer` → `GAME._renderer`
- `camera` → `GAME.camera`
- `scene` → `GAME.scene`
- `renderWithBloom()` → `GAME.renderFrame()`
- `resizeBloom()` → `GAME.resizeBloom()`
- `applyColorGrade()` → `GAME.applyColorGrade()`
- `_contextLost` → `GAME._contextLost`

Note: `renderer` is referenced extensively in main.js (pointer lock listener, init, etc). Do a thorough search for all occurrences.

- [ ] **Step 4: Add script tag to index.html**

Add `<script src="js/core/renderer.js"></script>` after the `particles.js` script tag and before `main.js`. The renderer has no game logic dependencies — it only needs THREE (global) and GAME (global).

```html
<script src="js/particles.js"></script>
<script src="js/core/renderer.js"></script>
<!-- ... -->
<script src="js/main.js"></script>
```

- [ ] **Step 5: Run tests and fix failures**

Run: `npm test`

Fix any failures caused by renderer.js not being loaded in test setup. Update `tests/unit/main.test.js` beforeAll to load `js/core/renderer.js` before `js/main.js`.

- [ ] **Step 6: Commit**

```
git add js/core/renderer.js js/main.js index.html tests/
git commit -m "refactor: extract renderer.js from main.js"
```

---

### Task 2: Extract effects.js

**Files:**
- Create: `js/effects/effects.js`
- Modify: `js/main.js`
- Modify: `index.html`

Extract visual effects: bullet holes (~lines 1203-1263), impact dust (~lines 1265-1322), footstep dust (~lines 1324-1376), damage indicators (~lines 1378-1409), kill slow-mo (~lines 1411-1419), kill camera kick (~lines 1421-1454), blood splatter (~lines 1456-1476), screen shake (~lines 987-990, 2496-2509), blood burst (~lines 1180-1201), hitmarker helpers (~lines 2449-2471).

- [ ] **Step 1: Read the effects code sections in main.js**

Read all the line ranges listed above to understand the full set of effects code.

- [ ] **Step 2: Create js/effects/ directory and effects.js**

Write `js/effects/effects.js` as an IIFE. The module should:

- Move all bullet hole, dust, footstep dust, damage indicator, blood splatter, screen shake, kill slow-mo, kill kick, blood burst, hitmarker, and damage number code
- Read `GAME.scene` to add meshes (for bullet holes, dust pools)
- Read `GAME.player` for position/pitch/yaw (damage indicators, screen shake, kill kick)
- Read `GAME.camera` for damage number projection
- Read `GAME.dom` for DOM elements (hitmarker, damageFlash, bloodSplatter, streakAnnounce, dmgContainer)
- Expose: `GAME.effects = { update(dt), init(scene) }`
- Expose existing GAME keys: `GAME.spawnBulletHole`, `GAME.spawnImpactDust`, `GAME.spawnFootstepDust`, `GAME.showDamageIndicator`, `GAME.triggerBloodSplatter`, `GAME.triggerScreenShake`, `GAME.triggerKillKick`, `GAME.killSlowMo`, `GAME.killKick`, `GAME._hitFeedback`, `GAME._bulletHoles`, `GAME.MAX_BULLET_HOLES`
- Expose: `GAME.effects.spawnBloodBurst`, `GAME.effects.showHitmarker`, `GAME.effects.showDamageNumber`, `GAME.effects.applyScreenShake`, `GAME.effects.applyKillKick`, `GAME.effects.updateBloodSplatter`, `GAME.effects.updateDamageIndicators`, `GAME.effects.updateBulletHoles`, `GAME.effects.updateImpactDust`, `GAME.effects.updateFootDust`

Note: `GAME.dom` must be exposed by main.js before effects.js loads. Add `GAME.dom = dom;` early in main.js.

- [ ] **Step 3: Update main.js**

Remove all effects code. Replace calls in the game loop:
- `updateBulletHoles(dt)` → `GAME.effects.updateBulletHoles(dt)`
- `updateImpactDust(dt)` → `GAME.effects.updateImpactDust(dt)`
- `updateFootDust(dt)` → `GAME.effects.updateFootDust(dt)`
- `updateDamageIndicators(dt)` → `GAME.effects.updateDamageIndicators(dt)`
- `updateBloodSplatter(dt)` → `GAME.effects.updateBloodSplatter(dt)`
- `applyScreenShake(dt)` → `GAME.effects.applyScreenShake(dt)`
- `applyKillKick(dt)` → `GAME.effects.applyKillKick(dt)`
- `showHitmarker(...)` → `GAME.effects.showHitmarker(...)`
- `showDamageNumber(...)` → `GAME.effects.showDamageNumber(...)`
- `spawnBloodBurst(...)` → `GAME.effects.spawnBloodBurst(...)`
- `triggerScreenShake(...)` → `GAME.triggerScreenShake(...)` (already on GAME)
- `triggerKillSlowMo()` → `GAME.effects.triggerKillSlowMo()`
- `triggerKillKick(...)` → `GAME.triggerKillKick(...)` (already on GAME)

Add `GAME.dom = dom;` near the top of main.js (after the dom object is built) so effects.js can access DOM elements.

- [ ] **Step 4: Add script tag to index.html**

Add after `renderer.js`, before `main.js`:
```html
<script src="js/core/renderer.js"></script>
<script src="js/effects/effects.js"></script>
```

- [ ] **Step 5: Run tests and fix failures**

Run: `npm test`

Update test setup to load `js/effects/effects.js` before `js/main.js`.

- [ ] **Step 6: Commit**

```
git add js/effects/effects.js js/main.js index.html tests/
git commit -m "refactor: extract effects.js from main.js"
```

---

### Task 3: Extract birds.js

**Files:**
- Create: `js/effects/birds.js`
- Modify: `js/main.js`
- Modify: `index.html`

Extract bird system (~lines 1478-1605): bird materials, createBird, spawnBirds, updateBirds, killBird.

- [ ] **Step 1: Read birds code in main.js**

Read the birds section (~lines 1478-1605) to understand all bird-related state and functions.

- [ ] **Step 2: Create js/effects/birds.js**

Write as an IIFE. The module should:

- Move all bird state (birds array, BIRD_COUNT, BIRD_MONEY, materials, feather geometry) and functions
- Read `GAME.scene` to add/remove bird meshes
- Read `GAME.camera` for bird facing
- Expose: `GAME.birds = { spawn(mapSize), update(dt), kill(bird, hitPoint), list: birds, BIRD_MONEY: 200 }`

- [ ] **Step 3: Update main.js**

Remove bird code. Replace calls:
- `spawnBirds(mapSize)` → `GAME.birds.spawn(mapSize)`
- `updateBirds(dt)` → `GAME.birds.update(dt)`
- `killBird(bird, hitPoint)` → `GAME.birds.kill(bird, hitPoint)`
- References to `birds` array → `GAME.birds.list`

- [ ] **Step 4: Add script tag to index.html**

Add after `effects.js`:
```html
<script src="js/effects/effects.js"></script>
<script src="js/effects/birds.js"></script>
```

- [ ] **Step 5: Run tests and fix failures**

Run: `npm test`

- [ ] **Step 6: Commit**

```
git add js/effects/birds.js js/main.js index.html tests/
git commit -m "refactor: extract birds.js from main.js"
```

---

### Task 4: Extract minimap.js

**Files:**
- Create: `js/ui/minimap.js`
- Modify: `js/main.js`
- Modify: `index.html`

Extract minimap (~lines 994-999 state, ~lines 2511-2602 functions): cacheMinimapWalls, updateMinimap.

- [ ] **Step 1: Read minimap code in main.js**

Read minimap state variables (~line 994-999) and functions (~lines 2511-2602).

- [ ] **Step 2: Create js/ui/ directory and minimap.js**

Write as an IIFE. The module should:

- Move minimap state (minimapCtx, minimapWallSegments, minimapFrame, minimapScale, minimapCenter) and functions
- Read `GAME.dom.minimapCanvas` for the canvas element
- Read `GAME.player` for player position/yaw
- Read `GAME._enemyManager` for enemy positions
- Read `GAME._gameState` for state checks
- Expose: `GAME.minimap = { cacheWalls(walls, mapSize), update() }`

- [ ] **Step 3: Update main.js**

Remove minimap code. Replace calls:
- `cacheMinimapWalls(walls, mapSize)` → `GAME.minimap.cacheWalls(walls, mapSize)`
- `updateMinimap()` → `GAME.minimap.update()`

- [ ] **Step 4: Add script tag to index.html**

Add after `birds.js`:
```html
<script src="js/effects/birds.js"></script>
<script src="js/ui/minimap.js"></script>
```

- [ ] **Step 5: Run tests and fix failures**

Run: `npm test`

- [ ] **Step 6: Commit**

```
git add js/ui/minimap.js js/main.js index.html tests/
git commit -m "refactor: extract minimap.js from main.js"
```

---

### Task 5: Extract progression.js

**Files:**
- Create: `js/systems/progression.js`
- Modify: `js/main.js`
- Modify: `index.html`

Extract rank/XP (~lines 1001-1077), missions (~lines 939-967 data, ~lines 1623-1775 functions), perks (~lines 968-985 data, ~lines 1777-1862 functions), kill streaks (~lines 934-937 data, ~lines 2473-2494), match history (~lines 3918-3997).

- [ ] **Step 1: Read all progression code in main.js**

Read all the line ranges listed above.

- [ ] **Step 2: Create js/systems/ directory and progression.js**

Write as an IIFE. The module should:

- Move all rank, XP, mission, perk, kill streak, and match history state and functions
- Read `GAME.dom` for DOM elements (rankDisplay, streakAnnounce, etc.)
- Read `GAME.Sound` for sound effects
- Expose: `GAME.progression = { ... }` with all public functions:
  - `getTotalXP()`, `setTotalXP(xp)`, `getRankForXP(xp)`, `calculateXP(...)`, `awardXP(xpEarned)`, `updateRankDisplay()`
  - `loadMissionState()`, `checkMissionRefresh()`, `trackMissionEvent(type, value)`, `updateMissionUI()`, `updateMissionOverlay()`
  - `hasPerk(id)`, `clearPerks()`, `offerPerkChoice()`, `selectPerk(perk)`, `getActivePerks()`
  - `checkKillStreak()`, `resetKillStreak()`, `getKillStreak()`
  - `saveMatchHistory(result, xpEarned)`, `getMatchHistory()`, `getStats()`, `renderHistory()`
  - `getSurvivalBest()`, `setSurvivalBest(mapName, wave)`, `getGunGameBest()`, `setGunGameBest(mapName, seconds)`, `getDMBest()`, `setDMBest(mapName, kills)`
  - `updateSurvivalBestDisplay()`, `updateGunGameBestDisplay()`, `updateDMBestDisplay()`
  - Perk data: `PERK_POOL`, `DIFF_XP_MULT`
- Keep `GAME.hasPerk` as alias (already exposed, used by other modules)
- Note: `trackMissionEvent` calls `showAnnouncement` and `updateRankDisplay` — these need to be available. `showAnnouncement` will be extracted later to hud.js, so for now keep a reference pattern: progression.js calls `GAME.hud.showAnnouncement(...)` if available, or falls back to a direct DOM write. Alternatively, progression.js can call `GAME.showAnnouncement` which main.js exposes temporarily until hud.js is extracted.
- Similarly, `selectPerk` calls `startRound` — this needs to go through `GAME.modes.competitive.startRound()` eventually. For now, expose as `GAME._startRound` from main.js.

- [ ] **Step 3: Update main.js**

Remove all progression code. Add temporary `GAME.showAnnouncement = showAnnouncement` and `GAME._startRound = startRound` before progression.js loads (these will be cleaned up when hud.js and competitive.js are extracted). Replace all calls to progression functions with `GAME.progression.*` equivalents.

- [ ] **Step 4: Add script tag to index.html**

Add after `minimap.js`:
```html
<script src="js/ui/minimap.js"></script>
<script src="js/systems/progression.js"></script>
```

- [ ] **Step 5: Run tests and fix failures**

Run: `npm test`

- [ ] **Step 6: Commit**

```
git add js/systems/progression.js js/main.js index.html tests/
git commit -m "refactor: extract progression.js from main.js"
```

---

### Task 6: Extract hud.js

**Files:**
- Create: `js/ui/hud.js`
- Modify: `js/main.js`
- Modify: `index.html`

Extract HUD updates (~lines 4754-4903): updateHUD, updateScoreboard, addKillFeed, addRadioFeed, showAnnouncement. Also updatePauseHint (~lines 4449-4458).

- [ ] **Step 1: Read HUD code in main.js**

Read lines ~4449-4458 (pause hint) and ~4754-4903 (HUD, scoreboard, kill feed, radio feed, announcement).

- [ ] **Step 2: Create js/ui/hud.js**

Write as an IIFE. The module should:

- Move all HUD update functions
- Read `GAME.dom` for all HUD DOM elements
- Read `GAME.player` for health/armor
- Read `GAME.weaponSystem` for weapon info
- Read `GAME._gameState`, `GAME._roundTimer`, `GAME._phaseTimer`, `GAME._scores`, `GAME._match`, `GAME._buyMenuOpen`, `GAME._teamMode`, `GAME._playerTeam`
- Expose: `GAME.hud = { update(), updateScoreboard(), addKillFeed(killer, victim, isBossKill), addRadioFeed(text), showAnnouncement(text, sub), updatePauseHint() }`
- Replace the temporary `GAME.showAnnouncement` with `GAME.hud.showAnnouncement`
- Update progression.js to call `GAME.hud.showAnnouncement` instead of `GAME.showAnnouncement`

- [ ] **Step 3: Update main.js**

Remove HUD code. Expose the shared state that hud.js needs:
- `GAME._roundTimer` (getter/setter or direct property)
- `GAME._phaseTimer`
- `GAME._scores = { player: playerScore, bots: botScore, roundNumber: roundNumber, totalRounds: TOTAL_ROUNDS }`
- `GAME._match = { kills: matchKills, deaths: matchDeaths, ... }`
- `GAME._buyMenuOpen` (getter/setter)
- `GAME._teamMode`, `GAME._teamObjective`, `GAME._playerTeam`

Replace calls: `updateHUD()` → `GAME.hud.update()`, etc.

- [ ] **Step 4: Add script tag to index.html**

Add after `minimap.js`, before `buy.js`:
```html
<script src="js/ui/minimap.js"></script>
<script src="js/ui/hud.js"></script>
```

- [ ] **Step 5: Run tests and fix failures**

Run: `npm test`

- [ ] **Step 6: Commit**

```
git add js/ui/hud.js js/main.js index.html tests/
git commit -m "refactor: extract hud.js from main.js"
```

---

### Task 7: Extract buy.js

**Files:**
- Create: `js/ui/buy.js`
- Modify: `js/main.js`
- Modify: `index.html`

Extract buy system (~lines 3997-4140): tryBuy, updateBuyMenu.

- [ ] **Step 1: Read buy system code in main.js**

Read lines ~3997-4140.

- [ ] **Step 2: Create js/ui/buy.js**

Write as an IIFE. The module should:

- Move tryBuy and updateBuyMenu
- Read `GAME.dom` for buy menu DOM elements
- Read `GAME.weaponSystem` for weapon ownership/switching
- Read `GAME.player` for money, armor
- Read `GAME._gameState`, `GAME._difficulty`
- Read `GAME.WEAPON_DEFS` for prices
- Expose: `GAME.buy = { tryBuy(item), updateMenu() }`
- Keep `GAME._buyWeapon = GAME.buy.tryBuy` alias (used by touch.js)

- [ ] **Step 3: Update main.js**

Remove buy code. Replace calls:
- `tryBuy(item)` → `GAME.buy.tryBuy(item)`
- `updateBuyMenu()` → `GAME.buy.updateMenu()`

- [ ] **Step 4: Add script tag to index.html**

Add after `hud.js`:
```html
<script src="js/ui/hud.js"></script>
<script src="js/ui/buy.js"></script>
```

- [ ] **Step 5: Run tests and fix failures**

Run: `npm test`

- [ ] **Step 6: Commit**

```
git add js/ui/buy.js js/main.js index.html tests/
git commit -m "refactor: extract buy.js from main.js"
```

---

### Task 8: Extract bomb.js

**Files:**
- Create: `js/systems/bomb.js`
- Modify: `js/main.js`
- Modify: `index.html`

Extract bomb defusal (~lines 719-734 state, ~lines 2809-3055 functions): bomb state variables, buildBombsiteMarkers, isNearBombsite, createPlantedBomb, createDroppedBomb, updateBombLogic.

- [ ] **Step 1: Read bomb code in main.js**

Read bomb state (~lines 719-734) and functions (~lines 2809-3055).

- [ ] **Step 2: Create js/systems/bomb.js**

Write as an IIFE. The module should:

- Move all bomb state and functions
- Read `GAME.scene`, `GAME.player`, `GAME._enemyManager`, `GAME.dom`, `GAME.Sound`
- Read `GAME._gameState`, `GAME._playerTeam`
- Expose: `GAME.bomb = { init(), reset(), buildMarkers(scene, sites), isNearSite(pos), createPlanted(pos), createDropped(pos), update(dt), getState() }`
- The `updateBombLogic` function calls `endRound` — route through `GAME.modes.competitive.endRound()` (or `GAME._endRound` temporarily)

- [ ] **Step 3: Update main.js**

Remove bomb code. Add `GAME._endRound = endRound` temporarily. Replace calls:
- `updateBombLogic(dt)` → `GAME.bomb.update(dt)`
- `buildBombsiteMarkers(scene, sites)` → `GAME.bomb.buildMarkers(scene, sites)`
- `isNearBombsite(pos)` → `GAME.bomb.isNearSite(pos)`
- etc.

- [ ] **Step 4: Add script tag to index.html**

Add after `progression.js`:
```html
<script src="js/systems/progression.js"></script>
<script src="js/systems/bomb.js"></script>
```

- [ ] **Step 5: Run tests and fix failures**

Run: `npm test`

- [ ] **Step 6: Commit**

```
git add js/systems/bomb.js js/main.js index.html tests/
git commit -m "refactor: extract bomb.js from main.js"
```

---

### Task 9: Extract boss.js

**Files:**
- Create: `js/systems/boss.js`
- Modify: `js/main.js`
- Modify: `index.html`

Extract boss fight logic (~lines 4459-4753): boss HUD, applyBossMinionTint, updateBossAtmosphere, showBossHealthBar, hideBossHealthBar, updateBossHealthBar, safeMinionSpawnPos, checkBossMinions, updateBossGrenades, isBossRound.

- [ ] **Step 1: Read boss code in main.js**

Read lines ~4459-4753.

- [ ] **Step 2: Create js/systems/boss.js**

Write as an IIFE. The module should:

- Move all boss state and functions
- Read `GAME.scene`, `GAME.player`, `GAME._enemyManager`, `GAME.dom`, `GAME.Sound`, `GAME.camera`
- Read `GAME._gameState`, `GAME._scores` (for round number)
- Expose: `GAME.boss = { isBossRound(n), checkMinions(dt), updateAtmosphere(dt), updateGrenades(dt), showHealthBar(boss), hideHealthBar(), updateHealthBar(), applyMinionTint(minion), active, heartbeat state }`

- [ ] **Step 3: Update main.js**

Remove boss code. Replace calls in game loop with `GAME.boss.*` equivalents.

- [ ] **Step 4: Add script tag to index.html**

Add after `bomb.js`:
```html
<script src="js/systems/bomb.js"></script>
<script src="js/systems/boss.js"></script>
```

- [ ] **Step 5: Run tests and fix failures**

Run: `npm test`

- [ ] **Step 6: Commit**

```
git add js/systems/boss.js js/main.js index.html tests/
git commit -m "refactor: extract boss.js from main.js"
```

---

### Task 10: Extract competitive.js

**Files:**
- Create: `js/modes/competitive.js`
- Modify: `js/main.js`
- Modify: `index.html`

Extract competitive mode (~lines 2603-2615 map rotation, ~lines 2616-3156 match/round management): maybeRotateMap, startMatch, startRound, endRound, endMatch.

- [ ] **Step 1: Read competitive mode code in main.js**

Read lines ~2603-3156.

- [ ] **Step 2: Create js/modes/ directory and competitive.js**

Write as an IIFE. The module should:

- Move startMatch, startRound, endRound, endMatch, maybeRotateMap
- Read/write many GAME state keys: `GAME._gameState`, `GAME.scene`, `GAME.player`, `GAME.weaponSystem`, `GAME._enemyManager`, `GAME.dom`, `GAME.Sound`, `GAME._scores`, `GAME._match`, `GAME._difficulty`, `GAME._teamMode`, `GAME._teamObjective`, `GAME._playerTeam`, `GAME._mapWalls`, `GAME._currentMapIndex`, `GAME._roundTimer`, `GAME._phaseTimer`, `GAME._buyMenuOpen`
- Call into other modules: `GAME.hud.showAnnouncement()`, `GAME.progression.*`, `GAME.bomb.*`, `GAME.boss.*`, `GAME.birds.spawn()`, `GAME.minimap.cacheWalls()`, `GAME.effects.*`
- Expose: `GAME.modes = GAME.modes || {}; GAME.modes.competitive = { startMatch(mapIdx), startRound(), endRound(playerWon), endMatch() }`
- Replace the temporary `GAME._startRound` and `GAME._endRound` with `GAME.modes.competitive.startRound` / `GAME.modes.competitive.endRound`
- Update bomb.js and progression.js to use the new paths

- [ ] **Step 3: Update main.js**

Remove competitive mode code. Replace calls. Remove temporary GAME._startRound / GAME._endRound aliases. Expose any remaining shared state that competitive.js needs.

- [ ] **Step 4: Add script tag to index.html**

Add after `boss.js`:
```html
<script src="js/systems/boss.js"></script>
<script src="js/modes/competitive.js"></script>
```

- [ ] **Step 5: Run tests and fix failures**

Run: `npm test`

- [ ] **Step 6: Commit**

```
git add js/modes/competitive.js js/main.js js/systems/bomb.js js/systems/progression.js index.html tests/
git commit -m "refactor: extract competitive.js from main.js"
```

---

### Task 11: Extract survival.js

**Files:**
- Create: `js/modes/survival.js`
- Modify: `js/main.js`
- Modify: `index.html`

Extract survival mode (~lines 1078-1098 state, ~lines 3700-3917): survival best scores, startSurvival, startSurvivalWave, endSurvivalWave, endSurvival, updateSurvivalBestDisplay.

- [ ] **Step 1: Read survival mode code in main.js**

Read lines ~1078-1098 and ~3700-3917.

- [ ] **Step 2: Create js/modes/survival.js**

Write as an IIFE. The module should:

- Move all survival state and functions
- Read/write GAME state keys similar to competitive.js
- Expose: `GAME.modes.survival = { start(mapIdx), startWave(), endWave(), end(), updateBestDisplay() }`

- [ ] **Step 3: Update main.js**

Remove survival code. Replace calls.

- [ ] **Step 4: Add script tag to index.html**

Add after `competitive.js`:
```html
<script src="js/modes/competitive.js"></script>
<script src="js/modes/survival.js"></script>
```

- [ ] **Step 5: Run tests and fix failures**

Run: `npm test`

- [ ] **Step 6: Commit**

```
git add js/modes/survival.js js/main.js index.html tests/
git commit -m "refactor: extract survival.js from main.js"
```

---

### Task 12: Extract gungame.js

**Files:**
- Create: `js/modes/gungame.js`
- Modify: `js/main.js`
- Modify: `index.html`

Extract gun game mode (~lines 1099-1157 state/config, ~lines 3158-3376): gun game level sequence, startGunGame, updateGunGameLevelHUD, advanceGunGameLevel, gunGamePlayerDied, gunGameQueueBotRespawn, updateGunGameRespawns, endGunGame, getGunGameBest, setGunGameBest, updateGunGameBestDisplay.

- [ ] **Step 1: Read gun game code in main.js**

Read lines ~1099-1157 and ~3158-3376.

- [ ] **Step 2: Create js/modes/gungame.js**

Write as an IIFE. Expose: `GAME.modes.gungame = { start(mapIdx), advanceLevel(), playerDied(), queueBotRespawn(enemy), updateRespawns(dt), end(), updateLevelHUD(), updateBestDisplay() }`

- [ ] **Step 3: Update main.js**

Remove gun game code. Replace calls.

- [ ] **Step 4: Add script tag to index.html**

Add after `survival.js`:
```html
<script src="js/modes/survival.js"></script>
<script src="js/modes/gungame.js"></script>
```

- [ ] **Step 5: Run tests and fix failures**

Run: `npm test`

- [ ] **Step 6: Commit**

```
git add js/modes/gungame.js js/main.js index.html tests/
git commit -m "refactor: extract gungame.js from main.js"
```

---

### Task 13: Extract deathmatch.js

**Files:**
- Create: `js/modes/deathmatch.js`
- Modify: `js/main.js`
- Modify: `index.html`

Extract deathmatch mode (~lines 1115-1170 state, ~lines 3377-3623): startDeathmatch, updateDMKillCounter, dmPlayerDied, dmPlayerRespawn, dmQueueBotRespawn, updateDMRespawns, endDeathmatch, getDMBest, setDMBest, updateDMBestDisplay.

- [ ] **Step 1: Read deathmatch code in main.js**

Read lines ~1115-1170 and ~3377-3623.

- [ ] **Step 2: Create js/modes/deathmatch.js**

Write as an IIFE. Expose: `GAME.modes.deathmatch = { start(mapIdx), updateKillCounter(), playerDied(), playerRespawn(), queueBotRespawn(enemy), updateRespawns(dt), end(), updateBestDisplay() }`

- [ ] **Step 3: Update main.js**

Remove deathmatch code. Replace calls.

- [ ] **Step 4: Add script tag to index.html**

Add after `gungame.js`:
```html
<script src="js/modes/gungame.js"></script>
<script src="js/modes/deathmatch.js"></script>
```

- [ ] **Step 5: Run tests and fix failures**

Run: `npm test`

- [ ] **Step 6: Commit**

```
git add js/modes/deathmatch.js js/main.js index.html tests/
git commit -m "refactor: extract deathmatch.js from main.js"
```

---

### Task 14: Extract menu.js

**Files:**
- Create: `js/ui/menu.js`
- Modify: `js/main.js`
- Modify: `index.html`

Extract menu system (~lines 744-884 flythrough, ~lines 885-932 quick play, ~lines 1892-2218 initModeGrid and all menu event handlers): flythrough camera paths, _buildMenuScene, quick play logic, _fadeMenuAndStart, _updateQuickPlayInfo, initModeGrid.

- [ ] **Step 1: Read menu code in main.js**

Read lines ~744-932 and ~1892-2218.

- [ ] **Step 2: Create js/ui/menu.js**

Write as an IIFE. The module should:

- Move flythrough camera paths and state, _buildMenuScene, quick play logic, initModeGrid, all menu event handlers
- Read `GAME.scene`, `GAME.camera`, `GAME._renderer`, `GAME.dom`, `GAME.Sound`
- Call into mode start functions: `GAME.modes.competitive.startMatch()`, `GAME.modes.survival.start()`, `GAME.modes.gungame.start()`, `GAME.modes.deathmatch.start()`
- Keep `GAME.updateMenuFlythrough` (already exposed, used by game loop)
- Expose: `GAME.menu = { buildScene(), init(), fadeAndStart(fn) }`

- [ ] **Step 3: Update main.js**

Remove menu code. Replace `initModeGrid()` call in init with `GAME.menu.init()`. Replace `_buildMenuScene()` with `GAME.menu.buildScene()`.

- [ ] **Step 4: Add script tag to index.html**

Add after `deathmatch.js`, before `main.js`:
```html
<script src="js/modes/deathmatch.js"></script>
<script src="js/ui/menu.js"></script>
<script src="js/main.js"></script>
```

- [ ] **Step 5: Run tests and fix failures**

Run: `npm test`

- [ ] **Step 6: Commit**

```
git add js/ui/menu.js js/main.js index.html tests/
git commit -m "refactor: extract menu.js from main.js"
```

---

### Task 15: Clean up main.js

**Files:**
- Modify: `js/main.js`

After all extractions, main.js should contain only: game state constants, DOM refs, game variables, init(), game loop, pointer lock, goToMenu(), startTour(), pauseGame/resumeGame, setupInput (keyboard/mouse bindings that dispatch to modules), and processShootResults/processExplosions/processFlashbang/onEnemyKilled (combat processing that touches many systems).

- [ ] **Step 1: Review remaining main.js**

Read the full file. Verify it's ~400-800 lines of core orchestration code. Identify any code that should have been extracted but wasn't (e.g. stale function definitions, orphaned variables).

- [ ] **Step 2: Clean up dead code**

Remove any variables, functions, or GAME.* temporary aliases that are no longer needed. Ensure all temporary `GAME._startRound`, `GAME._endRound` etc. are replaced with proper module paths.

- [ ] **Step 3: Verify all GAME.* state is properly exposed**

Check that all shared state listed in the spec is properly exposed. The game loop should read/write through GAME.* for any state that other modules need.

- [ ] **Step 4: Run tests and verify in browser**

Run: `npm test`

Open the game in browser and test:
- Start a competitive match, play a round, verify HUD works
- Open buy menu, buy a weapon
- Start survival mode, play a wave
- Start gun game, advance a level
- Start deathmatch, get a kill
- Verify birds, effects, minimap all work
- Test pause/resume

- [ ] **Step 5: Commit**

```
git add js/main.js
git commit -m "refactor: clean up main.js after extraction"
```

---

### Task 16: Move existing files into directories

**Files:**
- Move: `js/player.js` → `js/core/player.js`
- Move: `js/sound.js` → `js/core/sound.js`
- Move: `js/quality.js` → `js/core/quality.js`
- Move: `js/fullscreen.js` → `js/core/fullscreen.js`
- Move: `js/weapons.js` → `js/systems/weapons.js`
- Move: `js/enemies.js` → `js/systems/enemies.js`
- Move: `js/particles.js` → `js/effects/particles.js`
- Move: `js/touch.js` → `js/ui/touch.js`
- Move: `js/main.js` → `js/core/main.js`
- Modify: `index.html` — update all script paths
- Modify: All test files — update all `loadModule()` paths

- [ ] **Step 1: Move files using git mv**

```bash
git mv js/player.js js/core/player.js
git mv js/sound.js js/core/sound.js
git mv js/quality.js js/core/quality.js
git mv js/fullscreen.js js/core/fullscreen.js
git mv js/weapons.js js/systems/weapons.js
git mv js/enemies.js js/systems/enemies.js
git mv js/particles.js js/effects/particles.js
git mv js/touch.js js/ui/touch.js
git mv js/main.js js/core/main.js
```

- [ ] **Step 2: Update index.html script paths**

Update all `<script src>` tags to reflect new paths. The final loading order should match the spec exactly.

- [ ] **Step 3: Update all test file paths**

Update every `loadModule('js/...')` call in every test file to use the new paths. Search for all occurrences of old paths across:
- `tests/setup.js`
- `tests/unit/*.test.js`
- `tests/integration/*.test.js`

- [ ] **Step 4: Run tests**

Run: `npm test`

Fix any path-related failures.

- [ ] **Step 5: Verify in browser**

Open the game and do a quick smoke test — start a match, verify it loads and plays.

- [ ] **Step 6: Commit**

```
git add -A
git commit -m "refactor: reorganize JS files into directory structure"
```

---

### Task 17: Update documentation

**Files:**
- Modify: `REQUIREMENTS.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update REQUIREMENTS.md architecture section**

Update the "Core Architecture" and "Script files" section to reflect the new directory structure and loading order.

- [ ] **Step 2: Update CLAUDE.md architecture table**

Update the file/role table to list all new and moved files.

- [ ] **Step 3: Run tests one final time**

Run: `npm test`

Verify all tests pass.

- [ ] **Step 4: Commit**

```
git add REQUIREMENTS.md CLAUDE.md
git commit -m "docs: update architecture docs for new directory structure"
```
