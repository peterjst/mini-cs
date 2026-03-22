# Mobile Buy Menu Trigger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let mobile players access the buy menu in deathmatch and reopen it in all modes, via a persistent buy button and auto-open on deathmatch death.

**Architecture:** Add a buy button element in `js/touch.js` positioned in the top-right bar (left of pause button), with a money label to its left. The button toggles the existing buy carousel. In `js/main.js`, trigger the buy menu auto-open 1 second after deathmatch death and auto-close on respawn. CSS in `index.html` styles the new elements and repositions existing ones.

**Tech Stack:** Vanilla JS, CSS, Three.js game loop

---

### Task 1: Add CSS for buy button and mobile money display

**Files:**
- Modify: `index.html:1385-1392` (after `#touch-pause` styles)
- Modify: `index.html:1505-1508` (mobile `@media (pointer: coarse)` block for `#money-display`)
- Modify: `index.html:1536-1542` (desktop hide list)

- [ ] **Step 1: Add CSS for `#touch-buy-btn` and `#touch-money`**

In `index.html`, after the `#touch-pause` CSS block (line 1392), add:

```css
#touch-buy-btn {
  position: fixed; top: 8px; right: 52px; z-index: 102;
  height: 40px; padding: 0 10px; border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.5);
  color: #4caf50; font-size: 13px; font-weight: bold;
  display: flex; align-items: center; justify-content: center;
  touch-action: none; user-select: none;
}
#touch-money {
  position: fixed; top: 8px; z-index: 102;
  height: 40px; padding: 0 8px;
  color: #4caf50; font-size: 14px; font-weight: bold;
  display: flex; align-items: center;
  text-shadow: 0 0 4px #000;
  pointer-events: none;
}
```

- [ ] **Step 2: Update mobile money-display positioning**

In the `@media (pointer: coarse)` block (line 1505-1508), change `#money-display` right from `52px` to `52px` (no change needed — the existing `#money-display` will be hidden on mobile in essentials mode; the new `#touch-money` replaces it). Keep existing rule as-is.

- [ ] **Step 3: Add new elements to desktop hide list**

In the `@media (pointer: fine)` block (line 1536-1542), add `#touch-buy-btn, #touch-money` to the selector list:

```css
@media (pointer: fine) {
  #touch-move-zone, #touch-look-zone, #touch-joystick,
  #touch-action-buttons, #touch-weapon-strip, #touch-pause,
  #touch-buy-menu, #orient-overlay, #touch-fullscreen,
  #touch-bottom-bar, #touch-fire, #touch-buy-btn, #touch-money {
    display: none !important;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "style(mobile): add CSS for buy button and money display in top-right bar"
```

---

### Task 2: Create buy button and money display elements in touch.js

**Files:**
- Modify: `js/touch.js:379-388` (after `createPauseButton`)
- Modify: `js/touch.js:486-487` (visibility control IDs list)
- Modify: `js/touch.js:640-659` (GAME.touch exports)
- Modify: `js/touch.js:691-698` (initialization + hidden IDs list)

- [ ] **Step 1: Write the failing test**

In `tests/unit/touch.test.js`, add:

```js
describe('Buy button', () => {
  it('should expose _createBuyButton function', () => {
    expect(typeof GAME.touch._createBuyButton).toBe('function');
  });

  it('should expose _updateBuyButton function', () => {
    expect(typeof GAME.touch._updateBuyButton).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --reporter verbose`
Expected: FAIL — `_createBuyButton` and `_updateBuyButton` are not defined

- [ ] **Step 3: Add `createBuyButton` function after `createPauseButton` (line 388)**

```js
var buyBtnEl = null;
var touchMoneyEl = null;

function createBuyButton() {
  touchMoneyEl = document.createElement('div');
  touchMoneyEl.id = 'touch-money';
  touchMoneyEl.textContent = '$800';
  document.body.appendChild(touchMoneyEl);

  buyBtnEl = document.createElement('div');
  buyBtnEl.id = 'touch-buy-btn';
  buyBtnEl.textContent = 'BUY';
  document.body.appendChild(buyBtnEl);
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

function updateBuyButton() {
  if (!buyBtnEl || !touchMoneyEl) return;
  var state = GAME._gameState;
  var isBuyPhase = (state === 'BUY_PHASE' || state === 'SURVIVAL_BUY' ||
                    state === 'DEATHMATCH_ACTIVE' || state === 'TOURING');
  buyBtnEl.classList.toggle('active', isBuyPhase);
  buyBtnEl.style.opacity = isBuyPhase ? '1' : '0.3';
  buyBtnEl.style.pointerEvents = isBuyPhase ? '' : 'none';

  // Position touch-money to the left of buy button
  var btnRect = buyBtnEl.getBoundingClientRect();
  touchMoneyEl.style.right = (window.innerWidth - btnRect.left + 4) + 'px';

  // Update money text
  var money = GAME.player ? GAME.player.money : 0;
  touchMoneyEl.textContent = '$' + money;
}
```

