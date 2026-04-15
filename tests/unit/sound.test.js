import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/core/sound.js');
});

describe('GAME.Sound', () => {
  it('should be defined after loading', () => {
    expect(GAME.Sound).toBeDefined();
  });

  it('should have core sound methods', () => {
    var methods = ['init'];
    methods.forEach(m => {
      expect(typeof GAME.Sound[m]).toBe('function');
    });
  });

  it('init should not throw', () => {
    expect(() => GAME.Sound.init()).not.toThrow();
  });
});

describe('Spatial audio', () => {
  it('GAME.Sound.updateListener should be a function', () => {
    expect(typeof GAME.Sound.updateListener).toBe('function');
  });

  it('GAME.Sound.enemyShotSpatial should be a function', () => {
    expect(typeof GAME.Sound.enemyShotSpatial).toBe('function');
  });

  it('GAME.Sound.botFootstep should be a function', () => {
    expect(typeof GAME.Sound.botFootstep).toBe('function');
  });

  it('GAME.Sound._createPanner should be a function', () => {
    expect(typeof GAME.Sound._createPanner).toBe('function');
  });
});

describe('Reload phase sounds', () => {
  it('GAME.Sound.reloadMagOut should be a function', () => {
    expect(typeof GAME.Sound.reloadMagOut).toBe('function');
  });

  it('GAME.Sound.reloadMagIn should be a function', () => {
    expect(typeof GAME.Sound.reloadMagIn).toBe('function');
  });

  it('GAME.Sound.reloadBoltRack should be a function', () => {
    expect(typeof GAME.Sound.reloadBoltRack).toBe('function');
  });
});

describe('Surface footstep sounds', () => {
  it('should have footstepMetal function', () => {
    expect(typeof GAME.Sound.footstepMetal).toBe('function');
  });
  it('should have footstepWood function', () => {
    expect(typeof GAME.Sound.footstepWood).toBe('function');
  });
  it('should have footstepSand function', () => {
    expect(typeof GAME.Sound.footstepSand).toBe('function');
  });
});

describe('Kill confirmation sound', () => {
  it('should have killConfirm function', () => {
    expect(typeof GAME.Sound.killConfirm).toBe('function');
  });
});

describe('Kill bass impact sounds', () => {
  it('should have killThump function', () => {
    expect(typeof GAME.Sound.killThump).toBe('function');
  });

  it('should have killThumpHeadshot function', () => {
    expect(typeof GAME.Sound.killThumpHeadshot).toBe('function');
  });

  it('killThump should not throw when called', () => {
    expect(() => GAME.Sound.killThump()).not.toThrow();
  });

  it('killThumpHeadshot should not throw when called', () => {
    expect(() => GAME.Sound.killThumpHeadshot()).not.toThrow();
  });
});

describe('Death audio fade', () => {
  it('should have fadeToMuffled function', () => {
    expect(typeof GAME.Sound.fadeToMuffled).toBe('function');
  });
  it('should have restoreAudio function', () => {
    expect(typeof GAME.Sound.restoreAudio).toBe('function');
  });
});

describe('Environment reverb', () => {
  it('should have initReverb function', () => {
    expect(typeof GAME.Sound.initReverb).toBe('function');
  });

  it('should not throw when called with map name', () => {
    expect(() => GAME.Sound.initReverb('dust')).not.toThrow();
  });

  it('should have _getReverbConfig function', () => {
    expect(typeof GAME.Sound._getReverbConfig).toBe('function');
  });

  it('should have different decay times per map type', () => {
    var dustConfig = GAME.Sound._getReverbConfig('dust');
    var officeConfig = GAME.Sound._getReverbConfig('office');
    expect(dustConfig.decay).toBeLessThan(officeConfig.decay);
  });
});

describe('Distant gunfire echo', () => {
  it('should have _createDistantEcho helper', () => {
    expect(typeof GAME.Sound._createDistantEcho).toBe('function');
  });
});

describe('Knife hit sound', () => {
  it('should have knifeHit method', () => {
    expect(typeof GAME.Sound.knifeHit).toBe('function');
  });
});

describe('Surface impact sounds', () => {
  it('should have impactConcrete function', () => {
    expect(typeof GAME.Sound.impactConcrete).toBe('function');
  });
  it('should have impactMetal function', () => {
    expect(typeof GAME.Sound.impactMetal).toBe('function');
  });
  it('should have impactWood function', () => {
    expect(typeof GAME.Sound.impactWood).toBe('function');
  });
});

describe('Impact sounds', () => {
  it('should expose shellCasing sound function', () => {
    expect(typeof GAME.Sound.shellCasing).toBe('function');
  });

  it('should expose wallImpact sound function', () => {
    expect(typeof GAME.Sound.wallImpact).toBe('function');
  });
});

describe('Menu UI sounds', () => {
  it('GAME.Sound.menuClick should be a function', () => {
    expect(typeof GAME.Sound.menuClick).toBe('function');
  });

  it('menuClick should not throw', () => {
    expect(() => GAME.Sound.menuClick()).not.toThrow();
  });

  it('rapid menuClick calls should not throw (debounce)', () => {
    expect(() => {
      GAME.Sound.menuClick();
      GAME.Sound.menuClick();
      GAME.Sound.menuClick();
    }).not.toThrow();
  });

  it('GAME.Sound.menuSelect should be a function', () => {
    expect(typeof GAME.Sound.menuSelect).toBe('function');
  });

  it('menuSelect should not throw', () => {
    expect(() => GAME.Sound.menuSelect()).not.toThrow();
  });

  it('GAME.Sound.menuStartClick should be a function', () => {
    expect(typeof GAME.Sound.menuStartClick).toBe('function');
  });

  it('menuStartClick should not throw', () => {
    expect(() => GAME.Sound.menuStartClick()).not.toThrow();
  });

  it('GAME.Sound.roundStartStinger should be a function', () => {
    expect(typeof GAME.Sound.roundStartStinger).toBe('function');
  });

  it('roundStartStinger should not throw', () => {
    expect(() => GAME.Sound.roundStartStinger()).not.toThrow();
  });
});

describe('Boss sounds', () => {
  it('should have bossBarrageWindup method', () => {
    expect(typeof GAME.Sound.bossBarrageWindup).toBe('function');
  });

  it('should have bossGrenadeLaunch method', () => {
    expect(typeof GAME.Sound.bossGrenadeLaunch).toBe('function');
  });

  it('should have bossPhaseTransition method', () => {
    expect(typeof GAME.Sound.bossPhaseTransition).toBe('function');
  });

  it('should have bossSpawnAlert method', () => {
    expect(typeof GAME.Sound.bossSpawnAlert).toBe('function');
  });

  it('should have bossMinionSummon method', () => {
    expect(typeof GAME.Sound.bossMinionSummon).toBe('function');
  });

  it('should have bossDeath method', () => {
    expect(typeof GAME.Sound.bossDeath).toBe('function');
  });

  it('should have bossFootstep method', () => {
    expect(typeof GAME.Sound.bossFootstep).toBe('function');
  });
});
