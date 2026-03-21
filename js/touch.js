// js/touch.js — Mobile touch controls
// Attaches GAME.touch, sets GAME.isMobile

(function() {
  'use strict';
  if (!window.GAME) window.GAME = {};

  var isMobile = ('ontouchstart' in window) && (navigator.maxTouchPoints > 0);
  GAME.isMobile = isMobile;

  // Orientation overlay (landscape enforcement)
  var orientOverlay = null;

  function createOrientationOverlay() {
    orientOverlay = document.createElement('div');
    orientOverlay.id = 'orient-overlay';
    orientOverlay.innerHTML =
      '<div style="text-align:center">' +
        '<div id="orient-phone-icon"></div>' +
        '<div style="font-size:18px;font-weight:bold;margin-bottom:8px;">Rotate Your Phone</div>' +
        '<div style="font-size:13px;opacity:0.7;">This game is best played in landscape mode</div>' +
      '</div>';
    document.body.appendChild(orientOverlay);
  }

  // States where landscape is required (actual gameplay)
  var LANDSCAPE_REQUIRED_STATES = {
    PLAYING: 1, BUY_PHASE: 1, ROUND_END: 1, MATCH_END: 1,
    DEATHMATCH_ACTIVE: 1, DEATHMATCH_END: 1,
    GUNGAME_ACTIVE: 1, GUNGAME_END: 1,
    SURVIVAL_WAVE: 1, SURVIVAL_BUY: 1, SURVIVAL_DEAD: 1,
    TOURING: 1, PAUSED: 1
  };

  function checkOrientation() {
    var el = orientOverlay || document.getElementById('orient-overlay');
    if (!el) return;
    var isPortrait = window.innerHeight > window.innerWidth;
    var inGame = GAME._gameState && LANDSCAPE_REQUIRED_STATES[GAME._gameState];
    el.style.display = (isPortrait && inGame) ? 'flex' : 'none';
  }

  // Joystick constants and logic
  var JOYSTICK_SIZE = 90;
  var DEADZONE = 0.15;
  var joystickEl = null;
  var joystickThumb = null;
  var joystickOrigin = null;
  var joystickTouchId = null;


  function joystickToKeys(nx, ny) {
    var result = { w: false, a: false, s: false, d: false };
    var len = Math.sqrt(nx * nx + ny * ny);
    if (len < DEADZONE) return result;
    if (ny < -DEADZONE) result.w = true;
    if (ny > DEADZONE) result.s = true;
    if (nx < -DEADZONE) result.a = true;
    if (nx > DEADZONE) result.d = true;
    return result;
  }

  function createJoystick() {
    var zone = document.createElement('div');
    zone.id = 'touch-move-zone';
    document.body.appendChild(zone);

    joystickEl = document.createElement('div');
    joystickEl.id = 'touch-joystick';
    joystickEl.style.display = 'none';
    document.body.appendChild(joystickEl);

    joystickThumb = document.createElement('div');
    joystickThumb.id = 'touch-joystick-thumb';
    joystickEl.appendChild(joystickThumb);

    zone.addEventListener('touchstart', function(e) {
      e.preventDefault();
      var t = e.changedTouches[0];
      joystickTouchId = t.identifier;
      joystickOrigin = { x: t.clientX, y: t.clientY };
      joystickEl.style.display = 'block';
      joystickEl.style.left = (t.clientX - JOYSTICK_SIZE) + 'px';
      joystickEl.style.top = (t.clientY - JOYSTICK_SIZE) + 'px';
      joystickThumb.style.transform = 'translate(-50%, -50%)';
    }, { passive: false });

    zone.addEventListener('touchmove', function(e) {
      e.preventDefault();
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier !== joystickTouchId) continue;
        var dx = t.clientX - joystickOrigin.x;
        var dy = t.clientY - joystickOrigin.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var maxDist = JOYSTICK_SIZE;
        if (dist > maxDist) {
          dx = dx / dist * maxDist;
          dy = dy / dist * maxDist;
        }
        joystickThumb.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
        var nx = dx / maxDist;
        var ny = dy / maxDist;
        var keys = joystickToKeys(nx, ny);
        if (GAME.player) {
          GAME.player.keys.w = keys.w;
          GAME.player.keys.a = keys.a;
          GAME.player.keys.s = keys.s;
          GAME.player.keys.d = keys.d;
        }
      }
    }, { passive: false });

    function joystickEnd(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickTouchId) {
          joystickTouchId = null;
          joystickEl.style.display = 'none';
          if (GAME.player) {
            GAME.player.keys.w = false;
            GAME.player.keys.a = false;
            GAME.player.keys.s = false;
            GAME.player.keys.d = false;
          }
        }
      }
    }
    zone.addEventListener('touchend', joystickEnd);
    zone.addEventListener('touchcancel', joystickEnd);
  }

  // Look zone
  var TOUCH_SENSITIVITY = 2.5;
  var lookTouchId = null;
  var lookLastX = 0;
  var lookLastY = 0;

  // Tap-to-fire gesture constants
  var TAP_TIME_THRESHOLD = 150;   // ms — quick tap = single shot
  var TAP_MOVE_THRESHOLD = 10;    // px — movement beyond this = drag (no fire)
  var HOLD_FIRE_DELAY = 200;      // ms — hold still this long = auto-fire

  function createLookZone() {
    var zone = document.createElement('div');
    zone.id = 'touch-look-zone';
    document.body.appendChild(zone);

    var lookStartTime = 0;
    var totalMovement = 0;
    var holdFireTimer = null;
    var isDragging = false;

    zone.addEventListener('touchstart', function(e) {
      e.preventDefault();
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === joystickTouchId) continue;
        if (lookTouchId !== null) continue;
        lookTouchId = t.identifier;
        lookLastX = t.clientX;
        lookLastY = t.clientY;
        lookStartTime = Date.now();
        totalMovement = 0;
        isDragging = false;

        // Start hold-fire timer
        holdFireTimer = setTimeout(function() {
          if (!isDragging && lookTouchId !== null) {
            GAME.touchFiring = true;
          }
        }, HOLD_FIRE_DELAY);
      }
    }, { passive: false });

    zone.addEventListener('touchmove', function(e) {
      e.preventDefault();
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier !== lookTouchId) continue;
        var dx = t.clientX - lookLastX;
        var dy = t.clientY - lookLastY;
        lookLastX = t.clientX;
        lookLastY = t.clientY;
        totalMovement += Math.abs(dx) + Math.abs(dy);

        if (totalMovement > TAP_MOVE_THRESHOLD) {
          isDragging = true;
          // Cancel hold-fire if we started dragging
          if (holdFireTimer) {
            clearTimeout(holdFireTimer);
            holdFireTimer = null;
          }
          // Stop auto-fire if it was active and we start dragging again
          GAME.touchFiring = false;
        }

        if (GAME.player) {
          GAME.player.rotate(dx * TOUCH_SENSITIVITY, dy * TOUCH_SENSITIVITY);
        }

        // Restart hold-fire timer on each move so auto-fire starts when finger stops
        // This intentionally restarts on every move event — auto-fire only triggers
        // after the finger has been stationary for HOLD_FIRE_DELAY ms
        if (isDragging && holdFireTimer === null) {
          holdFireTimer = setTimeout(function() {
            if (lookTouchId !== null) {
              GAME.touchFiring = true;
            }
          }, HOLD_FIRE_DELAY);
        }
      }
    }, { passive: false });

    function lookEnd(e) {
      var isCancelled = e.type === 'touchcancel';
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier !== lookTouchId) continue;

        var elapsed = Date.now() - lookStartTime;

        // Clear hold-fire timer
        if (holdFireTimer) {
          clearTimeout(holdFireTimer);
          holdFireTimer = null;
        }

        // Stop auto-fire
        GAME.touchFiring = false;

        // Only fire on touchend, not touchcancel
        if (!isCancelled && elapsed < TAP_TIME_THRESHOLD && totalMovement < TAP_MOVE_THRESHOLD) {
          GAME.touchTap = true; // Signal single shot to main.js
        }

        lookTouchId = null;
      }
    }
    zone.addEventListener('touchend', lookEnd);
    zone.addEventListener('touchcancel', lookEnd);
  }

  // Action buttons
  function createActionButtons() {
    var container = document.createElement('div');
    container.id = 'touch-action-buttons';
    document.body.appendChild(container);

    var jumpBtn = document.createElement('div');
    jumpBtn.className = 'touch-btn';
    jumpBtn.id = 'touch-jump';
    jumpBtn.textContent = '\u2227';
    container.appendChild(jumpBtn);
    jumpBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (GAME.player) GAME.player.keys.space = true;
    }, { passive: false });
    jumpBtn.addEventListener('touchend', function(e) {
      e.preventDefault();
      if (GAME.player) GAME.player.keys.space = false;
    }, { passive: false });

    var crouchBtn = document.createElement('div');
    crouchBtn.className = 'touch-btn';
    crouchBtn.id = 'touch-crouch';
    crouchBtn.textContent = '\u2228';
    container.appendChild(crouchBtn);
    crouchBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (GAME.player) GAME.player.crouching = !GAME.player.crouching;
    }, { passive: false });

    var reloadBtn = document.createElement('div');
    reloadBtn.className = 'touch-btn';
    reloadBtn.id = 'touch-reload';
    reloadBtn.textContent = '\u21BB';
    container.appendChild(reloadBtn);
    reloadBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (GAME.weaponSystem) GAME.weaponSystem.startReload();
    }, { passive: false });
  }

  // Weapon strip
  var weaponStripEl = null;
  var WEAPON_SLOTS = ['knife', 'pistol', 'smg', 'shotgun', 'rifle', 'awp', 'grenade', 'smoke', 'flash'];
  var WEAPON_LABELS = { knife: 'KNF', pistol: 'USP', smg: 'MP5', shotgun: 'SHG', rifle: 'AK', awp: 'AWP', grenade: 'HE', smoke: 'SMK', flash: 'FL' };

  function createWeaponStrip() {
    weaponStripEl = document.createElement('div');
    weaponStripEl.id = 'touch-weapon-strip';
    document.body.appendChild(weaponStripEl);

    for (var i = 0; i < WEAPON_SLOTS.length; i++) {
      var slot = document.createElement('div');
      slot.className = 'touch-weapon-slot';
      slot.dataset.weapon = WEAPON_SLOTS[i];
      slot.textContent = WEAPON_LABELS[WEAPON_SLOTS[i]];
      weaponStripEl.appendChild(slot);

      slot.addEventListener('touchstart', (function(weaponName) {
        return function(e) {
          e.preventDefault();
          if (!GAME.weaponSystem) return;
          var ws = GAME.weaponSystem;

          ws.switchTo(weaponName);
        };
      })(WEAPON_SLOTS[i]), { passive: false });
    }
  }

  function updateWeaponStrip() {
    if (!weaponStripEl || !GAME.weaponSystem) return;
    var ws = GAME.weaponSystem;
    var slots = weaponStripEl.children;
    for (var i = 0; i < slots.length; i++) {
      var weapon = slots[i].dataset.weapon;
      var owned = ws.owned[weapon];
      if (weapon === 'grenade') owned = ws.grenadeCount > 0;
      if (weapon === 'smoke') owned = ws.smokeCount > 0;
      if (weapon === 'flash') owned = ws.flashCount > 0;

      slots[i].style.display = owned ? '' : 'none';
      slots[i].classList.toggle('active', ws.current === weapon);
    }
  }

  function createPauseButton() {
    var btn = document.createElement('div');
    btn.id = 'touch-pause';
    btn.textContent = '⏸';
    document.body.appendChild(btn);
    btn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    }, { passive: false });
  }

  var bottomBarEl = null;
  var bottomHpEl = null;
  var bottomHpIconEl = null;
  var bottomSepEl = null;
  var bottomAmmoMagEl = null;
  var bottomAmmoReserveEl = null;

  function createBottomBar() {
    bottomBarEl = document.createElement('div');
    bottomBarEl.id = 'touch-bottom-bar';

    bottomHpIconEl = document.createElement('span');
    bottomHpIconEl.id = 'touch-bottom-hp-icon';
    bottomHpIconEl.textContent = '+';
    bottomBarEl.appendChild(bottomHpIconEl);

    bottomHpEl = document.createElement('span');
    bottomHpEl.id = 'touch-bottom-hp';
    bottomHpEl.textContent = '100';
    bottomBarEl.appendChild(bottomHpEl);

    var ammoWrap = document.createElement('span');
    ammoWrap.id = 'touch-bottom-ammo';

    bottomAmmoMagEl = document.createElement('span');
    bottomAmmoMagEl.id = 'touch-bottom-ammo-mag';
    bottomAmmoMagEl.textContent = '30';
    ammoWrap.appendChild(bottomAmmoMagEl);

    bottomSepEl = document.createElement('span');
    bottomSepEl.textContent = ' / ';
    bottomSepEl.style.color = 'rgba(255,255,255,0.35)';
    bottomSepEl.style.fontSize = '11px';
    ammoWrap.appendChild(bottomSepEl);

    bottomAmmoReserveEl = document.createElement('span');
    bottomAmmoReserveEl.id = 'touch-bottom-ammo-reserve';
    bottomAmmoReserveEl.textContent = '90';
    ammoWrap.appendChild(bottomAmmoReserveEl);

    bottomBarEl.appendChild(ammoWrap);
    document.body.appendChild(bottomBarEl);
  }

  function updateBottomBar() {
    if (!bottomBarEl || !GAME.player || !GAME.weaponSystem) return;
    var hp = Math.ceil(GAME.player.health);
    bottomHpEl.textContent = hp;
    var hpColor = hp > 50 ? '#4caf50' : hp > 25 ? '#ffeb3b' : '#ff4444';
    bottomHpEl.style.color = hpColor;
    if (bottomHpIconEl) bottomHpIconEl.style.color = hpColor;

    var ws = GAME.weaponSystem;
    var def = GAME.WEAPON_DEFS[ws.current];
    if (!def) return;
    if (def.isKnife) {
      bottomAmmoMagEl.textContent = '\u2014';
      bottomAmmoReserveEl.textContent = '';
      if (bottomSepEl) bottomSepEl.style.display = 'none';
    } else if (def.isGrenade) {
      var count = ws.current === 'grenade' ? ws.grenadeCount :
                  ws.current === 'smoke' ? ws.smokeCount : ws.flashCount;
      bottomAmmoMagEl.textContent = '\u00d7' + count;
      bottomAmmoReserveEl.textContent = '';
      if (bottomSepEl) bottomSepEl.style.display = 'none';
    } else {
      bottomAmmoMagEl.textContent = ws.ammo;
      bottomAmmoReserveEl.textContent = ws.reserveAmmo;
      if (bottomSepEl) bottomSepEl.style.display = '';
    }
  }

  function createScoreboardToggle() {
    var timerEl = document.getElementById('round-timer');
    if (!timerEl) return;
    timerEl.style.pointerEvents = 'auto';
    timerEl.style.cursor = 'pointer';
    timerEl.addEventListener('touchstart', function(e) {
      e.preventDefault();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
      setTimeout(function() {
        document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Tab' }));
      }, 2000);
    }, { passive: false });
  }

  var ESSENTIALS_STATES = { PLAYING: 1, DEATHMATCH_ACTIVE: 1, GUNGAME_ACTIVE: 1, SURVIVAL_WAVE: 1, TOURING: 1 };
  var lastHudMode = null;

  function updateTouchControlVisibility() {
    if (!GAME.isMobile) return;
    checkOrientation();
    var state = GAME._gameState;
    var showControls = ESSENTIALS_STATES[state] ? true : false;
    if (state === 'BUY_PHASE' || state === 'SURVIVAL_BUY') showControls = true;

    var controlIds = ['touch-move-zone', 'touch-look-zone', 'touch-joystick',
                      'touch-action-buttons', 'touch-weapon-strip', 'touch-pause-btn', 'touch-fullscreen', 'touch-bottom-bar'];
    for (var i = 0; i < controlIds.length; i++) {
      var el = document.getElementById(controlIds[i]);
      if (el) el.style.display = showControls ? '' : 'none';
    }
  }

  function updateHudMode() {
    if (!GAME.isMobile) return;
    var state = GAME._gameState;
    if (!state) return;
    var mode = ESSENTIALS_STATES[state] ? 'essentials' : 'full';
    if (mode === lastHudMode) return;
    lastHudMode = mode;
    document.body.classList.toggle('mobile-hud-essentials', mode === 'essentials');
    document.body.classList.toggle('mobile-hud-full', mode === 'full');
  }

  // Buy carousel
  var buyCarouselEl = null;
  var WEAPON_CATEGORIES = {
    pistol: ['pistol'],
    rifle: ['smg', 'shotgun', 'rifle', 'awp'],
    grenades: ['grenade', 'smoke', 'flash']
  };

  function createBuyCarousel() {
    buyCarouselEl = document.createElement('div');
    buyCarouselEl.id = 'touch-buy-menu';
    buyCarouselEl.style.display = 'none';

    var tabs = document.createElement('div');
    tabs.className = 'touch-buy-tabs';
    var catNames = ['pistol', 'rifle', 'grenades'];
    var catLabels = { pistol: 'Pistols', rifle: 'Rifles & SMGs', grenades: 'Grenades' };
    for (var c = 0; c < catNames.length; c++) {
      var tab = document.createElement('div');
      tab.className = 'touch-buy-tab';
      tab.dataset.cat = catNames[c];
      tab.textContent = catLabels[catNames[c]];
      tabs.appendChild(tab);
      tab.addEventListener('touchstart', (function(cat) {
        return function(e) {
          e.preventDefault();
          showBuyCategory(cat);
        };
      })(catNames[c]), { passive: false });
    }
    buyCarouselEl.appendChild(tabs);

    var cards = document.createElement('div');
    cards.className = 'touch-buy-cards';
    cards.id = 'touch-buy-cards';
    buyCarouselEl.appendChild(cards);

    // Also add armor buy button
    var armorBtn = document.createElement('div');
    armorBtn.className = 'touch-buy-close';
    armorBtn.textContent = 'Buy Armor ($650)';
    armorBtn.style.marginTop = '8px';
    armorBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (GAME._buyWeapon) GAME._buyWeapon('armor');
    }, { passive: false });
    buyCarouselEl.appendChild(armorBtn);

    var closeBtn = document.createElement('div');
    closeBtn.className = 'touch-buy-close';
    closeBtn.textContent = '✕ Close';
    closeBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      hideBuyCarousel();
    }, { passive: false });
    buyCarouselEl.appendChild(closeBtn);

    document.body.appendChild(buyCarouselEl);
  }

  function showBuyCategory(cat) {
    var cards = document.getElementById('touch-buy-cards');
    if (!cards) return;
    cards.innerHTML = '';

    var tabs = buyCarouselEl.querySelectorAll('.touch-buy-tab');
    for (var t = 0; t < tabs.length; t++) {
      tabs[t].classList.toggle('active', tabs[t].dataset.cat === cat);
    }

    var weapons = WEAPON_CATEGORIES[cat] || [];
    var playerMoney = GAME.player ? GAME.player.money : 0;

    for (var i = 0; i < weapons.length; i++) {
      var w = weapons[i];
      var def = GAME._weaponDefs ? GAME._weaponDefs[w] : null;
      if (!def) continue;

      var card = document.createElement('div');
      card.className = 'touch-buy-card';
      var canAfford = playerMoney >= def.price;
      if (!canAfford) card.classList.add('disabled');

      card.innerHTML =
        '<div class="touch-buy-card-name">' + def.name + '</div>' +
        '<div class="touch-buy-card-price">$' + def.price + '</div>' +
        '<div class="touch-buy-card-stats">' +
          'DMG: ' + def.damage + ' | Rate: ' + def.fireRate +
        '</div>';

      card.addEventListener('touchstart', (function(weaponName, category) {
        return function(e) {
          e.preventDefault();
          if (GAME._buyWeapon) {
            GAME._buyWeapon(weaponName);
            // Refresh the display
            showBuyCategory(category);
          }
        };
      })(w, cat), { passive: false });

      cards.appendChild(card);
    }
  }

  function showBuyCarousel() {
    if (!buyCarouselEl) return;
    buyCarouselEl.style.display = 'flex';
    showBuyCategory('rifle');
  }

  function hideBuyCarousel() {
    if (!buyCarouselEl) return;
    buyCarouselEl.style.display = 'none';
  }

  // Touch control state
  var touch = {
    destroy: function() {
      // Cleanup for testing
    },
    _joystickToKeys: joystickToKeys,
    _TOUCH_SENSITIVITY: TOUCH_SENSITIVITY,
    _TAP_TIME_THRESHOLD: TAP_TIME_THRESHOLD,
    _TAP_MOVE_THRESHOLD: TAP_MOVE_THRESHOLD,
    _HOLD_FIRE_DELAY: HOLD_FIRE_DELAY,
    _createActionButtons: createActionButtons,
    _updateWeaponStrip: updateWeaponStrip,
    _updateHudMode: updateHudMode,
    _updateTouchControlVisibility: updateTouchControlVisibility,
    _updateBottomBar: updateBottomBar,
    _showBuyCarousel: showBuyCarousel,
    _hideBuyCarousel: hideBuyCarousel
  };

  touch.update = function() {
    if (!GAME.isMobile) return;

    updateHudMode();
    updateTouchControlVisibility();

    // Safety reset: clear fire flags when player is dead or missing
    if (!GAME.player || !GAME.player.alive) {
      GAME.touchFiring = false;
      GAME.touchTap = false;
    }

    updateWeaponStrip();
    updateBottomBar();
  };

  if (isMobile) {
    createOrientationOverlay();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', function() {
      setTimeout(checkOrientation, 100);
    });
    checkOrientation();
    createJoystick();
    createLookZone();
    createActionButtons();
    createWeaponStrip();
    createPauseButton();
    createScoreboardToggle();
    createBuyCarousel();
    createBottomBar();
    // Start controls hidden — updateTouchControlVisibility() in the game loop
    // will show them when entering a gameplay state
    var hiddenIds = ['touch-move-zone', 'touch-look-zone', 'touch-joystick',
                     'touch-action-buttons', 'touch-weapon-strip', 'touch-pause-btn', 'touch-fullscreen',
                     'touch-bottom-bar'];
    for (var i = 0; i < hiddenIds.length; i++) {
      var el = document.getElementById(hiddenIds[i]);
      if (el) el.style.display = 'none';
    }
  }

  GAME.touch = touch;
})();
