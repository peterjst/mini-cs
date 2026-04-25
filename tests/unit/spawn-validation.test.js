// Tests for the validated-spawn helper and the bot/minion spawn paths that use it.
// Class-of-bug coverage: any waypoint/origin-based offset spawn must validate against walls
// so it cannot place enemies inside Bloodstrike's enclosed inner block.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/maps/props.js');
  loadModule('js/maps/dust.js');
  loadModule('js/maps/office.js');
  loadModule('js/maps/warehouse.js');
  loadModule('js/maps/bloodstrike.js');
  loadModule('js/maps/italy.js');
  loadModule('js/maps/aztec.js');
  loadModule('js/maps/arena.js');
  loadModule('js/systems/enemies.js');
});

function isInsideBloodstrikeInner(pos) {
  return pos.x > -20 && pos.x < 20 && pos.z > -12 && pos.z < 12;
}

function buildBloodstrikeWalls() {
  var bs = GAME._maps.find(function(m) { return m.name === 'Bloodstrike'; });
  var scene = { add: function() {}, remove: function() {} };
  return { walls: bs.build(scene), waypoints: bs.waypoints, botSpawns: bs.botSpawns };
}

describe('_findValidSpawn helper', () => {
  it('is exposed on GAME', () => {
    expect(typeof GAME._findValidSpawn).toBe('function');
  });

  it('returns null when origin is fully boxed in by walls within the offset range', () => {
    // Tight box around origin — all rays will hit it
    var box = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 8), new THREE.MeshStandardMaterial());
    box.position.set(0, 2, 0);
    var pos = GAME._findValidSpawn(0, 0, [box], { minOff: 1, maxOff: 4, retries: 50 });
    expect(pos).toBeNull();
  });

  it('returns a position satisfying offset bounds when no walls', () => {
    var pos = GAME._findValidSpawn(10, 10, [], { minOff: 2, maxOff: 5 });
    expect(pos).not.toBeNull();
    var d = Math.sqrt((pos.x - 10) ** 2 + (pos.z - 10) ** 2);
    expect(d).toBeGreaterThanOrEqual(2 - 0.001);
    expect(d).toBeLessThanOrEqual(5 + 0.001);
  });

  it('respects minPlayerDist when a playerPos is supplied', () => {
    var pos = GAME._findValidSpawn(0, 0, [], {
      minOff: 1, maxOff: 4, minPlayerDist: 3, playerPos: { x: 0, z: 0 }
    });
    if (pos) {
      var d = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      expect(d).toBeGreaterThanOrEqual(3 - 0.001);
    }
  });

  it('rejects positions on the far side of a wall (line-of-sight check)', () => {
    // Wall between origin (0, -14) and any +z offset spawn — the inner-N-wall scenario
    var wall = new THREE.Mesh(new THREE.BoxGeometry(40, 4, 1), new THREE.MeshStandardMaterial());
    wall.position.set(0, 2, -12.5);
    // Force all 50 attempts to point in +z direction by repeatedly seeking — most random angles
    // won't try +z, so do many trials and check that no returned spawn ever has z > -12.
    var insideCount = 0;
    for (var i = 0; i < 200; i++) {
      var pos = GAME._findValidSpawn(0, -14, [wall], { minOff: 1, maxOff: 4, retries: 5 });
      if (pos && pos.z > -12) insideCount++;
    }
    expect(insideCount).toBe(0);
  });
});

