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

describe('Tree generator', () => {
  it('GAME._props.Tree should be a function', () => {
    expect(typeof GAME._props.Tree).toBe('function');
  });

  it('Tree should add objects to scene', () => {
    var scene = new THREE.Scene();
    var walls = [];
    GAME._props.Tree(scene, walls, 0, 0, 0, { style: 'jungle', seed: 1 });
    expect(scene.children.length).toBeGreaterThan(0);
  });

  it('Tree should push collision mesh to walls array', () => {
    var scene = new THREE.Scene();
    var walls = [];
    GAME._props.Tree(scene, walls, 0, 0, 0, { style: 'jungle', seed: 1 });
    expect(walls.length).toBeGreaterThan(0);
  });

  it('Tree should be deterministic with same seed', () => {
    var scene1 = new THREE.Scene();
    var scene2 = new THREE.Scene();
    GAME._props.Tree(scene1, [], 5, 0, 5, { style: 'oak', seed: 42 });
    GAME._props.Tree(scene2, [], 5, 0, 5, { style: 'oak', seed: 42 });
    expect(scene1.children.length).toBe(scene2.children.length);
  });

  it('Tree should support all 5 styles without throwing', () => {
    var styles = ['jungle', 'palm', 'cypress', 'oak', 'pine'];
    styles.forEach(function(style) {
      var scene = new THREE.Scene();
      expect(function() {
        GAME._props.Tree(scene, [], 0, 0, 0, { style: style, seed: 1 });
      }).not.toThrow();
    });
  });

  it('Tree trunk should use cylinder geometry, not box', () => {
    var scene = new THREE.Scene();
    GAME._props.Tree(scene, [], 0, 0, 0, { style: 'jungle', seed: 1 });
    var group = scene.children[0];
    var hasCylinder = false;
    group.traverse(function(child) {
      if (child.geometry && child.geometry.type === 'CylinderGeometry') {
        hasCylinder = true;
      }
    });
    expect(hasCylinder).toBe(true);
  });

  it('Tree canopy should use non-box geometry', () => {
    var scene = new THREE.Scene();
    GAME._props.Tree(scene, [], 0, 0, 0, { style: 'jungle', seed: 1 });
    var group = scene.children[0];
    var hasNonBox = false;
    var meshCount = 0;
    group.traverse(function(child) {
      if (child.geometry) {
        meshCount++;
        if (child.geometry.type !== 'BoxGeometry') hasNonBox = true;
      }
    });
    expect(meshCount).toBeGreaterThan(2);
    expect(hasNonBox).toBe(true);
  });

  it('scale option should affect tree size', () => {
    var scene1 = new THREE.Scene();
    var scene2 = new THREE.Scene();
    GAME._props.Tree(scene1, [], 0, 0, 0, { style: 'pine', seed: 1, scale: 1.0 });
    GAME._props.Tree(scene2, [], 0, 0, 0, { style: 'pine', seed: 1, scale: 2.0 });
    var group1 = scene1.children[0];
    var group2 = scene2.children[0];
    expect(group2.scale.x).toBeGreaterThan(group1.scale.x);
  });
});

describe('Vegetation generators', () => {
  var generatorTests = [
    { name: 'Bush', styles: ['leafy', 'flowering', 'hedge'] },
    { name: 'Grass', styles: null },
    { name: 'Vine', styles: null },
    { name: 'PottedPlant', styles: null },
    { name: 'Flower', styles: null },
  ];

  generatorTests.forEach(function(gen) {
    describe(gen.name + ' generator', () => {
      it('should be a function', () => {
        expect(typeof GAME._props[gen.name]).toBe('function');
      });

      it('should add objects to scene without throwing', () => {
        var scene = new THREE.Scene();
        expect(function() {
          if (gen.name === 'Vine') {
            GAME._props.Vine(scene, 0, 5, 0, 3, 3, 0, { seed: 1 });
          } else {
            GAME._props[gen.name](scene, 0, 0, 0, { seed: 1 });
          }
        }).not.toThrow();
        expect(scene.children.length).toBeGreaterThan(0);
      });

      if (gen.styles) {
        it('should support all styles', () => {
          gen.styles.forEach(function(style) {
            var scene = new THREE.Scene();
            expect(function() {
              GAME._props[gen.name](scene, 0, 0, 0, { style: style, seed: 1 });
            }).not.toThrow();
          });
        });
      }

      it('should use non-box geometry for organic shapes', () => {
        var scene = new THREE.Scene();
        if (gen.name === 'Vine') {
          GAME._props.Vine(scene, 0, 5, 0, 3, 3, 0, { seed: 1 });
        } else {
          GAME._props[gen.name](scene, 0, 0, 0, { seed: 1 });
        }
        var hasNonBox = false;
        scene.traverse(function(child) {
          if (child.geometry && child.geometry.type !== 'BoxGeometry') {
            hasNonBox = true;
          }
        });
        expect(hasNonBox).toBe(true);
      });
    });
  });
});

