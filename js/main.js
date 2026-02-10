// js/main.js — Game init, loop, state machine, rounds, buy system, HUD
// Uses GAME.buildMap, GAME.Player, GAME.WeaponSystem, GAME.EnemyManager, GAME.WEAPON_DEFS

(function() {
  'use strict';

  // ── Game States ──────────────────────────────────────────
  var MENU = 'MENU', BUY_PHASE = 'BUY_PHASE', PLAYING = 'PLAYING',
      ROUND_END = 'ROUND_END', MATCH_END = 'MATCH_END', TOURING = 'TOURING',
      SURVIVAL_BUY = 'SURVIVAL_BUY', SURVIVAL_WAVE = 'SURVIVAL_WAVE', SURVIVAL_DEAD = 'SURVIVAL_DEAD',
      PAUSED = 'PAUSED';

  // ── DOM refs ─────────────────────────────────────────────
  var dom = {
    menuScreen:   document.getElementById('menu-screen'),
    startBtn:     document.getElementById('start-btn'),
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
    historyBtn:   document.getElementById('history-btn'),
    historyPanel: document.getElementById('history-panel'),
    historyStats: document.getElementById('history-stats'),
    historyList:  document.getElementById('history-list'),
    historyClose: document.getElementById('history-close'),
    tourBtn:      document.getElementById('tour-btn'),
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
    survivalBtn:  document.getElementById('survival-btn'),
    survivalPanel: document.getElementById('survival-panel'),
    survivalPanelClose: document.getElementById('survival-panel-close'),
    survivalBestDisplay: document.getElementById('survival-best-display'),
    survivalEnd:  document.getElementById('survival-end'),
    survivalWaveResult: document.getElementById('survival-wave-result'),
    survivalStatsDisplay: document.getElementById('survival-stats-display'),
    survivalXpBreakdown: document.getElementById('survival-xp-breakdown'),
    survivalRestartBtn: document.getElementById('survival-restart-btn'),
    survivalMenuBtn: document.getElementById('survival-menu-btn'),
    pauseOverlay: document.getElementById('pause-overlay'),
    pauseResumeBtn: document.getElementById('pause-resume-btn'),
    lowHealthPulse: document.getElementById('low-health-pulse'),
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



  // ── Blood Particles ────────────────────────────────────
  var _bloodGeo = null;
  var _bloodMat = null;
  var bloodParticles = [];

  function spawnBloodBurst(point, headshot) {
    if (!_bloodGeo) {
      _bloodGeo = new THREE.BoxGeometry(0.03, 0.03, 0.03);
      _bloodMat = new THREE.MeshBasicMaterial({ color: 0xcc0000 });
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
      bloodParticles.push({ mesh: p, vel: new THREE.Vector3(vx, vy, vz), life: 0 });
    }
  }

  function updateBloodParticles(dt) {
    for (var i = bloodParticles.length - 1; i >= 0; i--) {
      var bp = bloodParticles[i];
      bp.life += dt;
      bp.vel.y -= 12 * dt;
      bp.mesh.position.add(bp.vel.clone().multiplyScalar(dt));
      if (bp.life > 0.5) {
        scene.remove(bp.mesh);
        bloodParticles.splice(i, 1);
      }
    }
  }

  // ── Birds ──────────────────────────────────────────────
  var birds = [];
  var BIRD_COUNT = 5;
  var BIRD_MONEY = 200;
  var _birdId = 0;
  var _birdMapSize = 50;
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
    for (var i = 0; i < 6; i++) {
      var feather = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.1), _birdWingMat);
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
        gameState === SURVIVAL_BUY || gameState === SURVIVAL_WAVE) {
      if (!document.pointerLockElement) renderer.domElement.requestPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', function() {
    if (!document.pointerLockElement && buyMenuOpen) {
      buyMenuOpen = false;
      dom.buyMenu.classList.remove('show');
    }
  });

  // ── Initialize ───────────────────────────────────────────
  function init() {
    player = new GAME.Player(camera);
    scene.add(camera);
    weapons = new GAME.WeaponSystem(camera, scene);
    enemyManager = new GAME.EnemyManager(scene);
    if (GAME.Sound) GAME.Sound.init();

    // Apply saved difficulty
    GAME.setDifficulty(selectedDifficulty);
    initDifficultyUI();
    updateRankDisplay();
    setupInput();
  }

  function initDifficultyUI() {
    var btns = document.querySelectorAll('.diff-btn');
    btns.forEach(function(btn) {
      btn.classList.toggle('selected', btn.dataset.diff === selectedDifficulty);
      btn.addEventListener('click', function() {
        selectedDifficulty = btn.dataset.diff;
        GAME.setDifficulty(selectedDifficulty);
        localStorage.setItem('miniCS_difficulty', selectedDifficulty);
        btns.forEach(function(b) { b.classList.toggle('selected', b.dataset.diff === selectedDifficulty); });
      });
    });
  }

  // ── Pause ──────────────────────────────────────────────
  function pauseGame() {
    if (gameState === PAUSED) return;
    var pausable = (gameState === PLAYING || gameState === BUY_PHASE ||
                    gameState === ROUND_END || gameState === TOURING ||
                    gameState === SURVIVAL_BUY || gameState === SURVIVAL_WAVE);
    if (!pausable) return;
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

      if (k === '1') weapons.switchTo('knife');
      if (k === '2') weapons.switchTo('pistol');
      if (k === 'r') weapons.startReload();

      var isBuyPhase = (gameState === BUY_PHASE || gameState === SURVIVAL_BUY);

      if (k === 'b' && isBuyPhase) {
        buyMenuOpen = !buyMenuOpen;
        dom.buyMenu.classList.toggle('show', buyMenuOpen);
        updateBuyMenu();
      }

      if (isBuyPhase && buyMenuOpen) {
        if (k === '3') tryBuy('shotgun');
        if (k === '4') tryBuy('rifle');
        if (k === '5') tryBuy('grenade');
        if (k === '6') tryBuy('armor');
      } else {
        if (k === '3') weapons.switchTo('shotgun');
        if (k === '4') weapons.switchTo('rifle');
        if (k === '5' || k === 'g') weapons.switchTo('grenade');
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

    dom.startBtn.addEventListener('click', startMatch);
    dom.restartBtn.addEventListener('click', function() {
      dom.matchEnd.classList.remove('show');
      startMatch();
    });
    dom.menuBtn.addEventListener('click', goToMenu);
    dom.pauseResumeBtn.addEventListener('click', resumeGame);

    // History panel
    dom.historyBtn.addEventListener('click', function() {
      renderHistory();
      dom.historyPanel.classList.add('show');
    });
    dom.historyClose.addEventListener('click', function() {
      dom.historyPanel.classList.remove('show');
    });

    // Tour mode
    dom.tourBtn.addEventListener('click', function() {
      dom.tourPanel.classList.add('show');
    });
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

    // Survival mode
    dom.survivalBtn.addEventListener('click', function() {
      updateSurvivalBestDisplay();
      dom.survivalPanel.classList.add('show');
    });
    dom.survivalPanelClose.addEventListener('click', function() {
      dom.survivalPanel.classList.remove('show');
    });
    document.querySelectorAll('.survival-map-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        startSurvival(parseInt(btn.dataset.map));
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
  function startMatch() {
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.remove('tour-mode');
    dom.matchEnd.classList.remove('show');
    dom.historyPanel.classList.remove('show');
    dom.survivalPanel.classList.remove('show');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';
    dom.waveCounter.classList.remove('show');

    GAME.setDifficulty(selectedDifficulty);

    playerScore = 0;
    botScore = 0;
    roundNumber = 0;
    currentMapIndex = 0;
    matchKills = 0;
    matchDeaths = 0;
    matchHeadshots = 0;
    matchRoundsWon = 0;
    killStreak = 0;
    player.money = 800;

    weapons.owned = { knife: true, pistol: true, shotgun: false, rifle: false, grenade: false };
    weapons.grenadeCount = 0;
    weapons.current = 'pistol';
    weapons.resetAmmo();
    weapons._createWeaponModel();

    startRound();
  }

  function startRound() {
    roundNumber++;
    if (roundNumber > TOTAL_ROUNDS || playerScore >= 4 || botScore >= 4) {
      endMatch();
      return;
    }

    currentMapIndex = (roundNumber - 1) % 3;
    killStreak = 0;

    scene = new THREE.Scene();
    weapons.scene = scene;
    enemyManager.scene = scene;
    scene.add(camera);

    var mapData = GAME.buildMap(scene, currentMapIndex, renderer);
    mapWalls = mapData.walls;

    player.reset(mapData.playerSpawn);
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);
    weapons.resetForRound();

    var botCount = GAME.getDifficulty().botCount;
    enemyManager.spawnBots(mapData.botSpawns, mapData.waypoints, mapWalls, botCount, mapData.size, mapData.playerSpawn);

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
    gameState = ROUND_END;
    phaseTimer = ROUND_END_TIME;

    if (playerWon) {
      playerScore++;
      matchRoundsWon++;
      player.money = Math.min(16000, player.money + 3000);
      showAnnouncement('ROUND WIN', '+$3000');
      if (GAME.Sound) GAME.Sound.roundWin();
    } else {
      botScore++;
      player.money = Math.min(16000, player.money + 1400);
      showAnnouncement(player.alive ? 'TIME UP' : 'YOU DIED', '+$1400');
      if (GAME.Sound) GAME.Sound.roundLose();
    }

    killStreak = 0;
    updateScoreboard();
    buyMenuOpen = false;
    dom.buyMenu.classList.remove('show');
  }

  function endMatch() {
    gameState = MATCH_END;
    dom.hud.style.display = 'none';
    if (document.pointerLockElement) document.exitPointerLock();

    var result = playerScore > botScore ? 'VICTORY' : playerScore < botScore ? 'DEFEAT' : 'DRAW';
    dom.matchResult.textContent = result;
    dom.matchResult.style.color = playerScore > botScore ? '#4caf50' : playerScore < botScore ? '#ef5350' : '#fff';
    dom.finalScore.textContent = playerScore + ' \u2014 ' + botScore;

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

  function goToMenu() {
    gameState = MENU;
    dom.matchEnd.classList.remove('show');
    dom.survivalEnd.classList.remove('show');
    dom.hud.style.display = 'none';
    dom.hud.classList.remove('tour-mode');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';
    dom.waveCounter.classList.remove('show');
    dom.menuScreen.classList.remove('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
    updateRankDisplay();
  }

  function startTour(mapIndex) {
    dom.tourPanel.classList.remove('show');
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.add('tour-mode');
    dom.tourExitBtn.style.display = 'block';

    scene = new THREE.Scene();
    weapons.scene = scene;
    enemyManager.scene = scene;
    scene.add(camera);

    var mapData = GAME.buildMap(scene, mapIndex, renderer);
    mapWalls = mapData.walls;

    player.reset(mapData.playerSpawn);
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);

    weapons.owned = { knife: true, pistol: true, shotgun: true, rifle: true, grenade: false };
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
    var mapNames = ['dust', 'office', 'warehouse'];
    var parts = [];
    for (var i = 0; i < mapNames.length; i++) {
      if (best[mapNames[i]]) parts.push(mapNames[i].charAt(0).toUpperCase() + mapNames[i].slice(1) + ': Wave ' + best[mapNames[i]]);
    }
    dom.survivalBestDisplay.textContent = parts.length > 0 ? 'BEST — ' + parts.join(' | ') : 'No records yet';
  }

  function startSurvival(mapIndex) {
    dom.survivalPanel.classList.remove('show');
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

    weapons.owned = { knife: true, pistol: true, shotgun: false, rifle: false, grenade: false };
    weapons.grenadeCount = 0;
    weapons.current = 'pistol';
    weapons.resetAmmo();
    weapons._createWeaponModel();

    // Build map
    scene = new THREE.Scene();
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
    enemyManager.spawnBots(mapData.botSpawns, mapData.waypoints, mapWalls, botCount, mapData.size, mapData.playerSpawn);

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

    gameState = SURVIVAL_BUY;
    phaseTimer = 8;
    buyMenuOpen = false;
    dom.buyMenu.classList.remove('show');
  }

  function endSurvival() {
    gameState = SURVIVAL_DEAD;
    dom.hud.style.display = 'none';
    if (document.pointerLockElement) document.exitPointerLock();

    var mapNames = ['dust', 'office', 'warehouse'];
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
    var isBuyPhase = (gameState === BUY_PHASE || gameState === SURVIVAL_BUY);
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
    player.money = Math.min(16000, player.money + 300);
    checkKillStreak();
    if (GAME.Sound) GAME.Sound.kill();
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
    dom.weaponName.textContent = def.name + (weapons.reloading ? ' (Reloading...)' : '');

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

    dom.moneyDisplay.textContent = '$' + player.money;

    if (weapons.grenadeCount > 0) {
      dom.grenadeCount.textContent = 'HE x' + weapons.grenadeCount;
      dom.grenadeCount.classList.add('show');
    } else {
      dom.grenadeCount.classList.remove('show');
    }

    // Timer
    if (gameState === SURVIVAL_WAVE || gameState === SURVIVAL_BUY) {
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

    if (gameState === MENU || gameState === MATCH_END || gameState === SURVIVAL_DEAD || gameState === PAUSED) {
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
      updateBirds(dt);
      var endExplosions = weapons.update(dt);
      if (endExplosions) processExplosions(endExplosions);
      if (phaseTimer <= 0) startRound();
      renderWithBloom();
      return;
    }

    // Playing / Survival Wave
    if (gameState === PLAYING || gameState === SURVIVAL_WAVE) {
      if (gameState === PLAYING) roundTimer -= dt;

      player.update(dt);
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
        if (results) processShootResults(results);
      }

      updateBirds(dt);

      // Enemy AI
      if (player.alive) {
        var dmg = enemyManager.update(dt, player.position, player.alive, now);
        if (dmg > 0) {
          player.takeDamage(dmg);
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
      }


      updateBloodParticles(dt);
      updateHUD();
      updateMinimap();

      dom.damageFlash.style.opacity = damageFlashTimer > 0 ? Math.min(1, damageFlashTimer / 0.1) : 0;
    }

    renderWithBloom();
  }

  // ── Start ────────────────────────────────────────────────
  init();
  requestAnimationFrame(gameLoop);
})();
