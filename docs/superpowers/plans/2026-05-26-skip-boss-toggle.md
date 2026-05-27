# Skip-Boss Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-mode Boss ON/OFF toggle to each mode's main-menu config panel that removes the boss from that mode's flow, defaulting ON and remembered in `localStorage`.

**Architecture:** A boolean `GAME._skipBoss` is set by the menu start handlers from each mode's stored preference, then read inside each mode's boss-trigger branch (the exact same flag pattern already used by `GAME._skipToBoss` / `GAME._teamMode`). The preference is persisted per mode under `localStorage['miniCS_skipBoss_<mode>']`, read through one shared helper `GAME._skipBossForMode(modeKey)`.

**Tech Stack:** Vanilla JS IIFE modules on `window.GAME`, Three.js r160.1 global, Vitest + jsdom for tests. No build step.

---

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `index.html` | Menu config panels | Add a "Boss" row (ON/OFF) to each of the 4 mode panels |
| `js/core/main.js` | Menu wiring, flag plumbing | Add `GAME._skipBoss`, `GAME._skipBossForMode`, DOM refs, sync + click handlers, set flag on start, hide BOSS FIGHT when boss OFF |
| `js/modes/competitive.js` | Competitive round rules | Gate final-round boss spawn with `&& !GAME._skipBoss` |
| `js/modes/survival.js` | Survival wave rules | Gate 5th-wave boss spawn with `&& !GAME._skipBoss` |
| `js/modes/gungame.js` | Gun Game progression | When boss block reached, end instead of spawning boss if `GAME._skipBoss` |
| `js/core/main.js` (DM kill handler) | Deathmatch win/boss decision | At kill target, end instead of spawning boss if `GAME._skipBoss` |
| `tests/unit/skip-boss.test.js` | Regression coverage | New file: persistence-helper behavior + source-guard tests for the four gates |
| `docs/architecture.md`, `docs/game-design.md` | Docs | Note the flag/contract and the config option |

---

## Task 1: Persistence helper `GAME._skipBossForMode` + flag init

**Files:**
- Modify: `js/core/main.js` (after the `GAME._skipToBoss` defineProperty block, ~line 1336)
- Create: `tests/unit/skip-boss.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/skip-boss.test.js`:

```js
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  // main.js needs all prior modules (same chain as tests/unit/main.test.js)
  loadModule('js/maps/shared.js');
  loadModule('js/maps/props.js');
  loadModule('js/maps/dust.js');
  loadModule('js/maps/office.js');
  loadModule('js/maps/warehouse.js');
  loadModule('js/maps/bloodstrike.js');
  loadModule('js/maps/italy.js');
  loadModule('js/maps/aztec.js');
  loadModule('js/maps/arena.js');
  loadModule('js/core/player.js');
  loadModule('js/core/sound.js');
  loadModule('js/systems/weapons.js');
  loadModule('js/systems/enemies.js');
  loadModule('js/core/renderer.js');
  loadModule('js/effects/effects.js');
  loadModule('js/effects/birds.js');
  loadModule('js/ui/minimap.js');
  loadModule('js/ui/hud.js');
  loadModule('js/ui/buy.js');
  loadModule('js/ui/menu.js');
  loadModule('js/systems/progression.js');
  loadModule('js/systems/bomb.js');
  loadModule('js/systems/boss.js');
  loadModule('js/systems/shuffle.js');
  loadModule('js/modes/competitive.js');
  loadModule('js/modes/survival.js');
  loadModule('js/modes/gungame.js');
  loadModule('js/modes/deathmatch.js');
  loadModule('js/core/main.js');
});

describe('GAME._skipBossForMode persistence', () => {
  beforeEach(() => { localStorage.clear(); });

  it('defaults to false (boss ON) when no key is stored', () => {
    expect(GAME._skipBossForMode('competitive')).toBe(false);
    expect(GAME._skipBossForMode('survival')).toBe(false);
    expect(GAME._skipBossForMode('gungame')).toBe(false);
    expect(GAME._skipBossForMode('deathmatch')).toBe(false);
  });

  it('returns true only when the stored value is exactly "true"', () => {
    localStorage.setItem('miniCS_skipBoss_survival', 'true');
    expect(GAME._skipBossForMode('survival')).toBe(true);
    localStorage.setItem('miniCS_skipBoss_survival', 'false');
    expect(GAME._skipBossForMode('survival')).toBe(false);
    localStorage.setItem('miniCS_skipBoss_survival', 'garbage');
    expect(GAME._skipBossForMode('survival')).toBe(false);
  });

  it('is independent per mode', () => {
    localStorage.setItem('miniCS_skipBoss_deathmatch', 'true');
    expect(GAME._skipBossForMode('deathmatch')).toBe(true);
    expect(GAME._skipBossForMode('competitive')).toBe(false);
  });

  it('initializes GAME._skipBoss to false', () => {
    // Flag exists and is a boolean default
    expect(typeof GAME._skipBoss).toBe('boolean');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/skip-boss.test.js`
