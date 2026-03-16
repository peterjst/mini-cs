import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/weapons.js');
  loadModule('js/enemies.js');
});

describe('DIFFICULTIES', () => {
  var DIFF;
  beforeAll(() => { DIFF = GAME.DIFFICULTIES; });

  it('should define all 4 difficulty levels', () => {
    expect(DIFF).toHaveProperty('easy');
    expect(DIFF).toHaveProperty('normal');
    expect(DIFF).toHaveProperty('hard');
    expect(DIFF).toHaveProperty('elite');
  });

  it('should have required fields on each level', () => {
    var fields = ['health', 'speed', 'fireRate', 'damage', 'accuracy', 'sight', 'attackRange', 'botCount'];
    Object.keys(DIFF).forEach(level => {
      fields.forEach(field => {
        expect(DIFF[level]).toHaveProperty(field);
      });
    });
  });

  it('health should scale with difficulty', () => {
    expect(DIFF.easy.health).toBeLessThan(DIFF.normal.health);
    expect(DIFF.normal.health).toBeLessThan(DIFF.hard.health);
    expect(DIFF.hard.health).toBeLessThan(DIFF.elite.health);
  });

  it('should have correct health values', () => {
    expect(DIFF.easy.health).toBe(20);
    expect(DIFF.normal.health).toBe(45);
    expect(DIFF.hard.health).toBe(60);
    expect(DIFF.elite.health).toBe(80);
  });

  it('accuracy should scale with difficulty', () => {
    expect(DIFF.easy.accuracy).toBeLessThan(DIFF.normal.accuracy);
    expect(DIFF.normal.accuracy).toBeLessThan(DIFF.hard.accuracy);
    expect(DIFF.hard.accuracy).toBeLessThan(DIFF.elite.accuracy);
  });

  it('bot count should scale with difficulty', () => {
    expect(DIFF.easy.botCount).toBeLessThan(DIFF.elite.botCount);
  });
});

describe('EnemyManager', () => {
  it('should be defined after loading', () => {
    expect(GAME.EnemyManager).toBeDefined();
  });

  it('should construct without throwing', () => {
    var scene = new THREE.Scene();
    expect(() => new GAME.EnemyManager(scene)).not.toThrow();
  });

  it('should have a spawnBots method', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    expect(typeof em.spawnBots).toBe('function');
  });

  it('should have core methods', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    expect(typeof em.clearAll).toBe('function');
    expect(typeof em.update).toBe('function');
    expect(typeof em.allDead).toBe('function');
    expect(typeof em.getAlive).toBe('function');
  });
});

describe('Bot footsteps', () => {
  it('enemy should have _footstepTimer initialized to 0', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    var walls = [];
    var waypoints = [{ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 5 }];
    em.spawnBots(waypoints, walls, 1);
    var enemies = em.getAlive();
    if (enemies.length === 0) return;
    expect(enemies[0]._footstepTimer).toBe(0);
  });

  it('enemy should have _footstepInterval', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    var walls = [];
    var waypoints = [{ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 5 }];
    em.spawnBots(waypoints, walls, 1);
    var enemies = em.getAlive();
    if (enemies.length === 0) return;
    expect(typeof enemies[0]._footstepInterval).toBe('number');
    expect(enemies[0]._footstepInterval).toBeGreaterThan(0);
  });
});

