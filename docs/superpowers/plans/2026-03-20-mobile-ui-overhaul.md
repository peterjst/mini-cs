# Mobile UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the mobile touch UI for better looks and ergonomics — tap-to-fire, owned-only weapon strip, flat grid buy menu, CS:GO Classic visual polish.

**Architecture:** Incremental in-place changes to `js/touch.js` (gesture detection, weapon strip, buy menu), `index.html` (CSS), `js/weapons.js` (display names), and `js/main.js` (buy menu states, bottom info bar). Each task is self-contained and independently testable.

**Tech Stack:** Vanilla JS (IIFE pattern), CSS in `index.html`, Three.js r160.1, Web Audio API, Vitest for tests.

**Spec:** `docs/superpowers/specs/2026-03-20-mobile-ui-overhaul-design.md`

---

### Task 1: Rename Weapon Display Names

**Files:**
- Modify: `js/weapons.js:234-242` (WEAPON_DEFS name fields)
- Modify: `index.html:1737-1765` (desktop buy menu item names)
- Modify: `js/main.js` (armor label logic in updateBuyMenu, ~lines 3906-3918)
- Test: `tests/unit/touch.test.js` (add name verification tests)
- Modify: `REQUIREMENTS.md` (update weapon names)

- [ ] **Step 1: Write failing tests for new weapon names**

Add to `tests/unit/touch.test.js`:

