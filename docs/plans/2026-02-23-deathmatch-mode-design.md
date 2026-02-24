# Deathmatch Mode Design

## Overview
Free-for-all deathmatch mode where the player fights continuously respawning bots. No rounds — just pure fragging with an economy system. First to 30 kills or highest score when the 5-minute timer expires wins.

## Game States

Three new states in the existing state machine:

- **DM_PLAYING**: Active gameplay. Bots respawn 3s after death. Buy menu available anytime (B key). Kill target: 30, timer: 5:00.
- **DM_DEAD**: 3s death camera (reuse existing death cam logic), then auto-respawn. Weapons and money persist across deaths.
- **DM_END**: Final scoreboard with kills, deaths, K/D, accuracy, headshot %, XP earned. PLAY AGAIN / MAIN MENU buttons.

### State Transitions
```
MENU → DM_PLAYING (via DEATHMATCH button)
DM_PLAYING → DM_DEAD (player killed)
DM_DEAD → DM_PLAYING (after 3s auto-respawn)
DM_PLAYING → DM_END (30 kills reached OR 5:00 timer expires)
DM_END → MENU (MAIN MENU) or DM_PLAYING (PLAY AGAIN)
```

Pause (P key) works during DM_PLAYING, same as other modes.

## Respawn System

### Player Respawn
- On death: 3s death cam, then respawn at random safe spawn point
- HP reset to 100, armor persists, weapons and money persist
- Spawn protection: 1.5s invulnerability with subtle flash effect
- Spawn point selection: pick furthest spawn from nearest bot (avoid spawn kills)

### Bot Respawn
- On death: 3s delay, then respawn at random waypoint using existing `_isSpawnClear` validation
- Maintain constant bot count (difficulty-based: Easy=2, Normal=3, Hard=4, Elite=5)
- Track pending respawns separately from active bots
- Bot weapon assignment based on elapsed time: first 60s = pistol only, 60-120s = 50/50 rifle/pistol, 120s+ = full weapon distribution (45% rifle, 30% shotgun, 13% AWP, 12% pistol)

## Economy

- Starting money: $800 + pistol + knife
- Kill reward: $300
- Buy menu (B key): available during DM_PLAYING (not restricted to buy phase)
- Same items as competitive: shotgun ($1800), rifle ($2700), AWP ($4750), grenade ($300), armor ($650)
- Money persists across deaths
- Money cap: $16,000

## Scoring & HUD

### Kill Counter
- Prominent display: "KILLS: 17 / 30" top-center (replaces round info)
- Deaths counter shown smaller nearby
- Timer counts down from 5:00

### End Conditions
- Player reaches 30 kills → DM_END (victory)
- Timer expires → DM_END (show final score)

### End Screen
- Kills, deaths, K/D ratio
- Accuracy %, headshot %
- XP earned (uses difficulty multiplier)
- Match history recorded

## DM Map: "Arena"

Compact underground fighting pit optimized for fast engagements.

- **Size**: 40x40, wall height 5
- **Theme**: Underground concrete arena — industrial, utilitarian
- **Palette**: Dark concrete (0x606060), metal (0x404040), yellow hazard accents
- **Sky**: Dark overcast (0x404850), heavy fog (density 0.012)

### Layout
- Central open area (~16x16) with elevated platform (y=1.5, 6x6) for king-of-the-hill fights
- 4 corridors connecting to the center from cardinal directions
- Perimeter loop hallway connecting all corridors
- Asymmetric cover: concrete pillars, crate clusters, low walls, barrel groups
- No second floor — keeps vertical complexity low for fast DM flow

### Spawn Points
- 8 spawn points distributed around the perimeter loop
- Selection algorithm: pick the spawn point furthest from any bot

### Props & Cover
- Concrete pillars (CylW) at corridor entrances
- Stacked crate clusters at corridor midpoints
- Low concrete walls (height 1.2) in the central area
- Barrel groups near corners
- Metal grate flooring on center platform

### Lighting
- Overhead industrial fluorescent lights (cool white)
- Warm accent lights in corridors
- Center platform spotlight from above

## Menu Integration

- New "DEATHMATCH" button on main menu between SURVIVAL and TOUR
- Launches directly into DM map (no map selection — single dedicated map)
- Match history records DM results with mode indicator

## Implementation Approach

Add DM states to existing state machine in `main.js`. Create new map file `js/maps/arena.js`. Reuse existing enemy, weapon, and economy systems. Key changes:
- `main.js`: New state handlers, respawn timers, DM-specific HUD updates, buy menu during play
- `js/maps/arena.js`: New map definition
- `js/enemies.js`: Bot respawn queue support
- `index.html`: DM button on menu, DM HUD elements, arena.js script tag
- `REQUIREMENTS.md`: Document all new features