Expected: FAIL — `GAME._skipBossForMode is not a function`.

- [ ] **Step 3: Add the helper and flag in `js/core/main.js`**

Find this block (~line 1333):

```js
  Object.defineProperty(GAME, '_skipToBoss', {
    get: function() { return _skipToBoss; },
    set: function(v) { _skipToBoss = v; }
  });
```

Insert immediately after it:

```js
  // Skip-boss toggle: per-mode preference (default OFF = boss ON), persisted locally.
  GAME._skipBoss = false;
  GAME._skipBossForMode = function(modeKey) {
    return localStorage.getItem('miniCS_skipBoss_' + modeKey) === 'true';
  };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/skip-boss.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add js/core/main.js tests/unit/skip-boss.test.js
git commit -m "feat(main): add per-mode skip-boss preference helper and flag

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Add "Boss" config rows to the four mode panels

**Files:**
- Modify: `index.html` (4 panels, each just above its START button)

No automated test (markup only); verified visually in Task 9.

- [ ] **Step 1: Competitive panel — add the Boss row**

Find (index.html ~1786):

```html
          </div>
          <button class="mode-start-btn" id="comp-start-btn">START</button>
          <button class="mode-start-btn boss-fight-btn" id="comp-boss-btn">BOSS FIGHT</button>
```

Replace with:

```html
          </div>
          <div class="config-label">Boss</div>
          <div class="config-diff-row" id="comp-boss-row">
            <button class="config-diff-btn selected" data-boss="on">ON</button>
            <button class="config-diff-btn" data-boss="off">OFF</button>
          </div>
          <button class="mode-start-btn" id="comp-start-btn">START</button>
          <button class="mode-start-btn boss-fight-btn" id="comp-boss-btn">BOSS FIGHT</button>
```

- [ ] **Step 2: Survival panel — add the Boss row**

Find (index.html ~1809):

```html
          </div>
          <button class="mode-start-btn" id="surv-start-btn">START</button>
```

Replace with:

```html
          </div>
          <div class="config-label">Boss</div>
          <div class="config-diff-row" id="surv-boss-row">
            <button class="config-diff-btn selected" data-boss="on">ON</button>
            <button class="config-diff-btn" data-boss="off">OFF</button>
          </div>
          <button class="mode-start-btn" id="surv-start-btn">START</button>
```

- [ ] **Step 3: Gun Game panel — add the Boss row**

Find (index.html ~1831):

```html
          </div>
          <button class="mode-start-btn" id="gg-start-btn">START</button>
```

Replace with:

```html
          </div>
          <div class="config-label">Boss</div>
          <div class="config-diff-row" id="gg-boss-row">
            <button class="config-diff-btn selected" data-boss="on">ON</button>
            <button class="config-diff-btn" data-boss="off">OFF</button>
          </div>
          <button class="mode-start-btn" id="gg-start-btn">START</button>
```

- [ ] **Step 4: Deathmatch panel — add the Boss row**

Find (index.html ~1853):

```html
          </div>
          <button class="mode-start-btn" id="dm-start-btn">START</button>
```

Replace with:

```html
          </div>
          <div class="config-label">Boss</div>
          <div class="config-diff-row" id="dm-boss-row">
            <button class="config-diff-btn selected" data-boss="on">ON</button>
            <button class="config-diff-btn" data-boss="off">OFF</button>
          </div>
          <button class="mode-start-btn" id="dm-start-btn">START</button>
```

> NOTE: There are three other `<button class="mode-start-btn" id="...-start-btn">START</button>` lines, so match on the surrounding panel context (the preceding `id="<mode>-map-mode-row"` block) to edit the correct one. The competitive one is unique due to the trailing BOSS FIGHT button.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(menu): add Boss ON/OFF config row to all four mode panels

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Wire the toggle in `js/core/main.js`

**Files:**
- Modify: `js/core/main.js` (DOM refs ~69, `updateCompModeUI` ~436–465, new state/sync/listeners ~507, start handlers ~528–601)

No new automated test here; the gameplay effect is covered by Tasks 4–7, and behavior is verified manually in Task 9.

- [ ] **Step 1: Add DOM refs for the four Boss rows**

Find (main.js ~66):

```js
    compMapModeRow: document.getElementById('comp-map-mode-row'),
    survMapModeRow: document.getElementById('surv-map-mode-row'),
    ggMapModeRow:  document.getElementById('gg-map-mode-row'),
    dmMapModeRow:  document.getElementById('dm-map-mode-row'),
