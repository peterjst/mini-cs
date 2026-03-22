# Desktop Controls Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the desktop controls overlay with categorized layout, add a persistent "P — Pause" HUD hint, and make controls accessible from the pause menu.

**Architecture:** Three self-contained changes to `index.html` (HTML + CSS) and `js/main.js` (JS behavior). No new files. Reuses the existing `#controls-overlay` element with restructured content and a new entry point from the pause screen.

**Tech Stack:** HTML/CSS, vanilla JS (IIFE pattern), Vitest for tests.

**Spec:** `docs/superpowers/specs/2026-03-22-desktop-controls-accessibility-design.md`

---

### Task 1: Update Controls Overlay HTML — Categorized Layout

**Files:**
- Modify: `index.html:1954-1970` (controls overlay HTML)
- Modify: `index.html:620-653` (controls overlay CSS)

- [ ] **Step 1: Replace controls overlay HTML with categorized sections**

Replace the existing `#controls-overlay` content (lines 1954-1970) with:

```html
<!-- Controls Overlay -->
<div id="controls-overlay">
  <h2>CONTROLS</h2>
  <div class="controls-categories">
    <div class="controls-category">
      <h3 class="controls-cat-header">Movement</h3>
      <div class="controls-grid">
        <div class="ctrl-item"><span class="ctrl-key">WASD</span> Move</div>
        <div class="ctrl-item"><span class="ctrl-key">Mouse</span> Look</div>
        <div class="ctrl-item"><span class="ctrl-key">Space</span> Jump</div>
        <div class="ctrl-item"><span class="ctrl-key">Shift</span> Sprint</div>
        <div class="ctrl-item"><span class="ctrl-key">C</span> Crouch</div>
      </div>
    </div>
    <div class="controls-category">
      <h3 class="controls-cat-header">Combat</h3>
      <div class="controls-grid">
        <div class="ctrl-item"><span class="ctrl-key">Click</span> Shoot</div>
        <div class="ctrl-item"><span class="ctrl-key">R</span> Reload</div>
        <div class="ctrl-item"><span class="ctrl-key">F/RMB</span> Scope</div>
        <div class="ctrl-item"><span class="ctrl-key">1-5</span> Weapons</div>
        <div class="ctrl-item"><span class="ctrl-key">G/7-9</span> Grenades</div>
        <div class="ctrl-item"><span class="ctrl-key">E</span> Plant/Defuse</div>
      </div>
    </div>
    <div class="controls-category">
      <h3 class="controls-cat-header">Game</h3>
      <div class="controls-grid">
        <div class="ctrl-item"><span class="ctrl-key">B</span> Buy Menu</div>
        <div class="ctrl-item"><span class="ctrl-key">F1</span> Skip Buy</div>
        <div class="ctrl-item"><span class="ctrl-key">Tab</span> Scoreboard</div>
        <div class="ctrl-item"><span class="ctrl-key">Z</span> Radio</div>
        <div class="ctrl-item"><span class="ctrl-key">P/ESC</span> Pause</div>
      </div>
    </div>
  </div>
  <button class="overlay-close" id="controls-close">Close</button>
</div>
```

- [ ] **Step 2: Update controls overlay CSS**

Replace the `.controls-grid` CSS rule (line 632-634) and add new category styles. The updated CSS block for the controls section:

```css
/* ── Controls Overlay ─────────────────────────────── */
#controls-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.85);
  display: none; flex-direction: column; align-items: center; justify-content: center;
  z-index: 210; color: #fff;
}
#controls-overlay.show { display: flex; }
#controls-overlay h2 {
  font-size: 20px; letter-spacing: 4px; margin-bottom: 24px;
  color: rgba(255,255,255,0.7);
}
.controls-categories {
  display: flex; gap: 40px;
}
.controls-cat-header {
  font-size: 13px; letter-spacing: 3px; text-transform: uppercase;
  color: rgba(79,195,247,0.7); margin: 0 0 12px 0; font-weight: 600;
}
#controls-overlay .controls-grid {
  display: grid; grid-template-columns: auto; gap: 8px;
}
#controls-overlay .ctrl-item {
  display: flex; align-items: center; gap: 8px; font-size: 13px;
  color: rgba(255,255,255,0.45);
}
#controls-overlay .ctrl-key {
  display: inline-block; padding: 3px 10px; border: 1px solid rgba(255,255,255,0.2);
  border-radius: 3px; font-size: 12px; color: rgba(79,195,247,0.7);
  background: rgba(255,255,255,0.05); font-family: monospace; min-width: 32px;
  text-align: center;
}
```

Note: z-index raised from 30 to 210 so the overlay stacks above the pause overlay (z-index 200). The layout changes from a single 3-column grid to three side-by-side category columns using flexbox.

- [ ] **Step 3: Verify in browser**

