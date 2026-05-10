// tests/integration/tier-gated-lights.test.js
import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/core/quality.js');
  loadModule('js/maps/shared.js');
  loadModule('js/maps/props.js');
  loadModule('js/maps/office.js');
  loadModule('js/maps/warehouse.js');
});

// Indoor maps may use dynamic point lights (per docs/gotchas.md #8), but the
// 2026-05-10 spec gates every Office and Warehouse PointLight to level 4 so
// that Medium-and-below loses the per-fragment light-loop cost.
describe('indoor map dynamic point lights are tier-gated at level 4', () => {
  ['Office', 'Warehouse'].forEach(function(name) {
    it(name + ': every PointLight has userData.minQualityLevel === 4', function() {
      var idx = -1;
      for (var i = 0; i < GAME._maps.length; i++) {
        if (GAME._maps[i].name === name) { idx = i; break; }
      }
      expect(idx).toBeGreaterThanOrEqual(0);

      GAME.quality = { level: 5 };
      var scene = new THREE.Scene();
      var origScene = GAME.scene;
      GAME.scene = scene;
      GAME._maps[idx].build(scene);
      GAME.scene = origScene;

      var pointLights = [];
      scene.traverse(function(o) {
        if (o.isLight && typeof o.distance === 'number') {
          pointLights.push(o);
        }
      });

      expect(pointLights.length).toBeGreaterThan(0);
      pointLights.forEach(function(pl) {
        expect(pl.userData && pl.userData.minQualityLevel).toBe(4);
      });
    });
  });
});
