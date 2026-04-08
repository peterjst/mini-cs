# Boss Phase Transition Retreat

## Problem

When the boss hits a phase threshold (50% or 25% HP), minions spawn 2-5 units from the boss position. If the boss is close to the player at that moment (after a charge attack, push, or normal combat movement), minions materialize on top of the player and immediately kill them. This creates an unavoidable death trap.

## Solution

Add a retreat state to the boss that activates on phase transitions. The boss stops attacking, retreats away from the player, and minions only spawn once the boss reaches safe distance or a timeout expires. A spawn-position safety net ensures minions never appear too close to the player even in edge cases.

## Design

### Boss Retreat State (`enemies.js`)

New state properties on the boss enemy:
- `_bossRetreatState`: `'idle'` (default) or `'retreating'`
- `_bossRetreatTimer`: countdown timer, max 2 seconds

**Trigger:** In `_updateBossPhase()`, when `_bossPhase` changes (and `oldPhase !== 0`), set `_bossRetreatState = 'retreating'` and `_bossRetreatTimer = 2.0`.

**During retreat:**
- Boss moves **away** from the player at `_bossBaseSpeed * 1.3`, using the existing `_moveToward` with a target computed as the boss position mirrored away from the player (same pattern as `RETREAT_FIRE` combat move).
- Boss does **not fire** — skip shooting logic when `_bossRetreatState === 'retreating'`.
- Boss shield is already activated by the existing phase transition code.
- If a charge attack is in progress (`_bossChargeState !== 'idle'`), cancel it: set `_bossChargeState = 'idle'`, reset `_bossChargeTimer = 0`, clear `_bossChargeTarget`.

**Retreat ends** when either:
- Boss is 10+ units from the player, OR
- `_bossRetreatTimer` expires (2 seconds — handles cases where boss is cornered)

On retreat end: set `_bossRetreatState = 'idle'`.

**New method:** `_updateBossRetreat(dt, playerPos)` called from the boss update loop. Returns `true` while retreating (signals caller to skip normal combat logic).

### Deferred Minion Spawning (`main.js`)

In `checkBossMinions()`, when a phase change is detected:
- Instead of spawning minions immediately, store the pending count in a new variable `_bossPendingMinions`.
- Store phase atmosphere/announcement effects — these still trigger immediately (screen shake, announcement, color grading) to signal the transition.
- On each frame, check: if `_bossPendingMinions > 0` and `_activeBoss._bossRetreatState === 'idle'` (retreat complete), spawn the pending minions and reset `_bossPendingMinions = 0`.

### Spawn Position Safety Net (`main.js`)

In both the phase-transition spawn and periodic spawn code paths, after computing each minion's spawn position:
- Calculate distance from spawn position to the player.
- If distance < 6 units, recompute: place the minion on the **far side** of the boss relative to the player. Specifically, compute the boss-to-player direction, negate it, and place the minion at `bossPos + (-playerDir) * (2 + random * 3)`.
- This catches edge cases where the boss couldn't retreat far enough (backed into a wall).

### Combat Logic Guards (`enemies.js`)

The existing guard at line ~1710 skips normal combat movement during charge. Extend this to also skip during retreat:
```
if (!(this.isBoss && (this._bossChargeState !== 'idle' || this._bossRetreatState === 'retreating')))
```

Similarly, skip boss shooting (barrage, normal fire) while `_bossRetreatState === 'retreating'`.

## Constants

| Constant | Value | Rationale |
|----------|-------|-----------|
| Retreat speed | `_bossBaseSpeed * 1.3` | Fast enough to create distance, matches existing retreat speed multiplier |
| Retreat timeout | 2.0s | Enough time to cover ~10 units at boss speed; prevents infinite retreat if cornered |
| Safe distance | 10 units | Beyond typical weapon effective range for minion bots; player has time to react |
| Min spawn distance from player | 6 units | Enough that minions can't instantly shoot the player; still close enough to be threatening |

## Files Changed

- `js/enemies.js` — new retreat state, `_updateBossRetreat()`, charge cancellation, combat guards
- `js/main.js` — deferred minion spawning in `checkBossMinions()`, spawn position safety net
- `REQUIREMENTS.md` — document new phase transition retreat behavior
- Tests — verify retreat triggers on phase change, minions don't spawn during retreat, spawn positions respect minimum player distance

## What This Does NOT Change

- Shield mechanics (duration, DR, visual) — unchanged
- Phase thresholds (50%, 25%) — unchanged
- Minion counts per phase (3, 5) — unchanged
- Periodic minion spawn timers — unchanged (already paused during shield)
- Boss charge attack mechanics — unchanged (just cancelled if mid-charge when phase triggers)
- Atmosphere/announcement effects — still fire immediately on phase change
