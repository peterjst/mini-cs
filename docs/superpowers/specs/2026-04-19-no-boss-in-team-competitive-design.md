# No Boss in CT vs T Team Competitive — Design Spec

**Date:** 2026-04-19
**Status:** Approved — ready for implementation plan

## Problem

On the final round (round 6) of a competitive match, the boss is spawned regardless of whether the match is Solo (free-for-all) or Team (CT vs T). In Team mode this produces nonsensical behavior:

- The boss is created via `enemyManager.spawnBoss(bossSpawn, waypoints, walls)` with no `team` argument, so `boss.team === null`.
- The round win condition in Team mode is `enemyManager.teamAllDead(oppTeam)`. Because the boss has no team label, it does **not** count toward the opposing-team elimination check — the player can win the round without ever engaging the boss.
- The boss spawns at `mapData.botSpawns[0]` (the deathmatch spawn), not at a team-aware CT or T spawn.
- When the objective is bomb defusal, the boss is irrelevant to plant/defuse outcomes.
- The "BOSS FIGHT" skip button in the competitive menu is available even when Team mode is selected, letting the player launch a scenario that the boss was never designed for.

Net effect: the boss becomes a floating hazard disconnected from the round's win state, and the "BOSS FIGHT" button can be launched in a context it wasn't designed for.

## Decision

The boss belongs to solo game modes only. In competitive Team mode (CT vs T), round 6 is played as a normal team round with no special treatment. The "BOSS FIGHT" menu button is hidden while Team mode is selected.

- Solo competitive, survival, gun game, deathmatch: boss behavior unchanged.
- `isBossRound()` remains a pure round-number predicate; the team-mode gate lives at the call site in `competitive.js`, not inside the boss system.

## Behavior

### Competitive Team mode (CT vs T)

- Round 6 plays as a standard team round. No boss spawn.
- No boss HUD, boss atmosphere, heartbeat, or "BOSS ROUND" announcement.
- No `enemyManager.clearAll()` + re-spawn-with-fewer-bots step; the normal `spawnTeamBots` call made earlier in `startRound` is the only spawn.
- Round-end conditions are unchanged: `teamAllDead(oppTeam)` for elimination, existing bomb logic for bomb-objective rounds.

### Competitive Solo (free-for-all) mode

- Unchanged. Round 6 still spawns the boss alongside 1–2 regular bots.

### Competitive menu

- `#comp-boss-btn` ("BOSS FIGHT") is hidden when `selectedCompMode === 'team'` and visible otherwise.
- Toggling Solo ↔ Team updates visibility immediately through `updateCompModeUI()`.
- The `compBossBtn` click handler short-circuits if `selectedCompMode === 'team'` as a defensive guard against programmatic clicks bypassing the UI gate.

### Other modes

Survival, gun game, deathmatch, tour, menu flythrough: unchanged. None use team mode.

## Code changes

### `js/modes/competitive.js`

**Boss-round spawn block (~line 137).** Add team-mode guard:

```js
if (!teamMode && GAME.boss.isBossRound(roundNumber)) {
  // existing: clearAll, respawn fewer bots, spawnBoss, showHealthBar,
  // activateAtmosphere, announcement, bossSpawnAlert sound
}
```

The block's interior is unchanged. With the guard in place, the branch that re-spawns with `spawnTeamBots(..., Math.max(1, ts - 2), bossRoundBotCount, ...)` becomes dead code for team mode and is naturally skipped.

**Boss Fight start handler (~line 491).** Defensive early-return:

```js
dom.compBossBtn.addEventListener('click', function() {
  if (selectedCompMode === 'team') return;
  // existing body...
});
```

### `js/core/main.js`

**`updateCompModeUI()` (~line 388).** Add one line alongside the existing `compTeamOptions` toggle:

```js
dom.compBossBtn.style.display = selectedCompMode === 'team' ? 'none' : '';
```

### `REQUIREMENTS.md`

- Competitive mode bullet (~line 902): clarify that boss appears only in solo competitive. In team competitive, round 6 is a normal team round.
- "Play Again restarts the match on that same player-selected starting map (including Boss Fight)" bullet (~line 379): note that Boss Fight is solo-only.

## What is *not* changing

- `js/systems/boss.js` — `isBossRound()` remains a pure round-number predicate.
- Boss internals: phases, shield, retreat, charge, barrage, heartbeat, atmosphere, minions, kill payoff.
- Solo competitive boss round, survival wave-5 bosses, gun game final-tier boss, deathmatch 30-kill boss.
- Team round-end conditions, bomb plant/defuse logic, `teamAllDead`, `getAliveOfTeam`.
- Boss HUD DOM/CSS. Boss kill feed styling.

## Testing

### Unit tests

1. **`tests/unit/competitive.test.js`** (add or extend — create file if needed):
   - `startRound` in team mode on round 6: `spawnBoss` is **not** called; `spawnTeamBots` is called once with full counts (not the reduced boss-round counts).
   - `startRound` in solo mode on round 6: `spawnBoss` **is** called (regression guard).
   - `startRound` in team mode on round 6: no `BOSS ROUND` announcement; `GAME.boss.showHealthBar` / `GAME.boss.activateAtmosphere` not invoked.

2. **`tests/unit/main.test.js`** (extend existing menu tests):
   - `updateCompModeUI` with `selectedCompMode === 'team'`: `compBossBtn.style.display === 'none'`.
   - `updateCompModeUI` with `selectedCompMode === 'solo'` (or default): `compBossBtn.style.display === ''`.
   - Toggling Solo → Team → Solo updates visibility each time.

3. **Defensive guard test:**
   - Programmatic click on `compBossBtn` while `selectedCompMode === 'team'` does not set `GAME._skipToBoss = true` and does not start a match.

### Manual smoke check

- Menu: switch between Solo/Team — Boss Fight button appears/disappears.
- Solo competitive: round 6 still spawns boss (regression).
- Team competitive: play through to round 6 — normal team round, no boss, no atmosphere, no boss HUD.
- Solo "Boss Fight" button: still skips to round 6 with full boss experience.

### Project conventions

- Tests verify *what* the behavior should be (from this spec and REQUIREMENTS.md), not how the code implements it.
- `npm test` must pass before commit.
- REQUIREMENTS.md is updated in the same change as the code.

## Out of scope

- Introducing a new "team-aware boss" concept (rejected in brainstorming).
- A boss as a third faction that both teams fight (rejected).
- Special "match point / final round" announcement on team round 6 (rejected; round 6 is just a normal round).
- Any changes to solo boss behavior or other modes' boss behavior.
