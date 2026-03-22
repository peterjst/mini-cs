import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  // main.js needs all prior modules
  loadModule('js/maps/shared.js');
  loadModule('js/maps/props.js');
  // Load map files so GAME._maps is populated
  loadModule('js/maps/dust.js');
  loadModule('js/maps/office.js');
  loadModule('js/maps/warehouse.js');
  loadModule('js/maps/bloodstrike.js');
  loadModule('js/maps/italy.js');
  loadModule('js/maps/aztec.js');
  loadModule('js/maps/arena.js');
  loadModule('js/player.js');
  loadModule('js/sound.js');
  loadModule('js/weapons.js');
  loadModule('js/enemies.js');
  loadModule('js/main.js');
});

describe('GAME.* exposures for touch module', () => {
  it('should expose GAME.player with keys object', () => {
    expect(GAME.player).toBeDefined();
    expect(GAME.player.keys).toBeDefined();
    expect(typeof GAME.player.keys.w).toBe('boolean');
  });

  it('should expose GAME.weaponSystem', () => {
    expect(GAME.weaponSystem).toBeDefined();
    expect(typeof GAME.weaponSystem.startReload).toBe('function');
  });

  it('should expose GAME._enemyManager', () => {
    expect(GAME._enemyManager).toBeDefined();
    expect(GAME._enemyManager.enemies).toBeDefined();
  });

  it('should expose GAME._weaponDefs', () => {
    expect(GAME._weaponDefs).toBeDefined();
    expect(GAME._weaponDefs.pistol).toBeDefined();
    expect(typeof GAME._weaponDefs.pistol.damage).toBe('number');
  });

  it('should expose GAME._buyWeapon', () => {
    expect(typeof GAME._buyWeapon).toBe('function');
  });
});

describe('game state', () => {
  it('should expose hasPerk function', () => {
    expect(typeof GAME.hasPerk).toBe('function');
  });

  it('hasPerk should return false when no perks are active', () => {
    expect(GAME.hasPerk('juggernaut')).toBe(false);
    expect(GAME.hasPerk('fleet_foot')).toBe(false);
    expect(GAME.hasPerk('stopping_power')).toBe(false);
  });

  it('should expose setDifficulty', () => {
    expect(typeof GAME.setDifficulty).toBe('function');
  });

  it('should expose getDifficulty', () => {
    expect(typeof GAME.getDifficulty).toBe('function');
  });

  it('should expose getMapCount', () => {
    expect(typeof GAME.getMapCount).toBe('function');
    expect(GAME.getMapCount()).toBe(7);
  });

  it('should expose getMapDef', () => {
    expect(typeof GAME.getMapDef).toBe('function');
    var def = GAME.getMapDef(0);
    expect(def).toBeDefined();
    expect(def.name).toBeDefined();
  });
});

describe('Bullet impact decals', () => {
  it('GAME.spawnBulletHole should be a function', () => {
    expect(typeof GAME.spawnBulletHole).toBe('function');
  });

  it('should track bullet holes in GAME._bulletHoles array', () => {
    expect(Array.isArray(GAME._bulletHoles)).toBe(true);
  });

  it('should cap bullet holes at MAX_BULLET_HOLES', () => {
    expect(GAME.MAX_BULLET_HOLES).toBe(60);
  });
});

describe('Impact dust puff', () => {
  it('GAME.spawnImpactDust should be a function', () => {
    expect(typeof GAME.spawnImpactDust).toBe('function');
  });
});

describe('Footstep dust particles', () => {
  it('should have spawnFootstepDust function on GAME', () => {
    expect(typeof GAME.spawnFootstepDust).toBe('function');
  });
});

describe('Directional damage indicator', () => {
  it('should have showDamageIndicator function on GAME', () => {
    expect(typeof GAME.showDamageIndicator).toBe('function');
  });

  it('should not throw when called without DOM container', () => {
    expect(() => GAME.showDamageIndicator({ x: 10, y: 0, z: 0 })).not.toThrow();
  });
});

describe('Screen blood splatter', () => {
  it('should have triggerBloodSplatter function on GAME', () => {
    expect(typeof GAME.triggerBloodSplatter).toBe('function');
  });

  it('should not throw when called with damage amount', () => {
    expect(() => GAME.triggerBloodSplatter(50)).not.toThrow();
  });
});

