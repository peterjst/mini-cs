# Deathmatch Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Deathmatch game mode with continuous bot respawns, player respawns after 3s death cam, economy during play, and a dedicated Arena map.

**Architecture:** Add `DEATHMATCH_ACTIVE` and `DEATHMATCH_END` states to the existing state machine in `main.js`. Follow the Gun Game pattern exactly — bot respawn queue, player respawn function, mode-specific HUD. Create `js/maps/arena.js` for the new map. Allow buy menu during `DEATHMATCH_ACTIVE`.

**Tech Stack:** Three.js r160.1 (CDN global), Web Audio API, vanilla JS IIFE modules on `window.GAME`

---

### Task 1: Add Deathmatch State Constants and Variables

**Files:**
- Modify: `js/main.js:8-11` (state constants)
- Modify: `js/main.js:~405-416` (after gun game variables)

**Step 1: Add state constants**

In `js/main.js` line 11, after `GUNGAME_END`, add the new states:

```javascript
// Line 11 currently ends with:
//   PAUSED = 'PAUSED', GUNGAME_ACTIVE = 'GUNGAME_ACTIVE', GUNGAME_END = 'GUNGAME_END';
// Change to:
      PAUSED = 'PAUSED', GUNGAME_ACTIVE = 'GUNGAME_ACTIVE', GUNGAME_END = 'GUNGAME_END',
      DEATHMATCH_ACTIVE = 'DEATHMATCH_ACTIVE', DEATHMATCH_END = 'DEATHMATCH_END';
```

**Step 2: Add mode variables**

After the gun game variables block (~line 416), add:

```javascript
  // ── Deathmatch Mode ────────────────────────────────────
  var DEATHMATCH_KILL_TARGET = 30;
  var DEATHMATCH_TIME_LIMIT = 300; // 5 minutes
  var DEATHMATCH_BOT_RESPAWN_DELAY = 3;
  var DEATHMATCH_PLAYER_RESPAWN_DELAY = 3;
  var dmKills = 0;
  var dmDeaths = 0;
  var dmHeadshots = 0;
  var dmStartTime = 0;
  var dmTimer = 0;
  var dmMapIndex = 0;
  var dmLastMapData = null;
  var dmRespawnQueue = [];
  var dmPlayerDeadTimer = 0; // counts down from 3 when player dies
  var dmSpawnProtection = 0; // 1.5s invulnerability after respawn
```

**Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat(deathmatch): add state constants and mode variables"
```

---

### Task 2: Add DOM References and HTML Elements

**Files:**
- Modify: `index.html:991-995` (menu buttons)
- Modify: `index.html:~1273` (after gungame-end, before pause overlay)
- Modify: `index.html:~896-925` (CSS for panels)
- Modify: `js/main.js:76-87` (dom refs)

**Step 1: Add Deathmatch button to menu**

In `index.html` line 991-995, add a Deathmatch button to the menu row:

```html
    <div class="menu-btn-row">
      <button class="menu-secondary-btn" id="survival-btn">Survival Mode</button>
      <button class="menu-secondary-btn" id="gungame-btn">Gun Game</button>
      <button class="menu-secondary-btn" id="deathmatch-btn">Deathmatch</button>
      <button class="menu-secondary-btn" id="tour-btn">Tour Maps</button>
      <button class="menu-secondary-btn" id="history-btn">Match History</button>
    </div>
```

**Step 2: Add Deathmatch map selection panel**

After the gungame-end div (~line 1273), before the pause overlay, add:

```html
<!-- Deathmatch: Map Selection Panel -->
<div id="deathmatch-panel">
  <h2>DEATHMATCH</h2>
  <div class="dm-best" id="dm-best-display"></div>
  <div class="dm-info">First to 30 kills or most kills in 5 minutes</div>
  <div class="tour-maps">
    <button class="tour-map-btn dm-map-btn" data-map="0">
      <div class="tour-map-name">Dust</div>
      <div class="tour-map-desc">Desert market &mdash; sandy ruins, market stalls</div>
    </button>
    <button class="tour-map-btn dm-map-btn" data-map="1">
      <div class="tour-map-name">Office</div>
      <div class="tour-map-desc">Modern interior &mdash; desks, server room, corridors</div>
    </button>
    <button class="tour-map-btn dm-map-btn" data-map="2">
      <div class="tour-map-name">Warehouse</div>
      <div class="tour-map-desc">Multi-floor industrial &mdash; containers, catwalks</div>
    </button>
    <button class="tour-map-btn dm-map-btn" data-map="3">
      <div class="tour-map-name">Bloodstrike</div>
      <div class="tour-map-desc">Classic aim arena &mdash; rectangular loop corridors</div>
    </button>
    <button class="tour-map-btn dm-map-btn" data-map="4">
      <div class="tour-map-name">Italy</div>
      <div class="tour-map-desc">Italian village &mdash; piazza, alleys, wine cellar</div>
    </button>
    <button class="tour-map-btn dm-map-btn" data-map="5">
      <div class="tour-map-name">Aztec</div>
      <div class="tour-map-desc">Jungle temple &mdash; river, bridge, stepped pyramid</div>
    </button>
  </div>
  <button class="history-close" id="dm-panel-close">Cancel</button>
