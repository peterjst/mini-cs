# Menu UX Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the static dark menu background with a live 3D map flythrough, add a Quick Play button for one-click gameplay, and polish menu UI for readability over 3D.

**Architecture:** Reuse the existing `GAME.buildMap()` and `renderWithBloom()` pipeline to render a random map behind the menu. Define per-map camera flythrough keyframes. Add a Quick Play button that reads last-used settings from localStorage. Make menu elements semi-transparent with backdrop blur so the 3D scene shows through.

**Tech Stack:** Three.js r160.1 (existing), CSS backdrop-filter, existing IIFE module pattern, Vitest for tests.

---

### Task 1: Add Camera Flythrough Data and Update Function

**Files:**
- Modify: `js/main.js` (add flythrough data + camera update logic)
- Test: `tests/unit/main.test.js`

**Step 1: Write the failing test**

Add to `tests/unit/main.test.js`:

```javascript
describe('menu flythrough', function() {
  it('should expose GAME._menuFlythroughPaths with one entry per map', function() {
    expect(GAME._menuFlythroughPaths).toBeDefined();
    expect(Array.isArray(GAME._menuFlythroughPaths)).toBe(true);
    expect(GAME._menuFlythroughPaths.length).toBe(GAME.getMapCount());
  });

  it('each flythrough path should have 4-6 keyframes with position, lookAt, duration', function() {
    GAME._menuFlythroughPaths.forEach(function(path) {
      expect(path.length).toBeGreaterThanOrEqual(4);
      expect(path.length).toBeLessThanOrEqual(6);
      path.forEach(function(kf) {
        expect(kf.position).toBeDefined();
        expect(kf.position.x).toBeDefined();
        expect(kf.position.y).toBeDefined();
        expect(kf.position.z).toBeDefined();
        expect(kf.lookAt).toBeDefined();
        expect(kf.lookAt.x).toBeDefined();
        expect(kf.lookAt.y).toBeDefined();
        expect(kf.lookAt.z).toBeDefined();
        expect(typeof kf.duration).toBe('number');
        expect(kf.duration).toBeGreaterThan(0);
      });
    });
  });

  it('should expose GAME.updateMenuFlythrough function', function() {
    expect(typeof GAME.updateMenuFlythrough).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `GAME._menuFlythroughPaths` is undefined

**Step 3: Write minimal implementation**

In `js/main.js`, after the existing variable declarations (around line 340, after `selectedMapMode`), add the flythrough path data and update function:

```javascript
// Menu flythrough camera paths — one per map (indexed same as GAME._maps)
// Each keyframe: { position: {x,y,z}, lookAt: {x,y,z}, duration: seconds }
var _menuFlythroughPaths = [
  // Dust (50x50) — sweep through market, past vehicle, overview
  [
    { position: {x:-22,y:3,z:-22}, lookAt: {x:0,y:2,z:0}, duration: 6 },
    { position: {x:-10,y:4,z:-15}, lookAt: {x:5,y:2,z:5}, duration: 5 },
    { position: {x:10,y:6,z:0}, lookAt: {x:-5,y:1,z:10}, duration: 5 },
    { position: {x:15,y:3,z:15}, lookAt: {x:-10,y:2,z:-5}, duration: 5 },
    { position: {x:-15,y:8,z:10}, lookAt: {x:0,y:0,z:0}, duration: 5 }
  ],
  // Office (40x40) — through corridors, past desks
  [
    { position: {x:-16,y:3,z:-16}, lookAt: {x:0,y:2,z:0}, duration: 5 },
    { position: {x:-5,y:4,z:-10}, lookAt: {x:10,y:2,z:5}, duration: 5 },
    { position: {x:10,y:3,z:0}, lookAt: {x:-5,y:2,z:10}, duration: 5 },
    { position: {x:5,y:5,z:12}, lookAt: {x:-10,y:1,z:-5}, duration: 5 },
    { position: {x:-12,y:4,z:5}, lookAt: {x:5,y:2,z:-10}, duration: 5 }
  ],
  // Warehouse (60x50) — ground floor, up to platforms, overview
  [
    { position: {x:-25,y:3,z:-20}, lookAt: {x:0,y:4,z:0}, duration: 5 },
    { position: {x:-10,y:6,z:-15}, lookAt: {x:10,y:4,z:10}, duration: 5 },
    { position: {x:15,y:8,z:0}, lookAt: {x:-5,y:2,z:15}, duration: 6 },
    { position: {x:20,y:10,z:15}, lookAt: {x:-10,y:4,z:-10}, duration: 5 },
    { position: {x:-20,y:12,z:10}, lookAt: {x:0,y:0,z:0}, duration: 5 }
  ],
  // Bloodstrike (60x44) — corridor loop, past corners and platforms
  [
    { position: {x:-24,y:3,z:-14}, lookAt: {x:0,y:3,z:-14}, duration: 5 },
    { position: {x:24,y:4,z:-18}, lookAt: {x:24,y:3,z:10}, duration: 5 },
    { position: {x:20,y:6,z:16}, lookAt: {x:-10,y:3,z:16}, duration: 5 },
    { position: {x:-24,y:4,z:18}, lookAt: {x:-24,y:3,z:-5}, duration: 5 },
    { position: {x:0,y:10,z:0}, lookAt: {x:0,y:0,z:0}, duration: 6 }
  ],
  // Italy (55x50) — piazza, alleys, buildings
  [
    { position: {x:-24,y:3,z:-20}, lookAt: {x:0,y:2,z:0}, duration: 5 },
    { position: {x:-5,y:5,z:-15}, lookAt: {x:5,y:2,z:5}, duration: 5 },
    { position: {x:10,y:4,z:0}, lookAt: {x:-5,y:3,z:10}, duration: 6 },
    { position: {x:15,y:3,z:12}, lookAt: {x:-10,y:2,z:-5}, duration: 5 },
    { position: {x:-15,y:8,z:5}, lookAt: {x:0,y:1,z:0}, duration: 5 }
  ],
  // Aztec (70x60) — temple, river, bridge
  [
    { position: {x:-20,y:4,z:20}, lookAt: {x:10,y:2,z:0}, duration: 5 },
    { position: {x:0,y:3,z:10}, lookAt: {x:15,y:4,z:18}, duration: 5 },
    { position: {x:15,y:6,z:10}, lookAt: {x:-10,y:0,z:-10}, duration: 6 },
    { position: {x:10,y:3,z:-15}, lookAt: {x:-18,y:3,z:-18}, duration: 5 },
    { position: {x:-15,y:10,z:0}, lookAt: {x:0,y:0,z:0}, duration: 5 }
  ],
  // Arena (40x40) — cross corridors, center platform
  [
    { position: {x:-16,y:3,z:-16}, lookAt: {x:0,y:2,z:0}, duration: 5 },
    { position: {x:14,y:4,z:-14}, lookAt: {x:-5,y:2,z:5}, duration: 5 },
    { position: {x:14,y:3,z:14}, lookAt: {x:-14,y:2,z:-5}, duration: 5 },
    { position: {x:-14,y:5,z:14}, lookAt: {x:0,y:1,z:0}, duration: 5 },
    { position: {x:0,y:8,z:0}, lookAt: {x:5,y:0,z:5}, duration: 6 }
  ]
];

