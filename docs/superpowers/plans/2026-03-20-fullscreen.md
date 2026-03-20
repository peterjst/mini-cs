# Fullscreen Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add fullscreen support with F11 keybind and menu button on desktop, and auto-fullscreen with landscape lock on mobile.

**Architecture:** New `js/fullscreen.js` IIFE module exposes `GAME.fullscreen` with `init()`, `toggle()`, and `isActive()`. Desktop uses F11 + menu button. Mobile auto-enters fullscreen+landscape on game start, with HUD button and back-button exit via history API.

**Tech Stack:** Fullscreen API, Screen Orientation API, History API, Web Audio (existing), Three.js (existing), Vitest (tests)

**Spec:** `docs/superpowers/specs/2026-03-20-fullscreen-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `js/fullscreen.js` | Create | Fullscreen module — toggle, init, isActive, F11 listener, history/popstate, orientation lock |
| `tests/unit/fullscreen.test.js` | Create | Unit tests for fullscreen module |
| `index.html` | Modify | Script tag, CSS, menu button markup, mobile HUD button markup |
| `js/main.js` | Modify | Call `init()`, auto-enter on mobile game start, exit on goToMenu |
| `js/touch.js` | Modify | Add `touch-fullscreen` to controlIds and hiddenIds arrays (no orientation lock logic exists to remove — verified) |
| `REQUIREMENTS.md` | Modify | Document fullscreen feature |

---

### Task 1: Create fullscreen module with tests — core toggle/isActive

**Files:**
- Create: `js/fullscreen.js`
- Create: `tests/unit/fullscreen.test.js`

- [ ] **Step 1: Write failing tests for core API**

In `tests/unit/fullscreen.test.js`:

```js
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/touch.js');
  loadModule('js/fullscreen.js');
});

describe('GAME.fullscreen', () => {
  it('should exist as a namespace', () => {
    expect(GAME.fullscreen).toBeDefined();
  });

  it('should expose init, toggle, and isActive', () => {
    expect(typeof GAME.fullscreen.init).toBe('function');
    expect(typeof GAME.fullscreen.toggle).toBe('function');
    expect(typeof GAME.fullscreen.isActive).toBe('function');
  });
});

describe('isActive', () => {
  afterEach(() => {
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
  });

  it('should return false when not in fullscreen', () => {
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    expect(GAME.fullscreen.isActive()).toBe(false);
  });

  it('should return true when in fullscreen', () => {
    Object.defineProperty(document, 'fullscreenElement', { value: document.documentElement, writable: true, configurable: true });
    expect(GAME.fullscreen.isActive()).toBe(true);
  });
});

