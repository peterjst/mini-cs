# Agent Docs Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate from a single 2,403-line `REQUIREMENTS.md` + 63-line `CLAUDE.md` to a tiered documentation structure: a slim always-loaded `AGENTS.md` (~25 lines), three on-demand `docs/` files (~330 lines total), and short headers in five module files. Eliminate the standing rule that forces large-file edits on every code change.

**Architecture:** Three tiers. Tier 1 = `AGENTS.md` (always loaded, hard rules + pointers). Tier 2 = `docs/architecture.md`, `docs/game-design.md`, `docs/gotchas.md` (loaded on demand). Tier 3 = short header comments in selected `js/` files (free — only loaded when the file is opened). Old files (`REQUIREMENTS.md`, `CLAUDE.md`) are deleted; git history preserves them.

**Tech Stack:** Markdown, JavaScript module headers, git, npm test.

**Reference:** `docs/superpowers/specs/2026-04-25-agent-docs-restructure-design.md`

**Sequence rule:** Tasks must run in order. Tier-2 docs are created first (so AGENTS.md can reference them), then Tier-3 headers, then AGENTS.md replaces CLAUDE.md, then `REQUIREMENTS.md` is deleted last.

---

## Task 1: Create `docs/architecture.md`

**Files:**
- Create: `docs/architecture.md`

- [ ] **Step 1: Write the file**

Write this exact content to `docs/architecture.md`:

```markdown
# Mini CS — Architecture

How systems are organized, what owns what state, and how they communicate. Read this when a task crosses module boundaries.

## Module ownership

| File | Owns | Exposes on `GAME` |
|---|---|---|
| `js/maps/shared.js` | Shared materials, texture utilities, build helpers, map registry | `_maps`, `_mapHelpers`, `_texUtil` |
| `js/maps/props.js` | Procedural prop generators, seeded PRNG, prop material cache | `_props` |
| `js/maps/<name>.js` | One map definition (geometry, lights, spawn zones) | (pushes onto `GAME._maps`) |
| `js/core/player.js` | First-person controller, movement, collision | player state on `GAME` root |
| `js/core/sound.js` | Procedural Web Audio effects | `playSound`, related |
| `js/core/quality.js` | Adaptive quality system (FPS-based) | `quality` |
| `js/core/fullscreen.js` | Fullscreen + orientation lock | `fullscreen` |
| `js/core/renderer.js` | Three.js setup, post-processing, color grading | `renderer`, `scene`, `camera` |
| `js/core/main.js` | Init, animate loop, state machine, input wiring | orchestrator (sets state on GAME root) |
| `js/effects/particles.js` | Unified particle system (InstancedMesh pools) | `particles` |
| `js/effects/effects.js` | Visual effects (blood, holes, dust, shake, hitmarker) | individual effect functions on `GAME` |
| `js/effects/birds.js` | Ambient bird system | `birds` |
| `js/systems/weapons.js` | Weapon defs, models, shooting, grenades | `weapons` |
| `js/systems/enemies.js` | Bot AI, humanoid models, behavior states | `enemies` |
| `js/systems/progression.js` | XP, ranks, missions, match history | `progression` |
| `js/systems/bomb.js` | Bomb plant/defuse logic and HUD | `bomb` |
| `js/systems/boss.js` | Boss fight state, atmosphere, minions | `boss` |
| `js/ui/touch.js` | Mobile touch controls | `touch*` |
| `js/ui/minimap.js` | Minimap rendering | `minimap` |
| `js/ui/hud.js` | HUD, scoreboard, kill feed, announcements | `hud` |
| `js/ui/buy.js` | Buy menu logic | `buy` |
| `js/ui/menu.js` | Menu flythrough, scene, fade | `menu` |
| `js/modes/competitive.js` | Match orchestration, rounds, map rotation | `modes.competitive` |
| `js/modes/survival.js` | Wave system, kill tracking | `modes.survival` |
| `js/modes/gungame.js` | Weapon ladder, level HUD | `modes.gungame` |
| `js/modes/deathmatch.js` | Kill target, respawns, boss-spawn trigger | `modes.deathmatch` |

## Lifecycle

**Frame (animate loop in `js/core/main.js`):** input → player update → enemies update → mode tick → effects/particles → render.

**Round / match:** the active mode owns its state machine. Modes start, tick, and end via the orchestrator in `main.js`. State lives on `GAME.modes.<mode>`, not on `GAME` root.

**Mode switching:** menu chooses mode → `main.js` calls mode init → mode owns everything until end → return to menu.

## State boundaries

- **`GAME` root** holds shared globals: `scene`, `camera`, `renderer`, `player`, `state`, `isMobile`.
- **`GAME.<system>`** (`bomb`, `boss`, `progression`, `hud`, `buy`, `menu`, etc.) holds system-owned state — modes call into these systems but don't reach into their internals.
- **`GAME.modes.<mode>`** holds mode-local state — match score, wave number, weapon-ladder index, etc. Other modes do not read this.

## Inter-system contracts

- **Modes ↔ bomb:** competitive plant/defuse goes through `GAME.bomb` API. Bomb timer continues even if planter dies.
- **Modes ↔ boss:** Deathmatch triggers boss spawn at a kill threshold. Boss owns its own loop but yields to mode for win/lose conditions.
- **Modes ↔ enemies:** modes spawn bots through `GAME.enemies` factories; respawn must set `_manager` on the bot (see `docs/gotchas.md` #3).
- **Anything ↔ HUD:** desktop and mobile HUDs are parallel trees. Updates must cover both — see `docs/gotchas.md` #4.
- **Weapons ↔ shared PBR cache:** weapon models reuse a cached PBR material set in `js/systems/weapons.js`. Don't create new materials; extend the cache.
- **Maps ↔ build helpers:** map files destructure helpers from `GAME._mapHelpers` and push their map definition onto `GAME._maps`. See `js/maps/dust.js` as the canonical example.
```