Open `index.html`, click "Controls" in menu footer. Verify:
- Three category columns (Movement, Combat, Game) with cyan headers
- All 16 controls listed correctly
- Close button works
- ESC closes overlay

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(ui): reorganize controls overlay into categorized layout"
```

---

### Task 2: Add Persistent "P — Pause" HUD Hint (Desktop Only)

**Files:**
- Modify: `index.html` (add HTML element + CSS)
- Modify: `js/main.js` (visibility logic)
- Modify: `tests/setup.js` (add DOM element to mock)
- Modify: `tests/unit/main.test.js` (add tests)

- [ ] **Step 1: Write tests for pause hint visibility**

Add to `tests/unit/main.test.js`:

```js
describe('pause hint', () => {
  it('should have pause-hint-key element in DOM', () => {
    var el = document.getElementById('pause-hint-key');
    expect(el).toBeTruthy();
  });

  it('should expose _getGameState for testing', () => {
    expect(typeof GAME._getGameState).toBe('function');
  });

  it('should expose _updatePauseHint for testing', () => {
    expect(typeof GAME._updatePauseHint).toBe('function');
  });

  it('should show pause hint during PLAYING state', () => {
    var el = document.getElementById('pause-hint-key');
    GAME._setGameState('PLAYING');
    GAME._updatePauseHint();
    expect(el.style.display).toBe('block');
  });

  it('should hide pause hint during MENU state', () => {
    var el = document.getElementById('pause-hint-key');
    GAME._setGameState('MENU');
    GAME._updatePauseHint();
    expect(el.style.display).toBe('none');
  });

  it('should hide pause hint during PAUSED state', () => {
    var el = document.getElementById('pause-hint-key');
    GAME._setGameState('PAUSED');
    GAME._updatePauseHint();
    expect(el.style.display).toBe('none');
  });
});
```

Note: `_setGameState` is a test-only helper that sets the internal `gameState` variable. Expose it alongside `_getGameState`:

```js
GAME._setGameState = function(name) { gameState = eval(name); };
```

Alternatively, if `eval` is undesirable, map the state names to their constants:

```js
var _stateMap = { MENU: MENU, PLAYING: PLAYING, PAUSED: PAUSED, BUY_PHASE: BUY_PHASE,
  ROUND_END: ROUND_END, TOURING: TOURING, MATCH_END: MATCH_END,
  SURVIVAL_BUY: SURVIVAL_BUY, SURVIVAL_WAVE: SURVIVAL_WAVE, SURVIVAL_DEAD: SURVIVAL_DEAD,
  GUNGAME_ACTIVE: GUNGAME_ACTIVE, GUNGAME_END: GUNGAME_END,
  DEATHMATCH_ACTIVE: DEATHMATCH_ACTIVE, DEATHMATCH_END: DEATHMATCH_END };
GAME._setGameState = function(name) { gameState = _stateMap[name]; };
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `pause-hint-key` element not found, `_getGameState` not defined.

- [ ] **Step 3: Add `pause-hint-key` to test setup DOM elements**

In `tests/setup.js`, find the array of element IDs that gets created with `ensureElement()` and add `'pause-hint-key'` to it.

- [ ] **Step 4: Add HTML element for pause hint**

Add after the `#hud` div closing tag area in `index.html` (near the other HUD elements):

```html
<div id="pause-hint-key">P &mdash; Pause</div>
```

- [ ] **Step 5: Add CSS for pause hint**

Add CSS after the HUD styles section:

```css
/* Pause hint (desktop only) */
#pause-hint-key {
  position: fixed; bottom: 12px; right: 16px;
  color: rgba(79,195,247,0.35); font-size: 12px; letter-spacing: 1px;
  pointer-events: none; z-index: 10; display: none;
  font-family: inherit;
}
@media (pointer: coarse) {
  #pause-hint-key { display: none !important; }
}
```

The `@media (pointer: coarse)` rule ensures the hint is always hidden on touch/mobile devices, matching the existing pattern used for hiding desktop-only elements (see existing `@media (pointer: fine)` rules for touch controls). The JS visibility logic only toggles display between `block` and `none` on non-touch devices.

- [ ] **Step 6: Add dom ref and visibility logic in `js/main.js`**

Add to the `dom` object near the other pause-related refs (`pauseOverlay`, `pauseResumeBtn`, `pauseMenuBtn` at lines 108-110):

```js
pauseHintKey: document.getElementById('pause-hint-key'),
```

Add a helper function near `updateHUD()` to show/hide the hint based on game state. The hint should be visible during active gameplay states where pause is available:

```js
function updatePauseHint() {
  if (!dom.pauseHintKey) return;
  var show = (gameState === PLAYING || gameState === BUY_PHASE ||
              gameState === TOURING || gameState === SURVIVAL_BUY ||
              gameState === SURVIVAL_WAVE || gameState === GUNGAME_ACTIVE ||
              gameState === DEATHMATCH_ACTIVE);
  dom.pauseHintKey.style.display = show ? 'block' : 'none';
}
```

