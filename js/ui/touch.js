// js/ui/touch.js — Mobile touch controls
// Attaches GAME.touch, sets GAME.isMobile

(function() {
  'use strict';
  if (!window.GAME) window.GAME = {};

  function fmtCount(n) {
    return n === Infinity ? '∞' : n;
  }

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
  var SPRINT_THRESHOLD = 0.85;
  var joystickEl = null;
  var joystickThumb = null;
  var joystickOrigin = null;
  var joystickTouchId = null;


  function joystickToKeys(nx, ny) {
    var result = { w: false, a: false, s: false, d: false, shift: false };
    var len = Math.sqrt(nx * nx + ny * ny);
    if (len < DEADZONE) return result;
    if (ny < -DEADZONE) result.w = true;
    if (ny > DEADZONE) result.s = true;
    if (nx < -DEADZONE) result.a = true;
    if (nx > DEADZONE) result.d = true;
    if (len > SPRINT_THRESHOLD) result.shift = true;
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
          GAME.player.keys.shift = keys.shift;
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
            GAME.player.keys.shift = false;
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

    // Order: jump (top), crouch (middle), reload (bottom-right)
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

  function createFireButton() {
    var btn = document.createElement('div');
    btn.id = 'touch-fire';
    var inner = document.createElement('div');
    inner.id = 'touch-fire-inner';
    btn.appendChild(inner);
    document.body.appendChild(btn);

    var fireTouchId = null;

    btn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (fireTouchId !== null) return;
      fireTouchId = e.changedTouches[0].identifier;
      GAME.touchFireButton = true;
    }, { passive: false });

    btn.addEventListener('touchend', function(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === fireTouchId) {
          fireTouchId = null;
          GAME.touchFireButton = false;
          return;
        }
      }
    }, { passive: false });

    btn.addEventListener('touchcancel', function(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === fireTouchId) {
          fireTouchId = null;
          GAME.touchFireButton = false;
          return;
        }
      }
    }, { passive: false });
  }

  // Weapon strip
  var weaponStripEl = null;
  var WEAPON_SLOTS = ['knife', 'pistol', 'smg', 'shotgun', 'rifle', 'awp', 'grenade', 'smoke', 'flash'];
  var WEAPON_LABELS = { knife: 'KNF', pistol: 'USP', smg: 'MP5', shotgun: 'SHG', rifle: 'AK', awp: 'AWP', grenade: 'HE', smoke: 'SMK', flash: 'FL' };

  function createWeaponStrip() {
    weaponStripEl = document.createElement('div');
    weaponStripEl.id = 'touch-weapon-strip';
    // Will be moved into bottom bar when it's created
    document.body.appendChild(weaponStripEl);
  }

  function updateWeaponStrip() {
    weaponStripEl = document.getElementById('touch-weapon-strip');
    if (!weaponStripEl || !GAME.weaponSystem) return;
    var ws = GAME.weaponSystem;

    // Clear and rebuild with only owned weapons
    weaponStripEl.innerHTML = '';

    for (var i = 0; i < WEAPON_SLOTS.length; i++) {
      var weapon = WEAPON_SLOTS[i];
      var owned = ws.owned[weapon];
      if (weapon === 'grenade') owned = ws.grenadeCount > 0;
      if (weapon === 'smoke') owned = ws.smokeCount > 0;
      if (weapon === 'flash') owned = ws.flashCount > 0;
      if (!owned) continue;

      var slot = document.createElement('div');
      slot.className = 'touch-weapon-slot';
      if (ws.current === weapon) slot.classList.add('active');
      slot.dataset.weapon = weapon;
      slot.textContent = WEAPON_LABELS[weapon];

      // Add grenade count badge
      if (weapon === 'grenade' || weapon === 'smoke' || weapon === 'flash') {
        var count = weapon === 'grenade' ? ws.grenadeCount :
                    weapon === 'smoke' ? ws.smokeCount : ws.flashCount;
        if (count > 0) {
          var badge = document.createElement('span');
          badge.className = 'touch-weapon-badge';
          badge.textContent = fmtCount(count);
          slot.appendChild(badge);
        }
      }

      slot.addEventListener('touchstart', (function(weaponName) {
        return function(e) {
          e.preventDefault();
          if (!GAME.weaponSystem) return;
          GAME.weaponSystem.switchTo(weaponName);
        };
      })(weapon), { passive: false });

      weaponStripEl.appendChild(slot);
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

  var buyBtnEl = null;
  var touchMoneyEl = null;

  function createBuyButton() {
    if (buyBtnEl) { buyBtnEl.remove(); buyBtnEl = null; }
    if (touchMoneyEl) { touchMoneyEl.remove(); touchMoneyEl = null; }
    touchMoneyEl = document.createElement('div');
    touchMoneyEl.id = 'touch-money';
    touchMoneyEl.textContent = '$800';
    document.body.appendChild(touchMoneyEl);

    buyBtnEl = document.createElement('div');
    buyBtnEl.id = 'touch-buy-btn';
    buyBtnEl.textContent = 'BUY';
    document.body.appendChild(buyBtnEl);
    // buyCarouselEl is declared later in this IIFE but assigned before any tap can fire
    buyBtnEl.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (!buyBtnEl.classList.contains('active')) return;
      if (buyCarouselEl && buyCarouselEl.style.display !== 'none') {
        hideBuyCarousel();
      } else {
        showBuyCarousel();
      }
    }, { passive: false });
  }

  var MONEY_VISIBLE_STATES = {
    PLAYING: 1, BUY_PHASE: 1, ROUND_END: 1,
    DEATHMATCH_ACTIVE: 1, GUNGAME_ACTIVE: 1,
    SURVIVAL_WAVE: 1, SURVIVAL_BUY: 1,
    TOURING: 1
  };

  function updateBuyButton() {
    if (!buyBtnEl || !touchMoneyEl) return;
    var state = GAME._gameState;
    var isBuyPhase = (state === 'BUY_PHASE' || state === 'SURVIVAL_BUY' ||
                      state === 'DEATHMATCH_ACTIVE' || state === 'TOURING');
    buyBtnEl.classList.toggle('active', isBuyPhase);
    buyBtnEl.style.opacity = isBuyPhase ? '1' : '0.3';
    buyBtnEl.style.pointerEvents = isBuyPhase ? '' : 'none';

    // Money is always visible during gameplay, independent of buy button
    touchMoneyEl.style.display = MONEY_VISIBLE_STATES[state] ? '' : 'none';

    var money = GAME.player ? GAME.player.money : 0;
    touchMoneyEl.textContent = '$' + money;
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

    // Move weapon strip into bottom bar
    if (weaponStripEl) {
      bottomBarEl.appendChild(weaponStripEl);
    }

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
      bottomAmmoMagEl.textContent = '\u00d7' + fmtCount(count);
      bottomAmmoReserveEl.textContent = '';
      if (bottomSepEl) bottomSepEl.style.display = 'none';
    } else {
      bottomAmmoMagEl.textContent = ws.ammo[ws.current];
      bottomAmmoReserveEl.textContent = fmtCount(ws.reserve[ws.current]);
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
                      'touch-action-buttons', 'touch-fire', 'touch-pause', 'touch-fullscreen', 'touch-bottom-bar', 'touch-buy-btn'];
    for (var i = 0; i < controlIds.length; i++) {
      var el = document.getElementById(controlIds[i]);
      if (el) el.style.display = showControls ? '' : 'none';
    }
    // Hide desktop ammo display when touch bottom bar is visible to avoid duplicates
    var desktopHudIds = ['ammo-display'];
    for (var j = 0; j < desktopHudIds.length; j++) {
      var hudEl = document.getElementById(desktopHudIds[j]);
      if (hudEl) hudEl.style.display = showControls ? 'none' : '';
    }
    // Reposition health bar above bottom bar on mobile
    var healthBar = document.getElementById('health-bar');
    if (healthBar) {
      healthBar.style.bottom = showControls ? '50px' : '';
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

  // Buy menu — flat grid
  var buyCarouselEl = null;

  var BUY_MENU_NAMES = {
    knife: 'Knife', pistol: 'Pistol', smg: 'MP5', shotgun: 'Shotgun',
    rifle: 'AK-47', awp: 'AWP', grenade: 'Grenade', smoke: 'Smoke',
    flash: 'Flashbang', armor: 'Armor'
  };

  var BUY_KEY_HINTS = {
    smg: '[2]', shotgun: '[3]', rifle: '[4]', awp: '[5]',
    armor: '[6]', grenade: '[7]', smoke: '[8]', flash: '[9]'
  };

  var BUY_ITEMS = ['pistol', 'smg', 'shotgun', 'rifle', 'awp',
                   'grenade', 'smoke', 'flash', 'armor', 'knife'];

  function createBuyCarousel() {
    buyCarouselEl = document.createElement('div');
    buyCarouselEl.id = 'touch-buy-menu';
    buyCarouselEl.style.display = 'none';
    document.body.appendChild(buyCarouselEl);
  }

  function renderBuyGrid() {
    if (!buyCarouselEl) return;
    buyCarouselEl.innerHTML = '';

    var playerMoney = GAME.player ? GAME.player.money : 0;
    var ws = GAME.weaponSystem;
    var DEFS = GAME.WEAPON_DEFS;

    // Header
    var header = document.createElement('div');
    header.className = 'touch-buy-header';
    header.innerHTML = '<span class="touch-buy-header-label">BUY MENU</span>' +
      '<span class="touch-buy-header-money">$' + playerMoney + '</span>';
    buyCarouselEl.appendChild(header);

    // Grid
    var grid = document.createElement('div');
    grid.className = 'touch-buy-grid';

    for (var i = 0; i < BUY_ITEMS.length; i++) {
      var item = BUY_ITEMS[i];
      var card = document.createElement('div');
      card.className = 'touch-buy-card';

      var isArmor = item === 'armor';
      var isOwned = false;
      var price = 0;
      var displayName = BUY_MENU_NAMES[item];

      if (isArmor) {
        // Match desktop buy.js semantics: armor "owned" means full 100, not just > 0.
        // When armor is damaged below 100, the card must remain purchasable as a refill.
        var armorFull = GAME.player && GAME.player.armor >= 100;
        var hasHelmet = GAME.player && GAME.player.helmet;
        if (armorFull && hasHelmet) {
          isOwned = true;
          displayName = 'Armor + Helmet';
          price = 0;
        } else if (armorFull && !hasHelmet) {
          displayName = 'Helmet';
          price = 350;
        } else if (!armorFull && hasHelmet) {
          displayName = 'Armor';
          price = 650;
        } else {
          // No helmet, armor not full → offer combo $1000 (matches desktop)
          displayName = 'Armor + Helmet';
          price = 1000;
        }
      } else if (item === 'knife') {
        isOwned = true;
        price = 0;
      } else {
        var def = DEFS[item];
        if (!def) continue;
        price = def.price;
        if (item === 'grenade') isOwned = ws && ws.grenadeCount >= 1;
        else if (item === 'smoke') isOwned = ws && ws.smokeCount >= 1;
        else if (item === 'flash') isOwned = ws && ws.flashCount >= 2;
        else isOwned = ws && ws.owned && ws.owned[item];
      }

      // Prepend keybind hint to final displayed name (covers dynamic armor renames too)
      if (BUY_KEY_HINTS[item]) {
        displayName = BUY_KEY_HINTS[item] + ' ' + displayName;
      }

      var canAfford = playerMoney >= price;

      // Primary weapons that are owned switch to ammo-buy mode
      var isPrimary = (item === 'smg' || item === 'shotgun' || item === 'rifle' || item === 'awp');
      var isAmmoBuy = false;
      var ammoFull = false;
      var currentMags = 0;
      var capMags = 0;
      if (isPrimary && isOwned) {
        var def = DEFS[item];
        var reserve = ws.reserve[item] || 0;
        var cap = def.reserveCap;
        var magSize = def.magSize;
        capMags = Math.round(cap / magSize);
        currentMags = Math.floor(reserve / magSize);
        if (reserve >= cap) {
          ammoFull = true;
        } else {
          isAmmoBuy = true;
          price = GAME.AMMO_PRICE_PER_MAG;
          canAfford = playerMoney >= price;
          isOwned = false; // render as buyable
        }
      }

      if (isAmmoBuy) {
        var ammoLabel = displayName + ' \u2014 Ammo  ' + currentMags + '/' + capMags + ' mags';
        if (canAfford) {
          card.innerHTML =
            '<div class="touch-buy-card-name">' + ammoLabel + '</div>' +
            '<div class="touch-buy-card-price available">$' + price + '</div>';
          card.addEventListener('touchstart', (function(buyItem) {
            return function(e) {
              e.preventDefault();
              if (GAME._buyWeapon) {
                GAME._buyWeapon(buyItem);
                renderBuyGrid();
              }
            };
          })(item), { passive: false });
        } else {
          card.classList.add('too-expensive');
          card.innerHTML =
            '<div class="touch-buy-card-name">' + ammoLabel + '</div>' +
            '<div class="touch-buy-card-price expensive">$' + price + '</div>';
        }
      } else if (ammoFull) {
        card.classList.add('owned');
        card.innerHTML =
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:4px;">' +
            '<span class="touch-buy-card-name">' + displayName + '</span>' +
            '<span class="touch-buy-owned-badge">MAX AMMO</span>' +
          '</div>' +
          '<div class="touch-buy-card-price owned">\u2014</div>';
      } else if (isOwned) {
        card.classList.add('owned');
        card.innerHTML =
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:4px;">' +
            '<span class="touch-buy-card-name">' + displayName + '</span>' +
            '<span class="touch-buy-owned-badge">OWNED</span>' +
          '</div>' +
          '<div class="touch-buy-card-price owned">' + (price > 0 ? '$' + price : '\u2014') + '</div>';
      } else if (!canAfford) {
        card.classList.add('too-expensive');
        card.innerHTML =
          '<div class="touch-buy-card-name">' + displayName + '</div>' +
          '<div class="touch-buy-card-price expensive">$' + price + '</div>';
      } else {
        card.innerHTML =
          '<div class="touch-buy-card-name">' + displayName + '</div>' +
          '<div class="touch-buy-card-price available">$' + price + '</div>';
        card.addEventListener('touchstart', (function(buyItem) {
          return function(e) {
            e.preventDefault();
            if (GAME._buyWeapon) {
              GAME._buyWeapon(buyItem);
              renderBuyGrid();
            }
          };
        })(item), { passive: false });
      }

      grid.appendChild(card);
    }

    // Close button as last grid cell
    var closeCell = document.createElement('div');
    closeCell.className = 'touch-buy-close-cell';
    closeCell.textContent = '\u2715 CLOSE';
    closeCell.addEventListener('touchstart', function(e) {
      e.preventDefault();
      hideBuyCarousel();
    }, { passive: false });
    grid.appendChild(closeCell);

    buyCarouselEl.appendChild(grid);
  }

  function showBuyCarousel() {
    if (!buyCarouselEl) return;
    renderBuyGrid();
    buyCarouselEl.style.display = 'flex';
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
    _SPRINT_THRESHOLD: SPRINT_THRESHOLD,
    _createActionButtons: createActionButtons,
    _createFireButton: createFireButton,
    _createWeaponStrip: createWeaponStrip,
    _WEAPON_LABELS: WEAPON_LABELS,
    _updateWeaponStrip: updateWeaponStrip,
    _updateHudMode: updateHudMode,
    _updateTouchControlVisibility: updateTouchControlVisibility,
    _updateBottomBar: updateBottomBar,
    _showBuyCarousel: showBuyCarousel,
    _hideBuyCarousel: hideBuyCarousel,
    _BUY_MENU_NAMES: BUY_MENU_NAMES,
    _BUY_ITEMS: BUY_ITEMS,
    _renderBuyGrid: renderBuyGrid,
    _createBuyCarousel: createBuyCarousel,
    _createBuyButton: createBuyButton,
    _updateBuyButton: updateBuyButton
  };

  touch.update = function() {
    if (!GAME.isMobile) return;

    updateHudMode();
    updateTouchControlVisibility();

    // Safety reset: clear fire flags when player is dead or missing
    if (!GAME.player || !GAME.player.alive) {
      GAME.touchFiring = false;
      GAME.touchTap = false;
      GAME.touchFireButton = false;
    }

    updateWeaponStrip();
    updateBottomBar();
    updateBuyButton();
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
    createFireButton();
    createWeaponStrip();
    createPauseButton();
    createScoreboardToggle();
    createBuyButton();
    createBuyCarousel();
    createBottomBar();
    // Start controls hidden — updateTouchControlVisibility() in the game loop
    // will show them when entering a gameplay state
    var hiddenIds = ['touch-move-zone', 'touch-look-zone', 'touch-joystick',
                     'touch-action-buttons', 'touch-fire', 'touch-pause', 'touch-fullscreen',
                     'touch-bottom-bar', 'touch-buy-btn'];
    for (var i = 0; i < hiddenIds.length; i++) {
      var el = document.getElementById(hiddenIds[i]);
      if (el) el.style.display = 'none';
    }
  }

  GAME.touch = touch;
})();
