# Mobile Phone Support Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the game fully playable on mobile phones via touch controls, without changing any desktop behavior.

**Architecture:** A new `js/touch.js` module detects mobile devices and injects a DOM-based touch control overlay. It translates touch inputs into the same signals the existing game logic consumes (player keys, weapon mouseDown, yaw/pitch rotation). All mobile code is gated behind `GAME.isMobile`.

**Tech Stack:** Three.js (existing), Web Audio API (existing), DOM touch events, CSS responsive design

**Spec:** `docs/superpowers/specs/2026-03-17-mobile-support-design.md`

---

### Task 1: Expose `player.rotate()` method

Extract the mousemove rotation logic into a callable method so touch.js can reuse it.

**Files:**
- Modify: `js/player.js:104-110`
- Test: `tests/unit/player.test.js`

- [ ] **Step 1: Write failing test for rotate()**

Add to `tests/unit/player.test.js`:
```javascript
describe('Player.rotate', () => {
  it('should adjust yaw and pitch from raw deltas', () => {
    var camera = new THREE.PerspectiveCamera();
    var p = new GAME.Player(camera);
    p.yaw = 0;
    p.pitch = 0;
    p.rotate(100, 50);
    // SENSITIVITY is 0.002, so yaw = -(100 * 0.002) = -0.2, pitch = -(50 * 0.002) = -0.1
    expect(p.yaw).toBeCloseTo(-0.2, 5);
    expect(p.pitch).toBeCloseTo(-0.1, 5);
  });

  it('should clamp pitch to MAX_PITCH (85 degrees)', () => {
    var camera = new THREE.PerspectiveCamera();
    var p = new GAME.Player(camera);
    p.pitch = 0;
    // Push pitch far beyond max: -99999 * 0.002 = +199.998 radians
    p.rotate(0, -99999);
    var maxPitch = Math.PI * 85 / 180;
    expect(p.pitch).toBeCloseTo(maxPitch, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/player.test.js`
Expected: FAIL — `p.rotate is not a function`

- [ ] **Step 3: Implement rotate() in player.js**

Replace lines 104-110 in `js/player.js`:
```javascript
  Player.prototype.rotate = function(dx, dy) {
    this.yaw -= dx * SENSITIVITY;
    this.pitch -= dy * SENSITIVITY;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch));
  };

  document.addEventListener('mousemove', function(e) {
    if (document.pointerLockElement) {
      self.rotate(e.movementX, e.movementY);
    }
  });
```

Note: The `self` reference is inside the constructor, so move the `rotate` prototype definition *before* the constructor's event listener, or use `self.rotate(...)` inside the mousemove handler. The cleanest approach is to define `rotate` on the prototype outside the constructor (after line 111), and change the mousemove handler to call `self.rotate(e.movementX, e.movementY)`.

- [ ] **Step 4: Run all tests to verify nothing broke**

Run: `npm test`
Expected: All tests PASS including new rotate tests

- [ ] **Step 5: Commit**

```bash
git add js/player.js tests/unit/player.test.js
git commit -m "feat(player): expose rotate() method for touch input support"
```

---

### Task 2: Expose weapon system on GAME and add mobile fire flag

Expose the weapon system instance so touch.js can call reload/switchTo, and add `GAME.touchFiring` so touch auto-fire integrates with the existing fire logic.

**Files:**
- Modify: `js/main.js:4439` (fire logic)
- Modify: `js/main.js:4311` (touring fire logic)
- Modify: `js/weapons.js:1532-1533` (tryFire pointer lock check)
- Test: `tests/unit/main.test.js`

- [ ] **Step 1: Write failing test for GAME.touchFiring integration**

Add to `tests/unit/main.test.js`:
```javascript
describe('GAME.touchFiring', () => {
  it('should be defined and default to false', () => {
    expect(GAME.touchFiring).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/main.test.js`
Expected: FAIL — `GAME.touchFiring` is undefined

- [ ] **Step 3: Implement in main.js**

Near the top of main.js IIFE (after `GAME` namespace setup), add:
```javascript
GAME.touchFiring = false;
```

In the fire logic at line 4439, change:
```javascript
if (weapons.mouseDown && player.alive) {
```
to:
```javascript
if ((weapons.mouseDown || GAME.touchFiring) && player.alive) {
```

Apply the same change at line 4311 (touring fire logic):
```javascript
if ((weapons.mouseDown || GAME.touchFiring) && player.alive) {
```

Expose the weapon system instance after it's created. Find where `weapons = new GAME.WeaponSystem(camera, scene)` is called and add after it:
```javascript
GAME.weaponSystem = weapons;
```

