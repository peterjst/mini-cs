// js/main.js — Game init, loop, state machine, rounds, buy system, HUD
// Uses GAME.buildMap, GAME.Player, GAME.WeaponSystem, GAME.EnemyManager, GAME.WEAPON_DEFS

(function() {
  'use strict';

  // ── Game States ──────────────────────────────────────────
  var MENU = 'MENU', BUY_PHASE = 'BUY_PHASE', PLAYING = 'PLAYING',
      ROUND_END = 'ROUND_END', MATCH_END = 'MATCH_END', TOURING = 'TOURING',
      SURVIVAL_BUY = 'SURVIVAL_BUY', SURVIVAL_WAVE = 'SURVIVAL_WAVE', SURVIVAL_DEAD = 'SURVIVAL_DEAD',
      PAUSED = 'PAUSED', GUNGAME_ACTIVE = 'GUNGAME_ACTIVE', GUNGAME_END = 'GUNGAME_END',
      DEATHMATCH_ACTIVE = 'DEATHMATCH_ACTIVE', DEATHMATCH_END = 'DEATHMATCH_END';

  // ── DOM refs ─────────────────────────────────────────────
  var dom = {
    menuScreen:   document.getElementById('menu-screen'),
    modeGrid:     document.getElementById('mode-grid'),
    modeBack:     document.getElementById('mode-back'),
    compStartBtn: document.getElementById('comp-start-btn'),
    compBossBtn: document.getElementById('comp-boss-btn'),
    survStartBtn: document.getElementById('surv-start-btn'),
    ggStartBtn:   document.getElementById('gg-start-btn'),
    dmStartBtn2:  document.getElementById('dm-start-btn'),
    quickPlayBtn:   document.getElementById('quick-play-btn'),
    quickPlayInfo:  document.getElementById('quick-play-info'),
    menuContent:    document.getElementById('menu-content'),
    missionsFooter: document.getElementById('missions-footer-btn'),
    historyFooter:  document.getElementById('history-footer-btn'),
    tourFooter:     document.getElementById('tour-footer-btn'),
    controlsFooter: document.getElementById('controls-footer-btn'),
    loadoutFooter:  document.getElementById('loadout-footer-btn'),
    loadoutOverlay: document.getElementById('loadout-overlay'),
    loadoutClose:   document.getElementById('loadout-close'),
    loadoutWeapons: document.getElementById('loadout-weapons'),
    loadoutSkins:   document.getElementById('loadout-skins'),
    controlsOverlay: document.getElementById('controls-overlay'),
    controlsClose:  document.getElementById('controls-close'),
    missionsOverlay: document.getElementById('missions-overlay'),
    missionsClose:  document.getElementById('missions-close'),
    hud:          document.getElementById('hud'),
    crosshair:    document.getElementById('crosshair'),
    hpFill:       document.getElementById('hp-fill'),
    hpValue:      document.getElementById('hp-value'),
    armorFill:    document.getElementById('armor-fill'),
    armorValue:   document.getElementById('armor-value'),
    helmetIcon:   document.getElementById('helmet-icon'),
    weaponName:   document.getElementById('weapon-name'),
    ammoMag:      document.getElementById('ammo-mag'),
    ammoReserve:  document.getElementById('ammo-reserve'),
    moneyDisplay: document.getElementById('money-display'),
    roundTimer:   document.getElementById('round-timer'),
    roundInfo:    document.getElementById('round-info'),
    bossHealthBar: document.getElementById('boss-health-bar'),
    bossHpFill:    document.getElementById('boss-hp-fill'),
    bossHpTrack:   document.getElementById('boss-hp-track'),
    bossLabel:     document.getElementById('boss-label'),
    buyPhaseHint: document.getElementById('buy-phase-hint'),
    killFeed:     document.getElementById('kill-feed'),
    announcement: document.getElementById('announcement'),
    scoreboard:   document.getElementById('scoreboard'),
    scorePlayer:  document.getElementById('score-player'),
    scoreBots:    document.getElementById('score-bots'),
    scorePlayerLabel: document.getElementById('score-player-label'),
    scoreBotsLabel:   document.getElementById('score-bots-label'),
    mapInfo:      document.getElementById('map-info'),
    compMapModeRow: document.getElementById('comp-map-mode-row'),
    survMapModeRow: document.getElementById('surv-map-mode-row'),
    ggMapModeRow:  document.getElementById('gg-map-mode-row'),
    dmMapModeRow:  document.getElementById('dm-map-mode-row'),
    compModeRow:  document.getElementById('comp-mode-row'),
    compTeamOptions: document.getElementById('comp-team-options'),
    compObjectiveRow: document.getElementById('comp-objective-row'),
    compSideRow:  document.getElementById('comp-side-row'),
    bombHud:      document.getElementById('bomb-hud'),
    bombTimerDisplay: document.getElementById('bomb-timer-display'),
    bombActionHint: document.getElementById('bomb-action-hint'),
    bombProgressWrap: document.getElementById('bomb-progress-wrap'),
    bombProgressBar: document.getElementById('bomb-progress-bar'),
    buyMenu:      document.getElementById('buy-menu'),
    buyBalance:   document.querySelector('.buy-balance'),
    bloodSplatter: document.getElementById('blood-splatter'),
    damageFlash:  document.getElementById('damage-flash'),
    flashOverlay: document.getElementById('flash-overlay'),
    matchEnd:     document.getElementById('match-end'),
    matchResult:  document.getElementById('match-result'),
    finalScore:   document.getElementById('final-score'),
    restartBtn:   document.getElementById('restart-btn'),
    menuBtn:      document.getElementById('menu-btn'),
    grenadeCount: document.getElementById('grenade-count'),
    historyPanel: document.getElementById('history-panel'),
    historyStats: document.getElementById('history-stats'),
    historyList:  document.getElementById('history-list'),
    historyClose: document.getElementById('history-close'),
    tourPanel:    document.getElementById('tour-panel'),
    tourPanelClose: document.getElementById('tour-panel-close'),
    tourExitBtn:  document.getElementById('tour-exit-btn'),
    tourMapLabel: document.getElementById('tour-map-label'),
    hitmarker:    document.getElementById('hitmarker'),
    dmgContainer: document.getElementById('dmg-container'),
    streakAnnounce: document.getElementById('streak-announce'),
    minimapCanvas: document.getElementById('minimap'),
    crouchIndicator: document.getElementById('crouch-indicator'),
    waveCounter:  document.getElementById('wave-counter'),
    rankDisplay:  document.getElementById('rank-display'),
    matchXpBreakdown: document.getElementById('match-xp-breakdown'),
    survivalBestDisplay: document.getElementById('survival-best-display'),
    survivalEnd:  document.getElementById('survival-end'),
    survivalWaveResult: document.getElementById('survival-wave-result'),
    survivalStatsDisplay: document.getElementById('survival-stats-display'),
    survivalXpBreakdown: document.getElementById('survival-xp-breakdown'),
    survivalRestartBtn: document.getElementById('survival-restart-btn'),
    survivalMenuBtn: document.getElementById('survival-menu-btn'),
    pauseOverlay: document.getElementById('pause-overlay'),
    pauseResumeBtn: document.getElementById('pause-resume-btn'),
    pauseControlsBtn: document.getElementById('pause-controls-btn'),
    pauseMenuBtn: document.getElementById('pause-menu-btn'),
    pauseHintKey: document.getElementById('pause-hint-key'),
    lowHealthPulse: document.getElementById('low-health-pulse'),
    scopeOverlay: document.getElementById('scope-overlay'),
    gungameBestDisplay: document.getElementById('gungame-best-display'),
    gungameEnd: document.getElementById('gungame-end'),
    gungameTimeResult: document.getElementById('gungame-time-result'),
    gungameStatsDisplay: document.getElementById('gungame-stats-display'),
    gungameXpBreakdown: document.getElementById('gungame-xp-breakdown'),
    gungameRestartBtn: document.getElementById('gungame-restart-btn'),
    gungameMenuBtn: document.getElementById('gungame-menu-btn'),
    gungameLevel: document.getElementById('gungame-level'),
    dmBestDisplay: document.getElementById('dm-best-display'),
    dmEnd: document.getElementById('deathmatch-end'),
    dmKillResult: document.getElementById('dm-kill-result'),
    dmStatsDisplay: document.getElementById('dm-stats-display'),
    dmXpBreakdown: document.getElementById('dm-xp-breakdown'),
    dmRestartBtn: document.getElementById('dm-restart-btn'),
    dmMenuBtn: document.getElementById('dm-menu-btn'),
    dmKillCounter: document.getElementById('dm-kill-counter'),
    dmRespawnTimer: document.getElementById('dm-respawn-timer'),
    radioMenu:    document.getElementById('radio-menu'),
  };
  GAME.dom = dom;

  // ── Renderer refs (from js/core/renderer.js) ────────────
  var renderer = GAME._renderer;
  var camera = GAME.camera;
  var scene = GAME.scene;

  GAME.touchFiring = false;
  GAME.touchTap = false;
  GAME.touchFireButton = false;

  function consumeTouchTap(weapons) {
    if (GAME.touchTap) {
      weapons.mouseDown = true;
      GAME.touchTap = false;
      setTimeout(function() { weapons.mouseDown = false; }, 0);
    }
  }

  // ── Game Variables ───────────────────────────────────────
  var gameState = MENU;
  var player, weapons, enemyManager;
  var mapWalls = [];
  var currentMapIndex = 0;
  var startingMapIndex = 0;
  var roundNumber = 0;
  var playerScore = 0, botScore = 0;
  var roundTimer = 0, phaseTimer = 0;
  var TOTAL_ROUNDS = 6;
  var _skipToBoss = false;
  var _bossOnlyMatch = false;
  var BUY_PHASE_TIME = 10, ROUND_TIME = 90, ROUND_END_TIME = 5;
  var buyMenuOpen = false;
  var radioMenuOpen = false;
  var radioAutoCloseTimer = null;
  var RADIO_LINES = [
    'Go go go!',
    'Fire in the hole!',
    'Contact!',
    'Need backup',
    'Affirmative',
    'Negative'
  ];
  var damageFlashTimer = 0;
  var matchKills = 0, matchDeaths = 0, matchHeadshots = 0;
  var matchRoundsWon = 0;
  var matchShotsFired = 0, matchShotsHit = 0, matchDamageDealt = 0;
  var matchNadesUsed = { he: false, smoke: false, flash: false };
  var pausedFromState = null; // state to resume to when unpausing

  // ── Team Mode Config ───────────────────────────────────
  var teamMode = false;           // true when playing team match
  var teamObjective = 'elimination'; // 'elimination' or 'bomb'
  var playerTeam = 'ct';          // 'ct' or 't'
  var TEAM_SIZES = { easy: 2, normal: 3, hard: 4, elite: 5 };

  // ── Bomb Defusal State ────────────────────────────────
  // Bomb state moved to js/systems/bomb.js

  // ── Difficulty ─────────────────────────────────────────
  var selectedDifficulty = localStorage.getItem('miniCS_difficulty') || 'normal';
  // DIFF_XP_MULT moved to js/systems/progression.js

  // ── Map Mode (fixed / rotate) ────────────────────────
  var selectedMapMode = localStorage.getItem('miniCS_mapMode') || 'fixed';
  var selectedMapModeForMatch = 'fixed';

  // ── Menu Flythrough Camera Paths ────────────────────────
  // One per map (indexed same as GAME._maps)
  // Each keyframe: { position: {x,y,z}, lookAt: {x,y,z}, duration: seconds }
  var _menuFlythroughPaths = [
    // Dust (50x50) — sweep through market, past vehicle, overview
    [
      { position: {x:-22,y:3,z:-22}, lookAt: {x:0,y:2,z:0}, duration: 6 },
      { position: {x:-10,y:4,z:-15}, lookAt: {x:5,y:2,z:5}, duration: 5 },
      { position: {x:10,y:6,z:0}, lookAt: {x:-5,y:1,z:10}, duration: 5 },
      { position: {x:15,y:3,z:15}, lookAt: {x:-10,y:2,z:-5}, duration: 5 },
      { position: {x:-15,y:8,z:10}, lookAt: {x:0,y:0,z:0}, duration: 5 }
    ],
    // Office (40x40) — through corridors, past desks
    [
      { position: {x:-16,y:3,z:-16}, lookAt: {x:0,y:2,z:0}, duration: 5 },
      { position: {x:-5,y:4,z:-10}, lookAt: {x:10,y:2,z:5}, duration: 5 },
      { position: {x:10,y:3,z:0}, lookAt: {x:-5,y:2,z:10}, duration: 5 },
      { position: {x:5,y:5,z:12}, lookAt: {x:-10,y:1,z:-5}, duration: 5 },
      { position: {x:-12,y:4,z:5}, lookAt: {x:5,y:2,z:-10}, duration: 5 }
    ],
    // Warehouse (60x50) — ground floor, up to platforms, overview
    [
      { position: {x:-25,y:3,z:-20}, lookAt: {x:0,y:4,z:0}, duration: 5 },
      { position: {x:-10,y:6,z:-15}, lookAt: {x:10,y:4,z:10}, duration: 5 },
      { position: {x:15,y:8,z:0}, lookAt: {x:-5,y:2,z:15}, duration: 6 },
      { position: {x:20,y:10,z:15}, lookAt: {x:-10,y:4,z:-10}, duration: 5 },
      { position: {x:-20,y:12,z:10}, lookAt: {x:0,y:0,z:0}, duration: 5 }
    ],
    // Bloodstrike (60x44) — corridor loop, past corners and platforms
    [
      { position: {x:-24,y:3,z:-14}, lookAt: {x:0,y:3,z:-14}, duration: 5 },
      { position: {x:24,y:4,z:-18}, lookAt: {x:24,y:3,z:10}, duration: 5 },
      { position: {x:20,y:6,z:16}, lookAt: {x:-10,y:3,z:16}, duration: 5 },
      { position: {x:-24,y:4,z:18}, lookAt: {x:-24,y:3,z:-5}, duration: 5 },
      { position: {x:0,y:10,z:0}, lookAt: {x:0,y:0,z:0}, duration: 6 }
    ],
    // Italy (55x50) — piazza, alleys, buildings
    [
      { position: {x:-24,y:3,z:-20}, lookAt: {x:0,y:2,z:0}, duration: 5 },
      { position: {x:-5,y:5,z:-15}, lookAt: {x:5,y:2,z:5}, duration: 5 },
      { position: {x:10,y:4,z:0}, lookAt: {x:-5,y:3,z:10}, duration: 6 },
      { position: {x:15,y:3,z:12}, lookAt: {x:-10,y:2,z:-5}, duration: 5 },
      { position: {x:-15,y:8,z:5}, lookAt: {x:0,y:1,z:0}, duration: 5 }
    ],
    // Aztec (70x60) — temple, river, bridge
    [
      { position: {x:-20,y:4,z:20}, lookAt: {x:10,y:2,z:0}, duration: 5 },
      { position: {x:0,y:3,z:10}, lookAt: {x:15,y:4,z:18}, duration: 5 },
      { position: {x:15,y:6,z:10}, lookAt: {x:-10,y:0,z:-10}, duration: 6 },
      { position: {x:10,y:3,z:-15}, lookAt: {x:-18,y:3,z:-18}, duration: 5 },
      { position: {x:-15,y:10,z:0}, lookAt: {x:0,y:0,z:0}, duration: 5 }
    ],
    // Arena (40x40) — cross corridors, center platform
    [
      { position: {x:-16,y:3,z:-16}, lookAt: {x:0,y:2,z:0}, duration: 5 },
      { position: {x:14,y:4,z:-14}, lookAt: {x:-5,y:2,z:5}, duration: 5 },
      { position: {x:14,y:3,z:14}, lookAt: {x:-14,y:2,z:-5}, duration: 5 },
      { position: {x:-14,y:5,z:14}, lookAt: {x:0,y:1,z:0}, duration: 5 },
      { position: {x:0,y:8,z:0}, lookAt: {x:5,y:0,z:5}, duration: 6 }
    ]
  ];

  // Flythrough state
  var _ftPathIndex = 0;   // current keyframe index
  var _ftProgress = 0;    // 0-1 progress between current and next keyframe
  var _ftMapIndex = -1;   // which map is currently built for menu background

  GAME._menuFlythroughPaths = _menuFlythroughPaths;

  GAME.updateMenuFlythrough = function(dt) {
    if (_ftMapIndex < 0) return;
    var path = _menuFlythroughPaths[_ftMapIndex];
    if (!path || path.length < 2) return;

    var curr = path[_ftPathIndex];
    var next = path[(_ftPathIndex + 1) % path.length];

    _ftProgress += dt / curr.duration;

    if (_ftProgress >= 1) {
      _ftProgress -= 1;
      _ftPathIndex = (_ftPathIndex + 1) % path.length;
      curr = path[_ftPathIndex];
      next = path[(_ftPathIndex + 1) % path.length];
    }

    // Smooth interpolation using smoothstep
    var t = _ftProgress * _ftProgress * (3 - 2 * _ftProgress);

    camera.position.set(
      curr.position.x + (next.position.x - curr.position.x) * t,
      curr.position.y + (next.position.y - curr.position.y) * t,
      curr.position.z + (next.position.z - curr.position.z) * t
    );

    var lx = curr.lookAt.x + (next.lookAt.x - curr.lookAt.x) * t;
    var ly = curr.lookAt.y + (next.lookAt.y - curr.lookAt.y) * t;
    var lz = curr.lookAt.z + (next.lookAt.z - curr.lookAt.z) * t;
    camera.lookAt(lx, ly, lz);
    camera.updateProjectionMatrix();
  };

  function _buildMenuScene() {
    scene = GAME.scene = new THREE.Scene();
    scene.add(camera);

    // Pick a random map
    _ftMapIndex = Math.floor(Math.random() * GAME.getMapCount());
    _ftPathIndex = 0;
    _ftProgress = 0;

    GAME.buildMap(scene, _ftMapIndex, renderer);
    GAME.applyColorGrade();
    if (GAME.particles) {
      GAME.particles.dispose();
      GAME.particles.init(scene);
    }

    // Spawn birds for atmosphere
    var def = GAME.getMapDef(_ftMapIndex);
    GAME.birds.spawn(Math.max(def.size.x, def.size.z));
    weapons.setBirdsRef(GAME.birds.list);

    // Start ambient sound for this map
    if (GAME.Sound) {
      GAME.Sound.startAmbient(def.name);
      if (GAME.Sound.initReverb) GAME.Sound.initReverb(def.name);
    }

    // Hide weapon model during menu flythrough
    if (weapons && weapons.weaponModel) weapons.weaponModel.visible = false;

    // Position camera at first keyframe
    var firstKf = _menuFlythroughPaths[_ftMapIndex][0];
    camera.position.set(firstKf.position.x, firstKf.position.y, firstKf.position.z);
    camera.lookAt(firstKf.lookAt.x, firstKf.lookAt.y, firstKf.lookAt.z);
    camera.fov = 75;
    camera.updateProjectionMatrix();
  }

  GAME.buildMenuScene = _buildMenuScene;

  // ── Quick Play ───────────────────────────────────────────
  var _qpGridIds = {
    competitive: 'comp-map-grid',
    survival: 'surv-map-grid',
    gungame: 'gg-map-grid',
    deathmatch: 'dm-config-map-grid'
  };

  function _getQuickPlaySettings() {
    var mode = localStorage.getItem('miniCS_lastMode') || 'competitive';
    var difficulty = localStorage.getItem('miniCS_difficulty') || 'normal';
    var mapMode = localStorage.getItem('miniCS_mapMode') || 'fixed';
    var gridId = _qpGridIds[mode] || 'comp-map-grid';
    var mapIndex = parseInt(localStorage.getItem('miniCS_lastMap_' + gridId)) || 0;
    if (mapIndex >= GAME.getMapCount()) mapIndex = 0;

    // First-time fallback: random map
    if (!localStorage.getItem('miniCS_lastMode')) {
      mapIndex = Math.floor(Math.random() * GAME.getMapCount());
    }

    return { mode: mode, difficulty: difficulty, mapMode: mapMode, mapIndex: mapIndex };
  }

  GAME.getQuickPlaySettings = _getQuickPlaySettings;

  function _fadeMenuAndStart(startFn) {
    if (GAME.isMobile && GAME.fullscreen) GAME.fullscreen.toggle();
    if (dom.menuContent) {
      dom.menuContent.classList.add('fade-out');
      setTimeout(function() {
        dom.menuContent.classList.remove('fade-out');
        startFn();
      }, 300);
    } else {
      startFn();
    }
  }

  function _updateQuickPlayInfo() {
    var s = _getQuickPlaySettings();
    var mapName = GAME.getMapDef(s.mapIndex).name;
    var modeLabel = s.mode === 'competitive' ? 'Competitive' : s.mode === 'survival' ? 'Survival' : s.mode === 'gungame' ? 'Gun Game' : 'Deathmatch';
    var diffLabel = s.difficulty.charAt(0).toUpperCase() + s.difficulty.slice(1);
    if (dom.quickPlayInfo) {
      dom.quickPlayInfo.textContent = modeLabel + ' \u00B7 ' + diffLabel + ' \u00B7 ' + mapName;
    }
  }

  // Kill streaks moved to js/systems/progression.js

  // Mission system, perk system moved to js/systems/progression.js

  // Rank system moved to js/systems/progression.js

  // Survival mode moved to js/modes/survival.js



  // Gun Game mode moved to js/modes/gungame.js
  var _bossXPBonus = 0;

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
  var _dmBossSpawned = false;
  var dmRespawnQueue = [];
  var dmPlayerDeadTimer = 0;
  var dmBuyMenuAutoOpened = false;
  var dmSpawnProtection = 0;

  // Gun Game best, DM best moved to js/systems/progression.js


  // ── Birds (see js/effects/birds.js) ──────────────────

  // ── Pointer Lock ─────────────────────────────────────────
  renderer.domElement.addEventListener('click', function() {
    if (GAME.isMobile) return;
    if (gameState === PLAYING || gameState === BUY_PHASE || gameState === TOURING ||
        gameState === SURVIVAL_BUY || gameState === SURVIVAL_WAVE || gameState === GUNGAME_ACTIVE ||
        gameState === DEATHMATCH_ACTIVE) {
      if (!document.pointerLockElement) renderer.domElement.requestPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', function() {
    if (!document.pointerLockElement && buyMenuOpen) {
      buyMenuOpen = false;
      dom.buyMenu.classList.remove('show');
    }
  });

  // Mission, perk system functions moved to js/systems/progression.js

  // Expose test helpers
  GAME._getGameState = function() { return gameState; };
  GAME._updatePauseHint = function() { if (GAME.hud) GAME.hud.updatePauseHint(); };
  GAME._resumeGame = function() { resumeGame(); };
  var _stateMap = { MENU: MENU, PLAYING: PLAYING, PAUSED: PAUSED, BUY_PHASE: BUY_PHASE,
    ROUND_END: ROUND_END, TOURING: TOURING, MATCH_END: MATCH_END,
    SURVIVAL_BUY: SURVIVAL_BUY, SURVIVAL_WAVE: SURVIVAL_WAVE, SURVIVAL_DEAD: SURVIVAL_DEAD,
    GUNGAME_ACTIVE: GUNGAME_ACTIVE, GUNGAME_END: GUNGAME_END,
    DEATHMATCH_ACTIVE: DEATHMATCH_ACTIVE, DEATHMATCH_END: DEATHMATCH_END };
  GAME._setGameState = function(name) { gameState = _stateMap[name]; };
  GAME._STATES = _stateMap;

  // Expose state for hud.js and extracted modules
  Object.defineProperty(GAME, '_roundTimer', { get: function() { return roundTimer; }, set: function(v) { roundTimer = v; }, configurable: true });
  Object.defineProperty(GAME, '_phaseTimer', { get: function() { return phaseTimer; }, set: function(v) { phaseTimer = v; }, configurable: true });
  Object.defineProperty(GAME, '_frameDt', { get: function() { return _frameDt; }, configurable: true });
  // _gungameStartTime now managed by js/modes/gungame.js
  Object.defineProperty(GAME, '_playerScore', { get: function() { return playerScore; }, set: function(v) { playerScore = v; }, configurable: true });
  Object.defineProperty(GAME, '_botScore', { get: function() { return botScore; }, set: function(v) { botScore = v; }, configurable: true });
  Object.defineProperty(GAME, '_teamMode', { get: function() { return teamMode; }, set: function(v) { teamMode = v; }, configurable: true });
  Object.defineProperty(GAME, '_playerTeam', { get: function() { return playerTeam; }, set: function(v) { playerTeam = v; }, configurable: true });
  Object.defineProperty(GAME, '_teamObjective', { get: function() { return teamObjective; }, set: function(v) { teamObjective = v; }, configurable: true });
  Object.defineProperty(GAME, '_gameState', { get: function() { return gameState; }, set: function(v) { gameState = v; }, configurable: true });
  Object.defineProperty(GAME, '_roundNumber', { get: function() { return roundNumber; }, set: function(v) { roundNumber = v; }, configurable: true });
  Object.defineProperty(GAME, '_matchKills', { get: function() { return matchKills; }, set: function(v) { matchKills = v; }, configurable: true });
  Object.defineProperty(GAME, '_matchDeaths', { get: function() { return matchDeaths; }, set: function(v) { matchDeaths = v; }, configurable: true });
  Object.defineProperty(GAME, '_matchHeadshots', { get: function() { return matchHeadshots; }, set: function(v) { matchHeadshots = v; }, configurable: true });
  Object.defineProperty(GAME, '_matchRoundsWon', { get: function() { return matchRoundsWon; }, set: function(v) { matchRoundsWon = v; }, configurable: true });
  Object.defineProperty(GAME, '_matchShotsFired', { get: function() { return matchShotsFired; }, set: function(v) { matchShotsFired = v; }, configurable: true });
  Object.defineProperty(GAME, '_matchShotsHit', { get: function() { return matchShotsHit; }, set: function(v) { matchShotsHit = v; }, configurable: true });
  Object.defineProperty(GAME, '_matchDamageDealt', { get: function() { return matchDamageDealt; }, set: function(v) { matchDamageDealt = v; }, configurable: true });
  Object.defineProperty(GAME, '_matchNadesUsed', { get: function() { return matchNadesUsed; }, set: function(v) { matchNadesUsed = v; }, configurable: true });
  Object.defineProperty(GAME, '_buyMenuOpen', { get: function() { return buyMenuOpen; }, set: function(v) { buyMenuOpen = v; }, configurable: true });
  Object.defineProperty(GAME, '_currentMapIndex', { get: function() { return currentMapIndex; }, set: function(v) { currentMapIndex = v; }, configurable: true });
  Object.defineProperty(GAME, '_startingMapIndex', { get: function() { return startingMapIndex; }, set: function(v) { startingMapIndex = v; }, configurable: true });
  Object.defineProperty(GAME, '_mapWalls', { get: function() { return mapWalls; }, set: function(v) { mapWalls = v; }, configurable: true });
  Object.defineProperty(GAME, '_radioMenuOpen', { get: function() { return radioMenuOpen; }, set: function(v) { radioMenuOpen = v; }, configurable: true });
  Object.defineProperty(GAME, '_selectedDifficulty', { get: function() { return selectedDifficulty; }, set: function(v) { selectedDifficulty = v; }, configurable: true });
  Object.defineProperty(GAME, '_selectedMapMode', { get: function() { return selectedMapMode; }, configurable: true });
  Object.defineProperty(GAME, '_selectedMapModeForMatch', { get: function() { return selectedMapModeForMatch; }, set: function(v) { selectedMapModeForMatch = v; }, configurable: true });
  Object.defineProperty(GAME, '_bossXPBonus', { get: function() { return _bossXPBonus; }, set: function(v) { _bossXPBonus = v; }, configurable: true });

  // Expose constants for extracted modules
  GAME._BUY_PHASE_TIME = BUY_PHASE_TIME;
  GAME._ROUND_TIME = ROUND_TIME;
  GAME._ROUND_END_TIME = ROUND_END_TIME;
  GAME._TEAM_SIZES = TEAM_SIZES;

  // Helper to clear bullet holes and dust particles between rounds
  GAME._clearRoundEffects = function() {
    for (var bhi = 0; bhi < bulletHoles.length; bhi++) bulletHoles[bhi].mat.dispose();
    bulletHoles.length = 0;
    _dustParticles.length = 0;
  };

  // Helper to create a fresh scene for a new round
  GAME._newRoundScene = function() {
    scene = GAME.scene = new THREE.Scene();
    GAME._clearRoundEffects();
    weapons.scene = scene;
    enemyManager.scene = scene;
    scene.add(camera);
    return scene;
  };

  // ── Initialize ───────────────────────────────────────────
  function init() {
    player = new GAME.Player(camera);
    GAME.player = player;
    scene.add(camera);
    weapons = new GAME.WeaponSystem(camera, scene);
    GAME.weaponSystem = weapons;
    enemyManager = new GAME.EnemyManager(scene);
    GAME._enemyManager = enemyManager;
    GAME.reportPlayerSound = function(pos, radius) {
      if (enemyManager) enemyManager.reportSound(pos, 'footstep', radius, playerTeam || null);
    };
    if (GAME.Sound) GAME.Sound.init();

    // Apply saved difficulty
    GAME.setDifficulty(selectedDifficulty);
    initModeGrid();
    GAME.progression.updateRankDisplay();
    setupInput();

    // Mission system init
    GAME.progression.loadMissionState();
    GAME.progression.checkMissionRefresh();
    GAME.progression.updateMissionUI();
    _updateQuickPlayInfo();
    if (GAME.fullscreen) GAME.fullscreen.init();
  }

  function initModeGrid() {
    var grid = dom.modeGrid;
    var cards = grid.querySelectorAll('.mode-card');
    var back = dom.modeBack;

    // Populate map buttons for each mode config
    var mapCount = GAME._maps.length;
    var mapGrids = ['comp-map-grid', 'surv-map-grid', 'gg-map-grid', 'dm-config-map-grid'];
    mapGrids.forEach(function(gridId) {
      var el = document.getElementById(gridId);
      if (!el) return;
      var lastMap = parseInt(localStorage.getItem('miniCS_lastMap_' + gridId)) || 0;
      if (lastMap >= mapCount) lastMap = 0;
      el.innerHTML = '';
      for (var i = 0; i < mapCount; i++) {
        var btn = document.createElement('button');
        btn.className = 'config-map-btn' + (i === lastMap ? ' selected' : '');
        btn.dataset.map = i;
        btn.textContent = GAME._maps[i].name;
        el.appendChild(btn);
      }
      // Map button selection + save preference
      el.addEventListener('click', function(e) {
        var btn = e.target.closest('.config-map-btn');
        if (!btn) return;
        if (GAME.Sound) GAME.Sound.menuSelect();
        el.querySelectorAll('.config-map-btn').forEach(function(b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        localStorage.setItem('miniCS_lastMap_' + gridId, btn.dataset.map);
      });
    });

    // Sync difficulty buttons with stored preference
    document.querySelectorAll('.config-diff-btn[data-diff]').forEach(function(btn) {
      btn.classList.toggle('selected', btn.dataset.diff === selectedDifficulty);
    });

    // Difficulty button click handling (all rows)
    // IMPORTANT: .config-diff-row is shared by difficulty AND other option rows (map mode, etc).
    // Always guard with a data-attribute check so clicks on non-difficulty buttons are ignored.
    document.querySelectorAll('.config-diff-row').forEach(function(row) {
      row.addEventListener('click', function(e) {
        var btn = e.target.closest('.config-diff-btn');
        if (!btn || !btn.dataset.diff) return;
        if (GAME.Sound) GAME.Sound.menuSelect();
        selectedDifficulty = btn.dataset.diff;
        GAME.setDifficulty(selectedDifficulty);
        localStorage.setItem('miniCS_difficulty', selectedDifficulty);
        // Update ALL difficulty rows to stay in sync
        document.querySelectorAll('.config-diff-btn[data-diff]').forEach(function(b) {
          b.classList.toggle('selected', b.dataset.diff === selectedDifficulty);
        });
      });
    });

    // ── Competitive Mode toggle (Solo / Team) ──
    var selectedCompMode = localStorage.getItem('miniCS_compMode') || 'solo';
    var selectedObjective = localStorage.getItem('miniCS_objective') || 'elimination';
    var selectedSide = localStorage.getItem('miniCS_side') || 'ct';

    function updateCompModeUI() {
      // Toggle Solo/Team buttons
      dom.compModeRow.querySelectorAll('.config-diff-btn').forEach(function(b) {
        b.classList.toggle('selected', b.dataset.compMode === selectedCompMode);
      });
      // Show/hide team options
      dom.compTeamOptions.style.display = selectedCompMode === 'team' ? 'block' : 'none';
      // Show/hide team size hints on difficulty buttons
      var hints = document.querySelectorAll('#comp-diff-row .team-size-hint');
      hints.forEach(function(h) { h.style.display = selectedCompMode === 'team' ? 'inline' : 'none'; });
      // Objective buttons
      dom.compObjectiveRow.querySelectorAll('.config-diff-btn').forEach(function(b) {
        b.classList.toggle('selected', b.dataset.objective === selectedObjective);
      });
      // Side buttons
      dom.compSideRow.querySelectorAll('.config-diff-btn').forEach(function(b) {
        b.classList.toggle('selected', b.dataset.side === selectedSide);
      });
      // Map mode buttons (sync all mode panels)
      var mapModeRows = [dom.compMapModeRow, dom.survMapModeRow, dom.ggMapModeRow, dom.dmMapModeRow];
      mapModeRows.forEach(function(row) {
        if (!row) return;
        row.querySelectorAll('.config-diff-btn').forEach(function(b) {
          b.classList.toggle('selected', b.dataset.mapMode === selectedMapMode);
        });
      });
    }

    dom.compModeRow.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-comp-mode]');
      if (!btn) return;
      if (GAME.Sound) GAME.Sound.menuSelect();
      selectedCompMode = btn.dataset.compMode;
      localStorage.setItem('miniCS_compMode', selectedCompMode);
      updateCompModeUI();
    });

    dom.compObjectiveRow.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-objective]');
      if (!btn) return;
      if (GAME.Sound) GAME.Sound.menuSelect();
      selectedObjective = btn.dataset.objective;
      localStorage.setItem('miniCS_objective', selectedObjective);
      updateCompModeUI();
    });

    dom.compSideRow.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-side]');
      if (!btn) return;
      if (GAME.Sound) GAME.Sound.menuSelect();
      selectedSide = btn.dataset.side;
      localStorage.setItem('miniCS_side', selectedSide);
      updateCompModeUI();
    });

    // ── Map Mode toggle (Fixed / Rotate) ──
    [dom.compMapModeRow, dom.survMapModeRow, dom.ggMapModeRow, dom.dmMapModeRow].forEach(function(row) {
      if (!row) return;
      row.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-map-mode]');
        if (!btn) return;
        if (GAME.Sound) GAME.Sound.menuSelect();
        selectedMapMode = btn.dataset.mapMode;
        localStorage.setItem('miniCS_mapMode', selectedMapMode);
        updateCompModeUI();
      });
    });

    updateCompModeUI();

    // Card click → expand
    cards.forEach(function(card) {
      card.addEventListener('click', function(e) {
        if (grid.classList.contains('expanded')) return;
        if (e.target.closest('button')) return;
        if (GAME.Sound) GAME.Sound.menuSelect();
        grid.classList.add('expanded');
        card.classList.add('active');
      });
    });

    // Back button → collapse
    back.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      grid.classList.remove('expanded');
      cards.forEach(function(c) { c.classList.remove('active'); });
    });

    // Start buttons
    dom.compStartBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuStartClick();
      var mapEl = document.querySelector('#comp-map-grid .config-map-btn.selected');
      var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
      if (selectedCompMode === 'team') {
        teamMode = true;
        teamObjective = selectedObjective;
        playerTeam = selectedSide;
      } else {
        teamMode = false;
      }
      _fadeMenuAndStart(function() { startMatch(mapIdx); });
    });

    dom.compBossBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuStartClick();
      var mapEl = document.querySelector('#comp-map-grid .config-map-btn.selected');
      var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
      if (selectedCompMode === 'team') {
        teamMode = true;
        teamObjective = selectedObjective;
        playerTeam = selectedSide;
      } else {
        teamMode = false;
      }
      _skipToBoss = true;
      _fadeMenuAndStart(function() { startMatch(mapIdx); });
    });

    dom.survStartBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuStartClick();
      var mapEl = document.querySelector('#surv-map-grid .config-map-btn.selected');
      var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
      _fadeMenuAndStart(function() { GAME.modes.survival.start(mapIdx); });
    });

    dom.ggStartBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuStartClick();
      var mapEl = document.querySelector('#gg-map-grid .config-map-btn.selected');
      var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
      _fadeMenuAndStart(function() { GAME.modes.gungame.start(mapIdx); });
    });

    dom.dmStartBtn2.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuStartClick();
      var mapEl = document.querySelector('#dm-config-map-grid .config-map-btn.selected');
      var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
      _fadeMenuAndStart(function() { startDeathmatch(mapIdx); });
    });

    // Quick Play button
    if (dom.quickPlayBtn) {
      dom.quickPlayBtn.addEventListener('click', function() {
        if (GAME.Sound) GAME.Sound.menuStartClick();
        var s = _getQuickPlaySettings();
        selectedDifficulty = s.difficulty;
        GAME.setDifficulty(s.difficulty);
        selectedMapMode = s.mapMode;

        _fadeMenuAndStart(function() {
          if (s.mode === 'survival') {
            GAME.modes.survival.start(s.mapIndex);
          } else if (s.mode === 'gungame') {
            GAME.modes.gungame.start(s.mapIndex);
          } else if (s.mode === 'deathmatch') {
            startDeathmatch(s.mapIndex);
          } else {
            startMatch(s.mapIndex);
          }
        });
      });
    }

    // Footer link → overlay toggles
    dom.controlsFooter.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      dom.controlsOverlay.classList.add('show');
    });
    dom.controlsClose.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      dom.controlsOverlay.classList.remove('show');
    });

    // Loadout overlay
    var _loadoutWeapon = 'pistol';
    dom.loadoutFooter.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      _loadoutWeapon = 'pistol';
      updateLoadoutUI();
      dom.loadoutOverlay.classList.add('show');
    });
    dom.loadoutClose.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      dom.loadoutOverlay.classList.remove('show');
    });

    function updateLoadoutUI() {
      var skinWeapons = ['pistol', 'smg', 'shotgun', 'rifle', 'awp', 'knife'];
      var DEFS = GAME.WEAPON_DEFS;
      var SKINS = GAME.SKIN_DEFS;
      var equipped = weapons ? weapons.getEquippedSkins() : {};
      var xp = parseInt(localStorage.getItem('miniCS_xp')) || 0;

      // Weapon tabs
      var whtml = '';
      for (var w = 0; w < skinWeapons.length; w++) {
        var wk = skinWeapons[w];
        var active = wk === _loadoutWeapon ? ' active' : '';
        whtml += '<button class="loadout-weapon-btn' + active + '" data-loadout-weapon="' + wk + '">' + (DEFS[wk] ? DEFS[wk].name.split(' ')[0] : wk) + '</button>';
      }
      dom.loadoutWeapons.innerHTML = whtml;

      // Skin cards
      var shtml = '';
      for (var id in SKINS) {
        var s = SKINS[id];
        var isEquipped = (equipped[_loadoutWeapon] || 0) == id;
        var locked = s.xp && xp < s.xp;
        var cls = 'skin-card' + (isEquipped ? ' equipped' : '') + (locked ? ' locked' : '');
        shtml += '<div class="' + cls + '" data-skin-id="' + id + '">' +
          s.name + (s.xp ? '<div class="skin-xp">' + (locked ? s.xp + ' XP' : 'Unlocked') + '</div>' : '') +
          '</div>';
      }
      dom.loadoutSkins.innerHTML = shtml;

      // Click handlers
      dom.loadoutWeapons.querySelectorAll('.loadout-weapon-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          _loadoutWeapon = btn.dataset.loadoutWeapon;
          updateLoadoutUI();
        });
      });
      dom.loadoutSkins.querySelectorAll('.skin-card:not(.locked)').forEach(function(card) {
        card.addEventListener('click', function() {
          if (weapons) weapons.setSkin(_loadoutWeapon, parseInt(card.dataset.skinId));
          updateLoadoutUI();
        });
      });
    }

    dom.missionsFooter.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      GAME.progression.updateMissionOverlay();
      dom.missionsOverlay.classList.add('show');
    });
    dom.missionsClose.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      dom.missionsOverlay.classList.remove('show');
    });

    dom.historyFooter.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      GAME.progression.renderHistory();
      dom.historyPanel.classList.add('show');
    });

    dom.tourFooter.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      dom.tourPanel.classList.add('show');
    });

    // ESC key: pause/resume during game, close overlays in menu
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        // If controls overlay is open, close it (whether in menu or paused)
        if (dom.controlsOverlay.classList.contains('show')) {
          dom.controlsOverlay.classList.remove('show');
          return;
        }
        if (gameState === PAUSED) { resumeGame(); return; }
        if (gameState === MENU) {
          dom.missionsOverlay.classList.remove('show');
          return;
        }
        pauseGame();
      }
    });
  }

  // ── Pause ──────────────────────────────────────────────
  function pauseGame() {
    if (gameState === PAUSED) return;
    var pausable = (gameState === PLAYING || gameState === BUY_PHASE ||
                    gameState === ROUND_END || gameState === TOURING ||
                    gameState === SURVIVAL_BUY || gameState === SURVIVAL_WAVE ||
                    gameState === GUNGAME_ACTIVE || gameState === DEATHMATCH_ACTIVE);
    if (!pausable) return;
    radioMenuOpen = false;
    dom.radioMenu.classList.remove('show');
    pausedFromState = gameState;
    gameState = PAUSED;
    if (document.pointerLockElement) document.exitPointerLock();
    dom.pauseOverlay.classList.add('show');
    GAME.hud.updatePauseHint();
  }

  function resumeGame() {
    if (gameState !== PAUSED) return;
    gameState = pausedFromState;
    pausedFromState = null;
    lastTime = 0; // reset dt so no big jump
    dom.controlsOverlay.classList.remove('show');
    dom.pauseOverlay.classList.remove('show');
    renderer.domElement.requestPointerLock();
    GAME.hud.updatePauseHint();
  }

  function setupInput() {
    document.addEventListener('keydown', function(e) {
      var k = e.key.toLowerCase();

      // Pause toggle
      if (k === 'p') {
        if (gameState === PAUSED) {
          if (dom.controlsOverlay.classList.contains('show')) {
            dom.controlsOverlay.classList.remove('show');
          } else {
            resumeGame();
          }
        } else {
          pauseGame();
        }
        return;
      }

      if (gameState === PAUSED) return;

      // Radio menu
      if (k === 'z' && !buyMenuOpen) {
        radioMenuOpen = !radioMenuOpen;
        dom.radioMenu.classList.toggle('show', radioMenuOpen);
        if (radioMenuOpen) {
          if (radioAutoCloseTimer) clearTimeout(radioAutoCloseTimer);
          radioAutoCloseTimer = setTimeout(function() {
            radioMenuOpen = false;
            dom.radioMenu.classList.remove('show');
          }, 3000);
        } else {
          if (radioAutoCloseTimer) clearTimeout(radioAutoCloseTimer);
        }
        return;
      }

      // Radio command selection
      if (radioMenuOpen && k >= '1' && k <= '6') {
        var idx = parseInt(k) - 1;
        var line = RADIO_LINES[idx];
        if (GAME.Sound && GAME.Sound.radioVoice(line)) {
          GAME.hud.addRadioFeed(line);
        }
        radioMenuOpen = false;
        dom.radioMenu.classList.remove('show');
        if (radioAutoCloseTimer) clearTimeout(radioAutoCloseTimer);
        return;
      }

      if (k === '1') weapons.switchTo('knife');
      if (k === '2') {
        if (weapons.owned.smg && weapons.current !== 'smg') weapons.switchTo('smg');
        else weapons.switchTo('pistol');
      }
      if (k === 'r') weapons.startReload();

      // Block weapon switching in gun game (weapon is forced by level)
      if (gameState === GUNGAME_ACTIVE && (k >= '1' && k <= '6')) return;

      // Skip buy phase with F1
      if (k === 'f1' && gameState === BUY_PHASE) {
        e.preventDefault();
        phaseTimer = 0;
      }

      var isBuyPhase = (gameState === BUY_PHASE || gameState === SURVIVAL_BUY || gameState === DEATHMATCH_ACTIVE || gameState === TOURING);

      if (k === 'b' && isBuyPhase) {
        buyMenuOpen = !buyMenuOpen;
        dom.buyMenu.classList.toggle('show', buyMenuOpen);
        GAME.buy.updateMenu();
      }

      if (isBuyPhase && buyMenuOpen) {
        if (k === '2') GAME.buy.tryBuy('smg');
        if (k === '3') GAME.buy.tryBuy('shotgun');
        if (k === '4') GAME.buy.tryBuy('rifle');
        if (k === '5') GAME.buy.tryBuy('awp');
        if (k === '6') GAME.buy.tryBuy('armor');
        if (k === '7') GAME.buy.tryBuy('grenade');
        if (k === '8') GAME.buy.tryBuy('smoke');
        if (k === '9') GAME.buy.tryBuy('flash');
      } else {
        if (k === '3') weapons.switchTo('shotgun');
        if (k === '4') weapons.switchTo('rifle');
        if (k === '5') weapons.switchTo('awp');
        if (k === '7' || k === 'g') weapons.switchTo('grenade');
        if (k === '8') weapons.switchTo('smoke');
        if (k === '9') weapons.switchTo('flash');
        if (k === 'f') {
          var wdef = GAME.WEAPON_DEFS[weapons.current];
          if (wdef && wdef.isSniper) weapons._toggleScope();
          else weapons._inspecting = true;
        }
      }

      if (k === 'tab') {
        e.preventDefault();
        dom.scoreboard.classList.add('show');
      }
    });

    document.addEventListener('keyup', function(e) {
      var ku = e.key.toLowerCase();
      if (ku === 'tab') dom.scoreboard.classList.remove('show');
      if (ku === 'f' && weapons) weapons._inspecting = false;
    });

    // Prevent Mac trackpad two-finger swipe from triggering browser back/forward navigation
    window.addEventListener('wheel', function(e) {
      e.preventDefault();
    }, { passive: false });

    document.querySelectorAll('.buy-item').forEach(function(el) {
      el.addEventListener('click', function() {
        if (GAME.Sound) GAME.Sound.menuClick();
        if (el.dataset.weapon) GAME.buy.tryBuy(el.dataset.weapon);
        if (el.dataset.item) GAME.buy.tryBuy(el.dataset.item);
      });
    });

    dom.restartBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      dom.matchEnd.classList.remove('show');
      if (_bossOnlyMatch) _skipToBoss = true;
      startMatch();
    });
    dom.menuBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      goToMenu();
    });
    dom.pauseResumeBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      resumeGame();
    });
    dom.pauseControlsBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      dom.controlsOverlay.classList.add('show');
    });
    dom.pauseMenuBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      resumeGame();
      goToMenu();
    });

    dom.historyClose.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      dom.historyPanel.classList.remove('show');
    });

    // Tour mode
    dom.tourPanelClose.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      dom.tourPanel.classList.remove('show');
    });
    dom.tourExitBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      goToMenu();
    });
    document.querySelectorAll('.tour-map-btn:not(.survival-map-btn)').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (GAME.Sound) GAME.Sound.menuClick();
        var mapIndex = parseInt(btn.dataset.map);
        dom.tourPanel.classList.remove('show');
        _fadeMenuAndStart(function() { startTour(mapIndex); });
      });
    });

    dom.survivalRestartBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      dom.survivalEnd.classList.remove('show');
      GAME.modes.survival.start(GAME._maybeRotateMap(GAME.modes.survival.getMapIndex()));
    });
    dom.survivalMenuBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      dom.survivalEnd.classList.remove('show');
      goToMenu();
    });

    dom.gungameRestartBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      dom.gungameEnd.classList.remove('show');
      GAME.modes.gungame.start(GAME._maybeRotateMap(GAME.modes.gungame.getMapIndex()));
    });
    dom.gungameMenuBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      dom.gungameEnd.classList.remove('show');
      goToMenu();
    });
    dom.dmRestartBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      dom.dmEnd.classList.remove('show');
      startDeathmatch(maybeRotateMap(dmMapIndex));
    });
    dom.dmMenuBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      dom.dmEnd.classList.remove('show');
      goToMenu();
    });
  }

  // checkKillStreak moved to js/systems/progression.js

  // maybeRotateMap moved to js/modes/competitive.js
  // Local alias for use by other mode functions still in main.js
  function maybeRotateMap(idx) { return GAME._maybeRotateMap(idx); }

  // ── Match / Round Management ─────────────────────────────
  function startMatch(startMapIdx) {
    localStorage.setItem('miniCS_lastMode', 'competitive');
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.remove('tour-mode');
    dom.matchEnd.classList.remove('show');
    dom.historyPanel.classList.remove('show');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';
    dom.waveCounter.classList.remove('show');

    GAME.setDifficulty(selectedDifficulty);

    playerScore = 0;
    botScore = 0;
    if (_skipToBoss) _bossOnlyMatch = true;
    roundNumber = _skipToBoss ? TOTAL_ROUNDS - 1 : 0;
    startingMapIndex = startMapIdx || 0;
    currentMapIndex = startingMapIndex;
    selectedMapModeForMatch = selectedMapMode;
    matchKills = 0;
    matchDeaths = 0;
    matchHeadshots = 0;
    matchRoundsWon = 0;
    matchShotsFired = 0;
    matchShotsHit = 0;
    matchDamageDealt = 0;
    matchNadesUsed = { he: false, smoke: false, flash: false };
    _bossXPBonus = 0;
    GAME.progression.resetKillStreak();
    player.money = _skipToBoss ? 10000 : 800;

    weapons.owned = { knife: true, pistol: true, shotgun: false, rifle: false, awp: false, grenade: false, smoke: false, flash: false };
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
    _skipToBoss = false;
  }

  function startRound() {
    roundNumber++;
    if (roundNumber > TOTAL_ROUNDS) {
      endMatch();
      return;
    }

    if (roundNumber > 1) currentMapIndex = maybeRotateMap(currentMapIndex);
    GAME.progression.resetKillStreak();

    scene = GAME.scene = new THREE.Scene();

    for (var bhi = 0; bhi < bulletHoles.length; bhi++) bulletHoles[bhi].mat.dispose();
    bulletHoles.length = 0;
    _dustParticles.length = 0;
    weapons.scene = scene;
    enemyManager.scene = scene;
    scene.add(camera);

    var mapData = GAME.buildMap(scene, currentMapIndex, renderer);
    GAME.applyColorGrade();
    if (GAME.particles) {
      GAME.particles.dispose();
      GAME.particles.init(scene);
    }
    mapWalls = mapData.walls;

    if (teamMode) {
      // Team mode — spawn at team-specific locations
      var mySpawns = playerTeam === 'ct' ? mapData.ctSpawns : mapData.tSpawns;
      player.reset(mySpawns[0]);
    } else {
      player.reset(mapData.playerSpawn);
    }
    if (GAME.hasPerk('thick_skin')) player.health = Math.min(125, player.health + 25);
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);
    weapons.resetForRound();
    if (GAME.Sound && GAME.Sound.restoreAudio) GAME.Sound.restoreAudio();

    if (teamMode) {
      var teamSize = TEAM_SIZES[selectedDifficulty] || 3;
      var allyCount = teamSize - 1; // player is one member
      var enemyCount = teamSize;
      var mySpawns = playerTeam === 'ct' ? mapData.ctSpawns : mapData.tSpawns;
      var oppSpawns = playerTeam === 'ct' ? mapData.tSpawns : mapData.ctSpawns;
      enemyManager.spawnTeamBots(mySpawns, oppSpawns, mapData.waypoints, mapWalls,
        allyCount, enemyCount, roundNumber, playerTeam);
    } else {
      var botCount = GAME.getDifficulty().botCount;
      enemyManager.spawnBots(mapData.botSpawns, mapData.waypoints, mapWalls, botCount, mapData.size, mapData.playerSpawn, roundNumber);
    }

    // Spawn boss on final round
    if (GAME.boss.isBossRound(roundNumber)) {
      // Re-spawn with fewer regular bots for boss round
      enemyManager.clearAll();
      var bossRoundBotCount = Math.min(2, GAME.getDifficulty().botCount);
      if (teamMode) {
        var ts = TEAM_SIZES[selectedDifficulty] || 3;
        var mySpawns2 = playerTeam === 'ct' ? mapData.ctSpawns : mapData.tSpawns;
        var oppSpawns2 = playerTeam === 'ct' ? mapData.tSpawns : mapData.ctSpawns;
        enemyManager.spawnTeamBots(mySpawns2, oppSpawns2, mapData.waypoints, mapWalls,
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

    gameState = BUY_PHASE;
    phaseTimer = BUY_PHASE_TIME;
    roundTimer = ROUND_TIME;

    GAME.hud.update();
    buyMenuOpen = true;
    if (GAME.isMobile && GAME.touch && GAME.touch._showBuyCarousel) {
      GAME.touch._showBuyCarousel();
    } else {
      dom.buyMenu.classList.add('show');
      GAME.buy.updateMenu();
    }
    if (teamMode) {
      var sideLabel = playerTeam === 'ct' ? 'Counter-Terrorist' : 'Terrorist';
      GAME.hud.showAnnouncement('ROUND ' + roundNumber, sideLabel + ' — ' + mapData.name);
    } else {
      GAME.hud.showAnnouncement('ROUND ' + roundNumber, 'Map: ' + mapData.name);
    }

    dom.roundInfo.textContent = 'Round ' + roundNumber + ' / ' + TOTAL_ROUNDS;
    dom.mapInfo.textContent = 'Map: ' + mapData.name;

    if (GAME.Sound) { GAME.Sound.startAmbient(mapData.name); if (GAME.Sound.initReverb) GAME.Sound.initReverb(mapData.name); }

    // Warm up all shader programs during buy phase to prevent compilation hitches
    GAME._warmUpShaders();
  }
  GAME._startRound = function() { startRound(); };

  // Bomb defusal helpers moved to js/systems/bomb.js

  function endRound(playerWon) {
    GAME.boss.hideHealthBar();
    // Clean up bomb HUD
    dom.bombHud.style.display = 'none';
    GAME.bomb.reset();

    radioMenuOpen = false;
    dom.radioMenu.classList.remove('show');
    gameState = ROUND_END;
    phaseTimer = ROUND_END_TIME;
    GAME.progression.setLastRoundWon(playerWon);

    if (playerWon) {
      playerScore++;
      matchRoundsWon++;
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
      botScore++;
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
    buyMenuOpen = false;
    dom.buyMenu.classList.remove('show');
  }

  GAME._endRound = function(playerWon) { endRound(playerWon); };

  function endMatch() {
    GAME.boss.hideHealthBar();
    radioMenuOpen = false;
    dom.radioMenu.classList.remove('show');
    if (GAME.Sound) GAME.Sound.stopAmbient();
    gameState = MATCH_END;
    dom.hud.style.display = 'none';
    if (document.pointerLockElement) document.exitPointerLock();

    var result = playerScore > botScore ? 'VICTORY' : playerScore < botScore ? 'DEFEAT' : 'DRAW';
    dom.matchResult.textContent = result;
    dom.matchResult.style.color = playerScore > botScore ? '#4caf50' : playerScore < botScore ? '#ef5350' : '#fff';
    dom.finalScore.textContent = playerScore + ' \u2014 ' + botScore;

    // Mission tracking for match end
    if (playerScore > botScore) GAME.progression.trackMissionEvent('weekly_wins', 1);
    GAME.progression.trackMissionEvent('money_earned', player.money - 800);
    var endAccuracy = matchShotsFired > 0 ? (matchShotsHit / matchShotsFired * 100) : 0;
    if (endAccuracy >= 60) GAME.progression.trackMissionEvent('high_accuracy', 1);

    // XP calculation
    var isWin = playerScore > botScore;
    var diffMult = GAME.progression.DIFF_XP_MULT[selectedDifficulty] || 1;
    var xpEarned = GAME.progression.calculateXP(matchKills, matchHeadshots, matchRoundsWon, isWin, diffMult) + _bossXPBonus;
    var rankResult = GAME.progression.awardXP(xpEarned);

    // Show stats + XP breakdown
    var accuracy = matchShotsFired > 0 ? Math.round(matchShotsHit / matchShotsFired * 100) : 0;
    var hsPercent = matchKills > 0 ? Math.round(matchHeadshots / matchKills * 100) : 0;

    dom.matchXpBreakdown.innerHTML =
      '<div style="display:flex;justify-content:space-around;margin-bottom:10px;font-size:13px;color:#aaa;">' +
        '<div><span style="color:#fff;font-size:18px;">' + matchKills + ' / ' + matchDeaths + '</span><br>K / D</div>' +
        '<div><span style="color:#fff;font-size:18px;">' + accuracy + '%</span><br>Accuracy</div>' +
        '<div><span style="color:#fff;font-size:18px;">' + hsPercent + '%</span><br>HS %</div>' +
        '<div><span style="color:#fff;font-size:18px;">' + matchDamageDealt + '</span><br>Damage</div>' +
      '</div>' +
      '<div class="xp-line"><span>Kills (' + matchKills + ')</span><span class="xp-val">+' + (matchKills * 10) + '</span></div>' +
      '<div class="xp-line"><span>Headshots (' + matchHeadshots + ')</span><span class="xp-val">+' + (matchHeadshots * 5) + '</span></div>' +
      '<div class="xp-line"><span>Rounds Won (' + matchRoundsWon + ')</span><span class="xp-val">+' + (matchRoundsWon * 20) + '</span></div>' +
      (isWin ? '<div class="xp-line"><span>Match Win</span><span class="xp-val">+50</span></div>' : '') +
      '<div class="xp-line"><span>Difficulty (' + selectedDifficulty + ')</span><span class="xp-val">x' + diffMult + '</span></div>' +
      '<div class="xp-total">Total: +' + xpEarned + ' XP</div>' +
      (rankResult.ranked_up ? '<div style="color:#ffca28;margin-top:4px;">RANKED UP: ' + rankResult.newRank.name + '!</div>' : '');

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

  // Gun Game mode functions moved to js/modes/gungame.js

  // ── Deathmatch Mode ─────────────────────────────────────
  function startDeathmatch(mapIndex) {
    localStorage.setItem('miniCS_lastMode', 'deathmatch');
    teamMode = false;
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.remove('tour-mode');
    dom.dmEnd.classList.remove('show');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';
    dom.waveCounter.classList.remove('show');
    dom.gungameLevel.classList.remove('show');

    dmMapIndex = mapIndex;
    selectedMapModeForMatch = selectedMapMode;
    dmKills = 0;
    _dmBossSpawned = false;
    dmDeaths = 0;
    _bossXPBonus = 0;
    dmHeadshots = 0;
    dmTimer = DEATHMATCH_TIME_LIMIT;
    dmStartTime = performance.now() / 1000;
    dmRespawnQueue = [];
    dmPlayerDeadTimer = 0;
    dmBuyMenuAutoOpened = false;
    GAME._dmBuyMenuAutoOpened = false;
    dmSpawnProtection = 0;
    GAME.progression.resetKillStreak();
    matchKills = 0;
    matchDeaths = 0;
    matchHeadshots = 0;
    matchShotsFired = 0;
    matchShotsHit = 0;
    matchDamageDealt = 0;
    player.money = 800;

    GAME.setDifficulty(selectedDifficulty);

    // Build map
    scene = GAME.scene = new THREE.Scene();

    for (var bhi = 0; bhi < bulletHoles.length; bhi++) bulletHoles[bhi].mat.dispose();
    bulletHoles.length = 0;
    _dustParticles.length = 0;
    weapons.scene = scene;
    enemyManager.scene = scene;
    scene.add(camera);

    var mapData = GAME.buildMap(scene, dmMapIndex, renderer);
    GAME.applyColorGrade();
    if (GAME.particles) {
      GAME.particles.dispose();
      GAME.particles.init(scene);
    }
    mapWalls = mapData.walls;
    dmLastMapData = mapData;

    player.reset(mapData.playerSpawn);
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);

    // Start with pistol + knife
    weapons.owned = { knife: true, pistol: true, shotgun: false, rifle: false, awp: false, grenade: false, smoke: false, flash: false };
    weapons.grenadeCount = 0;
    weapons.smokeCount = 0;
    weapons.flashCount = 0;
    weapons.current = 'pistol';
    weapons.resetAmmo();
    weapons._createWeaponModel();

    // Spawn bots
    var diff = GAME.getDifficulty();
    var botCount = diff.botCount || 3;
    enemyManager.spawnBots(mapData.botSpawns, mapData.waypoints, mapWalls, botCount, mapData.size, mapData.playerSpawn, 3);

    GAME.birds.spawn(mapData.size ? Math.max(mapData.size.x, mapData.size.z) : 50);
    weapons.setBirdsRef(GAME.birds.list);
    GAME.minimap.cacheWalls(mapWalls, mapData.size);

    gameState = DEATHMATCH_ACTIVE;

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
    dmBuyMenuAutoOpened = false;
    GAME._dmBuyMenuAutoOpened = false;
    dom.dmRespawnTimer.style.display = 'block';
  }

  function dmPlayerRespawn() {
    // Close buy menu that was auto-opened during death
    buyMenuOpen = false;
    dom.buyMenu.classList.remove('show');
    if (GAME.touch && GAME.touch._hideBuyCarousel) GAME.touch._hideBuyCarousel();
    dmBuyMenuAutoOpened = false;
    GAME._dmBuyMenuAutoOpened = false;

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
    weapons._createWeaponModel();
    weapons.resetAmmo();
    GAME.progression.resetKillStreak();
    dmSpawnProtection = 1.5;
    if (GAME.Sound && GAME.Sound.restoreAudio) GAME.Sound.restoreAudio();
    dmPlayerDeadTimer = 0;
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

  function endDeathmatch() {
    GAME.boss.hideHealthBar();
    _dmBossSpawned = false;
    if (GAME.Sound) GAME.Sound.stopAmbient();
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
    var mapNames = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var mapName = mapNames[dmMapIndex] || 'dust';
    GAME.progression.setDMBest(mapName, dmKills);

    // Mission tracking for DM end
    var dmEndAccuracy = matchShotsFired > 0 ? (matchShotsHit / matchShotsFired * 100) : 0;
    if (dmEndAccuracy >= 60) GAME.progression.trackMissionEvent('high_accuracy', 1);

    var kd = dmDeaths > 0 ? (dmKills / dmDeaths).toFixed(2) : dmKills.toFixed(2);
    dom.dmKillResult.textContent = dmKills + ' Kills in ' + timeStr;
    dom.dmStatsDisplay.textContent = dmDeaths + ' Deaths | K/D: ' + kd + ' | ' + dmHeadshots + ' Headshots';

    // XP
    var diffMult = GAME.progression.DIFF_XP_MULT[selectedDifficulty] || 1;
    var kdBonus = Math.max(0, Math.floor((dmKills - dmDeaths) * 5));
    var rawXP = dmKills * 10 + dmHeadshots * 5 + kdBonus;
    var xpEarned = Math.round(rawXP * diffMult * 0.7) + _bossXPBonus;
    var rankResult = GAME.progression.awardXP(xpEarned);

    dom.dmXpBreakdown.innerHTML =
      '<div class="xp-line"><span>Kills (' + dmKills + ')</span><span class="xp-val">+' + (dmKills * 10) + '</span></div>' +
      '<div class="xp-line"><span>Headshots (' + dmHeadshots + ')</span><span class="xp-val">+' + (dmHeadshots * 5) + '</span></div>' +
      '<div class="xp-line"><span>K/D Bonus</span><span class="xp-val">+' + kdBonus + '</span></div>' +
      '<div class="xp-line"><span>Difficulty (' + selectedDifficulty + ')</span><span class="xp-val">x' + diffMult + '</span></div>' +
      '<div class="xp-line"><span>DM multiplier</span><span class="xp-val">x0.7</span></div>' +
      '<div class="xp-total">Total: +' + xpEarned + ' XP</div>' +
      (rankResult.ranked_up ? '<div style="color:#ffca28;margin-top:4px;">RANKED UP: ' + rankResult.newRank.name + '!</div>' : '');

    dom.dmEnd.classList.add('show');
    GAME.progression.updateRankDisplay();

    if (dmKills >= DEATHMATCH_KILL_TARGET) {
      GAME.hud.showAnnouncement('VICTORY', dmKills + ' kills!');
    } else {
      GAME.hud.showAnnouncement('TIME UP', dmKills + ' kills');
    }
  }

  function goToMenu() {
    if (GAME.fullscreen && GAME.fullscreen.isActive()) GAME.fullscreen.toggle();
    gameState = MENU;
    _bossOnlyMatch = false;
    dom.matchEnd.classList.remove('show');
    dom.survivalEnd.classList.remove('show');
    dom.gungameEnd.classList.remove('show');
    dom.dmEnd.classList.remove('show');
    dom.dmKillCounter.style.display = 'none';
    dom.dmRespawnTimer.style.display = 'none';
    dom.hud.style.display = 'none';
    dom.hud.classList.remove('tour-mode');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';
    dom.waveCounter.classList.remove('show');
    dom.gungameLevel.classList.remove('show');
    dom.moneyDisplay.style.display = '';
    dom.menuScreen.classList.remove('hidden');
    // Collapse mode grid if expanded
    dom.modeGrid.classList.remove('expanded');
    dom.modeGrid.querySelectorAll('.mode-card').forEach(function(c) { c.classList.remove('active'); });
    // Close overlays
    dom.controlsOverlay.classList.remove('show');
    dom.missionsOverlay.classList.remove('show');
    if (GAME.Sound) GAME.Sound.stopAmbient();
    if (document.pointerLockElement) document.exitPointerLock();
    GAME.progression.updateRankDisplay();
    GAME.progression.updateMissionUI();
    _updateQuickPlayInfo();
    _buildMenuScene();
  }

  function startTour(mapIndex) {
    dom.tourPanel.classList.remove('show');
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.add('tour-mode');
    dom.tourExitBtn.style.display = 'block';

    scene = GAME.scene = new THREE.Scene();

    for (var bhi = 0; bhi < bulletHoles.length; bhi++) bulletHoles[bhi].mat.dispose();
    bulletHoles.length = 0;
    _dustParticles.length = 0;
    weapons.scene = scene;
    enemyManager.scene = scene;
    scene.add(camera);

    var mapData = GAME.buildMap(scene, mapIndex, renderer);
    GAME.applyColorGrade();
    if (GAME.particles) {
      GAME.particles.dispose();
      GAME.particles.init(scene);
    }
    mapWalls = mapData.walls;

    player.reset(mapData.playerSpawn);
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);

    player.money = 1000000;
    weapons.owned = { knife: true, pistol: true, shotgun: true, rifle: true, awp: true, grenade: false };
    weapons.current = 'pistol';
    weapons.resetAmmo();
    weapons._createWeaponModel();

    GAME.birds.spawn(Math.max(mapData.size.x, mapData.size.z));
    weapons.setBirdsRef(GAME.birds.list);


    dom.tourMapLabel.textContent = 'Tour: ' + mapData.name;
    dom.tourMapLabel.style.display = 'block';

    if (GAME.Sound) { GAME.Sound.startAmbient(mapData.name); if (GAME.Sound.initReverb) GAME.Sound.initReverb(mapData.name); }
    gameState = TOURING;
  }

  // Survival mode functions moved to js/modes/survival.js

  // Match history moved to js/systems/progression.js

  // Buy system moved to js/ui/buy.js
  GAME._dmBuyMenuAutoOpened = false;

  // ── Flashbang processing ────────────────────────────────
  var flashFadeTimer = 0;
  var _bloomBoostTimer = 0;
  var flashFadeTotal = 0;

  function processFlashbang(flashPos) {
    var toFlash = flashPos.clone().sub(camera.position);
    var dist = toFlash.length();
    if (dist > 25) return;

    toFlash.normalize();
    var fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    var dot = fwd.dot(toFlash);

    // Flash even if not looking directly (reduced effect)
    var intensity = Math.max(0, (dot + 0.2) / 1.2) * (1 - dist / 25);
    if (intensity > 0.05) {
      var duration = intensity * 3;
      if (dom.flashOverlay) {
        dom.flashOverlay.style.opacity = Math.min(1, intensity);
      }
      flashFadeTimer = duration;
      flashFadeTotal = duration;

      if (GAME._postProcess && GAME._postProcess.bloomStrength) {
        GAME._postProcess.bloomStrength.value = 1.0;
        _bloomBoostTimer = 0.2;
      }
    }

    // Flash bots
    for (var i = 0; i < enemyManager.enemies.length; i++) {
      var e = enemyManager.enemies[i];
      if (!e.alive) continue;
      var eDist = e.mesh.position.distanceTo(flashPos);
      if (eDist > 15) continue;
      // Elite bots: 50% dodge
      if (selectedDifficulty === 'elite' && Math.random() < 0.5) continue;
      e._blindTimer = 2.0 * (1 - eDist / 15);
    }
  }

  // ── Grenade Explosion Damage ────────────────────────────
  function processExplosions(explosions) {
    if (!explosions) return;
    for (var i = 0; i < explosions.length; i++) {
      var exp = explosions[i];

      // Handle flashbang
      if (exp.type === 'flash') {
        processFlashbang(exp.position);
        continue;
      }

      var pos = exp.position;
      var radius = exp.radius;
      var maxDmg = exp.damage;

      GAME.triggerScreenShake(0.08);

      // Spawn explosion particle effects
      if (GAME.particles) {
        GAME.particles.spawnExplosion(pos);
      }

      for (var j = 0; j < enemyManager.enemies.length; j++) {
        var enemy = enemyManager.enemies[j];
        if (!enemy.alive) continue;
        var dist = enemy.mesh.position.distanceTo(pos);
        if (dist < radius) {
          var dmgFactor = 1 - (dist / radius);
          var dmg = Math.round(maxDmg * dmgFactor);
          if (dmg > 0) {
            var nadeDir = new THREE.Vector3();
            nadeDir.subVectors(enemy.mesh.position, pos).normalize();
            enemy._lastHitDir = nadeDir;
            enemy._headshotKill = false;
            var killed = enemy.takeDamage(dmg);
            if (GAME.particles) {
              GAME.particles.spawnBlood(enemy.mesh.position, nadeDir, false);
            }
            if (killed) {
              onEnemyKilled(enemy, false, pos);
              GAME.hud.addKillFeed('You [HE]', 'Bot ' + (enemy.id + 1));
              GAME.progression.trackMissionEvent('grenade_kills', 1);
            }
          }
        }
      }

      if (player.alive) {
        var playerDist = player.position.distanceTo(pos);
        if (playerDist < radius) {
          var playerDmgFactor = 1 - (playerDist / radius);
          var playerDmg = Math.round(maxDmg * 0.6 * playerDmgFactor);
          if (playerDmg > 0) {
            player.takeDamage(playerDmg);
            if (!player.alive) { weapons._unscope(); weapons.dropWeapon(player.position, player.yaw); }
            damageFlashTimer = 0.2;
            GAME.triggerScreenShake(0.03);
            if (GAME.Sound) GAME.Sound.playerHurt();
          }
        }
      }
    }
  }

  // ── Common kill handling ────────────────────────────────
  function onEnemyKilled(enemy, isHeadshot, point) {
    matchKills++;
    if (GAME.modes.survival) GAME.modes.survival.addKill(isHeadshot);
    if (isHeadshot) {
      matchHeadshots++;
    }
    // Kill dink sound
    if (GAME.Sound) {
      if (isHeadshot) { GAME.Sound.killDinkHeadshot(); GAME.Sound.killThumpHeadshot(); }
      else { GAME.Sound.killDink(); GAME.Sound.killThump(); }
      if (GAME.Sound.killConfirm) GAME.Sound.killConfirm();
    }
    GAME.effects.triggerKillSlowMo(GAME.progression.getKillStreak());
    GAME.triggerKillKick(isHeadshot);
    GAME._hitFeedback.killTimer = 0.2;

    // Boss kill — special reward + notification
    if (enemy.isBoss) {
      player.money = Math.min(16000, player.money + 5000);
      // 5x XP bonus — normal kill is 10 XP, boss is 50 XP (net +40 bonus)
      _bossXPBonus += 40;
      GAME.progression.trackMissionEvent('boss_kills', 1);
      GAME.boss.hideHealthBar();
      GAME.hud.addKillFeed('You', 'BOSS', true);
      if (GAME.Sound && GAME.Sound.bossDeath) GAME.Sound.bossDeath();
      if (GAME.Sound && GAME.Sound.bossVictory) GAME.Sound.bossVictory();

      // Enhanced slow-mo (overrides normal kill slow-mo set above)
      GAME.killSlowMo.active = true;
      GAME.killSlowMo.timer = 0.4;
      GAME.killSlowMo.scale = 0.3;

      // Heavy screen shake
      GAME.triggerScreenShake(0.3);

      // Screen flash
      var flashEl = document.getElementById('boss-flash');
      if (flashEl) {
        flashEl.style.transition = 'none';
        flashEl.style.opacity = '0.6';
        setTimeout(function() {
          flashEl.style.transition = 'opacity 0.5s ease-out';
          flashEl.style.opacity = '0';
        }, 16);
      }

      // Gold announcement
      GAME.hud.showAnnouncement('BOSS ELIMINATED', '+$5000');
      dom.announcement.classList.add('boss-eliminated');
      setTimeout(function() {
        dom.announcement.classList.remove('boss-eliminated');
      }, 2500);

      // Reset boss atmosphere
      GAME.boss.resetAtmosphere();

      // Boss explosion particles
      if (GAME.particles && GAME.particles.spawnBossExplosion) {
        GAME.particles.spawnBossExplosion(enemy.mesh.position);
      }

      // Chain-death — all enemies die 0.3s after boss
      (function(em) {
        setTimeout(function() {
          for (var mi = em.enemies.length - 1; mi >= 0; mi--) {
            var e = em.enemies[mi];
            if (e.alive) {
              e.takeDamage(99999);
              if (GAME.particles && GAME.particles.spawnExplosion) {
                GAME.particles.spawnExplosion(e.mesh.position);
              }
            }
          }
        }, 300);
      })(enemyManager);
    }

    if (gameState === GUNGAME_ACTIVE) {
      GAME.modes.gungame.addKill(isHeadshot);
      GAME.progression.checkKillStreak();
      if (GAME.Sound) GAME.Sound.kill();
      // Queue bot respawn instead of waiting for all dead
      GAME.modes.gungame.queueBotRespawn(enemy);
      // Remove from enemies array
      var idx = enemyManager.enemies.indexOf(enemy);
      if (idx >= 0) enemyManager.enemies.splice(idx, 1);
      // Check if boss was killed — ends gun game
      if (enemy.isBoss && GAME.modes.gungame.isBossSpawned()) {
        GAME.modes.gungame.end();
        return;
      }
      // Advance weapon level
      GAME.modes.gungame.advanceLevel();
    } else if (gameState === DEATHMATCH_ACTIVE) {
      dmKills++;
      if (isHeadshot) dmHeadshots++;
      var wdef = weapons ? GAME.WEAPON_DEFS[weapons.current] : null;
      var baseReward = (wdef && wdef.killReward) ? wdef.killReward : 300;
      var killBonus = GAME.hasPerk('scavenger') ? Math.round(baseReward * 1.5) : baseReward;
      player.money = Math.min(16000, player.money + killBonus);
      GAME.progression.checkKillStreak();
      if (GAME.Sound) GAME.Sound.kill();
      // Queue bot respawn
      dmQueueBotRespawn(enemy);
      var idx2 = enemyManager.enemies.indexOf(enemy);
      if (idx2 >= 0) enemyManager.enemies.splice(idx2, 1);
      // Check win
      if (enemy.isBoss && _dmBossSpawned) {
        endDeathmatch();
      } else if (dmKills >= DEATHMATCH_KILL_TARGET && !_dmBossSpawned) {
        _dmBossSpawned = true;
        var dmMapData = dmLastMapData;
        if (dmMapData) {
          var bossSpawn = dmMapData.botSpawns[0];
          var boss = enemyManager.spawnBoss(bossSpawn, dmMapData.waypoints, mapWalls);
          GAME.boss.showHealthBar(boss);
          GAME.boss.activateAtmosphere();
          GAME.hud.showAnnouncement('BOSS INCOMING', 'Kill the Boss to win!');
          if (GAME.Sound && GAME.Sound.bossSpawnAlert) GAME.Sound.bossSpawnAlert();
        }
      }
    } else {
      var wdef2 = weapons ? GAME.WEAPON_DEFS[weapons.current] : null;
      var baseReward2 = (wdef2 && wdef2.killReward) ? wdef2.killReward : 300;
      var killBonus = GAME.hasPerk('scavenger') ? Math.round(baseReward2 * 1.5) : baseReward2;
      player.money = Math.min(16000, player.money + killBonus);
      GAME.progression.checkKillStreak();
      if (GAME.Sound) GAME.Sound.kill();
    }

    // Mission tracking
    GAME.progression.trackMissionEvent('kills', 1);
    if (isHeadshot) {
      GAME.progression.trackMissionEvent('headshots', 1);
      GAME.progression.trackMissionEvent('weekly_headshots', 1);
    }
    if (player.crouching) GAME.progression.trackMissionEvent('crouch_kills', 1);
    if (weapons.current === 'knife') GAME.progression.trackMissionEvent('knife_kills', 1);
    if (weapons.current === 'awp') GAME.progression.trackMissionEvent('awp_kills', 1);
    if (weapons.current === 'smg') GAME.progression.trackMissionEvent('smg_kills', 1);
    if (weapons.current === 'shotgun') GAME.progression.trackMissionEvent('shotgun_kills', 1);
    if (gameState === DEATHMATCH_ACTIVE) GAME.progression.trackMissionEvent('dm_kills', 1);
  }

  // ── Shooting hit processing ────────────────────────────
  function processShootResults(results) {
    if (!results) return;
    matchShotsFired++;
    for (var ri = 0; ri < results.length; ri++) {
      var result = results[ri];
      if (result.type === 'enemy') {
        // Friendly fire disabled in team mode
        if (teamMode && result.enemy.team === playerTeam) continue;
        matchShotsHit++;
        matchDamageDealt += result.damage;
        // Store hit info for death animation
        var shootDir = new THREE.Vector3();
        shootDir.subVectors(result.point, player.position).normalize();
        result.enemy._lastHitDir = shootDir;
        result.enemy._headshotKill = result.headshot;
        var killed = result.enemy.takeDamage(result.damage);
        GAME.effects.showHitmarker(result.headshot);
        GAME.effects.showDamageNumber(result.point, result.damage, result.headshot);
        GAME.effects.spawnBloodBurst(result.point, result.headshot, result.direction);
        GAME._hitFeedback.hitTimer = 0.1;
        if (result.headshot && GAME.Sound) GAME.Sound.headshotDink();

        if (killed) {
          onEnemyKilled(result.enemy, result.headshot, result.point);
          var hsTag = result.headshot ? ' (HEADSHOT)' : '';
          GAME.hud.addKillFeed('You', 'Bot ' + (result.enemy.id + 1) + hsTag);
        }
      } else if (result.type === 'grenade_thrown') {
        // Track nade usage for all_nades challenge
        if (result.grenadeType === 'grenade') matchNadesUsed.he = true;
        else if (result.grenadeType === 'smoke') matchNadesUsed.smoke = true;
        else if (result.grenadeType === 'flash') matchNadesUsed.flash = true;
        if (matchNadesUsed.he && matchNadesUsed.smoke && matchNadesUsed.flash) {
          GAME.progression.trackMissionEvent('all_nades', 1);
        }
      } else if (result.type === 'bird') {
        GAME.birds.kill(result.bird, result.point);
        player.money = Math.min(16000, player.money + GAME.birds.BIRD_MONEY);
        GAME.hud.addKillFeed('You', 'Bird');
        GAME.effects.showHitmarker(false);
        if (GAME.Sound) GAME.Sound.hitMarker();
      }
    }
  }

  // Boss fight system moved to js/systems/boss.js
  GAME._TOTAL_ROUNDS = TOTAL_ROUNDS;
  GAME._processExplosions = processExplosions;
  Object.defineProperty(GAME, '_skipToBoss', {
    get: function() { return _skipToBoss; },
    set: function(v) { _skipToBoss = v; }
  });
  Object.defineProperty(GAME, '_bossOnlyMatch', {
    get: function() { return _bossOnlyMatch; },
    set: function(v) { _bossOnlyMatch = v; }
  });

  // ── Game Loop ────────────────────────────────────────────
  var lastTime = 0;
  var _frameDt = 0.016;

  function gameLoop(timestamp) {
    requestAnimationFrame(gameLoop);

    // Skip rendering while WebGL context is lost
    if (GAME._contextLost) { return; }

    var now = timestamp / 1000;
    var dt = Math.min(lastTime ? now - lastTime : 0.016, 0.05);
    _frameDt = dt;
    lastTime = now;
    GAME._gameState = gameState;
    if (GAME.quality && GAME.quality.update) GAME.quality.update(dt);
    if (GAME.touch && GAME.touch.update) GAME.touch.update();

    // Kill slow-motion
    var realDt = dt;
    if (GAME.killSlowMo.active) {
      dt *= GAME.killSlowMo.scale;
      GAME.killSlowMo.timer -= realDt;
      if (GAME.killSlowMo.timer <= 0) {
        GAME.killSlowMo.active = false;
        GAME.killSlowMo.scale = 1.0;
      }
    }

    if (gameState === MENU || gameState === MATCH_END || gameState === PAUSED || gameState === GUNGAME_END) {
      if (gameState === MENU) {
        GAME.updateMenuFlythrough(dt);
        GAME.birds.update(dt);
      }
      // Decay transient visual effects so they don't freeze on screen
      if (gameState !== MENU) {
        if (damageFlashTimer > 0) damageFlashTimer -= dt;
        dom.damageFlash.style.opacity = damageFlashTimer > 0 ? Math.min(1, damageFlashTimer / 0.1) : 0;
        GAME.effects.updateDamageIndicators(dt);
        if (weapons) weapons._tickParticles(dt);
        if (_bloomBoostTimer > 0) {
          _bloomBoostTimer -= dt;
          if (_bloomBoostTimer <= 0 && GAME._postProcess && GAME._postProcess.bloomStrength) {
            GAME._postProcess.bloomStrength.value = 0.4;
          }
        }
        if (flashFadeTimer > 0) {
          flashFadeTimer -= dt;
          if (dom.flashOverlay) dom.flashOverlay.style.opacity = Math.max(0, flashFadeTimer / flashFadeTotal);
        }
      }
      if (GAME.particles) GAME.particles.update(dt);
      GAME.hud.updatePauseHint();
      GAME.renderFrame();
      return;
    }
    if (gameState === SURVIVAL_DEAD) {
      if (!player.alive) {
        player.updateDeath(dt);
        weapons.updateDroppedWeapon(dt, player.walls);
      }
      if (damageFlashTimer > 0) damageFlashTimer -= dt;
      dom.damageFlash.style.opacity = damageFlashTimer > 0 ? Math.min(1, damageFlashTimer / 0.1) : 0;
      GAME.effects.updateDamageIndicators(dt);
      if (weapons) weapons._tickParticles(dt);
      if (GAME.particles) GAME.particles.update(dt);
      GAME.hud.updatePauseHint();
      GAME.renderFrame();
      return;
    }

    // Hitmarker fade
    GAME.effects.updateHitmarker(dt);

    // Tour Mode
    if (gameState === TOURING) {
      GAME._weaponMoveMult = weapons.getMovementMult();
      GAME._scopeFovTarget = weapons.getScopeFovTarget();
      player.update(dt);
      if (GAME.Sound && GAME.Sound.updateListener) {
        GAME.Sound.updateListener(camera);
      }
      weapons.setMoving(player.velocity.length() > 0.5);
      weapons.setStrafeDir(player.keys.a ? -1 : player.keys.d ? 1 : 0);
      weapons.setSprinting(player.keys.shift && !player.crouching && player.velocity.length() > 0.5);
      weapons.setVelocity(player._smoothVelX || 0, player._smoothVelZ || 0);
      GAME.birds.update(dt);
      weapons.update(dt, null, null, player.pitch);
      weapons.setCrouching(player.crouching);

      // Handle tap-to-fire single shot
      if (player.alive) consumeTouchTap(weapons);

      if ((weapons.mouseDown || GAME.touchFiring || GAME.touchFireButton) && player.alive) {
        var results = weapons.tryFire(now, []);
        if (results) {
          for (var ti = 0; ti < results.length; ti++) {
            if (results[ti].type === 'bird') {
              GAME.birds.kill(results[ti].bird, results[ti].point);
              if (GAME.Sound) GAME.Sound.hitMarker();
            }
          }
        }
      }

      GAME.effects.applyScreenShake(dt);
      GAME.effects.applyKillKick(dt);

      if (GAME.particles) GAME.particles.update(dt);
      GAME.hud.updatePauseHint();
      GAME.renderFrame();
      return;
    }

    // Buy Phase (match or survival)
    if (gameState === BUY_PHASE || gameState === SURVIVAL_BUY) {
      phaseTimer -= dt;
      GAME._weaponMoveMult = weapons.getMovementMult();
      GAME._scopeFovTarget = weapons.getScopeFovTarget();
      player.update(dt);
      if (GAME.Sound && GAME.Sound.updateListener) {
        GAME.Sound.updateListener(camera);
      }
      weapons.setMoving(player.velocity.length() > 0.5);
      weapons.setStrafeDir(player.keys.a ? -1 : player.keys.d ? 1 : 0);
      weapons.setSprinting(player.keys.shift && !player.crouching && player.velocity.length() > 0.5);
      weapons.setVelocity(player._smoothVelX || 0, player._smoothVelZ || 0);
      GAME.birds.update(dt);
      var buyExplosions = weapons.update(dt, null, null, player.pitch);
      if (buyExplosions) processExplosions(buyExplosions);
      if (phaseTimer <= 0) {
        if (gameState === SURVIVAL_BUY) {
          GAME.modes.survival.startWave();
        } else {
          gameState = PLAYING;
          buyMenuOpen = false;
          dom.buyMenu.classList.remove('show');
          if (GAME.touch && GAME.touch._hideBuyCarousel) GAME.touch._hideBuyCarousel();
          GAME.hud.showAnnouncement('GO!');
          if (GAME.Sound) GAME.Sound.roundStart();
          // Random bot says "Go go go!" at round start
          setTimeout(function() {
            if (GAME.Sound) GAME.Sound.radioVoice('Go go go!');
            GAME.hud.addRadioFeed('Go go go!');
          }, 800);
        }
      }

      GAME.hud.update();
      GAME.hud.updatePauseHint();
      updateMinimap();
      GAME.renderFrame();
      return;
    }

    // Round End
    if (gameState === ROUND_END) {
      phaseTimer -= dt;
      if (!player.alive) {
        player.updateDeath(dt);
        weapons.updateDroppedWeapon(dt, player.walls);
      }
      GAME.birds.update(dt);
      weapons.setSprinting(player.keys.shift && !player.crouching && player.velocity.length() > 0.5);
      weapons.setVelocity(player._smoothVelX || 0, player._smoothVelZ || 0);
      var endExplosions = weapons.update(dt, null, null, player.pitch);
      if (endExplosions) processExplosions(endExplosions);
      if (damageFlashTimer > 0) damageFlashTimer -= dt;
      dom.damageFlash.style.opacity = damageFlashTimer > 0 ? Math.min(1, damageFlashTimer / 0.1) : 0;
      GAME.effects.updateDamageIndicators(dt);
      if (GAME.particles) GAME.particles.update(dt);
      if (phaseTimer <= 0) {
        var nextRound = roundNumber + 1;
        var matchWillEnd = nextRound > TOTAL_ROUNDS;
        if (GAME.progression.getLastRoundWon() && GAME.progression.getActivePerks().length < GAME.progression.PERK_POOL.length && !matchWillEnd) {
          GAME.progression.offerPerkChoice();
        } else {
          startRound();
        }
      }
      GAME.hud.updatePauseHint();
      GAME.renderFrame();
      return;
    }

    // Playing / Survival Wave / Gun Game
    if (gameState === PLAYING || gameState === SURVIVAL_WAVE || gameState === GUNGAME_ACTIVE || gameState === DEATHMATCH_ACTIVE) {
      if (gameState === PLAYING) roundTimer -= dt;

      GAME._weaponMoveMult = weapons.getMovementMult();
      GAME._scopeFovTarget = weapons.getScopeFovTarget();
      player.update(dt);
      if (GAME.Sound && GAME.Sound.updateListener) {
        GAME.Sound.updateListener(camera);
      }
      if (!player.alive) {
        player.updateDeath(dt);
        weapons.updateDroppedWeapon(dt, player.walls);
      }
      weapons.setMoving(player.velocity.length() > 0.5);
      weapons.setStrafeDir(player.keys.a ? -1 : player.keys.d ? 1 : 0);
      weapons.setSprinting(player.keys.shift && !player.crouching && player.velocity.length() > 0.5);
      weapons.setVelocity(player._smoothVelX || 0, player._smoothVelZ || 0);
      var explosions = weapons.update(dt, null, null, player.pitch);

      if (damageFlashTimer > 0) damageFlashTimer -= dt;

      if (_bloomBoostTimer > 0) {
        _bloomBoostTimer -= dt;
        if (_bloomBoostTimer <= 0 && GAME._postProcess && GAME._postProcess.bloomStrength) {
          GAME._postProcess.bloomStrength.value = 0.4;
        }
      }

      // Flash overlay fade
      if (flashFadeTimer > 0) {
        flashFadeTimer -= dt;
        var alpha = Math.max(0, flashFadeTimer / flashFadeTotal);
        if (dom.flashOverlay) dom.flashOverlay.style.opacity = alpha;
      }

      GAME.effects.applyScreenShake(dt);
      GAME.effects.applyKillKick(dt);

      if (explosions) processExplosions(explosions);

      // Handle tap-to-fire single shot
      if (player.alive) consumeTouchTap(weapons);

      // Shooting
      if ((weapons.mouseDown || GAME.touchFiring || GAME.touchFireButton) && player.alive) {
        var results = weapons.tryFire(now, enemyManager.enemies);
        if (results) {
          processShootResults(results);
          // Report sound to enemy AI — gunfire is loud
          enemyManager.reportSound(player.position, 'gunshot', 40, playerTeam || null);
        }
      }

      GAME.birds.update(dt);

      // Enemy AI
      if (player.alive || teamMode) {
        var enemyResult = enemyManager.update(dt, player.position, player.alive, now, teamMode ? playerTeam : null);
        var dmg = enemyResult.damage;
        if (dmg > 0 && player.alive && !(gameState === DEATHMATCH_ACTIVE && dmSpawnProtection > 0)) {
          player.takeDamage(dmg);
          if (!player.alive) { weapons._unscope(); weapons.dropWeapon(player.position, player.yaw); }
          damageFlashTimer = 0.15;
          GAME.triggerScreenShake(0.02);
          if (GAME.Sound) GAME.Sound.playerHurt();
          if (GAME.showDamageIndicator && enemyResult.attackerPos) {
            GAME.showDamageIndicator(enemyResult.attackerPos);
          }
          if (GAME.triggerBloodSplatter) GAME.triggerBloodSplatter(dmg);
        }
      }

      // Bomb defusal logic
      GAME.bomb.update(dt);

      // End conditions (bomb logic may have already ended the round via endRound)
      if (gameState === PLAYING) {
        if (teamMode) {
          // Team mode end conditions
          var oppTeam = playerTeam === 'ct' ? 't' : 'ct';
          var oppAllDead = enemyManager.teamAllDead(oppTeam);
          var allyAllDead = enemyManager.teamAllDead(playerTeam);

          if (teamObjective === 'bomb' && GAME.bomb.isPlanted()) {
            // Bomb is planted — only bomb timer or defuse can end the round
            // Exception: if all CTs die, Ts win immediately
            var ctTeam = playerTeam === 'ct' ? playerTeam : oppTeam;
            var ctAllDead = playerTeam === 'ct' ? (!player.alive && allyAllDead) : oppAllDead;
            if (ctAllDead) {
              if (playerTeam !== 'ct') endRound(true); else { matchDeaths++; endRound(false); }
            }
            // Bomb detonation/defuse handled in updateBombLogic
          } else if (oppAllDead) {
            // All enemies eliminated — player's team wins
            endRound(true);
          } else if (!player.alive && allyAllDead) {
            // Player and all allies dead
            matchDeaths++;
            endRound(false);
          } else if (roundTimer <= 0) {
            // Time up — CT wins in bomb defusal (no plant), loss in elimination
            if (teamObjective === 'bomb') {
              endRound(playerTeam === 'ct');
            } else {
              endRound(false);
            }
          }
        } else {
          if (enemyManager.allDead()) endRound(true);
          else if (!player.alive) { matchDeaths++; endRound(false); }
          else if (roundTimer <= 0) endRound(false);
        }
      } else if (gameState === SURVIVAL_WAVE) {
        if (enemyManager.allDead()) GAME.modes.survival.endWave();
        else if (!player.alive) GAME.modes.survival.end();
      } else if (gameState === GUNGAME_ACTIVE) {
        // Player death — instant respawn
        if (!player.alive) GAME.modes.gungame.playerDied();
        // Bot respawn queue
        GAME.modes.gungame.updateRespawns(dt);
      } else if (gameState === DEATHMATCH_ACTIVE) {
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
            buyMenuOpen = true;
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


      GAME.effects.updateBulletHoles(dt);
      GAME.effects.updateImpactDust(dt);
      GAME.effects.updateFootDust(dt);
      GAME.effects.updateDamageIndicators(dt);
      GAME.effects.updateBloodSplatter(dt);
      GAME.hud.update();
      GAME.boss.updateLoop(dt);
      GAME.hud.updatePauseHint();
      updateMinimap();

      // Spawn protection visual (blue tint pulse)
      if (gameState === DEATHMATCH_ACTIVE && dmSpawnProtection > 0) {
        dom.damageFlash.style.background = 'radial-gradient(ellipse at center, transparent 60%, rgba(100,200,255,0.3) 100%)';
        dom.damageFlash.style.opacity = Math.sin(performance.now() / 100) * 0.1 + 0.15;
      } else {
        dom.damageFlash.style.background = '';
        dom.damageFlash.style.opacity = damageFlashTimer > 0 ? Math.min(1, damageFlashTimer / 0.1) : 0;
      }
    }

    if (GAME.particles) GAME.particles.update(dt);

    GAME.renderFrame();
  }

  // ── Start ────────────────────────────────────────────────
  init();
  if (renderer && renderer.domElement) _buildMenuScene();
  requestAnimationFrame(gameLoop);
})();
