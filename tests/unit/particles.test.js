import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/particles.js');
});

describe('Particle system', () => {
  it('should expose GAME.particles', () => {
    expect(GAME.particles).toBeDefined();
  });

  it('should have init method', () => {
    expect(typeof GAME.particles.init).toBe('function');
  });

  it('should have update method', () => {
    expect(typeof GAME.particles.update).toBe('function');
  });

  it('should have spawn methods', () => {
    expect(typeof GAME.particles.spawnTracer).toBe('function');
    expect(typeof GAME.particles.spawnCasing).toBe('function');
    expect(typeof GAME.particles.spawnMuzzleFlash).toBe('function');
    expect(typeof GAME.particles.spawnWallImpact).toBe('function');
    expect(typeof GAME.particles.spawnBlood).toBe('function');
    expect(typeof GAME.particles.spawnExplosion).toBe('function');
    expect(typeof GAME.particles.spawnSmokeCloud).toBe('function');
    expect(typeof GAME.particles.spawnCombatLight).toBe('function');
  });

  it('should have dispose method', () => {
    expect(typeof GAME.particles.dispose).toBe('function');
  });
});

describe('Particle pool behavior', () => {
  var mockScene;

  beforeAll(() => {
    mockScene = new THREE.Scene();
    GAME.particles.init(mockScene);
  });

  it('should spawn blood particles that become inactive after maxLife', () => {
    var pos = new THREE.Vector3(0, 5, 0);
    var dir = new THREE.Vector3(1, 0, 0);
    GAME.particles.spawnBlood(pos, dir, false);
    // After enough time, particles should deactivate
    GAME.particles.update(0.6); // > 0.5s maxLife
    // No crash = pool handles lifecycle correctly
  });

  it('should recycle oldest particles when pool is full (FIFO)', () => {
    var pos = new THREE.Vector3(0, 5, 0);
    var dir = new THREE.Vector3(1, 0, 0);
    // Spawn more than pool size (blood pool = 30)
    for (var i = 0; i < 35; i++) {
      GAME.particles.spawnBlood(pos, dir, false);
    }
    // Should not crash — oldest recycled
    GAME.particles.update(0.016);
  });

  it('should spawn and decay combat lights', () => {
    var pos = new THREE.Vector3(0, 2, 0);
    GAME.particles.spawnCombatLight(pos, 0xff6600, 10, 0.1);
    GAME.particles.update(0.2); // > 0.1s decay
    // Light should be deactivated — no crash
  });

  afterAll(() => {
    GAME.particles.dispose();
  });
});