</div>

<!-- Deathmatch End Screen -->
<div id="deathmatch-end">
  <h1>DEATHMATCH OVER</h1>
  <div class="dm-result" id="dm-kill-result"></div>
  <div class="dm-stats" id="dm-stats-display"></div>
  <div class="xp-breakdown" id="dm-xp-breakdown"></div>
  <div class="btn-row" style="margin-top:16px;">
    <button class="restart-btn" id="dm-restart-btn">PLAY AGAIN</button>
    <button class="menu-btn" id="dm-menu-btn">MAIN MENU</button>
  </div>
</div>

<!-- Deathmatch Kill Counter HUD -->
<div id="dm-kill-counter"></div>

<!-- Deathmatch Respawn Timer -->
<div id="dm-respawn-timer"></div>
```

**Step 3: Add CSS for deathmatch panels**

In the CSS section of `index.html`, after the gungame CSS (~line 925), add:

```css
  /* Deathmatch panel */
  #deathmatch-panel {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.92);
    display: none; align-items: center; justify-content: center; flex-direction: column;
    z-index: 30; color: #fff;
  }
  #deathmatch-panel.show { display: flex; }
  #deathmatch-panel h2 {
    font-size: 28px; letter-spacing: 6px; margin-bottom: 8px;
    color: rgba(244,67,54,0.8);
  }
  #deathmatch-panel .dm-best {
    font-size: 13px; color: rgba(255,255,255,0.35); margin-bottom: 8px;
    letter-spacing: 2px;
  }
  #deathmatch-panel .dm-info {
    font-size: 14px; color: rgba(255,255,255,0.5); margin-bottom: 24px;
  }

  /* Deathmatch end overlay */
  #deathmatch-end {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.9);
    display: none; align-items: center; justify-content: center; flex-direction: column;
    z-index: 25; color: #fff;
  }
  #deathmatch-end.show { display: flex; }
  #deathmatch-end h1 { font-size: 42px; margin-bottom: 8px; color: #f44336; }
  #deathmatch-end .dm-result { font-size: 22px; color: #ffca28; margin-bottom: 6px; }
  #deathmatch-end .dm-stats { font-size: 16px; color: #aaa; margin-bottom: 20px; }

  /* Deathmatch kill counter HUD */
  #dm-kill-counter {
    position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
    font-size: 18px; font-weight: bold; color: #f44336;
    text-shadow: 0 0 6px rgba(244,67,54,0.5);
    display: none; z-index: 10; letter-spacing: 2px;
  }

  /* Deathmatch respawn timer */
  #dm-respawn-timer {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    font-size: 48px; font-weight: bold; color: rgba(255,255,255,0.7);
    text-shadow: 0 0 20px rgba(0,0,0,0.8);
    display: none; z-index: 15; letter-spacing: 4px;
  }
```

**Step 4: Add DOM refs in main.js**

In `js/main.js`, after the gungameMenuBtn line (~line 85), add:

```javascript
    gungameLevel: document.getElementById('gungame-level'),
    dmBtn: document.getElementById('deathmatch-btn'),
    dmPanel: document.getElementById('deathmatch-panel'),
    dmPanelClose: document.getElementById('dm-panel-close'),
    dmBestDisplay: document.getElementById('dm-best-display'),
    dmEnd: document.getElementById('deathmatch-end'),
    dmKillResult: document.getElementById('dm-kill-result'),
    dmStatsDisplay: document.getElementById('dm-stats-display'),
    dmXpBreakdown: document.getElementById('dm-xp-breakdown'),
    dmRestartBtn: document.getElementById('dm-restart-btn'),
    dmMenuBtn: document.getElementById('dm-menu-btn'),
    dmKillCounter: document.getElementById('dm-kill-counter'),
    dmRespawnTimer: document.getElementById('dm-respawn-timer'),
  };
