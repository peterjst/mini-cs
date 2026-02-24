# Menu UX Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the main menu from a single cluttered page to a 2x2 mode grid with inline expand, moving secondary content (controls, missions) to overlay screens.

**Architecture:** Replace existing menu HTML/CSS (title + Play button + secondary buttons + controls + missions) with a mode card grid. Each card expands inline to show mode-specific config (difficulty, map, start). Footer links open overlays for secondary content. All in `index.html` (HTML+CSS) and `js/main.js` (event listeners).

**Tech Stack:** HTML, CSS (transitions/animations), vanilla JS (DOM manipulation), localStorage

---

### Task 1: Add Mode Card Grid CSS

**Files:**
- Modify: `index.html:200-380` (CSS section)

**Step 1: Add new CSS for mode grid and cards**

Add after the existing `.menu-secondary-btn:hover` block (line ~378), before `/* Match end */`:

```css
/* ── Mode Card Grid ───────────────────────────────── */
.mode-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-width: 480px;
  width: 100%;
  margin-top: 24px;
  transition: all 0.3s ease;
}

.mode-card {
  position: relative;
  padding: 24px 20px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  overflow: hidden;
}
.mode-card::before {
  content: '';
  position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(79,195,247,0.08), transparent);
  transition: left 0.5s;
}
.mode-card:hover::before { left: 100%; }
.mode-card:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.25);
  transform: translateY(-2px);
}
.mode-card.primary {
  border-color: rgba(79,195,247,0.4);
}
.mode-card.primary:hover {
  border-color: rgba(79,195,247,0.7);
  box-shadow: 0 0 20px rgba(79,195,247,0.15);
}

.mode-card .mode-name {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #fff;
  margin-bottom: 6px;
}
.mode-card.primary .mode-name {
  color: #4fc3f7;
}
.mode-card .mode-desc {
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  letter-spacing: 1px;
}

/* ── Mode Grid: Expanded State ────────────────────── */
.mode-grid.expanded {
  grid-template-columns: 1fr;
  gap: 0;
}
.mode-grid.expanded .mode-card {
  display: none;
}
.mode-grid.expanded .mode-card.active {
  display: block;
  cursor: default;
  transform: none;
  border-color: rgba(79,195,247,0.4);
  padding: 28px 24px;
}
.mode-grid.expanded .mode-card.active:hover {
  transform: none;
}
.mode-grid.expanded .mode-card.active::before {
  display: none;
}

/* Expanded card config area */
.mode-config {
  display: none;
  margin-top: 20px;
  text-align: left;
}
.mode-card.active .mode-config {
  display: block;
}

.config-label {
  font-size: 10px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.3);
  margin-bottom: 8px;
  margin-top: 16px;
}
.config-label:first-child {
  margin-top: 0;
}

/* Difficulty buttons inside expanded card */
.config-diff-row {
  display: flex;
  gap: 6px;
}
.config-diff-btn {
  padding: 6px 16px;
  font-size: 11px;
  cursor: pointer;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.5);
  border-radius: 2px;
  letter-spacing: 2px;
  transition: all 0.2s;
  text-transform: uppercase;
  font-family: inherit;
}
.config-diff-btn:hover {
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.8);
}
.config-diff-btn.selected {
  background: rgba(79,195,247,0.15);
  border-color: #4fc3f7;
  color: #4fc3f7;
}

/* Map buttons inside expanded card */
.config-map-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.config-map-btn {
  padding: 6px 14px;
  font-size: 11px;
  cursor: pointer;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.5);
  border-radius: 2px;
  letter-spacing: 1px;
  transition: all 0.2s;
  font-family: inherit;
}
.config-map-btn:hover {
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.8);
}
.config-map-btn.selected {
  background: rgba(79,195,247,0.15);
  border-color: #4fc3f7;
  color: #4fc3f7;
}

/* Start button inside expanded card */
.mode-start-btn {
  display: block;
  width: 100%;
  margin-top: 20px;
  padding: 14px;
  font-size: 16px;
  cursor: pointer;
  background: rgba(79,195,247,0.1);
  border: 1px solid rgba(79,195,247,0.5);
  color: #4fc3f7;
  border-radius: 2px;
  letter-spacing: 4px;
  font-weight: 600;
  transition: all 0.3s;
  text-transform: uppercase;
  font-family: inherit;
}
.mode-start-btn:hover {
  background: rgba(79,195,247,0.2);
  border-color: #4fc3f7;
  box-shadow: 0 0 20px rgba(79,195,247,0.2);
}

/* Back link */
.mode-back {
  display: none;
  margin-top: 12px;
  font-size: 12px;
  color: rgba(255,255,255,0.3);
  cursor: pointer;
  letter-spacing: 1px;
  transition: color 0.2s;
  background: none;
  border: none;
  font-family: inherit;
}
.mode-back:hover {
  color: rgba(255,255,255,0.6);
}
.mode-grid.expanded ~ .mode-back {
  display: block;
}

/* ── Menu Footer Links ────────────────────────────── */
.menu-footer {
  display: flex;
  gap: 24px;
  margin-top: 32px;
}
.menu-footer-btn {
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.25);
  cursor: pointer;
  background: none;
  border: none;
  padding: 4px 0;
  transition: color 0.2s;
  font-family: inherit;
  border-bottom: 1px solid transparent;
}
.menu-footer-btn:hover {
  color: rgba(255,255,255,0.5);
  border-bottom-color: rgba(255,255,255,0.2);
}

/* ── Controls Overlay ─────────────────────────────── */
#controls-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.85);
  display: none; flex-direction: column; align-items: center; justify-content: center;
  z-index: 30; color: #fff;
}
#controls-overlay.show { display: flex; }
#controls-overlay h2 {
  font-size: 20px; letter-spacing: 4px; margin-bottom: 24px;
  color: rgba(255,255,255,0.7);
}
#controls-overlay .controls-grid {
  display: grid; grid-template-columns: repeat(3, auto); gap: 8px 24px;
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
#controls-overlay .overlay-close {
  margin-top: 24px; padding: 8px 32px; font-size: 12px; cursor: pointer;
  background: transparent; border: 1px solid rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.4); border-radius: 2px; letter-spacing: 2px;
  transition: all 0.2s; text-transform: uppercase; font-family: inherit;
}
#controls-overlay .overlay-close:hover {
  border-color: rgba(255,255,255,0.4); color: rgba(255,255,255,0.7);
}

/* ── Missions Overlay ─────────────────────────────── */
#missions-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.85);
  display: none; flex-direction: column; align-items: center; justify-content: center;
  z-index: 30; color: #fff;
}
#missions-overlay.show { display: flex; }
#missions-overlay h2 {
  font-size: 20px; letter-spacing: 4px; margin-bottom: 16px;
  color: rgba(255,255,255,0.7);
}
#missions-overlay .missions-content {
  max-width: 480px; width: 100%;
}
#missions-overlay .overlay-close {
  margin-top: 24px; padding: 8px 32px; font-size: 12px; cursor: pointer;
  background: transparent; border: 1px solid rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.4); border-radius: 2px; letter-spacing: 2px;
  transition: all 0.2s; text-transform: uppercase; font-family: inherit;
}
#missions-overlay .overlay-close:hover {
  border-color: rgba(255,255,255,0.4); color: rgba(255,255,255,0.7);
}
```

