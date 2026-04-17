import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/maps/props.js');
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

describe('Surface detail helpers', () => {
  describe('WallRelief', () => {
    it('should be a function on _mapHelpers', () => {
      expect(typeof GAME._mapHelpers.WallRelief).toBe('function');
    });

    it('should add geometry to scene for all styles', () => {
      ['brick', 'stone', 'plaster_crack', 'panel'].forEach(function(style) {
        var scene = new THREE.Scene();
        var before = scene.children.length;
        GAME._mapHelpers.WallRelief(scene, 4, 3, 0.5, {}, 0, 1.5, 0, { style: style });
        expect(scene.children.length).toBeGreaterThan(before);
      });
    });
  });

  describe('FloorDetail', () => {
    it('should be a function on _mapHelpers', () => {
      expect(typeof GAME._mapHelpers.FloorDetail).toBe('function');
    });

    it('should add geometry to scene for all styles', () => {
      ['cracked_tile', 'worn_plank', 'cobblestone'].forEach(function(style) {
        var scene = new THREE.Scene();
        var before = scene.children.length;
        GAME._mapHelpers.FloorDetail(scene, 4, 4, {}, 0, 0, 0, { style: style });
        expect(scene.children.length).toBeGreaterThan(before);
      });
    });

    it('should support elevated y position for upper floors', () => {
      var scene = new THREE.Scene();
      GAME._mapHelpers.FloorDetail(scene, 4, 4, {}, 0, 5, 0, { style: 'worn_plank' });
      expect(scene.children.length).toBeGreaterThan(0);
    });
  });

  describe('CeilingDetail', () => {
    it('should be a function on _mapHelpers', () => {
      expect(typeof GAME._mapHelpers.CeilingDetail).toBe('function');
    });

    it('should add geometry to scene for all styles', () => {
      ['beams', 'pipes', 'panels'].forEach(function(style) {
        var scene = new THREE.Scene();
        var before = scene.children.length;
        GAME._mapHelpers.CeilingDetail(scene, 4, 4, {}, 0, 3, 0, { style: style });
        expect(scene.children.length).toBeGreaterThan(before);
      });
    });
  });

  describe('Geometry merging (draw call reduction)', () => {
    it('WallRelief brick should produce a single merged mesh per group, not one per brick', () => {
      var scene = new THREE.Scene();
      // 4m wide wall would have ~15 cols × ~25 rows = ~375 bricks without merging
      GAME._mapHelpers.WallRelief(scene, 4, 3, 0.5, {}, 0, 1.5, 0, { style: 'brick' });
      var group = scene.children[scene.children.length - 1];
      // Should have exactly 1 merged mesh, not hundreds of individual bricks
      expect(group.children.length).toBe(1);
    });

    it('WallRelief stone should produce a single merged mesh', () => {
      var scene = new THREE.Scene();
      GAME._mapHelpers.WallRelief(scene, 4, 3, 0.5, {}, 0, 1.5, 0, { style: 'stone' });
      var group = scene.children[scene.children.length - 1];
      expect(group.children.length).toBe(1);
    });

    it('WallRelief panel should produce a single merged mesh', () => {
      var scene = new THREE.Scene();
      GAME._mapHelpers.WallRelief(scene, 4, 3, 0.5, {}, 0, 1.5, 0, { style: 'panel' });
      var group = scene.children[scene.children.length - 1];
      expect(group.children.length).toBe(1);
    });

    it('FloorDetail cracked_tile should produce a single merged mesh', () => {
      var scene = new THREE.Scene();
      GAME._mapHelpers.FloorDetail(scene, 4, 4, {}, 0, 0, 0, { style: 'cracked_tile' });
      var group = scene.children[scene.children.length - 1];
      expect(group.children.length).toBe(1);
    });

    it('FloorDetail cobblestone should produce a single merged mesh', () => {
      var scene = new THREE.Scene();
      GAME._mapHelpers.FloorDetail(scene, 8, 8, {}, 0, 0, 0, { style: 'cobblestone' });
      var group = scene.children[scene.children.length - 1];
      expect(group.children.length).toBe(1);
    });

    it('CeilingDetail beams should produce a single merged mesh', () => {
      var scene = new THREE.Scene();
      GAME._mapHelpers.CeilingDetail(scene, 4, 4, {}, 0, 3, 0, { style: 'beams' });
      var group = scene.children[scene.children.length - 1];
      expect(group.children.length).toBe(1);
    });

    it('CeilingDetail panels should produce a single merged mesh', () => {
      var scene = new THREE.Scene();
      GAME._mapHelpers.CeilingDetail(scene, 4, 4, {}, 0, 3, 0, { style: 'panels' });
      var group = scene.children[scene.children.length - 1];
      expect(group.children.length).toBe(1);
    });

    it('CeilingDetail pipes should produce a single merged mesh', () => {
      var scene = new THREE.Scene();
      GAME._mapHelpers.CeilingDetail(scene, 4, 4, {}, 0, 3, 0, { style: 'pipes' });
      var group = scene.children[scene.children.length - 1];
      expect(group.children.length).toBe(1);
    });
  });
});

