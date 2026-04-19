# No Boss in CT vs T Team Competitive — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the boss from competitive Team (CT vs T) matches so round 6 plays as a standard team round, and hide the "BOSS FIGHT" skip button whenever Team mode is selected.

**Architecture:** Two surgical gates around the existing team-mode flag (`teamMode` in `competitive.js`, `selectedCompMode` in the menu code of `main.js`). The boss system, `isBossRound()`, and all other game modes are untouched. Menu visibility is driven from the existing `updateCompModeUI()` function.

**Tech Stack:** Vanilla JS IIFE modules attached to `window.GAME`, Three.js r160.1 (global `THREE`), Vitest for unit tests.

**Spec:** `docs/superpowers/specs/2026-04-19-no-boss-in-team-competitive-design.md`

---

## File Structure

Files this plan touches:

- **Modify** `js/modes/competitive.js` — wrap the round-6 boss spawn block with `!teamMode`; add defensive early-return in the `#comp-boss-btn` click handler. *Note: the `#comp-boss-btn` click handler actually lives in `js/core/main.js`, not here. See Task 3 below.*
- **Modify** `js/core/main.js` — toggle `compBossBtn.style.display` in `updateCompModeUI()`; add defensive guard at the top of the `compBossBtn` click handler.
- **Modify** `REQUIREMENTS.md` — clarify boss spawns only in solo competitive; note Boss Fight button is solo-only.
- **Modify** `tests/unit/main.test.js` — add tests for menu visibility, click guard, and regression on the pure `isBossRound` predicate.

No new files. No file splits.

---

## Task 1: Menu — Boss Fight button hidden in Team mode (TDD)

**Files:**
- Test: `tests/unit/main.test.js` — append new `describe` block after the existing `describe('Boss Fight skip button', …)` block (around line 585)
- Modify: `js/core/main.js` — inside `updateCompModeUI()` (around line 394)

**Context for the engineer:**
- The competitive card has two mode buttons with `data-comp-mode="solo"` and `data-comp-mode="team"`, in `#comp-mode-row` (see `index.html:1687-1690`).
- Clicking one sets the module-scoped `selectedCompMode` and calls `updateCompModeUI()` (see `js/core/main.js:416-423`).
- `updateCompModeUI()` already toggles `dom.compTeamOptions.style.display` based on `selectedCompMode === 'team'`. We follow the same pattern for `dom.compBossBtn`.

- [ ] **Step 1: Add failing tests**

Append this `describe` block to `tests/unit/main.test.js` (immediately after the `describe('Boss Fight skip button', …)` block, around line 585):

```js
describe('Boss Fight button hidden in team mode', () => {
  function clickCompMode(mode) {
    var btn = document.querySelector('#comp-mode-row [data-comp-mode="' + mode + '"]');
    btn.click();
  }

  it('boss fight button visible when solo mode selected', () => {
    clickCompMode('solo');
    var btn = document.getElementById('comp-boss-btn');
    expect(btn.style.display).toBe('');
  });

  it('boss fight button hidden when team mode selected', () => {
    clickCompMode('team');
    var btn = document.getElementById('comp-boss-btn');
    expect(btn.style.display).toBe('none');
  });

  it('toggling solo -> team -> solo updates visibility each time', () => {
    var btn = document.getElementById('comp-boss-btn');
    clickCompMode('solo');
    expect(btn.style.display).toBe('');
    clickCompMode('team');
    expect(btn.style.display).toBe('none');
    clickCompMode('solo');
    expect(btn.style.display).toBe('');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/unit/main.test.js -t "Boss Fight button hidden in team mode"`

Expected: All three tests FAIL. The second one will likely report `expected '' to be 'none'` (button never hidden); the third will likely fail on the team assertion.

- [ ] **Step 3: Add the visibility toggle in `updateCompModeUI()`**

In `js/core/main.js`, locate `updateCompModeUI()` (starts around line 388). Immediately after the existing line:

```js
      dom.compTeamOptions.style.display = selectedCompMode === 'team' ? 'block' : 'none';
```

Add this line:

```js
      dom.compBossBtn.style.display = selectedCompMode === 'team' ? 'none' : '';
```

Final snippet (for clarity — the two lines should sit together):

```js
      // Show/hide team options
      dom.compTeamOptions.style.display = selectedCompMode === 'team' ? 'block' : 'none';
      // Hide Boss Fight skip button in team mode (boss is solo-only)
      dom.compBossBtn.style.display = selectedCompMode === 'team' ? 'none' : '';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/unit/main.test.js -t "Boss Fight button hidden in team mode"`

Expected: All three tests PASS.

- [ ] **Step 5: Run the full test file to ensure nothing else broke**