describe('Enemy death animations', () => {
  it('die() should accept a hitDirection vector', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    // Should not throw when called with direction
    expect(() => enemy.die(new THREE.Vector3(0, 0, -1))).not.toThrow();
    scene.remove(enemy.mesh);
  });

  it('die() should work without a hitDirection (fallback)', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    expect(() => enemy.die()).not.toThrow();
    scene.remove(enemy.mesh);
  });

  it('die() should set _dying flag', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy.die(new THREE.Vector3(0, 0, -1));
    expect(enemy._dying).toBe(true);
    scene.remove(enemy.mesh);
  });

  it('die() should store interval handle on _deathInterval', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy.die(new THREE.Vector3(0, 0, -1));
    // setInterval returns a number in browsers; Node.js returns a Timeout object — both are truthy
    expect(enemy._deathInterval).toBeDefined();
    expect(enemy._deathInterval).not.toBeNull();
    scene.remove(enemy.mesh);
    clearInterval(enemy._deathInterval);
  });

  it('destroy() should clear death interval if running', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy.die(new THREE.Vector3(0, 0, -1));
    enemy.destroy();
    expect(enemy._deathInterval).toBeNull();
  });

  it('dead enemy mesh should remain in scene after animation completes (no auto-removal)', () => {
    vi.useFakeTimers();
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy.die(new THREE.Vector3(0, 0, -1));

    // Advance past animation duration and old 2s removal delay
    vi.advanceTimersByTime(3000);

    // Body should still be in scene
    expect(enemy.mesh.parent).not.toBeNull();

    scene.remove(enemy.mesh);
    vi.useRealTimers();
  });

  it('clearAll() should remove dead enemy meshes from scene', () => {
    vi.useFakeTimers();
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    var mesh = enemy.mesh;
    enemy.die(new THREE.Vector3(0, 0, -1));

    vi.advanceTimersByTime(1000);
    expect(mesh.parent).not.toBeNull();

    em.clearAll();
    expect(mesh.parent).toBeNull();

    vi.useRealTimers();
  });

  it('death animation should complete in ~0.4s (not 0.8s) for non-headshot variants', () => {
    vi.useFakeTimers();
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy.die(new THREE.Vector3(0, 0, -1));

    // After 0.5s the interval should be cleared (animation done)
    vi.advanceTimersByTime(500);
    expect(enemy._deathInterval).toBeNull();

    scene.remove(enemy.mesh);
    vi.useRealTimers();
  });

  it('headshot death animation should complete in ~0.3s', () => {
    vi.useFakeTimers();
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy._headshotKill = true;
    enemy.die(new THREE.Vector3(0, 0, -1));

    // After 0.35s the interval should be cleared
    vi.advanceTimersByTime(350);
    expect(enemy._deathInterval).toBeNull();

    scene.remove(enemy.mesh);
    vi.useRealTimers();
  });

  it('death animation should drop body to ground level (Y offset <= -0.9)', () => {
    vi.useFakeTimers();
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    var startY = enemy.mesh.position.y;
    enemy.die(new THREE.Vector3(0, 0, -1));

    // Advance past animation
    vi.advanceTimersByTime(500);

    // Body should have dropped significantly (relative to start)
    expect(enemy.mesh.position.y).toBeLessThanOrEqual(startY - 0.9);

    scene.remove(enemy.mesh);
    vi.useRealTimers();
  });

  it('hit jolt should displace body position in first 0.1s', () => {
    vi.useFakeTimers();
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    var startX = enemy.mesh.position.x;
    var startZ = enemy.mesh.position.z;
    // Hit from front (positive Z direction)
    enemy.die(new THREE.Vector3(0, 0, 1));

    // After jolt phase (~100ms), position should have shifted
    vi.advanceTimersByTime(112); // 7 frames at 16ms
    var dx = enemy.mesh.position.x - startX;
    var dz = enemy.mesh.position.z - startZ;
    var displacement = Math.sqrt(dx * dx + dz * dz);
    expect(displacement).toBeGreaterThan(0);

    clearInterval(enemy._deathInterval);
    scene.remove(enemy.mesh);
    vi.useRealTimers();
  });

  it('headshot crumple (variant 3) should skip jolt phase', () => {
    vi.useFakeTimers();
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy._headshotKill = true;
    var startX = enemy.mesh.position.x;
    var startZ = enemy.mesh.position.z;
    var startY = enemy.mesh.position.y;
    enemy.die(new THREE.Vector3(0, 0, -1));

    // After first frame, no horizontal displacement (no jolt)
    vi.advanceTimersByTime(16);
    expect(enemy.mesh.position.x).toBe(startX);
    expect(enemy.mesh.position.z).toBe(startZ);

    // But Y should already be dropping (relative check)
    expect(enemy.mesh.position.y).toBeLessThan(startY);

    clearInterval(enemy._deathInterval);
    scene.remove(enemy.mesh);
    vi.useRealTimers();
  });
});
