import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/core/quality.js');
});

describe('GAME.quality', () => {
  it('should exist as a namespace', () => {
    expect(GAME.quality).toBeDefined();
  });

  it('should have init and update methods', () => {
    expect(typeof GAME.quality.init).toBe('function');
    expect(typeof GAME.quality.update).toBe('function');
  });

  it('should expose LEVELS array with 6 levels', () => {
    expect(GAME.quality.LEVELS).toBeDefined();
    expect(GAME.quality.LEVELS.length).toBe(6);
  });

  it('should start at level 5 (Ultra)', () => {
    expect(GAME.quality.level).toBe(5);
    expect(GAME.quality.name).toBe('Ultra');
  });
});

describe('Quality level definitions', () => {
  it('should have names for all levels', () => {
    var names = GAME.quality.LEVELS.map(function(l) { return l.name; });
    expect(names).toEqual(['Minimal', 'Very Low', 'Low', 'Medium', 'High', 'Ultra']);
  });

  it('should have decreasing pixel ratio from top to bottom', () => {
    var ratios = GAME.quality.LEVELS.map(function(l) { return l.pixelRatio; });
    for (var i = 1; i < ratios.length; i++) {
      expect(ratios[i]).toBeGreaterThanOrEqual(ratios[i - 1]);
    }
  });

  it('should disable all post-processing at levels 0-1', () => {
    for (var i = 0; i <= 1; i++) {
      var lvl = GAME.quality.LEVELS[i];
      expect(lvl.bloom).toBe(false);
      expect(lvl.ssao).toBe(false);
      expect(lvl.sharpen).toBe(false);
      expect(lvl.shadows).toBe(false);
    }
  });

  it('should have shadows enabled at levels 2-5', () => {
    for (var i = 2; i <= 5; i++) {
      expect(GAME.quality.LEVELS[i].shadows).toBe(true);
    }
  });

  it('should have bloom enabled at levels 4-5 only', () => {
    for (var i = 4; i <= 5; i++) {
      expect(GAME.quality.LEVELS[i].bloom).toBe(true);
    }
    for (var i = 0; i <= 3; i++) {
      expect(GAME.quality.LEVELS[i].bloom).toBe(false);
    }
  });

  it('should only have sharpen at level 5', () => {
    expect(GAME.quality.LEVELS[5].sharpen).toBe(true);
    for (var i = 0; i < 5; i++) {
      expect(GAME.quality.LEVELS[i].sharpen).toBe(false);
    }
  });

  it('level 5 should match current defaults (SSAO off)', () => {
    var ultra = GAME.quality.LEVELS[5];
    expect(ultra.ssao).toBe(false);
    expect(ultra.bloom).toBe(true);
    expect(ultra.sharpen).toBe(true);
    expect(ultra.pixelRatio).toBe(2.0);
    expect(ultra.shadowMapSize).toBe(2048);
    expect(ultra.shadowType).toBe('PCFSoft');
  });
});

describe('Adaptive controller (without renderer)', () => {
  it('should not crash when update is called without init', () => {
    expect(() => GAME.quality.update(0.016)).not.toThrow();
  });

  it('should expose fps reading', () => {
    expect(typeof GAME.quality.fps).toBe('number');
  });

  it('should expose config object for current level', () => {
    var cfg = GAME.quality.config;
    expect(cfg).toBeDefined();
    expect(cfg.name).toBe('Ultra');
    expect(typeof cfg.pixelRatio).toBe('number');
    expect(typeof cfg.shadows).toBe('boolean');
    expect(typeof cfg.bloom).toBe('boolean');
  });
});

describe('Context loss recovery', () => {
  it('should expose a reapply method for context restore', () => {
    expect(typeof GAME.quality.reapply).toBe('function');
  });

  it('reapply should not throw when called without init', () => {
    expect(() => GAME.quality.reapply()).not.toThrow();
  });
});

