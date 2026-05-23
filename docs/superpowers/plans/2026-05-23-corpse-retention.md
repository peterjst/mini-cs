# Corpse Retention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Killed bots in Deathmatch and Gun Game fall and rest on the floor as corpses, capped at the 8 most recent (oldest evicted FIFO) so the scene never bloats.

**Architecture:** Add a small shared corpse manager `GAME.corpses` in `js/systems/enemies.js`. On a bot kill, the respawn path hands the dead enemy to `GAME.corpses.add()` instead of calling `enemy.destroy()` immediately — so the existing 0.4s fall animation finishes and the mesh lingers. The manager holds a FIFO list capped at 8; eviction reuses the existing `Enemy.destroy()` (clears the death-anim interval + removes the mesh from the scene). Corpses are cleared at every scene rebuild via `GAME._clearRoundEffects`.

**Tech Stack:** Vanilla JS (IIFE modules attaching to `window.GAME`), Three.js r160.1 (global `THREE`), Vitest + jsdom for tests.

---

## Background (read before starting)

Current kill flow in respawn modes:
1. `Enemy.prototype.die()` (`js/systems/enemies.js:2346`) sets `_dying`, starts a `setInterval` that runs a ~0.4s fall animation, and self-clears the interval when the animation completes (it does NOT remove the mesh).
2. On the kill, `js/core/main.js` calls `GAME.modes.deathmatch.queueBotRespawn(enemy)` (line 1251) or `GAME.modes.gungame.queueBotRespawn(enemy)` (line 1231), then splices the enemy out of `enemyManager.enemies`.
3. Inside `queueBotRespawn`, `enemy.destroy()` is called **immediately** (`deathmatch.js:212`, `gungame.js:185`), which clears the running death-anim interval and removes the mesh from the scene — so the body pops out before the fall finishes.

Key facts that make this safe:
- Hit detection (`js/systems/weapons.js:1554`) builds its raycast target list **only** from `alive` enemies in `enemyManager.enemies`. A corpse is spliced out of that array (still happens in main.js) and is `!alive`, so retained corpse meshes never block bullets or register phantom hits.
- `Enemy.prototype.destroy()` (`enemies.js:2485`) only does `clearInterval(this._deathInterval)` + `if (this.mesh.parent) this.scene.remove(this.mesh)`. No material/geometry disposal — humanoid materials are shared, so deferring `destroy()` to eviction is identical cleanup, just later.
- Only one mode runs at a time, so a single shared FIFO list is correct.

---

## File Structure

- **`js/systems/enemies.js`** (modify) — add the `GAME.corpses` manager inside the existing IIFE, exposed near the other `GAME.*` assignments at the bottom (~line 3562). It lives here because it manages retired `Enemy` instances/meshes built in this file.
- **`js/modes/deathmatch.js`** (modify) — `dmQueueBotRespawn` hands the enemy to `GAME.corpses.add()` instead of destroying it.
- **`js/modes/gungame.js`** (modify) — `gunGameQueueBotRespawn` does the same.
- **`js/core/main.js`** (modify) — `GAME._clearRoundEffects` also clears corpses, so no corpse survives into a new round/match/map. This single chokepoint runs at the start of every scene rebuild for every mode, which is a cleaner (DRY) implementation of the spec's "clear on mode start/end" intent than editing each mode's start and end functions.
- **`tests/unit/corpses.test.js`** (create) — unit tests for the corpse manager.
- **`docs/architecture.md`** (modify) — note the new `corpses` system and the modes → corpses contract.

---

## Task 1: Corpse manager + unit tests

**Files:**
- Modify: `js/systems/enemies.js` (add manager inside IIFE; expose near line 3562)
- Test: `tests/unit/corpses.test.js` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/unit/corpses.test.js`:

```javascript
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/systems/weapons.js');
  loadModule('js/systems/enemies.js');
});

// Minimal stand-in for a retired Enemy: corpses only ever calls .destroy() on it.
function fakeCorpse() {
  return { destroy: vi.fn() };
}