Call `updatePauseHint()` from the main game loop (inside the `animate()` function or wherever HUD updates happen each frame). Also call it from `pauseGame()` and `resumeGame()` to ensure immediate hide/show on state transitions.

Expose test helpers:

```js
GAME._getGameState = function() { return gameState; };
GAME._updatePauseHint = updatePauseHint;
var _stateMap = { MENU: MENU, PLAYING: PLAYING, PAUSED: PAUSED, BUY_PHASE: BUY_PHASE,
  ROUND_END: ROUND_END, TOURING: TOURING, MATCH_END: MATCH_END,
  SURVIVAL_BUY: SURVIVAL_BUY, SURVIVAL_WAVE: SURVIVAL_WAVE, SURVIVAL_DEAD: SURVIVAL_DEAD,
  GUNGAME_ACTIVE: GUNGAME_ACTIVE, GUNGAME_END: GUNGAME_END,
  DEATHMATCH_ACTIVE: DEATHMATCH_ACTIVE, DEATHMATCH_END: DEATHMATCH_END };
GAME._setGameState = function(name) { gameState = _stateMap[name]; };
```

- [ ] **Step 7: Run tests**

Run: `npm test`
Expected: All tests PASS.

- [ ] **Step 8: Verify in browser**

Start a game. Verify:
- "P — Pause" appears in bottom-right, low opacity
- Disappears when game is paused
- Not visible on main menu or match end screens
- Not visible when simulating mobile (Chrome DevTools device mode with touch)

- [ ] **Step 9: Commit**

```bash
git add index.html js/main.js tests/setup.js tests/unit/main.test.js
git commit -m "feat(ui): add persistent P — Pause hint for desktop gameplay"
```

---

### Task 3: Add Controls Button to Pause Overlay

**Files:**
- Modify: `index.html:1946-1952` (pause overlay HTML)
- Modify: `index.html` (pause overlay CSS — add style for new button)
- Modify: `js/main.js` (click handler, ESC behavior update)
- Modify: `tests/setup.js` (add DOM element to mock)
- Modify: `tests/unit/main.test.js` (add tests)

- [ ] **Step 1: Write tests for pause controls button**

Add to `tests/unit/main.test.js`:

```js
describe('pause controls button', () => {
  it('should have pause-controls-btn element in DOM', () => {
    var el = document.getElementById('pause-controls-btn');
    expect(el).toBeTruthy();
  });

  it('should expose pauseControlsBtn in dom refs', () => {
    expect(document.getElementById('pause-controls-btn')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `pause-controls-btn` not found.

- [ ] **Step 3: Add `pause-controls-btn` to test setup DOM elements**

In `tests/setup.js`, add `'pause-controls-btn'` to the element ID array.

- [ ] **Step 4: Add Controls button to pause overlay HTML**

Update the pause overlay in `index.html` (lines 1946-1952):

```html
<!-- Pause Overlay -->
<div id="pause-overlay">
  <h1>PAUSED</h1>
  <div class="pause-hint">Press ESC to resume</div>
  <button id="pause-resume-btn">RESUME</button>
  <button id="pause-controls-btn">CONTROLS</button>
  <button class="menu-btn" id="pause-menu-btn">MAIN MENU</button>
</div>
```

- [ ] **Step 5: Add CSS for the controls button**

Add after the existing `#pause-resume-btn` styles (around line 877):

```css
#pause-controls-btn {
  margin-top: 12px; padding: 10px 40px; font-size: 14px; cursor: pointer;
  background: transparent; border: 1px solid rgba(79,195,247,0.5);
  color: #4fc3f7; border-radius: 3px; letter-spacing: 3px;
  text-transform: uppercase; font-weight: 600; transition: all 0.25s;
  font-family: inherit;
}
#pause-controls-btn:hover {
  background: rgba(79,195,247,0.15); border-color: #4fc3f7;
  box-shadow: 0 0 15px rgba(79,195,247,0.2);
}
```

This matches the existing `#pause-resume-btn` styling for visual consistency.

- [ ] **Step 6: Add dom ref and click handler in `js/main.js`**

Add to the `dom` object:

```js
pauseControlsBtn: document.getElementById('pause-controls-btn'),
```

Add click handler near the other pause button handlers (around line 2293-2301):

```js
dom.pauseControlsBtn.addEventListener('click', function() {
  if (GAME.Sound) GAME.Sound.menuClick();
  dom.controlsOverlay.classList.add('show');
});
```

- [ ] **Step 7: Update ESC key handler for controls-during-pause**

Update the ESC keydown handler (lines 2131-2142) to check if the controls overlay is open before resuming:

