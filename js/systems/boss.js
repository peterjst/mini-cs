// js/systems/boss.js — Boss fight system extracted from main.js
//
// Owns boss state, atmosphere (lighting/heartbeat), minion spawning,
// grenades, and boss-specific HUD (health bar). Spawns when triggered
// by a mode (currently Deathmatch at a kill threshold). Owns its own
// loop; the active mode owns win/lose decisions and end-of-fight
// transitions.
// Pending-minion state must be reset on init — see docs/gotchas.md #3.
// API exposed on GAME.boss.

(function() {
  'use strict';

  var GAME = window.GAME;

  // ── Boss Atmosphere ──────────────────────────────────────
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

  // ── Boss State ───────────────────────────────────────────
  var _activeBoss = null;
  var _bossLastPhase = 1;
  var _bossHeartbeatTimer = 0;
  var _bossHeartbeatBPM = 60;
  var _bossHeartbeatGain = 0.15;
  var BOSS_MAX_MINIONS = 8;

  var BOSS_MINION_SPAWN = {
    1: { interval: 15, count: 2 },
    2: { interval: 10, count: 3 },
    3: { interval: 6,  count: 4 }
  };
  var _bossMinionTimer = 0;
  var _bossPendingMinions = 0;
  GAME._bossPendingMinions = 0;

  // ── Boss Minion Tint ─────────────────────────────────────
  function applyBossMinionTint(minion) {
    minion.mesh.traverse(function(c) {
      if (c.isMesh && c.material && c.material.emissive) {
        c.material = c.material.clone();
        c.material.emissive.setHex(0xff2200);
        c.material.emissiveIntensity = 0.15;
      }
    });
  }

  // ── Boss Atmosphere Update ───────────────────────────────
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

  // ── Boss Health Bar ──────────────────────────────────────
  function showBossHealthBar(boss) {
    var dom = GAME.dom;
    _activeBoss = boss;
    _bossLastPhase = 1;
    _bossMinionTimer = BOSS_MINION_SPAWN[1].interval;
    _bossPendingMinions = 0;
    GAME._bossPendingMinions = 0;
    dom.bossHealthBar.classList.add('show');
    updateBossHealthBar();
  }

  function hideBossHealthBar() {
    var dom = GAME.dom;
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
    var dom = GAME.dom;
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

  // ── Safe Minion Spawn Position ───────────────────────────
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

  // ── Check Boss Minions ───────────────────────────────────
  function checkBossMinions(dt) {
    if (!_activeBoss || !_activeBoss.alive) return;
    if (_activeBoss._bossNoMinions) return;

    var enemyManager = GAME._enemyManager;
    var phase = _activeBoss._bossPhase;
    if (phase !== _bossLastPhase) {
      var minionsToSpawn = 0;
      if (phase === 2 && _bossLastPhase < 2) {
        minionsToSpawn = 3;
        GAME.hud.showAnnouncement('PHASE 2', 'ESCALATION');
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
        GAME.hud.showAnnouncement('PHASE 3', 'DESPERATE');
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

    // Spawn `n` minions around the boss, validating each spawn against walls.
    // Tries minPlayerDist=6 first (preserves "spawn behind boss" feel), then relaxes
    // to wall-validation only, then falls back to bossPos so we never spawn through walls.
    function spawnMinionsAroundBoss(n) {
      if (n <= 0 || !GAME._Enemy) return;
      var bossPos = _activeBoss.mesh.position;
      var walls = _activeBoss.walls;
      var maxId = 0;
      for (var mi = 0; mi < enemyManager.enemies.length; mi++) {
        if (enemyManager.enemies[mi].id >= maxId) maxId = enemyManager.enemies[mi].id + 1;
      }
      for (var j = 0; j < n; j++) {
        var spawnPos = GAME._findValidSpawn(bossPos.x, bossPos.z, walls, {
          minOff: 2, maxOff: 5, minPlayerDist: 6, playerPos: GAME.player.position
        });
        if (!spawnPos) {
          spawnPos = GAME._findValidSpawn(bossPos.x, bossPos.z, walls, { minOff: 2, maxOff: 5 });
        }
        if (!spawnPos) spawnPos = { x: bossPos.x, z: bossPos.z };
        var minion = new GAME._Enemy(
          enemyManager.scene, spawnPos, _activeBoss.waypoints, walls,
          maxId + j, 1
        );
        minion._manager = enemyManager;
        minion._isBossMinion = true;
        applyBossMinionTint(minion);
        enemyManager.enemies.push(minion);
      }
    }

    // Spawn deferred minions once retreat completes
    if (_bossPendingMinions > 0 && _activeBoss._bossRetreatState === 'idle') {
      var minionCount = 0;
      for (var ci = 0; ci < enemyManager.enemies.length; ci++) {
        var ce = enemyManager.enemies[ci];
        if (ce.alive && !ce.isBoss && ce._isBossMinion) minionCount++;
      }
      var toSpawn = Math.min(_bossPendingMinions, BOSS_MAX_MINIONS - minionCount);

      if (toSpawn > 0) {
        spawnMinionsAroundBoss(toSpawn);
        GAME.hud.showAnnouncement('REINFORCEMENTS', toSpawn + ' enemies incoming!');
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

        if (toSpawn > 0) {
          spawnMinionsAroundBoss(toSpawn);
          if (GAME.Sound && GAME.Sound.bossMinionSummon) GAME.Sound.bossMinionSummon();
        }
      }
    }
  }

  // ── Boss Grenades ────────────────────────────────────────
  function updateBossGrenades(dt) {
    if (!_activeBoss || !_activeBoss.alive) return;
    var list = _activeBoss._bossGrenadeList;
    if (!list || list.length === 0) return;

    for (var i = list.length - 1; i >= 0; i--) {
      var grenade = list[i];
      var explosion = grenade.update(dt);
      if (explosion) {
        if (GAME._processExplosions) GAME._processExplosions([explosion]);
        list.splice(i, 1);
      } else if (!grenade.alive) {
        list.splice(i, 1);
      }
    }
  }

  // ── Boss Round Check ─────────────────────────────────────
  function isBossRound(roundNum) {
    return roundNum === GAME._TOTAL_ROUNDS;
  }
  GAME._isBossRound = isBossRound;

  // ── Boss Heartbeat ───────────────────────────────────────
  function updateBossHeartbeat(dt) {
    if (!_activeBoss || !_activeBoss.alive) return;
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

  // ── Boss Heartbeat Reset ─────────────────────────────────
  function resetHeartbeat() {
    _bossHeartbeatTimer = 0;
    _bossHeartbeatBPM = 60;
    _bossHeartbeatGain = 0.15;
  }

  // ── Boss Atmosphere Reset ────────────────────────────────
  function resetAtmosphere() {
    var atm = GAME._bossAtmosphere;
    atm.active = false;
    atm.targetRedMult = 1.0;
    atm.targetVignetteAdd = 0;
    atm.targetContrast = 0;
    atm.targetSaturation = 1.0;
  }

  // ── Activate Boss Atmosphere ─────────────────────────────
  function activateAtmosphere() {
    GAME._bossAtmosphere.active = true;
    GAME._bossAtmosphere.targetVignetteAdd = 0.1;
    resetHeartbeat();
  }

  // ── Boss Update (game loop) ──────────────────────────────
  function updateBossLoop(dt) {
    if (_activeBoss) updateBossHealthBar();
    if (_activeBoss && _activeBoss.alive) _activeBoss._updateBossShield(dt);
    if (_activeBoss && _activeBoss.alive) _activeBoss._updateBossRetreat(dt, GAME.player.position);
    updateBossHeartbeat(dt);
    updateBossAtmosphere(dt);
    checkBossMinions(dt);
    updateBossGrenades(dt);
  }

  // ── Expose on GAME ──────────────────────────────────────
  GAME._showBossHealthBar = showBossHealthBar;
  GAME._hideBossHealthBar = hideBossHealthBar;
  GAME._getActiveBoss = function() { return _activeBoss; };

  GAME.boss = {
    isBossRound: isBossRound,
    checkMinions: checkBossMinions,
    updateAtmosphere: updateBossAtmosphere,
    updateGrenades: updateBossGrenades,
    updateHeartbeat: updateBossHeartbeat,
    updateLoop: updateBossLoop,
    showHealthBar: showBossHealthBar,
    hideHealthBar: hideBossHealthBar,
    updateHealthBar: updateBossHealthBar,
    applyMinionTint: applyBossMinionTint,
    resetHeartbeat: resetHeartbeat,
    resetAtmosphere: resetAtmosphere,
    activateAtmosphere: activateAtmosphere
  };

})();