```javascript
describe('Weapon display names', () => {
  it('should use short display names', () => {
    var DEFS = GAME.WEAPON_DEFS;
    expect(DEFS.pistol.name).toBe('Pistol');
    expect(DEFS.smg.name).toBe('MP5');
    expect(DEFS.shotgun.name).toBe('Shotgun');
    expect(DEFS.rifle.name).toBe('AK-47');
    expect(DEFS.awp.name).toBe('AWP');
    expect(DEFS.grenade.name).toBe('Grenade');
    expect(DEFS.smoke.name).toBe('Smoke');
    expect(DEFS.flash.name).toBe('Flashbang');
    expect(DEFS.knife.name).toBe('Knife');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — names still have old values like "Pistol (USP)", "SMG (MP5)", etc.

- [ ] **Step 3: Update weapon names in js/weapons.js**

In `js/weapons.js` lines 234-242, change the `name` fields:

| Old | New |
|-----|-----|
| `'Knife'` | `'Knife'` (no change) |
| `'Pistol (USP)'` | `'Pistol'` |
| `'SMG (MP5)'` | `'MP5'` |
| `'Shotgun (Nova)'` | `'Shotgun'` |
| `'Rifle (AK-47)'` | `'AK-47'` |
| `'AWP'` | `'AWP'` (no change) |
| `'HE Grenade'` | `'Grenade'` |
| `'Smoke Grenade'` | `'Smoke'` |
| `'Flashbang'` | `'Flashbang'` (no change) |

- [ ] **Step 4: Update desktop buy menu HTML in index.html**

In `index.html` around lines 1736-1765, update the `.item-name` spans:

| Old | New |
|-----|-----|
| `SMG (MP5)` | `MP5` |
| `Shotgun (Nova)` | `Shotgun` |
| `Rifle (AK-47)` | `AK-47` |
| `Kevlar + Helmet` | `Armor` |
| `HE Grenade` | `Grenade` |
| `Smoke Grenade` | `Smoke` |

- [ ] **Step 5: Update armor labels in js/main.js updateBuyMenu()**

In `js/main.js` around lines 3906-3918, update the armor label strings:

| Old | New |
|-----|-----|
| `'Kevlar + Helmet'` | `'Armor + Helmet'` |
| `'Helmet'` | `'Helmet'` (no change) |
| `'Kevlar'` | `'Armor'` |

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 7: Update REQUIREMENTS.md**

Update weapon name references throughout REQUIREMENTS.md to use the new short names.

- [ ] **Step 8: Commit**

```bash
git add js/weapons.js index.html js/main.js tests/unit/touch.test.js REQUIREMENTS.md
git commit -m "refactor: shorten weapon display names for mobile and desktop consistency"
```

---

### Task 2: Visual Polish — CSS Updates (Unified Button Style, Bottom Info Bar)

**Files:**
- Modify: `index.html:1317-1500` (touch control CSS)
- Modify: `index.html` (add bottom info bar HTML element near health-bar, ~line 1672)
- Modify: `js/main.js` (updateHUD to populate bottom info bar on mobile)
- Test: `tests/unit/touch.test.js` (add bottom info bar tests)
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Write failing tests for bottom info bar**

Add to `tests/unit/touch.test.js`:

```javascript
describe('Bottom info bar', () => {
  it('should expose updateBottomBar function', () => {
    expect(typeof GAME.touch._updateBottomBar).toBe('function');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `_updateBottomBar` not defined yet

- [ ] **Step 3: Update touch button CSS in index.html**

Update CSS for unified dark glass style. Changes to make in `index.html`:

**`.touch-btn`** (~line 1341): Change to:
```css
.touch-btn {
  width: 48px; height: 48px; border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.5);
  color: rgba(255,255,255,0.5); font-size: 18px; font-weight: bold;
  display: flex; align-items: center; justify-content: center;
  touch-action: none; user-select: none;
}
.touch-btn:active { border-color: rgba(255,255,255,0.5); background: rgba(0,0,0,0.3); }
```

**`#touch-reload`** (~line 1349): Change to:
```css
#touch-reload { border-color: rgba(255,200,0,0.35); color: rgba(255,200,0,0.6); }
```

**Remove `#touch-fire` CSS** (~lines 1350-1354): Delete the fire button styles entirely.

**`#touch-action-buttons`** (~line 1338): Change to:
```css
#touch-action-buttons {
  position: fixed; bottom: 56px; right: 20px; z-index: 102;
  display: flex; flex-direction: column; gap: 12px; align-items: center;
}
```

**`#touch-pause`** (~line 1370): Change to:
```css
#touch-pause {
  position: fixed; top: 8px; right: 8px; z-index: 102;
  width: 40px; height: 40px; border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.5);
  color: rgba(255,255,255,0.6); font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  touch-action: none; user-select: none;
}
```

**`#touch-fullscreen`** (~line 1396): Change background to `rgba(0,0,0,0.5)`.

**Weapon strip** (~line 1355): Update position:
```css
#touch-weapon-strip {
  position: fixed; bottom: 46px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 6px; z-index: 102;
}
```

**`.touch-weapon-slot`** (~line 1359): Update sizes:
```css
.touch-weapon-slot {
  width: 48px; height: 34px; border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.5);
  color: rgba(255,255,255,0.4); font-size: 10px; font-weight: bold;
  display: flex; align-items: center; justify-content: center;
  position: relative; touch-action: none; user-select: none;
}
```

**`.touch-weapon-slot.active`** (~line 1366):
```css
.touch-weapon-slot.active {
  border: 2px solid rgba(255,200,0,0.6); background: rgba(255,200,0,0.1);
  color: rgba(255,200,0,0.9);
}
```

**Round timer**: In `@media (pointer: coarse)` section, add:
```css
#round-timer { font-size: 12px; font-family: monospace; }
```

- [ ] **Step 4: Add bottom info bar CSS**

Add new CSS in `index.html` (in the touch controls CSS section):

```css
#touch-bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0; height: 40px;
  background: rgba(0,0,0,0.6); z-index: 102;
  display: flex; align-items: center; padding: 0 14px;
  font-family: monospace; box-sizing: border-box;
}
#touch-bottom-hp { color: #4caf50; font-size: 15px; font-weight: bold; }
#touch-bottom-hp-icon { color: #4caf50; font-size: 10px; margin-right: 6px; }
#touch-bottom-ammo { margin-left: auto; }
#touch-bottom-ammo-mag { color: rgba(255,255,255,0.9); font-size: 14px; font-weight: bold; }
#touch-bottom-ammo-reserve { color: rgba(255,255,255,0.35); font-size: 11px; margin-left: 4px; }
```

Add to `@media (pointer: fine)` hide list: `#touch-bottom-bar`.

- [ ] **Step 5: Add bottom info bar creation in js/touch.js**

Add a `createBottomBar()` function and `updateBottomBar()` function in `js/touch.js`, after the `createPauseButton()` function (~line 308):

```javascript
var bottomBarEl = null;
var bottomHpEl = null;
var bottomAmmoMagEl = null;
var bottomAmmoReserveEl = null;

function createBottomBar() {
  bottomBarEl = document.createElement('div');
  bottomBarEl.id = 'touch-bottom-bar';

  var hpIcon = document.createElement('span');
  hpIcon.id = 'touch-bottom-hp-icon';
  hpIcon.textContent = '+';
  bottomBarEl.appendChild(hpIcon);

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

  var sep = document.createElement('span');
  sep.textContent = ' / ';
  sep.style.color = 'rgba(255,255,255,0.35)';
  sep.style.fontSize = '11px';
  ammoWrap.appendChild(sep);

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
  // Color-code health: green > yellow > red
  var hpColor = hp > 50 ? '#4caf50' : hp > 25 ? '#ffeb3b' : '#ff4444';
  bottomHpEl.style.color = hpColor;
  var hpIcon = document.getElementById('touch-bottom-hp-icon');
  if (hpIcon) hpIcon.style.color = hpColor;

  var ws = GAME.weaponSystem;
  var def = GAME.WEAPON_DEFS[ws.current];
  if (!def) return;
  if (def.isKnife) {
    bottomAmmoMagEl.textContent = '—';
    bottomAmmoReserveEl.textContent = '';
  } else if (def.isGrenade) {
    var count = ws.current === 'grenade' ? ws.grenadeCount :
                ws.current === 'smoke' ? ws.smokeCount : ws.flashCount;
    bottomAmmoMagEl.textContent = '×' + count;
    bottomAmmoReserveEl.textContent = '';
  } else {
    bottomAmmoMagEl.textContent = ws.ammo;
    bottomAmmoReserveEl.textContent = ws.reserveAmmo;
  }
}
```

Add `createBottomBar()` call in the init block (~line 511, after `createBuyCarousel()`).

Add `updateBottomBar()` call in `touch.update()` (~line 495, after `updateWeaponStrip()`).

Expose for testing: add `_updateBottomBar: updateBottomBar` to the touch object (~line 481).

Add `'touch-bottom-bar'` to the hiddenIds array (~line 514).

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 7: Update REQUIREMENTS.md**

Document the new bottom info bar, unified button styling, updated weapon strip sizes.

- [ ] **Step 8: Commit**

```bash
git add index.html js/touch.js js/main.js tests/unit/touch.test.js REQUIREMENTS.md
git commit -m "feat(mobile): add bottom info bar and unify touch button styling"
```

---

### Task 3: Tap-to-Fire on Look Zone

**Files:**
- Modify: `js/touch.js:138-217` (look zone handlers, remove fire button)
- Modify: `index.html` (remove `#touch-fire` CSS)
- Test: `tests/unit/touch.test.js` (tap-to-fire gesture tests)
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Write failing tests for tap-to-fire**

Add to `tests/unit/touch.test.js`:

```javascript
describe('Tap-to-fire gesture detection', () => {
  it('should expose tap-to-fire constants', () => {
    expect(typeof GAME.touch._TAP_TIME_THRESHOLD).toBe('number');
    expect(typeof GAME.touch._TAP_MOVE_THRESHOLD).toBe('number');
    expect(typeof GAME.touch._HOLD_FIRE_DELAY).toBe('number');
  });

  it('should have correct tap-to-fire thresholds', () => {
    expect(GAME.touch._TAP_TIME_THRESHOLD).toBe(150);
    expect(GAME.touch._TAP_MOVE_THRESHOLD).toBe(10);
    expect(GAME.touch._HOLD_FIRE_DELAY).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — constants not defined yet

- [ ] **Step 3: Implement tap-to-fire in look zone**

In `js/touch.js`, replace the `createLookZone()` function (~lines 138-179) with a new version that adds gesture detection:

```javascript
var TAP_TIME_THRESHOLD = 150;   // ms — quick tap = single shot
var TAP_MOVE_THRESHOLD = 10;    // px — movement beyond this = drag (no fire)
var HOLD_FIRE_DELAY = 200;      // ms — hold still this long = auto-fire

function createLookZone() {
  var zone = document.createElement('div');
  zone.id = 'touch-look-zone';
  document.body.appendChild(zone);

  var lookStartX = 0;
  var lookStartY = 0;
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
      lookStartX = t.clientX;
      lookStartY = t.clientY;
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

      // If we were dragging and stopped, restart hold-fire timer
      // (handled by checking movement in the timer — simplified: restart timer on each move)
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

      // Quick tap = single shot
      if (elapsed < TAP_TIME_THRESHOLD && totalMovement < TAP_MOVE_THRESHOLD) {
        GAME.touchTap = true; // Signal single shot to main.js
      }

      lookTouchId = null;
    }
  }
  zone.addEventListener('touchend', lookEnd);
  zone.addEventListener('touchcancel', lookEnd);
}
```

- [ ] **Step 4: Remove fire button from createActionButtons()**

In `js/touch.js` `createActionButtons()` (~lines 187-217), remove the fire button creation and its touch event listeners entirely. Keep jump, crouch, reload.

- [ ] **Step 5: Update action button icons**

In `createActionButtons()`, change button text content:

| Old | New |
|-----|-----|
| `'JMP'` | `'∧'` |
| `'CRC'` | `'∨'` |
| `'RLD'` | `'↻'` |

- [ ] **Step 6: Handle touchTap signal in js/main.js**

In `js/main.js`, in the game loop where `GAME.touchFiring` is checked, add handling for `GAME.touchTap`:

```javascript
// After existing touchFiring check:
if (GAME.touchTap) {
  weapons.fireOnce(); // or equivalent single-shot trigger
  GAME.touchTap = false;
}
```

Find where `GAME.touchFiring` is read in main.js (likely in the shooting/weapon update logic) and add the tap handling there.

- [ ] **Step 7: Expose constants for testing**

In the touch object (~line 470), add:
```javascript
_TAP_TIME_THRESHOLD: TAP_TIME_THRESHOLD,
_TAP_MOVE_THRESHOLD: TAP_MOVE_THRESHOLD,
_HOLD_FIRE_DELAY: HOLD_FIRE_DELAY,
```

- [ ] **Step 8: Remove #touch-fire CSS from index.html**

Delete the `#touch-fire` CSS block (~lines 1350-1354).

- [ ] **Step 9: Update existing fire button tests**

In `tests/unit/touch.test.js`, update the "Fire button" describe block:
- Remove tests that reference the fire button directly
- Update the "should default GAME.touchFiring to false" test (keep as-is, still valid)
- Update "should reset GAME.touchFiring when player is dead" (keep as-is)
- Add test for touchTap flag:

```javascript
it('should default GAME.touchTap to falsy', () => {
  expect(GAME.touchTap).toBeFalsy();
});
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 11: Update REQUIREMENTS.md**

Document tap-to-fire gesture detection, icon buttons, removal of fire button.

- [ ] **Step 12: Commit**

```bash
git add js/touch.js js/main.js index.html tests/unit/touch.test.js REQUIREMENTS.md
git commit -m "feat(mobile): replace fire button with tap-to-fire on look zone"
```

---

### Task 4: Weapon Strip — Owned Only with Grenade Badges

**Files:**
- Modify: `js/touch.js:254-297` (weapon strip creation and update)
- Test: `tests/unit/touch.test.js` (owned-only and badge tests)
- Modify: `index.html` (grenade badge CSS)
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Write failing tests**

Add to `tests/unit/touch.test.js`:

```javascript
describe('Weapon strip owned-only rendering', () => {
  it('should expose createWeaponStrip function', () => {
    expect(typeof GAME.touch._createWeaponStrip).toBe('function');
  });

  it('should expose WEAPON_LABELS for testing', () => {
    expect(GAME.touch._WEAPON_LABELS).toBeDefined();
    expect(GAME.touch._WEAPON_LABELS.knife).toBe('KNF');
    expect(GAME.touch._WEAPON_LABELS.rifle).toBe('AK');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `_createWeaponStrip` and `_WEAPON_LABELS` not exposed yet

- [ ] **Step 3: Add grenade badge CSS to index.html**

Add in the touch controls CSS section:

```css
.touch-weapon-badge {
  position: absolute; top: -4px; right: -4px;
  width: 14px; height: 14px; border-radius: 50%;
  background: rgba(255,200,0,0.7); color: #000;
  font-size: 8px; font-weight: bold;
  display: flex; align-items: center; justify-content: center;
}
```

- [ ] **Step 4: Update weapon strip to show owned only with badges**

Replace `updateWeaponStrip()` in `js/touch.js` (~lines 283-297):

```javascript
function updateWeaponStrip() {
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
        badge.textContent = count;
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
```

Also simplify `createWeaponStrip()` — it no longer needs to pre-create all 9 slots since `updateWeaponStrip()` rebuilds dynamically:

```javascript
function createWeaponStrip() {
  weaponStripEl = document.createElement('div');
  weaponStripEl.id = 'touch-weapon-strip';
  document.body.appendChild(weaponStripEl);
}
```

- [ ] **Step 5: Expose new functions for testing**

Add to the touch object:
```javascript
_createWeaponStrip: createWeaponStrip,
_WEAPON_LABELS: WEAPON_LABELS,
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 7: Update REQUIREMENTS.md**

Document owned-only weapon strip, grenade count badges, new slot sizes.

- [ ] **Step 8: Commit**

```bash
git add js/touch.js index.html tests/unit/touch.test.js REQUIREMENTS.md
git commit -m "feat(mobile): show only owned weapons in strip with grenade count badges"
```

---

### Task 5: Buy Menu — Flat Grid with Item States

**Files:**
- Modify: `js/touch.js:355-467` (buy menu creation and rendering)
- Modify: `index.html` (buy menu CSS)
- Test: `tests/unit/touch.test.js` (buy menu state tests)
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Write failing tests**

Add to `tests/unit/touch.test.js`:

```javascript
describe('Buy menu flat grid', () => {
  it('should expose buy menu item names map', () => {
    expect(GAME.touch._BUY_MENU_NAMES).toBeDefined();
    expect(GAME.touch._BUY_MENU_NAMES.pistol).toBe('Pistol');
    expect(GAME.touch._BUY_MENU_NAMES.smg).toBe('MP5');
    expect(GAME.touch._BUY_MENU_NAMES.rifle).toBe('AK-47');
  });

  it('should expose all buyable items list', () => {
    expect(GAME.touch._BUY_ITEMS).toBeDefined();
    expect(GAME.touch._BUY_ITEMS.length).toBeGreaterThanOrEqual(10);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `_BUY_MENU_NAMES` and `_BUY_ITEMS` not defined yet

- [ ] **Step 3: Update buy menu CSS in index.html**

Replace the buy menu CSS (~lines 1426-1461) with:

```css
#touch-buy-menu {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.92); z-index: 200;
  display: none; flex-direction: column;
  padding: 14px; box-sizing: border-box; color: #fff;
  font-family: system-ui, sans-serif;
}
.touch-buy-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px; flex-shrink: 0;
}
.touch-buy-header-label {
  color: rgba(255,255,255,0.4); font-size: 12px; font-weight: bold; letter-spacing: 1px;
}
.touch-buy-header-money {
  color: #4caf50; font-size: 18px; font-weight: bold; font-family: monospace;
}
.touch-buy-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; flex: 1;
}
.touch-buy-card {
  padding: 8px 10px; border-radius: 6px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  display: flex; flex-direction: column; justify-content: center;
  touch-action: none; user-select: none;
}
.touch-buy-card.owned {
  border-left: 3px solid rgba(255,200,0,0.6);
}
.touch-buy-card.too-expensive {
  background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.06);
  opacity: 0.35; pointer-events: none;
}
.touch-buy-card-name { font-size: 13px; font-weight: bold; color: rgba(255,255,255,0.9); }
.touch-buy-card-price { font-size: 11px; margin-top: 3px; }
.touch-buy-card-price.available { color: #4caf50; }
.touch-buy-card-price.owned { color: rgba(255,255,255,0.25); }
.touch-buy-card-price.expensive { color: #ff4444; }
.touch-buy-owned-badge {
  font-size: 7px; color: rgba(255,200,0,0.8); font-weight: bold;
  background: rgba(255,200,0,0.12); padding: 2px 4px; border-radius: 3px;
  flex-shrink: 0;
}
.touch-buy-close-cell {
  padding: 8px 10px; border-radius: 6px;
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.5); font-size: 13px; font-weight: bold;
  touch-action: none; user-select: none;
}
```

Remove old `.touch-buy-tabs`, `.touch-buy-tab`, `.touch-buy-cards`, `.touch-buy-card-stats` CSS.

- [ ] **Step 4: Rewrite buy menu creation and rendering**

Replace `createBuyCarousel()`, `showBuyCategory()`, `showBuyCarousel()`, and `hideBuyCarousel()` in `js/touch.js` (~lines 355-467):

```javascript
var BUY_MENU_NAMES = {
  knife: 'Knife', pistol: 'Pistol', smg: 'MP5', shotgun: 'Shotgun',
  rifle: 'AK-47', awp: 'AWP', grenade: 'Grenade', smoke: 'Smoke',
  flash: 'Flashbang', armor: 'Armor'
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
      var hasVest = GAME.player && GAME.player.armor > 0;
      var hasHelmet = GAME.player && GAME.player.helmet;
      if (hasVest && hasHelmet) {
        isOwned = true;
        displayName = 'Armor + Helmet';
        price = 0;
      } else if (hasVest && !hasHelmet) {
        displayName = 'Helmet';
        price = 350;
      } else {
        displayName = 'Armor';
        price = 650;
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

    var canAfford = playerMoney >= price;

    if (isOwned) {
      card.classList.add('owned');
      card.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:4px;">' +
          '<span class="touch-buy-card-name">' + displayName + '</span>' +
          '<span class="touch-buy-owned-badge">OWNED</span>' +
        '</div>' +
        '<div class="touch-buy-card-price owned">' + (price > 0 ? '$' + price : '—') + '</div>';
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
  closeCell.textContent = '✕ CLOSE';
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
```

- [ ] **Step 5: Expose new constants for testing**

Add to the touch object:
```javascript
_BUY_MENU_NAMES: BUY_MENU_NAMES,
_BUY_ITEMS: BUY_ITEMS,
_renderBuyGrid: renderBuyGrid,
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 7: Update REQUIREMENTS.md**

Document flat grid buy menu, 3 item states, armor logic, close button.

- [ ] **Step 8: Commit**

```bash
git add js/touch.js index.html tests/unit/touch.test.js REQUIREMENTS.md
git commit -m "feat(mobile): replace buy carousel with flat grid showing item states"
```

---

### Task 6: Integration Testing and Final Polish

**Files:**
- Test: `tests/unit/touch.test.js` (integration tests)
- Modify: `REQUIREMENTS.md` (final review)

- [ ] **Step 1: Write integration tests**

Add comprehensive tests to `tests/unit/touch.test.js`:

```javascript
describe('Mobile UI integration', () => {
  it('should expose all new touch module functions', () => {
    expect(typeof GAME.touch._updateBottomBar).toBe('function');
    expect(typeof GAME.touch._createWeaponStrip).toBe('function');
    expect(typeof GAME.touch._renderBuyGrid).toBe('function');
  });

  it('should have tap-to-fire constants in valid ranges', () => {
    expect(GAME.touch._TAP_TIME_THRESHOLD).toBeGreaterThan(50);
    expect(GAME.touch._TAP_TIME_THRESHOLD).toBeLessThan(500);
    expect(GAME.touch._TAP_MOVE_THRESHOLD).toBeGreaterThan(3);
    expect(GAME.touch._TAP_MOVE_THRESHOLD).toBeLessThan(30);
    expect(GAME.touch._HOLD_FIRE_DELAY).toBeGreaterThan(100);
    expect(GAME.touch._HOLD_FIRE_DELAY).toBeLessThan(500);
  });

  it('should have all weapon labels defined', () => {
    var labels = GAME.touch._WEAPON_LABELS;
    expect(labels.knife).toBe('KNF');
    expect(labels.pistol).toBe('USP');
    expect(labels.smg).toBe('MP5');
    expect(labels.shotgun).toBe('SHG');
    expect(labels.rifle).toBe('AK');
    expect(labels.awp).toBe('AWP');
    expect(labels.grenade).toBe('HE');
    expect(labels.smoke).toBe('SMK');
    expect(labels.flash).toBe('FL');
  });

  it('should have all buy menu names defined', () => {
    var names = GAME.touch._BUY_MENU_NAMES;
    expect(names.pistol).toBe('Pistol');
    expect(names.smg).toBe('MP5');
    expect(names.shotgun).toBe('Shotgun');
    expect(names.rifle).toBe('AK-47');
    expect(names.awp).toBe('AWP');
    expect(names.grenade).toBe('Grenade');
    expect(names.smoke).toBe('Smoke');
    expect(names.flash).toBe('Flashbang');
    expect(names.armor).toBe('Armor');
    expect(names.knife).toBe('Knife');
  });

  it('should list all buyable items', () => {
    var items = GAME.touch._BUY_ITEMS;
    expect(items).toContain('pistol');
    expect(items).toContain('smg');
    expect(items).toContain('rifle');
    expect(items).toContain('awp');
    expect(items).toContain('armor');
    expect(items).toContain('grenade');
    expect(items).toContain('smoke');
    expect(items).toContain('flash');
    expect(items).toContain('knife');
  });
});
```

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests PASS (existing + new)

- [ ] **Step 3: Final REQUIREMENTS.md review**

Read through REQUIREMENTS.md and ensure all mobile UI sections are fully updated to reflect every change made in Tasks 1-5.

- [ ] **Step 4: Commit**

```bash
git add tests/unit/touch.test.js REQUIREMENTS.md
git commit -m "test(mobile): add integration tests for mobile UI overhaul"
```
