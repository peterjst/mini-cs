# Mobile Fire Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a large floating FIRE button to the mobile touch HUD that enables controlled burst fire with auto weapons.

**Architecture:** A new `#touch-fire` button element created in `js/touch.js`, styled in `index.html`, using a separate `GAME.touchFireButton` flag (independent from `GAME.touchFiring`) so that holding the fire button while dragging to aim on the look zone works correctly. The main game loop's two fire conditions add `|| GAME.touchFireButton`.

**Tech Stack:** Vanilla JS, DOM touch events, CSS

**Spec:** `docs/superpowers/specs/2026-03-20-mobile-fire-button-design.md`

---

### Task 1: Add `GAME.touchFireButton` flag and update fire conditions in main.js

**Files:**
- Modify: `js/main.js:467-468` (flag initialization)
- Modify: `js/main.js:4404` (warmup fire condition)
- Modify: `js/main.js:4536` (gameplay fire condition)

- [ ] **Step 1: Write failing tests**

Add to `tests/unit/main.test.js` — tests that `GAME.touchFireButton` exists and that the fire conditions reference it. Find the existing test patterns in the file first, then add:

```javascript
describe('Touch fire button flag', () => {
  it('should initialize GAME.touchFireButton to false', () => {
    expect(GAME.touchFireButton).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/unit/main.test.js`
Expected: FAIL — `GAME.touchFireButton` is undefined

- [ ] **Step 3: Add flag initialization**

In `js/main.js` at line 468 (after `GAME.touchTap = false;`), add:

```javascript
  GAME.touchFireButton = false;
```

- [ ] **Step 4: Update warmup fire condition**

In `js/main.js` at line 4404, change:

```javascript
      if ((weapons.mouseDown || GAME.touchFiring) && player.alive) {
```

to:

```javascript
      if ((weapons.mouseDown || GAME.touchFiring || GAME.touchFireButton) && player.alive) {
```

- [ ] **Step 5: Update gameplay fire condition**

In `js/main.js` at line 4536, change:

```javascript
      if ((weapons.mouseDown || GAME.touchFiring) && player.alive) {
```

to:

```javascript
      if ((weapons.mouseDown || GAME.touchFiring || GAME.touchFireButton) && player.alive) {
```

- [ ] **Step 6: Run tests to verify pass**

Run: `npm test -- tests/unit/main.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add js/main.js tests/unit/main.test.js
git commit -m "feat(mobile): add GAME.touchFireButton flag and update fire conditions"
```

---

### Task 2: Add fire button CSS to index.html

**Files:**
- Modify: `index.html:1349` (add `#touch-fire` styles after `#touch-reload` rule)
- Modify: `index.html:1524-1527` (add to desktop-hide media query)

- [ ] **Step 1: Add `#touch-fire` CSS**

After the `#touch-reload` rule (line 1349), add:

```css
  #touch-fire {
    position: fixed; bottom: 20px; right: 20px; z-index: 102;
    width: 72px; height: 72px; border-radius: 50%;
    border: 2px solid rgba(255,80,80,0.35); background: rgba(0,0,0,0.5);
    color: rgba(255,80,80,0.6); font-size: 14px; font-weight: bold;
    display: flex; align-items: center; justify-content: center;
    touch-action: none; user-select: none;
  }
  #touch-fire:active { border-color: rgba(255,80,80,0.7); background: rgba(80,0,0,0.5); }
```

- [ ] **Step 2: Add `#touch-fire` to desktop-hide media query**

In the `@media (pointer: fine)` block (lines 1523-1530), add `#touch-fire` to the selector list. Change:

```css
    #touch-move-zone, #touch-look-zone, #touch-joystick,
    #touch-action-buttons, #touch-weapon-strip, #touch-pause,
    #touch-buy-menu, #orient-overlay, #touch-fullscreen,
    #touch-bottom-bar {
```

to:

```css
    #touch-move-zone, #touch-look-zone, #touch-joystick,
    #touch-action-buttons, #touch-weapon-strip, #touch-pause,
    #touch-buy-menu, #orient-overlay, #touch-fullscreen,
    #touch-bottom-bar, #touch-fire {
```

- [ ] **Step 3: Run tests to verify no breakage**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "style(mobile): add fire button CSS and desktop-hide rule"
```

---

### Task 3: Create fire button and add touch handlers in touch.js

**Files:**
- Modify: `js/touch.js:281` (add fire button creation after action buttons)
- Modify: `js/touch.js:447-448` (add to `controlIds`)
- Modify: `js/touch.js:628-632` (add safety reset)
- Modify: `js/touch.js:655-657` (add to `hiddenIds`)
- Test: `tests/unit/touch.test.js`

- [ ] **Step 1: Write failing tests**

Add to `tests/unit/touch.test.js`:

```javascript
describe('Fire button', () => {
  it('should expose fire button creation function', () => {
    expect(typeof GAME.touch._createFireButton).toBe('function');
  });
});