- [ ] **Step 2: Verify file size is in target range**

Run: `wc -l docs/architecture.md`
Expected: between 60 and 150 lines.

- [ ] **Step 3: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: add tier-2 architecture overview

Module ownership, lifecycle, state boundaries, and inter-system
contracts. Loaded on demand when a task crosses systems."
```

---

## Task 2: Create `docs/game-design.md`

**Files:**
- Create: `docs/game-design.md`

- [ ] **Step 1: Write the file**

Write this exact content to `docs/game-design.md`:

```markdown
# Mini CS — Game Design

Why the game exists, what each mode is for, and what we choose not to build. Read this when a task changes behavior intent or balance.

## Design pillars

1. **CS-feel.** Round-based competitive play, realistic weapon handling, smart bot enemies, detailed environments. The aesthetic and pacing are the inspiration, not feature parity.
2. **Polish over scope.** Depth in fewer modes beats breadth across many. Invest in what's already there before adding new mechanics.
3. **Procedural everything.** All graphics from Three.js geometry + PBR materials. All sounds from Web Audio API. No external assets, ever.
4. **Browser-deliverable.** Single `index.html`, no build step, runs from a static host. The constraint shapes what we ship.

## Per-mode intent

### Competitive (`js/modes/competitive.js`)
The flagship CS-feel experience. Round-based play with an economy, buy phase, plant/defuse, and map rotation across a match. Success feels like winning a tense round through tactical play, not raw aim. Bots play roles; weapons feel distinct. This mode is the benchmark — when in doubt, balance other modes against it.

### Survival (`js/modes/survival.js`)
Power fantasy. Escalating waves, kill streaks, no rounds. Success feels like outlasting an inevitable death longer than last time. Numbers go up, difficulty curves, eventually you die — bests are saved locally. Pacing is faster than Competitive, less tactical, more reactive.

### Gun Game (`js/modes/gungame.js`)
Equalizer / warmup. A weapon ladder where each kill levels you down through the arsenal. No economy, no rounds, no bomb. Success feels like reaching the final weapon first. Pacing is the fastest of all modes; map choice favors close-quarters action.

