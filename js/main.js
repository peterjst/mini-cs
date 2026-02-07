// js/main.js — Game init, loop, state machine, rounds, buy system, HUD
// Uses GAME.buildMap, GAME.Player, GAME.WeaponSystem, GAME.EnemyManager, GAME.WEAPON_DEFS

(function() {
  'use strict';

  // ── Game States ──────────────────────────────────────────
  var MENU = 'MENU', BUY_PHASE = 'BUY_PHASE', PLAYING = 'PLAYING',
      ROUND_END = 'ROUND_END', MATCH_END = 'MATCH_END';

  // ── DOM refs ─────────────────────────────────────────────
  var dom = {
    menuScreen:   document.getElementById('menu-screen'),
    startBtn:     document.getElementById('start-btn'),
    hud:          document.getElementById('hud'),
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
  };

  // ── Three.js Setup ───────────────────────────────────────
  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

  // ── Pointer Lock ─────────────────────────────────────────
  renderer.domElement.addEventListener('click', function() {
    if (gameState === PLAYING || gameState === BUY_PHASE) {
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
      if (k === '3' && gameState !== BUY_PHASE) weapons.switchTo('rifle');
      if (k === 'r') weapons.startReload();

      if (k === 'b' && gameState === BUY_PHASE) {
        buyMenuOpen = !buyMenuOpen;
        dom.buyMenu.classList.toggle('show', buyMenuOpen);
        updateBuyMenu();
      }

      if (gameState === BUY_PHASE && buyMenuOpen) {
        if (k === '3') tryBuy('rifle');
        if (k === '4') tryBuy('armor');
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
  }

  // ── Match / Round Management ─────────────────────────────
  function startMatch() {
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.matchEnd.classList.remove('show');

    playerScore = 0;
    botScore = 0;
    roundNumber = 0;
    currentMapIndex = 0;
    player.money = 800;

    weapons.owned = { knife: true, pistol: true, rifle: false };
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

    dom.matchResult.textContent = playerScore > botScore ? 'VICTORY' : playerScore < botScore ? 'DEFEAT' : 'DRAW';
    dom.matchResult.style.color = playerScore > botScore ? '#4caf50' : playerScore < botScore ? '#ef5350' : '#fff';
    dom.finalScore.textContent = playerScore + ' \u2014 ' + botScore;
    dom.matchEnd.classList.add('show');
  }

  // ── Buy System ───────────────────────────────────────────
  function tryBuy(item) {
    if (gameState !== BUY_PHASE) return;
    var DEFS = GAME.WEAPON_DEFS;

    var bought = false;
    if (item === 'rifle') {
      if (weapons.owned.rifle) return;
      if (player.money < DEFS.rifle.price) return;
      player.money -= DEFS.rifle.price;
      weapons.giveWeapon('rifle');
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
      if (el.dataset.weapon === 'rifle') {
        if (weapons.owned.rifle) el.classList.add('owned');
        else if (player.money < DEFS.rifle.price) el.classList.add('too-expensive');
      }
      if (el.dataset.item === 'armor') {
        if (player.armor >= 100) el.classList.add('owned');
        else if (player.money < 650) el.classList.add('too-expensive');
      }
    });
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
    } else {
      dom.ammoMag.textContent = weapons.ammo[weapons.current];
      dom.ammoReserve.textContent = weapons.reserve[weapons.current];
    }

    dom.moneyDisplay.textContent = '$' + player.money;

    var t = gameState === BUY_PHASE ? phaseTimer : roundTimer;
    var mins = Math.floor(t / 60);
    var secs = Math.floor(t % 60);
    dom.roundTimer.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
    dom.roundTimer.style.color = t <= 10 ? '#ef5350' : '#fff';
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

    // Buy Phase
    if (gameState === BUY_PHASE) {
      phaseTimer -= dt;
      player.update(dt);
      weapons.update(dt);
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
      if (phaseTimer <= 0) startRound();
      renderer.render(scene, camera);
      return;
    }

    // Playing
    if (gameState === PLAYING) {
      roundTimer -= dt;

      player.update(dt);
      weapons.update(dt);

      if (damageFlashTimer > 0) damageFlashTimer -= dt;

      // Shooting
      if (weapons.mouseDown && player.alive) {
        var result = weapons.tryFire(now, enemyManager.enemies);
        if (result && result.type === 'enemy') {
          var killed = result.enemy.takeDamage(result.damage);
          if (killed) {
            player.money = Math.min(16000, player.money + 300);
            addKillFeed('You', 'Bot ' + (result.enemy.id + 1));
            if (GAME.Sound) GAME.Sound.kill();
          } else {
            if (GAME.Sound) GAME.Sound.hitMarker();
          }
        }
      }

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
      else if (!player.alive) endRound(false);
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
