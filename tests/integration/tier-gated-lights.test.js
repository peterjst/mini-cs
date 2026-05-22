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

// Indoor maps may use dynamic point lights (per docs/gotchas.md #8). The
// gating-via-intensity=0 approach (tierGatedLight) does NOT actually remove
// per-fragment shader cost on Windows ANGLE — NUM_POINT_LIGHTS stays baked
// in the program. So indoor maps either need to truly add/remove lights
// across tier transitions (with paired shader warmup) or skip dynamic
// lights entirely. Office is now emissive-only (zero PointLights);
// Warehouse still uses the older tierGatedLight approach.
function buildMapByName(name) {
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
    if (o.isLight && typeof o.distance === 'number') pointLights.push(o);
  });
  return pointLights;
}

describe('indoor map dynamic point lights', () => {
  it('Office: emissive-only (no PointLights). Removed 2026-05-22 because intensity=0 gating did not reclaim ANGLE per-fragment cost.', function() {
    expect(buildMapByName('Office').length).toBe(0);
  });

  it('Warehouse: every PointLight tier-gated to level 4', function() {
    var pointLights = buildMapByName('Warehouse');
    expect(pointLights.length).toBeGreaterThan(0);
    pointLights.forEach(function(pl) {
      expect(pl.userData && pl.userData.minQualityLevel).toBe(4);
    });
  });
});
