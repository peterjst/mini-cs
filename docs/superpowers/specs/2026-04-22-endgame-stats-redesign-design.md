# End-of-Match Stats Summary Redesign

**Date:** 2026-04-22

## Goal

Replace the current end-of-match summary screens and match-history panel with a polished, consistent, readable design. Fix three problems:

1. **Useless digits** — e.g. Deathmatch currently renders `K/D: 2.50` and similar `toFixed(2)` artefacts.
2. **Inconsistent styling** — Competitive already uses stat-card tiles; Survival, Gun Game, and Deathmatch use ugly pipe-separated text (`24 Kills | 9 Headshots`).
3. **Cryptic abbreviations** — `K/D`, `HS %`, `12K/8D` are hard to read. User wants fully spelled-out labels.

## Scope

**In scope**
- Redesign all four mode end-screens: `#match-end`, `#survival-end`, `#gungame-end`, `#deathmatch-end`.
- Redesign the `#history-panel` (stats strip + entry rows).
- Introduce a shared "summary" CSS language reused by all five screens.
- Introduce `GAME.format` helpers for consistent number/time/percent formatting.
- Add Accuracy and Damage Dealt tiles to Survival and Deathmatch (already tracked globally — just not shown). This requires resetting match trackers in Survival and Gun Game start functions.
- Update `REQUIREMENTS.md` sections for each affected screen.
- Add / update tests.

**Out of scope**
- No changes to scoring rules, XP calculations, rank bands, missions, or perks.
- No match-history schema change (map name not stored; user declined adding it).
- No per-mode history (survival / gungame / DM remain stateless beyond localStorage bests).
- No animated count-ups or rank-badge icons (future work).
- No changes to in-match HUD, bomb HUD, boss HUD.

## Visual Language (shared across all five screens)

The five affected screens use one set of CSS classes and the same structural anatomy.

### Anatomy

```
┌──────────────────────────────────────┐
│  HERO                                │
│    result (colored, large)           │
│    primary score (white, medium)     │
│    meta (grey caps: map · diff · …)  │
├──────────────────────────────────────┤
│  STAT GRID — 4 tiles, big number     │
│   + small uppercase label            │
├──────────────────────────────────────┤
│  XP PANEL                            │
│    +N XP (left)      Rank (right)    │
│    ─────── progress bar ───────      │
│    chip chip chip chip (breakdown)   │
├──────────────────────────────────────┤
│  ACTION BUTTONS (primary, secondary) │
└──────────────────────────────────────┘
```

Match History replaces the XP panel + buttons with an entry list and a single Close button, but reuses the same hero / stat-grid styling.

### Tokens

- **Stat-tile background:** `rgba(255,255,255,0.035)`; border `1px solid rgba(255,255,255,0.07)`; radius `5px`.
- **XP panel:** background `rgba(79,195,247,0.06)`, border `1px solid rgba(79,195,247,0.2)`.
- **Primary number:** 30px (end-screens) / 24px (history), 700 weight, `#fff`.
- **Label:** 10px, letter-spacing 2px, uppercase, `rgba(255,255,255,0.4)`.
- **Secondary / "sub" number** (e.g. the "/ 8" in "12 / 8"): 15px, `rgba(255,255,255,0.35)`, 500 weight.
- **Percent / unit** (e.g. `%` after a number): 16px, `rgba(255,255,255,0.4)`.

### Mode accent colors (header "result" text)

| Mode        | Win / progress     | Loss / neutral          |
|-------------|--------------------|--------------------------|
| Competitive | VICTORY `#4caf50`  | DEFEAT `#ef5350` · DRAW `#fff` |
| Survival    | —                  | ELIMINATED `#ef5350`     |
| Gun Game    | COMPLETE `#ff9800` | —                        |
| Deathmatch  | VICTORY `#ffca28`  | TIME UP `#9e9e9e`        |

Each colored header gets a soft `text-shadow` glow at 25% opacity of its color (except DRAW / TIME UP, no glow).

### Class naming

