import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  // main.js needs all prior modules
  loadModule('js/maps/shared.js');
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
