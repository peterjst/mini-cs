# Tour Mode: Unlimited Supplies — Design

**Date:** 2026-05-03
**Status:** Approved (design)
**Scope:** Tour mode only. No effect on competitive, deathmatch, gungame, or survival.

## Goal

In tour mode, give the player the full arsenal with unlimited reserve ammo and unlimited grenades, so map exploration isn't gated by supply pressure. Mag-and-reload cadence is preserved (firearms still empty their magazine and require a reload animation) — only the *reserve* and *grenade counts* are infinite.

## Non-goals

- Does not change weapon balance, recoil, fire rate, or damage.
- Does not introduce a generic "unlimited mode" abstraction. Tour is the only mode that uses it.
- Does not change the buy menu (tour does not open it).
- Does not add new HUD elements; only reformats existing ones.

## Approach

Use `Infinity` as the reserve / grenade-count value. The existing weapon math already behaves correctly under `Infinity` arithmetic and comparisons:

- `Infinity - n === Infinity` (reload subtraction, grenade decrement)
- `Math.min(needed, Infinity) === needed` (reload pulls a finite chunk)
- `Math.max(Infinity, floor) === Infinity` (reserve floor logic)
- `Infinity <= 0` is false, `Infinity > 0` is true (gate checks all read correctly)
- `Infinity || 0 === Infinity` (defensive defaults pass through)

There is prior art for `Infinity` as a weapon value: `WEAPON_DEFS.knife.magSize` and `reserveCap` are already `Infinity` (`js/systems/weapons.js:228`).

The only layer that needs a real change is **display formatting** — `Infinity.toString() === "Infinity"`, which we replace with `∞`.

## Changes

### 1. `js/core/main.js` — `startTour(mapIndex)` (around line 1010)

Currently:

```js
player.money = 1000000;
weapons.owned = { knife: true, pistol: true, shotgun: true, rifle: true, awp: true, grenade: false };
weapons.current = 'pistol';
weapons.resetAmmo();
weapons._createWeaponModel();
```

After change:

- Expand `owned` to include `smg: true`, `grenade: true`, `smoke: true`, `flash: true`.
- After `resetAmmo()`, set `weapons.reserve[k] = Infinity` for every owned non-grenade weapon (skip knife — its `reserveCap` is already `Infinity`, but assigning is a no-op so the loop can be unconditional).
- Set `weapons.grenadeCount = weapons.smokeCount = weapons.flashCount = Infinity`.

Mag values from `resetAmmo()` (which sets `ammo[k] = magSize`) stay finite — that is the point of preserving the reload cadence.

### 2. `js/ui/hud.js` — display formatting

Three sites; each becomes a small ternary that renders `∞` when the value is `Infinity`.

- **Line 38–42** (primary HUD ammo line for grenades): `'HE x' + (count === Infinity ? '∞' : count)`, same for SM and FL.
- **Line 47** (reserve display for firearms): `weapons.reserve[current] === Infinity ? '∞' : weapons.reserve[current]`.
- **Line 55–57** (secondary grenade-count strip): same `∞` substitution as the primary line.

### 3. `js/ui/touch.js` — display formatting (mobile)

Same formatting tweaks as HUD, at:

- **Line 517** — bottom reserve readout.
- **Lines 362–363** — grenade button count (mobile inventory wheel).
- **Lines 510–511** — bottom grenade count when a grenade is the active weapon.

## Why nothing else breaks

Walked the call sites for `reserve[*]`, `grenadeCount`, `smokeCount`, `flashCount`:

| Site | Behavior under `Infinity` | OK? |
|---|---|---|
| `weapons.js:1406` `if (reserve <= 0) return` (canReload) | false → reload allowed | ✓ |
| `weapons.js:2085-2088` (reload subtraction) | mag fills, reserve stays `Infinity` | ✓ |
| `weapons.js:1433/1440/1446` `if (count <= 0) return null` | false → throw allowed | ✓ |
| `weapons.js:1434/1441/1447` `count--` | stays `Infinity` | ✓ |
| `weapons.js:1438/1444/1450` `if (count <= 0) owned[k] = false` | false → keeps owned | ✓ |
| `buy.js` `count >= 1` checks | tour does not open buy menu; even if it did, `Infinity >= 1` is true | ✓ |
| `weapons.js:2367-2368` `Math.max(reserve, floor)` (reserve floor restore) | stays `Infinity` | ✓ |
| Mode-entry resets in competitive/deathmatch/survival | reset counts to 0 on entry to those modes — no leakage out of tour | ✓ |

## Testing

Add unit tests under `tests/` (Vitest, matching the repo's existing convention):

1. **Reserve stays infinite after reload.** Set `weapons.reserve.rifle = Infinity`, fire to empty mag, trigger reload, advance time past `reloadTime`, assert `ammo.rifle === magSize` and `reserve.rifle === Infinity`.
2. **Grenade count stays infinite after throw.** Set `grenadeCount = Infinity`, switch to grenade, throw it, assert `grenadeCount === Infinity` and `owned.grenade === true`.
3. **`startTour` post-state.** Stub map build, call `startTour(0)`, assert all weapon keys in `weapons.owned` are true, all firearm reserves are `=== Infinity`, all three grenade counts are `=== Infinity`.

HUD/touch display formatting is visual; no automated test (per `AGENTS.md`: tests-after for visuals).

## Manual QA

- Enter tour, open inventory: SMG, HE, smoke, flash all selectable.
- Fire a rifle to empty, reload — reserve readout still shows `∞`, mag refills.
- Throw HE/smoke/flash repeatedly — count readout stays `∞`, weapon stays equipped.
- Exit tour to menu, start a competitive or deathmatch round — confirm normal finite ammo/grenades (no leakage).