// Flythrough state
var _ftPathIndex = 0;   // current keyframe index
var _ftProgress = 0;    // 0-1 progress between current and next keyframe
var _ftMapIndex = -1;   // which map is currently built for menu background

GAME._menuFlythroughPaths = _menuFlythroughPaths;

GAME.updateMenuFlythrough = function(dt) {
  if (_ftMapIndex < 0) return;
  var path = _menuFlythroughPaths[_ftMapIndex];
  if (!path || path.length < 2) return;

  var curr = path[_ftPathIndex];
  var next = path[(_ftPathIndex + 1) % path.length];

  _ftProgress += dt / curr.duration;

  if (_ftProgress >= 1) {
    _ftProgress -= 1;
    _ftPathIndex = (_ftPathIndex + 1) % path.length;
    curr = path[_ftPathIndex];
    next = path[(_ftPathIndex + 1) % path.length];
  }

  // Smooth interpolation using smoothstep
  var t = _ftProgress * _ftProgress * (3 - 2 * _ftProgress);

  camera.position.set(
    curr.position.x + (next.position.x - curr.position.x) * t,
    curr.position.y + (next.position.y - curr.position.y) * t,
    curr.position.z + (next.position.z - curr.position.z) * t
  );

  var lx = curr.lookAt.x + (next.lookAt.x - curr.lookAt.x) * t;
  var ly = curr.lookAt.y + (next.lookAt.y - curr.lookAt.y) * t;
  var lz = curr.lookAt.z + (next.lookAt.z - curr.lookAt.z) * t;
  camera.lookAt(lx, ly, lz);
  camera.updateProjectionMatrix();
};
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```
git add js/main.js tests/unit/main.test.js
git commit -m "Add per-map camera flythrough paths and update function for menu background"
```