```

**Step 5: Commit**

```bash
git add index.html js/main.js
git commit -m "feat(deathmatch): add HTML panels, CSS, and DOM refs"
```

---

### Task 3: Add Best Score Tracking and Menu Event Listeners

**Files:**
- Modify: `js/main.js` (after gun game best score functions, ~line 440)
- Modify: `js/main.js` (after gungame event listeners, ~line 1008)

**Step 1: Add best score functions**

After `updateGunGameBestDisplay()` (~line 440), add:

```javascript
  // ── Deathmatch Best Scores ─────────────────────────────
  function getDMBest() {
    try { return JSON.parse(localStorage.getItem('miniCS_dmBest')) || {}; }
    catch(e) { return {}; }
  }
  function setDMBest(mapName, kills) {
    var best = getDMBest();
    if (!best[mapName] || kills > best[mapName]) {
      best[mapName] = kills;
      localStorage.setItem('miniCS_dmBest', JSON.stringify(best));
    }
  }
  function updateDMBestDisplay() {
    var best = getDMBest();
    var mapNames = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec'];
    var parts = [];
    for (var i = 0; i < mapNames.length; i++) {
      if (best[mapNames[i]]) parts.push(mapNames[i].charAt(0).toUpperCase() + mapNames[i].slice(1) + ': ' + best[mapNames[i]] + ' kills');
    }
    dom.dmBestDisplay.textContent = parts.length > 0 ? 'BEST — ' + parts.join(' | ') : 'No records yet';
  }
```

**Step 2: Add menu event listeners**

After the gungame menu event listeners (~line 1008), add:

```javascript
    // Deathmatch
    dom.dmBtn.addEventListener('click', function() {
      updateDMBestDisplay();
      dom.dmPanel.classList.add('show');
    });
    dom.dmPanelClose.addEventListener('click', function() {
      dom.dmPanel.classList.remove('show');
    });
    document.querySelectorAll('.dm-map-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        startDeathmatch(parseInt(btn.dataset.map));
      });
    });
    dom.dmRestartBtn.addEventListener('click', function() {
      dom.dmEnd.classList.remove('show');
      startDeathmatch(dmMapIndex);
    });
    dom.dmMenuBtn.addEventListener('click', function() {
      dom.dmEnd.classList.remove('show');
      goToMenu();
    });
```

**Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat(deathmatch): add best score tracking and menu listeners"
```

---

### Task 4: Implement startDeathmatch, Player Respawn, and Bot Respawn Functions

**Files:**
- Modify: `js/main.js` (after gun game functions, ~line 1470)

**Step 1: Add startDeathmatch function**

After `endGunGame()` (~line 1470), add:

```javascript
  // ── Deathmatch Mode ─────────────────────────────────────
  function startDeathmatch(mapIndex) {
    dom.dmPanel.classList.remove('show');
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.remove('tour-mode');
    dom.dmEnd.classList.remove('show');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';
    dom.waveCounter.classList.remove('show');
    dom.gungameLevel.classList.remove('show');

    dmMapIndex = mapIndex;
    dmKills = 0;
    dmDeaths = 0;
    dmHeadshots = 0;
    dmTimer = DEATHMATCH_TIME_LIMIT;
    dmStartTime = performance.now() / 1000;
    dmRespawnQueue = [];
    dmPlayerDeadTimer = 0;
    dmSpawnProtection = 0;
    killStreak = 0;
    matchKills = 0;
    matchDeaths = 0;
    matchHeadshots = 0;
    player.money = 800;

    GAME.setDifficulty(selectedDifficulty);

    // Build map
    scene = new THREE.Scene();
    weapons.scene = scene;
    enemyManager.scene = scene;
    scene.add(camera);

    var mapData = GAME.buildMap(scene, dmMapIndex, renderer);
    mapWalls = mapData.walls;
    dmLastMapData = mapData;

    player.reset(mapData.playerSpawn);
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);

    // Start with pistol + knife
    weapons.owned = { knife: true, pistol: true, shotgun: false, rifle: false, awp: false, grenade: false };
    weapons.grenadeCount = 0;
    weapons.current = 'pistol';
    weapons.resetAmmo();
    weapons._createWeaponModel();

    // Spawn bots — use difficulty-based count
    var diff = GAME.getDifficulty();
    var botCount = diff.botCount || 3;
    enemyManager.spawnBots(mapData.botSpawns, mapData.waypoints, mapWalls, botCount, mapData.size, mapData.playerSpawn, 3);

    spawnBirds(mapData.size ? Math.max(mapData.size.x, mapData.size.z) : 50);
    cacheMinimapWalls(mapWalls, mapData.size);

    gameState = DEATHMATCH_ACTIVE;

    // HUD setup
    dom.moneyDisplay.style.display = '';
    dom.dmKillCounter.style.display = 'block';
    dom.dmRespawnTimer.style.display = 'none';
    dom.roundInfo.textContent = 'DEATHMATCH';
    updateDMKillCounter();

    showAnnouncement('DEATHMATCH', 'First to ' + DEATHMATCH_KILL_TARGET + ' kills!');
    if (GAME.Sound) GAME.Sound.roundStart();
  }

  function updateDMKillCounter() {
    var mins = Math.floor(dmTimer / 60);
    var secs = Math.floor(dmTimer % 60);
    dom.dmKillCounter.textContent = 'KILLS: ' + dmKills + ' / ' + DEATHMATCH_KILL_TARGET + '  |  ' + mins + ':' + (secs < 10 ? '0' : '') + secs;
    dom.roundTimer.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  function dmPlayerDied() {
    dmDeaths++;
    matchDeaths++;
    dmPlayerDeadTimer = DEATHMATCH_PLAYER_RESPAWN_DELAY;
    dom.dmRespawnTimer.style.display = 'block';
  }

  function dmPlayerRespawn() {
    // Pick spawn furthest from enemies
    var mapData = dmLastMapData;
    var spawns = mapData.botSpawns.concat([mapData.playerSpawn]);
    var bestSpawn = mapData.playerSpawn;
    var bestMinDist = 0;

    for (var s = 0; s < spawns.length; s++) {
      var minDist = Infinity;
      for (var e = 0; e < enemyManager.enemies.length; e++) {
        var en = enemyManager.enemies[e];
        var dx = spawns[s].x - en.mesh.position.x;
        var dz = spawns[s].z - en.mesh.position.z;
        var d = dx * dx + dz * dz;
        if (d < minDist) minDist = d;
      }
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestSpawn = spawns[s];
      }
    }

    player.reset(bestSpawn);
    player.setWalls(mapWalls);
    weapons.cleanupDroppedWeapon();
    // Keep current weapons, just re-create model
    weapons._createWeaponModel();
    weapons.resetAmmo();
    killStreak = 0;
    dmSpawnProtection = 1.5;
    dom.dmRespawnTimer.style.display = 'none';
  }

  function dmQueueBotRespawn(enemy) {
    enemy.destroy();
    var mapData = dmLastMapData;
    var wps = mapData.waypoints;
    var px = player.position.x, pz = player.position.z;
    var bestWP = wps[0], bestDist = 0;
    for (var i = 0; i < wps.length; i++) {
      var dx = wps[i].x - px, dz = wps[i].z - pz;
      var d = dx * dx + dz * dz;
      if (d > bestDist) { bestDist = d; bestWP = wps[i]; }
    }
    var angle = Math.random() * Math.PI * 2;
    var offset = 1 + Math.random() * 3;
    var spawnPos = { x: bestWP.x + Math.cos(angle) * offset, z: bestWP.z + Math.sin(angle) * offset };

    // Determine weapon based on elapsed time
    var elapsed = (performance.now() / 1000) - dmStartTime;
    var roundNum = elapsed < 60 ? 1 : elapsed < 120 ? 3 : 5;

    dmRespawnQueue.push({ timer: DEATHMATCH_BOT_RESPAWN_DELAY, spawnPos: spawnPos, id: enemy.id, roundNum: roundNum });
  }

  function updateDMRespawns(dt) {
    for (var i = dmRespawnQueue.length - 1; i >= 0; i--) {
      dmRespawnQueue[i].timer -= dt;
      if (dmRespawnQueue[i].timer <= 0) {
        var entry = dmRespawnQueue.splice(i, 1)[0];
        var mapData = dmLastMapData;
        var newEnemy = new GAME._Enemy(
          scene, entry.spawnPos, mapData.waypoints, mapWalls, entry.id, entry.roundNum
        );
        enemyManager.enemies.push(newEnemy);
      }
    }
  }

  function endDeathmatch() {
    gameState = DEATHMATCH_END;
    dom.hud.style.display = 'none';
    dom.dmKillCounter.style.display = 'none';
    dom.dmRespawnTimer.style.display = 'none';
    if (document.pointerLockElement) document.exitPointerLock();

    var elapsed = (performance.now() / 1000) - dmStartTime;
    var mins = Math.floor(elapsed / 60);
    var secs = Math.floor(elapsed % 60);
    var timeStr = mins + ':' + (secs < 10 ? '0' : '') + secs;

    // Save best
    var mapNames = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec'];
    var mapName = mapNames[dmMapIndex] || 'dust';
    setDMBest(mapName, dmKills);

    var kd = dmDeaths > 0 ? (dmKills / dmDeaths).toFixed(2) : dmKills.toFixed(2);
    dom.dmKillResult.textContent = dmKills + ' Kills in ' + timeStr;
    dom.dmStatsDisplay.textContent = dmDeaths + ' Deaths | K/D: ' + kd + ' | ' + dmHeadshots + ' Headshots';

    // XP: kills * 10 + headshots * 5 + survival bonus * diffMult * 0.7
    var diffMult = DIFF_XP_MULT[selectedDifficulty] || 1;
    var kdBonus = Math.max(0, Math.floor((dmKills - dmDeaths) * 5));
    var rawXP = dmKills * 10 + dmHeadshots * 5 + kdBonus;
    var xpEarned = Math.round(rawXP * diffMult * 0.7);
    var rankResult = awardXP(xpEarned);

    dom.dmXpBreakdown.innerHTML =
      '<div class="xp-line"><span>Kills (' + dmKills + ')</span><span class="xp-val">+' + (dmKills * 10) + '</span></div>' +
      '<div class="xp-line"><span>Headshots (' + dmHeadshots + ')</span><span class="xp-val">+' + (dmHeadshots * 5) + '</span></div>' +
      '<div class="xp-line"><span>K/D Bonus</span><span class="xp-val">+' + kdBonus + '</span></div>' +
      '<div class="xp-line"><span>Difficulty (' + selectedDifficulty + ')</span><span class="xp-val">x' + diffMult + '</span></div>' +
      '<div class="xp-line"><span>DM multiplier</span><span class="xp-val">x0.7</span></div>' +
      '<div class="xp-total">Total: +' + xpEarned + ' XP</div>' +
      (rankResult.ranked_up ? '<div style="color:#ffca28;margin-top:4px;">RANKED UP: ' + rankResult.newRank.name + '!</div>' : '');

    dom.dmEnd.classList.add('show');
    updateRankDisplay();

    if (dmKills >= DEATHMATCH_KILL_TARGET) {
      showAnnouncement('VICTORY', dmKills + ' kills!');
    } else {
      showAnnouncement('TIME UP', dmKills + ' kills');
    }
  }
```

