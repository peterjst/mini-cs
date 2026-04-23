# End-of-Match Stats Summary Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current four mode end-screens (Competitive, Survival, Gun Game, Deathmatch) and the Match History panel with a unified "tactical scorecard" visual language; kill the "useless digits" (`K/D: 2.50`, trailing zeros) and cryptic abbreviations (`K/D`, `HS %`, `14K/8D`).

**Architecture:** Introduce one shared CSS class namespace (`.summary-*`) and one small pure-function module (`js/core/format.js` exposing `GAME.format.*`). Each mode end-screen and the history panel restructures its HTML to use the shared structure (hero + stat grid + XP panel + buttons) and delegates all number rendering to the format helpers. No schema changes.

**Tech Stack:** Three.js r160.1 (unchanged), vanilla JS IIFE modules on `window.GAME`, vitest + jsdom for tests, CSS in `index.html`.

**Spec:** `docs/superpowers/specs/2026-04-22-endgame-stats-redesign-design.md`

---

## Task 1: `GAME.format` module (full TDD)

**Files:**
- Create: `js/core/format.js`
- Create: `tests/unit/format.test.js`
- Modify: `index.html` (add one `<script>` tag)

- [ ] **Step 1: Write the failing test file**

Create `tests/unit/format.test.js` with:

```js
import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule, freshGame } from '../helpers.js';

beforeAll(() => {
  freshGame();
  loadModule('js/core/format.js');
});

describe('GAME.format', () => {
  describe('int', () => {
    it('renders single digits as-is', () => {
      expect(GAME.format.int(0)).toBe('0');
      expect(GAME.format.int(7)).toBe('7');
    });

    it('renders sub-thousand values without commas', () => {
      expect(GAME.format.int(999)).toBe('999');
    });

    it('renders thousands with commas', () => {
      expect(GAME.format.int(1000)).toBe('1,000');
      expect(GAME.format.int(1420)).toBe('1,420');
      expect(GAME.format.int(12345)).toBe('12,345');
      expect(GAME.format.int(1234567)).toBe('1,234,567');
    });

    it('coerces non-integers by flooring', () => {
      expect(GAME.format.int(1420.9)).toBe('1,420');
    });

    it('handles negative values', () => {
      expect(GAME.format.int(-1500)).toBe('-1,500');
    });

    it('treats null/undefined/NaN as 0', () => {
      expect(GAME.format.int(null)).toBe('0');
      expect(GAME.format.int(undefined)).toBe('0');
      expect(GAME.format.int(NaN)).toBe('0');
    });
  });

  describe('percent', () => {
    it('returns "0%" when denominator is 0', () => {
      expect(GAME.format.percent(0, 0)).toBe('0%');
      expect(GAME.format.percent(5, 0)).toBe('0%');
    });

    it('rounds to nearest integer', () => {
      expect(GAME.format.percent(1, 3)).toBe('33%');
      expect(GAME.format.percent(2, 3)).toBe('67%');
      expect(GAME.format.percent(12, 37)).toBe('32%');
    });

    it('returns "100%" when numerator equals denominator', () => {
      expect(GAME.format.percent(5, 5)).toBe('100%');
    });

    it('treats null/undefined inputs safely as 0%', () => {
      expect(GAME.format.percent(null, 10)).toBe('0%');
      expect(GAME.format.percent(5, null)).toBe('0%');
    });
  });

  describe('percentValue', () => {
    it('rounds and appends %', () => {
      expect(GAME.format.percentValue(42.6)).toBe('43%');
      expect(GAME.format.percentValue(42.4)).toBe('42%');
      expect(GAME.format.percentValue(0)).toBe('0%');
      expect(GAME.format.percentValue(100)).toBe('100%');
    });

    it('treats null/NaN as 0%', () => {
      expect(GAME.format.percentValue(null)).toBe('0%');
      expect(GAME.format.percentValue(NaN)).toBe('0%');
    });
  });

  describe('time', () => {
    it('formats whole seconds as M:SS with zero-padded seconds', () => {
      expect(GAME.format.time(0)).toBe('0:00');
      expect(GAME.format.time(5)).toBe('0:05');
      expect(GAME.format.time(59)).toBe('0:59');
      expect(GAME.format.time(60)).toBe('1:00');
      expect(GAME.format.time(108)).toBe('1:48');
      expect(GAME.format.time(3599)).toBe('59:59');
    });

    it('floors fractional seconds', () => {
      expect(GAME.format.time(59.9)).toBe('0:59');
      expect(GAME.format.time(90.1)).toBe('1:30');
    });

    it('clamps negative seconds to 0:00', () => {
      expect(GAME.format.time(-5)).toBe('0:00');
    });

    it('treats null/NaN as 0:00', () => {
      expect(GAME.format.time(null)).toBe('0:00');
      expect(GAME.format.time(NaN)).toBe('0:00');
    });
  });

  describe('ratioPair', () => {
    it('returns primary + sub strings with " / "', () => {
      expect(GAME.format.ratioPair(12, 8)).toEqual({ primary: '12', sub: ' / 8' });
      expect(GAME.format.ratioPair(0, 0)).toEqual({ primary: '0', sub: ' / 0' });
    });

    it('applies integer formatting to large values', () => {
      expect(GAME.format.ratioPair(1420, 37)).toEqual({ primary: '1,420', sub: ' / 37' });
    });
  });

  describe('titleCase', () => {
    it('uppercases the first letter and lowercases the rest', () => {
      expect(GAME.format.titleCase('normal')).toBe('Normal');
      expect(GAME.format.titleCase('HARD')).toBe('Hard');
      expect(GAME.format.titleCase('')).toBe('');
    });

    it('handles null/undefined as empty string', () => {
      expect(GAME.format.titleCase(null)).toBe('');
      expect(GAME.format.titleCase(undefined)).toBe('');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/format.test.js`
Expected: all tests FAIL (module does not exist / `GAME.format` is undefined).

- [ ] **Step 3: Create the `format.js` module**

Create `js/core/format.js`:

```js
// js/core/format.js — Shared number / time formatting for summary screens.
(function() {
  'use strict';

  function safeNum(n) {
    if (n === null || n === undefined) return 0;
    if (typeof n !== 'number') n = Number(n);
    if (!isFinite(n) || isNaN(n)) return 0;
    return n;
  }

  function int(n) {
    var v = Math.trunc(safeNum(n));
    var sign = v < 0 ? '-' : '';
    var abs = Math.abs(v).toString();
    // Insert comma every 3 digits from the right.
    var out = '';
    for (var i = 0; i < abs.length; i++) {
      if (i > 0 && (abs.length - i) % 3 === 0) out += ',';
      out += abs[i];
    }
    return sign + out;
  }

  function percent(num, denom) {
    var d = safeNum(denom);
    if (d === 0) return '0%';
    var n = safeNum(num);
    return Math.round((n / d) * 100) + '%';
  }

  function percentValue(v) {
    return Math.round(safeNum(v)) + '%';
  }

  function time(seconds) {
    var s = Math.max(0, Math.floor(safeNum(seconds)));
    var m = Math.floor(s / 60);
    var ss = s % 60;
    return m + ':' + (ss < 10 ? '0' : '') + ss;
  }

  function ratioPair(a, b) {
    return { primary: int(a), sub: ' / ' + int(b) };
  }

  function titleCase(s) {
    if (!s) return '';
    s = String(s);
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  window.GAME = window.GAME || {};
  window.GAME.format = {
    int: int,
    percent: percent,
    percentValue: percentValue,
    time: time,
    ratioPair: ratioPair,
    titleCase: titleCase
  };
})();
```

- [ ] **Step 4: Wire `format.js` into `index.html`**

Find the script loading section in `index.html` (search for `js/systems/progression.js`). Insert the new `<script>` tag **before** `js/systems/progression.js` so `GAME.format` is available when any progression or mode code runs.

Example (exact surrounding lines will differ slightly — match the pattern):

Before:
```html
  <script src="js/core/sound.js"></script>
  <script src="js/systems/progression.js"></script>
```

After:
```html
  <script src="js/core/sound.js"></script>
  <script src="js/core/format.js"></script>
  <script src="js/systems/progression.js"></script>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/format.test.js`
Expected: all tests PASS (7 describe blocks, ~30 assertions).

- [ ] **Step 6: Run the full test suite (must stay green)**

Run: `npm test`
Expected: all tests pass, including existing suites untouched.

- [ ] **Step 7: Commit**

```bash
git add js/core/format.js tests/unit/format.test.js index.html
git commit -m "feat(format): add GAME.format helpers for stats formatting

Adds int, percent, percentValue, time, ratioPair, titleCase helpers
used by the upcoming end-of-match summary redesign. Fully unit-tested
(edge cases: zero denominators, null inputs, negative seconds,
non-integer coercion)."
```

---

## Task 2: Shared `.summary-*` CSS classes

Add the new visual language to `index.html` CSS without removing any old classes yet. End-screens keep working on the old markup until each mode is rewritten.

