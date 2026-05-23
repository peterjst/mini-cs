# Corpse Retention — Design

**Date:** 2026-05-23
**Status:** Approved (pending spec review)

## Problem

In respawn-based modes, killed bots vanish almost instantly. The kill path calls
`enemy.destroy()` immediately (`deathmatch.js:212`, `gungame.js:185`), which clears the
death-animation interval and removes the mesh from the scene before the existing 0.4s fall
animation can finish. Result: bodies pop out of existence instead of falling and staying.

## Goal

Killed bots fall and rest on the floor as corpses that linger, capped so the scene never
bloats with too many bodies.

## Decisions

- **Removal policy:** cap only — keep the last N corpses. When the (N+1)th appears, the
  oldest is removed instantly. No time-based decay.
- **Cap:** N = 8.
- **Scope:** respawn modes only — Deathmatch and Gun Game. Competitive (round-based) and
  Survival (waves) are unchanged for now.
- **Player corpse:** bots only. The player is first-person; their body is rarely seen and
  the player death/respawn path is separate. Out of scope.

## Architecture

### New unit — `GAME.corpses`

A small shared corpse manager. Lives in `js/systems/enemies.js` (alongside the enemy meshes
it manages) and is exposed on `GAME` as `corpses`. Holds a single FIFO list because only one
mode runs at a time.

API:

- `add(enemy)` — push the retired enemy onto the internal list. If `list.length > 8`,
  `shift()` the oldest and call its `.destroy()`. `destroy()` already clears the death-anim
  interval and does `scene.remove(mesh)` — exactly today's cleanup, just deferred until
  eviction.
- `clear()` — `destroy()` every held corpse and empty the list.

No new mesh/geometry/material code. No disposal concerns: eviction reuses `destroy()`, which
only does `scene.remove` and leaves the shared humanoid materials intact (matching current
behavior).

### Changed flow (both respawn modes)

In `dmQueueBotRespawn` (`deathmatch.js:212`) and `gunGameQueueBotRespawn`
(`gungame.js:185`), replace the immediate `enemy.destroy()` with `GAME.corpses.add(enemy)`.
Everything else in those functions (respawn-queue push, far-spawn selection) is unchanged.

The enemy is still spliced out of `enemyManager.enemies` in `main.js` right after
`queueBotRespawn`, so:

- Its AI no longer ticks.
- It is invisible to hit detection — `weapons.js:1554` builds the raycast target list only
  from `alive` enemies in the `enemies[]` array, so retained corpse meshes never block
  bullets or register phantom hits.

Only the mesh lingers, finishing its fall and resting on the floor.

### Lifecycle / cleanup

Call `GAME.corpses.clear()` at each mode's start and end (deathmatch and gun game), so
corpses never survive into a new match or a map change. The existing duplicate-ID respawn
cleanup in `updateDMRespawns` is unaffected.

## Testing

**Logic (test-first):** corpse manager behavior.
- `add` up to 8 retains all eight; list length is 8.
- The 9th `add` evicts the oldest: oldest's `destroy()` is called / its mesh removed, list
  length stays 8, and the most-recent 8 are the ones retained (FIFO order).
- `clear()` destroys all held corpses and empties the list.

**Visual (test-after):** the fall-to-rest final pose. The animation was previously cut short
by the immediate `destroy()`, so the resting pose now plays in full and may need a small
tweak to look like a body lying on the floor (not sunk or floating). Tune by observation,
then add a regression test if a concrete invariant emerges.

## Non-goals

- Time-based corpse decay or fade-out.
- Corpses in Competitive or Survival.
- A player corpse.
- Corpse collision or interaction (purely visual).
