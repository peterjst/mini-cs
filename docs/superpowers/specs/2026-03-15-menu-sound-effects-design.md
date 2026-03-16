# Menu Sound Effects Design

## Overview

Add procedural UI sound effects to the menu and game transitions, giving the game a polished CS-inspired audio feel. All sounds are synthesized via Web Audio API — no audio files.

## Sound Definitions

Four new procedural sound functions added to `GAME.Sound`:

### 1. `menuClick()` — General Button Click

- **Duration:** 50-80ms
- **Components:** Filtered white noise burst + sine blip (1200Hz -> 800Hz pitch drop)
- **Character:** Crisp, digital tick — CS menu click feel
- **Usage:** General menu button clicks (see Wiring section for full list)

### 2. `menuSelect()` — Option/Tab Switch

- **Duration:** ~40ms
- **Components:** Softer, lower-pitched version of menuClick (900Hz -> 600Hz), less noise
- **Character:** Subtle "switch" feel, distinct from a "press"
- **Usage:** Option selectors — difficulty, map, game mode (see Wiring section)

### 3. `menuStartClick()` — Start Game Confirmation

- **Duration:** ~150ms
- **Components:** High click (similar to menuClick) + low-frequency confirmation thump (200Hz sine, 100ms)
- **Character:** "Locked in" / commitment feel — punchier than a regular click
- **Usage:** "Start Game" / "Start Match" button only. Plays immediately on click, before the `_fadeMenuAndStart` visual fade.

### 4. `roundStartStinger()` — Spawn-In Stinger

- **Duration:** ~400ms
- **Components:** Two detuned square waves (150Hz + 200Hz) with quick attack and medium decay, layered with rising filtered noise sweep
- **Character:** CS "round start" horn — short, dramatic, hype-building
- **Usage:** Fires once when game state transitions into PLAYING. This replaces the existing `GAME.Sound.roundStart()` call — the stinger supersedes it entirely.

## Architecture

### Sound Generation — `js/sound.js`

- Add 4 new exported functions to the `GAME.Sound` namespace
- All sounds route through the existing master gain -> compressor chain
- Follow existing sound function patterns (OscillatorNode, GainNode, BiquadFilterNode, noise via AudioBuffer)
- Each function must call `ensureCtx()` at the top, since menu sounds may be the very first audio interaction before the AudioContext exists

### Debouncing

Menu sound functions should include a simple cooldown guard (~50ms) to prevent audio stacking from rapid clicks. Store a last-played timestamp per function and skip if called within the cooldown window.

### Event Wiring — `js/main.js`

**Rule:** All click handlers in menu/config screens get `menuClick()` unless they are option selectors (get `menuSelect()`) or start buttons (get `menuStartClick()`).

Specific handlers:

**`menuClick()`:**
- Buy item buttons (`.buy-item`)
- Restart buttons (`restartBtn`, `survivalRestartBtn`, `gungameRestartBtn`, `dmRestartBtn`)
- Menu-return buttons (`menuBtn`, `pauseMenuBtn`, `survivalMenuBtn`, `gungameMenuBtn`, `dmMenuBtn`)
- Tour map buttons (`.tour-map-btn`)
- Controls/loadout/missions footer toggles
- Pause resume button
- Quick play button
- Perk card selection

**`menuSelect()`:**
- Difficulty selector buttons (`.config-diff-btn`)
- Map selector cards (`.config-map-btn`)
- Game mode selector buttons
- Team mode / objective toggles

**`menuStartClick()`:**
- Start Game / Start Match buttons — fires on click, before `_fadeMenuAndStart()` fade

**`roundStartStinger()`:**
- State transition into `PLAYING` — replaces existing `GAME.Sound.roundStart()` call

### AudioContext Resume

Each new sound function calls `ensureCtx()` at the top, following the existing pattern in `sound.js`. This ensures the AudioContext is created and resumed on the first menu interaction.

## Scope

### In Scope

- 4 procedural sound functions in `sound.js`
- Removal of existing `roundStart()` in favor of `roundStartStinger()`
- Event wiring in `main.js` for all menu interactions listed above
- Debounce guard for rapid clicks
- REQUIREMENTS.md updates for new sounds

### Out of Scope

- Hover sounds (not requested)
- Music / ambient menu audio
- Sound volume settings for UI sounds specifically

## Testing

- Unit tests for each new sound function (verify they create and schedule audio nodes without errors)
- Unit test for debounce guard (verify rapid calls are suppressed)
- Integration tests verifying sound functions are called on the correct UI interactions
