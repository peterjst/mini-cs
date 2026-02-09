// js/sound.js — Procedural sound effects using Web Audio API
// Attaches GAME.Sound

(function() {
  'use strict';
  if (!window.GAME) window.GAME = {};

  var ctx = null;
  var masterGain = null;
  var compressor = null;

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Master compressor for punch
      compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.15;
      compressor.connect(ctx.destination);
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.5;
      masterGain.connect(compressor);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Create a noise buffer
  function getNoiseBuffer(duration) {
    var c = ensureCtx();
    var len = Math.ceil(c.sampleRate * duration);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  // Waveshaper distortion — gives gunshots the harsh, clipped character of real firearms
  var _distCurves = {};
  function getDistortionCurve(amount) {
    if (_distCurves[amount]) return _distCurves[amount];
    var samples = 8192;
    var curve = new Float32Array(samples);
    for (var i = 0; i < samples; i++) {
      var x = (i * 2) / samples - 1;
      curve[i] = (Math.PI + amount) * x / (Math.PI + amount * Math.abs(x));
    }
    _distCurves[amount] = curve;
    return curve;
  }

  // Helper: shaped noise burst with optional distortion
  function noiseBurst(opts) {
    var c = ensureCtx();
    var t = c.currentTime + (opts.delay || 0);
    var dur = opts.duration || 0.1;
    var buf = getNoiseBuffer(dur + 0.02);
    var src = c.createBufferSource();
    src.buffer = buf;
    var f = c.createBiquadFilter();
    f.type = opts.filterType || 'bandpass';
    f.frequency.setValueAtTime(opts.freq || 1000, t);
    if (opts.freqEnd) f.frequency.exponentialRampToValueAtTime(opts.freqEnd, t + dur);
    f.Q.value = opts.Q || 1;
    var g = c.createGain();
    var atk = opts.attack || 0.001;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(opts.gain || 0.5, t + atk);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f);
    if (opts.distortion) {
      var ws = c.createWaveShaper();
      ws.curve = getDistortionCurve(opts.distortion);
      ws.oversample = '2x';
      f.connect(ws);
      ws.connect(g);
    } else {
      f.connect(g);
    }
    g.connect(masterGain);
    src.start(t);
    src.stop(t + dur + 0.01);
  }

  // Helper: resonant tone (barrel/chamber resonance)
  function resTone(opts) {
    var c = ensureCtx();
    var t = c.currentTime + (opts.delay || 0);
    var dur = opts.duration || 0.08;
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.freq, t);
    if (opts.freqEnd) osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, t + dur);
    g.gain.setValueAtTime(opts.gain || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    if (opts.filterFreq) {
      var f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(opts.filterFreq, t);
      if (opts.filterEnd) f.frequency.exponentialRampToValueAtTime(opts.filterEnd, t + dur);
      osc.connect(f);
      f.connect(g);
    } else {
      osc.connect(g);
    }
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  // Helper: simple tone
  function tone(freq, duration, volume, type) {
    var c = ensureCtx();
    var t = c.currentTime;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  // Metallic click helper
  function metallicClick(freq, vol) {
    var c = ensureCtx();
    var t = c.currentTime;
    var osc = c.createOscillator();
    var gain = c.createGain();
    var filter = c.createBiquadFilter();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, t + 0.04);
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 8;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  var Sound = {
    init: function() { ensureCtx(); },

    // --- Realistic 9mm Pistol (USP) ---
    // Modeled after real 9x19mm: sharp crack, moderate report, fast slide action
    pistolShot: function() {
      // 1. Initial crack — ultra-short distorted impulse (supersonic snap)
      noiseBurst({ duration: 0.012, gain: 0.85, freq: 3500, Q: 0.5,
        filterType: 'highpass', distortion: 40 });
      // 2. Muzzle blast — mid-frequency body of the report
      noiseBurst({ duration: 0.07, gain: 0.55, freq: 1400, freqEnd: 300,
        Q: 0.8, distortion: 15 });
      // 3. Low blast — propellant gas expansion
      noiseBurst({ duration: 0.09, gain: 0.4, freq: 600, freqEnd: 150,
        filterType: 'lowpass', Q: 0.6 });
      // 4. Report tone — barrel resonance gives the pistol its character
      resTone({ freq: 520, freqEnd: 100, duration: 0.06, gain: 0.35,
        type: 'sawtooth', filterFreq: 3000, filterEnd: 400 });
      // 5. High-frequency snap — the bright "crack"
      noiseBurst({ duration: 0.02, gain: 0.3, freq: 6000, Q: 0.4,
        filterType: 'highpass' });
      // 6. Sub-bass thump — felt in the chest
      resTone({ freq: 85, freqEnd: 30, duration: 0.08, gain: 0.4, type: 'sine' });
      // 7. Slide cycling — delayed mechanical action
      setTimeout(function() {
        metallicClick(2000, 0.1);
        setTimeout(function() { metallicClick(2800, 0.07); }, 18);
      }, 55);
      // 8. Room reflection tail
      noiseBurst({ duration: 0.16, gain: 0.06, freq: 900, freqEnd: 400,
        Q: 0.4, delay: 0.015, attack: 0.01 });
    },

    // --- Realistic 7.62x39mm Rifle (AK-47) ---
    // Modeled after real AK: aggressive bark, heavy muzzle blast, gas system hiss
    rifleShot: function() {
      // 1. Initial crack — harder, louder than pistol (higher velocity round)
      noiseBurst({ duration: 0.01, gain: 1.0, freq: 4000, Q: 0.4,
        filterType: 'highpass', distortion: 60 });
      // 2. Muzzle blast — the dominant "bark", wider bandwidth than pistol
      noiseBurst({ duration: 0.06, gain: 0.7, freq: 1800, freqEnd: 400,
        Q: 0.6, distortion: 25 });
      // 3. Low-mid body — deeper than pistol, gives the AK its heavy sound
      noiseBurst({ duration: 0.08, gain: 0.55, freq: 800, freqEnd: 150,
        Q: 0.7, distortion: 10 });
      // 4. Gas port hiss — characteristic of gas-operated rifles
      noiseBurst({ duration: 0.04, gain: 0.2, freq: 5000, freqEnd: 2000,
        filterType: 'highpass', delay: 0.005 });
      // 5. Report tone — lower, angrier than pistol
      resTone({ freq: 700, freqEnd: 60, duration: 0.05, gain: 0.4,
        type: 'sawtooth', filterFreq: 4500, filterEnd: 300 });
      // 6. Muzzle brake crack — sharp secondary transient
      noiseBurst({ duration: 0.008, gain: 0.5, freq: 5000, Q: 0.3,
        filterType: 'highpass', distortion: 50, delay: 0.003 });
      // 7. Sub-bass concussion — heavier than pistol (bigger cartridge)
      resTone({ freq: 55, freqEnd: 20, duration: 0.1, gain: 0.5, type: 'sine' });
      // 8. Bolt carrier cycling
      setTimeout(function() {
        metallicClick(1200, 0.08);
        setTimeout(function() { metallicClick(1800, 0.06); }, 25);
      }, 45);
      // 9. Extended reverb tail — rifle report carries further
      noiseBurst({ duration: 0.22, gain: 0.07, freq: 700, freqEnd: 250,
        Q: 0.3, delay: 0.015, attack: 0.012 });
      noiseBurst({ duration: 0.14, gain: 0.04, freq: 2000, freqEnd: 800,
        Q: 0.5, delay: 0.03, attack: 0.015 });
    },

    // --- Realistic 12-Gauge Shotgun (Nova) ---
    // Modeled after 12ga pump-action: massive boom, broadband blast, pump rack
    shotgunShot: function() {
      // 1. Initial blast — loudest, broadest of all weapons
      noiseBurst({ duration: 0.015, gain: 1.1, freq: 2500, Q: 0.3,
        filterType: 'highpass', distortion: 70 });
      // 2. Low-frequency boom — dominant character of 12-gauge
      noiseBurst({ duration: 0.14, gain: 0.75, freq: 500, freqEnd: 80,
        filterType: 'lowpass', Q: 0.5, distortion: 20 });
      // 3. Mid-frequency blast body — the "wall of sound"
      noiseBurst({ duration: 0.12, gain: 0.65, freq: 1200, freqEnd: 250,
        Q: 0.6, distortion: 15 });
      // 4. High-frequency scatter — represents pellet spread and wad separation
      noiseBurst({ duration: 0.05, gain: 0.35, freq: 4500, freqEnd: 1500,
        Q: 0.5, delay: 0.003 });
      // 5. Report tone — deep, boomy barrel resonance
      resTone({ freq: 350, freqEnd: 40, duration: 0.1, gain: 0.45,
        type: 'sawtooth', filterFreq: 2000, filterEnd: 200 });
      // 6. Sub-bass pressure wave — the chest-thumping thud
      resTone({ freq: 40, freqEnd: 15, duration: 0.13, gain: 0.6, type: 'sine' });
      // 7. Chamber resonance — hollow barrel ring
      resTone({ freq: 180, freqEnd: 60, duration: 0.08, gain: 0.2,
        type: 'triangle', delay: 0.005 });
      // 8. Pump action rack — two-part delayed mechanical (slide back + forward)
      setTimeout(function() {
        metallicClick(900, 0.12);
        var c2 = ensureCtx(); var t2 = c2.currentTime;
        var pBuf = getNoiseBuffer(0.05);
        var pn = c2.createBufferSource(); pn.buffer = pBuf;
        var pg = c2.createGain(); var pf = c2.createBiquadFilter();
        pf.type = 'bandpass'; pf.frequency.value = 1500; pf.Q.value = 2;
        pg.gain.setValueAtTime(0.1, t2);
        pg.gain.exponentialRampToValueAtTime(0.001, t2 + 0.04);
        pn.connect(pf); pf.connect(pg); pg.connect(masterGain);
        pn.start(t2); pn.stop(t2 + 0.05);
        setTimeout(function() { metallicClick(1100, 0.14); }, 120);
      }, 200);
      // 9. Heavy reverb tail — shotgun booms echo longest
      noiseBurst({ duration: 0.3, gain: 0.09, freq: 600, freqEnd: 200,
        Q: 0.3, delay: 0.02, attack: 0.015 });
      noiseBurst({ duration: 0.2, gain: 0.05, freq: 1500, freqEnd: 500,
        Q: 0.4, delay: 0.04, attack: 0.02 });
      // 10. Ultra-low tail rumble
      resTone({ freq: 30, freqEnd: 12, duration: 0.2, gain: 0.25,
        type: 'sine', delay: 0.01 });
    },

    knifeSlash: function() {
      var c = ensureCtx();
      var t = c.currentTime;
      // Whoosh — swept noise
      var buf = getNoiseBuffer(0.2);
      var noise = c.createBufferSource();
      noise.buffer = buf;
      var noiseGain = c.createGain();
      var filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3000, t);
      filter.frequency.exponentialRampToValueAtTime(800, t + 0.18);
      filter.Q.value = 2;
      noiseGain.gain.setValueAtTime(0.3, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(masterGain);
      noise.start(t);
      noise.stop(t + 0.21);
      // Tonal swoosh
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.15);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.16);
    },

    hitMarker: function() {
      // Crisp double ding
      tone(2000, 0.05, 0.3, 'square');
      setTimeout(function() { tone(2600, 0.04, 0.25, 'square'); }, 25);
      // Add metallic ping
      setTimeout(function() { metallicClick(3200, 0.12); }, 10);
    },

    kill: function() {
      // Satisfying ascending ding-ding-ding
      tone(1400, 0.06, 0.3, 'square');
      setTimeout(function() { tone(1800, 0.06, 0.28, 'square'); }, 45);
      setTimeout(function() { tone(2400, 0.1, 0.25, 'square'); }, 90);
      // Bass confirmation thud
      setTimeout(function() { tone(120, 0.08, 0.2, 'sine'); }, 30);
    },

    reload: function() {
      // Mag release click
      metallicClick(800, 0.2);
      // Mag sliding out
      setTimeout(function() {
        var c = ensureCtx();
        var t = c.currentTime;
        var buf = getNoiseBuffer(0.08);
        var n = c.createBufferSource();
        n.buffer = buf;
        var g = c.createGain();
        var f = c.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 2000;
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        n.connect(f);
        f.connect(g);
        g.connect(masterGain);
        n.start(t);
        n.stop(t + 0.09);
      }, 120);
      // New mag insertion click
      setTimeout(function() { metallicClick(1000, 0.22); }, 350);
      // Bolt/slide rack
      setTimeout(function() { metallicClick(600, 0.25); }, 500);
      setTimeout(function() { metallicClick(900, 0.18); }, 550);
    },

    playerHurt: function() {
      var c = ensureCtx();
      var t = c.currentTime;
      // Impact thud
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(250, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.21);
      // Pain ringing
      var ring = c.createOscillator();
      var ringGain = c.createGain();
      ring.type = 'sine';
      ring.frequency.setValueAtTime(3500, t);
      ring.frequency.exponentialRampToValueAtTime(2000, t + 0.3);
      ringGain.gain.setValueAtTime(0.08, t);
      ringGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      ring.connect(ringGain);
      ringGain.connect(masterGain);
      ring.start(t);
      ring.stop(t + 0.31);
    },

    roundStart: function() {
      // Tense rising tones
      tone(392, 0.18, 0.2, 'sine'); // G4
      setTimeout(function() { tone(523, 0.18, 0.22, 'sine'); }, 180); // C5
      setTimeout(function() { tone(659, 0.18, 0.24, 'sine'); }, 360); // E5
      setTimeout(function() { tone(784, 0.3, 0.28, 'sine'); }, 540); // G5
    },

    roundWin: function() {
      // Victory fanfare
      tone(523, 0.14, 0.28, 'sine');
      setTimeout(function() { tone(659, 0.14, 0.28, 'sine'); }, 130);
      setTimeout(function() { tone(784, 0.14, 0.28, 'sine'); }, 260);
      setTimeout(function() { tone(1047, 0.35, 0.35, 'sine'); }, 400);
      // Harmony layer
      setTimeout(function() { tone(659, 0.35, 0.15, 'sine'); }, 400);
    },

    roundLose: function() {
      // Descending defeat
      tone(440, 0.22, 0.28, 'sine');
      setTimeout(function() { tone(370, 0.22, 0.26, 'sine'); }, 220);
      setTimeout(function() { tone(294, 0.4, 0.3, 'sine'); }, 440);
      // Dissonant layer
      setTimeout(function() { tone(277, 0.4, 0.12, 'sine'); }, 440);
    },

    buy: function() {
      metallicClick(1200, 0.15);
      setTimeout(function() { tone(1000, 0.06, 0.15, 'sine'); }, 50);
      setTimeout(function() { tone(1300, 0.08, 0.12, 'sine'); }, 90);
    },

    switchWeapon: function() {
      // Weapon draw — two metallic clicks
      metallicClick(700, 0.15);
      setTimeout(function() { metallicClick(1100, 0.12); }, 50);
    },

    enemyShot: function() {
      // Distant/muffled gunshot — low-passed, less transient, softer
      noiseBurst({ duration: 0.008, gain: 0.25, freq: 2000, Q: 0.5,
        filterType: 'highpass', distortion: 15 });
      noiseBurst({ duration: 0.06, gain: 0.18, freq: 800, freqEnd: 200,
        Q: 0.7 });
      resTone({ freq: 350, freqEnd: 80, duration: 0.05, gain: 0.12,
        type: 'sawtooth', filterFreq: 1500, filterEnd: 300 });
      noiseBurst({ duration: 0.1, gain: 0.04, freq: 500, freqEnd: 200,
        Q: 0.4, delay: 0.01, attack: 0.008 });
    },

    empty: function() {
      // Dry click
      metallicClick(500, 0.2);
    },

    footstep: function() {
      var c = ensureCtx();
      var t = c.currentTime;
      var buf = getNoiseBuffer(0.06);
      var n = c.createBufferSource();
      n.buf = buf;
      n.buffer = buf;
      var g = c.createGain();
      var f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 600;
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      n.connect(f);
      f.connect(g);
      g.connect(masterGain);
      n.start(t);
      n.stop(t + 0.07);
    },

    grenadeThrow: function() {
      var c = ensureCtx();
      var t = c.currentTime;
      // Whoosh — rising swept noise
      var buf = getNoiseBuffer(0.25);
      var noise = c.createBufferSource();
      noise.buffer = buf;
      var ng = c.createGain();
      var nf = c.createBiquadFilter();
      nf.type = 'bandpass';
      nf.frequency.setValueAtTime(800, t);
      nf.frequency.exponentialRampToValueAtTime(3000, t + 0.2);
      nf.Q.value = 1.5;
      ng.gain.setValueAtTime(0.25, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      noise.connect(nf);
      nf.connect(ng);
      ng.connect(masterGain);
      noise.start(t);
      noise.stop(t + 0.26);
      // Effort grunt tone
      var osc = c.createOscillator();
      var og = c.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.1);
      og.gain.setValueAtTime(0.08, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(og);
      og.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.13);
      // Pin pull click
      metallicClick(2000, 0.12);
    },

    grenadeBounce: function() {
      // Short metallic clink
      metallicClick(1800, 0.1);
      setTimeout(function() { metallicClick(2200, 0.06); }, 15);
    },

    headshotDink: function() {
      // Metallic dink — CS-style headshot ping
      var c = ensureCtx();
      var t = c.currentTime;
      var osc = c.createOscillator();
      var g = c.createGain();
      var f = c.createBiquadFilter();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.03);
      f.type = 'bandpass';
      f.frequency.value = 1500;
      f.Q.value = 6;
      g.gain.setValueAtTime(0.45, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.connect(f);
      // Light distortion
      var ws = c.createWaveShaper();
      ws.curve = getDistortionCurve(8);
      ws.oversample = '2x';
      f.connect(ws);
      ws.connect(g);
      g.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.07);
      // Secondary ring
      var osc2 = c.createOscillator();
      var g2 = c.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(2400, t);
      g2.gain.setValueAtTime(0.2, t);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc2.connect(g2);
      g2.connect(masterGain);
      osc2.start(t);
      osc2.stop(t + 0.05);
    },

    hitmarkerTick: function() {
      // Very short noise tick
      noiseBurst({ duration: 0.015, gain: 0.2, freq: 4000, Q: 0.8, filterType: 'highpass' });
    },

    killStreak: function(tier) {
      // Escalating chord — higher pitch per tier
      var baseFreq = 600 + tier * 100;
      tone(baseFreq, 0.12, 0.25, 'sine');
      setTimeout(function() { tone(baseFreq * 1.25, 0.12, 0.25, 'sine'); }, 60);
      setTimeout(function() { tone(baseFreq * 1.5, 0.18, 0.3, 'sine'); }, 120);
    },

    rankUp: function() {
      // Ascending arpeggio — triumphant rank-up
      var notes = [523, 659, 784, 1047, 1319];
      notes.forEach(function(freq, i) {
        setTimeout(function() {
          tone(freq, 0.2, 0.25, 'sine');
          if (i > 1) tone(freq * 0.5, 0.2, 0.1, 'sine'); // harmony
        }, i * 100);
      });
    },

    grenadeExplode: function() {
      var c = ensureCtx();
      var t = c.currentTime;

      // Layer 1: Massive bass boom
      var boom = c.createOscillator();
      var boomGain = c.createGain();
      boom.type = 'sine';
      boom.frequency.setValueAtTime(60, t);
      boom.frequency.exponentialRampToValueAtTime(20, t + 0.3);
      boomGain.gain.setValueAtTime(0.9, t);
      boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      boom.connect(boomGain);
      boomGain.connect(masterGain);
      boom.start(t);
      boom.stop(t + 0.41);

      // Layer 2: Mid-frequency crunch
      var crunch = c.createOscillator();
      var crunchGain = c.createGain();
      var crunchFilter = c.createBiquadFilter();
      crunch.type = 'sawtooth';
      crunch.frequency.setValueAtTime(300, t);
      crunch.frequency.exponentialRampToValueAtTime(40, t + 0.2);
      crunchFilter.type = 'lowpass';
      crunchFilter.frequency.setValueAtTime(2000, t);
      crunchFilter.frequency.exponentialRampToValueAtTime(100, t + 0.25);
      crunchGain.gain.setValueAtTime(0.7, t);
      crunchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      crunch.connect(crunchFilter);
      crunchFilter.connect(crunchGain);
      crunchGain.connect(masterGain);
      crunch.start(t);
      crunch.stop(t + 0.31);

      // Layer 3: Loud noise burst
      var nBuf = getNoiseBuffer(0.5);
      var noise = c.createBufferSource();
      noise.buffer = nBuf;
      var ng = c.createGain();
      var nf = c.createBiquadFilter();
      nf.type = 'lowpass';
      nf.frequency.setValueAtTime(4000, t);
      nf.frequency.exponentialRampToValueAtTime(200, t + 0.4);
      ng.gain.setValueAtTime(0.8, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      noise.connect(nf);
      nf.connect(ng);
      ng.connect(masterGain);
      noise.start(t);
      noise.stop(t + 0.51);

      // Layer 4: Sub-bass pressure wave
      var sub = c.createOscillator();
      var subGain = c.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(35, t);
      sub.frequency.exponentialRampToValueAtTime(15, t + 0.15);
      subGain.gain.setValueAtTime(0.8, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      sub.connect(subGain);
      subGain.connect(masterGain);
      sub.start(t);
      sub.stop(t + 0.21);

      // Layer 5: Debris / rattle tail
      var tailBuf = getNoiseBuffer(0.8);
      var tail = c.createBufferSource();
      tail.buffer = tailBuf;
      var tg = c.createGain();
      var tf = c.createBiquadFilter();
      tf.type = 'highpass';
      tf.frequency.value = 800;
      tg.gain.setValueAtTime(0, t);
      tg.gain.linearRampToValueAtTime(0.2, t + 0.05);
      tg.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      tail.connect(tf);
      tf.connect(tg);
      tg.connect(masterGain);
      tail.start(t);
      tail.stop(t + 0.71);

      // Layer 6: Ear ring (tinnitus effect)
      var ring = c.createOscillator();
      var ringGain = c.createGain();
      ring.type = 'sine';
      ring.frequency.setValueAtTime(4200, t);
      ring.frequency.exponentialRampToValueAtTime(3800, t + 0.8);
      ringGain.gain.setValueAtTime(0, t);
      ringGain.gain.linearRampToValueAtTime(0.06, t + 0.1);
      ringGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      ring.connect(ringGain);
      ringGain.connect(masterGain);
      ring.start(t);
      ring.stop(t + 0.81);
    },
  };

  GAME.Sound = Sound;
})();