- [ ] **Step 4: Skip pointer lock check in tryFire when mobile**

In `js/weapons.js` at line 1532-1533, change:
```javascript
if (!document.pointerLockElement) return null;
```
to:
```javascript
if (!document.pointerLockElement && !GAME.isMobile) return null;
```

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add js/main.js js/weapons.js tests/unit/main.test.js
git commit -m "feat: expose weaponSystem and touchFiring flag for mobile support"
```

---

### Task 3: Skip pointer lock on mobile

Gate all pointer lock requests and the click-to-lock prompt behind `!GAME.isMobile`.

**Files:**
- Modify: `js/main.js:1498-1503` (click handler for pointer lock)
- Modify: `js/main.js:1506-1511` (pointerlockchange handler)
- Modify: `js/player.js:100-102` (pointerlockchange key clear)

- [ ] **Step 1: Guard pointer lock request in main.js**

At line 1498-1503, wrap the pointer lock request:
```javascript
renderer.domElement.addEventListener('click', function() {
  if (GAME.isMobile) return;
  if (gameState === PLAYING || gameState === BUY_PHASE || gameState === TOURING ||
      gameState === SURVIVAL_BUY || gameState === SURVIVAL_WAVE || gameState === GUNGAME_ACTIVE ||
      gameState === DEATHMATCH_ACTIVE) {
    if (!document.pointerLockElement) renderer.domElement.requestPointerLock();
  }
});
```

- [ ] **Step 2: Guard other pointer lock exits**

Search main.js for all `document.exitPointerLock()` calls and wrap each with:
```javascript
if (document.pointerLockElement) document.exitPointerLock();
```
Most of these are already guarded. Verify no unguarded calls exist.

- [ ] **Step 3: Guard player.js pointerlockchange handler**

At `js/player.js:100-102`, the handler clears keys when pointer lock exits. On mobile, pointer lock is never entered, so this handler would fire incorrectly. Add a guard:
```javascript
document.addEventListener('pointerlockchange', function() {
  if (!GAME.isMobile && !document.pointerLockElement) self.clearKeys();
});
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add js/main.js js/player.js
git commit -m "feat: skip pointer lock on mobile devices"
```

---

### Task 4: Mobile detection and orientation lock overlay

Create the `js/touch.js` module with device detection and the "rotate your phone" overlay.

**Files:**
- Create: `js/touch.js`
- Modify: `index.html` (add script tag and orientation overlay CSS)
- Test: `tests/unit/touch.test.js`

- [ ] **Step 1: Write failing tests for mobile detection**

Create `tests/unit/touch.test.js`:
```javascript
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/touch.js');
});

describe('Mobile detection', () => {
  it('should set GAME.isMobile to false when no touch support', () => {
    // Default test env has no touch support
    expect(GAME.isMobile).toBe(false);
  });
});

describe('GAME.touch', () => {
  it('should exist as a namespace', () => {
    expect(GAME.touch).toBeDefined();
  });

  it('should have an update method', () => {
    expect(typeof GAME.touch.update).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/touch.test.js`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Create js/touch.js with detection and orientation overlay**

Create `js/touch.js`:
```javascript
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

  // Touch control state
  var touch = {
    update: function() {
      // Will be filled in by later tasks
    },
    destroy: function() {
      // Cleanup for testing
    }
  };

  if (isMobile) {
    createOrientationOverlay();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', function() {
      setTimeout(checkOrientation, 100);
    });
    checkOrientation();
  }

  GAME.touch = touch;
})();
```

- [ ] **Step 4: Add script tag and CSS to index.html**

Add to `index.html` script loading section (after `js/weapons.js`, before `js/main.js`):
```html
<script src="js/touch.js"></script>
```

Add CSS for orientation overlay:
```css
#orient-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.95); color: #fff; z-index: 9999;
  display: none; align-items: center; justify-content: center;
  font-family: system-ui, sans-serif;
}
#orient-phone-icon {
  width: 40px; height: 64px; margin: 0 auto 16px;
  border: 3px solid rgba(255,255,255,0.7); border-radius: 6px;
  position: relative;
  animation: orient-rotate 2s ease-in-out infinite;
}
#orient-phone-icon::after {
  content: ''; position: absolute; bottom: 6px; left: 50%;
  transform: translateX(-50%); width: 12px; height: 2px;
  background: rgba(255,255,255,0.5); border-radius: 1px;
}
@keyframes orient-rotate {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(90deg); }
}
```

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add js/touch.js index.html tests/unit/touch.test.js
git commit -m "feat(touch): add mobile detection and orientation lock overlay"
```

---

### Task 5: Floating movement joystick

Implement the left-side floating joystick that sets player movement keys.

