import { describe, it, expect, beforeAll } from 'vitest';
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
});

describe('tier-gating cross-map invariants', () => {
  var mapNames = ['Dust', 'Office', 'Warehouse', 'Bloodstrike', 'Italy', 'Aztec', 'Arena'];

  mapNames.forEach(function(name, index) {
    it(name + ': wall count is identical across all quality levels', function() {
      var perLevelCounts = {};
      [0, 1, 2, 3, 4, 5].forEach(function(level) {
        GAME.quality = { level: level };
        var scene = new THREE.Scene();
        var origScene = GAME.scene;
        GAME.scene = scene;
        var walls = GAME._maps[index].build(scene);
        if (GAME._reapplyAllTierVisibility) GAME._reapplyAllTierVisibility();
        GAME.scene = origScene;
        perLevelCounts[level] = (walls || []).length;
      });
      var counts = Object.keys(perLevelCounts).map(function(k) { return perLevelCounts[k]; });
      var first = counts[0];
      counts.forEach(function(c) { expect(c).toBe(first); });
    });

    it(name + ': tier-gated groups (if any) toggle visibility on level change', function() {
      GAME.quality = { level: 5 };
      var scene = new THREE.Scene();
      GAME._maps[index].build(scene);

      var gatedGroups = [];
      var gatedLights = [];
      scene.traverse(function(o) {
        if (!o.userData || o.userData.minQualityLevel == null) return;
        if (o.isLight) {
          gatedLights.push({ light: o, origIntensity: o.userData._origIntensity });
        } else if (o.userData._tierMaterialSwap) {
          // Material-swap meshes stay visible at all tiers; their material
          // toggles instead. Covered by tier-gated-decor-high.test.js.
        } else {
          gatedGroups.push(o);
        }
      });

      if (gatedGroups.length === 0 && gatedLights.length === 0) return;

      var origScene = GAME.scene;
      GAME.scene = scene;

      GAME.quality.level = 0;
      GAME._reapplyAllTierVisibility();
      gatedGroups.forEach(function(g) { expect(g.visible).toBe(false); });
      gatedLights.forEach(function(g) { expect(g.light.intensity).toBe(0); });

      GAME.quality.level = 5;
      GAME._reapplyAllTierVisibility();
      gatedGroups.forEach(function(g) { expect(g.visible).toBe(true); });
      gatedLights.forEach(function(g) { expect(g.light.intensity).toBe(g.origIntensity); });

      GAME.scene = origScene;
    });
  });
});