All five screens use a single `summary-*` class namespace (new), defined once in `index.html`:

- `.summary-wrap`, `.summary-hero`, `.summary-result`, `.summary-score`, `.summary-meta`
- `.summary-stats`, `.summary-stat`, `.summary-num`, `.summary-sub`, `.summary-unit`, `.summary-lbl`
- `.summary-xp`, `.summary-xp-top`, `.summary-xp-earned`, `.summary-xp-rank`, `.summary-xp-bar`, `.summary-xp-fill`, `.summary-xp-break`
- `.summary-btn`, `.summary-btn-primary`, `.summary-btn-secondary`
- History-specific (replaces the old history-entry interior classes entirely): `.history-entry` (card) with `.win` / `.loss` / `.draw` modifier classes; inside it `.he-bar` (colored left bar), `.he-head`, `.he-mid`, `.he-right`.

The old classes are removed from CSS (and from any HTML using them): `.final-score`, `.xp-breakdown`, `.xp-line`, `.xp-val`, `.xp-total`, `.survival-stats`, `.gungame-stats`, `.dm-stats`, `.stat-box`, `.stat-val`, `.stat-label`, `.history-stats`, `.he-result`, `.he-score`, `.he-kd`, `.he-date`. The new `.he-*` names listed above replace them — keep naming consistent (do not reuse old class names for new purposes).

## Number formatting (`GAME.format`)

New module `js/core/format.js` (IIFE, attaches to `window.GAME.format`).

| Function | Input → Output | Notes |
|----------|----------------|-------|
| `int(n)` | `1420 → "1,420"` · `7 → "7"` | Comma-separated thousands, no decimals, no trailing zeros. |
| `percent(num, denom)` | `(12, 37) → "32%"` · `(0, 0) → "0%"` | Rounds to nearest integer. Safe when `denom === 0`. |
| `percentValue(v)` | `42.6 → "43%"` | For when the percent is already computed. |
| `time(seconds)` | `108 → "1:48"` · `59 → "0:59"` | Floors each part; pads seconds to 2 digits; never negative. |
| `ratioPair(a, b)` | `(12, 8) → {primary:"12", sub:" / 8"}` | Returns the parts so the template can style kills big and deaths small. |

No `toFixed`-style decimals anywhere in the rendered output. If a value would naturally be a decimal (e.g. accuracy), we use `percent` / `percentValue` and round.

The helpers are loaded before `progression.js` and consumed by every end-screen render path.

## Per-screen details

### Competitive end-screen (`#match-end`, rendered in `js/modes/competitive.js` `endMatch`)

| Section | Content |
|---------|---------|
| Hero — result | VICTORY / DEFEAT / DRAW (mode-colored) |
| Hero — score | `playerScore — botScore` (e.g. `4 — 2`) |
| Hero — meta | `<Map> · <Difficulty> · <rounds> rounds` — map name and difficulty both shown title-cased (e.g. `"dust"` → `Dust`, `"normal"` → `Normal`) |
| Tile 1 | **Kills / Deaths** — `12 / 8` (kills big, deaths sub) |
| Tile 2 | **Headshots** — raw count |
| Tile 3 | **Accuracy** — `31%` |
| Tile 4 | **Damage Dealt** — `1,420` |
| XP panel | `+N XP` · current rank name · progress bar toward next rank · chips: `Kills +N`, `Headshots +N`, `Rounds Won +N`, `Match Win +N` (if win), `Difficulty ×N` |
| Buttons | Play Again / Main Menu |

Dropped: the old "HS %" tile (redundant next to Headshots + Accuracy, and a noisy signal at low kill counts).

### Survival end-screen (`#survival-end`, rendered in `js/modes/survival.js` `endSurvival`)