**Files:**
- Modify: `js/touch.js`
- Test: `tests/unit/touch.test.js`

- [ ] **Step 1: Write failing tests for joystick**

Add to `tests/unit/touch.test.js`:
```javascript
describe('Joystick key mapping', () => {
  it('should map positive Y offset to forward (w key)', () => {
    // Test the internal mapping function
    var keys = GAME.touch._joystickToKeys(0, -0.5); // up = negative Y = forward
    expect(keys.w).toBe(true);
    expect(keys.s).toBe(false);
  });

  it('should map negative X offset to left (a key)', () => {
    var keys = GAME.touch._joystickToKeys(-0.5, 0);
    expect(keys.a).toBe(true);
    expect(keys.d).toBe(false);
  });

  it('should map diagonal to two keys', () => {
    var keys = GAME.touch._joystickToKeys(0.5, -0.5); // right and forward
    expect(keys.w).toBe(true);
    expect(keys.d).toBe(true);
  });

  it('should return all false for center (deadzone)', () => {
    var keys = GAME.touch._joystickToKeys(0.05, 0.05);
    expect(keys.w).toBe(false);
    expect(keys.s).toBe(false);
    expect(keys.a).toBe(false);
    expect(keys.d).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/touch.test.js`
Expected: FAIL — `GAME.touch._joystickToKeys is not a function`

- [ ] **Step 3: Implement joystick in touch.js**

Add to `js/touch.js` inside the IIFE, before `GAME.touch = touch`:

```javascript
  var JOYSTICK_SIZE = 90;     // Outer ring radius in px
  var DEADZONE = 0.15;        // 15% of max range
  var joystickEl = null;
  var joystickThumb = null;
  var joystickOrigin = null;  // {x, y} where touch started
  var joystickTouchId = null;

  function joystickToKeys(nx, ny) {
    // nx, ny are normalized -1..1 offsets from center
    var result = { w: false, a: false, s: false, d: false };
    var len = Math.sqrt(nx * nx + ny * ny);
    if (len < DEADZONE) return result;
    if (ny < -DEADZONE) result.w = true;  // up = forward
    if (ny > DEADZONE) result.s = true;   // down = backward
    if (nx < -DEADZONE) result.a = true;  // left
    if (nx > DEADZONE) result.d = true;   // right
    return result;
  }

  function createJoystick() {
    // Left-side touch zone
    var zone = document.createElement('div');
    zone.id = 'touch-move-zone';
    document.body.appendChild(zone);

    // Joystick ring (hidden until touch)
    joystickEl = document.createElement('div');
    joystickEl.id = 'touch-joystick';
    joystickEl.style.display = 'none';
    document.body.appendChild(joystickEl);

    // Thumb circle
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

  // Expose for testing
  touch._joystickToKeys = joystickToKeys;
```

In the `if (isMobile)` block, add:
```javascript
    createJoystick();
```

- [ ] **Step 4: Add joystick CSS to index.html**

