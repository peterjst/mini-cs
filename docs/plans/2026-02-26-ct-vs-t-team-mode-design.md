# CT vs T Team Mode — Design Document

## Overview

Add a full CT vs T team mode to Mini CS, coexisting with the current solo Competitive mode. Players choose a side (CT or T), get AI teammates, and play round-based matches with either Elimination or Bomb Defusal objectives.

## Approach

Layered Team System — extend the existing `EnemyManager` with a `team` field on all entities, add target filtering to bot AI, and layer bomb/objective logic onto the existing round system. No refactoring of existing systems; all current modes remain untouched.

---

## 1. Team Data Model & Bot Spawning

- Every entity gets a `team` property: `'ct'` or `'t'`.
- `player.team` set from menu side choice, stored in `GAME.teamConfig`.
- `EnemyManager.spawnBots()` extended to spawn bots for both teams.
  - Friendly bots: spawn near the player's team spawn points.
  - Enemy bots: spawn at the opposing team's spawn points.
- Map data gains: `ctSpawns: [{x,z}, ...]`, `tSpawns: [{x,z}, ...]`, `bombsites: [{name, x, z, radius}, ...]`.
- Existing `playerSpawn` and `botSpawns` remain for non-team modes.

**Team sizes (tied to difficulty):**

| Difficulty | Team Size | Allies | Enemies |
|---|---|---|---|
| Easy | 2v2 | 1 | 2 |
| Normal | 3v3 | 2 | 3 |
| Hard | 4v4 | 3 | 4 |
| Elite | 5v5 | 4 | 5 |

---

## 2. Bot AI — Target Filtering & Friendly Behavior

- Bots build a target list of all entities on the opposing team (player + bots).
- They pick the nearest visible target from that list.
- Friendly bots use the same AI states (PATROL, CHASE, ATTACK, etc.) with tweaks:
  - PATROL: follow waypoints near the player (~15 unit leash).
  - CHASE/ATTACK: engage enemy bots autonomously.
- Friendly fire disabled — same-team shots deal no damage.
- Bot vs bot combat uses existing ATTACK state logic.
- Floating markers: blue for friendly, red for enemy.

---

## 3. Bomb Defusal Mechanics

- Bomb assigned to one T-side bot (or player if playing T).
- Visual: small box on carrier's back; dropped on death for pickup.
- Bombsite markers: glowing floor ring + floating "A"/"B" letter.

**Planting (T side):**
- Inside bombsite radius (~4 units), hold E for 3 seconds.
- Progress bar on HUD. Moving/damage cancels.
- Planted bomb: visible on ground, flashing red light, 40-second fuse.

**Defusing (CT side):**
- Within ~2 units of planted bomb, hold E for 5 seconds.
- Progress bar on HUD. Moving/damage cancels.

**Round win conditions (team mode):**

| Condition | Winner |
|---|---|
| All enemies eliminated | Surviving team |
| Bomb explodes | T team |
| Bomb defused | CT team |
| Timer runs out (no plant) | CT team |

**Bot objective AI:**
- T bots with bomb pathfind toward bombsites.
- CT bots patrol near bombsites.
- After plant, CT bots converge on bomb location.

---

## 4. Menu UX & Configuration

Layout stays 2x2. The Competitive card gains a mode toggle.

**Competitive card expanded:**

```
Mode:  [Solo]  [Team]

── Team selected ──
Objective:  [Elimination]  [Bomb Defusal]
Side:  [CT]  [T]
Difficulty:  Easy  Normal  Hard  Elite
              2v2    3v3    4v4    5v5
Map:  [Dust] [Office] [Warehouse] ...
       [ START MATCH ]
```

- Mode toggle: "Solo" (current 1-vs-all, unchanged) vs "Team" (new).
- Objective toggle: Elimination (no bomb) vs Bomb Defusal (full plant/defuse).
- Side picker: CT (blue) / T (tan) toggle buttons.
- Difficulty shows team size underneath.
- All selections persisted to `localStorage`.
- Solo mode and other 3 cards completely untouched.

---

## 5. Visual Identity — CT vs T Bot Models

**CT bots:**
- Navy/dark blue uniform, lighter blue vest, dark helmet (open face)
- Blue floating marker
- Palette: `0x1a2a4a` (navy), `0x2a4a7a` (blue vest), `0x333333` (helmet)

**T bots:**
- Tan/khaki uniform, dark brown vest, black balaclava + beanie
- Red floating marker
- Palette: `0x8b7355` (tan), `0x4a3728` (brown vest), `0x222222` (balaclava)

Existing `_matPalettes` split into `_ctPalettes` and `_tPalettes`. Variation within each set via `id % paletteCount`.

Scoreboard labels: "Counter-Terrorists" / "Terrorists" with blue/tan color accents.

---

## 6. Round Flow & Economy

1. BUY_PHASE (10s): teams spawn at their spawn points, player sees buy menu, bots auto-buy.
2. PLAYING: teams fight per objective rules.
3. ROUND_END (5s): score updates, money awarded, announcer plays.
4. 6 rounds total, first to 4 wins. No half-time side switch.

**Economy (team mode):**
- Start: $800. Round win: +$3000. Round loss: +$1400. Kill: +$300.
- Bomb plant bonus: +$800 for T team.
- Bomb defuse bonus: +$500 for the defuser.
- Bots auto-buy by round number (no simulated economy).
- Perk selection still offered on round win.

**New announcer lines:** "Bomb has been planted", "Bomb has been defused", "Bomb carrier down".
**New sounds:** ticking for planted bomb, beep sequence for defuse progress.

---

## 7. Map Updates

All 7 maps gain:
- `ctSpawns`: 5 spawn points near existing `playerSpawn` area.
- `tSpawns`: 5 spawn points near existing `botSpawns` area.
- `bombsites`: 2 bombsite definitions with name, position, and radius.

Bombsite visuals built with existing helpers: glowing flat ring (`Cyl()`), floating letter, subtle point light.

No structural map changes — geometry, waypoints, and layouts stay the same.
