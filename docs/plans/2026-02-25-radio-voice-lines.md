# Radio Voice Lines Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add CS-style radio voice commands using Web Speech API with procedural radio static effects, triggered by both players (Z key menu) and bots (automatic callouts).

**Architecture:** Voice lines use `SpeechSynthesisUtterance` wrapped in procedural radio squelch noise bursts from `sound.js`. A radio menu overlay in `index.html` lets players trigger lines with Z → 1-6. Bot voice triggers are wired into enemy AI state transitions in `enemies.js` and grenade throwing in `weapons.js`. A radio feed in the kill feed area shows `[RADIO] message` text.

**Tech Stack:** Web Speech API (SpeechSynthesis), Web Audio API (existing sound.js infrastructure), HTML/CSS overlay

---

### Task 1: Add Radio Sound Effects to sound.js

**Files:**
- Modify: `js/sound.js:155-746` (add methods to Sound object)

**Step 1: Add voice state variables after line 10**

After the `var compressor = null;` line, add:

```javascript
var _voiceCooldown = 0;
var _selectedVoice = null;
var _voicesLoaded = false;
```

**Step 2: Add voice selection to init function**

Replace the `init` function at line 156 with:

```javascript
init: function() {
  ensureCtx();
  // Load preferred voice
  function pickVoice() {
    var voices = speechSynthesis.getVoices();
    if (!voices.length) return;
    _voicesLoaded = true;
    // Prefer male English voice
    for (var i = 0; i < voices.length; i++) {
      if (/en/i.test(voices[i].lang) && /male/i.test(voices[i].name) && voices[i].localService) {
        _selectedVoice = voices[i]; return;
      }
    }
    // Fallback: any English voice
    for (var i = 0; i < voices.length; i++) {
      if (/en/i.test(voices[i].lang)) { _selectedVoice = voices[i]; return; }
    }
    _selectedVoice = voices[0];
  }
  pickVoice();
  if (!_voicesLoaded) speechSynthesis.addEventListener('voiceschanged', pickVoice);
},
```

**Step 3: Add radioOpen, radioClose, radioVoice, and announcer methods**

Add these methods to the Sound object (before the closing `};` at line 744):

```javascript
radioOpen: function() {
  noiseBurst({ duration: 0.05, gain: 0.25, freq: 2500, freqEnd: 1500,
    Q: 1.2, filterType: 'bandpass', distortion: 10 });
  metallicClick(3500, 0.08);
},

radioClose: function() {
  noiseBurst({ duration: 0.04, gain: 0.15, freq: 2000, freqEnd: 1200,
    Q: 1, filterType: 'bandpass' });
  metallicClick(3000, 0.05);
},

radioVoice: function(text, force) {
  var now = Date.now();
  if (!force && now - _voiceCooldown < 2000) return false;
  _voiceCooldown = now;

  // Radio open squelch
  this.radioOpen();

  // Speak after brief delay for squelch
  var self = this;
  setTimeout(function() {
    var utter = new SpeechSynthesisUtterance(text);
    if (_selectedVoice) utter.voice = _selectedVoice;
    utter.rate = 1.1;
    utter.pitch = 0.8;
    utter.volume = 0.8;
    utter.onend = function() {
      self.radioClose();
    };
    speechSynthesis.speak(utter);
  }, 60);

  return true;
},

announcer: function(text) {
  // Cancel any current speech
  speechSynthesis.cancel();

  var utter = new SpeechSynthesisUtterance(text);
  if (_selectedVoice) utter.voice = _selectedVoice;
  utter.rate = 0.9;
  utter.pitch = 1.0;
  utter.volume = 1.0;
  speechSynthesis.speak(utter);
},
```

**Step 4: Test manually**

Open the game in browser, open dev console, run:
```javascript
GAME.Sound.init();
GAME.Sound.radioVoice('Go go go');
```
Expected: hear radio squelch, then speech, then squelch close.

**Step 5: Commit**

```bash
git add js/sound.js
git commit -m "feat(sound): add radio voice and announcer speech synthesis"
```

---

### Task 2: Add Radio Menu HTML/CSS to index.html

**Files:**
- Modify: `index.html`

**Step 1: Add radio menu overlay HTML**

Add this markup inside the HUD container (near the other overlays like buy-menu, scoreboard):

