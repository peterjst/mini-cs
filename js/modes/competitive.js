// js/modes/competitive.js — Competitive match/round management
// Extracted from main.js. Uses GAME.* getters/setters for shared state.
(function() {
  'use strict';

  GAME.modes = GAME.modes || {};

  // ── Map Shuffle Helper ───────────────────────────────────
  function maybeShuffleNextMap(modeKey, currentIndex) {
    if (GAME._selectedMapModeForMatch !== 'shuffle') return currentIndex;
    var mapCount = GAME.getMapCount();
    if (mapCount <= 1) return currentIndex;
    return GAME.shuffle.nextShuffleMap(modeKey);
  }

  // ── Match Start ──────────────────────────────────────────
  function startMatch(startMapIdx) {
    localStorage.setItem('miniCS_lastMode', 'competitive');
    var dom = GAME.dom;
    var player = GAME.player;
    var weapons = GAME.weaponSystem;

    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.remove('tour-mode');
    dom.matchEnd.classList.remove('show');
    dom.historyPanel.classList.remove('show');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';
    dom.waveCounter.classList.remove('show');

    GAME.setDifficulty(GAME._selectedDifficulty);

    GAME._playerScore = 0;
    GAME._botScore = 0;
    if (GAME._skipToBoss) GAME._bossOnlyMatch = true;
    GAME._roundNumber = GAME._skipToBoss ? GAME._TOTAL_ROUNDS - 1 : 0;
    GAME._startingMapIndex = startMapIdx || 0;
    GAME._currentMapIndex = GAME._startingMapIndex;
    GAME._selectedMapModeForMatch = GAME._selectedMapMode;
    GAME._matchKills = 0;
    GAME._matchDeaths = 0;
    GAME._matchHeadshots = 0;
    GAME._matchRoundsWon = 0;
    GAME._matchShotsFired = 0;
    GAME._matchShotsHit = 0;
    GAME._matchDamageDealt = 0;
    GAME._matchNadesUsed = { he: false, smoke: false, flash: false };
    GAME._bossXPBonus = 0;
    GAME.progression.resetKillStreak();
    player.money = GAME._skipToBoss ? 10000 : 800;

    weapons.owned = { knife: true, pistol: true, smg: false, shotgun: false, rifle: false, awp: false, grenade: false, smoke: false, flash: false };
    weapons.grenadeCount = 0;
    weapons.smokeCount = 0;
    weapons.flashCount = 0;
    weapons.current = 'pistol';
    weapons.resetAmmo();
    weapons._createWeaponModel();
    player.armor = 0;
    player.helmet = false;

    GAME.progression.clearPerks();
    startRound();
    GAME._skipToBoss = false;
  }

  // ── Round Start ──────────────────────────────────────────
  function startRound() {
    var dom = GAME.dom;
    var player = GAME.player;
    var weapons = GAME.weaponSystem;
    var enemyManager = GAME._enemyManager;
    var teamMode = GAME._teamMode;
    var playerTeam = GAME._playerTeam;
    var teamObjective = GAME._teamObjective;
    var selectedDifficulty = GAME._selectedDifficulty;
    var TOTAL_ROUNDS = GAME._TOTAL_ROUNDS;
    var TEAM_SIZES = GAME._TEAM_SIZES;

    GAME._roundNumber = GAME._roundNumber + 1;
    var roundNumber = GAME._roundNumber;
    if (roundNumber > TOTAL_ROUNDS) {
      endMatch();
      return;
    }

    if (roundNumber > 1) GAME._currentMapIndex = maybeShuffleNextMap('competitive', GAME._currentMapIndex);
    GAME.progression.resetKillStreak();

    var scene = GAME._newRoundScene();

    var currentMapIndex = GAME._currentMapIndex;
    var mapData = GAME.buildMap(scene, currentMapIndex, GAME._renderer);
    GAME.applyColorGrade();
    if (GAME.particles) {
      GAME.particles.dispose();
      GAME.particles.init(scene);
    }
    GAME._mapWalls = mapData.walls;
    var mapWalls = mapData.walls;

    var H = GAME._mapHelpers;
    if (mapData.spawnZones) {
      var zoneLabel = teamMode ? playerTeam : null;
      var zone = H.pickSpawnZone(mapData.spawnZones, zoneLabel);
      var spawnPos = H.randomSpawnInZone(zone, mapWalls);
      player.reset(spawnPos);
    } else if (teamMode) {
      var mySpawns = playerTeam === 'ct' ? mapData.ctSpawns : mapData.tSpawns;
      player.reset(mySpawns[0]);
    } else {
      player.reset(mapData.playerSpawn);
    }
    if (GAME.hasPerk('thick_skin')) player.health = Math.min(125, player.health + 25);
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);
    GAME._warmUpShaders();
    weapons.resetForRound();
    if (GAME.Sound && GAME.Sound.restoreAudio) GAME.Sound.restoreAudio();

    if (teamMode) {
      var teamSize = TEAM_SIZES[selectedDifficulty] || 3;
      var allyCount = teamSize - 1; // player is one member
      var enemyCount = teamSize;
      var mySpawns2 = playerTeam === 'ct' ? mapData.ctSpawns : mapData.tSpawns;
      var oppSpawns = playerTeam === 'ct' ? mapData.tSpawns : mapData.ctSpawns;
      enemyManager.spawnTeamBots(mySpawns2, oppSpawns, mapData.waypoints, mapWalls,
        allyCount, enemyCount, roundNumber, playerTeam);
    } else {
      var botCount = GAME.getDifficulty().botCount;
      enemyManager.spawnBots(mapData.botSpawns, mapData.waypoints, mapWalls, botCount, mapData.size, mapData.playerSpawn, roundNumber);
    }

    // Spawn boss on final round — solo competitive only; team mode plays a normal round 6
    if (!teamMode && GAME.boss.isBossRound(roundNumber)) {
      // Re-spawn with fewer regular bots for boss round
      enemyManager.clearAll();
      var bossRoundBotCount = Math.min(2, GAME.getDifficulty().botCount);
      if (teamMode) {
        var ts = TEAM_SIZES[selectedDifficulty] || 3;
        var mySpawns3 = playerTeam === 'ct' ? mapData.ctSpawns : mapData.tSpawns;
        var oppSpawns2 = playerTeam === 'ct' ? mapData.tSpawns : mapData.ctSpawns;
        enemyManager.spawnTeamBots(mySpawns3, oppSpawns2, mapData.waypoints, mapWalls,
          Math.max(1, ts - 2), bossRoundBotCount, roundNumber, playerTeam);
      } else {
        enemyManager.spawnBots(mapData.botSpawns, mapData.waypoints, mapWalls, bossRoundBotCount, mapData.size, mapData.playerSpawn, roundNumber);
      }
      var bossSpawn = mapData.botSpawns[0];
      var boss = enemyManager.spawnBoss(bossSpawn, mapData.waypoints, mapWalls);
      GAME.boss.showHealthBar(boss);
      GAME.boss.activateAtmosphere();
      GAME.hud.showAnnouncement('BOSS ROUND', 'Round ' + roundNumber);
      if (GAME.Sound && GAME.Sound.bossSpawnAlert) GAME.Sound.bossSpawnAlert();
    }

    // Reset bomb state for bomb defusal mode
    if (teamMode && teamObjective === 'bomb') {
      GAME.bomb.reset();
      GAME.bomb.setSites(mapData.bombsites || []);

      // Assign bomb carrier
      if (playerTeam === 't') {
        GAME.bomb.setPlayerHasBomb(true);
        GAME.bomb.setCarrierBot(null);
      } else {
        GAME.bomb.setPlayerHasBomb(false);
        // Give bomb to a random T-side bot
        var tBots = enemyManager.getAliveOfTeam('t');
        GAME.bomb.setCarrierBot(tBots.length > 0 ? tBots[Math.floor(Math.random() * tBots.length)] : null);
      }

      // Build bombsite markers
      GAME.bomb.buildMarkers(scene, GAME.bomb.getSites());

      dom.bombHud.style.display = 'block';
      dom.bombTimerDisplay.textContent = '';
      dom.bombActionHint.textContent = '';
      dom.bombProgressWrap.style.display = 'none';
    } else {
      dom.bombHud.style.display = 'none';
    }

    GAME.birds.spawn(mapData.size ? Math.max(mapData.size.x, mapData.size.z) : 50);
    weapons.setBirdsRef(GAME.birds.list);

    GAME.minimap.cacheWalls(mapWalls, mapData.size);

    GAME._gameState = GAME._STATES.BUY_PHASE;
    GAME._phaseTimer = GAME._BUY_PHASE_TIME;
    GAME._roundTimer = GAME._ROUND_TIME;

    GAME.hud.update();
    GAME._buyMenuOpen = true;
    if (GAME.isMobile && GAME.touch && GAME.touch._showBuyCarousel) {
      GAME.touch._showBuyCarousel();
    } else {
      dom.buyMenu.classList.add('show');
      GAME.buy.updateMenu();
    }
    if (teamMode) {
      var sideLabel = playerTeam === 'ct' ? 'Counter-Terrorist' : 'Terrorist';
      GAME.hud.showAnnouncement('ROUND ' + roundNumber, sideLabel + ' \u2014 ' + mapData.name);
    } else {
      GAME.hud.showAnnouncement('ROUND ' + roundNumber, 'Map: ' + mapData.name);
    }

    dom.roundInfo.textContent = 'Round ' + roundNumber + ' / ' + TOTAL_ROUNDS;
    dom.mapInfo.textContent = 'Map: ' + mapData.name;

    if (GAME.Sound) { GAME.Sound.startAmbient(mapData.name); if (GAME.Sound.initReverb) GAME.Sound.initReverb(mapData.name); }
  }

  // ── Round End ────────────────────────────────────────────
  function endRound(playerWon) {
    var dom = GAME.dom;
    var player = GAME.player;
    var weapons = GAME.weaponSystem;
    var teamMode = GAME._teamMode;
    var playerTeam = GAME._playerTeam;

    GAME.boss.hideHealthBar();
    // Clean up bomb HUD
    dom.bombHud.style.display = 'none';
    GAME.bomb.reset();

    GAME._radioMenuOpen = false;
    dom.radioMenu.classList.remove('show');
    GAME._gameState = GAME._STATES.ROUND_END;
    GAME._phaseTimer = GAME._ROUND_END_TIME;
    GAME.progression.setLastRoundWon(playerWon);

    if (playerWon) {
      GAME._playerScore = GAME._playerScore + 1;
      GAME._matchRoundsWon = GAME._matchRoundsWon + 1;
      player.money = Math.min(16000, player.money + 3000);
      GAME.hud.showAnnouncement('ROUND WIN', '+$3000');
      if (GAME.Sound) GAME.Sound.roundWin();
      if (teamMode) {
        var winTeamName = playerTeam === 'ct' ? 'Counter-terrorists' : 'Terrorists';
        if (GAME.Sound) GAME.Sound.announcer(winTeamName + ' win');
      } else {
        if (GAME.Sound) GAME.Sound.announcer('Counter-terrorists win');
      }

      // Mission tracking for round wins
      if (!weapons.owned.shotgun && !weapons.owned.rifle && !weapons.owned.awp) GAME.progression.trackMissionEvent('pistol_win', 1);
      if (player.health >= 100) GAME.progression.trackMissionEvent('no_damage_win', 1);
    } else {
      GAME._botScore = GAME._botScore + 1;
      player.money = Math.min(16000, player.money + 1400);
      GAME.hud.showAnnouncement(player.alive ? 'TIME UP' : 'YOU DIED', '+$1400');
      if (GAME.Sound) GAME.Sound.roundLose();
      if (teamMode) {
        var loseTeamName = playerTeam === 'ct' ? 'Terrorists' : 'Counter-terrorists';
        if (GAME.Sound) GAME.Sound.announcer(loseTeamName + ' win');
      } else {
        if (GAME.Sound) GAME.Sound.announcer('Terrorists win');
      }
    }

    GAME.progression.resetKillStreak();
    GAME.hud.updateScoreboard();
    GAME._buyMenuOpen = false;
    dom.buyMenu.classList.remove('show');
  }

  // ── Match End ────────────────────────────────────────────
  function endMatch() {
    var dom = GAME.dom;
    var player = GAME.player;
    var playerScore = GAME._playerScore;
    var botScore = GAME._botScore;
    var roundNumber = GAME._roundNumber;
    var selectedDifficulty = GAME._selectedDifficulty;
    var matchKills = GAME._matchKills;
    var matchDeaths = GAME._matchDeaths;
    var matchHeadshots = GAME._matchHeadshots;
    var matchRoundsWon = GAME._matchRoundsWon;
    var matchShotsFired = GAME._matchShotsFired;
    var matchShotsHit = GAME._matchShotsHit;
    var matchDamageDealt = GAME._matchDamageDealt;

    GAME.boss.hideHealthBar();
    GAME._radioMenuOpen = false;
    dom.radioMenu.classList.remove('show');
    if (GAME.Sound) GAME.Sound.stopAmbient();
    GAME._gameState = GAME._STATES.MATCH_END;
    dom.hud.style.display = 'none';
    if (document.pointerLockElement) document.exitPointerLock();

    var result = playerScore > botScore ? 'VICTORY' : playerScore < botScore ? 'DEFEAT' : 'DRAW';
    var resultClass = playerScore > botScore ? 'win' : playerScore < botScore ? 'loss' : 'draw';
    dom.matchResult.textContent = result;
    dom.matchResult.className = 'summary-result ' + resultClass;
    dom.finalScore.textContent = playerScore + ' — ' + botScore;

    var F = GAME.format;
    var mapName = (GAME._maps && GAME._maps[GAME._currentMapIndex]) ? GAME._maps[GAME._currentMapIndex].name : '';
    dom.matchMeta.textContent = [mapName, F.titleCase(selectedDifficulty), roundNumber + ' rounds']
      .filter(function(s) { return s; }).join(' · ');

    // Mission tracking for match end
    if (playerScore > botScore) GAME.progression.trackMissionEvent('weekly_wins', 1);
    GAME.progression.trackMissionEvent('money_earned', player.money - 800);
    var endAccuracy = matchShotsFired > 0 ? (matchShotsHit / matchShotsFired * 100) : 0;
    if (endAccuracy >= 60) GAME.progression.trackMissionEvent('high_accuracy', 1);

    // XP calculation
    var isWin = playerScore > botScore;
    var diffMult = GAME.progression.DIFF_XP_MULT[selectedDifficulty] || 1;
    var xpEarned = GAME.progression.calculateXP(matchKills, matchHeadshots, matchRoundsWon, isWin, diffMult) + GAME._bossXPBonus;
    var rankResult = GAME.progression.awardXP(xpEarned);

    // Stat tiles
    var kd = F.ratioPair(matchKills, matchDeaths);
    var accP = F.percentParts(matchShotsHit, matchShotsFired);
    dom.matchStats.innerHTML =
      '<div class="summary-stat"><div class="summary-num">' + kd.primary +
        '<span class="summary-sub">' + kd.sub + '</span></div>' +
        '<div class="summary-lbl">Kills / Deaths</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + F.int(matchHeadshots) + '</div>' +
        '<div class="summary-lbl">Headshots</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + accP.value +
        '<span class="summary-unit">' + accP.unit + '</span></div>' +
        '<div class="summary-lbl">Accuracy</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + F.int(matchDamageDealt) + '</div>' +
        '<div class="summary-lbl">Damage Dealt</div></div>';

    // XP panel
    var rank = rankResult.newRank;
    var next = GAME.progression.getNextRank(rank);
    var totalXP = GAME.progression.getTotalXP();
    var rankProgress = next ? Math.min(100, ((totalXP - rank.xp) / (next.xp - rank.xp)) * 100) : 100;
    var chips = [
      '<span>Kills <b>+' + (matchKills * 10) + '</b></span>',
      '<span>Headshots <b>+' + (matchHeadshots * 5) + '</b></span>',
      '<span>Rounds Won <b>+' + (matchRoundsWon * 20) + '</b></span>'
    ];
    if (isWin) chips.push('<span>Match Win <b>+50</b></span>');
    chips.push('<span>Difficulty <b>×' + diffMult + '</b></span>');

    dom.matchXpBreakdown.innerHTML =
      '<div class="summary-xp-top">' +
        '<div class="summary-xp-earned">+' + F.int(xpEarned) + ' XP</div>' +
        '<div class="summary-xp-rank">' + rank.name + (next ? ' · ' + F.int(totalXP) + ' / ' + F.int(next.xp) : ' · MAX') + '</div>' +
      '</div>' +
      '<div class="summary-xp-bar"><div class="summary-xp-fill" style="width:' + rankProgress + '%"></div></div>' +
      '<div class="summary-xp-break">' + chips.join('') + '</div>' +
      (rankResult.ranked_up ? '<div class="summary-xp-rankup">Ranked up: ' + rank.name + '!</div>' : '');

    dom.matchEnd.classList.add('show');

    if (GAME.Sound && playerScore > botScore) GAME.Sound.mvpSting();

    GAME.progression.saveMatchHistory({
      result: result, xpEarned: xpEarned,
      playerScore: playerScore, botScore: botScore,
      rounds: roundNumber, kills: matchKills,
      deaths: matchDeaths, headshots: matchHeadshots,
      difficulty: selectedDifficulty
    });
    GAME.progression.updateRankDisplay();
  }

  // ── Public API ───────────────────────────────────────────
  GAME.modes.competitive = {
    startMatch: startMatch,
    startRound: startRound,
    endRound: endRound,
    endMatch: endMatch,
    maybeShuffleNextMap: maybeShuffleNextMap
  };

  // Bridge functions for other modules (progression.js, bomb.js)
  GAME._startRound = function() { startRound(); };
  GAME._endRound = function(playerWon) { endRound(playerWon); };
  GAME._maybeShuffleNextMap = maybeShuffleNextMap;
  GAME._setMapModeForMatch = function(mode) { GAME._selectedMapModeForMatch = mode; };
})();
