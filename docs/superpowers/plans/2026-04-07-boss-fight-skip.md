# Boss Fight Skip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "BOSS FIGHT" button to the Competitive mode card that skips directly to the boss round (round 6) with $10,000 starting money and a buy phase.

**Architecture:** A flag `_skipToBoss` is set by a new menu button. `startMatch()` checks the flag to override round number and money. All existing boss round logic is reused unchanged.

**Tech Stack:** HTML/CSS for button, JS (main.js) for flag + logic

---

### Task 1: Add "BOSS FIGHT" button to HTML and CSS

**Files:**
- Modify: `index.html:1707` (add button after START)
- Modify: `index.html:604-625` (add CSS class)

- [ ] **Step 1: Write the failing test**

In `tests/unit/main.test.js`, add a test block after the existing "Boss HUD" describe block (around line 470):

```javascript
describe('Boss Fight skip button', () => {
  it('should have boss fight button in competitive card', () => {
    var btn = document.getElementById('comp-boss-btn');
    expect(btn).not.toBeNull();
  });

  it('boss fight button should have correct text', () => {
    var btn = document.getElementById('comp-boss-btn');
    expect(btn.textContent).toBe('BOSS FIGHT');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `document.getElementById('comp-boss-btn')` returns null

- [ ] **Step 3: Add the HTML button**

In `index.html`, after the START button on line 1707:

```html
          <button class="mode-start-btn" id="comp-start-btn">START</button>
          <button class="mode-start-btn boss-fight-btn" id="comp-boss-btn">BOSS FIGHT</button>
```

- [ ] **Step 4: Add the CSS class**

In `index.html`, after the `.mode-start-btn:hover` block (after line 625):

```css
  .boss-fight-btn {
    background: rgba(183,28,28,0.15);
    border-color: rgba(229,57,53,0.6);
    color: #ef5350;
  }
  .boss-fight-btn:hover {
    background: rgba(183,28,28,0.3);
    border-color: #ef5350;
    box-shadow: 0 0 20px rgba(229,57,53,0.3);
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add index.html tests/unit/main.test.js
git commit -m "feat(menu): add BOSS FIGHT button to competitive card"
```

---

### Task 2: Add DOM ref and click handler for boss fight button

**Files:**
- Modify: `js/main.js:19` (add DOM ref)
- Modify: `js/main.js:2038-2050` (add click handler near comp start handler)

- [ ] **Step 1: Write the failing test**

In `tests/unit/main.test.js`, add to the "Boss Fight skip button" describe block:

```javascript
  it('should expose _skipToBoss flag on GAME', () => {
    expect(typeof GAME._skipToBoss).toBeDefined();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `GAME._skipToBoss` is undefined

- [ ] **Step 3: Add the DOM ref**

In `js/main.js`, after line 19 (`compStartBtn: document.getElementById('comp-start-btn'),`), add:

```javascript
    compBossBtn: document.getElementById('comp-boss-btn'),
```

- [ ] **Step 4: Add the _skipToBoss flag**

In `js/main.js`, near other match state variables (around line 689 where `TOTAL_ROUNDS` is defined), add:

```javascript
  var _skipToBoss = false;
```

And expose it on GAME after `GAME._isBossRound` (around line 4677):

```javascript
  Object.defineProperty(GAME, '_skipToBoss', {
    get: function() { return _skipToBoss; },
    set: function(v) { _skipToBoss = v; }
  });
```

- [ ] **Step 5: Add the click handler**

In `js/main.js`, after the `dom.compStartBtn` click handler (after line 2050), add:

```javascript
    dom.compBossBtn.addEventListener('click', function() {
      if (GAME.Sound) GAME.Sound.menuStartClick();
      var mapEl = document.querySelector('#comp-map-grid .config-map-btn.selected');
      var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
      if (selectedCompMode === 'team') {
        teamMode = true;
        teamObjective = selectedObjective;
        playerTeam = selectedSide;
      } else {
        teamMode = false;
      }
      _skipToBoss = true;
      _fadeMenuAndStart(function() { startMatch(mapIdx); });
    });
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add js/main.js
git commit -m "feat(menu): add boss fight button click handler and _skipToBoss flag"
```

---

### Task 3: Implement round skip and money override in startMatch

**Files:**
- Modify: `js/main.js:2612` (roundNumber init in startMatch)
- Modify: `js/main.js:2626` (money init in startMatch)

- [ ] **Step 1: Write the failing test**

In `tests/unit/main.test.js`, add to the "Boss Fight skip button" describe block:

```javascript
  it('should skip to boss round when _skipToBoss is true', () => {
    // _skipToBoss should set roundNumber to TOTAL_ROUNDS - 1 (so startRound increments to TOTAL_ROUNDS)
    // We verify via the exposed GAME._TOTAL_ROUNDS that the boss round is round 6
    expect(GAME._TOTAL_ROUNDS).toBe(6);
    expect(GAME._isBossRound(GAME._TOTAL_ROUNDS)).toBe(true);
  });
```

- [ ] **Step 2: Run test to verify it passes** (this is a sanity check on existing behavior)

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Modify startMatch to handle _skipToBoss**

In `js/main.js`, in the `startMatch` function, replace:

```javascript
    roundNumber = 0;
```

with:

```javascript
    roundNumber = _skipToBoss ? TOTAL_ROUNDS - 1 : 0;
```

This sets roundNumber to 5, so when `startRound()` increments it, it becomes 6 (the boss round).

Then replace:

```javascript
    player.money = 800;
```

with:

```javascript
    player.money = _skipToBoss ? 10000 : 800;
```

- [ ] **Step 4: Add flag reset after use**

In `js/main.js`, right after `startRound();` at the end of `startMatch()` (line 2639), add:

```javascript
    _skipToBoss = false;
```

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add js/main.js
git commit -m "feat(boss): skip to boss round with $10000 when _skipToBoss is set"
```

---

### Task 4: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md` (competitive mode section and boss section)

- [ ] **Step 1: Add boss fight skip documentation**

In `REQUIREMENTS.md`, in the boss spawn rules section (around line 859 where competitive boss spawning is documented), add after the competitive bullet point:

```markdown
- **Boss Fight shortcut**: "BOSS FIGHT" button on Competitive mode card sets `_skipToBoss` flag; `startMatch()` sets `roundNumber` to `TOTAL_ROUNDS - 1` (so `startRound()` increments to boss round) and `player.money` to $10,000; flag is cleared after `startRound()` is called
```

Also add a note in the UI section (around the mode card descriptions) documenting the button:

```markdown
- Boss Fight button (`#comp-boss-btn`): crimson-themed `.boss-fight-btn` variant of `.mode-start-btn` in Competitive card; skips to boss round with $10,000 starting money
```

- [ ] **Step 2: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: add boss fight skip button to REQUIREMENTS.md"
```

---

### Task 5: Manual smoke test

- [ ] **Step 1: Open the game in browser**

Open `index.html` in a browser.

- [ ] **Step 2: Verify button appearance**

- Competitive card should show both "START" (blue) and "BOSS FIGHT" (crimson/red) buttons
- "BOSS FIGHT" button should have red text and red border

- [ ] **Step 3: Verify boss fight skip**

- Click "BOSS FIGHT" button
- Should enter buy phase with $10,000
- Round display should show "Round 6 / 6"
- After buy phase, boss should spawn with 1-2 regular bots
- Boss fight should play out normally (phases, minions, barrage, etc.)
- Match should end after the boss round

- [ ] **Step 4: Verify normal flow unchanged**

- Return to menu, click "START" on Competitive
- Should start at Round 1 with $800 as normal
