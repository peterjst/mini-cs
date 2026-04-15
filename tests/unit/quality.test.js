import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
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

  it('should have bloom enabled at levels 3-5', () => {
    for (var i = 3; i <= 5; i++) {
      expect(GAME.quality.LEVELS[i].bloom).toBe(true);
    }
    expect(GAME.quality.LEVELS[2].bloom).toBe(false);
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
