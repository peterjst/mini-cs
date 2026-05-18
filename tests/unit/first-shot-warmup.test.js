// Regression: the first muzzle flash and first wall impact used to cause
// multi-100ms hitches that the adaptive quality system then misread as real
// perf drops, false-firing downgrades and producing a Ultra→Medium→… cascade
// the user perceived as "every time quality changes, performance drops,
// especially when the first shot fires."
//
// Two root causes had to be fixed together for the cascade to stop:
//   1. Combat point-lights flipping visible:false→true changed the scene's
//      NUM_POINT_LIGHTS, which bakes into shader program keys — recompiling
//      every shadow-receiving material on first shot.
//   2. effects.js bullet-hole / impact-dust / footstep-dust pools were
//      lazy-allocated on first impact, adding ~80 unwarmed meshes to the
//      scene in a single frame.
//
// These tests pin both fixes so we don't regress.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

describe('Combat-light visibility (first-shot hitch fix)', () => {
  var scene;

  beforeAll(() => {
    globalThis.GAME = {};
    loadModule('js/maps/shared.js');
    loadModule('js/effects/particles.js');
    scene = new THREE.Scene();
    GAME.particles.init(scene);
  });

  it('all combat lights are visible after init so warmup compiles the +N point-light program', () => {
    // Mirrors enemies.js _flashPool pattern: always-visible, intensity 0
    // when inactive. The prior visible:false flip-on triggered Three.js to
    // rebuild every shadow-receiving material's program on first muzzle flash.
    var lights = scene.children.filter(function(c) { return c.isLight; });
    expect(lights.length).toBeGreaterThanOrEqual(3);
    lights.forEach(function(l) {
      expect(l.visible).toBe(true);
    });
  });

  it('spawnCombatLight does not flip light.visible (it modulates intensity instead)', () => {
    var lights = scene.children.filter(function(c) { return c.isLight; });
    var before = lights.map(function(l) { return l.visible; });
    GAME.particles.spawnCombatLight(new THREE.Vector3(0, 2, 0), 0xff6600, 10, 0.1);
    var after = lights.map(function(l) { return l.visible; });
    expect(after).toEqual(before);
  });

  it('decayed combat light drops intensity to 0 but stays visible', () => {
    GAME.particles.spawnCombatLight(new THREE.Vector3(0, 2, 0), 0xff6600, 10, 0.05);
    GAME.particles.update(0.1); // > maxLife → should deactivate
    var lights = scene.children.filter(function(c) { return c.isLight; });
    lights.forEach(function(l) { expect(l.visible).toBe(true); });
    // At least one should be back to intensity 0 (the one we just expired)
    var zeroIntensity = lights.filter(function(l) { return l.intensity === 0; });
    expect(zeroIntensity.length).toBeGreaterThanOrEqual(1);
  });
});

describe('effects.js pool eager init (first-shot hitch fix)', () => {
  var scene;

  beforeAll(() => {
    globalThis.GAME = {};
    GAME.dom = { bloodSplatter: { style: { opacity: 0 } } };
    loadModule('js/effects/effects.js');
    scene = new THREE.Scene();
    GAME.scene = scene;
    GAME.effects.init(scene);
  });

  it('exposes init and dispose so per-map lifecycle mirrors GAME.particles', () => {
    expect(typeof GAME.effects.init).toBe('function');
    expect(typeof GAME.effects.dispose).toBe('function');
  });

  it('bullet-hole pool meshes are in the scene after init (so warmup compiles their material)', () => {
    // The prior lazy _initBulletHolePool ran on first GAME.spawnBulletHole
    // call, adding 60 meshes mid-game and forcing a shader compile on the
    // next render. They must now be present before _warmUpShaders runs.
    var meshes = scene.children.filter(function(c) {
      return c.material && c.material.type === 'MeshBasicMaterial' && c.material.polygonOffset === true;
    });
    expect(meshes.length).toBe(60);
  });

  it('impact-dust and footstep-dust pools are in the scene after init', () => {
    var allBasicMeshes = scene.children.filter(function(c) {
      return c.material && c.material.type === 'MeshBasicMaterial';
    });
    // 60 bullet holes + 20 impact dust + 12 footstep dust = 92
    expect(allBasicMeshes.length).toBeGreaterThanOrEqual(92);
  });

  it('spawnImpactDust reuses pool meshes without adding new ones to the scene', () => {
    var sceneChildrenBefore = scene.children.length;
    GAME.spawnImpactDust(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), 0x888888);
    expect(scene.children.length).toBe(sceneChildrenBefore);
  });

  it('spawnFootstepDust reuses pool meshes without adding new ones to the scene', () => {
    var sceneChildrenBefore = scene.children.length;
    GAME.spawnFootstepDust(new THREE.Vector3(0, 0, 0));
    expect(scene.children.length).toBe(sceneChildrenBefore);
  });

  it('dispose() then init(newScene) populates the new scene cleanly without dragging old refs', () => {
    GAME.effects.dispose();
    var scene2 = new THREE.Scene();
    GAME.effects.init(scene2);
    var holes2 = scene2.children.filter(function(c) {
      return c.material && c.material.polygonOffset === true;
    });
    expect(holes2.length).toBe(60);
  });
});
