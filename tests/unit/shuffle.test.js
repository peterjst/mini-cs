import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  // Load only what shuffle.js needs: GAME namespace + getMapCount
  loadModule('js/maps/shared.js');
  loadModule('js/maps/props.js');
  loadModule('js/maps/dust.js');
  loadModule('js/maps/office.js');
  loadModule('js/maps/warehouse.js');
  loadModule('js/maps/bloodstrike.js');
  loadModule('js/maps/italy.js');
  loadModule('js/maps/aztec.js');
  loadModule('js/maps/arena.js');
  loadModule('js/systems/shuffle.js');
});

beforeEach(() => {
  // Reset decks before each test so tests are independent
  GAME._shuffleDecks = {};
});

describe('GAME.shuffle.nextShuffleMap', () => {
  it('returns an integer in [0, mapCount) on first call', () => {
    var idx = GAME.shuffle.nextShuffleMap('competitive');
    expect(Number.isInteger(idx)).toBe(true);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(GAME.getMapCount());
  });

  it('returns every map index exactly once across one deck', () => {
    var mapCount = GAME.getMapCount();
    var seen = {};
    for (var i = 0; i < mapCount; i++) {
      var idx = GAME.shuffle.nextShuffleMap('competitive');
      seen[idx] = (seen[idx] || 0) + 1;
    }
    for (var k = 0; k < mapCount; k++) {
      expect(seen[k]).toBe(1);
    }
  });

  it('reshuffles after deck exhaustion (pos wraps, valid index)', () => {
    var mapCount = GAME.getMapCount();
    for (var i = 0; i < mapCount; i++) GAME.shuffle.nextShuffleMap('competitive');
    var next = GAME.shuffle.nextShuffleMap('competitive');
    expect(next).toBeGreaterThanOrEqual(0);
    expect(next).toBeLessThan(mapCount);
  });

  it('never repeats across the reshuffle boundary', () => {
    var mapCount = GAME.getMapCount();
    var prev = null;
    for (var cycle = 0; cycle < 50; cycle++) {
      for (var i = 0; i < mapCount; i++) {
        var idx = GAME.shuffle.nextShuffleMap('competitive');
        if (prev !== null && i === 0) {
          expect(idx).not.toBe(prev);
        }
        if (i === mapCount - 1) prev = idx;
      }
    }
  });

  it('maintains independent decks per modeKey', () => {
    var compIdx = GAME.shuffle.nextShuffleMap('competitive');
    var dmIdx = GAME.shuffle.nextShuffleMap('deathmatch');
    GAME.shuffle.nextShuffleMap('competitive');
    GAME.shuffle.nextShuffleMap('competitive');
    expect(GAME._shuffleDecks.deathmatch.pos).toBe(1);
    expect(GAME._shuffleDecks.competitive.pos).toBe(3);
    expect(compIdx).toBeGreaterThanOrEqual(0);
    expect(dmIdx).toBeGreaterThanOrEqual(0);
  });

  it('returns the single map when mapCount === 1', () => {
    var original = GAME._maps.slice();
    GAME._maps.length = 1;
    try {
      GAME._shuffleDecks = {};
      expect(GAME.shuffle.nextShuffleMap('competitive')).toBe(0);
      expect(GAME.shuffle.nextShuffleMap('competitive')).toBe(0);
    } finally {
      GAME._maps.length = 0;
      for (var i = 0; i < original.length; i++) GAME._maps.push(original[i]);
    }
  });
});

describe('GAME.shuffle.startingShuffleMap', () => {
  it('advances the deck by one (same as nextShuffleMap)', () => {
    var idx = GAME.shuffle.startingShuffleMap('gungame');
    expect(Number.isInteger(idx)).toBe(true);
    expect(GAME._shuffleDecks.gungame.pos).toBe(1);
  });

  it('does not reset an existing deck', () => {
    GAME.shuffle.nextShuffleMap('gungame'); // pos=1
    GAME.shuffle.nextShuffleMap('gungame'); // pos=2
    var startIdx = GAME.shuffle.startingShuffleMap('gungame');
    expect(GAME._shuffleDecks.gungame.pos).toBe(3);
    expect(startIdx).toBeGreaterThanOrEqual(0);
  });
});
