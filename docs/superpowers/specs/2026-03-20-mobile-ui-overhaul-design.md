# Mobile UI Overhaul Design

## Goal

Redesign the mobile touch UI for better looks and ergonomics, targeting iPhone and Android phones in landscape orientation. Visual style: CS:GO Classic (dark, clean, military, high-contrast).

## Approach

Incremental polish — rework each component in-place within the existing `touch.js` + `index.html` CSS architecture. No architecture rewrite. Each section is a self-contained change.

---

## Section 1: Fire Controls — Tap-to-Fire on Look Zone

### What changes

Remove the dedicated FIRE button. The right-side look zone (55% width, 65% height) becomes the fire zone.

### Gesture detection

- **Drag** (>10px movement): look/aim only, no firing
- **Quick tap** (<150ms, <10px movement): single shot
- **Hold still** (>200ms without significant drag): auto-fire begins, continues until finger lifts
- **Drag then stop** (drag, then stationary >200ms): aim first, then auto-fire

Movement threshold: ~10px to distinguish tap from drag.

### Remaining action buttons

The FIRE button is removed. Three icon-based buttons remain, repositioned:

| Button | Icon | Size | Color |
|--------|------|------|-------|
| Reload | ↻ | 48px circle | Yellow accent `rgba(255,200,0,0.6)` |
| Jump | ∧ | 48px circle | White `rgba(255,255,255,0.5)` |
| Crouch | ∨ | 48px circle | White `rgba(255,255,255,0.5)` |

- Stacked vertically on the right side
- 12px gap between buttons (up from 8px)
- 20px from screen edge (up from 10px)
- Unified dark glass style: `rgba(0,0,0,0.5)` fill, `1.5px solid rgba(255,255,255,0.2)` border
- Pressed state: border brightens to `rgba(255,255,255,0.5)`, fill lightens slightly
- Icon size: ~18-20px within the 48px button

---

## Section 2: Weapon Strip — Owned Only

### What changes

Strip only shows weapons the player currently owns (typically 3-5 items) instead of all 9 fixed slots.

### Layout

- Position: bottom-center, just above the new bottom info bar
- Slot size: **48x34px** (up from 30x22px)
- Font size: **10px** (up from 7px)
- Gap: **6px** (up from 3px)
- Border radius: 4px

### States

- **Normal slot:** `rgba(0,0,0,0.5)` fill, `1px solid rgba(255,255,255,0.15)` border, `rgba(255,255,255,0.4)` text
- **Active slot:** `2px solid rgba(255,200,0,0.6)` border, `rgba(255,200,0,0.1)` fill, `rgba(255,200,0,0.9)` text

### Grenade count badge

Grenade slots show remaining count as a small badge:
- Position: top-right corner of slot, offset -4px
- Size: 14px circle
- Style: `rgba(255,200,0,0.7)` background, black text, 8px font, bold

### Dynamic updates

Strip updates when weapons are picked up, bought, or grenades are consumed.

### Weapon abbreviations (strip only)

KNF, USP, MP5, SHG, AK, AWP, HE, SMK, FL (same as current, just bigger)

---

## Section 3: Buy Menu — Flat Grid

### What changes

Replace the horizontal scroll carousel with a full-screen flat grid. No categories/tabs. All items visible at once.

### Layout

- Full-screen overlay: `rgba(0,0,0,0.92)` background
- Header: "BUY MENU" label left, money amount right (`#4caf50`, 18px, bold, monospace)
- Grid: **4 columns**, 8px gap
- All 11 items + close button fit in a 4×3 grid — no scrolling needed

### Item display names (desktop and mobile, both updated)

| Weapon Key | Display Name (old) | Display Name (new) |
|-----------|-------------------|-------------------|
| knife | Knife | Knife |
| pistol | Pistol (USP) | Pistol |
| smg | SMG (MP5) | MP5 |
| shotgun | Shotgun (Nova) | Shotgun |
| rifle | Rifle (AK-47) | AK-47 |
| awp | AWP | AWP |
| grenade | HE Grenade | Grenade |
| smoke | Smoke Grenade | Smoke |
| flash | Flashbang | Flashbang |
| armor (none) | Kevlar + Helmet | Armor |
| armor (has vest, no helm) | Helmet | Helmet |
| armor (has vest + helm) | Kevlar + Helmet | Armor + Helmet (OWNED) |

