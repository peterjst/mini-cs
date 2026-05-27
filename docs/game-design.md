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

## Per-mode config

Each mode that features a boss exposes a per-mode **Boss ON/OFF** toggle in its config panel (default ON, remembered locally). Turning it off removes the boss entirely from that mode: the final round / 5th wave plays normally, and Deathmatch / Gun Game win at the kill target / final weapon instead of fighting a boss.

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