```

Insert immediately after:

```js
    compBossRow:  document.getElementById('comp-boss-row'),
    survBossRow:  document.getElementById('surv-boss-row'),
    ggBossRow:    document.getElementById('gg-boss-row'),
    dmBossRow:    document.getElementById('dm-boss-row'),
```

- [ ] **Step 2: Add skip-boss state + sync helper, just before `updateCompModeUI`**

Find (main.js ~431):

```js
    // ── Competitive Mode toggle (Solo / Team) ──
    var selectedCompMode = localStorage.getItem('miniCS_compMode') || 'solo';
    var selectedObjective = localStorage.getItem('miniCS_objective') || 'elimination';
    var selectedSide = localStorage.getItem('miniCS_side') || 'ct';
```

Insert immediately after:

```js
    // ── Skip-boss toggle (per mode) ──
    var selectedSkipBoss = {
      competitive: GAME._skipBossForMode('competitive'),
      survival:    GAME._skipBossForMode('survival'),
      gungame:     GAME._skipBossForMode('gungame'),
      deathmatch:  GAME._skipBossForMode('deathmatch')
    };
    var _bossRowByMode = {
      competitive: dom.compBossRow,
      survival:    dom.survBossRow,
      gungame:     dom.ggBossRow,
      deathmatch:  dom.dmBossRow
    };

    // Highlight the ON/OFF button matching each mode's current selection.
    function updateSkipBossUI() {
      Object.keys(_bossRowByMode).forEach(function(mode) {
        var row = _bossRowByMode[mode];
        if (!row) return;
        var skip = selectedSkipBoss[mode];
        row.querySelectorAll('.config-diff-btn').forEach(function(b) {
          // data-boss="on" selected when NOT skipping; "off" selected when skipping.
          b.classList.toggle('selected', (b.dataset.boss === 'off') === skip);
        });
      });
    }
```

- [ ] **Step 3: Make the competitive boss row + BOSS FIGHT button respect the toggle**

Find inside `updateCompModeUI` (main.js ~443):

```js
      // Hide Boss Fight skip button in team mode (boss is solo-only)
      dom.compBossBtn.style.display = selectedCompMode === 'team' ? 'none' : '';
```

Replace with:

```js
      // Boss row is solo-only (team mode already plays a normal final round).
      if (dom.compBossRow) dom.compBossRow.style.display = selectedCompMode === 'team' ? 'none' : '';
      // BOSS FIGHT shortcut: solo only, and hidden when the boss is toggled OFF.
      var compBossOn = selectedCompMode !== 'team' && !selectedSkipBoss.competitive;
      dom.compBossBtn.style.display = compBossOn ? '' : 'none';
```

Then, at the end of `updateCompModeUI`, find (main.js ~464):

```js
      GAME.applyMapModeUI(selectedMapMode);
    }
```

Replace with:

```js
      GAME.applyMapModeUI(selectedMapMode);
      updateSkipBossUI();
    }
```

- [ ] **Step 4: Add click listeners for the four Boss rows**

Find (main.js ~507):

```js
    updateCompModeUI();
```

Insert immediately before it:

```js
    // ── Skip-boss toggle clicks ──
    Object.keys(_bossRowByMode).forEach(function(mode) {
      var row = _bossRowByMode[mode];
      if (!row) return;
      row.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-boss]');
        if (!btn) return;
        if (GAME.Sound) GAME.Sound.menuSelect();
        selectedSkipBoss[mode] = btn.dataset.boss === 'off';
        localStorage.setItem('miniCS_skipBoss_' + mode, String(selectedSkipBoss[mode]));
        // Competitive change can show/hide the BOSS FIGHT button.
        if (mode === 'competitive') updateCompModeUI();
        else updateSkipBossUI();
      });
    });
```

> `updateCompModeUI()` already calls `updateSkipBossUI()` at its end (Step 3), so the competitive branch stays in sync.

- [ ] **Step 5: Set `GAME._skipBoss` in each start handler**

Competitive START — find (main.js ~537):

```js
      } else {
        teamMode = false;
      }
      _fadeMenuAndStart(function() { GAME.modes.competitive.startMatch(mapIdx); });