### Deathmatch (`js/modes/deathmatch.js`)
Skill-warmup with a climax. Respawning kill-target mode that culminates in a boss spawn. Success feels like hitting the target count without dying too often, then defeating the boss. Longer than Gun Game, less structured than Competitive — meant as the "drop in for 5 minutes" mode.

## Balance philosophy

- **Distinct weapons over balanced weapons.** A weapon that feels different is more valuable than one that's stat-equivalent to its peers. Asymmetric tradeoffs (slow but powerful, fast but inaccurate) are the goal.
- **Bots that feel smart, not bots that are optimal.** AI exists to provide a satisfying opponent, not to win. Visible reactions (taking cover, calling out, falling back) matter more than k/d optimization.
- **Difficulty rewards skill, doesn't punish lapses.** Higher difficulty should mean harder bots, not arbitrary player nerfs.
- **Round economy creates choices.** Competitive's buy menu should regularly produce hard tradeoffs (full buy vs. eco vs. force-buy), not auto-pilot loadouts.

## Difficulty philosophy

What changes with difficulty: bot reaction time, accuracy, awareness, aggression.
What does not change: bot count per round (modes own that), weapon stats, player health, map layout.
Rationale: difficulty is about *opponent quality*, not knob-turning on the player side.

## Explicit non-goals

- **No multiplayer.** Single-player vs. bots only. No networking, lobbies, or matchmaking — ever.
- **No asset pipeline.** All content is procedural. No image, audio, or 3D model files will be added.
- **No procedural map layouts.** Maps are hand-built. The procedural rule covers materials and props, not level design.
- **No accounts, monetization, telemetry, or remote services.** Local play only. Progression and history are localStorage.
- **No external runtime dependencies beyond Three.js.** No npm runtime deps; the project stays loadable from a static host.
- **No save-data backwards-compatibility.** Match history and progression are best-effort; schema changes can wipe localStorage with no migration.
```

- [ ] **Step 2: Verify file size is in target range**

Run: `wc -l docs/game-design.md`
Expected: between 70 and 200 lines.

- [ ] **Step 3: Commit**

```bash
git add docs/game-design.md
git commit -m "docs: add tier-2 game design intent

Design pillars, per-mode intent, balance and difficulty philosophy,
explicit non-goals. Loaded on demand when behavior intent matters."
```

---

## Task 3: Create `docs/gotchas.md`

**Files:**
- Create: `docs/gotchas.md`

- [ ] **Step 1: Write the file**

Write this exact content to `docs/gotchas.md`:

````markdown
# Mini CS — Gotchas

Cross-cutting traps that aren't derivable from any single file. Read before risky work; consult after a confusing bug.

**Growth rule:** after fixing a bug whose root cause crossed files or was non-obvious from local context, add an entry here. Single-file bugs go in tests, not gotchas.

## 1. Menu click-handler delegation needs data-attribute guards

The classes `.config-diff-row` and `.config-diff-btn` are reused across difficulty selection, map mode selection, and other menu controls. Every delegated click handler on these classes must guard with a data-attribute check or use a specific element reference.

```js
// Wrong — fires on every config-diff-btn click anywhere in the menu
btn.addEventListener('click', e => { /* handle difficulty */ });