describe('GAME.corpses', () => {
  beforeEach(() => {
    GAME.corpses.clear();
  });

  it('exposes add, clear, and count', () => {
    expect(typeof GAME.corpses.add).toBe('function');
    expect(typeof GAME.corpses.clear).toBe('function');
    expect(typeof GAME.corpses.count).toBe('function');
  });

  it('retains corpses up to the cap of 8 without destroying any', () => {
    var bodies = [];
    for (var i = 0; i < 8; i++) {
      var b = fakeCorpse();
      bodies.push(b);
      GAME.corpses.add(b);
    }
    expect(GAME.corpses.count()).toBe(8);
    bodies.forEach(function (b) {
      expect(b.destroy).not.toHaveBeenCalled();
    });
  });

  it('evicts the oldest (FIFO) when the 9th is added, keeping count at 8', () => {
    var bodies = [];
    for (var i = 0; i < 9; i++) {
      var b = fakeCorpse();
      bodies.push(b);
      GAME.corpses.add(b);
    }
    expect(GAME.corpses.count()).toBe(8);
    // Oldest (index 0) evicted and destroyed exactly once.
    expect(bodies[0].destroy).toHaveBeenCalledTimes(1);
    // The 8 most recent are retained — none destroyed.
    for (var j = 1; j < 9; j++) {
      expect(bodies[j].destroy).not.toHaveBeenCalled();
    }
  });

  it('evicts in FIFO order across multiple over-cap adds', () => {
    var bodies = [];
    for (var i = 0; i < 10; i++) {
      var b = fakeCorpse();
      bodies.push(b);
      GAME.corpses.add(b);
    }
    expect(GAME.corpses.count()).toBe(8);
    // First two added were evicted.
    expect(bodies[0].destroy).toHaveBeenCalledTimes(1);
    expect(bodies[1].destroy).toHaveBeenCalledTimes(1);
    expect(bodies[2].destroy).not.toHaveBeenCalled();
    expect(bodies[9].destroy).not.toHaveBeenCalled();
  });

  it('clear() destroys every held corpse and empties the list', () => {
    var bodies = [];
    for (var i = 0; i < 3; i++) {
      var b = fakeCorpse();
      bodies.push(b);
      GAME.corpses.add(b);
    }
    GAME.corpses.clear();
    expect(GAME.corpses.count()).toBe(0);
    bodies.forEach(function (b) {
      expect(b.destroy).toHaveBeenCalledTimes(1);
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/corpses.test.js`
Expected: FAIL — `TypeError: Cannot read properties of undefined (reading 'clear')` (or similar), because `GAME.corpses` does not exist yet.

- [ ] **Step 3: Implement the corpse manager**

In `js/systems/enemies.js`, just **before** the closing exposure block (the line `GAME.EnemyManager = EnemyManager;` near line 3562), add:

```javascript
  // ── Corpse retention ──────────────────────────────────────
  // Retains the most-recent dead bots so their fall animation finishes and
  // the body lingers. FIFO, capped — oldest is destroyed when the cap is
  // exceeded. Eviction reuses Enemy.destroy() (clears the death-anim interval
  // and removes the mesh from the scene). Only one mode runs at a time, so a
  // single shared list is correct. See docs/superpowers/specs/2026-05-23-corpse-retention-design.md
  var MAX_CORPSES = 8;
  var corpseList = [];
  GAME.corpses = {
    add: function(enemy) {
      corpseList.push(enemy);
      while (corpseList.length > MAX_CORPSES) {
        var oldest = corpseList.shift();
        oldest.destroy();
      }
    },
    clear: function() {
      for (var i = 0; i < corpseList.length; i++) corpseList[i].destroy();
      corpseList = [];
    },
    count: function() { return corpseList.length; }
  };

```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/corpses.test.js`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add js/systems/enemies.js tests/unit/corpses.test.js
git commit -m "$(cat <<'EOF'
feat(enemies): add GAME.corpses FIFO retention manager (cap 8)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Route Deathmatch kills through the corpse manager

**Files:**
- Modify: `js/modes/deathmatch.js:212`

- [ ] **Step 1: Make the change**

In `js/modes/deathmatch.js`, inside `dmQueueBotRespawn` (line 209), replace the immediate destroy with a hand-off to the corpse manager.

Change line 212 from:

```javascript
    enemy.destroy();
```

to:

```javascript
    GAME.corpses.add(enemy);
```

Leave everything else in the function (respawn-queue push, far-spawn selection) unchanged.

- [ ] **Step 2: Run the full test suite to verify nothing broke**

Run: `npm test`
Expected: PASS — all existing suites plus `corpses.test.js` green. (No deathmatch-specific test asserts on `destroy` being called synchronously; if one does, that is a real surface and should be reported, not silenced.)

- [ ] **Step 3: Commit**

```bash
git add js/modes/deathmatch.js
git commit -m "$(cat <<'EOF'
feat(deathmatch): retain killed bots as corpses instead of destroying

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Route Gun Game kills through the corpse manager

**Files:**
- Modify: `js/modes/gungame.js:185`

- [ ] **Step 1: Make the change**

In `js/modes/gungame.js`, inside `gunGameQueueBotRespawn` (line 182), change line 185 from:

```javascript
    enemy.destroy();
```

to:

```javascript
    GAME.corpses.add(enemy);
```

Leave the rest of the function unchanged.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 3: Commit**

```bash
git add js/modes/gungame.js
git commit -m "$(cat <<'EOF'
feat(gungame): retain killed bots as corpses instead of destroying

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Clear corpses on scene rebuild

**Files:**
- Modify: `js/core/main.js:333-335`

This guarantees no corpse survives into a new round, match, or map. `GAME._clearRoundEffects` is called by `GAME._newRoundScene` (line 340), which runs at the start of every scene build for every mode — a single chokepoint covering the spec's "clear on mode start/end" intent.

- [ ] **Step 1: Make the change**

In `js/core/main.js`, change `GAME._clearRoundEffects` (lines 333-335) from:

```javascript
  GAME._clearRoundEffects = function() {
    if (GAME.effects && GAME.effects.clearRoundState) GAME.effects.clearRoundState();
  };
```

to:

```javascript
  GAME._clearRoundEffects = function() {
    if (GAME.effects && GAME.effects.clearRoundState) GAME.effects.clearRoundState();
    if (GAME.corpses) GAME.corpses.clear();
  };
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 3: Commit**

```bash
git add js/core/main.js
git commit -m "$(cat <<'EOF'
feat(main): clear corpses on every scene rebuild

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Visual verification + docs

This task has no unit test — it covers the fall-to-rest *look* (test-after per CLAUDE.md, since the animation was previously cut short) and the docs update.

- [ ] **Step 1: Manually verify in the browser**

Serve the project and play Deathmatch (and Gun Game):

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`, start a Deathmatch, and kill several bots. Verify:
- Each killed bot completes its fall animation and **rests on the floor** (not sunk through it, not floating, not popping out instantly).
- After 8+ kills, the scene holds at most 8 corpses — older bodies disappear as new ones are added.
- Bullets fired at/through a corpse do **not** register hits or block shots aimed at live bots behind it.
- Repeat a quick sanity check in Gun Game.

If the resting pose looks wrong (sunk/floating), the fix is in the per-variant `finalY` array or end-of-fall rotation in `Enemy.prototype.die()` (`js/systems/enemies.js:2390` and the variant blocks at 2419-2474). Tune by observation. If a concrete invariant emerges (e.g., "final mesh Y must be within X of floor"), add a regression test then.

- [ ] **Step 2: Update architecture docs**

In `docs/architecture.md`:

1. In the **Module ownership** table, update the `js/systems/enemies.js` row's "Exposes on `GAME`" cell to include `corpses`. The row currently reads:

```
| `js/systems/enemies.js` | Bot AI, humanoid models, behavior states | `enemies` |
```

Change the last cell to:

```
| `js/systems/enemies.js` | Bot AI, humanoid models, behavior states, corpse retention | `enemies`, `corpses` |
```

2. In the **Inter-system contracts** section, add a bullet after the "Modes ↔ enemies" line:

```
- **Modes ↔ corpses:** respawn modes (deathmatch, gun game) hand killed bots to `GAME.corpses.add()` instead of destroying them, so the fall animation finishes and the body lingers. The manager keeps the 8 most recent (FIFO) and is cleared on every scene rebuild via `GAME._clearRoundEffects`.
```

- [ ] **Step 3: Commit**

```bash
git add docs/architecture.md
git commit -m "$(cat <<'EOF'
docs(architecture): document corpses system and modes contract

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** cap-only policy + cap=8 (Task 1 `MAX_CORPSES`/tests); deathmatch + gun game scope (Tasks 2-3); clear on start/end (Task 3 via `_clearRoundEffects` chokepoint); bots-only (only the bot respawn paths touched, player death path untouched); hit-detection safety (verified, Task 5 step 1). All covered.
- **Type consistency:** API is `add(enemy)` / `clear()` / `count()` throughout plan and tests.
- **Implementation refinement vs spec:** spec said "clear at each mode's start and end"; this plan clears in `GAME._clearRoundEffects` instead — a single chokepoint that runs on every scene rebuild, satisfying the same intent more simply and covering map changes for free. Clearing globally is harmless for non-respawn modes (list is empty there).
