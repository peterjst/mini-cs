# Mobile Manual Fire Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the automatic fire system (raycast aimbot) with a manual fire button on mobile, restoring player agency and skill-based shooting.

**Architecture:** Add a fire button DOM element to the existing action button stack in `js/touch.js`. The button sets `GAME.touchFiring` via touch events with ID tracking (matching the joystick pattern). Remove the entire auto-fire raycast block from `touch.update()` and the grenade auto-throw hack from the weapon strip. No changes needed to `main.js` firing logic — it already checks `(weapons.mouseDown || GAME.touchFiring)`.

**Tech Stack:** Three.js r160.1, vanilla JS (IIFE pattern), Web Audio API, Vitest

**Spec:** `docs/superpowers/specs/2026-03-19-mobile-manual-fire-button-design.md`

---

### Task 1: Add fire button tests

**Files:**
- Modify: `tests/unit/touch.test.js`

- [ ] **Step 1: Replace the auto-fire test with manual fire button tests**

Replace the `Auto-fire` describe block (lines 60-68) and add a new `Fire button` block:

```javascript
describe('Fire button', () => {
  it('should default GAME.touchFiring to false', () => {
    expect(GAME.touchFiring).toBeFalsy();
  });

  it('should reset GAME.touchFiring when player is dead', () => {
    GAME.isMobile = true;
    GAME.touchFiring = true;
    GAME.player = { alive: false, keys: {} };
    GAME.touch.update();
    expect(GAME.touchFiring).toBe(false);
    GAME.isMobile = false;
    delete GAME.player;
  });

  it('should reset GAME.touchFiring when player does not exist', () => {
    GAME.isMobile = true;
    GAME.touchFiring = true;
    GAME.player = null;
    GAME.touch.update();
    expect(GAME.touchFiring).toBe(false);
    GAME.isMobile = false;
    delete GAME.player;
  });

  it('should NOT reset GAME.touchFiring when player is alive', () => {
    GAME.isMobile = true;
    GAME.touchFiring = true;
    GAME.player = { alive: true, keys: {}, camera: null };
    GAME.weaponSystem = { current: 'pistol' };
    GAME.touch.update();
    expect(GAME.touchFiring).toBe(true);
    GAME.isMobile = false;
    GAME.touchFiring = false;
    delete GAME.player;
    delete GAME.weaponSystem;
  });

  it('should not auto-fire via raycast (auto-fire removed)', () => {
    GAME.isMobile = true;
    GAME.player = { alive: true, keys: {}, camera: {} };
    GAME.weaponSystem = { current: 'rifle' };
    GAME._enemyManager = { enemies: [{ alive: true, mesh: {} }] };
    GAME.touch.update();
    // touchFiring should remain whatever it was — no raycast sets it
    expect(GAME.touchFiring).toBeFalsy();
    GAME.isMobile = false;
    delete GAME.player;
    delete GAME.weaponSystem;
    delete GAME._enemyManager;
  });
});

describe('Grenade weapon strip behavior', () => {
  it('should not auto-throw when tapping already-selected grenade', () => {
    // After removing the auto-throw hack, tapping a selected grenade
    // should just call switchTo, not set mouseDown
    var ws = { current: 'grenade', mouseDown: false, switchTo: function() {} };
    GAME.weaponSystem = ws;
    // Simulate what the weapon strip handler does after hack removal:
    // it just calls ws.switchTo(weaponName)
    ws.switchTo('grenade');
    expect(ws.mouseDown).toBe(false);
    delete GAME.weaponSystem;
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: failures — `GAME.touchFiring` is still reset to false every frame by auto-fire code, and the "should NOT reset when player is alive" test will fail because the raycast code resets it.

- [ ] **Step 3: Commit the failing tests**

```bash
git add tests/unit/touch.test.js
git commit -m "test: add fire button tests, replace auto-fire test"
```

---

### Task 2: Remove auto-fire and add safety reset

**Files:**
- Modify: `js/touch.js:461-501` (the `touch.update` function)

- [ ] **Step 1: Replace the `touch.update()` function body**

Replace lines 461-502 of `js/touch.js` with:

```javascript
  touch.update = function() {
    if (!GAME.isMobile) return;

    updateHudMode();
    updateTouchControlVisibility();

    // Safety reset: clear fire flag when player is dead or missing
    if (!GAME.player || !GAME.player.alive) {
      GAME.touchFiring = false;
    }

    updateWeaponStrip();
  };
```

This removes:
- The `autoFireRaycaster` lazy init and raycast logic
- The enemy mesh gathering loop
- The `GAME.touchFiring = false` blanket reset (now only resets on death/missing)
- The grenade/knife exclusion guard

- [ ] **Step 2: Remove the `autoFireRaycaster` variable declaration**

Find and delete the line `var autoFireRaycaster = null;` (around line 183 of `js/touch.js`).

- [ ] **Step 3: Run tests to verify they pass**

Run: `npm test`
Expected: all tests pass, including the new fire button tests.

- [ ] **Step 4: Commit**

```bash
git add js/touch.js
git commit -m "feat(mobile): remove auto-fire raycast from touch.update()"
```

---

### Task 3: Add fire button DOM element and CSS

**Files:**
- Modify: `js/touch.js:185-222` (the `createActionButtons` function)
- Modify: `index.html` (CSS section near line 1341)

- [ ] **Step 1: Add `#touch-fire` CSS to `index.html`**

