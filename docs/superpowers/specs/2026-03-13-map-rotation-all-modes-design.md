# Map Rotation Across All Game Modes

## Problem

The Map Mode toggle (Fixed/Rotate) appears in the UI for all four game modes, but the rotation logic only executes in the Competitive mode's `startRound()` function. Deathmatch, Gun Game, and Survival show the toggle but never rotate maps.

## Solution

Extract the rotation logic into a centralized helper and integrate it into each mode at its natural rotation point:

- **Competitive**: Between rounds (already works, refactor to use shared helper)
- **Deathmatch**: When the player restarts (Play Again)
- **Gun Game**: When the player restarts (Play Again)
- **Survival**: Between waves (during buy phase transition) and on restart (Play Again)

## Design

### 1. Centralized `maybeRotateMap()` helper

Extract the inline rotation logic from `startRound()` (lines 2449-2456 of main.js) into a reusable function:

```js
function maybeRotateMap(currentIndex) {
  if (selectedMapModeForMatch !== 'rotate') return currentIndex;
  var mapCount = GAME.getMapCount();
  if (mapCount <= 1) return currentIndex;
  var newMap;
  do { newMap = Math.floor(Math.random() * mapCount); } while (newMap === currentIndex);
  return newMap;
}
```

Returns a new random map index if rotation is enabled, otherwise returns the current index unchanged. The do/while loop ensures the same map is never repeated consecutively.

### 2. `selectedMapModeForMatch` snapshot in all modes

Currently only `startMatch()` (Competitive) snapshots `selectedMapMode` into `selectedMapModeForMatch`. Each mode's start function must do the same so the rotation setting is locked for the duration of that session:

- `startDeathmatch()`: add `selectedMapModeForMatch = selectedMapMode;`
- `startGunGame()`: add `selectedMapModeForMatch = selectedMapMode;`
- `startSurvival()`: add `selectedMapModeForMatch = selectedMapMode;`

### 3. Competitive mode refactor

Replace the inline rotation logic in `startRound()` with a call to the shared helper:

```js
// Before (lines 2449-2456):
if (selectedMapModeForMatch === 'rotate') {
  var mapCount = GAME.getMapCount();
  if (mapCount > 1) {
    var newMap;
    do { newMap = Math.floor(Math.random() * mapCount); } while (newMap === currentMapIndex);
    currentMapIndex = newMap;
  }
}

// After:
currentMapIndex = maybeRotateMap(currentMapIndex);
```

### 4. Deathmatch — rotate on restart

The restart button handler currently passes back the same map index:

```js
// Before:
dom.dmRestartBtn.addEventListener('click', function() {
  dom.dmEnd.classList.remove('show');
  startDeathmatch(dmMapIndex);
});

// After:
dom.dmRestartBtn.addEventListener('click', function() {
  dom.dmEnd.classList.remove('show');
  startDeathmatch(maybeRotateMap(dmMapIndex));
});
```

No changes needed inside `startDeathmatch()` itself — it already builds the map from the passed index.

### 5. Gun Game — rotate on restart

Same pattern as Deathmatch:

```js
// Before:
dom.gungameRestartBtn.addEventListener('click', function() {
  dom.gungameEnd.classList.remove('show');
  startGunGame(gungameMapIndex);
});

// After:
dom.gungameRestartBtn.addEventListener('click', function() {
  dom.gungameEnd.classList.remove('show');
  startGunGame(maybeRotateMap(gungameMapIndex));
});
```

### 6. Survival — rotate between waves and on restart

This is the most involved change with two rotation points:

**6a. Restart handler** — same pattern as DM and GG:

```js
// Before:
dom.survivalRestartBtn.addEventListener('click', function() {
  dom.survivalEnd.classList.remove('show');
  startSurvival(survivalMapIndex);
});

// After:
dom.survivalRestartBtn.addEventListener('click', function() {
  dom.survivalEnd.classList.remove('show');
  startSurvival(maybeRotateMap(survivalMapIndex));
});
```

**6b. Between waves** — currently `startSurvivalWave()` reuses `survivalLastMapData` without rebuilding the scene. When rotation is enabled and selects a new map, the scene must be reconstructed.

In `startSurvivalWave()`, before spawning bots:

1. Call `maybeRotateMap(survivalMapIndex)` to get the (possibly new) map index
2. If the map index changed:
   - Update `survivalMapIndex` to the new index
   - Rebuild the scene following the same sequence as `startSurvival()` lines 3428-3456:
     - Dispose bullet hole materials and clear bullet holes array
     - Clear `_dustParticles`
     - Create new `THREE.Scene()`
     - Set `weapons.scene` and `enemyManager.scene` to new scene
     - Add camera to scene
     - Call `GAME.buildMap(scene, survivalMapIndex, renderer)` and store result
     - Call `applyColorGrade()`
     - Dispose and reinitialize `GAME.particles`
     - Update `mapWalls` and `survivalLastMapData` from new map data
     - Reset player position to new map's `playerSpawn`
     - Update player and weapon wall references
     - Re-cache minimap walls
     - Respawn birds
     - Restart ambient sound and reverb for new map
   - Show announcement: "MAP CHANGE" with new map name
3. If the map index is unchanged: keep current behavior (reuse `survivalLastMapData`, just spawn new enemies)

The player retains their health, money, and weapons across the map change — only the environment changes.

There will be a brief visual transition as the scene reconstructs between waves. This happens during the buy phase, so gameplay is not interrupted.

## Files Modified

| File | Changes |
|------|---------|
| `js/main.js` | Add `maybeRotateMap()` helper; refactor `startRound()`; update restart handlers for DM and GG; add map rebuild logic to `startSurvivalWave()`; snapshot `selectedMapModeForMatch` in all mode start functions |
| `REQUIREMENTS.md` | Update map rotation section to document all-mode support |

## Testing

- Verify Competitive rotation still works (regression)
- Verify Deathmatch rotates map on Play Again when Rotate mode is selected
- Verify Gun Game rotates map on Play Again when Rotate mode is selected
- Verify Survival rotates map between waves when Rotate mode is selected
- Verify Survival rotates map on Play Again when Rotate mode is selected
- Verify all modes stay on the same map when Fixed mode is selected
- Verify player state (health, money, weapons) is preserved across survival map rotations
- Verify the map is never the same consecutively when rotating
