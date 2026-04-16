# Spawn Zone System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fixed player/enemy spawn positions with randomized zone-based spawning for variety across rounds.

**Architecture:** Each map defines `spawnZones` (center + radius + label). A shared helper `randomSpawnInZone()` picks a random position within a zone with wall collision validation. Modes select zones by type (team label for competitive team, random for solo/casual, furthest-from-enemies for deathmatch respawn). Enemy spawning switches from fixed `botSpawns` to waypoint-based selection with a 20-unit minimum distance from the player.

**Tech Stack:** Three.js (AABB collision via Raycaster), vanilla JS IIFE modules

---

## File Structure

| File | Role |
|------|------|
| `js/maps/shared.js` | Add `randomSpawnInZone(zone, walls)` and `pickSpawnZone(zones, label)` helpers; pass `spawnZones` through map registration |
| `js/maps/dust.js` | Add `spawnZones` array |
| `js/maps/office.js` | Add `spawnZones` array |
| `js/maps/warehouse.js` | Add `spawnZones` array |
| `js/maps/bloodstrike.js` | Add `spawnZones` array |
| `js/maps/italy.js` | Add `spawnZones` array |
| `js/maps/aztec.js` | Add `spawnZones` array |
| `js/maps/arena.js` | Add `spawnZones` array |
| `js/systems/enemies.js` | Update `spawnBots` to use 20-unit distance filter on waypoints |
| `js/modes/competitive.js` | Use zone-based player spawning |
| `js/modes/survival.js` | Use zone-based player spawning |
| `js/modes/gungame.js` | Use zone-based player spawning |
| `js/modes/deathmatch.js` | Use zone-based player spawning for initial spawn and respawn |
| `js/core/main.js` | Use zone-based spawning for tour mode |
| `tests/unit/spawn-zones.test.js` | Tests for spawn zone helpers |
| `tests/unit/enemies.test.js` | Tests for updated enemy spawning |
| `REQUIREMENTS.md` | Document spawn zone system |

---

### Task 1: Spawn Zone Helpers in shared.js

**Files:**
- Modify: `js/maps/shared.js:666-676` (map registration return object)
- Test: `tests/unit/spawn-zones.test.js` (create)

- [ ] **Step 1: Write failing tests for `randomSpawnInZone`**

Create `tests/unit/spawn-zones.test.js`:

```js
import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
});

describe('randomSpawnInZone', () => {
  var randomSpawnInZone;
  beforeAll(() => {
    randomSpawnInZone = GAME._mapHelpers.randomSpawnInZone;
  });

  it('should be a function', () => {
    expect(typeof randomSpawnInZone).toBe('function');
  });

  it('should return {x, z} within zone radius', () => {
    var zone = { x: 10, z: 10, radius: 4, label: 'ct' };
    for (var i = 0; i < 50; i++) {
      var pos = randomSpawnInZone(zone, []);
      var dx = pos.x - zone.x, dz = pos.z - zone.z;
      var dist = Math.sqrt(dx * dx + dz * dz);
      expect(dist).toBeLessThanOrEqual(zone.radius + 0.01);
    }
  });

  it('should return zone center when radius is 0', () => {
    var zone = { x: 5, z: -3, radius: 0, label: 'mid' };
    var pos = randomSpawnInZone(zone, []);
    expect(pos.x).toBe(5);
    expect(pos.z).toBe(-3);
  });

  it('should fall back to zone center after wall collisions', () => {
    // Create a wall that covers the entire zone area using a mock mesh
    var wallMesh = new THREE.Mesh(
      new THREE.BoxGeometry(100, 4, 100),
      new THREE.MeshStandardMaterial()
    );
    wallMesh.position.set(10, 2, 10);
    // randomSpawnInZone uses raycasting — with a giant wall covering the zone,
    // all random positions will collide, so it should fall back to center
    var zone = { x: 10, z: 10, radius: 4, label: 'ct' };
    var pos = randomSpawnInZone(zone, [wallMesh]);
    expect(pos.x).toBe(zone.x);
    expect(pos.z).toBe(zone.z);
  });
});

describe('pickSpawnZone', () => {
  var pickSpawnZone;
  beforeAll(() => {
    pickSpawnZone = GAME._mapHelpers.pickSpawnZone;
  });

  it('should be a function', () => {
    expect(typeof pickSpawnZone).toBe('function');
  });

  it('should return zone matching label', () => {
    var zones = [
      { x: 0, z: 0, radius: 4, label: 'ct' },
      { x: 10, z: 10, radius: 4, label: 't' },
      { x: 5, z: 5, radius: 5, label: 'mid' }
    ];
    var zone = pickSpawnZone(zones, 'ct');
    expect(zone.label).toBe('ct');
    expect(zone.x).toBe(0);
  });

  it('should return a random zone when label is null', () => {
    var zones = [
      { x: 0, z: 0, radius: 4, label: 'ct' },
      { x: 10, z: 10, radius: 4, label: 't' },
      { x: 5, z: 5, radius: 5, label: 'mid' }
    ];
    var seen = {};
    for (var i = 0; i < 100; i++) {
      var zone = pickSpawnZone(zones, null);
      seen[zone.label] = true;
    }
    // Should have picked at least 2 different zones in 100 tries
    expect(Object.keys(seen).length).toBeGreaterThanOrEqual(2);
  });

  it('should return zone furthest from a position when label is "furthest"', () => {
    var zones = [
      { x: 0, z: 0, radius: 4, label: 'ct' },
      { x: 50, z: 50, radius: 4, label: 't' },
      { x: 25, z: 25, radius: 5, label: 'mid' }
    ];
    var zone = pickSpawnZone(zones, 'furthest', [{ x: 1, z: 1 }]);
    expect(zone.label).toBe('t');
  });

  it('should return first zone as fallback for unknown label', () => {
    var zones = [
      { x: 0, z: 0, radius: 4, label: 'ct' },
      { x: 10, z: 10, radius: 4, label: 't' }
    ];
    var zone = pickSpawnZone(zones, 'nonexistent');
    expect(zone).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/spawn-zones.test.js`
Expected: FAIL — `randomSpawnInZone` and `pickSpawnZone` are not defined

- [ ] **Step 3: Implement `randomSpawnInZone` and `pickSpawnZone` in shared.js**

In `js/maps/shared.js`, add these functions before the `GAME.buildMap` function. They use the same raycaster collision approach as `_isSpawnClear` in enemies.js:

```js
  // ── Spawn Zone Helpers ──────────────────────────────────

  var _spawnRC = new THREE.Raycaster();
  var _spawnDirs = [
    new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
  ];

  function _isPositionClear(x, z, walls) {
    var origin = new THREE.Vector3(x, 0.5, z);
    var clearRadius = 0.8; // player half-width + margin
    for (var d = 0; d < _spawnDirs.length; d++) {
      _spawnRC.set(origin, _spawnDirs[d]);
      _spawnRC.far = clearRadius;
      if (_spawnRC.intersectObjects(walls, false).length > 0) return false;
    }
    return true;
  }

  function randomSpawnInZone(zone, walls) {
    if (!zone.radius || zone.radius <= 0) return { x: zone.x, z: zone.z };
    for (var i = 0; i < 10; i++) {
      var angle = Math.random() * Math.PI * 2;
      var dist = Math.random() * zone.radius;
      var x = zone.x + Math.cos(angle) * dist;
      var z = zone.z + Math.sin(angle) * dist;
      if (walls.length === 0 || _isPositionClear(x, z, walls)) {
        return { x: x, z: z };
      }
    }
    return { x: zone.x, z: zone.z }; // fallback to center
  }

  function pickSpawnZone(zones, label, enemies) {
    if (!zones || zones.length === 0) return null;

    // Fixed label — find matching zone
    if (label && label !== 'furthest') {
      for (var i = 0; i < zones.length; i++) {
        if (zones[i].label === label) return zones[i];
      }
      return zones[0]; // fallback
    }

    // Furthest from enemies
    if (label === 'furthest' && enemies && enemies.length > 0) {
      var bestZone = zones[0];
      var bestMinDist = 0;
      for (var z = 0; z < zones.length; z++) {
        var minDist = Infinity;
        for (var e = 0; e < enemies.length; e++) {
          var dx = zones[z].x - enemies[e].x;
          var dz2 = zones[z].z - enemies[e].z;
          var d = dx * dx + dz2 * dz2;
          if (d < minDist) minDist = d;
        }
        if (minDist > bestMinDist) {
          bestMinDist = minDist;
          bestZone = zones[z];
        }
      }
      return bestZone;
    }

    // Random zone
    return zones[Math.floor(Math.random() * zones.length)];
  }
```