describe('Kill micro slow-motion', () => {
  it('should have GAME.killSlowMo state', () => {
    expect(GAME.killSlowMo).toBeDefined();
  });

  it('should have active, timer, and scale properties', () => {
    expect(typeof GAME.killSlowMo.active).toBe('boolean');
    expect(typeof GAME.killSlowMo.timer).toBe('number');
    expect(typeof GAME.killSlowMo.scale).toBe('number');
  });
});

describe('Touch fire button flag', () => {
  it('should initialize GAME.touchFireButton to false', () => {
    expect(GAME.touchFireButton).toBe(false);
  });
});

describe('menu flythrough', function() {
  it('should expose GAME._menuFlythroughPaths with one entry per map', function() {
    expect(GAME._menuFlythroughPaths).toBeDefined();
    expect(Array.isArray(GAME._menuFlythroughPaths)).toBe(true);
    expect(GAME._menuFlythroughPaths.length).toBe(GAME.getMapCount());
  });

  it('each flythrough path should have 4-6 keyframes with position, lookAt, duration', function() {
    GAME._menuFlythroughPaths.forEach(function(path) {
      expect(path.length).toBeGreaterThanOrEqual(4);
      expect(path.length).toBeLessThanOrEqual(6);
      path.forEach(function(kf) {
        expect(kf.position).toBeDefined();
        expect(kf.position.x).toBeDefined();
        expect(kf.position.y).toBeDefined();
        expect(kf.position.z).toBeDefined();
        expect(kf.lookAt).toBeDefined();
        expect(kf.lookAt.x).toBeDefined();
        expect(kf.lookAt.y).toBeDefined();
        expect(kf.lookAt.z).toBeDefined();
        expect(typeof kf.duration).toBe('number');
        expect(kf.duration).toBeGreaterThan(0);
      });
    });
  });

  it('should expose GAME.updateMenuFlythrough function', function() {
    expect(typeof GAME.updateMenuFlythrough).toBe('function');
  });

  it('should expose GAME.buildMenuScene function', function() {
    expect(typeof GAME.buildMenuScene).toBe('function');
  });
});

describe('quick play', function() {
  it('should expose GAME.getQuickPlaySettings function', function() {
    expect(typeof GAME.getQuickPlaySettings).toBe('function');
  });

  it('should return default settings when no localStorage data', function() {
    localStorage.clear();
    var settings = GAME.getQuickPlaySettings();
    expect(settings.mode).toBe('competitive');
    expect(settings.difficulty).toBe('normal');
    expect(settings.mapIndex).toBeGreaterThanOrEqual(0);
  });

  it('should return saved settings from localStorage', function() {
    localStorage.setItem('miniCS_lastMode', 'survival');
    localStorage.setItem('miniCS_difficulty', 'hard');
    localStorage.setItem('miniCS_lastMap_surv-map-grid', '2');
    var settings = GAME.getQuickPlaySettings();
    expect(settings.mode).toBe('survival');
    expect(settings.difficulty).toBe('hard');
    localStorage.clear();
  });
});

describe('Post-processing pipeline', () => {
  it('should attach a DepthTexture to sceneRT', () => {
    expect(GAME._postProcess).toBeDefined();
    expect(GAME._postProcess.sceneRT).toBeDefined();
    expect(GAME._postProcess.sceneRT.depthTexture).toBeDefined();
    expect(GAME._postProcess.sceneRT.depthTexture.type).toBe(THREE.UnsignedInt248Type);
  });
});

describe('SSAO', () => {
  it('should expose SSAO render target at half resolution', () => {
    expect(GAME._postProcess.ssaoRT).toBeDefined();
  });

  it('should expose SSAO toggle', () => {
    expect(typeof GAME._postProcess.ssaoEnabled).toBe('boolean');
  });
});

describe('Sharpen pass', () => {
  it('should expose sharpen pass', () => {
    expect(GAME._postProcess.sharpenEnabled).toBe(true);
  });
});

describe('Color grading', () => {
  it('should expose color grading uniforms', () => {
    var pp = GAME._postProcess;
    expect(pp.colorGrade).toBeDefined();
    expect(pp.colorGrade.tint).toBeDefined();
    expect(pp.colorGrade.contrast).toBeDefined();
    expect(pp.colorGrade.saturation).toBeDefined();
    expect(pp.colorGrade.vignetteStrength).toBeDefined();
  });
});

describe('Hit feedback', () => {
  it('should expose hit feedback state', () => {
    expect(GAME._hitFeedback).toBeDefined();
    expect(typeof GAME._hitFeedback.hitTimer).toBe('number');
    expect(typeof GAME._hitFeedback.killTimer).toBe('number');
  });
});

