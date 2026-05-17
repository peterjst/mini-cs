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
});
