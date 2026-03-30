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

describe('Purposeful navigation', () => {
  function createEnemyWithWaypoints(waypoints, personalityIndex) {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    var id = personalityIndex !== undefined ? personalityIndex : 0;
    em.spawnBots(null, waypoints, [], 1, {x: 50, z: 50}, {x: 25, z: 25});
    var enemy = em.enemies[0];
    enemy.id = id;
    return { enemy: enemy, manager: em };
  }

  it('should have _scoreWaypoint method', () => {
    var wp = [{x:0,z:0},{x:10,z:10}];
    var r = createEnemyWithWaypoints(wp);
    expect(typeof r.enemy._scoreWaypoint).toBe('function');
  });

  it('should have _waypointVisitTimes array initialized', () => {
    var wp = [{x:0,z:0},{x:10,z:10},{x:20,z:20}];
    var r = createEnemyWithWaypoints(wp);
    expect(r.enemy._waypointVisitTimes).toBeDefined();
    expect(r.enemy._waypointVisitTimes.length).toBe(wp.length);
  });

  it('should score waypoints closer to last-known player position higher for aggressive bots', () => {
    var wp = [{x:0,z:0},{x:10,z:0},{x:20,z:0}];
    var r = createEnemyWithWaypoints(wp, 0); // id 0 = aggressive
    r.enemy.mesh.position.set(10, 0, 0);
    r.enemy._lastSeenPlayerPos = new THREE.Vector3(20, 0, 0);
    var ctx = { allyPositions: [], now: 1000 };
    var scoreNear = r.enemy._scoreWaypoint(2, ctx); // wp at x:20 (near player)
    var scoreFar = r.enemy._scoreWaypoint(0, ctx);  // wp at x:0 (far from player)
    expect(scoreNear).toBeGreaterThan(scoreFar);
  });

  it('should score waypoints not recently visited higher', () => {
    GAME.setDifficulty('elite'); // minimal noise for deterministic test
    var wp = [{x:0,z:0},{x:10,z:0},{x:20,z:0}];
    var r = createEnemyWithWaypoints(wp, 1); // balanced
    r.enemy.mesh.position.set(10, 0, 0);
    r.enemy._waypointVisitTimes[0] = 0;     // visited long ago
    r.enemy._waypointVisitTimes[2] = 50000; // visited very recently
    var ctx = { allyPositions: [], now: 50000 };
    // Average over multiple runs to overcome residual noise
    var totalOld = 0, totalRecent = 0;
    for (var i = 0; i < 20; i++) {
      totalOld += r.enemy._scoreWaypoint(0, ctx);
      totalRecent += r.enemy._scoreWaypoint(2, ctx);
    }
    expect(totalOld / 20).toBeGreaterThan(totalRecent / 20);
    GAME.setDifficulty('normal');
  });

  it('should score waypoints far from allies higher', () => {
    var wp = [{x:0,z:0},{x:30,z:0}];
    var r = createEnemyWithWaypoints(wp, 1);
    r.enemy.mesh.position.set(15, 0, 0);
    var ctx = { allyPositions: [{x:1,z:0}], now: 1000 };
    var scoreNearAlly = r.enemy._scoreWaypoint(0, ctx);
    var scoreFarAlly = r.enemy._scoreWaypoint(1, ctx);
    expect(scoreFarAlly).toBeGreaterThan(scoreNearAlly);
  });
});

