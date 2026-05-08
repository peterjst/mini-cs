import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
});

function walkTraverse(node, fn) {
  fn(node);
  if (node.children) for (var i = 0; i < node.children.length; i++) walkTraverse(node.children[i], fn);
}

function makeScene(children) {
  var s = { children: children || [] };
  s.traverse = function(fn) {
    fn(s);
    for (var i = 0; i < s.children.length; i++) walkTraverse(s.children[i], fn);
  };
  return s;
}

describe('H.tierGated and GAME._reapplyAllTierVisibility', () => {
  beforeEach(() => {
    GAME.quality = { level: 5 };
    GAME.scene = makeScene([]);
  });

  function makeGroup() {
    return { visible: true, userData: {}, children: [] };
  }

  it('tierGated exists on _mapHelpers', () => {
    expect(typeof GAME._mapHelpers.tierGated).toBe('function');
  });

  it('_reapplyAllTierVisibility exists on GAME', () => {
    expect(typeof GAME._reapplyAllTierVisibility).toBe('function');
  });

  it('sets userData.minQualityLevel on the group', () => {
    var g = makeGroup();
    GAME._mapHelpers.tierGated(g, 3);
    expect(g.userData.minQualityLevel).toBe(3);
  });

  it('makes group invisible immediately when current level is below minLevel', () => {
    GAME.quality = { level: 1 };
    var g = makeGroup();
    GAME._mapHelpers.tierGated(g, 3);
    expect(g.visible).toBe(false);
  });

  it('keeps group visible when current level >= minLevel', () => {
    GAME.quality = { level: 3 };
    var g = makeGroup();
    GAME._mapHelpers.tierGated(g, 3);
    expect(g.visible).toBe(true);
  });

  it('reapply flips visibility when current level changes', () => {
    GAME.quality = { level: 5 };
    var g = makeGroup();
    GAME._mapHelpers.tierGated(g, 3);
    GAME.scene = makeScene([g]);
    expect(g.visible).toBe(true);

    GAME.quality.level = 2;
    GAME._reapplyAllTierVisibility();
    expect(g.visible).toBe(false);

    GAME.quality.level = 4;
    GAME._reapplyAllTierVisibility();
    expect(g.visible).toBe(true);
  });

  it('reapply ignores groups without minQualityLevel tag', () => {
    var tagged = makeGroup();
    var untagged = makeGroup();
    GAME._mapHelpers.tierGated(tagged, 3);
    GAME.scene = makeScene([tagged, untagged]);

    GAME.quality.level = 0;
    GAME._reapplyAllTierVisibility();
    expect(tagged.visible).toBe(false);
    expect(untagged.visible).toBe(true);  // untouched
  });

  it('treats missing GAME.quality as level 5 (full visibility)', () => {
    GAME.quality = null;
    var g = makeGroup();
    GAME._mapHelpers.tierGated(g, 3);
    expect(g.visible).toBe(true);
  });

  it('global reapply is safe when scene is missing', () => {
    GAME.scene = null;
    expect(function() { GAME._reapplyAllTierVisibility(); }).not.toThrow();
  });

  it('handles userData being absent on the group', () => {
    var g = { visible: true, children: [] };  // no userData property
    GAME._mapHelpers.tierGated(g, 3);
    expect(g.userData).toBeDefined();
    expect(g.userData.minQualityLevel).toBe(3);
  });
});

describe('H.tierGatedLight', () => {
  beforeEach(() => {
    GAME.quality = { level: 5 };
    GAME.scene = makeScene([]);
  });

  function makeLight(intensity, castShadow) {
    return {
      isLight: true,
      intensity: intensity != null ? intensity : 0.5,
      castShadow: !!castShadow,
      userData: {},
      children: []
    };
  }

  it('exists on _mapHelpers', () => {
    expect(typeof GAME._mapHelpers.tierGatedLight).toBe('function');
  });

  it('preserves original intensity at level >= minLevel', () => {
    var l = makeLight(0.7);
    GAME._mapHelpers.tierGatedLight(l, 3);
    expect(l.intensity).toBe(0.7);
  });

  it('zeros intensity when level < minLevel', () => {
    GAME.quality = { level: 1 };
    var l = makeLight(0.7);
    GAME._mapHelpers.tierGatedLight(l, 3);
    expect(l.intensity).toBe(0);
  });

  it('disables castShadow when level < minLevel', () => {
    GAME.quality = { level: 1 };
    var l = makeLight(0.7, true);
    GAME._mapHelpers.tierGatedLight(l, 3);
    expect(l.castShadow).toBe(false);
  });

  it('restores intensity and castShadow when level rises back above min', () => {
    var l = makeLight(0.7, true);
    GAME._mapHelpers.tierGatedLight(l, 3);
    GAME.scene = makeScene([l]);

    GAME.quality.level = 1;
    GAME._reapplyAllTierVisibility();
    expect(l.intensity).toBe(0);
    expect(l.castShadow).toBe(false);

    GAME.quality.level = 4;
    GAME._reapplyAllTierVisibility();
    expect(l.intensity).toBe(0.7);
    expect(l.castShadow).toBe(true);
  });
});