describe('Bloodstrike: bot/minion spawns from waypoints near the inner block stay out', () => {
  // Waypoints adjacent to the inner block's N/S walls — these are the dangerous origins
  // because a 1–4 unit offset toward the block would otherwise cross into it.
  var ADJACENT_WAYPOINTS = [
    { x: -14, z: -14 }, { x: 0, z: -14 }, { x: 14, z: -14 }, // north corridor
    { x: -14, z: 14 },  { x: 0, z: 14 },  { x: 14, z: 14 },  // south corridor
  ];

  it('1000 trials per adjacent waypoint never produce a position inside the inner block', () => {
    var ctx = buildBloodstrikeWalls();
    var hits = [];
    for (var i = 0; i < ADJACENT_WAYPOINTS.length; i++) {
      var wp = ADJACENT_WAYPOINTS[i];
      for (var t = 0; t < 1000; t++) {
        var pos = GAME._findValidSpawn(wp.x, wp.z, ctx.walls, { minOff: 1, maxOff: 4 });
        if (pos && isInsideBloodstrikeInner(pos)) {
          hits.push({ wp: wp, pos: pos });
          break;
        }
      }
    }
    expect(hits.length, 'spawns leaked into inner block: ' + JSON.stringify(hits)).toBe(0);
  });
});

describe('Bloodstrike: boss minion spawns from boss positions hugging the inner block stay out', () => {
  // Boss can move during a fight — these are corridor positions adjacent to the inner block.
  // A 2–5 unit offset toward the block must not place a minion inside.
  var DANGEROUS_BOSS_POSITIONS = [
    { x: 22, z: 13 },   // SE corner, just outside inner-S/inner-E walls
    { x: -22, z: -13 }, // NW corner
    { x: 0, z: -14 },   // mid-north corridor, 2u from wall
    { x: 0, z: 14 },    // mid-south
    { x: 22, z: 0 },    // mid-east
    { x: -22, z: 0 },   // mid-west
  ];

  it('500 trials per dangerous boss position never spawn a minion inside the inner block', () => {
    var ctx = buildBloodstrikeWalls();
    var player = { x: 0, z: 20 }; // far from any boss position
    var hits = [];
    for (var i = 0; i < DANGEROUS_BOSS_POSITIONS.length; i++) {
      var bp = DANGEROUS_BOSS_POSITIONS[i];
      for (var t = 0; t < 500; t++) {
        var pos = GAME._findValidSpawn(bp.x, bp.z, ctx.walls, {
          minOff: 2, maxOff: 5, minPlayerDist: 6, playerPos: player
        });
        if (!pos) {
          pos = GAME._findValidSpawn(bp.x, bp.z, ctx.walls, { minOff: 2, maxOff: 5 });
        }
        if (!pos) pos = { x: bp.x, z: bp.z }; // matches in-game fallback
        if (isInsideBloodstrikeInner(pos)) {
          hits.push({ bp: bp, pos: pos });
          break;
        }
      }
    }
    expect(hits.length, 'minion spawns leaked into inner block: ' + JSON.stringify(hits)).toBe(0);
  });
});

describe('Class-of-bug guard: every offset-spawn caller routes through _findValidSpawn', () => {
  // Greps the source for the legacy "wp + random offset, push to enemies/queue" pattern
  // without an accompanying _findValidSpawn / _isSpawnClear / _hasLineOfSight call.
  // If a future caller bypasses validation, this test should fail.
  var fs = require('fs');
  var FILES = [
    'js/modes/deathmatch.js',
    'js/modes/gungame.js',
    'js/systems/boss.js',
  ];

  it('does not contain the unvalidated "wp + Math.cos(angle) * offset" pattern', () => {
    var offenders = [];
    for (var i = 0; i < FILES.length; i++) {
      var src = fs.readFileSync(FILES[i], 'utf-8');
      // Look for the legacy pattern: literal Math.cos(angle) * offset assignment
      // immediately followed by a new Enemy / queue.push without a _findValidSpawn nearby.
      var hasCosOffsetSpawn = /Math\.cos\(angle\)\s*\*\s*off(set)?/.test(src);
      var hasValidator = /_findValidSpawn|_isSpawnClear|_hasLineOfSight/.test(src);
      // spawnBots in enemies.js is the reference impl; these three callers must validate too.
      if (hasCosOffsetSpawn && !hasValidator) offenders.push(FILES[i]);
    }
    expect(offenders, 'unvalidated offset-spawn pattern in: ' + offenders.join(', ')).toEqual([]);
  });
});
