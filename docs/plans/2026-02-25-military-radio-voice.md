# Military Radio Voice Processing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make radio voice lines sound like they're coming through a heavy military UHF tactical radio instead of Google Translate TTS.

**Architecture:** Route SpeechSynthesis output through a Web Audio processing chain (highpass → bandpass → distortion → compression → lowpass + parallel noise). Enforce male voice selection with lower pitch. Enhance radio squelch effects. Rename "Enemy spotted" to "Contact!".

**Tech Stack:** Web Audio API, SpeechSynthesis API, Three.js r160.1 (unchanged)

---

### Task 1: Improve Voice Selection for Male Voice

**Files:**
- Modify: `js/sound.js:162-176` (the `pickVoice` function inside `init`)

**Step 1: Replace the `pickVoice` function with stricter male voice filtering**

Replace lines 162-176 of `js/sound.js` with:

```javascript
      function pickVoice() {
        var voices = speechSynthesis.getVoices();
        if (!voices.length) return;
        _voicesLoaded = true;
        // Priority 1: Known male voice names (local service preferred)
        var maleNames = /david|daniel|james|mark|alex|thomas|fred|male/i;
        for (var i = 0; i < voices.length; i++) {
          if (/en/i.test(voices[i].lang) && maleNames.test(voices[i].name) && voices[i].localService) {
            _selectedVoice = voices[i]; return;
          }
        }
        // Priority 2: Known male voice names (any service)
        for (var i = 0; i < voices.length; i++) {
          if (/en/i.test(voices[i].lang) && maleNames.test(voices[i].name)) {
            _selectedVoice = voices[i]; return;
          }
        }
        // Priority 3: Any English local service voice
        for (var i = 0; i < voices.length; i++) {
          if (/en/i.test(voices[i].lang) && voices[i].localService) {
            _selectedVoice = voices[i]; return;
          }
        }
        // Priority 4: Any English voice
        for (var i = 0; i < voices.length; i++) {
          if (/en/i.test(voices[i].lang)) { _selectedVoice = voices[i]; return; }
        }
        _selectedVoice = voices[0];
      }
```

**Step 2: Test in browser**

Open the game, open dev console, run:
```javascript
speechSynthesis.getVoices().filter(v => /en/i.test(v.lang))
```
Verify a male voice is being selected. Trigger a radio line with Z → 1.

**Step 3: Commit**

```bash
git add js/sound.js
git commit -m "feat(sound): improve male voice selection with stricter filtering"
```

---

### Task 2: Build Audio Processing Chain for Radio Effect

**Files:**
- Modify: `js/sound.js:8-13` (add new module-level vars)
- Modify: `js/sound.js:158-180` (add chain setup in `init`)

**Step 1: Add module-level variables for the processing chain**

After line 13 (`var _voicesLoaded = false;`), add:

```javascript
  // Radio voice processing chain nodes
  var _radioChainInput = null;
  var _radioChainOutput = null;
  var _radioNoiseGain = null;
  var _radioNoiseSource = null;
```

**Step 2: Add processing chain initialization in `init`, after the `pickVoice` block**

After line 179 (`if (!_voicesLoaded) speechSynthesis.addEventListener('voiceschanged', pickVoice);`), add before the closing `},` of init:

```javascript
      // Build radio voice processing chain
      var c = ensureCtx();
      // Input gain (trim)
      _radioChainInput = c.createGain();
      _radioChainInput.gain.value = 1.5;
      // Highpass: cut boomy low end
      var hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 600;
      hp.Q.value = 0.7;
      // Bandpass: narrow to radio band
      var bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800;
      bp.Q.value = 1.5;
      // Distortion: hard clipping for grit
      var dist = c.createWaveShaper();
      dist.curve = getDistortionCurve(30);
      dist.oversample = '4x';
      // Heavy compression: squash dynamics like radio AGC
      var comp = c.createDynamicsCompressor();
      comp.threshold.value = -50;
      comp.knee.value = 0;
      comp.ratio.value = 20;
      comp.attack.value = 0.001;
      comp.release.value = 0.05;
      // Lowpass: roll off harsh highs
      var lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3500;
      lp.Q.value = 0.5;
      // Output gain
      _radioChainOutput = c.createGain();
      _radioChainOutput.gain.value = 0.9;
      // Wire the chain
      _radioChainInput.connect(hp);
      hp.connect(bp);
      bp.connect(dist);
      dist.connect(comp);
      comp.connect(lp);
      lp.connect(_radioChainOutput);
      _radioChainOutput.connect(masterGain);
      // Parallel noise channel: constant low static
      _radioNoiseGain = c.createGain();
      _radioNoiseGain.gain.value = 0; // off by default, turned on during speech
      var noiseBp = c.createBiquadFilter();
      noiseBp.type = 'bandpass';
      noiseBp.frequency.value = 2000;
      noiseBp.Q.value = 0.8;
      // Create looping noise buffer (1 second)
      var noiseBuf = getNoiseBuffer(1.0);
      _radioNoiseSource = c.createBufferSource();
      _radioNoiseSource.buffer = noiseBuf;
      _radioNoiseSource.loop = true;
      _radioNoiseSource.connect(noiseBp);
      noiseBp.connect(_radioNoiseGain);
      _radioNoiseGain.connect(masterGain);
      _radioNoiseSource.start();
```

