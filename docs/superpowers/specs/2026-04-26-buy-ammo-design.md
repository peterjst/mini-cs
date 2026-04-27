# Buy Extra Ammo — Design

## Goal

Let players buy extra reserve ammunition during the buy phase, with a per-weapon floor (free auto-refill at round start) and a per-weapon cap (hard ceiling). Reuse the existing weapon button slots — no new menu lines.

## Rules

### Per-weapon ammo limits

`reserveAmmo` is removed from `WEAPON_DEFS`. Each weapon gets two new fields:

- `reserveFloor` — auto-refill target at round start (only applied if current reserve is below it).
- `reserveCap` — hard ceiling on reserve at all times. Buying never exceeds this.

Floors and caps follow `floor = old_reserve_mags - 1`, `cap = round(old_reserve_mags × 5/3)`.

| Weapon  | magSize | reserveFloor (mags / count) | reserveCap (mags / count) |
|---------|---------|-----------------------------|---------------------------|
| Pistol  | 12      | 2 / **24**                  | 5 / **60**                |
| SMG     | 25      | 2 / **50**                  | 5 / **125**               |
| Shotgun | 8       | 3 / **24**                  | 7 / **56**                |
| Rifle   | 30      | 2 / **60**                  | 5 / **150**               |
| AWP     | 5       | 3 / **15**                  | 7 / **35**                |

Knife and grenades are unchanged (`Infinity` / discrete grenade slots).

### Pricing

`AMMO_PRICE_PER_MAG = 50` — flat for every buyable weapon. Each ammo purchase adds exactly one magazine's worth of reserve (`magSize`) for $50.

### Auto-refill at round start

Inside `WeaponSystem.resetForRound()`, for each owned weapon the reserve becomes:

```
reserve[w] = max(reserve[w], WEAPON_DEFS[w].reserveFloor)
```

Reserves above the floor are preserved (carryover). Magazine in the gun (`ammo[w]`) is still topped up to `magSize` as today.

### Buying ammo

A player can buy +1 mag of ammo for an owned primary (SMG, Shotgun, Rifle, AWP) by clicking the existing weapon button (or pressing its number key) when:

1. The buy menu is open (existing `isBuyPhase` check applies — no change).
2. The weapon is already owned.
3. `reserve[w] < reserveCap` for that weapon.
4. `player.money >= 50`.

Effect: `player.money -= 50; reserve[w] = min(reserve[w] + magSize, reserveCap)`.

**Pistol is not buyable.** Pistol relies entirely on the round-start floor refill. (It is always owned and free; we keep the buy menu compact.)

## UX

### Weapon button states (desktop and mobile)

Applies to SMG, Shotgun, Rifle, AWP buttons. The same physical row/card serves both weapon-buy and ammo-buy roles, like the armor button cycles through Kevlar/Helmet/Combo states.

| State                       | Display                                       | Click action          |
|-----------------------------|-----------------------------------------------|-----------------------|
| Not owned, affordable       | `[2] MP5                            $1250`    | Buy weapon            |
| Not owned, can't afford     | dimmed (`too-expensive` class)                | No-op                 |
| Owned, reserve < cap, affordable | `[2] MP5 — Ammo    3/5 mags    $50`      | +1 mag of MP5 ammo    |
| Owned, can't afford ammo    | dimmed (`too-expensive` class)                | No-op                 |
| Owned, reserve at cap       | `[2] MP5 — MAX AMMO`, dimmed (`owned` class)  | No-op                 |

### Keybind position

The hotkey hint moves to the **front** of every buy menu line — applied to all 8 entries (`[2] MP5`, `[3] Shotgun`, `[4] AK-47`, `[5] AWP`, `[6] Armor + Helmet`, `[7] Grenade`, `[8] Smoke`, `[9] Flashbang`). Both desktop (`index.html`) and mobile carousel (`js/ui/touch.js`) follow the same convention.

### Feedback

- Successful ammo buy plays the existing `Sound.buy()` cue (no new sound).
- Balance line updates immediately.
- HUD ammo readout updates immediately (reserve number changed).

### Newly-purchased weapon