describe('toggle', () => {
  var origRequest, origExit;

  beforeEach(() => {
    origRequest = document.documentElement.requestFullscreen;
    origExit = document.exitFullscreen;
  });

  afterEach(() => {
    document.documentElement.requestFullscreen = origRequest;
    document.exitFullscreen = origExit;
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
  });

  it('should call requestFullscreen when not in fullscreen', () => {
    var called = false;
    document.documentElement.requestFullscreen = function() { called = true; return Promise.resolve(); };
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    GAME.fullscreen.toggle();
    expect(called).toBe(true);
  });

  it('should call exitFullscreen when in fullscreen', () => {
    var called = false;
    document.exitFullscreen = function() { called = true; return Promise.resolve(); };
    Object.defineProperty(document, 'fullscreenElement', { value: document.documentElement, writable: true, configurable: true });
    GAME.fullscreen.toggle();
    expect(called).toBe(true);
  });

  it('should be a no-op when fullscreen API is unsupported', () => {
    document.documentElement.requestFullscreen = undefined;
    document.exitFullscreen = undefined;
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    expect(() => GAME.fullscreen.toggle()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/fullscreen.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal fullscreen module**

Create `js/fullscreen.js`:

```js
// js/fullscreen.js — Fullscreen toggle with orientation lock
// Attaches GAME.fullscreen

(function() {
  'use strict';
  if (!window.GAME) window.GAME = {};

  var _exitingProgrammatically = false;
  var _historyPushed = false;

  function _getFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function _requestFullscreen(el) {
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    return Promise.reject(new Error('Fullscreen API not supported'));
  }

  function _exitFullscreenAPI() {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    return Promise.reject(new Error('Fullscreen API not supported'));
  }

  function _lockLandscape() {
    if (!GAME.isMobile) return;
    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(function() {});
      }
    } catch (e) {}
  }

  function _unlockOrientation() {
    if (!GAME.isMobile) return;
    try {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    } catch (e) {}
  }

  function _updateButtons(active) {
    var menuBtn = document.getElementById('fullscreen-btn');
    var hudBtn = document.getElementById('touch-fullscreen');
    if (menuBtn) menuBtn.classList.toggle('fs-active', active);
    if (hudBtn) hudBtn.classList.toggle('fs-active', active);
  }

  function isActive() {
    return !!_getFullscreenElement();
  }

  function toggle() {
    var el = document.documentElement;
    if (!el.requestFullscreen && !el.webkitRequestFullscreen) return;

    if (isActive()) {
      _exitingProgrammatically = true;
      _exitFullscreenAPI().catch(function() {});
      _unlockOrientation();
      if (GAME.isMobile && _historyPushed) {
        _historyPushed = false;
        history.back();
      } else {
        _exitingProgrammatically = false;
      }
    } else {
      _requestFullscreen(el).catch(function() {});
      _lockLandscape();
      if (GAME.isMobile) {
        _historyPushed = true;
        history.pushState({ fullscreen: true }, '');
      }
    }
  }

  function _onFullscreenChange() {
    var active = isActive();
    _updateButtons(active);
    if (!active && !_exitingProgrammatically && GAME.isMobile && _historyPushed) {
      // Fullscreen exited externally (e.g. swipe down) — clean up history
      _exitingProgrammatically = true;
      _historyPushed = false;
      history.back();
      _unlockOrientation();
    }
  }

  function _onPopstate() {
    if (_exitingProgrammatically) {
      _exitingProgrammatically = false;
      return;
    }
    if (isActive()) {
      _historyPushed = false;
      _exitFullscreenAPI().catch(function() {});
      _unlockOrientation();
    }
  }

  function _onF11(e) {
    if (e.key === 'F11') {
      e.preventDefault();
      toggle();
    }
  }

  function init() {
    document.addEventListener('keydown', _onF11);
    document.addEventListener('fullscreenchange', _onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', _onFullscreenChange);
    window.addEventListener('popstate', _onPopstate);

    var menuBtn = document.getElementById('fullscreen-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', function() { toggle(); });
    }
    var hudBtn = document.getElementById('touch-fullscreen');
    if (hudBtn) {
      hudBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        toggle();
      }, { passive: false });
    }
  }

  GAME.fullscreen = {
    init: init,
    toggle: toggle,
    isActive: isActive
  };
})();
```

Key changes from first draft:
- Added `_historyPushed` boolean flag to track whether we actually pushed a history entry. This avoids relying on `history.state` which can be affected by event ordering race conditions between `fullscreenchange` and `popstate`.
- `_onFullscreenChange` checks `_historyPushed` instead of `history.state` to decide whether cleanup is needed.
- `_onPopstate` clears `_historyPushed` before exiting fullscreen.
- Button click handlers are wired inside `init()` directly.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/fullscreen.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add js/fullscreen.js tests/unit/fullscreen.test.js
git commit -m "feat: add fullscreen module with toggle, isActive, and tests"
```

---

### Task 2: Add tests for F11 keybind, popstate, orientation lock, and edge cases

**Files:**
- Modify: `tests/unit/fullscreen.test.js`

- [ ] **Step 1: Add comprehensive tests**

Append to `tests/unit/fullscreen.test.js`. Note: `init()` is called once in `beforeAll` for the event-listener tests to avoid accumulating duplicate listeners.

```js
describe('F11 keybind', () => {
  var origRequest;

  beforeAll(() => {
    GAME.fullscreen.init();
  });

  beforeEach(() => {
    origRequest = document.documentElement.requestFullscreen;
  });

  afterEach(() => {
    document.documentElement.requestFullscreen = origRequest;
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
  });

  it('should call toggle when F11 is pressed', () => {
    var called = false;
    document.documentElement.requestFullscreen = function() { called = true; return Promise.resolve(); };
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F11' }));
    expect(called).toBe(true);
  });

  it('should not trigger on other keys', () => {
    var called = false;
    document.documentElement.requestFullscreen = function() { called = true; return Promise.resolve(); };
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F10' }));
    expect(called).toBe(false);
  });
});

describe('popstate handler', () => {
  afterEach(() => {
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
  });

  it('should call exitFullscreen when back button pressed during fullscreen', () => {
    var called = false;
    var origExit = document.exitFullscreen;
    document.exitFullscreen = function() { called = true; return Promise.resolve(); };
    Object.defineProperty(document, 'fullscreenElement', { value: document.documentElement, writable: true, configurable: true });
    window.dispatchEvent(new PopStateEvent('popstate', {}));
    expect(called).toBe(true);
    document.exitFullscreen = origExit;
  });

  it('should not call exitFullscreen when not in fullscreen', () => {
    var called = false;
    var origExit = document.exitFullscreen;
    document.exitFullscreen = function() { called = true; return Promise.resolve(); };
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    window.dispatchEvent(new PopStateEvent('popstate', {}));
    expect(called).toBe(false);
    document.exitFullscreen = origExit;
  });
});

describe('orientation lock', () => {
  var origIsMobile, origOrientation;

  beforeEach(() => {
    origIsMobile = GAME.isMobile;
    origOrientation = screen.orientation;
  });

  afterEach(() => {
    GAME.isMobile = origIsMobile;
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    Object.defineProperty(screen, 'orientation', { value: origOrientation, writable: true, configurable: true });
  });

  it('should call screen.orientation.lock on mobile when entering fullscreen', () => {
    GAME.isMobile = true;
    var lockCalled = false;
    Object.defineProperty(screen, 'orientation', {
      value: { lock: function() { lockCalled = true; return Promise.resolve(); }, unlock: function() {} },
      writable: true, configurable: true
    });
    var origRequest = document.documentElement.requestFullscreen;
    document.documentElement.requestFullscreen = function() { return Promise.resolve(); };
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    GAME.fullscreen.toggle();
    expect(lockCalled).toBe(true);
    document.documentElement.requestFullscreen = origRequest;
  });

  it('should call screen.orientation.unlock on mobile when exiting fullscreen', () => {
    GAME.isMobile = true;
    var unlockCalled = false;
    Object.defineProperty(screen, 'orientation', {
      value: { lock: function() { return Promise.resolve(); }, unlock: function() { unlockCalled = true; } },
      writable: true, configurable: true
    });
    var origExit = document.exitFullscreen;
    document.exitFullscreen = function() { return Promise.resolve(); };
    Object.defineProperty(document, 'fullscreenElement', { value: document.documentElement, writable: true, configurable: true });
    GAME.fullscreen.toggle();
    expect(unlockCalled).toBe(true);
    document.exitFullscreen = origExit;
  });

  it('should not call orientation lock on desktop', () => {
    GAME.isMobile = false;
    var lockCalled = false;
    Object.defineProperty(screen, 'orientation', {
      value: { lock: function() { lockCalled = true; return Promise.resolve(); }, unlock: function() {} },
      writable: true, configurable: true
    });
    var origRequest = document.documentElement.requestFullscreen;
    document.documentElement.requestFullscreen = function() { return Promise.resolve(); };
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    GAME.fullscreen.toggle();
    expect(lockCalled).toBe(false);
    document.documentElement.requestFullscreen = origRequest;
  });
});

describe('button state updates', () => {
  it('should add fs-active class to menu button when fullscreenchange fires as active', () => {
    var btn = document.createElement('div');
    btn.id = 'fullscreen-btn';
    document.body.appendChild(btn);
    Object.defineProperty(document, 'fullscreenElement', { value: document.documentElement, writable: true, configurable: true });
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(btn.classList.contains('fs-active')).toBe(true);
    document.body.removeChild(btn);
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
  });

  it('should remove fs-active class when fullscreenchange fires as inactive', () => {
    var btn = document.createElement('div');
    btn.id = 'fullscreen-btn';
    btn.classList.add('fs-active');
    document.body.appendChild(btn);
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(btn.classList.contains('fs-active')).toBe(false);
    document.body.removeChild(btn);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm test -- tests/unit/fullscreen.test.js`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add tests/unit/fullscreen.test.js
git commit -m "test: add F11, popstate, orientation lock, and button state tests"
```

---

### Task 3: Add CSS and HTML for fullscreen buttons

**Files:**
- Modify: `index.html` (CSS styles, menu button markup, mobile HUD button markup, script tag)

- [ ] **Step 1: Add CSS for fullscreen buttons**

In `index.html`, after the `#touch-pause` CSS block (after line 1377), add:

```css
  #fullscreen-btn {
    position: absolute; top: 12px; right: 12px; z-index: 50;
    width: 28px; height: 28px; cursor: pointer;
    background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.2);
    border-radius: 4px;
  }
  #fullscreen-btn span {
    position: absolute; width: 7px; height: 7px;
    border-color: rgba(255,255,255,0.7); border-style: solid;
  }
  #fullscreen-btn span:nth-child(1) { top: 3px; left: 3px; border-width: 2px 0 0 2px; }
  #fullscreen-btn span:nth-child(2) { top: 3px; right: 3px; border-width: 2px 2px 0 0; }
  #fullscreen-btn span:nth-child(3) { bottom: 3px; left: 3px; border-width: 0 0 2px 2px; }
  #fullscreen-btn span:nth-child(4) { bottom: 3px; right: 3px; border-width: 0 2px 2px 0; }
  #fullscreen-btn.fs-active span:nth-child(1) { top: 3px; left: 3px; border-width: 0 2px 2px 0; }
  #fullscreen-btn.fs-active span:nth-child(2) { top: 3px; right: 3px; border-width: 0 0 2px 2px; }
  #fullscreen-btn.fs-active span:nth-child(3) { bottom: 3px; left: 3px; border-width: 2px 2px 0 0; }
  #fullscreen-btn.fs-active span:nth-child(4) { bottom: 3px; right: 3px; border-width: 2px 0 0 2px; }
  #touch-fullscreen {
    position: fixed; top: 8px; right: 52px; z-index: 102;
    width: 44px; height: 44px; border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
  }
  #touch-fullscreen span {
    position: absolute; width: 7px; height: 7px;
    border-color: rgba(255,255,255,0.7); border-style: solid;
  }
  #touch-fullscreen span:nth-child(1) { top: 10px; left: 10px; border-width: 2px 0 0 2px; }
  #touch-fullscreen span:nth-child(2) { top: 10px; right: 10px; border-width: 2px 2px 0 0; }
  #touch-fullscreen span:nth-child(3) { bottom: 10px; left: 10px; border-width: 0 0 2px 2px; }
  #touch-fullscreen span:nth-child(4) { bottom: 10px; right: 10px; border-width: 0 2px 2px 0; }
  #touch-fullscreen.fs-active span:nth-child(1) { top: 10px; left: 10px; border-width: 0 2px 2px 0; }
  #touch-fullscreen.fs-active span:nth-child(2) { top: 10px; right: 10px; border-width: 0 0 2px 2px; }
  #touch-fullscreen.fs-active span:nth-child(3) { bottom: 10px; left: 10px; border-width: 2px 2px 0 0; }
  #touch-fullscreen.fs-active span:nth-child(4) { bottom: 10px; right: 10px; border-width: 2px 0 0 2px; }
```

Note: `#touch-fullscreen` is 44x44px to meet the spec's minimum tap target size. Span offsets are adjusted (10px) to center the icon within the larger button.

- [ ] **Step 2: Add `#touch-fullscreen` to the existing desktop-hide media query**

In `index.html`, find the `@media (pointer: fine)` block (line 1452-1457) and add `#touch-fullscreen` to the existing selector list:

```css
  @media (pointer: fine) {
    #touch-move-zone, #touch-look-zone, #touch-joystick,
    #touch-action-buttons, #touch-weapon-strip, #touch-pause,
    #touch-buy-menu, #orient-overlay, #touch-fullscreen {
      display: none !important;
    }
  }
```

- [ ] **Step 3: Add menu button markup**

In `index.html`, inside `#menu-screen` after `<div id="menu-version">v1.0</div>` (line 1600), add:

```html
  <div id="fullscreen-btn"><span></span><span></span><span></span><span></span></div>
```

This is inside `#menu-screen`, so it's automatically hidden when the menu is hidden during gameplay.

- [ ] **Step 4: Add mobile HUD button markup**

In `index.html`, in the `<body>` after the HUD section, add:

```html
<div id="touch-fullscreen"><span></span><span></span><span></span><span></span></div>
```

- [ ] **Step 5: Add script tag**

In `index.html`, add between `js/quality.js` (line 1931) and `js/main.js` (line 1932):

```html
<script src="js/fullscreen.js"></script>
```

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat: add fullscreen button CSS, markup, and script tag"
```

---

### Task 4: Integrate with main.js — init, auto-enter, exit on menu

**Files:**
- Modify: `js/main.js:1820` (add init call)
- Modify: `js/main.js:859` (auto-enter on mobile game start)
- Modify: `js/main.js:3426` (exit on goToMenu)

- [ ] **Step 1: Add init call**

In `js/main.js`, inside the `init()` function, after `_updateQuickPlayInfo();` (line 1820), add:

```js
    if (GAME.fullscreen) GAME.fullscreen.init();
```

- [ ] **Step 2: Add mobile auto-enter on game start**

In `js/main.js`, modify `_fadeMenuAndStart()` (line 859) to call fullscreen toggle at the top, directly in the user gesture context:

```js
  function _fadeMenuAndStart(startFn) {
    if (GAME.isMobile && GAME.fullscreen) GAME.fullscreen.toggle();
    if (dom.menuContent) {
      dom.menuContent.classList.add('fade-out');
      setTimeout(function() {
        dom.menuContent.classList.remove('fade-out');
        startFn();
      }, 300);
    } else {
      startFn();
    }
  }
```

The `toggle()` call is placed at the top of the function, directly in the call stack of the user's click/tap event, satisfying the browser's user gesture requirement for `requestFullscreen`.

- [ ] **Step 3: Exit fullscreen on goToMenu**

In `js/main.js`, in `goToMenu()` (line 3426), after `gameState = MENU;` (line 3427), add:

```js
    if (GAME.fullscreen && GAME.fullscreen.isActive()) GAME.fullscreen.toggle();
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add js/main.js
git commit -m "feat: integrate fullscreen init, mobile auto-enter, and menu exit"
```

---

### Task 5: Integrate with touch.js — controlIds and hiddenIds

**Files:**
- Modify: `js/touch.js:334-335` (controlIds array)
- Modify: `js/touch.js:514-515` (hiddenIds array)

Note: No existing `screen.orientation` lock logic exists in touch.js — verified via search. The orientation overlay (rotate phone prompt) remains as a fallback for when fullscreen orientation lock isn't available.

- [ ] **Step 1: Add touch-fullscreen to controlIds**

In `js/touch.js`, in `updateTouchControlVisibility()` (line 334-335), add `'touch-fullscreen'` to the `controlIds` array:

```js
    var controlIds = ['touch-move-zone', 'touch-look-zone', 'touch-joystick',
                      'touch-action-buttons', 'touch-weapon-strip', 'touch-pause-btn', 'touch-fullscreen'];
```

- [ ] **Step 2: Add touch-fullscreen to hiddenIds**

In `js/touch.js`, in the mobile init block (line 514-515), add `'touch-fullscreen'` to the `hiddenIds` array:

```js
    var hiddenIds = ['touch-move-zone', 'touch-look-zone', 'touch-joystick',
                     'touch-action-buttons', 'touch-weapon-strip', 'touch-pause-btn', 'touch-fullscreen'];
```

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add js/touch.js
git commit -m "feat: add touch-fullscreen to mobile control visibility arrays"
```

---

### Task 6: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Find the appropriate section**

Search `REQUIREMENTS.md` for the Controls or UI section to add fullscreen documentation.

- [ ] **Step 2: Add Fullscreen Mode section**

Add a new "Fullscreen Mode" subsection with:

```markdown
### Fullscreen Mode
- **Desktop:** F11 key toggles fullscreen (Fullscreen API). Menu button (top-right corner, CSS expand/collapse icon) also toggles.
- **Mobile:** Auto-enters fullscreen with landscape orientation lock on game start. HUD button (44x44px, near pause button) to toggle. Phone back button exits fullscreen (via History API popstate).
- **Return to menu:** Exits fullscreen and unlocks orientation.
- **No persistence:** Fullscreen preference is not saved across sessions.
- **Browser fallbacks:** WebKit vendor prefixes for Safari/iOS. Silent failure if APIs unsupported.
- **History state management:** On mobile, `history.pushState` on enter, `popstate` listener on exit. Internal `_historyPushed` flag prevents re-entrant loops between `fullscreenchange` and `popstate` handlers.
```

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: add fullscreen mode to REQUIREMENTS.md"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests PASS (should be 423 + new fullscreen tests)

- [ ] **Step 2: Manual smoke test**

Open `index.html` in a browser and verify:
- Menu shows fullscreen button in top-right corner
- Clicking it enters fullscreen, icon changes to collapse style
- Pressing F11 toggles fullscreen
- On mobile (or DevTools mobile simulation): starting a game enters fullscreen + landscape
- Back button exits fullscreen on mobile
- Returning to menu exits fullscreen
- HUD fullscreen button appears during gameplay on mobile, hidden on menu/end screens

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: fullscreen final adjustments from smoke test"
```