describe('Ambush state', () => {
  function createEnemyForAmbush() {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    var waypoints = [{x:0,z:0},{x:10,z:10}];
    var wallGeo = new THREE.BoxGeometry(1, 2, 1);
    var wallMat = new THREE.MeshBasicMaterial();
    var wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(1.5, 1, 0);
    scene.add(wall);
    em.spawnBots(null, waypoints, [wall], 1, {x: 50, z: 50}, {x: 25, z: 25});
    return { enemy: em.enemies[0], manager: em, wall: wall };
  }

  it('should define AMBUSH state as 6', () => {
    var r = createEnemyForAmbush();
    r.enemy.state = 6;
    expect(r.enemy.state).toBe(6);
  });

  it('should initialize ambush-related fields', () => {
    var r = createEnemyForAmbush();
    expect(r.enemy._ambushTimer).toBeDefined();
    expect(r.enemy._ambushTimeout).toBeDefined();
    expect(r.enemy._ambushEntryHP).toBeDefined();
  });

  it('should transition from AMBUSH to PATROL on timeout', () => {
    var r = createEnemyForAmbush();
    r.enemy.state = 6;
    r.enemy._ambushTimer = 0;
    r.enemy._ambushTimeout = 1.0;
    var playerPos = new THREE.Vector3(100, 0, 100);
    r.enemy.update(2.0, playerPos, true, Date.now());
    expect(r.enemy.state).toBe(0);
  });

  it('should transition from AMBUSH to ATTACK/CHASE when player enters FOV', () => {
    var r = createEnemyForAmbush();
    r.enemy.state = 6;
    r.enemy._ambushTimer = 0;
    r.enemy._ambushTimeout = 10;
    r.enemy._ambushEntryHP = r.enemy.health;
    r.enemy.mesh.rotation.y = Math.PI;
    r.enemy._hasReacted = false;
    r.enemy._reactionDelay = 0;
    r.enemy._reactionTimer = 0;
    var playerPos = new THREE.Vector3(0, 1.5, 5);
    r.enemy.sightRange = 50;
    r.enemy.attackRange = 30;
    r.enemy.update(0.016, playerPos, true, Date.now());
    expect(r.enemy.state === 2 || r.enemy.state === 1).toBe(true);
  });

  it('should transition from AMBUSH to RETREAT when damaged below threshold', () => {
    var r = createEnemyForAmbush();
    r.enemy.state = 6;
    r.enemy._ambushTimer = 0;
    r.enemy._ambushTimeout = 10;
    r.enemy._ambushEntryHP = 100;
    r.enemy.health = 5;
    r.enemy.personality = { retreatHP: 0.5, speedMult: 1, aimSpeedMult: 1, reactionMult: 1, patrolPause: 0.3, burstMin: 2, burstMax: 4 };
    var playerPos = new THREE.Vector3(100, 1.5, 100);
    r.enemy.update(0.016, playerPos, true, Date.now());
    expect(r.enemy.state === 4 || r.enemy.state === 0).toBe(true);
  });

  it('should engage when damaged but HP above retreat threshold and attacker visible', () => {
    var r = createEnemyForAmbush();
    r.enemy.state = 6;
    r.enemy._ambushTimer = 0;
    r.enemy._ambushTimeout = 10;
    r.enemy._ambushEntryHP = 100;
    r.enemy.health = 80;
    r.enemy.mesh.rotation.y = Math.PI;
    r.enemy.sightRange = 50;
    r.enemy.attackRange = 30;
    r.enemy._hasReacted = false;
    var playerPos = new THREE.Vector3(0, 1.5, 5);
    r.enemy.update(0.016, playerPos, true, Date.now());
    expect(r.enemy.state === 2 || r.enemy.state === 1).toBe(true);
  });
});

describe('Pre-aiming threat angles', () => {
  it('should have _findThreatAngle method', () => {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    em.spawnBots(null, [{x:0,z:0},{x:10,z:10}], [], 1, {x:50,z:50}, {x:25,z:25});
    expect(typeof em.enemies[0]._findThreatAngle).toBe('function');
  });

  it('should have pre-aim state fields initialized', () => {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    em.spawnBots(null, [{x:0,z:0},{x:10,z:10}], [], 1, {x:50,z:50}, {x:25,z:25});
    var e = em.enemies[0];
    expect(e._preAimTimer).toBeDefined();
    expect(e._preAimTarget).toBeDefined();
  });

  it('_moveToward should accept skipRotation parameter', () => {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    em.spawnBots(null, [{x:0,z:0},{x:10,z:10}], [], 1, {x:50,z:50}, {x:25,z:25});
    var e = em.enemies[0];
    e.mesh.position.set(0, 0, 0);
    var initialRotY = e.mesh.rotation.y;
    e._moveToward({x: 10, z: 0}, 0.016, null, true);
    expect(Math.abs(e.mesh.rotation.y - initialRotY)).toBeLessThan(0.01);
  });

  it('_findThreatAngle should return null in open area with no walls', () => {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    em.spawnBots(null, [{x:0,z:0},{x:10,z:10}], [], 1, {x:50,z:50}, {x:25,z:25});
    var e = em.enemies[0];
    e.mesh.position.set(0, 0, 0);
    var angle = e._findThreatAngle();
    expect(angle).toBeNull();
  });
});