**Step 2: Commit**

```bash
git add js/main.js
git commit -m "feat(deathmatch): add start, respawn, and end functions"
```

---

### Task 5: Integrate into Game Loop, Pointer Lock, Pause, Buy System, and Kill Handling

**Files:**
- Modify: `js/main.js:609-610` (pointer lock)
- Modify: `js/main.js:856-859` (pause)
- Modify: `js/main.js:896-914` (key handling — buy menu during DM)
- Modify: `js/main.js:1746-1748` (tryBuy — allow during DM)
- Modify: `js/main.js:1866-1901` (onEnemyKilled — DM branch)
- Modify: `js/main.js:2147-2212` (game loop — DM branch)

**Step 1: Add DEATHMATCH_ACTIVE to pointer lock states**

`js/main.js` line 609-610, add to the condition:

```javascript
    if (gameState === PLAYING || gameState === BUY_PHASE || gameState === TOURING ||
        gameState === SURVIVAL_BUY || gameState === SURVIVAL_WAVE || gameState === GUNGAME_ACTIVE ||
        gameState === DEATHMATCH_ACTIVE) {
```

**Step 2: Add DEATHMATCH_ACTIVE to pausable states**

`js/main.js` line 856-859:

```javascript
    var pausable = (gameState === PLAYING || gameState === BUY_PHASE ||
                    gameState === ROUND_END || gameState === TOURING ||
                    gameState === SURVIVAL_BUY || gameState === SURVIVAL_WAVE ||
                    gameState === GUNGAME_ACTIVE || gameState === DEATHMATCH_ACTIVE);
```

**Step 3: Allow buy menu during DEATHMATCH_ACTIVE**

`js/main.js` line 896-904, modify the buy phase check:

```javascript
      var isBuyPhase = (gameState === BUY_PHASE || gameState === SURVIVAL_BUY || gameState === DEATHMATCH_ACTIVE);

      if (k === 'b' && isBuyPhase) {
```

**Step 4: Allow tryBuy during DEATHMATCH_ACTIVE**

`js/main.js` line 1746-1748:

```javascript
  function tryBuy(item) {
    var isBuyPhase = (gameState === BUY_PHASE || gameState === SURVIVAL_BUY || gameState === DEATHMATCH_ACTIVE);
    if (!isBuyPhase) return;
```

**Step 5: Add DM branch to onEnemyKilled**

`js/main.js` line 1874, add after the GUNGAME_ACTIVE block:

```javascript
    if (gameState === GUNGAME_ACTIVE) {
      // ... existing gun game code ...
    } else if (gameState === DEATHMATCH_ACTIVE) {
      dmKills++;
      if (isHeadshot) dmHeadshots++;
      var killBonus = hasPerk('scavenger') ? 450 : 300;
      player.money = Math.min(16000, player.money + killBonus);
      checkKillStreak();
      if (GAME.Sound) GAME.Sound.kill();
      // Queue bot respawn
      dmQueueBotRespawn(enemy);
      var idx = enemyManager.enemies.indexOf(enemy);
      if (idx >= 0) enemyManager.enemies.splice(idx, 1);
      // Check win
      if (dmKills >= DEATHMATCH_KILL_TARGET) {
        endDeathmatch();
      }
    } else {
      // ... existing default code ...
    }
```

**Step 6: Add DEATHMATCH_ACTIVE to main game loop**