describe('Quality level shadow config', () => {
  it('levels with shadows should have valid shadow map sizes', () => {
    GAME.quality.LEVELS.forEach(function(lvl) {
      if (lvl.shadows) {
        expect(lvl.shadowMapSize).toBeGreaterThan(0);
        expect(lvl.shadowType).toBeTruthy();
      }
    });
  });

  it('levels without shadows should have zero shadow map size', () => {
    GAME.quality.LEVELS.forEach(function(lvl) {
      if (!lvl.shadows) {
        expect(lvl.shadowMapSize).toBe(0);
      }
    });
  });
});

describe('Warmup gating (markWarmupComplete)', () => {
  it('should expose markWarmupComplete as a function', () => {
    expect(typeof GAME.quality.markWarmupComplete).toBe('function');
  });

  it('markWarmupComplete should not throw when called', () => {
    expect(() => GAME.quality.markWarmupComplete()).not.toThrow();
  });
});

describe('Fast-start heuristic', () => {
  beforeEach(() => {
    GAME.quality.init(null, null);
    GAME.quality.markWarmupComplete();
  });

  function feed(dt, frames) {
    for (var i = 0; i < frames; i++) GAME.quality.update(dt);
  }

  // fps≈10 -> below FPS_CRITICAL_THRESHOLD (15). Drop hard to Very Low.
  it('fps<15 at frame 10 drops Ultra -> Very Low (1)', () => {
    feed(0.1, 10);
    expect(GAME.quality.level).toBe(1);
  });

  // fps≈20 -> between FPS_CRITICAL (15) and FPS_DOWNGRADE (25). The
  // fast-start deliberately does NOT trigger here: this band overlaps with
  // shader-compile transients on a healthy machine. Cascade handling is left
  // to the regular downgrade loop (1s ticks). Mac users got a visible
  // Ultra->Low flop when this band fired fast-start.
  it('fps<25 (but >=15) at frame 10 leaves level at Ultra', () => {
    feed(0.05, 10);
    expect(GAME.quality.level).toBe(5);
  });

  // fps≈30 -> at or above FPS_DOWNGRADE_THRESHOLD (25). No fast-start.
  it('fps>=25 at frame 10 leaves level at Ultra', () => {
    feed(0.033, 10);
    expect(GAME.quality.level).toBe(5);
  });
});

describe('Upgrade past ceiling-locked level', () => {
  // Regression: when level N+1 is ceiling-locked (recently regressed), the
  // upgrade path must NOT probe to N+2. If N+1 couldn't hold, N+2 certainly
  // can't. The buggy original code did `while (next is locked) next++` and
  // ended up jumping Very Low -> Medium (and later Medium -> High), each
  // landing on a tier heavier than the one that just failed.
  beforeEach(() => {
    GAME.quality.init(null, null);
    GAME.quality.markWarmupComplete();
  });

  function feed(dt, seconds) {
    var n = Math.round(seconds / dt);
    for (var i = 0; i < n; i++) GAME.quality.update(dt);
  }

  it('must not upgrade past a freshly ceiling-locked level', () => {
    // Phase A: fast-start fires at frame 10 (fps≈10 < 15) → drops 5 → 1.
    feed(0.1, 1.5);
    expect(GAME.quality.level).toBe(1);

    // Reset frame queue between phases so the next phase's fps signal isn't
    // polluted by the previous phase. (Mirrors the production warmup path.)
    GAME.quality.markWarmupComplete();
    // Phase B: 60fps for >8s -> upgrade Very Low -> Low (timer at 0 after reset)
    feed(0.016, 9);
    expect(GAME.quality.level).toBe(2);

    // Phase C: drop fps<25 within the 3s upgrade-watch -> regression ceiling-locks Low
    GAME.quality.markWarmupComplete();
    feed(0.1, 0.5);
    expect(GAME.quality.level).toBe(1);

    // Phase D: 60fps again. With Low ceiling-locked, upgrade must NOT probe
    // past it to Medium. Stay at Very Low.
    GAME.quality.markWarmupComplete();
    feed(0.016, 9);
    expect(GAME.quality.level).toBe(1);
  });
});

