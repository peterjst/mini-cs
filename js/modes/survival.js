// js/modes/survival.js — Survival mode management
// Extracted from main.js. Uses GAME.* getters/setters for shared state.
(function() {
  'use strict';

  GAME.modes = GAME.modes || {};

  // ── Survival State ─────────────────────────────────────
  var survivalWave = 0;
  var survivalKills = 0;
  var survivalHeadshots = 0;
  var survivalMapIndex = 0;
  var survivalLastMapData = null;

  // ── Start Survival ─────────────────────────────────────
  function startSurvival(mapIndex) {
    var dom = GAME.dom;
    var player = GAME.player;
    var weapons = GAME.weaponSystem;
    var enemyManager = GAME._enemyManager;

    localStorage.setItem('miniCS_lastMode', 'survival');
    GAME._teamMode = false;
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.remove('tour-mode');
    dom.survivalEnd.classList.remove('show');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';

    survivalMapIndex = mapIndex;
    GAME._selectedMapModeForMatch = GAME._selectedMapMode;
    survivalWave = 0;
    survivalKills = 0;
    survivalHeadshots = 0;
    GAME._matchKills = 0;
    GAME._matchHeadshots = 0;
    GAME._matchShotsFired = 0;
    GAME._matchShotsHit = 0;
    GAME._matchDamageDealt = 0;
    GAME._bossXPBonus = 0;
    GAME.progression.resetKillStreak();
    player.money = 800;

    weapons.owned = { knife: true, pistol: true, smg: false, shotgun: false, rifle: false, awp: false, grenade: false, smoke: false, flash: false };
    weapons.grenadeCount = 0;
    weapons.smokeCount = 0;
    weapons.flashCount = 0;
    weapons.current = 'pistol';
    weapons.resetAmmo();
    weapons._createWeaponModel();

    // Build map
    var scene = GAME._newRoundScene();
    var renderer = GAME._renderer;

    var mapData = GAME.buildMap(scene, survivalMapIndex, renderer);
    GAME.applyColorGrade();
    if (GAME.particles) {
      GAME.particles.dispose();
      GAME.particles.init(scene);
    }
    GAME._mapWalls = mapData.walls;
    survivalLastMapData = mapData;

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

    GAME.birds.spawn(Math.max(mapData.size.x, mapData.size.z));
    weapons.setBirdsRef(GAME.birds.list);

    GAME.minimap.cacheWalls(mapData.walls, mapData.size);

    dom.waveCounter.classList.add('show');
    dom.roundInfo.textContent = '';
    if (GAME.Sound) { GAME.Sound.startAmbient(mapData.name); if (GAME.Sound.initReverb) GAME.Sound.initReverb(mapData.name); }
    startSurvivalWave();
  }

  // ── Start Wave ─────────────────────────────────────────
  function startSurvivalWave() {
    var dom = GAME.dom;
    var weapons = GAME.weaponSystem;
    var enemyManager = GAME._enemyManager;

    survivalWave++;
    GAME.progression.resetKillStreak();

    // Calculate wave difficulty
    var botCount = Math.min(8, 1 + Math.floor(survivalWave * 0.7));
    var waveHP = 20 + survivalWave * 12;
    var waveSpeed = Math.min(14, 5 + survivalWave * 0.5);
    var waveAccuracy = Math.min(0.9, 0.25 + survivalWave * 0.04);
    var waveDamage = 8 + survivalWave * 2;
    var waveFireRate = Math.min(5, 1.5 + survivalWave * 0.3);

    // Set temporary difficulty for this wave
    GAME.setDifficulty('normal'); // base
    var waveDiff = {
      health: waveHP, speed: waveSpeed, fireRate: waveFireRate,
      damage: waveDamage, accuracy: waveAccuracy,
      sight: 45, attackRange: 28, botCount: botCount
    };
    GAME.DIFFICULTIES._survivalWave = waveDiff;
    GAME.setDifficulty('_survivalWave');

    // Clear old enemies
    enemyManager.clearAll();

    // Shuffle map between waves if enabled
    var newMapIndex = GAME._maybeShuffleNextMap('survival', survivalMapIndex);
    if (newMapIndex !== survivalMapIndex) {
      survivalMapIndex = newMapIndex;

      var scene = GAME._newRoundScene();
      var renderer = GAME._renderer;

      var newMapData = GAME.buildMap(scene, survivalMapIndex, renderer);
      GAME.applyColorGrade();
      if (GAME.particles) {
        GAME.particles.dispose();
        GAME.particles.init(scene);
      }
      GAME._mapWalls = newMapData.walls;
      survivalLastMapData = newMapData;

      if (newMapData.spawnZones) {
        var zone2 = GAME._mapHelpers.pickSpawnZone(newMapData.spawnZones, null);
        GAME.player.reset(GAME._mapHelpers.randomSpawnInZone(zone2, newMapData.walls));
      } else {
        GAME.player.reset(newMapData.playerSpawn);
      }
      GAME.player.setWalls(newMapData.walls);
      weapons.setWallsRef(newMapData.walls);
      GAME._warmUpShaders();

      GAME.birds.spawn(Math.max(newMapData.size.x, newMapData.size.z));
      weapons.setBirdsRef(GAME.birds.list);
      GAME.minimap.cacheWalls(newMapData.walls, newMapData.size);

      if (GAME.Sound) { GAME.Sound.startAmbient(newMapData.name); if (GAME.Sound.initReverb) GAME.Sound.initReverb(newMapData.name); }
    }

    var mapData = survivalLastMapData;
    var mapWalls = GAME._mapWalls;
    enemyManager.spawnBots(mapData.botSpawns, mapData.waypoints, mapWalls, botCount, mapData.size, mapData.playerSpawn, survivalWave);

    // Spawn boss every 5th wave
    if (survivalWave % 5 === 0) {
      var bossSpawn = mapData.botSpawns[0];
      var bossAppearance = Math.floor(survivalWave / 5);
      var hpMult = 1 + (bossAppearance - 1) * 0.1;
      var boss = enemyManager.spawnBoss(bossSpawn, mapData.waypoints, mapWalls, { hpMult: hpMult });
      GAME.boss.showHealthBar(boss);
      GAME.boss.activateAtmosphere();
      GAME.hud.showAnnouncement('WAVE ' + survivalWave, 'BOSS WAVE!');
      if (GAME.Sound && GAME.Sound.bossSpawnAlert) GAME.Sound.bossSpawnAlert();
    }

    weapons.resetForRound();
    dom.waveCounter.textContent = 'WAVE ' + survivalWave;

    GAME._gameState = GAME._STATES.SURVIVAL_WAVE;
    GAME._buyMenuOpen = false;
    dom.buyMenu.classList.remove('show');
    if (GAME.touch && GAME.touch._hideBuyCarousel) GAME.touch._hideBuyCarousel();
    GAME.hud.showAnnouncement('WAVE ' + survivalWave, botCount + ' enemies');
    if (GAME.Sound) GAME.Sound.roundStart();
  }

  // ── End Wave ───────────────────────────────────────────
  function endSurvivalWave() {
    var dom = GAME.dom;
    var player = GAME.player;

    // Wave cleared — restore 60% of max HP
    player.health = Math.min(100, player.health + 60);
    player.money = Math.min(16000, player.money + 200 + survivalWave * 50);
    GAME.hud.showAnnouncement('WAVE CLEARED', 'Buy phase — 8s');
    if (GAME.Sound) GAME.Sound.roundWin();

    // Mission tracking for survival waves
    GAME.progression.trackMissionEvent('survival_wave', survivalWave);
    GAME.progression.trackMissionEvent('weekly_survival', survivalWave);
    var mapNames = ['survival_dust', 'survival_office', 'survival_warehouse', 'survival_bloodstrike', 'survival_italy', 'survival_aztec', 'survival_arena'];
    if (mapNames[survivalMapIndex]) GAME.progression.trackMissionEvent(mapNames[survivalMapIndex], survivalWave);

    GAME._gameState = GAME._STATES.SURVIVAL_BUY;
    GAME._phaseTimer = 8;
    GAME._buyMenuOpen = true;
    if (GAME.isMobile && GAME.touch && GAME.touch._showBuyCarousel) {
      GAME.touch._showBuyCarousel();
    } else {
      dom.buyMenu.classList.add('show');
      GAME.buy.updateMenu();
    }
  }

  // ── End Survival ───────────────────────────────────────
  function endSurvival() {
    var dom = GAME.dom;
    var player = GAME.player;

    GAME.boss.hideHealthBar();
    if (GAME.Sound) GAME.Sound.stopAmbient();
    GAME._gameState = GAME._STATES.SURVIVAL_DEAD;
    dom.hud.style.display = 'none';
    if (document.pointerLockElement) document.exitPointerLock();

    var mapNames = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var mapName = mapNames[survivalMapIndex] || 'dust';
    GAME.progression.setSurvivalBest(mapName, survivalWave - 1);

    var F = GAME.format;
    var completedWaves = survivalWave - 1;
    dom.survivalWaveResult.textContent = 'Wave ' + completedWaves;
    var mapDisplayName = (GAME._maps && GAME._maps[survivalMapIndex]) ? GAME._maps[survivalMapIndex].name : '';
    dom.survivalMeta.textContent = mapDisplayName;

    // Stat tiles (use percentParts for Accuracy)
    var accP = F.percentParts(GAME._matchShotsHit, GAME._matchShotsFired);
    dom.survivalStatsDisplay.innerHTML =
      '<div class="summary-stat"><div class="summary-num">' + F.int(survivalKills) + '</div>' +
        '<div class="summary-lbl">Kills</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + F.int(survivalHeadshots) + '</div>' +
        '<div class="summary-lbl">Headshots</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + accP.value +
        '<span class="summary-unit">' + accP.unit + '</span></div>' +
        '<div class="summary-lbl">Accuracy</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + F.int(GAME._matchDamageDealt) + '</div>' +
        '<div class="summary-lbl">Damage Dealt</div></div>';

    // XP for survival (0.7x multiplier)
    var xpEarned = Math.round((survivalKills * 10 + survivalHeadshots * 5 + completedWaves * 15) * 0.7) + GAME._bossXPBonus;
    var rankResult = GAME.progression.awardXP(xpEarned);
    var rank = rankResult.newRank;
    var next = GAME.progression.getNextRank(rank);
    var totalXP = GAME.progression.getTotalXP();
    var rankProgress = next ? Math.min(100, ((totalXP - rank.xp) / (next.xp - rank.xp)) * 100) : 100;

    dom.survivalXpBreakdown.innerHTML =
      '<div class="summary-xp-top">' +
        '<div class="summary-xp-earned">+' + F.int(xpEarned) + ' XP</div>' +
        '<div class="summary-xp-rank">' + rank.name + (next ? ' · ' + F.int(totalXP) + ' / ' + F.int(next.xp) : ' · MAX') + '</div>' +
      '</div>' +
      '<div class="summary-xp-bar"><div class="summary-xp-fill" style="width:' + rankProgress + '%"></div></div>' +
      '<div class="summary-xp-break">' +
        '<span>Kills <b>+' + (survivalKills * 10) + '</b></span>' +
        '<span>Headshots <b>+' + (survivalHeadshots * 5) + '</b></span>' +
        '<span>Waves <b>+' + (completedWaves * 15) + '</b></span>' +
        '<span>Multiplier <b>×0.7</b></span>' +
      '</div>' +
      (rankResult.ranked_up ? '<div class="summary-xp-rankup">Ranked up: ' + rank.name + '!</div>' : '');

    dom.survivalEnd.classList.add('show');
    GAME.progression.updateRankDisplay();

    // Clean up wave difficulty
    delete GAME.DIFFICULTIES._survivalWave;
  }

  // ── Expose API ─────────────────────────────────────────
  GAME.modes.survival = {
    start: startSurvival,
    startWave: startSurvivalWave,
    endWave: endSurvivalWave,
    end: endSurvival,
    addKill: function(isHeadshot) {
      survivalKills++;
      if (isHeadshot) survivalHeadshots++;
    },
    getMapIndex: function() { return survivalMapIndex; },
    getWave: function() { return survivalWave; }
  };

})();
