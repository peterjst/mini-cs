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
    expect(GAME.getMapCount()).toBe(6);
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
