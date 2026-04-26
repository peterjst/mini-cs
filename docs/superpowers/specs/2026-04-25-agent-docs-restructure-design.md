# Agent Docs Restructure — Tiered Context for Cheaper Agentic Dev

**Date:** 2026-04-25

## Goal

Restructure in-repo agent-facing documentation to reduce per-task token cost in agentic AI workflows, without losing the high-value, non-derivable context that helps agents work correctly.

The primary pain point is **cost, not correctness** — agents on this repo rarely make wrong decisions today, but every task pays a tax for over-large, code-duplicating documentation and a standing rule that forces a 2,400-line file to be read and rewritten on every change.

## Problem

Today's setup:

- **`REQUIREMENTS.md`** — 2,403 lines, 275 sections. Documents every numeric value, file enumeration, exact UI text, and per-system implementation walkthrough. Most of its content duplicates code state.
- **`CLAUDE.md`** — 63 lines. Includes one CRITICAL rule: "Keep `REQUIREMENTS.md` in sync with EVERY code change." Also contains a 30-row architecture table and a "Code Patterns" section largely derivable from any one file.

Three concrete cost drivers:

1. **Forced read+write tax.** The "must-update in same response" rule pulls REQUIREMENTS.md into context on every task and writes it back, regardless of whether the change affects design intent.
2. **Prompt-cache invalidation.** REQUIREMENTS.md and CLAUDE.md sit at the front of the conversation prefix. The forced-update rule rewrites them on most code changes, busting the prompt cache (5-min TTL) and forcing the next turn to re-pay for full context instead of getting cached-prefix pricing.
3. **Deprioritization risk.** Industry best practice and Claude documentation note that oversized always-loaded rule files get deprioritized by the model. The current 2,400-line doc may already be doing less work than it costs.

## Goals & Non-Goals

**Goals**
- Reduce per-task documentation token footprint by ~5×.
- Eliminate the per-change forced read+write of any large file.
- Keep all genuinely non-derivable context (design intent, cross-cutting invariants, known traps).
- Preserve cross-tool portability so a future Cursor/Codex/Copilot session can read the same root file.

**Non-goals**
- No new tooling, no MCP servers, no documentation generators.
- No nested `AGENTS.md` files in subdirectories (YAGNI at this codebase size).
- No change to test commands, test framework, or build process.
- No archive of `REQUIREMENTS.md` — git history is authoritative.

## Design

### Tier model

Three tiers, ordered by load-frequency:

| Tier | File(s) | When loaded | Target size |
|---|---|---|---|
| 1 | `AGENTS.md` | Every conversation | ~25 lines |
| 2 | `docs/architecture.md`, `docs/game-design.md`, `docs/gotchas.md` | When the task touches that area | ~80–200 lines each |
| 3 | Module header comments in selected `js/` files | Free — only when the agent opens that file | 5–15 lines each |

A pattern earns Tier-1 placement only when **all three** are true:

1. Not derivable in <30 seconds from one file.
2. Crosses module boundaries (so co-locating with one file misses it).
3. Has caused real bugs *or* is load-bearing for design intent.

Tier-2 files exist for content that is non-derivable but doesn't apply to every task.

### Net structure after migration

```
AGENTS.md                  ~25 lines (always loaded)
docs/architecture.md       ~80–150 lines (on demand)
docs/game-design.md        ~100–200 lines (on demand)
docs/gotchas.md            ~60–80 lines (on demand, grows over time)
+ ~5 module headers        ~5–15 lines each (free, in-file)

REQUIREMENTS.md            DELETED
CLAUDE.md                  DELETED (replaced by AGENTS.md)
```

**Total Tier-1 + Tier-2 ceiling:** ~475 lines, vs. today's **2,466 lines** across `REQUIREMENTS.md` + `CLAUDE.md`. Most tasks load only Tier 1 (~25 lines).

## Detailed Specifications

### `AGENTS.md` (Tier 1)

