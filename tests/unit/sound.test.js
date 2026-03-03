import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/sound.js');
});

describe('GAME.Sound', () => {
  it('should be defined after loading', () => {
    expect(GAME.Sound).toBeDefined();
  });

  it('should have core sound methods', () => {
    var methods = ['init'];
    methods.forEach(m => {
      expect(typeof GAME.Sound[m]).toBe('function');
    });
  });

  it('init should not throw', () => {
    expect(() => GAME.Sound.init()).not.toThrow();
  });
});

describe('Spatial audio', () => {
  it('GAME.Sound.updateListener should be a function', () => {
    expect(typeof GAME.Sound.updateListener).toBe('function');
  });

  it('GAME.Sound.enemyShotSpatial should be a function', () => {
    expect(typeof GAME.Sound.enemyShotSpatial).toBe('function');
  });

  it('GAME.Sound.botFootstep should be a function', () => {
    expect(typeof GAME.Sound.botFootstep).toBe('function');
  });

  it('GAME.Sound._createPanner should be a function', () => {
    expect(typeof GAME.Sound._createPanner).toBe('function');
  });
});

describe('Reload phase sounds', () => {
  it('GAME.Sound.reloadMagOut should be a function', () => {
    expect(typeof GAME.Sound.reloadMagOut).toBe('function');
  });

  it('GAME.Sound.reloadMagIn should be a function', () => {
    expect(typeof GAME.Sound.reloadMagIn).toBe('function');
  });

  it('GAME.Sound.reloadBoltRack should be a function', () => {
    expect(typeof GAME.Sound.reloadBoltRack).toBe('function');
  });
});