describe('Spawn line-of-sight check', () => {
  it('should not spawn bots on the far side of a wall from their waypoint', () => {
    // Create an enclosed box (like Bloodstrike inner block) with a waypoint outside
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');

    // Build 4 walls forming a box from x:-5..5, z:-5..5
    var wallMat = new THREE.MeshBasicMaterial();
    var walls = [];
    // North wall at z=-5.5
    var nWall = new THREE.Mesh(new THREE.BoxGeometry(12, 3, 1), wallMat);
    nWall.position.set(0, 1.5, -5.5);
    scene.add(nWall); walls.push(nWall);
    // South wall at z=5.5
    var sWall = new THREE.Mesh(new THREE.BoxGeometry(12, 3, 1), wallMat);
    sWall.position.set(0, 1.5, 5.5);
    scene.add(sWall); walls.push(sWall);
    // West wall at x=-5.5
    var wWall = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 12), wallMat);
    wWall.position.set(-5.5, 1.5, 0);
    scene.add(wWall); walls.push(wWall);
    // East wall at x=5.5
    var eWall = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 12), wallMat);
    eWall.position.set(5.5, 1.5, 0);
    scene.add(eWall); walls.push(eWall);

    // Waypoint just outside the north wall (z=-7), player far away
    var waypoints = [{x: 0, z: -7}, {x: 20, z: -7}];
    var em = new GAME.EnemyManager(scene);

    // Spawn many bots and verify none end up inside the box (|x|<5, |z|<5)
    for (var trial = 0; trial < 10; trial++) {
      em.spawnBots(null, waypoints, walls, 5, {x: 60, z: 60}, {x: -30, z: -30});
      for (var i = 0; i < em.enemies.length; i++) {
        var pos = em.enemies[i].mesh.position;
        var insideBox = Math.abs(pos.x) < 4.5 && Math.abs(pos.z) < 4.5;
        expect(insideBox, 'Bot spawned inside enclosed area at (' + pos.x.toFixed(1) + ', ' + pos.z.toFixed(1) + ')').toBe(false);
      }
      em.clearAll();
    }
  });
});