`js/main.js` line 2147, add to the condition:

```javascript
    if (gameState === PLAYING || gameState === SURVIVAL_WAVE || gameState === GUNGAME_ACTIVE || gameState === DEATHMATCH_ACTIVE) {
```

Then in the end conditions section (~line 2207), add a DM branch:

```javascript
      } else if (gameState === GUNGAME_ACTIVE) {
        if (!player.alive) gunGamePlayerDied();
        updateGunGameRespawns(dt);
      } else if (gameState === DEATHMATCH_ACTIVE) {
        // Timer countdown
        dmTimer -= dt;
        updateDMKillCounter();

        // Spawn protection countdown
        if (dmSpawnProtection > 0) dmSpawnProtection -= dt;

        // Player death handling
        if (!player.alive && dmPlayerDeadTimer <= 0 && dmPlayerDeadTimer !== -1) {
          dmPlayerDied();
        }
        if (dmPlayerDeadTimer > 0) {
          dmPlayerDeadTimer -= dt;
          dom.dmRespawnTimer.textContent = 'RESPAWN IN ' + Math.ceil(dmPlayerDeadTimer);
          if (dmPlayerDeadTimer <= 0) {
            dmPlayerDeadTimer = -1; // sentinel: respawn done
            dmPlayerRespawn();
          }
        }

        // Bot respawn queue
        updateDMRespawns(dt);

        // Time up
        if (dmTimer <= 0) {
          endDeathmatch();
        }
      }
```

**Step 7: Handle spawn protection in player damage**

In the enemy AI damage section (~line 2189-2196), wrap with spawn protection check:

```javascript
      if (player.alive) {
        var dmg = enemyManager.update(dt, player.position, player.alive, now);
        if (dmg > 0 && dmSpawnProtection <= 0) {
          player.takeDamage(dmg);
          // ... rest of damage handling
```

Note: `dmSpawnProtection` is only > 0 during DEATHMATCH_ACTIVE, so this won't affect other modes.

**Step 8: Update goToMenu to clean up DM state**

In `goToMenu()` (~line 1472), add DM cleanup:

```javascript
    dom.dmEnd.classList.remove('show');
    dom.dmKillCounter.style.display = 'none';
    dom.dmRespawnTimer.style.display = 'none';
```

**Step 9: Commit**

```bash
git add js/main.js
git commit -m "feat(deathmatch): integrate into game loop, pause, buy system, kill handling"
```

---

### Task 6: Add Arena Map

**Files:**
- Create: `js/maps/arena.js`
- Modify: `index.html` (add script tag)

**Step 1: Create arena map file**

Create `js/maps/arena.js` following the existing map pattern. The Arena is a compact underground fighting pit (40x40) with:
- Central open area with raised platform
- 4 corridors from cardinal directions
- Perimeter loop connecting corridors
- Scattered cover (pillars, crates, low walls, barrels)

