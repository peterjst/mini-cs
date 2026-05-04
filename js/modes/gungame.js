// js/modes/gungame.js — Gun Game mode management
// Extracted from main.js. Uses GAME.* getters/setters for shared state.
(function() {
  'use strict';

  GAME.modes = GAME.modes || {};

  // ── Gun Game Constants & State ─────────────────────────
  var GUNGAME_WEAPONS = ['knife', 'pistol', 'shotgun', 'rifle', 'awp', 'knife'];
  var GUNGAME_NAMES = ['Knife', 'Pistol', 'Shotgun', 'AK-47', 'AWP', 'Knife (Final)'];
  var GUNGAME_BOT_COUNT = 4;
  var GUNGAME_BOT_RESPAWN_DELAY = 3;
  var gungameLevel = 0;
  var _gungameBossSpawned = false;
  var gungameKills = 0;
  var gungameDeaths = 0;
  var gungameHeadshots = 0;
  var gungameStartTime = 0;
  var gungameMapIndex = 0;
  var gungameLastMapData = null;
  var gungameRespawnQueue = [];

  // Initialize GAME._gungameStartTime so it's always a number
  GAME._gungameStartTime = 0;

  // ── Start Gun Game ─────────────────────────────────────
  function startGunGame(mapIndex) {
    var dom = GAME.dom;
    var player = GAME.player;
    var weapons = GAME.weaponSystem;
    var enemyManager = GAME._enemyManager;

    localStorage.setItem('miniCS_lastMode', 'gungame');
    GAME._teamMode = false;
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.remove('tour-mode');
    dom.gungameEnd.classList.remove('show');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';
    dom.waveCounter.classList.remove('show');

    gungameMapIndex = mapIndex;
    GAME._selectedMapModeForMatch = GAME._selectedMapMode;
    gungameLevel = 0;
    _gungameBossSpawned = false;
    gungameKills = 0;
    gungameDeaths = 0;
    gungameHeadshots = 0;
    GAME._matchKills = 0;
    GAME._matchHeadshots = 0;
    GAME._matchShotsFired = 0;
    GAME._matchShotsHit = 0;
    GAME._matchDamageDealt = 0;
    gungameStartTime = performance.now() / 1000;
    GAME._gungameStartTime = gungameStartTime;
    gungameRespawnQueue = [];
    GAME._bossXPBonus = 0;
    GAME.progression.resetKillStreak();
    player.money = 0;

    GAME.setDifficulty(GAME._selectedDifficulty);

    // Build map
    var scene = GAME._newRoundScene();
    var renderer = GAME._renderer;

    var mapData = GAME.buildMap(scene, gungameMapIndex, renderer);
    GAME.applyColorGrade();
    if (GAME.particles) {
      GAME.particles.dispose();
      GAME.particles.init(scene);
    }
    GAME._mapWalls = mapData.walls;
    gungameLastMapData = mapData;

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

    // Force knife as starting weapon
    weapons.forceWeapon('knife');

    // Spawn bots
    var botCount = GUNGAME_BOT_COUNT;
    enemyManager.spawnBots(mapData.botSpawns, mapData.waypoints, mapData.walls, botCount, mapData.size, mapData.playerSpawn, 3);

    GAME.birds.spawn(mapData.size ? Math.max(mapData.size.x, mapData.size.z) : 50);
    weapons.setBirdsRef(GAME.birds.list);
    GAME.minimap.cacheWalls(mapData.walls, mapData.size);

    GAME._gameState = GAME._STATES.GUNGAME_ACTIVE;

    // HUD setup for gun game
    dom.moneyDisplay.style.display = 'none';
    dom.gungameLevel.classList.add('show');
    dom.roundInfo.textContent = 'GUN GAME';
    updateGunGameLevelHUD();

    GAME.hud.showAnnouncement('GUN GAME', 'Get a kill with each weapon!');
    if (GAME.Sound) GAME.Sound.roundStart();
    if (GAME.Sound) { GAME.Sound.startAmbient(mapData.name); if (GAME.Sound.initReverb) GAME.Sound.initReverb(mapData.name); }
  }

  // ── Level HUD ──────────────────────────────────────────
  function updateGunGameLevelHUD() {
    GAME.dom.gungameLevel.textContent = 'LEVEL ' + (gungameLevel + 1) + '/6 \u2014 ' + GUNGAME_NAMES[gungameLevel];
  }

  // ── Advance Level ──────────────────────────────────────
  function advanceGunGameLevel() {
    var weapons = GAME.weaponSystem;
    var enemyManager = GAME._enemyManager;

    gungameLevel++;
    if (gungameLevel >= GUNGAME_WEAPONS.length) {
      // Boss phase — spawn boss, unlock all weapons
      if (!_gungameBossSpawned) {
        _gungameBossSpawned = true;
        var mapData = gungameLastMapData;
        var mapWalls = GAME._mapWalls;
        var bossSpawn = mapData.botSpawns[0];
        var boss = enemyManager.spawnBoss(bossSpawn, mapData.waypoints, mapWalls, { noMinions: true });
        GAME.boss.showHealthBar(boss);
        GAME.boss.activateAtmosphere();
        GAME.hud.showAnnouncement('BOSS FIGHT', 'All weapons unlocked!');
        GAME.dom.gungameLevel.textContent = 'BOSS FIGHT \u2014 All weapons unlocked!';
        if (GAME.Sound && GAME.Sound.bossSpawnAlert) GAME.Sound.bossSpawnAlert();
        // Unlock all weapons
        weapons.owned = { knife: true, pistol: true, smg: true, shotgun: true, rifle: true, awp: true, grenade: true, smoke: true, flash: true };
        weapons.resetAmmo();
        gungameLevel = GUNGAME_WEAPONS.length - 1;
      }
      return;
    }
    var weaponId = GUNGAME_WEAPONS[gungameLevel];
    weapons.forceWeapon(weaponId);
    updateGunGameLevelHUD();

    if (gungameLevel === GUNGAME_WEAPONS.length - 1) {
      GAME.hud.showAnnouncement('FINAL WEAPON', 'Get a knife kill to win!');
    } else {
      GAME.hud.showAnnouncement('LEVEL ' + (gungameLevel + 1), GUNGAME_NAMES[gungameLevel]);
    }
    if (GAME.Sound) GAME.Sound.switchWeapon();
  }

  // ── Player Died ────────────────────────────────────────
  function gunGamePlayerDied() {
    var player = GAME.player;
    var weapons = GAME.weaponSystem;

    gungameDeaths++;
    var mapData = gungameLastMapData;
    var H = GAME._mapHelpers;
    if (mapData.spawnZones) {
      var zone = H.pickSpawnZone(mapData.spawnZones, null);
      player.reset(H.randomSpawnInZone(zone, GAME._mapWalls));
    } else {
      player.reset(mapData.playerSpawn);
    }
    player.armor = 0;
    player.helmet = false;
    player.setWalls(GAME._mapWalls);
    weapons.cleanupDroppedWeapon();
    weapons.forceWeapon(GUNGAME_WEAPONS[gungameLevel]);
    GAME.progression.resetKillStreak();
  }

  // ── Bot Respawn Queue ──────────────────────────────────
  function gunGameQueueBotRespawn(enemy) {
    var player = GAME.player;

    enemy.destroy();
    var mapData = gungameLastMapData;
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
    gungameRespawnQueue.push({ timer: GUNGAME_BOT_RESPAWN_DELAY, spawnPos: spawnPos, id: enemy.id });
  }

  function updateGunGameRespawns(dt) {
    var enemyManager = GAME._enemyManager;
    var scene = GAME.scene;
    var mapWalls = GAME._mapWalls;

    for (var i = gungameRespawnQueue.length - 1; i >= 0; i--) {
      gungameRespawnQueue[i].timer -= dt;
      if (gungameRespawnQueue[i].timer <= 0) {
        var entry = gungameRespawnQueue.splice(i, 1)[0];
        var mapData = gungameLastMapData;
        // Remove old dead enemy with same ID to prevent duplicate-ID hit resolution bugs
        for (var ri = enemyManager.enemies.length - 1; ri >= 0; ri--) {
          if (enemyManager.enemies[ri].id === entry.id && !enemyManager.enemies[ri].alive) {
            enemyManager.enemies.splice(ri, 1);
            break;
          }
        }
        var newEnemy = new GAME._Enemy(
          scene, entry.spawnPos, mapData.waypoints, mapWalls, entry.id, 3
        );
        newEnemy._manager = enemyManager;
        enemyManager.enemies.push(newEnemy);
      }
    }
  }

  // ── End Gun Game ───────────────────────────────────────
  function endGunGame() {
    var dom = GAME.dom;

    GAME.boss.hideHealthBar();
    _gungameBossSpawned = false;
    if (GAME.Sound) GAME.Sound.stopAmbient();
    GAME._gameState = GAME._STATES.GUNGAME_END;
    dom.hud.style.display = 'none';
    dom.moneyDisplay.style.display = '';
    dom.gungameLevel.classList.remove('show');
    if (document.pointerLockElement) document.exitPointerLock();

    var F = GAME.format;
    var elapsed = (performance.now() / 1000) - gungameStartTime;
    var timeStr = F.time(elapsed);

    // Save best time
    var mapNamesKeys = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var mapKey = mapNamesKeys[gungameMapIndex] || 'dust';
    GAME.progression.setGunGameBest(mapKey, elapsed);

    dom.gungameTimeResult.textContent = timeStr;
    var mapDisplayName = (GAME._maps && GAME._maps[gungameMapIndex]) ? GAME._maps[gungameMapIndex].name : '';
    dom.gungameMeta.textContent = [mapDisplayName, F.titleCase(GAME._selectedDifficulty)]
      .filter(function(s) { return s; }).join(' · ');

    // Stat tiles (Kills replaces "Levels Cleared" — spec correction: Gun Game always ends at 6/6 so it carries no info)
    var accP = F.percentParts(GAME._matchShotsHit, GAME._matchShotsFired);
    dom.gungameStatsDisplay.innerHTML =
      '<div class="summary-stat"><div class="summary-num">' + F.int(gungameKills) + '</div>' +
        '<div class="summary-lbl">Kills</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + F.int(gungameDeaths) + '</div>' +
        '<div class="summary-lbl">Deaths</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + F.int(gungameHeadshots) + '</div>' +
        '<div class="summary-lbl">Headshots</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + accP.value +
        '<span class="summary-unit">' + accP.unit + '</span></div>' +
        '<div class="summary-lbl">Accuracy</div></div>';

    // XP
    var diffMult = GAME.progression.DIFF_XP_MULT[GAME._selectedDifficulty] || 1;
    var deathBonus = Math.max(0, 6 - gungameDeaths) * 10;
    var timeBonus = elapsed < 180 ? 50 : 0;
    var rawXP = gungameKills * 10 + gungameHeadshots * 5 + deathBonus + timeBonus;
    var xpEarned = Math.round(rawXP * diffMult * 0.8) + GAME._bossXPBonus;
    var rankResult = GAME.progression.awardXP(xpEarned);
    var rank = rankResult.newRank;
    var next = GAME.progression.getNextRank(rank);
    var totalXP = GAME.progression.getTotalXP();
    var rankProgress = next ? Math.min(100, ((totalXP - rank.xp) / (next.xp - rank.xp)) * 100) : 100;

    var chips = [
      '<span>Kills <b>+' + (gungameKills * 10) + '</b></span>',
      '<span>Headshots <b>+' + (gungameHeadshots * 5) + '</b></span>',
      '<span>Low Deaths <b>+' + deathBonus + '</b></span>'
    ];
    if (timeBonus) chips.push('<span>Speed Bonus <b>+' + timeBonus + '</b></span>');
    chips.push('<span>Difficulty <b>×' + diffMult + '</b></span>');
    chips.push('<span>Multiplier <b>×0.8</b></span>');

    dom.gungameXpBreakdown.innerHTML =
      '<div class="summary-xp-top">' +
        '<div class="summary-xp-earned">+' + F.int(xpEarned) + ' XP</div>' +
        '<div class="summary-xp-rank">' + rank.name + (next ? ' · ' + F.int(totalXP) + ' / ' + F.int(next.xp) : ' · MAX') + '</div>' +
      '</div>' +
      '<div class="summary-xp-bar"><div class="summary-xp-fill" style="width:' + rankProgress + '%"></div></div>' +
      '<div class="summary-xp-break">' + chips.join('') + '</div>' +
      (rankResult.ranked_up ? '<div class="summary-xp-rankup">Ranked up: ' + rank.name + '!</div>' : '');

    dom.gungameEnd.classList.add('show');
    GAME.progression.updateRankDisplay();

    // Mission tracking
    GAME.progression.trackMissionEvent('gungame_complete', 1);
    if (elapsed < 180) GAME.progression.trackMissionEvent('gungame_fast', 1);

    GAME.hud.showAnnouncement('GUN GAME COMPLETE', timeStr);
  }

  // ── Expose API ─────────────────────────────────────────
  GAME.modes.gungame = {
    start: startGunGame,
    advanceLevel: advanceGunGameLevel,
    playerDied: gunGamePlayerDied,
    queueBotRespawn: gunGameQueueBotRespawn,
    updateRespawns: updateGunGameRespawns,
    end: endGunGame,
    updateLevelHUD: updateGunGameLevelHUD,
    addKill: function(isHeadshot) {
      gungameKills++;
      if (isHeadshot) gungameHeadshots++;
    },
    isBossSpawned: function() { return _gungameBossSpawned; },
    getMapIndex: function() { return gungameMapIndex; }
  };

})();
