# Shotgun Balance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Buff the shotgun (Nova) to be the dominant close-range weapon, especially on indoor maps like Office.

**Architecture:** Pure stat changes in WEAPON_DEFS. No new mechanics or code paths.

**Tech Stack:** JS (weapons.js), tests (vitest), REQUIREMENTS.md

---

### Task 1: Update Tests to Reflect New Shotgun Stats

**Files:**
- Modify: `tests/unit/weapons.test.js:31` (damage assertion)
- Modify: `tests/unit/weapons.test.js:43` (price assertion)
- Modify: `tests/unit/weapons.test.js:77` (pellets assertion)
- Modify: `tests/integration/combat.test.js:60-65` (cumulative damage test)

**Step 1: Update unit test assertions for new shotgun values**

In `tests/unit/weapons.test.js`:
- Line 31: Change `expect(DEFS.shotgun.damage).toBe(18)` to `expect(DEFS.shotgun.damage).toBe(32)`
- Line 43: Change `expect(DEFS.shotgun.price).toBe(1800)` to `expect(DEFS.shotgun.price).toBe(1300)`
- Line 77: Change `expect(DEFS.shotgun.pellets).toBe(8)` to `expect(DEFS.shotgun.pellets).toBe(10)`

In `tests/integration/combat.test.js`:
- Line 61: Update comment from `// 18 per pellet` to `// 32 per pellet`
- Line 62: Update comment from `// 18 * 8 = 144` to `// 32 * 10 = 320`

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — shotgun damage is still 18, price is 1800, pellets is 8

### Task 2: Update WEAPON_DEFS Shotgun Stats

**Files:**
- Modify: `js/weapons.js:237` (shotgun definition line)

**Step 3: Change the shotgun stats in WEAPON_DEFS**

In `js/weapons.js` line 237, change the shotgun definition to:
```js
shotgun: { name: 'Shotgun (Nova)',  damage: 32,  fireRate: 1.5, magSize: 8,        reserveAmmo: 32,       reloadTime: 2.8, price: 1300, range: 55,  auto: false, isKnife: false, isGrenade: false, spread: 0.07,  pellets: 10, penetration: 0, penDmgMult: 0, recoilUp: 0.044, recoilSide: 0.008, fovPunch: 2.0, screenShake: 0.06, flashColor: 0xffcc55, flashIntensity: 5.0 },
```

Changes from current values:
- damage: 18 → 32
- fireRate: 1.2 → 1.5
- magSize: 6 → 8
- reserveAmmo: 24 → 32
- price: 1800 → 1300
- range: 30 → 55
- spread: 0.09 → 0.07
- pellets: 8 → 10

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: ALL PASS

### Task 3: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md:357` (weapon stats table — shotgun row)
- Modify: `REQUIREMENTS.md:401` (multi-pellet description)
- Modify: `REQUIREMENTS.md:962` (buy menu shotgun row)

**Step 5: Update REQUIREMENTS.md weapon table**

Line 357 — change shotgun row to:
```
| Shotgun (Nova) | 32/pellet | 1.5 | 8 | 32 | 2.8s | $1300 | 0.07 | 10 | 55 | 0 | Pump-action, devastating close range |
```

Line 401 — update multi-pellet description:
```
- Multi-pellet support: shotgun fires 10 pellets per shot, damage aggregated per enemy
```

Line 962 — update buy menu shotgun row:
```
| Shotgun (Nova) | 3 | $1300 | Can only own one, 10 pellets per shot |
```

**Step 6: Commit all changes**

```bash
git add js/weapons.js tests/unit/weapons.test.js tests/integration/combat.test.js REQUIREMENTS.md
git commit -m "Buff shotgun for indoor dominance — damage 32, range 55, 10 pellets, price $1300"
```
