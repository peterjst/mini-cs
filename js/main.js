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
    survStartBtn: document.getElementById('surv-start-btn'),
    ggStartBtn:   document.getElementById('gg-start-btn'),
    dmStartBtn2:  document.getElementById('dm-start-btn'),
    missionsFooter: document.getElementById('missions-footer-btn'),
    historyFooter:  document.getElementById('history-footer-btn'),
    tourFooter:     document.getElementById('tour-footer-btn'),
    controlsFooter: document.getElementById('controls-footer-btn'),
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
    weaponName:   document.getElementById('weapon-name'),
    ammoMag:      document.getElementById('ammo-mag'),
    ammoReserve:  document.getElementById('ammo-reserve'),
    moneyDisplay: document.getElementById('money-display'),
    roundTimer:   document.getElementById('round-timer'),
    roundInfo:    document.getElementById('round-info'),
    buyPhaseHint: document.getElementById('buy-phase-hint'),
    killFeed:     document.getElementById('kill-feed'),
    announcement: document.getElementById('announcement'),
    scoreboard:   document.getElementById('scoreboard'),
    scorePlayer:  document.getElementById('score-player'),
    scoreBots:    document.getElementById('score-bots'),
    mapInfo:      document.getElementById('map-info'),
    buyMenu:      document.getElementById('buy-menu'),
    buyBalance:   document.querySelector('.buy-balance'),
    damageFlash:  document.getElementById('damage-flash'),
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
    pauseMenuBtn: document.getElementById('pause-menu-btn'),
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

  // ── Three.js Setup ───────────────────────────────────────
  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.prepend(renderer.domElement);

  var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
  var scene = new THREE.Scene();

  window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    resizeBloom();
  });

  // ── Post-Processing Bloom ─────────────────────────────────
  var bloomVert = 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}';

  var pr = Math.min(window.devicePixelRatio, 2);
  var rw = Math.floor(window.innerWidth * pr);
  var rh = Math.floor(window.innerHeight * pr);
  var hw = Math.floor(rw / 2), hh = Math.floor(rh / 2);

  var sceneRT  = new THREE.WebGLRenderTarget(rw, rh);
  var brightRT = new THREE.WebGLRenderTarget(hw, hh);
  var blurHRT  = new THREE.WebGLRenderTarget(hw, hh);
  var blurVRT  = new THREE.WebGLRenderTarget(hw, hh);

  var bloomCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var fsGeo = new THREE.PlaneGeometry(2, 2);

  // Bright-pass: extract pixels above luminance threshold
  var brightPassMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, threshold: { value: 0.75 }, softKnee: { value: 0.5 } },
    vertexShader: bloomVert,
    fragmentShader: [
      'uniform sampler2D tDiffuse; uniform float threshold; uniform float softKnee; varying vec2 vUv;',
      'void main(){',
      '  vec4 c=texture2D(tDiffuse,vUv);',
      '  float br=dot(c.rgb,vec3(0.2126,0.7152,0.0722));',
      '  float knee=threshold*softKnee;',
      '  float s=br-threshold+knee;',
      '  s=clamp(s,0.0,2.0*knee);',
      '  s=s*s/(4.0*knee+0.00001);',
      '  float w=max(s,br-threshold)/max(br,0.00001);',
      '  gl_FragColor=vec4(c.rgb*clamp(w,0.0,1.0),1.0);',
      '}'
    ].join('\n'),
    toneMapped: false
  });

  // Gaussian blur (9-tap separable)
  var blurFrag = [
    'uniform sampler2D tDiffuse; uniform vec2 direction; varying vec2 vUv;',
    'void main(){',
    '  vec4 s=vec4(0.0);',
    '  s+=texture2D(tDiffuse,vUv)*0.227027;',
    '  for(int i=1;i<5;i++){',
    '    vec2 o=direction*float(i);',
    '    float w=i==1?0.1945946:i==2?0.1216216:i==3?0.054054:0.016216;',
    '    s+=texture2D(tDiffuse,vUv+o)*w;',
    '    s+=texture2D(tDiffuse,vUv-o)*w;',
    '  }',
    '  gl_FragColor=s;',
    '}'
  ].join('\n');

  var blurHMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, direction: { value: new THREE.Vector2(1.0 / hw, 0) } },
    vertexShader: bloomVert, fragmentShader: blurFrag, toneMapped: false
  });
  var blurVMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, direction: { value: new THREE.Vector2(0, 1.0 / hh) } },
    vertexShader: bloomVert, fragmentShader: blurFrag, toneMapped: false
  });

  // Composite: blend scene + bloom
  var compositeMat = new THREE.ShaderMaterial({
    uniforms: { tScene: { value: null }, tBloom: { value: null }, bloomStrength: { value: 0.4 } },
    vertexShader: bloomVert,
    fragmentShader: [
      'uniform sampler2D tScene; uniform sampler2D tBloom; uniform float bloomStrength; varying vec2 vUv;',
      'void main(){',
      '  gl_FragColor=texture2D(tScene,vUv)+texture2D(tBloom,vUv)*bloomStrength;',
      '}'
    ].join('\n'),
    toneMapped: false
  });

  // Mini-scenes for each pass
  var brightScene = new THREE.Scene(); brightScene.add(new THREE.Mesh(fsGeo, brightPassMat));
  var blurHScene  = new THREE.Scene(); blurHScene.add(new THREE.Mesh(fsGeo, blurHMat));
  var blurVScene  = new THREE.Scene(); blurVScene.add(new THREE.Mesh(fsGeo, blurVMat));
  var compositeScene = new THREE.Scene(); compositeScene.add(new THREE.Mesh(fsGeo, compositeMat));

  function renderWithBloom() {
    renderer.setRenderTarget(sceneRT);
    renderer.render(scene, camera);

    brightPassMat.uniforms.tDiffuse.value = sceneRT.texture;
    renderer.setRenderTarget(brightRT);
    renderer.render(brightScene, bloomCam);

    blurHMat.uniforms.tDiffuse.value = brightRT.texture;
    renderer.setRenderTarget(blurHRT);
    renderer.render(blurHScene, bloomCam);

    blurVMat.uniforms.tDiffuse.value = blurHRT.texture;
    renderer.setRenderTarget(blurVRT);
    renderer.render(blurVScene, bloomCam);

    compositeMat.uniforms.tScene.value = sceneRT.texture;
    compositeMat.uniforms.tBloom.value = blurVRT.texture;
    renderer.setRenderTarget(null);
    renderer.render(compositeScene, bloomCam);
  }

  function resizeBloom() {
    var p = Math.min(window.devicePixelRatio, 2);
    var w = Math.floor(window.innerWidth * p);
    var h = Math.floor(window.innerHeight * p);
    var hw2 = Math.floor(w / 2), hh2 = Math.floor(h / 2);
    sceneRT.setSize(w, h);
    brightRT.setSize(hw2, hh2);
    blurHRT.setSize(hw2, hh2);
    blurVRT.setSize(hw2, hh2);
    blurHMat.uniforms.direction.value.set(1.0 / hw2, 0);
    blurVMat.uniforms.direction.value.set(0, 1.0 / hh2);
  }

  // ── Game Variables ───────────────────────────────────────
  var gameState = MENU;
  var player, weapons, enemyManager;
  var mapWalls = [];
  var currentMapIndex = 0;
  var roundNumber = 0;
  var playerScore = 0, botScore = 0;
  var roundTimer = 0, phaseTimer = 0;
  var TOTAL_ROUNDS = 6;
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
  var pausedFromState = null; // state to resume to when unpausing

  // ── Difficulty ─────────────────────────────────────────
  var selectedDifficulty = localStorage.getItem('miniCS_difficulty') || 'normal';
  var DIFF_XP_MULT = { easy: 0.5, normal: 1, hard: 1.5, elite: 2.5 };

  // ── Kill Streaks ───────────────────────────────────────
  var killStreak = 0;
  var streakTimeout = null;
  var STREAK_NAMES = { 2: 'DOUBLE KILL', 3: 'TRIPLE KILL', 4: 'QUAD KILL', 5: 'RAMPAGE', 8: 'UNSTOPPABLE', 12: 'GODLIKE' };

  // ── Mission System ───────────────────────────────────────
  var MISSION_POOL = [
    { id: 'headshots_5', type: 'match', desc: 'Get 5 headshots', target: 5, tracker: 'headshots', reward: 75 },
    { id: 'kills_10', type: 'match', desc: 'Get 10 kills', target: 10, tracker: 'kills', reward: 80 },
    { id: 'triple_kill', type: 'match', desc: 'Get a Triple Kill', target: 1, tracker: 'triple_kill', reward: 100 },
    { id: 'pistol_round', type: 'round', desc: 'Win a round using only pistol', target: 1, tracker: 'pistol_win', reward: 120 },
    { id: 'knife_kill', type: 'match', desc: 'Get a knife kill', target: 1, tracker: 'knife_kills', reward: 150 },
    { id: 'crouch_kills_3', type: 'match', desc: 'Kill 3 enemies while crouching', target: 3, tracker: 'crouch_kills', reward: 90 },
    { id: 'no_damage_round', type: 'round', desc: 'Win a round without taking damage', target: 1, tracker: 'no_damage_win', reward: 150 },
    { id: 'survival_wave_5', type: 'survival', desc: 'Reach wave 5 in Survival', target: 5, tracker: 'survival_wave', reward: 100 },
    { id: 'survival_dust', type: 'survival', desc: 'Reach wave 5 on Dust (Survival)', target: 5, tracker: 'survival_dust', reward: 120 },
    { id: 'earn_5000', type: 'match', desc: 'Earn $5000 in a single match', target: 5000, tracker: 'money_earned', reward: 100 },
    { id: 'rampage', type: 'match', desc: 'Get a Rampage (5 kill streak)', target: 1, tracker: 'rampage', reward: 150 },
    { id: 'weekly_wins_3', type: 'weekly', desc: 'Win 3 competitive matches', target: 3, tracker: 'weekly_wins', reward: 300 },
    { id: 'weekly_headshots_25', type: 'weekly', desc: 'Get 25 headshots (any mode)', target: 25, tracker: 'weekly_headshots', reward: 350 },
    { id: 'weekly_survival_wave_10', type: 'weekly', desc: 'Reach wave 10 in Survival', target: 10, tracker: 'weekly_survival', reward: 500 },
    { id: 'gungame_complete', type: 'match', desc: 'Complete a Gun Game', target: 1, tracker: 'gungame_complete', reward: 100 },
    { id: 'gungame_fast', type: 'match', desc: 'Complete Gun Game under 3 minutes', target: 1, tracker: 'gungame_fast', reward: 150 }
  ];
  var activeMissions = { daily1: null, daily2: null, daily3: null, weekly: null };
  var lastMissionRefresh = { daily: 0, weekly: 0 };

  // ── Round Perk System ────────────────────────────────────
  var PERK_POOL = [
    { id: 'stopping_power', name: 'Stopping Power', desc: '+25% weapon damage', icon: '\u26A1' },
    { id: 'quick_hands', name: 'Quick Hands', desc: '30% faster reload', icon: '\u2699' },
    { id: 'fleet_foot', name: 'Fleet Foot', desc: '+20% move speed', icon: '\uD83D\uDC5F' },
    { id: 'thick_skin', name: 'Thick Skin', desc: '+25 HP at round start', icon: '\uD83D\uDEE1' },
    { id: 'scavenger', name: 'Scavenger', desc: '+$150 bonus per kill', icon: '\uD83D\uDCB0' },
    { id: 'marksman', name: 'Marksman', desc: 'Headshot multiplier 3\u00D7', icon: '\uD83C\uDFAF' },
    { id: 'steady_aim', name: 'Steady Aim', desc: '30% tighter spread', icon: '\uD83D\uDD0D' },
    { id: 'iron_lungs', name: 'Iron Lungs', desc: 'Crouch accuracy 60%', icon: '\uD83E\uDEC1' },
    { id: 'blast_radius', name: 'Blast Radius', desc: 'Grenade radius +30%', icon: '\uD83D\uDCA3' },
    { id: 'ghost', name: 'Ghost', desc: 'Enemies detect you 30% slower', icon: '\uD83D\uDC7B' },
    { id: 'juggernaut', name: 'Juggernaut', desc: 'Take 15% less damage', icon: '\uD83E\uDDBE' }
  ];
  var activePerks = [];
  var perkChoices = [];
  var lastRoundWon = false;
  var perkScreenOpen = false;

  // ── Screen Shake ───────────────────────────────────────
  var shakeIntensity = 0;
  var shakeTimer = 0;

  // ── Hitmarker ──────────────────────────────────────────
  var hitmarkerTimer = 0;

  // ── Minimap ────────────────────────────────────────────
  var minimapCtx = dom.minimapCanvas ? dom.minimapCanvas.getContext('2d') : null;
  var minimapWallSegments = [];
  var minimapFrame = 0;
  var minimapScale = 1;
  var minimapCenter = { x: 0, z: 0 };

  // ── Rank System ────────────────────────────────────────
  var RANKS = [
    { name: 'Silver I',        xp: 0,     color: '#8a8a8a' },
    { name: 'Silver II',       xp: 100,   color: '#9a9a9a' },
    { name: 'Silver III',      xp: 250,   color: '#aaaaaa' },
    { name: 'Silver IV',       xp: 500,   color: '#b0b0b0' },
    { name: 'Silver Elite',    xp: 800,   color: '#c0c0c0' },
    { name: 'Silver Elite Master', xp: 1200, color: '#d0d0d0' },
    { name: 'Gold Nova I',     xp: 1700,  color: '#c8a832' },
    { name: 'Gold Nova II',    xp: 2300,  color: '#d4b440' },
    { name: 'Gold Nova III',   xp: 3000,  color: '#e0c050' },
    { name: 'Gold Nova Master', xp: 4000, color: '#ecd060' },
    { name: 'Master Guardian I', xp: 5200, color: '#4fc3f7' },
    { name: 'Master Guardian II', xp: 6600, color: '#29b6f6' },
    { name: 'Master Guardian Elite', xp: 8200, color: '#039be5' },
    { name: 'Distinguished MG', xp: 10000, color: '#0288d1' },
    { name: 'Legendary Eagle',  xp: 12500, color: '#ab47bc' },
    { name: 'Legendary Eagle Master', xp: 15500, color: '#8e24aa' },
    { name: 'Supreme Master',   xp: 19000, color: '#ff7043' },
    { name: 'Global Elite',     xp: 23000, color: '#ffd740' },
  ];

  function getTotalXP() {
    return parseInt(localStorage.getItem('miniCS_xp')) || 0;
  }
  function setTotalXP(xp) {
    localStorage.setItem('miniCS_xp', xp);
  }
  function getRankForXP(xp) {
    var rank = RANKS[0];
    for (var i = RANKS.length - 1; i >= 0; i--) {
      if (xp >= RANKS[i].xp) { rank = RANKS[i]; rank.index = i; break; }
    }
    return rank;
  }
  function getNextRank(rank) {
    var idx = rank.index !== undefined ? rank.index : 0;
    return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
  }
  function updateRankDisplay() {
    var xp = getTotalXP();
    var rank = getRankForXP(xp);
    var next = getNextRank(rank);
    var progress = 0;
    if (next) {
      progress = Math.min(100, ((xp - rank.xp) / (next.xp - rank.xp)) * 100);
    } else {
      progress = 100;
    }
    dom.rankDisplay.innerHTML =
      '<div class="rank-badge" style="color:' + rank.color + '; border-color:' + rank.color + ';">' + rank.name + '</div>' +
      '<div class="rank-xp-bar"><div class="rank-xp-fill" style="width:' + progress + '%; background:' + rank.color + ';"></div></div>' +
      '<div class="rank-xp-text">' + xp + ' XP' + (next ? ' / ' + next.xp : ' (MAX)') + '</div>';
  }

  function calculateXP(kills, headshots, roundsWon, matchWin, diffMult) {
    var baseXP = (kills * 10) + (headshots * 5) + (roundsWon * 20) + (matchWin ? 50 : 0);
    return Math.round(baseXP * diffMult);
  }

  function awardXP(xpEarned) {
    var oldXP = getTotalXP();
    var oldRank = getRankForXP(oldXP);
    var newXP = oldXP + xpEarned;
    setTotalXP(newXP);
    var newRank = getRankForXP(newXP);
    if (newRank.index > oldRank.index) {
      // Rank up!
      if (GAME.Sound) GAME.Sound.rankUp();
      var flash = document.createElement('div');
      flash.className = 'rankup-flash';
      document.body.appendChild(flash);
      setTimeout(function() { flash.remove(); }, 1600);
    }
    return { oldRank: oldRank, newRank: newRank, ranked_up: newRank.index > oldRank.index };
  }

  // ── Survival Mode ──────────────────────────────────────
  var survivalWave = 0;
  var survivalKills = 0;
  var survivalHeadshots = 0;
  var survivalMapIndex = 0;
  var survivalLastMapData = null;

  function getSurvivalBest() {
    try { return JSON.parse(localStorage.getItem('miniCS_survivalBest')) || {}; }
    catch(e) { return {}; }
  }
  function setSurvivalBest(mapName, wave) {
    var best = getSurvivalBest();
    if (!best[mapName] || wave > best[mapName]) {
      best[mapName] = wave;
      localStorage.setItem('miniCS_survivalBest', JSON.stringify(best));
    }
  }



  // ── Gun Game Mode ─────────────────────────────────────
  var GUNGAME_WEAPONS = ['knife', 'pistol', 'shotgun', 'rifle', 'awp', 'knife'];
  var GUNGAME_NAMES = ['Knife', 'Pistol', 'Shotgun', 'AK-47', 'AWP', 'Knife (Final)'];
  var GUNGAME_BOT_COUNT = 4;
  var GUNGAME_BOT_RESPAWN_DELAY = 3;
  var gungameLevel = 0;
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
  var dmRespawnQueue = [];
  var dmPlayerDeadTimer = 0;
  var dmSpawnProtection = 0;

  function getGunGameBest() {
    try { return JSON.parse(localStorage.getItem('miniCS_gungameBest')) || {}; }
    catch(e) { return {}; }
  }
  function setGunGameBest(mapName, seconds) {
    var best = getGunGameBest();
    if (!best[mapName] || seconds < best[mapName]) {
      best[mapName] = seconds;
      localStorage.setItem('miniCS_gungameBest', JSON.stringify(best));
    }
  }
  function updateGunGameBestDisplay() {
    var best = getGunGameBest();
    var mapNames = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var parts = [];
    for (var i = 0; i < mapNames.length; i++) {
      if (best[mapNames[i]]) {
        var s = best[mapNames[i]];
        var m = Math.floor(s / 60), sec = Math.floor(s % 60);
        parts.push(mapNames[i].charAt(0).toUpperCase() + mapNames[i].slice(1) + ': ' + m + ':' + (sec < 10 ? '0' : '') + sec);
      }
    }
    if (dom.gungameBestDisplay) dom.gungameBestDisplay.textContent = parts.length > 0 ? 'BEST TIMES — ' + parts.join(' | ') : 'No records yet';
  }

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
    var mapNames = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var parts = [];
    for (var i = 0; i < mapNames.length; i++) {
      if (best[mapNames[i]]) parts.push(mapNames[i].charAt(0).toUpperCase() + mapNames[i].slice(1) + ': ' + best[mapNames[i]] + ' kills');
    }
    if (dom.dmBestDisplay) dom.dmBestDisplay.textContent = parts.length > 0 ? 'BEST — ' + parts.join(' | ') : 'No records yet';
  }

  // ── Blood Particles ────────────────────────────────────
  var _bloodGeo = null;
  var _bloodMat = null;
  var _bloodDecalGeo = null;
  var bloodParticles = [];
  var bloodDecals = [];
  var MAX_BLOOD_DECALS = 80;
  var _bloodRc = new THREE.Raycaster();

  function spawnBloodBurst(point, headshot) {
    if (!_bloodGeo) {
      _bloodGeo = new THREE.BoxGeometry(0.03, 0.03, 0.03);
      _bloodMat = new THREE.MeshBasicMaterial({ color: 0xcc0000 });
      _bloodDecalGeo = new THREE.PlaneGeometry(0.15, 0.15);
    }
    var count = headshot ? 10 : 6;
    var speed = headshot ? 5 : 3;
    for (var i = 0; i < count; i++) {
      var p = new THREE.Mesh(_bloodGeo, _bloodMat);
      p.position.copy(point);
      var vx = (Math.random() - 0.5) * speed;
      var vy = Math.random() * speed * (headshot ? 0.8 : 0.5);
      var vz = (Math.random() - 0.5) * speed;
      scene.add(p);
      bloodParticles.push({ mesh: p, vel: new THREE.Vector3(vx, vy, vz), life: 0, stuck: false });
    }
  }

  function _stickBlood(bp) {
    bp.stuck = true;
    bp.vel.set(0, 0, 0);
    bp.stuckLife = 0;

    // Place a small blood decal on the surface
    var decalMat = new THREE.MeshBasicMaterial({
      color: 0x880000 + Math.floor(Math.random() * 0x220000),
      transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide
    });
    var decal = new THREE.Mesh(_bloodDecalGeo, decalMat);
    decal.position.copy(bp.mesh.position);

    // Raycast to find nearby surface and orient decal
    var dirs = [
      new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
    ];
    var walls = player ? player.walls : [];
    var closest = null;
    for (var d = 0; d < dirs.length; d++) {
      _bloodRc.set(bp.mesh.position, dirs[d]);
      _bloodRc.far = 0.3;
      var hits = _bloodRc.intersectObjects(walls, false);
      if (hits.length > 0 && (!closest || hits[0].distance < closest.distance)) {
        closest = hits[0];
      }
    }
    if (closest && closest.face) {
      decal.position.copy(closest.point);
      decal.position.addScaledVector(closest.face.normal, 0.005);
      decal.lookAt(decal.position.clone().add(closest.face.normal));
    }

    var sz = 0.8 + Math.random() * 0.6;
    decal.scale.set(sz, sz, sz);
    decal.rotation.z = Math.random() * Math.PI * 2;
    scene.add(decal);
    bloodDecals.push({ mesh: decal, mat: decalMat, life: 0 });

    // Remove oldest decals if over limit
    while (bloodDecals.length > MAX_BLOOD_DECALS) {
      var old = bloodDecals.shift();
      scene.remove(old.mesh);
      old.mat.dispose();
    }
  }

  function updateBloodParticles(dt) {
    var walls = player ? player.walls : [];

    for (var i = bloodParticles.length - 1; i >= 0; i--) {
      var bp = bloodParticles[i];
      bp.life += dt;

      if (bp.stuck) {
        bp.stuckLife += dt;
        if (bp.stuckLife > 0.15) {
          scene.remove(bp.mesh);
          bloodParticles.splice(i, 1);
        }
        continue;
      }

      // Apply gravity
      bp.vel.y -= 12 * dt;
      var step = bp.vel.clone().multiplyScalar(dt);
      var stepLen = step.length();

      // Check ground collision (y <= 0.01)
      var nextY = bp.mesh.position.y + step.y;
      if (nextY <= 0.01) {
        bp.mesh.position.y = 0.01;
        _stickBlood(bp);
        continue;
      }

      // Raycast along velocity to detect wall/object collision
      if (stepLen > 0.001 && walls.length > 0) {
        _bloodRc.set(bp.mesh.position, step.clone().normalize());
        _bloodRc.far = stepLen + 0.02;
        var hits = _bloodRc.intersectObjects(walls, false);
        if (hits.length > 0) {
          bp.mesh.position.copy(hits[0].point);
          _stickBlood(bp);
          continue;
        }
      }

      bp.mesh.position.add(step);

      // Remove if flying too long without hitting anything
      if (bp.life > 1.5) {
        scene.remove(bp.mesh);
        bloodParticles.splice(i, 1);
      }
    }

    // Fade out decals over time
    for (var j = bloodDecals.length - 1; j >= 0; j--) {
      var bd = bloodDecals[j];
      bd.life += dt;
      if (bd.life > 8) {
        bd.mat.opacity -= dt * 0.5;
        if (bd.mat.opacity <= 0) {
          scene.remove(bd.mesh);
          bd.mat.dispose();
          bloodDecals.splice(j, 1);
        }
      }
    }
  }

  // ── Birds ──────────────────────────────────────────────
  var birds = [];
  var BIRD_COUNT = 5;
  var BIRD_MONEY = 200;
  var _birdId = 0;
  var _birdMapSize = 50;
  var _featherGeo = null;
  var _birdBodyMat = null, _birdWingMat = null, _birdBeakMat = null;

  function getBirdMaterials() {
    if (!_birdBodyMat) {
      _birdBodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8, metalness: 0.1 });
      _birdWingMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.75, metalness: 0.1 });
      _birdBeakMat = new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.6, metalness: 0.2 });
    }
  }

  function createBird(mapSize) {
    getBirdMaterials();
    var group = new THREE.Group();
    var body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), _birdBodyMat);
    body.scale.set(1, 0.8, 1.8);
    group.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), _birdBodyMat);
    head.position.set(0, 0.08, -0.32);
    group.add(head);
    var beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), _birdBeakMat);
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(0, 0.04, -0.48);
    group.add(beak);
    var tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.18), _birdWingMat);
    tail.position.set(0, 0.04, 0.3);
    tail.rotation.x = 0.2;
    group.add(tail);
    var leftPivot = new THREE.Group();
    leftPivot.position.set(0.18, 0.05, 0);
    var leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.02, 0.22), _birdWingMat);
    leftWing.position.set(0.22, 0, 0);
    leftPivot.add(leftWing);
    group.add(leftPivot);
    var rightPivot = new THREE.Group();
    rightPivot.position.set(-0.18, 0.05, 0);
    var rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.02, 0.22), _birdWingMat);
    rightWing.position.set(-0.22, 0, 0);
    rightPivot.add(rightWing);
    group.add(rightPivot);

    var half = mapSize * 0.4;
    var cx = (Math.random() - 0.5) * 2 * half;
    var cz = (Math.random() - 0.5) * 2 * half;
    var radius = 5 + Math.random() * 12;
    var height = 10 + Math.random() * 10;
    var speed = 0.3 + Math.random() * 0.4;
    var angle = Math.random() * Math.PI * 2;
    var flapSpeed = 6 + Math.random() * 4;

    group.position.set(cx + Math.cos(angle) * radius, height, cz + Math.sin(angle) * radius);
    scene.add(group);

    return {
      id: _birdId++, mesh: group, alive: true,
      leftPivot: leftPivot, rightPivot: rightPivot,
      cx: cx, cz: cz, radius: radius, height: height,
      speed: speed, angle: angle, flapSpeed: flapSpeed,
      flapPhase: Math.random() * Math.PI * 2, respawnTimer: 0,
    };
  }

  function spawnBirds(mapSize) {
    birds = [];
    _birdId = 0;
    _birdMapSize = mapSize;
    for (var i = 0; i < BIRD_COUNT; i++) birds.push(createBird(mapSize));
    weapons.setBirdsRef(birds);
  }

  function updateBirds(dt) {
    for (var i = 0; i < birds.length; i++) {
      var b = birds[i];
      if (!b.alive) {
        b.respawnTimer -= dt;
        if (b.respawnTimer <= 0) {
          b.alive = true;
          var half = _birdMapSize * 0.4;
          b.cx = (Math.random() - 0.5) * 2 * half;
          b.cz = (Math.random() - 0.5) * 2 * half;
          b.radius = 5 + Math.random() * 12;
          b.height = 10 + Math.random() * 10;
          b.angle = Math.random() * Math.PI * 2;
          b.mesh.visible = true;
          b.mesh.position.set(b.cx + Math.cos(b.angle) * b.radius, b.height, b.cz + Math.sin(b.angle) * b.radius);
          scene.add(b.mesh);
        }
        continue;
      }
      b.angle += b.speed * dt;
      b.mesh.position.set(b.cx + Math.cos(b.angle) * b.radius, b.height + Math.sin(b.angle * 2) * 0.5, b.cz + Math.sin(b.angle) * b.radius);
      b.mesh.rotation.y = -b.angle + Math.PI / 2;
      b.mesh.rotation.z = Math.sin(b.angle) * 0.15;
      b.flapPhase += b.flapSpeed * dt;
      var flap = Math.sin(b.flapPhase) * 0.6;
      b.leftPivot.rotation.z = flap;
      b.rightPivot.rotation.z = -flap;
    }
  }

  function killBird(bird, hitPoint) {
    bird.alive = false;
    bird.respawnTimer = 15 + Math.random() * 10;
    if (!_featherGeo) _featherGeo = new THREE.BoxGeometry(0.06, 0.01, 0.1);
    for (var i = 0; i < 6; i++) {
      var feather = new THREE.Mesh(_featherGeo, _birdWingMat);
      feather.position.copy(hitPoint);
      var vel = new THREE.Vector3((Math.random()-0.5)*4, Math.random()*3, (Math.random()-0.5)*4);
      scene.add(feather);
      (function(f,v) {
        var life = 0;
        var iv = setInterval(function() {
          life += 0.016; v.y -= 9.8*0.016;
          f.position.add(v.clone().multiplyScalar(0.016));
          f.rotation.x += 5*0.016; f.rotation.z += 3*0.016;
          if (life > 1.5) { clearInterval(iv); if (f.parent) f.parent.remove(f); }
        }, 16);
      })(feather, vel);
    }
    bird.mesh.visible = false;
  }

  // ── Pointer Lock ─────────────────────────────────────────
  renderer.domElement.addEventListener('click', function() {
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

  // ── Mission System Functions ─────────────────────────────
  function getMissionDef(id) {
    for (var i = 0; i < MISSION_POOL.length; i++) {
      if (MISSION_POOL[i].id === id) return MISSION_POOL[i];
    }
    return null;
  }

  function generateDailyMissions() {
    var dailies = [];
    for (var i = 0; i < MISSION_POOL.length; i++) {
      if (MISSION_POOL[i].type !== 'weekly') dailies.push(MISSION_POOL[i]);
    }
    var picked = [];
    for (var d = 0; d < 3; d++) {
      var m;
      do { m = dailies[Math.floor(Math.random() * dailies.length)]; }
      while (picked.indexOf(m.id) >= 0);
      picked.push(m.id);
      activeMissions['daily' + (d + 1)] = { id: m.id, progress: 0, completed: false };
    }
  }

  function generateWeeklyMission() {
    var weeklies = [];
    for (var i = 0; i < MISSION_POOL.length; i++) {
      if (MISSION_POOL[i].type === 'weekly') weeklies.push(MISSION_POOL[i]);
    }
    var w = weeklies[Math.floor(Math.random() * weeklies.length)];
    activeMissions.weekly = { id: w.id, progress: 0, completed: false };
  }

  function checkMissionRefresh() {
    var now = Date.now();
    var DAY_MS = 24 * 60 * 60 * 1000;
    var WEEK_MS = 7 * DAY_MS;
    if (now - lastMissionRefresh.daily > DAY_MS) {
      activeMissions.daily1 = null;
      activeMissions.daily2 = null;
      activeMissions.daily3 = null;
      lastMissionRefresh.daily = now;
    }
    if (now - lastMissionRefresh.weekly > WEEK_MS) {
      activeMissions.weekly = null;
      lastMissionRefresh.weekly = now;
    }
    if (!activeMissions.daily1) generateDailyMissions();
    if (!activeMissions.weekly) generateWeeklyMission();
    saveMissionState();
  }

  function loadMissionState() {
    try {
      var saved = localStorage.getItem('miniCS_missions');
      if (saved) {
        var data = JSON.parse(saved);
        if (data.active) activeMissions = data.active;
        if (data.lastRefresh) lastMissionRefresh = data.lastRefresh;
      }
    } catch (e) {}
  }

  function saveMissionState() {
    localStorage.setItem('miniCS_missions', JSON.stringify({
      active: activeMissions,
      lastRefresh: lastMissionRefresh
    }));
  }

  function trackMissionEvent(eventType, value) {
    var slots = ['daily1', 'daily2', 'daily3', 'weekly'];
    for (var s = 0; s < slots.length; s++) {
      var mission = activeMissions[slots[s]];
      if (!mission || mission.completed) continue;
      var def = getMissionDef(mission.id);
      if (!def || def.tracker !== eventType) continue;
      mission.progress = Math.min(def.target, mission.progress + (value || 1));
      if (mission.progress >= def.target) {
        mission.completed = true;
        var oldXP = getTotalXP();
        setTotalXP(oldXP + def.reward);
        showAnnouncement('MISSION COMPLETE', def.desc + '  +' + def.reward + ' XP');
        if (GAME.Sound) GAME.Sound.killStreak(2);
        updateRankDisplay();
      }
    }
    saveMissionState();
    updateMissionUI();
  }

  function updateMissionUI() {
    var dailyList = document.getElementById('mission-daily-list');
    var weeklyEl = document.getElementById('mission-weekly');
    if (!dailyList || !weeklyEl) return;
    dailyList.innerHTML = '';
    var slots = ['daily1', 'daily2', 'daily3'];
    for (var i = 0; i < slots.length; i++) {
      var m = activeMissions[slots[i]];
      if (!m) continue;
      var def = getMissionDef(m.id);
      if (!def) continue;
      var card = document.createElement('div');
      card.className = 'mission-card' + (m.completed ? ' completed' : '');
      card.innerHTML =
        '<div class="mission-desc">' + def.desc + '</div>' +
        '<div class="mission-progress">' + m.progress + ' / ' + def.target + '</div>' +
        '<div class="mission-reward">' + (m.completed ? '\u2713' : '+' + def.reward + ' XP') + '</div>';
      dailyList.appendChild(card);
    }
    var wm = activeMissions.weekly;
    if (wm) {
      var wd = getMissionDef(wm.id);
      if (wd) {
        weeklyEl.className = 'mission-card' + (wm.completed ? ' completed' : '');
        weeklyEl.innerHTML =
          '<div class="mission-desc">' + wd.desc + '</div>' +
          '<div class="mission-progress">' + wm.progress + ' / ' + wd.target + '</div>' +
          '<div class="mission-reward">' + (wm.completed ? '\u2713' : '+' + wd.reward + ' XP') + '</div>';
      }
    }
  }

  function updateMissionOverlay() {
    var dailyList = document.getElementById('overlay-mission-daily-list');
    var weeklyEl = document.getElementById('overlay-mission-weekly');
    if (!dailyList || !weeklyEl) return;
    dailyList.innerHTML = '';
    var slots = ['daily1', 'daily2', 'daily3'];
    for (var i = 0; i < slots.length; i++) {
      var m = activeMissions[slots[i]];
      if (!m) continue;
      var def = getMissionDef(m.id);
      if (!def) continue;
      var card = document.createElement('div');
      card.className = 'mission-card' + (m.completed ? ' completed' : '');
      card.innerHTML =
        '<div class="mission-desc">' + def.desc + '</div>' +
        '<div class="mission-progress">' + m.progress + ' / ' + def.target + '</div>' +
        '<div class="mission-reward">' + (m.completed ? '\u2713' : '+' + def.reward + ' XP') + '</div>';
      dailyList.appendChild(card);
    }
    var wm = activeMissions.weekly;
    if (wm) {
      var wd = getMissionDef(wm.id);
      if (wd) {
        weeklyEl.className = 'mission-card' + (wm.completed ? ' completed' : '');
        weeklyEl.innerHTML =
          '<div class="mission-desc">' + wd.desc + '</div>' +
          '<div class="mission-progress">' + wm.progress + ' / ' + wd.target + '</div>' +
          '<div class="mission-reward">' + (wm.completed ? '\u2713' : '+' + wd.reward + ' XP') + '</div>';
      }
    }
  }

  // ── Perk System Functions ──────────────────────────────────
  function hasPerk(perkId) {
    for (var i = 0; i < activePerks.length; i++) {
      if (activePerks[i].id === perkId) return true;
    }
    return false;
  }

  function clearPerks() {
    activePerks = [];
    perkScreenOpen = false;
    updateActivePerkUI();
  }

  function updateActivePerkUI() {
    var container = document.getElementById('active-perks');
    if (!container) return;
    container.innerHTML = '';
    for (var i = 0; i < activePerks.length; i++) {
      var el = document.createElement('div');
      el.className = 'active-perk';
      el.innerHTML = '<span class="active-perk-icon">' + activePerks[i].icon + '</span>' + activePerks[i].name;
      container.appendChild(el);
    }
  }

  function offerPerkChoice() {
    if (perkScreenOpen) return;
    perkScreenOpen = true;
    perkChoices = [];
    var available = [];
    for (var i = 0; i < PERK_POOL.length; i++) {
      if (!hasPerk(PERK_POOL[i].id)) available.push(PERK_POOL[i]);
    }
    for (var j = 0; j < 3 && available.length > 0; j++) {
      var idx = Math.floor(Math.random() * available.length);
      perkChoices.push(available[idx]);
      available.splice(idx, 1);
    }
    renderPerkChoices();
    var screen = document.getElementById('perk-screen');
    if (screen) screen.classList.add('show');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  function renderPerkChoices() {
    var grid = document.getElementById('perk-choices');
    if (!grid) return;
    grid.innerHTML = '';
    for (var i = 0; i < perkChoices.length; i++) {
      (function(perk) {
        var card = document.createElement('div');
        card.className = 'perk-card';
        card.innerHTML =
          '<div class="perk-icon">' + perk.icon + '</div>' +
          '<div class="perk-name">' + perk.name + '</div>' +
          '<div class="perk-desc">' + perk.desc + '</div>';
        card.addEventListener('click', function() { selectPerk(perk); });
        grid.appendChild(card);
      })(perkChoices[i]);
    }
  }

  function selectPerk(perk) {
    activePerks.push(perk);
    perkScreenOpen = false;
    var screen = document.getElementById('perk-screen');
    if (screen) screen.classList.remove('show');
    updateActivePerkUI();
    if (GAME.Sound) GAME.Sound.buy();
    startRound();
  }

  // Expose hasPerk for other modules
  GAME.hasPerk = hasPerk;

  // ── Initialize ───────────────────────────────────────────
  function init() {
    player = new GAME.Player(camera);
    scene.add(camera);
    weapons = new GAME.WeaponSystem(camera, scene);
    enemyManager = new GAME.EnemyManager(scene);
    if (GAME.Sound) GAME.Sound.init();

    // Apply saved difficulty
    GAME.setDifficulty(selectedDifficulty);
    initModeGrid();
    updateRankDisplay();
    setupInput();

    // Mission system init
    loadMissionState();
    checkMissionRefresh();
    updateMissionUI();
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
        el.querySelectorAll('.config-map-btn').forEach(function(b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        localStorage.setItem('miniCS_lastMap_' + gridId, btn.dataset.map);
      });
    });

    // Sync difficulty buttons with stored preference
    document.querySelectorAll('.config-diff-btn').forEach(function(btn) {
      btn.classList.toggle('selected', btn.dataset.diff === selectedDifficulty);
    });

    // Difficulty button click handling (all rows)
    document.querySelectorAll('.config-diff-row').forEach(function(row) {
      row.addEventListener('click', function(e) {
        var btn = e.target.closest('.config-diff-btn');
        if (!btn) return;
        selectedDifficulty = btn.dataset.diff;
        GAME.setDifficulty(selectedDifficulty);
        localStorage.setItem('miniCS_difficulty', selectedDifficulty);
        // Update ALL difficulty rows to stay in sync
        document.querySelectorAll('.config-diff-btn').forEach(function(b) {
          b.classList.toggle('selected', b.dataset.diff === selectedDifficulty);
        });
      });
    });

    // Card click → expand
    cards.forEach(function(card) {
      card.addEventListener('click', function(e) {
        if (grid.classList.contains('expanded')) return;
        if (e.target.closest('button')) return;
        grid.classList.add('expanded');
        card.classList.add('active');
      });
    });

    // Back button → collapse
    back.addEventListener('click', function() {
      grid.classList.remove('expanded');
      cards.forEach(function(c) { c.classList.remove('active'); });
    });

    // Start buttons
    dom.compStartBtn.addEventListener('click', function() {
      var mapEl = document.querySelector('#comp-map-grid .config-map-btn.selected');
      var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
      startMatch(mapIdx);
    });

    dom.survStartBtn.addEventListener('click', function() {
      var mapEl = document.querySelector('#surv-map-grid .config-map-btn.selected');
      var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
      startSurvival(mapIdx);
    });

    dom.ggStartBtn.addEventListener('click', function() {
      var mapEl = document.querySelector('#gg-map-grid .config-map-btn.selected');
      var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
      startGunGame(mapIdx);
    });

    dom.dmStartBtn2.addEventListener('click', function() {
      var mapEl = document.querySelector('#dm-config-map-grid .config-map-btn.selected');
      var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
      startDeathmatch(mapIdx);
    });

    // Footer link → overlay toggles
    dom.controlsFooter.addEventListener('click', function() {
      dom.controlsOverlay.classList.add('show');
    });
    dom.controlsClose.addEventListener('click', function() {
      dom.controlsOverlay.classList.remove('show');
    });

    dom.missionsFooter.addEventListener('click', function() {
      updateMissionOverlay();
      dom.missionsOverlay.classList.add('show');
    });
    dom.missionsClose.addEventListener('click', function() {
      dom.missionsOverlay.classList.remove('show');
    });

    dom.historyFooter.addEventListener('click', function() {
      renderHistory();
      dom.historyPanel.classList.add('show');
    });

    dom.tourFooter.addEventListener('click', function() {
      dom.tourPanel.classList.add('show');
    });

    // ESC key: pause/resume during game, close overlays in menu
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (gameState === PAUSED) { resumeGame(); return; }
        if (gameState === MENU) {
          dom.controlsOverlay.classList.remove('show');
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
  }

  function resumeGame() {
    if (gameState !== PAUSED) return;
    gameState = pausedFromState;
    pausedFromState = null;
    lastTime = 0; // reset dt so no big jump
    dom.pauseOverlay.classList.remove('show');
    renderer.domElement.requestPointerLock();
  }

  function setupInput() {
    document.addEventListener('keydown', function(e) {
      var k = e.key.toLowerCase();

      // Pause toggle
      if (k === 'p') {
        if (gameState === PAUSED) resumeGame();
        else pauseGame();
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
      if (k === '2') weapons.switchTo('pistol');
      if (k === 'r') weapons.startReload();

      // Block weapon switching in gun game (weapon is forced by level)
      if (gameState === GUNGAME_ACTIVE && (k >= '1' && k <= '6')) return;

      // Skip buy phase with F1
      if (k === 'f1' && gameState === BUY_PHASE) {
        e.preventDefault();
        phaseTimer = 0;
      }

      var isBuyPhase = (gameState === BUY_PHASE || gameState === SURVIVAL_BUY || gameState === DEATHMATCH_ACTIVE);

      if (k === 'b' && isBuyPhase) {
        buyMenuOpen = !buyMenuOpen;
        dom.buyMenu.classList.toggle('show', buyMenuOpen);
        updateBuyMenu();
      }

      if (isBuyPhase && buyMenuOpen) {
        if (k === '3') tryBuy('shotgun');
        if (k === '4') tryBuy('rifle');
        if (k === '5') tryBuy('awp');
        if (k === '6') tryBuy('grenade');
        if (k === '7') tryBuy('armor');
      } else {
        if (k === '3') weapons.switchTo('shotgun');
        if (k === '4') weapons.switchTo('rifle');
        if (k === '5') weapons.switchTo('awp');
        if (k === '6' || k === 'g') weapons.switchTo('grenade');
        if (k === 'f') weapons._toggleScope();
      }

      if (k === 'tab') {
        e.preventDefault();
        dom.scoreboard.classList.add('show');
      }
    });

    document.addEventListener('keyup', function(e) {
      if (e.key.toLowerCase() === 'tab') dom.scoreboard.classList.remove('show');
    });

    document.querySelectorAll('.buy-item').forEach(function(el) {
      el.addEventListener('click', function() {
        if (el.dataset.weapon) tryBuy(el.dataset.weapon);
        if (el.dataset.item) tryBuy(el.dataset.item);
      });
    });

    dom.restartBtn.addEventListener('click', function() {
      dom.matchEnd.classList.remove('show');
      startMatch();
    });
    dom.menuBtn.addEventListener('click', goToMenu);
    dom.pauseResumeBtn.addEventListener('click', resumeGame);
    dom.pauseMenuBtn.addEventListener('click', function() {
      resumeGame();
      goToMenu();
    });

    dom.historyClose.addEventListener('click', function() {
      dom.historyPanel.classList.remove('show');
    });

    // Tour mode
    dom.tourPanelClose.addEventListener('click', function() {
      dom.tourPanel.classList.remove('show');
    });
    dom.tourExitBtn.addEventListener('click', function() {
      goToMenu();
    });
    document.querySelectorAll('.tour-map-btn:not(.survival-map-btn)').forEach(function(btn) {
      btn.addEventListener('click', function() {
        startTour(parseInt(btn.dataset.map));
      });
    });

    dom.survivalRestartBtn.addEventListener('click', function() {
      dom.survivalEnd.classList.remove('show');
      startSurvival(survivalMapIndex);
    });
    dom.survivalMenuBtn.addEventListener('click', function() {
      dom.survivalEnd.classList.remove('show');
      goToMenu();
    });

    dom.gungameRestartBtn.addEventListener('click', function() {
      dom.gungameEnd.classList.remove('show');
      startGunGame(gungameMapIndex);
    });
    dom.gungameMenuBtn.addEventListener('click', function() {
      dom.gungameEnd.classList.remove('show');
      goToMenu();
    });
    dom.dmRestartBtn.addEventListener('click', function() {
      dom.dmEnd.classList.remove('show');
      startDeathmatch(dmMapIndex);
    });
    dom.dmMenuBtn.addEventListener('click', function() {
      dom.dmEnd.classList.remove('show');
      goToMenu();
    });
  }

  // ── Hit Feedback Helpers ──────────────────────────────────
  function showHitmarker(isHeadshot) {
    dom.hitmarker.classList.toggle('headshot', isHeadshot);
    dom.hitmarker.classList.add('show');
    hitmarkerTimer = 0.15;
    if (GAME.Sound) GAME.Sound.hitmarkerTick();
  }

  function showDamageNumber(point, damage, isHeadshot) {
    var screenPos = point.clone().project(camera);
    var x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    var y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
    // Only show if in front of camera
    if (screenPos.z > 1) return;

    var el = document.createElement('div');
    el.className = 'dmg-number ' + (isHeadshot ? 'headshot' : 'body');
    el.textContent = Math.round(damage);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    dom.dmgContainer.appendChild(el);
    setTimeout(function() { el.remove(); }, 850);
  }

  function checkKillStreak() {
    killStreak++;
    var name = null;
    if (killStreak >= 12) name = STREAK_NAMES[12];
    else if (killStreak >= 8) name = STREAK_NAMES[8];
    else if (killStreak >= 5) name = STREAK_NAMES[5];
    else if (STREAK_NAMES[killStreak]) name = STREAK_NAMES[killStreak];

    if (name) {
      dom.streakAnnounce.textContent = name;
      dom.streakAnnounce.classList.add('show');
      if (streakTimeout) clearTimeout(streakTimeout);
      streakTimeout = setTimeout(function() {
        dom.streakAnnounce.classList.remove('show');
      }, 2000);
      var tier = killStreak >= 12 ? 5 : killStreak >= 8 ? 4 : killStreak >= 5 ? 3 : killStreak - 1;
      if (GAME.Sound) GAME.Sound.killStreak(tier);
    }
    // Mission tracking for streaks
    if (killStreak === 3) trackMissionEvent('triple_kill', 1);
    if (killStreak === 5) trackMissionEvent('rampage', 1);
  }

  function triggerScreenShake(intensity) {
    shakeIntensity = intensity;
    shakeTimer = 0.15;
  }

  // ── Minimap ───────────────────────────────────────────────
  function cacheMinimapWalls(walls, mapSize) {
    minimapWallSegments = [];
    var mx = mapSize ? mapSize.x : 50;
    var mz = mapSize ? mapSize.z : 50;
    minimapScale = 160 / Math.max(mx, mz);
    minimapCenter = { x: 0, z: 0 };

    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      if (!w.geometry || !w.geometry.parameters) continue;
      var p = w.geometry.parameters;
      var pos = w.position;
      // Only take walls that are on the ground floor (or close)
      if (pos.y > 6) continue;
      var hw = (p.width || p.radiusTop * 2 || 0.5) / 2;
      var hd = (p.depth || p.radiusTop * 2 || 0.5) / 2;
      minimapWallSegments.push({
        x: pos.x - hw, z: pos.z - hd,
        w: p.width || p.radiusTop * 2 || 0.5,
        d: p.depth || p.radiusTop * 2 || 0.5
      });
    }
  }

  function updateMinimap() {
    if (!minimapCtx) return;
    minimapFrame++;
    if (minimapFrame % 3 !== 0) return;

    var ctx = minimapCtx;
    var cw = 180, ch = 180;
    var cx = cw / 2, cy = ch / 2;
    ctx.clearRect(0, 0, cw, ch);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.arc(cx, cy, 88, 0, Math.PI * 2);
    ctx.fill();

    var playerYaw = player.yaw;
    var px = player.position.x;
    var pz = player.position.z;
    var sc = minimapScale;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(playerYaw);

    // Draw walls
    ctx.fillStyle = 'rgba(150,150,150,0.4)';
    for (var i = 0; i < minimapWallSegments.length; i++) {
      var seg = minimapWallSegments[i];
      var rx = (seg.x - px) * sc;
      var rz = (seg.z - pz) * sc;
      var rw = seg.w * sc;
      var rd = seg.d * sc;
      ctx.fillRect(rx, rz, rw, rd);
    }

    // Draw enemies (red dots)
    var enemies = enemyManager.enemies;
    var now = performance.now() / 1000;
    for (var j = 0; j < enemies.length; j++) {
      var e = enemies[j];
      if (!e.alive) continue;
      // Show if enemy fired recently (within 2s) or in attack/chase state
      var recentlyFired = (now - e.lastFireTime) < 2;
      if (!recentlyFired && e.state === 0) continue; // PATROL and hasn't fired
      var ex = (e.mesh.position.x - px) * sc;
      var ez = (e.mesh.position.z - pz) * sc;
      var dist = Math.sqrt(ex * ex + ez * ez);
      if (dist > 85) continue;
      ctx.fillStyle = '#ef5350';
      ctx.beginPath();
      ctx.arc(ex, ez, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Player triangle (always centered, pointing up)
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.closePath();
    ctx.fill();
  }

  // ── Match / Round Management ─────────────────────────────
  function startMatch(startMapIdx) {
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
    roundNumber = 0;
    currentMapIndex = startMapIdx || 0;
    matchKills = 0;
    matchDeaths = 0;
    matchHeadshots = 0;
    matchRoundsWon = 0;
    killStreak = 0;
    player.money = 800;

    weapons.owned = { knife: true, pistol: true, shotgun: false, rifle: false, awp: false, grenade: false };
    weapons.grenadeCount = 0;
    weapons.current = 'pistol';
    weapons.resetAmmo();
    weapons._createWeaponModel();

    clearPerks();
    startRound();
  }

  function startRound() {
    roundNumber++;
    if (roundNumber > TOTAL_ROUNDS || playerScore >= 4 || botScore >= 4) {
      endMatch();
      return;
    }

    currentMapIndex = (roundNumber - 1) % GAME.getMapCount();
    killStreak = 0;

    scene = new THREE.Scene();
    bloodParticles.length = 0;
    for (var bi = 0; bi < bloodDecals.length; bi++) bloodDecals[bi].mat.dispose();
    bloodDecals.length = 0;
    weapons.scene = scene;
    enemyManager.scene = scene;
    scene.add(camera);

    var mapData = GAME.buildMap(scene, currentMapIndex, renderer);
    mapWalls = mapData.walls;

    player.reset(mapData.playerSpawn);
    if (hasPerk('thick_skin')) player.health = Math.min(125, player.health + 25);
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);
    weapons.resetForRound();

    var botCount = GAME.getDifficulty().botCount;
    enemyManager.spawnBots(mapData.botSpawns, mapData.waypoints, mapWalls, botCount, mapData.size, mapData.playerSpawn, roundNumber);

    spawnBirds(mapData.size ? Math.max(mapData.size.x, mapData.size.z) : 50);

    cacheMinimapWalls(mapWalls, mapData.size);

    gameState = BUY_PHASE;
    phaseTimer = BUY_PHASE_TIME;
    roundTimer = ROUND_TIME;

    updateHUD();
    showAnnouncement('ROUND ' + roundNumber, 'Map: ' + mapData.name);

    dom.roundInfo.textContent = 'Round ' + roundNumber + ' / ' + TOTAL_ROUNDS;
    dom.mapInfo.textContent = 'Map: ' + mapData.name;
  }

  function endRound(playerWon) {
    radioMenuOpen = false;
    dom.radioMenu.classList.remove('show');
    gameState = ROUND_END;
    phaseTimer = ROUND_END_TIME;
    lastRoundWon = playerWon;

    if (playerWon) {
      playerScore++;
      matchRoundsWon++;
      player.money = Math.min(16000, player.money + 3000);
      showAnnouncement('ROUND WIN', '+$3000');
      if (GAME.Sound) GAME.Sound.roundWin();
      if (GAME.Sound) GAME.Sound.announcer('Counter-terrorists win');

      // Mission tracking for round wins
      if (!weapons.owned.shotgun && !weapons.owned.rifle && !weapons.owned.awp) trackMissionEvent('pistol_win', 1);
      if (player.health >= 100) trackMissionEvent('no_damage_win', 1);
    } else {
      botScore++;
      player.money = Math.min(16000, player.money + 1400);
      showAnnouncement(player.alive ? 'TIME UP' : 'YOU DIED', '+$1400');
      if (GAME.Sound) GAME.Sound.roundLose();
      if (GAME.Sound) GAME.Sound.announcer('Terrorists win');
    }

    killStreak = 0;
    updateScoreboard();
    buyMenuOpen = false;
    dom.buyMenu.classList.remove('show');
  }

  function endMatch() {
    radioMenuOpen = false;
    dom.radioMenu.classList.remove('show');
    gameState = MATCH_END;
    dom.hud.style.display = 'none';
    if (document.pointerLockElement) document.exitPointerLock();

    var result = playerScore > botScore ? 'VICTORY' : playerScore < botScore ? 'DEFEAT' : 'DRAW';
    dom.matchResult.textContent = result;
    dom.matchResult.style.color = playerScore > botScore ? '#4caf50' : playerScore < botScore ? '#ef5350' : '#fff';
    dom.finalScore.textContent = playerScore + ' \u2014 ' + botScore;

    // Mission tracking for match end
    if (playerScore > botScore) trackMissionEvent('weekly_wins', 1);
    trackMissionEvent('money_earned', player.money - 800);

    // XP calculation
    var isWin = playerScore > botScore;
    var diffMult = DIFF_XP_MULT[selectedDifficulty] || 1;
    var xpEarned = calculateXP(matchKills, matchHeadshots, matchRoundsWon, isWin, diffMult);
    var rankResult = awardXP(xpEarned);

    // Show XP breakdown
    dom.matchXpBreakdown.innerHTML =
      '<div class="xp-line"><span>Kills (' + matchKills + ')</span><span class="xp-val">+' + (matchKills * 10) + '</span></div>' +
      '<div class="xp-line"><span>Headshots (' + matchHeadshots + ')</span><span class="xp-val">+' + (matchHeadshots * 5) + '</span></div>' +
      '<div class="xp-line"><span>Rounds Won (' + matchRoundsWon + ')</span><span class="xp-val">+' + (matchRoundsWon * 20) + '</span></div>' +
      (isWin ? '<div class="xp-line"><span>Match Win</span><span class="xp-val">+50</span></div>' : '') +
      '<div class="xp-line"><span>Difficulty (' + selectedDifficulty + ')</span><span class="xp-val">x' + diffMult + '</span></div>' +
      '<div class="xp-total">Total: +' + xpEarned + ' XP</div>' +
      (rankResult.ranked_up ? '<div style="color:#ffca28;margin-top:4px;">RANKED UP: ' + rankResult.newRank.name + '!</div>' : '');

    dom.matchEnd.classList.add('show');

    saveMatchHistory(result, xpEarned);
    updateRankDisplay();
  }

  // ── Gun Game Mode ─────────────────────────────────────────
  function startGunGame(mapIndex) {
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.remove('tour-mode');
    dom.gungameEnd.classList.remove('show');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';
    dom.waveCounter.classList.remove('show');

    gungameMapIndex = mapIndex;
    gungameLevel = 0;
    gungameKills = 0;
    gungameDeaths = 0;
    gungameHeadshots = 0;
    gungameStartTime = performance.now() / 1000;
    gungameRespawnQueue = [];
    killStreak = 0;
    player.money = 0;

    GAME.setDifficulty(selectedDifficulty);

    // Build map
    scene = new THREE.Scene();
    bloodParticles.length = 0;
    for (var bi = 0; bi < bloodDecals.length; bi++) bloodDecals[bi].mat.dispose();
    bloodDecals.length = 0;
    weapons.scene = scene;
    enemyManager.scene = scene;
    scene.add(camera);

    var mapData = GAME.buildMap(scene, gungameMapIndex, renderer);
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

    spawnBirds(mapData.size ? Math.max(mapData.size.x, mapData.size.z) : 50);
    cacheMinimapWalls(mapWalls, mapData.size);

    gameState = GUNGAME_ACTIVE;

    // HUD setup for gun game
    dom.moneyDisplay.style.display = 'none';
    dom.gungameLevel.classList.add('show');
    dom.roundInfo.textContent = 'GUN GAME';
    updateGunGameLevelHUD();

    showAnnouncement('GUN GAME', 'Get a kill with each weapon!');
    if (GAME.Sound) GAME.Sound.roundStart();
  }

  function updateGunGameLevelHUD() {
    dom.gungameLevel.textContent = 'LEVEL ' + (gungameLevel + 1) + '/6 \u2014 ' + GUNGAME_NAMES[gungameLevel];
  }

  function advanceGunGameLevel() {
    gungameLevel++;
    if (gungameLevel >= GUNGAME_WEAPONS.length) {
      endGunGame();
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
    player.setWalls(mapWalls);
    weapons.cleanupDroppedWeapon();
    weapons.forceWeapon(GUNGAME_WEAPONS[gungameLevel]);
    killStreak = 0;
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
        var newEnemy = new GAME._Enemy(
          scene, entry.spawnPos, mapData.waypoints, mapWalls, entry.id, 3
        );
        enemyManager.enemies.push(newEnemy);
      }
    }
  }

  function endGunGame() {
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
    setGunGameBest(mapName, elapsed);

    dom.gungameTimeResult.textContent = 'Time: ' + timeStr;
    dom.gungameStatsDisplay.textContent = gungameKills + ' Kills | ' + gungameDeaths + ' Deaths | ' + gungameHeadshots + ' Headshots';

    // XP calculation: (kills * 10 + headshots * 5 + (6 - deaths) * 10) * diffMult * 0.8
    var diffMult = DIFF_XP_MULT[selectedDifficulty] || 1;
    var deathBonus = Math.max(0, 6 - gungameDeaths) * 10;
    var timeBonus = elapsed < 180 ? 50 : 0;
    var rawXP = gungameKills * 10 + gungameHeadshots * 5 + deathBonus + timeBonus;
    var xpEarned = Math.round(rawXP * diffMult * 0.8);
    var rankResult = awardXP(xpEarned);

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
    updateRankDisplay();

    // Mission tracking
    trackMissionEvent('gungame_complete', 1);
    if (elapsed < 180) trackMissionEvent('gungame_fast', 1);

    showAnnouncement('GUN GAME COMPLETE', timeStr);
  }

  // ── Deathmatch Mode ─────────────────────────────────────
  function startDeathmatch(mapIndex) {
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
    bloodParticles.length = 0;
    for (var bi = 0; bi < bloodDecals.length; bi++) bloodDecals[bi].mat.dispose();
    bloodDecals.length = 0;
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

    // Spawn bots
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
    weapons._createWeaponModel();
    weapons.resetAmmo();
    killStreak = 0;
    dmSpawnProtection = 1.5;
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
    var mapNames = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var mapName = mapNames[dmMapIndex] || 'dust';
    setDMBest(mapName, dmKills);

    var kd = dmDeaths > 0 ? (dmKills / dmDeaths).toFixed(2) : dmKills.toFixed(2);
    dom.dmKillResult.textContent = dmKills + ' Kills in ' + timeStr;
    dom.dmStatsDisplay.textContent = dmDeaths + ' Deaths | K/D: ' + kd + ' | ' + dmHeadshots + ' Headshots';

    // XP
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

  function goToMenu() {
    gameState = MENU;
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
    if (document.pointerLockElement) document.exitPointerLock();
    updateRankDisplay();
    updateMissionUI();
  }

  function startTour(mapIndex) {
    dom.tourPanel.classList.remove('show');
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.add('tour-mode');
    dom.tourExitBtn.style.display = 'block';

    scene = new THREE.Scene();
    bloodParticles.length = 0;
    for (var bi = 0; bi < bloodDecals.length; bi++) bloodDecals[bi].mat.dispose();
    bloodDecals.length = 0;
    weapons.scene = scene;
    enemyManager.scene = scene;
    scene.add(camera);

    var mapData = GAME.buildMap(scene, mapIndex, renderer);
    mapWalls = mapData.walls;

    player.reset(mapData.playerSpawn);
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);

    weapons.owned = { knife: true, pistol: true, shotgun: true, rifle: true, awp: true, grenade: false };
    weapons.current = 'pistol';
    weapons.resetAmmo();
    weapons._createWeaponModel();

    spawnBirds(Math.max(mapData.size.x, mapData.size.z));


    dom.tourMapLabel.textContent = 'Tour: ' + mapData.name;
    dom.tourMapLabel.style.display = 'block';

    gameState = TOURING;
  }

  // ── Survival Mode ─────────────────────────────────────────
  function updateSurvivalBestDisplay() {
    var best = getSurvivalBest();
    var mapNames = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var parts = [];
    for (var i = 0; i < mapNames.length; i++) {
      if (best[mapNames[i]]) parts.push(mapNames[i].charAt(0).toUpperCase() + mapNames[i].slice(1) + ': Wave ' + best[mapNames[i]]);
    }
    if (dom.survivalBestDisplay) dom.survivalBestDisplay.textContent = parts.length > 0 ? 'BEST — ' + parts.join(' | ') : 'No records yet';
  }

  function startSurvival(mapIndex) {
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.remove('tour-mode');
    dom.survivalEnd.classList.remove('show');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';

    survivalMapIndex = mapIndex;
    survivalWave = 0;
    survivalKills = 0;
    survivalHeadshots = 0;
    killStreak = 0;
    player.money = 800;

    weapons.owned = { knife: true, pistol: true, shotgun: false, rifle: false, awp: false, grenade: false };
    weapons.grenadeCount = 0;
    weapons.current = 'pistol';
    weapons.resetAmmo();
    weapons._createWeaponModel();

    // Build map
    scene = new THREE.Scene();
    bloodParticles.length = 0;
    for (var bi = 0; bi < bloodDecals.length; bi++) bloodDecals[bi].mat.dispose();
    bloodDecals.length = 0;
    weapons.scene = scene;
    enemyManager.scene = scene;
    scene.add(camera);

    var mapData = GAME.buildMap(scene, survivalMapIndex, renderer);
    mapWalls = mapData.walls;
    survivalLastMapData = mapData;

    player.reset(mapData.playerSpawn);
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);

    spawnBirds(Math.max(mapData.size.x, mapData.size.z));

    cacheMinimapWalls(mapWalls, mapData.size);

    dom.waveCounter.classList.add('show');
    dom.roundInfo.textContent = '';
    startSurvivalWave();
  }

  function startSurvivalWave() {
    survivalWave++;
    killStreak = 0;

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

    // Clear old enemies and spawn new
    enemyManager.clearAll();
    var mapData = survivalLastMapData;
    enemyManager.spawnBots(mapData.botSpawns, mapData.waypoints, mapWalls, botCount, mapData.size, mapData.playerSpawn, survivalWave);

    weapons.resetForRound();
    dom.waveCounter.textContent = 'WAVE ' + survivalWave;

    gameState = SURVIVAL_WAVE;
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
    trackMissionEvent('survival_wave', survivalWave);
    trackMissionEvent('weekly_survival', survivalWave);
    var mapNames = ['survival_dust', 'survival_office', 'survival_warehouse', 'survival_bloodstrike', 'survival_italy', 'survival_aztec', 'survival_arena'];
    if (mapNames[survivalMapIndex]) trackMissionEvent(mapNames[survivalMapIndex], survivalWave);

    gameState = SURVIVAL_BUY;
    phaseTimer = 8;
    buyMenuOpen = false;
    dom.buyMenu.classList.remove('show');
  }

  function endSurvival() {
    gameState = SURVIVAL_DEAD;
    dom.hud.style.display = 'none';
    if (document.pointerLockElement) document.exitPointerLock();

    var mapNames = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var mapName = mapNames[survivalMapIndex] || 'dust';
    setSurvivalBest(mapName, survivalWave - 1);

    dom.survivalWaveResult.textContent = 'Survived ' + (survivalWave - 1) + ' Waves';
    dom.survivalStatsDisplay.textContent = survivalKills + ' Kills | ' + survivalHeadshots + ' Headshots';

    // XP for survival (0.7x multiplier)
    var xpEarned = Math.round((survivalKills * 10 + survivalHeadshots * 5 + (survivalWave - 1) * 15) * 0.7);
    var rankResult = awardXP(xpEarned);
    dom.survivalXpBreakdown.innerHTML =
      '<div class="xp-line"><span>Kills (' + survivalKills + ')</span><span class="xp-val">+' + (survivalKills * 10) + '</span></div>' +
      '<div class="xp-line"><span>Headshots (' + survivalHeadshots + ')</span><span class="xp-val">+' + (survivalHeadshots * 5) + '</span></div>' +
      '<div class="xp-line"><span>Waves (' + (survivalWave - 1) + ')</span><span class="xp-val">+' + ((survivalWave - 1) * 15) + '</span></div>' +
      '<div class="xp-line"><span>Survival multiplier</span><span class="xp-val">x0.7</span></div>' +
      '<div class="xp-total">Total: +' + xpEarned + ' XP</div>' +
      (rankResult.ranked_up ? '<div style="color:#ffca28;margin-top:4px;">RANKED UP: ' + rankResult.newRank.name + '!</div>' : '');

    dom.survivalEnd.classList.add('show');
    updateRankDisplay();

    // Clean up wave difficulty
    delete GAME.DIFFICULTIES._survivalWave;
  }

  // ── Match History ──────────────────────────────────────
  function saveMatchHistory(result, xpEarned) {
    var history = getMatchHistory();
    history.unshift({
      date: new Date().toISOString(),
      result: result,
      playerScore: playerScore,
      botScore: botScore,
      rounds: roundNumber,
      kills: matchKills,
      deaths: matchDeaths,
      headshots: matchHeadshots,
      difficulty: selectedDifficulty,
      xpEarned: xpEarned || 0
    });
    if (history.length > 50) history = history.slice(0, 50);
    localStorage.setItem('miniCS_history', JSON.stringify(history));
  }

  function getMatchHistory() {
    try {
      return JSON.parse(localStorage.getItem('miniCS_history')) || [];
    } catch(e) { return []; }
  }

  function getStats() {
    var history = getMatchHistory();
    var wins = 0, losses = 0, draws = 0, totalKills = 0, totalDeaths = 0, totalHS = 0;
    for (var i = 0; i < history.length; i++) {
      var m = history[i];
      if (m.result === 'VICTORY') wins++;
      else if (m.result === 'DEFEAT') losses++;
      else draws++;
      totalKills += m.kills || 0;
      totalDeaths += m.deaths || 0;
      totalHS += m.headshots || 0;
    }
    var hsPercent = totalKills > 0 ? Math.round((totalHS / totalKills) * 100) : 0;
    return {
      matches: history.length,
      wins: wins, losses: losses, draws: draws,
      winRate: history.length > 0 ? Math.round((wins / history.length) * 100) : 0,
      kills: totalKills, deaths: totalDeaths,
      headshots: totalHS, hsPercent: hsPercent
    };
  }

  function renderHistory() {
    var stats = getStats();
    dom.historyStats.innerHTML =
      '<div class="stat-box"><div class="stat-val">' + stats.matches + '</div><div class="stat-label">Matches</div></div>' +
      '<div class="stat-box"><div class="stat-val">' + stats.wins + '/' + stats.losses + '/' + stats.draws + '</div><div class="stat-label">W / L / D</div></div>' +
      '<div class="stat-box"><div class="stat-val">' + stats.winRate + '%</div><div class="stat-label">Win Rate</div></div>' +
      '<div class="stat-box"><div class="stat-val">' + stats.hsPercent + '%</div><div class="stat-label">HS %</div></div>';

    var history = getMatchHistory();
    if (history.length === 0) {
      dom.historyList.innerHTML = '<div class="history-empty">No matches played yet.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < history.length; i++) {
      var m = history[i];
      var cls = m.result === 'VICTORY' ? 'he-win' : m.result === 'DEFEAT' ? 'he-loss' : 'he-draw';
      var dateStr = '';
      try {
        var d = new Date(m.date);
        dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      } catch(e) {}
      html += '<div class="history-entry">' +
        '<span class="he-result ' + cls + '">' + m.result + '</span>' +
        '<span class="he-score">' + m.playerScore + ' - ' + m.botScore + '</span>' +
        '<span class="he-kd">' + (m.kills || 0) + 'K / ' + (m.deaths || 0) + 'D</span>' +
        '<span class="he-date">' + (m.difficulty ? m.difficulty.toUpperCase() + ' ' : '') + dateStr + '</span>' +
        '</div>';
    }
    dom.historyList.innerHTML = html;
  }

  // ── Buy System ───────────────────────────────────────────
  function tryBuy(item) {
    var isBuyPhase = (gameState === BUY_PHASE || gameState === SURVIVAL_BUY || gameState === DEATHMATCH_ACTIVE);
    if (!isBuyPhase) return;
    var DEFS = GAME.WEAPON_DEFS;

    var bought = false;
    if (item === 'shotgun') {
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
      if (player.armor >= 100) return;
      if (player.money < 650) return;
      player.money -= 650;
      player.armor = 100;
      bought = true;
    }
    if (bought && GAME.Sound) GAME.Sound.buy();
    updateBuyMenu();
    updateHUD();
  }

  function updateBuyMenu() {
    dom.buyBalance.textContent = 'Balance: $' + player.money;
    var DEFS = GAME.WEAPON_DEFS;

    document.querySelectorAll('.buy-item').forEach(function(el) {
      el.classList.remove('owned', 'too-expensive');
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
      if (el.dataset.item === 'armor') {
        if (player.armor >= 100) el.classList.add('owned');
        else if (player.money < 650) el.classList.add('too-expensive');
      }
    });
  }

  // ── Grenade Explosion Damage ────────────────────────────
  function processExplosions(explosions) {
    if (!explosions) return;
    for (var i = 0; i < explosions.length; i++) {
      var exp = explosions[i];
      var pos = exp.position;
      var radius = exp.radius;
      var maxDmg = exp.damage;

      triggerScreenShake(0.08);

      for (var j = 0; j < enemyManager.enemies.length; j++) {
        var enemy = enemyManager.enemies[j];
        if (!enemy.alive) continue;
        var dist = enemy.mesh.position.distanceTo(pos);
        if (dist < radius) {
          var dmgFactor = 1 - (dist / radius);
          var dmg = Math.round(maxDmg * dmgFactor);
          if (dmg > 0) {
            var killed = enemy.takeDamage(dmg);
            if (killed) {
              onEnemyKilled(enemy, false, pos);
              addKillFeed('You [HE]', 'Bot ' + (enemy.id + 1));
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
            triggerScreenShake(0.03);
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

    if (gameState === GUNGAME_ACTIVE) {
      gungameKills++;
      if (isHeadshot) gungameHeadshots++;
      checkKillStreak();
      if (GAME.Sound) GAME.Sound.kill();
      // Queue bot respawn instead of waiting for all dead
      gunGameQueueBotRespawn(enemy);
      // Remove from enemies array
      var idx = enemyManager.enemies.indexOf(enemy);
      if (idx >= 0) enemyManager.enemies.splice(idx, 1);
      // Advance weapon level
      advanceGunGameLevel();
    } else if (gameState === DEATHMATCH_ACTIVE) {
      dmKills++;
      if (isHeadshot) dmHeadshots++;
      var killBonus = hasPerk('scavenger') ? 450 : 300;
      player.money = Math.min(16000, player.money + killBonus);
      checkKillStreak();
      if (GAME.Sound) GAME.Sound.kill();
      // Queue bot respawn
      dmQueueBotRespawn(enemy);
      var idx2 = enemyManager.enemies.indexOf(enemy);
      if (idx2 >= 0) enemyManager.enemies.splice(idx2, 1);
      // Check win
      if (dmKills >= DEATHMATCH_KILL_TARGET) {
        endDeathmatch();
      }
    } else {
      var killBonus = hasPerk('scavenger') ? 450 : 300;
      player.money = Math.min(16000, player.money + killBonus);
      checkKillStreak();
      if (GAME.Sound) GAME.Sound.kill();
    }

    // Mission tracking
    trackMissionEvent('kills', 1);
    if (isHeadshot) {
      trackMissionEvent('headshots', 1);
      trackMissionEvent('weekly_headshots', 1);
    }
    if (player.crouching) trackMissionEvent('crouch_kills', 1);
    if (weapons.current === 'knife') trackMissionEvent('knife_kills', 1);
  }

  // ── Shooting hit processing ────────────────────────────
  function processShootResults(results) {
    if (!results) return;
    for (var ri = 0; ri < results.length; ri++) {
      var result = results[ri];
      if (result.type === 'enemy') {
        var killed = result.enemy.takeDamage(result.damage);
        showHitmarker(result.headshot);
        showDamageNumber(result.point, result.damage, result.headshot);
        spawnBloodBurst(result.point, result.headshot);
        if (result.headshot && GAME.Sound) GAME.Sound.headshotDink();

        if (killed) {
          onEnemyKilled(result.enemy, result.headshot, result.point);
          var hsTag = result.headshot ? ' (HEADSHOT)' : '';
          addKillFeed('You', 'Bot ' + (result.enemy.id + 1) + hsTag);
        }
      } else if (result.type === 'bird') {
        killBird(result.bird, result.point);
        player.money = Math.min(16000, player.money + BIRD_MONEY);
        addKillFeed('You', 'Bird');
        showHitmarker(false);
        if (GAME.Sound) GAME.Sound.hitMarker();
      }
    }
  }

  // ── HUD Updates ──────────────────────────────────────────
  function updateHUD() {
    dom.hpFill.style.width = player.health + '%';
    dom.hpValue.textContent = Math.ceil(player.health);
    dom.armorFill.style.width = player.armor + '%';
    dom.armorValue.textContent = Math.ceil(player.armor);

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
      dom.ammoMag.textContent = weapons.grenadeCount;
      dom.ammoReserve.textContent = '';
    } else {
      dom.ammoMag.textContent = weapons.ammo[weapons.current];
      dom.ammoReserve.textContent = weapons.reserve[weapons.current];
    }

    if (gameState !== GUNGAME_ACTIVE) {
      dom.moneyDisplay.textContent = '$' + player.money;
    }

    if (weapons.grenadeCount > 0) {
      dom.grenadeCount.textContent = 'HE x' + weapons.grenadeCount;
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

    // Dynamic crosshair
    var spread = def.spread || 0;
    if (player.crouching) spread *= 0.6;
    var gap = Math.max(3, Math.round(spread * 280 + 3));
    var len = Math.max(8, Math.round(spread * 120 + 10));
    dom.crosshair.style.setProperty('--ch-gap', gap + 'px');
    dom.crosshair.style.setProperty('--ch-len', len + 'px');

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
  }

  function addKillFeed(killer, victim) {
    var entry = document.createElement('div');
    entry.className = 'kill-entry';
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

  // ── Game Loop ────────────────────────────────────────────
  var lastTime = 0;

  function gameLoop(timestamp) {
    requestAnimationFrame(gameLoop);

    var now = timestamp / 1000;
    var dt = Math.min(lastTime ? now - lastTime : 0.016, 0.05);
    lastTime = now;

    if (gameState === MENU || gameState === MATCH_END || gameState === PAUSED || gameState === GUNGAME_END) {
      renderWithBloom();
      return;
    }
    if (gameState === SURVIVAL_DEAD) {
      if (!player.alive) {
        player.updateDeath(dt);
        weapons.updateDroppedWeapon(dt, player.walls);
      }
      renderWithBloom();
      return;
    }

    // Hitmarker fade
    if (hitmarkerTimer > 0) {
      hitmarkerTimer -= dt;
      if (hitmarkerTimer <= 0) {
        dom.hitmarker.classList.remove('show');
        dom.hitmarker.classList.remove('headshot');
      }
    }

    // Tour Mode
    if (gameState === TOURING) {
      GAME._weaponMoveMult = weapons.getMovementMult();
      GAME._scopeFovTarget = weapons.getScopeFovTarget();
      player.update(dt);
      weapons.setMoving(player.velocity.length() > 0.5);
      weapons.setStrafeDir(player.keys.a ? -1 : player.keys.d ? 1 : 0);
      updateBirds(dt);
      weapons.update(dt);
      weapons.setCrouching(player.crouching);

      if (weapons.mouseDown) {
        var results = weapons.tryFire(now, []);
        if (results) {
          for (var ti = 0; ti < results.length; ti++) {
            if (results[ti].type === 'bird') {
              killBird(results[ti].bird, results[ti].point);
              if (GAME.Sound) GAME.Sound.hitMarker();
            }
          }
        }
      }


      renderWithBloom();
      return;
    }

    // Buy Phase (match or survival)
    if (gameState === BUY_PHASE || gameState === SURVIVAL_BUY) {
      phaseTimer -= dt;
      GAME._weaponMoveMult = weapons.getMovementMult();
      GAME._scopeFovTarget = weapons.getScopeFovTarget();
      player.update(dt);
      weapons.setMoving(player.velocity.length() > 0.5);
      weapons.setStrafeDir(player.keys.a ? -1 : player.keys.d ? 1 : 0);
      updateBirds(dt);
      var buyExplosions = weapons.update(dt);
      if (buyExplosions) processExplosions(buyExplosions);
      if (phaseTimer <= 0) {
        if (gameState === SURVIVAL_BUY) {
          startSurvivalWave();
        } else {
          gameState = PLAYING;
          buyMenuOpen = false;
          dom.buyMenu.classList.remove('show');
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
      updateMinimap();
      renderWithBloom();
      return;
    }

    // Round End
    if (gameState === ROUND_END) {
      phaseTimer -= dt;
      if (!player.alive) {
        player.updateDeath(dt);
        weapons.updateDroppedWeapon(dt, player.walls);
      }
      updateBirds(dt);
      var endExplosions = weapons.update(dt);
      if (endExplosions) processExplosions(endExplosions);
      if (phaseTimer <= 0) {
        if (lastRoundWon && activePerks.length < PERK_POOL.length) {
          offerPerkChoice();
        } else {
          startRound();
        }
      }
      renderWithBloom();
      return;
    }

    // Playing / Survival Wave / Gun Game
    if (gameState === PLAYING || gameState === SURVIVAL_WAVE || gameState === GUNGAME_ACTIVE || gameState === DEATHMATCH_ACTIVE) {
      if (gameState === PLAYING) roundTimer -= dt;

      GAME._weaponMoveMult = weapons.getMovementMult();
      GAME._scopeFovTarget = weapons.getScopeFovTarget();
      player.update(dt);
      if (!player.alive) {
        player.updateDeath(dt);
        weapons.updateDroppedWeapon(dt, player.walls);
      }
      weapons.setMoving(player.velocity.length() > 0.5);
      weapons.setStrafeDir(player.keys.a ? -1 : player.keys.d ? 1 : 0);
      var explosions = weapons.update(dt);

      if (damageFlashTimer > 0) damageFlashTimer -= dt;

      // Screen shake
      if (shakeTimer > 0) {
        shakeTimer -= dt;
        var sx = (Math.random() - 0.5) * 2 * shakeIntensity;
        var sy = (Math.random() - 0.5) * 2 * shakeIntensity;
        camera.position.x += sx;
        camera.position.y += sy;
        shakeIntensity *= 0.9;
      }

      if (explosions) processExplosions(explosions);

      // Shooting
      if (weapons.mouseDown && player.alive) {
        var results = weapons.tryFire(now, enemyManager.enemies);
        if (results) {
          processShootResults(results);
          // Report sound to enemy AI — gunfire is loud
          enemyManager.reportSound(player.position, 'gunshot', 40);
        }
      }

      updateBirds(dt);

      // Enemy AI
      if (player.alive) {
        var dmg = enemyManager.update(dt, player.position, player.alive, now);
        if (dmg > 0 && !(gameState === DEATHMATCH_ACTIVE && dmSpawnProtection > 0)) {
          player.takeDamage(dmg);
          if (!player.alive) { weapons._unscope(); weapons.dropWeapon(player.position, player.yaw); }
          damageFlashTimer = 0.15;
          triggerScreenShake(0.02);
          if (GAME.Sound) GAME.Sound.playerHurt();
        }
      }

      // End conditions
      if (gameState === PLAYING) {
        if (enemyManager.allDead()) endRound(true);
        else if (!player.alive) { matchDeaths++; endRound(false); }
        else if (roundTimer <= 0) endRound(false);
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


      updateBloodParticles(dt);
      updateHUD();
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

    renderWithBloom();
  }

  // ── Start ────────────────────────────────────────────────
  init();
  requestAnimationFrame(gameLoop);
})();