**Files:**
- Modify: `index.html` (insert a new CSS block)

- [ ] **Step 1: Pick insertion point**

Open `index.html`. Find the `/* Match end */` comment (around line 787). The new block will sit just before it so all "summary" classes are grouped together and override-free.

- [ ] **Step 2: Insert the shared CSS block**

Insert this block immediately before the `/* Match end */` comment:

```html
<style>
  /* ── Shared end-of-match summary scorecard ─────────────── */
  .summary-wrap {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.9);
    display: none; flex-direction: column; align-items: center; justify-content: center;
    z-index: 25; color: #fff;
  }
  .summary-wrap.show { display: flex; }
  .summary-inner {
    width: 100%; max-width: 560px; padding: 0 20px;
  }
  .summary-hero { text-align: center; margin-bottom: 20px; }
  .summary-result {
    font-size: 44px; font-weight: 900; letter-spacing: 8px;
    line-height: 1; margin-bottom: 10px;
  }
  .summary-result.win    { color: #4caf50; text-shadow: 0 0 20px rgba(76,175,80,0.25); }
  .summary-result.loss   { color: #ef5350; text-shadow: 0 0 20px rgba(239,83,80,0.25); }
  .summary-result.draw   { color: #fff; }
  .summary-result.neutral { color: #9e9e9e; }
  .summary-result.elim   { color: #ef5350; text-shadow: 0 0 20px rgba(239,83,80,0.25); }
  .summary-result.progress { color: #ff9800; text-shadow: 0 0 20px rgba(255,152,0,0.25); }
  .summary-result.amber  { color: #ffca28; text-shadow: 0 0 20px rgba(255,202,40,0.2); }
  .summary-score {
    font-size: 22px; color: rgba(255,255,255,0.65);
    letter-spacing: 3px; margin-bottom: 4px;
  }
  .summary-meta {
    font-size: 11px; color: rgba(255,255,255,0.35);
    letter-spacing: 3px; text-transform: uppercase;
  }

  .summary-stats {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
    margin-bottom: 22px;
  }
  .summary-stat {
    background: rgba(255,255,255,0.035);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 5px; padding: 16px 8px 12px; text-align: center;
  }
  .summary-num {
    font-size: 30px; font-weight: 700; color: #fff; line-height: 1;
  }
  .summary-num .summary-sub {
    font-size: 15px; color: rgba(255,255,255,0.35); font-weight: 500;
  }
  .summary-num .summary-unit {
    font-size: 16px; color: rgba(255,255,255,0.4); margin-left: 1px;
  }
  .summary-lbl {
    font-size: 10px; color: rgba(255,255,255,0.4);
    letter-spacing: 2px; text-transform: uppercase; margin-top: 8px;
  }

  .summary-xp {
    background: rgba(79,195,247,0.06);
    border: 1px solid rgba(79,195,247,0.2);
    border-radius: 5px; padding: 14px 16px; margin-bottom: 22px;
  }
  .summary-xp-top {
    display: flex; justify-content: space-between; align-items: baseline;
    margin-bottom: 10px;
  }
  .summary-xp-earned {
    font-size: 22px; font-weight: 800; color: #4fc3f7; letter-spacing: 1px;
  }
  .summary-xp-rank {
    font-size: 11px; color: rgba(255,255,255,0.45);
    letter-spacing: 2px; text-transform: uppercase;
  }
  .summary-xp-bar {
    height: 5px; background: rgba(255,255,255,0.08);
    border-radius: 3px; overflow: hidden; margin-bottom: 10px;
  }
  .summary-xp-fill {
    height: 100%; background: linear-gradient(90deg, #4fc3f7, #29b6f6);
  }
  .summary-xp-break {
    display: flex; flex-wrap: wrap; gap: 4px 10px;
    font-size: 11px; color: rgba(255,255,255,0.55);
  }
  .summary-xp-break span b { color: #fff; font-weight: 600; }
  .summary-xp-rankup {
    color: #ffca28; font-weight: 700; letter-spacing: 2px;
    margin-top: 6px; font-size: 12px; text-transform: uppercase;
  }

  .summary-btns { display: flex; gap: 12px; justify-content: center; }
  .summary-btn {
    padding: 11px 34px; font-size: 13px; letter-spacing: 3px;
    text-transform: uppercase; border-radius: 3px; font-weight: 600;
    cursor: pointer; border: 2px solid; font-family: inherit;
    transition: all 0.2s;
  }
  .summary-btn-primary {
    background: rgba(79,195,247,0.2); border-color: #4fc3f7; color: #4fc3f7;
  }
  .summary-btn-primary:hover { background: rgba(79,195,247,0.4); }
  .summary-btn-secondary {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.3); color: rgba(255,255,255,0.65);
  }
  .summary-btn-secondary:hover { background: rgba(255,255,255,0.12); color: #fff; }

  @media (max-width: 480px) {
    .summary-stats { grid-template-columns: repeat(2, 1fr); }
    .summary-result { font-size: 32px; letter-spacing: 5px; }
    .summary-num { font-size: 24px; }
  }
</style>
```

- [ ] **Step 3: Run the test suite (no code changes — should stay green)**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "style: add shared .summary-* class namespace for end-screens

Adds the visual language (hero / stat grid / XP panel / buttons)
that all four mode end-screens and the match history panel will use
in subsequent commits. No markup changes yet — old classes still
drive all rendering."
```

---

## Task 3: Competitive end-screen

Restructure `#match-end` to use shared classes; rewrite `endMatch` in `competitive.js` to emit the new markup via `GAME.format.*`.

**Files:**
- Modify: `index.html` (around lines 1975-1984 — the `#match-end` block)
- Modify: `js/core/main.js` (dom getters block, ~line 85-95)
- Modify: `js/modes/competitive.js` (`endMatch`, around lines 260-342)
- Modify: `REQUIREMENTS.md` (line 1639)

- [ ] **Step 1: Restructure `#match-end` markup in `index.html`**

Replace the existing block:

```html
<!-- Match End Screen -->
<div id="match-end">
  <h1 id="match-result">VICTORY</h1>
  <div class="final-score" id="final-score">4 — 2</div>
  <div class="xp-breakdown" id="match-xp-breakdown"></div>
  <div class="btn-row" style="margin-top:16px;">
    <button class="restart-btn" id="restart-btn">PLAY AGAIN</button>
    <button class="menu-btn" id="menu-btn">MAIN MENU</button>
  </div>
</div>
```

With:

```html
<!-- Match End Screen -->
<div id="match-end" class="summary-wrap">
  <div class="summary-inner">
    <div class="summary-hero">
      <div class="summary-result" id="match-result"></div>
      <div class="summary-score" id="final-score"></div>
      <div class="summary-meta" id="match-meta"></div>
    </div>
    <div class="summary-stats" id="match-stats"></div>
    <div class="summary-xp" id="match-xp-breakdown"></div>
    <div class="summary-btns">
      <button class="summary-btn summary-btn-primary" id="restart-btn">Play Again</button>
      <button class="summary-btn summary-btn-secondary" id="menu-btn">Main Menu</button>
    </div>
  </div>
</div>
```

Note: the existing `#match-end` CSS rule in the "Match end" section of the stylesheet (lines 788-796) conflicts with `.summary-wrap`. Remove just that specific rule block to let `.summary-wrap` own the styling:

Delete:
```css
  /* Match end */
  #match-end {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.9);
    display: none; flex-direction: column; align-items: center; justify-content: center;
    z-index: 25; color: #fff;
  }
  #match-end.show { display: flex; }
  #match-end h1 { font-size: 48px; margin-bottom: 12px; }
  #match-end .final-score { font-size: 28px; color: #aaa; margin-bottom: 30px; }
```

Leave the rest of that CSS section (`.btn-row`, `.restart-btn`, `.menu-btn`) alone for now — it's still referenced by Survival / Gun Game / Deathmatch markup until Tasks 4-6 complete. Task 8 cleans it up.

- [ ] **Step 2: Add new dom getters in `main.js`**

Find (around line 85):

```js
    matchResult:  document.getElementById('match-result'),
    finalScore:   document.getElementById('final-score'),
```

Replace with:

```js
    matchResult:  document.getElementById('match-result'),
    finalScore:   document.getElementById('final-score'),
    matchMeta:    document.getElementById('match-meta'),
    matchStats:   document.getElementById('match-stats'),
```

- [ ] **Step 3: Rewrite the `endMatch` render block in `competitive.js`**

Open `js/modes/competitive.js`. Find the existing block that starts with `dom.matchResult.textContent = result;` (~line 295) through the end of `dom.matchXpBreakdown.innerHTML = ...;` (~line 328).

Replace everything between `var result = playerScore > botScore ? 'VICTORY' : playerScore < botScore ? 'DEFEAT' : 'DRAW';` and `dom.matchEnd.classList.add('show');` with:

```js
    var result = playerScore > botScore ? 'VICTORY' : playerScore < botScore ? 'DEFEAT' : 'DRAW';
    var resultClass = playerScore > botScore ? 'win' : playerScore < botScore ? 'loss' : 'draw';
    dom.matchResult.textContent = result;
    dom.matchResult.className = 'summary-result ' + resultClass;
    dom.finalScore.textContent = playerScore + ' — ' + botScore;

    var F = GAME.format;
    var mapName = (GAME._maps && GAME._maps[GAME._currentMapIndex]) ? GAME._maps[GAME._currentMapIndex].name : '';
    dom.matchMeta.textContent = [mapName, F.titleCase(selectedDifficulty), roundNumber + ' rounds']
      .filter(function(s) { return s; }).join(' · ');

    // Mission tracking for match end
    if (playerScore > botScore) GAME.progression.trackMissionEvent('weekly_wins', 1);
    GAME.progression.trackMissionEvent('money_earned', player.money - 800);
    var endAccuracy = matchShotsFired > 0 ? (matchShotsHit / matchShotsFired * 100) : 0;
    if (endAccuracy >= 60) GAME.progression.trackMissionEvent('high_accuracy', 1);

    // XP calculation
    var isWin = playerScore > botScore;
    var diffMult = GAME.progression.DIFF_XP_MULT[selectedDifficulty] || 1;
    var xpEarned = GAME.progression.calculateXP(matchKills, matchHeadshots, matchRoundsWon, isWin, diffMult) + GAME._bossXPBonus;
    var rankResult = GAME.progression.awardXP(xpEarned);

    // Stat tiles
    var kd = F.ratioPair(matchKills, matchDeaths);
    dom.matchStats.innerHTML =
      '<div class="summary-stat"><div class="summary-num">' + kd.primary +
        '<span class="summary-sub">' + kd.sub + '</span></div>' +
        '<div class="summary-lbl">Kills / Deaths</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + F.int(matchHeadshots) + '</div>' +
        '<div class="summary-lbl">Headshots</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + F.percent(matchShotsHit, matchShotsFired).replace('%', '<span class="summary-unit">%</span>') + '</div>' +
        '<div class="summary-lbl">Accuracy</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + F.int(matchDamageDealt) + '</div>' +
        '<div class="summary-lbl">Damage Dealt</div></div>';

    // XP panel
    var rank = rankResult.newRank;
    var next = GAME.progression.getNextRank(rank);
    var totalXP = GAME.progression.getTotalXP();
    var rankProgress = next ? Math.min(100, ((totalXP - rank.xp) / (next.xp - rank.xp)) * 100) : 100;
    var chips = [
      '<span>Kills <b>+' + (matchKills * 10) + '</b></span>',
      '<span>Headshots <b>+' + (matchHeadshots * 5) + '</b></span>',
      '<span>Rounds Won <b>+' + (matchRoundsWon * 20) + '</b></span>'
    ];
    if (isWin) chips.push('<span>Match Win <b>+50</b></span>');
    chips.push('<span>Difficulty <b>×' + diffMult + '</b></span>');

    dom.matchXpBreakdown.innerHTML =
      '<div class="summary-xp-top">' +
        '<div class="summary-xp-earned">+' + F.int(xpEarned) + ' XP</div>' +
        '<div class="summary-xp-rank">' + rank.name + (next ? ' · ' + F.int(totalXP) + ' / ' + F.int(next.xp) : ' · MAX') + '</div>' +
      '</div>' +
      '<div class="summary-xp-bar"><div class="summary-xp-fill" style="width:' + rankProgress + '%"></div></div>' +
      '<div class="summary-xp-break">' + chips.join('') + '</div>' +
      (rankResult.ranked_up ? '<div class="summary-xp-rankup">Ranked up: ' + rank.name + '!</div>' : '');

    dom.matchEnd.classList.add('show');
```

Note: we keep `dom.matchEnd.classList.add('show')` as before. The `.summary-wrap.show` selector in Task 2 preserves the existing `.show` toggle behavior.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: all tests pass. No progression or end-screen tests currently assert on competitive's rendered HTML, so existing assertions remain valid.

- [ ] **Step 5: Manual browser verification**

Run: `python3 -m http.server 8000` (or equivalent) from the project root, then open `http://localhost:8000`. Play one full Competitive match and verify on the end screen:

1. Header: VICTORY/DEFEAT/DRAW in the correct color (green/red/white).
2. Score row: `N — N` white letters.
3. Meta: map · difficulty · "N rounds" — all title-cased.
4. Four tiles in a row: `Kills / Deaths`, `Headshots`, `Accuracy`, `Damage Dealt`. Damage should show a comma if over 999.
5. XP panel: `+N XP`, rank name + `X / Y` XP on the right, progress bar, breakdown chips.
6. Play Again / Main Menu buttons work.
7. No `K/D` substring visible; no `2.50`-style trailing zeros.

- [ ] **Step 6: Update `REQUIREMENTS.md`**

Open `REQUIREMENTS.md`. Find line 1639:

```
- **Match end screen**: VICTORY/DEFEAT/DRAW, final score, XP breakdown, rank progress, PLAY AGAIN + MAIN MENU buttons
```

Replace with:

```
- **Match end screen**: tactical scorecard layout — colored VICTORY/DEFEAT/DRAW header, `N — N` score, meta line (map · difficulty · rounds), 4 stat tiles (Kills / Deaths, Headshots, Accuracy, Damage Dealt), XP panel (earned XP, rank + progress bar, chip-style breakdown), Play Again / Main Menu buttons. Uses shared `.summary-*` CSS classes and `GAME.format` helpers — comma-separated thousands, rounded percentages, no trailing decimals.
```

- [ ] **Step 7: Commit**

```bash
git add index.html js/core/main.js js/modes/competitive.js REQUIREMENTS.md
git commit -m "feat(competitive): redesign match-end screen as tactical scorecard

Restructures #match-end markup to use shared .summary-* classes.
endMatch now renders hero (result/score/meta), 4 stat tiles
(Kills / Deaths, Headshots, Accuracy, Damage Dealt), and a cleaner
XP panel (earned / rank / progress bar / breakdown chips).

Kills 'HS %' tile (redundant with Headshots + Accuracy). Numbers
routed through GAME.format — comma-separated thousands, rounded
percentages, no more 2.50-style trailing zeros."
```

---

## Task 4: Survival end-screen + stat-counter reset

**Files:**
- Modify: `index.html` (the `#survival-end` block, around lines 2031-2041; the `#survival-end` CSS block, lines 1147-1157)
- Modify: `js/core/main.js` (dom getters, ~line 108-112)
- Modify: `js/modes/survival.js` (`startSurvival` and `endSurvival`)
- Modify: `REQUIREMENTS.md` (lines 1640, 2019-2026)

- [ ] **Step 1: Add counter-reset block to `startSurvival`**

Open `js/modes/survival.js`. Find `startSurvival` function, the block around lines 31-38:

```js
    survivalMapIndex = mapIndex;
    GAME._selectedMapModeForMatch = GAME._selectedMapMode;
    survivalWave = 0;
    survivalKills = 0;
    survivalHeadshots = 0;
    GAME._bossXPBonus = 0;
    GAME.progression.resetKillStreak();
    player.money = 800;
```

Insert the reset block immediately after `survivalHeadshots = 0;`:

```js
    survivalMapIndex = mapIndex;
    GAME._selectedMapModeForMatch = GAME._selectedMapMode;
    survivalWave = 0;
    survivalKills = 0;
    survivalHeadshots = 0;
    GAME._matchKills = 0;
    GAME._matchHeadshots = 0;
    GAME._matchShotsFired = 0;
    GAME._matchShotsHit = 0;
    GAME._matchDamageDealt = 0;
    GAME._bossXPBonus = 0;
    GAME.progression.resetKillStreak();
    player.money = 800;
```

- [ ] **Step 2: Restructure `#survival-end` HTML in `index.html`**

Replace the existing block:

```html
<!-- Survival End Screen -->
<div id="survival-end">
  <h1>ELIMINATED</h1>
  <div class="wave-result" id="survival-wave-result">Survived 0 Waves</div>
  <div class="survival-stats" id="survival-stats-display"></div>
  <div class="xp-breakdown" id="survival-xp-breakdown"></div>
  <div class="btn-row" style="margin-top:16px;">
    <button class="restart-btn" id="survival-restart-btn">RETRY</button>
    <button class="menu-btn" id="survival-menu-btn">MAIN MENU</button>
  </div>
</div>
```

With:

```html
<!-- Survival End Screen -->
<div id="survival-end" class="summary-wrap">
  <div class="summary-inner">
    <div class="summary-hero">
      <div class="summary-result elim">ELIMINATED</div>
      <div class="summary-score" id="survival-wave-result"></div>
      <div class="summary-meta" id="survival-meta"></div>
    </div>
    <div class="summary-stats" id="survival-stats-display"></div>
    <div class="summary-xp" id="survival-xp-breakdown"></div>
    <div class="summary-btns">
      <button class="summary-btn summary-btn-primary" id="survival-restart-btn">Retry</button>
      <button class="summary-btn summary-btn-secondary" id="survival-menu-btn">Main Menu</button>
    </div>
  </div>
</div>
```