- [ ] **Step 4: Add to visibility control IDs**

In `updateTouchControlVisibility` (line 486-487), add `'touch-buy-btn', 'touch-money'` to the `controlIds` array:

```js
var controlIds = ['touch-move-zone', 'touch-look-zone', 'touch-joystick',
                  'touch-action-buttons', 'touch-fire', 'touch-weapon-strip', 'touch-pause-btn', 'touch-fullscreen', 'touch-bottom-bar', 'touch-buy-btn', 'touch-money'];
```

- [ ] **Step 5: Export new functions on GAME.touch**

In the `touch` object (around line 655), add:

```js
_createBuyButton: createBuyButton,
_updateBuyButton: updateBuyButton,
```

- [ ] **Step 6: Call `updateBuyButton` in `touch.update`**

In `touch.update` (line 662-677), add `updateBuyButton();` after `updateBottomBar();`:

```js
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
```

- [ ] **Step 7: Initialize buy button and add to hidden IDs**

In the initialization block (around line 691), add `createBuyButton();` after `createScoreboardToggle();`:

```js
createPauseButton();
createScoreboardToggle();
createBuyButton();
createBuyCarousel();
```

Add `'touch-buy-btn', 'touch-money'` to the `hiddenIds` array (around line 697):

```js
var hiddenIds = ['touch-move-zone', 'touch-look-zone', 'touch-joystick',
                 'touch-action-buttons', 'touch-fire', 'touch-weapon-strip', 'touch-pause-btn', 'touch-fullscreen',
                 'touch-bottom-bar', 'touch-buy-btn', 'touch-money'];
```

- [ ] **Step 8: Run tests**

