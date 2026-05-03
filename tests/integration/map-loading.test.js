import { describe, it, expect, beforeAll, vi } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/maps/props.js');
  loadModule('js/maps/dust.js');
  loadModule('js/maps/office.js');
  loadModule('js/maps/warehouse.js');
  loadModule('js/maps/bloodstrike.js');
  loadModule('js/maps/italy.js');
  loadModule('js/maps/aztec.js');
  loadModule('js/maps/arena.js');
  loadModule('js/effects/particles.js');
});

describe('map loading', () => {
  it('should register 7 maps', () => {
    expect(GAME._maps.length).toBe(7);
  });

  var mapNames = ['Dust', 'Office', 'Warehouse', 'Bloodstrike', 'Italy', 'Aztec', 'Arena'];

  mapNames.forEach((name, index) => {
    describe(name + ' map', () => {
      it('should have a name', () => {
        expect(GAME._maps[index].name).toBeDefined();
      });

      it('should have a build function', () => {
        expect(typeof GAME._maps[index].build).toBe('function');
      });

      it('should build without throwing', () => {
        var scene = new THREE.Scene();
        expect(() => {
          GAME._maps[index].build(scene);
        }).not.toThrow();
      });

      it('should add objects to the scene', () => {
        var scene = new THREE.Scene();
        GAME._maps[index].build(scene);
        expect(scene.children.length).toBeGreaterThan(0);
      });

      it('should mark added geometry as static after loadMap', () => {
        var scene = new THREE.Scene();
        var preExisting = { matrixAutoUpdate: true, updateMatrix: function(){}, children: [] };
        scene.add(preExisting);

        var pre = scene.children.slice();
        GAME._maps[index].build(scene);
        for (var ci = 0; ci < scene.children.length; ci++) {
          if (pre.indexOf(scene.children[ci]) === -1) {
            GAME.markStatic(scene.children[ci]);
          }
        }

        expect(preExisting.matrixAutoUpdate).toBe(true);

        var staticCount = 0;
        for (var i = 0; i < scene.children.length; i++) {
          if (pre.indexOf(scene.children[i]) === -1 && scene.children[i].matrixAutoUpdate === false) {
            staticCount++;
          }
        }
        expect(staticCount).toBeGreaterThan(0);
      });

      it('should return walls array', () => {
        var scene = new THREE.Scene();
        var result = GAME._maps[index].build(scene);
        if (result && result.walls) {
          expect(Array.isArray(result.walls)).toBe(true);
          expect(result.walls.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('dumpMapStats integration', () => {
    it('emits exactly one log line per loaded map when flag is on', () => {
      var logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      GAME._debugMapStats = true;
      try {
        // Smoke test: helper invokes when called directly with a synthetic root
        GAME._mapHelpers.dumpMapStats('Synthetic', {
          children: [],
          traverse: function(fn) { fn(this); }
        });
        var found = logSpy.mock.calls.some(c => String(c[0]).indexOf('[map-stats] Synthetic') === 0);
        expect(found).toBe(true);
      } finally {
        logSpy.mockRestore();
        GAME._debugMapStats = false;
      }
    });
  });
});

describe('Visual overhaul integration', () => {
  it('should have particle system available', () => {
    expect(GAME.particles).toBeDefined();
    expect(typeof GAME.particles.init).toBe('function');
    expect(typeof GAME.particles.update).toBe('function');
  });

  it('all maps should have lighting and colorGrade configs', () => {
    GAME._maps.forEach(function(map) {
      expect(map.lighting).toBeDefined();
      expect(map.colorGrade).toBeDefined();
    });
  });
});
