// js/modes/deathmatch.js — Deathmatch mode management
// Extracted from main.js. Uses GAME.* getters/setters for shared state.
(function() {
  'use strict';

  GAME.modes = GAME.modes || {};

  // ── Deathmatch Constants & State ───────────────────────
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
  var _dmBossSpawned = false;
  var dmRespawnQueue = [];
  var dmPlayerDeadTimer = 0;
  var dmBuyMenuAutoOpened = false;
  var dmSpawnProtection = 0;

  // ── Start Deathmatch ───────────────────────────────────
  function startDeathmatch(mapIndex) {
    var dom = GAME.dom;
    var player = GAME.player;
    var weapons = GAME.weaponSystem;
    var enemyManager = GAME._enemyManager;

    localStorage.setItem('miniCS_lastMode', 'deathmatch');
    GAME._teamMode = false;
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.remove('tour-mode');
    dom.dmEnd.classList.remove('show');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';
    dom.waveCounter.classList.remove('show');
    dom.gungameLevel.classList.remove('show');

    dmMapIndex = mapIndex;
    GAME._selectedMapModeForMatch = GAME._selectedMapMode;
    dmKills = 0;
    _dmBossSpawned = false;
    dmDeaths = 0;
    GAME._bossXPBonus = 0;
    dmHeadshots = 0;
    dmTimer = DEATHMATCH_TIME_LIMIT;
    dmStartTime = performance.now() / 1000;
    dmRespawnQueue = [];
    dmPlayerDeadTimer = 0;
    dmBuyMenuAutoOpened = false;
    GAME._dmBuyMenuAutoOpened = false;
    dmSpawnProtection = 0;
    GAME.progression.resetKillStreak();
    GAME._matchKills = 0;
    GAME._matchDeaths = 0;
    GAME._matchHeadshots = 0;
    GAME._matchShotsFired = 0;
    GAME._matchShotsHit = 0;
    GAME._matchDamageDealt = 0;
    player.money = 800;

    GAME.setDifficulty(GAME._selectedDifficulty);

    // Build map
    var scene = GAME._newRoundScene();
    var renderer = GAME._renderer;

    var mapData = GAME.buildMap(scene, dmMapIndex, renderer);
    GAME.applyColorGrade();
    if (GAME.particles) {
      GAME.particles.dispose();
      GAME.particles.init(scene);
    }
    GAME._mapWalls = mapData.walls;
    dmLastMapData = mapData;

    var H = GAME._mapHelpers;
    if (mapData.spawnZones) {
      var zone = H.pickSpawnZone(mapData.spawnZones, null);
      player.reset(H.randomSpawnInZone(zone, mapData.walls));
    } else {
      player.reset(mapData.playerSpawn);
    }
    player.setWalls(mapData.walls);
    weapons.setWallsRef(mapData.walls);
    GAME._warmUpShaders();

    // Start with pistol + knife
    weapons.owned = { knife: true, pistol: true, smg: false, shotgun: false, rifle: false, awp: false, grenade: false, smoke: false, flash: false };
    weapons.grenadeCount = 0;
    weapons.smokeCount = 0;
    weapons.flashCount = 0;
    weapons.current = 'pistol';
    weapons.resetAmmo();
    weapons._createWeaponModel();

    // Spawn bots
    var diff = GAME.getDifficulty();
    var botCount = diff.botCount || 3;
    enemyManager.spawnBots(mapData.botSpawns, mapData.waypoints, mapData.walls, botCount, mapData.size, mapData.playerSpawn, 3);

    GAME.birds.spawn(mapData.size ? Math.max(mapData.size.x, mapData.size.z) : 50);
    weapons.setBirdsRef(GAME.birds.list);
    GAME.minimap.cacheWalls(mapData.walls, mapData.size);

    GAME._gameState = GAME._STATES.DEATHMATCH_ACTIVE;

    // HUD setup
    dom.moneyDisplay.style.display = '';
    dom.dmKillCounter.style.display = 'block';
    dom.dmRespawnTimer.style.display = 'none';
    dom.roundInfo.textContent = 'DEATHMATCH';
    updateDMKillCounter();

    GAME.hud.showAnnouncement('DEATHMATCH', 'First to ' + DEATHMATCH_KILL_TARGET + ' kills!');
    if (GAME.Sound) GAME.Sound.roundStart();
    if (GAME.Sound) { GAME.Sound.startAmbient(mapData.name); if (GAME.Sound.initReverb) GAME.Sound.initReverb(mapData.name); }
  }

  // ── Kill Counter HUD ───────────────────────────────────
  function updateDMKillCounter() {
    var dom = GAME.dom;
    var mins = Math.floor(dmTimer / 60);
    var secs = Math.floor(dmTimer % 60);
    dom.dmKillCounter.textContent = 'KILLS: ' + dmKills + ' / ' + DEATHMATCH_KILL_TARGET + '  |  ' + mins + ':' + (secs < 10 ? '0' : '') + secs;
    dom.roundTimer.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  // ── Player Died ────────────────────────────────────────
  function dmPlayerDied() {
    dmDeaths++;
    GAME._matchDeaths = GAME._matchDeaths + 1;
    dmPlayerDeadTimer = DEATHMATCH_PLAYER_RESPAWN_DELAY;
    dmBuyMenuAutoOpened = false;
    GAME._dmBuyMenuAutoOpened = false;
    GAME.dom.dmRespawnTimer.style.display = 'block';
  }

  // ── Player Respawn ─────────────────────────────────────
  function dmPlayerRespawn() {
    var dom = GAME.dom;
    var player = GAME.player;
    var weapons = GAME.weaponSystem;
    var enemyManager = GAME._enemyManager;
    var mapWalls = GAME._mapWalls;

    // Close buy menu that was auto-opened during death
    GAME._buyMenuOpen = false;
    dom.buyMenu.classList.remove('show');
    if (GAME.touch && GAME.touch._hideBuyCarousel) GAME.touch._hideBuyCarousel();
    dmBuyMenuAutoOpened = false;
    GAME._dmBuyMenuAutoOpened = false;

    // Pick spawn furthest from enemies
    var mapData = dmLastMapData;
    var H = GAME._mapHelpers;
    var bestSpawn;

    if (mapData.spawnZones) {
      var enemyPositions = [];
      for (var e = 0; e < enemyManager.enemies.length; e++) {
        var en = enemyManager.enemies[e];
        enemyPositions.push({ x: en.mesh.position.x, z: en.mesh.position.z });
      }
      var zone = H.pickSpawnZone(mapData.spawnZones, 'furthest', enemyPositions);
      bestSpawn = H.randomSpawnInZone(zone, mapWalls);
    } else {
      var spawns = mapData.botSpawns.concat([mapData.playerSpawn]);
      bestSpawn = mapData.playerSpawn;
      var bestMinDist = 0;
      for (var s = 0; s < spawns.length; s++) {
        var minDist = Infinity;
        for (var e2 = 0; e2 < enemyManager.enemies.length; e2++) {
          var en2 = enemyManager.enemies[e2];
          var dx = spawns[s].x - en2.mesh.position.x;
          var dz = spawns[s].z - en2.mesh.position.z;
          var d = dx * dx + dz * dz;
          if (d < minDist) minDist = d;
        }
        if (minDist > bestMinDist) {
          bestMinDist = minDist;
          bestSpawn = spawns[s];
        }
      }
    }

    player.reset(bestSpawn);
    player.setWalls(mapWalls);
    weapons.cleanupDroppedWeapon();
    weapons._createWeaponModel();
    weapons.resetAmmo();
    GAME.progression.resetKillStreak();
    dmSpawnProtection = 1.5;
    if (GAME.Sound && GAME.Sound.restoreAudio) GAME.Sound.restoreAudio();
    dmPlayerDeadTimer = 0;
    dom.dmRespawnTimer.style.display = 'none';
  }

  // ── Bot Respawn Queue ──────────────────────────────────
  function dmQueueBotRespawn(enemy) {
    var player = GAME.player;

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
    var spawnPos = GAME._findValidSpawn(bestWP.x, bestWP.z, GAME._mapWalls, { minOff: 1, maxOff: 4 });
    if (!spawnPos) spawnPos = { x: bestWP.x, z: bestWP.z };

    // Determine weapon based on elapsed time
    var elapsed = (performance.now() / 1000) - dmStartTime;
    var roundNum = elapsed < 60 ? 1 : elapsed < 120 ? 3 : 5;

    dmRespawnQueue.push({ timer: DEATHMATCH_BOT_RESPAWN_DELAY, spawnPos: spawnPos, id: enemy.id, roundNum: roundNum });
  }

  function updateDMRespawns(dt) {
    var enemyManager = GAME._enemyManager;
    var scene = GAME.scene;
    var mapWalls = GAME._mapWalls;

    for (var i = dmRespawnQueue.length - 1; i >= 0; i--) {
      dmRespawnQueue[i].timer -= dt;
      if (dmRespawnQueue[i].timer <= 0) {
        var entry = dmRespawnQueue.splice(i, 1)[0];
        var mapData = dmLastMapData;
        // Remove old dead enemy with same ID to prevent duplicate-ID hit resolution bugs
        for (var ri = enemyManager.enemies.length - 1; ri >= 0; ri--) {
          if (enemyManager.enemies[ri].id === entry.id && !enemyManager.enemies[ri].alive) {
            enemyManager.enemies.splice(ri, 1);
            break;
          }
        }
        var newEnemy = new GAME._Enemy(
          scene, entry.spawnPos, mapData.waypoints, mapWalls, entry.id, entry.roundNum
        );
        newEnemy._manager = enemyManager;
        enemyManager.enemies.push(newEnemy);
      }
    }
  }

  // ── End Deathmatch ─────────────────────────────────────
  function endDeathmatch() {
    var dom = GAME.dom;

    GAME.boss.hideHealthBar();
    _dmBossSpawned = false;
    if (GAME.Sound) GAME.Sound.stopAmbient();
    GAME._gameState = GAME._STATES.DEATHMATCH_END;
    dom.hud.style.display = 'none';
    dom.dmKillCounter.style.display = 'none';
    dom.dmRespawnTimer.style.display = 'none';
    if (document.pointerLockElement) document.exitPointerLock();

    var F = GAME.format;
    var elapsed = (performance.now() / 1000) - dmStartTime;
    var timeStr = F.time(elapsed);

    // Save best
    var mapKeys = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var mapKey = mapKeys[dmMapIndex] || 'dust';
    GAME.progression.setDMBest(mapKey, dmKills);

    // Mission tracking for DM end
    if (GAME._matchShotsFired > 0 && (GAME._matchShotsHit / GAME._matchShotsFired * 100) >= 60) {
      GAME.progression.trackMissionEvent('high_accuracy', 1);
    }

    var hitTarget = dmKills >= DEATHMATCH_KILL_TARGET;
    dom.dmResult.textContent = hitTarget ? 'VICTORY' : 'TIME UP';
    dom.dmResult.className = 'summary-result ' + (hitTarget ? 'amber' : 'neutral');
    dom.dmKillResult.textContent = dmKills + ' — ' + dmDeaths;

    var mapDisplayName = (GAME._maps && GAME._maps[dmMapIndex]) ? GAME._maps[dmMapIndex].name : '';
    dom.dmMeta.textContent = [timeStr, mapDisplayName, F.titleCase(GAME._selectedDifficulty)]
      .filter(function(s) { return s; }).join(' · ');

    // Stat tiles
    var kd = F.ratioPair(dmKills, dmDeaths);
    var accP = F.percentParts(GAME._matchShotsHit, GAME._matchShotsFired);
    dom.dmStatsDisplay.innerHTML =
      '<div class="summary-stat"><div class="summary-num">' + kd.primary +
        '<span class="summary-sub">' + kd.sub + '</span></div>' +
        '<div class="summary-lbl">Kills / Deaths</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + F.int(dmHeadshots) + '</div>' +
        '<div class="summary-lbl">Headshots</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + accP.value +
        '<span class="summary-unit">' + accP.unit + '</span></div>' +
        '<div class="summary-lbl">Accuracy</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + F.int(GAME._matchDamageDealt) + '</div>' +
        '<div class="summary-lbl">Damage Dealt</div></div>';

    // XP
    var diffMult = GAME.progression.DIFF_XP_MULT[GAME._selectedDifficulty] || 1;
    var kdBonus = Math.max(0, Math.floor((dmKills - dmDeaths) * 5));
    var rawXP = dmKills * 10 + dmHeadshots * 5 + kdBonus;
    var xpEarned = Math.round(rawXP * diffMult * 0.7) + GAME._bossXPBonus;
    var rankResult = GAME.progression.awardXP(xpEarned);
    var rank = rankResult.newRank;
    var next = GAME.progression.getNextRank(rank);
    var totalXP = GAME.progression.getTotalXP();
    var rankProgress = next ? Math.min(100, ((totalXP - rank.xp) / (next.xp - rank.xp)) * 100) : 100;

    dom.dmXpBreakdown.innerHTML =
      '<div class="summary-xp-top">' +
        '<div class="summary-xp-earned">+' + F.int(xpEarned) + ' XP</div>' +
        '<div class="summary-xp-rank">' + rank.name + (next ? ' · ' + F.int(totalXP) + ' / ' + F.int(next.xp) : ' · MAX') + '</div>' +
      '</div>' +
      '<div class="summary-xp-bar"><div class="summary-xp-fill" style="width:' + rankProgress + '%"></div></div>' +
      '<div class="summary-xp-break">' +
        '<span>Kills <b>+' + (dmKills * 10) + '</b></span>' +
        '<span>Headshots <b>+' + (dmHeadshots * 5) + '</b></span>' +
        '<span>Kill-Death Bonus <b>+' + kdBonus + '</b></span>' +
        '<span>Difficulty <b>×' + diffMult + '</b></span>' +
        '<span>Multiplier <b>×0.7</b></span>' +
      '</div>' +
      (rankResult.ranked_up ? '<div class="summary-xp-rankup">Ranked up: ' + rank.name + '!</div>' : '');

    dom.dmEnd.classList.add('show');
    GAME.progression.updateRankDisplay();

    if (dmKills >= DEATHMATCH_KILL_TARGET) {
      GAME.hud.showAnnouncement('VICTORY', dmKills + ' kills!');
    } else {
      GAME.hud.showAnnouncement('TIME UP', dmKills + ' kills');
    }
  }

  // ── Boss Spawn (called from onEnemyKilled in main.js) ──
  function spawnBoss() {
    var enemyManager = GAME._enemyManager;
    var mapWalls = GAME._mapWalls;

    _dmBossSpawned = true;
    var mapData = dmLastMapData;
    if (mapData) {
      var bossSpawn = mapData.botSpawns[0];
      var boss = enemyManager.spawnBoss(bossSpawn, mapData.waypoints, mapWalls);
      GAME.boss.showHealthBar(boss);
      GAME.boss.activateAtmosphere();
      GAME.hud.showAnnouncement('BOSS INCOMING', 'Kill the Boss to win!');
      if (GAME.Sound && GAME.Sound.bossSpawnAlert) GAME.Sound.bossSpawnAlert();
    }
  }

  // ── Update (called from game loop) ─────────────────────
  function update(dt) {
    var dom = GAME.dom;
    var player = GAME.player;

    // Timer countdown
    dmTimer -= dt;
    updateDMKillCounter();

    // Spawn protection countdown
    if (dmSpawnProtection > 0) dmSpawnProtection -= dt;

    // Player death handling with 3s respawn delay
    if (!player.alive && dmPlayerDeadTimer === 0) {
      dmPlayerDied();
    }
    if (dmPlayerDeadTimer > 0) {
      dmPlayerDeadTimer -= dt;
      dom.dmRespawnTimer.textContent = 'RESPAWN IN ' + Math.ceil(dmPlayerDeadTimer);

      // Auto-open buy menu after 1s death camera (timer crosses 2.0)
      if (!dmBuyMenuAutoOpened && dmPlayerDeadTimer <= 2.0) {
        dmBuyMenuAutoOpened = true;
        GAME._dmBuyMenuAutoOpened = true;
        GAME._buyMenuOpen = true;
        if (GAME.isMobile && GAME.touch && GAME.touch._showBuyCarousel) {
          GAME.touch._showBuyCarousel();
        } else {
          dom.buyMenu.classList.add('show');
          GAME.buy.updateMenu();
        }
      }

      if (dmPlayerDeadTimer <= 0) {
        dmPlayerDeadTimer = -1;
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

  // ── Expose API ─────────────────────────────────────────
  GAME.modes.deathmatch = {
    start: startDeathmatch,
    updateKillCounter: updateDMKillCounter,
    playerDied: dmPlayerDied,
    playerRespawn: dmPlayerRespawn,
    queueBotRespawn: dmQueueBotRespawn,
    updateRespawns: updateDMRespawns,
    end: endDeathmatch,
    spawnBoss: spawnBoss,
    update: update,
    addKill: function(isHeadshot) {
      dmKills++;
      if (isHeadshot) dmHeadshots++;
    },
    isBossSpawned: function() { return _dmBossSpawned; },
    hasReachedTarget: function() { return dmKills >= DEATHMATCH_KILL_TARGET; },
    getMapIndex: function() { return dmMapIndex; },
    getSpawnProtection: function() { return dmSpawnProtection; },
    KILL_TARGET: DEATHMATCH_KILL_TARGET
  };

})();