// Right — guard so this handler only acts on its own buttons
if (!btn.dataset.diff) return;
```

When adding new menu options that reuse these classes, either use specific DOM element references or add an explicit `dataset` guard.

## 2. Spawn placement must validate against geometry

Multiple bug fixes (commits `f421747`, `9857703`, `16be46c`, `2e42088`, `a33dadb`, `4d2793a`) shared one root cause: bots, minions, or players placed at coordinates that intersect walls or sit inside enclosed structures.

**Rule:** any code that places a bot/minion/player must run a wall/enclosure check before committing the position. New spawn-zone logic *and* new map geometry both need to verify reachability. When adding a map, walk every spawn point through the validator before merging.

## 3. State must reset on init / respawn / round-start

The most common AI/mode bug class in this repo: stale state surviving a transition that should have cleared it. Examples (commits `f9fc5bc`, `64f3780`, `352cd28`, `9a09297`, `f99924b`):

- Boss fight kept pending minions from a prior fight.
- Respawned bots missing their `_manager`.
- Combat movement state retained on ATTACK exit.
- `_peripheralDetection` flag never reset.
- Deathmatch buy-menu auto-open flag persisted across deaths.

**Rule:** when adding mutable state to a system, identify its lifecycle (per-match / per-round / per-respawn / per-state-transition) and add an explicit reset at every boundary it crosses. State without an explicit reset is a future bug.

## 4. HUD changes must handle desktop and mobile in parallel

Touch and desktop HUDs have parallel element trees. For example, money is `#money-display` on desktop and `#touch-money` on mobile. Visibility toggles, content updates, and state-transition cleanups must consider both.

```js
if (GAME.isMobile) {
  // update touch HUD element
} else {
  // update desktop HUD element
}
```

Recent fix commits in this category: `5a55109`, `0de627d`, `09e6e8c`, `2bc01d6`, `64d4707`, `e5f619e`, `736a9a0`. When in doubt, grep for both element IDs and verify both paths are covered.

## 5. Audio nodes need explicit lifecycle

Web Audio nodes don't garbage-collect while connected. Per-event sound handlers must disconnect/stop their nodes when the sound ends; long-running modulation chains (death rattle, boss heartbeat, ambient drones) must be torn down when the originating state ends.

Symptom of getting this wrong: sounds drift, accumulate, or echo across rounds. Reference: commit `2ab4e3b`.

## 6. DOM element creators must be idempotent

Functions that build DOM elements may run on mode switches, respawns, or HUD rebuilds — not only on first init. Each creator must check for an existing element and skip or replace it, rather than appending duplicates.

```js
function createBuyButton() {
  if (document.getElementById('touch-buy-btn')) return;
  // ... build element
}
```

Reference: commit `72f15b4` (`createBuyButton` was producing duplicates on touch).
````

- [ ] **Step 2: Verify file size is in target range**

Run: `wc -l docs/gotchas.md`
Expected: between 50 and 100 lines.

- [ ] **Step 3: Commit**

```bash
git add docs/gotchas.md
git commit -m "docs: add tier-2 gotchas seeded from recent bug-fix sweep

Six recurring patterns identified across ~50 fix commits:
menu handler delegation, spawn validation, state reset on init,
mobile/desktop HUD parallelism, audio node lifecycle, idempotent
DOM creation. Growth rule documented at top of file."
```

---

## Task 4: Add Tier-3 module headers (5 files)

Each header is 5–15 lines. Add at the top of each file, immediately after the IIFE opening (or at file top if no IIFE wrapper).

**Files:**
- Modify: `js/systems/bomb.js` (top of file)
- Modify: `js/systems/boss.js` (top of file)
- Modify: `js/systems/progression.js` (top of file)
- Modify: `js/maps/shared.js` (top of file)
- Modify: `js/systems/weapons.js` (top of file)

For each file: read the existing file first to see the current top of file, then insert the header comment at the very top (above any existing content but inside the IIFE if present).

- [ ] **Step 1: `js/systems/bomb.js` header**

Insert at the very top of the file:

```js
// Bomb plant/defuse system. Owns timer state, defuse-progress tracking,
// and bomb HUD rendering.
// Invariants:
//   - Plant timer counts down regardless of planter survival; once
//     planted, the bomb is the round's win condition for the planter's
//     team and only defuse can stop it.
//   - Defuse progress is interrupted when the defuser stops holding USE;
//     partial progress survives only the current uninterrupted hold.
//   - HUD is owned here. Modes do not draw bomb UI directly.
// API exposed on GAME.bomb. See docs/architecture.md for cross-system
// contracts and docs/gotchas.md for state-reset rules.
```