describe('Touch fire button flag safety', () => {
  it('should default GAME.touchFireButton to false', () => {
    expect(GAME.touchFireButton).toBeFalsy();
  });

  it('should reset GAME.touchFireButton when player is dead', () => {
    GAME.isMobile = true;
    GAME.touchFireButton = true;
    GAME.player = { alive: false, keys: {} };
    GAME.touch.update();
    expect(GAME.touchFireButton).toBe(false);
    GAME.isMobile = false;
    delete GAME.player;
  });

  it('should reset GAME.touchFireButton when player does not exist', () => {
    GAME.isMobile = true;
    GAME.touchFireButton = true;
    GAME.player = null;
    GAME.touch.update();
    expect(GAME.touchFireButton).toBe(false);
    GAME.isMobile = false;
    delete GAME.player;
  });

  it('should NOT reset GAME.touchFireButton when player is alive', () => {
    GAME.isMobile = true;
    GAME.touchFireButton = true;
    GAME.player = { alive: true, keys: {}, camera: null };
    GAME.weaponSystem = { current: 'pistol' };
    GAME.touch.update();
    expect(GAME.touchFireButton).toBe(true);
    GAME.isMobile = false;
    GAME.touchFireButton = false;
    delete GAME.player;
    delete GAME.weaponSystem;
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/unit/touch.test.js`
Expected: FAIL — `_createFireButton` not defined, `touchFireButton` not reset

- [ ] **Step 3: Add fire button creation function**

In `js/touch.js`, after the `createActionButtons()` function (after line 281), add a new function:

```javascript
  function createFireButton() {
    var btn = document.createElement('div');
    btn.id = 'touch-fire';
    btn.textContent = 'FIRE';
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
```

- [ ] **Step 4: Call `createFireButton()` where other touch controls are initialized**

Find where `createActionButtons()` is called in the initialization block and add `createFireButton()` right after it.

- [ ] **Step 5: Expose for testing**

Add to the `GAME.touch` namespace object (where `_createActionButtons` is exposed):

```javascript
    _createFireButton: createFireButton,
```

- [ ] **Step 6: Add safety reset for `GAME.touchFireButton`**

In the dead-player safety reset (line 628-632), change:

```javascript
    if (!GAME.player || !GAME.player.alive) {
      GAME.touchFiring = false;
      GAME.touchTap = false;
    }
```

to:

```javascript
    if (!GAME.player || !GAME.player.alive) {
      GAME.touchFiring = false;
      GAME.touchTap = false;
      GAME.touchFireButton = false;
    }
```

- [ ] **Step 7: Add `'touch-fire'` to `controlIds` array**

At line 447-448, add `'touch-fire'` to the array:

```javascript
    var controlIds = ['touch-move-zone', 'touch-look-zone', 'touch-joystick',
                      'touch-action-buttons', 'touch-weapon-strip', 'touch-pause-btn', 'touch-fullscreen', 'touch-bottom-bar', 'touch-fire'];
```

- [ ] **Step 8: Add `'touch-fire'` to `hiddenIds` array**

At line 655-657, add `'touch-fire'` to the array:

```javascript
    var hiddenIds = ['touch-move-zone', 'touch-look-zone', 'touch-joystick',
                     'touch-action-buttons', 'touch-weapon-strip', 'touch-pause-btn', 'touch-fullscreen',
                     'touch-bottom-bar', 'touch-fire'];
```

- [ ] **Step 9: Run tests to verify pass**

Run: `npm test -- tests/unit/touch.test.js`
Expected: PASS

- [ ] **Step 10: Run full test suite**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 11: Commit**

```bash
git add js/touch.js tests/unit/touch.test.js
git commit -m "feat(mobile): add floating fire button with touch ID tracking"
```

---

### Task 4: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md:1810-1867` (mobile controls section)

- [ ] **Step 1: Add fire button documentation**

In the Touch Controls section (around line 1810), add the fire button to the control list. In the existing control layout description, add:

```markdown
- **Fire button** (FIRE): Large 72px circular button, bottom-right. Tap for single shot, hold for continuous fire. Uses separate `GAME.touchFireButton` flag independent from look-zone firing.
```

Also note in the tap-to-fire section that both input methods coexist — the look-zone gestures remain active alongside the fire button.

- [ ] **Step 2: Run tests to verify no breakage**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: add mobile fire button to REQUIREMENTS.md"
```