Run: `npm test -- --reporter verbose`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add js/touch.js tests/unit/touch.test.js
git commit -m "feat(mobile): add persistent buy button and money display in top-right bar"
```

---

### Task 3: Auto-open buy menu on deathmatch death (1s delay)

**Files:**
- Modify: `js/main.js:4621-4632` (deathmatch player death timer logic)
- Modify: `js/main.js:3338-3348` (`dmPlayerRespawn` function)

- [ ] **Step 1: Write the failing test**

In `tests/unit/main.test.js`, add a test for the deathmatch buy menu auto-open behavior. Find the existing deathmatch test section or add a new describe block:

```js
describe('Deathmatch buy menu auto-open', () => {
  it('should expose dmBuyMenuAutoOpened flag', () => {
    // This flag tracks whether the buy menu was auto-opened during death
    expect(GAME._dmBuyMenuAutoOpened).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --reporter verbose`
Expected: FAIL — `_dmBuyMenuAutoOpened` is not defined

- [ ] **Step 3: Add auto-open logic in deathmatch death timer**

In `js/main.js`, add a tracking variable near the other dm variables (around line 1084):

```js
var dmBuyMenuAutoOpened = false;
```

Expose it on GAME (near line 3877 where `GAME._buyWeapon = tryBuy` is):

```js
GAME._dmBuyMenuAutoOpened = false;
```

In `dmPlayerDied` (line 3309-3314), reset the flag:

```js
function dmPlayerDied() {
  dmDeaths++;
  matchDeaths++;
  dmPlayerDeadTimer = DEATHMATCH_PLAYER_RESPAWN_DELAY;
  dmBuyMenuAutoOpened = false;
  dom.dmRespawnTimer.style.display = 'block';
}
```

In the deathmatch death timer countdown (line 4625-4632), add buy menu auto-open when 1 second has elapsed (timer <= 2.0):

```js
if (dmPlayerDeadTimer > 0) {
  dmPlayerDeadTimer -= dt;
  dom.dmRespawnTimer.textContent = 'RESPAWN IN ' + Math.ceil(dmPlayerDeadTimer);

  // Auto-open buy menu after 1s death camera (timer crosses 2.0)
  if (!dmBuyMenuAutoOpened && dmPlayerDeadTimer <= 2.0) {
    dmBuyMenuAutoOpened = true;
    buyMenuOpen = true;
    if (GAME.isMobile && GAME.touch && GAME.touch._showBuyCarousel) {
      GAME.touch._showBuyCarousel();
    } else {
      dom.buyMenu.classList.add('show');
      updateBuyMenu();
    }
  }

  if (dmPlayerDeadTimer <= 0) {
    dmPlayerDeadTimer = -1;
    dmPlayerRespawn();
  }
}
```

- [ ] **Step 4: Auto-close buy menu on respawn**

In `dmPlayerRespawn` (line 3316-3348), add buy menu close before the existing code:

```js
function dmPlayerRespawn() {
  // Close buy menu that was auto-opened during death
  buyMenuOpen = false;
  dom.buyMenu.classList.remove('show');
  if (GAME.touch && GAME.touch._hideBuyCarousel) GAME.touch._hideBuyCarousel();
  dmBuyMenuAutoOpened = false;

  // Pick spawn furthest from enemies
  // ... (rest of existing code)
```

Also keep `GAME._dmBuyMenuAutoOpened` in sync — update in the countdown and respawn:

After `dmBuyMenuAutoOpened = true;` add `GAME._dmBuyMenuAutoOpened = true;`
After `dmBuyMenuAutoOpened = false;` in respawn add `GAME._dmBuyMenuAutoOpened = false;`

- [ ] **Step 5: Run tests**

Run: `npm test -- --reporter verbose`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add js/main.js tests/unit/main.test.js
git commit -m "feat(mobile): auto-open buy menu 1s after deathmatch death, close on respawn"
```

---

### Task 4: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Find the mobile touch controls section and deathmatch section in REQUIREMENTS.md**

Search for "Mobile Touch Controls" and "Deathmatch" sections.

- [ ] **Step 2: Add buy button documentation to the mobile section**

Add under the mobile touch controls section:

```markdown
### Mobile Buy Button
- Persistent buy button in top-right HUD bar, layout: `[$money] [BUY] [⏸]`
- Money display (`#touch-money`) always visible during gameplay, even when $0
- Buy button visible and functional whenever buying is allowed: `BUY_PHASE`, `SURVIVAL_BUY`, `DEATHMATCH_ACTIVE`, `TOURING`
- In deathmatch, button remains visible and functional whether player is alive or dead
- Tapping toggles the existing touch buy grid (`showBuyCarousel` / `hideBuyCarousel`)
- Grayed out (opacity 0.3, pointer-events none) when not in a buy phase
```

- [ ] **Step 3: Add deathmatch auto-open documentation**

In the deathmatch section, add:

```markdown
#### Deathmatch Death Buy Menu
- After death, 1-second death camera before buy menu auto-opens
- Buy menu stays open for remaining ~2s of the 3s respawn delay (`DEATHMATCH_PLAYER_RESPAWN_DELAY`)
- Buy menu auto-closes on respawn
- Player can also manually open/close via buy button during this window
- Uses `dmBuyMenuAutoOpened` flag to ensure auto-open fires only once per death
```

- [ ] **Step 4: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: add mobile buy button and deathmatch death buy menu to REQUIREMENTS.md"
```

---

### Task 5: Integration testing

**Files:**
- Modify: `tests/unit/touch.test.js`

- [ ] **Step 1: Add integration tests for buy button visibility**

```js
describe('Buy button visibility', () => {
  it('should show buy button as active during BUY_PHASE', () => {
    GAME._gameState = 'BUY_PHASE';
    GAME.touch._updateBuyButton();
    var btn = document.getElementById('touch-buy-btn');
    if (btn) {
      expect(btn.classList.contains('active')).toBe(true);
    }
  });

  it('should show buy button as active during DEATHMATCH_ACTIVE', () => {
    GAME._gameState = 'DEATHMATCH_ACTIVE';
    GAME.touch._updateBuyButton();
    var btn = document.getElementById('touch-buy-btn');
    if (btn) {
      expect(btn.classList.contains('active')).toBe(true);
    }
  });

  it('should show buy button as active during SURVIVAL_BUY', () => {
    GAME._gameState = 'SURVIVAL_BUY';
    GAME.touch._updateBuyButton();
    var btn = document.getElementById('touch-buy-btn');
    if (btn) {
      expect(btn.classList.contains('active')).toBe(true);
    }
  });

  it('should show buy button as inactive during PLAYING', () => {
    GAME._gameState = 'PLAYING';
    GAME.touch._updateBuyButton();
    var btn = document.getElementById('touch-buy-btn');
    if (btn) {
      expect(btn.classList.contains('active')).toBe(false);
    }
  });

  it('should update money display text', () => {
    GAME.player = { money: 3500, alive: true };
    GAME.touch._updateBuyButton();
    var moneyEl = document.getElementById('touch-money');
    if (moneyEl) {
      expect(moneyEl.textContent).toBe('$3500');
    }
  });

  it('should show $0 when player has no money', () => {
    GAME.player = { money: 0, alive: true };
    GAME.touch._updateBuyButton();
    var moneyEl = document.getElementById('touch-money');
    if (moneyEl) {
      expect(moneyEl.textContent).toBe('$0');
    }
  });
});
```

- [ ] **Step 2: Run all tests**

Run: `npm test -- --reporter verbose`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add tests/unit/touch.test.js
git commit -m "test(mobile): add buy button visibility and money display tests"
```
