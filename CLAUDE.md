# CLAUDE.md
# General Instructions

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

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

## git
- Always commit after finishing some works
 

## Scope of discussion with user & doc update
- Avoid discussing code-level details with the user. Directly decide based on agent's recommendation.

Routine bug fixes, numeric tweaks, UI text, single-file refactors: code only, no doc update.
