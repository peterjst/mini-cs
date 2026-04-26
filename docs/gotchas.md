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