```

Replace with:

```js
      } else {
        teamMode = false;
      }
      GAME._skipBoss = selectedSkipBoss.competitive;
      _fadeMenuAndStart(function() { GAME.modes.competitive.startMatch(mapIdx); });
```

Competitive BOSS FIGHT — find (main.js ~550):

```js
      teamMode = false;
      _skipToBoss = true;
      _fadeMenuAndStart(function() { GAME.modes.competitive.startMatch(mapIdx); });
```

Replace with:

```js
      teamMode = false;
      _skipToBoss = true;
      GAME._skipBoss = false; // BOSS FIGHT always spawns the boss
      _fadeMenuAndStart(function() { GAME.modes.competitive.startMatch(mapIdx); });
```

Survival START — find (main.js ~559):

```js
      var mapIdx = GAME.resolveStartingMap('survival', selectedMapMode, gridIdx);
      _fadeMenuAndStart(function() { GAME.modes.survival.start(mapIdx); });
```

Replace with:

```js
      var mapIdx = GAME.resolveStartingMap('survival', selectedMapMode, gridIdx);
      GAME._skipBoss = selectedSkipBoss.survival;
      _fadeMenuAndStart(function() { GAME.modes.survival.start(mapIdx); });
```

Gun Game START — find (main.js ~567):

```js
      var mapIdx = GAME.resolveStartingMap('gungame', selectedMapMode, gridIdx);
      _fadeMenuAndStart(function() { GAME.modes.gungame.start(mapIdx); });
```

Replace with:

```js
      var mapIdx = GAME.resolveStartingMap('gungame', selectedMapMode, gridIdx);
      GAME._skipBoss = selectedSkipBoss.gungame;
      _fadeMenuAndStart(function() { GAME.modes.gungame.start(mapIdx); });
```

Deathmatch START — find (main.js ~575):

```js
      var mapIdx = GAME.resolveStartingMap('deathmatch', selectedMapMode, gridIdx);
      _fadeMenuAndStart(function() { GAME.modes.deathmatch.start(mapIdx); });
```

Replace with:

```js
      var mapIdx = GAME.resolveStartingMap('deathmatch', selectedMapMode, gridIdx);
      GAME._skipBoss = selectedSkipBoss.deathmatch;
      _fadeMenuAndStart(function() { GAME.modes.deathmatch.start(mapIdx); });
```

- [ ] **Step 6: Set `GAME._skipBoss` in Quick Play**

Find (main.js ~587):

```js
        selectedMapMode = s.mapMode;
        var startMapIdx = GAME.resolveStartingMap(s.mode, s.mapMode, s.mapIndex);
```

Replace with:

```js
        selectedMapMode = s.mapMode;
        GAME._skipBoss = GAME._skipBossForMode(s.mode);
        var startMapIdx = GAME.resolveStartingMap(s.mode, s.mapMode, s.mapIndex);
```

- [ ] **Step 7: Run the full suite to confirm nothing broke**

Run: `npm test`
Expected: PASS (existing tests + Task 1 tests still green; no new behavior asserted yet).

- [ ] **Step 8: Commit**

```bash
git add js/core/main.js
git commit -m "feat(menu): wire per-mode skip-boss toggle and hide BOSS FIGHT when off

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Gate the Competitive final-round boss

**Files:**
- Modify: `js/modes/competitive.js:140`
- Test: `tests/unit/skip-boss.test.js` (add source-guard describe)

- [ ] **Step 1: Write the failing source-guard test**

First, add two imports directly below the existing `import` lines at the **top** of `tests/unit/skip-boss.test.js`:

```js
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
```

Then append this `srcOf` helper and `describe` block at the **bottom** of the file:

```js
function srcOf(rel) {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

describe('boss spawns are gated by GAME._skipBoss', () => {
  it('competitive final-round boss spawn is skip-gated', () => {
    const src = srcOf('js/modes/competitive.js');
    // The boss-round branch must include the skip-boss guard.
    const m = src.match(/if \(!teamMode && GAME\.boss\.isBossRound\(roundNumber\)[^)]*\)/);
    expect(m, 'boss-round condition not found').not.toBeNull();
    expect(m[0]).toContain('!GAME._skipBoss');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/skip-boss.test.js -t "competitive final-round"`
Expected: FAIL — match does not contain `!GAME._skipBoss`.