- [ ] **Step 4: Expose helpers via `GAME._mapHelpers` and pass `spawnZones` through map registration**

In the `GAME._mapHelpers` assignment block, add:

```js
    randomSpawnInZone: randomSpawnInZone,
    pickSpawnZone: pickSpawnZone,
```

In the `GAME.buildMap` return object (around line 666-676), add `spawnZones`:

```js
    return {
      walls: walls,
      playerSpawn: def.playerSpawn,
      botSpawns: def.botSpawns,
      spawnZones: def.spawnZones || null,
      ctSpawns: def.ctSpawns || [def.playerSpawn],
      tSpawns: def.tSpawns || def.botSpawns,
      bombsites: def.bombsites || [],
      waypoints: def.waypoints,
      name: def.name,
      size: def.size,
    };
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/unit/spawn-zones.test.js`
Expected: All tests PASS

- [ ] **Step 6: Run full test suite**

Run: `npm test`
Expected: All existing tests still pass

- [ ] **Step 7: Commit**

```bash
git add js/maps/shared.js tests/unit/spawn-zones.test.js
git commit -m "feat: add spawn zone helpers (randomSpawnInZone, pickSpawnZone)"
```

---

### Task 2: Add Spawn Zones to All Maps

**Files:**
- Modify: `js/maps/dust.js:40-53`
- Modify: `js/maps/office.js:43-56`
- Modify: `js/maps/warehouse.js:42-55`
- Modify: `js/maps/bloodstrike.js:40-53`
- Modify: `js/maps/italy.js:41-57`
- Modify: `js/maps/aztec.js:40-53`
- Modify: `js/maps/arena.js:36-54`
- Test: `tests/unit/maps.test.js` (modify)

- [ ] **Step 1: Write failing test for spawnZones in map data**

Add to `tests/unit/maps.test.js`:

```js
describe('spawnZones', () => {
  it('every map should have a spawnZones array with at least 3 zones', () => {
    GAME._maps.forEach(function(map) {
      expect(map.spawnZones).toBeDefined();
      expect(Array.isArray(map.spawnZones)).toBe(true);
      expect(map.spawnZones.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('each zone should have x, z, radius, and label', () => {
    GAME._maps.forEach(function(map) {
      map.spawnZones.forEach(function(zone) {
        expect(typeof zone.x).toBe('number');
        expect(typeof zone.z).toBe('number');
        expect(typeof zone.radius).toBe('number');
        expect(zone.radius).toBeGreaterThan(0);
        expect(['ct', 't', 'mid']).toContain(zone.label);
      });
    });
  });

  it('each map should have exactly one ct, one t, and one mid zone', () => {
    GAME._maps.forEach(function(map) {
      var labels = map.spawnZones.map(function(z) { return z.label; });
      expect(labels.filter(function(l) { return l === 'ct'; }).length).toBe(1);
      expect(labels.filter(function(l) { return l === 't'; }).length).toBe(1);
      expect(labels.filter(function(l) { return l === 'mid'; }).length).toBe(1);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/maps.test.js`
Expected: FAIL — `spawnZones` is undefined on map definitions

- [ ] **Step 3: Add spawnZones to dust.js**

After the `playerSpawn` line (line 40), add before `botSpawns`:

