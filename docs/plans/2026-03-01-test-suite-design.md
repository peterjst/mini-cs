# Test Suite Design — Regression Prevention

**Date:** 2026-03-01
**Approach:** Thin Mock Layer (Approach A) — mock THREE/DOM/Audio, evaluate IIFEs in test env, test real production code without refactoring

## Framework & Config

- **Vitest** with `jsdom` environment
- `tests/setup.js` provides global mocks (THREE, AudioContext, localStorage, DOM skeleton)
- `tests/helpers.js` provides `loadModule(path)` to evaluate IIFE source files against mocked `window`

## Directory Structure

```
tests/
  setup.js              — global mocks (THREE, Audio, DOM)
  helpers.js            — loadModule(), assertion utilities
  unit/
    weapons.test.js     — weapon defs, damage calc, ammo, buy prices
    player.test.js      — takeDamage, armor, speed multipliers
    enemies.test.js     — difficulty params, bot weapon pool, personality
    maps.test.js        — noise functions, build helpers
    main.test.js        — buy system, game states, menu guards, perk system
    sound.test.js       — distortion curves, noise buffers
  integration/
    combat.test.js      — shooting enemies, damage+armor+perks combined
    economy.test.js     — buy flow, round money reset, match lifecycle
    map-loading.test.js — each map builds without errors, returns scene+walls+spawns
```

## Mock Layer

### THREE.js Mock
- `THREE.Mesh` — stores geometry/material, has `.position.set()`, `.add()`, shadow properties
- `THREE.BoxGeometry`, `THREE.CylinderGeometry` — store dimensions
- `THREE.MeshStandardMaterial` — stores PBR properties
- `THREE.Vector3` — real math implementation (add, sub, normalize, length, dot, cross, multiplyScalar, copy, clone, set)
- `THREE.Vector2` — real math implementation
- `THREE.Raycaster` — `.intersectObjects()` returns configurable hit arrays
- `THREE.Scene`, `THREE.Group` — `.add()` collects children, `.traverse()` works
- `THREE.Color` — stores value
- Other geometry classes — no-op constructors

### DOM Mock
- jsdom provides base DOM; setup pre-creates HUD elements (`#hud`, `#crosshair`, `#health`, `#armor`, `#ammo`, `#money`)
- `.config-diff-row`, `.config-diff-btn` elements for menu guard tests
- Canvas 2D context mock for texture generation

### Web Audio Mock
- `AudioContext` with `.createOscillator()`, `.createGain()`, `.createBiquadFilter()`, `.createBuffer()`, `.createDynamicsCompressor()`, `.createWaveShaper()`
- All return mock nodes with `.connect()` and parameter stubs
- `.currentTime` → 0, `.sampleRate` → 44100

### GAME Namespace
- Fresh `window.GAME = {}` before each test file
- Modules loaded in dependency order for integration tests

## Test Coverage

### Unit Tests

| File | Tests |
|------|-------|
| `weapons.test.js` | WEAPON_DEFS has all expected weapons with required fields (damage, fireRate, magSize, price, spread); damage formula (base x perk x headshot x penetration); SKIN_DEFS structure; grenade definitions exist |
| `player.test.js` | `takeDamage` with/without armor; armor absorbs 50% up to remaining armor; juggernaut perk reduces damage 15%; speed multiplier stacking (sprint, crouch, weapon, fleet_foot perk); player constants are sane |
| `enemies.test.js` | DIFFICULTIES has all 4 levels with required fields; AIM_PARAMS scales correctly; `getBotWeapon(roundNum)` returns valid weapon names; PERSONALITY multipliers are sensible |
| `maps.test.js` | `_hash` is deterministic; `_valueNoise` returns 0-1 range; `_fbmNoise` produces consistent output for same seed; `B()` adds mesh to scene and walls; `D()` adds to scene only; `CylW()` adds to walls |
| `main.test.js` | Game state constants exist; `hasPerk` returns true/false correctly; buy system respects prices and deducts money; menu click guards check `dataset.diff`; starting money is 800; match ends at 4 round wins |
| `sound.test.js` | Distortion curve cached by amount; curve length is 8192; noise buffer duration matches requested |

### Integration Tests

| File | Tests |
|------|-------|
| `combat.test.js` | Shooting enemy reduces health by weapon damage; headshot applies 2.5x multiplier; armor absorption end-to-end; stopping_power + marksman perks stack |
| `economy.test.js` | Can't buy without enough money; buying deducts correct price; round reset gives appropriate money |
| `map-loading.test.js` | Each of 6 maps builds without throwing; each returns scene with children; each returns walls array with entries; each returns spawn point data |
