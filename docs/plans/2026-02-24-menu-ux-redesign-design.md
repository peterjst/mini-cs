# Menu UX Redesign

## Problem
The main menu puts too much on one screen: game modes mixed with utility buttons, controls grid, missions panel, difficulty selector, and rank display. Mode selection is confusing — "Play" only starts Competitive while other modes are visually demoted alongside non-game actions like History and Tour.

## Solution: Mode Grid with Inline Expand

### Landing Screen

```
┌──────────────────────────────────────────────┐
│              [emblem]  MINI CS               │
│           ── Counter-Strike ──               │
│         [Silver II  1,240 XP]                │
│                                              │
│   ┌──────────────┐  ┌──────────────┐         │
│   │  COMPETITIVE  │  │   SURVIVAL   │         │
│   │  Round-based  │  │  Wave horde  │         │
│   │   5v5 action  │  │   survival   │         │
│   └──────────────┘  └──────────────┘         │
│   ┌──────────────┐  ┌──────────────┐         │
│   │   GUN GAME   │  │  DEATHMATCH  │         │
│   │   Weapon      │  │  Free-for-   │         │
│   │  progression  │  │  all frags   │         │
│   └──────────────┘  └──────────────┘         │
│                                              │
│   Missions  History  Tour  Controls          │
│                                    v1.0      │
└──────────────────────────────────────────────┘
```

- Title area: emblem + MINI CS + subtitle (existing style, tighter spacing)
- Rank badge: compact, below title
- 2x2 mode card grid: each card has mode name + 1-line description
- Competitive card has a subtle blue accent border to indicate primary mode
- Footer: small text buttons for secondary screens (Missions, History, Tour, Controls)

### Inline Card Expand

Clicking a mode card:
1. Clicked card expands (~300ms CSS transition) to fill the grid area
2. Other 3 cards fade out and scale down simultaneously
3. Expanded card shows mode-specific configuration
4. "back to modes" link collapses to 2x2 grid
5. Last-used settings remembered via localStorage

```
┌─────────────────────────────────┐
│         COMPETITIVE             │
│     Round-based 5v5 action      │
│                                 │
│  Difficulty:                    │
│  [EASY] [NORMAL] [HARD] [ELITE]│
│                                 │
│  Map:                           │
│  [Dust] [Office] [Warehouse]   │
│  [Bloodstrike] [Italy] [Aztec] │
│                                 │
│  Rounds: < 6 >                  │
│                                 │
│       [ START ]                 │
└─────────────────────────────────┘
      < back to modes
```

Mode-specific configs:
- **Competitive:** Difficulty + Map + Round count (3/6/9)
- **Survival:** Difficulty + Map
- **Gun Game:** Difficulty + Map
- **Deathmatch:** Difficulty + Map + Kill target (20/30/50)

### Secondary Overlays

Each footer link opens a consistent full-screen overlay:
- Dark semi-transparent background
- Centered content panel
- Close button (X) top-right, ESC to close

**Missions overlay:** Daily (3) + Weekly (1) missions with progress bars. Existing data, moved from inline to overlay.

**Match History overlay:** Already exists — no changes needed.

**Tour Maps overlay:** Already exists — no changes needed.

**Controls overlay:** Keybindings grid moved from inline to its own overlay.

## What Gets Removed from Main Screen
- Controls grid (moved to overlay)
- Missions panel (moved to overlay)
- Single "Play" button (replaced by mode grid)
- Row of mixed secondary buttons (replaced by footer links + mode grid)
- Difficulty selector (moved into expanded card config)

## What Stays
- Title, emblem, subtitle, background animations
- Rank display (made compact, kept below title)
- Existing CSS visual style (dark theme, blue accents, scan lines)

## Technical Notes
- All changes in `index.html` (HTML structure + CSS)
- JS changes in `js/main.js` for event listeners and state management
- localStorage keys for last-used mode settings
- No new files needed
- Existing overlays (history, tour) remain as-is
