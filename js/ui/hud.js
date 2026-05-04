// js/ui/hud.js — HUD rendering extracted from main.js
// Uses GAME.dom, GAME.player, GAME.weaponSystem, GAME._hitFeedback, GAME._STATES

(function() {
  'use strict';

  var announcementTimeout = null;

  function fmtCount(n) {
    return n === Infinity ? '∞' : n;
  }

  function updateHUD() {
    var dom = GAME.dom;
    var player = GAME.player;
    var weapons = GAME.weaponSystem;
    if (!dom || !player || !weapons) return;

    var gameState = GAME._getGameState();
    var STATES = GAME._STATES;

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
        dom.ammoMag.textContent = 'HE x' + fmtCount(weapons.grenadeCount);
      } else if (weapons.current === 'smoke') {
        dom.ammoMag.textContent = 'SM x' + fmtCount(weapons.smokeCount);
      } else if (weapons.current === 'flash') {
        dom.ammoMag.textContent = 'FL x' + fmtCount(weapons.flashCount);
      }
      dom.ammoReserve.textContent = '';
    } else {
      dom.ammoMag.textContent = weapons.ammo[weapons.current];
      dom.ammoReserve.textContent = fmtCount(weapons.reserve[weapons.current]);
    }

    if (gameState !== STATES.GUNGAME_ACTIVE) {
      dom.moneyDisplay.textContent = '$' + player.money;
    }

    var nadeParts = [];
    if (weapons.grenadeCount > 0) nadeParts.push('HE x' + fmtCount(weapons.grenadeCount));
    if (weapons.smokeCount > 0) nadeParts.push('SM x' + fmtCount(weapons.smokeCount));
    if (weapons.flashCount > 0) nadeParts.push('FL x' + fmtCount(weapons.flashCount));
    if (nadeParts.length > 0) {
      dom.grenadeCount.textContent = nadeParts.join('  ');
      dom.grenadeCount.classList.add('show');
    } else {
      dom.grenadeCount.classList.remove('show');
    }

    // Timer
    if (gameState === STATES.GUNGAME_ACTIVE) {
      var elapsed = (performance.now() / 1000) - GAME._gungameStartTime;
      var gm = Math.floor(elapsed / 60);
      var gs = Math.floor(elapsed % 60);
      dom.roundTimer.textContent = gm + ':' + (gs < 10 ? '0' : '') + gs;
      dom.roundTimer.style.color = '#ff9800';
    } else if (gameState === STATES.SURVIVAL_WAVE || gameState === STATES.SURVIVAL_BUY) {
      if (gameState === STATES.SURVIVAL_BUY) {
        var st = GAME._phaseTimer;
        dom.roundTimer.textContent = '0:' + (st < 10 ? '0' : '') + Math.floor(st);
        dom.roundTimer.style.color = st <= 3 ? '#ef5350' : '#ffca28';
      } else {
        dom.roundTimer.textContent = '';
      }
    } else {
      var t = gameState === STATES.BUY_PHASE ? GAME._phaseTimer : GAME._roundTimer;
      var mins = Math.floor(t / 60);
      var secs = Math.floor(t % 60);
      dom.roundTimer.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
      dom.roundTimer.style.color = t <= 10 ? '#ef5350' : '#fff';
    }

    dom.buyPhaseHint.style.display = gameState === STATES.BUY_PHASE ? '' : 'none';

    // Dynamic crosshair — reflects base spread + burst spread
    var spread = def.spread || 0;
    if (player.crouching) spread *= 0.6;
    spread += (weapons._burstSpread || 0);
    var gap = Math.max(3, Math.round(spread * 280 + 3));
    var len = Math.max(8, Math.round(spread * 120 + 10));
    // Hit feedback — expand crosshair
    if (GAME._hitFeedback.hitTimer > 0) {
      GAME._hitFeedback.hitTimer -= GAME._frameDt;
      gap += 2;
    }

    dom.crosshair.style.setProperty('--ch-gap', gap + 'px');
    dom.crosshair.style.setProperty('--ch-len', len + 'px');

    // Kill feedback — red flash
    if (GAME._hitFeedback.killTimer > 0) {
      GAME._hitFeedback.killTimer -= GAME._frameDt;
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
    var dom = GAME.dom;
    if (!dom) return;
    dom.scorePlayer.textContent = GAME._playerScore;
    dom.scoreBots.textContent = GAME._botScore;
    if (GAME._teamMode) {
      dom.scorePlayerLabel.textContent = GAME._playerTeam === 'ct' ? 'Counter-Terrorists' : 'Terrorists';
      dom.scoreBotsLabel.textContent = GAME._playerTeam === 'ct' ? 'Terrorists' : 'Counter-Terrorists';
    } else {
      dom.scorePlayerLabel.textContent = 'You';
      dom.scoreBotsLabel.textContent = 'Terrorists';
    }
  }

  function addKillFeed(killer, victim, isBossKill) {
    var dom = GAME.dom;
    if (!dom || !dom.killFeed) return;
    var entry = document.createElement('div');
    entry.className = 'kill-entry' + (isBossKill ? ' boss-kill' : '');
    entry.innerHTML = '<span class="killer">' + killer + '</span> \u25ba <span class="victim">' + victim + '</span>';
    dom.killFeed.appendChild(entry);
    setTimeout(function() { entry.remove(); }, 3500);
  }

  function addRadioFeed(text) {
    var dom = GAME.dom;
    if (!dom || !dom.killFeed) return;
    var entry = document.createElement('div');
    entry.className = 'radio-entry';
    entry.textContent = '[RADIO] ' + text;
    dom.killFeed.appendChild(entry);
    setTimeout(function() { entry.remove(); }, 2000);
  }

  function showAnnouncement(text, sub) {
    var dom = GAME.dom;
    if (!dom || !dom.announcement) return;
    if (announcementTimeout) clearTimeout(announcementTimeout);
    dom.announcement.innerHTML = text + (sub ? '<div class="sub">' + sub + '</div>' : '');
    dom.announcement.classList.add('show');
    announcementTimeout = setTimeout(function() {
      dom.announcement.classList.remove('show');
    }, 2500);
  }

  function updatePauseHint() {
    var dom = GAME.dom;
    if (!dom || !dom.pauseHintKey) return;
    var gs = GAME._getGameState();
    var STATES = GAME._STATES;
    var show = (gs === STATES.PLAYING || gs === STATES.BUY_PHASE ||
                gs === STATES.TOURING || gs === STATES.SURVIVAL_BUY ||
                gs === STATES.SURVIVAL_WAVE || gs === STATES.GUNGAME_ACTIVE ||
                gs === STATES.DEATHMATCH_ACTIVE);
    dom.pauseHintKey.style.display = show ? 'block' : 'none';
  }

  GAME.hud = {
    update: updateHUD,
    updateScoreboard: updateScoreboard,
    addKillFeed: addKillFeed,
    addRadioFeed: addRadioFeed,
    showAnnouncement: showAnnouncement,
    updatePauseHint: updatePauseHint
  };

  // Backward-compatible aliases
  GAME.showAnnouncement = showAnnouncement;
  GAME._addRadioFeed = addRadioFeed;
})();