Run: `npm test -- tests/unit/main.test.js`

Expected: All tests in `main.test.js` PASS.

- [ ] **Step 6: Commit**

```bash
git add js/core/main.js tests/unit/main.test.js
git commit -m "feat: hide Boss Fight button when team mode selected"
```

---

## Task 2: Menu — Defensive guard on BOSS FIGHT click handler (TDD)

**Files:**
- Test: `tests/unit/main.test.js` — append to the same new `describe` block from Task 1 (or add a new one immediately after)
- Modify: `js/core/main.js` — `compBossBtn` click handler (around line 491)

**Context for the engineer:**
- The `compBossBtn` click handler sets `_skipToBoss = true` before starting the match (see `js/core/main.js:491-504`).
- The UI now hides the button in team mode, but programmatic `.click()` calls or third-party tooling could still trigger it. We add an early-return as defense-in-depth so `_skipToBoss` is never set when `selectedCompMode === 'team'`.
- `_fadeMenuAndStart` triggers a menu fade animation and eventually calls `startMatch`. We want to ensure it is **not** called either.

- [ ] **Step 1: Add failing tests**

Append these tests inside the `describe('Boss Fight button hidden in team mode', …)` block from Task 1 (right before its closing `});`):

```js
  it('clicking BOSS FIGHT in team mode does not set _skipToBoss', () => {
    GAME._skipToBoss = false;
    clickCompMode('team');
    document.getElementById('comp-boss-btn').click();
    expect(GAME._skipToBoss).toBe(false);
    // Cleanup: reset UI state
    clickCompMode('solo');
  });

  it('clicking BOSS FIGHT in solo mode still sets _skipToBoss', () => {
    GAME._skipToBoss = false;
    clickCompMode('solo');
    // Stub startMatch so the click does not actually launch a match
    var original = GAME.modes.competitive.startMatch;
    GAME.modes.competitive.startMatch = function() {};
    try {
      document.getElementById('comp-boss-btn').click();
      // _fadeMenuAndStart is asynchronous; _skipToBoss is set synchronously
      // in the click handler before the fade begins.
      expect(GAME._skipToBoss).toBe(true);
    } finally {
      GAME.modes.competitive.startMatch = original;
      GAME._skipToBoss = false;
    }
  });
```

- [ ] **Step 2: Run the tests to verify the team-mode one fails**

Run: `npm test -- tests/unit/main.test.js -t "Boss Fight button hidden in team mode"`

Expected: The new "clicking BOSS FIGHT in team mode does not set _skipToBoss" test FAILS (`_skipToBoss` becomes `true` even in team mode because the existing handler does not check). The "clicking BOSS FIGHT in solo mode" test should already PASS.

- [ ] **Step 3: Add the defensive guard**

In `js/core/main.js`, locate the `compBossBtn` click handler (around line 491). Add an early-return as the first statement:

Before:

```js
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
      _fadeMenuAndStart(function() { GAME.modes.competitive.startMatch(mapIdx); });
    });
```

After:

```js
    dom.compBossBtn.addEventListener('click', function() {
      // Boss Fight is solo-only; guard against programmatic clicks in team mode
      if (selectedCompMode === 'team') return;
      if (GAME.Sound) GAME.Sound.menuStartClick();
      var mapEl = document.querySelector('#comp-map-grid .config-map-btn.selected');
      var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
      teamMode = false;
      _skipToBoss = true;
      _fadeMenuAndStart(function() { GAME.modes.competitive.startMatch(mapIdx); });
    });
```

Note: because the early-return eliminates the `selectedCompMode === 'team'` branch, the inner `if/else` collapses to a single `teamMode = false;` line. The `teamObjective` and `playerTeam` assignments were only ever reachable when `selectedCompMode === 'team'`, which is now impossible inside this handler, so they are safely removed.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/unit/main.test.js -t "Boss Fight button hidden in team mode"`

Expected: All tests in the block PASS, including both new click-guard tests.

- [ ] **Step 5: Run the full test file**

Run: `npm test -- tests/unit/main.test.js`

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add js/core/main.js tests/unit/main.test.js
git commit -m "feat: guard Boss Fight click handler against team mode"
```

---

## Task 3: Gate boss spawn on round 6 when in team mode (TDD)

**Files:**
- Modify: `js/modes/competitive.js` — `startRound()` boss-spawn block (around line 137)
- Test: `tests/unit/main.test.js` — append a new `describe` block for the round-6 gate

**Context for the engineer:**
- In `js/modes/competitive.js`, `startRound()` currently reaches this block unconditionally on round 6 (see lines 136-156):
  ```js
      // Spawn boss on final round
      if (GAME.boss.isBossRound(roundNumber)) {
        // Re-spawn with fewer regular bots for boss round
        enemyManager.clearAll();
        // … clears and respawns with fewer bots, then calls enemyManager.spawnBoss …
      }
  ```