- [ ] **Step 2: `js/systems/boss.js` header**

Insert at the very top of the file:

```js
// Boss fight system. Owns boss state, atmosphere (lighting/heartbeat),
// minion spawning, grenades, and boss-specific HUD (health bar).
// Spawns when triggered by a mode (currently Deathmatch at a kill
// threshold). Owns its own loop; the active mode owns win/lose
// decisions and end-of-fight transitions.
// Pending-minion state must be reset on init — see docs/gotchas.md #3.
// API exposed on GAME.boss.
```

- [ ] **Step 3: `js/systems/progression.js` header**

Insert at the very top of the file:

```js
// XP, ranks, missions, match history.
// Persistence: localStorage. The schema is best-effort; per
// docs/game-design.md non-goals there is no migration on breaking
// changes — wipes are acceptable.
// XP awards happen at match end, batched. Do not award mid-match.
// API exposed on GAME.progression.
```

- [ ] **Step 4: `js/maps/shared.js` header**

Insert at the very top of the file:

```js
// Shared materials, textures, build helpers, and the map registry.
// Invariant: textures and materials are CACHED and SHARED. Reuse
// existing variables; do not create per-map duplicates of standard
// materials. New maps destructure helpers from GAME._mapHelpers and
// push their definition onto GAME._maps. See js/maps/dust.js for
// the canonical pattern.
```

- [ ] **Step 5: `js/systems/weapons.js` header**

Insert at the very top of the file:

```js
// Weapon definitions, models, shooting, grenades.
// Invariant: weapon models share a PBR material cache (~20 materials
// total across all weapons). When adding a weapon model, extend the
// cache rather than allocating fresh materials.
// Each weapon definition follows a contract: id, name, slot, damage,
// fire rate, reload, ammo, model factory. Modes reference weapons
// by id.
// API exposed on GAME.weapons.
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: all tests pass (header comments are documentation only and don't affect behavior).

- [ ] **Step 7: Commit**

```bash
git add js/systems/bomb.js js/systems/boss.js js/systems/progression.js js/maps/shared.js js/systems/weapons.js
git commit -m "docs: add tier-3 intent headers to 5 system files

Short headers documenting non-derivable invariants and contracts on
bomb, boss, progression, maps/shared, and weapons. Travels with the
file; loaded only when an agent opens the file."
```

---

## Task 5: Replace `CLAUDE.md` with `AGENTS.md`

**Files:**
- Create: `AGENTS.md`
- Delete: `CLAUDE.md`

- [ ] **Step 1: Create `AGENTS.md`**

Write this exact content to `AGENTS.md`:

```markdown
# Mini CS — Agent Instructions

Browser-based Mini Counter-Strike FPS. Procedural graphics (Three.js r160.1, loaded as global `THREE` from CDN) and procedural audio (Web Audio API). No external assets. Goal: CS-feel — round-based play, realistic weapons, smart bots — polish over scope.

## Hard rules
- All graphics procedural (Three.js geometry + PBR). No image files.
- All sounds procedural (Web Audio). No audio files.
- IIFE pattern. Modules attach to `window.GAME`.
- No ES module imports. `THREE` is global.

## Testing (priority)
- Run `npm test` after any change to `js/` or `index.html`. Failures block commits.
- Tests-first when behavior has a clear spec — game logic, mode rules, scoring, weapon math, economy, bomb mechanics. The test is the spec.
- Tests-after when the right behavior is discovered iteratively — visuals, audio, AI tuning, player feel. Add regression tests once tuning settles.
- Test what the code should do (per `docs/game-design.md`), not how it does it.
- After fixing a bug, add tests for the whole pattern, not just the single instance.

## Workflow
- Commit after each task. Avoid `$()` substitution in shell commands.

