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
    var fields = ['health', 'speed', 'fireRate', 'damage', 'accuracy', 'sight', 'attackRange', 'botCount', 'soundCloseRange', 'soundMidRange', 'soundMidError', 'soundFarError'];
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

  it('destroy() during active death animation should clean up properly', () => {
    vi.useFakeTimers();
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy.die(new THREE.Vector3(0, 0, -1));

    // Destroy immediately (simulates Gun Game / Deathmatch respawn)
    expect(enemy._deathInterval).not.toBeNull();
    enemy.destroy();

    // Interval should be cleared and mesh removed
    expect(enemy._deathInterval).toBeNull();
    expect(enemy.mesh.parent).toBeNull();

    // Advancing time should not throw (interval was cleared)
    vi.advanceTimersByTime(1000);

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

});

describe('Field of View', () => {
  function createEnemy(rotationY) {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBots([{x: 0, z: 0}], [{x: 0, z: 0}, {x: 5, z: 5}], [], 1, {x: 50, z: 50}, {x: 25, z: 25});
    var enemy = em.enemies[0];
    enemy.mesh.position.set(0, 0, 0);
    enemy.mesh.rotation.y = rotationY;
    enemy.sightRange = 50;
    return enemy;
  }

  it('should see player directly in front (0° offset)', () => {
    var enemy = createEnemy(Math.PI);
    var playerPos = new THREE.Vector3(0, 1.5, 10);
    expect(enemy._canSeePlayer(playerPos)).toBe(true);
  });

  it('should NOT see player directly behind (180° offset)', () => {
    var enemy = createEnemy(Math.PI);
    var playerPos = new THREE.Vector3(0, 1.5, -10);
    expect(enemy._canSeePlayer(playerPos)).toBe(false);
  });

  it('should see player at 50° offset (within 60° half-cone)', () => {
    var enemy = createEnemy(Math.PI);
    var angle = 50 * Math.PI / 180;
    var playerPos = new THREE.Vector3(Math.sin(angle) * 10, 1.5, Math.cos(angle) * 10);
    expect(enemy._canSeePlayer(playerPos)).toBe(true);
  });

  it('should NOT see player at 70° offset (outside 60° half-cone)', () => {
    var enemy = createEnemy(Math.PI);
    var angle = 70 * Math.PI / 180;
    var playerPos = new THREE.Vector3(Math.sin(angle) * 10, 1.5, Math.cos(angle) * 10);
    expect(enemy._canSeePlayer(playerPos)).toBe(false);
  });

  it('should see player at exactly 60° (boundary)', () => {
    var enemy = createEnemy(Math.PI);
    var angle = 59.9 * Math.PI / 180;
    var playerPos = new THREE.Vector3(Math.sin(angle) * 10, 1.5, Math.cos(angle) * 10);
    expect(enemy._canSeePlayer(playerPos)).toBe(true);
  });

  it('_findNearestTarget should respect FOV cone', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    // Spawn 2 bots so we have enemies on both teams
    em.spawnBots(
      [{x: 0, z: 0}, {x: 10, z: 10}],
      [{x: 0, z: 0}, {x: 10, z: 10}],
      [], 2, {x: 50, z: 50}, {x: 25, z: 25}
    );
    // We need at least 2 enemies; place them on different teams
    var bot = em.enemies[0];
    var target = em.enemies[1];
    // Force different teams so one can target the other
    bot.team = 'ct';
    target.team = 't';
    target.alive = true;
    bot.alive = true;
    bot.sightRange = 50;

    // Place target directly in front of bot (bot faces +Z when rotation.y = 0)
    // forward = (−sin(0), 0, −cos(0)) = (0, 0, −1), so "in front" is −Z
    bot.mesh.position.set(0, 0, 0);
    bot.mesh.rotation.y = 0;
    target.mesh.position.set(0, 0, -10); // directly in front
    var result = em._findNearestTarget(bot, 't');
    expect(result).toBe(target);

    // Place target directly behind bot
    target.mesh.position.set(0, 0, 10); // directly behind
    result = em._findNearestTarget(bot, 't');
    expect(result).toBeNull();

    // Place target at 70° offset (outside 60° half-cone, dot < 0.5)
    var angle = 70 * Math.PI / 180;
    target.mesh.position.set(Math.sin(angle) * 10, 0, -Math.cos(angle) * 10);
    result = em._findNearestTarget(bot, 't');
    expect(result).toBeNull();

    // Place target at 50° offset (inside 60° half-cone, dot > 0.5)
    angle = 50 * Math.PI / 180;
    target.mesh.position.set(Math.sin(angle) * 10, 0, -Math.cos(angle) * 10);
    result = em._findNearestTarget(bot, 't');
    expect(result).toBe(target);
  });
});