```css
#touch-move-zone {
  position: fixed; bottom: 0; left: 0; width: 45%; height: 65%;
  z-index: 100; touch-action: none;
}
#touch-joystick {
  position: fixed; width: 180px; height: 180px;
  border-radius: 50%; border: 2px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.04); z-index: 101;
  pointer-events: none;
}
#touch-joystick-thumb {
  position: absolute; top: 50%; left: 50%;
  width: 40px; height: 40px; border-radius: 50%;
  background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25);
  transform: translate(-50%, -50%);
}
```

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add js/touch.js index.html tests/unit/touch.test.js
git commit -m "feat(touch): add floating movement joystick"
```

---

### Task 6: Look/aim touch zone

Implement the right-side swipe zone for camera rotation using `player.rotate()`.

**Files:**
- Modify: `js/touch.js`
- Test: `tests/unit/touch.test.js`

- [ ] **Step 1: Write failing test for touch sensitivity**

Add to `tests/unit/touch.test.js`:
```javascript
describe('Touch look sensitivity', () => {
  it('should have a TOUCH_SENSITIVITY constant exposed for testing', () => {
    expect(typeof GAME.touch._TOUCH_SENSITIVITY).toBe('number');
    expect(GAME.touch._TOUCH_SENSITIVITY).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/touch.test.js`
Expected: FAIL — `GAME.touch._TOUCH_SENSITIVITY` is undefined

- [ ] **Step 3: Implement look zone in touch.js**

Add to `js/touch.js` inside the IIFE:

```javascript
  var TOUCH_SENSITIVITY = 2.5;  // Multiplier applied before player.rotate()
  var lookTouchId = null;
  var lookLastX = 0;
  var lookLastY = 0;

  function createLookZone() {
    var zone = document.createElement('div');
    zone.id = 'touch-look-zone';
    document.body.appendChild(zone);

    zone.addEventListener('touchstart', function(e) {
      e.preventDefault();
      // Only claim a touch that isn't already the joystick
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

  touch._TOUCH_SENSITIVITY = TOUCH_SENSITIVITY;
```

In the `if (isMobile)` block, add:
```javascript
    createLookZone();
```

- [ ] **Step 4: Add look zone CSS to index.html**

```css
#touch-look-zone {
  position: fixed; bottom: 0; right: 0; width: 55%; height: 65%;
  z-index: 100; touch-action: none;
}
```

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add js/touch.js index.html tests/unit/touch.test.js
git commit -m "feat(touch): add look/aim touch zone"
```

---

### Task 7: Auto-fire system

Implement raycasting from crosshair that sets `GAME.touchFiring` when an enemy is under the crosshair.

**Files:**
- Modify: `js/touch.js`
- Test: `tests/unit/touch.test.js`

- [ ] **Step 1: Write failing test for auto-fire update**

Add to `tests/unit/touch.test.js`:
```javascript
describe('Auto-fire', () => {
  it('should set GAME.touchFiring to false when no enemies exist', () => {
    GAME.isMobile = true;
    GAME.touchFiring = true; // pre-set to true
    // With no camera, enemies, or scene, update should safely set to false
    GAME.touch.update();
    expect(GAME.touchFiring).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/touch.test.js`
Expected: FAIL — `GAME.touchFiring` remains true (update is empty)

- [ ] **Step 3: Implement auto-fire in touch.js update()**

Replace the `update` function in touch.js:

```javascript
  var autoFireRaycaster = new THREE.Raycaster();

  touch.update = function() {
    if (!isMobile) return;

    // Auto-fire: raycast from camera center
    GAME.touchFiring = false;
    if (!GAME.player || !GAME.player.alive) return;
    if (!GAME.weaponSystem) return;

    var ws = GAME.weaponSystem;
    // Don't auto-fire grenades
    var cur = ws.current;
    if (cur === 'grenade' || cur === 'smoke' || cur === 'flash' || cur === 'knife') return;

    var cam = GAME.player.camera;
    if (!cam) return;

    autoFireRaycaster.setFromCamera({ x: 0, y: 0 }, cam);

    // Get enemy meshes from the enemy manager
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
  };
```

- [ ] **Step 4: Expose enemy manager on GAME in main.js**

In `js/main.js`, find where `enemyManager` is created and add:
```javascript
GAME._enemyManager = enemyManager;
```

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 6: Call touch.update() in main.js game loop**

In `js/main.js`, in the game loop where player update and weapon fire logic runs (around line 4439), add before the firing check:
```javascript
      if (GAME.touch && GAME.touch.update) GAME.touch.update();
```

- [ ] **Step 7: Run all tests again**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add js/touch.js js/main.js tests/unit/touch.test.js
git commit -m "feat(touch): add auto-fire raycasting system"
```

---

### Task 8: Action buttons (jump, crouch, reload)

Add the right-side action buttons that map to existing game controls.

**Files:**
- Modify: `js/touch.js`
- Modify: `index.html` (CSS)
- Test: `tests/unit/touch.test.js`

- [ ] **Step 1: Write failing test for button creation**

Add to `tests/unit/touch.test.js`:
```javascript
describe('Action buttons', () => {
  it('should expose button creation function', () => {
    expect(typeof GAME.touch._createActionButtons).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/touch.test.js`
Expected: FAIL

- [ ] **Step 3: Implement action buttons in touch.js**

Add to `js/touch.js`:

```javascript
  function createActionButtons() {
    var container = document.createElement('div');
    container.id = 'touch-action-buttons';
    document.body.appendChild(container);

    // Jump button
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

    // Crouch button (toggle)
    var crouchBtn = document.createElement('div');
    crouchBtn.className = 'touch-btn';
    crouchBtn.id = 'touch-crouch';
    crouchBtn.textContent = 'CRC';
    container.appendChild(crouchBtn);
    crouchBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (GAME.player) GAME.player.crouching = !GAME.player.crouching;
    }, { passive: false });

    // Reload button
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

  touch._createActionButtons = createActionButtons;
```

In the `if (isMobile)` block, add:
```javascript
    createActionButtons();
```

- [ ] **Step 4: Add button CSS to index.html**

```css
#touch-action-buttons {
  position: fixed; bottom: 10px; right: 10px; z-index: 102;
  display: flex; flex-direction: column; gap: 8px; align-items: flex-end;
}
.touch-btn {
  width: 44px; height: 44px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.6); font-size: 9px; font-weight: bold;
  display: flex; align-items: center; justify-content: center;
  touch-action: none; user-select: none;
}
.touch-btn:active { background: rgba(255,255,255,0.2); }
#touch-reload { border-color: rgba(255,200,0,0.25); color: rgba(255,200,0,0.6); }
```

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add js/touch.js index.html tests/unit/touch.test.js
git commit -m "feat(touch): add jump, crouch, and reload buttons"
```

---

### Task 9: Weapon strip

Add the bottom-center weapon strip for switching weapons by tap.

**Files:**
- Modify: `js/touch.js`
- Modify: `index.html` (CSS)
- Test: `tests/unit/touch.test.js`

- [ ] **Step 1: Write failing test for weapon strip**

Add to `tests/unit/touch.test.js`:
```javascript
describe('Weapon strip', () => {
  it('should expose weapon strip update function', () => {
    expect(typeof GAME.touch._updateWeaponStrip).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/touch.test.js`
Expected: FAIL

- [ ] **Step 3: Implement weapon strip in touch.js**

Add to `js/touch.js`:

```javascript
  var weaponStripEl = null;
  var WEAPON_SLOTS = ['knife', 'pistol', 'smg', 'shotgun', 'rifle', 'awp', 'grenade', 'smoke', 'flash'];
  var WEAPON_LABELS = { knife: 'KNF', pistol: 'USP', smg: 'MP5', shotgun: 'SHG', rifle: 'AK', awp: 'AWP', grenade: 'HE', smoke: 'SMK', flash: 'FL' };
  var grenadeSlotTapped = false; // For two-tap grenade throw

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

          // Grenade two-tap: first tap selects, second tap throws
          var isGrenade = (weaponName === 'grenade' || weaponName === 'smoke' || weaponName === 'flash');
          if (isGrenade && ws.current === weaponName) {
            // Already selected — trigger throw via mouseDown flag
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
      // Check grenade counts
      if (weapon === 'grenade') owned = ws.grenadeCount > 0;
      if (weapon === 'smoke') owned = ws.smokeCount > 0;
      if (weapon === 'flash') owned = ws.flashCount > 0;

      slots[i].style.display = owned ? '' : 'none';
      slots[i].classList.toggle('active', ws.current === weapon);
    }
  }

  touch._updateWeaponStrip = updateWeaponStrip;
```

In the `if (isMobile)` block, add:
```javascript
    createWeaponStrip();
```

In `touch.update()`, add at the end (before the closing of the function):
```javascript
    updateWeaponStrip();
```

- [ ] **Step 4: Add weapon strip CSS to index.html**

```css
#touch-weapon-strip {
  position: fixed; bottom: 4px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 3px; z-index: 102;
}
.touch-weapon-slot {
  width: 36px; height: 28px; border-radius: 3px;
  border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.3); font-size: 7px; font-weight: bold;
  display: flex; align-items: center; justify-content: center;
  touch-action: none; user-select: none;
}
.touch-weapon-slot.active {
  border: 2px solid rgba(255,200,0,0.5); background: rgba(255,200,0,0.1);
  color: rgba(255,200,0,0.8);
}
```

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add js/touch.js index.html tests/unit/touch.test.js
git commit -m "feat(touch): add weapon strip with two-tap grenade throw"
```

---

### Task 10: Pause button and scoreboard toggle

Add mobile-specific pause trigger and scoreboard tap toggle.

**Files:**
- Modify: `js/touch.js`
- Modify: `index.html` (CSS)

- [ ] **Step 1: Implement pause button and scoreboard toggle in touch.js**

Add to `js/touch.js`:

```javascript
  function createPauseButton() {
    var btn = document.createElement('div');
    btn.id = 'touch-pause';
    btn.textContent = '⏸';
    document.body.appendChild(btn);
    btn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      // Simulate Escape key press to trigger existing pause logic
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    }, { passive: false });
  }

  function createScoreboardToggle() {
    // Tap the timer/score area to toggle scoreboard
    var timerEl = document.getElementById('round-timer');
    if (!timerEl) return;
    timerEl.style.pointerEvents = 'auto';
    timerEl.style.cursor = 'pointer';
    timerEl.addEventListener('touchstart', function(e) {
      e.preventDefault();
      // Simulate Tab key for scoreboard toggle
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
      setTimeout(function() {
        document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Tab' }));
      }, 2000); // Show for 2 seconds
    }, { passive: false });
  }
```

In the `if (isMobile)` block, add:
```javascript
    createPauseButton();
    createScoreboardToggle();
```

- [ ] **Step 2: Add pause button CSS to index.html**

```css
#touch-pause {
  position: fixed; top: 8px; right: 8px; z-index: 102;
  width: 36px; height: 36px; border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.4);
  color: rgba(255,255,255,0.6); font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  touch-action: none; user-select: none;
}
```

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add js/touch.js index.html
git commit -m "feat(touch): add pause button and scoreboard toggle"
```

---

### Task 11: Context-adaptive HUD

Toggle HUD elements between essentials and full mode based on game state.

**Files:**
- Modify: `js/touch.js`
- Modify: `index.html` (CSS)

- [ ] **Step 1: Implement HUD mode switching in touch.js**

Add to `js/touch.js`:

```javascript
  var ESSENTIALS_STATES = { PLAYING: 1, DEATHMATCH_ACTIVE: 1, GUNGAME_ACTIVE: 1, SURVIVAL_WAVE: 1, TOURING: 1 };
  var lastHudMode = null;

  function updateHudMode() {
    if (!isMobile) return;
    var state = GAME._gameState;
    if (!state) return;
    var mode = ESSENTIALS_STATES[state] ? 'essentials' : 'full';
    if (mode === lastHudMode) return;
    lastHudMode = mode;
    document.body.classList.toggle('mobile-hud-essentials', mode === 'essentials');
    document.body.classList.toggle('mobile-hud-full', mode === 'full');
  }
```

In `touch.update()`, add:
```javascript
    updateHudMode();
```

- [ ] **Step 2: Expose game state on GAME in main.js**

In `js/main.js`, wherever `gameState` is changed, also set:
```javascript
GAME._gameState = gameState;
```

The cleanest approach: add `GAME._gameState = gameState;` once in the game loop, near the top of each frame before calling updates. This avoids patching ~55 individual `gameState =` assignments:
```javascript
GAME._gameState = gameState;
```

- [ ] **Step 3: Add HUD responsive CSS to index.html**

```css
/* Mobile HUD essentials mode — hide non-essential elements */
.mobile-hud-essentials #money-display,
.mobile-hud-essentials #minimap-container {
  display: none !important;
}
.mobile-hud-essentials #round-timer {
  font-size: 10px; opacity: 0.7;
}
/* Mobile HUD full mode — everything visible */
.mobile-hud-full #money-display,
.mobile-hud-full #minimap-container {
  display: block !important;
}
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add js/touch.js js/main.js index.html
git commit -m "feat(touch): add context-adaptive HUD mode switching"
```

---

### Task 12: Mobile buy menu carousel

Create the swipe carousel buy menu for mobile.

**Files:**
- Modify: `js/touch.js`
- Modify: `index.html` (DOM + CSS)

- [ ] **Step 1: Implement mobile buy carousel in touch.js**

Add to `js/touch.js`:

```javascript
  var buyCarouselEl = null;
  var WEAPON_CATEGORIES = {
    pistol: ['pistol'],
    rifle: ['smg', 'shotgun', 'rifle', 'awp'],
    grenades: ['grenade', 'smoke', 'flash']
  };
  var WEAPON_PRICES = {}; // Populated from GAME.WeaponSystem definitions

  function createBuyCarousel() {
    buyCarouselEl = document.createElement('div');
    buyCarouselEl.id = 'touch-buy-menu';
    buyCarouselEl.style.display = 'none';

    // Category tabs
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

    // Weapon cards container (swipeable)
    var cards = document.createElement('div');
    cards.className = 'touch-buy-cards';
    cards.id = 'touch-buy-cards';
    buyCarouselEl.appendChild(cards);

    // Close button
    var closeBtn = document.createElement('div');
    closeBtn.className = 'touch-buy-close';
    closeBtn.textContent = '✕ Close';
    closeBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      hideBuyCarousel();
    }, { passive: false });
    buyCarouselEl.appendChild(closeBtn);

    document.body.appendChild(buyCarouselEl);

    // Enable horizontal swipe on cards
    var touchStartX = 0;
    cards.addEventListener('touchstart', function(e) {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    cards.addEventListener('touchmove', function(e) {
      // Scrolling handled by overflow-x: auto
    }, { passive: true });
  }

  function showBuyCategory(cat) {
    var cards = document.getElementById('touch-buy-cards');
    if (!cards) return;
    cards.innerHTML = '';

    // Highlight active tab
    var tabs = buyCarouselEl.querySelectorAll('.touch-buy-tab');
    for (var t = 0; t < tabs.length; t++) {
      tabs[t].classList.toggle('active', tabs[t].dataset.cat === cat);
    }

    var weapons = WEAPON_CATEGORIES[cat] || [];
    var ws = GAME.weaponSystem;
    var playerMoney = GAME.player ? GAME.player.money : 0;

    for (var i = 0; i < weapons.length; i++) {
      var w = weapons[i];
      var def = GAME._weaponDefs ? GAME._weaponDefs[w] : null;
      if (!def) continue;

      var card = document.createElement('div');
      card.className = 'touch-buy-card';
      var canAfford = playerMoney >= def.price;
      var owned = ws && ws.owned[w];
      if (!canAfford && !owned) card.classList.add('disabled');

      card.innerHTML =
        '<div class="touch-buy-card-name">' + def.name + '</div>' +
        '<div class="touch-buy-card-price">$' + def.price + '</div>' +
        '<div class="touch-buy-card-stats">' +
          'DMG: ' + def.damage + ' | Rate: ' + def.fireRate +
        '</div>';

      card.addEventListener('touchstart', (function(weaponName) {
        return function(e) {
          e.preventDefault();
          if (GAME.weaponSystem && GAME._buyWeapon) {
            GAME._buyWeapon(weaponName);
          }
        };
      })(w), { passive: false });

      cards.appendChild(card);
    }
  }

  function showBuyCarousel() {
    if (!buyCarouselEl) return;
    buyCarouselEl.style.display = 'flex';
    showBuyCategory('rifle'); // Default to rifles
  }

  function hideBuyCarousel() {
    if (!buyCarouselEl) return;
    buyCarouselEl.style.display = 'none';
  }

  touch._showBuyCarousel = showBuyCarousel;
  touch._hideBuyCarousel = hideBuyCarousel;
```

- [ ] **Step 2: Expose buy function and weapon defs on GAME in main.js**

In `js/main.js`, expose the buy function:
```javascript
GAME._buyWeapon = buyWeapon; // or whatever the existing buy function is named
```

In `js/weapons.js`, expose weapon definitions:
```javascript
GAME._weaponDefs = WEAPON_DEFS;
```

- [ ] **Step 3: Add buy carousel CSS to index.html**

```css
#touch-buy-menu {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.9); z-index: 200;
  display: none; flex-direction: column; align-items: center;
  padding: 12px; box-sizing: border-box; color: #fff;
  font-family: system-ui, sans-serif;
}
.touch-buy-tabs {
  display: flex; gap: 8px; margin-bottom: 12px;
}
.touch-buy-tab {
  padding: 8px 16px; border-radius: 4px;
  background: rgba(255,255,255,0.1); font-size: 12px;
  touch-action: none; user-select: none;
}
.touch-buy-tab.active {
  background: rgba(255,200,0,0.3); color: #ffc800;
}
.touch-buy-cards {
  display: flex; gap: 10px; overflow-x: auto; width: 100%;
  padding: 8px 0; -webkit-overflow-scrolling: touch;
}
.touch-buy-card {
  flex: 0 0 140px; padding: 12px; border-radius: 6px;
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
  touch-action: none; user-select: none;
}
.touch-buy-card.disabled { opacity: 0.4; }
.touch-buy-card-name { font-size: 13px; font-weight: bold; margin-bottom: 4px; }
.touch-buy-card-price { font-size: 12px; color: #4f4; margin-bottom: 6px; }
.touch-buy-card-stats { font-size: 9px; color: rgba(255,255,255,0.5); }
.touch-buy-close {
  margin-top: 12px; padding: 10px 24px; border-radius: 4px;
  background: rgba(255,255,255,0.1); font-size: 13px;
  touch-action: none; user-select: none;
}
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add js/touch.js js/main.js js/weapons.js index.html
git commit -m "feat(touch): add mobile buy menu carousel"
```

---

### Task 13: Auto-open/close buy menu (both platforms)

Make the buy menu automatically open when buy phase starts and close when it ends.

**Files:**
- Modify: `js/main.js`
- Test: `tests/unit/main.test.js`

- [ ] **Step 1: Identify buy phase state transitions in main.js**

Search for where `gameState` is set to `BUY_PHASE` or `SURVIVAL_BUY`. At each of these transitions, add buy menu open logic. At transitions out of those states, add close logic.

- [ ] **Step 2: Implement auto-open/close**

At each `gameState = BUY_PHASE` transition, add:
```javascript
buyMenuOpen = true;
if (GAME.isMobile && GAME.touch._showBuyCarousel) {
  GAME.touch._showBuyCarousel();
} else {
  dom.buyMenu.classList.add('show');
}
```

At each `gameState = PLAYING` (or `SURVIVAL_WAVE`) transition from buy phase, add:
```javascript
buyMenuOpen = false;
if (GAME.isMobile && GAME.touch._hideBuyCarousel) {
  GAME.touch._hideBuyCarousel();
} else {
  dom.buyMenu.classList.remove('show');
}
```

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 4: Manually test in browser**

Open the game on desktop and start a Competitive match. Verify:
- Buy menu opens automatically at round start
- Buy menu closes when buy phase timer expires
- Player can still close it early with `B` key

- [ ] **Step 5: Commit**

```bash
git add js/main.js
git commit -m "feat: auto-open/close buy menu on buy phase (both platforms)"
```

---

### Task 14: Responsive CSS for mobile menus and HUD

Adjust menu buttons, HUD sizing, and overlays for phone screens.

**Files:**
- Modify: `index.html` (CSS)

- [ ] **Step 1: Add mobile viewport and responsive CSS**

Update the existing viewport meta tag in index.html:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

Add responsive CSS for mobile:
```css
/* Mobile-specific styles */
@media (max-height: 500px) and (pointer: coarse) {
  /* Menu buttons — larger tap targets */
  #menu button, .config-diff-btn, .menu-btn {
    min-height: 44px;
    font-size: 14px;
    padding: 10px 20px;
  }

  /* HUD scaling */
  #health-bar, #ammo-display {
    font-size: 11px;
  }

  /* Kill feed */
  #kill-feed {
    font-size: 10px;
  }

  /* Buy menu (desktop version — hidden on mobile) */
  #buy-menu {
    font-size: 11px;
  }

  /* Match end / round end overlays */
  #match-end, #round-end {
    font-size: 12px;
  }
  #match-end button, #round-end button {
    min-height: 44px;
    padding: 10px 24px;
  }
}

/* Hide touch controls on desktop */
@media (pointer: fine) {
  #touch-move-zone, #touch-look-zone, #touch-joystick,
  #touch-action-buttons, #touch-weapon-strip, #touch-pause,
  #touch-buy-menu, #orient-overlay {
    display: none !important;
  }
}
```

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add responsive CSS for mobile menus and HUD"
```

---

### Task 15: Hide touch controls during non-gameplay states

Touch controls (joystick, buttons, weapon strip) should only be visible during active gameplay states.

**Files:**
- Modify: `js/touch.js`

- [ ] **Step 1: Add visibility toggling to touch.js**

Add to the `updateHudMode()` function in touch.js:

```javascript
  function updateTouchControlVisibility() {
    if (!isMobile) return;
    var state = GAME._gameState;
    var showControls = ESSENTIALS_STATES[state] ? true : false;
    // Also show during buy phases (for movement while shopping)
    if (state === 'BUY_PHASE' || state === 'SURVIVAL_BUY') showControls = true;

    var controlIds = ['touch-move-zone', 'touch-look-zone', 'touch-joystick',
                      'touch-action-buttons', 'touch-weapon-strip'];
    for (var i = 0; i < controlIds.length; i++) {
      var el = document.getElementById(controlIds[i]);
      if (el) el.style.display = showControls ? '' : 'none';
    }
  }
```

Call `updateTouchControlVisibility()` inside `touch.update()`.

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add js/touch.js
git commit -m "feat(touch): hide controls during menus and non-gameplay states"
```

---

### Task 16: Update REQUIREMENTS.md

Document all mobile support features in REQUIREMENTS.md per project instructions.

**Files:**
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Add mobile support section to REQUIREMENTS.md**

Add a new section documenting:
- Mobile detection (`GAME.isMobile`)
- Touch control scheme (floating joystick, look zone, auto-fire, action buttons, weapon strip)
- Context-adaptive HUD (essentials vs full mode with state mapping)
- Mobile buy menu carousel
- Auto-open/close buy menu behavior (both platforms)
- Orientation lock (landscape enforcement)
- Pause button and scoreboard toggle
- Responsive CSS

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: add mobile support section to REQUIREMENTS.md"
```

---

### Task 17: Final integration test

Test the full mobile experience end-to-end.

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 2: Desktop regression test**

Open game in desktop browser. Verify:
- No touch controls visible
- Pointer lock works as before
- All game modes function normally
- Buy menu auto-opens/closes on buy phase
- No console errors

- [ ] **Step 3: Mobile test (or Chrome DevTools mobile emulation)**

Open Chrome DevTools → Toggle device toolbar → Select a phone preset (e.g., iPhone 12 Pro). Verify:
- Orientation overlay appears in portrait
- Touch controls appear in landscape
- Joystick moves player
- Swiping right side rotates camera
- Auto-fire works when crosshair is on enemy
- Weapon strip shows owned weapons and allows switching
- Buy carousel opens during buy phase
- Action buttons (jump, crouch, reload) work
- Pause button opens pause menu
- HUD switches between essentials and full mode

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete mobile phone touch control support"
```