- [ ] **Step 3: Add the gate in `js/modes/competitive.js`**

Find (competitive.js:140):

```js
    if (!teamMode && GAME.boss.isBossRound(roundNumber)) {
```

Replace with:

```js
    if (!teamMode && GAME.boss.isBossRound(roundNumber) && !GAME._skipBoss) {
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/skip-boss.test.js -t "competitive final-round"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/modes/competitive.js tests/unit/skip-boss.test.js
git commit -m "feat(competitive): skip final-round boss when GAME._skipBoss

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Gate the Survival 5th-wave boss

**Files:**
- Modify: `js/modes/survival.js:165`
- Test: `tests/unit/skip-boss.test.js`

- [ ] **Step 1: Write the failing source-guard test**

Add inside the existing `describe('boss spawns are gated by GAME._skipBoss', ...)` block:

```js
  it('survival 5th-wave boss spawn is skip-gated', () => {
    const src = srcOf('js/modes/survival.js');
    const m = src.match(/if \(survivalWave % 5 === 0[^)]*\)/);
    expect(m, 'wave-5 condition not found').not.toBeNull();
    expect(m[0]).toContain('!GAME._skipBoss');
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/skip-boss.test.js -t "survival 5th-wave"`
Expected: FAIL.

- [ ] **Step 3: Add the gate in `js/modes/survival.js`**

Find (survival.js:165):

```js
    if (survivalWave % 5 === 0) {
```

Replace with:

```js
    if (survivalWave % 5 === 0 && !GAME._skipBoss) {
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/skip-boss.test.js -t "survival 5th-wave"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/modes/survival.js tests/unit/skip-boss.test.js
git commit -m "feat(survival): skip 5th-wave boss when GAME._skipBoss

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: Deathmatch — instant win instead of boss

**Files:**
- Modify: `js/core/main.js:1258` (deathmatch kill handler)
- Test: `tests/unit/skip-boss.test.js`

- [ ] **Step 1: Write the failing source-guard test**

Add inside the `describe('boss spawns are gated by GAME._skipBoss', ...)` block:

```js
  it('deathmatch ends instead of spawning the boss when skip is on', () => {
    const src = srcOf('js/core/main.js');
    // The kill-target branch must end the match when GAME._skipBoss is set.
    const idx = src.indexOf('GAME.modes.deathmatch.hasReachedTarget()');
    expect(idx, 'deathmatch target branch not found').toBeGreaterThan(-1);
    const window = src.slice(idx, idx + 240);
    expect(window).toContain('GAME._skipBoss');
    expect(window).toContain('GAME.modes.deathmatch.end()');
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/skip-boss.test.js -t "deathmatch ends instead"`
Expected: FAIL.

- [ ] **Step 3: Add the gate in `js/core/main.js`**

Find (main.js ~1256):

```js
      if (enemy.isBoss && GAME.modes.deathmatch.isBossSpawned()) {
        GAME.modes.deathmatch.end();
      } else if (GAME.modes.deathmatch.hasReachedTarget() && !GAME.modes.deathmatch.isBossSpawned()) {
        GAME.modes.deathmatch.spawnBoss();
      }
```

Replace with:

```js
      if (enemy.isBoss && GAME.modes.deathmatch.isBossSpawned()) {
        GAME.modes.deathmatch.end();
      } else if (GAME.modes.deathmatch.hasReachedTarget() && !GAME.modes.deathmatch.isBossSpawned()) {
        if (GAME._skipBoss) GAME.modes.deathmatch.end();
        else GAME.modes.deathmatch.spawnBoss();
      }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/skip-boss.test.js -t "deathmatch ends instead"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/core/main.js tests/unit/skip-boss.test.js
git commit -m "feat(deathmatch): win at kill target instead of boss when GAME._skipBoss

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Gun Game — instant win instead of boss

**Files:**
- Modify: `js/modes/gungame.js:127`
- Test: `tests/unit/skip-boss.test.js`

- [ ] **Step 1: Write the failing source-guard test**

Add inside the `describe('boss spawns are gated by GAME._skipBoss', ...)` block:

```js
  it('gun game ends instead of spawning the boss when skip is on', () => {
    const src = srcOf('js/modes/gungame.js');
    const idx = src.indexOf('gungameLevel >= GUNGAME_WEAPONS.length');
    expect(idx, 'gungame boss block not found').toBeGreaterThan(-1);
    const window = src.slice(idx, idx + 260);
    expect(window).toContain('GAME._skipBoss');
    expect(window).toContain('GAME.modes.gungame.end()');
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/skip-boss.test.js -t "gun game ends instead"`
Expected: FAIL.

- [ ] **Step 3: Add the gate in `js/modes/gungame.js`**

Find (gungame.js ~127):

```js
    gungameLevel++;
    if (gungameLevel >= GUNGAME_WEAPONS.length) {
      // Boss phase — spawn boss, unlock all weapons
      if (!_gungameBossSpawned) {
```

Replace with:

```js
    gungameLevel++;
    if (gungameLevel >= GUNGAME_WEAPONS.length) {
      // Boss skipped: the final weapon kill wins immediately.
      if (GAME._skipBoss) { GAME.modes.gungame.end(); return; }
      // Boss phase — spawn boss, unlock all weapons
      if (!_gungameBossSpawned) {
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/skip-boss.test.js -t "gun game ends instead"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/modes/gungame.js tests/unit/skip-boss.test.js
git commit -m "feat(gungame): win at final weapon instead of boss when GAME._skipBoss

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Documentation

**Files:**
- Modify: `docs/architecture.md` (modes contract / shared flags)
- Modify: `docs/game-design.md` (config options)

- [ ] **Step 1: Note the flag in `docs/architecture.md`**

Add to the section that documents the modes ↔ boss contract (where `GAME._skipToBoss` / boss triggering is described) a sentence such as:

```
`GAME._skipBoss` (set by the menu start handlers from `localStorage['miniCS_skipBoss_<mode>']`,
read by each mode's boss-trigger branch) suppresses the boss for that match. Competitive and
Survival fall back to a normal round/wave; Deathmatch and Gun Game end at the point the boss
would have spawned (instant win). The competitive BOSS FIGHT shortcut forces it off.
```

- [ ] **Step 2: Note the option in `docs/game-design.md`**

Under the relevant modes (or a config/options section), add:

```
Each mode that features a boss exposes a per-mode **Boss ON/OFF** toggle in its config panel
(default ON, remembered locally). Turning it off removes the boss entirely from that mode:
the final round / 5th wave plays normally, and Deathmatch / Gun Game win at the kill target /
final weapon instead of fighting a boss.
```

- [ ] **Step 3: Commit**

```bash
git add docs/architecture.md docs/game-design.md
git commit -m "docs: document per-mode skip-boss toggle and GAME._skipBoss flag

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all tests PASS, including the new `tests/unit/skip-boss.test.js`.

- [ ] **Step 2: Manual smoke test in the browser**

Open `index.html` and verify for each mode:

1. **Competitive (solo):** With Boss **ON**, the BOSS FIGHT button is visible and the final round spawns the boss. Switch Boss **OFF** → BOSS FIGHT button disappears, the Boss row OFF button highlights, and the final round plays as a normal round (no boss). Switch to **TEAM** → Boss row is hidden.
2. **Survival:** Boss **OFF** → wave 5 is a normal wave (no boss bar/atmosphere).
3. **Deathmatch:** Boss **OFF** → reaching the kill target shows VICTORY immediately, no boss.
4. **Gun Game:** Boss **OFF** → the final knife kill wins immediately, no boss.
5. **Persistence:** Set a mode to OFF, reload the page → that mode's Boss row still shows OFF; other modes still ON.
6. **Quick Play:** Reflects the last-played mode's stored Boss preference.

- [ ] **Step 3: Final confirmation**

Confirm the working tree is clean (`git status`) and all commits are present (`git log --oneline -9`).

---

## Self-Review Notes

- **Spec coverage:** All four modes (Tasks 4–7), per-mode UI + persistence + default ON (Tasks 1–3), BOSS FIGHT hide (Task 3 Step 3/5), Quick Play (Task 3 Step 6), tests (Tasks 1,4–7), docs (Task 8) — all mapped.
- **Naming consistency:** flag `GAME._skipBoss` (boolean), helper `GAME._skipBossForMode(modeKey)`, storage key `miniCS_skipBoss_<mode>`, `data-boss="on|off"`, row IDs `comp/surv/gg/dm-boss-row`, state object `selectedSkipBoss` — used identically across all tasks.
- **Test seam rationale:** This suite has no full mode-flow tests (mode start is DOM/scene-heavy); it does have source-inspection tests (see `tests/unit/main.test.js` "No orphan bare calls"). Tasks 4–7 follow that idiom to guard each gate against regression, while Task 1 covers the real persistence logic behaviorally and Task 9 covers gameplay/menu manually.