Also delete the obsolete `#survival-end` CSS block (lines 1147-1157):

```css
  /* Survival end overlay */
  #survival-end { ... }
  #survival-end.show { display: flex; }
  #survival-end h1 { font-size: 36px; margin-bottom: 8px; color: #ef5350; }
  #survival-end .wave-result { font-size: 22px; color: #ffca28; margin-bottom: 6px; }
  #survival-end .survival-stats { font-size: 16px; color: #aaa; margin-bottom: 20px; }
```

- [ ] **Step 3: Add `survivalMeta` dom getter in `main.js`**

Find (around line 108):

```js
    survivalWaveResult: document.getElementById('survival-wave-result'),
    survivalStatsDisplay: document.getElementById('survival-stats-display'),
    survivalXpBreakdown: document.getElementById('survival-xp-breakdown'),
```

Add one line:

```js
    survivalWaveResult: document.getElementById('survival-wave-result'),
    survivalMeta: document.getElementById('survival-meta'),
    survivalStatsDisplay: document.getElementById('survival-stats-display'),
    survivalXpBreakdown: document.getElementById('survival-xp-breakdown'),
```

- [ ] **Step 4: Rewrite `endSurvival` render block**

Open `js/modes/survival.js`. Find the render block in `endSurvival` (around lines 215-230).

Replace everything from `dom.survivalWaveResult.textContent = 'Survived ' + (survivalWave - 1) + ' Waves';` through `dom.survivalEnd.classList.add('show');` with:

```js
    var F = GAME.format;
    var completedWaves = survivalWave - 1;
    dom.survivalWaveResult.textContent = 'Wave ' + completedWaves;
    var mapName = (GAME._maps && GAME._maps[survivalMapIndex]) ? GAME._maps[survivalMapIndex].name : '';
    dom.survivalMeta.textContent = mapName;

    // Stat tiles
    dom.survivalStatsDisplay.innerHTML =
      '<div class="summary-stat"><div class="summary-num">' + F.int(survivalKills) + '</div>' +
        '<div class="summary-lbl">Kills</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + F.int(survivalHeadshots) + '</div>' +
        '<div class="summary-lbl">Headshots</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + F.percent(GAME._matchShotsHit, GAME._matchShotsFired).replace('%', '<span class="summary-unit">%</span>') + '</div>' +
        '<div class="summary-lbl">Accuracy</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + F.int(GAME._matchDamageDealt) + '</div>' +
        '<div class="summary-lbl">Damage Dealt</div></div>';

    // XP for survival (0.7x multiplier)
    var xpEarned = Math.round((survivalKills * 10 + survivalHeadshots * 5 + completedWaves * 15) * 0.7) + GAME._bossXPBonus;
    var rankResult = GAME.progression.awardXP(xpEarned);
    var rank = rankResult.newRank;
    var next = GAME.progression.getNextRank(rank);
    var totalXP = GAME.progression.getTotalXP();
    var rankProgress = next ? Math.min(100, ((totalXP - rank.xp) / (next.xp - rank.xp)) * 100) : 100;

    dom.survivalXpBreakdown.innerHTML =
      '<div class="summary-xp-top">' +
        '<div class="summary-xp-earned">+' + F.int(xpEarned) + ' XP</div>' +
        '<div class="summary-xp-rank">' + rank.name + (next ? ' · ' + F.int(totalXP) + ' / ' + F.int(next.xp) : ' · MAX') + '</div>' +
      '</div>' +
      '<div class="summary-xp-bar"><div class="summary-xp-fill" style="width:' + rankProgress + '%"></div></div>' +
      '<div class="summary-xp-break">' +
        '<span>Kills <b>+' + (survivalKills * 10) + '</b></span>' +
        '<span>Headshots <b>+' + (survivalHeadshots * 5) + '</b></span>' +
        '<span>Waves <b>+' + (completedWaves * 15) + '</b></span>' +
        '<span>Multiplier <b>×0.7</b></span>' +
      '</div>' +
      (rankResult.ranked_up ? '<div class="summary-xp-rankup">Ranked up: ' + rank.name + '!</div>' : '');

    dom.survivalEnd.classList.add('show');
```

Save the map-best line (`GAME.progression.setSurvivalBest(...)`) and `delete GAME.DIFFICULTIES._survivalWave;` — they live before / after the render block and stay untouched.

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 6: Manual browser verification**

1. Start Survival on any map. Play until death.
2. Verify end screen: ELIMINATED in red, "Wave N" score, map name in meta row.
3. Four tiles: Kills, Headshots, Accuracy, Damage Dealt. Accuracy and Damage should reflect THIS run only — to prove this, before retesting, play a full Competitive match first, then immediately start Survival and die on wave 1. The Accuracy / Damage on the Survival end screen must reset to just the survival run's numbers, not carry Competitive values.
4. XP panel renders; Retry / Main Menu buttons work.

- [ ] **Step 7: Update `REQUIREMENTS.md`**

Line 1640:

Old:
```
- **Survival end screen**: Waves survived, kill count, XP breakdown, high score indicator, RETRY + MAIN MENU buttons
```

New:
```
- **Survival end screen**: tactical scorecard — ELIMINATED header (red), "Wave N" score, map meta, 4 stat tiles (Kills, Headshots, Accuracy, Damage Dealt), XP panel, Retry / Main Menu buttons.
```

Line 2026:

Old:
```
- Death screen: waves survived, kills, XP earned, high score indicator, RETRY / MAIN MENU buttons
```

New:
```
- Death screen: tactical scorecard (see Match end screen entry). Shows Kills, Headshots, Accuracy, Damage Dealt as stat tiles. High score indicator lives in the XP panel / meta.
```

Line 2021:

Old:
```
- XP breakdown shown on death screen (kills, headshots, waves, multiplier)
```

New:
```
- XP panel on death screen: earned XP, rank + progress bar, breakdown chips (Kills, Headshots, Waves, Multiplier ×0.7).
```

- [ ] **Step 8: Commit**

```bash
git add index.html js/core/main.js js/modes/survival.js REQUIREMENTS.md
git commit -m "feat(survival): redesign end screen as tactical scorecard

Restructures #survival-end to shared .summary-* markup. Adds
Accuracy and Damage Dealt tiles (tracked but previously unshown).
Resets match counters (shots fired/hit, damage) at startSurvival so
those tiles reflect only the current run instead of leaking from a
prior Competitive or Deathmatch game."
```

---

## Task 5: Gun Game end-screen + stat-counter reset

**Files:**
- Modify: `index.html` (`#gungame-end` block around lines 2043-2053; `#gungame-end` CSS around lines 1327-1337)
- Modify: `js/core/main.js` (dom getters, ~line 122-125)
- Modify: `js/modes/gungame.js` (`startGunGame` and `endGunGame`)
- Modify: `REQUIREMENTS.md` (line 2102)

- [ ] **Step 1: Add counter-reset block to `startGunGame`**

Open `js/modes/gungame.js`. Find (around lines 47-55):

```js
    gungameLevel = 0;
    _gungameBossSpawned = false;
    gungameKills = 0;
    gungameDeaths = 0;
    gungameHeadshots = 0;
    gungameStartTime = performance.now() / 1000;
    GAME._gungameStartTime = gungameStartTime;
    gungameRespawnQueue = [];
    GAME._bossXPBonus = 0;
```

Insert the reset block after `gungameHeadshots = 0;`:

```js
    gungameLevel = 0;
    _gungameBossSpawned = false;
    gungameKills = 0;
    gungameDeaths = 0;
    gungameHeadshots = 0;
    GAME._matchKills = 0;
    GAME._matchHeadshots = 0;
    GAME._matchShotsFired = 0;
    GAME._matchShotsHit = 0;
    GAME._matchDamageDealt = 0;
    gungameStartTime = performance.now() / 1000;
    GAME._gungameStartTime = gungameStartTime;
    gungameRespawnQueue = [];
    GAME._bossXPBonus = 0;
```

- [ ] **Step 2: Restructure `#gungame-end` HTML**

Replace:

```html
<!-- Gun Game End Screen -->
<div id="gungame-end">
  <h1>GUN GAME COMPLETE</h1>
  <div class="gungame-time" id="gungame-time-result"></div>
  <div class="gungame-stats" id="gungame-stats-display"></div>
  <div class="xp-breakdown" id="gungame-xp-breakdown"></div>
  <div class="btn-row" style="margin-top:16px;">
    <button class="restart-btn" id="gungame-restart-btn">RETRY</button>
    <button class="menu-btn" id="gungame-menu-btn">MAIN MENU</button>
  </div>
</div>
```

With:

```html
<!-- Gun Game End Screen -->
<div id="gungame-end" class="summary-wrap">
  <div class="summary-inner">
    <div class="summary-hero">
      <div class="summary-result progress">COMPLETE</div>
      <div class="summary-score" id="gungame-time-result"></div>
      <div class="summary-meta" id="gungame-meta"></div>
    </div>
    <div class="summary-stats" id="gungame-stats-display"></div>
    <div class="summary-xp" id="gungame-xp-breakdown"></div>
    <div class="summary-btns">
      <button class="summary-btn summary-btn-primary" id="gungame-restart-btn">Retry</button>
      <button class="summary-btn summary-btn-secondary" id="gungame-menu-btn">Main Menu</button>
    </div>
  </div>
</div>
```

Delete the obsolete `#gungame-end` CSS block:

```css
  /* Gun Game end overlay */
  #gungame-end { ... }
  #gungame-end.show { display: flex; }
  #gungame-end h1 { font-size: 42px; margin-bottom: 8px; color: #ff9800; }
  #gungame-end .gungame-time { font-size: 22px; color: #ffca28; margin-bottom: 6px; }
  #gungame-end .gungame-stats { font-size: 16px; color: #aaa; margin-bottom: 20px; }
```

- [ ] **Step 3: Add `gungameMeta` dom getter in `main.js`**

Find:
```js
    gungameTimeResult: document.getElementById('gungame-time-result'),
    gungameStatsDisplay: document.getElementById('gungame-stats-display'),
```

Change to:
```js
    gungameTimeResult: document.getElementById('gungame-time-result'),
    gungameMeta: document.getElementById('gungame-meta'),
    gungameStatsDisplay: document.getElementById('gungame-stats-display'),
```

- [ ] **Step 4: Rewrite `endGunGame` render**

Find the render block in `endGunGame` (~lines 230-262). Replace from `var elapsed = …` through `dom.gungameEnd.classList.add('show');` with:

```js
    var F = GAME.format;
    var elapsed = (performance.now() / 1000) - gungameStartTime;
    var timeStr = F.time(elapsed);

    // Save best time
    var mapNamesKeys = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var mapKey = mapNamesKeys[gungameMapIndex] || 'dust';
    GAME.progression.setGunGameBest(mapKey, elapsed);

    dom.gungameTimeResult.textContent = timeStr;
    var mapDisplayName = (GAME._maps && GAME._maps[gungameMapIndex]) ? GAME._maps[gungameMapIndex].name : '';
    dom.gungameMeta.textContent = [mapDisplayName, F.titleCase(GAME._selectedDifficulty)]
      .filter(function(s) { return s; }).join(' · ');

    // Stat tiles (Kills replaces "Levels Cleared" — spec correction)
    dom.gungameStatsDisplay.innerHTML =
      '<div class="summary-stat"><div class="summary-num">' + F.int(gungameKills) + '</div>' +
        '<div class="summary-lbl">Kills</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + F.int(gungameDeaths) + '</div>' +
        '<div class="summary-lbl">Deaths</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + F.int(gungameHeadshots) + '</div>' +
        '<div class="summary-lbl">Headshots</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + F.percent(GAME._matchShotsHit, GAME._matchShotsFired).replace('%', '<span class="summary-unit">%</span>') + '</div>' +
        '<div class="summary-lbl">Accuracy</div></div>';

    // XP
    var diffMult = GAME.progression.DIFF_XP_MULT[GAME._selectedDifficulty] || 1;
    var deathBonus = Math.max(0, 6 - gungameDeaths) * 10;
    var timeBonus = elapsed < 180 ? 50 : 0;
    var rawXP = gungameKills * 10 + gungameHeadshots * 5 + deathBonus + timeBonus;
    var xpEarned = Math.round(rawXP * diffMult * 0.8) + GAME._bossXPBonus;
    var rankResult = GAME.progression.awardXP(xpEarned);
    var rank = rankResult.newRank;
    var next = GAME.progression.getNextRank(rank);
    var totalXP = GAME.progression.getTotalXP();
    var rankProgress = next ? Math.min(100, ((totalXP - rank.xp) / (next.xp - rank.xp)) * 100) : 100;

    var chips = [
      '<span>Kills <b>+' + (gungameKills * 10) + '</b></span>',
      '<span>Headshots <b>+' + (gungameHeadshots * 5) + '</b></span>',
      '<span>Low Deaths <b>+' + deathBonus + '</b></span>'
    ];
    if (timeBonus) chips.push('<span>Speed Bonus <b>+' + timeBonus + '</b></span>');
    chips.push('<span>Difficulty <b>×' + diffMult + '</b></span>');
    chips.push('<span>Multiplier <b>×0.8</b></span>');

    dom.gungameXpBreakdown.innerHTML =
      '<div class="summary-xp-top">' +
        '<div class="summary-xp-earned">+' + F.int(xpEarned) + ' XP</div>' +
        '<div class="summary-xp-rank">' + rank.name + (next ? ' · ' + F.int(totalXP) + ' / ' + F.int(next.xp) : ' · MAX') + '</div>' +
      '</div>' +
      '<div class="summary-xp-bar"><div class="summary-xp-fill" style="width:' + rankProgress + '%"></div></div>' +
      '<div class="summary-xp-break">' + chips.join('') + '</div>' +
      (rankResult.ranked_up ? '<div class="summary-xp-rankup">Ranked up: ' + rank.name + '!</div>' : '');

    dom.gungameEnd.classList.add('show');
```

Note: `mapNamesKeys` is used ONLY for the legacy `setGunGameBest` key (lowercase); `mapDisplayName` drives the visible meta row.

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: all pass.

- [ ] **Step 6: Manual browser verification**

1. Play Gun Game through all 6 levels + boss to completion.
2. Verify end screen: COMPLETE (orange), time as score, map · difficulty in meta.
3. Tiles: Kills, Deaths, Headshots, Accuracy. Kills should be > 6 if bots respawned (i.e. not always `6/6`).
4. XP panel shows Speed Bonus chip if elapsed < 3 min, else omitted.

- [ ] **Step 7: Update `REQUIREMENTS.md` line 2102**

Old:
```
- End screen (`#gungame-end`): completion time, kills/deaths/headshots, XP breakdown, RETRY/MAIN MENU buttons
```

New:
```
- End screen (`#gungame-end`): tactical scorecard — COMPLETE header (orange), time as score, map · difficulty in meta, 4 stat tiles (Kills, Deaths, Headshots, Accuracy), XP panel, Retry / Main Menu buttons.
```

- [ ] **Step 8: Commit**

```bash
git add index.html js/core/main.js js/modes/gungame.js REQUIREMENTS.md
git commit -m "feat(gungame): redesign end screen as tactical scorecard

Uses shared .summary-* layout. Replaces pipe-separated stats string
with 4 tiles (Kills, Deaths, Headshots, Accuracy). Adds Accuracy —
previously tracked but never shown. Resets match counters in
startGunGame so Accuracy reflects only the current run."
```

---

## Task 6: Deathmatch end-screen

**Files:**
- Modify: `index.html` (`#deathmatch-end` block lines 2055-2065; `#deathmatch-end` CSS ~lines 1349-1359)
- Modify: `js/core/main.js` (dom getters, ~line 130-133)
- Modify: `js/modes/deathmatch.js` (`endDeathmatch` ~lines 255-302)
- Modify: `REQUIREMENTS.md` (lines 1428-1431)

- [ ] **Step 1: Restructure `#deathmatch-end` HTML**

Replace:

```html
<!-- Deathmatch End Screen -->
<div id="deathmatch-end">
  <h1>DEATHMATCH OVER</h1>
  <div class="dm-result" id="dm-kill-result"></div>
  <div class="dm-stats" id="dm-stats-display"></div>
  <div class="xp-breakdown" id="dm-xp-breakdown"></div>
  <div class="btn-row" style="margin-top:16px;">
    <button class="restart-btn" id="dm-restart-btn">PLAY AGAIN</button>
    <button class="menu-btn" id="dm-menu-btn">MAIN MENU</button>
  </div>
</div>
```

With:

```html
<!-- Deathmatch End Screen -->
<div id="deathmatch-end" class="summary-wrap">
  <div class="summary-inner">
    <div class="summary-hero">
      <div class="summary-result" id="dm-result"></div>
      <div class="summary-score" id="dm-kill-result"></div>
      <div class="summary-meta" id="dm-meta"></div>
    </div>
    <div class="summary-stats" id="dm-stats-display"></div>
    <div class="summary-xp" id="dm-xp-breakdown"></div>
    <div class="summary-btns">
      <button class="summary-btn summary-btn-primary" id="dm-restart-btn">Play Again</button>
      <button class="summary-btn summary-btn-secondary" id="dm-menu-btn">Main Menu</button>
    </div>
  </div>
</div>
```

Delete the obsolete `#deathmatch-end` CSS block:
```css
  /* Deathmatch end overlay */
  #deathmatch-end { ... }
  #deathmatch-end.show { display: flex; }
  #deathmatch-end h1 { font-size: 42px; margin-bottom: 8px; color: #f44336; }
  #deathmatch-end .dm-result { font-size: 22px; color: #ffca28; margin-bottom: 6px; }
  #deathmatch-end .dm-stats { font-size: 16px; color: #aaa; margin-bottom: 20px; }
```

