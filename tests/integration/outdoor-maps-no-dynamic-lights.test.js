// tests/integration/outdoor-maps-no-dynamic-lights.test.js
import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/core/quality.js');
  loadModule('js/maps/shared.js');
  loadModule('js/maps/props.js');
  loadModule('js/maps/aztec.js');
  loadModule('js/maps/italy.js');
  loadModule('js/maps/bloodstrike.js');
});

describe('outdoor maps must not add dynamic point lights', () => {
  // Aztec, Italy, Bloodstrike are outdoor maps. Their sun + hemi + ambient
  // global illumination is sufficient; dynamic point lights cost per-fragment
  // shader work on every lit surface for negligible visible benefit.
  // See: docs/superpowers/specs/2026-05-08-perf-permanent-cuts-design.md
  var outdoorMaps = ['Aztec', 'Italy', 'Bloodstrike'];

  outdoorMaps.forEach(function(name) {
    it(name + ' has no PointLights in its built scene', function() {
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

      var pointLightCount = 0;
      scene.traverse(function(o) {
        // The mock THREE.PointLight in tests/setup.js sets .isLight = true and
        // identifies the light type via constructor; we count by checking that
        // the object is a light AND has a distance property (only PointLight
        // and SpotLight expose distance; outdoor maps shouldn't add either).
        if (o.isLight && typeof o.distance === 'number') {
          pointLightCount++;
        }
      });

      expect(pointLightCount).toBe(0);
    });
  });
});