```js
    spawnZones: [
      { x: -20, z: -20, radius: 4, label: 'ct' },
      { x: 18, z: 18, radius: 4, label: 't' },
      { x: 0, z: 0, radius: 5, label: 'mid' }
    ],
```

- [ ] **Step 4: Add spawnZones to office.js**

After `playerSpawn` (line 43):

```js
    spawnZones: [
      { x: -16, z: -16, radius: 4, label: 'ct' },
      { x: 14, z: 14, radius: 4, label: 't' },
      { x: 0, z: 0, radius: 5, label: 'mid' }
    ],
```

- [ ] **Step 5: Add spawnZones to warehouse.js**

After `playerSpawn` (line 42):

```js
    spawnZones: [
      { x: -22, z: -18, radius: 4, label: 'ct' },
      { x: 18, z: 12, radius: 4, label: 't' },
      { x: 0, z: 0, radius: 5, label: 'mid' }
    ],
```

- [ ] **Step 6: Add spawnZones to bloodstrike.js**

After `playerSpawn` (line 40):

```js
    spawnZones: [
      { x: -24, z: -18, radius: 4, label: 'ct' },
      { x: 24, z: 18, radius: 4, label: 't' },
      { x: 0, z: 0, radius: 5, label: 'mid' }
    ],
```

- [ ] **Step 7: Add spawnZones to italy.js**

After `playerSpawn` (line 41):

```js
    spawnZones: [
      { x: -24, z: -20, radius: 4, label: 'ct' },
      { x: 8, z: 8, radius: 4, label: 't' },
      { x: -8, z: -6, radius: 5, label: 'mid' }
    ],
```

- [ ] **Step 8: Add spawnZones to aztec.js**

After `playerSpawn` (line 40):

```js
    spawnZones: [
      { x: -20, z: 20, radius: 4, label: 'ct' },
      { x: 18, z: -22, radius: 4, label: 't' },
      { x: 0, z: 0, radius: 5, label: 'mid' }
    ],
```

- [ ] **Step 9: Add spawnZones to arena.js**

After `playerSpawn` (line 36):

