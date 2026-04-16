# Spawn Zone System — Design Spec

## Problem

Player and enemy spawn positions are fixed and identical every round, making the start of each round feel repetitive and predictable. The player always spawns at the same single `playerSpawn` coordinate, and enemies always appear at the same 3-8 `botSpawns` points.

## Solution

Replace fixed spawn points with a zone-based system for players and waypoint-based dynamic selection for enemies. Positions are randomized within defined zones each round, with mode-specific zone selection logic.

---

## Player Spawn Zones

### Map Data

Each map defines a `spawnZones` array:

```js
spawnZones: [
  { x: -20, z: -20, radius: 4, label: 'ct' },
  { x: 18, z: 18, radius: 4, label: 't' },
  { x: 0, z: 0, radius: 5, label: 'mid' }
]
```

- `x`, `z` — zone center
- `radius` — randomization radius (circle around center)
- `label` — `'ct'`, `'t'`, or `'mid'`, used for team mode zone assignment

Each of the 7 maps gets 3 zones. Zone centers are placed in known-open areas (existing `playerSpawn`, `ctSpawns`, `tSpawns` centers, and a mid-map position).

### Zone Selection by Mode

| Mode | Zone Selection |
|------|---------------|
| Competitive (team) | Fixed to team zone (`ct` or `t` label) |
| Competitive (solo) | Random zone each round |
| Survival | Random zone each round |
| Gun Game | Random zone each round |
| Deathmatch (respawn) | Zone furthest from enemies |

### Position Randomization

1. Pick a random angle (0–2pi) and random distance (0–radius) within the zone
2. Compute candidate position: `center + (cos(angle) * dist, sin(angle) * dist)`
3. Check candidate against map `walls` using AABB overlap (same collision boxes used by player movement, player half-width 0.5 units)
4. If collision, retry with a new random point (max 10 retries)
5. If all retries fail, fall back to zone center (known-good position)

### Backward Compatibility

The existing `playerSpawn` field is kept in map data as a fallback. If `spawnZones` is not defined on a map, all modes fall back to `playerSpawn`.

---

## Enemy Spawning

### Waypoint-Based Selection

Enemies spawn at positions selected from the map's **waypoint network** instead of the fixed `botSpawns` lists.

For each round:

1. Filter waypoints by **minimum distance of 20 units** from the player's spawn position
2. From the valid set, randomly select N waypoints (where N = number of bots to spawn)
3. If fewer than N waypoints pass the distance filter, relax the threshold incrementally (by 2 units) until enough positions are available

### Mode-Specific Behavior

| Mode | Enemy Spawn Behavior |
|------|---------------------|
| Competitive (team) | Filter waypoints to those closer to the opposing team's zone center |
| Competitive (solo) | Waypoints filtered by 20-unit distance from player |
| Survival | Waypoints filtered by 20-unit distance from player |
| Gun Game | Waypoints filtered by 20-unit distance from player |
| Deathmatch (bot respawn) | Waypoint furthest from player (existing distance logic preserved) |

### Retiring botSpawns

The `botSpawns` arrays remain in map data but are no longer used as the primary spawn source. Waypoints are the primary source in all modes.

---

## Files to Modify

| File | Changes |
|------|---------|
| `js/maps/shared.js` | Add `randomSpawnInZone(zone, walls)` helper, expose via `GAME._mapHelpers`. Update map registration to pass through `spawnZones`. |
| `js/maps/dust.js` | Add `spawnZones` array (3 zones) |
| `js/maps/office.js` | Add `spawnZones` array (3 zones) |
| `js/maps/warehouse.js` | Add `spawnZones` array (3 zones) |
| `js/maps/bloodstrike.js` | Add `spawnZones` array (3 zones) |
| `js/maps/italy.js` | Add `spawnZones` array (3 zones) |
| `js/maps/aztec.js` | Add `spawnZones` array (3 zones) |
| `js/maps/arena.js` | Add `spawnZones` array (3 zones) |
| `js/systems/enemies.js` | Update `spawnBots` to use waypoint-based selection with 20-unit distance filter as the primary path |
| `js/modes/competitive.js` | Use zone system — team zone for team mode, random zone for solo |
| `js/modes/survival.js` | Use random zone for player spawn |
| `js/modes/gungame.js` | Use random zone for player spawn |
| `js/modes/deathmatch.js` | Use furthest zone for respawns, waypoint-based enemy spawning |
| `REQUIREMENTS.md` | Document spawn zone system |
| Tests | Spawn zone validation, distance filtering, fallback behavior |

### Not Changing

- `js/core/player.js` — `reset()` still takes `{ x, z }`, callers provide the randomized position
- `ctSpawns` / `tSpawns` — remain in map data but unused; `spawnZones` replaces their role

---

## Testing

- `randomSpawnInZone` returns a position within the zone radius
- `randomSpawnInZone` falls back to zone center after wall collisions exhaust retries
- Waypoint distance filter excludes waypoints within 20 units of player
- Distance filter relaxation works when not enough waypoints pass the threshold
- Each mode selects the correct zone type
- Fallback to `playerSpawn` when `spawnZones` is undefined
