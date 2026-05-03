// js/core/quality.js — Adaptive quality system
// Monitors FPS and adjusts rendering quality to maintain playable frame rates.
// Attaches GAME.quality

(function() {
  'use strict';
  if (!window.GAME) window.GAME = {};

  // Quality level definitions
  var LEVELS = [
    { name: 'Minimal',  pixelRatio: 0.75, shadows: false, shadowType: null,  shadowMapSize: 0,    ssao: false, bloom: false, sharpen: false },
    { name: 'Very Low', pixelRatio: 1.0,  shadows: false, shadowType: null,  shadowMapSize: 0,    ssao: false, bloom: false, sharpen: false },
    { name: 'Low',      pixelRatio: 1.0,  shadows: true,  shadowType: 'PCF', shadowMapSize: 512,  ssao: false, bloom: false, sharpen: false },
    { name: 'Medium',   pixelRatio: 1.5,  shadows: true,  shadowType: 'PCF', shadowMapSize: 1024, ssao: false, bloom: true,  sharpen: false },
    { name: 'High',     pixelRatio: 1.5,  shadows: true,  shadowType: 'PCFSoft', shadowMapSize: 1024, ssao: false, bloom: true, sharpen: false },
    { name: 'Ultra',    pixelRatio: 2.0,  shadows: true,  shadowType: 'PCFSoft', shadowMapSize: 2048, ssao: false, bloom: true, sharpen: true }
  ];

  var FPS_DOWNGRADE_THRESHOLD = 25;
  var FPS_CRITICAL_THRESHOLD = 15;
  var FPS_UPGRADE_THRESHOLD = 35;
  var UPGRADE_HOLD_TIME = 8;        // seconds above threshold before upgrade
  var CEILING_COOLDOWN = 60;         // seconds before retrying a ceiling level
  var DOWNGRADE_INTERVAL = 1;        // minimum seconds between downgrades
  var UPGRADE_WATCH_TIME = 3;        // seconds to watch after upgrade for regression
  var FAST_START_FRAMES = 10;        // frames to sample for fast-start heuristic
  var ROLLING_WINDOW = 2;            // seconds for FPS rolling window

  var _renderer = null;
  var _resizeBloom = null;
  var _currentLevel = 5;
  var _frameTimes = [];
  var _frameCount = 0;
  var _rollingFps = 60;
  var _upgradeTimer = 0;
  var _lastDowngradeTime = 0;
  var _elapsedTime = 0;
  var _ceilings = {};                // level -> timestamp when ceiling expires
  var _upgradeWatchStart = 0;
  var _upgradeWatchLevel = -1;
  var _initialized = false;
  var _paused = false;
  var _toastEl = null;
  var _toastTimer = 0;
  var _warmupComplete = false;

  function clampPixelRatio(maxRatio) {
    return Math.min(window.devicePixelRatio, maxRatio);
  }

  function applyLevel(level) {
    if (level < 0) level = 0;
    if (level > 5) level = 5;
    var prev = _currentLevel;
    _currentLevel = level;
    var cfg = LEVELS[level];

    if (!_renderer) return;

    // Pixel ratio
    _renderer.setPixelRatio(clampPixelRatio(cfg.pixelRatio));

    // Shadows
    var dirLight = GAME._dirLight;
    if (dirLight) {
      if (cfg.shadows) {
        dirLight.castShadow = true;

        // Shadow map type
        var newType = cfg.shadowType === 'PCFSoft' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
        if (_renderer.shadowMap.type !== newType) {
          _renderer.shadowMap.type = newType;
          _renderer.shadowMap.needsUpdate = true;
        }

        // Shadow map size
        if (dirLight.shadow.mapSize.width !== cfg.shadowMapSize) {
          dirLight.shadow.mapSize.width = cfg.shadowMapSize;
          dirLight.shadow.mapSize.height = cfg.shadowMapSize;
          if (dirLight.shadow.map) {
            dirLight.shadow.map.dispose();
            dirLight.shadow.map = null;
          }
        }
      } else {
        dirLight.castShadow = false;
      }
    }

    // Resize render targets for new pixel ratio
    if (_resizeBloom) _resizeBloom();

    // Show toast on downgrade only
    if (level < prev) {
      showToast('Quality: ' + cfg.name);
    }
  }

  function showToast(msg) {
    if (!_toastEl) {
      _toastEl = document.getElementById('quality-toast');
    }
    if (!_toastEl) return;
    _toastEl.textContent = msg;
    _toastEl.style.opacity = '1';
    _toastEl.style.display = 'block';
    _toastTimer = 2;
  }

  function updateToast(dt) {
    if (_toastTimer <= 0) return;
    _toastTimer -= dt;
    if (_toastTimer <= 0 && _toastEl) {
      _toastEl.style.opacity = '0';
      setTimeout(function() {
        if (_toastEl && _toastTimer <= 0) _toastEl.style.display = 'none';
      }, 300);
    }
  }

  function update(dt) {
    if (!_initialized || _paused || dt <= 0) return;

    _elapsedTime += dt;

    // Track frame time — skip clamped (hitch) frames once the window has at least 10 samples
    // Must track the dt clamp in js/core/main.js (currently 0.25). Excludes only frames that actually hit the ceiling.
    var isHitch = dt >= 0.249;
    if (!isHitch || _frameTimes.length < 10) {
      _frameTimes.push(dt);
    }
    _frameCount++;

    // Trim rolling window to ROLLING_WINDOW seconds
    var totalTime = 0;
    for (var i = _frameTimes.length - 1; i >= 0; i--) {
      totalTime += _frameTimes[i];
      if (totalTime > ROLLING_WINDOW) {
        _frameTimes = _frameTimes.slice(i);
        break;
      }
    }

    // Compute rolling average FPS
    if (_frameTimes.length > 0) {
      var sum = 0;
      for (var j = 0; j < _frameTimes.length; j++) sum += _frameTimes[j];
      _rollingFps = _frameTimes.length / sum;
    }

    // Fast-start heuristic: check after first 10 frames (only after warmup completes)
    if (_frameCount === FAST_START_FRAMES && _currentLevel === 5 && _warmupComplete) {
      if (_rollingFps < FPS_CRITICAL_THRESHOLD) {
        applyLevel(1);
        _lastDowngradeTime = _elapsedTime;
        return;
      }
    }

    // Update toast
    updateToast(dt);

    // Upgrade watch: if we recently upgraded, watch for regression
    if (_upgradeWatchLevel >= 0) {
      if (_elapsedTime - _upgradeWatchStart > UPGRADE_WATCH_TIME) {
        // Watch period ended without regression — upgrade is stable
        _upgradeWatchLevel = -1;
      } else if (_rollingFps < FPS_DOWNGRADE_THRESHOLD) {
        // Regression detected — downgrade and mark ceiling
        var ceilingLevel = _upgradeWatchLevel;
        _ceilings[ceilingLevel] = _elapsedTime + CEILING_COOLDOWN;
        applyLevel(ceilingLevel - 1);
        _lastDowngradeTime = _elapsedTime;
        _upgradeWatchLevel = -1;
        _upgradeTimer = 0;
        return;
      }
    }

    // Downgrade logic
    if (_rollingFps < FPS_DOWNGRADE_THRESHOLD && _currentLevel > 0) {
      if (_elapsedTime - _lastDowngradeTime >= DOWNGRADE_INTERVAL) {
        var drop = _rollingFps < FPS_CRITICAL_THRESHOLD ? 2 : 1;
        applyLevel(Math.max(0, _currentLevel - drop));
        _lastDowngradeTime = _elapsedTime;
        _upgradeTimer = 0;
        _upgradeWatchLevel = -1;
        return;
      }
    }

    // Upgrade logic
    if (_rollingFps > FPS_UPGRADE_THRESHOLD && _currentLevel < 5) {
      _upgradeTimer += dt;
      if (_upgradeTimer >= UPGRADE_HOLD_TIME) {
        // Find next level that isn't ceiling-locked
        var nextLevel = _currentLevel + 1;
        while (nextLevel <= 5 && _ceilings[nextLevel] && _elapsedTime < _ceilings[nextLevel]) {
          nextLevel++;
        }
        // Clear expired ceilings
        if (_ceilings[nextLevel] && _elapsedTime >= _ceilings[nextLevel]) {
          delete _ceilings[nextLevel];
        }
        if (nextLevel <= 5) {
          applyLevel(nextLevel);
          _upgradeTimer = 0;
          _upgradeWatchStart = _elapsedTime;
          _upgradeWatchLevel = nextLevel;
        } else {
          _upgradeTimer = 0; // all higher levels are ceiling-locked
        }
      }
    } else if (_rollingFps <= FPS_UPGRADE_THRESHOLD) {
      _upgradeTimer = 0;
    }
  }

  function markWarmupComplete() {
    _warmupComplete = true;
    _frameCount = 0;
    _frameTimes = [];
  }

  function init(renderer, resizeBloomFn) {
    _renderer = renderer;
    _resizeBloom = resizeBloomFn;
    _initialized = true;
    _currentLevel = 5;

    // Tab visibility handling
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        _paused = true;
      } else {
        _paused = false;
        // Discard stale frame times
        _frameTimes = [];
      }
    });

    // Apply initial level (matches current defaults)
    applyLevel(5);
  }

  function reapply() {
    if (!_initialized) return;
    applyLevel(_currentLevel);
  }

  GAME.quality = {
    init: init,
    update: update,
    reapply: reapply,
    markWarmupComplete: markWarmupComplete,
    get level() { return _currentLevel; },
    get name() { return LEVELS[_currentLevel].name; },
    get config() { return LEVELS[_currentLevel]; },
    get fps() { return Math.round(_rollingFps); },
    LEVELS: LEVELS
  };
})();
