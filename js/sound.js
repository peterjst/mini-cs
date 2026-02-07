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

  // Create a noise buffer (cached)
  var _noiseBuffer = null;
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

  // Layered gunshot: transient click + body + noise tail
  function gunshot(opts) {
    var c = ensureCtx();
    var t = c.currentTime;
    var vol = opts.volume || 0.5;

    // Layer 1: Sharp transient pop
    var pop = c.createOscillator();
    var popGain = c.createGain();
    pop.type = 'square';
    pop.frequency.setValueAtTime(opts.popFreq || 900, t);
    pop.frequency.exponentialRampToValueAtTime(100, t + 0.015);
    popGain.gain.setValueAtTime(vol * 1.2, t);
    popGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    pop.connect(popGain);
    popGain.connect(masterGain);
    pop.start(t);
    pop.stop(t + 0.025);

    // Layer 2: Body tone (gives character — pistol vs rifle)
    var body = c.createOscillator();
    var bodyGain = c.createGain();
    var bodyFilter = c.createBiquadFilter();
    body.type = opts.bodyType || 'sawtooth';
    body.frequency.setValueAtTime(opts.bodyFreq || 400, t);
    body.frequency.exponentialRampToValueAtTime(opts.bodyEnd || 60, t + opts.bodyLen);
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(opts.filterFreq || 2500, t);
    bodyFilter.frequency.exponentialRampToValueAtTime(200, t + opts.bodyLen);
    bodyFilter.Q.value = 2;
    bodyGain.gain.setValueAtTime(vol * 0.8, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, t + opts.bodyLen);
    body.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(masterGain);
    body.start(t);
    body.stop(t + opts.bodyLen + 0.01);

    // Layer 3: Noise burst (explosion texture)
    var noiseBuf = getNoiseBuffer(opts.noiseLen || 0.15);
    var noise = c.createBufferSource();
    noise.buffer = noiseBuf;
    var noiseGain = c.createGain();
    var noiseFilter = c.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(opts.noiseFreq || 1500, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(300, t + (opts.noiseLen || 0.15));
    noiseFilter.Q.value = 0.8;
    noiseGain.gain.setValueAtTime(vol * (opts.noiseVol || 0.7), t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + (opts.noiseLen || 0.15));
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start(t);
    noise.stop(t + (opts.noiseLen || 0.15) + 0.01);

    // Layer 4: Sub bass thump
    if (opts.subBass) {
      var sub = c.createOscillator();
      var subGain = c.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(opts.subFreq || 80, t);
      sub.frequency.exponentialRampToValueAtTime(30, t + 0.1);
      subGain.gain.setValueAtTime(vol * 0.6, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      sub.connect(subGain);
      subGain.connect(masterGain);
      sub.start(t);
      sub.stop(t + 0.13);
    }

    // Layer 5: Mechanical echo / tail
    if (opts.tail) {
      var tailNoise = c.createBufferSource();
      tailNoise.buffer = getNoiseBuffer(opts.tailLen || 0.3);
      var tailGain = c.createGain();
      var tailFilter = c.createBiquadFilter();
      tailFilter.type = 'highpass';
      tailFilter.frequency.value = 400;
      tailGain.gain.setValueAtTime(0, t);
      tailGain.gain.linearRampToValueAtTime(vol * 0.15, t + 0.03);
      tailGain.gain.exponentialRampToValueAtTime(0.001, t + (opts.tailLen || 0.3));
      tailNoise.connect(tailFilter);
      tailFilter.connect(tailGain);
      tailGain.connect(masterGain);
      tailNoise.start(t);
      tailNoise.stop(t + (opts.tailLen || 0.3) + 0.01);
    }
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

    pistolShot: function() {
      gunshot({
        volume: 0.55,
        popFreq: 1100,
        bodyType: 'square',
        bodyFreq: 500,
        bodyEnd: 80,
        bodyLen: 0.08,
        filterFreq: 3000,
        noiseFreq: 2000,
        noiseLen: 0.1,
        noiseVol: 0.6,
        subBass: true,
        subFreq: 100,
        tail: true,
        tailLen: 0.15,
      });
    },

    rifleShot: function() {
      gunshot({
        volume: 0.65,
        popFreq: 1400,
        bodyType: 'sawtooth',
        bodyFreq: 700,
        bodyEnd: 50,
        bodyLen: 0.06,
        filterFreq: 4000,
        noiseFreq: 2500,
        noiseLen: 0.08,
        noiseVol: 0.8,
        subBass: true,
        subFreq: 60,
        tail: true,
        tailLen: 0.12,
      });
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
      // Distant/muffled gunshot
      gunshot({
        volume: 0.2,
        popFreq: 700,
        bodyType: 'square',
        bodyFreq: 350,
        bodyEnd: 60,
        bodyLen: 0.07,
        filterFreq: 1500,
        noiseFreq: 1000,
        noiseLen: 0.08,
        noiseVol: 0.5,
        subBass: false,
        tail: false,
      });
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
