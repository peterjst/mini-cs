# Menu Sound Effects Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 procedural UI sound effects (menuClick, menuSelect, menuStartClick, roundStartStinger) to give the game CS-inspired menu audio feedback.

**Architecture:** Add sound functions to `GAME.Sound` in `js/sound.js` using existing helpers (`noiseBurst`, `tone`, `metallicClick`, `ensureCtx`). Wire them to menu click handlers in `js/main.js`. Include a debounce guard to prevent audio stacking from rapid clicks.

**Tech Stack:** Web Audio API (OscillatorNode, GainNode, BiquadFilterNode, noise buffers), Three.js procedural game

---

## Chunk 1: Sound Functions & Tests

### Task 1: Add `menuClick()` sound function with debounce

**Files:**
- Modify: `js/sound.js:1634` (before closing `};` of Sound object)
- Test: `tests/unit/sound.test.js`

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/sound.test.js`:

```js
describe('Menu UI sounds', () => {
  it('GAME.Sound.menuClick should be a function', () => {
    expect(typeof GAME.Sound.menuClick).toBe('function');
  });

  it('menuClick should not throw', () => {
    expect(() => GAME.Sound.menuClick()).not.toThrow();
  });

  it('rapid menuClick calls should not throw (debounce)', () => {
    expect(() => {
      GAME.Sound.menuClick();
      GAME.Sound.menuClick();
      GAME.Sound.menuClick();
    }).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/sound.test.js`
Expected: FAIL — `GAME.Sound.menuClick` is undefined

- [ ] **Step 3: Write minimal implementation**

In `js/sound.js`, add a debounce timestamp variable near the top (after line 11, near other module-level vars):

```js
var _uiLastPlayed = {};
```

Add a debounce helper function (after the `metallicClick` function, around line 195):

```js
function _uiDebounce(key) {
  var now = performance.now();
  if (_uiLastPlayed[key] && now - _uiLastPlayed[key] < 50) return true;
  _uiLastPlayed[key] = now;
  return false;
}
```

Then add `menuClick` to the Sound object (before the closing `};` at line 1635):

```js
menuClick: function() {
  if (_uiDebounce('menuClick')) return;
  // Filtered noise burst — short digital tick
  noiseBurst({ duration: 0.025, gain: 0.15, freq: 3000, Q: 2,
    filterType: 'highpass' });
  // Sine blip with pitch drop — CS click character
  var c = ensureCtx();
  var t = c.currentTime;
  var osc = c.createOscillator();
  var g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, t);
  osc.frequency.exponentialRampToValueAtTime(800, t + 0.06);
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.08);
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/sound.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/sound.js tests/unit/sound.test.js
git commit -m "feat: add menuClick() procedural UI sound with debounce guard"
```

### Task 2: Add `menuSelect()` sound function

**Files:**
- Modify: `js/sound.js` (Sound object, after `menuClick`)
- Test: `tests/unit/sound.test.js`

- [ ] **Step 1: Write the failing test**

Add to the `Menu UI sounds` describe block in `tests/unit/sound.test.js`:

```js
it('GAME.Sound.menuSelect should be a function', () => {
  expect(typeof GAME.Sound.menuSelect).toBe('function');
});

it('menuSelect should not throw', () => {
  expect(() => GAME.Sound.menuSelect()).not.toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/sound.test.js`
Expected: FAIL — `GAME.Sound.menuSelect` is undefined

- [ ] **Step 3: Write minimal implementation**

Add after `menuClick` in the Sound object:

```js
menuSelect: function() {
  if (_uiDebounce('menuSelect')) return;
  // Softer, lower-pitched tick for option switching
  noiseBurst({ duration: 0.015, gain: 0.08, freq: 2000, Q: 1.5,
    filterType: 'highpass' });
  var c = ensureCtx();
  var t = c.currentTime;
  var osc = c.createOscillator();
  var g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(900, t);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.035);
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.05);
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/sound.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/sound.js tests/unit/sound.test.js
git commit -m "feat: add menuSelect() procedural UI sound for option switching"
```

### Task 3: Add `menuStartClick()` sound function

**Files:**
- Modify: `js/sound.js` (Sound object, after `menuSelect`)
- Test: `tests/unit/sound.test.js`

- [ ] **Step 1: Write the failing test**

Add to the `Menu UI sounds` describe block in `tests/unit/sound.test.js`:

```js
it('GAME.Sound.menuStartClick should be a function', () => {
  expect(typeof GAME.Sound.menuStartClick).toBe('function');
});

it('menuStartClick should not throw', () => {
  expect(() => GAME.Sound.menuStartClick()).not.toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/sound.test.js`
Expected: FAIL — `GAME.Sound.menuStartClick` is undefined

- [ ] **Step 3: Write minimal implementation**

Add after `menuSelect` in the Sound object:

```js
menuStartClick: function() {
  if (_uiDebounce('menuStartClick')) return;
  // High click — same as menuClick but slightly louder
  noiseBurst({ duration: 0.025, gain: 0.18, freq: 3000, Q: 2,
    filterType: 'highpass' });
  var c = ensureCtx();
  var t = c.currentTime;
  // Sine blip
  var osc = c.createOscillator();
  var g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, t);
  osc.frequency.exponentialRampToValueAtTime(800, t + 0.06);
  g.gain.setValueAtTime(0.14, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.08);
  // Low confirmation thump
  var osc2 = c.createOscillator();
  var g2 = c.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(200, t);
  osc2.frequency.exponentialRampToValueAtTime(120, t + 0.1);
  g2.gain.setValueAtTime(0.2, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc2.connect(g2);
  g2.connect(masterGain);
  osc2.start(t);
  osc2.stop(t + 0.15);
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/sound.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/sound.js tests/unit/sound.test.js
git commit -m "feat: add menuStartClick() procedural sound for start game confirmation"
```

### Task 4: Replace `roundStart()` with dramatic stinger

**Files:**
- Modify: `js/sound.js` (Sound object — replace `roundStart` body, add `roundStartStinger` alias)
- Test: `tests/unit/sound.test.js`

- [ ] **Step 1: Write the failing test**

Add to the `Menu UI sounds` describe block in `tests/unit/sound.test.js`:

```js
it('GAME.Sound.roundStartStinger should be a function', () => {
  expect(typeof GAME.Sound.roundStartStinger).toBe('function');
});

it('roundStartStinger should not throw', () => {
  expect(() => GAME.Sound.roundStartStinger()).not.toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/sound.test.js`
Expected: FAIL — `GAME.Sound.roundStartStinger` is undefined

- [ ] **Step 3: Write minimal implementation**

Replace the existing `roundStart` function body (lines 721-727 of `js/sound.js`) with the new stinger. Keep the function name as `roundStart` so the 4 existing call sites in `main.js` (lines 2978, 3183, 3536, 4314) continue to work without changes:

Old code to replace:
```js
roundStart: function() {
  // Tense rising tones
  tone(392, 0.18, 0.2, 'sine'); // G4
  setTimeout(function() { tone(523, 0.18, 0.22, 'sine'); }, 180); // C5
  setTimeout(function() { tone(659, 0.18, 0.24, 'sine'); }, 360); // E5
  setTimeout(function() { tone(784, 0.3, 0.28, 'sine'); }, 540); // G5
},
```

New code:
```js
roundStart: function() {
  // Dramatic stinger — detuned square waves + rising noise sweep
  var c = ensureCtx();
  var t = c.currentTime;
  // Low square wave
  var osc1 = c.createOscillator();
  var g1 = c.createGain();
  osc1.type = 'square';
  osc1.frequency.setValueAtTime(150, t);
  g1.gain.setValueAtTime(0.15, t);
  g1.gain.linearRampToValueAtTime(0.18, t + 0.05);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  osc1.connect(g1);
  g1.connect(masterGain);
  osc1.start(t);
  osc1.stop(t + 0.42);
  // Detuned higher square wave
  var osc2 = c.createOscillator();
  var g2 = c.createGain();
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(200, t);
  g2.gain.setValueAtTime(0.12, t);
  g2.gain.linearRampToValueAtTime(0.15, t + 0.05);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
  osc2.connect(g2);
  g2.connect(masterGain);
  osc2.start(t);
  osc2.stop(t + 0.4);
  // Rising filtered noise sweep
  noiseBurst({ duration: 0.3, gain: 0.1, freq: 500, freqEnd: 3000,
    Q: 1.5, filterType: 'bandpass', attack: 0.05 });
},
```

Also add `roundStartStinger` as an alias right after `roundStart`:

```js
roundStartStinger: function() { Sound.roundStart(); },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/sound.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/sound.js tests/unit/sound.test.js
git commit -m "feat: replace roundStart with dramatic stinger sound"
```

---

## Chunk 2: Event Wiring & REQUIREMENTS.md

### Task 5: Wire `menuClick()` to general menu buttons

**Files:**
- Modify: `js/main.js`
- Test: `tests/unit/main.test.js`

- [ ] **Step 1: Write a basic test**

Add to `tests/unit/main.test.js` to verify the sound function is available for wiring (integration-level wiring is verified manually in-browser):

```js
describe('Menu UI sound wiring', () => {
  it('GAME.Sound.menuClick should be callable', () => {
    expect(typeof GAME.Sound.menuClick).toBe('function');
  });

  it('GAME.Sound.menuSelect should be callable', () => {
    expect(typeof GAME.Sound.menuSelect).toBe('function');
  });

  it('GAME.Sound.menuStartClick should be callable', () => {
    expect(typeof GAME.Sound.menuStartClick).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- tests/unit/main.test.js`
Expected: PASS (all sound functions were added in Chunk 1)

- [ ] **Step 3: Add menuClick() calls to general button handlers**

In `js/main.js`, add `if (GAME.Sound) GAME.Sound.menuClick();` at the top of these click handlers:

1. **Buy item buttons** (~line 2181): Inside the `.buy-item` forEach click handler
2. **Restart buttons** (~line 2188, and survival/gungame/deathmatch restart handlers): Inside `dom.restartBtn`, `dom.survivalRestartBtn` (~line 2216), `dom.gungameRestartBtn` (~line 2225), `dom.dmRestartBtn` (~line 2233) click handlers
3. **Menu-return buttons**: Inside `dom.menuBtn` (~line 2192), `dom.pauseMenuBtn` (~line 2194), `dom.survivalMenuBtn` (~line 2220), `dom.gungameMenuBtn` (~line 2229), `dom.dmMenuBtn` (~line 2237) handlers
4. **Tour exit button** (~line 2207): Inside `dom.tourExitBtn` handler
5. **Pause resume** (~line 2193): Inside `dom.pauseResumeBtn` handler
6. **Tour map buttons** (~line 2210): Inside `.tour-map-btn` forEach handler
7. **Footer toggles** (~lines 1962, 1971, 2024, 2032, 2037): Inside `dom.controlsFooter`, `dom.loadoutFooter`, `dom.missionsFooter`, `dom.historyFooter`, `dom.tourFooter` handlers
8. **Back button** (~line 1902): Inside the config back button handler

Note: Perk cards already play `GAME.Sound.buy()` — skip them to avoid overlapping sounds.

- [ ] **Step 4: Run tests to verify nothing breaks**

Run: `npm test`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add js/main.js tests/unit/main.test.js
git commit -m "feat: wire menuClick() sound to general menu button handlers"
```

### Task 6: Wire `menuSelect()` to option selectors

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Add menuSelect() calls to option selector handlers**

In `js/main.js`, add `if (GAME.Sound) GAME.Sound.menuSelect();` at the top of these handlers (after the early-return guard where applicable):

1. **Difficulty selectors** (~line 1808): Inside the `[data-diff]` click handler, after the `if (!btn.dataset.diff) return;` guard
2. **Comp mode toggle** (~line 1853): Inside `dom.compModeRow` click handler, after the `if (!btn) return;` guard
3. **Objective toggle** (~line 1861): Inside `dom.compObjectiveRow` click handler, after the `if (!btn) return;` guard
4. **Side toggle** (~line 1869): Inside `dom.compSideRow` click handler, after the `if (!btn) return;` guard
5. **Map mode toggles** (~line 1878): Inside the map mode row forEach click handler, after the `if (!btn) return;` guard
6. **Map selector cards** (~line 1790): Inside the map grid `.config-map-btn` click handler
7. **Game mode cards** (~line 1893): Inside the game mode card click handler

- [ ] **Step 2: Run tests to verify nothing breaks**

Run: `npm test`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat: wire menuSelect() sound to option selector handlers"
```

### Task 7: Wire `menuStartClick()` to start buttons

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Add menuStartClick() calls to start button handlers**

In `js/main.js`, add `if (GAME.Sound) GAME.Sound.menuStartClick();` as the first line inside each start button handler, before `_fadeMenuAndStart()`:

1. **Competitive start** (~line 1908): Inside `dom.compStartBtn` handler
2. **Survival start** (~line 1921): Inside `dom.survStartBtn` handler
3. **Gun Game start** (~line 1927): Inside `dom.ggStartBtn` handler
4. **Deathmatch start** (~line 1933): Inside `dom.dmStartBtn2` handler
5. **Quick Play** (~line 1941): Inside `dom.quickPlayBtn` handler (use `menuStartClick` here instead of `menuClick` since it starts a game)

- [ ] **Step 2: Run tests to verify nothing breaks**

Run: `npm test`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat: wire menuStartClick() sound to start game buttons"
```

### Task 8: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Add menu sound effects to REQUIREMENTS.md**

Find the Sound Effects section in REQUIREMENTS.md and add a new subsection for UI sounds. Add entries for all 4 new sounds with their descriptions, and note the updated `roundStart` stinger replacing the old rising-tones version.

The section should cover:
- `menuClick()`: 50-80ms filtered noise burst + sine blip (1200->800Hz), plays on general menu button clicks
- `menuSelect()`: ~40ms softer/lower tick (900->600Hz), plays on option/tab switches
- `menuStartClick()`: ~150ms click + low thump (200Hz), plays on Start Game buttons
- `roundStart()` (updated): ~400ms dramatic stinger with detuned square waves (150Hz + 200Hz) + rising noise sweep, replaces previous rising-tones version
- Debounce: 50ms cooldown per function to prevent audio stacking

- [ ] **Step 2: Run tests to verify nothing breaks**

Run: `npm test`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: add menu sound effects to REQUIREMENTS.md"
```