Replaces `CLAUDE.md`. Named `AGENTS.md` for cross-tool portability — Claude Code reads it as a fallback. No separate `CLAUDE.md`.

Target: ~25 lines.

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

**Removed from current `CLAUDE.md`:**

- The "MUST keep REQUIREMENTS.md in sync" rule (the single biggest cost driver — replaced by Tier-2 docs that update only when *intent* changes).
- The 30-row architecture file/role table (derivable from `ls js/`; replaced by pointer to `docs/architecture.md`).
- The "Code Patterns" section (mostly derivable; one item — menu click-handler delegation — moves to `docs/gotchas.md`; two items — material cache invariants — move to Tier-3 module headers).
- All-caps `CRITICAL` / `MUST` / `ALWAYS` emphasis (best practice: short imperatives outperform shouted prose; over-emphasis is empirically deprioritized).

### `docs/architecture.md` (Tier 2)

Purpose: module ownership and cross-module wiring. Read when the task crosses systems.

Target: 80–150 lines.

Contents:
- **Module ownership table** — one line per file: *owns this state, exposes this on `GAME`*.
- **Lifecycle**: how a frame runs, how a round runs, how mode switching works.
- **Shared state vs. mode-local state**: what lives on `GAME` directly vs. on `GAME.modes.<mode>` vs. system-owned namespaces (`GAME.bomb`, `GAME.boss`, `GAME.progression`).
- **Inter-system contracts** that aren't visible from any one file: e.g. modes call into `GAME.bomb` for plant/defuse; boss owns its own loop but yields to mode for win conditions.

Out of scope: implementation details of any module (the file says *who owns what*, not *how it works*).

### `docs/game-design.md` (Tier 2)

Purpose: the **why**. Replaces the bulk of `REQUIREMENTS.md`'s design content.

Target: 100–200 lines.

