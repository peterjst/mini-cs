import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
});

describe('noise functions via _texUtil', () => {
  it('_hash should be deterministic', () => {
    var h = GAME._texUtil;
    var a = h.hash(5, 10, 42);
    var b = h.hash(5, 10, 42);
    expect(a).toBe(b);
  });

  it('_hash should return values in [0, 1]', () => {
    var h = GAME._texUtil;
    for (var i = 0; i < 100; i++) {
      var val = h.hash(i, i * 7, 99);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it('_hash should vary with different inputs', () => {
    var h = GAME._texUtil;
    var a = h.hash(0, 0, 0);
    var b = h.hash(1, 0, 0);
    var c = h.hash(0, 1, 0);
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it('_valueNoise should return values in [0, 1]', () => {
    var h = GAME._texUtil;
    for (var i = 0; i < 50; i++) {
      var val = h.valueNoise(i * 0.37, i * 0.53, 42);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it('_fbmNoise should return values in [0, 1]', () => {
    var h = GAME._texUtil;
    for (var i = 0; i < 50; i++) {
      var val = h.fbmNoise(i * 0.2, i * 0.3, 4, 2.0, 0.5, 42);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it('_fbmNoise should be deterministic', () => {
    var h = GAME._texUtil;
    var a = h.fbmNoise(1.5, 2.3, 4, 2.0, 0.5, 42);
    var b = h.fbmNoise(1.5, 2.3, 4, 2.0, 0.5, 42);
    expect(a).toBe(b);
  });
});

describe('build helpers via _mapHelpers', () => {
  it('B() should add mesh to scene and walls', () => {
    var helpers = GAME._mapHelpers;
    var scene = new THREE.Scene();
    var walls = [];
    var mesh = helpers.B(scene, walls, 2, 3, 4, {}, 0, 0, 0);
    expect(scene.children.length).toBeGreaterThan(0);
    expect(walls.length).toBe(1);
    expect(walls[0]).toBe(mesh);
  });

  it('D() should add mesh to scene but NOT to walls', () => {
    var helpers = GAME._mapHelpers;
    var scene = new THREE.Scene();
    var mesh = helpers.D(scene, 2, 3, 4, {}, 0, 0, 0);
    expect(scene.children.length).toBeGreaterThan(0);
  });

  it('CylW() should add to walls', () => {
    var helpers = GAME._mapHelpers;
    var scene = new THREE.Scene();
    var walls = [];
    var mesh = helpers.CylW(scene, walls, 1, 1, 3, 8, {}, 0, 0, 0);
    expect(walls.length).toBe(1);
  });

  it('Cyl() should NOT add to walls', () => {
    var helpers = GAME._mapHelpers;
    var scene = new THREE.Scene();
    var mesh = helpers.Cyl(scene, 1, 1, 3, 8, {}, 0, 0, 0);
    expect(scene.children.length).toBeGreaterThan(0);
  });
});

describe('map registry', () => {
  it('_maps array should exist', () => {
    expect(Array.isArray(GAME._maps)).toBe(true);
  });
});

describe('Map color grading configs', () => {
  beforeAll(() => {
    loadModule('js/maps/dust.js');
    loadModule('js/maps/office.js');
    loadModule('js/maps/warehouse.js');
    loadModule('js/maps/bloodstrike.js');
    loadModule('js/maps/italy.js');
    loadModule('js/maps/aztec.js');
    loadModule('js/maps/arena.js');
  });

  it('every map should have a colorGrade config', () => {
    GAME._maps.forEach(function(map) {
      expect(map.colorGrade).toBeDefined();
      expect(map.colorGrade.tint).toBeDefined();
      expect(typeof map.colorGrade.contrast).toBe('number');
      expect(typeof map.colorGrade.saturation).toBe('number');
      expect(typeof map.colorGrade.vignetteStrength).toBe('number');
    });
  });
});
