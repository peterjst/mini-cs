import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/systems/weapons.js');
  loadModule('js/systems/enemies.js');
});

// Minimal stand-in for a retired Enemy: corpses only ever calls .destroy() on it.
function fakeCorpse() {
  return { destroy: vi.fn() };
}

describe('GAME.corpses', () => {
  beforeEach(() => {
    GAME.corpses.clear();
  });

  it('exposes add, clear, and count', () => {
    expect(typeof GAME.corpses.add).toBe('function');
    expect(typeof GAME.corpses.clear).toBe('function');
    expect(typeof GAME.corpses.count).toBe('function');
  });

  it('retains corpses up to the cap of 8 without destroying any', () => {
    var bodies = [];
    for (var i = 0; i < 8; i++) {
      var b = fakeCorpse();
      bodies.push(b);
      GAME.corpses.add(b);
    }
    expect(GAME.corpses.count()).toBe(8);
    bodies.forEach(function (b) {
      expect(b.destroy).not.toHaveBeenCalled();
    });
  });

  it('evicts the oldest (FIFO) when the 9th is added, keeping count at 8', () => {
    var bodies = [];
    for (var i = 0; i < 9; i++) {
      var b = fakeCorpse();
      bodies.push(b);
      GAME.corpses.add(b);
    }
    expect(GAME.corpses.count()).toBe(8);
    expect(bodies[0].destroy).toHaveBeenCalledTimes(1);
    for (var j = 1; j < 9; j++) {
      expect(bodies[j].destroy).not.toHaveBeenCalled();
    }
  });

  it('evicts in FIFO order across multiple over-cap adds', () => {
    var bodies = [];
    for (var i = 0; i < 10; i++) {
      var b = fakeCorpse();
      bodies.push(b);
      GAME.corpses.add(b);
    }
    expect(GAME.corpses.count()).toBe(8);
    expect(bodies[0].destroy).toHaveBeenCalledTimes(1);
    expect(bodies[1].destroy).toHaveBeenCalledTimes(1);
    expect(bodies[2].destroy).not.toHaveBeenCalled();
    expect(bodies[9].destroy).not.toHaveBeenCalled();
  });

  it('clear() destroys every held corpse and empties the list', () => {
    var bodies = [];
    for (var i = 0; i < 3; i++) {
      var b = fakeCorpse();
      bodies.push(b);
      GAME.corpses.add(b);
    }
    GAME.corpses.clear();
    expect(GAME.corpses.count()).toBe(0);
    bodies.forEach(function (b) {
      expect(b.destroy).toHaveBeenCalledTimes(1);
    });
  });
});
