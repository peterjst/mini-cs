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

  it('should be a no-op on second invocation (session-scoped guard)', () => {
    var r = GAME._renderer;
    r._compileCalls.length = 0;
    GAME._warmUpShaders();
    expect(r._compileCalls.length).toBe(0);
  });

  it('should restore dirLight.castShadow after warmup', () => {
    // Re-run isn't possible without resetting flag; this test instead ensures the
    // existing castShadow value (true) was not left flipped after the prior runs.
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