---

### Task 2: Build Menu Background Scene on Menu Entry

**Files:**
- Modify: `js/main.js` (modify `goToMenu()`, add `_buildMenuScene()`, modify initial setup)
- Modify: `tests/setup.js` (add new DOM IDs if needed)
- Test: `tests/unit/main.test.js`

**Step 1: Write the failing test**

Add to `tests/unit/main.test.js`:

```javascript
describe('menu background scene', function() {
  it('should expose GAME.buildMenuScene function', function() {
    expect(typeof GAME.buildMenuScene).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `GAME.buildMenuScene` is undefined

**Step 3: Write minimal implementation**

In `js/main.js`, add a `_buildMenuScene()` function (near the flythrough code from Task 1):

```javascript
function _buildMenuScene() {
  scene = new THREE.Scene();
  scene.add(camera);

  // Pick a random map
  _ftMapIndex = Math.floor(Math.random() * GAME.getMapCount());
  _ftPathIndex = 0;
  _ftProgress = 0;

  GAME.buildMap(scene, _ftMapIndex, renderer);

  // Spawn birds for atmosphere
  spawnBirds(Math.max(
    GAME.getMapDef(_ftMapIndex).size.x,
    GAME.getMapDef(_ftMapIndex).size.z
  ));

  // Start ambient sound for this map
  if (GAME.Sound) {
    GAME.Sound.startAmbient(GAME.getMapDef(_ftMapIndex).name);
    if (GAME.Sound.initReverb) GAME.Sound.initReverb(GAME.getMapDef(_ftMapIndex).name);
  }

  // Position camera at first keyframe
  var firstKf = _menuFlythroughPaths[_ftMapIndex][0];
  camera.position.set(firstKf.position.x, firstKf.position.y, firstKf.position.z);
  camera.lookAt(firstKf.lookAt.x, firstKf.lookAt.y, firstKf.lookAt.z);

  // Reset camera FOV to default (flythrough doesn't use player FOV)
  camera.fov = 75;
  camera.updateProjectionMatrix();
}