## Where to find things
- Module ownership and system intent: `docs/architecture.md`
- Per-mode design intent, balance philosophy: `docs/game-design.md`
- Known traps and bug-prone patterns: `docs/gotchas.md`
- Canonical examples — new map: `js/maps/dust.js` · new mode: `js/modes/deathmatch.js` · new weapon: `js/systems/weapons.js`
```

- [ ] **Step 2: Verify file size**

Run: `wc -l AGENTS.md`
Expected: between 20 and 30 lines.

- [ ] **Step 3: Delete `CLAUDE.md`**

Run: `git rm CLAUDE.md`
Expected: `rm 'CLAUDE.md'`

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md
git commit -m "docs: replace CLAUDE.md with slim AGENTS.md

AGENTS.md is the cross-tool standard (Claude Code reads it natively;
Codex/Cursor/Copilot also read it). Drops the forced REQUIREMENTS.md
sync rule, the architecture file/role table (now in
docs/architecture.md), and the Code Patterns section (one item moved
to docs/gotchas.md, two to module headers, the rest derivable from
canonical example files).

~25 lines vs. 63 before; eliminates the per-task read+write tax that
was busting the prompt cache on every code change."
```

---

## Task 6: Smoke-test `AGENTS.md` pickup (manual)

**This step is verification that requires a fresh Claude Code session, performed by the user.** The agent executing this plan does not run this task itself.

- [ ] **Step 1 (user): Start a fresh Claude Code session in the repo and ask any small question**

Expected: the system context includes `AGENTS.md` content (visible because Claude references the new structure when answering). If the agent still references `CLAUDE.md` or asks about `REQUIREMENTS.md`, the rename did not take effect.

- [ ] **Step 2 (user): If pickup is confirmed, mark this task complete and proceed to Task 7. If not, investigate before deletion of `REQUIREMENTS.md`.**

No commit for this task.

---

## Task 7: Delete `REQUIREMENTS.md`

This is the point of no return for the source file, but git history preserves the full content regardless.

**Files:**
- Delete: `REQUIREMENTS.md`

- [ ] **Step 1: Confirm zero remaining code/test references**

Run: `grep -rn "REQUIREMENTS\.md\|REQUIREMENTS\.MD" js/ tests/ index.html 2>/dev/null`
Expected: no output (no matches). If any output appears, stop and update those files first.

- [ ] **Step 2: Confirm Tier-2 docs exist (sanity check)**

Run: `ls docs/architecture.md docs/game-design.md docs/gotchas.md AGENTS.md`
Expected: all four files listed without errors.

- [ ] **Step 3: Delete `REQUIREMENTS.md`**

Run: `git rm REQUIREMENTS.md`
Expected: `rm 'REQUIREMENTS.md'`

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all tests pass. Tests should not depend on `REQUIREMENTS.md` existing (verified in Step 1).

- [ ] **Step 5: Verify total documentation footprint**

Run: `wc -l AGENTS.md docs/architecture.md docs/game-design.md docs/gotchas.md`
Expected: total under 500 lines (success criterion from spec).

- [ ] **Step 6: Commit**

```bash
git commit -m "docs: delete REQUIREMENTS.md after migration to tiered docs

Content has migrated to docs/architecture.md (module ownership,
contracts), docs/game-design.md (intent, pillars, non-goals),
docs/gotchas.md (cross-cutting traps), and module headers in five
js/systems and js/maps files. Numeric values, exact UI text, and
file enumerations live in code — git history preserves the
full pre-migration document."
```

---

## Verification checklist (after Task 7)

- [ ] `AGENTS.md` exists and is ~25 lines.
- [ ] `docs/architecture.md`, `docs/game-design.md`, `docs/gotchas.md` exist and are within target sizes.
- [ ] Five module files (`bomb.js`, `boss.js`, `progression.js`, `maps/shared.js`, `weapons.js`) have intent headers.
- [ ] `CLAUDE.md` and `REQUIREMENTS.md` are deleted.
- [ ] `npm test` passes.
- [ ] `grep -rn "REQUIREMENTS\.md" js/ tests/ index.html` returns no hits.
- [ ] Total Tier-1 + Tier-2 documentation under 500 lines.
- [ ] A fresh Claude Code session loads `AGENTS.md` content.