```javascript
// js/maps/arena.js — Arena map (Underground Fighting Pit)
(function() {
  'use strict';
  var H = GAME._mapHelpers;
  var B = H.B, D = H.D, Cyl = H.Cyl, CylW = H.CylW;
  var shadow = H.shadow, shadowRecv = H.shadowRecv;
  var addHangingLight = H.addHangingLight, addPointLight = H.addPointLight;

  GAME._maps.push({
    name: 'Arena',
    size: { x: 40, z: 40 },
    skyColor: 0x404850,
    fogColor: 0x353a40,
    fogDensity: 0.012,
    playerSpawn: { x: -14, z: -14 },
    botSpawns: [
      { x: 14, z: 14 },
      { x: 14, z: -14 },
      { x: -14, z: 14 },
      { x: 0, z: 16 },
      { x: 0, z: -16 },
      { x: 16, z: 0 },
      { x: -16, z: 0 },
      { x: 0, z: 0 }
    ],
    waypoints: [
      // Perimeter loop
      { x: -16, z: -16 }, { x: 0, z: -16 }, { x: 16, z: -16 },
      { x: 16, z: 0 }, { x: 16, z: 16 },
      { x: 0, z: 16 }, { x: -16, z: 16 }, { x: -16, z: 0 },
      // Corridor midpoints
      { x: 0, z: -8 }, { x: 8, z: 0 }, { x: 0, z: 8 }, { x: -8, z: 0 },
      // Center
      { x: 0, z: 0 }, { x: -4, z: -4 }, { x: 4, z: 4 }, { x: -4, z: 4 }, { x: 4, z: -4 }
    ],
    build: function(scene) {
      var walls = [];
      var concreteMat = H.mats.concrete;
      var darkMetalMat = H.mats.darkMetal;
      var metalMat = H.mats.metal;
      var woodMat = H.mats.wood;
      var crateMat = H.mats.crate;

      var WH = 5; // wall height
      var S = 20; // half-size

      // ── Floor ──
      var floorGeo = new THREE.BoxGeometry(40, 0.2, 40);
      var floorMesh = new THREE.Mesh(floorGeo, concreteMat);
      floorMesh.position.set(0, -0.1, 0);
      shadowRecv(floorMesh);
      scene.add(floorMesh);

      // ── Perimeter Walls ──
      // North
      B(scene, walls, 40, WH, 0.5, concreteMat, 0, WH/2, -S);
      // South
      B(scene, walls, 40, WH, 0.5, concreteMat, 0, WH/2, S);
      // East
      B(scene, walls, 0.5, WH, 40, concreteMat, S, WH/2, 0);
      // West
      B(scene, walls, 0.5, WH, 40, concreteMat, -S, WH/2, 0);

      // ── Central Platform ──
      B(scene, walls, 6, 1.5, 6, concreteMat, 0, 0.75, 0);
      // Metal grate decoration on top
      D(scene, 5.5, 0.05, 5.5, darkMetalMat, 0, 1.52, 0);

      // ── Corridor Walls (create 4 corridors from center to perimeter) ──
      // These are the inner walls that define the corridors
      // NW block
      B(scene, walls, 8, WH, 8, concreteMat, -10, WH/2, -10);
      // NE block
      B(scene, walls, 8, WH, 8, concreteMat, 10, WH/2, -10);
      // SW block
      B(scene, walls, 8, WH, 8, concreteMat, -10, WH/2, 10);
      // SE block
      B(scene, walls, 8, WH, 8, concreteMat, 10, WH/2, 10);

      // ── Cover: Concrete Pillars at corridor entrances ──
      CylW(scene, walls, 0.4, WH, 8, concreteMat, -3.5, WH/2, -6);
      CylW(scene, walls, 0.4, WH, 8, concreteMat, 3.5, WH/2, -6);
      CylW(scene, walls, 0.4, WH, 8, concreteMat, -3.5, WH/2, 6);
      CylW(scene, walls, 0.4, WH, 8, concreteMat, 3.5, WH/2, 6);
      CylW(scene, walls, 0.4, WH, 8, concreteMat, -6, WH/2, -3.5);
      CylW(scene, walls, 0.4, WH, 8, concreteMat, -6, WH/2, 3.5);
      CylW(scene, walls, 0.4, WH, 8, concreteMat, 6, WH/2, -3.5);
      CylW(scene, walls, 0.4, WH, 8, concreteMat, 6, WH/2, 3.5);

      // ── Cover: Low walls in central area ──
      B(scene, walls, 2.5, 1.2, 0.4, concreteMat, -3, 0.6, -2);
      B(scene, walls, 2.5, 1.2, 0.4, concreteMat, 3, 0.6, 2);
      B(scene, walls, 0.4, 1.2, 2.5, concreteMat, -2, 0.6, 3);
      B(scene, walls, 0.4, 1.2, 2.5, concreteMat, 2, 0.6, -3);

      // ── Cover: Crate clusters in corridors ──
      // North corridor
      B(scene, walls, 1.2, 1.2, 1.2, crateMat, -1.5, 0.6, -12);
      B(scene, walls, 0.8, 0.8, 0.8, crateMat, -1.5, 1.6, -12);
      B(scene, walls, 1.2, 1.2, 1.2, crateMat, 1.5, 0.6, -14);

      // South corridor
      B(scene, walls, 1.2, 1.2, 1.2, crateMat, 1.5, 0.6, 12);
      B(scene, walls, 0.8, 0.8, 0.8, crateMat, 1.5, 1.6, 12);
      B(scene, walls, 1.2, 1.2, 1.2, crateMat, -1.5, 0.6, 14);

      // East corridor
      B(scene, walls, 1.2, 1.2, 1.2, crateMat, 12, 0.6, -1.5);
      B(scene, walls, 0.8, 0.8, 0.8, crateMat, 12, 1.6, -1.5);
      B(scene, walls, 1.2, 1.2, 1.2, crateMat, 14, 0.6, 1.5);

      // West corridor
      B(scene, walls, 1.2, 1.2, 1.2, crateMat, -12, 0.6, 1.5);
      B(scene, walls, 0.8, 0.8, 0.8, crateMat, -12, 1.6, 1.5);
      B(scene, walls, 1.2, 1.2, 1.2, crateMat, -14, 0.6, -1.5);

      // ── Cover: Barrels in perimeter corners ──
      Cyl(scene, 0.35, 1.0, 8, darkMetalMat, -17, 0.5, -17);
      Cyl(scene, 0.35, 1.0, 8, darkMetalMat, -16.3, 0.5, -17);
      Cyl(scene, 0.35, 1.0, 8, darkMetalMat, 17, 0.5, 17);
      Cyl(scene, 0.35, 1.0, 8, darkMetalMat, 16.3, 0.5, 17);
      Cyl(scene, 0.35, 1.0, 8, metalMat, -17, 0.5, 17);
      Cyl(scene, 0.35, 1.0, 8, metalMat, 17, 0.5, -17);

      // ── Yellow hazard stripes on floor near corridors ──
      var hazardMat = new THREE.MeshStandardMaterial({ color: 0xccaa00, roughness: 0.9 });
      D(scene, 4, 0.02, 0.3, hazardMat, 0, 0.01, -5.8);
      D(scene, 4, 0.02, 0.3, hazardMat, 0, 0.01, 5.8);
      D(scene, 0.3, 0.02, 4, hazardMat, -5.8, 0.01, 0);
      D(scene, 0.3, 0.02, 4, hazardMat, 5.8, 0.01, 0);

      // ── Ceiling ──
      var ceilingMat = H.mats.ceiling || concreteMat;
      var ceil = new THREE.Mesh(new THREE.BoxGeometry(40, 0.3, 40), ceilingMat);
      ceil.position.set(0, WH, 0);
      shadowRecv(ceil);
      scene.add(ceil);

      // ── Lighting ──
      // Center spotlight
      addPointLight(scene, 0xffffff, 1.5, 20, 0, 4.5, 0);
      // Corridor lights
      addHangingLight(scene, 0, 4.2, -12, 0xf0f4ff);
      addHangingLight(scene, 0, 4.2, 12, 0xf0f4ff);
      addHangingLight(scene, -12, 4.2, 0, 0xf0f4ff);
      addHangingLight(scene, 12, 4.2, 0, 0xf0f4ff);
      // Corner lights
      addPointLight(scene, 0xffccaa, 0.8, 15, -16, 3, -16);
      addPointLight(scene, 0xffccaa, 0.8, 15, 16, 3, -16);
      addPointLight(scene, 0xffccaa, 0.8, 15, -16, 3, 16);
      addPointLight(scene, 0xffccaa, 0.8, 15, 16, 3, 16);
      // Fill lights
      addPointLight(scene, 0xe0e8f0, 0.6, 20, 0, 3, 0);

      return walls;
    }
  });
})();
```