- [ ] **Step 2: Add `dmResult` and `dmMeta` dom getters in `main.js`**

Find:
```js
    dmKillResult: document.getElementById('dm-kill-result'),
    dmStatsDisplay: document.getElementById('dm-stats-display'),
    dmXpBreakdown: document.getElementById('dm-xp-breakdown'),
```

Change to:
```js
    dmResult: document.getElementById('dm-result'),
    dmKillResult: document.getElementById('dm-kill-result'),
    dmMeta: document.getElementById('dm-meta'),
    dmStatsDisplay: document.getElementById('dm-stats-display'),
    dmXpBreakdown: document.getElementById('dm-xp-breakdown'),
```

- [ ] **Step 3: Rewrite `endDeathmatch` render**

Open `js/modes/deathmatch.js`. Find the render block in `endDeathmatch` (~lines 267-309).

Replace the entire block from `var elapsed = …` through `dom.dmEnd.classList.add('show');` with:

```js
    var F = GAME.format;
    var elapsed = (performance.now() / 1000) - dmStartTime;
    var timeStr = F.time(elapsed);

    // Save best
    var mapKeys = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var mapKey = mapKeys[dmMapIndex] || 'dust';
    GAME.progression.setDMBest(mapKey, dmKills);

    // Mission tracking for DM end
    var dmEndAccuracy = GAME._matchShotsFired > 0 ? (GAME._matchShotsHit / GAME._matchShotsFired * 100) : 0;
    if (dmEndAccuracy >= 60) GAME.progression.trackMissionEvent('high_accuracy', 1);

    var hitTarget = dmKills >= DEATHMATCH_KILL_TARGET;
    dom.dmResult.textContent = hitTarget ? 'VICTORY' : 'TIME UP';
    dom.dmResult.className = 'summary-result ' + (hitTarget ? 'amber' : 'neutral');
    dom.dmKillResult.textContent = dmKills + ' — ' + dmDeaths;

    var dmMapName = (GAME._maps && GAME._maps[dmMapIndex]) ? GAME._maps[dmMapIndex].name : '';
    dom.dmMeta.textContent = [timeStr, dmMapName, F.titleCase(GAME._selectedDifficulty)]
      .filter(function(s) { return s; }).join(' · ');

    // Stat tiles
    var kd = F.ratioPair(dmKills, dmDeaths);
    dom.dmStatsDisplay.innerHTML =
      '<div class="summary-stat"><div class="summary-num">' + kd.primary +
        '<span class="summary-sub">' + kd.sub + '</span></div>' +
        '<div class="summary-lbl">Kills / Deaths</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + F.int(dmHeadshots) + '</div>' +
        '<div class="summary-lbl">Headshots</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + F.percent(GAME._matchShotsHit, GAME._matchShotsFired).replace('%', '<span class="summary-unit">%</span>') + '</div>' +
        '<div class="summary-lbl">Accuracy</div></div>' +
      '<div class="summary-stat"><div class="summary-num">' + F.int(GAME._matchDamageDealt) + '</div>' +
        '<div class="summary-lbl">Damage Dealt</div></div>';

    // XP
    var diffMult = GAME.progression.DIFF_XP_MULT[GAME._selectedDifficulty] || 1;
    var kdBonus = Math.max(0, Math.floor((dmKills - dmDeaths) * 5));
    var rawXP = dmKills * 10 + dmHeadshots * 5 + kdBonus;
    var xpEarned = Math.round(rawXP * diffMult * 0.7) + GAME._bossXPBonus;
    var rankResult = GAME.progression.awardXP(xpEarned);
    var rank = rankResult.newRank;
    var next = GAME.progression.getNextRank(rank);
    var totalXP = GAME.progression.getTotalXP();
    var rankProgress = next ? Math.min(100, ((totalXP - rank.xp) / (next.xp - rank.xp)) * 100) : 100;

    dom.dmXpBreakdown.innerHTML =
      '<div class="summary-xp-top">' +
        '<div class="summary-xp-earned">+' + F.int(xpEarned) + ' XP</div>' +
        '<div class="summary-xp-rank">' + rank.name + (next ? ' · ' + F.int(totalXP) + ' / ' + F.int(next.xp) : ' · MAX') + '</div>' +
      '</div>' +
      '<div class="summary-xp-bar"><div class="summary-xp-fill" style="width:' + rankProgress + '%"></div></div>' +
      '<div class="summary-xp-break">' +
        '<span>Kills <b>+' + (dmKills * 10) + '</b></span>' +
        '<span>Headshots <b>+' + (dmHeadshots * 5) + '</b></span>' +
        '<span>Kill-Death Bonus <b>+' + kdBonus + '</b></span>' +
        '<span>Difficulty <b>×' + diffMult + '</b></span>' +
        '<span>Multiplier <b>×0.7</b></span>' +
      '</div>' +
      (rankResult.ranked_up ? '<div class="summary-xp-rankup">Ranked up: ' + rank.name + '!</div>' : '');

    dom.dmEnd.classList.add('show');
```

The existing `GAME.progression.updateRankDisplay();` and `if (dmKills >= DEATHMATCH_KILL_TARGET) { … } else { … }` lines after the replacement stay untouched — they already do the right thing.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Manual browser verification**

1. Play Deathmatch past the kill target → VICTORY header (amber).
2. Replay and let the timer run out → TIME UP header (grey).
3. Meta shows `time · map · difficulty`.
4. Four tiles: `Kills / Deaths`, `Headshots`, `Accuracy`, `Damage Dealt`. No `K/D: 2.50` anywhere.
5. XP panel: "Kill-Death Bonus" spelled out, not "K/D Bonus".

- [ ] **Step 6: Update `REQUIREMENTS.md`**

Replace lines 1427-1431 (the current "End Screen" subsection of Deathmatch):

Old:
```
### End Screen
- **Stats summary row**: K/D, Accuracy %, HS %, Total Damage — displayed in a flex row above XP breakdown
- Tracks: `matchShotsFired`, `matchShotsHit`, `matchDamageDealt` alongside existing kill/death/headshot counters
- Accuracy = shotsHit / shotsFired × 100; HS% = headshots / kills × 100
- XP calculation: (kills×10 + headshots×5 + K/D bonus) × diffMult × 0.7
- Best scores saved per map in localStorage
```

New:
```
### End Screen
- Tactical scorecard layout — header is VICTORY (amber, if kills ≥ kill target) or TIME UP (grey). Score row shows `kills — deaths`. Meta row shows `time · map · difficulty`.
- Four stat tiles: Kills / Deaths, Headshots, Accuracy, Damage Dealt.
- Tracks: `matchShotsFired`, `matchShotsHit`, `matchDamageDealt` alongside existing kill/death/headshot counters.
- Accuracy = shotsHit / shotsFired × 100, rounded to nearest integer.
- XP calculation: (kills×10 + headshots×5 + Kill-Death Bonus) × diffMult × 0.7. Kill-Death Bonus = max(0, (kills − deaths) × 5).
- Best scores saved per map in localStorage.
- Numbers rendered via `GAME.format` helpers — no trailing decimals, comma-separated thousands.
```

- [ ] **Step 7: Commit**

```bash
git add index.html js/core/main.js js/modes/deathmatch.js REQUIREMENTS.md
git commit -m "feat(deathmatch): redesign end screen as tactical scorecard

Header is now VICTORY or TIME UP based on whether the kill target
was hit. Removes the 'K/D: 2.50' line entirely and renames the
'K/D Bonus' XP chip to 'Kill-Death Bonus'. Four tiles: Kills /
Deaths, Headshots, Accuracy, Damage Dealt."
```

---

## Task 7: Match History panel (TDD + rewrite)

**Files:**
- Modify: `tests/unit/progression.test.js` (extend `Match history` describe block)
- Modify: `js/systems/progression.js` (`getStats` + `renderHistory`)
- Modify: `index.html` (`#history-panel` block lines 1986-1992; `.history-stats` / `.stat-box` / `.history-entry` CSS lines 830-862)
- Modify: `REQUIREMENTS.md` (lines 1653-1658)

- [ ] **Step 1: Add failing tests for `avgKillsPerMatch`**

Open `tests/unit/progression.test.js`. Inside `describe('Match history', () => { ... })`, after the existing `it('getStats computes correct stats', ...)` test (ends around line 276), append:

```js
  it('getStats exposes avgKillsPerMatch rounded to nearest integer', () => {
    GAME.progression.saveMatchHistory({
      result: 'VICTORY', xpEarned: 100,
      playerScore: 4, botScore: 2,
      rounds: 6, kills: 11, deaths: 3,
      headshots: 4, difficulty: 'normal'
    });
    GAME.progression.saveMatchHistory({
      result: 'DEFEAT', xpEarned: 50,
      playerScore: 2, botScore: 4,
      rounds: 6, kills: 8, deaths: 7,
      headshots: 1, difficulty: 'normal'
    });
    var stats = GAME.progression.getStats();
    // (11 + 8) / 2 = 9.5 → 10 (Math.round)
    expect(stats.avgKillsPerMatch).toBe(10);
  });

  it('getStats returns avgKillsPerMatch=0 with no history', () => {
    var stats = GAME.progression.getStats();
    expect(stats.avgKillsPerMatch).toBe(0);
  });
```

