import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/maps/props.js');
});

describe('props module foundation', () => {
  it('GAME._props should exist', () => {
    expect(GAME._props).toBeDefined();
  });

  it('seeded PRNG should be deterministic', () => {
    var rng1 = GAME._props._test.seededRng(42);
    var rng2 = GAME._props._test.seededRng(42);
    var a = [rng1(), rng1(), rng1()];
    var b = [rng2(), rng2(), rng2()];
    expect(a).toEqual(b);
  });

  it('seeded PRNG should produce values in [0, 1)', () => {
    var rng = GAME._props._test.seededRng(123);
    for (var i = 0; i < 100; i++) {
      var v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds should produce different sequences', () => {
    var rng1 = GAME._props._test.seededRng(1);
    var rng2 = GAME._props._test.seededRng(2);
    var same = true;
    for (var i = 0; i < 10; i++) {
      if (rng1() !== rng2()) same = false;
    }
    expect(same).toBe(false);
  });

  it('displaceVertices should modify geometry positions', () => {
    var geo = new THREE.IcosahedronGeometry(1, 2);
    var originalPositions = new Float32Array(geo.attributes.position.array);
    GAME._props._test.displaceVertices(geo, 0.3, 42, 'normal');
    var changed = false;
    for (var i = 0; i < originalPositions.length; i++) {
      if (originalPositions[i] !== geo.attributes.position.array[i]) {
        changed = true;
        break;
      }
    }
    expect(changed).toBe(true);
  });

  it('displaceVertices should be deterministic with same seed', () => {
    var geo1 = new THREE.IcosahedronGeometry(1, 2);
    var geo2 = new THREE.IcosahedronGeometry(1, 2);
    GAME._props._test.displaceVertices(geo1, 0.3, 42, 'normal');
    GAME._props._test.displaceVertices(geo2, 0.3, 42, 'normal');
    for (var i = 0; i < geo1.attributes.position.array.length; i++) {
      expect(geo1.attributes.position.array[i]).toBe(geo2.attributes.position.array[i]);
    }
  });

  it('material cache should return same material for same key', () => {
    var cache = GAME._props._test.matCache;
    var m1 = cache.get('bark_dark');
    var m2 = cache.get('bark_dark');
    expect(m1).toBe(m2);
  });

  it('material cache should have all expected categories', () => {
    var cache = GAME._props._test.matCache;
    expect(cache.get('bark_dark')).toBeDefined();
    expect(cache.get('leaf_dark')).toBeDefined();
    expect(cache.get('stone_grey')).toBeDefined();
    expect(cache.get('metal_rusted')).toBeDefined();
    expect(cache.get('burlap')).toBeDefined();
    expect(cache.get('terracotta')).toBeDefined();
    expect(cache.get('water_surface')).toBeDefined();
  });
});