describe('Enemy death animations', () => {
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

describe('Distance-based sound awareness', () => {
  function createManagerWithBots(botPositions) {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    var waypoints = [{x: 0, z: 0}, {x: 10, z: 10}];
    em.spawnBots(null, waypoints, [], botPositions.length, {x: 50, z: 50}, {x: 25, z: 25});
    for (var i = 0; i < em.enemies.length; i++) {
      em.enemies[i].mesh.position.set(botPositions[i].x, 0, botPositions[i].z);
      em.enemies[i].state = 0; // PATROL
    }
    return em;
  }

  it('close sound (<8 units) should give exact position', () => {
    var em = createManagerWithBots([{x: 5, z: 0}]);
    var soundPos = {x: 0, y: 0, z: 0};
    em.reportSound(soundPos, 'footstep', 30);
    var bot = em.enemies[0];
    expect(bot._investigatePos.x).toBe(0);
    expect(bot._investigatePos.z).toBe(0);
  });

  it('far sound (>20 units) should give imprecise position', () => {
    var em = createManagerWithBots([{x: 25, z: 0}]);
    var soundPos = {x: 0, y: 0, z: 0};
    em.reportSound(soundPos, 'gunshot', 40);
    var bot = em.enemies[0];
    var dx = Math.abs(bot._investigatePos.x - 0);
    var dz = Math.abs(bot._investigatePos.z - 0);
    expect(dx <= 8).toBe(true);
    expect(dz <= 8).toBe(true);
  });

  it('mid-range sound (8-20 units) should give moderately imprecise position', () => {
    var em = createManagerWithBots([{x: 15, z: 0}]);
    var soundPos = {x: 0, y: 0, z: 0};
    em.reportSound(soundPos, 'gunshot', 30);
    var bot = em.enemies[0];
    var dx = Math.abs(bot._investigatePos.x - 0);
    var dz = Math.abs(bot._investigatePos.z - 0);
    expect(dx <= 3).toBe(true);
    expect(dz <= 3).toBe(true);
  });

  it('should not alert bots outside the sound radius', () => {
    var em = createManagerWithBots([{x: 50, z: 0}]);
    em.enemies[0].state = 0;
    var prevState = em.enemies[0].state;
    em.reportSound({x: 0, y: 0, z: 0}, 'footstep', 10);
    expect(em.enemies[0].state).toBe(prevState);
  });

  it('should ignore own team sounds when team param is provided', () => {
    var em = createManagerWithBots([{x: 5, z: 0}]);
    em.enemies[0].team = 'T';
    em.enemies[0].state = 0;
    em.reportSound({x: 0, y: 0, z: 0}, 'gunshot', 30, 'T');
    expect(em.enemies[0].state).toBe(0);
  });

  it('should react to enemy team sounds', () => {
    var em = createManagerWithBots([{x: 5, z: 0}]);
    em.enemies[0].team = 'CT';
    em.enemies[0].state = 0;
    em.reportSound({x: 0, y: 0, z: 0}, 'gunshot', 30, 'T');
    expect(em.enemies[0].state).not.toBe(0);
  });
});