**Step 2: Add script tag in index.html**

After the aztec.js script tag, add:

```html
<script src="js/maps/arena.js"></script>
```

**Step 3: Commit**

```bash
git add js/maps/arena.js index.html
git commit -m "feat(deathmatch): add Arena map"
```

---

### Task 7: Handle Spawn Protection Visual and DM Timer in HUD

**Files:**
- Modify: `js/main.js` (game loop, near damage flash)
- Modify: `index.html` (spawn protection CSS)

**Step 1: Add spawn protection visual flash**

In the game loop's DM branch, after spawn protection countdown, add a pulsing white border effect. In the DM-specific HUD update section:

```javascript
// In game loop DM branch, after dmSpawnProtection countdown:
if (gameState === DEATHMATCH_ACTIVE && dmSpawnProtection > 0) {
  dom.damageFlash.style.opacity = (Math.sin(performance.now() / 100) * 0.1 + 0.1);
  dom.damageFlash.style.background = 'radial-gradient(ellipse at center, transparent 60%, rgba(100,200,255,0.3) 100%)';
} else if (gameState === DEATHMATCH_ACTIVE) {
  dom.damageFlash.style.background = '';
}
```

**Step 2: Commit**

```bash
git add js/main.js index.html
git commit -m "feat(deathmatch): add spawn protection visual and HUD polish"
```

---

### Task 8: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

**Step 1: Add Deathmatch section**

Add a new section after the Survival Mode section documenting all DM features: states, respawn system, economy, scoring, Arena map, HUD elements.

**Step 2: Update state machine diagram**

Add DM states to the existing state machine diagram.

**Step 3: Update map list**

Add Arena to the map list and map count.

**Step 4: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: add deathmatch mode to REQUIREMENTS.md"
```

---

### Task 9: Test and Fix

**Step 1: Open game in browser and test**

- Click DEATHMATCH button → panel shows with map selection
- Select a map → game starts, HUD shows kill counter and timer
- Kill bots → counter increments, bots respawn after 3s
- Die → 3s death cam with respawn timer, then respawn with spawn protection
- Press B → buy menu works during gameplay
- Buy weapons → money deducted, weapons given
- Reach 30 kills or let timer expire → end screen shows with stats and XP
- PLAY AGAIN → restarts DM
- MAIN MENU → returns to menu
- Pause (P) → pauses correctly
- Kill streaks work
- Mission tracking works

**Step 2: Fix any issues found during testing**

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(deathmatch): complete deathmatch mode implementation"
```