describe('Map lighting configs', () => {
  beforeAll(() => {
    loadModule('js/maps/dust.js');
    loadModule('js/maps/office.js');
    loadModule('js/maps/warehouse.js');
    loadModule('js/maps/bloodstrike.js');
    loadModule('js/maps/italy.js');
    loadModule('js/maps/aztec.js');
    loadModule('js/maps/arena.js');
  });

  it('every map should have a lighting config', () => {
    GAME._maps.forEach(function(map) {
      expect(map.lighting).toBeDefined();
      expect(typeof map.lighting.sunColor).toBe('number');
      expect(typeof map.lighting.sunIntensity).toBe('number');
      expect(map.lighting.sunPos).toHaveLength(3);
      expect(typeof map.lighting.fillColor).toBe('number');
      expect(typeof map.lighting.fillIntensity).toBe('number');
      expect(typeof map.lighting.ambientIntensity).toBe('number');
      expect(typeof map.lighting.hemiSkyColor).toBe('number');
      expect(typeof map.lighting.hemiGroundColor).toBe('number');
      expect(typeof map.lighting.hemiIntensity).toBe('number');
      expect(typeof map.lighting.shadowFrustumPadding).toBe('number');
    });
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

describe('Aztec structural changes', () => {
  beforeAll(() => {
    // Maps already loaded by prior beforeAll blocks
  });

  it('should build Aztec without throwing', () => {
    var scene = new THREE.Scene();
    var aztec = GAME._maps.find(m => m.name === 'Aztec');
    expect(() => aztec.build(scene)).not.toThrow();
  });

  it('should return walls with overpass bridge collidables', () => {
    var scene = new THREE.Scene();
    var aztec = GAME._maps.find(m => m.name === 'Aztec');
    var walls = aztec.build(scene);
    expect(Array.isArray(walls)).toBe(true);
    // More walls than before due to bridge walkway, parapets, ramp, drop-down
    expect(walls.length).toBeGreaterThan(30);
  });

  it('should have waypoints for elevated route', () => {
    var aztec = GAME._maps.find(m => m.name === 'Aztec');
    // Should have more waypoints than the original 14
    expect(aztec.waypoints.length).toBeGreaterThan(14);
  });
});

describe('Italy structural changes', () => {
  beforeAll(() => {
    // Maps already loaded by prior beforeAll blocks
  });

  it('should build Italy without throwing', () => {
    var scene = new THREE.Scene();
    var italy = GAME._maps.find(m => m.name === 'Italy');
    expect(() => italy.build(scene)).not.toThrow();
  });

  it('should return walls with 2nd floor furniture collidables', () => {
    var scene = new THREE.Scene();
    var italy = GAME._maps.find(m => m.name === 'Italy');
    var walls = italy.build(scene);
    expect(Array.isArray(walls)).toBe(true);
    // More walls than before due to furniture, window sills, partition
    expect(walls.length).toBeGreaterThan(40);
  });

  it('should have waypoints on 2nd floors', () => {
    var italy = GAME._maps.find(m => m.name === 'Italy');
    // Should have more waypoints than original 20
    expect(italy.waypoints.length).toBeGreaterThan(20);
  });
});

describe('Italy realism', () => {
  it('should build Italy without throwing after facade additions', () => {
    var scene = new THREE.Scene();
    var italy = GAME._maps.find(m => m.name === 'Italy');
    expect(() => italy.build(scene)).not.toThrow();
  });
});

describe('Office realism', () => {
  it('should build Office without throwing after realism additions', () => {
    var scene = new THREE.Scene();
    var office = GAME._maps.find(m => m.name === 'Office');
    expect(() => office.build(scene)).not.toThrow();
  });
});

describe('Aztec realism', () => {
  it('should build Aztec without throwing after realism additions', () => {
    var scene = new THREE.Scene();
    var aztec = GAME._maps.find(m => m.name === 'Aztec');
    expect(() => aztec.build(scene)).not.toThrow();
  });
});

describe('Italy building accessibility', () => {
  it('should have a doorway gap in Building B south wall so bots are not trapped', () => {
    var scene = new THREE.Scene();
    var italy = GAME._maps.find(m => m.name === 'Italy');
    var walls = italy.build(scene);
    // Building B south wall at z=5, x spans 10..22
    // There should be a gap (doorway) around x=14..18
    // Check that no single collidable wall covers the full south span at z≈5
    var southWalls = walls.filter(function(w) {
      var pos = w.position;
      var geo = w.geometry.parameters;
      // Wall at z≈5, thin (depth < 1), spanning Building B's x range
      return Math.abs(pos.z - 5) < 0.5 && geo.depth < 1 && geo.width >= 10 && pos.x > 9 && pos.x < 23 && pos.y < 3;
    });
    // No single ground-floor wall should cover the full 12-unit width (that blocks the doorway)
    expect(southWalls.length).toBe(0);
  });

  it('should have two ground-floor south wall segments creating a doorway in Building B', () => {
    var scene = new THREE.Scene();
    var italy = GAME._maps.find(m => m.name === 'Italy');
    var walls = italy.build(scene);
    // Two wall segments at z≈5 within Building B x-range, ground floor (y < 3)
    var segments = walls.filter(function(w) {
      var pos = w.position;
      var geo = w.geometry.parameters;
      return Math.abs(pos.z - 5) < 0.5 && geo.depth < 1 && geo.width < 6 && pos.x > 9 && pos.x < 23 && pos.y < 3;
    });
    expect(segments.length).toBe(2);
  });
});

describe('Bloodstrike structural changes', () => {
  beforeAll(() => {
    // Maps already loaded by prior beforeAll blocks
  });

  it('should build Bloodstrike without throwing', () => {
    var scene = new THREE.Scene();
    var bloodstrike = GAME._maps.find(m => m.name === 'Bloodstrike');
    expect(() => bloodstrike.build(scene)).not.toThrow();
  });

  it('should return walls array with collidable objects', () => {
    var scene = new THREE.Scene();
    var bloodstrike = GAME._maps.find(m => m.name === 'Bloodstrike');
    var walls = bloodstrike.build(scene);
    expect(Array.isArray(walls)).toBe(true);
    expect(walls.length).toBeGreaterThan(0);
  });

  it('should have updated waypoints without NE/SW platform waypoints', () => {
    var bloodstrike = GAME._maps.find(m => m.name === 'Bloodstrike');
    var hasNE = bloodstrike.waypoints.some(w => w.x === 26 && w.z === -18);
    var hasSW = bloodstrike.waypoints.some(w => w.x === -26 && w.z === 18);
    expect(hasNE).toBe(false);
    expect(hasSW).toBe(false);
  });
});

describe('spawnZones', () => {
  beforeAll(() => {
    loadModule('js/maps/dust.js');
    loadModule('js/maps/office.js');
    loadModule('js/maps/warehouse.js');
    loadModule('js/maps/bloodstrike.js');
    loadModule('js/maps/italy.js');
    loadModule('js/maps/aztec.js');
    loadModule('js/maps/arena.js');
  });

  it('every map should have a spawnZones array with at least 3 zones', () => {
    expect(GAME._maps.length).toBeGreaterThanOrEqual(7);
    GAME._maps.forEach(function(map) {
      expect(map.spawnZones, 'spawnZones missing on ' + map.name).toBeDefined();
      expect(Array.isArray(map.spawnZones)).toBe(true);
      expect(map.spawnZones.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('each zone should have x, z, radius, and valid label', () => {
    GAME._maps.forEach(function(map) {
      map.spawnZones.forEach(function(zone) {
        expect(typeof zone.x).toBe('number');
        expect(typeof zone.z).toBe('number');
        expect(typeof zone.radius).toBe('number');
        expect(zone.radius).toBeGreaterThan(0);
        expect(['ct', 't', 'mid']).toContain(zone.label);
      });
    });
  });

  it('each map should have exactly one ct, one t, and one mid zone', () => {
    GAME._maps.forEach(function(map) {
      var labels = map.spawnZones.map(function(z) { return z.label; });
      expect(labels.filter(function(l) { return l === 'ct'; }).length,
        map.name + ' should have exactly 1 ct zone').toBe(1);
      expect(labels.filter(function(l) { return l === 't'; }).length,
        map.name + ' should have exactly 1 t zone').toBe(1);
      expect(labels.filter(function(l) { return l === 'mid'; }).length,
        map.name + ' should have exactly 1 mid zone').toBe(1);
    });
  });

  it('buildMap result should expose spawnZones from map definition', () => {
    for (var i = 0; i < GAME._maps.length; i++) {
      var built = GAME.buildMap(new THREE.Scene(), i);
      expect(built.spawnZones).toBe(GAME._maps[i].spawnZones);
    }
  });
});
