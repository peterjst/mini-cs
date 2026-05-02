// Regression: every Mesh added by a map build must have a real THREE.Material
// (or array of them) as its .material. Function references slipped in via
// helper-fallback typos (e.g. `darkMetalMat` instead of `darkMetalMat()`)
// crash renderer.compile with "customProgramCacheKey is not a function" and
// leave the game stuck on the menu camera flythrough.
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

// A real Three.js material always has a string `type` like "MeshStandardMaterial".
// The bug we're catching: a material-factory function or other non-material
// object passed where a material instance was meant.
function isMaterialLike(m) {
  return m !== null && m !== undefined && typeof m === 'object' && typeof m.type === 'string';
}

function collectBadMaterials(scene) {
  var bad = [];
  scene.traverse(function(obj) {
    if (!obj.isMesh) return;
    var m = obj.material;
    if (m === null || m === undefined) {
      bad.push(describeBad(obj, 'material is ' + m));
      return;
    }
    if (Array.isArray(m)) {
      for (var i = 0; i < m.length; i++) {
        if (!isMaterialLike(m[i])) {
          bad.push(describeBad(obj, 'material[' + i + '] is ' + valueDesc(m[i])));
        }
      }
      return;
    }
    if (!isMaterialLike(m)) {
      bad.push(describeBad(obj, 'material is ' + valueDesc(m)));
    }
  });
  return bad;
}

function valueDesc(v) {
  if (typeof v === 'function') return 'a function (' + (v.name || 'anon') + ') — likely a missing () on a material factory';
  return typeof v + ' (' + Object.prototype.toString.call(v) + ')';
}

function describeBad(obj, reason) {
  var pos = obj.position ? [obj.position.x, obj.position.y, obj.position.z].join(',') : '?,?,?';
  return reason + ' on ' + (obj.geometry ? obj.geometry.type : 'no-geo') + ' at ' + pos;
}

describe('All map meshes have valid Material instances', () => {
  var mapNames = ['Dust', 'Office', 'Warehouse', 'Bloodstrike', 'Italy', 'Aztec', 'Arena'];

  mapNames.forEach((name, index) => {
    it(name + ': every Mesh.material is a THREE.Material', () => {
      var scene = new THREE.Scene();
      GAME._maps[index].build(scene);
      var bad = collectBadMaterials(scene);
      expect(bad).toEqual([]);
    });
  });
});