- The outer function already has `var teamMode = GAME._teamMode;` read near the top (see line 25 — verify before editing).
- The goal is to *skip the entire block* in team mode so no boss spawns, no atmosphere activates, no HUD is shown, and the already-completed `spawnTeamBots` call earlier in `startRound` remains the only spawn.
- Running `startRound()` end-to-end in a unit test is impractical (it needs scene, walls, map rotation, shader warmup, etc.), so the test for this task spies on `GAME._enemyManager.spawnBoss` and invokes `startRound` inside a `try/catch`. The *call count* assertion is the value; downstream setup errors are acceptable as long as they occur *after* the gate.

- [ ] **Step 1: Verify the existing `teamMode` variable**

Open `js/modes/competitive.js` and confirm that `startRound()` already reads `var teamMode = GAME._teamMode;` before the boss block. Run:

```bash
grep -n "var teamMode" js/modes/competitive.js
```

Expected output includes a line like `25:    var teamMode = GAME._teamMode;` (exact line number may vary — the important thing is that it is declared inside `startRound` and *before* line ~137). If it is missing, add `var teamMode = GAME._teamMode;` at the top of `startRound()` before proceeding.

- [ ] **Step 2: Add failing test for the gate**

Append this `describe` block to `tests/unit/main.test.js` (after the blocks from Tasks 1 and 2):

```js
describe('Competitive round 6 boss gate in team mode', () => {
  function freshRoundState() {
    // Put the game into a state where the next call to startRound() will
    // be round 6 (the boss round). startRound() increments _roundNumber
    // at its start, so pre-set it to 5.
    GAME._roundNumber = 5;
    GAME._gameState = GAME._STATES.ROUND_END; // legal precondition
  }

  it('does not call spawnBoss on round 6 when team mode is active', () => {
    var bossSpawned = false;
    var originalSpawn = GAME._enemyManager.spawnBoss;
    GAME._enemyManager.spawnBoss = function() {
      bossSpawned = true;
      return originalSpawn.apply(this, arguments);
    };
    GAME._teamMode = true;
    freshRoundState();
    try {
      // startRound depends on full game state; downstream errors are fine
      // as long as they occur AFTER the boss-spawn gate.
      try { GAME._startRound(); } catch (e) { /* intentional */ }
      expect(bossSpawned).toBe(false);
    } finally {
      GAME._enemyManager.spawnBoss = originalSpawn;
      GAME._teamMode = false;
    }
  });

  it('isBossRound(6) still returns true (predicate unchanged)', () => {
    expect(GAME._isBossRound(6)).toBe(true);
  });

  it('isBossRound(5) still returns false (predicate unchanged)', () => {
    expect(GAME._isBossRound(5)).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- tests/unit/main.test.js -t "Competitive round 6 boss gate in team mode"`

Expected: "does not call spawnBoss on round 6 when team mode is active" FAILS (bossSpawned is `true` because the current code spawns the boss regardless of team mode). The two `isBossRound` predicate checks PASS.

- [ ] **Step 4: Add the team-mode gate**

In `js/modes/competitive.js` (around line 136-137), change:

```js
    // Spawn boss on final round
    if (GAME.boss.isBossRound(roundNumber)) {
```

to:

```js
    // Spawn boss on final round — solo competitive only; team mode plays a normal round 6
    if (!teamMode && GAME.boss.isBossRound(roundNumber)) {
```

The body of the `if` block (clear enemies, respawn with fewer, `spawnBoss`, `showHealthBar`, `activateAtmosphere`, announcement, `bossSpawnAlert` sound) is unchanged. Do not delete the now-unreachable team-mode branch inside the block — it is guarded out automatically and keeps solo behavior clear. If you want to simplify the inside-of-block team branch (lines ~141-146), **don't in this task**; keep the diff minimal.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- tests/unit/main.test.js -t "Competitive round 6 boss gate in team mode"`

Expected: All three tests PASS.

- [ ] **Step 6: Run the full test file and the full suite**

Run: `npm test -- tests/unit/main.test.js`
Then: `npm test`

Expected: All tests PASS across the whole suite.

- [ ] **Step 7: Commit**

```bash
git add js/modes/competitive.js tests/unit/main.test.js
git commit -m "feat: skip boss spawn on round 6 in team competitive"
```

---

## Task 4: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md` — two bullets (lines ~379 and ~902)

**Context for the engineer:**
Per the project's CLAUDE.md, REQUIREMENTS.md must stay in sync with behavior changes. Two bullets reference the boss-round behavior and the Boss Fight button.

