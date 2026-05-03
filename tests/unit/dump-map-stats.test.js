import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
});

describe('H.dumpMapStats', () => {
  var logSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    GAME._debugMapStats = false;
  });

  function makeMesh(opts) {
    return {
      isMesh: true,
      castShadow: !!(opts && opts.castShadow),
      material: (opts && opts.material) || { uuid: 'mat-default' },
      geometry: (opts && opts.geometry) || { uuid: 'geo-default' },
      children: []
    };
  }

  function makeLight() {
    return { isLight: true, children: [] };
  }

  function makeGroup(children) {
    var g = { children: children || [] };
    g.traverse = function(fn) {
      fn(g);
      function walk(c) {
        fn(c);
        if (c.children) for (var i = 0; i < c.children.length; i++) walk(c.children[i]);
      }
      for (var i = 0; i < g.children.length; i++) walk(g.children[i]);
    };
    return g;
  }

  it('exists on GAME._mapHelpers', () => {
    expect(typeof GAME._mapHelpers.dumpMapStats).toBe('function');
  });

  it('does nothing when GAME._debugMapStats is false', () => {
    GAME._debugMapStats = false;
    GAME._mapHelpers.dumpMapStats('test', makeGroup([makeMesh()]));
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('logs once when flag is true', () => {
    GAME._debugMapStats = true;
    GAME._mapHelpers.dumpMapStats('test', makeGroup([makeMesh(), makeLight()]));
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('counts meshes, shadow casters, and lights', () => {
    GAME._debugMapStats = true;
    var root = makeGroup([
      makeMesh({ castShadow: true }),
      makeMesh({ castShadow: false }),
      makeMesh({ castShadow: true }),
      makeLight(),
      makeLight()
    ]);
    GAME._mapHelpers.dumpMapStats('m1', root);
    var msg = logSpy.mock.calls[0][0];
    expect(msg).toContain('meshes=3');
    expect(msg).toContain('shadowCasters=2');
    expect(msg).toContain('lights=2');
  });

  it('counts unique materials and geometries', () => {
    GAME._debugMapStats = true;
    var matA = { uuid: 'A' }, matB = { uuid: 'B' };
    var geoA = { uuid: 'gA' }, geoB = { uuid: 'gB' };
    var root = makeGroup([
      makeMesh({ material: matA, geometry: geoA }),
      makeMesh({ material: matA, geometry: geoB }),
      makeMesh({ material: matB, geometry: geoA })
    ]);
    GAME._mapHelpers.dumpMapStats('m2', root);
    var msg = logSpy.mock.calls[0][0];
    expect(msg).toContain('materials=2');
    expect(msg).toContain('geometries=2');
  });

  it('includes the map name in the log line', () => {
    GAME._debugMapStats = true;
    GAME._mapHelpers.dumpMapStats('aztec', makeGroup([makeMesh()]));
    var msg = logSpy.mock.calls[0][0];
    expect(msg).toContain('aztec');
  });
});