```html
<div id="radio-menu" class="radio-menu">
  <div class="radio-title">RADIO</div>
  <div class="radio-option" data-radio="1">1. Go go go!</div>
  <div class="radio-option" data-radio="2">2. Fire in the hole!</div>
  <div class="radio-option" data-radio="3">3. Enemy spotted</div>
  <div class="radio-option" data-radio="4">4. Need backup</div>
  <div class="radio-option" data-radio="5">5. Affirmative</div>
  <div class="radio-option" data-radio="6">6. Negative</div>
</div>
```

**Step 2: Add CSS for radio menu**

Add to the `<style>` section:

```css
.radio-menu {
  display: none;
  position: fixed;
  left: 30px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0,0,0,0.75);
  border: 1px solid rgba(255,255,255,0.15);
  padding: 12px 18px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #ccc;
  z-index: 200;
  pointer-events: none;
  min-width: 180px;
}
.radio-menu.show { display: block; }
.radio-title {
  color: #4caf50;
  font-weight: bold;
  margin-bottom: 8px;
  font-size: 12px;
  letter-spacing: 2px;
}
.radio-option {
  padding: 3px 0;
  color: #aaa;
  font-size: 13px;
}
```

**Step 3: Add radio feed CSS**

The radio feed messages will reuse the kill-feed area. Add a style for radio entries:

```css
.radio-entry {
  color: #8bc34a;
  font-size: 12px;
  padding: 2px 6px;
  opacity: 0;
  animation: killFadeIn 0.15s ease forwards;
}
```

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat(ui): add radio menu overlay and radio feed styles"
```

---

### Task 3: Wire Up Player Radio Menu in main.js

**Files:**
- Modify: `js/main.js`

**Step 1: Add DOM reference and state variables**

In the `dom` object (around line 24-65), add:

```javascript
radioMenu: document.getElementById('radio-menu'),
```

After the existing state variables (around line 240-260), add:

```javascript
var radioMenuOpen = false;
var radioAutoCloseTimer = null;
var RADIO_LINES = [
  'Go go go!',
  'Fire in the hole!',
  'Enemy spotted',
  'Need backup',
  'Affirmative',
  'Negative'
];
```

**Step 2: Add radio menu toggle to setupInput keydown handler**

Inside the `setupInput` function's keydown listener (around line 1189), add after the pause check at line 1199:

```javascript
// Radio menu
if (k === 'z' && !buyMenuOpen) {
  radioMenuOpen = !radioMenuOpen;
  dom.radioMenu.classList.toggle('show', radioMenuOpen);
  if (radioMenuOpen) {
    if (radioAutoCloseTimer) clearTimeout(radioAutoCloseTimer);
    radioAutoCloseTimer = setTimeout(function() {
      radioMenuOpen = false;
      dom.radioMenu.classList.remove('show');
    }, 3000);
  } else {
    if (radioAutoCloseTimer) clearTimeout(radioAutoCloseTimer);
  }
  return;
}

// Radio command selection
if (radioMenuOpen && k >= '1' && k <= '6') {
  var idx = parseInt(k) - 1;
  var line = RADIO_LINES[idx];
  if (GAME.Sound && GAME.Sound.radioVoice(line)) {
    addRadioFeed(line);
  }
  radioMenuOpen = false;
  dom.radioMenu.classList.remove('show');
  if (radioAutoCloseTimer) clearTimeout(radioAutoCloseTimer);
  return;
}
```

**Step 3: Add addRadioFeed function**

Add near the `addKillFeed` function (around line 2552):

```javascript
function addRadioFeed(text) {
  var entry = document.createElement('div');
  entry.className = 'radio-entry';
  entry.textContent = '[RADIO] ' + text;
  dom.killFeed.appendChild(entry);
  setTimeout(function() { entry.remove(); }, 2000);
}
```

**Step 4: Close radio menu on game state changes**

In `endRound` (line 1531), `endMatch` (line 1559), and `pauseGame` (line 1166), add:

```javascript
radioMenuOpen = false;
dom.radioMenu.classList.remove('show');
```

**Step 5: Test manually**

Open game, start a round, press Z. Menu should appear center-left. Press 1. Should hear radio squelch + "Go go go!" + squelch close. Kill feed should show `[RADIO] Go go go!` for 2s. Menu should auto-close after 3s if no selection.

**Step 6: Commit**

```bash
git add js/main.js
git commit -m "feat(radio): wire player radio menu with Z key and number selection"
```

---

### Task 4: Add Announcer Voice Lines to Round Events

**Files:**
- Modify: `js/main.js`

**Step 1: Add announcer calls to endRound**

In `endRound` (line 1531), after the existing `Sound.roundWin()` / `Sound.roundLose()` calls:

After line 1541 (`if (GAME.Sound) GAME.Sound.roundWin();`), add:
```javascript
if (GAME.Sound) GAME.Sound.announcer('Counter-terrorists win');
```

After line 1550 (`if (GAME.Sound) GAME.Sound.roundLose();`), add:
```javascript
if (GAME.Sound) GAME.Sound.announcer('Terrorists win');
```

**Step 2: Test manually**

Play a competitive round. Win it — should hear victory fanfare then "Counter-terrorists win". Lose — should hear defeat sound then "Terrorists win".

**Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat(radio): add announcer voice lines for round win/lose"
```

