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
  var announcementTimeout = null;
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
  var bombPlanted = false;
  var bombTimer = 0;
  var BOMB_FUSE_TIME = 40;
  var BOMB_PLANT_TIME = 3;
  var BOMB_DEFUSE_TIME = 5;
  var bombPlantProgress = 0;      // 0-1 progress for planting
  var bombDefuseProgress = 0;     // 0-1 progress for defusing
  var bombCarrierBot = null;      // T-side bot carrying the bomb (or null if player has it)
  var playerHasBomb = false;      // true if player (T side) has the bomb
  var bombMesh = null;            // 3D mesh of planted bomb
  var bombPlantedPos = null;      // {x, z} where bomb was planted
  var bombSites = [];             // bombsite data from map
  var bombTickTimer = 0;          // timer for tick sound interval
  var droppedBombMesh = null;     // 3D mesh of dropped bomb on ground
  var droppedBombPos = null;      // position of dropped bomb

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

  // ── Survival Mode ──────────────────────────────────────
  var survivalWave = 0;
  var survivalKills = 0;
  var survivalHeadshots = 0;
  var survivalMapIndex = 0;
  var survivalLastMapData = null;

  // getSurvivalBest, setSurvivalBest moved to js/systems/progression.js



  // ── Gun Game Mode ─────────────────────────────────────
  var GUNGAME_WEAPONS = ['knife', 'pistol', 'shotgun', 'rifle', 'awp', 'knife'];
  var GUNGAME_NAMES = ['Knife', 'Pistol', 'Shotgun', 'AK-47', 'AWP', 'Knife (Final)'];
  var GUNGAME_BOT_COUNT = 4;
  var GUNGAME_BOT_RESPAWN_DELAY = 3;
  var gungameLevel = 0;
  var _gungameBossSpawned = false;
  var _bossXPBonus = 0;
  var gungameKills = 0;
  var gungameDeaths = 0;
  var gungameHeadshots = 0;
  var gungameStartTime = 0;
  var gungameMapIndex = 0;
  var gungameLastMapData = null;
  var gungameRespawnQueue = [];

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
  GAME._updatePauseHint = function() { updatePauseHint(); };
  GAME._resumeGame = function() { resumeGame(); };
  var _stateMap = { MENU: MENU, PLAYING: PLAYING, PAUSED: PAUSED, BUY_PHASE: BUY_PHASE,
    ROUND_END: ROUND_END, TOURING: TOURING, MATCH_END: MATCH_END,
    SURVIVAL_BUY: SURVIVAL_BUY, SURVIVAL_WAVE: SURVIVAL_WAVE, SURVIVAL_DEAD: SURVIVAL_DEAD,
    GUNGAME_ACTIVE: GUNGAME_ACTIVE, GUNGAME_END: GUNGAME_END,
    DEATHMATCH_ACTIVE: DEATHMATCH_ACTIVE, DEATHMATCH_END: DEATHMATCH_END };
  GAME._setGameState = function(name) { gameState = _stateMap[name]; };

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
      _fadeMenuAndStart(function() { startSurvival(mapIdx); });
    });

    dom.ggStartBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuStartClick();
      var mapEl = document.querySelector('#gg-map-grid .config-map-btn.selected');
      var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
      _fadeMenuAndStart(function() { startGunGame(mapIdx); });
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
            startSurvival(s.mapIndex);
          } else if (s.mode === 'gungame') {
            startGunGame(s.mapIndex);
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
    updatePauseHint();
  }

  function resumeGame() {
    if (gameState !== PAUSED) return;
    gameState = pausedFromState;
    pausedFromState = null;
    lastTime = 0; // reset dt so no big jump
    dom.controlsOverlay.classList.remove('show');
    dom.pauseOverlay.classList.remove('show');
    renderer.domElement.requestPointerLock();
    updatePauseHint();
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
          addRadioFeed(line);
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
        updateBuyMenu();
      }

      if (isBuyPhase && buyMenuOpen) {
        if (k === '2') tryBuy('smg');
        if (k === '3') tryBuy('shotgun');
        if (k === '4') tryBuy('rifle');
        if (k === '5') tryBuy('awp');
        if (k === '6') tryBuy('armor');
        if (k === '7') tryBuy('grenade');
        if (k === '8') tryBuy('smoke');
        if (k === '9') tryBuy('flash');
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
        if (el.dataset.weapon) tryBuy(el.dataset.weapon);
        if (el.dataset.item) tryBuy(el.dataset.item);
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
      startSurvival(maybeRotateMap(survivalMapIndex));
    });
    dom.survivalMenuBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      dom.survivalEnd.classList.remove('show');
      goToMenu();
    });

    dom.gungameRestartBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuClick();
      dom.gungameEnd.classList.remove('show');
      startGunGame(maybeRotateMap(gungameMapIndex));
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

  // ── Map Rotation Helper ──────────────────────────────────
  function maybeRotateMap(currentIndex) {
    if (selectedMapModeForMatch !== 'rotate') return currentIndex;
    var mapCount = GAME.getMapCount();
    if (mapCount <= 1) return currentIndex;
    var newMap;
    do { newMap = Math.floor(Math.random() * mapCount); } while (newMap === currentIndex);
    return newMap;
  }
  GAME._maybeRotateMap = maybeRotateMap;
  GAME._setMapModeForMatch = function(mode) { selectedMapModeForMatch = mode; };

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
    if (isBossRound(roundNumber)) {
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
      showBossHealthBar(boss);
      GAME._bossAtmosphere.active = true;
      GAME._bossAtmosphere.targetVignetteAdd = 0.1;
      _bossHeartbeatTimer = 0;
      _bossHeartbeatBPM = 60;
      _bossHeartbeatGain = 0.15;
      showAnnouncement('BOSS ROUND', 'Round ' + roundNumber);
      if (GAME.Sound && GAME.Sound.bossSpawnAlert) GAME.Sound.bossSpawnAlert();
    }

    // Reset bomb state for bomb defusal mode
    if (teamMode && teamObjective === 'bomb') {
      bombPlanted = false;
      bombTimer = 0;
      bombPlantProgress = 0;
      bombDefuseProgress = 0;
      bombPlantedPos = null;
      bombTickTimer = 0;
      bombSites = mapData.bombsites || [];
      if (bombMesh && scene) { scene.remove(bombMesh); bombMesh = null; }
      if (droppedBombMesh && scene) { scene.remove(droppedBombMesh); droppedBombMesh = null; }
      droppedBombPos = null;

      // Assign bomb carrier
      if (playerTeam === 't') {
        playerHasBomb = true;
        bombCarrierBot = null;
      } else {
        playerHasBomb = false;
        // Give bomb to a random T-side bot
        var tBots = enemyManager.getAliveOfTeam('t');
        bombCarrierBot = tBots.length > 0 ? tBots[Math.floor(Math.random() * tBots.length)] : null;
      }

      // Build bombsite markers
      buildBombsiteMarkers(scene, bombSites);

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

    updateHUD();
    buyMenuOpen = true;
    if (GAME.isMobile && GAME.touch && GAME.touch._showBuyCarousel) {
      GAME.touch._showBuyCarousel();
    } else {
      dom.buyMenu.classList.add('show');
      updateBuyMenu();
    }
    if (teamMode) {
      var sideLabel = playerTeam === 'ct' ? 'Counter-Terrorist' : 'Terrorist';
      showAnnouncement('ROUND ' + roundNumber, sideLabel + ' — ' + mapData.name);
    } else {
      showAnnouncement('ROUND ' + roundNumber, 'Map: ' + mapData.name);
    }

    dom.roundInfo.textContent = 'Round ' + roundNumber + ' / ' + TOTAL_ROUNDS;
    dom.mapInfo.textContent = 'Map: ' + mapData.name;

    if (GAME.Sound) { GAME.Sound.startAmbient(mapData.name); if (GAME.Sound.initReverb) GAME.Sound.initReverb(mapData.name); }

    // Warm up all shader programs during buy phase to prevent compilation hitches
    GAME._warmUpShaders();
  }
  GAME._startRound = function() { startRound(); };

  // ── Bomb Defusal Helpers ────────────────────────────────

  function buildBombsiteMarkers(scene, sites) {
    if (!sites) return;
    for (var i = 0; i < sites.length; i++) {
      var site = sites[i];
      // Glowing ring on the ground
      var ringGeo = new THREE.CylinderGeometry(site.radius, site.radius, 0.05, 32);
      var ringMat = new THREE.MeshStandardMaterial({
        color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 0.3,
        transparent: true, opacity: 0.25, roughness: 0.5
      });
      var ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(site.x, 0.03, site.z);
      scene.add(ring);

      // Floating letter marker (simple box arrangement)
      var letterMat = new THREE.MeshStandardMaterial({
        color: 0xff6600, emissive: 0xff6600, emissiveIntensity: 0.5
      });
      var letterBox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.1), letterMat);
      letterBox.position.set(site.x, 3.5, site.z);
      scene.add(letterBox);

      // Subtle point light at site
      var light = new THREE.PointLight(0xff4400, 0.3, 8);
      light.position.set(site.x, 2, site.z);
      scene.add(light);
    }
  }

  function isNearBombsite(pos) {
    for (var i = 0; i < bombSites.length; i++) {
      var s = bombSites[i];
      var dx = pos.x - s.x, dz = pos.z - s.z;
      if (Math.sqrt(dx * dx + dz * dz) <= s.radius) return s;
    }
    return null;
  }

  function createPlantedBomb(pos) {
    var group = new THREE.Group();
    // Bomb body
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.6 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.3), bodyMat);
    body.position.y = 0.125;
    group.add(body);
    // Blinking light
    var lightMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0 });
    var lightMesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), lightMat);
    lightMesh.position.set(0, 0.3, 0);
    group.add(lightMesh);
    group.position.set(pos.x, 0, pos.z);
    group._blinkLight = lightMesh;
    group._blinkMat = lightMat;
    group._blinkTimer = 0;
    return group;
  }

  function createDroppedBomb(pos) {
    var mat = new THREE.MeshStandardMaterial({ color: 0x555500, emissive: 0x332200, emissiveIntensity: 0.3, roughness: 0.5 });
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.3), mat);
    mesh.position.set(pos.x, 0.125, pos.z);
    return mesh;
  }

  function updateBombLogic(dt) {
    if (!teamMode || teamObjective !== 'bomb' || gameState !== PLAYING) return;

    var ppos = player.position;

    // Handle dropped bomb pickup (T-side player walks over it)
    if (droppedBombPos && playerTeam === 't' && player.alive && !playerHasBomb) {
      var dx = ppos.x - droppedBombPos.x, dz = ppos.z - droppedBombPos.z;
      if (Math.sqrt(dx * dx + dz * dz) < 2) {
        playerHasBomb = true;
        if (droppedBombMesh) { scene.remove(droppedBombMesh); droppedBombMesh = null; }
        droppedBombPos = null;
        dom.bombActionHint.textContent = 'You picked up the bomb';
        setTimeout(function() { if (dom.bombActionHint.textContent === 'You picked up the bomb') dom.bombActionHint.textContent = ''; }, 2000);
      }
    }

    // Bot bomb carrier death — drop the bomb
    if (bombCarrierBot && !bombCarrierBot.alive && !bombPlanted) {
      droppedBombPos = { x: bombCarrierBot.mesh.position.x, z: bombCarrierBot.mesh.position.z };
      droppedBombMesh = createDroppedBomb(droppedBombPos);
      scene.add(droppedBombMesh);
      bombCarrierBot = null;
      if (GAME.Sound) GAME.Sound.announcer('Bomb carrier down');
    }

    if (!bombPlanted) {
      // ── PRE-PLANT PHASE ──

      // Show plant hint for T-side player with bomb
      if (playerTeam === 't' && playerHasBomb && player.alive) {
        var nearSite = isNearBombsite(ppos);
        if (nearSite) {
          dom.bombActionHint.textContent = 'Hold E to plant — Site ' + nearSite.name;
          if (player.keys && player.keys.e) {
            bombPlantProgress += dt / BOMB_PLANT_TIME;
            dom.bombProgressWrap.style.display = 'block';
            dom.bombProgressWrap.className = 'planting';
            dom.bombProgressBar.style.width = (bombPlantProgress * 100) + '%';
            if (bombPlantProgress >= 1) {
              // Bomb planted!
              bombPlanted = true;
              bombTimer = BOMB_FUSE_TIME;
              bombPlantedPos = { x: ppos.x, z: ppos.z };
              bombMesh = createPlantedBomb(bombPlantedPos);
              scene.add(bombMesh);
              playerHasBomb = false;
              bombPlantProgress = 0;
              dom.bombProgressWrap.style.display = 'none';
              dom.bombActionHint.textContent = '';
              if (GAME.Sound) GAME.Sound.bombPlant();
              if (GAME.Sound) GAME.Sound.announcer('Bomb has been planted');
              // T team gets plant bonus
              if (playerTeam === 't') player.money = Math.min(16000, player.money + 800);
            }
          } else {
            bombPlantProgress = 0;
            dom.bombProgressWrap.style.display = 'none';
          }
        } else {
          dom.bombActionHint.textContent = playerHasBomb ? 'Go to a bombsite to plant' : '';
          bombPlantProgress = 0;
          dom.bombProgressWrap.style.display = 'none';
        }
      }

      // Bot bomb carrier AI — move toward nearest bombsite and auto-plant
      if (bombCarrierBot && bombCarrierBot.alive) {
        var botPos = bombCarrierBot.mesh.position;
        var nearSite = isNearBombsite(botPos);
        if (nearSite) {
          // Bot is at bombsite — auto-plant over time
          bombPlantProgress += dt / BOMB_PLANT_TIME;
          if (bombPlantProgress >= 1) {
            bombPlanted = true;
            bombTimer = BOMB_FUSE_TIME;
            bombPlantedPos = { x: botPos.x, z: botPos.z };
            bombMesh = createPlantedBomb(bombPlantedPos);
            scene.add(bombMesh);
            bombCarrierBot = null;
            bombPlantProgress = 0;
            if (GAME.Sound) GAME.Sound.bombPlant();
            if (GAME.Sound) GAME.Sound.announcer('Bomb has been planted');
          }
        } else {
          // Move carrier bot toward nearest bombsite
          bombPlantProgress = 0;
          if (bombSites.length > 0) {
            var nearest = bombSites[0];
            var nd = Infinity;
            for (var si = 0; si < bombSites.length; si++) {
              var sdx = botPos.x - bombSites[si].x, sdz = botPos.z - bombSites[si].z;
              var sd = sdx * sdx + sdz * sdz;
              if (sd < nd) { nd = sd; nearest = bombSites[si]; }
            }
            // Override patrol target to bombsite
            bombCarrierBot._investigatePos = { x: nearest.x, z: nearest.z };
            bombCarrierBot._investigateTimer = 0;
            bombCarrierBot._lookAroundTimer = 999;
            if (bombCarrierBot.state === 0) bombCarrierBot.state = 3; // INVESTIGATE
          }
        }
      }

    } else {
      // ── POST-PLANT PHASE ──

      // Countdown
      bombTimer -= dt;

      // Bomb ticking sound
      bombTickTimer -= dt;
      var tickInterval = bombTimer > 10 ? 1.0 : bombTimer > 5 ? 0.5 : 0.2;
      if (bombTickTimer <= 0) {
        if (GAME.Sound) GAME.Sound.bombTick(bombTimer);
        bombTickTimer = tickInterval;
      }

      // Blink planted bomb light
      if (bombMesh && bombMesh._blinkLight) {
        bombMesh._blinkTimer += dt;
        var blinkRate = bombTimer > 10 ? 1.0 : bombTimer > 5 ? 0.5 : 0.2;
        var on = Math.sin(bombMesh._blinkTimer / blinkRate * Math.PI) > 0;
        bombMesh._blinkMat.emissiveIntensity = on ? 1.0 : 0.1;
      }

      // Display timer
      var secs = Math.ceil(bombTimer);
      dom.bombTimerDisplay.textContent = 'BOMB: ' + (secs > 0 ? secs + 's' : 'DETONATING');
      dom.bombTimerDisplay.style.color = bombTimer <= 10 ? '#ff0000' : '#ff4444';

      // Defuse logic — CT player near planted bomb
      if (playerTeam === 'ct' && player.alive && bombPlantedPos) {
        var ddx = ppos.x - bombPlantedPos.x, ddz = ppos.z - bombPlantedPos.z;
        if (Math.sqrt(ddx * ddx + ddz * ddz) < 3.5) {
          dom.bombActionHint.textContent = 'Hold E to defuse';
          if (player.keys && player.keys.e) {
            bombDefuseProgress += dt / BOMB_DEFUSE_TIME;
            dom.bombProgressWrap.style.display = 'block';
            dom.bombProgressWrap.className = 'defusing';
            dom.bombProgressBar.style.width = (bombDefuseProgress * 100) + '%';
            if (bombDefuseProgress >= 1) {
              // Bomb defused!
              bombPlanted = false;
              bombDefuseProgress = 0;
              dom.bombProgressWrap.style.display = 'none';
              dom.bombTimerDisplay.textContent = '';
              dom.bombActionHint.textContent = '';
              if (bombMesh) { scene.remove(bombMesh); bombMesh = null; }
              if (GAME.Sound) GAME.Sound.bombDefuse();
              if (GAME.Sound) GAME.Sound.announcer('Bomb has been defused');
              player.money = Math.min(16000, player.money + 500);
              endRound(true); // CT wins
              return;
            }
          } else {
            bombDefuseProgress = 0;
            dom.bombProgressWrap.style.display = 'none';
          }
        } else {
          dom.bombActionHint.textContent = '';
          bombDefuseProgress = 0;
          dom.bombProgressWrap.style.display = 'none';
        }
      }

      // Bomb detonation
      if (bombTimer <= 0) {
        bombPlanted = false;
        dom.bombTimerDisplay.textContent = '';
        dom.bombActionHint.textContent = '';
        dom.bombProgressWrap.style.display = 'none';
        if (bombMesh) { scene.remove(bombMesh); bombMesh = null; }
        // Explosion effect at bomb site
        if (GAME.Sound) GAME.Sound.grenadeExplode();
        // T wins
        endRound(playerTeam === 't');
        return;
      }
    }
  }

  function endRound(playerWon) {
    hideBossHealthBar();
    // Clean up bomb HUD
    dom.bombHud.style.display = 'none';
    bombPlantProgress = 0;
    bombDefuseProgress = 0;

    radioMenuOpen = false;
    dom.radioMenu.classList.remove('show');
    gameState = ROUND_END;
    phaseTimer = ROUND_END_TIME;
    GAME.progression.setLastRoundWon(playerWon);

    if (playerWon) {
      playerScore++;
      matchRoundsWon++;
      player.money = Math.min(16000, player.money + 3000);
      showAnnouncement('ROUND WIN', '+$3000');
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
      showAnnouncement(player.alive ? 'TIME UP' : 'YOU DIED', '+$1400');
      if (GAME.Sound) GAME.Sound.roundLose();
      if (teamMode) {
        var loseTeamName = playerTeam === 'ct' ? 'Terrorists' : 'Counter-terrorists';
        if (GAME.Sound) GAME.Sound.announcer(loseTeamName + ' win');
      } else {
        if (GAME.Sound) GAME.Sound.announcer('Terrorists win');
      }
    }

    GAME.progression.resetKillStreak();
    updateScoreboard();
    buyMenuOpen = false;
    dom.buyMenu.classList.remove('show');
  }

  function endMatch() {
    hideBossHealthBar();
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

  // ── Gun Game Mode ─────────────────────────────────────────
  function startGunGame(mapIndex) {
    localStorage.setItem('miniCS_lastMode', 'gungame');
    teamMode = false;
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.remove('tour-mode');
    dom.gungameEnd.classList.remove('show');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';
    dom.waveCounter.classList.remove('show');

    gungameMapIndex = mapIndex;
    selectedMapModeForMatch = selectedMapMode;
    gungameLevel = 0;
    _gungameBossSpawned = false;
    gungameKills = 0;
    gungameDeaths = 0;
    gungameHeadshots = 0;
    gungameStartTime = performance.now() / 1000;
    gungameRespawnQueue = [];
    _bossXPBonus = 0;
    GAME.progression.resetKillStreak();
    player.money = 0;

    GAME.setDifficulty(selectedDifficulty);

    // Build map
    scene = GAME.scene = new THREE.Scene();

    for (var bhi = 0; bhi < bulletHoles.length; bhi++) bulletHoles[bhi].mat.dispose();
    bulletHoles.length = 0;
    _dustParticles.length = 0;
    weapons.scene = scene;
    enemyManager.scene = scene;
    scene.add(camera);

    var mapData = GAME.buildMap(scene, gungameMapIndex, renderer);
    GAME.applyColorGrade();
    if (GAME.particles) {
      GAME.particles.dispose();
      GAME.particles.init(scene);
    }
    mapWalls = mapData.walls;
    gungameLastMapData = mapData;

    player.reset(mapData.playerSpawn);
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);

    // Force knife as starting weapon
    weapons.forceWeapon('knife');

    // Spawn bots
    var botCount = GUNGAME_BOT_COUNT;
    enemyManager.spawnBots(mapData.botSpawns, mapData.waypoints, mapWalls, botCount, mapData.size, mapData.playerSpawn, 3);

    GAME.birds.spawn(mapData.size ? Math.max(mapData.size.x, mapData.size.z) : 50);
    weapons.setBirdsRef(GAME.birds.list);
    GAME.minimap.cacheWalls(mapWalls, mapData.size);

    gameState = GUNGAME_ACTIVE;

    // HUD setup for gun game
    dom.moneyDisplay.style.display = 'none';
    dom.gungameLevel.classList.add('show');
    dom.roundInfo.textContent = 'GUN GAME';
    updateGunGameLevelHUD();

    showAnnouncement('GUN GAME', 'Get a kill with each weapon!');
    if (GAME.Sound) GAME.Sound.roundStart();
    if (GAME.Sound) { GAME.Sound.startAmbient(mapData.name); if (GAME.Sound.initReverb) GAME.Sound.initReverb(mapData.name); }
  }

  function updateGunGameLevelHUD() {
    dom.gungameLevel.textContent = 'LEVEL ' + (gungameLevel + 1) + '/6 \u2014 ' + GUNGAME_NAMES[gungameLevel];
  }

  function advanceGunGameLevel() {
    gungameLevel++;
    if (gungameLevel >= GUNGAME_WEAPONS.length) {
      // Boss phase — spawn boss, unlock all weapons
      if (!_gungameBossSpawned) {
        _gungameBossSpawned = true;
        var mapData = gungameLastMapData;
        var bossSpawn = mapData.botSpawns[0];
        var boss = enemyManager.spawnBoss(bossSpawn, mapData.waypoints, mapWalls, { noMinions: true });
        showBossHealthBar(boss);
        GAME._bossAtmosphere.active = true;
        GAME._bossAtmosphere.targetVignetteAdd = 0.1;
        _bossHeartbeatTimer = 0;
        _bossHeartbeatBPM = 60;
        _bossHeartbeatGain = 0.15;
        showAnnouncement('BOSS FIGHT', 'All weapons unlocked!');
        dom.gungameLevel.textContent = 'BOSS FIGHT \u2014 All weapons unlocked!';
        if (GAME.Sound && GAME.Sound.bossSpawnAlert) GAME.Sound.bossSpawnAlert();
        // Unlock all weapons
        weapons.owned = { knife: true, pistol: true, shotgun: true, rifle: true, awp: true, grenade: true, smoke: true, flash: true };
        weapons.resetAmmo();
        gungameLevel = GUNGAME_WEAPONS.length - 1;
      }
      return;
    }
    var weaponId = GUNGAME_WEAPONS[gungameLevel];
    weapons.forceWeapon(weaponId);
    updateGunGameLevelHUD();

    if (gungameLevel === GUNGAME_WEAPONS.length - 1) {
      showAnnouncement('FINAL WEAPON', 'Get a knife kill to win!');
    } else {
      showAnnouncement('LEVEL ' + (gungameLevel + 1), GUNGAME_NAMES[gungameLevel]);
    }
    if (GAME.Sound) GAME.Sound.switchWeapon();
  }

  function gunGamePlayerDied() {
    gungameDeaths++;
    // Instant respawn: reset player at spawn, keep current weapon level
    var mapData = gungameLastMapData;
    player.reset(mapData.playerSpawn);
    player.armor = 0;
    player.helmet = false;
    player.setWalls(mapWalls);
    weapons.cleanupDroppedWeapon();
    weapons.forceWeapon(GUNGAME_WEAPONS[gungameLevel]);
    GAME.progression.resetKillStreak();
  }

  function gunGameQueueBotRespawn(enemy) {
    // Remove the dead enemy mesh
    enemy.destroy();
    // Find a far spawn point from player
    var mapData = gungameLastMapData;
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
    gungameRespawnQueue.push({ timer: GUNGAME_BOT_RESPAWN_DELAY, spawnPos: spawnPos, id: enemy.id });
  }

  function updateGunGameRespawns(dt) {
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

  function endGunGame() {
    hideBossHealthBar();
    _gungameBossSpawned = false;
    if (GAME.Sound) GAME.Sound.stopAmbient();
    gameState = GUNGAME_END;
    dom.hud.style.display = 'none';
    dom.moneyDisplay.style.display = '';
    dom.gungameLevel.classList.remove('show');
    if (document.pointerLockElement) document.exitPointerLock();

    var elapsed = (performance.now() / 1000) - gungameStartTime;
    var mins = Math.floor(elapsed / 60);
    var secs = Math.floor(elapsed % 60);
    var timeStr = mins + ':' + (secs < 10 ? '0' : '') + secs;

    // Save best time
    var mapNames = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var mapName = mapNames[gungameMapIndex] || 'dust';
    GAME.progression.setGunGameBest(mapName, elapsed);

    dom.gungameTimeResult.textContent = 'Time: ' + timeStr;
    dom.gungameStatsDisplay.textContent = gungameKills + ' Kills | ' + gungameDeaths + ' Deaths | ' + gungameHeadshots + ' Headshots';

    // XP calculation: (kills * 10 + headshots * 5 + (6 - deaths) * 10) * diffMult * 0.8
    var diffMult = GAME.progression.DIFF_XP_MULT[selectedDifficulty] || 1;
    var deathBonus = Math.max(0, 6 - gungameDeaths) * 10;
    var timeBonus = elapsed < 180 ? 50 : 0;
    var rawXP = gungameKills * 10 + gungameHeadshots * 5 + deathBonus + timeBonus;
    var xpEarned = Math.round(rawXP * diffMult * 0.8) + _bossXPBonus;
    var rankResult = GAME.progression.awardXP(xpEarned);

    dom.gungameXpBreakdown.innerHTML =
      '<div class="xp-line"><span>Kills (' + gungameKills + ')</span><span class="xp-val">+' + (gungameKills * 10) + '</span></div>' +
      '<div class="xp-line"><span>Headshots (' + gungameHeadshots + ')</span><span class="xp-val">+' + (gungameHeadshots * 5) + '</span></div>' +
      '<div class="xp-line"><span>Low Deaths Bonus</span><span class="xp-val">+' + deathBonus + '</span></div>' +
      (timeBonus ? '<div class="xp-line"><span>Speed Bonus (&lt;3 min)</span><span class="xp-val">+' + timeBonus + '</span></div>' : '') +
      '<div class="xp-line"><span>Difficulty (' + selectedDifficulty + ')</span><span class="xp-val">x' + diffMult + '</span></div>' +
      '<div class="xp-line"><span>Gun Game multiplier</span><span class="xp-val">x0.8</span></div>' +
      '<div class="xp-total">Total: +' + xpEarned + ' XP</div>' +
      (rankResult.ranked_up ? '<div style="color:#ffca28;margin-top:4px;">RANKED UP: ' + rankResult.newRank.name + '!</div>' : '');

    dom.gungameEnd.classList.add('show');
    GAME.progression.updateRankDisplay();

    // Mission tracking
    GAME.progression.trackMissionEvent('gungame_complete', 1);
    if (elapsed < 180) GAME.progression.trackMissionEvent('gungame_fast', 1);

    showAnnouncement('GUN GAME COMPLETE', timeStr);
  }

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

    showAnnouncement('DEATHMATCH', 'First to ' + DEATHMATCH_KILL_TARGET + ' kills!');
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
    hideBossHealthBar();
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
      showAnnouncement('VICTORY', dmKills + ' kills!');
    } else {
      showAnnouncement('TIME UP', dmKills + ' kills');
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

  // ── Survival Mode ─────────────────────────────────────────
  // updateSurvivalBestDisplay moved to js/systems/progression.js

  function startSurvival(mapIndex) {
    localStorage.setItem('miniCS_lastMode', 'survival');
    teamMode = false;
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.remove('tour-mode');
    dom.survivalEnd.classList.remove('show');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';

    survivalMapIndex = mapIndex;
    selectedMapModeForMatch = selectedMapMode;
    survivalWave = 0;
    survivalKills = 0;
    survivalHeadshots = 0;
    _bossXPBonus = 0;
    GAME.progression.resetKillStreak();
    player.money = 800;

    weapons.owned = { knife: true, pistol: true, shotgun: false, rifle: false, awp: false, grenade: false, smoke: false, flash: false };
    weapons.grenadeCount = 0;
    weapons.smokeCount = 0;
    weapons.flashCount = 0;
    weapons.current = 'pistol';
    weapons.resetAmmo();
    weapons._createWeaponModel();

    // Build map
    scene = GAME.scene = new THREE.Scene();

    for (var bhi = 0; bhi < bulletHoles.length; bhi++) bulletHoles[bhi].mat.dispose();
    bulletHoles.length = 0;
    _dustParticles.length = 0;
    weapons.scene = scene;
    enemyManager.scene = scene;
    scene.add(camera);

    var mapData = GAME.buildMap(scene, survivalMapIndex, renderer);
    GAME.applyColorGrade();
    if (GAME.particles) {
      GAME.particles.dispose();
      GAME.particles.init(scene);
    }
    mapWalls = mapData.walls;
    survivalLastMapData = mapData;

    player.reset(mapData.playerSpawn);
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);

    GAME.birds.spawn(Math.max(mapData.size.x, mapData.size.z));
    weapons.setBirdsRef(GAME.birds.list);

    GAME.minimap.cacheWalls(mapWalls, mapData.size);

    dom.waveCounter.classList.add('show');
    dom.roundInfo.textContent = '';
    if (GAME.Sound) { GAME.Sound.startAmbient(mapData.name); if (GAME.Sound.initReverb) GAME.Sound.initReverb(mapData.name); }
    startSurvivalWave();
  }

  function startSurvivalWave() {
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
    var diff = GAME.getDifficulty();
    // Override with wave-scaled values
    var waveDiff = {
      health: waveHP, speed: waveSpeed, fireRate: waveFireRate,
      damage: waveDamage, accuracy: waveAccuracy,
      sight: 45, attackRange: 28, botCount: botCount
    };
    // Temporarily set wave difficulty
    GAME.DIFFICULTIES._survivalWave = waveDiff;
    GAME.setDifficulty('_survivalWave');

    // Clear old enemies
    enemyManager.clearAll();

    // Rotate map between waves if enabled
    var newMapIndex = maybeRotateMap(survivalMapIndex);
    if (newMapIndex !== survivalMapIndex) {
      survivalMapIndex = newMapIndex;

      for (var bhi = 0; bhi < bulletHoles.length; bhi++) bulletHoles[bhi].mat.dispose();
      bulletHoles.length = 0;
      _dustParticles.length = 0;

      scene = GAME.scene = new THREE.Scene();
      weapons.scene = scene;
      enemyManager.scene = scene;
      scene.add(camera);

      var newMapData = GAME.buildMap(scene, survivalMapIndex, renderer);
      GAME.applyColorGrade();
      if (GAME.particles) {
        GAME.particles.dispose();
        GAME.particles.init(scene);
      }
      mapWalls = newMapData.walls;
      survivalLastMapData = newMapData;

      player.reset(newMapData.playerSpawn);
      player.setWalls(mapWalls);
      weapons.setWallsRef(mapWalls);

      GAME.birds.spawn(Math.max(newMapData.size.x, newMapData.size.z));
      weapons.setBirdsRef(GAME.birds.list);
      cacheMinimapWalls(mapWalls, newMapData.size);

      if (GAME.Sound) { GAME.Sound.startAmbient(newMapData.name); if (GAME.Sound.initReverb) GAME.Sound.initReverb(newMapData.name); }
    }

    var mapData = survivalLastMapData;
    enemyManager.spawnBots(mapData.botSpawns, mapData.waypoints, mapWalls, botCount, mapData.size, mapData.playerSpawn, survivalWave);

    // Spawn boss every 5th wave
    if (survivalWave % 5 === 0) {
      var bossSpawn = mapData.botSpawns[0];
      var bossAppearance = Math.floor(survivalWave / 5);
      var hpMult = 1 + (bossAppearance - 1) * 0.1;
      var boss = enemyManager.spawnBoss(bossSpawn, mapData.waypoints, mapWalls, { hpMult: hpMult });
      showBossHealthBar(boss);
      GAME._bossAtmosphere.active = true;
      GAME._bossAtmosphere.targetVignetteAdd = 0.1;
      _bossHeartbeatTimer = 0;
      _bossHeartbeatBPM = 60;
      _bossHeartbeatGain = 0.15;
      showAnnouncement('WAVE ' + survivalWave, 'BOSS WAVE!');
      if (GAME.Sound && GAME.Sound.bossSpawnAlert) GAME.Sound.bossSpawnAlert();
    }

    weapons.resetForRound();
    dom.waveCounter.textContent = 'WAVE ' + survivalWave;

    gameState = SURVIVAL_WAVE;
    buyMenuOpen = false;
    dom.buyMenu.classList.remove('show');
    if (GAME.touch && GAME.touch._hideBuyCarousel) GAME.touch._hideBuyCarousel();
    showAnnouncement('WAVE ' + survivalWave, botCount + ' enemies');
    if (GAME.Sound) GAME.Sound.roundStart();
  }

  function endSurvivalWave() {
    // Wave cleared — restore 60% of max HP
    player.health = Math.min(100, player.health + 60);
    player.money = Math.min(16000, player.money + 200 + survivalWave * 50);
    showAnnouncement('WAVE CLEARED', 'Buy phase — 8s');
    if (GAME.Sound) GAME.Sound.roundWin();

    // Mission tracking for survival waves
    GAME.progression.trackMissionEvent('survival_wave', survivalWave);
    GAME.progression.trackMissionEvent('weekly_survival', survivalWave);
    var mapNames = ['survival_dust', 'survival_office', 'survival_warehouse', 'survival_bloodstrike', 'survival_italy', 'survival_aztec', 'survival_arena'];
    if (mapNames[survivalMapIndex]) GAME.progression.trackMissionEvent(mapNames[survivalMapIndex], survivalWave);

    gameState = SURVIVAL_BUY;
    phaseTimer = 8;
    buyMenuOpen = true;
    if (GAME.isMobile && GAME.touch && GAME.touch._showBuyCarousel) {
      GAME.touch._showBuyCarousel();
    } else {
      dom.buyMenu.classList.add('show');
      updateBuyMenu();
    }
  }

  function endSurvival() {
    hideBossHealthBar();
    if (GAME.Sound) GAME.Sound.stopAmbient();
    gameState = SURVIVAL_DEAD;
    dom.hud.style.display = 'none';
    if (document.pointerLockElement) document.exitPointerLock();

    var mapNames = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var mapName = mapNames[survivalMapIndex] || 'dust';
    GAME.progression.setSurvivalBest(mapName, survivalWave - 1);

    dom.survivalWaveResult.textContent = 'Survived ' + (survivalWave - 1) + ' Waves';
    dom.survivalStatsDisplay.textContent = survivalKills + ' Kills | ' + survivalHeadshots + ' Headshots';

    // XP for survival (0.7x multiplier)
    var xpEarned = Math.round((survivalKills * 10 + survivalHeadshots * 5 + (survivalWave - 1) * 15) * 0.7) + _bossXPBonus;
    var rankResult = GAME.progression.awardXP(xpEarned);
    dom.survivalXpBreakdown.innerHTML =
      '<div class="xp-line"><span>Kills (' + survivalKills + ')</span><span class="xp-val">+' + (survivalKills * 10) + '</span></div>' +
      '<div class="xp-line"><span>Headshots (' + survivalHeadshots + ')</span><span class="xp-val">+' + (survivalHeadshots * 5) + '</span></div>' +
      '<div class="xp-line"><span>Waves (' + (survivalWave - 1) + ')</span><span class="xp-val">+' + ((survivalWave - 1) * 15) + '</span></div>' +
      '<div class="xp-line"><span>Survival multiplier</span><span class="xp-val">x0.7</span></div>' +
      '<div class="xp-total">Total: +' + xpEarned + ' XP</div>' +
      (rankResult.ranked_up ? '<div style="color:#ffca28;margin-top:4px;">RANKED UP: ' + rankResult.newRank.name + '!</div>' : '');

    dom.survivalEnd.classList.add('show');
    GAME.progression.updateRankDisplay();

    // Clean up wave difficulty
    delete GAME.DIFFICULTIES._survivalWave;
  }

  // Match history moved to js/systems/progression.js

  // ── Buy System ───────────────────────────────────────────
  function tryBuy(item) {
    var isBuyPhase = (gameState === BUY_PHASE || gameState === SURVIVAL_BUY || gameState === DEATHMATCH_ACTIVE || gameState === TOURING);
    if (!isBuyPhase) return;
    var DEFS = GAME.WEAPON_DEFS;

    var bought = false;
    if (item === 'smg') {
      if (weapons.owned.smg) return;
      if (player.money < DEFS.smg.price) return;
      player.money -= DEFS.smg.price;
      weapons.giveWeapon('smg');
      weapons.switchTo('smg');
      bought = true;
    } else if (item === 'shotgun') {
      if (weapons.owned.shotgun) return;
      if (player.money < DEFS.shotgun.price) return;
      player.money -= DEFS.shotgun.price;
      weapons.giveWeapon('shotgun');
      weapons.switchTo('shotgun');
      bought = true;
    } else if (item === 'rifle') {
      if (weapons.owned.rifle) return;
      if (player.money < DEFS.rifle.price) return;
      player.money -= DEFS.rifle.price;
      weapons.giveWeapon('rifle');
      weapons.switchTo('rifle');
      bought = true;
    } else if (item === 'awp') {
      if (weapons.owned.awp) return;
      if (player.money < DEFS.awp.price) return;
      player.money -= DEFS.awp.price;
      weapons.giveWeapon('awp');
      weapons.switchTo('awp');
      bought = true;
    } else if (item === 'grenade') {
      if (weapons.grenadeCount >= 1) return;
      if (player.money < DEFS.grenade.price) return;
      player.money -= DEFS.grenade.price;
      weapons.buyGrenade();
      bought = true;
    } else if (item === 'armor') {
      if (player.armor >= 100 && player.helmet) return; // Fully equipped
      if (player.armor < 100 && !player.helmet) {
        // Buy kevlar+helmet combo ($1000) if affordable, else just kevlar ($650)
        if (player.money >= 1000) {
          player.money -= 1000;
          player.armor = 100;
          player.helmet = true;
          bought = true;
        } else if (player.money >= 650) {
          player.money -= 650;
          player.armor = 100;
          bought = true;
        }
      } else if (player.armor >= 100 && !player.helmet) {
        if (player.money < 350) return;
        player.money -= 350;
        player.helmet = true;
        bought = true;
      } else if (player.armor < 100 && player.helmet) {
        if (player.money < 650) return;
        player.money -= 650;
        player.armor = 100;
        bought = true;
      }
    } else if (item === 'smoke') {
      if (weapons.smokeCount >= 1) return;
      if (player.money < 300) return;
      player.money -= 300;
      weapons.smokeCount++;
      weapons.owned.smoke = true;
      bought = true;
    } else if (item === 'flash') {
      if (weapons.flashCount >= 2) return;
      if (player.money < 200) return;
      player.money -= 200;
      weapons.flashCount++;
      weapons.owned.flash = true;
      bought = true;
    }
    if (bought && GAME.Sound) GAME.Sound.buy();
    updateBuyMenu();
    updateHUD();
  }
  GAME._buyWeapon = tryBuy;
  GAME._dmBuyMenuAutoOpened = false;

  function updateBuyMenu() {
    dom.buyBalance.textContent = 'Balance: $' + player.money;
    var DEFS = GAME.WEAPON_DEFS;

    document.querySelectorAll('.buy-item').forEach(function(el) {
      el.classList.remove('owned', 'too-expensive');
      if (el.dataset.weapon === 'smg') {
        if (weapons.owned.smg) el.classList.add('owned');
        else if (player.money < DEFS.smg.price) el.classList.add('too-expensive');
      }
      if (el.dataset.weapon === 'shotgun') {
        if (weapons.owned.shotgun) el.classList.add('owned');
        else if (player.money < DEFS.shotgun.price) el.classList.add('too-expensive');
      }
      if (el.dataset.weapon === 'rifle') {
        if (weapons.owned.rifle) el.classList.add('owned');
        else if (player.money < DEFS.rifle.price) el.classList.add('too-expensive');
      }
      if (el.dataset.weapon === 'awp') {
        if (weapons.owned.awp) el.classList.add('owned');
        else if (player.money < DEFS.awp.price) el.classList.add('too-expensive');
      }
      if (el.dataset.item === 'grenade') {
        if (weapons.grenadeCount >= 1) el.classList.add('owned');
        else if (player.money < DEFS.grenade.price) el.classList.add('too-expensive');
      }
      if (el.dataset.item === 'smoke') {
        if (weapons.smokeCount >= 1) el.classList.add('owned');
        else if (player.money < 300) el.classList.add('too-expensive');
      }
      if (el.dataset.item === 'flash') {
        if (weapons.flashCount >= 2) el.classList.add('owned');
        else if (player.money < 200) el.classList.add('too-expensive');
      }
      if (el.dataset.item === 'armor') {
        if (player.armor >= 100 && player.helmet) {
          el.classList.add('owned');
          el.querySelector('.item-name').textContent = 'Armor + Helmet';
          el.querySelector('.item-price').textContent = 'OWNED';
        } else if (player.armor >= 100 && !player.helmet) {
          el.querySelector('.item-name').textContent = 'Helmet';
          el.querySelector('.item-price').textContent = '$350';
          if (player.money < 350) el.classList.add('too-expensive');
        } else if (player.armor < 100 && player.helmet) {
          el.querySelector('.item-name').textContent = 'Armor';
          el.querySelector('.item-price').textContent = '$650';
          if (player.money < 650) el.classList.add('too-expensive');
        } else {
          el.querySelector('.item-name').textContent = 'Armor + Helmet';
          el.querySelector('.item-price').textContent = '$1000';
          if (player.money < 650) el.classList.add('too-expensive');
        }
      }
    });
  }

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
              addKillFeed('You [HE]', 'Bot ' + (enemy.id + 1));
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
    survivalKills++;
    if (isHeadshot) {
      matchHeadshots++;
      survivalHeadshots++;
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
      hideBossHealthBar();
      addKillFeed('You', 'BOSS', true);
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
      showAnnouncement('BOSS ELIMINATED', '+$5000');
      dom.announcement.classList.add('boss-eliminated');
      setTimeout(function() {
        dom.announcement.classList.remove('boss-eliminated');
      }, 2500);

      // Reset boss atmosphere
      GAME._bossAtmosphere.active = false;
      GAME._bossAtmosphere.targetRedMult = 1.0;
      GAME._bossAtmosphere.targetVignetteAdd = 0;
      GAME._bossAtmosphere.targetContrast = 0;
      GAME._bossAtmosphere.targetSaturation = 1.0;

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
      gungameKills++;
      if (isHeadshot) gungameHeadshots++;
      GAME.progression.checkKillStreak();
      if (GAME.Sound) GAME.Sound.kill();
      // Queue bot respawn instead of waiting for all dead
      gunGameQueueBotRespawn(enemy);
      // Remove from enemies array
      var idx = enemyManager.enemies.indexOf(enemy);
      if (idx >= 0) enemyManager.enemies.splice(idx, 1);
      // Check if boss was killed — ends gun game
      if (enemy.isBoss && _gungameBossSpawned) {
        endGunGame();
        return;
      }
      // Advance weapon level
      advanceGunGameLevel();
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
          showBossHealthBar(boss);
          GAME._bossAtmosphere.active = true;
          GAME._bossAtmosphere.targetVignetteAdd = 0.1;
          _bossHeartbeatTimer = 0;
          _bossHeartbeatBPM = 60;
          _bossHeartbeatGain = 0.15;
          showAnnouncement('BOSS INCOMING', 'Kill the Boss to win!');
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
          addKillFeed('You', 'Bot ' + (result.enemy.id + 1) + hsTag);
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
        addKillFeed('You', 'Bird');
        GAME.effects.showHitmarker(false);
        if (GAME.Sound) GAME.Sound.hitMarker();
      }
    }
  }

  // ── Pause Hint ───────────────────────────────────────────
  function updatePauseHint() {
    if (!dom.pauseHintKey) return;
    var show = (gameState === PLAYING || gameState === BUY_PHASE ||
                gameState === TOURING || gameState === SURVIVAL_BUY ||
                gameState === SURVIVAL_WAVE || gameState === GUNGAME_ACTIVE ||
                gameState === DEATHMATCH_ACTIVE);
    dom.pauseHintKey.style.display = show ? 'block' : 'none';
  }

  // ── Boss HUD ──────────────────────────────────────────────
  GAME._bossAtmosphere = {
    active: false,
    redMult: 1.0,
    vignetteAdd: 0,
    contrast: 0,
    saturation: 1.0,
    targetRedMult: 1.0,
    targetVignetteAdd: 0,
    targetContrast: 0,
    targetSaturation: 1.0,
    flashVignette: 0
  };

  var _activeBoss = null;
  var _bossLastPhase = 1;
  var _bossHeartbeatTimer = 0;
  var _bossHeartbeatBPM = 60;
  var _bossHeartbeatGain = 0.15;
  var BOSS_MAX_MINIONS = 8;
  function applyBossMinionTint(minion) {
    minion.mesh.traverse(function(c) {
      if (c.isMesh && c.material && c.material.emissive) {
        c.material = c.material.clone();
        c.material.emissive.setHex(0xff2200);
        c.material.emissiveIntensity = 0.15;
      }
    });
  }

  function updateBossAtmosphere(dt) {
    var atm = GAME._bossAtmosphere;
    if (!atm.active && atm.redMult === 1.0 && atm.vignetteAdd === 0 && atm.contrast === 0 && atm.saturation === 1.0) return;

    var lerpSpeed = atm.active ? 1.0 : 0.7;
    var t = Math.min(1, lerpSpeed * dt);
    atm.redMult += (atm.targetRedMult - atm.redMult) * t;
    atm.vignetteAdd += (atm.targetVignetteAdd - atm.vignetteAdd) * t;
    atm.contrast += (atm.targetContrast - atm.contrast) * t;
    atm.saturation += (atm.targetSaturation - atm.saturation) * t;

    // Phase transition vignette flash decay
    if (atm.flashVignette > 0) {
      atm.flashVignette -= dt * 2;
      if (atm.flashVignette < 0) atm.flashVignette = 0;
    }

    // Apply to post-processing
    if (GAME._postProcess && GAME._postProcess.colorGrade && GAME._currentColorGrade) {
      var cg = GAME._currentColorGrade;
      var pp = GAME._postProcess.colorGrade;
      pp.tint.value.set(cg.tint[0] * atm.redMult, cg.tint[1], cg.tint[2]);
      pp.vignetteStrength.value = cg.vignetteStrength + atm.vignetteAdd + atm.flashVignette;
      pp.contrast.value = cg.contrast + atm.contrast;
      pp.saturation.value = cg.saturation * atm.saturation;
    }
  }

  var BOSS_MINION_SPAWN = {
    1: { interval: 15, count: 2 },
    2: { interval: 10, count: 3 },
    3: { interval: 6,  count: 4 }
  };
  var _bossMinionTimer = 0;
  var _bossPendingMinions = 0;
  GAME._bossPendingMinions = 0;

  function showBossHealthBar(boss) {
    _activeBoss = boss;
    _bossLastPhase = 1;
    _bossMinionTimer = BOSS_MINION_SPAWN[1].interval;
    _bossPendingMinions = 0;
    GAME._bossPendingMinions = 0;
    dom.bossHealthBar.classList.add('show');
    updateBossHealthBar();
  }

  function hideBossHealthBar() {
    if (_activeBoss && _activeBoss._bossGrenadeList) {
      for (var i = 0; i < _activeBoss._bossGrenadeList.length; i++) {
        var g = _activeBoss._bossGrenadeList[i];
        if (g.mesh && g.scene) g.scene.remove(g.mesh);
      }
      _activeBoss._bossGrenadeList.length = 0;
    }
    _activeBoss = null;
    dom.bossHealthBar.classList.remove('show');
  }

  function updateBossHealthBar() {
    if (!_activeBoss || !_activeBoss.alive) {
      hideBossHealthBar();
      return;
    }
    var pct = Math.max(0, _activeBoss.health / _activeBoss.maxHealth * 100);
    dom.bossHpFill.style.width = pct + '%';

    if (_activeBoss._bossPhase === 3) {
      dom.bossHpFill.style.background = '#ef5350';
    } else if (_activeBoss._bossPhase === 2) {
      dom.bossHpFill.style.background = '#ff9800';
    } else {
      dom.bossHpFill.style.background = '#4caf50';
    }

    // Shield indicator: overlay glow on health bar track
    if (_activeBoss._bossShieldActive) {
      dom.bossHpTrack.style.boxShadow = '0 0 12px 3px rgba(255, 68, 0, 0.6)';
    } else {
      dom.bossHpTrack.style.boxShadow = 'none';
    }
  }

  GAME._showBossHealthBar = showBossHealthBar;
  GAME._hideBossHealthBar = hideBossHealthBar;
  GAME._getActiveBoss = function() { return _activeBoss; };

  function safeMinionSpawnPos(spawnPos, bossPos, playerPos) {
    var dx = spawnPos.x - playerPos.x;
    var dz = spawnPos.z - playerPos.z;
    var distToPlayer = Math.sqrt(dx * dx + dz * dz);
    if (distToPlayer >= 6) return spawnPos;

    // Place on far side of boss from player
    var bpx = bossPos.x - playerPos.x;
    var bpz = bossPos.z - playerPos.z;
    var bpDist = Math.sqrt(bpx * bpx + bpz * bpz);
    if (bpDist < 0.01) { bpx = 1; bpz = 0; bpDist = 1; }
    var awayX = bpx / bpDist;
    var awayZ = bpz / bpDist;
    // Ensure spawn ends up at least 6 units from player
    var minDist = Math.max(2, 6 - bpDist);
    var dist = minDist + Math.random() * 3;
    return { x: bossPos.x + awayX * dist, z: bossPos.z + awayZ * dist };
  }
  GAME._safeMinionSpawnPos = safeMinionSpawnPos;

  function checkBossMinions(dt) {
    if (!_activeBoss || !_activeBoss.alive) return;
    if (_activeBoss._bossNoMinions) return;

    var phase = _activeBoss._bossPhase;
    if (phase !== _bossLastPhase) {
      var minionsToSpawn = 0;
      if (phase === 2 && _bossLastPhase < 2) {
        minionsToSpawn = 3;
        showAnnouncement('PHASE 2', 'ESCALATION');
        var atm = GAME._bossAtmosphere;
        atm.targetRedMult = 1.08;
        atm.targetVignetteAdd = 0.2;
        atm.targetContrast = 0.05;
        atm.targetSaturation = 1.0;
        atm.flashVignette = 0.5;
        GAME.triggerScreenShake(0.15);
      }
      if (phase === 3 && _bossLastPhase < 3) {
        minionsToSpawn = 5;
        showAnnouncement('PHASE 3', 'DESPERATE');
        var atm = GAME._bossAtmosphere;
        atm.targetRedMult = 1.15;
        atm.targetVignetteAdd = 0.35;
        atm.targetContrast = 0.1;
        atm.targetSaturation = 0.85;
        atm.flashVignette = 0.5;
        GAME.triggerScreenShake(0.15);
      }

      // Count alive minions
      var minionCount = 0;
      for (var i = 0; i < enemyManager.enemies.length; i++) {
        var e = enemyManager.enemies[i];
        if (e.alive && !e.isBoss && e._isBossMinion) minionCount++;
      }
      minionsToSpawn = Math.min(minionsToSpawn, BOSS_MAX_MINIONS - minionCount);

      if (minionsToSpawn > 0) {
        // Defer spawn until retreat completes
        _bossPendingMinions = minionsToSpawn;
        GAME._bossPendingMinions = _bossPendingMinions;
      }

      // Reset periodic spawn timer for new phase
      _bossMinionTimer = BOSS_MINION_SPAWN[phase].interval;
      _bossLastPhase = phase;
    }

    // Spawn deferred minions once retreat completes
    if (_bossPendingMinions > 0 && _activeBoss._bossRetreatState === 'idle') {
      var minionCount = 0;
      for (var ci = 0; ci < enemyManager.enemies.length; ci++) {
        var ce = enemyManager.enemies[ci];
        if (ce.alive && !ce.isBoss && ce._isBossMinion) minionCount++;
      }
      var toSpawn = Math.min(_bossPendingMinions, BOSS_MAX_MINIONS - minionCount);

      if (toSpawn > 0 && GAME._Enemy) {
        var bossPos = _activeBoss.mesh.position;
        var maxId = 0;
        for (var mi = 0; mi < enemyManager.enemies.length; mi++) {
          if (enemyManager.enemies[mi].id >= maxId) maxId = enemyManager.enemies[mi].id + 1;
        }
        for (var j = 0; j < toSpawn; j++) {
          var angle = Math.random() * Math.PI * 2;
          var dist = 2 + Math.random() * 3;
          var spawnPos = { x: bossPos.x + Math.cos(angle) * dist, z: bossPos.z + Math.sin(angle) * dist };
          spawnPos = safeMinionSpawnPos(spawnPos, bossPos, GAME.player.position);
          var minion = new GAME._Enemy(
            enemyManager.scene, spawnPos, _activeBoss.waypoints, _activeBoss.walls,
            maxId + j, 1
          );
          minion._manager = enemyManager;
          minion._isBossMinion = true;
          applyBossMinionTint(minion);
          enemyManager.enemies.push(minion);
        }
        showAnnouncement('REINFORCEMENTS', toSpawn + ' enemies incoming!');
        if (GAME.Sound && GAME.Sound.bossMinionSummon) GAME.Sound.bossMinionSummon();
      }

      _bossPendingMinions = 0;
      GAME._bossPendingMinions = 0;
    }

    // Periodic minion spawns (independent of phase transitions)
    if (!_activeBoss._bossShieldActive) {
      _bossMinionTimer -= dt;
      if (_bossMinionTimer <= 0) {
        var spawnCfg = BOSS_MINION_SPAWN[_activeBoss._bossPhase];
        _bossMinionTimer = spawnCfg.interval;

        // Count alive minions
        var aliveMinions = 0;
        for (var pi = 0; pi < enemyManager.enemies.length; pi++) {
          var pe = enemyManager.enemies[pi];
          if (pe.alive && !pe.isBoss && pe._isBossMinion) aliveMinions++;
        }
        var toSpawn = Math.min(spawnCfg.count, BOSS_MAX_MINIONS - aliveMinions);

        if (toSpawn > 0 && GAME._Enemy) {
          var bossPos = _activeBoss.mesh.position;
          var maxId = 0;
          for (var mi = 0; mi < enemyManager.enemies.length; mi++) {
            if (enemyManager.enemies[mi].id >= maxId) maxId = enemyManager.enemies[mi].id + 1;
          }
          for (var j = 0; j < toSpawn; j++) {
            var angle = Math.random() * Math.PI * 2;
            var dist = 2 + Math.random() * 3;
            var spawnPos = { x: bossPos.x + Math.cos(angle) * dist, z: bossPos.z + Math.sin(angle) * dist };
            spawnPos = safeMinionSpawnPos(spawnPos, bossPos, GAME.player.position);
            var minion = new GAME._Enemy(
              enemyManager.scene, spawnPos, _activeBoss.waypoints, _activeBoss.walls,
              maxId + j, 1
            );
            minion._manager = enemyManager;
            minion._isBossMinion = true;
            applyBossMinionTint(minion);
            enemyManager.enemies.push(minion);
          }
          if (GAME.Sound && GAME.Sound.bossMinionSummon) GAME.Sound.bossMinionSummon();
        }
      }
    }
  }

  function updateBossGrenades(dt) {
    if (!_activeBoss || !_activeBoss.alive) return;
    var list = _activeBoss._bossGrenadeList;
    if (!list || list.length === 0) return;

    for (var i = list.length - 1; i >= 0; i--) {
      var grenade = list[i];
      var explosion = grenade.update(dt);
      if (explosion) {
        processExplosions([explosion]);
        list.splice(i, 1);
      } else if (!grenade.alive) {
        list.splice(i, 1);
      }
    }
  }

  function isBossRound(roundNum) {
    return roundNum === TOTAL_ROUNDS;
  }
  GAME._isBossRound = isBossRound;
  GAME._TOTAL_ROUNDS = TOTAL_ROUNDS;
  Object.defineProperty(GAME, '_skipToBoss', {
    get: function() { return _skipToBoss; },
    set: function(v) { _skipToBoss = v; }
  });
  Object.defineProperty(GAME, '_bossOnlyMatch', {
    get: function() { return _bossOnlyMatch; },
    set: function(v) { _bossOnlyMatch = v; }
  });

  // ── HUD Updates ──────────────────────────────────────────
  function updateHUD() {
    dom.hpFill.style.width = player.health + '%';
    dom.hpValue.textContent = Math.ceil(player.health);
    dom.armorFill.style.width = player.armor + '%';
    dom.armorValue.textContent = Math.ceil(player.armor);
    if (dom.helmetIcon) dom.helmetIcon.style.display = player.helmet ? 'inline' : 'none';

    var def = weapons.getCurrentDef();
    var statusSuffix = weapons.reloading ? ' (Reloading...)' : weapons._boltCycling ? ' (Cycling...)' : '';
    dom.weaponName.textContent = def.name + statusSuffix;

    // Scope overlay
    var isScoped = weapons.isScoped();
    dom.scopeOverlay.classList.toggle('show', isScoped);
    dom.crosshair.style.display = isScoped ? 'none' : '';

    if (def.isKnife) {
      dom.ammoMag.textContent = '\u2014';
      dom.ammoReserve.textContent = '';
    } else if (def.isGrenade) {
      if (weapons.current === 'grenade') {
        dom.ammoMag.textContent = 'HE x' + weapons.grenadeCount;
      } else if (weapons.current === 'smoke') {
        dom.ammoMag.textContent = 'SM x' + weapons.smokeCount;
      } else if (weapons.current === 'flash') {
        dom.ammoMag.textContent = 'FL x' + weapons.flashCount;
      }
      dom.ammoReserve.textContent = '';
    } else {
      dom.ammoMag.textContent = weapons.ammo[weapons.current];
      dom.ammoReserve.textContent = weapons.reserve[weapons.current];
    }

    if (gameState !== GUNGAME_ACTIVE) {
      dom.moneyDisplay.textContent = '$' + player.money;
    }

    var nadeParts = [];
    if (weapons.grenadeCount > 0) nadeParts.push('HE x' + weapons.grenadeCount);
    if (weapons.smokeCount > 0) nadeParts.push('SM x' + weapons.smokeCount);
    if (weapons.flashCount > 0) nadeParts.push('FL x' + weapons.flashCount);
    if (nadeParts.length > 0) {
      dom.grenadeCount.textContent = nadeParts.join('  ');
      dom.grenadeCount.classList.add('show');
    } else {
      dom.grenadeCount.classList.remove('show');
    }

    // Timer
    if (gameState === GUNGAME_ACTIVE) {
      var elapsed = (performance.now() / 1000) - gungameStartTime;
      var gm = Math.floor(elapsed / 60);
      var gs = Math.floor(elapsed % 60);
      dom.roundTimer.textContent = gm + ':' + (gs < 10 ? '0' : '') + gs;
      dom.roundTimer.style.color = '#ff9800';
    } else if (gameState === SURVIVAL_WAVE || gameState === SURVIVAL_BUY) {
      if (gameState === SURVIVAL_BUY) {
        var st = phaseTimer;
        dom.roundTimer.textContent = '0:' + (st < 10 ? '0' : '') + Math.floor(st);
        dom.roundTimer.style.color = st <= 3 ? '#ef5350' : '#ffca28';
      } else {
        dom.roundTimer.textContent = '';
      }
    } else {
      var t = gameState === BUY_PHASE ? phaseTimer : roundTimer;
      var mins = Math.floor(t / 60);
      var secs = Math.floor(t % 60);
      dom.roundTimer.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
      dom.roundTimer.style.color = t <= 10 ? '#ef5350' : '#fff';
    }

    dom.buyPhaseHint.style.display = gameState === BUY_PHASE ? '' : 'none';

    // Dynamic crosshair — reflects base spread + burst spread
    var spread = def.spread || 0;
    if (player.crouching) spread *= 0.6;
    spread += (weapons._burstSpread || 0);
    var gap = Math.max(3, Math.round(spread * 280 + 3));
    var len = Math.max(8, Math.round(spread * 120 + 10));
    // Hit feedback — expand crosshair
    if (GAME._hitFeedback.hitTimer > 0) {
      GAME._hitFeedback.hitTimer -= _frameDt;
      gap += 2;
    }

    dom.crosshair.style.setProperty('--ch-gap', gap + 'px');
    dom.crosshair.style.setProperty('--ch-len', len + 'px');

    // Kill feedback — red flash
    if (GAME._hitFeedback.killTimer > 0) {
      GAME._hitFeedback.killTimer -= _frameDt;
      dom.crosshair.style.setProperty('--ch-color', 'rgba(255, 60, 60, 0.9)');
    } else {
      dom.crosshair.style.setProperty('--ch-color', 'rgba(200, 255, 200, 0.9)');
    }

    // Crouch indicator
    dom.crouchIndicator.classList.toggle('show', player.crouching);

    // Weapon crouching state
    weapons.setCrouching(player.crouching);

    // Low health heartbeat pulse
    if (player.health <= 25 && player.alive) {
      dom.lowHealthPulse.style.display = 'block';
      dom.lowHealthPulse.classList.toggle('critical', player.health <= 15);
    } else {
      dom.lowHealthPulse.style.display = 'none';
    }
  }

  function updateScoreboard() {
    dom.scorePlayer.textContent = playerScore;
    dom.scoreBots.textContent = botScore;
    if (teamMode) {
      dom.scorePlayerLabel.textContent = playerTeam === 'ct' ? 'Counter-Terrorists' : 'Terrorists';
      dom.scoreBotsLabel.textContent = playerTeam === 'ct' ? 'Terrorists' : 'Counter-Terrorists';
    } else {
      dom.scorePlayerLabel.textContent = 'You';
      dom.scoreBotsLabel.textContent = 'Terrorists';
    }
  }

  function addKillFeed(killer, victim, isBossKill) {
    var entry = document.createElement('div');
    entry.className = 'kill-entry' + (isBossKill ? ' boss-kill' : '');
    entry.innerHTML = '<span class="killer">' + killer + '</span> \u25ba <span class="victim">' + victim + '</span>';
    dom.killFeed.appendChild(entry);
    setTimeout(function() { entry.remove(); }, 3500);
  }

  function addRadioFeed(text) {
    var entry = document.createElement('div');
    entry.className = 'radio-entry';
    entry.textContent = '[RADIO] ' + text;
    dom.killFeed.appendChild(entry);
    setTimeout(function() { entry.remove(); }, 2000);
  }
  GAME._addRadioFeed = addRadioFeed;

  function showAnnouncement(text, sub) {
    if (announcementTimeout) clearTimeout(announcementTimeout);
    dom.announcement.innerHTML = text + (sub ? '<div class="sub">' + sub + '</div>' : '');
    dom.announcement.classList.add('show');
    announcementTimeout = setTimeout(function() {
      dom.announcement.classList.remove('show');
    }, 2500);
  }
  GAME.showAnnouncement = showAnnouncement;

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
      updatePauseHint();
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
      updatePauseHint();
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
      updatePauseHint();
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
          startSurvivalWave();
        } else {
          gameState = PLAYING;
          buyMenuOpen = false;
          dom.buyMenu.classList.remove('show');
          if (GAME.touch && GAME.touch._hideBuyCarousel) GAME.touch._hideBuyCarousel();
          showAnnouncement('GO!');
          if (GAME.Sound) GAME.Sound.roundStart();
          // Random bot says "Go go go!" at round start
          setTimeout(function() {
            if (GAME.Sound) GAME.Sound.radioVoice('Go go go!');
            addRadioFeed('Go go go!');
          }, 800);
        }
      }

      updateHUD();
      updatePauseHint();
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
      updatePauseHint();
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
      updateBombLogic(dt);

      // End conditions (bomb logic may have already ended the round via endRound)
      if (gameState === PLAYING) {
        if (teamMode) {
          // Team mode end conditions
          var oppTeam = playerTeam === 'ct' ? 't' : 'ct';
          var oppAllDead = enemyManager.teamAllDead(oppTeam);
          var allyAllDead = enemyManager.teamAllDead(playerTeam);

          if (teamObjective === 'bomb' && bombPlanted) {
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
        if (enemyManager.allDead()) endSurvivalWave();
        else if (!player.alive) endSurvival();
      } else if (gameState === GUNGAME_ACTIVE) {
        // Player death — instant respawn
        if (!player.alive) gunGamePlayerDied();
        // Bot respawn queue
        updateGunGameRespawns(dt);
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
              updateBuyMenu();
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
      updateHUD();
      if (_activeBoss) updateBossHealthBar();
      if (_activeBoss && _activeBoss.alive) _activeBoss._updateBossShield(dt);
      if (_activeBoss && _activeBoss.alive) _activeBoss._updateBossRetreat(dt, player.position);
      // Boss heartbeat — escalates with phase
      if (_activeBoss && _activeBoss.alive) {
        var phase = _activeBoss._bossPhase;
        var targetBPM = phase === 3 ? 120 : phase === 2 ? 90 : 60;
        var targetGain = phase === 3 ? 0.35 : phase === 2 ? 0.25 : 0.15;
        _bossHeartbeatBPM += (targetBPM - _bossHeartbeatBPM) * Math.min(1, dt);
        _bossHeartbeatGain += (targetGain - _bossHeartbeatGain) * Math.min(1, dt);
        _bossHeartbeatTimer -= dt;
        if (_bossHeartbeatTimer <= 0) {
          if (GAME.Sound && GAME.Sound.bossHeartbeat) GAME.Sound.bossHeartbeat(_bossHeartbeatGain);
          _bossHeartbeatTimer = 60 / _bossHeartbeatBPM;
        }
      }
      updateBossAtmosphere(dt);
      checkBossMinions(dt);
      updateBossGrenades(dt);
      updatePauseHint();
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