**Step 2: Verify visually**

Open `index.html` in browser. The new CSS should have no visible effect yet (no HTML uses these classes).

**Step 3: Commit**

```bash
git add index.html
git commit -m "style: add CSS for mode grid, expanded cards, and overlay screens"
```

---

### Task 2: Replace Menu HTML Structure

**Files:**
- Modify: `index.html:1011-1071` (menu screen HTML)

**Step 1: Replace the menu-content HTML**

Replace the entire `<div id="menu-content">` block (lines 1016–1069) with the new mode grid structure. Keep the `menu-bg`, `menu-sweep`, and `menu-version` elements untouched.

New `#menu-content`:

```html
<div id="menu-content">
    <div id="menu-emblem">
      <div class="emblem-h"></div>
      <div class="emblem-v"></div>
      <div class="emblem-ring"></div>
      <div class="emblem-dot"></div>
    </div>
    <h1>MINI CS</h1>
    <div class="subtitle-wrap">
      <div class="subtitle-line"></div>
      <div class="subtitle">Counter-Strike</div>
      <div class="subtitle-line"></div>
    </div>
    <div id="rank-display" class="rank-display"></div>

    <div class="mode-grid" id="mode-grid">
      <div class="mode-card primary" data-mode="competitive">
        <div class="mode-name">Competitive</div>
        <div class="mode-desc">Round-based 5v5 action</div>
        <div class="mode-config">
          <div class="config-label">Difficulty</div>
          <div class="config-diff-row" id="comp-diff-row">
            <button class="config-diff-btn" data-diff="easy">EASY</button>
            <button class="config-diff-btn selected" data-diff="normal">NORMAL</button>
            <button class="config-diff-btn" data-diff="hard">HARD</button>
            <button class="config-diff-btn" data-diff="elite">ELITE</button>
          </div>
          <div class="config-label">Map</div>
          <div class="config-map-grid" id="comp-map-grid"></div>
          <button class="mode-start-btn" id="comp-start-btn">START</button>
        </div>
      </div>
      <div class="mode-card" data-mode="survival">
        <div class="mode-name">Survival</div>
        <div class="mode-desc">Wave-based horde survival</div>
        <div class="mode-config">
          <div class="config-label">Difficulty</div>
          <div class="config-diff-row" id="surv-diff-row">
            <button class="config-diff-btn" data-diff="easy">EASY</button>
            <button class="config-diff-btn selected" data-diff="normal">NORMAL</button>
            <button class="config-diff-btn" data-diff="hard">HARD</button>
            <button class="config-diff-btn" data-diff="elite">ELITE</button>
          </div>
          <div class="config-label">Map</div>
          <div class="config-map-grid" id="surv-map-grid"></div>
          <button class="mode-start-btn" id="surv-start-btn">START</button>
        </div>
      </div>
      <div class="mode-card" data-mode="gungame">
        <div class="mode-name">Gun Game</div>
        <div class="mode-desc">Weapon progression challenge</div>
        <div class="mode-config">
          <div class="config-label">Difficulty</div>
          <div class="config-diff-row" id="gg-diff-row">
            <button class="config-diff-btn" data-diff="easy">EASY</button>
            <button class="config-diff-btn selected" data-diff="normal">NORMAL</button>
            <button class="config-diff-btn" data-diff="hard">HARD</button>
            <button class="config-diff-btn" data-diff="elite">ELITE</button>
          </div>
          <div class="config-label">Map</div>
          <div class="config-map-grid" id="gg-map-grid"></div>
          <button class="mode-start-btn" id="gg-start-btn">START</button>
        </div>
      </div>
      <div class="mode-card" data-mode="deathmatch">
        <div class="mode-name">Deathmatch</div>
        <div class="mode-desc">Free-for-all frags</div>
        <div class="mode-config">
          <div class="config-label">Difficulty</div>
          <div class="config-diff-row" id="dm-diff-row">
            <button class="config-diff-btn" data-diff="easy">EASY</button>
            <button class="config-diff-btn selected" data-diff="normal">NORMAL</button>
            <button class="config-diff-btn" data-diff="hard">HARD</button>
            <button class="config-diff-btn" data-diff="elite">ELITE</button>
          </div>
          <div class="config-label">Map</div>
          <div class="config-map-grid" id="dm-config-map-grid"></div>
          <button class="mode-start-btn" id="dm-start-btn">START</button>
        </div>
      </div>
    </div>
    <button class="mode-back" id="mode-back">&lsaquo; back to modes</button>

    <div class="menu-footer">
      <button class="menu-footer-btn" id="missions-footer-btn">Missions</button>
      <button class="menu-footer-btn" id="history-footer-btn">History</button>
      <button class="menu-footer-btn" id="tour-footer-btn">Tour Maps</button>
      <button class="menu-footer-btn" id="controls-footer-btn">Controls</button>
    </div>
  </div>
```

