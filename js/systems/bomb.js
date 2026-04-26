// js/systems/bomb.js — Bomb defusal system extracted from main.js
//
// Owns timer state, defuse-progress tracking, and bomb HUD rendering.
// Invariants:
//   - Plant timer counts down regardless of planter survival; once
//     planted, the bomb is the round's win condition for the planter's
//     team and only defuse can stop it.
//   - Defuse progress is interrupted when the defuser stops holding USE;
//     partial progress survives only the current uninterrupted hold.
//   - HUD is owned here. Modes do not draw bomb UI directly.
// API exposed on GAME.bomb. See docs/architecture.md for cross-system
// contracts and docs/gotchas.md for state-reset rules.

(function() {
  'use strict';

  // ── Bomb Defusal State ────────────────────────────────
  var bombPlanted = false;
  var bombTimer = 0;
  var BOMB_FUSE_TIME = 40;
  var BOMB_PLANT_TIME = 3;
  var BOMB_DEFUSE_TIME = 5;
  var bombPlantProgress = 0;
  var bombDefuseProgress = 0;
  var bombCarrierBot = null;
  var playerHasBomb = false;
  var bombMesh = null;
  var bombPlantedPos = null;
  var bombSites = [];
  var bombTickTimer = 0;
  var droppedBombMesh = null;
  var droppedBombPos = null;

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
    if (!GAME._teamMode || GAME._teamObjective !== 'bomb' || GAME._getGameState() !== GAME._STATES.PLAYING) return;

    var player = GAME.player;
    var scene = GAME.scene;
    var dom = GAME.dom;
    var ppos = player.position;

    // Handle dropped bomb pickup (T-side player walks over it)
    if (droppedBombPos && GAME._playerTeam === 't' && player.alive && !playerHasBomb) {
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
      if (GAME._playerTeam === 't' && playerHasBomb && player.alive) {
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
              if (GAME._playerTeam === 't') player.money = Math.min(16000, player.money + 800);
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
      if (GAME._playerTeam === 'ct' && player.alive && bombPlantedPos) {
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
              GAME._endRound(true); // CT wins
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
        GAME._endRound(GAME._playerTeam === 't');
        return;
      }
    }
  }

  function resetBomb() {
    bombPlanted = false;
    bombTimer = 0;
    bombPlantProgress = 0;
    bombDefuseProgress = 0;
    bombPlantedPos = null;
    bombTickTimer = 0;
    if (bombMesh && GAME.scene) { GAME.scene.remove(bombMesh); bombMesh = null; }
    if (droppedBombMesh && GAME.scene) { GAME.scene.remove(droppedBombMesh); droppedBombMesh = null; }
    droppedBombPos = null;
    bombCarrierBot = null;
    playerHasBomb = false;
  }

  GAME.bomb = {
    buildMarkers: buildBombsiteMarkers,
    isNearSite: isNearBombsite,
    createPlanted: createPlantedBomb,
    createDropped: createDroppedBomb,
    update: updateBombLogic,
    reset: resetBomb,
    // Getters/setters for state that main.js reads
    isPlanted: function() { return bombPlanted; },
    getTimer: function() { return bombTimer; },
    getSites: function() { return bombSites; },
    setSites: function(s) { bombSites = s; },
    setCarrierBot: function(b) { bombCarrierBot = b; },
    getCarrierBot: function() { return bombCarrierBot; },
    setPlayerHasBomb: function(v) { playerHasBomb = v; },
    hasPlayerBomb: function() { return playerHasBomb; },
    getPlantedPos: function() { return bombPlantedPos; },
    getMesh: function() { return bombMesh; },
    getDroppedPos: function() { return droppedBombPos; },
    getDroppedMesh: function() { return droppedBombMesh; }
  };
})();