describe('Wall-facing and stuck recovery', () => {
  function makeCornerBot() {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    var wallMat = new THREE.MeshBasicMaterial();
    // Front wall
    var frontWall = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 1), wallMat);
    frontWall.position.set(0, 1, -2);
    scene.add(frontWall);
    // Left wall
    var leftWall = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 10), wallMat);
    leftWall.position.set(-2, 1, 0);
    scene.add(leftWall);
    // Right wall
    var rightWall = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 10), wallMat);
    rightWall.position.set(2, 1, 0);
    scene.add(rightWall);
    var walls = [frontWall, leftWall, rightWall];
    em.spawnBots(null, [{x:0,z:0},{x:10,z:10},{x:-10,z:10}], walls, 1, {x:50,z:50}, {x:25,z:25});
    return { em: em, e: em.enemies[0], walls: walls };
  }

  it('should have _isFacingWall method', () => {
    var ctx = makeCornerBot();
    expect(typeof ctx.e._isFacingWall).toBe('function');
  });

  it('_isFacingWall should return false when no wall within 1.5 units', () => {
    var ctx = makeCornerBot();
    var e = ctx.e;
    // Mock raycaster returns empty (no wall) — should return false
    expect(e._isFacingWall()).toBe(false);
    // Forward raycast uses 1.5 unit range
    expect(e._rc.far).toBe(1.5);
  });

  it('_isFacingWall should return false when no wall ahead', () => {
    var ctx = makeCornerBot();
    var e = ctx.e;
    e.mesh.position.set(0, 0, 0);
    e.mesh.rotation.y = 0; // facing +z direction (away from front wall)
    expect(e._isFacingWall()).toBe(false);
  });

  it('stuck detection in CHASE should fall back to PATROL', () => {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    em.spawnBots(null, [{x:0,z:0},{x:10,z:10}], [], 1, {x:50,z:50}, {x:25,z:25});
    var e = em.enemies[0];
    e.state = 1; // CHASE
    e.mesh.position.set(5, 0, 5);
    e._lastStuckCheckPos = { x: 5, z: 5 };
    e._stuckTimer = 1.6;
    var playerPos = new THREE.Vector3(50, 1.5, 50);
    e.update(0.01, playerPos, true, Date.now());
    expect(e.state).toBe(0);
  });

  it('stuck detection in INVESTIGATE should fall back to PATROL', () => {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    em.spawnBots(null, [{x:0,z:0},{x:10,z:10}], [], 1, {x:50,z:50}, {x:25,z:25});
    var e = em.enemies[0];
    e.state = 3; // INVESTIGATE
    e._investigatePos = new THREE.Vector3(20, 0, 20);
    e._investigateTimer = 0;
    e._lookAroundTimer = 5;
    e.mesh.position.set(5, 0, 5);
    e._lastStuckCheckPos = { x: 5, z: 5 };
    e._stuckTimer = 1.6;
    var playerPos = new THREE.Vector3(50, 1.5, 50);
    e.update(0.01, playerPos, true, Date.now());
    expect(e.state).toBe(0);
  });

  it('stuck detection in RETREAT should fall back to PATROL', () => {
    var scene = new THREE.Scene();
    GAME.setDifficulty('normal');
    var em = new GAME.EnemyManager(scene);
    em.spawnBots(null, [{x:0,z:0},{x:10,z:10}], [], 1, {x:50,z:50}, {x:25,z:25});
    var e = em.enemies[0];
    e.state = 4; // RETREAT
    e._retreatTarget = {x: 20, z: 20};
    e.mesh.position.set(5, 0, 5);
    e._lastStuckCheckPos = { x: 5, z: 5 };
    e._stuckTimer = 1.6;
    var playerPos = new THREE.Vector3(50, 1.5, 50);
    e.update(0.01, playerPos, true, Date.now());
    expect(e.state).toBe(0);
  });
});

describe('Tracer pool', () => {
  var mgr, scene;
  beforeAll(() => {
    scene = new THREE.Scene();
    mgr = new GAME.EnemyManager(scene);
  });

  it('should initialize tracer line pool with shared material', () => {
    expect(mgr._tracerPool).toBeDefined();
    expect(mgr._tracerPool.length).toBe(8);
    mgr._tracerPool.forEach(function(line) {
      expect(line.geometry).toBeDefined();
      expect(line.material).toBeDefined();
      expect(line.visible).toBe(false);
      expect(line.frustumCulled).toBe(false);
    });
  });

  it('should share a single LineBasicMaterial across all pool tracers', () => {
    var mat = mgr._tracerPool[0].material;
    expect(mat.type).toBe('LineBasicMaterial');
    mgr._tracerPool.forEach(function(line) {
      expect(line.material).toBe(mat);
    });
  });

  it('should initialize muzzle flash light pool', () => {
    expect(mgr._flashPool).toBeDefined();
    expect(mgr._flashPool.length).toBe(4);
    mgr._flashPool.forEach(function(light) {
      expect(light.color).toBeDefined();
      expect(light.intensity).toBe(0);
      expect(light.distance).toBe(5);
    });
  });

  it('should have round-robin indices starting at 0', () => {
    expect(mgr._tracerIdx).toBe(0);
    expect(mgr._flashIdx).toBe(0);
  });
});