**Step 2: Add the Controls overlay HTML**

After the pause overlay (`</div>` on ~line 1397), add:

```html
<!-- Controls Overlay -->
<div id="controls-overlay">
  <h2>CONTROLS</h2>
  <div class="controls-grid">
    <div class="ctrl-item"><span class="ctrl-key">WASD</span> Move</div>
    <div class="ctrl-item"><span class="ctrl-key">Mouse</span> Look</div>
    <div class="ctrl-item"><span class="ctrl-key">Click</span> Shoot</div>
    <div class="ctrl-item"><span class="ctrl-key">Space</span> Jump</div>
    <div class="ctrl-item"><span class="ctrl-key">Shift</span> Sprint</div>
    <div class="ctrl-item"><span class="ctrl-key">R</span> Reload</div>
    <div class="ctrl-item"><span class="ctrl-key">C</span> Crouch</div>
    <div class="ctrl-item"><span class="ctrl-key">1-6</span> Weapons</div>
    <div class="ctrl-item"><span class="ctrl-key">B</span> Buy Menu</div>
    <div class="ctrl-item"><span class="ctrl-key">F/RMB</span> Scope</div>
  </div>
  <button class="overlay-close" id="controls-close">Close</button>
</div>
```

**Step 3: Add the Missions overlay HTML**