After the `#touch-reload` rule (line 1349), add:

```css
  #touch-fire {
    width: 64px; height: 64px; font-size: 11px;
    border-color: rgba(255,80,80,0.4); color: rgba(255,80,80,0.7);
  }
  #touch-fire:active { background: rgba(255,80,80,0.5); }
```

The button inherits `.touch-btn` styles (border-radius, touch-action, user-select, etc.) and overrides size and color.

- [ ] **Step 2: Add fire button creation and touch event handling in `createActionButtons()`**

In `js/touch.js`, add a `_fireTouchId` variable near the top of the IIFE (after the `joystickTouchId` declaration around line 49):

```javascript
  var _fireTouchId = null;
```

Then in `createActionButtons()`, insert the fire button as the first child of the container (before the jump button creation, after `document.body.appendChild(container)` at line 187):

```javascript
    var fireBtn = document.createElement('div');
    fireBtn.className = 'touch-btn';
    fireBtn.id = 'touch-fire';
    fireBtn.textContent = 'FIRE';
    container.appendChild(fireBtn);
    fireBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      e.stopPropagation();
      _fireTouchId = e.changedTouches[0].identifier;
      GAME.touchFiring = true;
    }, { passive: false });
    document.addEventListener('touchend', function(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === _fireTouchId) {
          e.preventDefault();
          GAME.touchFiring = false;
          _fireTouchId = null;
          return;
        }
      }
    }, { passive: false });
    document.addEventListener('touchcancel', function(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === _fireTouchId) {
          e.preventDefault();
          GAME.touchFiring = false;
          _fireTouchId = null;
          return;
        }
      }
    }, { passive: false });
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add js/touch.js index.html
git commit -m "feat(mobile): add manual fire button with touch ID tracking"
```

---

### Task 4: Remove grenade auto-throw hack

**Files:**
- Modify: `js/touch.js:241-256` (weapon strip touch handler)

- [ ] **Step 1: Remove the grenade auto-throw logic from weapon strip**

In the weapon strip `touchstart` handler (inside `createWeaponStrip()`), remove lines 247-252 (includes closing brace):

```javascript
          var isGrenade = (weaponName === 'grenade' || weaponName === 'smoke' || weaponName === 'flash');
          if (isGrenade && ws.current === weaponName) {
            ws.mouseDown = true;
            setTimeout(function() { ws.mouseDown = false; }, 100);
            return;
          }
```

After removal, tapping a grenade slot only calls `ws.switchTo(weaponName)` — the player uses the fire button to throw, consistent with all weapons.

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add js/touch.js
git commit -m "fix(mobile): remove grenade auto-throw hack, use fire button instead"
```

---

### Task 5: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md:1827-1868`

- [ ] **Step 1: Replace the Auto-Fire System section**

Replace lines 1827-1832 with:

```markdown
### Manual Fire Button
- `<div id="touch-fire">` — 64x64px red-tinted circle, first in action button stack
- `touchstart` on button → `GAME.touchFiring = true` (tracks touch ID via `_fireTouchId`)
- `touchend` / `touchcancel` on `document` → if matching touch ID, `GAME.touchFiring = false`
- `e.stopPropagation()` prevents look zone from capturing fire touches
- Safety reset: `GAME.touchFiring = false` in `touch.update()` when player is dead or missing
- Fire logic in `main.js` checks `(weapons.mouseDown || GAME.touchFiring)` (unchanged)
- `tryFire()` pointer lock check bypassed on mobile
- Grenade/knife: weapon strip taps only switch weapon; fire button throws/swings
```

- [ ] **Step 2: Update the Exposed APIs section**

In the "Exposed APIs for Touch Module" section (line 1861-1868):
- Change `GAME.touchFiring` description from "boolean flag for auto-fire" to "boolean flag set by manual fire button"
- Remove `GAME._enemyManager` line (no longer consumed by touch module)

- [ ] **Step 3: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: update REQUIREMENTS.md for manual fire button"
```

---

### Task 6: Manual smoke test

- [ ] **Step 1: Open the game on a mobile device or browser DevTools mobile emulation**

Open `index.html`, enable touch simulation in Chrome DevTools (toggle device toolbar), select a phone like iPhone 14 Pro.

- [ ] **Step 2: Verify fire button appears**

Confirm: red-tinted "FIRE" button visible in the right-side action button stack, above JMP/CRC/RLD.

- [ ] **Step 3: Verify manual firing works**

Start a game. Aim at an enemy. Confirm:
- Gun does NOT fire automatically when crosshair is on enemy
- Holding FIRE button fires the weapon
- Releasing FIRE button stops firing
- Semi-auto weapons (pistol, AWP) fire once per tap
- Auto weapons (SMG, rifle) sustain fire while held

- [ ] **Step 4: Verify grenade throwing**

Switch to grenade via weapon strip. Confirm:
- Tapping grenade slot switches to grenade (does NOT throw)
- Pressing FIRE button throws the grenade

- [ ] **Step 5: Verify no stuck firing**

Confirm: holding fire button while dying → respawn does NOT auto-fire.