describe('Hitch frame filter', () => {
  beforeEach(() => {
    // Initialize quality system (without renderer)
    GAME.quality.init(null, null);
    // Reset internal state by calling markWarmupComplete (which clears _frameTimes/_frameCount)
    GAME.quality.markWarmupComplete();
  });

  it('should include normal frames in rolling fps', () => {
    for (var i = 0; i < 60; i++) GAME.quality.update(0.016);
    // ~60fps for 60 frames
    expect(GAME.quality.fps).toBeGreaterThan(50);
    expect(GAME.quality.fps).toBeLessThan(70);
  });

  it('should ignore a single clamped (>=0.249) frame after a smooth window', () => {
    // Fill window with 60 normal frames first
    for (var i = 0; i < 60; i++) GAME.quality.update(0.016);
    var fpsBefore = GAME.quality.fps;
    // Inject one clamped hitch frame (at the new clamp ceiling)
    GAME.quality.update(0.25);
    // FPS should be unchanged (within 1) since the hitch was filtered
    expect(Math.abs(GAME.quality.fps - fpsBefore)).toBeLessThanOrEqual(1);
  });

  it('should ignore a clamped (>=0.249) frame even when the window is empty', () => {
    // Clamped dt is the gameLoop dt-ceiling (js/core/main.js currently 0.25s),
    // not a real render-time measurement. Including it on a fresh window —
    // e.g., the loading-time clamp on the first frame after markWarmupComplete
    // — poisons the rolling fps and falsely triggered Ultra->Medium drops on
    // Mac/Android map loads. Always filter clamped frames.
    GAME.quality.update(0.25);
    // No samples recorded — fps stays at the init default of 60.
    expect(GAME.quality.fps).toBe(60);
  });
});

describe('Downgrade hold time (transient false-positive rejection)', () => {
  // Reproduces the Mac flop log: after a Dust->Office map change, a brief
  // burst of slow frames (deferred shader compile / first-render of a new
  // material) filled the 2s rolling window to read fps=5. Without a hold
  // gate, drop=2 fired Ultra->Medium, then the system climbed back over
  // ~15s producing a visible Ultra->Medium->High->Ultra flop. The fix
  // requires sustained sub-threshold fps before downgrading; brief bursts
  // are rejected.
  beforeEach(() => {
    GAME.quality.init(null, null);
    GAME.quality.markWarmupComplete();
    // Healthy baseline so DOWNGRADE_INTERVAL gate is wide open by the time
    // the burst arrives — isolates the hold-time behavior under test.
    for (var i = 0; i < 180; i++) GAME.quality.update(0.016);
  });

  function feed(dt, frames) {
    for (var i = 0; i < frames; i++) GAME.quality.update(dt);
  }

  it('a 1s burst of 5fps after a healthy baseline does not downgrade', () => {
    feed(0.2, 5); // 5 frames × 200ms = 1.0s of 5fps, mostly diluted by fast frames in window
    expect(GAME.quality.level).toBe(5);
  });

  it('a 2s burst of 5fps fills the window but does not downgrade', () => {
    // 2.0s of 5fps fully replaces the rolling window with slow frames, so
    // rolling fps reads ~5 at the end. Pre-fix this fired drop=2 instantly.
    // Post-fix: _criticalTimer accrues only while fps<15 (last few frames of
    // burst), short of the 1.5s critical hold. No drop.
    feed(0.2, 10);
    expect(GAME.quality.level).toBe(5);
  });

  it('a transient slow burst followed by recovery leaves level at Ultra', () => {
    feed(0.2, 10);          // 2s burst at 5fps
    feed(0.016, 180);       // 3s recovery at 60fps
    expect(GAME.quality.level).toBe(5);
  });

  it('a sustained 4s sub-15fps run still downgrades (system remains responsive)', () => {
    // 4s of 10fps — long enough to fill window AND exceed critical hold.
    // Hold-time gate must not block genuine sustained problems.
    feed(0.1, 40);
    expect(GAME.quality.level).toBeLessThan(5);
  });

  it('intermittent sub-25 fps (alternating with healthy frames) does not downgrade', () => {
    // Each 0.5s slow burst is interleaved with 0.5s healthy, keeping rolling
    // fps oscillating around the threshold. _downgradeTimer never accumulates
    // 2 sustained seconds → no drop.
    for (var i = 0; i < 6; i++) {
      feed(0.1, 5);    // 0.5s of 10fps
      feed(0.016, 30); // 0.5s of 60fps
    }
    expect(GAME.quality.level).toBe(5);
  });
});

