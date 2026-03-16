# Menu Sound Effects Design

## Overview

Add procedural UI sound effects to the menu and game transitions, giving the game a polished CS-inspired audio feel. All sounds are synthesized via Web Audio API — no audio files.

## Sound Definitions

Four new procedural sound functions added to `GAME.sound`:

### 1. `menuClick()` — General Button Click

- **Duration:** 50-80ms
- **Components:** Filtered white noise burst + sine blip (1200Hz -> 800Hz pitch drop)
- **Character:** Crisp, digital tick — CS menu click feel
- **Usage:** Buy menu buttons, back/return buttons, general `.menu-btn` interactions

### 2. `menuSelect()` — Option/Tab Switch

- **Duration:** ~40ms
- **Components:** Softer, lower-pitched version of menuClick (900Hz -> 600Hz), less noise
- **Character:** Subtle "switch" feel, distinct from a "press"
- **Usage:** Difficulty selectors, map selectors, game mode selectors (`.config-diff-row` / option-type handlers)

### 3. `menuStartClick()` — Start Game Confirmation

- **Duration:** ~150ms
- **Components:** High click (similar to menuClick) + low-frequency confirmation thump (200Hz sine, 100ms)
- **Character:** "Locked in" / commitment feel — punchier than a regular click
- **Usage:** "Start Game" / "Start Match" button only

### 4. `roundStartStinger()` — Spawn-In Stinger

- **Duration:** ~400ms
- **Components:** Two detuned square waves (150Hz + 200Hz) with quick attack and medium decay, layered with rising filtered noise sweep
- **Character:** CS "round start" horn — short, dramatic, hype-building
- **Usage:** Fires once when game state transitions into PLAYING (player spawns and gains control)

## Architecture

### Sound Generation — `js/sound.js`

- Add 4 new exported functions to the `GAME.sound` namespace
- All sounds route through the existing master gain -> compressor chain
- Follow existing sound function patterns (OscillatorNode, GainNode, BiquadFilterNode, noise via AudioBuffer)

### Event Wiring — `js/main.js`

- **`menuClick()`** — delegated click handlers for buy menu buttons, back/return buttons, general menu buttons
- **`menuSelect()`** — delegated click handlers for difficulty, map, and game mode option selectors
- **`menuStartClick()`** — click handler on the Start Game / Start Match button
- **`roundStartStinger()`** — fires in the state transition to `PLAYING` state (where player spawns)

### AudioContext Resume

Follow existing pattern in `sound.js` for ensuring AudioContext is resumed on first user gesture. Menu click sounds will naturally serve as the first audio-triggering interaction.

## Scope

### In Scope

- 4 procedural sound functions in `sound.js`
- Event wiring in `main.js` for menu buttons, option selectors, start button, and round start
- REQUIREMENTS.md updates for new sounds

### Out of Scope

- Hover sounds (not requested)
- Buy menu in-game sounds beyond button clicks
- Music / ambient menu audio
- Sound volume settings for UI sounds specifically

## Testing

- Unit tests for each new sound function (verify they create and schedule audio nodes without errors)
- Integration tests verifying sound functions are called on the correct UI interactions
