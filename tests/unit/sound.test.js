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