- [ ] **Step 1: Update the Map Mode / Play Again bullet (~line 379)**

Find this line in `REQUIREMENTS.md`:

```markdown
  - **Competitive**: first round always uses the player-selected map; rotates between subsequent rounds. Play Again restarts the match on that same player-selected starting map (including Boss Fight)
```

Replace with:

```markdown
  - **Competitive**: first round always uses the player-selected map; rotates between subsequent rounds. Play Again restarts the match on that same player-selected starting map (including Boss Fight, which is solo-only)
```

- [ ] **Step 2: Update the Spawn Rules / Competitive bullet (~line 902)**

Find this line in `REQUIREMENTS.md`:

```markdown
- **Competitive**: Always plays all 6 rounds; boss spawns on round 6 alongside 1–2 regular bots; winner determined by most round wins after all 6 rounds
```

Replace with:

```markdown
- **Competitive (Solo)**: Always plays all 6 rounds; boss spawns on round 6 alongside 1–2 regular bots; winner determined by most round wins after all 6 rounds
- **Competitive (Team, CT vs T)**: Always plays all 6 rounds; **no boss** on round 6 — it is a standard team round. The "BOSS FIGHT" skip button is hidden while Team mode is selected
```

- [ ] **Step 3: Verify nothing else references boss-in-team-mode**

Run: `grep -n -i "boss" REQUIREMENTS.md`

Expected: The output shows the two updated lines plus existing boss-system documentation (stats, shield, charge, heartbeat, atmosphere, etc.). Confirm no other line implies a boss appears in team competitive.

- [ ] **Step 4: Run the full test suite one more time**

Run: `npm test`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: clarify boss is solo-only in competitive"
```

---

## Task 5: Manual smoke test

**Context for the engineer:**
Per CLAUDE.md, UI changes should be verified in a browser. The project is a static site — open `index.html` in a browser (or run a local static server, e.g. `npx http-server .`).

- [ ] **Step 1: Open the game**

Open `index.html` in a browser.

- [ ] **Step 2: Verify Solo mode still shows Boss Fight button**

- Click the Competitive card.
- Ensure `SOLO` is selected in the Mode row.
- Confirm both `START` and `BOSS FIGHT` buttons are visible at the bottom of the competitive config panel.

- [ ] **Step 3: Verify Team mode hides Boss Fight button**

- Click `TEAM` in the Mode row.
- Confirm the Boss Fight button disappears (only `START` remains).
- Confirm the Objective and Side rows appear (existing behavior, unchanged).

- [ ] **Step 4: Toggle back and forth**

- Click `SOLO` → Boss Fight reappears.
- Click `TEAM` → Boss Fight disappears.
- Repeat 2–3 times to confirm idempotency.

- [ ] **Step 5: Verify Solo competitive still has a boss on round 6**

- Select `SOLO`, pick any map, click `BOSS FIGHT`. The match should start on the boss round with the boss health bar and atmosphere active. (Or click `START` and play through 5 rounds.)
- Kill the boss, confirm the boss kill payoff triggers.

- [ ] **Step 6: Verify Team competitive has NO boss on round 6**

- Select `TEAM`, pick a small difficulty (e.g. Easy = 2v2), pick any map, click `START`.
- Play through 5 rounds (you can die and lose rounds — just need to reach round 6).
- On round 6:
  - No `BOSS ROUND` announcement.
  - No boss health bar at the top of the screen.
  - No boss atmosphere (no red tint, no heartbeat).
  - Opposing team bots are the normal team-size count (not reduced to 1–2).
  - Round ends normally (elimination or bomb objective per your selection).

- [ ] **Step 7: Record results**

If any smoke step fails, open a new task to investigate. If all pass, this implementation is complete.

---

## Self-Review Notes

This plan was self-reviewed against the spec:

- **Spec coverage:** Every behavior in the spec's "Behavior" section maps to a task (menu visibility → Task 1; click guard → Task 2; round-6 gate → Task 3; REQUIREMENTS updates → Task 4; manual smoke → Task 5).
- **Placeholder scan:** No "TBD"/"TODO"/"similar to above" — every code block is complete.
- **Type consistency:** `selectedCompMode`, `teamMode`, `GAME._teamMode`, `GAME._isBossRound`, `GAME._startRound`, `GAME._enemyManager.spawnBoss`, `GAME.modes.competitive.startMatch`, and `GAME._skipToBoss` are used consistently across all tasks and match the current codebase.
- **TDD structure:** Every code-changing task has test-first, failing-run, implementation, passing-run, full-suite, commit.
- **No scope creep:** No refactoring of unrelated competitive code; no removal of the now-unreachable inside-of-block team branch in `competitive.js` (Task 3 Step 4 explicitly defers this).
