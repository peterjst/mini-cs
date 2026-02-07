// js/sound.js — Procedural sound effects using Web Audio API
// Attaches GAME.Sound

(function() {
  'use strict';
  if (!window.GAME) window.GAME = {};

  var ctx = null;
  var masterGain = null;

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.4;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Helper: play a noise burst (for gunshots)
  function noiseBurst(duration, freq, volume, type) {
    var c = ensureCtx();
    var t = c.currentTime;

    var osc = c.createOscillator();
    var gain = c.createGain();
    var filter = c.createBiquadFilter();

    osc.type = type || 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.3, t + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + duration);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + duration);

    // Add noise layer
    var bufSize = c.sampleRate * duration;
    var buf = c.createBuffer(1, bufSize, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    var noise = c.createBufferSource();
    noise.buffer = buf;
    var noiseGain = c.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.6, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    var noiseFilter = c.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = freq;
    noiseFilter.Q.value = 1;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start(t);
    noise.stop(t + duration);
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

  var Sound = {
    init: function() { ensureCtx(); },

    pistolShot: function() {
      noiseBurst(0.12, 800, 0.5, 'square');
      tone(150, 0.08, 0.3, 'sine');
    },

    rifleShot: function() {
      noiseBurst(0.08, 1200, 0.6, 'sawtooth');
      tone(200, 0.05, 0.4, 'square');
    },

    knifeSlash: function() {
      var c = ensureCtx();
      var t = c.currentTime;
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.15);
    },

    hitMarker: function() {
      tone(1800, 0.06, 0.25, 'square');
      setTimeout(function() { tone(2200, 0.04, 0.2, 'square'); }, 30);
    },

    kill: function() {
      tone(1200, 0.06, 0.3, 'square');
      setTimeout(function() { tone(1600, 0.06, 0.25, 'square'); }, 50);
      setTimeout(function() { tone(2000, 0.08, 0.2, 'square'); }, 100);
    },

    reload: function() {
      var c = ensureCtx();
      var t = c.currentTime;
      // Click sound
      tone(400, 0.03, 0.2, 'square');
      setTimeout(function() { tone(600, 0.03, 0.15, 'square'); }, 150);
      setTimeout(function() { tone(500, 0.05, 0.2, 'square'); }, 400);
    },

    playerHurt: function() {
      var c = ensureCtx();
      var t = c.currentTime;
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.2);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.2);
    },

    roundStart: function() {
      tone(523, 0.15, 0.2, 'sine'); // C5
      setTimeout(function() { tone(659, 0.15, 0.2, 'sine'); }, 150); // E5
      setTimeout(function() { tone(784, 0.25, 0.25, 'sine'); }, 300); // G5
    },

    roundWin: function() {
      tone(523, 0.12, 0.25, 'sine');
      setTimeout(function() { tone(659, 0.12, 0.25, 'sine'); }, 120);
      setTimeout(function() { tone(784, 0.12, 0.25, 'sine'); }, 240);
      setTimeout(function() { tone(1047, 0.3, 0.3, 'sine'); }, 360);
    },

    roundLose: function() {
      tone(400, 0.2, 0.25, 'sine');
      setTimeout(function() { tone(350, 0.2, 0.25, 'sine'); }, 200);
      setTimeout(function() { tone(280, 0.4, 0.3, 'sine'); }, 400);
    },

    buy: function() {
      tone(800, 0.05, 0.15, 'sine');
      setTimeout(function() { tone(1000, 0.08, 0.15, 'sine'); }, 60);
    },

    switchWeapon: function() {
      tone(500, 0.04, 0.12, 'square');
      setTimeout(function() { tone(700, 0.04, 0.12, 'square'); }, 40);
    },

    enemyShot: function() {
      noiseBurst(0.1, 600, 0.15, 'square');
    },

    empty: function() {
      tone(300, 0.03, 0.15, 'square');
    },
  };

  GAME.Sound = Sound;
})();