describe('Kill camera kick', () => {
  it('should expose triggerKillKick function', () => {
    expect(typeof GAME.triggerKillKick).toBe('function');
  });

  it('should expose killKick state object', () => {
    expect(GAME.killKick).toBeDefined();
    expect(GAME.killKick).toHaveProperty('active');
    expect(GAME.killKick).toHaveProperty('timer');
    expect(GAME.killKick).toHaveProperty('magnitude');
  });

  it('triggerKillKick should activate the kick', () => {
    GAME.killKick.active = false;
    GAME.triggerKillKick(false);
    expect(GAME.killKick.active).toBe(true);
  });

  it('headshot kick should have larger magnitude', () => {
    GAME.killKick.active = false;
    GAME.triggerKillKick(false);
    var normalMag = GAME.killKick.magnitude;
    GAME.killKick.active = false;
    GAME.triggerKillKick(true);
    var hsMag = GAME.killKick.magnitude;
    expect(hsMag).toBeGreaterThan(normalMag);
  });
});

describe('maybeRotateMap', () => {
  it('should return same index when map mode is fixed', () => {
    GAME._setMapModeForMatch('fixed');
    expect(GAME._maybeRotateMap(0)).toBe(0);
    expect(GAME._maybeRotateMap(3)).toBe(3);
  });

  it('should return a different index when map mode is rotate', () => {
    GAME._setMapModeForMatch('rotate');
    // With 7 maps, the result must differ from the input
    for (var i = 0; i < 20; i++) {
      var result = GAME._maybeRotateMap(2);
      expect(result).not.toBe(2);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(GAME.getMapCount());
    }
  });

  it('should never return the same map consecutively', () => {
    GAME._setMapModeForMatch('rotate');
    var current = 0;
    for (var i = 0; i < 50; i++) {
      var next = GAME._maybeRotateMap(current);
      expect(next).not.toBe(current);
      current = next;
    }
  });

  it('should return same index when only one map exists', () => {
    // Temporarily reduce map count
    var originalMaps = GAME._maps.slice();
    GAME._maps.length = 1;
    GAME._setMapModeForMatch('rotate');
    expect(GAME._maybeRotateMap(0)).toBe(0);
    // Restore
    GAME._maps.length = 0;
    for (var i = 0; i < originalMaps.length; i++) GAME._maps.push(originalMaps[i]);
  });
});

describe('GAME.touchFiring', () => {
  it('should be defined and default to false', () => {
    expect(GAME.touchFiring).toBe(false);
  });
});

describe('Deathmatch buy menu auto-open', () => {
  it('should expose dmBuyMenuAutoOpened flag initialized to false', () => {
    expect(GAME._dmBuyMenuAutoOpened).toBe(false);
  });
});

describe('Menu UI sound wiring', () => {
  it('GAME.Sound.menuClick should be callable', () => {
    expect(typeof GAME.Sound.menuClick).toBe('function');
  });

  it('GAME.Sound.menuSelect should be callable', () => {
    expect(typeof GAME.Sound.menuSelect).toBe('function');
  });

  it('GAME.Sound.menuStartClick should be callable', () => {
    expect(typeof GAME.Sound.menuStartClick).toBe('function');
  });
});

describe('pause hint', () => {
  it('should have pause-hint-key element in DOM', () => {
    var el = document.getElementById('pause-hint-key');
    expect(el).toBeTruthy();
  });

  it('should expose _getGameState for testing', () => {
    expect(typeof GAME._getGameState).toBe('function');
  });

  it('should expose _updatePauseHint for testing', () => {
    expect(typeof GAME._updatePauseHint).toBe('function');
  });

  it('should show pause hint during PLAYING state', () => {
    var el = document.getElementById('pause-hint-key');
    GAME._setGameState('PLAYING');
    GAME._updatePauseHint();
    expect(el.style.display).toBe('block');
  });

  it('should hide pause hint during MENU state', () => {
    var el = document.getElementById('pause-hint-key');
    GAME._setGameState('MENU');
    GAME._updatePauseHint();
    expect(el.style.display).toBe('none');
  });

  it('should hide pause hint during PAUSED state', () => {
    var el = document.getElementById('pause-hint-key');
    GAME._setGameState('PAUSED');
    GAME._updatePauseHint();
    expect(el.style.display).toBe('none');
  });
});