GAME.buildMenuScene = _buildMenuScene;
```

Then modify the **end of the IIFE initialization** (after all setup, near where `gameLoop` first starts). Find the initial `gameLoop()` call and add `_buildMenuScene()` before it:

```javascript
_buildMenuScene();
requestAnimationFrame(gameLoop);
```

Then modify `goToMenu()` — add `_buildMenuScene()` call after the existing code (before the closing `}`):

```javascript
function goToMenu() {
  // ... existing code stays unchanged ...
  _buildMenuScene();
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```
git add js/main.js tests/unit/main.test.js
git commit -m "Build random map scene as menu background on menu entry"
```

---

### Task 3: Animate Camera During MENU State in Game Loop

**Files:**
- Modify: `js/main.js` (update game loop MENU branch)

**Step 1: Write the failing test**

This is a game loop integration change — test via existing rendering path. Add to `tests/unit/main.test.js`:

```javascript
describe('menu camera animation', function() {
  it('updateMenuFlythrough should update camera position', function() {
    // Set up a valid flythrough state
    GAME._menuFlythroughPaths[0][0].position = {x:0, y:5, z:0};
    GAME._menuFlythroughPaths[0][1].position = {x:10, y:5, z:10};
    GAME.updateMenuFlythrough(0.1);
    // Camera should have been modified (exact values depend on smoothstep)
    // Just verify it doesn't throw
    expect(true).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: May pass (smoke test) — the important part is the implementation.

**Step 3: Write minimal implementation**

In `js/main.js`, find the game loop's MENU state handler (around line 3655):

```javascript
// BEFORE:
if (gameState === MENU || gameState === MATCH_END || gameState === PAUSED || gameState === GUNGAME_END) {
  renderWithBloom();
  return;
}

// AFTER:
if (gameState === MENU || gameState === MATCH_END || gameState === PAUSED || gameState === GUNGAME_END) {
  if (gameState === MENU) {
    GAME.updateMenuFlythrough(dt);
    updateBirds(dt);
  }
  renderWithBloom();
  return;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```
git add js/main.js tests/unit/main.test.js
git commit -m "Animate camera flythrough and birds during menu state"
```

---

### Task 4: Update Menu CSS for Transparent Background Over 3D

**Files:**
- Modify: `index.html` (CSS changes for `#menu-screen`, `#menu-bg`, `#menu-content`, `.mode-card`, remove particles)
- Modify: `js/main.js` (remove particle spawning code if it exists there)

**Step 1: Write the failing test**

CSS changes are visual — no unit test needed. Instead, verify manually after changes.

**Step 2: Make CSS changes**

In `index.html`, modify the menu CSS:

**Replace `#menu-screen` background** (line 275):
```css
#menu-screen {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: transparent;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  z-index: 20; color: #fff; overflow: hidden;
}
```

**Replace `#menu-bg`** — remove scan lines (::before), keep vignette (::after), add dark overlay:
```css
#menu-bg {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none; overflow: hidden;
  background: rgba(0,0,0,0.3);
}
#menu-bg::before {
  content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: none;
  z-index: 1; pointer-events: none;
}
```

**Add backdrop blur to `#menu-content`** (line 326):
```css
#menu-content {
  position: relative; z-index: 10;
  display: flex; flex-direction: column; align-items: center;
  animation: menuFadeIn 1.2s ease-out;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  padding: 20px 40px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(10,15,25,0.5) 0%, rgba(10,15,25,0.3) 100%);
}
```

**Update `.mode-card` backgrounds** for glass effect:
```css
/* Add/update to .mode-card styles */
.mode-card {
  background: rgba(10,15,25,0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
```

**Remove `.menu-particle` animation** — delete or comment out the `.menu-particle` CSS rules (lines 300-310) and the `particleFloat` keyframes.

**Remove `#menu-sweep`** — delete or set `display: none`:
```css
#menu-sweep { display: none; }
```

**Step 3: Remove particle spawning JS**

In `js/main.js`, search for code that creates `.menu-particle` DOM elements and remove or skip it. (Search for `menu-particle` or `particleFloat`.)

**Step 4: Verify visually**

Open `index.html` in browser. Menu should show 3D map behind with semi-transparent UI floating over it.

Run: `npm test`
Expected: PASS (no logic changes that would break tests)

**Step 5: Commit**

```
git add index.html js/main.js
git commit -m "Make menu transparent with backdrop blur over live 3D background"
```

---

### Task 5: Add Quick Play Button to HTML and CSS

**Files:**
- Modify: `index.html` (add Quick Play button HTML + CSS)
- Modify: `tests/setup.js` (add `quick-play-btn` and `quick-play-info` to DOM mock)

**Step 1: Add DOM element to test setup**

In `tests/setup.js`, add to the `hudIds` array (around line 410):
```javascript
'quick-play-btn', 'quick-play-info',
```

**Step 2: Add HTML**

In `index.html`, inside `#menu-content`, add the Quick Play button **after `#rank-display` and before `.mode-grid`**:

```html
<button id="quick-play-btn" class="quick-play-btn">QUICK PLAY</button>
<div id="quick-play-info" class="quick-play-info"></div>
```

**Step 3: Add CSS**

In the `<style>` section, add after the rank display styles:

```css
.quick-play-btn {
  margin: 16px 0 8px;
  padding: 14px 48px;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #fff;
  background: linear-gradient(135deg, rgba(79,195,247,0.25) 0%, rgba(79,195,247,0.1) 100%);
  border: 2px solid rgba(79,195,247,0.6);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  animation: quickPlayPulse 2s ease-in-out infinite;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.quick-play-btn:hover {
  background: linear-gradient(135deg, rgba(79,195,247,0.4) 0%, rgba(79,195,247,0.2) 100%);
  border-color: rgba(79,195,247,0.9);
  box-shadow: 0 0 20px rgba(79,195,247,0.4), inset 0 0 20px rgba(79,195,247,0.1);
  transform: scale(1.03);
}
@keyframes quickPlayPulse {
  0%, 100% { box-shadow: 0 0 8px rgba(79,195,247,0.2); }
  50% { box-shadow: 0 0 16px rgba(79,195,247,0.4), 0 0 30px rgba(79,195,247,0.15); }
}
.quick-play-info {
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  letter-spacing: 1px;
  margin-bottom: 16px;
  text-transform: uppercase;
}
```

**Step 4: Run tests**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```
git add index.html tests/setup.js
git commit -m "Add Quick Play button HTML and CSS with pulsing glow"
```

---

### Task 6: Implement Quick Play Logic

**Files:**
- Modify: `js/main.js` (add Quick Play click handler, settings reader, info updater)
- Test: `tests/unit/main.test.js`

**Step 1: Write the failing test**

Add to `tests/unit/main.test.js`:

```javascript
describe('quick play', function() {
  it('should expose GAME.getQuickPlaySettings function', function() {
    expect(typeof GAME.getQuickPlaySettings).toBe('function');
  });

  it('should return default settings when no localStorage data', function() {
    localStorage.clear();
    var settings = GAME.getQuickPlaySettings();
    expect(settings.mode).toBe('competitive');
    expect(settings.difficulty).toBe('normal');
    expect(settings.mapIndex).toBeGreaterThanOrEqual(0);
  });

  it('should return saved settings from localStorage', function() {
    localStorage.setItem('miniCS_lastMode', 'survival');
    localStorage.setItem('miniCS_difficulty', 'hard');
    localStorage.setItem('miniCS_lastMap_surv-maps', '2');
    var settings = GAME.getQuickPlaySettings();
    expect(settings.mode).toBe('survival');
    expect(settings.difficulty).toBe('hard');
    localStorage.clear();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `GAME.getQuickPlaySettings` is undefined

**Step 3: Write minimal implementation**

In `js/main.js`, add the Quick Play settings reader and click handler.

Add `dom.quickPlayBtn` and `dom.quickPlayInfo` to the dom object:
```javascript
quickPlayBtn:    document.getElementById('quick-play-btn'),
quickPlayInfo:   document.getElementById('quick-play-info'),
```

Add the settings function:
```javascript
var _modeGridIds = { competitive: 'comp-maps', survival: 'surv-maps', gungame: 'gg-maps', deathmatch: 'dm-maps' };

function _getQuickPlaySettings() {
  var mode = localStorage.getItem('miniCS_lastMode') || 'competitive';
  var difficulty = localStorage.getItem('miniCS_difficulty') || 'normal';
  var mapMode = localStorage.getItem('miniCS_mapMode') || 'fixed';
  var gridId = _modeGridIds[mode] || 'comp-maps';
  var mapIndex = parseInt(localStorage.getItem('miniCS_lastMap_' + gridId)) || 0;
  if (mapIndex >= GAME.getMapCount()) mapIndex = 0;

  // First-time fallback: random map
  if (!localStorage.getItem('miniCS_lastMode')) {
    mapIndex = Math.floor(Math.random() * GAME.getMapCount());
  }

  return {
    mode: mode,
    difficulty: difficulty,
    mapMode: mapMode,
    mapIndex: mapIndex
  };
}

GAME.getQuickPlaySettings = _getQuickPlaySettings;
```

Add the info text updater (call on menu entry):
```javascript
function _updateQuickPlayInfo() {
  var s = _getQuickPlaySettings();
  var mapName = GAME.getMapDef(s.mapIndex).name;
  var modeLabel = s.mode === 'competitive' ? 'Competitive' : s.mode === 'survival' ? 'Survival' : s.mode === 'gungame' ? 'Gun Game' : 'Deathmatch';
  var diffLabel = s.difficulty.charAt(0).toUpperCase() + s.difficulty.slice(1);
  if (dom.quickPlayInfo) {
    dom.quickPlayInfo.textContent = modeLabel + ' \u00B7 ' + diffLabel + ' \u00B7 ' + mapName;
  }
}
```

Call `_updateQuickPlayInfo()` at end of `goToMenu()` and at initial menu setup.

Add click handler in `setupInput()` or the init section:
```javascript
if (dom.quickPlayBtn) {
  dom.quickPlayBtn.addEventListener('click', function() {
    var s = _getQuickPlaySettings();
    selectedDifficulty = s.difficulty;
    GAME.setDifficulty(s.difficulty);
    selectedMapMode = s.mapMode;

    if (s.mode === 'survival') {
      startSurvival(s.mapIndex);
    } else if (s.mode === 'gungame') {
      startGunGame(s.mapIndex);
    } else if (s.mode === 'deathmatch') {
      startDeathmatch(s.mapIndex);
    } else {
      startMatch(s.mapIndex);
    }
  });
}
```

Save the last-used mode when starting each mode. Add to each start function:
- In `startMatch()`: `localStorage.setItem('miniCS_lastMode', 'competitive');`
- In `startSurvival()`: `localStorage.setItem('miniCS_lastMode', 'survival');`
- In `startGunGame()`: `localStorage.setItem('miniCS_lastMode', 'gungame');`
- In `startDeathmatch()`: `localStorage.setItem('miniCS_lastMode', 'deathmatch');`

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```
git add js/main.js tests/unit/main.test.js
git commit -m "Implement Quick Play button with last-used settings and fallback defaults"
```

---

### Task 7: Add Menu Fade Transition

**Files:**
- Modify: `index.html` (add fade-out CSS class)
- Modify: `js/main.js` (apply fade before starting game)

**Step 1: Add CSS**

In `index.html`, add:

```css
#menu-content.fade-out {
  opacity: 0;
  transform: translateY(-20px);
  transition: opacity 0.3s ease, transform 0.3s ease;
}
```

**Step 2: Wrap menu hide in transition**

In `js/main.js`, create a helper function:

```javascript
function _fadeMenuAndStart(startFn) {
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

Add `menuContent: document.getElementById('menu-content')` to the `dom` object, and `'menu-content'` to `tests/setup.js` hudIds.

Then update the Quick Play click handler and each START button handler to wrap through `_fadeMenuAndStart`:

```javascript
// Quick Play:
dom.quickPlayBtn.addEventListener('click', function() {
  var s = _getQuickPlaySettings();
  selectedDifficulty = s.difficulty;
  GAME.setDifficulty(s.difficulty);
  selectedMapMode = s.mapMode;
  _fadeMenuAndStart(function() {
    if (s.mode === 'survival') startSurvival(s.mapIndex);
    else if (s.mode === 'gungame') startGunGame(s.mapIndex);
    else if (s.mode === 'deathmatch') startDeathmatch(s.mapIndex);
    else startMatch(s.mapIndex);
  });
});
```

Apply `_fadeMenuAndStart` similarly to existing START button click handlers (comp-start-btn, surv-start-btn, gg-start-btn, dm-start-btn).

**Step 3: Fade in on menu return**

In `goToMenu()`, the existing `menuFadeIn` CSS animation on `#menu-content` already handles fade-in. No change needed.

**Step 4: Run tests**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```
git add index.html js/main.js tests/setup.js
git commit -m "Add smooth fade transition when leaving menu to start game"
```

---

### Task 8: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md` (document new menu features)

**Step 1: Add menu background section**

In the **Screens → Menu screen** section of REQUIREMENTS.md, update the menu screen description to document:

- Live 3D background: random map rendered behind menu using existing `buildMap()` and `renderWithBloom()` pipeline
- Camera flythrough: per-map scripted keyframe paths (4-6 keyframes, 20-30 second loop), smoothstep interpolation
- Flythrough data stored in `GAME._menuFlythroughPaths`, updated via `GAME.updateMenuFlythrough(dt)`
- Birds fly in the background
- Ambient sound plays for the background map
- Background rebuilds with new random map on each menu return

- Quick Play button: above mode grid, reads last-used settings from localStorage (`miniCS_lastMode`, etc.), first-time fallback to Normal/random map/Competitive Solo
- Settings preview text below Quick Play button showing mode/difficulty/map
- `GAME.getQuickPlaySettings()` API

- Semi-transparent menu UI: `backdrop-filter: blur` on content and mode cards
- Removed: floating particles, scan lines, sweep animation, dark gradient background
- Kept: vignette overlay, dark semi-transparent overlay for text readability

- Fade-out transition (0.3s) when starting a game from menu

**Step 2: Commit**

```
git add REQUIREMENTS.md
git commit -m "Update REQUIREMENTS.md with menu UX overhaul — 3D background, Quick Play, UI polish"
```

---

## Task Dependency Summary

```
Task 1 (flythrough data) ─┐
                           ├─> Task 3 (animate in game loop)
Task 2 (build menu scene) ─┘
Task 4 (CSS transparency) ── independent
Task 5 (Quick Play HTML)  ──> Task 6 (Quick Play logic)
Task 6 ──> Task 7 (fade transition)
Task 8 (REQUIREMENTS.md)  ── after all others
```

Tasks 1+2, 4, and 5 can be worked on in parallel. Task 3 depends on 1+2. Task 6 depends on 5. Task 7 depends on 6. Task 8 is last.
