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

  function checkOrientation() {
    if (!orientOverlay) return;
    var isPortrait = window.innerHeight > window.innerWidth;
    orientOverlay.style.display = isPortrait ? 'flex' : 'none';
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

    zone.addEventListener('touchend', function(e) {
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
    });
  }

  // Look zone
  var TOUCH_SENSITIVITY = 2.5;
  var lookTouchId = null;
  var lookLastX = 0;
  var lookLastY = 0;

  function createLookZone() {
    var zone = document.createElement('div');
    zone.id = 'touch-look-zone';
    document.body.appendChild(zone);

    zone.addEventListener('touchstart', function(e) {
      e.preventDefault();
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === joystickTouchId) continue;
        if (lookTouchId !== null) continue;
        lookTouchId = t.identifier;
        lookLastX = t.clientX;
        lookLastY = t.clientY;
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
        if (GAME.player) {
          GAME.player.rotate(dx * TOUCH_SENSITIVITY, dy * TOUCH_SENSITIVITY);
        }
      }
    }, { passive: false });

    zone.addEventListener('touchend', function(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === lookTouchId) {
          lookTouchId = null;
        }
      }
    });
  }

  // Auto-fire raycaster
  var autoFireRaycaster = new THREE.Raycaster();

  // Action buttons
  function createActionButtons() {
    var container = document.createElement('div');
    container.id = 'touch-action-buttons';
    document.body.appendChild(container);

    var jumpBtn = document.createElement('div');
    jumpBtn.className = 'touch-btn';
    jumpBtn.id = 'touch-jump';
    jumpBtn.textContent = 'JMP';
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
    crouchBtn.textContent = 'CRC';
    container.appendChild(crouchBtn);
    crouchBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (GAME.player) GAME.player.crouching = !GAME.player.crouching;
    }, { passive: false });

    var reloadBtn = document.createElement('div');
    reloadBtn.className = 'touch-btn';
    reloadBtn.id = 'touch-reload';
    reloadBtn.textContent = 'RLD';
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

          var isGrenade = (weaponName === 'grenade' || weaponName === 'smoke' || weaponName === 'flash');
          if (isGrenade && ws.current === weaponName) {
            ws.mouseDown = true;
            setTimeout(function() { ws.mouseDown = false; }, 100);
            return;
          }

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
    var state = GAME._gameState;
    var showControls = ESSENTIALS_STATES[state] ? true : false;
    if (state === 'BUY_PHASE' || state === 'SURVIVAL_BUY') showControls = true;

    var controlIds = ['touch-move-zone', 'touch-look-zone', 'touch-joystick',
                      'touch-action-buttons', 'touch-weapon-strip'];
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
    _createActionButtons: createActionButtons,
    _updateWeaponStrip: updateWeaponStrip,
    _updateHudMode: updateHudMode,
    _updateTouchControlVisibility: updateTouchControlVisibility,
    _showBuyCarousel: showBuyCarousel,
    _hideBuyCarousel: hideBuyCarousel
  };

  touch.update = function() {
    if (!GAME.isMobile) return;

    updateHudMode();
    updateTouchControlVisibility();

    GAME.touchFiring = false;
    if (!GAME.player || !GAME.player.alive) return;
    if (!GAME.weaponSystem) return;

    var ws = GAME.weaponSystem;
    var cur = ws.current;
    if (cur === 'grenade' || cur === 'smoke' || cur === 'flash' || cur === 'knife') return;

    var cam = GAME.player.camera;
    if (!cam) return;

    autoFireRaycaster.setFromCamera({ x: 0, y: 0 }, cam);

    var enemyManager = GAME._enemyManager;
    if (!enemyManager || !enemyManager.enemies) return;

    var meshes = [];
    for (var i = 0; i < enemyManager.enemies.length; i++) {
      var e = enemyManager.enemies[i];
      if (e.alive && e.mesh) meshes.push(e.mesh);
    }
    if (meshes.length === 0) return;

    var hits = autoFireRaycaster.intersectObjects(meshes, true);
    if (hits.length > 0) {
      GAME.touchFiring = true;
    }

    updateWeaponStrip();
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
  }

  GAME.touch = touch;
})();