| Section | Content |
|---------|---------|
| Hero — result | ELIMINATED (red) |
| Hero — score | `Wave N` where `N = survivalWave - 1` |
| Hero — meta | `<Map>` |
| Tile 1 | **Kills** |
| Tile 2 | **Headshots** |
| Tile 3 | **Accuracy** — `28%` |
| Tile 4 | **Damage Dealt** |
| XP panel | `+N XP` · rank · bar · chips: `Kills +N`, `Headshots +N`, `Waves +N`, `Multiplier ×0.7` |
| Buttons | Retry / Main Menu |

New stats: Accuracy + Damage Dealt. Requires adding this reset block at the top of `startSurvival`:

```js
GAME._matchKills = 0;
GAME._matchHeadshots = 0;
GAME._matchShotsFired = 0;
GAME._matchShotsHit = 0;
GAME._matchDamageDealt = 0;
```

### Gun Game end-screen (`#gungame-end`, rendered in `js/modes/gungame.js` `endGunGame`)

| Section | Content |
|---------|---------|
| Hero — result | COMPLETE (orange) |
| Hero — score | `M:SS` (time) |
| Hero — meta | `<Map> · <Difficulty>` |
| Tile 1 | **Kills** (total across all levels) |
| Tile 2 | **Deaths** |
| Tile 3 | **Headshots** |
| Tile 4 | **Accuracy** |
| XP panel | `+N XP` · rank · bar · chips: `Kills +N`, `Headshots +N`, `Low Deaths +N`, `Speed Bonus +N` (conditional), `Difficulty ×N`, `Multiplier ×0.8` |
| Buttons | Retry / Main Menu |

**Correction vs. mockup:** The mockup showed "Levels Cleared 6/6" as Tile 1. Since Gun Game only ends when all 6 levels are cleared, that tile would always show `6/6` and carries no information. Use **Kills** instead — it varies across runs.

Requires the same reset block as Survival at the top of `startGunGame`.

### Deathmatch end-screen (`#deathmatch-end`, rendered in `js/modes/deathmatch.js` `endDeathmatch`)

| Section | Content |
|---------|---------|
| Hero — result | VICTORY (amber) if `dmKills >= DEATHMATCH_KILL_TARGET`, else TIME UP (grey) |
| Hero — score | `dmKills — dmDeaths` (e.g. `20 — 14`) |
| Hero — meta | `<time M:SS> · <Map> · <Difficulty>` |
| Tile 1 | **Kills / Deaths** — `20 / 14` |
| Tile 2 | **Headshots** |
| Tile 3 | **Accuracy** |
| Tile 4 | **Damage Dealt** |
| XP panel | `+N XP` · rank · bar · chips: `Kills +N`, `Headshots +N`, `Kill-Death Bonus +N`, `Difficulty ×N`, `Multiplier ×0.7` |
| Buttons | Play Again / Main Menu |

Dropped: the old `K/D: N.NN` line. Rename XP chip `K/D Bonus` → `Kill-Death Bonus`.

### Match History panel (`#history-panel`, rendered in `js/systems/progression.js` `renderHistory`)

Top:

| Tile | Value |
|------|-------|
| Matches Played | `stats.matches` |
| Win Rate | `percentValue(stats.winRate)` |
| Avg Kills / Match | `stats.avgKillsPerMatch` (new; `round(totalKills / matches)` or 0 if empty) |
| Headshot Rate | `percentValue(stats.hsPercent)` |

`getStats()` grows by one key: `avgKillsPerMatch`. No other API change.

Entry row layout (grid: `4px 90px 1fr auto`):

| Column | Content |
|--------|---------|
| 1 — colored bar | `#4caf50` (win), `#ef5350` (loss), `#9e9e9e` (draw) |
| 2 — head | Result label (colored) + score `4 — 2` |
| 3 — mid | `<kills> kills · <deaths> deaths · <headshots> headshot(s)` — all spelled out; singular/plural handling |
| 4 — right | Difficulty (blue caps) + date (`Apr 21, 14:32`) |

The `14K/8D` / `NORMAL 4/21/26 14:32` line format is replaced entirely.

## Data considerations