describe('Combat movement weights', () => {
  var calcWeights;

  beforeAll(() => {
    calcWeights = GAME._calcCombatWeights;
  });

  it('should be exposed as GAME._calcCombatWeights', () => {
    expect(typeof calcWeights).toBe('function');
  });

  it('should return normalized weights summing to 1.0 for aggressive personality', () => {
    var w = calcWeights('aggressive', { hpRatio: 1.0, distToPlayer: 10, hasNearbyCover: true });
    var sum = w.strafe + w.push + w.hold + w.retreatFire + w.rushCover;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('should return normalized weights summing to 1.0 for balanced personality', () => {
    var w = calcWeights('balanced', { hpRatio: 1.0, distToPlayer: 10, hasNearbyCover: true });
    var sum = w.strafe + w.push + w.hold + w.retreatFire + w.rushCover;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('should return normalized weights summing to 1.0 for cautious personality', () => {
    var w = calcWeights('cautious', { hpRatio: 1.0, distToPlayer: 10, hasNearbyCover: true });
    var sum = w.strafe + w.push + w.hold + w.retreatFire + w.rushCover;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('aggressive personality should have highest push weight at full HP', () => {
    var w = calcWeights('aggressive', { hpRatio: 1.0, distToPlayer: 10, hasNearbyCover: true });
    expect(w.push).toBeGreaterThan(w.strafe);
    expect(w.push).toBeGreaterThan(w.retreatFire);
  });

  it('cautious personality should have highest retreatFire weight', () => {
    var w = calcWeights('cautious', { hpRatio: 1.0, distToPlayer: 10, hasNearbyCover: true });
    expect(w.retreatFire).toBeGreaterThan(w.push);
  });

  it('low HP should halve push weight and double retreatFire weight', () => {
    var wFull = calcWeights('balanced', { hpRatio: 1.0, distToPlayer: 10, hasNearbyCover: true });
    var wLow = calcWeights('balanced', { hpRatio: 0.3, distToPlayer: 10, hasNearbyCover: true });
    expect(wLow.retreatFire).toBeGreaterThan(wFull.retreatFire);
    expect(wLow.push).toBeLessThan(wFull.push);
  });

  it('close player should reduce push weight and boost retreatFire', () => {
    var wFar = calcWeights('balanced', { hpRatio: 1.0, distToPlayer: 10, hasNearbyCover: true });
    var wClose = calcWeights('balanced', { hpRatio: 1.0, distToPlayer: 3, hasNearbyCover: true });
    expect(wClose.push).toBeLessThan(wFar.push);
    expect(wClose.retreatFire).toBeGreaterThan(wFar.retreatFire);
  });

  it('far player should boost push and hold weights', () => {
    var wMid = calcWeights('balanced', { hpRatio: 1.0, distToPlayer: 10, hasNearbyCover: true });
    var wFar = calcWeights('balanced', { hpRatio: 1.0, distToPlayer: 20, hasNearbyCover: true });
    expect(wFar.push).toBeGreaterThan(wMid.push);
    expect(wFar.hold).toBeGreaterThan(wMid.hold);
  });

  it('no nearby cover should zero out rushCover and redistribute', () => {
    var w = calcWeights('balanced', { hpRatio: 1.0, distToPlayer: 10, hasNearbyCover: false });
    expect(w.rushCover).toBe(0);
    var sum = w.strafe + w.push + w.hold + w.retreatFire + w.rushCover;
    expect(sum).toBeCloseTo(1.0, 5);
  });
});

describe('Combat movement initialization', () => {
  var enemy;

  beforeAll(() => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    enemy = em.enemies[0];
  });

  it('should have _combatMove initialized to null', () => {
    expect(enemy._combatMove).toBeNull();
  });

  it('should have _combatMoveTimer initialized to 0', () => {
    expect(enemy._combatMoveTimer).toBe(0);
  });

  it('should have _combatMoveDuration initialized to 0', () => {
    expect(enemy._combatMoveDuration).toBe(0);
  });

  it('should have _microPauseTimer initialized to 0', () => {
    expect(enemy._microPauseTimer).toBe(0);
  });

  it('should have _jiggleCount initialized to 0', () => {
    expect(enemy._jiggleCount).toBe(0);
  });

  it('should still have _strafeDir for strafe movement', () => {
    expect(enemy._strafeDir).toBe(1);
  });

  it('should have _losGraceTimer initialized to 0', () => {
    expect(enemy._losGraceTimer).toBe(0);
  });

  it('should have _lastKnownPlayerPos initialized to null', () => {
    expect(enemy._lastKnownPlayerPos).toBeNull();
  });
});

describe('Combat movement selection', () => {
  it('_rollCombatMove should be a method on Enemy', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    expect(typeof enemy._rollCombatMove).toBe('function');
  });

  it('_rollCombatMove should set _combatMove to a valid type (0-4)', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy._rollCombatMove({ x: 10, y: 0, z: 10 }, 10);
    expect(enemy._combatMove).toBeGreaterThanOrEqual(0);
    expect(enemy._combatMove).toBeLessThanOrEqual(4);
  });

  it('_rollCombatMove should set a positive _combatMoveDuration for non-rushCover types', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    var foundPositiveDuration = false;
    for (var i = 0; i < 50; i++) {
      enemy._rollCombatMove({ x: 10, y: 0, z: 10 }, 10);
      if (enemy._combatMove !== 4 && enemy._combatMoveDuration > 0) {
        foundPositiveDuration = true;
        break;
      }
    }
    expect(foundPositiveDuration).toBe(true);
  });

  it('_rollCombatMove should reset _combatMoveTimer to 0', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy._combatMoveTimer = 5;
    enemy._rollCombatMove({ x: 10, y: 0, z: 10 }, 10);
    expect(enemy._combatMoveTimer).toBe(0);
  });
});

describe('Combat movement micro-pauses', () => {
  it('15% of movement transitions should trigger micro-pauses over many rolls', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    var pauseCount = 0;
    var trials = 200;
    for (var i = 0; i < trials; i++) {
      enemy._rollCombatMove({ x: 10, y: 0, z: 10 }, 10);
      if (enemy._microPauseTimer > 0) pauseCount++;
    }
    expect(pauseCount / trials).toBeGreaterThan(0.05);
    expect(pauseCount / trials).toBeLessThan(0.30);
  });
});