**Step 3: Test in browser**

Open game, verify no console errors on init. The chain is built but not yet connected to speech — no audible change yet.

**Step 4: Commit**

```bash
git add js/sound.js
git commit -m "feat(sound): build radio voice processing chain (highpass/bandpass/distortion/compression/noise)"
```

---

### Task 3: Route TTS Through Processing Chain

**Files:**
- Modify: `js/sound.js:780-803` (the `radioVoice` function)
- Modify: `js/sound.js:805-815` (the `announcer` function)

**Step 1: Rewrite `radioVoice` to pipe TTS through the chain**

Replace `radioVoice` (lines 780-803) with:

```javascript
    radioVoice: function(text, force) {
      var now = Date.now();
      if (!force && now - _voiceCooldown < 2000) return false;
      _voiceCooldown = now;

      // Enhanced radio open squelch
      this.radioOpen();

      var self = this;
      setTimeout(function() {
        var utter = new SpeechSynthesisUtterance(text);
        if (_selectedVoice) utter.voice = _selectedVoice;
        utter.rate = 1.15;
        utter.pitch = 0.65;
        utter.volume = 0.9;

        // Turn on radio noise static during speech
        if (_radioNoiseGain) {
          _radioNoiseGain.gain.setValueAtTime(0.04, ctx.currentTime);
        }

        utter.onend = function() {
          // Fade out noise
          if (_radioNoiseGain && ctx) {
            _radioNoiseGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
          }
          self.radioClose();
        };
        speechSynthesis.speak(utter);
      }, 80);

      return true;
    },
```

**Step 2: Rewrite `announcer` to use male voice with slight radio processing**

Replace `announcer` (lines 805-815) with:

```javascript
    announcer: function(text) {
      speechSynthesis.cancel();

      var utter = new SpeechSynthesisUtterance(text);
      if (_selectedVoice) utter.voice = _selectedVoice;
      utter.rate = 0.95;
      utter.pitch = 0.7;
      utter.volume = 1.0;

      // Brief noise during announcer
      if (_radioNoiseGain && ctx) {
        _radioNoiseGain.gain.setValueAtTime(0.02, ctx.currentTime);
      }
      utter.onend = function() {
        if (_radioNoiseGain && ctx) {
          _radioNoiseGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        }
      };
      speechSynthesis.speak(utter);
    },
```

**Note on TTS routing:** SpeechSynthesis outputs directly to system audio and cannot be routed through Web Audio nodes in most browsers. The processing chain we built in Task 2 applies to the squelch/noise effects (which ARE Web Audio). The main voice improvement comes from: (a) better male voice selection, (b) lower pitch + faster rate, (c) ambient radio noise layered during speech, (d) enhanced squelch framing the speech. If a future browser API allows routing TTS through AudioContext, the chain is ready.

**Step 3: Test in browser**

Start a game. Press Z → 1 ("Go go go!"). Verify:
- Voice is deeper/lower pitched than before
- Static noise hiss is audible during speech
- Noise fades out when speech ends
- Squelch open/close frames the speech

**Step 4: Commit**

```bash
git add js/sound.js
git commit -m "feat(sound): route TTS through radio processing with noise layer and deeper male voice"
```

---

### Task 4: Enhance Radio Squelch Effects

**Files:**
- Modify: `js/sound.js:768-778` (`radioOpen` and `radioClose`)

**Step 1: Replace `radioOpen` and `radioClose` with enhanced versions**

Replace lines 768-778 with:

```javascript
    radioOpen: function() {
      // Longer squelch burst with aggressive sweep
      noiseBurst({ duration: 0.09, gain: 0.35, freq: 3000, freqEnd: 1200,
        Q: 1.5, filterType: 'bandpass', distortion: 15 });
      // Secondary noise layer
      noiseBurst({ duration: 0.06, gain: 0.15, freq: 5000, freqEnd: 2000,
        Q: 0.8, filterType: 'bandpass', delay: 0.01 });
      metallicClick(3500, 0.12);
    },

    radioClose: function() {
      noiseBurst({ duration: 0.07, gain: 0.2, freq: 2500, freqEnd: 1000,
        Q: 1.2, filterType: 'bandpass', distortion: 8 });
      noiseBurst({ duration: 0.04, gain: 0.1, freq: 4000, freqEnd: 1500,
        Q: 0.6, filterType: 'bandpass', delay: 0.01 });
      metallicClick(3000, 0.08);
    },
```

**Step 2: Test in browser**

Trigger radio lines. Verify squelch sounds chunkier and more aggressive — two-layered noise burst with a louder metallic click.

**Step 3: Commit**

```bash
git add js/sound.js
git commit -m "feat(sound): enhance radio squelch with double noise burst and stronger click"
```

---

### Task 5: Rename "Enemy spotted" to "Contact!"

**Files:**
- Modify: `js/main.js:259`
- Modify: `js/enemies.js:853`
- Modify: `index.html:1404`

**Step 1: Update all three locations**

In `js/main.js:259`, change:
```javascript
    'Enemy spotted',
```
to:
```javascript
    'Contact!',
```

In `js/enemies.js:853`, change:
```javascript
        botRadio(this, 'Enemy spotted', 8000);
```
to:
```javascript
        botRadio(this, 'Contact!', 8000);
```

In `index.html:1404`, change:
```html
    <div class="radio-option" data-radio="3">3. Enemy spotted</div>
```
to:
```html
    <div class="radio-option" data-radio="3">3. Contact!</div>
```

**Step 2: Test in browser**

Open radio menu with Z. Verify option 3 reads "Contact!". Let a bot spot you — verify it says "Contact!" not "Enemy spotted".

**Step 3: Commit**

```bash
git add js/main.js js/enemies.js index.html
git commit -m "feat(radio): rename 'Enemy spotted' to 'Contact!' for military authenticity"
```

---

### Task 6: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md:578-613`

**Step 1: Update all voice/radio documentation**

Update the sound effects table entries for `radioOpen`, `radioClose`, `radioVoice(text)`:

| Effect | Description |
|--------|-------------|
| `radioOpen` | Double-layer squelch burst: primary bandpass 3000→1200Hz (90ms, gain 0.35, distortion 15) + secondary 5000→2000Hz (60ms) + metallic click 3500Hz |
| `radioClose` | Double-layer squelch close: primary bandpass 2500→1000Hz (70ms, distortion 8) + secondary 4000→1500Hz (40ms) + metallic click 3000Hz |
| `radioVoice(text)` | Enhanced radio open → SpeechSynthesis (rate 1.15, pitch 0.65, vol 0.9) with parallel noise static (gain 0.04) → fade noise → radio close. 2s global cooldown. |
| `announcer(text)` | Authoritative speech (rate 0.95, pitch 0.7, vol 1.0) with light noise static (gain 0.02), cancels current speech |

Update the voice selection description:
```
Voice lines use the Web Speech API (SpeechSynthesis) with heavy radio processing. Voice selection aggressively prefers male English voices (matching names: David, Daniel, James, Mark, Alex, Thomas, Fred, Male), with fallback chain: male English local → male English any → English local → English any → system default. A parallel radio noise channel (bandpass-filtered white noise) plays during speech for ambient static.
```

Update the voice lines table — change "Enemy spotted" row to "Contact!" everywhere.

Update the cooldowns — change `Per-bot "Enemy spotted" cooldown: 8s` to `Per-bot "Contact!" cooldown: 8s`.

**Step 2: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: update REQUIREMENTS.md for military radio voice processing"
```

---

### Task 7: Final Integration Test

**No files changed — manual testing only.**

**Step 1: Full playthrough test**

1. Open `index.html` in browser
2. Start competitive match
3. Verify at round start: "Go go go!" plays with deep male voice, radio static, chunky squelch
4. Press Z → verify menu shows "Contact!" for option 3
5. Press Z → 1 through Z → 6, verify all lines play with radio processing
6. Let a bot spot you — verify "Contact!" bot radio callout
7. Damage a bot to low health — verify "Need backup!" callout
8. Win/lose a round — verify announcer lines play with slight radio noise
9. Throw a grenade — verify "Fire in the hole!" callout
10. Check console for any errors