Desktop buy menu HTML and weapon definitions (`js/weapons.js` name field) are updated to match.

### Card styling

- Padding: 8-10px
- Border radius: 6px
- Font: weapon name 13px bold, price 11px

### Three item states

| State | Border | Background | Price Color | Extra |
|-------|--------|------------|-------------|-------|
| Available | `1px solid rgba(255,255,255,0.12)` | `rgba(255,255,255,0.06)` | `#4caf50` (green) | Tap to buy |
| Owned | `border-left: 3px solid rgba(255,200,0,0.6)` | `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.25)` | "OWNED" badge (gold, 7px, `rgba(255,200,0,0.12)` bg) |
| Can't afford | `1px solid rgba(255,255,255,0.06)` | `rgba(255,255,255,0.03)` | `#ff4444` (red) | `opacity: 0.35`, no interaction |

### Close button

Sits in the grid as the 12th cell. Style: `rgba(255,255,255,0.08)` fill, `1px solid rgba(255,255,255,0.15)` border, "✕ CLOSE" text, 13px bold.

### Armor logic

Armor card adapts its label based on current armor state:
- No armor → shows "Armor" at $650
- Has vest, no helmet → shows "Helmet" at $350
- Has both → shows "Armor + Helmet" in OWNED state

---

## Section 4: Visual Polish — CS:GO Classic Styling

### New bottom info bar

- Position: fixed bottom, full width, 40px tall
- Background: `rgba(0,0,0,0.6)`
- Left side: health with color-coding (green `#4caf50` when healthy, transitions to yellow then red `#ff4444` as HP drops)
- Right side: ammo display — current mag bold white 14px, reserve dimmer 11px `rgba(255,255,255,0.35)`
- Font: monospace
- Weapon strip sits just above this bar

### Unified button styling

All touch buttons (action buttons, pause, fullscreen) share the same dark glass look:
- Fill: `rgba(0,0,0,0.5)`
- Border: `1px solid rgba(255,255,255,0.2)` (thin)
- Border radius: 6px (rectangular buttons), 50% (circular action buttons)
- Pressed state: border `rgba(255,255,255,0.5)`, fill lightens slightly

### Top HUD

- Money: top-right, shifted left of pause button (keep current positioning)
- Round timer: top-center, 12px (up from 10px), monospace
- Kill feed: top-left, no changes

### Color palette

| Purpose | Color |
|---------|-------|
| Health (full) | `#4caf50` |
| Health (low) | `#ff4444` |
| Money | `#4caf50` |
| Ammo (current) | `rgba(255,255,255,0.9)` |
| Ammo (reserve) | `rgba(255,255,255,0.35)` |
| Active weapon / Gold accent | `#ffc800` |
| Owned badge | `rgba(255,200,0,0.8)` |
| Can't afford | `#ff4444` |
| Reload button | `rgba(255,200,0,0.6)` |
| Button fill | `rgba(0,0,0,0.5)` |
| Button border | `rgba(255,255,255,0.2)` |
| Button pressed border | `rgba(255,255,255,0.5)` |

---

## Files affected

| File | Changes |
|------|---------|
| `index.html` | CSS for all touch elements, mobile buy menu HTML structure, desktop buy menu item names |
| `js/weapons.js` | Update weapon `name` fields to shorter display names |
| `js/touch.js` | Tap-to-fire gesture detection, weapon strip dynamic rendering, buy menu grid rendering |
| `js/main.js` | Buy menu logic (item states, armor adaptation), weapon strip update calls |
| `REQUIREMENTS.md` | Document all mobile UI changes and renamed weapons |

## Out of scope

- Tablet support
- Desktop UI changes
- New weapons or game mechanics
- Grenade throwing UX changes
- Scoreboard/minimap changes
