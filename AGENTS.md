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

## When to update docs
- Add/remove a system, mode, or module → `docs/architecture.md`
- Change inter-system contracts (who calls whom, who owns state) → `docs/architecture.md`
- Add a mode, retire a feature, change balance philosophy or non-goals → `docs/game-design.md`
- Fix a cross-cutting bug (root cause spans files) → add to `docs/gotchas.md`
- Change project-wide hard rules or canonical examples → this file

Routine bug fixes, numeric tweaks, UI text, single-file refactors: code only, no doc update.
