// js/main.js — Game init, loop, state machine, rounds, buy system, HUD
// Uses GAME.buildMap, GAME.Player, GAME.WeaponSystem, GAME.EnemyManager, GAME.WEAPON_DEFS

(function() {
  'use strict';

  // ── Game States ──────────────────────────────────────────
  var MENU = 'MENU', BUY_PHASE = 'BUY_PHASE', PLAYING = 'PLAYING',
      ROUND_END = 'ROUND_END', MATCH_END = 'MATCH_END', TOURING = 'TOURING';

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
  });

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
  var matchKills = 0, matchDeaths = 0;

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

    // Body — small elongated ellipsoid
    var body = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 6),
      _birdBodyMat
    );
    body.scale.set(1, 0.8, 1.8);
    group.add(body);

    // Head
    var head = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 6, 5),
      _birdBodyMat
    );
    head.position.set(0, 0.08, -0.32);
    group.add(head);

    // Beak
    var beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.12, 4),
      _birdBeakMat
    );
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(0, 0.04, -0.48);
    group.add(beak);

    // Tail feathers
    var tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.02, 0.18),
      _birdWingMat
    );
    tail.position.set(0, 0.04, 0.3);
    tail.rotation.x = 0.2;
    group.add(tail);

    // Wing pivots (so wings flap from the shoulder)
    var leftPivot = new THREE.Group();
    leftPivot.position.set(0.18, 0.05, 0);
    var leftWing = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.02, 0.22),
      _birdWingMat
    );
    leftWing.position.set(0.22, 0, 0);
    leftPivot.add(leftWing);
    group.add(leftPivot);

    var rightPivot = new THREE.Group();
    rightPivot.position.set(-0.18, 0.05, 0);
    var rightWing = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.02, 0.22),
      _birdWingMat
    );
    rightWing.position.set(-0.22, 0, 0);
    rightPivot.add(rightWing);
    group.add(rightPivot);

    // Flight parameters
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
      id: _birdId++,
      mesh: group,
      alive: true,
      leftPivot: leftPivot,
      rightPivot: rightPivot,
      cx: cx, cz: cz,
      radius: radius,
      height: height,
      speed: speed,
      angle: angle,
      flapSpeed: flapSpeed,
      flapPhase: Math.random() * Math.PI * 2,
      respawnTimer: 0,
    };
  }

  function spawnBirds(mapSize) {
    birds = [];
    _birdId = 0;
    _birdMapSize = mapSize;
    for (var i = 0; i < BIRD_COUNT; i++) {
      birds.push(createBird(mapSize));
    }
    weapons.setBirdsRef(birds);
  }

  function updateBirds(dt) {
    for (var i = 0; i < birds.length; i++) {
      var b = birds[i];

      if (!b.alive) {
        // Respawn timer
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
          b.mesh.position.set(
            b.cx + Math.cos(b.angle) * b.radius,
            b.height,
            b.cz + Math.sin(b.angle) * b.radius
          );
          scene.add(b.mesh);
        }
        continue;
      }

      // Circular flight
      b.angle += b.speed * dt;
      var x = b.cx + Math.cos(b.angle) * b.radius;
      var z = b.cz + Math.sin(b.angle) * b.radius;
      var y = b.height + Math.sin(b.angle * 2) * 0.5;
      b.mesh.position.set(x, y, z);

      // Face flight direction (tangent to circle)
      b.mesh.rotation.y = -b.angle + Math.PI / 2;

      // Gentle banking
      b.mesh.rotation.z = Math.sin(b.angle) * 0.15;

      // Wing flapping
      b.flapPhase += b.flapSpeed * dt;
      var flap = Math.sin(b.flapPhase) * 0.6;
      b.leftPivot.rotation.z = flap;
      b.rightPivot.rotation.z = -flap;
    }
  }

  function killBird(bird, hitPoint) {
    bird.alive = false;
    bird.respawnTimer = 15 + Math.random() * 10;

    // Feather burst particles
    for (var i = 0; i < 6; i++) {
      var feather = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.01, 0.1),
        _birdWingMat
      );
      feather.position.copy(hitPoint);
      var vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3,
        (Math.random() - 0.5) * 4
      );
      scene.add(feather);
      (function(f, v) {
        var life = 0;
        var iv = setInterval(function() {
          life += 0.016;
          v.y -= 9.8 * 0.016;
          f.position.add(v.clone().multiplyScalar(0.016));
          f.rotation.x += 5 * 0.016;
          f.rotation.z += 3 * 0.016;
          if (life > 1.5) {
            clearInterval(iv);
            if (f.parent) f.parent.remove(f);
          }
        }, 16);
      })(feather, vel);
    }

    bird.mesh.visible = false;
  }

  // ── Pointer Lock ─────────────────────────────────────────
  renderer.domElement.addEventListener('click', function() {
    if (gameState === PLAYING || gameState === BUY_PHASE || gameState === TOURING) {
      if (!document.pointerLockElement) {
        renderer.domElement.requestPointerLock();
      }
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
    setupInput();
  }

  function setupInput() {
    document.addEventListener('keydown', function(e) {
      var k = e.key.toLowerCase();

      if (k === '1') weapons.switchTo('knife');
      if (k === '2') weapons.switchTo('pistol');
      if (k === 'r') weapons.startReload();

      if (k === 'b' && gameState === BUY_PHASE) {
        buyMenuOpen = !buyMenuOpen;
        dom.buyMenu.classList.toggle('show', buyMenuOpen);
        updateBuyMenu();
      }

      // Buy menu open: keys 3-6 buy items
      if (gameState === BUY_PHASE && buyMenuOpen) {
        if (k === '3') tryBuy('shotgun');
        if (k === '4') tryBuy('rifle');
        if (k === '5') tryBuy('grenade');
        if (k === '6') tryBuy('armor');
      } else {
        // Buy menu closed (or not buy phase): keys 3-5 switch weapons
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
    document.querySelectorAll('.tour-map-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        startTour(parseInt(btn.dataset.map));
      });
    });
  }

  // ── Match / Round Management ─────────────────────────────
  function startMatch() {
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.remove('tour-mode');
    dom.matchEnd.classList.remove('show');
    dom.historyPanel.classList.remove('show');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';

    playerScore = 0;
    botScore = 0;
    roundNumber = 0;
    currentMapIndex = 0;
    matchKills = 0;
    matchDeaths = 0;
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

    // Rebuild scene
    scene = new THREE.Scene();
    weapons.scene = scene;
    enemyManager.scene = scene;
    scene.add(camera);

    var mapData = GAME.buildMap(scene, currentMapIndex);
    mapWalls = mapData.walls;

    player.reset(mapData.playerSpawn);
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);
    weapons.resetForRound();

    enemyManager.spawnBots(mapData.botSpawns, mapData.waypoints, mapWalls);

    spawnBirds(mapData.size ? Math.max(mapData.size.x, mapData.size.z) : 50);

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
      player.money = Math.min(16000, player.money + 3000);
      showAnnouncement('ROUND WIN', '+$3000');
      if (GAME.Sound) GAME.Sound.roundWin();
    } else {
      botScore++;
      player.money = Math.min(16000, player.money + 1400);
      showAnnouncement(player.alive ? 'TIME UP' : 'YOU DIED', '+$1400');
      if (GAME.Sound) GAME.Sound.roundLose();
    }

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
    dom.matchEnd.classList.add('show');

    saveMatchHistory(result);
  }

  function goToMenu() {
    gameState = MENU;
    dom.matchEnd.classList.remove('show');
    dom.hud.style.display = 'none';
    dom.hud.classList.remove('tour-mode');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';
    dom.menuScreen.classList.remove('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  function startTour(mapIndex) {
    dom.tourPanel.classList.remove('show');
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.add('tour-mode');
    dom.tourExitBtn.style.display = 'block';

    // Build scene with selected map
    scene = new THREE.Scene();
    weapons.scene = scene;
    enemyManager.scene = scene;
    scene.add(camera);

    var mapData = GAME.buildMap(scene, mapIndex);
    mapWalls = mapData.walls;

    player.reset(mapData.playerSpawn);
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);

    // Give all weapons for touring
    weapons.owned = { knife: true, pistol: true, shotgun: true, rifle: true, grenade: false };
    weapons.current = 'pistol';
    weapons.resetAmmo();
    weapons._createWeaponModel();

    spawnBirds(Math.max(mapData.size.x, mapData.size.z));

    // Show map name
    dom.tourMapLabel.textContent = 'Tour: ' + mapData.name;
    dom.tourMapLabel.style.display = 'block';

    gameState = TOURING;
  }

  // ── Match History ──────────────────────────────────────
  function saveMatchHistory(result) {
    var history = getMatchHistory();
    history.unshift({
      date: new Date().toISOString(),
      result: result,
      playerScore: playerScore,
      botScore: botScore,
      rounds: roundNumber,
      kills: matchKills,
      deaths: matchDeaths
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
    var wins = 0, losses = 0, draws = 0, totalKills = 0, totalDeaths = 0;
    for (var i = 0; i < history.length; i++) {
      var m = history[i];
      if (m.result === 'VICTORY') wins++;
      else if (m.result === 'DEFEAT') losses++;
      else draws++;
      totalKills += m.kills || 0;
      totalDeaths += m.deaths || 0;
    }
    return {
      matches: history.length,
      wins: wins, losses: losses, draws: draws,
      winRate: history.length > 0 ? Math.round((wins / history.length) * 100) : 0,
      kills: totalKills, deaths: totalDeaths
    };
  }

  function renderHistory() {
    var stats = getStats();
    dom.historyStats.innerHTML =
      '<div class="stat-box"><div class="stat-val">' + stats.matches + '</div><div class="stat-label">Matches</div></div>' +
      '<div class="stat-box"><div class="stat-val">' + stats.wins + '/' + stats.losses + '/' + stats.draws + '</div><div class="stat-label">W / L / D</div></div>' +
      '<div class="stat-box"><div class="stat-val">' + stats.winRate + '%</div><div class="stat-label">Win Rate</div></div>' +
      '<div class="stat-box"><div class="stat-val">' + stats.kills + '/' + stats.deaths + '</div><div class="stat-label">K / D</div></div>';

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
        '<span class="he-date">' + dateStr + '</span>' +
        '</div>';
    }
    dom.historyList.innerHTML = html;
  }

  // ── Buy System ───────────────────────────────────────────
  function tryBuy(item) {
    if (gameState !== BUY_PHASE) return;
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

      // Damage enemies in blast radius
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
              matchKills++;
              player.money = Math.min(16000, player.money + 300);
              addKillFeed('You [HE]', 'Bot ' + (enemy.id + 1));
              if (GAME.Sound) GAME.Sound.kill();
            }
          }
        }
      }

      // Damage player if in blast radius
      if (player.alive) {
        var playerDist = player.position.distanceTo(pos);
        if (playerDist < radius) {
          var playerDmgFactor = 1 - (playerDist / radius);
          var playerDmg = Math.round(maxDmg * 0.6 * playerDmgFactor); // reduced self-damage
          if (playerDmg > 0) {
            player.takeDamage(playerDmg);
            damageFlashTimer = 0.2;
            if (GAME.Sound) GAME.Sound.playerHurt();
          }
        }
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

    // Grenade counter
    if (weapons.grenadeCount > 0) {
      dom.grenadeCount.textContent = 'HE x' + weapons.grenadeCount;
      dom.grenadeCount.classList.add('show');
    } else {
      dom.grenadeCount.classList.remove('show');
    }

    var t = gameState === BUY_PHASE ? phaseTimer : roundTimer;
    var mins = Math.floor(t / 60);
    var secs = Math.floor(t % 60);
    dom.roundTimer.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
    dom.roundTimer.style.color = t <= 10 ? '#ef5350' : '#fff';

    // Dynamic crosshair — gap reflects weapon spread
    var spread = def.spread || 0;
    var gap = Math.max(3, Math.round(spread * 280 + 3));
    var len = Math.max(8, Math.round(spread * 120 + 10));
    dom.crosshair.style.setProperty('--ch-gap', gap + 'px');
    dom.crosshair.style.setProperty('--ch-len', len + 'px');
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

    if (gameState === MENU || gameState === MATCH_END) {
      renderer.render(scene, camera);
      return;
    }

    // Tour Mode — free exploration, no enemies, no damage
    if (gameState === TOURING) {
      player.update(dt);
      updateBirds(dt);
      weapons.update(dt);

      // Allow shooting (birds, testing weapons) but no damage tracking
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

      renderer.render(scene, camera);
      return;
    }

    // Buy Phase
    if (gameState === BUY_PHASE) {
      phaseTimer -= dt;
      player.update(dt);
      updateBirds(dt);
      var buyExplosions = weapons.update(dt);
      if (buyExplosions) processExplosions(buyExplosions);
      if (phaseTimer <= 0) {
        gameState = PLAYING;
        buyMenuOpen = false;
        dom.buyMenu.classList.remove('show');
        showAnnouncement('GO!');
        if (GAME.Sound) GAME.Sound.roundStart();
      }
      updateHUD();
      renderer.render(scene, camera);
      return;
    }

    // Round End
    if (gameState === ROUND_END) {
      phaseTimer -= dt;
      updateBirds(dt);
      var endExplosions = weapons.update(dt);
      if (endExplosions) processExplosions(endExplosions);
      if (phaseTimer <= 0) startRound();
      renderer.render(scene, camera);
      return;
    }

    // Playing
    if (gameState === PLAYING) {
      roundTimer -= dt;

      player.update(dt);
      var explosions = weapons.update(dt);

      if (damageFlashTimer > 0) damageFlashTimer -= dt;

      // Process grenade explosions
      if (explosions) processExplosions(explosions);

      // Shooting
      if (weapons.mouseDown && player.alive) {
        var results = weapons.tryFire(now, enemyManager.enemies);
        if (results) {
          for (var ri = 0; ri < results.length; ri++) {
            var result = results[ri];
            if (result.type === 'enemy') {
              var killed = result.enemy.takeDamage(result.damage);
              if (killed) {
                matchKills++;
                player.money = Math.min(16000, player.money + 300);
                addKillFeed('You', 'Bot ' + (result.enemy.id + 1));
                if (GAME.Sound) GAME.Sound.kill();
              } else {
                if (GAME.Sound) GAME.Sound.hitMarker();
              }
            } else if (result.type === 'bird') {
              killBird(result.bird, result.point);
              player.money = Math.min(16000, player.money + BIRD_MONEY);
              addKillFeed('You', 'Bird');
              if (GAME.Sound) GAME.Sound.hitMarker();
            }
          }
        }
      }

      // Update birds
      updateBirds(dt);

      // Enemy AI
      if (player.alive) {
        var dmg = enemyManager.update(dt, player.position, player.alive, now);
        if (dmg > 0) {
          player.takeDamage(dmg);
          damageFlashTimer = 0.15;
          if (GAME.Sound) GAME.Sound.playerHurt();
        }
      }

      // Round end conditions
      if (enemyManager.allDead()) endRound(true);
      else if (!player.alive) { matchDeaths++; endRound(false); }
      else if (roundTimer <= 0) endRound(false);

      updateHUD();

      // Damage flash
      dom.damageFlash.style.opacity = damageFlashTimer > 0 ? Math.min(1, damageFlashTimer / 0.1) : 0;
    }

    renderer.render(scene, camera);
  }

  // ── Start ────────────────────────────────────────────────
  init();
  requestAnimationFrame(gameLoop);
})();