- [ ] **Step 2: Add failing tests for `renderHistory` markup**

Still inside the `Match history` describe block, after the two tests above, append:

```js
  it('renderHistory top stats show readable labels (no K/D, no HS %)', () => {
    document.body.innerHTML =
      '<div id="history-stats"></div><div id="history-list"></div>';
    GAME.progression.saveMatchHistory({
      result: 'VICTORY', xpEarned: 100,
      playerScore: 4, botScore: 2,
      rounds: 6, kills: 12, deaths: 5,
      headshots: 6, difficulty: 'normal'
    });
    GAME.progression.renderHistory();
    var stats = document.getElementById('history-stats').innerHTML;
    expect(stats).toContain('Matches Played');
    expect(stats).toContain('Win Rate');
    expect(stats).toContain('Avg Kills');
    expect(stats).toContain('Headshot Rate');
    expect(stats).not.toContain('W / L / D');
    expect(stats).not.toContain('HS %');
  });

  it('renderHistory entry rows spell out kills/deaths (no K/D shorthand)', () => {
    document.body.innerHTML =
      '<div id="history-stats"></div><div id="history-list"></div>';
    GAME.progression.saveMatchHistory({
      result: 'VICTORY', xpEarned: 100,
      playerScore: 4, botScore: 2,
      rounds: 6, kills: 12, deaths: 5,
      headshots: 6, difficulty: 'normal'
    });
    GAME.progression.renderHistory();
    var list = document.getElementById('history-list').innerHTML;
    expect(list).toContain('12 kills');
    expect(list).toContain('5 deaths');
    expect(list).toContain('6 headshots');
    expect(list).not.toMatch(/\d+K\s*\/\s*\d+D/);
  });

  it('renderHistory handles singular counts (1 headshot, 1 kill, 1 death)', () => {
    document.body.innerHTML =
      '<div id="history-stats"></div><div id="history-list"></div>';
    GAME.progression.saveMatchHistory({
      result: 'DEFEAT', xpEarned: 20,
      playerScore: 1, botScore: 4,
      rounds: 5, kills: 1, deaths: 1,
      headshots: 1, difficulty: 'normal'
    });
    GAME.progression.renderHistory();
    var list = document.getElementById('history-list').innerHTML;
    expect(list).toContain('1 kill ');
    expect(list).toContain('1 death ');
    expect(list).toContain('1 headshot<');
  });

  it('renderHistory shows empty state when no matches exist', () => {
    document.body.innerHTML =
      '<div id="history-stats"></div><div id="history-list"></div>';
    GAME.progression.renderHistory();
    var list = document.getElementById('history-list').innerHTML;
    expect(list).toContain('No matches played yet');
  });
```

The existing `beforeEach` in `describe('Match history')` already clears `miniCS_history`, so the tests are isolated.

- [ ] **Step 3: Run the progression tests — verify new ones fail**

Run: `npx vitest run tests/unit/progression.test.js`
Expected: the 5 new tests fail; existing tests still pass. `avgKillsPerMatch` is undefined; `renderHistory` still emits `W / L / D` and `12K / 5D`-style text.

- [ ] **Step 4: Extend `getStats` with `avgKillsPerMatch`**

Open `js/systems/progression.js`. Find `getStats` (~line 500). After `var hsPercent = …` and before `return { … }`, add:

```js
    var avgKillsPerMatch = history.length > 0 ? Math.round(totalKills / history.length) : 0;
```

Then extend the returned object:

```js
    return {
      matches: history.length,
      wins: wins, losses: losses, draws: draws,
      winRate: history.length > 0 ? Math.round((wins / history.length) * 100) : 0,
      kills: totalKills, deaths: totalDeaths,
      headshots: totalHS, hsPercent: hsPercent,
      avgKillsPerMatch: avgKillsPerMatch
    };
```

- [ ] **Step 5: Restructure `#history-panel` HTML in `index.html`**

Replace lines 1987-1992:

Old:
```html
<!-- History Panel -->
<div id="history-panel">
  <h2>MATCH HISTORY</h2>
  <div class="history-stats" id="history-stats"></div>
  <div class="history-list" id="history-list"></div>
  <button class="history-close" id="history-close">Close</button>
</div>
```

New:
```html
<!-- History Panel -->
<div id="history-panel">
  <h2>MATCH HISTORY</h2>
  <div class="summary-stats" id="history-stats"></div>
  <div class="history-list" id="history-list"></div>
  <button class="history-close" id="history-close">Close</button>
</div>
```

(Reuses the `.summary-stats` grid for the top 4 tiles — same look as end-screens. The list and close button keep their existing outer shells.)

- [ ] **Step 6: Replace the `.history-stats` / `.stat-box` / `.history-entry` CSS in `index.html`**

Find the CSS block at lines 830-863 (roughly), which contains `.history-stats`, `.stat-box`, `.stat-val`, `.stat-label`, `.history-list`, `.history-entry`, `.he-result`, `.he-win`, `.he-loss`, `.he-draw`, `.he-score`, `.he-kd`, `.he-date`.

Replace that entire block with:

```css
  .history-list {
    max-width: 560px; width: 100%;
    display: flex; flex-direction: column; gap: 6px;
    max-height: 50vh; overflow-y: auto;
  }
  .history-entry {
    display: grid;
    grid-template-columns: 4px 90px 1fr auto;
    gap: 12px; align-items: center;
    padding: 11px 14px 11px 0;
    background: rgba(255,255,255,0.035);
    border-radius: 4px; font-size: 13px; overflow: hidden;
  }
  .history-entry .he-bar { align-self: stretch; }
  .history-entry.win   .he-bar { background: #4caf50; }
  .history-entry.loss  .he-bar { background: #ef5350; }
  .history-entry.draw  .he-bar { background: #9e9e9e; }
  .history-entry .he-head { display: flex; flex-direction: column; gap: 2px; }
  .history-entry .he-result {
    font-weight: 700; letter-spacing: 2px; font-size: 12px;
  }
  .history-entry.win   .he-result { color: #66bb6a; }
  .history-entry.loss  .he-result { color: #ef5350; }
  .history-entry.draw  .he-result { color: #bdbdbd; }
  .history-entry .he-score-small {
    font-size: 13px; color: #fff; font-weight: 600; letter-spacing: 1px;
  }
  .history-entry .he-mid { color: rgba(255,255,255,0.65); }
  .history-entry .he-mid b { color: #fff; font-weight: 600; }
  .history-entry .he-right {
    text-align: right; color: rgba(255,255,255,0.35); font-size: 11px;
    letter-spacing: 1px; display: flex; flex-direction: column; gap: 2px; align-items: flex-end;
  }
  .history-entry .he-diff {
    font-size: 10px; color: rgba(79,195,247,0.65);
    letter-spacing: 2px; text-transform: uppercase;
  }
```

Leave the `#history-panel` outer rules (position, h2, .history-close) and `.history-empty` rule untouched.

- [ ] **Step 7: Rewrite `renderHistory` in `progression.js`**

Replace the entire `renderHistory` function (lines 522-555) with:

```js
  function renderHistory() {
    var historyStats = document.getElementById('history-stats');
    var historyList = document.getElementById('history-list');
    if (!historyStats || !historyList) return;

    var F = (GAME && GAME.format) ? GAME.format : null;
    var stats = getStats();

    function tile(num, label) {
      return '<div class="summary-stat"><div class="summary-num">' + num +
        '</div><div class="summary-lbl">' + label + '</div></div>';
    }
    function pct(v) { return F ? F.percentValue(v) : (Math.round(v) + '%'); }
    function intFmt(v) { return F ? F.int(v) : String(v); }

    historyStats.innerHTML =
      tile(intFmt(stats.matches), 'Matches Played') +
      tile(pct(stats.winRate).replace('%', '<span class="summary-unit">%</span>'), 'Win Rate') +
      tile(intFmt(stats.avgKillsPerMatch), 'Avg Kills / Match') +
      tile(pct(stats.hsPercent).replace('%', '<span class="summary-unit">%</span>'), 'Headshot Rate');

    var history = getMatchHistory();
    if (history.length === 0) {
      historyList.innerHTML = '<div class="history-empty">No matches played yet.</div>';
      return;
    }

    function plural(n, singular, pluralForm) {
      return n === 1 ? (n + ' ' + singular) : (n + ' ' + pluralForm);
    }
    function fmtDate(iso) {
      try {
        var d = new Date(iso);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var day = d.getDate();
        var mo = months[d.getMonth()];
        var hh = d.getHours();
        var mm = d.getMinutes();
        return mo + ' ' + day + ', ' + (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
      } catch(e) { return ''; }
    }

    var html = '';
    for (var i = 0; i < history.length; i++) {
      var m = history[i];
      var cls = m.result === 'VICTORY' ? 'win' : m.result === 'DEFEAT' ? 'loss' : 'draw';
      var k = m.kills || 0, dth = m.deaths || 0, hs = m.headshots || 0;
      var diff = m.difficulty ? (m.difficulty.charAt(0).toUpperCase() + m.difficulty.slice(1).toLowerCase()) : '';
      html += '<div class="history-entry ' + cls + '">' +
        '<div class="he-bar"></div>' +
        '<div class="he-head">' +
          '<div class="he-result">' + m.result + '</div>' +
          '<div class="he-score-small">' + (m.playerScore || 0) + ' — ' + (m.botScore || 0) + '</div>' +
        '</div>' +
        '<div class="he-mid">' +
          '<b>' + plural(k, 'kill', 'kills') + '</b> · ' +
          '<b>' + plural(dth, 'death', 'deaths') + '</b> · ' +
          '<b>' + plural(hs, 'headshot', 'headshots') + '</b>' +
        '</div>' +
        '<div class="he-right">' +
          (diff ? '<div class="he-diff">' + diff + '</div>' : '') +
          '<div>' + fmtDate(m.date) + '</div>' +
        '</div>' +
      '</div>';
    }
    historyList.innerHTML = html;
  }
```