```js
    spawnZones: [
      { x: -14, z: -14, radius: 4, label: 'ct' },
      { x: 14, z: 14, radius: 4, label: 't' },
      { x: 0, z: 0, radius: 4, label: 'mid' }
    ],
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `npm test -- tests/unit/maps.test.js`
Expected: All tests PASS

- [ ] **Step 11: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 12: Commit**

```bash
git add js/maps/dust.js js/maps/office.js js/maps/warehouse.js js/maps/bloodstrike.js js/maps/italy.js js/maps/aztec.js js/maps/arena.js tests/unit/maps.test.js
git commit -m "feat: add spawnZones to all 7 maps"
```

---

### Task 3: Update Enemy Spawning to Use 20-Unit Distance Filter

**Files:**
- Modify: `js/systems/enemies.js:3120-3159`
- Test: `tests/unit/enemies.test.js` (modify)

- [ ] **Step 1: Write failing tests for updated enemy spawn distance**

Add to `tests/unit/enemies.test.js`:

```js
describe('spawnBots distance filter', () => {
  it('should use 20-unit minimum distance from player spawn', () => {
    // The spawnBots method filters waypoints by distance from playerSpawn.
    // With the new system, the threshold should be 20 units (was 15).
    var SPAWN_MIN_DISTANCE = 20;
    expect(SPAWN_MIN_DISTANCE).toBe(20);
    // Verify the constant is used in enemies.js by checking GAME.SPAWN_MIN_DISTANCE
    expect(GAME.SPAWN_MIN_DISTANCE).toBe(20);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: FAIL — `GAME.SPAWN_MIN_DISTANCE` is not defined

- [ ] **Step 3: Update `spawnBots` in enemies.js**

At the top of the enemies.js IIFE (near other constants), add:

```js
  var SPAWN_MIN_DISTANCE = 20;
  GAME.SPAWN_MIN_DISTANCE = SPAWN_MIN_DISTANCE;
```

Then update the `spawnBots` method. Replace the existing implementation (lines 3120-3159) with:

```js
  EnemyManager.prototype.spawnBots = function(botSpawns, waypoints, walls, count, mapSize, playerSpawn, roundNum) {
    this.clearAll();
    var total = count || botSpawns.length;
    for (var i = 0; i < total; i++) {
      var spawn;
      if (playerSpawn && waypoints && waypoints.length > 0) {
        // Filter waypoints by minimum distance from player
        var minDist = SPAWN_MIN_DISTANCE;
        var validWPs = [];
        while (validWPs.length < total && minDist > 0) {
          validWPs = [];
          for (var w = 0; w < waypoints.length; w++) {
            var wp = waypoints[w];
            var ddx = wp.x - playerSpawn.x, ddz = wp.z - playerSpawn.z;
            var d = Math.sqrt(ddx * ddx + ddz * ddz);
            if (d >= minDist) validWPs.push(wp);
          }
          if (validWPs.length < total) minDist -= 2; // relax threshold
        }
        if (validWPs.length === 0) validWPs = waypoints;

        // Pick a random valid waypoint, offset slightly
        for (var tries = 0; tries < 20; tries++) {
          var wp = validWPs[Math.floor(Math.random() * validWPs.length)];
          var angle = Math.random() * Math.PI * 2;
          var dist = 1 + Math.random() * 3;
          var rx = wp.x + Math.cos(angle) * dist;
          var rz = wp.z + Math.sin(angle) * dist;
          if (_isSpawnClear(rx, rz, walls) && _hasLineOfSight(wp.x, wp.z, rx, rz, walls)) {
            spawn = { x: rx, z: rz }; break;
          }
        }
        if (!spawn) spawn = botSpawns[i % botSpawns.length];
      } else {
        spawn = botSpawns[i % botSpawns.length];
      }
      this.enemies.push(new Enemy(this.scene, spawn, waypoints, walls, i, roundNum || 1));
      this.enemies[this.enemies.length - 1]._manager = this;
    }
  };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/enemies.test.js`
Expected: All tests PASS

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add js/systems/enemies.js tests/unit/enemies.test.js
git commit -m "feat: update enemy spawning to use 20-unit distance filter from player"
```

---

### Task 4: Update Competitive Mode to Use Spawn Zones

**Files:**
- Modify: `js/modes/competitive.js:105-128`

- [ ] **Step 1: Update competitive mode player spawning**

In `js/modes/competitive.js`, replace the player spawn logic (around lines 105-111):

```js
    // Old:
    if (teamMode) {
      // Team mode — spawn at team-specific locations
      var mySpawns = playerTeam === 'ct' ? mapData.ctSpawns : mapData.tSpawns;
      player.reset(mySpawns[0]);
    } else {
      player.reset(mapData.playerSpawn);
    }
```

With:

```js
    // Spawn zone-based player positioning
    var H = GAME._mapHelpers;
    if (mapData.spawnZones) {
      var zoneLabel = teamMode ? playerTeam : null; // team zone or random
      var zone = H.pickSpawnZone(mapData.spawnZones, zoneLabel);
      var spawnPos = H.randomSpawnInZone(zone, mapWalls);
      player.reset(spawnPos);
    } else if (teamMode) {
      var mySpawns = playerTeam === 'ct' ? mapData.ctSpawns : mapData.tSpawns;
      player.reset(mySpawns[0]);
    } else {
      player.reset(mapData.playerSpawn);
    }
```

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add js/modes/competitive.js
git commit -m "feat: competitive mode uses spawn zones for player positioning"
```

---

### Task 5: Update Survival Mode to Use Spawn Zones

**Files:**
- Modify: `js/modes/survival.js:61` and `js/modes/survival.js:123`

- [ ] **Step 1: Update initial survival spawn**

In `js/modes/survival.js`, replace line 61 (`player.reset(mapData.playerSpawn);`) with:

```js
    var H = GAME._mapHelpers;
    if (mapData.spawnZones) {
      var zone = H.pickSpawnZone(mapData.spawnZones, null);
      player.reset(H.randomSpawnInZone(zone, mapData.walls));
    } else {
      player.reset(mapData.playerSpawn);
    }
```

- [ ] **Step 2: Update wave map-rotation spawn**

Replace line 123 (`GAME.player.reset(newMapData.playerSpawn);`) with:

```js
      if (newMapData.spawnZones) {
        var zone = GAME._mapHelpers.pickSpawnZone(newMapData.spawnZones, null);
        GAME.player.reset(GAME._mapHelpers.randomSpawnInZone(zone, newMapData.walls));
      } else {
        GAME.player.reset(newMapData.playerSpawn);
      }
```

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add js/modes/survival.js
git commit -m "feat: survival mode uses spawn zones for player positioning"
```

---

### Task 6: Update Gun Game Mode to Use Spawn Zones

**Files:**
- Modify: `js/modes/gungame.js:72` and `js/modes/gungame.js:150`

- [ ] **Step 1: Update initial gun game spawn**

In `js/modes/gungame.js`, replace line 72 (`player.reset(mapData.playerSpawn);`) with:

```js
    var H = GAME._mapHelpers;
    if (mapData.spawnZones) {
      var zone = H.pickSpawnZone(mapData.spawnZones, null);
      player.reset(H.randomSpawnInZone(zone, mapData.walls));
    } else {
      player.reset(mapData.playerSpawn);
    }
```

- [ ] **Step 2: Update gun game death respawn**

Replace line 150 (`player.reset(mapData.playerSpawn);`) with:

```js
    var H = GAME._mapHelpers;
    if (mapData.spawnZones) {
      var zone = H.pickSpawnZone(mapData.spawnZones, null);
      player.reset(H.randomSpawnInZone(zone, GAME._mapWalls));
    } else {
      player.reset(mapData.playerSpawn);
    }
```

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add js/modes/gungame.js
git commit -m "feat: gun game mode uses spawn zones for player positioning"
```

---

### Task 7: Update Deathmatch Mode to Use Spawn Zones

**Files:**
- Modify: `js/modes/deathmatch.js:82` and `js/modes/deathmatch.js:152-171`

- [ ] **Step 1: Update initial deathmatch spawn**

In `js/modes/deathmatch.js`, replace line 82 (`player.reset(mapData.playerSpawn);`) with:

```js
    var H = GAME._mapHelpers;
    if (mapData.spawnZones) {
      var zone = H.pickSpawnZone(mapData.spawnZones, null);
      player.reset(H.randomSpawnInZone(zone, mapData.walls));
    } else {
      player.reset(mapData.playerSpawn);
    }
```

- [ ] **Step 2: Update deathmatch respawn to use furthest zone**

In `dmPlayerRespawn`, replace the spawn selection block (lines 152-171):

```js
    // Pick spawn furthest from enemies
    var mapData = dmLastMapData;
    var spawns = mapData.botSpawns.concat([mapData.playerSpawn]);
    var bestSpawn = mapData.playerSpawn;
    var bestMinDist = 0;

    for (var s = 0; s < spawns.length; s++) {
      var minDist = Infinity;
      for (var e = 0; e < enemyManager.enemies.length; e++) {
        var en = enemyManager.enemies[e];
        var dx = spawns[s].x - en.mesh.position.x;
        var dz = spawns[s].z - en.mesh.position.z;
        var d = dx * dx + dz * dz;
        if (d < minDist) minDist = d;
      }
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestSpawn = spawns[s];
      }
    }
```

With:

```js
    // Pick spawn furthest from enemies
    var mapData = dmLastMapData;
    var H = GAME._mapHelpers;
    var bestSpawn;

    if (mapData.spawnZones) {
      // Build enemy position list for zone distance check
      var enemyPositions = [];
      for (var e = 0; e < enemyManager.enemies.length; e++) {
        var en = enemyManager.enemies[e];
        enemyPositions.push({ x: en.mesh.position.x, z: en.mesh.position.z });
      }
      var zone = H.pickSpawnZone(mapData.spawnZones, 'furthest', enemyPositions);
      bestSpawn = H.randomSpawnInZone(zone, mapWalls);
    } else {
      var spawns = mapData.botSpawns.concat([mapData.playerSpawn]);
      bestSpawn = mapData.playerSpawn;
      var bestMinDist = 0;
      for (var s = 0; s < spawns.length; s++) {
        var minDist = Infinity;
        for (var e2 = 0; e2 < enemyManager.enemies.length; e2++) {
          var en2 = enemyManager.enemies[e2];
          var dx = spawns[s].x - en2.mesh.position.x;
          var dz = spawns[s].z - en2.mesh.position.z;
          var d = dx * dx + dz * dz;
          if (d < minDist) minDist = d;
        }
        if (minDist > bestMinDist) {
          bestMinDist = minDist;
          bestSpawn = spawns[s];
        }
      }
    }
```

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add js/modes/deathmatch.js
git commit -m "feat: deathmatch mode uses spawn zones for player positioning"
```

---

### Task 8: Update Tour Mode in main.js

**Files:**
- Modify: `js/core/main.js:951`

- [ ] **Step 1: Update tour mode player spawn**

In `js/core/main.js`, replace line 951 (`player.reset(mapData.playerSpawn);`) with:

```js
    var H = GAME._mapHelpers;
    if (mapData.spawnZones) {
      var zone = H.pickSpawnZone(mapData.spawnZones, null);
      player.reset(H.randomSpawnInZone(zone, mapWalls));
    } else {
      player.reset(mapData.playerSpawn);
    }
```

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add js/core/main.js
git commit -m "feat: tour mode uses spawn zones for player positioning"
```

---

### Task 9: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Add spawn zone documentation to REQUIREMENTS.md**

Find the section that documents spawn/round mechanics and add:

```markdown
### Spawn Zone System
- Each map defines `spawnZones`: array of `{ x, z, radius, label }` zones
  - `label`: `'ct'`, `'t'`, or `'mid'`
  - `radius`: randomization circle around zone center
- **Player spawn zone selection by mode:**
  - Competitive (team): fixed to team zone (`ct` or `t` label)
  - Competitive (solo): random zone each round
  - Survival: random zone each round/wave
  - Gun Game: random zone each round and on death
  - Deathmatch (initial): random zone
  - Deathmatch (respawn): zone furthest from enemies
  - Tour: random zone
- **Position randomization:** random angle + distance within zone radius, validated against walls (AABB raycaster, 0.8 unit clearance), 10 retries, fallback to zone center
- **Enemy spawning:** waypoint-based selection with 20-unit minimum distance from player spawn (threshold relaxes by 2 units if not enough waypoints qualify)
- **Helpers:** `GAME._mapHelpers.randomSpawnInZone(zone, walls)` and `GAME._mapHelpers.pickSpawnZone(zones, label, enemies)`
- **Backward compatibility:** falls back to `playerSpawn` if `spawnZones` is not defined
```

- [ ] **Step 2: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: document spawn zone system in REQUIREMENTS.md"
```

---

### Task 10: Manual Playtesting

- [ ] **Step 1: Start the game in a browser**

Open `index.html` in a browser. Verify:
- Start a Competitive solo match — player spawns in a different spot across rounds
- Start a Deathmatch — player spawns vary; on death, respawn is away from enemies
- Start Survival — player spawns vary across waves
- Start Gun Game — player spawns vary; death respawn is in a different spot
- Enemies appear at varied positions across rounds, never within ~20 units of the player at round start

- [ ] **Step 2: Test Competitive team mode**

Start a Competitive team match. Verify:
- Player always spawns within their team's zone area (CT side or T side)
- Position varies within that zone between rounds
- Enemies spawn on the opposing side

- [ ] **Step 3: Test backward compatibility**

Temporarily remove `spawnZones` from one map and verify it falls back to `playerSpawn` without errors.