When a player buys a fresh weapon, its reserve initializes to `reserveFloor` (not full). This keeps the rule consistent: any "round starts with this weapon" event lands at the floor, and the player can top up via additional ammo purchases. Net effect vs. today: a fresh AK-47 starts with 60 reserve instead of 90; a fresh AWP starts with 15 reserve instead of 20.

## Architecture & file changes

### `js/systems/weapons.js`

- `WEAPON_DEFS`: replace `reserveAmmo: N` with `reserveFloor: F, reserveCap: C` per the table above. Knife/grenades unchanged.
- Add module-scope constant `AMMO_PRICE_PER_MAG = 50`. Expose on `GAME.AMMO_PRICE_PER_MAG` for buy logic and tests.
- `WeaponSystem.prototype.resetForRound` (`weapons.js:2310`): change reserve refill to `Math.max(this.reserve[key] || 0, WEAPON_DEFS[key].reserveFloor)`. Magazine is still set to full (`magSize`).
- `WeaponSystem.prototype.giveWeapon` and the equivalent paths at lines 1320, 1334: freshly given weapons set `reserve[w] = reserveFloor`.
- Audit removal of `reserveAmmo`: no other code reads it after this change.

### `js/ui/buy.js`

- `tryBuy('smg' | 'shotgun' | 'rifle' | 'awp')`: branch on ownership.
  - Not owned → existing buy-weapon flow.
  - Owned, `reserve[w] < reserveCap`, `money >= 50` → deduct $50; `reserve[w] = min(reserve[w] + magSize, reserveCap)`; `bought = true`.
  - Otherwise → no-op.
- `updateBuyMenu`: render the three states for each primary weapon (per the table). The `.owned` class becomes "max ammo" only. Owned-buyable-ammo uses the default (non-dimmed) state with green price.
- Pistol: not handled in `tryBuy` (no menu entry, not buyable).

### `index.html`

- All 8 `.buy-item` rows: move `[N]` span to the front of the line.
- Each weapon row gains an `item-detail` span (initially empty) so JS can inject `— Ammo  3/5 mags` text dynamically. The `item-price` span is reused for the dynamic price (`$1250` / `$50` / `MAX AMMO`).
- No new CSS rules required — recycle `.owned` and `.too-expensive`.

### `js/ui/touch.js`

- `renderBuyGrid`: parallel three-state logic for SMG/Shotgun/Rifle/AWP cards. Owned-buyable-ammo cards stay clickable; the click handler invokes `tryBuy(item)` (the same path desktop uses).
- Card name prefixes `[N]` to match desktop. Sub-line shows `3/5 mags` when ammo-buyable; `MAX AMMO` when at cap.
- `BUY_ITEMS` and `BUY_MENU_NAMES` already exist — `BUY_MENU_NAMES` values get the `[N]` prefix.

### Tests — `tests/buy-ammo.test.js` (new)

- `resetForRound` preserves reserves above floor for each weapon.
- `resetForRound` tops up to floor when below.
- `resetForRound` does not touch reserves of un-owned weapons.
- `tryBuy('rifle')` on owned, reserve < cap: -$50, +30 reserve.
- `tryBuy('rifle')` at cap: no-op, no money deducted.
- `tryBuy('rifle')` with money < $50: no-op.
- `tryBuy('rifle')` outside buy phase: no-op.
- 4 sequential AWP-ammo buys grow reserve 15→20→25→30→35; the 5th attempt is a no-op at cap.
- Newly-purchased weapon starts at `reserveFloor`, not full.

## Data flow

`tryBuy` mutates `GAME.player.money` and `GAME.weaponSystem.reserve[w]`, then calls `updateBuyMenu()` and `GAME.hud.update()`. No new events, no new state machine. The existing buy-phase gating (`js/ui/buy.js:8`) covers when buying is allowed.

## Out of scope

- Mid-round ammo purchases (must be in buy phase).
- Buy zones / spatial purchase restrictions.
- Pistol ammo buying.
- Per-weapon distinct ammo prices.
- New sound effects, animations, or particle feedback for ammo buys.

## Non-goals (intentional)

- Granting parity with full CS economy. Mini-CS chooses simplicity over fidelity.
- Adding new menu rows. The buy menu stays at 8 entries; ammo reuses existing slots.