describe('Rock & terrain generators', () => {
  describe('Rock generator', () => {
    it('should be a function', () => {
      expect(typeof GAME._props.Rock).toBe('function');
    });

    it('should add to scene and walls when collidable', () => {
      var scene = new THREE.Scene();
      var walls = [];
      GAME._props.Rock(scene, walls, 0, 0, 0, { style: 'rough', seed: 1 });
      expect(scene.children.length).toBeGreaterThan(0);
      expect(walls.length).toBeGreaterThan(0);
    });

    it('should support all 3 styles', () => {
      ['rough', 'mossy', 'sandstone'].forEach(function(style) {
        var scene = new THREE.Scene();
        expect(function() {
          GAME._props.Rock(scene, [], 0, 0, 0, { style: style, seed: 1 });
        }).not.toThrow();
      });
    });

    it('should use IcosahedronGeometry not BoxGeometry', () => {
      var scene = new THREE.Scene();
      GAME._props.Rock(scene, [], 0, 0, 0, { style: 'rough', seed: 1 });
      var hasIco = false;
      scene.traverse(function(child) {
        if (child.geometry && child.geometry.type === 'IcosahedronGeometry') {
          hasIco = true;
        }
      });
      expect(hasIco).toBe(true);
    });
  });

  describe('RockCluster generator', () => {
    it('should be a function', () => {
      expect(typeof GAME._props.RockCluster).toBe('function');
    });

    it('should create multiple rocks', () => {
      var scene = new THREE.Scene();
      var walls = [];
      GAME._props.RockCluster(scene, walls, 0, 0, 0, { seed: 1 });
      var meshCount = 0;
      scene.traverse(function(child) {
        if (child.geometry) meshCount++;
      });
      expect(meshCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Rubble generator', () => {
    it('should be a function', () => {
      expect(typeof GAME._props.Rubble).toBe('function');
    });

    it('should add debris to scene', () => {
      var scene = new THREE.Scene();
      GAME._props.Rubble(scene, 0, 0, 0, { seed: 1 });
      expect(scene.children.length).toBeGreaterThan(0);
    });
  });

  describe('MossPatches generator', () => {
    it('should be a function', () => {
      expect(typeof GAME._props.MossPatches).toBe('function');
    });

    it('should add patches to scene', () => {
      var scene = new THREE.Scene();
      GAME._props.MossPatches(scene, 0, 0, 0, { seed: 1 });
      expect(scene.children.length).toBeGreaterThan(0);
    });
  });
});

describe('Container generators', () => {
  ['Barrel', 'Crate'].forEach(function(name) {
    describe(name + ' generator (collidable)', () => {
      it('should be a function', () => {
        expect(typeof GAME._props[name]).toBe('function');
      });

      it('should add objects to scene', () => {
        var scene = new THREE.Scene();
        var walls = [];
        GAME._props[name](scene, walls, 0, 0, 0, { seed: 1 });
        expect(scene.children.length).toBeGreaterThan(0);
      });

      it('should add collision mesh to walls', () => {
        var scene = new THREE.Scene();
        var walls = [];
        GAME._props[name](scene, walls, 0, 0, 0, { seed: 1 });
        expect(walls.length).toBeGreaterThan(0);
      });
    });
  });

  ['Sack', 'WineCask', 'Pallet'].forEach(function(name) {
    describe(name + ' generator (decoration)', () => {
      it('should be a function', () => {
        expect(typeof GAME._props[name]).toBe('function');
      });

      it('should add objects to scene', () => {
        var scene = new THREE.Scene();
        GAME._props[name](scene, 0, 0, 0, { seed: 1 });
        expect(scene.children.length).toBeGreaterThan(0);
      });
    });
  });

  it('Barrel should support metal, wood, tipped styles', () => {
    ['metal', 'wood', 'tipped'].forEach(function(style) {
      var scene = new THREE.Scene();
      expect(function() {
        GAME._props.Barrel(scene, [], 0, 0, 0, { style: style, seed: 1 });
      }).not.toThrow();
    });
  });

  it('Barrel should use LatheGeometry', () => {
    var scene = new THREE.Scene();
    GAME._props.Barrel(scene, [], 0, 0, 0, { style: 'metal', seed: 1 });
    var hasLathe = false;
    scene.traverse(function(child) {
      if (child.geometry && child.geometry.type === 'LatheGeometry') {
        hasLathe = true;
      }
    });
    expect(hasLathe).toBe(true);
  });

  it('Crate should support wood, military, shipping styles', () => {
    ['wood', 'military', 'shipping'].forEach(function(style) {
      var scene = new THREE.Scene();
      expect(function() {
        GAME._props.Crate(scene, [], 0, 0, 0, { style: style, seed: 1 });
      }).not.toThrow();
    });
  });

  it('Crate should have more than 1 mesh (edge trim detail)', () => {
    var scene = new THREE.Scene();
    GAME._props.Crate(scene, [], 0, 0, 0, { style: 'wood', seed: 1 });
    var meshCount = 0;
    scene.traverse(function(child) {
      if (child.geometry) meshCount++;
    });
    expect(meshCount).toBeGreaterThan(1);
  });
});