describe('ANGLE DPR cap (Windows)', () => {
  // Windows Chrome/Edge use ANGLE to translate WebGL -> D3D11. Per-pixel cost
  // is meaningfully higher than native GL (Mac Metal, Android GLES), so we
  // cap pixel ratio at 1.5 on ANGLE — Ultra's nominal 2.0 oversamples on
  // typical Windows integrated GPUs. Mac/Android stay uncapped (subject to
  // each tier's own cap).
  function makeTrackingRenderer() {
    return {
      _lastPR: null,
      setPixelRatio(v) { this._lastPR = v; },
      shadowMap: { type: 0, needsUpdate: false },
      getPixelRatio() { return this._lastPR || 1; }
    };
  }

  var origDPR;
  beforeEach(() => {
    origDPR = window.devicePixelRatio;
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
  });
  afterEach(() => {
    Object.defineProperty(window, 'devicePixelRatio', { value: origDPR, configurable: true });
    delete GAME._isAngle;
  });

  it('caps Ultra DPR to 1.5 when ANGLE is detected', () => {
    GAME._isAngle = true;
    var r = makeTrackingRenderer();
    GAME.quality.init(r, function() {});
    expect(r._lastPR).toBe(1.5);
  });

  it('leaves Ultra DPR at 2.0 when ANGLE is not detected', () => {
    GAME._isAngle = false;
    var r = makeTrackingRenderer();
    GAME.quality.init(r, function() {});
    expect(r._lastPR).toBe(2.0);
  });

  it('still respects devicePixelRatio below the cap on ANGLE', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 1.0, configurable: true });
    GAME._isAngle = true;
    var r = makeTrackingRenderer();
    GAME.quality.init(r, function() {});
    expect(r._lastPR).toBe(1.0);
  });
});

describe('Map-load loading-frame regression', () => {
  // Reproduces the Mac/Android false-cascade: menu accumulates _elapsedTime,
  // warmup completes, then the next gameLoop tick delivers the loading-time
  // dt (clamped to 0.25s). Before the fix, that single frame produced rolling
  // fps=4 and triggered drop=2: Ultra -> Medium, with a ~16s climb back.
  beforeEach(() => {
    GAME.quality.init(null, null);
    // Simulate ~5s of healthy menu time so _lastDowngradeTime's gate is wide
    // open by the time warmup fires.
    for (var i = 0; i < 300; i++) GAME.quality.update(0.016);
  });

  it('a clamped loading-frame after warmup must not drop Ultra', () => {
    GAME.quality.markWarmupComplete();
    // The loading-time dt for this gameLoop tick, clamped to the ceiling.
    GAME.quality.update(0.25);
    // Then a healthy second of 60fps render frames.
    for (var i = 0; i < 60; i++) GAME.quality.update(0.016);
    expect(GAME.quality.level).toBe(5);
  });

  it('a marginal 20fps burst right after warmup does not pre-empt the 1s settle', () => {
    // Even without a clamped frame, the first second post-warmup should not
    // downgrade — the rolling window needs time to fill with real samples.
    GAME.quality.markWarmupComplete();
    for (var i = 0; i < 12; i++) GAME.quality.update(0.05); // 0.6s of 20fps
    // Within the 1s settle, no downgrade.
    expect(GAME.quality.level).toBe(5);
  });
});