```js
// ESC key: pause/resume during game, close overlays in menu
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    // If controls overlay is open, close it (whether in menu or paused)
    if (dom.controlsOverlay.classList.contains('show')) {
      dom.controlsOverlay.classList.remove('show');
      return;
    }
    if (gameState === PAUSED) { resumeGame(); return; }
    if (gameState === MENU) {
      dom.missionsOverlay.classList.remove('show');
      return;
    }
    pauseGame();
  }
});
```

This change:
- Checks for open controls overlay first (covers both menu and pause states)
- Removes the old `dom.controlsOverlay.classList.remove('show')` from the MENU branch since it's now handled above
- When paused with controls open: ESC closes controls, stays paused
- When paused without controls open: ESC resumes (existing behavior)

- [ ] **Step 8: Update `resumeGame()` to close controls overlay**

Add `dom.controlsOverlay.classList.remove('show');` to the `resumeGame()` function (line 2161-2168), before removing the pause overlay. This ensures the controls overlay is cleaned up if the user clicks RESUME or MAIN MENU while controls are open:

```js
function resumeGame() {
  if (gameState !== PAUSED) return;
  gameState = pausedFromState;
  pausedFromState = null;
  lastTime = 0; // reset dt so no big jump
  dom.controlsOverlay.classList.remove('show');
  dom.pauseOverlay.classList.remove('show');
  renderer.domElement.requestPointerLock();
}
```

- [ ] **Step 9: Update P key handler to handle open controls overlay**

Update the P key handler in `setupInput()` (lines 2175-2178) to close the controls overlay instead of resuming if it's open:

```js
// Pause toggle
if (k === 'p') {
  if (gameState === PAUSED) {
    if (dom.controlsOverlay.classList.contains('show')) {
      dom.controlsOverlay.classList.remove('show');
    } else {
      resumeGame();
    }
  } else {
    pauseGame();
  }
  return;
}
```

- [ ] **Step 10: Verify controls Close button handler is correct**

The existing close handler (lines 2048-2051) just removes the `show` class — the pause overlay stays visible underneath. No code change needed, but verify this is the case.

- [ ] **Step 11: Run tests**

Run: `npm test`
Expected: All tests PASS.

- [ ] **Step 12: Verify in browser**

Start a game, press P to pause. Verify:
- "CONTROLS" button appears between RESUME and MAIN MENU
- Clicking it shows the categorized controls overlay on top of the pause overlay
- Close button on controls returns to pause menu (game stays paused)
- ESC from controls overlay returns to pause menu (game stays paused)
- P from controls overlay closes controls (game stays paused)
- ESC from pause menu (without controls open) resumes game
- Clicking RESUME while controls are open resumes cleanly (controls overlay closes)
- Clicking MAIN MENU while controls are open returns to menu cleanly
- Controls from main menu footer still works normally

- [ ] **Step 13: Commit**

```bash
git add index.html js/main.js tests/setup.js tests/unit/main.test.js
git commit -m "feat(ui): add controls button to pause overlay"
```

---

### Task 4: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md:1339` (controls overlay description)
- Modify: `REQUIREMENTS.md:1992-2021` (desktop controls section)

- [ ] **Step 1: Update controls overlay description**

Find the line (around 1339):
```
- **Controls overlay**: Full-screen overlay (z-index 30) with 3-column keybindings grid, Close button, ESC to close
```

Replace with:
```
- **Controls overlay**: Full-screen overlay (z-index 210) with categorized keybindings (Movement, Combat, Game columns), Close button, ESC to close. Accessible from main menu footer and pause menu.
```

- [ ] **Step 2: Add pause hint and pause controls documentation**

The existing REQUIREMENTS.md table (lines 1996-2021) already lists all keyboard controls. Add new subsections after the `F11` row (line 2021):

```markdown

### Desktop HUD Hints
- **Pause hint**: Persistent "P — Pause" text in bottom-right corner during active gameplay
  - Style: cyan color (`rgba(79,195,247,0.35)`), 12px font, pointer-events none
  - Visible during: `PLAYING`, `BUY_PHASE`, `TOURING`, `SURVIVAL_BUY`, `SURVIVAL_WAVE`, `GUNGAME_ACTIVE`, `DEATHMATCH_ACTIVE`
  - Hidden on mobile via `@media (pointer: coarse)` rule

### Pause Menu
- **Pause overlay** (z-index 200): "PAUSED" title, ESC hint, RESUME / CONTROLS / MAIN MENU buttons
- **Controls from pause**: CONTROLS button opens the controls overlay (z-index 210) on top of pause overlay
  - Close button or ESC returns to pause menu without resuming
  - ESC priority: controls overlay (if open) → resume game
```

- [ ] **Step 3: Run tests to ensure nothing broke**

Run: `npm test`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: update REQUIREMENTS.md with controls accessibility features"
```