---

### Task 5: Add Bot Auto-Triggered Voice Lines

**Files:**
- Modify: `js/enemies.js` (bot state transitions)
- Modify: `js/weapons.js` (grenade throw)
- Modify: `js/main.js` (round start bot callout)

**Step 1: Add per-bot voice cooldown tracking to Enemy constructor**

In `js/enemies.js`, in the Enemy constructor (around line 70-80), add:

```javascript
this._lastRadioTime = 0;
this._saidNeedBackup = false;
```

**Step 2: Add bot voice helper to enemies.js**

Add a helper function inside the IIFE, before the Enemy prototype methods:

```javascript
function botRadio(enemy, text, cooldown) {
  var now = Date.now();
  if (cooldown && now - enemy._lastRadioTime < cooldown) return;
  enemy._lastRadioTime = now;
  if (GAME.Sound && GAME.Sound.radioVoice(text)) {
    // Trigger radio feed if main.js exposes it
    if (GAME._addRadioFeed) GAME._addRadioFeed('Bot ' + (enemy.id + 1) + ': ' + text);
  }
}
```

**Step 3: Add "Enemy spotted" callout on state transition to CHASE**

In the state transition section (around line 834-837), where bot enters CHASE or ATTACK from PATROL:

After `this.state = distToPlayer <= this.attackRange ? ATTACK : CHASE;` (line 837), add:

```javascript
botRadio(this, 'Enemy spotted', 8000);
```

**Step 4: Add "Need backup" callout on RETREAT**

In the RETREAT transition (around line 869), after `if (this._retreatTarget) this.state = RETREAT;`, add:

```javascript
if (!this._saidNeedBackup) {
  this._saidNeedBackup = true;
  botRadio(this, 'Need backup', 0);
}
```

**Step 5: Add "Fire in the hole!" to grenade throw**

In `js/weapons.js`, at line 1068 where `GAME.Sound.grenadeThrow()` is called, add after it:

```javascript
if (GAME.Sound) GAME.Sound.radioVoice('Fire in the hole!');
```

**Step 6: Add round-start "Go go go!" from random bot**

In `js/main.js`, in the round-start logic. Find where `GAME.Sound.roundStart()` is called for competitive mode (around line 1653 or the competitive start function). After the round start sound, add:

```javascript
// Random bot says "Go go go!" at round start
setTimeout(function() {
  if (GAME.Sound) GAME.Sound.radioVoice('Go go go!');
  addRadioFeed('Go go go!');
}, 800);
```

**Step 7: Expose addRadioFeed globally for enemies.js to use**

In `js/main.js`, after the `addRadioFeed` function definition, add:

```javascript
GAME._addRadioFeed = addRadioFeed;
```

**Step 8: Reset _saidNeedBackup on bot respawn/reset**

In `js/enemies.js`, wherever bots are reset for a new round (look for health reset or respawn logic), add:

```javascript
this._saidNeedBackup = false;
this._lastRadioTime = 0;
```

**Step 9: Test manually**

Start a competitive round. Should hear "Go go go!" shortly after round starts. Throw a grenade — should hear "Fire in the hole!". Let a bot spot you — should hear "Enemy spotted". Damage a bot to low health — should hear "Need backup" if it retreats.

**Step 10: Commit**

```bash
git add js/enemies.js js/weapons.js js/main.js
git commit -m "feat(radio): add bot auto-triggered voice lines for combat events"
```

---

### Task 6: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

**Step 1: Add radio voice lines section**

Add a new section documenting:
- All 9 voice lines with their triggers
- Web Speech API usage (SpeechSynthesis)
- Radio static effect (procedural squelch open/close)
- Player radio menu (Z key → 1-6)
- Bot auto-triggers (spotted, grenade, retreat, round start)
- Announcer lines (round win/lose)
- Cooldown values (2s global, 8s per-bot spotted)
- Radio feed display (kill feed area, 2s fade)

**Step 2: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: add radio voice lines to REQUIREMENTS.md"
```