Note: the function falls back to manual formatting if `GAME.format` is not loaded, keeping the existing tests (which may load `progression.js` in isolation without `format.js`) working. We also load `format.js` in the test's `beforeAll` block next step to be safe.

- [ ] **Step 8: Load `format.js` in progression test's `beforeAll`**

Open `tests/unit/progression.test.js`. At the top, `beforeAll` currently does:

```js
beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/systems/progression.js');
});
```

Change to:

```js
beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/core/format.js');
  loadModule('js/systems/progression.js');
});
```

- [ ] **Step 9: Run progression tests — they should pass**

Run: `npx vitest run tests/unit/progression.test.js`
Expected: all tests pass (existing + 5 new).

- [ ] **Step 10: Run full test suite**

Run: `npm test`
Expected: green across the board.

- [ ] **Step 11: Manual browser verification**

1. Play a handful of matches (mix of wins/losses/draws).
2. Open Match History from the main menu.
3. Verify 4 tiles: Matches Played, Win Rate, Avg Kills / Match, Headshot Rate — numbers readable, units rendered.
4. Verify entry rows: each has a colored left bar, VICTORY/DEFEAT/DRAW label + score, `N kills · N deaths · N headshots`, difficulty (blue caps) + date (`Apr 22, 14:32`).
5. Verify singular/plural: force a match with 1 kill to confirm "1 kill" (not "1 kills").
6. Verify empty state by clearing `miniCS_history` in DevTools and reopening.

- [ ] **Step 12: Update `REQUIREMENTS.md`**

Replace lines 1653-1658:

Old:
```
- **Match History panel** (full-screen overlay, z-index 30):
  - Stats summary: matches played, W/L/D, win rate, headshot %
  - Scrollable match list with result color, score, K/D, difficulty, date
  - Close button; opened via "Match History" button in menu
  - Persisted in `localStorage('miniCS_history')`, max 50 entries
  - Tracks `matchKills`, `matchDeaths`, `headshots`, `difficulty`, `xpEarned` per match
```

New:
```
- **Match History panel** (full-screen overlay, z-index 30):
  - Top stats: 4 tiles — Matches Played, Win Rate, Avg Kills / Match, Headshot Rate (shared `.summary-stats` grid).
  - Scrollable match list — each entry is a card with a colored left bar (win/loss/draw), result label + score, spelled-out stats (`N kills · N deaths · N headshots` with singular/plural handling), and difficulty + date on the right.
  - Close button; opened via "Match History" button in menu.
  - Persisted in `localStorage('miniCS_history')`, max 50 entries.
  - Tracks `kills`, `deaths`, `headshots`, `difficulty`, `xpEarned` per match.
  - Numbers rendered via `GAME.format` helpers.
```

- [ ] **Step 13: Commit**

```bash
git add tests/unit/progression.test.js js/systems/progression.js index.html REQUIREMENTS.md
git commit -m "feat(history): redesign Match History panel as tactical scorecard

Top row switches from W/L/D text to 4 summary tiles (Matches Played,
Win Rate, Avg Kills / Match, Headshot Rate). Entry rows gain a
colored left bar per result and spelled-out 'N kills · N deaths ·
N headshots' with singular/plural handling — no more '12K / 5D'
shorthand. Adds getStats.avgKillsPerMatch."
```

---

## Task 8: Cleanup obsolete CSS + sanity sweep

Purge the no-longer-referenced old classes and verify the full test/manual sweep.

**Files:**
- Modify: `index.html` (remove obsolete CSS selectors)

- [ ] **Step 1: Remove obsolete CSS selectors**

Open `index.html`. Delete the following rules entirely (they no longer style any live markup):

- `.btn-row` — if it's the only definition (grep first to verify no other consumers): keep if still used by any unchanged screen; remove if only end-screens used it.
- `.restart-btn` / `.restart-btn:hover`
- `.menu-btn` / `.menu-btn:hover`
- `.xp-breakdown`, `.xp-breakdown .xp-line`, `.xp-breakdown .xp-val`, `.xp-total`
- `#match-end .final-score` (if not already removed in Task 3)
- `#survival-end .wave-result`, `#survival-end .survival-stats` (if not already removed in Task 4)
- `#gungame-end .gungame-time`, `#gungame-end .gungame-stats` (if not already removed in Task 5)
- `#deathmatch-end .dm-result`, `#deathmatch-end .dm-stats` (if not already removed in Task 6)
- Any orphaned `.stat-box`, `.stat-val`, `.stat-label`, `.history-stats` rules not already removed in Task 7.

**Before deleting**, for each selector, run a quick grep to make sure nothing else still uses it:

```bash
grep -n "btn-row\|restart-btn\|menu-btn\|xp-breakdown\|xp-line\|xp-val\|xp-total\|stat-box\|stat-val\|stat-label\|\\.history-stats\|wave-result\|survival-stats\|gungame-time\|gungame-stats\|\\.dm-result\b\|dm-stats" index.html js/
```

Keep any rule whose class still appears in remaining HTML or JS. Remove the rest.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Full manual regression sweep**

Start the local server and play through each affected surface:

1. Competitive match to completion (all three outcomes ideally — win, loss, draw by playing a 3-3 match).
2. Survival on Dust until death.
3. Gun Game on Office through to completion.
4. Deathmatch on Warehouse — play to kill target once, and let timer expire once.
5. Open Match History from the menu; verify all entries render with the new card style.
6. Verify none of these surfaces show: `K/D`, `HS %`, `14K/8D`, or any `N.NN` decimal ratio.
7. Verify the XP rank-up flair triggers when crossing a rank band (grant enough XP by repeating matches or by briefly setting `localStorage.miniCS_xp` in DevTools to just below a rank threshold).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "style: remove obsolete end-screen CSS after redesign

Drops .xp-breakdown / .xp-line / .xp-val / .xp-total, old per-mode
end-screen CSS rules (.wave-result, .survival-stats, .gungame-time,
.gungame-stats, .dm-result, .dm-stats), legacy .stat-box /
.stat-val / .stat-label. All replaced by the shared .summary-*
namespace."
```

---

## Self-Review Notes

- **Spec coverage:** Every in-scope item from the spec maps to at least one task:
  - Shared CSS language → Task 2
  - `GAME.format` module → Task 1
  - Competitive / Survival / Gun Game / Deathmatch end-screens → Tasks 3 / 4 / 5 / 6
  - Match History panel (top stats + entry rows + `avgKillsPerMatch`) → Task 7
  - Counter resets for Survival / Gun Game → Tasks 4 / 5
  - Number-formatting rules (no decimals, commas, rounded percents) → Task 1 (helpers) + Tasks 3–7 (consumers)
  - REQUIREMENTS.md updates → per-task (3, 4, 5, 6, 7)
  - Unit tests (format + progression extensions) → Tasks 1 / 7
  - CSS cleanup → Task 8

- **Placeholder scan:** No TBD / TODO; every code block is complete; every command has expected output.

- **Type consistency:** `GAME.format.int / percent / percentValue / time / ratioPair / titleCase` used identically in all tasks. `.summary-*` class names used identically across all screens. The `rankResult.newRank` / `getNextRank(rank)` / `getTotalXP()` pattern is reused identically in Competitive, Survival, Gun Game, Deathmatch XP panels.

- **Known non-TDD surfaces:** Tasks 3–6 rely on `GAME.format` tests (Task 1) + manual browser verification rather than direct end-screen DOM tests. The spec flagged a smoke test as optional; it's not included here because setting up the mode modules with all their dependencies (player, weapons, enemies) would require significant stubbing that's out of proportion to the value. If a future need arises, extract a `buildMatchEndHtml(stats)` pure helper per mode and unit-test it in isolation.
