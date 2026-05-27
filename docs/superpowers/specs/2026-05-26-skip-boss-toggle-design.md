# Skip-Boss Toggle — Design

**Date:** 2026-05-26
**Status:** Approved

## Goal

Let players disable the boss per mode from the main-menu config. Each mode that
features a boss gets its own ON/OFF switch, remembered locally. Default is
**ON** (current behavior) until the player changes it.

## Modes in scope

All four modes that spawn a boss:

| Mode | Current boss trigger | Behavior when boss OFF |
|------|----------------------|------------------------|
| Competitive (solo) | Final round becomes a boss round (`competitive.js:140`) | Final round is a normal full-strength round (same as team mode already does) |
| Survival | Every 5th wave spawns a boss alongside bots (`survival.js:165`) | Wave 5/10/… is a normal wave |
| Deathmatch | Reaching the kill target spawns the boss; killing it wins (`main.js:1258`) | Reaching the kill target is an instant VICTORY — no boss |
| Gun Game | After the final weapon, a boss spawns; killing it wins (`gungame.js:127`) | The final knife kill is an instant win — no boss |

## Architecture

Follows the existing flag convention used for `teamMode` and `_skipToBoss`: a
boolean on `GAME` is set by the menu start handlers and read inside each mode's
boss-trigger branch.

### Flag

- New flag `GAME._skipBoss` (plain boolean).
- Set explicitly at every match entry point (start buttons + Quick Play) from the
  selected mode's stored preference. No internal readers in `main.js`, so no
  getter/setter wrapper is needed (unlike `teamMode`).

### Persistence

- Stored per mode: `localStorage['miniCS_skipBoss_<mode>']` where `<mode>` is one
  of `competitive | survival | gungame | deathmatch`.
- Value `'true'` = boss OFF (skip), anything else = boss ON.
- Absent key = boss ON (default). Remembered after first toggle.

### Mode-trigger edits (the spec, one branch each)

1. **competitive.js** — boss-round branch gains `&& !GAME._skipBoss`. The
   full-strength normal round already spawned above, so skipping the branch
   yields a normal final round.
2. **survival.js** — `wave % 5 === 0` branch gains `&& !GAME._skipBoss`. Bots
   already spawned above; skipping yields a normal wave.
3. **main.js (deathmatch kill handler, ~1258)** — when
   `hasReachedTarget() && !isBossSpawned()`: if `GAME._skipBoss` call
   `GAME.modes.deathmatch.end()` (shows VICTORY since target reached) instead of
   `spawnBoss()`.
4. **gungame.js (advanceLevel final-level block, ~127)** — when entering the boss
   block: if `GAME._skipBoss` call `GAME.modes.gungame.end()` instead of spawning
   the boss.

## UI

A new config row per mode panel, using the existing `.config-label` +
`.config-diff-row` + `.config-diff-btn` classes (no new styles):

```
Boss
[ ON ] [ OFF ]
```

- Buttons carry `data-boss="on"` (ON) and `data-boss="off"` (OFF) — the attribute
  names the boss state directly. The stored skip value is derived: `skip = (data-boss === 'off')`.
- Placed directly above each panel's START button.
- Row IDs per panel: `comp-boss-row`, `surv-boss-row`, `gg-boss-row`,
  `dm-boss-row`.

### Wiring (`main.js`)

- A `selectedSkipBoss` object keyed by mode, initialized from `localStorage`.
- One sync function toggles the `.selected` class on each row's buttons.
- Delegated click listeners per row update `selectedSkipBoss[mode]`, persist to
  `localStorage`, and re-sync — mirroring the existing map-mode wiring.
- Each start handler sets `GAME._skipBoss = selectedSkipBoss[<mode>]` before
  calling `mode.start(...)`. Quick Play sets it from the remembered mode's pref.

### BOSS FIGHT button interaction (competitive)

The competitive "BOSS FIGHT" shortcut (`comp-boss-btn`, sets `_skipToBoss`)
directly contradicts a boss-OFF setting. Resolution: **hide it when boss is OFF.**

- `updateCompModeUI` already hides `compBossBtn` in team mode. Extend the rule:
  the button is visible only when **solo AND competitive boss is ON**.
- Because the button is hidden whenever competitive boss is OFF, it can never be
  clicked in that state — no flag conflict to guard.

## Testing

Boss-trigger gates are mode rules → tests-first, using the existing `loadModule`
jsdom harness (see `tests/unit/main.test.js`). With `GAME._skipBoss = true`:

- Competitive final round spawns **no** boss.
- Survival 5th wave spawns **no** boss.
- Deathmatch reaching the kill target calls `end()`, not `spawnBoss()`.
- Gun Game final-level advance calls `end()`, not a boss spawn.

The exact seam each mode exposes is confirmed during planning; regression tests
are added against those seams.

## Non-goals

- No boss balance changes.
- No change to the BOSS FIGHT button's spawn behavior (only its visibility).
- No change to the default experience — boss stays ON until toggled.