After the controls overlay, add:

```html
<!-- Missions Overlay -->
<div id="missions-overlay">
  <h2>DAILY MISSIONS</h2>
  <div class="missions-content">
    <div id="overlay-mission-daily-list" class="mission-list"></div>
    <h2 style="margin-top:24px;">WEEKLY MISSION</h2>
    <div id="overlay-mission-weekly" class="mission-card"></div>
  </div>
  <button class="overlay-close" id="missions-close">Close</button>
</div>
```

**Step 4: Remove old CSS that's no longer needed**

Remove these CSS blocks (they're replaced by the new mode grid CSS):
- `.start-btn` and `.btn-pulse` styles (lines ~309-336) — replaced by mode cards
- `.diff-selector` and `.diff-btn` styles (lines ~559-573) — replaced by `.config-diff-btn`
- Old `.menu-btn-row` and `.menu-secondary-btn` styles (lines ~367-378) — replaced by mode grid
- `.controls-wrap`, `.controls-title`, `.controls-grid`, `.ctrl-item`, `.ctrl-key` under `#menu-screen` (lines ~339-358) — moved to overlay
- `.missions-wrap` and `.missions-title` styles (lines ~732-744) — moved to overlay

**Step 5: Verify visually**

Open in browser. The menu should show the 2x2 mode grid (cards won't expand yet — that's JS). Footer links should be visible. Old Play button and secondary buttons should be gone.

**Step 6: Commit**

```bash
git add index.html
git commit -m "feat(menu): replace single Play button with 2x2 mode card grid"
```

---

### Task 3: Wire Up Mode Grid JS — Card Expand/Collapse

**Files:**
- Modify: `js/main.js:14-100` (DOM refs section)
- Modify: `js/main.js:892-1082` (event listener setup)

**Step 1: Add new DOM refs**

Add to the `dom` object (around line 15):

```js
modeGrid:       document.getElementById('mode-grid'),
modeBack:       document.getElementById('mode-back'),
compStartBtn:   document.getElementById('comp-start-btn'),
survStartBtn:   document.getElementById('surv-start-btn'),
ggStartBtn:     document.getElementById('gg-start-btn'),
dmStartBtn2:    document.getElementById('dm-start-btn'),
missionsFooter: document.getElementById('missions-footer-btn'),
historyFooter:  document.getElementById('history-footer-btn'),
tourFooter:     document.getElementById('tour-footer-btn'),
controlsFooter: document.getElementById('controls-footer-btn'),
controlsOverlay: document.getElementById('controls-overlay'),
controlsClose:  document.getElementById('controls-close'),
missionsOverlay: document.getElementById('missions-overlay'),
missionsClose:  document.getElementById('missions-close'),
```

**Step 2: Add mode grid expand/collapse logic**

Add a new function near the `initDifficultyUI` function (around line 892):

```js
function initModeGrid() {
  var grid = dom.modeGrid;
  var cards = grid.querySelectorAll('.mode-card');
  var back = dom.modeBack;

  // Populate map buttons for each mode config
  var mapNames = [];
  for (var i = 0; i < GAME.getMapCount(); i++) {
    mapNames.push(GAME.getMapName ? GAME.getMapName(i) : ('Map ' + i));
  }

  var mapGrids = ['comp-map-grid', 'surv-map-grid', 'gg-map-grid', 'dm-config-map-grid'];
  mapGrids.forEach(function(gridId) {
    var el = document.getElementById(gridId);
    if (!el) return;
    el.innerHTML = '';
    for (var i = 0; i < mapNames.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'config-map-btn' + (i === 0 ? ' selected' : '');
      btn.dataset.map = i;
      btn.textContent = mapNames[i];
      el.appendChild(btn);
    }
    // Map button selection
    el.addEventListener('click', function(e) {
      var btn = e.target.closest('.config-map-btn');
      if (!btn) return;
      el.querySelectorAll('.config-map-btn').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
    });
  });

  // Sync difficulty buttons with stored preference
  document.querySelectorAll('.config-diff-btn').forEach(function(btn) {
    btn.classList.toggle('selected', btn.dataset.diff === selectedDifficulty);
  });

  // Difficulty button click handling (all rows)
  document.querySelectorAll('.config-diff-row').forEach(function(row) {
    row.addEventListener('click', function(e) {
      var btn = e.target.closest('.config-diff-btn');
      if (!btn) return;
      selectedDifficulty = btn.dataset.diff;
      GAME.setDifficulty(selectedDifficulty);
      localStorage.setItem('miniCS_difficulty', selectedDifficulty);
      // Update ALL difficulty rows to stay in sync
      document.querySelectorAll('.config-diff-btn').forEach(function(b) {
        b.classList.toggle('selected', b.dataset.diff === selectedDifficulty);
      });
    });
  });

  // Card click → expand
  cards.forEach(function(card) {
    card.addEventListener('click', function(e) {
      // Don't expand if already active or clicking inner buttons
      if (grid.classList.contains('expanded')) return;
      if (e.target.closest('button')) return;
      grid.classList.add('expanded');
      card.classList.add('active');
    });
  });

  // Back button → collapse
  back.addEventListener('click', function() {
    grid.classList.remove('expanded');
    cards.forEach(function(c) { c.classList.remove('active'); });
  });

  // Start buttons
  dom.compStartBtn.addEventListener('click', function() {
    var mapEl = document.querySelector('#comp-map-grid .config-map-btn.selected');
    var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
    startMatch(mapIdx);
  });

  dom.survStartBtn.addEventListener('click', function() {
    var mapEl = document.querySelector('#surv-map-grid .config-map-btn.selected');
    var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
    startSurvival(mapIdx);
  });

  dom.ggStartBtn.addEventListener('click', function() {
    var mapEl = document.querySelector('#gg-map-grid .config-map-btn.selected');
    var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
    startGunGame(mapIdx);
  });

  dom.dmStartBtn2.addEventListener('click', function() {
    var mapEl = document.querySelector('#dm-config-map-grid .config-map-btn.selected');
    var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
    startDeathmatch(mapIdx);
  });
}
```

**Step 3: Add overlay toggle logic**

```js
// Footer link → overlay toggles
dom.controlsFooter.addEventListener('click', function() {
  dom.controlsOverlay.classList.add('show');
});
dom.controlsClose.addEventListener('click', function() {
  dom.controlsOverlay.classList.remove('show');
});

dom.missionsFooter.addEventListener('click', function() {
  updateMissionOverlay();
  dom.missionsOverlay.classList.add('show');
});
dom.missionsClose.addEventListener('click', function() {
  dom.missionsOverlay.classList.remove('show');
});

dom.historyFooter.addEventListener('click', function() {
  renderHistory();
  dom.historyPanel.classList.add('show');
});

dom.tourFooter.addEventListener('click', function() {
  dom.tourPanel.classList.add('show');
});

// ESC to close overlays
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    dom.controlsOverlay.classList.remove('show');
    dom.missionsOverlay.classList.remove('show');
  }
});
```

**Step 4: Add `updateMissionOverlay` function**

Near the existing `updateMissionUI` function (line ~764), add:

```js
function updateMissionOverlay() {
  var dailyList = document.getElementById('overlay-mission-daily-list');
  var weeklyEl = document.getElementById('overlay-mission-weekly');
  if (!dailyList || !weeklyEl) return;
  dailyList.innerHTML = '';
  var slots = ['daily1', 'daily2', 'daily3'];
  for (var i = 0; i < slots.length; i++) {
    var m = activeMissions[slots[i]];
    if (!m) continue;
    var def = getMissionDef(m.id);
    if (!def) continue;
    var card = document.createElement('div');
    card.className = 'mission-card' + (m.completed ? ' completed' : '');
    card.innerHTML =
      '<div class="mission-desc">' + def.desc + '</div>' +
      '<div class="mission-progress">' + m.progress + ' / ' + def.target + '</div>' +
      '<div class="mission-reward">' + (m.completed ? '\u2713' : '+' + def.reward + ' XP') + '</div>';
    dailyList.appendChild(card);
  }
  var wm = activeMissions.weekly;
  if (wm) {
    var wd = getMissionDef(wm.id);
    if (wd) {
      weeklyEl.className = 'mission-card' + (wm.completed ? ' completed' : '');
      weeklyEl.innerHTML =
        '<div class="mission-desc">' + wd.desc + '</div>' +
        '<div class="mission-progress">' + wm.progress + ' / ' + wd.target + '</div>' +
        '<div class="mission-reward">' + (wm.completed ? '\u2713' : '+' + wd.reward + ' XP') + '</div>';
    }
  }
}
```

**Step 5: Wire `initModeGrid` into init**

Call `initModeGrid()` inside the main init function, and replace the existing `initDifficultyUI()` call (the new mode grid handles difficulty). Also update `startMatch` to accept a `mapIndex` parameter.

In `startMatch` function (line ~1231), add a `mapIndex` parameter:

```js
function startMatch(startMapIdx) {
  // ... existing code ...
  currentMapIndex = startMapIdx || 0;
```

Make sure `currentMapIndex` is set from the parameter rather than always 0 on line 1247.

**Step 6: Remove old event listeners**

Remove old click listeners for:
- `dom.startBtn` (line ~987) — replaced by mode card start buttons
- `dom.survivalBtn` (line ~1021) — replaced by mode card
- `dom.gungameBtn` (line ~1043) — replaced by mode card
- `dom.dmBtn` (line ~1064) — replaced by mode card
- `dom.historyBtn` (line ~996) — replaced by footer btn
- `dom.tourBtn` (line ~1005) — replaced by footer btn
- `initDifficultyUI()` call — replaced by mode grid difficulty rows

**Step 7: Update `goToMenu` to collapse mode grid**

In `goToMenu()` (line ~1746), add:

```js
// Collapse mode grid if expanded
dom.modeGrid.classList.remove('expanded');
dom.modeGrid.querySelectorAll('.mode-card').forEach(function(c) { c.classList.remove('active'); });
```

**Step 8: Check `GAME.getMapName` exists**

Look at `js/maps/shared.js` for `getMapName` or `getMapCount`. If `getMapName` doesn't exist, add a helper that reads from `GAME._maps[i].name`. The map names are needed for the map button labels.

**Step 9: Verify visually**

Open in browser:
1. Mode grid should show 4 cards
2. Clicking a card should expand it and show difficulty + map + start
3. "back to modes" should collapse back to grid
4. Footer links should open overlays
5. Start buttons should launch the correct game mode
6. ESC closes overlays

**Step 10: Commit**

```bash
git add index.html js/main.js
git commit -m "feat(menu): wire mode grid expand/collapse and overlay toggles"
```

---

### Task 4: Clean Up Old Menu Elements

**Files:**
- Modify: `index.html` — remove dead HTML
- Modify: `js/main.js` — remove dead DOM refs and listeners

**Step 1: Remove old HTML elements that are no longer used**

- Remove the old `<div class="diff-selector">` block (was ~lines 1033-1038)
- Remove the old `<div class="menu-btn-row">` block (was ~lines 1039-1044)
- Remove the old `<div class="controls-wrap">` block (was ~lines 1047-1061)
- Remove the old `<div class="missions-wrap">` block (was ~lines 1063-1068)
- Remove the old Play button `<div style="position:relative...">` block (was ~lines 1029-1032)

These should already have been replaced in Task 2, but verify nothing was left behind.

**Step 2: Remove old DOM refs from `js/main.js`**

Remove these from the `dom` object:
- `startBtn` (line 17)
- `survivalBtn` (line 63)
- `gungameBtn` (line 77)
- `dmBtn` (line 88)
- `historyBtn` (line 45)
- `tourBtn` (line 50)

**Step 3: Remove old CSS**

Remove CSS rules that are no longer referenced:
- `#menu-screen .start-btn` and related (`.btn-pulse`)
- `.diff-selector`, `.diff-btn`
- `.menu-btn-row`, `.menu-secondary-btn`
- `#menu-screen .controls-wrap`, `.controls-title`, `.controls-grid`, `.ctrl-item`, `.ctrl-key`
- `.missions-wrap`, `.missions-title`

**Step 4: Remove the old `initDifficultyUI` function**

The difficulty UI is now handled by `initModeGrid`.

**Step 5: Verify no console errors**

Open in browser, check console for any `null` reference errors from removed DOM elements.

**Step 6: Commit**

```bash
git add index.html js/main.js
git commit -m "refactor(menu): remove old Play button, secondary buttons, and inline panels"
```

---

### Task 5: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

**Step 1: Update the Main Menu section**

Find the section describing the main menu UI and update it to reflect:
- 2x2 mode card grid (Competitive, Survival, Gun Game, Deathmatch)
- Inline expand with difficulty + map + start per mode
- Footer links for Missions, History, Tour, Controls
- Controls and Missions moved to overlay screens
- Competitive card has blue accent (primary)

**Step 2: Remove references to the old Play button, secondary button row, and inline controls/missions**

**Step 3: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: update REQUIREMENTS.md for menu UX redesign"
```

---

### Task 6: Final Polish and Edge Cases

**Files:**
- Modify: `index.html` (CSS tweaks)
- Modify: `js/main.js` (edge cases)

**Step 1: Handle subtitle spacing**

Reduce `margin-bottom` on `.subtitle-wrap` from `50px` to `16px` (the mode grid is closer to the title now).

**Step 2: Ensure `goToMenu` also closes overlays**

In `goToMenu()`, add:
```js
dom.controlsOverlay.classList.remove('show');
dom.missionsOverlay.classList.remove('show');
```

**Step 3: Handle existing mode panels**

The old survival-panel, gungame-panel, and deathmatch-panel overlays that showed map lists are now replaced by the inline card expand. Check if any "restart" flows still reference them (e.g., `dom.survivalPanel.classList.remove('show')` in `startSurvival`). Remove those references since the panels no longer exist in the menu flow (but keep the end-screen panels — survival-end, gungame-end, deathmatch-end — they're separate).

Actually, the old panels (`#survival-panel`, `#gungame-panel`, `#deathmatch-panel`) can be removed from HTML entirely since map selection is now in the mode cards. The start functions already hide the menu screen.

**Step 4: localStorage for last-selected map per mode**

Save/restore last selected map when expanding a mode card:
```js
// On start: restore
var lastMap = localStorage.getItem('miniCS_lastMap_' + mode);
// On map select: save
localStorage.setItem('miniCS_lastMap_' + mode, mapIdx);
```

**Step 5: Verify the full flow**

Test each path:
1. Click Competitive → select difficulty/map → START → plays correctly
2. Click Survival → select map → START → survival mode works
3. Click Gun Game → START → gun game works
4. Click Deathmatch → START → deathmatch works
5. After game ends → MAIN MENU → grid is collapsed, cards visible
6. Footer: Missions overlay shows current missions
7. Footer: History opens existing history panel
8. Footer: Tour opens existing tour panel
9. Footer: Controls shows keybindings

**Step 6: Commit**

```bash
git add index.html js/main.js
git commit -m "feat(menu): polish mode grid, add localStorage for map prefs, clean up old panels"
```
