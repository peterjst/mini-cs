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

  // Touch control state
  var touch = {
    update: function() {
      // Will be filled in by later tasks
    },
    destroy: function() {
      // Cleanup for testing
    },
    _joystickToKeys: joystickToKeys,
    _TOUCH_SENSITIVITY: TOUCH_SENSITIVITY
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
  }

  GAME.touch = touch;
})();