Contents:
- **Design pillars**: CS-feel, polish over scope, procedural everything, no external assets, browser-deliverable.
- **Per-mode intent** (one paragraph each — Competitive, Survival, Gun Game, Deathmatch): what the mode is *for*, what makes it feel different, what success feels like.
- **Balance philosophy**: weapons should feel distinct; difficulty curves reward skill rather than punish; bot AI should *feel* smart, not be optimal.
- **Difficulty philosophy**: what changes with difficulty (and what shouldn't).
- **Explicit non-goals**: no multiplayer, no asset pipeline, no procedural map layouts (maps are hand-built), no monetization hooks.

Out of scope: numeric values, exact weapon stats, exact UI text. Code is authoritative for those.

### `docs/gotchas.md` (Tier 2)

Purpose: cross-cutting traps that aren't derivable from any one file.

Target: 60–80 lines (grows organically).

**Seeded entries** (six patterns identified from sweep of recent fix commits):

1. **Menu click-handler delegation.** Shared classes `.config-diff-row` / `.config-diff-btn` are reused across difficulty / map mode / etc. Every delegated handler must guard with a data-attribute check (e.g. `if (!btn.dataset.diff) return`) to avoid cross-handler interference.

2. **Spawn placement must validate against geometry.** *(6+ commits, including `f421747`, `9857703`, `16be46c`, `2e42088`, `a33dadb`, `4d2793a`.)* Any code that places a bot/minion/player must run a wall/enclosure check. New maps and new spawn-zone logic both need this.

3. **State must reset on init / respawn / round-start.** *(5+ commits, including `f9fc5bc`, `64f3780`, `352cd28`, `9a09297`, `f99924b`.)* When adding mutable state to a system, identify its lifecycle (per-match / per-round / per-respawn / per-state-transition) and reset explicitly at every boundary. Stale state is the most common AI/mode bug class in this repo.

4. **HUD changes must handle desktop and mobile in parallel.** *(6+ commits, including `5a55109`, `0de627d`, `09e6e8c`, `2bc01d6`, `64d4707`, `e5f619e`, `736a9a0`.)* Touch and desktop HUDs have parallel element trees (e.g. `#money-display` vs `#touch-money`). Any visibility toggle or content update must consider both via `GAME.isMobile` branches.

5. **Audio nodes need explicit lifecycle.** *(`2ab4e3b`.)* Web Audio nodes don't garbage-collect while connected. Per-event handlers must disconnect/stop their nodes; long-running modulation chains must be torn down on death/round-end.

6. **DOM creators must be idempotent.** *(`72f15b4`.)* Any function that creates a DOM element and may run on mode switches, respawns, or HUD rebuilds must check for an existing element first.

**Growth rule** (stated at the top of the file): after fixing a bug whose root cause crossed files or was non-obvious from local context, add it here. Single-file bugs go in tests, not gotchas.

### Tier-3 module headers

Add a short header comment (5–15 lines) to files where intent is non-obvious from the code itself.

Files in scope:

| File | Header content |
|---|---|
| `js/systems/bomb.js` | Purpose; invariant: timer continues if planter dies; defuse-progress contract with HUD. |
| `js/systems/boss.js` | When boss spawns; win conditions; contract with deathmatch mode. |
| `js/systems/progression.js` | XP/rank philosophy; localStorage save format expectations. |
| `js/maps/shared.js` | Material/texture cache invariant: reuse existing variables; `_mapHelpers` contract. |
| `js/systems/weapons.js` | Shared PBR cache invariant; weapon-definition contract. |

Files explicitly **not** getting headers:
- `js/maps/dust.js`, `office.js`, etc. — pure data; the file *is* the spec.
- `js/effects/effects.js` — utility module; function names tell the story.
- `js/ui/*.js` — local-only patterns, no cross-cutting invariants.

## Migration Plan

Sequence (order matters — each step leaves the repo in a working state):

1. **Create Tier-2 docs.** Add `docs/architecture.md`, `docs/game-design.md`, `docs/gotchas.md` with content extracted from `REQUIREMENTS.md` and the sweep above. Do not delete `REQUIREMENTS.md` yet.
2. **Add Tier-3 module headers** to the five files identified.
3. **Replace `CLAUDE.md` with `AGENTS.md`.** Write the new file; delete `CLAUDE.md`.
4. **Verify Claude Code picks up `AGENTS.md`.** Smoke-test in a fresh session.
5. **Delete `REQUIREMENTS.md`.** Single commit, isolated, easy to revert if needed.
6. **Update existing references to `REQUIREMENTS.md`.** Grep `js/` and `tests/` for the string `REQUIREMENTS.md`; redirect to the appropriate Tier-2 doc or remove.

Each step is its own commit. Step 5 is the point of no return — but git history preserves the file regardless.

## Risks & Mitigations

**Risk:** Slim docs miss something an agent actually needed.
**Mitigation:** First few sessions after migration may surface gaps. If an agent makes a mistake that a doc could have prevented, add the missing piece — to gotchas.md if cross-cutting, to a module header if local. Treat missing-context as a bug to fix, not a reason to expand AGENTS.md.

**Risk:** Tier-2 docs drift over time without the forced-sync rule.
**Mitigation:** Tier-2 content is *intent and invariants*, which change slowly. Drift is far less dangerous here than in a code-mirror doc — when intent doesn't match implementation, the question "which is right?" is easier to answer (intent rarely changes silently).

**Risk:** `AGENTS.md` rename breaks something that hard-codes `CLAUDE.md`.
**Mitigation:** Grep before deleting. Claude Code reads both natively; tests don't reference either.

## Success Criteria

- Total agent-facing doc footprint ≤ 500 lines across Tier 1 + Tier 2.
- No standing instruction forces large-file edits on routine code changes.
- Recent gotcha categories (spawn validation, state reset, mobile/desktop parallel, audio lifecycle, idempotent DOM) are represented in `docs/gotchas.md`.
- A fresh agent session, given a typical task, loads ≤ 100 lines of always-loaded documentation context.

## Open Questions

None outstanding — all design decisions confirmed during brainstorming.
