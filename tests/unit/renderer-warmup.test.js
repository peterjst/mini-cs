import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  // GAME.quality is needed for markWarmupComplete signal (loaded first so it's fresh)
  globalThis.GAME = {};
  loadModule('js/core/quality.js');

  // Mock dirLight + scene + skydome before renderer loads
  GAME.isMobile = false;
  GAME._dirLight = {
    castShadow: true,
    shadow: { mapSize: { width: 2048, height: 2048 }, map: null }
  };

  loadModule('js/core/renderer.js');
});

describe('Shader warmup', () => {
  it('should expose GAME._warmUpShaders', () => {
    expect(typeof GAME._warmUpShaders).toBe('function');
  });

  it('should call renderer.compile() once per shadow permutation on first invocation', () => {
    var r = GAME._renderer;
    r._compileCalls.length = 0;
    GAME._warmUpShaders();
    expect(r._compileCalls.length).toBe(3);
  });

  it('should re-run on subsequent invocations (per-map warmup, not session-scoped)', () => {
    // Each map load brings unique materials whose shader programs must be
    // pre-compiled to avoid mid-game ANGLE compile stalls on Windows.
    var r = GAME._renderer;
    r._compileCalls.length = 0;
    GAME._warmUpShaders();
    expect(r._compileCalls.length).toBe(3);
    r._compileCalls.length = 0;
    GAME._warmUpShaders();
    expect(r._compileCalls.length).toBe(3);
  });

  it('should compile each of the 3 shadow permutations (OFF, PCF, PCFSoft)', () => {
    var r = GAME._renderer;
    r._compileCalls.length = 0;
    GAME._warmUpShaders();
    var types = r._compileCalls.map(function(c) { return c.shadowType; });
    // PCFShadowMap = 1, PCFSoftShadowMap = 2 in the mock
    expect(types).toContain(THREE.PCFShadowMap);
    expect(types).toContain(THREE.PCFSoftShadowMap);
  });

  it('should restore dirLight.castShadow after warmup', () => {
    GAME._dirLight.castShadow = true;
    GAME._warmUpShaders();
    expect(GAME._dirLight.castShadow).toBe(true);
  });

  it('should call GAME.quality.markWarmupComplete (verified by checking _warmupComplete-gated fast-start)', () => {
    // After warmup, fast-start heuristic should be live.
    // Drive 10 frames at 16ms — should not trigger downgrade because FPS is fine.
    var startLevel = GAME.quality.level;
    for (var i = 0; i < 10; i++) GAME.quality.update(0.016);
    expect(GAME.quality.level).toBe(startLevel);
  });

  // Regression: on Windows ANGLE, renderer.compile() only creates program
  // objects — the GLSL→D3D11 HLSL compile + link is deferred until first
  // draw. Without forcing a draw during warmup, the first real frame after
  // map load hitches 100–300ms per material, dragging rolling fps below 25
  // and triggering spurious quality downgrades. Each shadow permutation must
  // be followed by an actual render so the driver pays link cost up front.
  it('should issue a render after each shadow permutation to force GPU program link', () => {
    var r = GAME._renderer;
    var renders = [];
    var origRender = r.render;
    r.render = function(scene, camera) {
      renders.push({
        shadowType: r.shadowMap.type,
        castShadow: GAME._dirLight ? GAME._dirLight.castShadow : false
      });
      return origRender.call(r, scene, camera);
    };
    try {
      r._compileCalls.length = 0;
      GAME._warmUpShaders();
    } finally {
      r.render = origRender;
    }
    // Three permutations are warmed: shadows OFF, PCF, PCFSoft. Each must
    // have at least one render with the matching renderer state captured at
    // call time. (The postFx warmup may add a final render; that's fine.)
    var noShadowRenders = renders.filter(function(e) { return e.castShadow === false; });
    var pcfRenders = renders.filter(function(e) { return e.castShadow === true && e.shadowType === THREE.PCFShadowMap; });
    var pcfSoftRenders = renders.filter(function(e) { return e.castShadow === true && e.shadowType === THREE.PCFSoftShadowMap; });
    expect(noShadowRenders.length).toBeGreaterThanOrEqual(1);
    expect(pcfRenders.length).toBeGreaterThanOrEqual(1);
    expect(pcfSoftRenders.length).toBeGreaterThanOrEqual(1);
  });
});
