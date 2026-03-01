import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/maps/dust.js');
  loadModule('js/maps/office.js');
  loadModule('js/maps/warehouse.js');
  loadModule('js/maps/bloodstrike.js');
  loadModule('js/maps/italy.js');
  loadModule('js/maps/aztec.js');
});

describe('map loading', () => {
  it('should register 6 maps', () => {
    expect(GAME._maps.length).toBe(6);
  });

  var mapNames = ['Dust', 'Office', 'Warehouse', 'Bloodstrike', 'Italy', 'Aztec'];

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
});
