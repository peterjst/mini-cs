# Desktop Controls Accessibility Design

## Problem

The controls overlay lists only 10 of 16+ available controls and is only accessible from the main menu. Players have no way to review controls mid-game, and no hint that P pauses the game.

## Solution

Three changes, all desktop-only (mobile untouched):

1. **Updated categorized controls overlay** — Reorganize from flat grid to three labeled sections
2. **Persistent HUD hint** — Subtle "P — Pause" in bottom-right during gameplay
3. **Controls accessible from pause menu** — New button in pause overlay opens existing controls overlay

## Design

### 1. Categorized Controls Overlay

Replace the flat 3-column grid in `#controls-overlay` with three labeled sections. Each section has a category header styled in the existing cyan color.

**Movement (5 items)**

| Key | Action |
|-----|--------|
| WASD | Move |
| Mouse | Look |
| Space | Jump |
| Shift | Sprint |
| C | Crouch |

**Combat (6 items)**

| Key | Action |
|-----|--------|
| Click | Shoot |
| R | Reload |
| F/RMB | Scope |
| 1-5 | Weapons |
| 7-9 | Grenades |
| E | Plant/Defuse |

**Game (5 items)**

| Key | Action |
|-----|--------|
| B | Buy Menu |
| F1 | Skip Buy Phase |
| Tab | Scoreboard |
| Z | Radio |
| P/ESC | Pause |

The `.controls-grid` CSS changes from a single flat grid to three sub-grids, each preceded by a category header. Headers use the same cyan accent color (`#4fc3f7`) as key badges, smaller font, with subtle letter-spacing.

### 2. Persistent "P — Pause" HUD Hint (Desktop Only)

- New element in the game HUD area, positioned bottom-right corner
- Text: "P — Pause"
- Style: same cyan color as HUD elements, opacity 0.3-0.4, small font (~12px)
- Hidden on touch/mobile devices using the existing `isTouchDevice` check
- Visible during active gameplay states: `PLAYING`, `BUY_PHASE`, `ROUND_END`, `SURVIVAL_BUY`, `SURVIVAL_WAVE`, `GUNGAME_ACTIVE`, `DEATHMATCH_ACTIVE`
- Hidden during: `MENU`, `PAUSED`, `MATCH_END`, `TOURING`, `SURVIVAL_DEAD`, `GUNGAME_END`, `DEATHMATCH_END`

### 3. Controls Button in Pause Overlay

- New "CONTROLS" button added to `#pause-overlay`, between Resume and Main Menu buttons
- Styled consistently with existing pause buttons: transparent background, cyan border, white text
- On click: shows the existing `#controls-overlay`
- Controls overlay z-index raised to 210 (above pause overlay's 200) so it stacks correctly
- Closing controls overlay (Close button or ESC) returns to pause screen without resuming the game
- ESC key behavior when paused:
  - If controls overlay is open: close controls overlay, stay paused
  - If controls overlay is closed: resume game (existing behavior)

## Files Changed

| File | Change |
|------|--------|
| `index.html` | Update `#controls-overlay` HTML structure (categorized sections), add pause hint element, add Controls button to `#pause-overlay` |
| `index.html` (CSS) | Category header styles, pause hint styles, z-index adjustment for controls overlay |
| `js/main.js` | Pause hint visibility logic, Controls button click handler, ESC key behavior update when controls overlay is open during pause |

## REQUIREMENTS.md Updates

Update the Controls section to reflect the full categorized control list, document the pause hint, and document the controls-from-pause accessibility feature.
