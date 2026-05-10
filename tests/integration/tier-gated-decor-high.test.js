// tests/integration/tier-gated-decor-high.test.js
import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/core/quality.js');
  loadModule('js/maps/shared.js');
  loadModule('js/maps/props.js');
  loadModule('js/maps/aztec.js');
  loadModule('js/maps/office.js');
  loadModule('js/maps/warehouse.js');
});

// The three maps in scope for the 2026-05-10 spec must each declare a top-level
// Group with userData.minQualityLevel === 4 — the "decorHigh" gate that hides
// expensive decoration at Medium and below.
describe('decorHigh tier-gating: Aztec / Office / Warehouse', () => {
  var maps = ['Aztec', 'Office', 'Warehouse'];

  function buildMap(name) {
    var idx = -1;
    for (var i = 0; i < GAME._maps.length; i++) {
      if (GAME._maps[i].name === name) { idx = i; break; }
    }
    expect(idx).toBeGreaterThanOrEqual(0);
    GAME.quality = { level: 5 };
    var scene = new THREE.Scene();
    var origScene = GAME.scene;
    GAME.scene = scene;
    var walls = GAME._maps[idx].build(scene);
    GAME.scene = origScene;
    return { scene: scene, walls: walls };
  }

  function findDecorHighGroups(scene) {
    var found = [];
    scene.traverse(function(o) {
      if (o.userData && o.userData.minQualityLevel === 4 && !o.isLight && !o.userData._tierMaterialSwap) {
        found.push(o);
      }
    });
    return found;
  }

  maps.forEach(function(name) {
    it(name + ': has at least one Group gated at level 4', function() {
      var built = buildMap(name);
      var groups = findDecorHighGroups(built.scene);
      expect(groups.length).toBeGreaterThan(0);
    });

    it(name + ': decorHigh group contains no meshes from the walls[] array', function() {
      var built = buildMap(name);
      var groups = findDecorHighGroups(built.scene);
      var wallSet = new Set(built.walls);
      groups.forEach(function(g) {
        g.traverse(function(o) {
          expect(wallSet.has(o)).toBe(false);
        });
      });
    });

    it(name + ': decorHigh group is non-empty', function() {
      var built = buildMap(name);
      var groups = findDecorHighGroups(built.scene);
      var totalChildren = 0;
      groups.forEach(function(g) { totalChildren += g.children.length; });
      expect(totalChildren).toBeGreaterThan(5);
    });
  });
});

describe('Aztec river water uses tierGatedMaterial', () => {
  it('water mesh has _tierMaterialSwap set, gated at level 4, with distinct origin/low materials', () => {
    var idx = -1;
    for (var i = 0; i < GAME._maps.length; i++) {
      if (GAME._maps[i].name === 'Aztec') { idx = i; break; }
    }
    expect(idx).toBeGreaterThanOrEqual(0);

    GAME.quality = { level: 5 };
    var scene = new THREE.Scene();
    var origScene = GAME.scene;
    GAME.scene = scene;
    GAME._maps[idx].build(scene);
    GAME.scene = origScene;

    var water = null;
    scene.traverse(function(o) {
      if (o.userData && o.userData._tierMaterialSwap) water = o;
    });

    expect(water).not.toBeNull();
    expect(water.userData.minQualityLevel).toBe(4);
    expect(water.userData._origMaterial).not.toBe(water.userData._lowMaterial);
    expect(water.userData._origMaterial).toBeTruthy();
    expect(water.userData._lowMaterial).toBeTruthy();
  });
});