- **No schema changes to `miniCS_history`.** All existing entries continue to render correctly; no migration.
- **Global counters `GAME._matchShotsFired / _matchShotsHit / _matchDamageDealt`** are already incremented everywhere shots are resolved (in `main.js`). They were only reset at the start of Competitive and Deathmatch. We must add the reset block to `startSurvival` and `startGunGame` or Accuracy and Damage will carry over from whatever mode the player played before (currently the bug is latent because those screens don't show those numbers).
- **`getStats().avgKillsPerMatch`** — integer, `Math.round(totalKills / matches)` or `0` when `matches === 0`.

## Files to touch

1. **`index.html`**
   - Add the shared `.summary-*` CSS block.
   - Simplify the inner markup of the four end-screen divs (most content is injected by JS; outer containers stay).
   - Restyle `#history-panel` markup.
   - Remove obsolete selectors listed under "Class naming" above.
   - Add `<script src="js/core/format.js"></script>` before `progression.js`.

2. **`js/core/format.js`** (new, IIFE) — `int`, `thousands`, `percent`, `percentValue`, `time`, `ratioPair` on `window.GAME.format`.

3. **`js/modes/competitive.js`** — rewrite the `dom.matchXpBreakdown.innerHTML = …` block (and associated hero/score rendering) to emit the new markup; use `GAME.format.*` helpers.

4. **`js/modes/survival.js`**
   - Add match-counter reset block to `startSurvival`.
   - Rewrite `endSurvival` render block.

5. **`js/modes/gungame.js`**
   - Add match-counter reset block to `startGunGame`.
   - Rewrite `endGunGame` render block (Kills replaces "Levels Cleared").

6. **`js/modes/deathmatch.js`** — rewrite `endDeathmatch` render block; drop `K/D` line; rename `K/D Bonus` label.

7. **`js/systems/progression.js`**
   - Extend `getStats` with `avgKillsPerMatch`.
   - Rewrite `renderHistory` to produce the new top tiles + entry rows; use `GAME.format.*`.

8. **`REQUIREMENTS.md`** — update sections describing the four end-screens and match history panel to reflect new tile set, labels, XP panel layout, and number-formatting rules.

9. **Tests**
   - New `tests/unit/format.test.js` — every helper, edge cases (zero denominators, negative seconds, sub-1k integers, large numbers).
   - Update `tests/unit/progression.test.js` — add `avgKillsPerMatch` assertions; update `renderHistory` rendering assertions to match new markup and absence of old `K/D` / `HS %` substrings.
   - Add a small DOM smoke test (in an integration test or extending progression tests) that renders an end-screen template and asserts: no `toFixed`-style trailing zeros, no `K/D` substring, no `HS %` substring, comma-formatted thousands appear where expected.

## Testing plan

- **Automated:** `npm test` green. New `format.test.js` covers all formatter branches; progression tests updated for new markup + `avgKillsPerMatch`.
- **Manual (per `CLAUDE.md` "start the dev server and use the feature in a browser"):**
  1. Play a full Competitive match to end; verify hero / tiles / XP panel / buttons render; verify `Damage Dealt` shows a comma (e.g. `1,420`).
  2. Play Survival until death; verify Accuracy and Damage tiles populate with sensible values (they should reset on start — a prior Competitive run's numbers must not leak through).
  3. Play Gun Game to completion; verify Tile 1 shows Kills, time shown in hero.
  4. Play Deathmatch past the kill target and alternately let the timer run out; verify VICTORY vs TIME UP headers; no `K/D: 2.50` anywhere.
  5. Open Match History (from main menu); verify 4 tiles at top; entries show `N kills · N deaths · N headshots`; no `K/D` or `14K/8D` text anywhere.
  6. Ranked-up branch: award enough XP to trigger a rank-up and verify the rank-up flair renders above the XP bar.

## Out of scope / future ideas

- Add `map` to match-history schema and show it on entries.
- Separate history panels per mode (Survival best-wave log, DM PB log, etc.).
- Animated number count-ups on reveal.
- Rank-badge icons in the XP panel.
- Per-weapon accuracy breakdown.