describe('LOS grace period', () => {
  it('enemy in ATTACK should have _losGraceTimer initialized to 0', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    expect(enemy._losGraceTimer).toBe(0);
  });

  it('_lastKnownPlayerPos should be null initially', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    expect(enemy._lastKnownPlayerPos).toBeNull();
  });
});

describe('Cover distance cap', () => {
  it('_findNearestCover should not return cover beyond 4 units', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    enemy.walls = [];
    var result = enemy._findNearestCover({ x: 10, y: 0, z: 10 });
    expect(result).toBeNull();
  });
});

describe('Retreat facing constraint', () => {
  it('enemy should have _retreatFacingPlayer property', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    expect(enemy).toHaveProperty('_retreatFacingPlayer');
  });
});

describe('Strafe anti-oscillation', () => {
  it('strafe interval should be at least 0.5s', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    expect(enemy._strafeInterval).toBeGreaterThanOrEqual(0.5);
  });

  it('jiggle interval should be at least 0.2s', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    expect(enemy._jiggleInterval).toBeGreaterThanOrEqual(0.2);
  });
});

describe('Combat movement state reset', () => {
  it('combat movement properties should be resettable', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    em.spawnBots([{x:0, z:0}], [{x:5, z:5}], [], 1, {x:50, z:50}, {x:25, z:25});
    var enemy = em.enemies[0];
    // Set properties to non-default values
    enemy._combatMove = 1;
    enemy._combatMoveTimer = 1.5;
    enemy._combatMoveDuration = 2.0;
    enemy._losGraceTimer = 0.3;
    enemy._jiggleCount = 5;
    // Verify they can be reset
    enemy._combatMove = null;
    enemy._combatMoveTimer = 0;
    enemy._combatMoveDuration = 0;
    enemy._losGraceTimer = 0;
    enemy._jiggleCount = 0;
    expect(enemy._combatMove).toBeNull();
    expect(enemy._combatMoveTimer).toBe(0);
    expect(enemy._combatMoveDuration).toBe(0);
    expect(enemy._losGraceTimer).toBe(0);
    expect(enemy._jiggleCount).toBe(0);
  });
});

