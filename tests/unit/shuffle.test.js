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
    var mapCount = GAME.getMapCount();
    var competitiveIndices = {};
    var deathmatchIndices = {};

    // Consume one full deck from competitive without touching deathmatch
    for (var i = 0; i < mapCount; i++) {
      var idx = GAME.shuffle.nextShuffleMap('competitive');
      competitiveIndices[idx] = (competitiveIndices[idx] || 0) + 1;
    }

    // Now consume from deathmatch — should visit every index exactly once (no cross-contamination)
    for (var j = 0; j < mapCount; j++) {
      var dmIdx = GAME.shuffle.nextShuffleMap('deathmatch');
      deathmatchIndices[dmIdx] = (deathmatchIndices[dmIdx] || 0) + 1;
    }

    // Verify both modes saw every map index exactly once
    for (var k = 0; k < mapCount; k++) {
      expect(competitiveIndices[k]).toBe(1);
      expect(deathmatchIndices[k]).toBe(1);
    }
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
  it('returns a valid map index and consumes one deck slot', () => {
    var firstIdx = GAME.shuffle.startingShuffleMap('gungame');
    var secondIdx = GAME.shuffle.nextShuffleMap('gungame');
    expect(Number.isInteger(firstIdx)).toBe(true);
    expect(firstIdx).toBeGreaterThanOrEqual(0);
    expect(firstIdx).toBeLessThan(GAME.getMapCount());
    expect(secondIdx).not.toBe(firstIdx);
    expect(secondIdx).toBeGreaterThanOrEqual(0);
    expect(secondIdx).toBeLessThan(GAME.getMapCount());
  });

  it('does not reset an existing deck', () => {
    var mapCount = GAME.getMapCount();
    var seen = {};

    // Consume 2 picks via nextShuffleMap
    var idx1 = GAME.shuffle.nextShuffleMap('gungame');
    var idx2 = GAME.shuffle.nextShuffleMap('gungame');
    seen[idx1] = (seen[idx1] || 0) + 1;
    seen[idx2] = (seen[idx2] || 0) + 1;

    // Call startingShuffleMap (which should continue, not reset)
    var idx3 = GAME.shuffle.startingShuffleMap('gungame');
    seen[idx3] = (seen[idx3] || 0) + 1;

    // Continue drawing until mapCount total calls are made
    for (var i = 3; i < mapCount; i++) {
      var idx = GAME.shuffle.nextShuffleMap('gungame');
      seen[idx] = (seen[idx] || 0) + 1;
    }

    // Verify all mapCount indices were seen exactly once (proves deck was not reset mid-way)
    for (var k = 0; k < mapCount; k++) {
      expect(seen[k]).toBe(1);
    }
  });
});