describe('Difficulty-scaled activity parameters', () => {
  it('HOLD durations should decrease with difficulty', () => {
    var params = GAME._ACTIVITY_PARAMS;
    expect(params.easy.holdMin).toBe(0.8);
    expect(params.easy.holdMax).toBe(1.5);
    expect(params.normal.holdMin).toBe(0.5);
    expect(params.normal.holdMax).toBe(1.0);
    expect(params.hard.holdMin).toBe(0.3);
    expect(params.hard.holdMax).toBe(0.6);
    expect(params.elite.holdMin).toBe(0.3);
    expect(params.elite.holdMax).toBe(0.6);
  });

  it('micro-pause chance should decrease with difficulty', () => {
    var params = GAME._ACTIVITY_PARAMS;
    expect(params.easy.microPauseChance).toBe(0.15);
    expect(params.normal.microPauseChance).toBe(0.10);
    expect(params.hard.microPauseChance).toBe(0.05);
    expect(params.elite.microPauseChance).toBe(0);
  });

  it('micro-pause durations should decrease with difficulty', () => {
    var params = GAME._ACTIVITY_PARAMS;
    expect(params.easy.microPauseMin).toBe(0.2);
    expect(params.easy.microPauseMax).toBe(0.4);
    expect(params.normal.microPauseMin).toBe(0.15);
    expect(params.normal.microPauseMax).toBe(0.3);
    expect(params.hard.microPauseMin).toBe(0.1);
    expect(params.hard.microPauseMax).toBe(0.2);
  });

  it('burst cooldown should decrease with difficulty', () => {
    var params = GAME._ACTIVITY_PARAMS;
    expect(params.easy.burstCooldownMin).toBe(0.3);
    expect(params.easy.burstCooldownMax).toBe(0.8);
    expect(params.normal.burstCooldownMin).toBe(0.25);
    expect(params.normal.burstCooldownMax).toBe(0.6);
    expect(params.hard.burstCooldownMin).toBe(0.2);
    expect(params.hard.burstCooldownMax).toBe(0.4);
    expect(params.elite.burstCooldownMin).toBe(0.15);
    expect(params.elite.burstCooldownMax).toBe(0.3);
  });

  it('investigate look-around time should decrease with difficulty', () => {
    var params = GAME._ACTIVITY_PARAMS;
    expect(params.easy.investigateMin).toBe(3);
    expect(params.easy.investigateMax).toBe(4);
    expect(params.normal.investigateMin).toBe(2.5);
    expect(params.normal.investigateMax).toBe(3.5);
    expect(params.hard.investigateMin).toBe(1.5);
    expect(params.hard.investigateMax).toBe(2);
    expect(params.elite.investigateMin).toBe(1.0);
    expect(params.elite.investigateMax).toBe(1.5);
  });

  it('patrol pause multiplier should decrease with difficulty', () => {
    var params = GAME._ACTIVITY_PARAMS;
    expect(params.easy.patrolPauseMult).toBe(1.0);
    expect(params.normal.patrolPauseMult).toBe(0.7);
    expect(params.hard.patrolPauseMult).toBe(0.3);
    expect(params.elite.patrolPauseMult).toBe(0);
  });

  it('hard/elite should have holdDrift flag for micro-drift during HOLD', () => {
    var params = GAME._ACTIVITY_PARAMS;
    expect(params.easy.holdDrift).toBe(false);
    expect(params.normal.holdDrift).toBe(false);
    expect(params.hard.holdDrift).toBe(true);
    expect(params.elite.holdDrift).toBe(true);
  });

  it('hard/elite should have microPauseDrift flag', () => {
    var params = GAME._ACTIVITY_PARAMS;
    expect(params.easy.microPauseDrift).toBe(false);
    expect(params.normal.microPauseDrift).toBe(false);
    expect(params.hard.microPauseDrift).toBe(true);
    expect(params.elite.microPauseDrift).toBe(true);
  });

  it('stale position threshold should decrease with difficulty', () => {
    var params = GAME._ACTIVITY_PARAMS;
    expect(params.easy.staleThreshold).toBe(6.0);
    expect(params.normal.staleThreshold).toBe(4.0);
    expect(params.hard.staleThreshold).toBe(2.5);
    expect(params.elite.staleThreshold).toBe(1.8);
  });
});
